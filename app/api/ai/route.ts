import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
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

export async function GET() {
  return NextResponse.json({ enabled: Boolean(process.env.ANTHROPIC_API_KEY) });
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'not-configured' }, { status: 501 });
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (limited(ip)) return NextResponse.json({ error: 'Too many requests — try again in a few minutes.' }, { status: 429 });

  let body: { task?: AiTask; input?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.task || !TASKS.includes(body.task)) return NextResponse.json({ error: 'Unknown task' }, { status: 400 });
  const input: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.input ?? {})) if (typeof v === 'string') input[k] = v;
  if (JSON.stringify(input).length > MAX_INPUT) return NextResponse.json({ error: 'Input too long' }, { status: 413 });

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
    if (res.stop_reason === 'refusal') return NextResponse.json({ error: 'The assistant could not help with that text.' }, { status: 422 });
    const text = res.content
      .flatMap((b) => (b.type === 'text' ? [b.text] : []))
      .join('')
      .trim();
    return NextResponse.json({ text });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return NextResponse.json({ error: 'The AI service is busy — try again shortly.' }, { status: 429 });
    if (err instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: 'AI is misconfigured (invalid API key).' }, { status: 500 });
    if (err instanceof Anthropic.APIError) return NextResponse.json({ error: `AI error (${err.status ?? 'network'})` }, { status: 502 });
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 });
  }
}
