import type {
  CvData,
  CvDesignSettings,
  CvPersonal,
  CvLanguage,
  Region,
  SectionKey,
} from './types';
import { uid } from './utils';

/**
 * Every section a professional CV can contain, with when to use it. The
 * editor, the ATS checklist and the section guide all read from this list.
 */
export type SectionMeta = {
  key: Exclude<SectionKey, `custom:${string}`>;
  title: string;
  /** Section names ATS parsers recognise; the default title is always one of them. */
  atsTitles: string[];
  importance: 'essential' | 'recommended' | 'optional';
  guidance: string;
  /** Regions where the section is expected rather than optional. */
  expectedIn?: Region[];
};

export const SECTIONS: SectionMeta[] = [
  {
    key: 'summary',
    title: 'Professional Summary',
    atsTitles: ['Summary', 'Professional Summary', 'Profile', 'Career Objective'],
    importance: 'essential',
    guidance:
      '3–4 lines (40–90 words): who you are, years of experience, 2–3 specialisms with keywords from the job ad, and one headline achievement. No "I", no clichés.',
  },
  {
    key: 'experience',
    title: 'Work Experience',
    atsTitles: ['Experience', 'Work Experience', 'Professional Experience', 'Employment History'],
    importance: 'essential',
    guidance:
      'Reverse-chronological. Job title, employer, location, dates (Month YYYY). 3–6 bullets per role that start with an action verb and show a measurable result.',
  },
  {
    key: 'education',
    title: 'Education',
    atsTitles: ['Education', 'Education and Training', 'Academic Background'],
    importance: 'essential',
    guidance: 'Degree, field, institution, location, graduation date. Add GPA/class only if strong; recent graduates can add modules, thesis and honours.',
  },
  {
    key: 'skills',
    title: 'Skills',
    atsTitles: ['Skills', 'Core Skills', 'Technical Skills', 'Key Skills', 'Digital Skills'],
    importance: 'essential',
    guidance: '8–20 hard skills grouped by theme, using the exact wording from job ads (e.g. "Power BI", not "BI tools"). Keep soft skills for your bullets.',
  },
  {
    key: 'languages',
    title: 'Languages',
    atsTitles: ['Languages', 'Language Skills'],
    importance: 'recommended',
    guidance: 'Name and level. Use CEFR levels (A1–C2) for Europe and Canada; "Native", "Fluent", "Professional" elsewhere. Add IELTS/TEF/DELF scores.',
    expectedIn: ['europass', 'canada', 'gulf'],
  },
  {
    key: 'certifications',
    title: 'Certifications',
    atsTitles: ['Certifications', 'Licenses & Certifications', 'Licences'],
    importance: 'recommended',
    guidance: 'Name, issuing body and year. Put licences required for the job (CPA, PMP, RN, P.Eng.) near the top or in your headline too.',
  },
  {
    key: 'projects',
    title: 'Projects',
    atsTitles: ['Projects', 'Key Projects', 'Selected Projects'],
    importance: 'recommended',
    guidance: 'Essential for graduates, engineers and career changers. Name, your role, link, what it does and the result, plus tools used.',
  },
  {
    key: 'awards',
    title: 'Awards & Honours',
    atsTitles: ['Awards', 'Honors', 'Honours & Awards'],
    importance: 'optional',
    guidance: 'Award, awarding body, year and one line on why you won it.',
  },
  {
    key: 'publications',
    title: 'Publications',
    atsTitles: ['Publications', 'Research'],
    importance: 'optional',
    guidance: 'Expected on academic and research CVs. Use one citation style consistently (APA is common).',
    expectedIn: ['academic'],
  },
  {
    key: 'volunteering',
    title: 'Volunteer Experience',
    atsTitles: ['Volunteering', 'Volunteer Experience', 'Community Involvement'],
    importance: 'optional',
    guidance: 'Valued in Canada, the UK and Australia. Treat like a job: role, organisation, dates and impact.',
    expectedIn: ['canada'],
  },
  {
    key: 'courses',
    title: 'Courses & Training',
    atsTitles: ['Courses', 'Training', 'Professional Development'],
    importance: 'optional',
    guidance: 'Relevant short courses and bootcamps. Skip anything older than 10 years or unrelated to the role.',
  },
  {
    key: 'memberships',
    title: 'Professional Memberships',
    atsTitles: ['Memberships', 'Professional Affiliations', 'Professional Associations'],
    importance: 'optional',
    guidance: 'Professional bodies (IEEE, CIMA, Engineers Canada), with membership grade.',
  },
  {
    key: 'interests',
    title: 'Interests',
    atsTitles: ['Interests', 'Hobbies & Interests'],
    importance: 'optional',
    guidance: 'Only if they add something: leadership, teamwork, a talking point. Skip "reading, travelling".',
  },
  {
    key: 'references',
    title: 'References',
    atsTitles: ['References', 'Referees'],
    importance: 'optional',
    guidance: 'Common in Australia, the Gulf and South Asia. In the US, UK and Canada, leave them off and provide when asked.',
    expectedIn: ['australia', 'gulf'],
  },
];

