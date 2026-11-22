'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import Icon from './ui/Icon';
import { cx } from '@/lib/utils';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/dashboard" className={cx('flex items-center gap-2 font-display text-lg font-bold text-ink', className)}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm text-white shadow-sm">CV</span>
      <span>
        CV<span className="text-brand-600">Engine</span>
      </span>
    </Link>
  );
}

const NAV = [
  { href: '/dashboard', label: 'Projects', auth: true },
  { href: '/requests', label: 'Client requests', auth: true },
  { href: '/templates', label: 'Templates' },
  { href: '/letters', label: 'Letter templates' },
  { href: '/ats-checker', label: 'ATS checker' },
  { href: '/guide', label: 'CV guide' },
];

export default function AppShell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  const { user, signOut, mode } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const { loading } = useAuth();
  // The whole app is private to the administrator. Clients only ever see /choose.
  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(path + window.location.search)}`);
  }, [loading, user, router, path]);
  if (loading || !user)
    return (
      <div className="grid min-h-screen place-items-center text-sm text-ink-mute">
        <span className="animate-pulse">{loading ? 'Loading…' : 'Redirecting to sign in…'}</span>
      </div>
    );
  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className={cx('flex h-14 items-center gap-6', wide ? 'px-4' : 'container-app')}>
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.filter((n) => !n.auth || user).map((n) => (
              <Link key={n.href} href={n.href} className={cx('rounded-lg px-3 py-1.5 text-sm font-medium', path.startsWith(n.href) ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-slate-100')}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <div className="relative">
                <button className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm font-medium hover:bg-slate-50" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{(user.name || user.email)[0]?.toUpperCase()}</span>
                  <span className="hidden max-w-[140px] truncate sm:inline">{user.name || user.email}</span>
                </button>
                {menu && (
                  <div className="card absolute right-0 mt-2 w-60 animate-fade-in p-1.5" onMouseLeave={() => setMenu(false)}>
                    <div className="px-3 py-2 text-xs text-ink-mute">
                      <div className="truncate font-semibold text-ink">{user.email}</div>
                      {mode === 'local' ? 'Local workspace (this browser)' : 'Cloud account — synced'}
                    </div>
                    <Link href="/dashboard" className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50 md:hidden">Projects</Link>
                    <Link href="/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                      <Icon name="settings" /> Account & backups
                    </Link>
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      onClick={async () => {
                        await signOut();
                        router.push('/');
                      }}
                    >
                      <Icon name="logout" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className="btn-ghost">Sign in</Link>
                <Link href="/login?mode=signup" className="btn-primary">Get started</Link>
              </>
            )}
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden" aria-label="Main mobile">
          {NAV.filter((n) => !n.auth || user).map((n) => (
            <Link key={n.href} href={n.href} className={cx('whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium', path.startsWith(n.href) ? 'bg-brand-50 text-brand-700' : 'text-ink-soft')}>
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
