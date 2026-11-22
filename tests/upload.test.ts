import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCv, sampleCv } from '../lib/cv-model';
import { toDocumentFile, isDocumentFile } from '../lib/export/document';
import { fromJson, toJsonResume } from '../lib/export/jsonresume';
import { readCvFile } from '../lib/ats/upload';
import { cvToDocx } from '../lib/export/docx';

const asFile = (body: BlobPart, name: string, type = '') => new File([body], name, { type });

test('CV Engine JSON export round-trips every field, including design', () => {
  const cv = sampleCv('canada');
  cv.design.designId = 'aurora-ocean';
  cv.design.accent = '#123456';
  const file = JSON.parse(JSON.stringify(toDocumentFile({ kind: 'cv', title: 'My CV', data: cv })));
  assert.ok(isDocumentFile(file));
  assert.equal(file.format, 'cv-engine-document');
  assert.deepEqual(fromJson(file), normalizeCv(cv));
  assert.equal(fromJson(file)!.design.accent, '#123456');
  // Letters are not CVs.
  assert.equal(fromJson(toDocumentFile({ kind: 'cover', title: 'L', data: { blocks: [] } })), null);
});

test('ATS upload: JSON files get the full structured check', async () => {
  const up = await readCvFile(asFile(JSON.stringify(toDocumentFile({ kind: 'cv', title: 'x', data: sampleCv() })), 'Amelia-Perera-CV.json', 'application/json'));
  assert.equal(up.kind, 'json');
  assert.ok(up.cv);
  assert.ok(up.text.startsWith('Amelia Perera'));
  const jr = await readCvFile(asFile(JSON.stringify(toJsonResume(sampleCv())), 'resume.json'));
  assert.equal(jr.cv?.personal.lastName, 'Perera');
});

test('ATS upload: reads text out of a Word file', async () => {
  const blob = await cvToDocx(sampleCv());
  const up = await readCvFile(asFile(await blob.arrayBuffer(), 'Amelia-Perera-CV.docx'));
  assert.equal(up.kind, 'docx');
  assert.match(up.text, /Amelia Perera/);
  assert.match(up.text, /Northwind Financial/);
  assert.equal(up.fileChecks.find((c) => c.id === 'text-layer')?.status, 'pass');
  assert.equal(up.fileChecks.find((c) => c.id === 'file-name')?.status, 'pass');
});

test('ATS upload: rejects unsupported files with a helpful message', async () => {
  await assert.rejects(readCvFile(asFile('x', 'cv.doc')), /\.docx or PDF/);
  await assert.rejects(readCvFile(asFile('x', 'cv.png', 'image/png')), /PDF, Word/);
  await assert.rejects(readCvFile(asFile('{"hello":1}', 'cv.json')), /not a CV Engine CV or a JSON Resume/);
});
