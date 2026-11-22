/**
 * Who may sign in. CV Engine is run by a single administrator; clients never
 * sign in — they only see the template picker through a link (/choose).
 *
 * Override with NEXT_PUBLIC_ADMIN_EMAILS (comma-separated) at build time.
 * In cloud mode the same rule is enforced in the database by Row Level
 * Security (supabase/migrations/0002_admin_and_requests.sql).
 */
export const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'inbox.ashen@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const PRIMARY_ADMIN = ADMIN_EMAILS[0]!;

export const isAdminEmail = (email?: string | null) => Boolean(email && ADMIN_EMAILS.includes(email.trim().toLowerCase()));

export const NOT_ALLOWED = 'This system is private. Only the administrator can sign in.';
