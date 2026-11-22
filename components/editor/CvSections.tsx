'use client';
import { useEffect, useState } from 'react';
import type { Cefr, CvData, CvExperience, Project, SectionKey } from '@/lib/types';
import { MonthInput, Select, TagInput, TextArea, TextInput, Toggle } from '@/components/ui/fields';
import Icon from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import ListEditor, { BulletList } from './ListEditor';
import {
  newAward,
  newCertification,
  newCourse,
  newEducation,
  newExperience,
  newLanguage,
  newMembership,
  newProject,
  newPublication,
  newReference,
  newSkillGroup,
  newVolunteering,
  REGION_RULES,
  sectionMeta,
} from '@/lib/cv-model';
import { designById } from '@/lib/designs';
import { ACTION_VERBS } from '@/lib/ats/vocab';
import { aiEnabled, runAi } from '@/lib/ai/client';
import { improveBulletOffline, summaryOffline } from '@/lib/ai/offline';
import { cvToPlainText } from '@/lib/export/text';
import { cx, filled, readImage, uid, wordCount } from '@/lib/utils';

type Props = { cv: CvData; set: (fn: (cv: CvData) => CvData) => void; project: Project | null };

const locale = (p: Project | null) => (p?.region === 'us' ? 'en-US' : p?.region === 'canada' ? 'en-CA' : 'en-GB');

export function useAiAvailable() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    aiEnabled().then(setOn);
  }, []);
  return on;
}

export function AiButton({ label, onRun, small = true }: { label: string; onRun: () => Promise<void>; small?: boolean }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <button
      type="button"
      className={cx('btn border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100', small && 'btn-sm')}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onRun();
        } catch (e) {
          toast(e instanceof Error ? e.message : 'Failed', 'error');
        } finally {
          setBusy(false);
        }
      }}
    >
      <Icon name="sparkles" className="h-3.5 w-3.5" /> {busy ? 'Writing…' : label}
    </button>
  );
}

export function PersonalEditor({ cv, set, project }: Props) {
  const p = cv.personal;
  const toast = useToast();
  const region = project?.region ?? 'international';
  const rules = REGION_RULES[region];
  const up = (patch: Partial<CvData['personal']>) => set((c) => ({ ...c, personal: { ...c.personal, ...patch } }));
  const design = designById(cv.design.designId);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TextInput label="First name" value={p.firstName} onChange={(v) => up({ firstName: v })} autoComplete="given-name" />
      <TextInput label="Last name" value={p.lastName} onChange={(v) => up({ lastName: v })} autoComplete="family-name" />
      <TextInput className="sm:col-span-2" label="Headline / target job title" value={p.headline} onChange={(v) => up({ headline: v })} placeholder={project?.targetRole || 'e.g. Senior Data Analyst'} hint="Mirror the exact job title from the posting — ATS match titles first." />
      <TextInput label="Email" type="email" value={p.email} onChange={(v) => up({ email: v })} autoComplete="email" />
      <TextInput label="Phone" type="tel" value={p.phone} onChange={(v) => up({ phone: v })} placeholder="+1 416 555 0100" autoComplete="tel" />
      <TextInput label="City" value={p.city} onChange={(v) => up({ city: v })} autoComplete="address-level2" />
      <TextInput label="Country / province" value={p.country} onChange={(v) => up({ country: v })} autoComplete="country-name" />
      <TextInput label="LinkedIn" value={p.linkedin} onChange={(v) => up({ linkedin: v })} placeholder="linkedin.com/in/your-name" />
      <TextInput label="Website / portfolio" value={p.website} onChange={(v) => up({ website: v })} />
      <TextInput label="GitHub" value={p.github} onChange={(v) => up({ github: v })} />
      <TextInput label="Work authorization / visa" value={p.workAuthorization} onChange={(v) => up({ workAuthorization: v })} placeholder={region === 'canada' ? 'e.g. Permanent Resident' : 'e.g. Eligible to work in the EU'} />
      <details className="sm:col-span-2 rounded-xl border border-slate-200 p-3">
        <summary className="cursor-pointer text-sm font-semibold">
          Photo & personal details {rules.personalData === 'avoid' && <span className="font-normal text-amber-700">— not recommended for {region.toUpperCase()}</span>}
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 flex items-center gap-3">
            {p.photo ? <img src={p.photo} alt="" className="h-16 w-16 rounded-full object-cover" /> : <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-xs text-ink-mute">No photo</div>}
            <label className="btn-secondary btn-sm cursor-pointer">
              <Icon name="upload" className="h-3.5 w-3.5" /> {p.photo ? 'Replace' : 'Upload'} photo
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    up({ photo: await readImage(f, 500) });
                  } catch (err) {
                    toast(err instanceof Error ? err.message : 'Could not load image', 'error');
                  }
                }}
              />
            </label>
            {p.photo && (
              <button className="btn-ghost btn-sm text-red-600" onClick={() => up({ photo: '' })}>
                Remove
              </button>
            )}
          </div>
          <p className="sm:col-span-2 text-[11px] text-ink-mute">
            {rules.photo === 'avoid'
              ? 'Photos are hidden on CVs for this region to follow local hiring norms.'
              : design.family.photo
                ? 'Shown in this design.'
                : 'This design has no photo slot — pick a design from the “With photo” category to show it.'}
          </p>
          <TextInput label="Date of birth" value={p.dateOfBirth} onChange={(v) => up({ dateOfBirth: v })} placeholder="Europass / Gulf only" />
          <TextInput label="Nationality" value={p.nationality} onChange={(v) => up({ nationality: v })} />
          <TextInput label="Driving licence" value={p.drivingLicence} onChange={(v) => up({ drivingLicence: v })} placeholder="e.g. Category B" />
          <TextInput label="Address (optional)" value={p.address} onChange={(v) => up({ address: v })} />
        </div>
      </details>
    </div>
  );
}

