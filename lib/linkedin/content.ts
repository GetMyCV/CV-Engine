import type { CvData, LinkedInData, Project } from '../types';
import { fullName } from '../cv-model';
import { filled, monthsBetween } from '../utils';

export const LINKEDIN_CHECKLIST: { id: string; group: string; label: string; tip: string }[] = [
  { id: 'photo', group: 'Visuals', label: 'Professional profile photo', tip: 'Face fills ~60% of the frame, plain background, natural light. Profiles with photos get up to 21× more views.' },
  { id: 'banner', group: 'Visuals', label: 'Custom banner (1584 × 396)', tip: 'Use the banner to state your value: role, specialism, proof. Keep text away from the lower-left (your photo covers it).' },
  { id: 'headline', group: 'Top card', label: 'Keyword-rich headline (≤220 characters)', tip: 'Role | Specialism | Proof or value. Recruiters search headlines first.' },
  { id: 'url', group: 'Top card', label: 'Custom URL (linkedin.com/in/your-name)', tip: 'Edit it under "Public profile & URL". Use the same URL on your CV.' },
  { id: 'location', group: 'Top card', label: 'Location set to where you want to work', tip: 'Recruiter searches filter by location.' },
  { id: 'opentowork', group: 'Top card', label: '"Open to work" set to recruiters only (if job hunting)', tip: 'Recruiter-only visibility is discreet and still puts you in their searches.' },
  { id: 'about', group: 'About', label: 'About section of 200–300 words', tip: 'Hook → what you do and for whom → 2–3 proof points → skills keywords → call to action.' },
  { id: 'featured', group: 'About', label: 'Featured section with 2–3 items', tip: 'Portfolio, case study, article, certificate or media mention.' },
  { id: 'experience', group: 'Experience', label: 'Every role has 3–5 achievement bullets', tip: 'Mirror your CV, with numbers. Add media to key roles.' },
  { id: 'skills', group: 'Skills', label: '30–50 skills, top 5 pinned', tip: 'Pin the skills that match your target role. Ask colleagues to endorse them.' },
  { id: 'recommendations', group: 'Credibility', label: 'At least 3 recommendations', tip: 'Ask managers and clients; offer to write one back.' },
  { id: 'certifications', group: 'Credibility', label: 'Licences & certifications added', tip: 'Link credential IDs so they are verifiable.' },
  { id: 'activity', group: 'Visibility', label: 'Post or comment weekly', tip: 'Consistent activity raises your profile in recruiter search results.' },
  { id: 'connections', group: 'Visibility', label: '500+ relevant connections', tip: 'Connect with people in your target companies and industry, with a short note.' },
];

export const HEADLINE_FORMULAS = [
  { id: 'role-spec-proof', name: 'Role | Specialism | Proof', build: (v: HeadlineVars) => [v.role, v.specialism, v.proof].filter(filled).join(' | ') },
  { id: 'role-help', name: 'Role helping X achieve Y', build: (v: HeadlineVars) => `${v.role} helping ${v.audience || '[who]'} ${v.outcome || '[achieve what]'}` },
  { id: 'skills-stack', name: 'Role • Skill • Skill • Skill', build: (v: HeadlineVars) => [v.role, ...v.skills.slice(0, 4)].filter(filled).join(' • ') },
  { id: 'aspiring', name: 'Graduate / career change', build: (v: HeadlineVars) => `${v.role ? `Aspiring ${v.role}` : 'Aspiring [role]'} | ${v.specialism || '[degree or bootcamp]'} | ${v.skills.slice(0, 3).join(', ') || '[top skills]'}` },
  { id: 'open', name: 'Open to opportunities', build: (v: HeadlineVars) => `${v.role} | ${v.skills.slice(0, 3).join(' · ')} | Open to ${v.target || 'new opportunities'}` },
];

export type HeadlineVars = { role: string; specialism: string; proof: string; audience: string; outcome: string; skills: string[]; target: string };

