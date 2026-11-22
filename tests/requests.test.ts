import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAdminEmail, PRIMARY_ADMIN } from '../lib/admin';
import { decodeRequestLink, decodeSelection, encodeRequestLink, encodeSelection, newRequest, SELECTION_PREFIX } from '../lib/requests';

test('only the administrator email may sign in', () => {
  assert.equal(PRIMARY_ADMIN, 'inbox.ashen@gmail.com');
  assert.ok(isAdminEmail('inbox.ashen@gmail.com'));
  assert.ok(isAdminEmail('  Inbox.Ashen@Gmail.com '));
  assert.ok(!isAdminEmail('someone@gmail.com'));
  assert.ok(!isAdminEmail('inbox.ashen@gmail.com.evil.com'));
  assert.ok(!isAdminEmail(''));
});

test('client links round-trip and drop unknown designs', () => {
  const r = newRequest({ clientName: 'Nimal Perera', designIds: ['aurora-ocean', 'meridian-navy', 'not-a-design'], message: 'Pick one 🙂' });
  const link = decodeRequestLink(encodeRequestLink(r, 'inbox.ashen@gmail.com'))!;
  assert.equal(link.id, r.id);
  assert.equal(link.name, 'Nimal Perera');
  assert.deepEqual(link.designIds, ['aurora-ocean', 'meridian-navy']);
  assert.equal(link.message, 'Pick one 🙂');
  assert.equal(link.admin, 'inbox.ashen@gmail.com');
  assert.equal(decodeRequestLink('garbage'), null);
});

test('selections decode from a code, a bare token or a full import link', () => {
  const sel = { requestId: 'r1', designId: 'aurora-ocean', name: 'Nimal', email: 'n@example.com', phone: '+94 77', notes: 'Blue please', at: '2026-11-22T00:00:00.000Z' };
  const code = encodeSelection(sel);
  assert.ok(code.startsWith(SELECTION_PREFIX));
  assert.deepEqual(decodeSelection(code), sel);
  const token = code.slice(SELECTION_PREFIX.length);
  assert.deepEqual(decodeSelection(token), sel);
  assert.deepEqual(decodeSelection(`see https://getmycv.github.io/CV-Engine/requests/?import=${token}`.replace('?import=', '?import=' + SELECTION_PREFIX).replace(SELECTION_PREFIX + token, code)), sel);
  assert.equal(decodeSelection(encodeSelection({ ...sel, designId: 'fake' })), null);
});
