import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kvSet } from '../lib/store/kv';
import { moveLocalToCloud } from '../lib/store/migrate-local';
import type { Repo } from '../lib/store/types';
import type { DocumentRecord, Project } from '../lib/types';
import type { TemplateRequest } from '../lib/requests';

test('moves the admin’s local projects, documents and requests into the cloud repo, keeping links', async () => {
  const pid = '11111111-1111-4111-8111-111111111111';
  await kvSet('users', [{ id: 'u_local', email: 'inbox.ashen@gmail.com' }]);
  await kvSet('u:u_local:projects', [{ id: pid, name: 'P' }]);
  await kvSet('u:u_local:docs', [{ id: 'not-a-uuid', projectId: pid, kind: 'cv', title: 'CV', data: {} }, { id: 'orphan', projectId: 'missing', kind: 'cv' }]);
  await kvSet('u:u_local:requests', [{ id: '22222222-2222-4222-8222-222222222222', projectId: pid, clientName: 'Nimal' }]);
  const saved = { projects: [] as Project[], docs: [] as DocumentRecord[], reqs: [] as TemplateRequest[] };
  const repo = {
    saveProject: async (p: Project) => (saved.projects.push(p), p),
    saveDocument: async (d: DocumentRecord) => (saved.docs.push(d), d),
    saveRequest: async (r: TemplateRequest) => (saved.reqs.push(r), r),
  } as unknown as Repo;
  const res = await moveLocalToCloud(repo);
  assert.deepEqual(res, { projects: 1, documents: 1, requests: 1 });
  assert.equal(saved.projects[0]!.id, pid, 'UUID ids are kept so re-running updates instead of duplicating');
  assert.match(saved.docs[0]!.id, /^[0-9a-f-]{36}$/, 'non-UUID ids get a UUID for Postgres');
  assert.equal(saved.docs[0]!.projectId, pid);
  assert.equal(saved.reqs[0]!.projectId, pid);
});
