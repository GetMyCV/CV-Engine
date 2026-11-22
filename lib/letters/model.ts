import type { CvData, LetterData, Project } from '../types';
import { fullName } from '../cv-model';
import { REGION_RULES } from '../cv-model';
import { filled, monthsBetween, uid } from '../utils';
import { fillPlaceholders, letterTemplateById, type LetterTemplate } from './templates';

/** Values for {{placeholders}}, taken from the project and (if any) the project's CV. */
export function placeholderValues(project: Project | null, cv: CvData | null, userName = ''): Record<string, string> {
  const p = cv?.personal;
  const current = cv?.experience.find((x) => x.current) ?? cv?.experience[0];
  const firstStart = cv?.experience.map((x) => x.startDate).filter(filled).sort()[0];
  const months = firstStart ? monthsBetween(firstStart) : null;
  const skills = cv?.skills.flatMap((g) => g.items.map((i) => i.name)).filter(filled) ?? [];
  const edu = cv?.education.find((e) => filled(e.degree));
  const bestBullet = cv?.experience.flatMap((x) => x.bullets).find((b) => /\d/.test(b));
  return {
    name: (p && fullName(p)) || userName,
    role: project?.targetRole ?? '',
    company: project?.company ?? '',
    hiringManager: '',
    years: months && months >= 12 ? String(Math.floor(months / 12)) : '',
    currentTitle: current?.title ?? p?.headline ?? '',
    currentEmployer: current?.employer ?? '',
    skill1: skills[0] ?? '',
    skill2: skills[1] ?? '',
    skill3: skills[2] ?? '',
    achievement: bestBullet ? lowerFirst(bestBullet.replace(/\.$/, '')) : '',
    degree: edu ? [edu.degree, edu.field].filter(filled).join(' in ') : '',
    university: edu?.institution ?? '',
    program: '',
    targetUniversity: project?.company ?? '',
    field: edu?.field ?? '',
    city: p?.city ?? '',
  };
}

const lowerFirst = (s: string) => (s && /^[A-Z][a-z]/.test(s) ? s[0]!.toLowerCase() + s.slice(1) : s);

export function newLetter(template: LetterTemplate, values: Record<string, string>, cv: CvData | null, project: Project | null): LetterData {
  const p = cv?.personal;
  const rules = REGION_RULES[project?.region ?? 'international'];
  return {
    templateId: template.id,
    sender: {
      name: values.name ?? '',
      headline: p?.headline ?? '',
      email: p?.email ?? '',
      phone: p?.phone ?? '',
      city: [p?.city, p?.country].filter(filled).join(', '),
      linkedin: p?.linkedin ?? '',
    },
    recipient: { name: '', title: template.kind === 'cover' ? 'Hiring Manager' : '', organization: project?.company ?? '', address: '' },
    date: new Date().toLocaleDateString(project?.region === 'us' || project?.region === 'canada' ? 'en-US' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    subject: fillPlaceholders(template.subject ?? '', values),
    salutation: template.salutation ?? (values.hiringManager ? `Dear ${values.hiringManager},` : 'Dear Hiring Manager,'),
    blocks: template.blocks.map((b) => ({ id: uid('b'), heading: b.heading ?? '', body: fillPlaceholders(b.body, values) })),
    showHeadings: Boolean(template.showHeadings),
    closing: template.closing ?? 'Sincerely,',
    signature: values.name ?? '',
    wordTarget: template.wordTarget ?? (template.kind === 'cover' ? 350 : 0),
    design: { designId: cv?.design.designId ?? rules.defaultDesign, accent: cv?.design.accent ?? '', font: cv?.design.font ?? '', pageSize: cv?.design.pageSize ?? rules.pageSize, fontScale: 1 },
  };
}

export function normalizeLetter(raw: Partial<LetterData> | null | undefined): LetterData {
  const fallback = newLetter(letterTemplateById('cover-professional')!, {}, null, null);
  const d = raw ?? {};
  return {
    ...fallback,
    ...d,
    sender: { ...fallback.sender, ...(d.sender ?? {}) },
    recipient: { ...fallback.recipient, ...(d.recipient ?? {}) },
    blocks: Array.isArray(d.blocks) ? d.blocks : fallback.blocks,
    design: { ...fallback.design, ...(d.design ?? {}) },
  };
}

export function letterPlainText(l: LetterData): string {
  const lines = [
    l.sender.name,
    [l.sender.email, l.sender.phone, l.sender.city, l.sender.linkedin].filter(filled).join(' | '),
    '',
    l.date,
    '',
    ...[l.recipient.name, l.recipient.title, l.recipient.organization, l.recipient.address].filter(filled),
    '',
    ...(filled(l.subject) ? [`Re: ${l.subject}`, ''] : []),
    ...(filled(l.salutation) ? [l.salutation, ''] : []),
    ...l.blocks.flatMap((b) => [...(l.showHeadings && filled(b.heading) ? [b.heading.toUpperCase()] : []), b.body, '']),
    ...(filled(l.closing) ? [l.closing] : []),
    l.signature,
  ];
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
