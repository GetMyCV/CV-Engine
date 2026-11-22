/**
 * The data model shared by every part of CV Engine.
 *
 * A user owns Projects (one per job target, e.g. "Data Analyst — Toronto").
 * A project holds Documents: CVs, cover letters, motivation letters, SOPs and
 * LinkedIn makeover kits. Every document stores plain JSON, so the same record
 * works in browser storage and in the Supabase `documents.data` jsonb column.
 */

export type Region =
  | 'international'
  | 'us'
  | 'uk'
  | 'europass'
  | 'canada'
  | 'australia'
  | 'gulf'
  | 'academic';

export const REGIONS: { id: Region; label: string; hint: string }[] = [
  { id: 'international', label: 'International', hint: 'Clean, globally accepted CV — 1–2 pages.' },
  { id: 'us', label: 'United States', hint: 'Résumé: 1 page (2 if 10+ yrs), no photo, no personal data.' },
  { id: 'uk', label: 'United Kingdom / Ireland', hint: '2 pages, no photo, no date of birth.' },
  { id: 'europass', label: 'Europass / European Union', hint: 'EU standard structure, CEFR language grid, photo optional.' },
  { id: 'canada', label: 'Canada', hint: '2 pages, no photo, age, marital status or SIN. Work authorization optional.' },
  { id: 'australia', label: 'Australia / New Zealand', hint: '2–3 pages, referees section is common.' },
  { id: 'gulf', label: 'Middle East / Gulf', hint: 'Photo, nationality and visa status are usually expected.' },
  { id: 'academic', label: 'Academic CV', hint: 'No page limit: publications, research, teaching, grants.' },
];

export type DocKind = 'cv' | 'cover' | 'motivation' | 'sop' | 'linkedin';

export const DOC_KINDS: { id: DocKind; label: string; short: string; description: string }[] = [
  { id: 'cv', label: 'CV / Résumé', short: 'CV', description: 'ATS-friendly CV with 400+ designs, Europass and Canadian formats.' },
  { id: 'cover', label: 'Cover Letter', short: 'Cover letter', description: 'A one-page letter tailored to a specific job.' },
  { id: 'motivation', label: 'Motivation Letter', short: 'Motivation', description: 'For universities, scholarships, EU jobs and visas.' },
  { id: 'sop', label: 'Statement of Purpose', short: 'SOP', description: 'For Masters / PhD admissions, with a structured outline.' },
  { id: 'linkedin', label: 'LinkedIn Makeover', short: 'LinkedIn', description: 'Banner, profile photo frame, headline and About section.' },
];

export type ProjectStatus = 'draft' | 'applied' | 'interview' | 'offer' | 'rejected' | 'archived';

