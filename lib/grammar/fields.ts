import type { CvData, LetterData } from '../types';
import { filled } from '../utils';

export type CheckField<D> = { key: string; label: string; text: string; apply: (doc: D, text: string) => D; section: string };

/** Every free-text field of a CV, with a setter so grammar fixes write back to the right place. */
export function cvFields(cv: CvData): CheckField<CvData>[] {
  const out: CheckField<CvData>[] = [];
  if (filled(cv.personal.headline)) out.push({ key: 'headline', label: 'Headline', section: 'personal', text: cv.personal.headline, apply: (c, t) => ({ ...c, personal: { ...c.personal, headline: t } }) });
  if (filled(cv.summary)) out.push({ key: 'summary', label: 'Summary', section: 'summary', text: cv.summary, apply: (c, t) => ({ ...c, summary: t }) });
  cv.experience.forEach((x, i) => {
    const label = x.title || `Role ${i + 1}`;
    if (filled(x.description)) out.push({ key: `x${x.id}d`, label: `${label} — context`, section: 'experience', text: x.description, apply: (c, t) => ({ ...c, experience: c.experience.map((e) => (e.id === x.id ? { ...e, description: t } : e)) }) });
    x.bullets.forEach((b, j) => {
      if (filled(b)) out.push({ key: `x${x.id}b${j}`, label: `${label} — bullet ${j + 1}`, section: 'experience', text: b, apply: (c, t) => ({ ...c, experience: c.experience.map((e) => (e.id === x.id ? { ...e, bullets: e.bullets.map((bb, k) => (k === j ? t : bb)) } : e)) }) });
    });
  });
  cv.education.forEach((e) =>
    e.bullets.forEach((b, j) => {
      if (filled(b)) out.push({ key: `e${e.id}b${j}`, label: `${e.degree || 'Education'} — highlight ${j + 1}`, section: 'education', text: b, apply: (c, t) => ({ ...c, education: c.education.map((x) => (x.id === e.id ? { ...x, bullets: x.bullets.map((bb, k) => (k === j ? t : bb)) } : x)) }) });
    }),
  );
  cv.projects.forEach((p) => {
    if (filled(p.description)) out.push({ key: `p${p.id}`, label: `Project — ${p.name}`, section: 'projects', text: p.description, apply: (c, t) => ({ ...c, projects: c.projects.map((x) => (x.id === p.id ? { ...x, description: t } : x)) }) });
  });
  cv.volunteering.forEach((v) => {
    if (filled(v.description)) out.push({ key: `v${v.id}`, label: `Volunteering — ${v.role}`, section: 'volunteering', text: v.description, apply: (c, t) => ({ ...c, volunteering: c.volunteering.map((x) => (x.id === v.id ? { ...x, description: t } : x)) }) });
  });
  cv.awards.forEach((a) => {
    if (filled(a.description)) out.push({ key: `a${a.id}`, label: `Award — ${a.title}`, section: 'awards', text: a.description, apply: (c, t) => ({ ...c, awards: c.awards.map((x) => (x.id === a.id ? { ...x, description: t } : x)) }) });
  });
  cv.custom.forEach((s) =>
    s.entries.forEach((e) => {
      if (filled(e.description)) out.push({ key: `c${e.id}`, label: `${s.heading} — ${e.title}`, section: `custom:${s.id}`, text: e.description, apply: (c, t) => ({ ...c, custom: c.custom.map((x) => (x.id === s.id ? { ...x, entries: x.entries.map((y) => (y.id === e.id ? { ...y, description: t } : y)) } : x)) }) });
    }),
  );
  return out;
}

export function letterFields(l: LetterData): CheckField<LetterData>[] {
  const out: CheckField<LetterData>[] = [];
  if (filled(l.subject)) out.push({ key: 'subject', label: 'Subject', section: 'header', text: l.subject, apply: (d, t) => ({ ...d, subject: t }) });
  l.blocks.forEach((b, i) => {
    if (filled(b.body)) out.push({ key: b.id, label: b.heading || `Paragraph ${i + 1}`, section: 'body', text: b.body, apply: (d, t) => ({ ...d, blocks: d.blocks.map((x) => (x.id === b.id ? { ...x, body: t } : x)) }) });
  });
  return out;
}
