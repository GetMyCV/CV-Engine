'use client';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { CvData, Project, SectionKey } from '@/lib/types';
import type { Repo } from '@/lib/store';
import { normalizeCv, sectionTitle, sectionMeta, fullName, sectionHasContent } from '@/lib/cv-model';
import { analyzeCv } from '@/lib/ats';
import { cvFields } from '@/lib/grammar/fields';
import { checkText } from '@/lib/grammar';
import { cvToPlainText } from '@/lib/export/text';
import { toJsonResume } from '@/lib/export/jsonresume';
import { runAi } from '@/lib/ai/client';
import { extractKeywords } from '@/lib/ats/keywords';
import { cx, debounce, downloadBlob, slug, uid } from '@/lib/utils';
import CvRenderer, { PAGE } from '@/components/cv/CvRenderer';
import ScaledSheet from '@/components/ScaledSheet';
import { usePrint } from '@/components/PrintPortal';
import { useToast } from '@/components/ui/Toast';
import Icon from '@/components/ui/Icon';
import AtsPanel, { ScoreRing } from '@/components/ats/AtsPanel';
import EditorTopBar from './EditorTopBar';
import GrammarPanel from './GrammarPanel';
import DesignPanel from './DesignPanel';
import { useDocument } from './useDocument';
import { AiButton, useAiAvailable, EducationEditor, ExperienceEditor, LanguagesEditor, PersonalEditor, SimpleSections, SkillsEditor, SummaryEditor } from './CvSections';

type Tab = 'content' | 'design' | 'ats' | 'grammar' | 'tailor';