export function headlineVars(cv: CvData | null, project: Project | null): HeadlineVars {
  const skills = cv?.skills.flatMap((g) => g.items.map((i) => i.name)).filter(filled) ?? [];
  const firstStart = cv?.experience.map((x) => x.startDate).filter(filled).sort()[0];
  const months = firstStart ? monthsBetween(firstStart) : null;
  const years = months && months >= 12 ? Math.floor(months / 12) : 0;
  const best = cv?.experience.flatMap((x) => x.bullets).find((b) => /\d/.test(b));
  return {
    role: cv?.personal.headline || project?.targetRole || '',
    specialism: skills.slice(0, 2).join(' & '),
    proof: years ? `${years}+ years` : best ? best.split(/[,.;]/)[0]!.slice(0, 60) : '',
    audience: '',
    outcome: '',
    skills,
    target: project?.targetRole || '',
  };
}

/** Offline About-section draft built from the CV (the AI assistant can polish it further). */
export function draftAbout(cv: CvData | null, project: Project | null): string {
  if (!cv) return '';
  const v = headlineVars(cv, project);
  const p = cv.personal;
  const current = cv.experience.find((x) => x.current) ?? cv.experience[0];
  const proofs = cv.experience.flatMap((x) => x.bullets).filter((b) => /\d/.test(b)).slice(0, 3);
  const lines = [
    cv.summary.trim() || `I am a ${v.role || 'professional'}${v.proof ? ` with ${v.proof} of experience` : ''}${v.specialism ? ` specialising in ${v.specialism}` : ''}.`,
    '',
    current?.title ? `Currently I work as ${/^[aeiou]/i.test(current.title) ? 'an' : 'a'} ${current.title}${current.employer ? ` at ${current.employer}` : ''}. Some results I am proud of:` : 'Some results I am proud of:',
    ...proofs.map((b) => `▸ ${b.replace(/\.$/, '')}`),
    '',
    v.skills.length ? `Skills: ${v.skills.slice(0, 12).join(' · ')}` : '',
    '',
    `${project?.targetRole ? `I am open to ${project.targetRole} opportunities. ` : ''}Let’s connect${p.email ? ` — or email me at ${p.email}` : ''}.`,
  ];
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function newLinkedIn(cv: CvData | null, project: Project | null): LinkedInData {
  const name = cv ? fullName(cv.personal) : '';
  const v = headlineVars(cv, project);
  return {
    banner: {
      templateId: 'gradient-sweep',
      name,
      headline: cv?.personal.headline || project?.targetRole || 'Your headline',
      tagline: v.proof ? `${v.proof} · ${v.specialism}` : v.specialism,
      skills: v.skills.slice(0, 5),
      contact: [cv?.personal.website, cv?.personal.email].filter(filled).join('  ·  '),
      accent: '',
      accent2: '',
      textColor: '',
      image: '',
      align: 'right',
    },
    avatar: { photo: cv?.personal.photo ?? '', frameId: 'ring', ringColor: '#2563EB', ringText: 'Open to opportunities', background: '', zoom: 1, offsetX: 0, offsetY: 0 },
    post: { templateId: 'announce', title: project?.targetRole ? `I’m looking for my next ${project.targetRole} role` : 'Excited to share some news', subtitle: v.skills.slice(0, 3).join(' · '), accent: '#2563EB' },
    headline: HEADLINE_FORMULAS[0]!.build(v),
    about: draftAbout(cv, project),
    checklist: {},
  };
}

export function normalizeLinkedIn(raw: Partial<LinkedInData> | null | undefined): LinkedInData {
  const base = newLinkedIn(null, null);
  const d = raw ?? {};
  return { ...base, ...d, banner: { ...base.banner, ...(d.banner ?? {}) }, avatar: { ...base.avatar, ...(d.avatar ?? {}) }, post: { ...base.post, ...(d.post ?? {}) }, checklist: d.checklist ?? {} };
}
