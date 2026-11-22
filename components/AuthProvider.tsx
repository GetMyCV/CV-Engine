'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { auth, cloudEnabled, type AuthUser, type Repo } from '@/lib/store';
import { NOT_ALLOWED, isAdminEmail } from '@/lib/admin';

type AuthState = {
  user: AuthUser | null;
  repo: Repo | null;
  loading: boolean;
  mode: 'local' | 'cloud';
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<'ok' | 'confirm'>;
  signOut: () => Promise<void>;
  resetPassword?: (email: string) => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    // Only the administrator may hold a session; anyone else is signed out.
    const accept = async (u: AuthUser | null) => {
      if (u && !isAdminEmail(u.email)) {
        await auth.signOut();
        return null;
      }
      return u;
    };
    auth
      .current()
      .then(accept)
      .then((u) => alive && setUser(u))
      .finally(() => alive && setLoading(false));
    const off = auth.onChange?.((u) => {
      accept(u).then(setUser);
    });
    return () => {
      alive = false;
      off?.();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isAdminEmail(email)) throw new Error(NOT_ALLOWED);
    setUser(await auth.signIn(email, password));
  }, []);
  const signUp = useCallback(async (name: string, email: string, password: string) => {
    if (!isAdminEmail(email)) throw new Error(NOT_ALLOWED);
    const res = await auth.signUp(name, email, password);
    if ('pendingConfirmation' in res) return 'confirm' as const;
    setUser(res);
    return 'ok' as const;
  }, []);
  const signOut = useCallback(async () => {
    await auth.signOut();
    setUser(null);
  }, []);

  const repo = useMemo(() => (user ? auth.repo(user) : null), [user]);
  const value: AuthState = { user, repo, loading, mode: cloudEnabled ? 'cloud' : 'local', signIn, signUp, signOut, resetPassword: auth.resetPassword };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}

/** Redirects to /login when signed out; renders children with a guaranteed repo. */
export function RequireAuth({ children }: { children: (ctx: { user: AuthUser; repo: Repo }) => React.ReactNode }) {
  const { user, repo, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(path + window.location.search)}`);
  }, [loading, user, router, path]);
  if (loading || !user || !repo)
    return (
      <div className="grid min-h-[60vh] place-items-center text-sm text-ink-mute">
        <span className="animate-pulse">Loading your workspace…</span>
      </div>
    );
  return <>{children({ user, repo })}</>;
}