export default function CvEditor({ repo, docId }: { repo: Repo; docId: string }) {
  const { doc, project, setProject, save, setData, setTitle, undo, redo, canUndo, canRedo, snapshot, restore } = useDocument<CvData>(repo, docId, (raw) => normalizeCv(raw as Partial<CvData>));
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get('panel') as Tab) || 'content');
  const [open, setOpen] = useState<string>('personal');
  const [pages, setPages] = useState(1);
  const [mobilePreview, setMobilePreview] = useState(false);
  const toast = useToast();
  const { print, portal } = usePrint();
  const formRef = useRef<HTMLDivElement>(null);

  const saveProject = useMemo(() => debounce((p: Project) => repo.saveProject(p), 600), [repo]);
  const patchProject = useCallback(
    (patch: Partial<Project>) => {
      if (!project) return;
      const next = { ...project, ...patch };
      setProject(next);
      saveProject(next);
    },
    [project, setProject, saveProject],
  );

  const set = useCallback((fn: (cv: CvData) => CvData) => setData(fn), [setData]);
  const cv = doc?.data;
  const region = project?.region ?? 'international';
  const score = useMemo(() => (cv ? analyzeCv(cv, { region, jobDescription: project?.jobDescription, targetRole: project?.targetRole, pages }).score : 0), [cv, region, project, pages]);
  const grammarCount = useMemo(() => (cv ? cvFields(cv).reduce((n, f) => n + checkText(f.text, { mode: 'cv', locale: region === 'us' ? 'en-US' : region === 'canada' ? 'en-CA' : 'en-GB' }).length, 0) : 0), [cv, region]);
  const onPages = useCallback((n: number) => setPages(n), []);

  if (doc === undefined) return <p className="p-8 animate-pulse text-sm text-ink-mute">Loading CV…</p>;
  if (doc === null || !cv) return <p className="p-8 text-sm">This CV could not be found.</p>;

  const page = PAGE[cv.design.pageSize];
  const fileBase = `${slug(fullName(cv.personal) || 'CV')}-CV${project?.targetRole ? `-${slug(project.targetRole)}` : ''}`;

  const jumpTo = (target: string) => {
    if (target === 'design') return setTab('design');
    setTab('content');
    setOpen(target);
    setTimeout(() => formRef.current?.querySelector(`[data-section="${target}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const addSkill = (skill: string) =>
    set((c) => {
      const skills = c.skills.length ? [...c.skills] : [{ id: uid('s'), name: 'Skills', items: [] }];
      skills[0] = { ...skills[0]!, items: [...skills[0]!.items, { name: skill, level: 4 }] };
      return { ...c, skills };
    });

  const exports = [
    { label: 'Download PDF', hint: `Print-ready ${cv.design.pageSize}, selectable text, clickable links`, icon: 'print', run: () => { snapshot('Exported PDF'); print(<CvRenderer cv={cv} region={region} />, fileBase, cv.design.pageSize); } },
    { label: 'Download Word (.docx)', hint: 'Editable, single-column ATS format', icon: 'file', run: async () => { const { cvToDocx } = await import('@/lib/export/docx'); downloadBlob(await cvToDocx(cv), `${fileBase}.docx`); } },
    { label: 'Download plain text (.txt)', hint: 'For online application forms', icon: 'file', run: () => downloadBlob(new Blob([cvToPlainText(cv)], { type: 'text/plain' }), `${fileBase}.txt`) },
    { label: 'Export JSON Resume', hint: 'Open standard — backup or move to another tool', icon: 'download', run: () => downloadBlob(new Blob([JSON.stringify(toJsonResume(cv), null, 2)], { type: 'application/json' }), `${fileBase}.json`) },
    { label: 'Copy as text', hint: 'Paste into LinkedIn or email', icon: 'copy', run: async () => { await navigator.clipboard.writeText(cvToPlainText(cv)); toast('Copied to clipboard', 'success'); } },
  ];

  const TABS: { id: Tab; label: string; badge?: string }[] = [
    { id: 'content', label: 'Content' },
    { id: 'design', label: 'Design' },
    { id: 'ats', label: 'ATS check', badge: String(score) },
    { id: 'grammar', label: 'Grammar', badge: grammarCount ? String(grammarCount) : '✓' },
    { id: 'tailor', label: 'Tailor' },
  ];

  const sectionEditor = (k: SectionKey) => {
    const props = { cv, set, project };
    switch (k) {
      case 'summary': return <SummaryEditor {...props} />;
      case 'experience': return <ExperienceEditor {...props} />;
      case 'education': return <EducationEditor {...props} />;
      case 'skills': return <SkillsEditor {...props} />;
      case 'languages': return <LanguagesEditor {...props} />;
      default: return <SimpleSections k={k} {...props} />;
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <EditorTopBar backHref={`/project?id=${doc.projectId}`} backLabel={project?.name ?? 'Project'} title={doc.title} onTitle={setTitle} save={save} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} exports={exports} versions={doc.versions} onSnapshot={snapshot} onRestore={restore} />
      <div className="flex min-h-0 flex-1">
        <div className={cx('flex w-full flex-col border-r border-slate-200 bg-slate-50 lg:w-[520px] xl:w-[580px]', mobilePreview && 'hidden lg:flex')}>
          <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 pt-2" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cx('flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium', tab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-mute hover:text-ink')}>
                {t.label}
                {t.badge && <span className={cx('chip', t.id === 'ats' ? (score >= 85 ? 'bg-emerald-100 text-emerald-700' : score >= 70 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700') : grammarCount ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>{t.badge}</span>}
              </button>
            ))}
          </div>
          <div ref={formRef} className="min-h-0 flex-1 overflow-y-auto p-4">
            {tab === 'content' && (
              <div className="space-y-2">
                <Accordion id="personal" title="Personal details" open={open} setOpen={setOpen} done={Boolean(cv.personal.firstName && cv.personal.email)}>
                  <PersonalEditor cv={cv} set={set} project={project} />
                </Accordion>
                {cv.sectionOrder.map((k) => {
                  const meta = sectionMeta(k);
                  const hidden = cv.hiddenSections.includes(k);
                  return (
                    <Accordion
                      key={k}
                      id={k}
                      title={sectionTitle(cv, k)}
                      open={open}
                      setOpen={setOpen}
                      done={sectionHasContent(cv, k)}
                      tag={meta?.importance === 'essential' ? 'Essential' : meta?.expectedIn?.includes(region) ? 'Expected here' : meta?.importance === 'recommended' ? 'Recommended' : undefined}
                      hidden={hidden}
                      onToggleHidden={() => set((c) => ({ ...c, hiddenSections: hidden ? c.hiddenSections.filter((x) => x !== k) : [...c.hiddenSections, k] }))}
                      onRemove={k.startsWith('custom:') ? () => set((c) => ({ ...c, custom: c.custom.filter((s) => `custom:${s.id}` !== k), sectionOrder: c.sectionOrder.filter((x) => x !== k) })) : undefined}
                    >
                      {meta && <p className="mb-3 rounded-lg bg-brand-50/60 px-3 py-2 text-[11px] leading-relaxed text-brand-800">💡 {meta.guidance}</p>}
                      {sectionEditor(k)}
                    </Accordion>
                  );
                })}
                <p className="pt-2 text-center text-[11px] text-ink-mute">Reorder, rename or add sections under <button className="font-semibold text-brand-600" onClick={() => setTab('design')}>Design</button>.</p>
              </div>
            )}
            {tab === 'design' && <DesignPanel cv={cv} set={set} region={region} onSnapshot={snapshot} />}
            {tab === 'ats' && <AtsPanel cv={cv} project={project} pages={pages} onProject={patchProject} onAddSkill={addSkill} onFix={jumpTo} />}
            {tab === 'grammar' && <GrammarPanel doc={cv} fields={cvFields(cv)} onApply={(next) => setData(next)} defaultLocale={region === 'us' ? 'en-US' : region === 'canada' ? 'en-CA' : 'en-GB'} mode="cv" />}
            {tab === 'tailor' && <TailorPanel cv={cv} project={project} onProject={patchProject} onSummary={(s) => { snapshot('Before AI tailoring'); set((c) => ({ ...c, summary: s })); }} onAddSkill={addSkill} />}
          </div>
        </div>
        <div className={cx('min-w-0 flex-1 overflow-y-auto bg-slate-200/60 p-4 lg:p-8', !mobilePreview && 'hidden lg:block')}>
          <div className="mx-auto mb-3 flex max-w-[860px] items-center justify-between text-xs text-ink-mute">
            <span>
              {cv.design.pageSize} · {pages} page{pages > 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-2">
              ATS score <ScoreRing score={score} size={36} />
            </span>
          </div>
          <div className="mx-auto max-w-[860px]">
            <ScaledSheet width={page.width} pageHeight={page.height} onPages={onPages}>
              <CvRenderer cv={cv} region={region} links={false} />
            </ScaledSheet>
          </div>
        </div>
      </div>
      <button className="no-print fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-lg lg:hidden" onClick={() => setMobilePreview((m) => !m)}>
        {mobilePreview ? 'Edit' : 'Preview'}
      </button>
      {portal}
    </div>
  );
}

function Accordion({ id, title, open, setOpen, children, done, tag, hidden, onToggleHidden, onRemove }: { id: string; title: string; open: string; setOpen: (s: string) => void; children: React.ReactNode; done?: boolean; tag?: string; hidden?: boolean; onToggleHidden?: () => void; onRemove?: () => void }) {
  const isOpen = open === id;
  return (
    <section data-section={id} className={cx('scroll-mt-4 rounded-2xl border bg-white', isOpen ? 'border-brand-200 shadow-card' : 'border-slate-200')}>
      <div className="flex items-center gap-2 px-4 py-3">
        <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setOpen(isOpen ? '' : id)} aria-expanded={isOpen}>
          <span className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px]', done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400')}>{done ? '✓' : '○'}</span>
          <span className={cx('truncate font-semibold', hidden && 'text-ink-mute line-through')}>{title}</span>
          {tag && <span className="chip bg-slate-100 text-ink-mute">{tag}</span>}
        </button>
        {onToggleHidden && (
          <button className="btn-ghost btn-sm" onClick={onToggleHidden} title={hidden ? 'Show on CV' : 'Hide from CV'} aria-label={hidden ? 'Show section' : 'Hide section'}>
            <Icon name={hidden ? 'eyeOff' : 'eye'} className="h-3.5 w-3.5" />
          </button>
        )}
        {onRemove && (
          <button className="btn-ghost btn-sm text-red-500" onClick={onRemove} aria-label="Delete section">
            <Icon name="trash" className="h-3.5 w-3.5" />
          </button>
        )}
        <span className={cx('text-ink-mute transition', isOpen && 'rotate-90')}>›</span>
      </div>
      {isOpen && <div className="border-t border-slate-100 p-4">{children}</div>}
    </section>
  );
}

function TailorPanel({ cv, project, onProject, onSummary, onAddSkill }: { cv: CvData; project: Project | null; onProject: (p: Partial<Project>) => void; onSummary: (s: string) => void; onAddSkill: (s: string) => void }) {
  const [plan, setPlan] = useState('');
  const ai = useAiAvailable();
  const jd = project?.jobDescription ?? '';
  const keywords = extractKeywords(jd);
  const report = analyzeCv(cv, { region: project?.region, jobDescription: jd });
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">Tailoring your CV to each job is the single biggest factor in getting past ATS filters. Paste the job ad, then follow the plan.</p>
      <textarea className="input min-h-[160px]" value={jd} onChange={(e) => onProject({ jobDescription: e.target.value })} placeholder="Paste the job description…" />
      {keywords.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Keyword coverage</h4>
            <span className="text-sm font-bold">{report.keywords.percent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-brand-600 transition-all" style={{ width: `${report.keywords.percent}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {report.keywords.missing.map((k) => (
              <button key={k} className="chip bg-red-50 text-red-700 hover:bg-red-100" onClick={() => onAddSkill(k)}>
                + {k}
              </button>
            ))}
          </div>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-ink-soft">
            <li>Use the exact job title in your headline{project?.targetRole ? ` (“${project.targetRole}”)` : ''}.</li>
            <li>Add missing keywords you genuinely have to Skills — and weave them into 2–3 bullets.</li>
            <li>Rewrite your summary around the top 3 requirements of the ad.</li>
            <li>Move the most relevant role/project bullets to the top of each entry.</li>
          </ol>
        </div>
      )}
      {ai ? (
        <div className="flex flex-wrap gap-2">
          <AiButton small={false} label="Generate tailoring plan" onRun={async () => setPlan(await runAi('tailor', { cv: cvToPlainText(cv), jobDescription: jd, targetRole: project?.targetRole ?? '', company: project?.company ?? '', region: project?.region ?? '' }))} />
          <AiButton small={false} label="Rewrite summary for this job" onRun={async () => onSummary(await runAi('summary', { cv: cvToPlainText(cv), text: cv.summary, jobDescription: jd, targetRole: project?.targetRole ?? '', company: project?.company ?? '' }))} />
        </div>
      ) : (
        <p className="rounded-lg bg-slate-100 p-3 text-xs text-ink-mute">AI tailoring is available when the server has an Anthropic API key configured. The keyword analysis above works without it.</p>
      )}
      {plan && <pre className="whitespace-pre-wrap rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs leading-relaxed text-ink">{plan}</pre>}
    </div>
  );
}
