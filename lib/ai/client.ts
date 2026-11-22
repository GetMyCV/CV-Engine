'use client';
import type { AiTask } from './prompts';

import { apiUrl } from '../env';

let enabled: Promise<boolean> | null = null;
export function aiEnabled(): Promise<boolean> {
  const url = apiUrl('/api/ai');
  if (!url) return Promise.resolve(false);
  enabled ??= fetch(url)
    .then((r) => r.json())
    .then((d: { enabled?: boolean }) => Boolean(d.enabled))
    .catch(() => false);
  return enabled;
}

export async function runAi(task: AiTask, input: Record<string, string>): Promise<string> {
  const url = apiUrl('/api/ai');
  if (!url) throw new Error('AI is not available on this site.');
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task, input }) });
  const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
  if (!res.ok || !data.text) throw new Error(data.error === 'not-configured' ? 'AI is not configured on this server.' : data.error || 'AI request failed');
  return data.text;
}