export const sectionMeta = (key: SectionKey) => SECTIONS.find((s) => s.key === key);

export const DEFAULT_ORDER: SectionKey[] = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'languages',
  'awards',
  'publications',
  'volunteering',
  'courses',
  'memberships',
  'interests',
  'references',
];

/** Region presets: section order, what personal data is appropriate, and page targets. */
export const REGION_RULES: Record<
  Region,
  {
    order: SectionKey[];
    photo: 'expected' | 'optional' | 'avoid';
    personalData: 'expected' | 'optional' | 'avoid';
    maxPages: number;
    dateFormat: CvDesignSettings['dateFormat'];
    pageSize: CvDesignSettings['pageSize'];
    defaultDesign: string;
    notes: string[];
  }
> = {
  international: {
    order: DEFAULT_ORDER,
    photo: 'optional',
    personalData: 'avoid',
    maxPages: 2,
    dateFormat: 'MMM YYYY',
    pageSize: 'A4',
    defaultDesign: 'meridian-ocean',
    notes: ['Keep it to 1–2 pages.', 'Use a professional email and one phone number with country code.'],
  },
  us: {
    order: ['summary', 'experience', 'skills', 'education', 'projects', 'certifications', 'awards', 'volunteering', 'languages'],
    photo: 'avoid',
    personalData: 'avoid',
    maxPages: 1,
    dateFormat: 'MMM YYYY',
    pageSize: 'Letter',
    defaultDesign: 'ledger-graphite',
    notes: [
      'One page unless you have 10+ years of relevant experience.',
      'No photo, date of birth, marital status, nationality or full address — city and state only.',
      'Use US Letter paper size.',
    ],
  },
  uk: {
    order: ['summary', 'experience', 'education', 'skills', 'certifications', 'projects', 'languages', 'volunteering', 'interests'],
    photo: 'avoid',
    personalData: 'avoid',
    maxPages: 2,
    dateFormat: 'MMM YYYY',
    pageSize: 'A4',
    defaultDesign: 'meridian-navy',
    notes: ['Two pages is the norm.', 'No photo or date of birth (Equality Act 2010).', '"References available on request" is optional.'],
  },
  europass: {
    order: ['summary', 'experience', 'education', 'languages', 'skills', 'certifications', 'projects', 'publications', 'volunteering', 'awards', 'memberships', 'interests'],
    photo: 'optional',
    personalData: 'optional',
    maxPages: 3,
    dateFormat: 'MM/YYYY',
    pageSize: 'A4',
    defaultDesign: 'europass-classic-blue',
    notes: [
      'Follows the Europass structure: Work experience → Education and training → Language skills (CEFR self-assessment grid) → Digital skills.',
      'Date of birth, nationality and photo are optional — include them only where customary.',
      'Add the EQF level to qualifications where known.',
    ],
  },
  canada: {
    order: ['summary', 'skills', 'experience', 'education', 'certifications', 'languages', 'volunteering', 'projects', 'awards', 'memberships'],
    photo: 'avoid',
    personalData: 'avoid',
    maxPages: 2,
    dateFormat: 'MMM YYYY',
    pageSize: 'Letter',
    defaultDesign: 'maple-classic-red',
    notes: [
      'Two pages maximum; Letter paper size.',
      'Never include a photo, age, date of birth, marital status, religion or SIN.',
      'State work authorization if relevant ("Permanent Resident", "Open Work Permit").',
      'Canadian spelling (e.g. "organization", "centre") and bilingual skills (English/French) are a plus.',
      'Volunteer experience is highly valued.',
    ],
  },
  australia: {
    order: ['summary', 'skills', 'experience', 'education', 'certifications', 'projects', 'volunteering', 'references'],
    photo: 'avoid',
    personalData: 'avoid',
    maxPages: 3,
    dateFormat: 'MMM YYYY',
    pageSize: 'A4',
    defaultDesign: 'meridian-teal',
    notes: ['2–3 pages is normal.', 'Include two referees, or "Referees available on request".'],
  },
  gulf: {
    order: ['summary', 'experience', 'education', 'skills', 'certifications', 'languages', 'references'],
    photo: 'expected',
    personalData: 'expected',
    maxPages: 3,
    dateFormat: 'MMM YYYY',
    pageSize: 'A4',
    defaultDesign: 'atlas-emerald',
    notes: ['A professional photo, nationality and visa status are commonly expected.', 'Mention driving licence and notice period if relevant.'],
  },
  academic: {
    order: ['summary', 'education', 'experience', 'publications', 'projects', 'awards', 'courses', 'memberships', 'skills', 'languages', 'references'],
    photo: 'avoid',
    personalData: 'avoid',
    maxPages: 10,
    dateFormat: 'YYYY',
    pageSize: 'A4',
    defaultDesign: 'scholar-ink',
    notes: ['No page limit, but every entry must be relevant.', 'Lead with education and research; list publications in one citation style.'],
  },
};

