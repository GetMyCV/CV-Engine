'use client';
import { useParams } from 'next/navigation';
import { RequireAuth } from '@/components/AuthProvider';
import LetterEditor from '@/components/editor/LetterEditor';

export default function LetterEditorPage() {
  const { docId } = useParams<{ docId: string }>();
  return <RequireAuth>{({ repo }) => <LetterEditor repo={repo} docId={docId} />}</RequireAuth>;
}
