import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DocumentRecord, Project } from '../types';
import { nowIso } from '../utils';
import type { AuthBackend, AuthUser, Repo } from './types';

/**
 * Cloud mode: Supabase Auth for accounts, Postgres for storage. Row Level
 * Security (supabase/migrations/0001_init.sql) restricts every row to its
 * owner, so the browser can talk to the database directly and safely.
 */
let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}

type ProjectRow = {
  id: string;
  owner_id: string;
  name: string;
  target_role: string;
  company: string;
  region: Project['region'];
  job_description: string;
  notes: string;
  status: Project['status'];
  color: string;
  created_at: string;
  updated_at: string;
};
type DocRow = {
  id: string;
  project_id: string;
  owner_id: string;
  kind: DocumentRecord['kind'];
  title: string;
  data: unknown;
  versions: DocumentRecord['versions'];
  created_at: string;
  updated_at: string;
};

const fromProject = (r: ProjectRow): Project => ({
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  targetRole: r.target_role,
  company: r.company,
  region: r.region,
  jobDescription: r.job_description,
  notes: r.notes,
  status: r.status,
  color: r.color,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
const toProject = (p: Project, owner: string): ProjectRow => ({
  id: p.id,
  owner_id: owner,
  name: p.name,
  target_role: p.targetRole,
  company: p.company,
  region: p.region,
  job_description: p.jobDescription,
  notes: p.notes,
  status: p.status,
  color: p.color,
  created_at: p.createdAt,
  updated_at: nowIso(),
});
const fromDoc = (r: DocRow): DocumentRecord => ({
  id: r.id,
  projectId: r.project_id,
  ownerId: r.owner_id,
  kind: r.kind,
  title: r.title,
  data: r.data,
  versions: r.versions ?? [],
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
const toDoc = (d: DocumentRecord, owner: string): DocRow => ({
  id: d.id,
  project_id: d.projectId,
  owner_id: owner,
  kind: d.kind,
  title: d.title,
  data: d.data,
  versions: d.versions,
  created_at: d.createdAt,
  updated_at: nowIso(),
});

const check = <T,>(res: { data: T; error: { message: string } | null }) => {
  if (res.error) throw new Error(res.error.message);
  return res.data;
};

class SupabaseRepo implements Repo {
  constructor(private userId: string) {}
  async listProjects() {
    const rows = check(await supabase().from('projects').select('*').order('updated_at', { ascending: false }));
    return (rows as ProjectRow[]).map(fromProject);
  }
  async getProject(id: string) {
    const row = check(await supabase().from('projects').select('*').eq('id', id).maybeSingle());
    return row ? fromProject(row as ProjectRow) : null;
  }
  async saveProject(p: Project) {
    const row = check(await supabase().from('projects').upsert(toProject(p, this.userId)).select().single());
    return fromProject(row as ProjectRow);
  }
  async deleteProject(id: string) {
    check(await supabase().from('projects').delete().eq('id', id));
  }
  async listDocuments(projectId?: string) {
    let q = supabase().from('documents').select('*').order('updated_at', { ascending: false });
    if (projectId) q = q.eq('project_id', projectId);
    return (check(await q) as DocRow[]).map(fromDoc);
  }
  async getDocument(id: string) {
    const row = check(await supabase().from('documents').select('*').eq('id', id).maybeSingle());
    return row ? fromDoc(row as DocRow) : null;
  }
  async saveDocument(d: DocumentRecord) {
    const row = check(await supabase().from('documents').upsert(toDoc(d, this.userId)).select().single());
    await supabase().from('projects').update({ updated_at: nowIso() }).eq('id', d.projectId);
    return fromDoc(row as DocRow);
  }
  async deleteDocument(id: string) {
    check(await supabase().from('documents').delete().eq('id', id));
  }
}

const toUser = (u: { id: string; email?: string; user_metadata?: Record<string, unknown> }): AuthUser => ({
  id: u.id,
  email: u.email ?? '',
  name: (u.user_metadata?.name as string) || (u.email ?? '').split('@')[0] || 'You',
  mode: 'cloud',
});

export const supabaseAuth: AuthBackend = {
  mode: 'cloud',
  async current() {
    const { data } = await supabase().auth.getSession();
    return data.session?.user ? toUser(data.session.user) : null;
  },
  async signIn(email, password) {
    const { data, error } = await supabase().auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return toUser(data.user);
  },
  async signUp(name, email, password) {
    const { data, error } = await supabase().auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/dashboard` : undefined },
    });
    if (error) throw new Error(error.message);
    if (!data.session || !data.user) return { pendingConfirmation: true };
    return toUser(data.user);
  },
  async signOut() {
    await supabase().auth.signOut();
  },
  async resetPassword(email) {
    const { error } = await supabase().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/login` });
    if (error) throw new Error(error.message);
  },
  repo(user) {
    return new SupabaseRepo(user.id);
  },
  onChange(cb) {
    const { data } = supabase().auth.onAuthStateChange((_e, session) => cb(session?.user ? toUser(session.user) : null));
    return () => data.subscription.unsubscribe();
  },
};