export const emptyPersonal = (): CvPersonal => ({
  firstName: '',
  lastName: '',
  headline: '',
  email: '',
  phone: '',
  city: '',
  country: '',
  address: '',
  postalCode: '',
  linkedin: '',
  website: '',
  github: '',
  photo: '',
  dateOfBirth: '',
  nationality: '',
  drivingLicence: '',
  workAuthorization: '',
});

export const newExperience = () => ({
  id: uid('x'),
  title: '',
  employer: '',
  employmentType: '',
  city: '',
  country: '',
  startDate: '',
  endDate: '',
  current: false,
  description: '',
  bullets: [''],
});
export const newEducation = () => ({
  id: uid('e'),
  degree: '',
  field: '',
  institution: '',
  city: '',
  country: '',
  startDate: '',
  endDate: '',
  current: false,
  grade: '',
  eqfLevel: '',
  bullets: [],
});
export const newSkillGroup = (name = '') => ({ id: uid('s'), name, items: [] });
export const newLanguage = (): CvLanguage => ({
  id: uid('l'),
  name: '',
  native: false,
  proficiency: '',
  listening: '',
  reading: '',
  spokenInteraction: '',
  spokenProduction: '',
  writing: '',
  certificate: '',
});
export const newCertification = () => ({ id: uid('c'), name: '', issuer: '', date: '', expiry: '', credentialId: '', url: '' });
export const newProject = () => ({ id: uid('p'), name: '', role: '', url: '', startDate: '', endDate: '', description: '', tech: '' });
export const newAward = () => ({ id: uid('a'), title: '', issuer: '', date: '', description: '' });
export const newPublication = () => ({ id: uid('pu'), title: '', authors: '', publisher: '', date: '', url: '' });
export const newVolunteering = () => ({ id: uid('v'), role: '', organization: '', city: '', startDate: '', endDate: '', current: false, description: '' });
export const newCourse = () => ({ id: uid('co'), name: '', provider: '', date: '' });
export const newMembership = () => ({ id: uid('m'), name: '', role: '', startDate: '', endDate: '' });
export const newReference = () => ({ id: uid('r'), name: '', position: '', company: '', email: '', phone: '', relationship: '' });
export const newCustomSection = (heading = 'Additional Information') => ({
  id: uid('cs'),
  heading,
  entries: [{ id: uid('ce'), title: '', subtitle: '', date: '', description: '' }],
});

export function emptyCv(region: Region = 'international', designId?: string): CvData {
  const rules = REGION_RULES[region];
  return {
    personal: emptyPersonal(),
    summary: '',
    experience: [newExperience()],
    education: [newEducation()],
    skills: [newSkillGroup('Technical Skills'), newSkillGroup('Tools')],
    languages: [],
    certifications: [],
    projects: [],
    awards: [],
    publications: [],
    volunteering: [],
    courses: [],
    memberships: [],
    interests: [],
    references: [],
    referencesOnRequest: false,
    custom: [],
    sectionOrder: [...rules.order],
    hiddenSections: [],
    sectionTitles: {},
    design: {
      designId: designId ?? rules.defaultDesign,
      accent: '',
      font: '',
      fontScale: 1,
      spacing: 'normal',
      pageSize: rules.pageSize,
      showPhoto: rules.photo !== 'avoid',
      dateFormat: rules.dateFormat,
    },
  };
}

