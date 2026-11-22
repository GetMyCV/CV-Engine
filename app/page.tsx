'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** The app is private: the root goes straight to the admin dashboard (which asks for sign-in). */
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);
  return <div className="grid min-h-screen place-items-center text-sm text-ink-mute">Loading…</div>;
}
