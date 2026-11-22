/**
 * Two ways to run CV Engine:
 *
 * - Node server (`npm run build && npm start`, Vercel, Render…): full app,
 *   including the /api/ai and /api/grammar routes.
 * - Static export for GitHub Pages (`npm run build:pages`): STATIC_EXPORT=1 and
 *   BASE_PATH=/CV-Engine. GitHub Pages serves files only, so the API routes are
 *   left out and the app uses its offline writing and grammar helpers (or a
 *   separate deployment via NEXT_PUBLIC_API_BASE).
 */
const isStatic = process.env.STATIC_EXPORT === '1';
const basePath = process.env.BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  basePath,
  env: {
    NEXT_PUBLIC_STATIC_EXPORT: isStatic ? '1' : '',
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  ...(isStatic
    ? { output: 'export', trailingSlash: true, images: { unoptimized: true } }
    : {
        async headers() {
          return [
            {
              source: '/(.*)',
              headers: [
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