/** Fills missing fields of a stored CV (older versions, imports) from the empty model. */
export function normalizeCv(raw: Partial<CvData> | null | undefined): CvData {
  const base = emptyCv();
  const d = (raw ?? {}) as Partial<CvData>;
  const arr = <T,>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fallback);
  const order = arr<SectionKey>(d.sectionOrder, base.sectionOrder);
  // Make sure every built-in and custom section has a slot.
  const allKeys: SectionKey[] = [...DEFAULT_ORDER, ...arr<{ id: string }>(d.custom, []).map((c) => `custom:${c.id}` as SectionKey)];
  for (const k of allKeys) if (!order.includes(k)) order.push(k);
  return {
    ...base,
    ...d,
    personal: { ...base.personal, ...(d.personal ?? {}) },
    experience: arr(d.experience, []).map((x) => ({ ...newExperience(), ...(x as object) })),
    education: arr(d.education, []).map((x) => ({ ...newEducation(), ...(x as object) })),
    skills: arr(d.skills, []),
    languages: arr(d.languages, []).map((x) => ({ ...newLanguage(), ...(x as object) })),
    certifications: arr(d.certifications, []),
    projects: arr(d.projects, []),
    awards: arr(d.awards, []),
    publications: arr(d.publications, []),
    volunteering: arr(d.volunteering, []),
    courses: arr(d.courses, []),
    memberships: arr(d.memberships, []),
    interests: arr(d.interests, []),
    references: arr(d.references, []),
    custom: arr(d.custom, []),
    sectionOrder: order.filter((k) => !k.startsWith('custom:') || arr<{ id: string }>(d.custom, []).some((c) => `custom:${c.id}` === k)),
    hiddenSections: arr(d.hiddenSections, []),
    sectionTitles: d.sectionTitles ?? {},
    design: { ...base.design, ...(d.design ?? {}) },
  };
}

export const fullName = (p: CvPersonal) => [p.firstName, p.lastName].filter(Boolean).join(' ').trim();

export function sectionTitle(cv: CvData, key: SectionKey): string {
  if (cv.sectionTitles[key]) return cv.sectionTitles[key]!;
  if (key.startsWith('custom:')) return cv.custom.find((c) => `custom:${c.id}` === key)?.heading || 'Additional Information';
  if (cv.design.designId.startsWith('europass')) {
    const eu: Partial<Record<string, string>> = {
      summary: 'About Me',
      experience: 'Work Experience',
      education: 'Education and Training',
      languages: 'Language Skills',
      skills: 'Digital Skills',
      volunteering: 'Volunteering',
      certifications: 'Certificates',
    };
    if (eu[key]) return eu[key]!;
  }
  return sectionMeta(key)?.title ?? key;
}

/** True if a section has anything to print. */
export function sectionHasContent(cv: CvData, key: SectionKey): boolean {
  const any = (xs: object[]) => xs.some((x) => Object.entries(x).some(([k, v]) => k !== 'id' && k !== 'current' && k !== 'native' && (typeof v === 'string' ? v.trim() : Array.isArray(v) ? v.some((i) => (typeof i === 'string' ? i.trim() : i && (i as { name?: string }).name)) : false)));
  switch (key) {
    case 'summary':
      return Boolean(cv.summary.trim());
    case 'skills':
      return cv.skills.some((g) => g.items.some((i) => i.name.trim()));
    case 'interests':
      return cv.interests.some((i) => i.trim());
    case 'references':
      return cv.referencesOnRequest || any(cv.references);
    default:
      if (key.startsWith('custom:')) {
        const c = cv.custom.find((s) => `custom:${s.id}` === key);
        return Boolean(c && any(c.entries));
      }
      return any((cv as unknown as Record<string, object[]>)[key] ?? []);
  }
}

export function visibleSections(cv: CvData): SectionKey[] {
  return cv.sectionOrder.filter((k) => !cv.hiddenSections.includes(k) && sectionHasContent(cv, k));
}

