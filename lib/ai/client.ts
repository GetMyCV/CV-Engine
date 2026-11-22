'use client';
import type { AiTask } from './prompts';

let enabled: Promise<boolean> | null = null;
export function aiEnabled(): Promise<boolean> {
  enabled ??= fetch('/api/ai')
    .then((r) => r.json())
    .then((d: { enabled?: boolean }) => Boolean(d.enabled))
    .catch(() => false);
  return enabled;
}

export async function runAi(task: AiTask, input: Record<string, string>): Promise<string> {
  const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task, input }) });
  const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
  if (!res.ok || !data.text) throw new Error(data.error === 'not-configured' ? 'AI is not configured on this server.' : data.error || 'AI request failed');
  return data.text;
}
