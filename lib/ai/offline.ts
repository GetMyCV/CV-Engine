import type { CvData, Project } from '../types';
import { ACTION_VERB_SET, QUANTIFIED, WEAK_PHRASES } from '../ats/vocab';
import { filled, monthsBetween } from '../utils';

/**
 * Rule-based writing helpers used when no AI key is configured. They make the
 * same kinds of edits a CV writer would make mechanically: strong opening verb,
 * no weak phrases, tense, punctuation, and a placeholder where a metric belongs.
 */
const REWRITES: [RegExp, string][] = [
  [/^(was )?responsible for (managing|leading)\s+/i, 'Led '],
  [/^(was )?responsible for\s+/i, 'Managed '],
  [/^(was )?in charge of\s+/i, 'Led '],
  [/^helped (to )?/i, 'Contributed to '],
  [/^worked on\s+/i, 'Delivered '],
  [/^assisted (with|in)\s+/i, 'Supported '],
  [/^involved in\s+/i, 'Contributed to '],
  [/^tasked with\s+/i, ''],
  [/^duties included\s+/i, ''],
  [/^i\s+/i, ''],
];

const PRESENT_TO_PAST: Record<string, string> = { lead: 'Led', manage: 'Managed', build: 'Built', create: 'Created', develop: 'Developed', drive: 'Drove', own: 'Owned', run: 'Ran', design: 'Designed', deliver: 'Delivered', oversee: 'Oversaw', coordinate: 'Coordinated', handle: 'Handled', maintain: 'Maintained', support: 'Supported', write: 'Wrote', teach: 'Taught', sell: 'Sold' };

export function improveBulletOffline(bullet: string, current = false): string {
  let b = bullet.trim().replace(/^[•\-–*]\s*/, '');
  if (!b) return b;
  for (const [re, rep] of REWRITES) b = b.replace(re, rep);
  b = b[0]!.toUpperCase() + b.slice(1);
  const first = b.split(/\s+/)[0]!.toLowerCase().replace(/s$/, '');
  if (!current && PRESENT_TO_PAST[first]) b = PRESENT_TO_PAST[first] + b.slice(b.split(/\s+/)[0]!.length);
  if (!ACTION_VERB_SET.has(b.split(/\s+/)[0]!.toLowerCase()) && !/ed$/i.test(b.split(/\s+/)[0]!)) b = `Delivered ${b[0]!.toLowerCase()}${b.slice(1)}`;
  if (!QUANTIFIED.test(b)) b = `${b.replace(/\.$/, '')}, [add result: e.g. +X% / saved Y hours]`;
  return b.replace(/\s{2,}/g, ' ').replace(/\.$/, '');
}

export function weakPhraseTips(text: string) {
  return WEAK_PHRASES.filter((w) => w.re.test(text)).map((w) => w.tip);
}

export function summaryOffline(cv: CvData, project: Project | null): string {
  const role = project?.targetRole || cv.personal.headline || 'Professional';
  const firstStart = cv.experience.map((x) => x.startDate).filter(filled).sort()[0];
  const months = firstStart ? monthsBetween(firstStart) : null;
  const years = months && months >= 12 ? Math.floor(months / 12) : 0;
  const skills = cv.skills.flatMap((g) => g.items.map((i) => i.name)).filter(filled);
  const best = cv.experience.flatMap((x) => x.bullets).find((b) => /\d/.test(b));
  const industries = [...new Set(cv.experience.map((x) => x.employer).filter(filled))].slice(0, 2);
  const parts = [
    `${role}${years ? ` with ${years}+ years of experience` : ''}${industries.length ? ` at organizations including ${industries.join(' and ')}` : ''}.`,
    skills.length ? `Specialist in ${skills.slice(0, 3).join(', ')}${skills.length > 3 ? ` and ${skills[3]}` : ''}.` : '',
    best ? `Recent highlight: ${best.replace(/\.$/, '')[0]!.toLowerCase()}${best.replace(/\.$/, '').slice(1)}.` : 'Known for [headline achievement with a number].',
    project?.company ? `Looking to bring this impact to ${project.company}.` : '',
  ];
  return parts.filter(filled).join(' ');
}
