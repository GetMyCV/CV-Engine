import type { CvData, Region, SectionKey } from '../types';
import { REGION_RULES, SECTIONS, sectionHasContent, sectionTitle, visibleSections } from '../cv-model';
import { designById } from '../designs';
import { cvToPlainText } from '../export/text';
import { filled, monthsBetween, wordCount } from '../utils';
import { ACTION_VERB_SET, CLICHES, FIRST_PERSON, QUANTIFIED, WEAK_PHRASES } from './vocab';
import { extractKeywords, matchKeywords } from './keywords';

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'info';
export type CheckCategory = 'Contact & header' | 'Structure & sections' | 'Content quality' | 'Length & format' | 'Keywords & targeting' | 'Region rules';

export type AtsCheck = {
  id: string;
  category: CheckCategory;
  label: string;
  status: CheckStatus;
  detail: string;
  /** How much the check matters to the score (0 for info). */
  weight: number;
  /** Editor section to jump to for a fix. */
  fix?: SectionKey | 'personal' | 'design';
};

export type AtsReport = {
  score: number;
  grade: 'Excellent' | 'Good' | 'Needs work' | 'Poor';
  checks: AtsCheck[];
  keywords: ReturnType<typeof matchKeywords> & { all: string[] };
  stats: { words: number; bullets: number; quantified: number; actionVerbs: number; estimatedPages: number };
  plainText: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const UNPROFESSIONAL_EMAIL = /(sexy|hot|cool|babe|princess|killer|lover|420|69|xx)/i;

/**
 * Runs the full ATS checklist over a CV. Every check explains what an
 * applicant tracking system or recruiter does with that part of the CV, and
 * how to fix it. Weighted pass/warn/fail results produce the 0–100 score.
 */
export function analyzeCv(cv: CvData, opts: { region?: Region; jobDescription?: string; targetRole?: string; pages?: number } = {}): AtsReport {
  const region = opts.region ?? 'international';
  const rules = REGION_RULES[region];
  const p = cv.personal;
  const checks: AtsCheck[] = [];
  const add = (c: AtsCheck) => checks.push(c);
  const text = cvToPlainText(cv);
  const words = wordCount(text);

  /* ------------------------------------------------------- contact */
  add({ id: 'name', category: 'Contact & header', label: 'Full name at the top', status: filled(p.firstName) && filled(p.lastName) ? 'pass' : 'fail', detail: filled(p.firstName) && filled(p.lastName) ? 'ATS parsers read the first line as your name.' : 'Add your first and last name — it is the first field every ATS extracts.', weight: 6, fix: 'personal' });
  const emailOk = EMAIL_RE.test(p.email.trim());
  add({
    id: 'email',
    category: 'Contact & header',
    label: 'Professional email address',
    status: !emailOk ? 'fail' : UNPROFESSIONAL_EMAIL.test(p.email) ? 'warn' : 'pass',
    detail: !emailOk ? 'Add a valid email — recruiters cannot contact you without it.' : UNPROFESSIONAL_EMAIL.test(p.email) ? 'Use a neutral address such as firstname.lastname@…' : 'Email is valid and parseable.',
    weight: 6,
    fix: 'personal',
  });
  const phoneDigits = p.phone.replace(/\D/g, '');
  add({
    id: 'phone',
    category: 'Contact & header',
    label: 'Phone number with country code',
    status: phoneDigits.length < 7 ? 'fail' : p.phone.trim().startsWith('+') || region === 'us' || region === 'canada' ? 'pass' : 'warn',
    detail: phoneDigits.length < 7 ? 'Add a phone number.' : p.phone.trim().startsWith('+') ? 'Phone is in international format.' : 'Add the country code (e.g. +44) if you apply abroad.',
    weight: 4,
    fix: 'personal',
  });
  add({ id: 'location', category: 'Contact & header', label: 'City and country', status: filled(p.city) ? 'pass' : 'warn', detail: filled(p.city) ? 'Location helps ATS filters that search by commuting distance.' : 'Add your city (and country) — many ATS searches filter by location. A full street address is not needed.', weight: 3, fix: 'personal' });
  add({ id: 'linkedin', category: 'Contact & header', label: 'LinkedIn profile URL', status: /linkedin\.com\/in\//i.test(p.linkedin) ? 'pass' : filled(p.linkedin) ? 'warn' : 'warn', detail: /linkedin\.com\/in\//i.test(p.linkedin) ? 'Recruiters check LinkedIn for 87% of hires.' : 'Add a custom LinkedIn URL (linkedin.com/in/your-name).', weight: 2, fix: 'personal' });
  add({ id: 'headline', category: 'Contact & header', label: 'Target job title under your name', status: filled(p.headline) ? 'pass' : 'warn', detail: filled(p.headline) ? 'A headline that mirrors the job title improves title matching.' : 'Add a headline such as "Senior Data Analyst" that matches the job you want.', weight: 4, fix: 'personal' });
  if (opts.targetRole && filled(p.headline)) {
    const tr = opts.targetRole.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
    const hit = tr.filter((w) => p.headline.toLowerCase().includes(w)).length;
    add({ id: 'headline-match', category: 'Keywords & targeting', label: 'Headline matches the target role', status: hit >= Math.ceil(tr.length / 2) ? 'pass' : 'warn', detail: hit >= Math.ceil(tr.length / 2) ? `Your headline echoes "${opts.targetRole}".` : `Use the exact job title from the posting ("${opts.targetRole}") in your headline.`, weight: 4, fix: 'personal' });
  }

  /* --------------------------------------------------------- structure */
  for (const key of ['summary', 'experience', 'education', 'skills'] as SectionKey[]) {
    const present = sectionHasContent(cv, key) && !cv.hiddenSections.includes(key);
    const meta = SECTIONS.find((s) => s.key === key)!;
    add({ id: `section-${key}`, category: 'Structure & sections', label: `${meta.title} section`, status: present ? 'pass' : key === 'summary' ? 'warn' : 'fail', detail: present ? `Found under "${sectionTitle(cv, key)}".` : `Add a ${meta.title} section. ${meta.guidance}`, weight: key === 'summary' ? 4 : 7, fix: key });
  }
  const nonStandard = visibleSections(cv).filter((k) => {
    if (k.startsWith('custom:')) return false;
    const meta = SECTIONS.find((s) => s.key === k);
    const t = sectionTitle(cv, k).toLowerCase();
    return meta && !meta.atsTitles.some((a) => a.toLowerCase() === t) && !['about me', 'education and training', 'language skills', 'digital skills', 'certificates'].includes(t);
  });
  add({ id: 'standard-headings', category: 'Structure & sections', label: 'Standard section headings', status: words < 150 ? 'info' : nonStandard.length ? 'warn' : 'pass', detail: nonStandard.length ? `Rename ${nonStandard.map((k) => `"${sectionTitle(cv, k)}"`).join(', ')} to a standard heading (e.g. "Experience", "Skills") so parsers file them correctly.` : 'All headings are names ATS parsers recognise.', weight: 5 });

  const roles = cv.experience.filter((x) => filled(x.title) || filled(x.employer));
  const datesMissing = roles.filter((x) => !filled(x.startDate) || (!x.current && !filled(x.endDate)));
  add({ id: 'dates', category: 'Structure & sections', label: 'Every role has start and end dates', status: roles.length === 0 ? 'info' : datesMissing.length ? 'fail' : 'pass', detail: datesMissing.length ? `Add dates to: ${datesMissing.map((x) => x.title || x.employer).join(', ')}. ATS calculate years of experience from them.` : 'Dates are complete and in one consistent format.', weight: roles.length ? 5 : 0, fix: 'experience' });
  const starts = roles.map((x) => x.startDate).filter(filled);
  const chronological = starts.every((s, i) => i === 0 || s <= starts[i - 1]!);
  add({ id: 'chronological', category: 'Structure & sections', label: 'Reverse-chronological order', status: roles.length < 2 ? 'info' : chronological ? 'pass' : 'warn', detail: chronological ? 'Most recent role first — the order ATS and recruiters expect.' : 'Put your most recent role first (drag roles in the Experience editor).', weight: roles.length < 2 ? 0 : 4, fix: 'experience' });
  // Gaps
  const sorted = [...roles].filter((x) => filled(x.startDate)).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const gaps: string[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const newer = sorted[i]!;
    const older = sorted[i + 1]!;
    if (older.current || !filled(older.endDate)) continue;
    const gap = monthsBetween(older.endDate, newer.startDate);
    if (gap !== null && gap > 6) gaps.push(`${Math.round(gap)} months between ${older.employer || older.title} and ${newer.employer || newer.title}`);
  }
  add({ id: 'gaps', category: 'Structure & sections', label: 'Employment gaps explained', status: gaps.length ? 'info' : 'pass', detail: gaps.length ? `${gaps.join('; ')}. Consider a one-line note (study, caregiving, freelance) — gaps are fine, unexplained ones raise questions.` : 'No unexplained gaps over 6 months.', weight: 0, fix: 'experience' });
  const design = designById(cv.design.designId);
  add({ id: 'layout', category: 'Length & format', label: 'ATS-safe layout', status: design.ats === 'optimized' ? 'pass' : 'warn', detail: design.ats === 'optimized' ? `${design.family.name} reads in one column — the most reliable layout for every ATS.` : `${design.family.name} uses columns. Text order stays linear, so modern ATS read it, but for very old systems (e.g. legacy Taleo) choose an "ATS-optimized" design.`, weight: 4, fix: 'design' });

  /* ----------------------------------------------------------- content */
  const sw = wordCount(cv.summary);
  add({ id: 'summary-length', category: 'Content quality', label: 'Summary is 30–100 words', status: sw === 0 ? 'warn' : sw < 25 ? 'warn' : sw > 120 ? 'warn' : 'pass', detail: sw === 0 ? 'Add a 3–4 line summary with your title, years of experience and top skills.' : sw < 25 ? `Only ${sw} words — add your specialisms and a headline achievement.` : sw > 120 ? `${sw} words — trim to 3–4 lines; recruiters skim.` : `${sw} words — a good length.`, weight: 3, fix: 'summary' });

  const bullets = roles.flatMap((x) => x.bullets.filter(filled));
  const firstWord = (b: string) => b.trim().replace(/^[•\-–*]\s*/, '').split(/\s+/)[0]!.replace(/[^a-z-]/gi, '').toLowerCase();
  const verbs = bullets.filter((b) => ACTION_VERB_SET.has(firstWord(b)) || /ed$/.test(firstWord(b)));
  const quantified = bullets.filter((b) => QUANTIFIED.test(b));
  add({ id: 'bullets-per-role', category: 'Content quality', label: '3–6 bullet points per recent role', status: roles.length === 0 ? 'info' : roles.slice(0, 2).every((x) => { const n = x.bullets.filter(filled).length; return n >= 3 && n <= 7; }) ? 'pass' : 'warn', detail: roles.slice(0, 2).map((x) => `${x.title || 'Role'}: ${x.bullets.filter(filled).length} bullets`).join(' · ') || 'Add your roles.', weight: roles.length ? 4 : 0, fix: 'experience' });
  const verbPct = bullets.length ? verbs.length / bullets.length : 0;
  add({ id: 'action-verbs', category: 'Content quality', label: 'Bullets start with action verbs', status: !bullets.length ? 'info' : verbPct >= 0.8 ? 'pass' : verbPct >= 0.5 ? 'warn' : 'fail', detail: bullets.length ? `${verbs.length} of ${bullets.length} bullets open with an action verb (aim for all). Try "Led", "Built", "Reduced", "Delivered".` : 'Add bullet points to your roles.', weight: bullets.length ? 5 : 0, fix: 'experience' });
  const qPct = bullets.length ? quantified.length / bullets.length : 0;
  add({ id: 'quantified', category: 'Content quality', label: 'Achievements are quantified', status: !bullets.length ? 'info' : qPct >= 0.4 ? 'pass' : qPct >= 0.2 ? 'warn' : 'fail', detail: bullets.length ? `${quantified.length} of ${bullets.length} bullets include a number (aim for 40%+). Add %, $, time saved, team size or volume.` : 'Add bullet points to your roles.', weight: bullets.length ? 6 : 0, fix: 'experience' });
  const longBullets = bullets.filter((b) => wordCount(b) > 35);
  add({ id: 'bullet-length', category: 'Content quality', label: 'Bullets are one to two lines', status: !bullets.length ? 'info' : longBullets.length ? 'warn' : 'pass', detail: longBullets.length ? `${longBullets.length} bullet(s) run over 35 words — split or tighten them.` : 'Bullets are concise.', weight: 2, fix: 'experience' });
  const allProse = [cv.summary, ...bullets, ...roles.map((x) => x.description)].join('\n');
  const hasProse = Boolean(allProse.trim());
  const fp = allProse.split('\n').filter((l) => FIRST_PERSON.test(l));
  add({ id: 'first-person', category: 'Content quality', label: 'No first-person pronouns', status: !hasProse ? 'info' : fp.length ? 'warn' : 'pass', detail: fp.length ? `Remove "I", "my", "me" (${fp.length} line${fp.length > 1 ? 's' : ''}). CV convention is implied first person: "Led…" not "I led…".` : 'Written in the implied first person.', weight: 3, fix: 'summary' });
  const weak = WEAK_PHRASES.filter((w) => w.re.test(allProse));
  add({ id: 'weak-phrases', category: 'Content quality', label: 'No passive phrases ("responsible for")', status: !hasProse ? 'info' : weak.length ? 'warn' : 'pass', detail: weak.length ? weak.map((w) => `${w.re.source.replace(/\\b|\(.*?\)|\?/g, '').trim()}: ${w.tip}`).join(' ') : 'Bullets describe actions, not duties.', weight: 3, fix: 'experience' });
  const cliches = CLICHES.filter((c) => allProse.toLowerCase().includes(c));
  add({ id: 'cliches', category: 'Content quality', label: 'No buzzword clichés', status: !hasProse ? 'info' : cliches.length ? 'warn' : 'pass', detail: cliches.length ? `Replace ${cliches.map((c) => `"${c}"`).join(', ')} with evidence (show, don't tell).` : 'No empty buzzwords found.', weight: 2, fix: 'summary' });
  const skillCount = cv.skills.flatMap((g) => g.items).filter((i) => filled(i.name)).length;
  add({ id: 'skills-count', category: 'Content quality', label: '8–25 relevant hard skills', status: skillCount === 0 ? 'fail' : skillCount < 6 ? 'warn' : skillCount > 30 ? 'warn' : 'pass', detail: skillCount === 0 ? 'Add a skills section — ATS keyword searches hit it first.' : skillCount < 6 ? `Only ${skillCount} skills — add the tools and methods named in job ads.` : skillCount > 30 ? `${skillCount} skills — prune to the most relevant 15–25.` : `${skillCount} skills listed.`, weight: 4, fix: 'skills' });
  // Tense
  const pastWithPresent = roles.filter((x) => !x.current).flatMap((x) => x.bullets.filter(filled)).filter((b) => /^(lead|manage|build|create|develop|drive|own|run|design|deliver|oversee|coordinate|handle|maintain|support)s?\b/i.test(b.trim()));
  add({ id: 'tense', category: 'Content quality', label: 'Consistent tense', status: !bullets.length ? 'info' : pastWithPresent.length ? 'warn' : 'pass', detail: pastWithPresent.length ? `Past roles should use past tense — ${pastWithPresent.length} bullet(s) start in present tense (e.g. "${pastWithPresent[0]!.split(' ').slice(0, 4).join(' ')}…").` : 'Present tense for your current role, past tense for previous roles.', weight: 2, fix: 'experience' });
  const eduMissing = cv.education.filter((e) => filled(e.degree) && (!filled(e.institution) || !filled(e.endDate) && !e.current));
  add({ id: 'education-complete', category: 'Content quality', label: 'Education has institution and dates', status: !cv.education.some((e) => filled(e.degree)) ? 'info' : eduMissing.length ? 'warn' : 'pass', detail: eduMissing.length ? 'Add institution and graduation date to every qualification.' : 'Education entries are complete.', weight: 2, fix: 'education' });

  /* ------------------------------------------------------ length/format */
  const estimatedPages = opts.pages ?? Math.max(1, Math.ceil(words / 520));
  add({ id: 'pages', category: 'Length & format', label: `Length suits the region (max ${rules.maxPages} page${rules.maxPages > 1 ? 's' : ''})`, status: words < 150 ? 'info' : estimatedPages <= rules.maxPages ? 'pass' : 'warn', detail: `About ${estimatedPages} page${estimatedPages > 1 ? 's' : ''} (${words} words). ${rules.notes[0]}`, weight: 4 });
  add({ id: 'word-count', category: 'Length & format', label: 'Enough substance (350–1,100 words)', status: words < 250 ? 'warn' : words > 1400 && region !== 'academic' ? 'warn' : 'pass', detail: words < 250 ? `${words} words — add detail to your roles and projects.` : words > 1400 ? `${words} words — tighten to keep recruiters reading.` : `${words} words.`, weight: 2 });
  add({ id: 'page-size', category: 'Length & format', label: `Paper size (${rules.pageSize})`, status: cv.design.pageSize === rules.pageSize ? 'pass' : 'warn', detail: cv.design.pageSize === rules.pageSize ? `Using ${rules.pageSize}, standard for this region.` : `${region === 'us' || region === 'canada' ? 'North American employers expect US Letter.' : 'Most countries outside North America expect A4.'} Change it under Design.`, weight: 1, fix: 'design' });
  add({ id: 'text-layer', category: 'Length & format', label: 'Selectable text, no text in images', status: 'pass', detail: 'CV Engine PDFs keep every word as real text with standard fonts embedded.', weight: 3 });

  /* ------------------------------------------------------- region rules */
  const hasPhoto = filled(p.photo) && cv.design.showPhoto && design.family.photo;
  if (rules.photo === 'avoid') {
    add({ id: 'photo', category: 'Region rules', label: 'No photo', status: hasPhoto ? 'fail' : 'pass', detail: hasPhoto ? 'Remove the photo: employers in this region screen out photos to avoid bias claims, and photos confuse some parsers.' : 'No photo — correct for this region.', weight: 4, fix: 'design' });
  } else if (rules.photo === 'expected') {
    add({ id: 'photo', category: 'Region rules', label: 'Professional photo', status: hasPhoto ? 'pass' : 'info', detail: hasPhoto ? 'Photo included, as is customary here.' : 'A professional headshot is customary here — add one and choose a design with a photo slot.', weight: 0, fix: 'personal' });
  }
  if (rules.personalData === 'avoid') {
    const personal = [filled(p.dateOfBirth) && 'date of birth', filled(p.nationality) && 'nationality'].filter(Boolean) as string[];
    add({ id: 'personal-data', category: 'Region rules', label: 'No age, marital status or nationality', status: personal.length ? 'warn' : 'pass', detail: personal.length ? `Your ${personal.join(' and ')} ${personal.length > 1 ? 'are' : 'is'} hidden on this CV for this region (anti-discrimination norms). Clear the field to be safe.` : 'No protected personal data — correct for this region.', weight: 3, fix: 'personal' });
  }
  if (region === 'canada') {
    add({ id: 'ca-work-auth', category: 'Region rules', label: 'Work authorization stated (newcomers)', status: filled(p.workAuthorization) ? 'pass' : 'info', detail: filled(p.workAuthorization) ? `States: ${p.workAuthorization}.` : 'If you are a newcomer, add your status (e.g. "Permanent Resident", "Open Work Permit") — it removes a common recruiter doubt.', weight: 0, fix: 'personal' });
    add({ id: 'ca-volunteer', category: 'Region rules', label: 'Volunteer experience', status: sectionHasContent(cv, 'volunteering') ? 'pass' : 'info', detail: 'Canadian employers value community involvement — add volunteering if you have any.', weight: 0, fix: 'volunteering' });
  }
  if (region === 'europass') {
    const cefr = cv.languages.filter((l) => !l.native && filled(l.name));
    add({ id: 'eu-cefr', category: 'Region rules', label: 'Languages self-assessed on the CEFR grid', status: !cefr.length ? 'info' : cefr.every((l) => l.listening && l.reading && l.spokenInteraction && l.spokenProduction && l.writing) ? 'pass' : 'warn', detail: cefr.length ? 'Fill all five CEFR skills (listening, reading, spoken interaction, spoken production, writing) for each foreign language.' : 'Add foreign languages with CEFR levels — Europass CVs always include them.', weight: 2, fix: 'languages' });
  }
  if (region === 'us' && estimatedPages > 1 && roles.length < 4) {
    add({ id: 'us-one-page', category: 'Region rules', label: 'One-page résumé', status: 'warn', detail: 'US recruiters expect one page unless you have 10+ years of relevant experience.', weight: 2 });
  }

  /* ----------------------------------------------------------- keywords */
  const all = extractKeywords(opts.jobDescription ?? '');
  const kw = matchKeywords(text, all);
  if (all.length) {
    add({ id: 'keyword-match', category: 'Keywords & targeting', label: 'Matches job-ad keywords (60%+)', status: kw.percent >= 60 ? 'pass' : kw.percent >= 40 ? 'warn' : 'fail', detail: `${kw.matched.length} of ${all.length} key terms found (${kw.percent}%).${kw.missing.length ? ` Missing: ${kw.missing.slice(0, 10).join(', ')}. Add the ones you genuinely have to your skills and bullets.` : ''}`, weight: 10, fix: 'skills' });
  } else {
    add({ id: 'keyword-match', category: 'Keywords & targeting', label: 'Tailored to a job description', status: 'info', detail: 'Paste the job description into the project to see which keywords your CV is missing. Tailored CVs get far more interviews.', weight: 0 });
  }

  // Score
  const scored = checks.filter((c) => c.weight > 0 && c.status !== 'info');
  const total = scored.reduce((s, c) => s + c.weight, 0);
  const earned = scored.reduce((s, c) => s + c.weight * (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0), 0);
  const score = total ? Math.round((earned / total) * 100) : 0;
  const grade = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Needs work' : 'Poor';
  return { score, grade, checks, keywords: { ...kw, all }, stats: { words, bullets: bullets.length, quantified: quantified.length, actionVerbs: verbs.length, estimatedPages }, plainText: text };
}

/** Static checklist content for the ATS guide page and PDF checklist. */
export const ATS_CHECKLIST: { category: CheckCategory; items: string[] }[] = [
  {
    category: 'Contact & header',
    items: [
      'Full name as the first line, in plain text (not in a header/footer or image).',
      'Professional email (firstname.lastname@…), one phone number with country code.',
      'City and country — no full street address needed.',
      'Custom LinkedIn URL and, if relevant, GitHub/portfolio.',
      'Headline that mirrors the exact job title you are applying for.',
    ],
  },
  {
    category: 'Structure & sections',
    items: [
      'Standard headings: Summary, Experience, Education, Skills (plus Certifications, Projects, Languages as needed).',
      'Reverse-chronological order, most recent first.',
      'Each role: Job Title, Employer, Location, Month YYYY – Month YYYY.',
      'One consistent date format throughout.',
      'Single-column reading order; no text boxes, tables for layout, or columns that break reading order.',
      'Contact details in the body, not in the document header/footer.',
    ],
  },
  {
    category: 'Content quality',
    items: [
      '3–4 line professional summary with years of experience and top keywords.',
      '3–6 bullets per recent role, 1–2 lines each.',
      'Every bullet starts with a strong action verb (Led, Built, Reduced…).',
      '40%+ of bullets include a number: %, $, time, volume, team size.',
      'Implied first person — no "I", "me", "my".',
      'No "responsible for", "duties included" or clichés like "team player".',
      'Present tense for the current role, past tense for previous roles.',
      'Spelling and grammar checked; consistent British/American/Canadian spelling.',
    ],
  },
  {
    category: 'Keywords & targeting',
    items: [
      'Tailor every application: mirror the job ad’s exact skill and tool names.',
      'Include both acronym and full form once (e.g. "Search Engine Optimization (SEO)").',
      'Aim for a 60–80% keyword match; never keyword-stuff or hide white text.',
      'Put the most important keywords in the summary, skills and most recent role.',
    ],
  },
  {
    category: 'Length & format',
    items: [
      '1 page (US, early career), 2 pages (UK, Canada, most others), longer only for academic CVs.',
      'Standard fonts at 10–12 pt body size; generous margins.',
      'Submit as PDF with selectable text unless the employer asks for .docx.',
      'File name: Firstname-Lastname-CV-Job-Title.pdf.',
      'No graphics, charts or icons that carry information only visually.',
    ],
  },
  {
    category: 'Region rules',
    items: [
      'US / UK / Canada / Australia: no photo, date of birth, marital status, religion or nationality.',
      'Canada: Letter size, 2 pages max, add work authorization status if you are a newcomer; volunteering is valued.',
      'Europass / EU: CEFR self-assessment grid for languages, EQF levels for qualifications, photo optional.',
      'Gulf: professional photo, nationality and visa status are customary.',
      'Academic: publications, research, teaching, grants and conferences; no page limit.',
    ],
  },
];
