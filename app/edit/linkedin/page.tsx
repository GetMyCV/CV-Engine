'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RequireAuth } from '@/components/AuthProvider';
import LinkedInEditor from '@/components/linkedin/LinkedInEditor';

function Page() {
  const docId = useSearchParams().get('doc') ?? '';
  return <RequireAuth>{({ repo }) => <LinkedInEditor key={docId} repo={repo} docId={docId} />}</RequireAuth>;
}

export default function LinkedInEditorPage() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
