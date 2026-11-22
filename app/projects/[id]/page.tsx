'use client';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import { RequireAuth } from '@/components/AuthProvider';
import Modal from '@/components/ui/Modal';
import { Select, TextArea, TextInput } from '@/components/ui/fields';
import Icon from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import DesignThumb from '@/components/cv/DesignThumb';
import DesignGallery from '@/components/cv/DesignGallery';
import type { CvData, DocKind, DocumentRecord, LetterData, Project } from '@/lib/types';
import { DOC_KINDS, REGIONS } from '@/lib/types';
import type { AuthUser, Repo } from '@/lib/store';
import { PROJECT_COLORS, STATUSES, docHref, newDocument } from '@/lib/projects';
import { REGION_RULES, emptyCv, normalizeCv, sampleCv, fullName } from '@/lib/cv-model';
import { analyzeCv } from '@/lib/ats';
import { extractKeywords } from '@/lib/ats/keywords';
import { templatesFor, type LetterTemplate } from '@/lib/letters/templates';
import { newLetter, placeholderValues } from '@/lib/letters/model';
import { newLinkedIn } from '@/lib/linkedin/content';
import { fromJson } from '@/lib/export/jsonresume';
import { clone, cx, debounce, nowIso, uid } from '@/lib/utils';

export default function ProjectPage() {
  return (
    <AppShell>
      <RequireAuth>
        {(ctx) => (
          <Suspense>
            <ProjectView {...ctx} />
          </Suspense>
        )}
      </RequireAuth>
    </AppShell>
  );
}

