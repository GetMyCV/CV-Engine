'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import { RequireAuth } from '@/components/AuthProvider';
import Modal from '@/components/ui/Modal';
import { Select, TextArea, TextInput } from '@/components/ui/fields';
import Icon from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import type { DocumentRecord, Project, Region } from '@/lib/types';
import { DOC_KINDS, REGIONS } from '@/lib/types';
import type { Repo, AuthUser } from '@/lib/store';
import { STATUSES, newProject } from '@/lib/projects';
import { cx } from '@/lib/utils';

export default function DashboardPage() {
  return <AppShell>{<RequireAuth>{(ctx) => <Dashboard {...ctx} />}</RequireAuth>}</AppShell>;
}

function Dashboard({ user, repo }: { user: AuthUser; repo: Repo }) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<'all' | Project['status']>('all');
  const [q, setQ] = useState('');
  const toast = useToast();

  const load = useCallback(async () => {
    const [p, d] = await Promise.all([repo.listProjects(), repo.listDocuments()]);
    setProjects(p);
    setDocs(d);
  }, [repo]);
  useEffect(() => {
    load().catch((e) => toast(e.message, 'error'));
  }, [load, toast]);

  const shown = useMemo(
    () => (projects ?? []).filter((p) => (filter === 'all' ? p.status !== 'archived' : p.status === filter)).filter((p) => !q || `${p.name} ${p.company} ${p.targetRole}`.toLowerCase().includes(q.toLowerCase())),
    [projects, filter, q],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of projects ?? []) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [projects]);

  return (
    <div className="container-app py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Hi {user.name.split(' ')[0] || 'there'} 👋</h1>
          <p className="text-sm text-ink-mute">Each project holds the CV, letters and LinkedIn kit for one job target.</p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Icon name="plus" /> New project
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Active projects', value: (projects ?? []).filter((p) => p.status !== 'archived').length },
          { label: 'Documents', value: docs.length },
          { label: 'Applications sent', value: (counts.applied ?? 0) + (counts.interview ?? 0) + (counts.offer ?? 0) },
          { label: 'Interviews & offers', value: (counts.interview ?? 0) + (counts.offer ?? 0) },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-ink-mute">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(['all', ...STATUSES.map((s) => s.id)] as const).map((s) => (
          <button key={s} className={cx('rounded-full px-3 py-1 text-xs font-semibold', filter === s ? 'bg-ink text-white' : 'bg-white text-ink-soft ring-1 ring-slate-200 hover:bg-slate-50')} onClick={() => setFilter(s)}>
            {s === 'all' ? 'All active' : STATUSES.find((x) => x.id === s)!.label}
            {s !== 'all' && counts[s] ? ` (${counts[s]})` : ''}
          </button>
        ))}
        <input className="input ml-auto max-w-xs" placeholder="Search projects…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {projects === null ? (
        <p className="mt-10 animate-pulse text-sm text-ink-mute">Loading projects…</p>
      ) : projects.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <div className="text-4xl">🗂️</div>
          <h2 className="mt-3 font-display text-xl font-semibold">Create your first project</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-mute">A project is one job target — for example “Data Analyst · Shopify · Toronto”. You will build its CV, cover letter and LinkedIn kit inside it.</p>
          <button className="btn-primary mt-5" onClick={() => setCreating(true)}>
            <Icon name="plus" /> New project
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => {
            const pd = docs.filter((d) => d.projectId === p.id);
            const st = STATUSES.find((s) => s.id === p.status)!;
            return (
              <Link key={p.id} href={`/project?id=${p.id}`} className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-sheet">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: p.color }} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold group-hover:text-brand-700">{p.name}</h3>
                    <p className="truncate text-sm text-ink-mute">{[p.targetRole, p.company].filter(Boolean).join(' · ') || 'No target set'}</p>
                  </div>
                  <span className={cx('chip', st.className)}>{st.label}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {DOC_KINDS.map((k) => {
                    const n = pd.filter((d) => d.kind === k.id).length;
                    return n ? (
                      <span key={k.id} className="chip bg-slate-100 text-ink-soft">
                        {n} {k.short}
                      </span>
                    ) : null;
                  })}
                  {pd.length === 0 && <span className="text-xs text-ink-mute">No documents yet</span>}
                </div>
                <div className="mt-auto flex items-center justify-between pt-4 text-[11px] text-ink-mute">
                  <span>{REGIONS.find((r) => r.id === p.region)?.label}</span>
                  <span>Updated {new Date(p.updatedAt).toLocaleDateString()}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <NewProjectModal open={creating} onClose={() => setCreating(false)} user={user} repo={repo} />
    </div>
  );
}

function NewProjectModal({ open, onClose, user, repo }: { open: boolean; onClose: () => void; user: AuthUser; repo: Repo }) {
  const router = useRouter();
  const [targetRole, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [region, setRegion] = useState<Region>('international');
  const [jd, setJd] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const create = async () => {
    setBusy(true);
    try {
      const p = await repo.saveProject(newProject(user.id, { name: [targetRole, company].filter(Boolean).join(' · ') || 'Untitled project', targetRole, company, region, jobDescription: jd }));
      router.push(`/project?id=${p.id}&new=1`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not create project', 'error');
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New project"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={create} disabled={busy}>
            {busy ? 'Creating…' : 'Create project'}
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label="Target job title" value={targetRole} onChange={setRole} placeholder="e.g. Senior Data Analyst" />
        <TextInput label="Company or university" value={company} onChange={setCompany} placeholder="e.g. Shopify" />
        <Select label="CV standard / country" value={region} onChange={setRegion} options={REGIONS.map((r) => ({ value: r.id, label: r.label }))} hint={REGIONS.find((r) => r.id === region)?.hint} className="sm:col-span-2" />
        <TextArea label="Job description (optional, recommended)" value={jd} onChange={setJd} rows={5} placeholder="Paste the job ad to unlock keyword matching and tailoring." className="sm:col-span-2" autoGrow={false} />
      </div>
    </Modal>
  );
}
