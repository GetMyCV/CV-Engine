'use client';
import { useParams } from 'next/navigation';
import { RequireAuth } from '@/components/AuthProvider';
import LinkedInEditor from '@/components/linkedin/LinkedInEditor';

export default function LinkedInPage() {
  const { docId } = useParams<{ docId: string }>();
  return <RequireAuth>{({ repo }) => <LinkedInEditor repo={repo} docId={docId} />}</RequireAuth>;
}
