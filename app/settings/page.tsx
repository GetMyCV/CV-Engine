'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { RequireAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/ui/Toast';
import type { DocumentRecord, Project } from '@/lib/types';
import type { AuthUser, Repo } from '@/lib/store';
import { downloadBlob, nowIso, uid } from '@/lib/utils';
import { findLocalWorkspace, moveLocalToCloud } from '@/lib/store/migrate-local';

export default function SettingsPage() {
  return <AppShell><RequireAuth>{(ctx) => <Settings {...ctx} />}</RequireAuth></AppShell>;
}

function Settings({ user, repo }: { user: AuthUser; repo: Repo }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState<{ projects: number; documents: number; requests: number } | null>(null);
  const [moving, setMoving] = useState('');

  // In cloud mode, offer to bring over anything created earlier in browser-only mode.
  useEffect(() => {
    if (user.mode !== 'cloud') return;
    findLocalWorkspace()
      .then((ws) => ws && (ws.projects.length || ws.requests.length) && setLocal({ projects: ws.projects.length, documents: ws.documents.length, requests: ws.requests.length }))
      .catch(() => undefined);
  }, [user.mode]);

  const moveToCloud = async () => {
    setMoving('Starting…');
    try {
      const res = await moveLocalToCloud(repo, (done, total) => setMoving(`Moving ${done} of ${total}…`));
      toast(`Moved ${res.projects} projects, ${res.documents} documents and ${res.requests} client requests to the cloud.`, 'success');
      setLocal(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not move the data', 'error');
    } finally {
      setMoving('');
    }
  };

  const backup = async () => {
    const projects = await repo.listProjects();
    const documents = await repo.listDocuments();
    downloadBlob(new Blob([JSON.stringify({ app: 'cv-engine', version: 1, exportedAt: nowIso(), projects, documents }, null, 2)], { type: 'application/json' }), `cv-engine-backup-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const restore = async (file: File) => {
    setBusy(true);
    try {
      const data = JSON.parse(await file.text()) as { app?: string; projects?: Project[]; documents?: DocumentRecord[] };
      if (data.app !== 'cv-engine' || !Array.isArray(data.projects)) throw new Error('This is not a CV Engine backup file.');
      // Import as new copies with fresh ids so nothing is overwritten.
      const idMap = new Map<string, string>();
      for (const p of data.projects) {
        const id = uid();
        idMap.set(p.id, id);
        await repo.saveProject({ ...p, id, ownerId: user.id });
      }
      let n = 0;
      for (const d of data.documents ?? []) {
        const projectId = idMap.get(d.projectId);
        if (!projectId) continue;
        await repo.saveDocument({ ...d, id: uid(), projectId, ownerId: user.id });
        n++;
      }
      toast(`Imported ${data.projects.length} projects and ${n} documents.`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Import failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const wipe = async () => {
    if (!confirm('Delete ALL your projects and documents? This cannot be undone. Download a backup first.')) return;
    for (const p of await repo.listProjects()) await repo.deleteProject(p.id);
    toast('All projects deleted.', 'success');
  };

  return (
    <div className="container-app max-w-3xl py-10">
      <h1 className="font-display text-2xl font-bold">Account & backups</h1>
      <div className="card mt-6 p-5">
        <h2 className="font-semibold">Account</h2>
        <dl className="mt-3 grid grid-cols-[140px_1fr] gap-2 text-sm">
          <dt className="text-ink-mute">Name</dt><dd>{user.name}</dd>
          <dt className="text-ink-mute">Email</dt><dd>{user.email}</dd>
          <dt className="text-ink-mute">Storage</dt><dd>{user.mode === 'local' ? 'This browser only (local workspace). Clearing browser data deletes it — keep backups.' : 'Cloud (Supabase), private to your account.'}</dd>
        </dl>
      </div>
      <div className="card mt-4 p-5">
        <h2 className="font-semibold">Backup & restore</h2>
        <p className="mt-1 text-sm text-ink-soft">Download every project and document as one JSON file. Restoring imports them as copies, so nothing is overwritten — also handy for moving between devices or from local to cloud mode.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={backup}>Download backup</button>
          <label className="btn-secondary cursor-pointer">
            {busy ? 'Importing…' : 'Restore from backup'}
            <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} disabled={busy} />
          </label>
        </div>
      </div>
      {local && (
        <div className="card mt-4 border-emerald-200 bg-emerald-50 p-5">
          <h2 className="font-semibold">Move your browser data to the cloud</h2>
          <p className="mt-1 text-sm text-ink-soft">
            This browser still holds {local.projects} project(s), {local.documents} document(s) and {local.requests} client request(s) from before cloud sync was switched on. Move them into your cloud account so they are available on every device. Running it again updates rather than duplicates.
          </p>
          <button className="btn-primary mt-3" onClick={moveToCloud} disabled={Boolean(moving)}>
            {moving || 'Move to cloud'}
          </button>
        </div>
      )}
      <div className="card mt-4 border-red-200 p-5">
        <h2 className="font-semibold text-red-700">Danger zone</h2>
        <p className="mt-1 text-sm text-ink-soft">Permanently delete all projects and documents in this account.</p>
        <button className="btn-danger mt-3" onClick={wipe}>Delete all my data</button>
      </div>
    </div>
  );
}
