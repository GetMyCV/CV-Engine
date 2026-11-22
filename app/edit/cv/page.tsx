'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RequireAuth } from '@/components/AuthProvider';
import CvEditor from '@/components/editor/CvEditor';

function Page() {
  const docId = useSearchParams().get('doc') ?? '';
  return <RequireAuth>{({ repo }) => <CvEditor key={docId} repo={repo} docId={docId} />}</RequireAuth>;
}

export default function CvEditorPage() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
