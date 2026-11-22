import type { DocKind } from '../types';

/**
 * Starter templates for cover letters, motivation letters and statements of
 * purpose. Each is a proven structure with placeholders like {{company}} that
 * are filled from the project and the linked CV; anything left in [square
 * brackets] is for the user to personalise and is highlighted in the editor.
 */
export type LetterTemplate = {
  id: string;
  kind: Exclude<DocKind, 'cv' | 'linkedin'>;
  name: string;
  category: string;
  description: string;
  subject?: string;
  salutation?: string;
  closing?: string;
  showHeadings?: boolean;
  wordTarget?: number;
  blocks: { heading?: string; body: string }[];
};

export const PLACEHOLDERS: { key: string; label: string }[] = [
  { key: 'name', label: 'Your name' },
  { key: 'role', label: 'Target role' },
  { key: 'company', label: 'Company / organisation' },
  { key: 'hiringManager', label: 'Hiring manager' },
  { key: 'years', label: 'Years of experience' },
  { key: 'currentTitle', label: 'Current job title' },
  { key: 'currentEmployer', label: 'Current employer' },
  { key: 'skill1', label: 'Top skill 1' },
  { key: 'skill2', label: 'Top skill 2' },
  { key: 'skill3', label: 'Top skill 3' },
  { key: 'achievement', label: 'Headline achievement' },
  { key: 'degree', label: 'Degree' },
  { key: 'university', label: 'Your university' },
  { key: 'program', label: 'Target programme' },
  { key: 'targetUniversity', label: 'Target university' },
  { key: 'field', label: 'Field of study' },
  { key: 'city', label: 'Your city' },
];

const COVER_CLOSE = 'Thank you for your time and consideration. I would welcome the opportunity to discuss how I can contribute to {{company}}, and I am available at your convenience for an interview.';

