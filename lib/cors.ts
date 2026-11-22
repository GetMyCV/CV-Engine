/**
 * CORS for the API routes, so the static GitHub Pages site can call a server
 * deployment of this app (NEXT_PUBLIC_API_BASE). Allowed origins come from
 * ALLOWED_ORIGINS (comma-separated); defaults to the GitHub Pages origin.
 */
const allowed = (process.env.ALLOWED_ORIGINS || 'https://getmycv.github.io')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  if (!origin || !allowed.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

export const preflight = (req: Request) => new Response(null, { status: 204, headers: corsHeaders(req) });
