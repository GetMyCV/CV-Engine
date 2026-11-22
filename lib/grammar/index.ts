import { CLICHES, FIRST_PERSON, WEAK_PHRASES } from '../ats/vocab';
import { MISSPELLINGS, SPELLING_VARIANTS } from './dictionary';

/**
 * The offline grammar, spelling and style checker.
 *
 * It runs in the browser on every keystroke (debounced): a curated set of
 * rules for the mistakes that most often appear in CVs and letters — common
 * misspellings, confused words, a/an, repeated words, capitalisation,
 * punctuation spacing, passive voice, wordiness, clichés, and US/UK/Canadian
 * spelling consistency. For a deeper pass, /api/grammar forwards the text to
 * a LanguageTool server when one is configured.
 */

export type GrammarLocale = 'en-US' | 'en-GB' | 'en-CA';
export type IssueType = 'spelling' | 'grammar' | 'punctuation' | 'style' | 'clarity';

export type GrammarIssue = {
  id: string;
  offset: number;
  length: number;
  type: IssueType;
  message: string;
  replacements: string[];
  /** The flagged text. */
  text: string;
  source: 'built-in' | 'languagetool';
};

export type GrammarOptions = {
  locale?: GrammarLocale;
  /** CV mode adds CV-specific rules (no first person, weak phrases, clichés). */
  mode?: 'cv' | 'letter';
};

const WORDY: [RegExp, string, string][] = [
  [/\bin order to\b/gi, 'to', 'Wordy: "in order to" → "to".'],
  [/\bdue to the fact that\b/gi, 'because', 'Wordy: use "because".'],
  [/\butili[sz](e|ed|es|ing)\b/gi, 'use', '"Utilize" usually just means "use".'],
  [/\ba (large )?number of\b/gi, 'many', 'Be specific: give the number, or say "many".'],
  [/\bat this point in time\b/gi, 'now', 'Wordy: use "now".'],
  [/\bin the event that\b/gi, 'if', 'Wordy: use "if".'],
  [/\bwith regard(s)? to\b/gi, 'about', 'Wordy: use "about" or "on".'],
  [/\bfor the purpose of\b/gi, 'for', 'Wordy: use "for" or "to".'],
  [/\bon a (daily|weekly|monthly|regular) basis\b/gi, '$1', 'Wordy: say "daily", "weekly"…'],
  [/\bvery (unique|important|good|big)\b/gi, '', 'Use a stronger single word instead of "very …".'],
  [/\bbasically\b|\bactually\b|\breally\b/gi, '', 'Filler word — consider cutting it.'],
];

