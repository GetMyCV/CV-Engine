'use client';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { RequireAuth } from '@/components/AuthProvider';
import DesignGallery from '@/components/cv/DesignGallery';
import DesignThumb from '@/components/cv/DesignThumb';
import Modal from '@/components/ui/Modal';
import { Select, TextArea, TextInput } from '@/components/ui/fields';
import Icon from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import type { AuthUser, Repo } from '@/lib/store';
import { CATEGORIES, DESIGN_COUNT, designById, type DesignCategory } from '@/lib/designs';
import { emptyCv, REGION_RULES, sampleCv } from '@/lib/cv-model';
import { docHref, newDocument, newProject } from '@/lib/projects';
import { PRIMARY_ADMIN } from '@/lib/admin';
import {
  STATUS_LABEL,
  decodeSelection,
  newRequest,
  requestLinkUrl,
  type RequestStatus,
  type Selection,
  type TemplateRequest,
} from '@/lib/requests';
import { cx } from '@/lib/utils';

export default function RequestsPage() {
  return (
    <AppShell>
      <RequireAuth>
        {(ctx) => (
          <Suspense>
            <Requests {...ctx} />
          </Suspense>
        )}
      </RequireAuth>
    </AppShell>
  );
}

const DEFAULT_MESSAGE = 'Please choose the CV template you like. Tap a design to preview it, then press “Choose this template”. I will build your CV in that design.';

