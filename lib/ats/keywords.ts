/**
 * Pulls the terms a job ad leans on (skills, tools, certifications, two-word
 * phrases) and checks which appear in a CV. ATS keyword ranking works the same
 * basic way: frequent, specific terms from the ad, searched for in the CV text.
 */
const STOP = new Set(
  `a about above across after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each etc few for from further had has have having he her here hers him his how i if in into is it its itself just let may me more most must my no nor not of off on once only or other our ours out over own per please same she should so some such than that the their theirs them then there these they this those through to too under until up upon us very via was we were what when where which while who whom why will with within without would you your yours
  able ability abilities additional apply applicant applicants candidate candidates company role roles position positions job jobs work working works team teams including include includes required requirement requirements require requires preferred plus strong good excellent great new using use used year years day days month months looking seeking join opportunity opportunities responsible responsibilities duties duty ensure ensuring provide providing support supporting related relevant knowledge understanding experience experienced skill skills minimum least well based level high highly key like make making need needs one two three four five full time part salary benefits today ideal ideally successful proven hands-on demonstrated solid fast-paced environment dynamic motivated passionate detail attention oriented player communication written verbal help helping various multiple within across own owning deliver delivering drive driving build building manage managing wide range across world class industry leading competitive offer offers equal employer location remote hybrid office apply now please send resume cv cover letter know knows knowing proficient proficiency familiar familiarity expertise expert advanced basic solid working understand demonstrate demonstrated comfortable needed hold active our hiring hire hires we're were looking candidate ideal must nice bonus etc also able plus years year experience senior junior mid level lead`.split(/\s+/),
);

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' ').trim();

const tokenize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9+#./-]+/)
    .map((t) => t.replace(/^[./-]+|[./-]+$/g, ''))
    .filter((t) => t.length > 1 && !/^\d/.test(t));

export function extractKeywords(jobDescription: string, limit = 28): string[] {
  if (!jobDescription.trim()) return [];
  const counts = new Map<string, number>();
  const bump = (t: string, n = 1) => counts.set(t, (counts.get(t) ?? 0) + n);

  // Named tools and acronyms (Power BI, SQL, IFRS, AWS) weigh extra.
  for (const m of jobDescription.matchAll(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?|[A-Z]{2,}[A-Za-z0-9+#]*|[A-Za-z]+(?:\+\+|#))\b/g)) {
    const t = norm(m[1]!);
    if (t.split(' ').every((w) => !STOP.has(w)) && t.length > 1) bump(t, 0.6);
  }
  for (const segment of jobDescription.split(/[,;:()|\n•·]|\.(?=\s)|\s[-–—]\s/)) {
    const words = tokenize(segment);
    words.forEach((t, i) => {
      if (STOP.has(t)) return;
      bump(t);
      const next = words[i + 1];
      if (next && !STOP.has(next)) bump(`${t} ${next}`, 1.2);
    });
  }
  // Drop single words that only appear inside a stronger phrase.
  const entries = [...counts.entries()].filter(([t, c]) => c >= 1.2 || /[A-Z+#]/.test(t) || t.length > 3);
  const phrases = entries.filter(([t]) => t.includes(' '));
  const ranked = entries
    .filter(([t, c]) => !( !t.includes(' ') && phrases.some(([p, pc]) => p.split(' ').includes(t) && pc >= c * 0.8)))
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([t]) => t);
  const out: string[] = [];
  for (const t of ranked) {
    if (out.includes(t)) continue;
    const isPhrase = t.includes(' ');
    // A single word already covered by a chosen phrase adds nothing.
    if (out.some((o) => new RegExp(`(^|[\\s/])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[\\s/])`).test(o))) continue;
    if (isPhrase) {
      // A phrase replaces a bare word it contains ("data" → "data analyst").
      const words = t.split(' ');
      const i = out.findIndex((o) => !o.includes(' ') && words.includes(o));
      if (i >= 0) {
        out[i] = t;
        // Drop any other bare words the phrase now covers.
        for (let j = out.length - 1; j >= 0; j--) if (j !== i && !out[j]!.includes(' ') && words.includes(out[j]!)) out.splice(j, 1);
        continue;
      }
    }
    out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

const variants = (term: string) => {
  const t = norm(term);
  const v = new Set([t]);
  if (t.endsWith('s')) v.add(t.slice(0, -1));
  else v.add(`${t}s`);
  if (t.endsWith('ing')) v.add(t.slice(0, -3));
  if (t.endsWith('ment')) v.add(t.slice(0, -4));
  v.add(t.replace(/isation|ization/, 'ization')).add(t.replace(/ization/, 'isation'));
  return [...v];
};

export function matchKeywords(cvText: string, keywords: string[]) {
  const hay = ` ${norm(cvText).replace(/[^a-z0-9+#./ -]/g, ' ')} `;
  const matched: string[] = [];
  const missing: string[] = [];
  for (const k of keywords) {
    const hit = variants(k).some((v) => hay.includes(` ${v} `) || hay.includes(` ${v},`) || hay.includes(` ${v}.`));
    (hit ? matched : missing).push(k);
  }
  return { matched, missing, percent: keywords.length ? Math.round((matched.length / keywords.length) * 100) : 0 };
}