const CONFUSED: [RegExp, string, string][] = [
  [/\bits (a|an|the|been|not|going|important|time)\b/gi, "it's $1", 'Use "it\'s" (it is / it has).'],
  [/\bit's (own|role|team|customers|clients|users|products?|services?)\b/gi, 'its $1', 'Possessive "its" has no apostrophe.'],
  [/\byour (welcome|right|wrong|going)\b/gi, "you're $1", 'Use "you\'re" (you are).'],
  [/\b(could|would|should|must|might) of\b/gi, '$1 have', 'Use "have", not "of".'],
  [/\balot\b/gi, 'a lot', '"A lot" is two words.'],
  [/\b(more|less|better|worse|greater|fewer|higher|lower|larger|smaller|faster) then\b/gi, '$1 than', 'Comparisons use "than".'],
  [/\bthere (team|company|clients|customers|products|role|own)\b/gi, 'their $1', 'Possessive is "their".'],
  [/\bloose (weight|money|clients|customers|data)\b/gi, 'lose $1', '"Lose" (not "loose") means to misplace or fail to keep.'],
  [/\bcompliment(ed|s|ing)? (the|our|existing) (process|system|team|strategy)/gi, 'complement$1 $2 $3', '"Complement" means to complete or go well with.'],
  [/\bprinciple (engineer|consultant|investigator|designer|architect)\b/gi, 'principal $1', 'Job titles use "principal".'],
  [/\b(lead|led) to\b/gi, 'led to', ''],
  [/\bseperate/gi, 'separate', 'Spelling: "separate".'],
  [/\beffected (by|the)\b/gi, 'affected $1', '"Affected" is usually the verb here.'],
  [/\bper say\b/gi, 'per se', 'The phrase is "per se".'],
  [/\bhone in\b/gi, 'home in', 'The idiom is "home in".'],
];

const AN_EXCEPTIONS_CONSONANT_SOUND = /^(uni|use|usu|uti|eu|one|once|ure|u[bcdfgklmnprst][aeiou])/i;
const AN_EXCEPTIONS_VOWEL_SOUND = /^(hour|honest|honou?r|heir|herb\b)/i;
const ACRONYM_VOWEL_SOUND = /^[AEFHILMNORSX][A-Z0-9]*$/;

let counter = 0;
const mk = (offset: number, text: string, type: IssueType, message: string, replacements: string[] = []): GrammarIssue => ({
  id: `g${++counter}`,
  offset,
  length: text.length,
  type,
  message,
  replacements,
  text,
  source: 'built-in',
});

export function checkText(text: string, opts: GrammarOptions = {}): GrammarIssue[] {
  const locale = opts.locale ?? 'en-US';
  const issues: GrammarIssue[] = [];
  if (!text.trim()) return issues;

  // Repeated words: "the the"
  for (const m of text.matchAll(/\b(\w+)\s+\1\b/gi)) {
    if (/^(that|had|very|bye|ha|no|so)$/i.test(m[1]!)) continue;
    issues.push(mk(m.index!, m[0], 'grammar', `Repeated word: "${m[1]}".`, [m[1]!]));
  }
  // Double spaces
  for (const m of text.matchAll(/[^\S\n]{2,}/g)) issues.push(mk(m.index!, m[0], 'punctuation', 'Extra spaces.', [' ']));
  // Space before punctuation
  for (const m of text.matchAll(/\s+([,.;:!?])(?!\d)/g)) issues.push(mk(m.index!, m[0], 'punctuation', 'No space before punctuation.', [m[1]!]));
  // Missing space after punctuation (not in numbers, URLs, abbreviations, emails)
  for (const m of text.matchAll(/([a-z]{2,})([,;:])([A-Za-z])/g)) issues.push(mk(m.index!, m[0], 'punctuation', 'Add a space after the punctuation mark.', [`${m[1]}${m[2]} ${m[3]}`]));
  for (const m of text.matchAll(/([a-z]{3,})\.([A-Z][a-z]+)/g)) {
    if (/\.(com|org|net|io|dev|co|ai)\b/i.test(m[0])) continue;
    issues.push(mk(m.index!, m[0], 'punctuation', 'Add a space after the full stop.', [`${m[1]}. ${m[2]}`]));
  }
  // Lowercase standalone "i"
  for (const m of text.matchAll(/(^|[\s(])(i)(?=[\s,.'’;:!?)])/g)) issues.push(mk(m.index! + m[1]!.length, 'i', 'grammar', 'Capitalise "I".', ['I']));
  // Sentence starting lowercase
  for (const m of text.matchAll(/(?:^|[.!?]\s+|\n\s*)([a-z][a-z]+)/g)) {
    const word = m[1]!;
    if (/^(e\.g|i\.e|etc|vs|iOS|eBay|iPhone)/.test(word)) continue;
    const off = m.index! + m[0].length - word.length;
    // Skip continuation after abbreviations like "e.g. something"
    const before = text.slice(Math.max(0, off - 6), off);
    if (/(e\.g\.|i\.e\.|etc\.|vs\.|approx\.|incl\.)\s*$/i.test(before)) continue;
    issues.push(mk(off, word, 'grammar', 'Start the sentence with a capital letter.', [word[0]!.toUpperCase() + word.slice(1)]));
  }
  // a / an
  for (const m of text.matchAll(/\b(a|an|A|An)\s+([A-Za-z][\w-]*)/g)) {
    const art = m[1]!.toLowerCase();
    const next = m[2]!;
    let wantsAn: boolean;
    if (ACRONYM_VOWEL_SOUND.test(next) && next.length <= 5 && next === next.toUpperCase()) wantsAn = true;
    else if (next === next.toUpperCase() && next.length <= 5) wantsAn = /^[AEIO]/.test(next);
    else if (AN_EXCEPTIONS_VOWEL_SOUND.test(next)) wantsAn = true;
    else if (AN_EXCEPTIONS_CONSONANT_SOUND.test(next)) wantsAn = false;
    else wantsAn = /^[aeiou]/i.test(next);
    if (wantsAn && art === 'a') issues.push(mk(m.index!, `${m[1]} ${next}`, 'grammar', `Use "an" before "${next}".`, [`${m[1] === 'A' ? 'An' : 'an'} ${next}`]));
    if (!wantsAn && art === 'an') issues.push(mk(m.index!, `${m[1]} ${next}`, 'grammar', `Use "a" before "${next}".`, [`${m[1] === 'An' ? 'A' : 'a'} ${next}`]));
  }
  // Misspellings
  for (const m of text.matchAll(/\b[A-Za-z][a-z]+\b/g)) {
    const w = m[0];
    const fix = MISSPELLINGS[w.toLowerCase()];
    if (fix) issues.push(mk(m.index!, w, 'spelling', `Possible spelling mistake: "${w}".`, [matchCase(w, fix)]));
    const variant = SPELLING_VARIANTS[w.toLowerCase()];
    if (variant) {
      const preferred = variant[locale];
      if (preferred && preferred !== w.toLowerCase()) {
        const name = locale === 'en-GB' ? 'British' : locale === 'en-CA' ? 'Canadian' : 'American';
        issues.push(mk(m.index!, w, 'spelling', `${name} spelling is "${preferred}".`, [matchCase(w, preferred)]));
      }
    }
  }
  // Confused words
  for (const [re, rep, msg] of CONFUSED) {
    if (!msg) continue;
    for (const m of text.matchAll(re)) {
      const replacement = m[0].replace(new RegExp(re.source, 'i'), rep);
      if (replacement.toLowerCase() === m[0].toLowerCase()) continue;
      issues.push(mk(m.index!, m[0], 'grammar', msg, [matchCase(m[0], replacement)]));
    }
  }
  // Wordiness
  for (const [re, rep, msg] of WORDY) {
    for (const m of text.matchAll(re)) {
      const replacement = rep ? m[0].replace(new RegExp(re.source, 'i'), rep) : '';
      issues.push(mk(m.index!, m[0], 'clarity', msg, replacement ? [matchCase(m[0], replacement)] : []));
    }
  }
  // Passive voice
  for (const m of text.matchAll(/\b(was|were|been|being|is|are)\s+(\w+(?:ed|en))\b(\s+by\b)?/gi)) {
    if (/^(interested|based|located|experienced|skilled|qualified|certified|licensed|known|seen|open|even|often|given|chosen)$/i.test(m[2]!)) continue;
    issues.push(mk(m.index!, m[0], 'style', 'Passive voice — lead with what you did ("Delivered…", "Built…").', []));
  }
  // Long sentences
  let start = 0;
  for (const sentence of text.split(/(?<=[.!?])\s+|\n/)) {
    const idx = text.indexOf(sentence, start);
    start = idx + sentence.length;
    const n = sentence.trim().split(/\s+/).filter(Boolean).length;
    if (n > 38) issues.push(mk(idx, sentence.slice(0, Math.min(sentence.length, 60)), 'clarity', `Long sentence (${n} words). Split it for readability.`, []));
  }
  // Exclamation marks
  for (const m of text.matchAll(/!+/g)) issues.push(mk(m.index!, m[0], 'style', 'Avoid exclamation marks in professional documents.', ['.']));

  if (opts.mode === 'cv') {
    for (const m of text.matchAll(new RegExp(FIRST_PERSON.source, 'g'))) {
      issues.push(mk(m.index!, m[0], 'style', 'CVs use implied first person — drop "I", "my", "me".', []));
    }
    for (const w of WEAK_PHRASES) {
      for (const m of text.matchAll(new RegExp(w.re.source, 'gi'))) issues.push(mk(m.index!, m[0], 'style', w.tip, []));
    }
  }
  for (const c of CLICHES) {
    let i = text.toLowerCase().indexOf(c);
    while (i >= 0) {
      if (!/\w/.test(text[i - 1] ?? ' ') && !/\w/.test(text[i + c.length] ?? ' ')) issues.push(mk(i, text.slice(i, i + c.length), 'style', `"${c}" is a cliché — show it with evidence instead.`, []));
      i = text.toLowerCase().indexOf(c, i + c.length);
    }
  }

  // De-duplicate overlapping issues (keep the first, most specific).
  issues.sort((a, b) => a.offset - b.offset || b.length - a.length);
  const out: GrammarIssue[] = [];
  for (const issue of issues) {
    const last = out[out.length - 1];
    if (last && issue.offset < last.offset + last.length && issue.type === last.type) continue;
    out.push(issue);
  }
  return out;
}

function matchCase(source: string, target: string) {
  if (source === source.toUpperCase() && source.length > 1) return target.toUpperCase();
  if (source[0] === source[0]!.toUpperCase()) return target[0]!.toUpperCase() + target.slice(1);
  return target;
}

export function applyFix(text: string, issue: GrammarIssue, replacement: string) {
  return text.slice(0, issue.offset) + replacement + text.slice(issue.offset + issue.length);
}

/** Collects every text field of a document into checkable chunks with a path back to the field. */
export type TextField = { path: string; label: string; text: string };

export function summarizeIssues(issues: GrammarIssue[]) {
  const by = { spelling: 0, grammar: 0, punctuation: 0, style: 0, clarity: 0 } as Record<IssueType, number>;
  for (const i of issues) by[i.type]++;
  return by;
}