function Requests({ user, repo }: { user: AuthUser; repo: Repo }) {
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [requests, setRequests] = useState<TemplateRequest[] | null>(null);
  const [editing, setEditing] = useState<TemplateRequest | null>(null);
  const [importing, setImporting] = useState(false);
  const [code, setCode] = useState('');
  const [filter, setFilter] = useState<RequestStatus | 'all'>('all');
  const sampleWithName = useCallback((name: string) => {
    const cv = sampleCv();
    const [first, ...rest] = (name || 'Client Name').split(' ');
    cv.personal.firstName = first ?? '';
    cv.personal.lastName = rest.join(' ');
    return cv;
  }, []);

  /** Attaches a client's selection to its request (or files it as a new one). */
  const applySelection = useCallback(
    async (sel: Selection, list: TemplateRequest[]) => {
      const existing = list.find((r) => r.id === sel.requestId);
      if (existing?.selection && existing.selection.at === sel.at && existing.selection.designId === sel.designId) return null;
      const base = existing ?? newRequest({ id: sel.requestId, clientName: sel.name, clientEmail: sel.email, clientPhone: sel.phone, message: '(request not found on this device — created from the client’s selection)' });
      return repo.saveRequest({
        ...base,
        clientName: base.clientName || sel.name,
        clientEmail: base.clientEmail || sel.email,
        clientPhone: base.clientPhone || sel.phone,
        selection: sel,
        status: base.status === 'sent' ? 'selected' : base.status,
      });
    },
    [repo],
  );

  const load = useCallback(async () => {
    let list = await repo.listRequests();
    // Pull in choices clients submitted online (cloud mode).
    const online = await repo.listSubmittedSelections().catch(() => [] as Selection[]);
    let changed = false;
    for (const sel of [...online].reverse()) {
      const r = list.find((x) => x.id === sel.requestId);
      if (r?.selection && r.selection.at >= sel.at) continue;
      if (await applySelection(sel, list)) changed = true;
      list = await repo.listRequests();
    }
    if (changed) toast('New template choices received', 'success');
    setRequests(list);
  }, [repo, applySelection, toast]);

  useEffect(() => {
    load().catch((e) => toast(e instanceof Error ? e.message : 'Could not load requests', 'error'));
  }, [load, toast]);

  // Selection links from clients' emails: /requests/?import=…
  const imported = useRef<string | null>(null);
  useEffect(() => {
    const token = params.get('import');
    if (!token || requests === null || imported.current === token) return;
    imported.current = token;
    const sel = decodeSelection(token);
    router.replace('/requests');
    if (!sel) return void toast('That selection link is not valid.', 'error');
    applySelection(sel, requests).then((saved) => {
      toast(saved ? `Imported ${sel.name || 'client'}’s choice: ${designById(sel.designId).name}` : 'That selection was already imported.', 'success');
      load();
    });
  }, [params, requests, applySelection, router, toast, load]);

  const save = async (r: TemplateRequest) => {
    await repo.saveRequest(r);
    await load();
  };

  const startCv = async (r: TemplateRequest) => {
    if (!r.selection) return;
    const sel = r.selection;
    const project = await repo.saveProject(newProject(user.id, { name: `CV — ${r.clientName || sel.name || 'Client'}`, notes: [sel.notes && `Client notes: ${sel.notes}`, sel.email && `Email: ${sel.email}`, sel.phone && `Phone: ${sel.phone}`].filter(Boolean).join('\n') }));
    const cv = emptyCv('international', sel.designId);
    const [first, ...rest] = (r.clientName || sel.name).split(' ');
    cv.personal = { ...cv.personal, firstName: first ?? '', lastName: rest.join(' '), email: sel.email || r.clientEmail, phone: sel.phone || r.clientPhone };
    cv.design = { ...cv.design, designId: sel.designId, pageSize: REGION_RULES.international.pageSize };
    const doc = await repo.saveDocument(newDocument(project, 'cv', `CV — ${r.clientName || sel.name}`, cv));
    await repo.saveRequest({ ...r, status: 'in-progress', projectId: project.id });
    router.push(docHref(doc));
  };

  const shown = useMemo(() => (requests ?? []).filter((r) => filter === 'all' || r.status === filter), [requests, filter]);
  const counts = useMemo(() => {
    const c: Partial<Record<RequestStatus, number>> = {};
    for (const r of requests ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [requests]);

  return (
    <div className="container-app py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Client template requests</h1>
          <p className="text-sm text-ink-mute">Send a client a link to choose their CV template. They only see the templates — nothing else.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setImporting(true)}>
            <Icon name="download" /> Import a selection
          </button>
          <button className="btn-primary" onClick={() => setEditing(newRequest({ message: DEFAULT_MESSAGE }))}>
            <Icon name="plus" /> New request
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(['all', 'sent', 'selected', 'in-progress', 'done'] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={cx('rounded-full px-3 py-1 text-xs font-semibold', filter === s ? 'bg-ink text-white' : 'bg-white text-ink-soft ring-1 ring-slate-200 hover:bg-slate-50')}>
            {s === 'all' ? `All (${requests?.length ?? 0})` : `${STATUS_LABEL[s].label} (${counts[s] ?? 0})`}
          </button>
        ))}
        <button className="btn-ghost btn-sm ml-auto" onClick={() => load()}>
          ↻ Refresh
        </button>
      </div>

      {requests === null ? (
        <p className="mt-8 animate-pulse text-sm text-ink-mute">Loading…</p>
      ) : requests.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <div className="text-4xl">📨</div>
          <h2 className="mt-3 font-display text-xl font-semibold">No requests yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-mute">Create a request, send the link to your client, and their chosen template appears here. One click then starts their CV in that design.</p>
          <button className="btn-primary mt-5" onClick={() => setEditing(newRequest({ message: DEFAULT_MESSAGE }))}>
            <Icon name="plus" /> New request
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {shown.map((r) => (
            <RequestCard
              key={r.id}
              r={r}
              cv={sampleWithName(r.clientName)}
              onEdit={() => setEditing(r)}
              onDelete={async () => {
                if (!confirm(`Delete the request for ${r.clientName || 'this client'}?`)) return;
                await repo.deleteRequest(r.id);
                load();
              }}
              onStatus={(status) => save({ ...r, status })}
              onStart={() => startCv(r)}
              onOpenProject={() => router.push(`/project?id=${r.projectId}`)}
              onCopied={() => toast('Link copied', 'success')}
            />
          ))}
        </div>
      )}

      {editing && (
        <RequestEditor
          initial={editing}
          cvFor={sampleWithName}
          onClose={() => setEditing(null)}
          onSave={async (r) => {
            await save(r);
            setEditing(null);
            toast('Request saved — now send the link to your client.', 'success');
          }}
        />
      )}

      <Modal
        open={importing}
        onClose={() => setImporting(false)}
        title="Import a client’s selection"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setImporting(false)}>Cancel</button>
            <button
              className="btn-primary"
              onClick={async () => {
                const sel = decodeSelection(code);
                if (!sel) return toast('That code or link is not valid.', 'error');
                await applySelection(sel, requests ?? []);
                setImporting(false);
                setCode('');
                toast(`Imported ${sel.name || 'client'}’s choice`, 'success');
                load();
              }}
            >
              Import
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">Paste the selection link from the client’s email, or the selection code they copied (starts with <code>CVSEL1.</code>). Opening the link from the email does this automatically.</p>
        <textarea className="input mt-3 min-h-[100px] font-mono text-xs" value={code} onChange={(e) => setCode(e.target.value)} placeholder="CVSEL1.… or https://…/requests/?import=…" />
      </Modal>
    </div>
  );
}

