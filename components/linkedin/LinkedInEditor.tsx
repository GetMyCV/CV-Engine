'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CvData, DocumentRecord, LinkedInData } from '@/lib/types';
import type { Repo } from '@/lib/store';
import { AVATAR_FRAMES, BANNER_TEMPLATES, POST_TEMPLATES, bannerTemplate, renderAvatar, renderBanner, renderPost, BANNER, AVATAR, POST } from '@/lib/linkedin/render';
import { HEADLINE_FORMULAS, LINKEDIN_CHECKLIST, draftAbout, headlineVars, normalizeLinkedIn } from '@/lib/linkedin/content';
import { normalizeCv } from '@/lib/cv-model';
import { cvToPlainText } from '@/lib/export/text';
import { runAi } from '@/lib/ai/client';
import { cx, readImage, slug, wordCount } from '@/lib/utils';
import { Select, TagInput, TextArea, TextInput } from '@/components/ui/fields';
import Icon from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import EditorTopBar from '@/components/editor/EditorTopBar';
import { AiButton, useAiAvailable } from '@/components/editor/CvSections';
import { useDocument } from '@/components/editor/useDocument';

type Tab = 'banner' | 'photo' | 'post' | 'text' | 'checklist';

function useCanvas(draw: (c: HTMLCanvasElement) => Promise<void>, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current && draw(ref.current), 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

const download = (canvas: HTMLCanvasElement | null, name: string) => {
  if (!canvas) return;
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = name;
  a.click();
};

export default function LinkedInEditor({ repo, docId }: { repo: Repo; docId: string }) {
  const { doc, project, save, setData, setTitle, undo, redo, canUndo, canRedo, snapshot, restore } = useDocument<LinkedInData>(repo, docId, (raw) => normalizeLinkedIn(raw as Partial<LinkedInData>));
  const [tab, setTab] = useState<Tab>('banner');
  const [cvDoc, setCvDoc] = useState<DocumentRecord<CvData> | null>(null);
  const ai = useAiAvailable();
  const toast = useToast();
  const d = doc?.data;

  useEffect(() => {
    if (!doc) return;
    repo.listDocuments().then((all) => {
      const cvs = all.filter((x) => x.kind === 'cv') as DocumentRecord<CvData>[];
      setCvDoc(cvs.find((c) => c.projectId === doc.projectId) ?? cvs[0] ?? null);
    });
  }, [repo, doc?.projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const cv = useMemo(() => (cvDoc ? normalizeCv(cvDoc.data) : null), [cvDoc]);
  const bannerRef = useCanvas(async (c) => d && renderBanner(c, d.banner), [JSON.stringify(d?.banner)]);
  const avatarRef = useCanvas(async (c) => d && renderAvatar(c, d.avatar), [JSON.stringify(d?.avatar)]);
  const postRef = useCanvas(async (c) => d && renderPost(c, d.post, d.banner.name), [JSON.stringify(d?.post), d?.banner.name]);

  if (doc === undefined) return <p className="p-8 animate-pulse text-sm text-ink-mute">Loading…</p>;
  if (doc === null || !d) return <p className="p-8 text-sm">Not found.</p>;
  const upB = (p: Partial<LinkedInData['banner']>) => setData((x) => ({ ...x, banner: { ...x.banner, ...p } }));
  const upA = (p: Partial<LinkedInData['avatar']>) => setData((x) => ({ ...x, avatar: { ...x.avatar, ...p } }));
  const upP = (p: Partial<LinkedInData['post']>) => setData((x) => ({ ...x, post: { ...x.post, ...p } }));
  const base = slug(d.banner.name || 'linkedin');
  const vars = headlineVars(cv, project);
  const done = LINKEDIN_CHECKLIST.filter((c) => d.checklist[c.id]).length;
  const t = bannerTemplate(d.banner.templateId);

  const exports = [
    { label: 'Banner (1584×396 PNG)', icon: 'download', run: () => download(bannerRef.current, `${base}-linkedin-banner.png`) },
    { label: 'Profile photo (800×800 PNG)', icon: 'download', run: () => download(avatarRef.current, `${base}-linkedin-photo.png`) },
    { label: 'Post image (1200×627 PNG)', icon: 'download', run: () => download(postRef.current, `${base}-linkedin-post.png`) },
    { label: 'Copy headline + About', icon: 'copy', run: async () => { await navigator.clipboard.writeText(`${d.headline}\n\n${d.about}`); toast('Copied', 'success'); } },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <EditorTopBar backHref={`/project?id=${doc.projectId}`} backLabel={project?.name ?? 'Project'} title={doc.title} onTitle={setTitle} save={save} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} exports={exports} versions={doc.versions} onSnapshot={snapshot} onRestore={restore} />
      <div className="border-b border-slate-200 bg-white px-4">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto pt-2" role="tablist">
          {(
            [
              ['banner', 'Banner'],
              ['photo', 'Profile photo'],
              ['post', 'Post image'],
              ['text', 'Headline & About'],
              ['checklist', `Checklist ${done}/${LINKEDIN_CHECKLIST.length}`],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cx('whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium', tab === id ? 'border-[#0A66C2] text-[#0A66C2]' : 'border-transparent text-ink-mute hover:text-ink')}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl flex-1 p-4 lg:p-6">
        {tab === 'banner' && (
          <div className="space-y-5">
            <div className="card overflow-hidden">
              <div className="relative">
                <canvas ref={bannerRef} width={BANNER.width} height={BANNER.height} className="block h-auto w-full" />
                {/* Where LinkedIn's profile photo sits on desktop */}
                <div className="pointer-events-none absolute bottom-[-18%] left-[3%] aspect-square w-[14%] rounded-full border-4 border-white bg-slate-300/80 shadow" title="Your profile photo covers this area" />
              </div>
              <div className="flex items-center justify-between px-4 pb-3 pt-10 text-xs text-ink-mute">
                <span>Preview with LinkedIn’s profile-photo position. Keep key text away from the lower-left.</span>
                <button className="btn-primary btn-sm" onClick={() => download(bannerRef.current, `${base}-linkedin-banner.png`)}><Icon name="download" className="h-3.5 w-3.5" /> Download PNG</button>
              </div>
            </div>
            <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
              <div className="card space-y-3 p-4">
                <TextInput label="Name" value={d.banner.name} onChange={(v) => upB({ name: v })} />
                <TextInput label="Headline" value={d.banner.headline} onChange={(v) => upB({ headline: v })} />
                <TextInput label="Tagline / value proposition" value={d.banner.tagline} onChange={(v) => upB({ tagline: v })} />
                <TagInput label="Skill chips (up to 6)" values={d.banner.skills} onChange={(v) => upB({ skills: v.slice(0, 6) })} />
                <TextInput label="Contact / website line" value={d.banner.contact} onChange={(v) => upB({ contact: v })} />
                <div className="grid grid-cols-3 gap-2">
                  <label className="text-xs font-semibold text-ink-soft">Colour 1<input type="color" className="mt-1 block h-8 w-full rounded" value={d.banner.accent || t.a} onChange={(e) => upB({ accent: e.target.value })} /></label>
                  <label className="text-xs font-semibold text-ink-soft">Colour 2<input type="color" className="mt-1 block h-8 w-full rounded" value={d.banner.accent2 || t.b} onChange={(e) => upB({ accent2: e.target.value })} /></label>
                  <label className="text-xs font-semibold text-ink-soft">Text<input type="color" className="mt-1 block h-8 w-full rounded" value={d.banner.textColor || t.text} onChange={(e) => upB({ textColor: e.target.value })} /></label>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select label="Text position" value={d.banner.align} onChange={(v) => upB({ align: v })} options={[{ value: 'right', label: 'Right (recommended)' }, { value: 'left', label: 'Centre-left' }]} />
                  <button className="btn-ghost btn-sm mt-5" onClick={() => upB({ accent: '', accent2: '', textColor: '' })}>Reset colours</button>
                </div>
                <label className="btn-secondary btn-sm cursor-pointer">
                  <Icon name="upload" className="h-3.5 w-3.5" /> {d.banner.image ? 'Replace' : 'Add'} background photo
                  <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) upB({ image: await readImage(f, 1800) }); }} />
                </label>
                {d.banner.image && <button className="btn-ghost btn-sm text-red-600" onClick={() => upB({ image: '' })}>Remove background photo</button>}
              </div>
              <div className="card p-4">
                <h3 className="text-sm font-semibold">{BANNER_TEMPLATES.length} banner templates</h3>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {BANNER_TEMPLATES.map((bt) => (
                    <button key={bt.id} onClick={() => upB({ templateId: bt.id, accent: '', accent2: '', textColor: '' })} className={cx('overflow-hidden rounded-lg text-left ring-1', d.banner.templateId === bt.id ? 'ring-4 ring-[#0A66C2]' : 'ring-slate-200 hover:ring-slate-400')}>
                      <BannerThumb id={bt.id} data={d.banner} />
                      <span className="block px-2 py-1 text-[11px] font-medium">{bt.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'photo' && (
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="card p-4 text-center">
              <canvas ref={avatarRef} width={AVATAR.size} height={AVATAR.size} className="mx-auto h-72 w-72 rounded-full shadow-sheet" />
              <button className="btn-primary btn-sm mt-4" onClick={() => download(avatarRef.current, `${base}-linkedin-photo.png`)}><Icon name="download" className="h-3.5 w-3.5" /> Download PNG</button>
              <p className="mt-3 text-[11px] text-ink-mute">Tip: use a recent headshot, face filling about 60% of the frame, plain background, good natural light.</p>
            </div>
            <div className="card space-y-4 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <label className="btn-secondary btn-sm cursor-pointer">
                  <Icon name="upload" className="h-3.5 w-3.5" /> Upload photo
                  <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) upA({ photo: await readImage(f, 1000), zoom: 1, offsetX: 0, offsetY: 0 }); }} />
                </label>
                {cv?.personal.photo && <button className="btn-ghost btn-sm" onClick={() => upA({ photo: cv.personal.photo })}>Use my CV photo</button>}
              </div>
              <div>
                <span className="label">Frame</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {AVATAR_FRAMES.map((f) => (
                    <button key={f.id} onClick={() => upA({ frameId: f.id })} className={cx('rounded-lg border px-2 py-2 text-xs font-medium', d.avatar.frameId === f.id ? 'border-[#0A66C2] bg-blue-50 text-[#0A66C2]' : 'border-slate-200 hover:bg-slate-50')}>
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
              {(d.avatar.frameId === 'text-ring' || d.avatar.frameId === 'badge') && <TextInput label="Ring / badge text" value={d.avatar.ringText} onChange={(v) => upA({ ringText: v })} maxLength={28} />}
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-ink-soft">Frame colour<input type="color" className="mt-1 block h-8 w-full rounded" value={d.avatar.ringColor} onChange={(e) => upA({ ringColor: e.target.value })} /></label>
                <label className="text-xs font-semibold text-ink-soft">Background<input type="color" className="mt-1 block h-8 w-full rounded" value={d.avatar.background || '#e8eefc'} onChange={(e) => upA({ background: e.target.value })} /></label>
              </div>
              {[
                ['zoom', 'Zoom', 1, 2.5, 0.01],
                ['offsetX', 'Move left / right', -0.4, 0.4, 0.01],
                ['offsetY', 'Move up / down', -0.4, 0.4, 0.01],
              ].map(([k, label, min, max, step]) => (
                <label key={k as string} className="block text-xs font-semibold text-ink-soft">
                  {label as string}
                  <input type="range" className="mt-1 w-full" min={min as number} max={max as number} step={step as number} value={d.avatar[k as 'zoom']} onChange={(e) => upA({ [k as string]: Number(e.target.value) })} />
                </label>
              ))}
            </div>
          </div>
        )}

        {tab === 'post' && (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="card overflow-hidden">
              <canvas ref={postRef} width={POST.width} height={POST.height} className="block h-auto w-full" />
              <div className="flex justify-end p-3">
                <button className="btn-primary btn-sm" onClick={() => download(postRef.current, `${base}-linkedin-post.png`)}><Icon name="download" className="h-3.5 w-3.5" /> Download PNG</button>
              </div>
            </div>
            <div className="card space-y-3 p-4">
              <Select label="Template" value={d.post.templateId} onChange={(v) => upP({ templateId: v })} options={POST_TEMPLATES.map((p) => ({ value: p.id, label: p.name }))} />
              <TextArea label="Title / quote" value={d.post.title} onChange={(v) => upP({ title: v })} rows={3} />
              <TextInput label="Subtitle" value={d.post.subtitle} onChange={(v) => upP({ subtitle: v })} />
              <label className="block text-xs font-semibold text-ink-soft">Accent<input type="color" className="mt-1 block h-8 w-full rounded" value={d.post.accent} onChange={(e) => upP({ accent: e.target.value })} /></label>
              <p className="text-[11px] text-ink-mute">Use it to announce you are open to work, a new certification or a new role. 1200×627 is LinkedIn’s recommended link/post image size.</p>
            </div>
          </div>
        )}

        {tab === 'text' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card space-y-3 p-4">
              <h3 className="font-semibold">Headline <span className="text-xs font-normal text-ink-mute">({d.headline.length}/220)</span></h3>
              <TextArea value={d.headline} onChange={(v) => setData((x) => ({ ...x, headline: v.slice(0, 220) }))} rows={2} />
              <div>
                <span className="label">Formulas — click to use</span>
                <ul className="space-y-1.5">
                  {HEADLINE_FORMULAS.map((f) => {
                    const text = f.build(vars);
                    return (
                      <li key={f.id}>
                        <button className="w-full rounded-lg border border-slate-200 p-2 text-left text-xs hover:border-[#0A66C2] hover:bg-blue-50" onClick={() => setData((x) => ({ ...x, headline: text.slice(0, 220) }))}>
                          <span className="font-semibold text-ink-mute">{f.name}: </span>
                          {text}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
              {ai && <AiButton label="Suggest 5 headlines with AI" onRun={async () => { const out = await runAi('linkedin-headline', { cv: cv ? cvToPlainText(cv) : '', targetRole: project?.targetRole ?? '' }); setData((x) => ({ ...x, headline: (out.split('\n').find(Boolean) ?? x.headline).slice(0, 220) })); toast('Applied the first suggestion; ask again for more.'); }} />}
            </div>
            <div className="card space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">About section <span className="text-xs font-normal text-ink-mute">({wordCount(d.about)} words · {d.about.length}/2600 chars)</span></h3>
              </div>
              <TextArea value={d.about} onChange={(v) => setData((x) => ({ ...x, about: v.slice(0, 2600) }))} rows={14} />
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary btn-sm" onClick={() => { snapshot('Before About redraft'); setData((x) => ({ ...x, about: draftAbout(cv, project) })); }} disabled={!cv}>Draft from my CV</button>
                {ai && <AiButton label="Write with AI" onRun={async () => { snapshot('Before AI About'); const out = await runAi('linkedin-about', { cv: cv ? cvToPlainText(cv) : '', targetRole: project?.targetRole ?? '' }); setData((x) => ({ ...x, about: out.slice(0, 2600) })); }} />}
                <button className="btn-ghost btn-sm" onClick={async () => { await navigator.clipboard.writeText(d.about); toast('Copied', 'success'); }}><Icon name="copy" className="h-3.5 w-3.5" /> Copy</button>
              </div>
              <p className="text-[11px] text-ink-mute">Structure: hook → what you do and for whom → 3 proof points with numbers → skills keywords → call to action. Only the first ~3 lines show before “see more”.</p>
            </div>
          </div>
        )}

        {tab === 'checklist' && (
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">LinkedIn profile checklist</h3>
              <span className="text-sm font-semibold text-[#0A66C2]">{Math.round((done / LINKEDIN_CHECKLIST.length) * 100)}% complete</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-[#0A66C2] transition-all" style={{ width: `${(done / LINKEDIN_CHECKLIST.length) * 100}%` }} /></div>
            {[...new Set(LINKEDIN_CHECKLIST.map((c) => c.group))].map((g) => (
              <div key={g} className="mt-5">
                <h4 className="text-xs font-bold uppercase tracking-wide text-ink-mute">{g}</h4>
                <ul className="mt-2 space-y-2">
                  {LINKEDIN_CHECKLIST.filter((c) => c.group === g).map((c) => (
                    <li key={c.id}>
                      <label className="flex cursor-pointer gap-3 rounded-lg p-2 hover:bg-slate-50">
                        <input type="checkbox" className="mt-0.5 h-4 w-4" checked={Boolean(d.checklist[c.id])} onChange={(e) => setData((x) => ({ ...x, checklist: { ...x.checklist, [c.id]: e.target.checked } }))} />
                        <span>
                          <span className={cx('block text-sm font-medium', d.checklist[c.id] && 'text-ink-mute line-through')}>{c.label}</span>
                          <span className="block text-xs text-ink-mute">{c.tip}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BannerThumb({ id, data }: { id: string; data: LinkedInData['banner'] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) renderBanner(ref.current, { ...data, templateId: id, accent: '', accent2: '', textColor: '', image: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, data.name, data.headline]);
  return <canvas ref={ref} className="block h-auto w-full" width={BANNER.width} height={BANNER.height} />;
}
