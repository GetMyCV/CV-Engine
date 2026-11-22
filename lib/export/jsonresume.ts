import type { CvData } from '../types';
import { emptyCv, newEducation, newExperience, newLanguage, normalizeCv } from '../cv-model';
import { uid } from '../utils';
import { isDocumentFile } from './document';

/**
 * Import/export in the open JSON Resume schema (jsonresume.org), so users can
 * bring CVs from other tools and take theirs elsewhere — no lock-in.
 */

type JR = Record<string, any>;

const ym = (d?: string) => (d ? d.slice(0, 7) : '');

export function toJsonResume(cv: CvData): JR {
  const p = cv.personal;
  return {
    $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
    basics: {
      name: `${p.firstName} ${p.lastName}`.trim(),
      label: p.headline,
      email: p.email,
      phone: p.phone,
      url: p.website,
      summary: cv.summary,
      location: { city: p.city, countryCode: p.country, address: p.address, postalCode: p.postalCode },
      profiles: [p.linkedin && { network: 'LinkedIn', url: p.linkedin }, p.github && { network: 'GitHub', url: p.github }].filter(Boolean),
    },
    work: cv.experience.map((x) => ({ name: x.employer, position: x.title, location: [x.city, x.country].filter(Boolean).join(', '), startDate: x.startDate, endDate: x.current ? undefined : x.endDate, summary: x.description, highlights: x.bullets.filter(Boolean) })),
    volunteer: cv.volunteering.map((v) => ({ organization: v.organization, position: v.role, startDate: v.startDate, endDate: v.endDate, summary: v.description })),
    education: cv.education.map((e) => ({ institution: e.institution, area: e.field, studyType: e.degree, startDate: e.startDate, endDate: e.endDate, score: e.grade, courses: e.bullets })),
    awards: cv.awards.map((a) => ({ title: a.title, awarder: a.issuer, date: a.date, summary: a.description })),
    certificates: cv.certifications.map((c) => ({ name: c.name, issuer: c.issuer, date: c.date, url: c.url })),
    publications: cv.publications.map((pu) => ({ name: pu.title, publisher: pu.publisher, releaseDate: pu.date, url: pu.url })),
    skills: cv.skills.map((g) => ({ name: g.name, keywords: g.items.map((i) => i.name) })),
    languages: cv.languages.map((l) => ({ language: l.name, fluency: l.native ? 'Native speaker' : l.proficiency })),
    interests: cv.interests.map((i) => ({ name: i })),
    references: cv.references.map((r) => ({ name: r.name, reference: [r.position, r.company, r.email, r.phone].filter(Boolean).join(', ') })),
    projects: cv.projects.map((pr) => ({ name: pr.name, description: pr.description, url: pr.url, roles: pr.role ? [pr.role] : [], startDate: pr.startDate, endDate: pr.endDate, keywords: pr.tech.split(',').map((s) => s.trim()).filter(Boolean) })),
    meta: { cvEngine: { design: cv.design, sectionOrder: cv.sectionOrder } },
  };
}

/** Accepts a CV Engine CV export, JSON Resume, or raw CV Engine CV data. Returns null otherwise. */
export function fromJson(raw: unknown): CvData | null {
  if (!raw || typeof raw !== 'object') return null;
  if (isDocumentFile(raw)) return raw.kind === 'cv' ? normalizeCv(raw.data as Partial<CvData>) : null;
  const j = raw as JR;
  if (j.personal && j.experience) return normalizeCv(j as Partial<CvData>);
  if (!j.basics) return null;
  const cv = emptyCv();
  const b = j.basics ?? {};
  const [first, ...rest] = String(b.name ?? '').split(' ');
  const profile = (net: string) => (b.profiles ?? []).find((x: JR) => String(x.network).toLowerCase() === net)?.url ?? '';
  cv.personal = { ...cv.personal, firstName: first ?? '', lastName: rest.join(' '), headline: b.label ?? '', email: b.email ?? '', phone: b.phone ?? '', website: b.url ?? '', city: b.location?.city ?? '', country: b.location?.countryCode ?? '', linkedin: profile('linkedin'), github: profile('github') };
  cv.summary = b.summary ?? '';
  cv.experience = (j.work ?? []).map((w: JR) => ({ ...newExperience(), title: w.position ?? '', employer: w.name ?? w.company ?? '', city: w.location ?? '', startDate: ym(w.startDate), endDate: ym(w.endDate), current: !w.endDate, description: w.summary ?? '', bullets: w.highlights ?? [] }));
  cv.education = (j.education ?? []).map((e: JR) => ({ ...newEducation(), degree: e.studyType ?? '', field: e.area ?? '', institution: e.institution ?? '', startDate: ym(e.startDate), endDate: ym(e.endDate), grade: e.score ?? '', bullets: e.courses ?? [] }));
  cv.skills = (j.skills ?? []).map((s: JR) => ({ id: uid('s'), name: s.name ?? '', items: (s.keywords ?? []).map((k: string) => ({ name: k, level: 4 })) }));
  cv.languages = (j.languages ?? []).map((l: JR) => ({ ...newLanguage(), name: l.language ?? '', native: /native/i.test(l.fluency ?? ''), proficiency: l.fluency ?? '' }));
  cv.certifications = (j.certificates ?? []).map((c: JR) => ({ id: uid('c'), name: c.name ?? '', issuer: c.issuer ?? '', date: ym(c.date), expiry: '', credentialId: '', url: c.url ?? '' }));
  cv.awards = (j.awards ?? []).map((a: JR) => ({ id: uid('a'), title: a.title ?? '', issuer: a.awarder ?? '', date: ym(a.date), description: a.summary ?? '' }));
  cv.publications = (j.publications ?? []).map((p: JR) => ({ id: uid('pu'), title: p.name ?? '', authors: '', publisher: p.publisher ?? '', date: ym(p.releaseDate), url: p.url ?? '' }));
  cv.volunteering = (j.volunteer ?? []).map((v: JR) => ({ id: uid('v'), role: v.position ?? '', organization: v.organization ?? '', city: '', startDate: ym(v.startDate), endDate: ym(v.endDate), current: !v.endDate, description: v.summary ?? '' }));
  cv.projects = (j.projects ?? []).map((p: JR) => ({ id: uid('p'), name: p.name ?? '', role: (p.roles ?? [])[0] ?? '', url: p.url ?? '', startDate: ym(p.startDate), endDate: ym(p.endDate), description: p.description ?? '', tech: (p.keywords ?? []).join(', ') }));
  cv.interests = (j.interests ?? []).map((i: JR) => i.name).filter(Boolean);
  return normalizeCv(cv);
}
