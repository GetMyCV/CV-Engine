import type { DocumentRecord, Project } from '../types';
import type { TemplateRequest } from '../requests';
import { isAdminEmail } from '../admin';
import { kvGet } from './kv';
import type { Repo } from './types';

/**
 * Moves everything the admin created in browser-only (local workspace) mode
 * into the cloud account. Local data lives in this browser's IndexedDB under
 * the same site, so it is still readable after the site switches to Supabase.
 * Ids are kept, so running it twice updates rather than duplicates.
 */
type LocalUser = { id: string; email: string };

export async function findLocalWorkspace() {
  const users = (await kvGet<LocalUser[]>('users')) ?? [];
  const user = users.find((u) => isAdminEmail(u.email)) ?? users[0];
  if (!user) return null;
  const projects = (await kvGet<Project[]>(`u:${user.id}:projects`)) ?? [];
  const documents = (await kvGet<DocumentRecord[]>(`u:${user.id}:docs`)) ?? [];
  const requests = (await kvGet<TemplateRequest[]>(`u:${user.id}:requests`)) ?? [];
  return { email: user.email, projects, documents, requests };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function moveLocalToCloud(repo: Repo, onProgress?: (done: number, total: number) => void) {
  const ws = await findLocalWorkspace();
  if (!ws) return { projects: 0, documents: 0, requests: 0 };
  const total = ws.projects.length + ws.documents.length + ws.requests.length;
  let done = 0;
  const tick = () => onProgress?.(++done, total);
  const ids = new Map<string, string>();
  const fresh = (id: string) => (UUID.test(id) ? id : crypto.randomUUID());
  for (const p of ws.projects) {
    const id = fresh(p.id);
    ids.set(p.id, id);
    await repo.saveProject({ ...p, id });
    tick();
  }
  let documents = 0;
  for (const d of ws.documents) {
    const projectId = ids.get(d.projectId);
    if (projectId) {
      await repo.saveDocument({ ...d, id: fresh(d.id), projectId });
      documents++;
    }
    tick();
  }
  for (const r of ws.requests) {
    await repo.saveRequest({ ...r, id: fresh(r.id), projectId: r.projectId ? (ids.get(r.projectId) ?? null) : null });
    tick();
  }
  return { projects: ws.projects.length, documents, requests: ws.requests.length };
}
