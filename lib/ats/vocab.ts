/** Strong action verbs, grouped so the writing assistant can suggest alternatives. */
export const ACTION_VERBS: Record<string, string[]> = {
  Leadership: ['Led', 'Directed', 'Headed', 'Managed', 'Mentored', 'Coached', 'Supervised', 'Spearheaded', 'Championed', 'Mobilized', 'Orchestrated', 'Oversaw', 'Steered', 'Guided', 'Hired', 'Trained'],
  Achievement: ['Achieved', 'Exceeded', 'Surpassed', 'Delivered', 'Won', 'Earned', 'Attained', 'Secured', 'Outperformed', 'Awarded'],
  Improvement: ['Improved', 'Increased', 'Boosted', 'Accelerated', 'Reduced', 'Cut', 'Streamlined', 'Optimized', 'Enhanced', 'Upgraded', 'Revamped', 'Transformed', 'Modernized', 'Consolidated', 'Simplified', 'Saved', 'Lowered', 'Grew', 'Doubled', 'Tripled', 'Expanded', 'Raised', 'Strengthened'],
  Creation: ['Built', 'Created', 'Designed', 'Developed', 'Launched', 'Established', 'Founded', 'Initiated', 'Introduced', 'Pioneered', 'Engineered', 'Architected', 'Implemented', 'Produced', 'Formulated', 'Devised', 'Shipped', 'Prototyped', 'Authored', 'Wrote', 'Drafted'],
  Analysis: ['Analyzed', 'Analysed', 'Assessed', 'Audited', 'Evaluated', 'Forecasted', 'Identified', 'Investigated', 'Measured', 'Modelled', 'Modeled', 'Quantified', 'Researched', 'Surveyed', 'Tested', 'Validated', 'Diagnosed', 'Mapped', 'Benchmarked', 'Calculated'],
  Communication: ['Presented', 'Negotiated', 'Persuaded', 'Advised', 'Consulted', 'Collaborated', 'Partnered', 'Liaised', 'Facilitated', 'Influenced', 'Promoted', 'Pitched', 'Briefed', 'Published', 'Communicated', 'Represented', 'Translated'],
  Operations: ['Coordinated', 'Organized', 'Organised', 'Planned', 'Scheduled', 'Administered', 'Executed', 'Maintained', 'Operated', 'Processed', 'Resolved', 'Handled', 'Monitored', 'Prioritized', 'Allocated', 'Automated', 'Migrated', 'Deployed', 'Integrated', 'Configured', 'Standardized', 'Documented', 'Ensured', 'Supported', 'Served', 'Prepared', 'Reconciled', 'Recruited', 'Sourced', 'Procured', 'Sold', 'Closed', 'Generated', 'Converted', 'Taught', 'Cared', 'Treated', 'Assisted', 'Conducted', 'Performed', 'Delivered', 'Managed', 'Completed', 'Contributed', 'Drove', 'Owned', 'Ran', 'Captured'],
};

export const ACTION_VERB_SET = new Set(Object.values(ACTION_VERBS).flat().map((v) => v.toLowerCase()));

/** Phrases that make a bullet passive or vague, with a better framing. */
export const WEAK_PHRASES: { re: RegExp; tip: string }[] = [
  { re: /\bresponsible for\b/i, tip: 'Say what you did and the result: "Led…", "Managed…", "Cut…".' },
  { re: /\bduties (included|include)\b/i, tip: 'List achievements, not duties.' },
  { re: /\bhelped( to)?\b/i, tip: 'Claim your part: "Co-led", "Contributed X to…", or the specific action.' },
  { re: /\bworked on\b/i, tip: 'Use a precise verb: "Built", "Designed", "Delivered".' },
  { re: /\btasked with\b/i, tip: 'Start with the action you took.' },
  { re: /\binvolved in\b/i, tip: 'State your specific contribution.' },
  { re: /\bassisted (with|in)\b/i, tip: 'Describe the outcome you contributed to.' },
  { re: /\bin charge of\b/i, tip: 'Use "Led" or "Managed" and add scale (team size, budget).' },
  { re: /\bvarious\b/i, tip: '"Various" is vague — name them or give a number.' },
  { re: /\betc\.?\b/i, tip: 'Avoid "etc." — be specific or cut it.' },
];

export const CLICHES = [
  'team player',
  'hard working',
  'hard-working',
  'hardworking',
  'go-getter',
  'think outside the box',
  'detail-oriented',
  'detail oriented',
  'results-driven',
  'results driven',
  'self-starter',
  'self starter',
  'dynamic',
  'synergy',
  'proven track record',
  'excellent communication skills',
  'best of breed',
  'go-to person',
  'motivated individual',
  'passionate about',
  'works well under pressure',
  'strategic thinker',
  'value add',
];

export const FIRST_PERSON = /\b(I|me|my|mine|myself|I'm|I've|I'd)\b/;

export const QUANTIFIED = /(\d|%|\$|€|£|₹|¥|\bone\b|\btwo\b|\bthree\b|\bfour\b|\bfive\b|\bten\b|\bdozens?\b|\bhundreds?\b|\bthousands?\b|\bmillions?\b|\bdoubled\b|\btripled\b|\bhalved\b)/i;
