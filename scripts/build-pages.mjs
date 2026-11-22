// Builds the static GitHub Pages version into ./out.
// The server-only API routes are moved aside for the build (a static export
// cannot contain them) and are always restored afterwards.
import { execSync } from 'node:child_process';
import { existsSync, renameSync, writeFileSync } from 'node:fs';

const api = 'app/api';
const parked = '.api-routes-parked';
const env = { ...process.env, STATIC_EXPORT: '1', BASE_PATH: process.env.BASE_PATH ?? '/CV-Engine' };

if (existsSync(api)) renameSync(api, parked);
try {
  execSync('npx next build', { stdio: 'inherit', env });
  writeFileSync('out/.nojekyll', '');
} finally {
  if (existsSync(parked)) renameSync(parked, api);
}