export type Project = {
  id: string;
  ownerId: string;
  name: string;
  targetRole: string;
  company: string;
  region: Region;
  jobDescription: string;
  notes: string;
  status: ProjectStatus;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentVersion = { at: string; label: string; data: unknown };

export type DocumentRecord<T = unknown> = {
  id: string;
  projectId: string;
  ownerId: string;
  kind: DocKind;
  title: string;
  data: T;
  createdAt: string;
  updatedAt: string;
  /** Up to 20 snapshots, newest first. */
  versions: DocumentVersion[];
};

/* ------------------------------------------------------------------ CV */

/** Dates are stored as "YYYY-MM" (or "YYYY") so they render in one consistent format. */
export type YearMonth = string;

export type CvPersonal = {
  firstName: string;
  lastName: string;
  headline: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  address: string;
  postalCode: string;
  linkedin: string;
  website: string;
  github: string;
  photo: string;
  /** Europass / Gulf only. Hidden automatically for US, UK and Canada. */
  dateOfBirth: string;
  nationality: string;
  drivingLicence: string;
  /** e.g. "Open work permit (Canada)", "Eligible to work in the EU". */
  workAuthorization: string;
};

export type CvExperience = {
  id: string;
  title: string;
  employer: string;
  employmentType: string;
  city: string;
  country: string;
  startDate: YearMonth;
  endDate: YearMonth;
  current: boolean;
  /** Optional one-line context about the company or remit. */
  description: string;
  bullets: string[];
};

export type CvEducation = {
  id: string;
  degree: string;
  field: string;
  institution: string;
  city: string;
  country: string;
  startDate: YearMonth;
  endDate: YearMonth;
  current: boolean;
  grade: string;
  /** Europass EQF level 1–8, optional. */
  eqfLevel: string;
  bullets: string[];
};

export type SkillItem = { name: string; level: number };
export type CvSkillGroup = { id: string; name: string; items: SkillItem[] };

export type Cefr = '' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type CvLanguage = {
  id: string;
  name: string;
  native: boolean;
  /** Overall proficiency label used outside Europass, e.g. "Fluent", "Professional". */
  proficiency: string;
  listening: Cefr;
  reading: Cefr;
  spokenInteraction: Cefr;
  spokenProduction: Cefr;
  writing: Cefr;
  certificate: string;
};

export type CvCertification = {
  id: string;
  name: string;
  issuer: string;
  date: YearMonth;
  expiry: YearMonth;
  credentialId: string;
  url: string;
};

export type CvProject = {
  id: string;
  name: string;
  role: string;
  url: string;
  startDate: YearMonth;
  endDate: YearMonth;
  description: string;
  tech: string;
};

export type CvAward = { id: string; title: string; issuer: string; date: YearMonth; description: string };
export type CvPublication = { id: string; title: string; authors: string; publisher: string; date: YearMonth; url: string };
export type CvVolunteering = {
  id: string;
  role: string;
  organization: string;
  city: string;
  startDate: YearMonth;
  endDate: YearMonth;
  current: boolean;
  description: string;
};
export type CvCourse = { id: string; name: string; provider: string; date: YearMonth };
export type CvMembership = { id: string; name: string; role: string; startDate: YearMonth; endDate: YearMonth };
export type CvReference = {
  id: string;
  name: string;
  position: string;
  company: string;
  email: string;
  phone: string;
  relationship: string;
};
export type CvCustomEntry = { id: string; title: string; subtitle: string; date: string; description: string };
export type CvCustomSection = { id: string; heading: string; entries: CvCustomEntry[] };

export type SectionKey =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'languages'
  | 'certifications'
  | 'projects'
  | 'awards'
  | 'publications'
  | 'volunteering'
  | 'courses'
  | 'memberships'
  | 'interests'
  | 'references'
  | `custom:${string}`;

export type DateFormat = 'MMM YYYY' | 'MMMM YYYY' | 'MM/YYYY' | 'YYYY';
export type PageSize = 'A4' | 'Letter';

export type CvDesignSettings = {
  designId: string;
  /** Overrides the design's accent colour when set. */
  accent: string;
  /** Overrides the design's font pairing when set. */
  font: string;
  fontScale: number;
  spacing: 'compact' | 'normal' | 'relaxed';
  pageSize: PageSize;
  showPhoto: boolean;
  dateFormat: DateFormat;
};

export type CvData = {
  personal: CvPersonal;
  summary: string;
  experience: CvExperience[];
  education: CvEducation[];
  skills: CvSkillGroup[];
  languages: CvLanguage[];
  certifications: CvCertification[];
  projects: CvProject[];
  awards: CvAward[];
  publications: CvPublication[];
  volunteering: CvVolunteering[];
  courses: CvCourse[];
  memberships: CvMembership[];
  interests: string[];
  references: CvReference[];
  referencesOnRequest: boolean;
  custom: CvCustomSection[];
  sectionOrder: SectionKey[];
  hiddenSections: SectionKey[];
  sectionTitles: Partial<Record<string, string>>;
  design: CvDesignSettings;
};

/* -------------------------------------------------------------- letters */

/** A paragraph. Composed letters key blocks by section (e.g. "opening") so hand edits survive re-composition. */
export type LetterBlock = { id: string; heading: string; body: string; key?: string };

export type LetterTone = 'confident' | 'formal' | 'warm';
export type LetterLength = 'short' | 'standard' | 'detailed';

/** Settings of the real-time composer, which writes the letter from the linked CV. */
export type LetterCompose = {
  /** When on, the letter re-writes itself whenever the CV, job or settings change. */
  live: boolean;
  /** Document id of the CV the letter is written from. */
  cvId: string;
  tone: LetterTone;
  length: LetterLength;
  include: {
    achievements: boolean;
    earlierRoles: boolean;
    skills: boolean;
    education: boolean;
    projects: boolean;
    certifications: boolean;
    languages: boolean;
    volunteering: boolean;
    awards: boolean;
  };
  /** What the CV cannot say — woven into the letter when filled in. */
  why: string;
  goals: string;
  story: string;
  referrer: string;
  program: string;
  funding: string;
  ties: string;
  /** Keys of blocks the user rewrote by hand; the composer leaves them alone. */
  edited: string[];
};

export type LetterData = {
  templateId: string;
  sender: { name: string; headline: string; email: string; phone: string; city: string; linkedin: string };
  recipient: { name: string; title: string; organization: string; address: string };
  date: string;
  subject: string;
  salutation: string;
  blocks: LetterBlock[];
  /** SOPs and some motivation letters show a heading over each block. */
  showHeadings: boolean;
  closing: string;
  signature: string;
  /** Word target for SOPs/motivation letters (0 = none). */
  wordTarget: number;
  design: { designId: string; accent: string; font: string; pageSize: PageSize; fontScale: number };
  /** Absent on letters made before the composer existed (they stay manual). */
  compose?: LetterCompose;
};

/* ------------------------------------------------------------- LinkedIn */

export type LinkedInData = {
  banner: {
    templateId: string;
    name: string;
    headline: string;
    tagline: string;
    skills: string[];
    contact: string;
    accent: string;
    accent2: string;
    textColor: string;
    /** Optional background photo (data URL). */
    image: string;
    align: 'left' | 'right';
  };
  avatar: {
    photo: string;
    frameId: string;
    ringColor: string;
    ringText: string;
    background: string;
    zoom: number;
    offsetX: number;
    offsetY: number;
  };
  post: { templateId: string; title: string; subtitle: string; accent: string };
  headline: string;
  about: string;
  checklist: Record<string, boolean>;
};
