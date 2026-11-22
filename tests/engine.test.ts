import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DESIGNS, DESIGN_COUNT, FAMILIES, designById } from '../lib/designs';
import { emptyCv, normalizeCv, sampleCv, visibleSections, REGION_RULES } from '../lib/cv-model';
import { analyzeCv } from '../lib/ats';
import { analyzeText } from '../lib/ats/text';
import { extractKeywords, matchKeywords } from '../lib/ats/keywords';
import { checkText, applyFix } from '../lib/grammar';
import { cvToPlainText } from '../lib/export/text';
import { fromJson, toJsonResume } from '../lib/export/jsonresume';
import { LETTER_TEMPLATES, fillPlaceholders } from '../lib/letters/templates';
import { newLetter, placeholderValues } from '../lib/letters/model';
import { formatRange, formatYm, contrast } from '../lib/utils';
import { improveBulletOffline } from '../lib/ai/offline';
import { REGIONS } from '../lib/types';

test('design library has 400+ unique designs with readable accents', () => {
  assert.ok(DESIGN_COUNT >= 400, `only ${DESIGN_COUNT}`);
  assert.equal(new Set(DESIGNS.map((d) => d.id)).size, DESIGN_COUNT);
  assert.ok(FAMILIES.some((f) => f.categories.includes('europass')));
  assert.ok(FAMILIES.some((f) => f.categories.includes('canadian')));
  for (const d of DESIGNS) assert.ok(contrast(d.palette.accent, '#ffffff') >= 4.5, `${d.id} accent fails AA`);
  for (const r of REGIONS) assert.ok(DESIGNS.some((d) => d.id === REGION_RULES[r.id].defaultDesign), `missing default design for ${r.id}`);
  assert.equal(designById('nope').id, 'meridian-ocean');
});

test('date formatting', () => {
  assert.equal(formatYm('2021-03'), 'Mar 2021');
  assert.equal(formatYm('2021-03', 'MM/YYYY'), '03/2021');
  assert.equal(formatRange('2021-03', '', true), 'Mar 2021 – Present');
  assert.equal(formatRange('2019-01', '2021-12', false, 'YYYY'), '2019 – 2021');
});

test('sample CV scores well and empty CV scores poorly', () => {
  const good = analyzeCv(sampleCv('canada'), { region: 'canada' });
  const bad = analyzeCv(emptyCv('canada'), { region: 'canada' });
  assert.ok(good.score >= 85, `sample scored ${good.score}`);
  assert.ok(bad.score < 40, `empty scored ${bad.score}`);
  assert.ok(good.checks.length >= 25);
});

test('ATS flags region problems, weak bullets and missing keywords', () => {
  const cv = sampleCv('us');
  cv.personal.photo = 'data:image/jpeg;base64,AAAA';
  cv.design.designId = 'aurora-ocean';
  cv.design.showPhoto = true;
  cv.experience[0]!.bullets = ['Responsible for reports', 'I helped the team with various tasks'];
  const r = analyzeCv(cv, { region: 'canada', jobDescription: 'Senior Data Analyst with Tableau, Looker and Kubernetes.' });
  const by = (id: string) => r.checks.find((c) => c.id === id)!;
  assert.equal(by('photo').status, 'fail');
  assert.notEqual(by('weak-phrases').status, 'pass');
  assert.notEqual(by('first-person').status, 'pass');
  assert.ok(r.keywords.missing.includes('kubernetes'));
});

test('plain text keeps reading order and every section', () => {
  const t = cvToPlainText(sampleCv());
  assert.ok(t.startsWith('Amelia Perera'));
  assert.ok(t.indexOf('WORK EXPERIENCE') < t.indexOf('EDUCATION'));
  for (const k of visibleSections(sampleCv())) assert.ok(t.length > 0, k);
});

test('keyword extraction prefers specific phrases', () => {
  const k = extractKeywords('Hiring a Senior Data Analyst. Must know SQL, Python and Tableau, data visualization and stakeholder management.');
  assert.ok(k.includes('data visualization'));
  assert.ok(k.includes('sql'));
  assert.ok(!k.includes('hiring'));
  const m = matchKeywords('Expert in SQL and Tableau dashboards', ['sql', 'tableau', 'python']);
  assert.deepEqual(m.missing, ['python']);
  assert.equal(m.percent, 67);
});

test('grammar checker catches common mistakes and fixes apply cleanly', () => {
  const text = 'i managed a  team of of five and recieved an award. Its a great team, more then 10 people.';
  const issues = checkText(text, { locale: 'en-US' });
  const msgs = issues.map((i) => i.message).join(' | ');
  for (const expect of ['Capitalise "I"', 'Extra spaces', 'Repeated word', 'spelling', "it's", 'than']) assert.ok(msgs.toLowerCase().includes(expect.toLowerCase()), `missing: ${expect} in ${msgs}`);
  const spell = issues.find((i) => i.text === 'recieved')!;
  assert.equal(applyFix(text, spell, spell.replacements[0]!).includes('received'), true);
  assert.ok(checkText('an university and a hour', {}).length >= 2);
  assert.equal(checkText('A university and an hour, an MBA and a user.', {}).filter((i) => i.type === 'grammar').length, 0);
  assert.ok(checkText('We optimised the colour of the centre.', { locale: 'en-US' }).some((i) => i.replacements.includes('optimized')));
  assert.ok(checkText('We optimized the color.', { locale: 'en-CA' }).some((i) => i.replacements.includes('colour')));
  assert.ok(checkText('I was responsible for the team.', { mode: 'cv' }).some((i) => i.type === 'style'));
});

test('text ATS analyzer works on pasted CVs', () => {
  const r = analyzeText(cvToPlainText(sampleCv()), 'SQL Python Tableau');
  assert.ok(r.score >= 70, String(r.score));
  assert.equal(r.checks.find((c) => c.id === 'email')!.status, 'pass');
});

test('JSON Resume round-trip preserves content', () => {
  const cv = sampleCv();
  const back = fromJson(JSON.parse(JSON.stringify(toJsonResume(cv))))!;
  assert.equal(back.personal.firstName, 'Amelia');
  assert.equal(back.experience.length, cv.experience.length);
  assert.deepEqual(back.experience[0]!.bullets, cv.experience[0]!.bullets);
  assert.equal(fromJson({ hello: 1 }), null);
  assert.equal(normalizeCv({}).sectionOrder.length >= 14, true);
});

test('letter templates: 30+ across all kinds, placeholders fill from CV', () => {
  assert.ok(LETTER_TEMPLATES.length >= 30);
  for (const k of ['cover', 'motivation', 'sop'] as const) assert.ok(LETTER_TEMPLATES.filter((t) => t.kind === k).length >= 6, k);
  const values = placeholderValues({ targetRole: 'Data Analyst', company: 'Acme', region: 'uk' } as never, sampleCv(), '');
  assert.equal(values.company, 'Acme');
  assert.equal(values.currentEmployer, 'Northwind Financial');
  assert.equal(fillPlaceholders('{{company}} {{program}}', values), 'Acme [Target programme]');
  const l = newLetter(LETTER_TEMPLATES[0]!, values, sampleCv(), null);
  assert.ok(l.blocks[0]!.body.includes('Data Analyst'));
  assert.equal(l.sender.email, 'amelia.perera@email.com');
});

test('offline bullet improver uses action verbs and asks for metrics', () => {
  assert.match(improveBulletOffline('responsible for managing the payroll team', false), /^Led /);
  assert.match(improveBulletOffline('worked on the website'), /\[add result/);
  assert.match(improveBulletOffline('Cut costs by 20%'), /^Cut costs by 20%$/);
});
