/**
 * Where the server routes (/api/ai, /api/grammar) live.
 *
 * - Normal Node deployment (`next start`, Vercel…): same origin.
 * - Static export (GitHub Pages): there is no server, so these features are off
 *   unless NEXT_PUBLIC_API_BASE points at a separate deployment of this app
 *   (e.g. https://cv-engine.vercel.app) that does run the routes.
 */
const STATIC = process.env.NEXT_PUBLIC_STATIC_EXPORT === '1';
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? '').replace(/\/$/, '');

export function apiUrl(path: string): string | null {
  if (API_BASE) return `${API_BASE}${path}`;
  return STATIC ? null : path;
}
