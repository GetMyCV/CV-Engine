import { SECTIONS } from '../cv-model';
import { checkText } from '../grammar';
import { wordCount } from '../utils';
import type { AtsCheck } from './index';
import { extractKeywords, matchKeywords } from './keywords';
import { ACTION_VERB_SET, CLICHES, FIRST_PERSON, QUANTIFIED, WEAK_PHRASES } from './vocab';

/**
 * ATS check for a CV pasted as plain text (e.g. copied out of an existing PDF
 * or Word file). Copy-pasting from a PDF is itself a good test: if the text
 * comes out jumbled, an ATS will see the same jumble.
 */
export function analyzeText(text: string, jobDescription = '') {
  const checks: AtsCheck[] = [];
  const add = (c: Omit<AtsCheck, 'category'> & { category?: AtsCheck['category'] }) => checks.push({ category: 'Content quality', ...c });
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const words = wordCount(text);

  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phone = text.match(/\+?\d[\d\s().-]{7,}\d/);
  const linkedin = /linkedin\.com\/in\//i.test(text);
  add({ id: 'email', category: 'Contact & header', label: 'Email found', status: email ? 'pass' : 'fail', detail: email ? email[0] : 'No email address detected.', weight: 6 });
  add({ id: 'phone', category: 'Contact & header', label: 'Phone found', status: phone ? 'pass' : 'fail', detail: phone ? phone[0] : 'No phone number detected.', weight: 4 });
  add({ id: 'linkedin', category: 'Contact & header', label: 'LinkedIn URL', status: linkedin ? 'pass' : 'warn', detail: linkedin ? 'Found.' : 'Add your linkedin.com/in/ URL.', weight: 2 });
  add({ id: 'name', category: 'Contact & header', label: 'Name on the first line', status: lines[0] && lines[0].split(/\s+/).length <= 5 && !/@|\d/.test(lines[0]) ? 'pass' : 'warn', detail: lines[0] ? `First line: “${lines[0].slice(0, 60)}”` : 'Empty.', weight: 4 });

  for (const s of SECTIONS.filter((x) => ['summary', 'experience', 'education', 'skills'].includes(x.key))) {
    const found = lines.some((l) => l.length < 40 && s.atsTitles.some((t) => l.toLowerCase().replace(/[:\s]+$/, '') === t.toLowerCase()) );
    const loose = lines.some((l) => l.length < 40 && new RegExp(`\\b(${s.atsTitles.join('|')})\\b`, 'i').test(l));
    add({ id: `sec-${s.key}`, category: 'Structure & sections', label: `“${s.title}” heading`, status: found ? 'pass' : loose ? 'warn' : s.key === 'summary' ? 'warn' : 'fail', detail: found ? 'Recognised.' : loose ? 'Found, but with a non-standard wording.' : `Not found — use a standard heading such as “${s.atsTitles[0]}”.`, weight: s.key === 'summary' ? 3 : 6 });
  }

  const bullets = lines.filter((l) => /^[•\-–*▪●◦]/.test(l) || (l.length > 40 && /^[A-Z][a-z]+ed\b/.test(l)));
  const clean = bullets.map((b) => b.replace(/^[•\-–*▪●◦]\s*/, ''));
  const verbs = clean.filter((b) => ACTION_VERB_SET.has(b.split(/\s+/)[0]!.toLowerCase()) || /^[A-Z][a-z]+ed\b/.test(b));
  const q = clean.filter((b) => QUANTIFIED.test(b));
  add({ id: 'verbs', label: 'Bullets start with action verbs', status: !clean.length ? 'info' : verbs.length / clean.length >= 0.8 ? 'pass' : verbs.length / clean.length >= 0.5 ? 'warn' : 'fail', detail: clean.length ? `${verbs.length} of ${clean.length} bullets.` : 'No bullet points detected.', weight: clean.length ? 5 : 0 });
  add({ id: 'quant', label: 'Quantified achievements (40%+)', status: !clean.length ? 'info' : q.length / clean.length >= 0.4 ? 'pass' : q.length / clean.length >= 0.2 ? 'warn' : 'fail', detail: clean.length ? `${q.length} of ${clean.length} bullets include a number.` : '—', weight: clean.length ? 6 : 0 });
  const fp = lines.filter((l) => FIRST_PERSON.test(l)).length;
  add({ id: 'fp', label: 'No first-person pronouns', status: fp ? 'warn' : 'pass', detail: fp ? `${fp} line(s) use I/my/me.` : 'None found.', weight: 3 });
  const weak = WEAK_PHRASES.filter((w) => w.re.test(text));
  add({ id: 'weak', label: 'No weak phrases', status: weak.length ? 'warn' : 'pass', detail: weak.length ? weak.map((w) => w.tip).join(' ') : 'None found.', weight: 3 });
  const cl = CLICHES.filter((c) => text.toLowerCase().includes(c));
  add({ id: 'cliche', label: 'No clichés', status: cl.length ? 'warn' : 'pass', detail: cl.length ? cl.join(', ') : 'None found.', weight: 2 });
  add({ id: 'length', category: 'Length & format', label: 'Length (350–1,100 words)', status: words < 250 || words > 1400 ? 'warn' : 'pass', detail: `${words} words (≈${Math.max(1, Math.ceil(words / 520))} page${words > 520 ? 's' : ''}).`, weight: 3 });
  const dates = text.match(/\b(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{1,2}\/\d{4}|\d{4})\b/gi) ?? [];
  const styles = new Set(dates.map((d) => (/\//.test(d) ? 'numeric' : /^\d{4}$/.test(d) ? 'year' : 'month')));
  add({ id: 'dates', category: 'Structure & sections', label: 'Consistent date format', status: dates.length === 0 ? 'warn' : styles.size <= 2 && !(styles.has('numeric') && styles.has('month')) ? 'pass' : 'warn', detail: dates.length ? `Formats used: ${[...styles].join(', ')}.` : 'No dates found — every role needs dates.', weight: 3 });
  const weird = (text.match(/[-�]|(?:\b\w\b\s){6,}/g) ?? []).length;
  add({ id: 'parse', category: 'Length & format', label: 'Text extracted cleanly', status: weird ? 'fail' : 'pass', detail: weird ? 'Garbled characters or letter-spaced text found — the file likely uses icons fonts, text boxes or columns that break parsing.' : 'No garbled characters — the text layer looks clean.', weight: 5 });
  const grammar = checkText(text, { mode: 'cv' }).filter((i) => i.type === 'spelling' || i.type === 'grammar');
  add({ id: 'grammar', label: 'Spelling & grammar', status: grammar.length === 0 ? 'pass' : grammar.length <= 3 ? 'warn' : 'fail', detail: grammar.length ? `${grammar.length} possible issue(s): ${grammar.slice(0, 4).map((g) => `“${g.text}”`).join(', ')}` : 'No obvious errors.', weight: 4 });

  const all = extractKeywords(jobDescription);
  const kw = matchKeywords(text, all);
  if (all.length) add({ id: 'kw', category: 'Keywords & targeting', label: 'Job-ad keyword match (60%+)', status: kw.percent >= 60 ? 'pass' : kw.percent >= 40 ? 'warn' : 'fail', detail: `${kw.percent}% matched.`, weight: 10 });

  const scored = checks.filter((c) => c.weight > 0 && c.status !== 'info');
  const total = scored.reduce((s, c) => s + c.weight, 0);
  const earned = scored.reduce((s, c) => s + c.weight * (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0), 0);
  return { score: total ? Math.round((earned / total) * 100) : 0, checks, keywords: { ...kw, all }, words };
}
