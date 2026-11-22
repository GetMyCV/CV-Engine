import type { CvData, CvExperience, LetterCompose, LetterData, Project } from '../types';
import { fullName } from '../cv-model';
import { extractKeywords, matchKeywords } from '../ats/keywords';
import { ACTION_VERB_SET, QUANTIFIED } from '../ats/vocab';
import { cvToPlainText } from '../export/text';
import { filled, formatYm, monthsBetween } from '../utils';
import { fillPlaceholders, letterTemplateById, type LetterTemplate } from './templates';

/**
 * The letter composer: writes a complete cover letter, motivation letter or
 * statement of purpose from the linked CV, the project (role, company, job ad)
 * and a few answers only the candidate can give (why this company, goals…).
 *
 * It is deterministic and runs in the browser on every change, so letters
 * update in real time. It never invents facts: every claim comes from the CV
 * or the candidate's own answers. Where a fact is genuinely needed and missing
 * (e.g. funding for a study permit), it says so in [brackets] and reports it
 * in `missing` so the editor can ask for it.
 */

export const defaultCompose = (cvId = ''): LetterCompose => ({
  live: true,
  cvId,
  tone: 'confident',
  length: 'standard',
  include: { achievements: true, earlierRoles: true, skills: true, education: true, projects: true, certifications: true, languages: true, volunteering: true, awards: true },
  why: '',
  goals: '',
  story: '',
  referrer: '',
  program: '',
  funding: '',
  ties: '',
  edited: [],
});

export type ComposedBlock = { key: string; heading: string; body: string };
export type Composed = {
  subject: string;
  salutation: string;
  closing: string;
  blocks: ComposedBlock[];
  showHeadings: boolean;
  /** Inputs that would make the letter stronger or are required for it. */
  missing: { field: keyof LetterCompose; label: string; required: boolean }[];
  /** CV facts the letter used — shown as "Pulled from your CV". */
  used: string[];
};

/* ------------------------------------------------------------- language */

const list = (items: string[]) => {
  const xs = items.filter(filled);
  if (xs.length <= 1) return xs[0] ?? '';
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
};
const article = (phrase: string) => {
  const w = phrase.trim().split(/\s+/)[0] ?? '';
  if (/^(MSc|MA|MEng|MPhil|MBA|MPH|MS|MRes|LLB|LLM|MD|MFA|ACCA|FCA|RN|HR)\b/.test(w)) return 'an';
  if (/^(BSc|BA|BEng|BBA|BCom|PhD|DBA)\b/.test(w)) return 'a';
  if (/^[A-Z]{2,}\b/.test(w)) return /^[AEFHILMNORSX]/.test(w) ? 'an' : 'a';
  if (/^(hour|honou?r|honest|heir)/i.test(w)) return 'an';
  if (/^(uni|use|usu|eu|one|ure)/i.test(w)) return 'a';
  return /^[aeiou]/i.test(w) ? 'an' : 'a';
};
const withArticle = (phrase: string) => `${article(phrase)} ${phrase}`;
const sentence = (s: string) => {
  const t = s.trim();
  if (!t) return '';
  const cap = t[0]!.toUpperCase() + t.slice(1);
  return /[.!?]$/.test(cap) ? cap : `${cap}.`;
};
const keepCase = (word: string) => /^[A-Z0-9]{2,}/.test(word) || /^[A-Z][a-z]*[A-Z]/.test(word);
/** "Built a dashboard." → "built a dashboard" (keeps acronyms and proper nouns). */
const clause = (s: string) => {
  const t = s.trim().replace(/^[•\-–*]\s*/, '').replace(/[.;]\s*$/, '').replace(/;\s+/g, ' and ');
  if (!t) return t;
  const first = t.split(/\s+/)[0]!;
  return keepCase(first) ? t : t[0]!.toLowerCase() + t.slice(1);
};
const startsWithVerb = (s: string) => {
  const w = s.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? '';
  return ACTION_VERB_SET.has(w) || /ed$/.test(w) || /^(lead|manage|build|create|develop|drive|own|run|design|deliver|oversee|coordinate|mentor|teach|support|help|write|sell|grow|care|treat|plan)s?$/.test(w);
};
const iDid = (s: string) => (startsWithVerb(s) ? `I ${clause(s)}` : `${clause(s).replace(/^./, (c) => c.toUpperCase())}`);
const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

/* ---------------------------------------------------------------- facts */

type Achievement = { text: string; role: CvExperience };

