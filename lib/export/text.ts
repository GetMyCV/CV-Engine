import type { CvData } from '../types';
import { fullName, sectionTitle, visibleSections } from '../cv-model';
import { filled, formatRange, formatYm } from '../utils';

/**
 * The CV as plain text in reading order — roughly what an applicant tracking
 * system extracts from the PDF. Used by the ATS checker, the ".txt" export and
 * the "what the ATS sees" panel.
 */
export function cvToPlainText(cv: CvData): string {
  const p = cv.personal;
  const fmt = cv.design.dateFormat;
  const out: string[] = [];
  out.push(fullName(p) || 'Your Name');
  if (filled(p.headline)) out.push(p.headline);
  out.push([p.email, p.phone, [p.city, p.country].filter(filled).join(', '), p.linkedin, p.github, p.website].filter(filled).join(' | '));
  if (filled(p.workAuthorization)) out.push(`Work authorization: ${p.workAuthorization}`);

  for (const k of visibleSections(cv)) {
    out.push('', sectionTitle(cv, k).toUpperCase());
    switch (k) {
      case 'summary':
        out.push(cv.summary.trim());
        break;
      case 'experience':
        for (const x of cv.experience) {
          if (!filled(x.title) && !filled(x.employer)) continue;
          out.push(`${x.title}${filled(x.employer) ? `, ${x.employer}` : ''}${filled(x.city) ? ` — ${[x.city, x.country].filter(filled).join(', ')}` : ''}`);
          out.push(formatRange(x.startDate, x.endDate, x.current, fmt));
          if (filled(x.description)) out.push(x.description);
          for (const b of x.bullets.filter(filled)) out.push(`• ${b}`);
        }
        break;
      case 'education':
        for (const e of cv.education) {
          if (!filled(e.degree) && !filled(e.institution)) continue;
          out.push(`${[e.degree, e.field].filter(filled).join(' in ')}${filled(e.institution) ? `, ${e.institution}` : ''}`);
          out.push([formatRange(e.startDate, e.endDate, e.current, fmt), e.grade].filter(filled).join(' · '));
          for (const b of e.bullets.filter(filled)) out.push(`• ${b}`);
        }
        break;
      case 'skills':
        for (const g of cv.skills) {
          const items = g.items.map((i) => i.name).filter(filled);
          if (items.length) out.push(`${filled(g.name) ? `${g.name}: ` : ''}${items.join(', ')}`);
        }
        break;
      case 'languages':
        for (const l of cv.languages.filter((x) => filled(x.name)))
          out.push(`${l.name} — ${l.native ? 'Native' : [l.proficiency, l.listening || l.reading].filter(filled).join(' ')}`);
        break;
      case 'certifications':
        for (const c of cv.certifications.filter((x) => filled(x.name))) out.push(`${c.name}${filled(c.issuer) ? `, ${c.issuer}` : ''}${filled(c.date) ? ` (${formatYm(c.date, fmt)})` : ''}`);
        break;
      case 'projects':
        for (const pr of cv.projects.filter((x) => filled(x.name))) {
          out.push(`${pr.name}${filled(pr.role) ? `, ${pr.role}` : ''}${filled(pr.url) ? ` — ${pr.url}` : ''}`);
          if (filled(pr.description)) out.push(pr.description);
          if (filled(pr.tech)) out.push(`Tools: ${pr.tech}`);
        }
        break;
      case 'awards':
        for (const a of cv.awards.filter((x) => filled(x.title))) out.push(`${a.title}${filled(a.issuer) ? `, ${a.issuer}` : ''} ${formatYm(a.date, fmt)}`.trim(), ...(filled(a.description) ? [a.description] : []));
        break;
      case 'publications':
        for (const pu of cv.publications.filter((x) => filled(x.title))) out.push(`${pu.authors} (${formatYm(pu.date, 'YYYY')}). ${pu.title}. ${pu.publisher}`.trim());
        break;
      case 'volunteering':
        for (const v of cv.volunteering.filter((x) => filled(x.role) || filled(x.organization))) {
          out.push(`${v.role}, ${v.organization}`, formatRange(v.startDate, v.endDate, v.current, fmt));
          if (filled(v.description)) out.push(v.description);
        }
        break;
      case 'courses':
        for (const c of cv.courses.filter((x) => filled(x.name))) out.push(`${c.name}${filled(c.provider) ? `, ${c.provider}` : ''} ${formatYm(c.date, fmt)}`.trim());
        break;
      case 'memberships':
        for (const m of cv.memberships.filter((x) => filled(x.name))) out.push(`${m.name}${filled(m.role) ? ` — ${m.role}` : ''}`);
        break;
      case 'interests':
        out.push(cv.interests.filter(filled).join(', '));
        break;
      case 'references':
        for (const r of cv.references.filter((x) => filled(x.name))) out.push(`${r.name}, ${[r.position, r.company].filter(filled).join(', ')} — ${[r.email, r.phone].filter(filled).join(' · ')}`);
        if (cv.referencesOnRequest && !cv.references.some((r) => filled(r.name))) out.push('References available upon request.');
        break;
      default: {
        const c = cv.custom.find((s) => `custom:${s.id}` === k);
        for (const e of c?.entries ?? []) out.push([e.title, e.subtitle, e.date].filter(filled).join(', '), ...(filled(e.description) ? [e.description] : []));
      }
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
