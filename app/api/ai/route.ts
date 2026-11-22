import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { corsHeaders, preflight } from '@/lib/cors';
import { SYSTEM, buildPrompt, type AiTask } from '@/lib/ai/prompts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TASKS: AiTask[] = ['improve-bullets', 'summary', 'tailor', 'letter', 'linkedin-about', 'linkedin-headline', 'proofread'];
const MAX_INPUT = 40_000;

// Best-effort per-instance rate limit: 30 requests / 10 minutes / IP.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 600_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 30;
}

let client: Anthropic | null = null;

export const OPTIONS = preflight;

export async function GET(req: Request) {
  return json(req, { enabled: Boolean(process.env.ANTHROPIC_API_KEY) });
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return json(req, { error: 'not-configured' }, { status: 501 });
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (limited(ip)) return json(req, { error: 'Too many requests — try again in a few minutes.' }, { status: 429 });

  let body: { task?: AiTask; input?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json(req, { error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.task || !TASKS.includes(body.task)) return json(req, { error: 'Unknown task' }, { status: 400 });
  const input: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.input ?? {})) if (typeof v === 'string') input[k] = v;
  if (JSON.stringify(input).length > MAX_INPUT) return json(req, { error: 'Input too long' }, { status: 413 });

  const { prompt, maxTokens } = buildPrompt(body.task, input);
  client ??= new Anthropic();
  try {
    const res = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: maxTokens,
      system: SYSTEM,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages: [{ role: 'user', content: prompt }],
    });
    if (res.stop_reason === 'refusal') return json(req, { error: 'The assistant could not help with that text.' }, { status: 422 });
    const text = res.content
      .flatMap((b) => (b.type === 'text' ? [b.text] : []))
      .join('')
      .trim();
    return json(req, { text });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json(req, { error: 'The AI service is busy — try again shortly.' }, { status: 429 });
    if (err instanceof Anthropic.AuthenticationError) return json(req, { error: 'AI is misconfigured (invalid API key).' }, { status: 500 });
    if (err instanceof Anthropic.APIError) return json(req, { error: `AI error (${err.status ?? 'network'})` }, { status: 502 });
    return json(req, { error: 'AI request failed' }, { status: 500 });
  }
}

function json(req: Request, body: unknown, init: ResponseInit = {}) {
  return NextResponse.json(body, { ...init, headers: { ...corsHeaders(req), ...(init.headers ?? {}) } });
}
