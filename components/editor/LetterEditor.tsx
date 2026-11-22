'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CvData, DocumentRecord, LetterBlock, LetterCompose, LetterData } from '@/lib/types';
import { DOC_KINDS } from '@/lib/types';
import type { Repo } from '@/lib/store';
import { letterFields } from '@/lib/grammar/fields';
import { checkText } from '@/lib/grammar';
import { letterPlainText, newLetter, normalizeLetter, placeholderValues } from '@/lib/letters/model';
import { templatesFor } from '@/lib/letters/templates';
import { DESIGN_COUNT, FONTS, PALETTES, designById } from '@/lib/designs';
import { normalizeCv, sampleCv } from '@/lib/cv-model';
import { cvToPlainText } from '@/lib/export/text';
import { runAi } from '@/lib/ai/client';
import { cx, downloadBlob, slug, uid, wordCount } from '@/lib/utils';
import { toDocumentFile } from '@/lib/export/document';
import { applyComposition, composeLetter, defaultCompose } from '@/lib/letters/compose';
import { onChange as onStoreChange } from '@/lib/store/events';
import ComposerPanel from '@/components/letters/ComposerPanel';
import LetterRenderer from '@/components/letters/LetterRenderer';
import { PAGE } from '@/components/cv/CvRenderer';
import ScaledSheet from '@/components/ScaledSheet';
import { usePrint } from '@/components/PrintPortal';
import DesignGallery from '@/components/cv/DesignGallery';
import Modal from '@/components/ui/Modal';
import { Select, TextArea, TextInput, Toggle } from '@/components/ui/fields';
import Icon from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import EditorTopBar from './EditorTopBar';
import GrammarPanel from './GrammarPanel';
import { AiButton, useAiAvailable } from './CvSections';
import { useDocument } from './useDocument';

type Tab = 'compose' | 'content' | 'design' | 'grammar' | 'template';