export const LETTER_TEMPLATES: LetterTemplate[] = [
  /* ============================================================ COVER LETTERS */
  {
    id: 'cover-professional',
    kind: 'cover',
    name: 'Professional (any industry)',
    category: 'General',
    description: 'The classic four-paragraph structure: hook, proof, fit, close.',
    subject: 'Application for {{role}}',
    blocks: [
      { body: 'I am writing to apply for the {{role}} position at {{company}}. With {{years}} years of experience as a {{currentTitle}} and a record of {{achievement}}, I am confident I can deliver results for your team from day one.' },
      { body: 'In my current role at {{currentEmployer}}, I [describe your biggest responsibility]. Highlights include:\n• [Achievement with a number, e.g. "cut reporting time by 60%"]\n• [Achievement showing {{skill1}}]\n• [Achievement showing {{skill2}}]' },
      { body: 'What draws me to {{company}} is [something specific: a product, value, recent news or project]. Your need for [requirement from the job ad] matches my experience in {{skill1}} and {{skill2}}, and I am excited by the chance to [what you would contribute].' },
      { body: COVER_CLOSE },
    ],
  },
  {
    id: 'cover-graduate',
    kind: 'cover',
    name: 'Graduate / entry level',
    category: 'Early career',
    description: 'Leads with education, projects and internships when experience is limited.',
    subject: 'Application for {{role}} — Graduate',
    blocks: [
      { body: 'As a recent {{degree}} graduate from {{university}}, I am excited to apply for the {{role}} role at {{company}}. My studies, internships and projects have given me a strong grounding in {{skill1}} and {{skill2}}, and I am eager to apply them in a professional setting.' },
      { body: 'During my degree I [key project or thesis], which [result — grade, award, users, impact]. As an intern at [company], I [what you did and achieved]. These experiences taught me to [skill/lesson relevant to the job].' },
      { body: 'I am particularly drawn to {{company}} because [specific reason]. I learn quickly, take ownership of my work, and would bring energy and fresh ideas to your team.' },
      { body: 'Thank you for considering my application. I would be glad to discuss how my skills and enthusiasm could support {{company}}.' },
    ],
  },
  {
    id: 'cover-career-change',
    kind: 'cover',
    name: 'Career change',
    category: 'Career change',
    description: 'Bridges transferable skills to a new field and addresses the switch head-on.',
    subject: 'Application for {{role}}',
    blocks: [
      { body: 'After {{years}} years as a {{currentTitle}}, I am moving into {{field}}, and the {{role}} position at {{company}} is exactly the kind of role where my background adds unusual value.' },
      { body: 'My previous career gave me transferable strengths that map directly to this role:\n• {{skill1}}: [example with result]\n• {{skill2}}: [example with result]\n• [Stakeholder/communication skill]: [example]' },
      { body: 'To make the transition I have [course, certification, bootcamp, portfolio project], where I [what you built or achieved]. I bring both the new technical skills and the perspective of someone who has [domain experience relevant to the employer].' },
      { body: COVER_CLOSE },
    ],
  },
  {
    id: 'cover-software',
    kind: 'cover',
    name: 'Software engineer',
    category: 'Technology',
    description: 'Shows shipped work, stack fit and engineering impact.',
    subject: 'Application for {{role}}',
    blocks: [
      { body: 'I am a {{currentTitle}} with {{years}} years of experience building [type of systems] in {{skill1}} and {{skill2}}, and I would love to bring that experience to the {{role}} team at {{company}}.' },
      { body: 'At {{currentEmployer}} I [led/built] [system or feature], which [measurable impact: latency, uptime, revenue, users]. I also [second achievement — scale, migration, performance, developer experience].' },
      { body: 'Your stack ([technologies from the job ad]) overlaps closely with mine, and I am especially interested in [product/engineering challenge at the company]. I care about clean, tested code, thoughtful code review and shipping iteratively.' },
      { body: 'You can see some of my work at [GitHub/portfolio]. I would welcome the chance to talk about how I can help {{company}} ship faster and more reliably.' },
    ],
  },
  {
    id: 'cover-data',
    kind: 'cover',
    name: 'Data / analytics',
    category: 'Technology',
    description: 'Frames analysis as business decisions and dollars.',
    subject: 'Application for {{role}}',
    blocks: [
      { body: 'Turning data into decisions is what I do best. As a {{currentTitle}} at {{currentEmployer}}, I {{achievement}} — and I would like to bring the same impact to {{company}} as your next {{role}}.' },
      { body: 'My toolkit includes {{skill1}}, {{skill2}} and {{skill3}}. Recently I [project: problem → analysis → decision → result]. I am comfortable owning the full cycle, from messy source data to a dashboard leadership trusts.' },
      { body: 'I am excited about {{company}} because [specific reason — data maturity, product, mission]. I would welcome the opportunity to discuss how I can help your team answer its most important questions.' },
    ],
  },
  {
    id: 'cover-healthcare',
    kind: 'cover',
    name: 'Nursing & healthcare',
    category: 'Healthcare',
    description: 'Emphasises patient outcomes, registration and clinical settings.',
    subject: 'Application for {{role}}',
    blocks: [
      { body: 'I am a registered [nurse/clinician] with {{years}} years of experience in [ward/specialty], and I am writing to apply for the {{role}} position at {{company}}.' },
      { body: 'At {{currentEmployer}} I care for [number] patients per shift in [setting]. I [clinical achievement — e.g. reduced falls, improved discharge times, led infection-control audit], and I hold [registration/licence number and certifications such as BLS/ACLS].' },
      { body: 'Your commitment to [hospital value/initiative] resonates with me. I bring calm under pressure, clear communication with patients and families, and a strong commitment to evidence-based practice.' },
      { body: COVER_CLOSE },
    ],
  },
  {
    id: 'cover-sales',
    kind: 'cover',
    name: 'Sales & business development',
    category: 'Sales & marketing',
    description: 'Numbers-first: quota, pipeline and wins.',
    subject: 'Application for {{role}}',
    blocks: [
      { body: 'I have exceeded quota for [X] consecutive [quarters/years], most recently {{achievement}}. I would like to bring that track record to {{company}} as your {{role}}.' },
      { body: 'At {{currentEmployer}} I [built pipeline / managed territory / closed key accounts]: \n• [Revenue or quota attainment figure]\n• [Biggest deal or new logo]\n• [Process improvement, e.g. shorter sales cycle]' },
      { body: 'I know [your market/customer segment] well and I am excited about how {{company}} [product differentiation]. I would welcome a conversation about hitting your growth targets together.' },
    ],
  },
  {
    id: 'cover-marketing',
    kind: 'cover',
    name: 'Marketing & communications',
    category: 'Sales & marketing',
    description: 'Campaign results, channels and brand fit.',
    subject: 'Application for {{role}}',
    blocks: [
      { body: 'I am a {{currentTitle}} who combines creative storytelling with hard numbers, and I am excited to apply for the {{role}} role at {{company}}.' },
      { body: 'Recently I [campaign], which [result: leads, CAC, conversion, reach]. I am hands-on with {{skill1}}, {{skill2}} and {{skill3}}, and I build reporting that shows exactly what each channel returns.' },
      { body: 'I have long admired {{company}}’s [campaign/brand voice], and I have ideas for [specific opportunity]. I would love to discuss them with you.' },
      { body: COVER_CLOSE },
    ],
  },
  {
    id: 'cover-finance',
    kind: 'cover',
    name: 'Finance & accounting',
    category: 'Finance',
    description: 'Accuracy, compliance and process improvements.',
    subject: 'Application for {{role}}',
    blocks: [
      { body: 'I am a [qualification, e.g. CPA/ACCA/CA] with {{years}} years of experience in [audit/financial reporting/FP&A], and I am pleased to apply for the {{role}} position at {{company}}.' },
      { body: 'At {{currentEmployer}} I [close/reporting/audit responsibility], and I {{achievement}}. I am proficient in {{skill1}} and {{skill2}}, and familiar with [IFRS/GAAP/SOX].' },
      { body: 'I value accuracy, clear controls and timely reporting, and I would bring the same discipline to {{company}}’s finance team.' },
      { body: COVER_CLOSE },
    ],
  },
  {
    id: 'cover-teacher',
    kind: 'cover',
    name: 'Teacher / education',
    category: 'Education',
    description: 'Learner outcomes, classroom practice and school fit.',
    subject: 'Application for {{role}}',
    blocks: [
      { body: 'I am a qualified [subject/grade] teacher with {{years}} years of classroom experience, and I am excited to apply for the {{role}} position at {{company}}.' },
      { body: 'In my current school I [teaching responsibility], and my students [outcome — exam results, progress, engagement]. I also [extracurricular, curriculum development or pastoral role].' },
      { body: 'Your school’s focus on [value/program] matches my approach to [teaching philosophy]. I would welcome the chance to contribute to your learning community.' },
      { body: COVER_CLOSE },
    ],
  },
  {
    id: 'cover-executive',
    kind: 'cover',
    name: 'Executive / senior leadership',
    category: 'Executive',
    description: 'Strategic, board-level impact in fewer, stronger paragraphs.',
    subject: '{{role}} — {{name}}',
    blocks: [
      { body: 'Over {{years}} years I have led [functions/organisations] through [growth, turnaround, transformation], most recently {{achievement}}. I am writing regarding the {{role}} opportunity at {{company}}.' },
      { body: 'As {{currentTitle}} at {{currentEmployer}}, I [scope: P&L, headcount, markets] and delivered [2–3 strategic results]. I build high-performing teams and align them to a clear strategy.' },
      { body: 'I believe {{company}} is at a pivotal point with [opportunity/challenge], and my experience in [relevant domain] positions me to help you capture it. I would value a conversation at your convenience.' },
    ],
  },
  {
    id: 'cover-internship',
    kind: 'cover',
    name: 'Internship',
    category: 'Early career',
    description: 'Short and enthusiastic, built around coursework and projects.',
    subject: 'Internship application — {{role}}',
    blocks: [
      { body: 'I am a [year]-year {{degree}} student at {{university}} and I am excited to apply for the {{role}} internship at {{company}}.' },
      { body: 'Through [course project/club/part-time job] I developed skills in {{skill1}} and {{skill2}}. For example, I [specific project and outcome].' },
      { body: 'I would love to learn from your team and contribute to [specific team or project]. Thank you for considering my application.' },
    ],
  },
  {
    id: 'cover-referral',
    kind: 'cover',
    name: 'Referral',
    category: 'General',
    description: 'Opens with the mutual connection to get read first.',
    subject: 'Referred by [Referrer name] — {{role}}',
    blocks: [
      { body: '[Referrer name], [their role] at {{company}}, suggested I contact you about the {{role}} position. Having heard how your team [something they told you], I am very keen to contribute.' },
      { body: 'I bring {{years}} years of experience in {{skill1}} and {{skill2}}. At {{currentEmployer}} I {{achievement}}.' },
      { body: COVER_CLOSE },
    ],
  },
  {
    id: 'cover-prospecting',
    kind: 'cover',
    name: 'Prospecting (no advertised job)',
    category: 'General',
    description: 'For speculative applications to companies you admire.',
    subject: 'Exploring opportunities in [team] at {{company}}',
    blocks: [
      { body: 'I have followed {{company}}’s work on [project/product] with great interest, and I am writing to ask whether you have, or expect to have, an opening for a {{role}}.' },
      { body: 'As a {{currentTitle}} with {{years}} years of experience, I {{achievement}}. I believe I could help {{company}} [specific value you would add].' },
      { body: 'I have attached my CV and would appreciate a brief conversation about how I might contribute. Thank you for your time.' },
    ],
  },
  {
    id: 'cover-canada-newcomer',
    kind: 'cover',
    name: 'Canadian newcomer',
    category: 'Canada',
    description: 'Canadian conventions: work authorization, transferable international experience.',
    subject: 'Application for {{role}}',
    blocks: [
      { body: 'I am writing to apply for the {{role}} position at {{company}}. I am a [Permanent Resident / Open Work Permit holder] based in {{city}}, legally entitled to work in Canada and available to start immediately.' },
      { body: 'I bring {{years}} years of international experience as a {{currentTitle}}, where I {{achievement}}. My credentials have been assessed by [WES/ICAS] as equivalent to a Canadian [degree], and I hold [Canadian certification or ongoing licensure].' },
      { body: 'Since arriving in Canada I have [volunteering, Canadian course, networking], which has deepened my understanding of the Canadian workplace. I am confident my skills in {{skill1}} and {{skill2}} will add value to your team.' },
      { body: 'Thank you for considering my application. I would welcome the opportunity to discuss my qualifications with you.' },
    ],
  },
  {
    id: 'cover-project-manager',
    kind: 'cover',
    name: 'Project manager',
    category: 'Operations',
    description: 'Scope, budget, delivery and stakeholders.',
    subject: 'Application for {{role}}',
    blocks: [
      { body: 'I am a [PMP/PRINCE2]-certified project manager with {{years}} years of delivering [type of projects] on time and on budget, and I am applying for the {{role}} role at {{company}}.' },
      { body: 'Recently I led [project] with a budget of [amount] and a team of [size], delivering [outcome] [X weeks early/under budget]. I am experienced with {{skill1}} and {{skill2}} methodologies.' },
      { body: 'I am excited about {{company}}’s [initiative], and I would welcome the opportunity to bring structured, transparent delivery to your projects.' },
    ],
  },
  {
    id: 'cover-customer-service',
    kind: 'cover',
    name: 'Customer service & hospitality',
    category: 'Operations',
    description: 'Customer satisfaction metrics and service attitude.',
    subject: 'Application for {{role}}',
    blocks: [
      { body: 'I am applying for the {{role}} position at {{company}}. In {{years}} years of customer-facing work I have learned that great service is about listening, solving problems fast and making people feel valued.' },
      { body: 'At {{currentEmployer}} I [handle X customers/calls daily] and maintain a [customer satisfaction score/review rating]. I [example of resolving a difficult situation].' },
      { body: 'I would be proud to represent {{company}} and I am available for flexible shifts. Thank you for considering my application.' },
    ],
  },
  {
    id: 'cover-designer',
    kind: 'cover',
    name: 'Designer / creative',
    category: 'Creative',
    description: 'Portfolio-led, with process and outcomes.',
    subject: 'Application for {{role}}',
    blocks: [
      { body: 'I design [products/brands/experiences] that are both beautiful and measurable, and I am excited to apply for the {{role}} role at {{company}}. My portfolio is at [link].' },
      { body: 'Recently I [project], working from research to final design. The result: [metric — conversion, engagement, satisfaction]. I work fluently in {{skill1}} and {{skill2}}.' },
      { body: 'I love {{company}}’s [design work/brand] and would bring [what you add] to your team.' },
    ],
  },

  /* ======================================================= MOTIVATION LETTERS */
  {
    id: 'motivation-masters',
    kind: 'motivation',
    name: 'Master’s admission',
    category: 'University',
    description: 'For European and international Master’s programmes.',
    subject: 'Motivation letter — {{program}}',
    salutation: 'Dear Members of the Admissions Committee,',
    closing: 'Yours faithfully,',
    wordTarget: 700,
    blocks: [
      { body: 'I am applying for the {{program}} at {{targetUniversity}}, a programme whose focus on [specific modules/research] aligns closely with my academic background and career goals.' },
      { body: 'I hold a {{degree}} from {{university}}, where I [grade/rank and key coursework]. My final-year project on [topic] sparked my interest in [field], and I [result or publication].' },
      { body: 'Beyond my studies, I [internship/work experience/volunteering], which showed me the practical challenges of [field] and the skills I need to address them.' },
      { body: '{{targetUniversity}} stands out to me because of [professors, labs, industry links, location]. In particular, I look forward to [specific course or opportunity].' },
      { body: 'After graduating, I plan to [career goal], contributing to [impact]. I am confident this programme will give me the knowledge and network to get there, and I would bring dedication, curiosity and an international perspective to the class.' },
    ],
  },
  {
    id: 'motivation-scholarship',
    kind: 'motivation',
    name: 'Scholarship application',
    category: 'Scholarship',
    description: 'Merit, need and impact — for Chevening, DAAD, Erasmus Mundus and similar.',
    subject: 'Motivation letter — [Scholarship name]',
    salutation: 'Dear Selection Committee,',
    closing: 'Yours sincerely,',
    wordTarget: 800,
    blocks: [
      { body: 'I am honoured to apply for the [Scholarship name] to pursue the {{program}} at {{targetUniversity}}. This scholarship would allow me to [what it enables] and to return to [home country] equipped to [impact].' },
      { body: 'Academic excellence: I graduated from {{university}} with [grade], and [awards, publications, ranking].' },
      { body: 'Leadership and impact: As [role], I [initiative with measurable impact on people or community].' },
      { body: 'Why this programme: [specific reasons, modules, faculty].' },
      { body: 'Future plans: On completion, I will [concrete career plan] — directly supporting the scholarship’s mission of [mission].' },
      { body: 'Thank you for considering my application. I would be proud to represent the [Scholarship name] community.' },
    ],
  },
  {
    id: 'motivation-erasmus',
    kind: 'motivation',
    name: 'Erasmus / exchange semester',
    category: 'University',
    description: 'Short, focused letter for exchange and mobility programmes.',
    subject: 'Motivation letter — exchange semester at {{targetUniversity}}',
    salutation: 'Dear Exchange Coordinator,',
    wordTarget: 450,
    blocks: [
      { body: 'I am a [year]-year {{degree}} student at {{university}} and I would like to spend [semester] at {{targetUniversity}} through the [Erasmus+/exchange] programme.' },
      { body: 'Academically, the courses [course names] would complement my studies in {{field}} by [reason].' },
      { body: 'Personally, living in [country] would improve my [language] skills and expose me to [culture/industry]. I am adaptable, sociable and eager to contribute to campus life.' },
      { body: 'Thank you for considering my application.' },
    ],
  },
  {
    id: 'motivation-eu-job',
    kind: 'motivation',
    name: 'European job (Europass)',
    category: 'Employment',
    description: 'Europass-style motivation letter for EU employers and institutions.',
    subject: 'Application for the position of {{role}}',
    salutation: 'Dear Sir or Madam,',
    closing: 'Yours faithfully,',
    blocks: [
      { body: 'I would like to apply for the position of {{role}} at {{company}}, as advertised on [source]. With {{years}} years of experience in {{field}} and a strong interest in [organisation’s mission], I am highly motivated to join your team.' },
      { body: 'In my current position as {{currentTitle}} at {{currentEmployer}}, I [responsibilities and achievements]. I am proficient in {{skill1}} and {{skill2}}, and I speak [languages with CEFR levels].' },
      { body: 'I am particularly motivated by [why this organisation/country], and I am able to relocate to [city] [eligibility to work in the EU].' },
      { body: 'Please find my Europass CV attached. I look forward to the opportunity to discuss my application with you.' },
    ],
  },
  {
    id: 'motivation-phd',
    kind: 'motivation',
    name: 'PhD position',
    category: 'Research',
    description: 'Research fit, methods and proposed contribution.',
    subject: 'Application for the PhD position in [project title]',
    salutation: 'Dear Professor [Surname],',
    wordTarget: 900,
    blocks: [
      { body: 'I am writing to apply for the PhD position in [project title] in your group at {{targetUniversity}}. My Master’s research on [topic] has prepared me well for this project.' },
      { body: 'Research experience: In my thesis I [question, methods, results]. I am experienced in [methods/tools], and [publications/conference presentations].' },
      { body: 'Fit with the project: Your recent work on [paper] particularly interests me because [reason]. I would like to explore [research idea] within the project.' },
      { body: 'Career goals: I aim to [academic/industry research career], and this PhD is the essential next step.' },
      { body: 'Thank you for considering my application. I would be glad to discuss my research interests further.' },
    ],
  },
  {
    id: 'motivation-volunteer',
    kind: 'motivation',
    name: 'Volunteer / NGO programme',
    category: 'Volunteering',
    description: 'For volunteering programmes, NGOs and the European Solidarity Corps.',
    subject: 'Motivation letter — [Programme name]',
    blocks: [
      { body: 'I am applying to join [Programme name] because I want to [cause] and believe my skills can make a real difference.' },
      { body: 'I have [relevant experience], where I [what you did and its impact].' },
      { body: 'Through this programme I hope to [what you will learn], and to bring back [how you will use it].' },
      { body: 'Thank you for considering my application.' },
    ],
  },
  {
    id: 'motivation-ausbildung',
    kind: 'motivation',
    name: 'Vocational training / apprenticeship',
    category: 'Employment',
    description: 'For apprenticeships such as the German Ausbildung.',
    subject: 'Application for an apprenticeship as {{role}}',
    blocks: [
      { body: 'I am applying for an apprenticeship as {{role}} at {{company}} starting [date].' },
      { body: 'I have always been interested in [field] because [reason]. At school I enjoyed [subjects], and I gained practical experience through [internship/job].' },
      { body: 'I am reliable, punctual and eager to learn. My [language] skills are at [CEFR level], and I am improving them through [course].' },
      { body: 'I would be happy to introduce myself in person or complete a trial day.' },
    ],
  },

  /* ================================================ STATEMENTS OF PURPOSE */
  {
    id: 'sop-masters',
    kind: 'sop',
    name: 'Master’s SOP (general)',
    category: 'Graduate school',
    description: 'The six-part structure admissions committees expect.',
    subject: 'Statement of Purpose — {{program}}, {{targetUniversity}}',
    salutation: '',
    closing: '',
    showHeadings: true,
    wordTarget: 1000,
    blocks: [
      { heading: 'Introduction', body: '[Open with a specific moment, problem or question that drew you to {{field}} — not a quote or a cliché.] This curiosity has shaped my studies and career, and it is why I am applying to the {{program}} at {{targetUniversity}}.' },
      { heading: 'Academic background', body: 'At {{university}} I earned a {{degree}} with [grade]. Courses such as [courses] gave me a foundation in [areas]. My final-year project, [title], [what you did and found].' },
      { heading: 'Professional experience', body: 'As a {{currentTitle}} at {{currentEmployer}}, I [responsibilities and achievements]. This experience showed me [gap in your knowledge that the programme fills].' },
      { heading: 'Why this programme', body: '{{targetUniversity}}’s {{program}} offers [specific modules, labs, faculty, industry partnerships]. I am especially eager to [course/research/professor’s work] because [reason].' },
      { heading: 'Career goals', body: 'In the short term, I aim to work as [role] in [sector]. In the long term, I plan to [ambition], contributing to [impact on industry/society/home country].' },
      { heading: 'Conclusion', body: 'I bring [strengths], a clear sense of purpose and [what you will contribute to the cohort]. I am confident the {{program}} is the right next step, and I would be proud to join {{targetUniversity}}.' },
    ],
  },
  {
    id: 'sop-cs',
    kind: 'sop',
    name: 'MS Computer Science',
    category: 'Graduate school',
    description: 'Technical depth, projects, research areas and faculty fit.',
    subject: 'Statement of Purpose — MS in Computer Science',
    showHeadings: true,
    wordTarget: 1000,
    blocks: [
      { heading: 'Motivation', body: '[A concrete technical problem you solved or wanted to solve.] That experience led me to focus on [area: ML, systems, security, HCI].' },
      { heading: 'Academic preparation', body: 'I completed my {{degree}} at {{university}} ([GPA/rank]). Key courses: [algorithms, OS, ML…]. In my capstone, [project, stack, result].' },
      { heading: 'Technical and research experience', body: 'As a {{currentTitle}}, I [built/scaled/optimised] [system], achieving [metric]. I also [open source, publication, hackathon].' },
      { heading: 'Research interests and faculty fit', body: 'I want to work on [specific topic]. Professor [Name]’s work on [paper] and the [lab name] align with this goal; I would like to explore [idea].' },
      { heading: 'Goals', body: 'After the MS I plan to [industry/research role], building [type of systems].' },
      { heading: 'Conclusion', body: 'I am confident that {{targetUniversity}} offers the rigour and research environment I need, and I would contribute [what you bring].' },
    ],
  },
  {
    id: 'sop-mba',
    kind: 'sop',
    name: 'MBA / business school',
    category: 'Business school',
    description: 'Leadership story, why MBA, why now, why this school.',
    subject: 'Statement of Purpose — MBA',
    showHeadings: true,
    wordTarget: 900,
    blocks: [
      { heading: 'Who I am', body: '[A leadership moment that defines you.]' },
      { heading: 'Career progression', body: 'Over {{years}} years I progressed from [role] to {{currentTitle}} at {{currentEmployer}}, where I [scope and results].' },
      { heading: 'Why an MBA, and why now', body: 'To reach my goal of [post-MBA goal], I need [skills/network] that I cannot gain on the job.' },
      { heading: 'Why this school', body: '[Specific programmes, clubs, professors, alumni conversations, location advantages.]' },
      { heading: 'What I will contribute', body: '[Perspective, industry experience, international background, community involvement.]' },
    ],
  },
  {
    id: 'sop-phd',
    kind: 'sop',
    name: 'PhD research statement',
    category: 'Research',
    description: 'Research questions, methods, preparation and supervisors.',
    subject: 'Statement of Purpose — PhD in {{field}}',
    showHeadings: true,
    wordTarget: 1200,
    blocks: [
      { heading: 'Research interests', body: 'My research interest lies in [area], specifically [question]. This matters because [significance].' },
      { heading: 'Research experience', body: 'In my Master’s thesis at {{university}}, I [question → methods → findings]. [Publications, posters, datasets.]' },
      { heading: 'Proposed direction', body: 'At {{targetUniversity}}, I would like to investigate [research question] using [methods], building on [existing literature].' },
      { heading: 'Fit with the department', body: 'Professors [Names] work on [topics], which closely match my interests. The [lab/centre] would provide [resources].' },
      { heading: 'Long-term goals', body: 'I aspire to [academic or research career] and to [impact].' },
    ],
  },
  {
    id: 'sop-data-science',
    kind: 'sop',
    name: 'Data Science / Analytics',
    category: 'Graduate school',
    description: 'Quantitative background, projects and applied goals.',
    subject: 'Statement of Purpose — {{program}}',
    showHeadings: true,
    wordTarget: 1000,
    blocks: [
      { heading: 'Why data science', body: '[The moment data changed a decision you were part of.]' },
      { heading: 'Quantitative foundation', body: 'My {{degree}} from {{university}} included [statistics, linear algebra, programming courses], where I [achievement].' },
      { heading: 'Applied experience', body: 'At {{currentEmployer}}, I used {{skill1}} and {{skill2}} to [project and measurable result].' },
      { heading: 'Why this programme', body: '[Modules, capstone with industry partners, faculty, co-op.]' },
      { heading: 'Career goals', body: '[Target role, industry, and the problems you want to solve.]' },
    ],
  },
  {
    id: 'sop-engineering',
    kind: 'sop',
    name: 'Engineering (MEng/MSc)',
    category: 'Graduate school',
    description: 'Design projects, technical depth and professional goals.',
    subject: 'Statement of Purpose — {{program}}',
    showHeadings: true,
    wordTarget: 1000,
    blocks: [
      { heading: 'Introduction', body: '[An engineering problem that fascinated you.]' },
      { heading: 'Academic background', body: '{{degree}} at {{university}} — [grade]; design project: [project and results].' },
      { heading: 'Professional experience', body: 'As {{currentTitle}}, I [designed/managed/improved] [system/structure/process], resulting in [metric].' },
      { heading: 'Why this programme', body: '[Specialisation, labs, accreditation, professional licensure pathway.]' },
      { heading: 'Goals', body: '[Short- and long-term engineering career goals.]' },
    ],
  },
  {
    id: 'sop-public-health',
    kind: 'sop',
    name: 'Public Health (MPH)',
    category: 'Graduate school',
    description: 'Community impact, field experience and policy goals.',
    subject: 'Statement of Purpose — Master of Public Health',
    showHeadings: true,
    wordTarget: 1000,
    blocks: [
      { heading: 'Motivation', body: '[A health challenge you witnessed in your community.]' },
      { heading: 'Background', body: '[Clinical, research or community health experience with outcomes.]' },
      { heading: 'Why public health', body: '[Population-level perspective you want to develop.]' },
      { heading: 'Why this programme', body: '[Concentration, practicum, faculty, global health links.]' },
      { heading: 'Goals', body: '[Policy, NGO, government or research role and intended impact.]' },
    ],
  },
  {
    id: 'sop-canada-study-plan',
    kind: 'sop',
    name: 'Canadian study plan (study permit)',
    category: 'Visa / study permit',
    description: 'The study plan / letter of explanation IRCC officers expect.',
    subject: 'Study Plan — {{program}}, {{targetUniversity}}',
    salutation: 'Dear Visa Officer,',
    closing: 'Respectfully,',
    showHeadings: true,
    wordTarget: 900,
    blocks: [
      { heading: 'Purpose of study', body: 'I have been admitted to the {{program}} at {{targetUniversity}} starting [intake], and I am applying for a study permit to complete this program.' },
      { heading: 'Educational and professional background', body: 'I hold a {{degree}} from {{university}} and have worked for {{years}} years as a {{currentTitle}} at {{currentEmployer}}.' },
      { heading: 'Why this program and why Canada', body: '[How the program builds on your background; why it is not available or equivalent at home; why this institution.]' },
      { heading: 'Career plan', body: '[The specific role and employers in your home country, with expected salary progression.]' },
      { heading: 'Financial support', body: '[Funding sources: savings, sponsor, GIC, scholarship — with amounts.]' },
      { heading: 'Ties to home country', body: '[Family, property, job offer or employer leave letter, and your plan to return after studies.]' },
      { heading: 'Conclusion', body: 'I will respect the conditions of my study permit and leave Canada at the end of my authorized stay. Thank you for considering my application.' },
    ],
  },
];

export const templatesFor = (kind: LetterTemplate['kind']) => LETTER_TEMPLATES.filter((t) => t.kind === kind);
export const letterTemplateById = (id: string) => LETTER_TEMPLATES.find((t) => t.id === id);

/** Fills {{placeholders}}; unknown or empty values become [Label] so they are easy to spot. */
export function fillPlaceholders(text: string, values: Partial<Record<string, string>>) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = values[key];
    if (v && v.trim()) return v.trim();
    const label = PLACEHOLDERS.find((p) => p.key === key)?.label ?? key;
    return `[${label}]`;
  });
}
