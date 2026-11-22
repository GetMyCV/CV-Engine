import type { DocumentRecord, Project } from '../types';

export type AuthUser = { id: string; email: string; name: string; mode: 'local' | 'cloud' };

/** Storage for one signed-in user. Every method only ever sees that user's rows. */
export interface Repo {
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  saveProject(project: Project): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  listDocuments(projectId?: string): Promise<DocumentRecord[]>;
  getDocument(id: string): Promise<DocumentRecord | null>;
  saveDocument(doc: DocumentRecord): Promise<DocumentRecord>;
  deleteDocument(id: string): Promise<void>;
}

export interface AuthBackend {
  mode: 'local' | 'cloud';
  current(): Promise<AuthUser | null>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signUp(name: string, email: string, password: string): Promise<AuthUser | { pendingConfirmation: true }>;
  signOut(): Promise<void>;
  resetPassword?(email: string): Promise<void>;
  repo(user: AuthUser): Repo;
  onChange?(cb: (user: AuthUser | null) => void): () => void;
}
