'use client';
import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { RequireAuth } from '@/components/AuthProvider';
import CvEditor from '@/components/editor/CvEditor';

export default function CvEditorPage() {
  const { docId } = useParams<{ docId: string }>();
  return (
    <RequireAuth>
      {({ repo }) => (
        <Suspense>
          <CvEditor repo={repo} docId={docId} />
        </Suspense>
      )}
    </RequireAuth>
  );
}