/** A complete, realistic CV used for template thumbnails and the "start from sample" option. */
export function sampleCv(region: Region = 'international'): CvData {
  const cv = emptyCv(region);
  cv.personal = {
    ...cv.personal,
    firstName: 'Amelia',
    lastName: 'Perera',
    headline: 'Senior Data Analyst',
    email: 'amelia.perera@email.com',
    phone: '+1 416 555 0182',
    city: 'Toronto',
    country: 'Canada',
    linkedin: 'linkedin.com/in/ameliaperera',
    website: 'ameliaperera.dev',
    github: 'github.com/ameliap',
    nationality: region === 'europass' || region === 'gulf' ? 'Sri Lankan' : '',
    workAuthorization: region === 'canada' ? 'Canadian Permanent Resident' : '',
  };
  cv.summary =
    'Data analyst with 7 years of experience turning messy operational data into decisions for retail and fintech teams. Specialist in SQL, Python and Power BI, with a track record of dashboards that leadership actually uses — most recently cutting reporting time by 60% and surfacing $2.4M in recoverable revenue.';
  cv.experience = [
    {
      id: 'x1',
      title: 'Senior Data Analyst',
      employer: 'Northwind Financial',
      employmentType: 'Full-time',
      city: 'Toronto',
      country: 'Canada',
      startDate: '2021-03',
      endDate: '',
      current: true,
      description: '',
      bullets: [
        'Built a self-serve Power BI reporting suite used by 140+ staff, cutting weekly reporting time by 60%.',
        'Identified $2.4M in recoverable revenue by modelling payment-failure patterns in SQL and Python.',
        'Led migration of 35 legacy Excel reports to dbt and Snowflake, improving data freshness from weekly to hourly.',
        'Mentored 4 junior analysts; introduced code review and a shared metrics glossary.',
      ],
    },
    {
      id: 'x2',
      title: 'Data Analyst',
      employer: 'Lumen Retail Group',
      employmentType: 'Full-time',
      city: 'Colombo',
      country: 'Sri Lanka',
      startDate: '2018-01',
      endDate: '2021-02',
      current: false,
      description: '',
      bullets: [
        'Designed a demand-forecasting model that reduced stock-outs by 18% across 42 stores.',
        'Automated daily sales reporting with Python, saving 12 analyst hours per week.',
        'Ran A/B tests on loyalty offers that lifted repeat purchases by 9%.',
      ],
    },
  ];
  cv.education = [
    {
      id: 'e1',
      degree: 'BSc (Hons)',
      field: 'Statistics and Computer Science',
      institution: 'University of Colombo',
      city: 'Colombo',
      country: 'Sri Lanka',
      startDate: '2013-09',
      endDate: '2017-07',
      current: false,
      grade: 'First Class',
      eqfLevel: region === 'europass' ? '6' : '',
      bullets: [],
    },
  ];
  cv.skills = [
    {
      id: 's1',
      name: 'Analytics',
      items: [
        { name: 'SQL', level: 5 },
        { name: 'Python (pandas)', level: 5 },
        { name: 'Statistics', level: 4 },
        { name: 'A/B Testing', level: 4 },
      ],
    },
    {
      id: 's2',
      name: 'Tools',
      items: [
        { name: 'Power BI', level: 5 },
        { name: 'Snowflake', level: 4 },
        { name: 'dbt', level: 4 },
        { name: 'Excel', level: 5 },
      ],
    },
  ];
  cv.languages = [
    { ...newLanguage(), id: 'l1', name: 'English', native: false, proficiency: 'Fluent', listening: 'C2', reading: 'C2', spokenInteraction: 'C1', spokenProduction: 'C1', writing: 'C1', certificate: 'IELTS 8.0' },
    { ...newLanguage(), id: 'l2', name: 'Sinhala', native: true, proficiency: 'Native' },
    { ...newLanguage(), id: 'l3', name: 'French', proficiency: 'Intermediate', listening: 'B1', reading: 'B2', spokenInteraction: 'B1', spokenProduction: 'A2', writing: 'B1' },
  ];
  cv.certifications = [
    { id: 'c1', name: 'Microsoft Certified: Power BI Data Analyst Associate', issuer: 'Microsoft', date: '2022-05', expiry: '', credentialId: '', url: '' },
    { id: 'c2', name: 'SnowPro Core Certification', issuer: 'Snowflake', date: '2023-02', expiry: '', credentialId: '', url: '' },
  ];
  cv.projects = [
    {
      id: 'p1',
      name: 'Open Transit Dashboard',
      role: 'Creator',
      url: 'github.com/ameliap/transit',
      startDate: '2023-01',
      endDate: '',
      description: 'Public dashboard of TTC delay data; featured in a local newsletter with 8k monthly visitors.',
      tech: 'Python, Streamlit, PostgreSQL',
    },
  ];
  cv.volunteering = [
    { id: 'v1', role: 'Data Mentor', organization: 'Women in Data Toronto', city: 'Toronto', startDate: '2022-01', endDate: '', current: true, description: 'Mentor 6 early-career analysts per cohort.' },
  ];
  cv.interests = ['Open data', 'Long-distance running', 'Chess'];
  return cv;
}
