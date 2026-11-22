'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/AppShell';
import { useAuth } from '@/components/AuthProvider';
import { TextInput } from '@/components/ui/fields';

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, signIn, signUp, mode, resetPassword } = useAuth();
  const [signup, setSignup] = useState(params.get('mode') === 'signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const next = params.get('next') || '/dashboard';

  useEffect(() => {
    if (user) router.replace(next.startsWith('/') ? next : '/dashboard');
  }, [user, router, next]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (signup && password.length < 8) return setError('Use at least 8 characters for your password.');
    setBusy(true);
    try {
      if (signup) {
        const r = await signUp(name, email, password);
        if (r === 'confirm') setNotice('Check your inbox to confirm your email, then sign in.');
      } else await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <Logo />
        <div className="mx-auto mt-10 w-full max-w-sm">
          <h1 className="font-display text-2xl font-bold">{signup ? 'Set up the admin account' : 'Admin sign in'}</h1>
          <p className="mt-1 text-sm text-ink-mute">{signup ? 'First-time setup for the administrator on this device.' : 'This system is private to the administrator.'}</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {signup && <TextInput label="Full name" value={name} onChange={setName} autoComplete="name" />}
            <TextInput label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
            <TextInput label="Password" type="password" value={password} onChange={setPassword} autoComplete={signup ? 'new-password' : 'current-password'} hint={signup ? 'At least 8 characters.' : undefined} />
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
            {notice && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
            <button className="btn-primary w-full py-2.5" disabled={busy || !email || !password || (signup && !name)}>
              {busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
            </button>
          </form>
          {!signup && resetPassword && (
            <button
              className="mt-3 text-xs text-ink-mute hover:text-brand-600"
              onClick={async () => {
                if (!email) return setError('Enter your email first.');
                try {
                  await resetPassword(email);
                  setNotice('Password reset email sent.');
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not send reset email.');
                }
              }}
            >
              Forgot password?
            </button>
          )}
          <p className="mt-6 text-sm text-ink-soft">
            {signup ? 'Already set up?' : 'First time on this device?'}{' '}
            <button className="font-semibold text-brand-600 hover:underline" onClick={() => setSignup((s) => !s)}>
              {signup ? 'Sign in' : 'Set up the admin account'}
            </button>
          </p>
          {mode === 'local' && (
            <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
              <b>Local workspace mode.</b> Your projects are stored privately in this browser. To use them on another device, export a backup (Account &amp; backups) and restore it there, or connect Supabase for automatic sync.
            </p>
          )}
        </div>
      </div>
      <div className="hidden bg-gradient-to-br from-brand-600 to-brand-900 p-12 text-white lg:flex lg:flex-col lg:justify-center">
        <h2 className="font-display text-3xl font-bold leading-tight">CV Engine — admin</h2>
        <ul className="mt-8 space-y-3 text-brand-100">
          {['ATS-friendly CVs in 468 designs', 'Europass & Canadian standard formats', 'Cover letters, motivation letters & SOPs', 'LinkedIn banner, photo frame & About writer', 'ATS checker + grammar checker built in'].map((t) => (
            <li key={t} className="flex gap-2">✓ <span>{t}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
