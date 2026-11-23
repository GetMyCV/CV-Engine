/**
 * Supabase connection settings, read at build time.
 *
 * Both values are public by design: the URL and the publishable (anon) key
 * only let the browser talk to the API, and Row Level Security in the
 * database decides what each user may read or write. The database password
 * and the secret/service-role key must NEVER be put here.
 *
 * The key may be given as NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy name) or
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (new "sb_publishable_…" keys).
 */
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/$/, '');
export const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
export const cloudEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);
