import type { DocumentRecord, Project } from '../types';
import type { Selection, TemplateRequest } from '../requests';
import { nowIso, uid } from '../utils';
import { kvDel, kvGet, kvSet } from './kv';
import type { AuthBackend, AuthUser, Repo } from './types';

/**
 * Local workspace mode: accounts and their projects live in this browser's
 * IndexedDB. Passwords are salted and hashed (PBKDF2) so profiles on a shared
 * computer are kept apart — but this is profile separation, not server-grade
 * security. Configure Supabase for real multi-device accounts.
 */
type StoredUser = { id: string; email: string; name: string; salt: string; hash: string; createdAt: string };

async function hashPassword(password: string, salt: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 120_000, hash: 'SHA-256' }, key, 256);
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');
}

const toUser = (u: StoredUser): AuthUser => ({ id: u.id, email: u.email, name: u.name, mode: 'local' });

class LocalRepo implements Repo {
  constructor(private userId: string) {}
  private pKey = () => `u:${this.userId}:projects`;
  private dKey = () => `u:${this.userId}:docs`;
  private async projects() {
    return (await kvGet<Project[]>(this.pKey())) ?? [];
  }
  private async docs() {
    return (await kvGet<DocumentRecord[]>(this.dKey())) ?? [];
  }
  async listProjects() {
    return (await this.projects()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async getProject(id: string) {
    return (await this.projects()).find((p) => p.id === id) ?? null;
  }
  async saveProject(project: Project) {
    const all = await this.projects();
    const next = { ...project, ownerId: this.userId, updatedAt: nowIso() };
    const i = all.findIndex((p) => p.id === project.id);
    if (i >= 0) all[i] = next;
    else all.push(next);
    await kvSet(this.pKey(), all);
    return next;
  }
  async deleteProject(id: string) {
    await kvSet(this.pKey(), (await this.projects()).filter((p) => p.id !== id));
    await kvSet(this.dKey(), (await this.docs()).filter((d) => d.projectId !== id));
  }
  async listDocuments(projectId?: string) {
    const all = await this.docs();
    return (projectId ? all.filter((d) => d.projectId === projectId) : all).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async getDocument(id: string) {
    return (await this.docs()).find((d) => d.id === id) ?? null;
  }
  async saveDocument(doc: DocumentRecord) {
    const all = await this.docs();
    const next = { ...doc, ownerId: this.userId, updatedAt: nowIso() };
    const i = all.findIndex((d) => d.id === doc.id);
    if (i >= 0) all[i] = next;
    else all.push(next);
    await kvSet(this.dKey(), all);
    // Touch the project so it sorts to the top of the dashboard.
    const projects = await this.projects();
    const p = projects.find((x) => x.id === doc.projectId);
    if (p) {
      p.updatedAt = next.updatedAt;
      await kvSet(this.pKey(), projects);
    }
    return next;
  }
  async deleteDocument(id: string) {
    await kvSet(this.dKey(), (await this.docs()).filter((d) => d.id !== id));
  }
  private rKey = () => `u:${this.userId}:requests`;
  async listRequests() {
    return ((await kvGet<TemplateRequest[]>(this.rKey())) ?? []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async saveRequest(r: TemplateRequest) {
    const all = (await kvGet<TemplateRequest[]>(this.rKey())) ?? [];
    const next = { ...r, updatedAt: nowIso() };
    const i = all.findIndex((x) => x.id === r.id);
    if (i >= 0) all[i] = next;
    else all.push(next);
    await kvSet(this.rKey(), all);
    return next;
  }
  async deleteRequest(id: string) {
    await kvSet(this.rKey(), ((await kvGet<TemplateRequest[]>(this.rKey())) ?? []).filter((r) => r.id !== id));
  }
  async listSubmittedSelections(): Promise<Selection[]> {
    return [];
  }
}

export const localAuth: AuthBackend = {
  mode: 'local',
  async current() {
    const id = await kvGet<string>('session');
    if (!id) return null;
    const user = ((await kvGet<StoredUser[]>('users')) ?? []).find((u) => u.id === id);
    return user ? toUser(user) : null;
  },
  async signIn(email, password) {
    const users = (await kvGet<StoredUser[]>('users')) ?? [];
    const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || (await hashPassword(password, user.salt)) !== user.hash) throw new Error('Email or password is incorrect.');
    await kvSet('session', user.id);
    return toUser(user);
  },
  async signUp(name, email, password) {
    const users = (await kvGet<StoredUser[]>('users')) ?? [];
    const clean = email.trim().toLowerCase();
    if (users.some((u) => u.email === clean)) throw new Error('An account with this email already exists on this device. Sign in instead.');
    const salt = uid();
    const user: StoredUser = { id: uid('u_'), email: clean, name: name.trim(), salt, hash: await hashPassword(password, salt), createdAt: nowIso() };
    await kvSet('users', [...users, user]);
    await kvSet('session', user.id);
    return toUser(user);
  },
  async signOut() {
    await kvDel('session');
  },
  repo(user) {
    return new LocalRepo(user.id);
  },
};