function RequestCard({
  r,
  cv,
  onEdit,
  onDelete,
  onStatus,
  onStart,
  onOpenProject,
  onCopied,
}: {
  r: TemplateRequest;
  cv: ReturnType<typeof sampleCv>;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (s: RequestStatus) => void;
  onStart: () => void;
  onOpenProject: () => void;
  onCopied: () => void;
}) {
  const url = requestLinkUrl(r, PRIMARY_ADMIN);
  const st = STATUS_LABEL[r.status];
  const text = `Hi ${r.clientName.split(' ')[0] || 'there'}, please choose your CV template here: ${url}`;
  const phone = r.clientPhone.replace(/[^\d]/g, '');
  return (
    <div className="card flex flex-col gap-4 p-4 sm:flex-row">
      {r.selection ? (
        <div className="shrink-0 self-start overflow-hidden rounded ring-1 ring-slate-200">
          <DesignThumb cv={cv} designId={r.selection.designId} width={110} />
        </div>
      ) : (
        <div className="grid h-[155px] w-[110px] shrink-0 place-items-center rounded bg-slate-100 text-center text-[11px] text-ink-mute">Waiting for choice</div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{r.clientName || 'Unnamed client'}</h3>
          <span className={cx('chip', st.className)}>{st.label}</span>
          <span className="text-xs text-ink-mute">· {r.designIds.length ? `${r.designIds.length} shortlisted` : `all ${DESIGN_COUNT} designs`} · created {new Date(r.createdAt).toLocaleDateString()}</span>
        </div>
        <p className="text-xs text-ink-mute">{[r.clientEmail, r.clientPhone].filter(Boolean).join(' · ')}</p>
        {r.selection && (
          <div className="mt-2 rounded-lg bg-emerald-50 p-2.5 text-sm">
            Chose <b>{designById(r.selection.designId).name}</b> on {new Date(r.selection.at).toLocaleString()}
            {(r.selection.email || r.selection.phone) && <div className="text-xs text-ink-soft">Contact: {[r.selection.email, r.selection.phone].filter(Boolean).join(' · ')}</div>}
            {r.selection.notes && <div className="mt-1 whitespace-pre-line text-xs text-ink-soft">“{r.selection.notes}”</div>}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {r.selection &&
            (r.projectId ? (
              <button className="btn-primary btn-sm" onClick={onOpenProject}>Open CV project</button>
            ) : (
              <button className="btn-primary btn-sm" onClick={onStart}>
                <Icon name="file" className="h-3.5 w-3.5" /> Start CV in this template
              </button>
            ))}
          <button className="btn-secondary btn-sm" onClick={async () => { await navigator.clipboard.writeText(url); onCopied(); }}>
            <Icon name="copy" className="h-3.5 w-3.5" /> Copy link
          </button>
          <a className="btn-secondary btn-sm" href={`https://wa.me/${phone}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">WhatsApp</a>
          <a className="btn-secondary btn-sm" href={`mailto:${encodeURIComponent(r.clientEmail)}?subject=${encodeURIComponent('Choose your CV template')}&body=${encodeURIComponent(`${text}\n`)}`}>Email</a>
          <a className="btn-ghost btn-sm" href={url} target="_blank" rel="noreferrer">Preview as client</a>
          <button className="btn-ghost btn-sm" onClick={onEdit}>Edit</button>
          <select className="input w-auto py-1 text-xs" value={r.status} onChange={(e) => onStatus(e.target.value as RequestStatus)} aria-label="Status">
            {(Object.keys(STATUS_LABEL) as RequestStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s].label}</option>
            ))}
          </select>
          <button className="btn-ghost btn-sm text-red-600" onClick={onDelete} aria-label="Delete request">
            <Icon name="trash" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function RequestEditor({ initial, onClose, onSave, cvFor }: { initial: TemplateRequest; onClose: () => void; onSave: (r: TemplateRequest) => void; cvFor: (name: string) => ReturnType<typeof sampleCv> }) {
  const [r, setR] = useState(initial);
  const [mode, setMode] = useState<'all' | 'shortlist'>(initial.designIds.length ? 'shortlist' : 'all');
  const up = (patch: Partial<TemplateRequest>) => setR((x) => ({ ...x, ...patch }));
  const toggle = (id: string) => up({ designIds: r.designIds.includes(id) ? r.designIds.filter((d) => d !== id) : [...r.designIds, id] });
  const cv = useMemo(() => cvFor(r.clientName), [cvFor, r.clientName]);
  return (
    <Modal
      open
      onClose={onClose}
      title={initial.clientName ? `Request for ${initial.clientName}` : 'New template request'}
      wide="xl"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!r.clientName.trim() || (mode === 'shortlist' && !r.designIds.length)} onClick={() => onSave({ ...r, designIds: mode === 'all' ? [] : r.designIds })}>
            Save request
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <TextInput label="Client name" value={r.clientName} onChange={(v) => up({ clientName: v })} />
        <TextInput label="Client email (optional)" value={r.clientEmail} onChange={(v) => up({ clientEmail: v })} />
        <TextInput label="Client WhatsApp / phone (optional)" value={r.clientPhone} onChange={(v) => up({ clientPhone: v })} hint="With country code, e.g. +94 77 123 4567" />
        <TextArea className="sm:col-span-3" label="Message shown to the client" value={r.message} onChange={(v) => up({ message: v })} rows={2} />
      </div>
      <div className="mt-5">
        <span className="label">Templates the client can choose from</span>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setMode('all')} className={cx('rounded-xl border px-3 py-2 text-left text-sm', mode === 'all' ? 'border-brand-500 bg-brand-50' : 'border-slate-200')}>
            <b>All {DESIGN_COUNT} designs</b>
            <div className="text-xs text-ink-mute">They browse the full library</div>
          </button>
          <button onClick={() => setMode('shortlist')} className={cx('rounded-xl border px-3 py-2 text-left text-sm', mode === 'shortlist' ? 'border-brand-500 bg-brand-50' : 'border-slate-200')}>
            <b>A shortlist I pick{r.designIds.length ? ` (${r.designIds.length})` : ''}</b>
            <div className="text-xs text-ink-mute">Recommended: 4–12 designs</div>
          </button>
          {mode === 'all' && (
            <Select label="Start on category" value={r.category} onChange={(v) => up({ category: v as DesignCategory | 'all' })} options={[{ value: 'all', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.label }))]} />
          )}
        </div>
      </div>
      {mode === 'shortlist' && (
        <div className="mt-4">
          <p className="mb-2 text-xs text-ink-mute">Click designs to add or remove them from the shortlist.{r.designIds.length > 0 && <button className="ml-2 font-semibold text-red-600" onClick={() => up({ designIds: [] })}>Clear all</button>}</p>
          <DesignGallery cv={cv} onSelect={toggle} selectedIds={r.designIds} thumbWidth={150} />
        </div>
      )}
    </Modal>
  );
}
