import { NextResponse } from 'next/server';
import { corsHeaders, preflight } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Optional deep grammar pass through a LanguageTool server (self-hosted or the
 * public API). Only called when the user presses "Deep check" — the built-in
 * checker covers live checking offline.
 */
export const OPTIONS = preflight;

export async function GET(req: Request) {
  return json(req, { enabled: Boolean(process.env.LANGUAGETOOL_URL) });
}

export async function POST(req: Request) {
  const url = process.env.LANGUAGETOOL_URL;
  if (!url) return json(req, { error: 'not-configured' }, { status: 501 });
  const { text, language } = (await req.json().catch(() => ({}))) as { text?: string; language?: string };
  if (typeof text !== 'string' || !text.trim()) return json(req, { matches: [] });
  if (text.length > 20_000) return json(req, { error: 'Text too long' }, { status: 413 });
  const form = new URLSearchParams({ text, language: language && /^en-(US|GB|CA)$/.test(language) ? language : 'en-US', enabledOnly: 'false' });
  try {
    const res = await fetch(url, { method: 'POST', body: form, headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' } });
    if (!res.ok) return json(req, { error: `LanguageTool error ${res.status}` }, { status: 502 });
    const data = (await res.json()) as { matches: { message: string; offset: number; length: number; replacements: { value: string }[]; rule: { issueType: string; category: { id: string } } }[] };
    return json(req, {
      matches: data.matches.map((m) => ({
        message: m.message,
        offset: m.offset,
        length: m.length,
        replacements: m.replacements.slice(0, 5).map((r) => r.value),
        type: m.rule.issueType === 'misspelling' ? 'spelling' : m.rule.category.id === 'PUNCTUATION' || m.rule.category.id === 'TYPOGRAPHY' ? 'punctuation' : m.rule.issueType === 'style' ? 'style' : 'grammar',
      })),
    });
  } catch {
    return json(req, { error: 'Could not reach LanguageTool' }, { status: 502 });
  }
}

function json(req: Request, body: unknown, init: ResponseInit = {}) {
  return NextResponse.json(body, { ...init, headers: { ...corsHeaders(req), ...(init.headers ?? {}) } });
}