export function SummaryEditor({ cv, set, project }: Props) {
  const ai = useAiAvailable();
  const words = wordCount(cv.summary);
  return (
    <div>
      <TextArea value={cv.summary} onChange={(v) => set((c) => ({ ...c, summary: v }))} rows={5} placeholder="3–4 lines: title, years of experience, specialisms (keywords from the job ad) and one headline achievement." />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={cx('text-xs', words === 0 ? 'text-ink-mute' : words < 30 || words > 100 ? 'text-amber-600' : 'text-emerald-600')}>{words} words · aim for 40–90</span>
        <div className="ml-auto flex gap-2">
          <AiButton
            label={ai ? (cv.summary ? 'Rewrite with AI' : 'Write with AI') : 'Draft from my CV'}
            onRun={async () => {
              const text = ai
                ? await runAi('summary', { cv: cvToPlainText(cv), text: cv.summary, targetRole: project?.targetRole ?? '', company: project?.company ?? '', jobDescription: project?.jobDescription ?? '', region: project?.region ?? '', locale: locale(project) })
                : summaryOffline(cv, project);
              set((c) => ({ ...c, summary: text }));
            }}
          />
        </div>
      </div>
    </div>
  );
}

function VerbHelper({ onPick }: { onPick: (v: string) => void }) {
  const [group, setGroup] = useState<string | null>(null);
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <div className="flex flex-wrap gap-1">
        <span className="text-[11px] font-semibold text-ink-mute">Action verbs:</span>
        {Object.keys(ACTION_VERBS).map((g) => (
          <button key={g} className={cx('rounded px-1.5 text-[11px]', group === g ? 'bg-brand-600 text-white' : 'text-brand-700 hover:bg-brand-50')} onClick={() => setGroup(group === g ? null : g)}>
            {g}
          </button>
        ))}
      </div>
      {group && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {ACTION_VERBS[group]!.slice(0, 18).map((v) => (
            <button key={v} className="chip bg-white text-ink-soft ring-1 ring-slate-200 hover:bg-brand-50" onClick={() => onPick(v)} title="Copy to clipboard">
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ExperienceEditor({ cv, set, project }: Props) {
  const ai = useAiAvailable();
  const toast = useToast();
  const items = cv.experience;
  const setItems = (experience: CvExperience[]) => set((c) => ({ ...c, experience }));
  return (
    <ListEditor
      items={items}
      onChange={setItems}
      create={newExperience}
      addLabel="Add position"
      summary={(x) => [x.title, x.employer].filter(filled).join(' · ')}
      render={(x, up) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Job title" value={x.title} onChange={(v) => up({ title: v })} />
          <TextInput label="Employer" value={x.employer} onChange={(v) => up({ employer: v })} />
          <TextInput label="City" value={x.city} onChange={(v) => up({ city: v })} />
          <TextInput label="Country" value={x.country} onChange={(v) => up({ country: v })} />
          <MonthInput label="Start" value={x.startDate} onChange={(v) => up({ startDate: v })} />
          <div>
            <MonthInput label="End" value={x.endDate} onChange={(v) => up({ endDate: v })} disabled={x.current} />
            <Toggle className="mt-1.5" label="I currently work here" checked={x.current} onChange={(v) => up({ current: v, endDate: v ? '' : x.endDate })} />
          </div>
          <Select label="Employment type" value={x.employmentType as string} onChange={(v) => up({ employmentType: v })} options={['', 'Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Co-op', 'Temporary', 'Volunteer'].map((o) => ({ value: o, label: o || '—' }))} />
          <TextInput label="One-line context (optional)" value={x.description} onChange={(v) => up({ description: v })} placeholder="e.g. Fintech scale-up, 300 staff" />
          <div className="sm:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="label mb-0">Achievements</span>
              <AiButton
                label={ai ? 'Improve with AI' : 'Strengthen bullets'}
                onRun={async () => {
                  const filledBullets = x.bullets.filter(filled);
                  if (!filledBullets.length) throw new Error('Write at least one bullet first.');
                  if (ai) {
                    const text = await runAi('improve-bullets', { text: filledBullets.join('\n'), roleTitle: `${x.title} at ${x.employer}`, current: String(x.current), targetRole: project?.targetRole ?? '', jobDescription: project?.jobDescription ?? '', locale: locale(project) });
                    up({ bullets: text.split('\n').map((l) => l.replace(/^[•\-–*]\s*/, '').trim()).filter(Boolean) });
                  } else {
                    up({ bullets: filledBullets.map((b) => improveBulletOffline(b, x.current)) });
                    toast('Bullets strengthened — fill in the [placeholders] with real numbers.', 'success');
                  }
                }}
              />
            </div>
            <BulletList bullets={x.bullets} onChange={(bullets) => up({ bullets })} placeholder="Start with a verb, add a number: “Cut month-end close from 8 to 5 days by…”" />
            <div className="mt-2">
              <VerbHelper onPick={(v) => navigator.clipboard?.writeText(v).then(() => toast(`Copied “${v}”`))} />
            </div>
          </div>
        </div>
      )}
    />
  );
}

export function EducationEditor({ cv, set, project }: Props) {
  const europass = project?.region === 'europass' || cv.design.designId.startsWith('europass');
  return (
    <ListEditor
      items={cv.education}
      onChange={(education) => set((c) => ({ ...c, education }))}
      create={newEducation}
      addLabel="Add education"
      summary={(e) => [e.degree, e.institution].filter(filled).join(' · ')}
      render={(e, up) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Degree / qualification" value={e.degree} onChange={(v) => up({ degree: v })} placeholder="BSc (Hons), MBA, Diploma…" />
          <TextInput label="Field of study" value={e.field} onChange={(v) => up({ field: v })} />
          <TextInput label="Institution" value={e.institution} onChange={(v) => up({ institution: v })} />
          <TextInput label="City, country" value={[e.city, e.country].filter(filled).join(', ')} onChange={(v) => { const [city, ...rest] = v.split(','); up({ city: city ?? '', country: rest.join(',').trim() }); }} />
          <MonthInput label="Start" value={e.startDate} onChange={(v) => up({ startDate: v })} />
          <div>
            <MonthInput label="End (or expected)" value={e.endDate} onChange={(v) => up({ endDate: v })} disabled={e.current} />
            <Toggle className="mt-1.5" label="Currently studying" checked={e.current} onChange={(v) => up({ current: v })} />
          </div>
          <TextInput label="Grade / GPA (optional)" value={e.grade} onChange={(v) => up({ grade: v })} placeholder="First Class, 3.8/4.0" />
          {europass && <Select label="EQF level" value={e.eqfLevel} onChange={(v) => up({ eqfLevel: v })} options={['', '1', '2', '3', '4', '5', '6', '7', '8'].map((o) => ({ value: o, label: o ? `EQF ${o}${o === '6' ? ' (Bachelor)' : o === '7' ? ' (Master)' : o === '8' ? ' (Doctorate)' : ''}` : '—' }))} />}
          <div className="sm:col-span-2">
            <span className="label">Highlights (modules, thesis, honours)</span>
            <BulletList bullets={e.bullets} onChange={(bullets) => up({ bullets })} placeholder="Thesis: … (Grade A)" />
          </div>
        </div>
      )}
    />
  );
}

export function SkillsEditor({ cv, set }: Props) {
  const style = designById(cv.design.designId).family.skills;
  const rated = style === 'bars' || style === 'dots';
  return (
    <div className="space-y-3">
      {rated && <p className="text-[11px] text-ink-mute">This design shows skill levels in its sidebar. Levels are visual only — ATS read the skill names.</p>}
      {cv.skills.map((g) => (
        <div key={g.id} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <input className="input py-1.5 font-semibold" value={g.name} placeholder="Group name (e.g. Technical Skills)" onChange={(e) => set((c) => ({ ...c, skills: c.skills.map((x) => (x.id === g.id ? { ...x, name: e.target.value } : x)) }))} />
            <button className="btn-ghost btn-sm text-red-500" onClick={() => set((c) => ({ ...c, skills: c.skills.filter((x) => x.id !== g.id) }))} aria-label="Remove group">
              <Icon name="trash" className="h-3.5 w-3.5" />
            </button>
          </div>
          <TagInput
            className="mt-2"
            values={g.items.map((i) => i.name)}
            placeholder="Type a skill and press Enter (or paste a comma list)"
            onChange={(names) => set((c) => ({ ...c, skills: c.skills.map((x) => (x.id === g.id ? { ...x, items: names.map((n) => x.items.find((i) => i.name === n) ?? { name: n, level: 4 }) } : x)) }))}
          />
          {rated && g.items.length > 0 && (
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {g.items.map((i) => (
                <label key={i.name} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate">{i.name}</span>
                  <input type="range" min={1} max={5} value={i.level || 3} onChange={(e) => set((c) => ({ ...c, skills: c.skills.map((x) => (x.id === g.id ? { ...x, items: x.items.map((y) => (y.name === i.name ? { ...y, level: Number(e.target.value) } : y)) } : x)) }))} />
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
      <button className="btn-secondary btn-sm w-full border-dashed" onClick={() => set((c) => ({ ...c, skills: [...c.skills, newSkillGroup()] }))}>
        <Icon name="plus" className="h-3.5 w-3.5" /> Add skill group
      </button>
    </div>
  );
}

const CEFR: Cefr[] = ['', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function LanguagesEditor({ cv, set, project }: Props) {
  const europass = project?.region === 'europass' || project?.region === 'canada' || cv.design.designId.startsWith('europass');
  return (
    <ListEditor
      items={cv.languages}
      onChange={(languages) => set((c) => ({ ...c, languages }))}
      create={newLanguage}
      addLabel="Add language"
      summary={(l) => [l.name, l.native ? 'Native' : l.proficiency].filter(filled).join(' — ')}
      render={(l, up) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Language" value={l.name} onChange={(v) => up({ name: v })} />
          <div className="flex items-end">
            <Toggle label="Mother tongue / native" checked={l.native} onChange={(v) => up({ native: v })} />
          </div>
          {!l.native && (
            <>
              <Select label="Overall level" value={l.proficiency} onChange={(v) => up({ proficiency: v })} options={['', 'Elementary', 'Limited working', 'Intermediate', 'Professional working', 'Advanced', 'Fluent', 'Bilingual'].map((o) => ({ value: o, label: o || '—' }))} />
              <TextInput label="Certificate (optional)" value={l.certificate} onChange={(v) => up({ certificate: v })} placeholder="IELTS 7.5, TEF B2, DELF B2" />
              {europass && (
                <div className="sm:col-span-2">
                  <span className="label">CEFR self-assessment</span>
                  <div className="grid grid-cols-5 gap-2">
                    {(
                      [
                        ['listening', 'Listening'],
                        ['reading', 'Reading'],
                        ['spokenProduction', 'Spoken prod.'],
                        ['spokenInteraction', 'Spoken inter.'],
                        ['writing', 'Writing'],
                      ] as const
                    ).map(([k, label]) => (
                      <Select key={k} label={label} value={l[k]} onChange={(v) => up({ [k]: v } as Partial<typeof l>)} options={CEFR.map((c) => ({ value: c, label: c || '—' }))} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    />
  );
}

export function SimpleSections({ k, cv, set }: Props & { k: SectionKey }) {
  switch (k) {
    case 'certifications':
      return (
        <ListEditor items={cv.certifications} onChange={(certifications) => set((c) => ({ ...c, certifications }))} create={newCertification} addLabel="Add certification" summary={(x) => x.name}
          render={(x, up) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput className="sm:col-span-2" label="Certification" value={x.name} onChange={(v) => up({ name: v })} />
              <TextInput label="Issuer" value={x.issuer} onChange={(v) => up({ issuer: v })} />
              <TextInput label="Credential ID" value={x.credentialId} onChange={(v) => up({ credentialId: v })} />
              <MonthInput label="Issued" value={x.date} onChange={(v) => up({ date: v })} />
              <MonthInput label="Expires" value={x.expiry} onChange={(v) => up({ expiry: v })} />
              <TextInput className="sm:col-span-2" label="Verification URL" value={x.url} onChange={(v) => up({ url: v })} />
            </div>
          )} />
      );
    case 'projects':
      return (
        <ListEditor items={cv.projects} onChange={(projects) => set((c) => ({ ...c, projects }))} create={newProject} addLabel="Add project" summary={(x) => x.name}
          render={(x, up) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput label="Project name" value={x.name} onChange={(v) => up({ name: v })} />
              <TextInput label="Your role" value={x.role} onChange={(v) => up({ role: v })} />
              <TextInput className="sm:col-span-2" label="Link" value={x.url} onChange={(v) => up({ url: v })} placeholder="github.com/… or live demo" />
              <MonthInput label="Start" value={x.startDate} onChange={(v) => up({ startDate: v })} />
              <MonthInput label="End" value={x.endDate} onChange={(v) => up({ endDate: v })} />
              <TextArea className="sm:col-span-2" label="What it does & the result" value={x.description} onChange={(v) => up({ description: v })} rows={2} />
              <TextInput className="sm:col-span-2" label="Tools / technologies" value={x.tech} onChange={(v) => up({ tech: v })} />
            </div>
          )} />
      );
    case 'awards':
      return (
        <ListEditor items={cv.awards} onChange={(awards) => set((c) => ({ ...c, awards }))} create={newAward} addLabel="Add award" summary={(x) => x.title}
          render={(x, up) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput label="Award" value={x.title} onChange={(v) => up({ title: v })} />
              <TextInput label="Awarded by" value={x.issuer} onChange={(v) => up({ issuer: v })} />
              <MonthInput label="Date" value={x.date} onChange={(v) => up({ date: v })} />
              <TextArea className="sm:col-span-2" label="Why (one line)" value={x.description} onChange={(v) => up({ description: v })} rows={2} />
            </div>
          )} />
      );
    case 'publications':
      return (
        <ListEditor items={cv.publications} onChange={(publications) => set((c) => ({ ...c, publications }))} create={newPublication} addLabel="Add publication" summary={(x) => x.title}
          render={(x, up) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput className="sm:col-span-2" label="Title" value={x.title} onChange={(v) => up({ title: v })} />
              <TextInput label="Authors" value={x.authors} onChange={(v) => up({ authors: v })} placeholder="Perera, A., & Silva, R." />
              <TextInput label="Journal / publisher" value={x.publisher} onChange={(v) => up({ publisher: v })} />
              <MonthInput label="Date" value={x.date} onChange={(v) => up({ date: v })} />
              <TextInput label="DOI / URL" value={x.url} onChange={(v) => up({ url: v })} />
            </div>
          )} />
      );
    case 'volunteering':
      return (
        <ListEditor items={cv.volunteering} onChange={(volunteering) => set((c) => ({ ...c, volunteering }))} create={newVolunteering} addLabel="Add volunteering" summary={(x) => [x.role, x.organization].filter(filled).join(' · ')}
          render={(x, up) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput label="Role" value={x.role} onChange={(v) => up({ role: v })} />
              <TextInput label="Organisation" value={x.organization} onChange={(v) => up({ organization: v })} />
              <MonthInput label="Start" value={x.startDate} onChange={(v) => up({ startDate: v })} />
              <div>
                <MonthInput label="End" value={x.endDate} onChange={(v) => up({ endDate: v })} disabled={x.current} />
                <Toggle className="mt-1.5" label="Ongoing" checked={x.current} onChange={(v) => up({ current: v })} />
              </div>
              <TextInput label="City" value={x.city} onChange={(v) => up({ city: v })} />
              <TextArea className="sm:col-span-2" label="Impact" value={x.description} onChange={(v) => up({ description: v })} rows={2} />
            </div>
          )} />
      );
    case 'courses':
      return (
        <ListEditor items={cv.courses} onChange={(courses) => set((c) => ({ ...c, courses }))} create={newCourse} addLabel="Add course" summary={(x) => x.name}
          render={(x, up) => (
            <div className="grid gap-3 sm:grid-cols-3">
              <TextInput label="Course" value={x.name} onChange={(v) => up({ name: v })} />
              <TextInput label="Provider" value={x.provider} onChange={(v) => up({ provider: v })} />
              <MonthInput label="Completed" value={x.date} onChange={(v) => up({ date: v })} />
            </div>
          )} />
      );
    case 'memberships':
      return (
        <ListEditor items={cv.memberships} onChange={(memberships) => set((c) => ({ ...c, memberships }))} create={newMembership} addLabel="Add membership" summary={(x) => x.name}
          render={(x, up) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput label="Organisation" value={x.name} onChange={(v) => up({ name: v })} />
              <TextInput label="Membership grade / role" value={x.role} onChange={(v) => up({ role: v })} />
              <MonthInput label="Since" value={x.startDate} onChange={(v) => up({ startDate: v })} />
              <MonthInput label="Until (blank = current)" value={x.endDate} onChange={(v) => up({ endDate: v })} />
            </div>
          )} />
      );
    case 'interests':
      return <TagInput values={cv.interests} onChange={(interests) => set((c) => ({ ...c, interests }))} placeholder="e.g. Marathon running, open-source, chess" />;
    case 'references':
      return (
        <div className="space-y-3">
          <Toggle label='Show "References available upon request" instead of names' checked={cv.referencesOnRequest} onChange={(v) => set((c) => ({ ...c, referencesOnRequest: v }))} />
          <ListEditor items={cv.references} onChange={(references) => set((c) => ({ ...c, references }))} create={newReference} addLabel="Add referee" summary={(x) => x.name}
            render={(x, up) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput label="Name" value={x.name} onChange={(v) => up({ name: v })} />
                <TextInput label="Relationship" value={x.relationship} onChange={(v) => up({ relationship: v })} placeholder="Former line manager" />
                <TextInput label="Position" value={x.position} onChange={(v) => up({ position: v })} />
                <TextInput label="Company" value={x.company} onChange={(v) => up({ company: v })} />
                <TextInput label="Email" value={x.email} onChange={(v) => up({ email: v })} />
                <TextInput label="Phone" value={x.phone} onChange={(v) => up({ phone: v })} />
              </div>
            )} />
        </div>
      );
    default: {
      const sec = cv.custom.find((s) => `custom:${s.id}` === k);
      if (!sec) return null;
      const upSec = (patch: Partial<typeof sec>) => set((c) => ({ ...c, custom: c.custom.map((s) => (s.id === sec.id ? { ...s, ...patch } : s)) }));
      return (
        <div className="space-y-3">
          <TextInput label="Section heading" value={sec.heading} onChange={(v) => upSec({ heading: v })} hint="Prefer standard names ATS recognise, e.g. “Leadership”, “Training”." />
          <ListEditor items={sec.entries} onChange={(entries) => upSec({ entries })} create={() => ({ id: uid('ce'), title: '', subtitle: '', date: '', description: '' })} addLabel="Add entry" summary={(x) => x.title}
            render={(x, up) => (
              <div className="grid gap-3 sm:grid-cols-3">
                <TextInput label="Title" value={x.title} onChange={(v) => up({ title: v })} />
                <TextInput label="Subtitle / organisation" value={x.subtitle} onChange={(v) => up({ subtitle: v })} />
                <TextInput label="Date" value={x.date} onChange={(v) => up({ date: v })} />
                <TextArea className="sm:col-span-3" label="Description" value={x.description} onChange={(v) => up({ description: v })} rows={2} />
              </div>
            )} />
        </div>
      );
    }
  }
}

export function sectionGuidance(k: SectionKey) {
  return sectionMeta(k)?.guidance;
}