export default function LetterEditor({ repo, docId }: { repo: Repo; docId: string }) {
  const { doc, project, setProject, save, setData, setTitle, undo, redo, canUndo, canRedo, snapshot, restore } = useDocument<LetterData>(repo, docId, (raw) => normalizeLetter(raw as Partial<LetterData>));
  const [tab, setTab] = useState<Tab>('compose');
  const [cvs, setCvs] = useState<DocumentRecord<CvData>[]>([]);
  const [gallery, setGallery] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const ai = useAiAvailable();
  const toast = useToast();
  const { print, portal } = usePrint();

  useEffect(() => {
    repo.listDocuments().then((d) => setCvs(d.filter((x) => x.kind === 'cv') as DocumentRecord<CvData>[]));
  }, [repo]);

  const l = doc?.data;
  const kind = (doc?.kind ?? 'cover') as 'cover' | 'motivation' | 'sop';
  const projectCv = useMemo(() => cvs.find((c) => c.projectId === doc?.projectId) ?? cvs[0], [cvs, doc?.projectId]);
  const up = useCallback((patch: Partial<LetterData>) => setData((d) => ({ ...d, ...patch })), [setData]);
  const words = l ? wordCount(l.blocks.map((b) => b.body).join(' ')) : 0;
  const placeholders = l ? (l.blocks.map((b) => b.body).join(' ') + l.subject).match(/\[[^\]]{2,60}\]/g) ?? [] : [];
  const grammarCount = useMemo(() => (l ? letterFields(l).reduce((n, f) => n + checkText(f.text, { mode: 'letter' }).length, 0) : 0), [l]);

  /* ---------------------------------------------- real-time composer */
  const compose = l?.compose;
  const linkedDoc = useMemo(() => cvs.find((c) => c.id === compose?.cvId) ?? projectCv, [cvs, compose?.cvId, projectCv]);
  const linkedCv = useMemo(() => (linkedDoc ? normalizeCv(linkedDoc.data) : null), [linkedDoc]);
  const composed = useMemo(() => (l?.compose ? composeLetter(l, linkedCv, project) : null), [l, linkedCv, project]);

  // Re-write the letter whenever the CV, project or composer settings change.
  useEffect(() => {
    if (!l || !l.compose?.live || !composed) return;
    const next = applyComposition(l, composed, linkedCv);
    if (JSON.stringify(next) !== JSON.stringify(l)) setData(next);
  }, [l, composed, linkedCv, setData]);

  // Pick up CV and project saves (this tab or others) as they happen.
  const projectId = doc?.projectId;
  useEffect(
    () =>
      onStoreChange(async (e) => {
        if (e.type === 'document') {
          const d = await repo.getDocument(e.id);
          if (d?.kind === 'cv') setCvs((list) => (list.some((x) => x.id === d.id) ? list.map((x) => (x.id === d.id ? (d as DocumentRecord<CvData>) : x)) : [...list, d as DocumentRecord<CvData>]));
        } else if (e.type === 'project' && e.id === projectId) {
          const p = await repo.getProject(e.id);
          if (p) setProject(p);
        }
      }),
    [repo, projectId, setProject],
  );

  const setCompose = useCallback((patch: Partial<LetterCompose>) => setData((d) => ({ ...d, compose: { ...(d.compose ?? defaultCompose(projectCv?.id ?? '')), ...patch } })), [setData, projectCv?.id]);
  /** A hand edit to a composed part: keep it from now on. */
  const markEdited = (key: string | undefined, patch: Partial<LetterData>) =>
    up(l?.compose && key ? { ...patch, compose: { ...l.compose, edited: [...new Set([...l.compose.edited, key])] } } : patch);
  const editBlock = (b: LetterBlock, patch: Partial<LetterBlock>) => markEdited(b.key, { blocks: l!.blocks.map((x) => (x.id === b.id ? { ...x, ...patch } : x)) });

  if (doc === undefined) return <p className="p-8 animate-pulse text-sm text-ink-mute">Loading…</p>;
  if (doc === null || !l) return <p className="p-8 text-sm">This document could not be found.</p>;
  const page = PAGE[l.design.pageSize];
  const label = DOC_KINDS.find((k) => k.id === kind)?.label ?? 'Letter';
  const fileBase = `${slug(l.sender.name || 'Letter')}-${slug(label)}${project?.company ? `-${slug(project.company)}` : ''}`;
  const region = project?.region ?? 'international';
  const locale = region === 'us' ? 'en-US' : region === 'canada' ? 'en-CA' : 'en-GB';

  const exports = [
    { label: 'Download PDF', hint: `${l.design.pageSize}, matches your CV design`, icon: 'print', run: () => print(<LetterRenderer letter={l} />, fileBase, l.design.pageSize) },
    { label: 'Download Word (.docx)', hint: 'Editable letter', icon: 'file', run: async () => { const { letterToDocx } = await import('@/lib/export/docx'); downloadBlob(await letterToDocx(l), `${fileBase}.docx`); } },
    { label: 'Download plain text (.txt)', hint: 'For email bodies and web forms', icon: 'file', run: () => downloadBlob(new Blob([letterPlainText(l)], { type: 'text/plain' }), `${fileBase}.txt`) },
    { label: 'Export as JSON', hint: 'Complete CV Engine file — re-import into any project', icon: 'download', run: () => downloadBlob(new Blob([JSON.stringify(toDocumentFile(doc), null, 2)], { type: 'application/json' }), `${fileBase}.cv-engine.json`) },
    { label: 'Copy as text', hint: 'Paste into an email', icon: 'copy', run: async () => { await navigator.clipboard.writeText(letterPlainText(l)); toast('Copied', 'success'); } },
  ];

  const writeAll = async () => {
    const cv = projectCv ? normalizeCv(projectCv.data) : null;
    const text = await runAi('letter', {
      kind,
      cv: cv ? cvToPlainText(cv) : '',
      structure: l.blocks.map((b, i) => `${i + 1}. ${b.heading || ''} ${b.body.slice(0, 160)}`).join('\n'),
      text: l.blocks.map((b) => b.body).join('\n\n'),
      targetRole: project?.targetRole ?? '',
      company: project?.company ?? '',
      jobDescription: project?.jobDescription ?? '',
      words: String(l.wordTarget || ''),
      headings: String(l.showHeadings),
      locale,
    });
    snapshot('Before AI draft');
    // The AI draft replaces the composed text, so pause live mode (turn it back on to recompose).
    if (compose?.live) setCompose({ live: false });
    const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    up({
      blocks: paras.map((p, i) => {
        const m = l.showHeadings ? p.match(/^([^\n:]{2,60}):\s*\n?([\s\S]*)$/) : null;
        return { id: l.blocks[i]?.id ?? uid('b'), heading: m ? m[1]!.trim() : l.blocks[i]?.heading ?? '', body: m ? m[2]!.trim() : p };
      }),
    });
  };

  return (
    <div className="flex h-screen flex-col">
      <EditorTopBar backHref={`/project?id=${doc.projectId}`} backLabel={project?.name ?? 'Project'} title={doc.title} onTitle={setTitle} save={save} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} exports={exports} versions={doc.versions} onSnapshot={snapshot} onRestore={restore} />
      <div className="flex min-h-0 flex-1">
        <div className={cx('flex w-full flex-col border-r border-slate-200 bg-slate-50 lg:w-[520px]', mobilePreview && 'hidden lg:flex')}>
          <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 pt-2" role="tablist">
            {(['compose', 'content', 'design', 'grammar', 'template'] as Tab[]).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx('flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium', tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-mute hover:text-ink')}>
                {t === 'compose' ? 'Write from CV' : t === 'content' ? 'Edit text' : t[0]!.toUpperCase() + t.slice(1)}
                {t === 'compose' && compose?.live && <span className="chip bg-emerald-100 text-emerald-700">Live</span>}
                {t === 'grammar' && <span className={cx('chip', grammarCount ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>{grammarCount || '✓'}</span>}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {tab === 'compose' &&
              (compose ? (
                <ComposerPanel compose={compose} onChange={setCompose} cvs={cvs.filter((c) => c.projectId === doc.projectId).concat(cvs.filter((c) => c.projectId !== doc.projectId))} composed={composed} templateId={l.templateId} kind={kind} words={words} />
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                  <h3 className="font-semibold">Write this letter from your CV</h3>
                  <p className="mt-1 text-ink-soft">This letter was written by hand. Turn on the composer to rewrite it from your CV — every achievement, skill and qualification, matched to the job ad — and keep it updated in real time. Your current text is saved in History first.</p>
                  <button
                    className="btn-primary btn-sm mt-3"
                    disabled={!cvs.length}
                    onClick={() => {
                      snapshot('Before writing from CV');
                      up({ blocks: [], compose: defaultCompose(projectCv?.id ?? '') });
                    }}
                  >
                    {cvs.length ? 'Write from my CV (live)' : 'Create a CV first'}
                  </button>
                </div>
              ))}
            {tab === 'content' && (
              <>
                {compose?.live && <p className="rounded-xl bg-emerald-50 p-3 text-[11px] text-emerald-800">Live mode: paragraphs marked “From CV” update automatically. Editing one keeps your wording from then on — use “Regenerate” to hand it back to the composer.</p>}
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs">
                  <span className={cx('font-semibold', l.wordTarget && Math.abs(words - l.wordTarget) > l.wordTarget * 0.25 ? 'text-amber-600' : 'text-emerald-600')}>
                    {words} words{l.wordTarget ? ` / target ${l.wordTarget}` : ''}
                  </span>
                  {placeholders.length > 0 && <span className="chip bg-amber-100 text-amber-800">{placeholders.length} [placeholders] to personalise</span>}
                  <span className="ml-auto">{ai && <AiButton label="Write full draft with AI" onRun={writeAll} />}</span>
                </div>
                <details className="rounded-xl border border-slate-200 bg-white p-3" open={!l.sender.name}>
                  <summary className="cursor-pointer text-sm font-semibold">Your details & recipient</summary>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <TextInput label="Your name" value={l.sender.name} onChange={(v) => up({ sender: { ...l.sender, name: v } })} />
                    <TextInput label="Headline" value={l.sender.headline} onChange={(v) => up({ sender: { ...l.sender, headline: v } })} />
                    <TextInput label="Email" value={l.sender.email} onChange={(v) => up({ sender: { ...l.sender, email: v } })} />
                    <TextInput label="Phone" value={l.sender.phone} onChange={(v) => up({ sender: { ...l.sender, phone: v } })} />
                    <TextInput label="City" value={l.sender.city} onChange={(v) => up({ sender: { ...l.sender, city: v } })} />
                    <TextInput label="LinkedIn" value={l.sender.linkedin} onChange={(v) => up({ sender: { ...l.sender, linkedin: v } })} />
                    <TextInput label="Recipient name" value={l.recipient.name} onChange={(v) => up({ recipient: { ...l.recipient, name: v } })} hint="Addressing a named person beats “Hiring Manager”." />
                    <TextInput label="Recipient title" value={l.recipient.title} onChange={(v) => up({ recipient: { ...l.recipient, title: v } })} />
                    <TextInput label="Organisation" value={l.recipient.organization} onChange={(v) => up({ recipient: { ...l.recipient, organization: v } })} />
                    <TextInput label="Date" value={l.date} onChange={(v) => up({ date: v })} />
                    <TextArea className="sm:col-span-2" label="Address (optional)" value={l.recipient.address} onChange={(v) => up({ recipient: { ...l.recipient, address: v } })} rows={2} />
                    {cvs.length > 0 && (
                      <button
                        className="btn-secondary btn-sm sm:col-span-2"
                        onClick={() => {
                          const cv = projectCv ? normalizeCv(projectCv.data) : null;
                          if (!cv) return;
                          const p = cv.personal;
                          up({ sender: { name: `${p.firstName} ${p.lastName}`.trim(), headline: p.headline, email: p.email, phone: p.phone, city: [p.city, p.country].filter(Boolean).join(', '), linkedin: p.linkedin }, signature: `${p.firstName} ${p.lastName}`.trim() });
                          toast('Details copied from your CV', 'success');
                        }}
                      >
                        Refresh my details from the CV
                      </button>
                    )}
                  </div>
                </details>
                <TextInput label="Subject line" value={l.subject} onChange={(v) => markEdited('subject', { subject: v })} />
                <TextInput label="Salutation" value={l.salutation} onChange={(v) => markEdited('salutation', { salutation: v })} />
                <Toggle label="Show section headings (SOP style)" checked={l.showHeadings} onChange={(v) => up({ showHeadings: v })} />
                {l.blocks.map((b, i) => (
                  <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex items-center gap-2">
                      {l.showHeadings ? (
                        <input className="input py-1 text-sm font-semibold" value={b.heading} placeholder="Section heading" onChange={(e) => editBlock(b, { heading: e.target.value })} />
                      ) : (
                        <span className="text-xs font-semibold text-ink-mute">Paragraph {i + 1}</span>
                      )}
                      {compose && b.key && (compose.edited.includes(b.key) ? (
                        <button className="chip bg-amber-100 text-amber-800 hover:bg-amber-200" title="Hand the paragraph back to the composer" onClick={() => setCompose({ edited: compose.edited.filter((k) => k !== b.key) })}>
                          Edited · Regenerate ↻
                        </button>
                      ) : (
                        <span className="chip bg-emerald-100 text-emerald-700">From CV</span>
                      ))}
                      <span className="ml-auto text-[11px] text-ink-mute">{wordCount(b.body)} w</span>
                      <button className="btn-ghost btn-sm" disabled={i === 0} onClick={() => { const n = [...l.blocks]; [n[i - 1], n[i]] = [n[i]!, n[i - 1]!]; up({ blocks: n }); }} aria-label="Move up"><Icon name="up" className="h-3.5 w-3.5" /></button>
                      <button className="btn-ghost btn-sm text-red-500" onClick={() => up({ blocks: l.blocks.filter((x) => x.id !== b.id) })} aria-label="Remove paragraph"><Icon name="trash" className="h-3.5 w-3.5" /></button>
                    </div>
                    <TextArea value={b.body} onChange={(v) => editBlock(b, { body: v })} rows={4} />
                  </div>
                ))}
                <button className="btn-secondary btn-sm w-full border-dashed" onClick={() => up({ blocks: [...l.blocks, { id: uid('b'), heading: '', body: '' }] })}>
                  <Icon name="plus" className="h-3.5 w-3.5" /> Add paragraph
                </button>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextInput label="Closing" value={l.closing} onChange={(v) => markEdited('closing', { closing: v })} />
                  <TextInput label="Signature" value={l.signature} onChange={(v) => up({ signature: v })} />
                </div>
                <div className="rounded-xl bg-brand-50/70 p-3 text-[11px] leading-relaxed text-brand-900">
                  <b>Checklist:</b> addressed to a named person · mentions the exact role and company · 2–3 specific achievements with numbers · explains why this company · under one page{kind === 'sop' ? ' · clear research/career goals · why this programme and faculty' : ''} · no spelling errors.
                </div>
              </>
            )}
            {tab === 'design' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-sm font-semibold">{designById(l.design.designId).name}</div>
                  <p className="text-xs text-ink-mute">Letters borrow the header, colours and fonts of a CV design so your application looks like a matching set.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className="btn-primary btn-sm" onClick={() => setGallery(true)}>
                      <Icon name="palette" className="h-3.5 w-3.5" /> Choose design ({DESIGN_COUNT})
                    </button>
                    {projectCv && (
                      <button className="btn-secondary btn-sm" onClick={() => { const cv = normalizeCv(projectCv.data); up({ design: { ...l.design, designId: cv.design.designId, accent: cv.design.accent, font: cv.design.font, pageSize: cv.design.pageSize } }); }}>
                        Match my CV
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <span className="label">Accent colour</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button onClick={() => up({ design: { ...l.design, accent: '' } })} className={cx('rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-slate-200', !l.design.accent && 'bg-ink text-white')}>Default</button>
                    {PALETTES.map((p) => (
                      <button key={p.id} aria-label={p.name} title={p.name} onClick={() => up({ design: { ...l.design, accent: p.accent } })} className={cx('h-6 w-6 rounded-full', l.design.accent === p.accent && 'ring-2 ring-ink ring-offset-1')} style={{ background: p.accent }} />
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select label="Font" value={l.design.font} onChange={(v) => up({ design: { ...l.design, font: v } })} options={[{ value: '', label: 'Design default' }, ...FONTS.map((f) => ({ value: f.id, label: f.label }))]} />
                  <Select label="Paper size" value={l.design.pageSize} onChange={(v) => up({ design: { ...l.design, pageSize: v } })} options={[{ value: 'A4', label: 'A4' }, { value: 'Letter', label: 'US Letter' }]} />
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor="lfs">Text size: {Math.round(l.design.fontScale * 100)}%</label>
                    <input id="lfs" type="range" min={0.85} max={1.15} step={0.01} value={l.design.fontScale} onChange={(e) => up({ design: { ...l.design, fontScale: Number(e.target.value) } })} className="w-full" />
                  </div>
                  <TextInput label="Word target" type="number" value={String(l.wordTarget || '')} onChange={(v) => up({ wordTarget: Number(v) || 0 })} />
                </div>
              </div>
            )}
            {tab === 'grammar' && <GrammarPanel doc={l} fields={letterFields(l)} onApply={(next) => {
                const changed = next.blocks.filter((b, i) => b.key && b.body !== l.blocks[i]?.body).map((b) => b.key!);
                setData(next.compose && changed.length ? { ...next, compose: { ...next.compose, edited: [...new Set([...next.compose.edited, ...changed])] } } : next);
              }} defaultLocale={locale} mode="letter" />}
            {tab === 'template' && (
              <div className="space-y-2">
                <p className="text-xs text-ink-mute">Switching template replaces the paragraphs (a version is saved first, so you can restore it from History).</p>
                {templatesFor(kind).map((t) => (
                  <button
                    key={t.id}
                    className={cx('w-full rounded-xl border p-3 text-left', l.templateId === t.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50')}
                    onClick={() => {
                      if (!confirm(`Switch to “${t.name}”? Your current paragraphs will be replaced (saved in History).`)) return;
                      snapshot('Before template switch');
                      if (compose) {
                        up({ templateId: t.id, blocks: [], showHeadings: Boolean(t.showHeadings), wordTarget: t.wordTarget ?? (t.kind === 'cover' ? 350 : 0), compose: { ...compose, edited: [] } });
                        return;
                      }
                      const cv = projectCv ? normalizeCv(projectCv.data) : null;
                      const fresh = newLetter(t, placeholderValues(project, cv, l.sender.name), cv, project);
                      up({ templateId: t.id, blocks: fresh.blocks, subject: fresh.subject, salutation: fresh.salutation, closing: fresh.closing, showHeadings: fresh.showHeadings, wordTarget: fresh.wordTarget });
                    }}
                  >
                    <div className="text-sm font-semibold">{t.name} <span className="font-normal text-ink-mute">· {t.category}</span></div>
                    <div className="text-xs text-ink-mute">{t.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={cx('min-w-0 flex-1 overflow-y-auto bg-slate-200/60 p-4 lg:p-8', !mobilePreview && 'hidden lg:block')}>
          <div className="mx-auto max-w-[860px]">
            <ScaledSheet width={page.width} pageHeight={page.height}>
              <LetterRenderer letter={l} />
            </ScaledSheet>
          </div>
        </div>
      </div>
      <button className="no-print fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-lg lg:hidden" onClick={() => setMobilePreview((m) => !m)}>
        {mobilePreview ? 'Edit' : 'Preview'}
      </button>
      <Modal open={gallery} onClose={() => setGallery(false)} title="Choose a design for your letter" wide="xl">
        <DesignGallery cv={projectCv ? normalizeCv(projectCv.data) : sampleCv(region)} selected={l.design.designId} region={region} onSelect={(id) => { up({ design: { ...l.design, designId: id, accent: '' } }); setGallery(false); }} />
      </Modal>
      {portal}
    </div>
  );
}
