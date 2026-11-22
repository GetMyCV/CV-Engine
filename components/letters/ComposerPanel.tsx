'use client';
import type { CvData, DocumentRecord, LetterCompose, LetterLength, LetterTone } from '@/lib/types';
import type { Composed } from '@/lib/letters/compose';
import { TextArea, TextInput, Toggle } from '@/components/ui/fields';
import { cx } from '@/lib/utils';

const TONES: { id: LetterTone; label: string; hint: string }[] = [
  { id: 'confident', label: 'Confident', hint: 'Direct and energetic' },
  { id: 'formal', label: 'Formal', hint: 'Traditional, conservative sectors' },
  { id: 'warm', label: 'Warm', hint: 'Friendly, people-focused roles' },
];
const LENGTHS: { id: LetterLength; label: string; hint: string }[] = [
  { id: 'short', label: 'Short', hint: '~200 words' },
  { id: 'standard', label: 'Standard', hint: '~300 words' },
  { id: 'detailed', label: 'Detailed', hint: '~400+ words' },
];
const INCLUDE: { key: keyof LetterCompose['include']; label: string }[] = [
  { key: 'achievements', label: 'Achievements' },
  { key: 'earlierRoles', label: 'Earlier roles' },
  { key: 'skills', label: 'Skills & job-ad keywords' },
  { key: 'education', label: 'Education' },
  { key: 'certifications', label: 'Certifications' },
  { key: 'projects', label: 'Projects' },
  { key: 'languages', label: 'Languages' },
  { key: 'volunteering', label: 'Volunteering' },
  { key: 'awards', label: 'Awards' },
];

/**
 * Controls for the real-time letter composer. Everything here re-writes the
 * letter instantly; paragraphs the user edited by hand are kept.
 */
export default function ComposerPanel({
  compose,
  onChange,
  cvs,
  composed,
  templateId,
  kind,
  words,
}: {
  compose: LetterCompose;
  onChange: (patch: Partial<LetterCompose>) => void;
  cvs: DocumentRecord<CvData>[];
  composed: Composed | null;
  templateId: string;
  kind: 'cover' | 'motivation' | 'sop';
  words: number;
}) {
  const academic = kind !== 'cover' && !/eu-job|ausbildung/.test(templateId);
  const studyPlan = templateId === 'sop-canada-study-plan';
  const required = composed?.missing.filter((m) => m.required) ?? [];
  const optional = composed?.missing.filter((m) => !m.required) ?? [];
  return (
    <div className="space-y-4">
      <div className={cx('rounded-xl border p-3', compose.live ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white')}>
        <Toggle label="Live: write this letter from my CV and keep it in sync" checked={compose.live} onChange={(live) => onChange({ live })} />
        <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
          {compose.live
            ? `The letter updates instantly when you change the CV, the job ad or anything below. Paragraphs you edit by hand are kept. ${words} words now.`
            : 'Paused — the letter will not change until you turn this back on.'}
        </p>
      </div>

      <label className="block">
        <span className="label">Written from this CV</span>
        <select className="input" value={compose.cvId} onChange={(e) => onChange({ cvId: e.target.value })}>
          {!cvs.length && <option value="">No CV yet — create one in this project</option>}
          {cvs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </label>

      {required.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <b>Needed for a complete letter:</b> {required.map((m) => m.label).join(' · ')}
        </div>
      )}

      <div>
        <span className="label">Tone</span>
        <div className="grid grid-cols-3 gap-2">
          {TONES.map((t) => (
            <button key={t.id} onClick={() => onChange({ tone: t.id })} className={cx('rounded-lg border px-2 py-1.5 text-left', compose.tone === t.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50')}>
              <div className="text-xs font-semibold">{t.label}</div>
              <div className="text-[10px] text-ink-mute">{t.hint}</div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="label">Length</span>
        <div className="grid grid-cols-3 gap-2">
          {LENGTHS.map((t) => (
            <button key={t.id} onClick={() => onChange({ length: t.id })} className={cx('rounded-lg border px-2 py-1.5 text-left', compose.length === t.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50')}>
              <div className="text-xs font-semibold">{t.label}</div>
              <div className="text-[10px] text-ink-mute">{t.hint}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">Include from the CV</span>
        <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-white p-3">
          {INCLUDE.map((i) => (
            <Toggle key={i.key} label={i.label} checked={compose.include[i.key]} onChange={(v) => onChange({ include: { ...compose.include, [i.key]: v } })} />
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="text-xs font-semibold text-ink-soft">What only you can say {optional.length > 0 && <span className="font-normal text-ink-mute">— each answer makes the letter more personal</span>}</div>
        {(kind !== 'cover' || academic) && <TextInput label={academic ? 'Programme name' : 'Position'} value={compose.program} onChange={(v) => onChange({ program: v })} placeholder={academic ? 'e.g. MSc in Data Science' : 'e.g. Policy Officer'} hint={academic ? 'The university comes from the project’s “Company / university”.' : undefined} />}
        {templateId === 'cover-referral' && <TextInput label="Who referred you" value={compose.referrer} onChange={(v) => onChange({ referrer: v })} placeholder="e.g. Priya Shah, Senior Engineer at Shopify" />}
        <TextArea label={academic ? 'Why this programme / university' : 'Why this company'} value={compose.why} onChange={(v) => onChange({ why: v })} rows={2} placeholder={academic ? 'e.g. its applied machine-learning modules and Professor Lee’s work on fairness' : 'e.g. I have used Shopify for my own store and admire how it empowers small merchants'} />
        {kind !== 'cover' && <TextArea label="Your goals after the programme" value={compose.goals} onChange={(v) => onChange({ goals: v })} rows={2} placeholder="e.g. lead a data team in Sri Lanka’s fintech sector" />}
        <TextArea label={kind === 'sop' ? 'Your opening story (optional)' : 'Anything else to mention (optional)'} value={compose.story} onChange={(v) => onChange({ story: v })} rows={2} placeholder={kind === 'sop' ? 'A specific moment or problem that drew you to the field' : 'e.g. available to start in March; relocating to Toronto'} />
        {studyPlan && (
          <>
            <TextArea label="Funding (required)" value={compose.funding} onChange={(v) => onChange({ funding: v })} rows={2} placeholder="e.g. CAD 45,000 in personal savings plus a GIC of CAD 20,635; my father is sponsoring tuition" />
            <TextArea label="Ties to home country (required)" value={compose.ties} onChange={(v) => onChange({ ties: v })} rows={2} placeholder="e.g. my employer has approved study leave and I will return to my role" />
          </>
        )}
      </div>

      {composed && composed.used.length > 0 && (
        <div className="rounded-xl bg-brand-50/70 p-3 text-[11px] leading-relaxed text-brand-900">
          <b>Pulled from your CV:</b>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {composed.used.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
