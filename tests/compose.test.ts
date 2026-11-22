import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleCv, emptyCv } from '../lib/cv-model';
import { LETTER_TEMPLATES } from '../lib/letters/templates';
import { newLetter } from '../lib/letters/model';
import { applyComposition, composeLetter, defaultCompose } from '../lib/letters/compose';
import type { LetterData, Project } from '../lib/types';

const project = (over: Partial<Project> = {}) =>
  ({ targetRole: 'Senior Data Analyst', company: 'Shopify', region: 'canada', jobDescription: 'Senior Data Analyst. SQL, Python, Tableau, dbt, Snowflake and stakeholder management.', ...over }) as Project;

const make = (templateId: string, p = project(), cv = sampleCv('canada')): LetterData => {
  const t = LETTER_TEMPLATES.find((x) => x.id === templateId)!;
  const base: LetterData = { ...newLetter(t, {}, cv, p), blocks: [], compose: { ...defaultCompose('cv1'), program: 'MSc in Data Science', why: '', goals: '' } };
  return applyComposition(base, composeLetter(base, cv, p), cv);
};
const text = (l: LetterData) => [l.subject, l.salutation, ...l.blocks.map((b) => b.body), l.closing].filter(Boolean).join('\n');

test('every template composes clean prose from the CV', () => {
  for (const t of LETTER_TEMPLATES) {
    const l = make(t.id, project(t.kind === 'cover' ? {} : { company: 'University of Toronto' }));
    const body = text(l);
    assert.ok(l.blocks.length >= 3, `${t.id}: only ${l.blocks.length} blocks`);
    assert.doesNotMatch(body, /undefined|null|NaN|\{\{|\s{2,}\S|\.\./, `${t.id} has junk:\n${body}`);
    for (const b of l.blocks) assert.match(b.body.trim(), /[.!?\]]$/, `${t.id}: paragraph does not end a sentence: ${b.body}`);
    const brackets = body.match(/\[[^\]]+\]/g) ?? [];
    const allowed = t.id === 'sop-canada-study-plan' ? 2 : t.id === 'cover-referral' ? 2 : t.id === 'motivation-eu-job' ? 1 : 0;
    assert.ok(brackets.length <= allowed, `${t.id} left placeholders: ${brackets.join(', ')}`);
  }
});

test('a cover letter uses the CV: role, employer, top achievement, education, certifications, job keywords', () => {
  const body = text(make('cover-professional'));
  for (const fact of ['Senior Data Analyst', 'Shopify', 'Northwind Financial', '$2.4M', 'Lumen Retail Group', 'University of Colombo', 'SnowPro', 'Snowflake']) assert.ok(body.includes(fact), `missing ${fact}`);
  assert.doesNotMatch(body, /\b(I I|a an|an a)\b/);
});

test('it reacts to CV and job changes, but keeps hand-edited paragraphs', () => {
  const cv = sampleCv('canada');
  let l = make('cover-professional', project(), cv);
  // Hand-edit the opening.
  const opening = l.blocks.find((b) => b.key === 'opening')!;
  l = { ...l, blocks: l.blocks.map((b) => (b === opening ? { ...b, body: 'My own opening.' } : b)), compose: { ...l.compose!, edited: ['opening'] } };
  // CV changes: new current employer.
  cv.experience[0]!.employer = 'Acme Bank';
  const p2 = project({ company: 'Stripe' });
  const next = applyComposition(l, composeLetter(l, cv, p2), cv);
  assert.equal(next.blocks.find((b) => b.key === 'opening')!.body, 'My own opening.');
  assert.ok(text(next).includes('Acme Bank'));
  assert.ok(text(next).includes('Stripe'));
  assert.ok(!text(next).includes('Northwind Financial'));
});

test('tone, length and include switches change the letter', () => {
  const cv = sampleCv('canada');
  const base = make('cover-professional', project(), cv);
  const with_ = (c: Partial<LetterData['compose'] & object>) => {
    const l = { ...base, compose: { ...base.compose!, ...c } } as LetterData;
    return text(applyComposition(l, composeLetter(l, cv, project()), cv));
  };
  assert.ok(with_({ length: 'detailed' }).split(' ').length > with_({ length: 'short' }).split(' ').length + 40);
  assert.notEqual(with_({ tone: 'formal' }), with_({ tone: 'warm' }));
  assert.ok(!with_({ include: { ...base.compose!.include, certifications: false } }).includes('SnowPro'));
  assert.ok(with_({ why: 'I have used Shopify for my own store for years' }).includes('I have used Shopify for my own store for years.'));
});

test('missing facts are reported, never invented', () => {
  const l = make('sop-canada-study-plan', project({ company: 'University of Toronto' }));
  const c = composeLetter(l, sampleCv('canada'), project({ company: 'University of Toronto' }));
  assert.ok(c.missing.some((m) => m.field === 'funding' && m.required));
  assert.ok(c.missing.some((m) => m.field === 'ties' && m.required));
  const empty = composeLetter(make('cover-professional'), null, project());
  assert.ok(empty.missing.some((m) => m.field === 'cvId'));
  // An empty CV still produces a coherent letter without fake achievements.
  const bare = make('cover-professional', project(), emptyCv('canada'));
  assert.doesNotMatch(text(bare), /\$|\d+%/);
});
