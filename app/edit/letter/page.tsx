'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RequireAuth } from '@/components/AuthProvider';
import LetterEditor from '@/components/editor/LetterEditor';

function Page() {
  const docId = useSearchParams().get('doc') ?? '';
  return <RequireAuth>{({ repo }) => <LetterEditor key={docId} repo={repo} docId={docId} />}</RequireAuth>;
}

export default function LetterEditorPage() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