function factsFrom(cv: CvData | null, project: Project | null, c: LetterCompose) {
  const p = cv?.personal;
  const roles = (cv?.experience ?? []).filter((x) => filled(x.title) || filled(x.employer));
  const current = roles.find((x) => x.current) ?? roles[0];
  const jd = project?.jobDescription ?? '';
  const jdKeywords = extractKeywords(jd, 24);
  const cvText = cv ? cvToPlainText(cv) : '';
  const roleTitle = (project?.targetRole ?? '').toLowerCase();
  // Show keywords as the job ad writes them ("SQL", "A/B testing"), and skip the job title itself.
  const casing = (k: string) => {
    const m = jd.match(new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'));
    return m ? m[0] : k;
  };
  const matched = jdKeywords.length ? matchKeywords(cvText, jdKeywords).matched.filter((k) => !roleTitle.includes(k)).map(casing) : [];
  const starts = roles.map((x) => x.startDate).filter(filled).sort();
  const months = starts[0] ? monthsBetween(starts[0]) : null;
  const years = months && months >= 12 ? Math.floor(months / 12) : 0;
  const jdWords = new Set(jdKeywords.flatMap((k) => k.split(/[\s/]+/)));

  // Rank achievements: numbers, overlap with the job ad, recency.
  const achievements: Achievement[] = roles
    .flatMap((role, ri) =>
      role.bullets.filter(filled).map((text, bi) => {
        const lower = text.toLowerCase();
        let score = (QUANTIFIED.test(text) ? 4 : 0) + Math.max(0, 3 - ri) - bi * 0.2;
        for (const w of jdWords) if (w.length > 2 && lower.includes(w)) score += 1.5;
        return { text, role, score };
      }),
    )
    .sort((a, b) => b.score - a.score)
    .map(({ text, role }) => ({ text, role }));

  const allSkills = (cv?.skills ?? []).flatMap((g) => g.items.map((i) => i.name)).filter(filled);
  const skills = [...allSkills].sort((a, b) => Number(matched.some((m) => m.includes(b.toLowerCase()) || b.toLowerCase().includes(m))) - Number(matched.some((m) => m.includes(a.toLowerCase()) || a.toLowerCase().includes(m))));
  const edu = (cv?.education ?? []).filter((e) => filled(e.degree) || filled(e.institution));
  const degree = edu[0];
  const specialism = skills.slice(0, 2);

  return {
    name: (p && fullName(p)) || '',
    headline: p?.headline || current?.title || '',
    city: p?.city ?? '',
    workAuth: p?.workAuthorization ?? '',
    role: project?.targetRole || p?.headline || '',
    company: project?.company || '',
    program: c.program || project?.targetRole || '',
    region: project?.region ?? 'international',
    jd,
    jdKeywords: jdKeywords.filter((k) => !roleTitle.includes(k)).map(casing),
    matched,
    years,
    current,
    roles,
    achievements,
    skills,
    specialism,
    degree,
    edu,
    projects: (cv?.projects ?? []).filter((x) => filled(x.name)),
    certs: (cv?.certifications ?? []).filter((x) => filled(x.name)),
    languages: (cv?.languages ?? []).filter((l) => filled(l.name)),
    volunteering: (cv?.volunteering ?? []).filter((v) => filled(v.role) || filled(v.organization)),
    awards: (cv?.awards ?? []).filter((a) => filled(a.title)),
    publications: (cv?.publications ?? []).filter((x) => filled(x.title)),
    summary: cv?.summary ?? '',
  };
}
type Facts = ReturnType<typeof factsFrom>;

const N = { short: 1, standard: 2, detailed: 3 } as const;

/* ------------------------------------------------------------ sentences */

const degreePhrase = (f: Facts) => (f.degree ? `${[f.degree.degree, f.degree.field].filter(filled).join(' in ')}${f.degree.institution ? ` from ${f.degree.institution}` : ''}` : '');
const yearsPhrase = (f: Facts) => (f.years ? `${f.years} year${f.years > 1 ? 's' : ''} of experience` : 'hands-on experience');
const roleAt = (r: CvExperience) => `${r.title}${r.employer ? ` at ${r.employer}` : ''}`;

function achievementSentences(f: Facts, n: number, from?: CvExperience, skip?: string): string[] {
  const pool = (from ? f.achievements.filter((a) => a.role === from) : f.achievements).filter((a) => a.text !== skip);
  return pool.slice(0, n).map((a, i) => sentence(i === 0 ? iDid(a.text) : startsWithVerb(a.text) ? `I also ${clause(a.text)}` : clause(a.text)));
}

function skillsSentence(f: Facts, c: LetterCompose, academic = false) {
  if (!c.include.skills) return '';
  if (f.matched.length >= 2 && !academic) {
    const m = f.matched.slice(0, 4);
    return sentence(`Your requirements for ${list(m)} match my experience closely — ${c.tone === 'warm' ? 'they are the tools I enjoy working with every day' : 'I use them in my day-to-day work'}`);
  }
  if (f.skills.length) return sentence(`My core skills include ${list(f.skills.slice(0, c.length === 'short' ? 4 : 6))}`);
  return '';
}

const certPhrase = (f: Facts) =>
  f.certs.length === 1
    ? `the ${f.certs[0]!.name}${/certif/i.test(f.certs[0]!.name) ? '' : ' certification'}`
    : `${f.certs.length === 2 ? 'two' : f.certs.length === 3 ? 'three' : f.certs.length} professional certifications (${list(f.certs.slice(0, 3).map((x) => x.name))})`;

function credentialsSentence(f: Facts, c: LetterCompose) {
  const parts: string[] = [];
  if (c.include.education && f.degree) parts.push(`${withArticle(degreePhrase(f))}${f.degree.grade ? ` (${f.degree.grade})` : ''}`);
  if (c.include.certifications && f.certs.length) parts.push(certPhrase(f));
  if (!parts.length) return '';
  return sentence(`I hold ${list(parts)}`);
}

function languagesSentence(f: Facts, c: LetterCompose, europass = false) {
  if (!c.include.languages || f.languages.length < 2) return '';
  const describe = (l: Facts['languages'][number]) => {
    if (l.native) return `${l.name} (native)`;
    const cefr = [l.listening, l.reading, l.spokenInteraction, l.spokenProduction, l.writing].filter(Boolean).sort().pop();
    return `${l.name}${europass && cefr ? ` (${cefr})` : l.proficiency ? ` (${l.proficiency.toLowerCase()})` : ''}`;
  };
  return sentence(`I speak ${list(f.languages.map(describe))}`);
}

function projectSentence(f: Facts, c: LetterCompose) {
  if (!c.include.projects || !f.projects.length) return '';
  const pr = f.projects[0]!;
  const d = pr.description ? clause(pr.description).replace(/;\s+/g, ', ') : '';
  const desc = !d ? '' : startsWithVerb(pr.description) ? `, for which I ${d}` : ` — ${/^(a|an|the)\b/i.test(d) ? d : withArticle(d)}`;
  return sentence(`One project I am particularly proud of is ${pr.name}${pr.tech ? ` (${pr.tech})` : ''}${desc}`);
}

function volunteeringSentence(f: Facts, c: LetterCompose) {
  if (!c.include.volunteering || !f.volunteering.length) return '';
  const v = f.volunteering[0]!;
  const base = `Outside work, I ${v.current ? 'volunteer' : 'volunteered'} as ${withArticle(v.role || 'volunteer')}${v.organization ? ` with ${v.organization}` : ''}`;
  return sentence(v.description && startsWithVerb(v.description) ? `${base}, where I ${clause(v.description)}` : base);
}

function awardsSentence(f: Facts, c: LetterCompose) {
  if (!c.include.awards || !f.awards.length) return '';
  const a = f.awards[0]!;
  return sentence(`My work was recognised with the ${a.title}${a.issuer ? ` from ${a.issuer}` : ''}${a.date ? ` in ${formatYm(a.date, 'YYYY')}` : ''}`);
}

const workAuthSentence = (w: string) => sentence(/^(i|my)\b/i.test(w) ? w : /^(eligible|authori[sz]ed|entitled|able)\b/i.test(w) ? `I am ${w[0]!.toLowerCase()}${w.slice(1)}` : `I am ${withArticle(w.replace(/^(an?|the)\s+/i, ''))}`);

const whySentence = (f: Facts, c: LetterCompose, target: string, academic = false) => {
  const why = c.why.trim();
  if (why) {
    if (/^[a-z]/.test(why) && !/^(i|my)\b/i.test(why)) return sentence(`What draws me to ${target} is ${why.replace(/\.$/, '')}`);
    return sentence(why);
  }
  if (academic) return sentence(`${target.replace(/^the /, 'The ')} stands out to me because it builds directly on my background in ${f.degree?.field || list(f.specialism) || 'my field'} and will prepare me for the next stage of my career`);
  if (f.jdKeywords.length >= 2) return sentence(`I am especially drawn to this role because of its focus on ${list(f.jdKeywords.slice(0, 2))}, which is exactly where I have delivered my strongest results`);
  return sentence(`I am keen to bring this experience to ${target} and to contribute from day one`);
};

const goalsSentence = (f: Facts, c: LetterCompose) => {
  const g = c.goals.trim();
  if (g) return /^[a-z]/.test(g) && !/^(i|my)\b/i.test(g) ? sentence(`After completing the programme, I plan to ${g.replace(/^to\s+/i, '').replace(/\.$/, '')}`) : sentence(g);
  return f.role ? sentence(`My goal is to build my career as ${withArticle(f.role)}, applying what I learn to real problems`) : '';
};

const closingParagraph = (f: Facts, c: LetterCompose, kind: string) => {
  const target = f.company || (kind === 'cover' ? 'your team' : 'your programme');
  if (kind !== 'cover') {
    return c.tone === 'warm'
      ? `Thank you for taking the time to read my application. I would be truly grateful for the chance to join ${target}, and I would be glad to share anything further that would help.`
      : `Thank you for considering my application. I am confident that I would make the most of this opportunity, and I would be glad to provide any further information you may need.`;
  }
  if (c.tone === 'formal') return 'Thank you for considering my application. I would welcome the opportunity to discuss my suitability for the role at an interview, and I am available at your convenience.';
  if (c.tone === 'warm') return `Thank you so much for reading my application. I would love the chance to talk about how I could help ${target}, and I hope to hear from you soon.`;
  return `I would welcome the opportunity to discuss how I can contribute to ${target}. Thank you for your time and consideration.`;
};

/* ------------------------------------------------------------ cover */

type Flavor = 'standard' | 'graduate' | 'career-change' | 'executive' | 'referral' | 'prospecting' | 'newcomer';
const flavorOf = (id: string): Flavor =>
  id === 'cover-graduate' || id === 'cover-internship' ? 'graduate' : id === 'cover-career-change' ? 'career-change' : id === 'cover-executive' ? 'executive' : id === 'cover-referral' ? 'referral' : id === 'cover-prospecting' ? 'prospecting' : id === 'cover-canada-newcomer' ? 'newcomer' : 'standard';

function composeCover(f: Facts, c: LetterCompose, t: LetterTemplate): ComposedBlock[] {
  const flavor = flavorOf(t.id);
  const role = f.role || 'this role';
  const company = f.company || 'your organisation';
  const n = N[c.length];
  const blocks: ComposedBlock[] = [];
  const who = f.headline ? `${withArticle(f.headline)}${f.years ? ` with ${yearsPhrase(f)}` : ''}${f.specialism.length ? ` in ${list(f.specialism)}` : ''}` : '';
  const hook = c.include.achievements && f.achievements[0] ? ` Most recently, ${iDid(f.achievements[0].text)}.` : '';

  // Opening
  let opening: string;
  if (flavor === 'referral')
    opening = `${c.referrer.trim() || '[Referrer name]'} suggested that I get in touch with you about the ${role} position at ${company}. ${who ? `As ${who}, I` : 'I'} believe I can make an immediate contribution to your team.`;
  else if (flavor === 'prospecting')
    opening = `I have followed ${company}'s work with great interest, and I am writing to ask whether you have, or expect to have, an opening for ${withArticle(role)}.${who ? ` I am ${who}.` : ''}`;
  else if (flavor === 'graduate')
    opening = `As ${f.degree ? `${f.degree.current ? 'a final-year student completing' : 'a recent graduate with'} ${withArticle(degreePhrase(f))}` : 'a motivated graduate'}, I am excited to apply for the ${role} position at ${company}.${f.skills.length ? ` My studies and practical experience have given me a strong grounding in ${list(f.skills.slice(0, 2))}.` : ''}`;
  else if (flavor === 'career-change')
    opening = `After ${f.years ? `${f.years} years` : 'several years'} as ${withArticle(f.current?.title || f.headline || 'professional')}, I am moving into ${role.toLowerCase().startsWith('a ') ? role : `the field of ${role}`}, and the position at ${company} is exactly where my background adds unusual value.`;
  else if (flavor === 'newcomer')
    opening = `I am writing to apply for the ${role} position at ${company}. ${f.workAuth ? `I am a ${f.workAuth.replace(/^(an?|the)\s+/i, '')}` : 'I am legally entitled to work in Canada'}${f.city ? `, based in ${f.city},` : ''} and available to start immediately.`;
  else {
    const open =
      c.tone === 'formal' ? `I am writing to apply for the position of ${role} at ${company}.` : c.tone === 'warm' ? `I was delighted to see the ${role} opening at ${company}, and I would love to bring my experience to your team.` : `I am excited to apply for the ${role} position at ${company}.`;
    opening = `${open}${who ? ` I am ${who}.` : ''}${flavor === 'executive' ? '' : hook}`;
  }
  blocks.push({ key: 'opening', heading: '', body: opening.replace(/\s+/g, ' ').trim() });

  // Main experience
  if (flavor === 'graduate') {
    const parts = [
      f.degree && c.include.education ? sentence(`At ${f.degree.institution || 'university'}, I studied ${f.degree.field || f.degree.degree}${f.degree.grade ? `, achieving ${f.degree.grade}` : ''}`) : '',
      f.degree?.bullets.filter(filled).length ? sentence(iDid(f.degree.bullets.filter(filled)[0]!)) : '',
      projectSentence(f, c),
      f.current ? sentence(`As ${roleAt(f.current)}, ${iDid(f.achievements.find((a) => a.role === f.current)?.text ?? `I gained practical experience in ${list(f.skills.slice(0, 2)) || 'the field'}`)}`) : '',
    ];
    blocks.push({ key: 'experience', heading: '', body: parts.filter(filled).join(' ') });
  } else if (f.current) {
    const lead = flavor === 'career-change' ? `My previous career gave me strengths that transfer directly to this role. As ${roleAt(f.current)},` : f.current.current ? `In my current role as ${roleAt(f.current)},` : `As ${roleAt(f.current)},`;
    const hookText = flavor === 'standard' && c.include.achievements ? f.achievements[0]?.text : undefined;
    const ach = c.include.achievements ? achievementSentences(f, n + (flavor === 'executive' ? 1 : 0), f.current, hookText) : [];
    const body = ach.length ? `${lead} ${ach[0]!.replace(/^I /, 'I ')} ${ach.slice(1).join(' ')}` : `${lead} I ${f.current.current ? 'am responsible for' : 'was responsible for'} ${f.current.description ? clause(f.current.description) : `work across ${list(f.skills.slice(0, 3)) || 'the team'}`}.`;
    blocks.push({ key: 'experience', heading: '', body: body.replace(/\s+/g, ' ').trim() });
  }

  // Earlier roles + skills + credentials
  const earlier = c.include.earlierRoles && c.length !== 'short' ? f.roles.filter((r) => r !== f.current).slice(0, c.length === 'detailed' ? 2 : 1) : [];
  const earlierSentences = earlier
    .map((r) => {
      const a = f.achievements.find((x) => x.role === r);
      return a ? sentence(`Before that, as ${roleAt(r)}, ${startsWithVerb(a.text) ? `I ${clause(a.text)}` : clause(a.text)}`) : '';
    })
    .filter(filled);
  const middle = [
    ...earlierSentences,
    skillsSentence(f, c),
    flavor === 'graduate' ? '' : credentialsSentence(f, c),
    flavor === 'newcomer' ? sentence(`My international experience has given me adaptability and a global perspective, and I have been building my understanding of the Canadian workplace${f.volunteering.length ? ` through volunteering with ${f.volunteering[0]!.organization}` : ''}`) : '',
    c.length === 'detailed' && flavor !== 'graduate' ? projectSentence(f, c) : '',
    c.length === 'detailed' ? languagesSentence(f, c) : '',
  ].filter(filled);
  if (middle.length) blocks.push({ key: 'skills', heading: '', body: middle.join(' ') });

  // Why + extras
  const why = [whySentence(f, c, company), c.length !== 'short' && flavor !== 'newcomer' ? volunteeringSentence(f, c) : '', c.length === 'detailed' ? awardsSentence(f, c) : '', c.story.trim() ? sentence(c.story) : ''].filter(filled);
  blocks.push({ key: 'why', heading: '', body: why.join(' ') });
  blocks.push({ key: 'closing', heading: '', body: closingParagraph(f, c, 'cover') });
  return blocks.filter((b) => filled(b.body));
}

/* ------------------------------------------------------- motivation */

function composeMotivation(f: Facts, c: LetterCompose, t: LetterTemplate): ComposedBlock[] {
  const n = N[c.length];
  const uni = f.company || 'your institution';
  const program = f.program || 'the programme';
  const isJob = t.id === 'motivation-eu-job' || t.id === 'motivation-ausbildung';
  const blocks: ComposedBlock[] = [];
  if (isJob) {
    blocks.push({
      key: 'opening',
      heading: '',
      body: `I would like to apply for the position of ${f.role || '[position]'} at ${uni}. ${f.headline ? `As ${withArticle(f.headline)}${f.years ? ` with ${yearsPhrase(f)}` : ''}, I` : 'I'} am highly motivated to contribute to your organisation.`,
    });
  } else {
    const open =
      t.id === 'motivation-scholarship'
        ? `I am honoured to apply for this scholarship to pursue the ${program} at ${uni}.`
        : t.id === 'motivation-erasmus'
          ? `I would like to spend an exchange period at ${uni} as part of my studies${f.degree ? ` in ${f.degree.field || f.degree.degree}` : ''}.`
          : t.id === 'motivation-phd'
            ? `I am writing to apply for the PhD position${c.program ? ` in ${c.program}` : ''} at ${uni}.`
            : t.id === 'motivation-volunteer'
              ? `I am applying to join ${program} at ${uni} because I want to put my skills to work for a cause I care about.`
              : `I am applying for the ${program} at ${uni}, a programme that aligns closely with my academic background and career goals.`;
    blocks.push({ key: 'opening', heading: '', body: `${open}${c.story.trim() ? ` ${sentence(c.story)}` : ''}` });
  }

  // Academic background
  if (c.include.education && f.degree && !isJob) {
    const bullets = f.degree.bullets.filter(filled);
    blocks.push({
      key: 'academic',
      heading: '',
      body: [
        sentence(`I ${f.degree.current ? 'am completing' : 'hold'} ${withArticle(degreePhrase(f))}${f.degree.grade ? ` (${f.degree.current ? 'current grade: ' : ''}${f.degree.grade})` : ''}`),
        ...bullets.slice(0, n).map((b) => sentence(startsWithVerb(b) ? `During my studies, I ${clause(b)}` : `My studies included ${clause(b)}`)),
        f.edu.length > 1 ? sentence(`Before that, I completed ${withArticle([f.edu[1]!.degree, f.edu[1]!.field].filter(filled).join(' in '))}${f.edu[1]!.institution ? ` at ${f.edu[1]!.institution}` : ''}`) : '',
      ]
        .filter(filled)
        .join(' '),
    });
  }

  // Experience / research
  const expParts = [
    f.current ? sentence(`${f.current.current ? 'In my current role as' : 'Most recently, as'} ${roleAt(f.current)}, ${c.include.achievements && f.achievements[0] ? (startsWithVerb(f.achievements[0].text) ? `I ${clause(f.achievements[0].text)}` : clause(f.achievements[0].text)) : `I developed my skills in ${list(f.skills.slice(0, 3))}`}`) : '',
    ...(c.include.achievements ? achievementSentences(f, n, undefined, f.achievements[0]?.text).slice(0, Math.max(0, n - 1)) : []),
    t.id === 'motivation-phd' && f.publications.length ? sentence(`My research has been published as “${f.publications[0]!.title}”${f.publications[0]!.publisher ? ` in ${f.publications[0]!.publisher}` : ''}`) : '',
    projectSentence(f, c),
    skillsSentence(f, c, !isJob),
    isJob ? credentialsSentence(f, c) : '',
  ].filter(filled);
  if (expParts.length) blocks.push({ key: 'experience', heading: '', body: expParts.join(' ') });

  // Leadership / languages
  const extra = [t.id === 'motivation-scholarship' || c.length === 'detailed' ? volunteeringSentence(f, c) : '', t.id === 'motivation-scholarship' ? awardsSentence(f, c) : '', languagesSentence(f, c, true), isJob && f.workAuth ? workAuthSentence(f.workAuth) : ''].filter(filled);
  if (extra.length) blocks.push({ key: 'extra', heading: '', body: extra.join(' ') });

  // Why + goals
  blocks.push({ key: 'why', heading: '', body: [whySentence(f, c, isJob ? uni : `the ${program} at ${uni}`, !isJob), isJob ? '' : goalsSentence(f, c)].filter(filled).join(' ') });
  blocks.push({ key: 'closing', heading: '', body: closingParagraph(f, c, 'motivation') });
  return blocks.filter((b) => filled(b.body));
}

/* ----------------------------------------------------------------- SOP */

function composeSop(f: Facts, c: LetterCompose, t: LetterTemplate): { blocks: ComposedBlock[]; missing: Composed['missing'] } {
  const n = N[c.length];
  const uni = f.company || 'your university';
  const program = f.program || 'the programme';
  const field = f.degree?.field || f.specialism[0] || 'my field';
  const missing: Composed['missing'] = [];
  // Each achievement is told once: an intro that uses the top one hands the rest to later sections.
  const introUsesTop = !c.story.trim() && Boolean(f.achievements[0]) && t.blocks.some((b) => /intro|motivation|who i am|why data science/i.test(b.heading ?? ''));
  const rest = introUsesTop ? f.achievements.slice(1) : f.achievements;
  const g = { ...f, achievements: rest };
  const blocks = t.blocks.map((tb, i): ComposedBlock => {
    const h = tb.heading ?? `Section ${i + 1}`;
    const key = `s${i}-${h.toLowerCase().replace(/[^a-z]+/g, '-')}`;
    let body: string;
    if (/purpose of study/i.test(h)) {
      body = `I am applying for a study permit to complete the ${program} at ${uni}.`;
    } else if (/intro|motivation|who i am|why data science/i.test(h)) {
      body = c.story.trim()
        ? `${sentence(c.story)} This is why I am applying to the ${program} at ${uni}.`
        : `My interest in ${field} grew${f.degree ? ` during my studies at ${f.degree.institution || 'university'}` : ''}${f.achievements[0] ? ` and deepened through work in which ${iDid(f.achievements[0].text)}` : ''}. I now want to build the depth that the ${program} at ${uni} offers.`;
    } else if (/academic|quantitative|educational and professional|educational/i.test(h)) {
      body = [
        f.degree ? sentence(`I ${f.degree.current ? 'am completing' : 'earned'} ${withArticle(degreePhrase(f))}${f.degree.grade ? ` (${f.degree.grade})` : ''}`) : '',
        ...(f.degree?.bullets.filter(filled).slice(0, n).map((b) => sentence(startsWithVerb(b) ? `During my degree, I ${clause(b)}` : `My studies included ${clause(b)}`)) ?? []),
        /educational and professional/i.test(h) && f.current ? sentence(`I have since worked for ${f.years ? `${f.years} years` : 'several years'}, most recently as ${roleAt(f.current)}`) : '',
        c.include.certifications && f.certs.length ? sentence(`I have also earned ${certPhrase(f)}`) : '',
      ]
        .filter(filled)
        .join(' ');
    } else if (/research interest|research experience|proposed direction|fit with|technical and research/i.test(h)) {
      body = [
        c.why.trim() && /fit with/i.test(h) ? sentence(c.why) : '',
        f.publications.length ? sentence(`My work has been published as “${f.publications[0]!.title}”${f.publications[0]!.publisher ? ` in ${f.publications[0]!.publisher}` : ''}`) : '',
        projectSentence(f, c),
        ...(c.include.achievements ? achievementSentences(g, n) : []),
        !f.projects.length && !f.publications.length ? sentence(`My research interests centre on ${list(f.specialism) || field}`) : '',
      ]
        .filter(filled)
        .join(' ');
    } else if (/professional|applied|background|career progression|experience|leadership/i.test(h)) {
      body = f.current
        ? [sentence(`As ${roleAt(f.current)}${f.years ? `, part of ${f.years} years of experience` : ''}, ${c.include.achievements && g.achievements[0] ? (startsWithVerb(g.achievements[0].text) ? `I ${clause(g.achievements[0].text)}` : clause(g.achievements[0].text)) : `I worked across ${list(f.skills.slice(0, 3))}`}`), ...(c.include.achievements ? achievementSentences(g, n).slice(1) : []), skillsSentence(f, c, true)].filter(filled).join(' ')
        : [projectSentence(f, c), volunteeringSentence(f, c)].filter(filled).join(' ') || sentence(`I have developed practical skills in ${list(f.skills.slice(0, 4)) || field}`);
    } else if (/why this|why an mba|why this school|why canada/i.test(h)) {
      body = c.why.trim() ? sentence(c.why) : /canada/i.test(h) ? `The ${program} at ${uni} builds directly on my background in ${field}. Canada offers a world-class education system and a multicultural environment, and the programme's practical focus is not available in an equivalent form in my home country.` : `The ${program} at ${uni} offers the depth in ${field} that I need for the next stage of my career, and its combination of rigorous teaching and practical application suits the way I learn best.`;
      if (!c.why.trim()) missing.push({ field: 'why', label: `Why this programme / university (specific modules, faculty, labs)`, required: false });
    } else if (/goal|long-term|future|career plan/i.test(h)) {
      body = goalsSentence(f, c) || `After completing the ${program}, I plan to work in ${field}.`;
      if (!c.goals.trim()) missing.push({ field: 'goals', label: 'Your career goals after the programme', required: false });
    } else if (/financial|funding/i.test(h)) {
      body = c.funding.trim() ? sentence(c.funding) : '[How you will fund tuition and living costs — savings, sponsor, scholarship, GIC — with amounts.]';
      if (!c.funding.trim()) missing.push({ field: 'funding', label: 'Funding sources and amounts', required: true });
    } else if (/ties/i.test(h)) {
      body = c.ties.trim() ? sentence(c.ties) : '[Your ties to your home country — family, property, job offer — and your plan to return.]';
      if (!c.ties.trim()) missing.push({ field: 'ties', label: 'Ties to your home country', required: true });
    } else if (/conclusion|contribute|what i will/i.test(h)) {
      body = `${f.skills.length ? `I bring strengths in ${list(f.skills.slice(0, 3))}, ` : ''}a clear sense of purpose and the determination to make the most of every opportunity. I am confident that the ${program} at ${uni} is the right next step, and I would be proud to join its community.`;
      if (/visa|study plan/i.test(t.name)) body = `I will respect the conditions of my study permit and leave Canada at the end of my authorized stay. Thank you for considering my application.`;
    } else {
      body = achievementSentences(g, n).join(' ');
    }
    return { key, heading: h, body: body.replace(/\s+/g, ' ').trim() };
  });
  return { blocks: blocks.filter((b) => filled(b.body)), missing };
}

/* --------------------------------------------------------------- entry */

export function composeLetter(letter: LetterData, cv: CvData | null, project: Project | null): Composed {
  const c = letter.compose ?? defaultCompose();
  const t = letterTemplateById(letter.templateId) ?? letterTemplateById('cover-professional')!;
  const f = factsFrom(cv, project, c);
  const missing: Composed['missing'] = [];
  let blocks: ComposedBlock[];
  if (t.kind === 'sop') {
    const r = composeSop(f, c, t);
    blocks = r.blocks;
    missing.push(...r.missing);
  } else if (t.kind === 'motivation') blocks = composeMotivation(f, c, t);
  else blocks = composeCover(f, c, t);

  if (!cv) missing.unshift({ field: 'cvId', label: 'Link a CV — the letter is written from it', required: true });
  if (t.kind === 'cover' && !f.company) missing.push({ field: 'why', label: 'Add the company in Project details', required: false });
  if (t.id === 'cover-referral' && !c.referrer.trim()) missing.push({ field: 'referrer', label: 'Who referred you', required: true });
  if (t.kind === 'cover' && !c.why.trim()) missing.push({ field: 'why', label: 'Why this company (one line makes the letter personal)', required: false });
  if (t.kind === 'motivation' && !c.why.trim()) missing.push({ field: 'why', label: 'Why this programme / organisation', required: false });
  if (t.kind === 'motivation' && !c.goals.trim() && t.id !== 'motivation-eu-job') missing.push({ field: 'goals', label: 'Your goals after the programme', required: false });
  if (t.kind !== 'cover' && !c.program.trim() && !project?.targetRole) missing.push({ field: 'program', label: 'Programme / position name', required: true });

  const named = letter.recipient.name.trim();
  const academic = t.kind !== 'cover' && !/eu-job|ausbildung/.test(t.id);
  const templateSalutation = t.salutation !== undefined && !/\[/.test(t.salutation) ? t.salutation : undefined;
  const salutation = named ? `Dear ${named},` : templateSalutation !== undefined ? templateSalutation : t.kind === 'sop' ? '' : academic ? 'Dear Admissions Committee,' : 'Dear Hiring Manager,';
  if (!named && t.salutation && /\[/.test(t.salutation)) missing.push({ field: 'story', label: 'Recipient’s name (Your details & recipient) — e.g. the supervisor', required: false });
  const uk = f.region === 'uk' || f.region === 'europass' || f.region === 'australia';
  const closing = t.kind === 'sop' && !/study plan/i.test(t.name) ? '' : t.closing && !named ? t.closing : uk ? (named ? 'Yours sincerely,' : 'Yours faithfully,') : 'Sincerely,';
  const fromTemplate = t.subject
    ? fillPlaceholders(t.subject.replace('[Referrer name]', c.referrer.trim() || '[Referrer name]'), {
        role: f.role,
        company: f.company,
        name: f.name,
        program: f.program,
        targetUniversity: f.company,
        field: f.degree?.field ?? '',
      })
    : '';
  const subjectBase = fromTemplate && !/\[(?!Referrer)/.test(fromTemplate)
    ? fromTemplate
    : t.kind === 'cover'
      ? `Application for ${f.role || 'the advertised position'}${f.company ? ` — ${f.company}` : ''}`
      : t.kind === 'sop'
        ? `Statement of Purpose — ${f.program || 'Graduate Programme'}${f.company ? `, ${f.company}` : ''}`
        : `Motivation letter — ${f.program || f.role || 'Application'}${f.company ? `, ${f.company}` : ''}`;
  const subject = subjectBase;

  const used = [
    f.current && `Current role: ${roleAt(f.current)}`,
    f.achievements.length && `${Math.min(f.achievements.length, N[c.length] + 2)} top achievements (ranked by numbers & job-ad match)`,
    f.matched.length && `Job-ad keywords you match: ${f.matched.slice(0, 5).join(', ')}`,
    f.degree && `Education: ${degreePhrase(f)}`,
    f.certs.length && `${f.certs.length} certification(s)`,
    f.projects.length && `Project: ${f.projects[0]!.name}`,
    f.languages.length > 1 && `${f.languages.length} languages`,
    f.volunteering.length && `Volunteering: ${f.volunteering[0]!.organization}`,
  ].filter(Boolean) as string[];

  // Remove duplicate missing entries.
  const seen = new Set<string>();
  const uniq = missing.filter((m) => (seen.has(m.label) ? false : (seen.add(m.label), true)));
  return { subject, salutation, closing, blocks, showHeadings: t.kind === 'sop' || Boolean(t.showHeadings), missing: uniq, used };
}

/** Applies a composition to a letter, keeping blocks the user edited by hand. */
export function applyComposition(letter: LetterData, composed: Composed, cv: CvData | null): LetterData {
  const c = letter.compose ?? defaultCompose();
  const edited = new Set(c.edited);
  const byKey = new Map(letter.blocks.filter((b) => b.key).map((b) => [b.key!, b]));
  const blocks = composed.blocks.map((b) => {
    const prev = byKey.get(b.key);
    if (prev && edited.has(b.key)) return prev;
    return { id: prev?.id ?? `b-${b.key}`, key: b.key, heading: b.heading, body: b.body };
  });
  // Keep paragraphs the user added themselves (no key) at the end.
  for (const b of letter.blocks) if (!b.key && filled(b.body)) blocks.splice(blocks.length - 1, 0, b);
  const p = cv?.personal;
  const name = p ? fullName(p) : letter.sender.name;
  return {
    ...letter,
    subject: edited.has('subject') ? letter.subject : composed.subject,
    salutation: edited.has('salutation') ? letter.salutation : composed.salutation,
    closing: edited.has('closing') ? letter.closing : composed.closing,
    showHeadings: composed.showHeadings,
    blocks,
    signature: name || letter.signature,
    sender: p
      ? { name, headline: p.headline, email: p.email, phone: p.phone, city: [p.city, p.country].filter(filled).join(', '), linkedin: p.linkedin }
      : letter.sender,
  };
}

export const letterWords = (l: LetterData) => words(l.blocks.map((b) => b.body).join(' '));