function ProjectView({ user, repo }: { user: AuthUser; repo: Repo }) {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [allDocs, setAllDocs] = useState<DocumentRecord[]>([]);
  const [adding, setAdding] = useState<DocKind | null>(params.get('new') ? 'cv' : null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    const [p, d, all] = await Promise.all([repo.getProject(id), repo.listDocuments(id), repo.listDocuments()]);
    setProject(p);
    setDocs(d);
    setAllDocs(all);
  }, [repo, id]);
  useEffect(() => {
    load().catch((e) => toast(e.message, 'error'));
  }, [load, toast]);

  const saveProject = useMemo(() => debounce((p: Project) => repo.saveProject(p).catch((e) => toast(e.message, 'error')), 500), [repo, toast]);
  const update = (patch: Partial<Project>) => {
    if (!project) return;
    const next = { ...project, ...patch };
    setProject(next);
    saveProject(next);
  };

  if (project === undefined) return <p className="container-app py-10 animate-pulse text-sm text-ink-mute">Loading project…</p>;
  if (project === null)
    return (
      <div className="container-app py-16 text-center">
        <h1 className="font-display text-xl font-semibold">Project not found</h1>
        <Link className="btn-secondary mt-4" href="/dashboard">Back to projects</Link>
      </div>
    );

  const cvDoc = docs.find((d) => d.kind === 'cv') as DocumentRecord<CvData> | undefined;
  const report = cvDoc ? analyzeCv(normalizeCv(cvDoc.data), { region: project.region, jobDescription: project.jobDescription, targetRole: project.targetRole }) : null;
  const keywords = extractKeywords(project.jobDescription, 20);

  const duplicate = async (d: DocumentRecord) => {
    const copy: DocumentRecord = { ...clone(d), id: uid(), title: `${d.title} (copy)`, createdAt: nowIso(), updatedAt: nowIso(), versions: [] };
    await repo.saveDocument(copy);
    toast('Duplicated', 'success');
    load();
  };
  const remove = async (d: DocumentRecord) => {
    if (!confirm(`Delete “${d.title}”? This cannot be undone.`)) return;
    await repo.deleteDocument(d.id);
    load();
  };
  const removeProject = async () => {
    if (!confirm(`Delete the project “${project.name}” and all ${docs.length} documents in it? This cannot be undone.`)) return;
    await repo.deleteProject(project.id);
    router.push('/dashboard');
  };

  return (
    <div className="container-app py-8">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-ink-mute hover:text-ink">
        <Icon name="arrowLeft" /> Projects
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-2 h-4 w-4 rounded-full" style={{ background: project.color }} />
          <div>
            <h1 className="font-display text-2xl font-bold">{project.name}</h1>
            <p className="text-sm text-ink-mute">
              {[project.targetRole, project.company, REGIONS.find((r) => r.id === project.region)?.label].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className={cx('input w-auto py-1.5 text-xs font-semibold', STATUSES.find((s) => s.id === project.status)?.className)} value={project.status} onChange={(e) => update({ status: e.target.value as Project['status'] })} aria-label="Status">
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <button className="btn-secondary" onClick={() => setEditing(true)}>
            <Icon name="settings" /> Project details
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Documents</h2>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {DOC_KINDS.map((k) => (
              <button key={k.id} onClick={() => setAdding(k.id)} className="card flex flex-col items-start gap-1 p-3 text-left transition hover:-translate-y-0.5 hover:border-brand-300">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon name={k.id === 'linkedin' ? 'linkedin' : k.id === 'cv' ? 'file' : 'layout'} />
                </span>
                <span className="text-sm font-semibold">+ {k.short}</span>
                <span className="text-[11px] leading-snug text-ink-mute">{k.description}</span>
              </button>
            ))}
          </div>

          {docs.length === 0 ? (
            <div className="card mt-5 p-8 text-center text-sm text-ink-mute">No documents yet — start with a CV; letters and the LinkedIn kit reuse its details.</div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {docs.map((d) => (
                <div key={d.id} className="card group overflow-hidden">
                  <Link href={docHref(d)} className="block bg-slate-100 p-3">
                    <div className="mx-auto h-[200px] w-[142px] overflow-hidden rounded shadow ring-1 ring-slate-200">
                      {d.kind === 'cv' ? (
                        <DesignThumb cv={normalizeCv(d.data as CvData)} designId={(d.data as CvData).design?.designId} width={142} region={project.region} />
                      ) : (
                        <div className="flex h-full flex-col gap-1 bg-white p-3">
                          <div className="h-2 w-2/3 rounded" style={{ background: d.kind === 'linkedin' ? '#0A66C2' : project.color }} />
                          {Array.from({ length: 14 }, (_, i) => (
                            <div key={i} className="h-1 rounded bg-slate-200" style={{ width: `${60 + ((i * 37) % 40)}%` }} />
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="chip bg-brand-50 text-brand-700">{DOC_KINDS.find((k) => k.id === d.kind)?.short}</span>
                      <Link href={docHref(d)} className="truncate text-sm font-semibold hover:text-brand-700">{d.title}</Link>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-ink-mute">
                      <span>Edited {new Date(d.updatedAt).toLocaleString()}</span>
                      <span className="flex gap-1 opacity-60 group-hover:opacity-100">
                        <button className="btn-ghost btn-sm" onClick={() => duplicate(d)} title="Duplicate" aria-label="Duplicate">
                          <Icon name="copy" />
                        </button>
                        <button className="btn-ghost btn-sm text-red-600" onClick={() => remove(d)} title="Delete" aria-label="Delete">
                          <Icon name="trash" />
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold">ATS readiness</h3>
            {report ? (
              <>
                <div className="mt-2 flex items-end gap-2">
                  <span className={cx('text-3xl font-bold', report.score >= 85 ? 'text-emerald-600' : report.score >= 70 ? 'text-brand-600' : report.score >= 50 ? 'text-amber-600' : 'text-red-600')}>{report.score}</span>
                  <span className="pb-1 text-xs text-ink-mute">/ 100 · {report.grade}</span>
                </div>
                {report.keywords.all.length > 0 && <p className="mt-1 text-xs text-ink-mute">Keyword match: {report.keywords.percent}%</p>}
                <Link href={docHref(cvDoc!) + '?panel=ats'} className="btn-secondary btn-sm mt-3">Open ATS report</Link>
              </>
            ) : (
              <p className="mt-2 text-xs text-ink-mute">Create a CV to see its score.</p>
            )}
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-semibold">Job ad keywords</h3>
            {keywords.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {keywords.map((k) => (
                  <span key={k} className={cx('chip', report?.keywords.matched.includes(k) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-ink-soft')}>
                    {report?.keywords.matched.includes(k) ? '✓ ' : ''}
                    {k}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-ink-mute">Paste the job description in Project details to extract keywords.</p>
            )}
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-semibold">{REGIONS.find((r) => r.id === project.region)?.label} conventions</h3>
            <ul className="mt-2 space-y-1.5 text-xs text-ink-soft">
              {REGION_RULES[project.region].notes.map((n) => (
                <li key={n} className="flex gap-1.5">
                  <span className="text-brand-500">•</span>
                  {n}
                </li>
              ))}
            </ul>
          </div>
          <TextArea label="Notes" value={project.notes} onChange={(v) => update({ notes: v })} rows={4} placeholder="Contacts, deadlines, interview prep…" />
        </aside>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Project details" wide footer={<><button className="btn-danger mr-auto" onClick={removeProject}><Icon name="trash" /> Delete project</button><button className="btn-primary" onClick={() => setEditing(false)}>Done</button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Project name" value={project.name} onChange={(v) => update({ name: v })} />
          <Select label="CV standard / country" value={project.region} onChange={(v) => update({ region: v })} options={REGIONS.map((r) => ({ value: r.id, label: r.label }))} hint={REGIONS.find((r) => r.id === project.region)?.hint} />
          <TextInput label="Target job title" value={project.targetRole} onChange={(v) => update({ targetRole: v })} />
          <TextInput label="Company / university" value={project.company} onChange={(v) => update({ company: v })} />
          <div className="sm:col-span-2">
            <span className="label">Colour</span>
            <div className="flex gap-2">
              {PROJECT_COLORS.map((c) => (
                <button key={c} aria-label={c} onClick={() => update({ color: c })} className={cx('h-7 w-7 rounded-full', project.color === c && 'ring-2 ring-ink ring-offset-2')} style={{ background: c }} />
              ))}
            </div>
          </div>
          <TextArea className="sm:col-span-2" label="Job description" value={project.jobDescription} onChange={(v) => update({ jobDescription: v })} rows={10} autoGrow={false} placeholder="Paste the full job ad. It powers keyword matching, the ATS score and AI tailoring." />
        </div>
      </Modal>

      <NewDocumentModal kind={adding} onClose={() => setAdding(null)} project={project} user={user} repo={repo} projectDocs={docs} allDocs={allDocs} />
    </div>
  );
}

function NewDocumentModal({ kind, onClose, project, user, repo, projectDocs, allDocs }: { kind: DocKind | null; onClose: () => void; project: Project; user: AuthUser; repo: Repo; projectDocs: DocumentRecord[]; allDocs: DocumentRecord[] }) {
  const router = useRouter();
  const toast = useToast();
  const cvs = allDocs.filter((d) => d.kind === 'cv') as DocumentRecord<CvData>[];
  const projectCv = (projectDocs.find((d) => d.kind === 'cv') ?? cvs[0]) as DocumentRecord<CvData> | undefined;
  const [start, setStart] = useState<'blank' | 'sample' | 'copy' | 'import'>(cvs.length ? 'copy' : 'blank');
  const [copyFrom, setCopyFrom] = useState(cvs[0]?.id ?? '');
  const [imported, setImported] = useState<CvData | null>(null);
  const [design, setDesign] = useState(REGION_RULES[project.region].defaultDesign);
  const [templateId, setTemplateId] = useState('');
  const [sourceCv, setSourceCv] = useState(projectCv?.id ?? '');
  const [busy, setBusy] = useState(false);
  const meta = DOC_KINDS.find((k) => k.id === kind);

  useEffect(() => {
    if (!kind) return;
    setTemplateId(kind === 'cv' || kind === 'linkedin' ? '' : templatesFor(kind)[0]?.id ?? '');
    setSourceCv(projectCv?.id ?? '');
  }, [kind, projectCv?.id]);

  const create = async () => {
    if (!kind) return;
    setBusy(true);
    try {
      const src = cvs.find((c) => c.id === sourceCv);
      const srcCv = src ? normalizeCv(src.data) : null;
      let doc: DocumentRecord;
      if (kind === 'cv') {
        let data: CvData;
        if (start === 'sample') data = sampleCv(project.region);
        else if (start === 'copy' && copyFrom) data = clone(normalizeCv(cvs.find((c) => c.id === copyFrom)!.data));
        else if (start === 'import' && imported) data = imported;
        else data = emptyCv(project.region);
        data.design = { ...data.design, designId: design, pageSize: REGION_RULES[project.region].pageSize, dateFormat: start === 'copy' ? data.design.dateFormat : REGION_RULES[project.region].dateFormat };
        if (!data.personal.headline && project.targetRole) data.personal.headline = project.targetRole;
        if (start !== 'copy') data.sectionOrder = [...REGION_RULES[project.region].order, ...data.sectionOrder.filter((k) => !REGION_RULES[project.region].order.includes(k))];
        doc = newDocument(project, 'cv', `CV — ${project.targetRole || fullName(data.personal) || 'Untitled'}`, data);
      } else if (kind === 'linkedin') {
        doc = newDocument(project, 'linkedin', 'LinkedIn makeover', newLinkedIn(srcCv, project));
      } else {
        const t = templatesFor(kind).find((x) => x.id === templateId) ?? templatesFor(kind)[0]!;
        const values = placeholderValues(project, srcCv, user.name);
        const data: LetterData = newLetter(t, values, srcCv, project);
        doc = newDocument(project, kind, `${meta?.short ?? 'Letter'} — ${project.company || t.name}`, data);
      }
      const saved = await repo.saveDocument(doc);
      router.push(docHref(saved));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not create document', 'error');
      setBusy(false);
    }
  };

  const onFile = async (file: File) => {
    try {
      const cv = fromJson(JSON.parse(await file.text()));
      if (!cv) throw new Error('That file is not a JSON Resume or CV Engine export.');
      setImported(cv);
      toast(`Imported ${fullName(cv.personal) || 'CV'}`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not read file', 'error');
    }
  };

  return (
    <Modal
      open={Boolean(kind)}
      onClose={onClose}
      title={`New ${meta?.label ?? ''}`}
      wide="xl"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={create} disabled={busy || (kind === 'cv' && start === 'import' && !imported)}>
            {busy ? 'Creating…' : 'Create'}
          </button>
        </>
      }
    >
      {kind === 'cv' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold">1. Starting point</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-4">
              {(
                [
                  ['copy', 'Copy an existing CV', `Reuse one of your ${cvs.length} CVs and tailor it.`],
                  ['blank', 'Blank CV', 'Start fresh with guided sections.'],
                  ['sample', 'Sample CV', 'See a complete example, then overwrite it.'],
                  ['import', 'Import JSON', 'JSON Resume or CV Engine backup.'],
                ] as const
              )
                .filter(([id]) => id !== 'copy' || cvs.length)
                .map(([id, title, body]) => (
                  <button key={id} onClick={() => setStart(id)} className={cx('rounded-xl border p-3 text-left', start === id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50')}>
                    <div className="text-sm font-semibold">{title}</div>
                    <div className="text-xs text-ink-mute">{body}</div>
                  </button>
                ))}
            </div>
            {start === 'copy' && (
              <select className="input mt-3 max-w-md" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
                {cvs.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            )}
            {start === 'import' && <input type="file" accept="application/json,.json" className="mt-3 text-sm" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />}
          </div>
          <div>
            <h3 className="text-sm font-semibold">2. Design <span className="font-normal text-ink-mute">(you can change it any time)</span></h3>
            <div className="mt-3">
              <DesignGallery cv={start === 'copy' && copyFrom ? normalizeCv(cvs.find((c) => c.id === copyFrom)?.data) : sampleCv(project.region)} selected={design} onSelect={setDesign} region={project.region} thumbWidth={150} />
            </div>
          </div>
        </div>
      )}
      {kind && kind !== 'cv' && (
        <div className="space-y-5">
          <Select
            label="Fill details from this CV"
            value={sourceCv}
            onChange={setSourceCv}
            options={[{ value: '', label: 'None — start empty' }, ...cvs.map((c) => ({ value: c.id, label: c.title }))]}
            hint="Name, contact details, experience, skills and achievements are pulled in automatically."
            className="max-w-md"
          />
          {kind !== 'linkedin' && <TemplatePicker kind={kind} value={templateId} onChange={setTemplateId} />}
          {kind === 'linkedin' && <p className="text-sm text-ink-soft">You will get a banner (1584×396), a profile-photo frame, a post image, headline options, an About section and a profile checklist — all generated from your CV.</p>}
        </div>
      )}
    </Modal>
  );
}

function TemplatePicker({ kind, value, onChange }: { kind: LetterTemplate['kind']; value: string; onChange: (id: string) => void }) {
  const list = templatesFor(kind);
  const cats = [...new Set(list.map((t) => t.category))];
  return (
    <div>
      <span className="label">Template ({list.length})</span>
      {cats.map((c) => (
        <div key={c} className="mt-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-mute">{c}</h4>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {list
              .filter((t) => t.category === c)
              .map((t) => (
                <button key={t.id} onClick={() => onChange(t.id)} className={cx('rounded-xl border p-3 text-left', value === t.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50')}>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="mt-0.5 text-xs text-ink-mute">{t.description}</div>
                  <div className="mt-1 text-[11px] text-ink-mute">
                    {t.blocks.length} {t.showHeadings ? 'sections' : 'paragraphs'}
                    {t.wordTarget ? ` · ~${t.wordTarget} words` : ''}
                  </div>
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
