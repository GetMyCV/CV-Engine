import type { CvData, DocKind, DocumentRecord, Project, ProjectStatus, Region } from './types';
import { nowIso, uid } from './utils';

export const STATUSES: { id: ProjectStatus; label: string; className: string }[] = [
  { id: 'draft', label: 'Drafting', className: 'bg-slate-100 text-slate-700' },
  { id: 'applied', label: 'Applied', className: 'bg-blue-100 text-blue-700' },
  { id: 'interview', label: 'Interviewing', className: 'bg-amber-100 text-amber-800' },
  { id: 'offer', label: 'Offer', className: 'bg-emerald-100 text-emerald-700' },
  { id: 'rejected', label: 'Not selected', className: 'bg-rose-100 text-rose-700' },
  { id: 'archived', label: 'Archived', className: 'bg-slate-100 text-slate-500' },
];

export const PROJECT_COLORS = ['#2563EB', '#0F766E', '#7C3AED', '#DB2777', '#EA580C', '#16A34A', '#0891B2', '#CA8A04', '#475569'];

export function newProject(ownerId: string, init: Partial<Project> = {}): Project {
  const now = nowIso();
  return {
    id: uid(),
    ownerId,
    name: init.name || 'Untitled project',
    targetRole: '',
    company: '',
    region: 'international' as Region,
    jobDescription: '',
    notes: '',
    status: 'draft',
    color: PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]!,
    createdAt: now,
    updatedAt: now,
    ...init,
  };
}

export function newDocument<T>(project: Project, kind: DocKind, title: string, data: T): DocumentRecord<T> {
  const now = nowIso();
  return { id: uid(), projectId: project.id, ownerId: project.ownerId, kind, title, data, createdAt: now, updatedAt: now, versions: [] };
}

export const docHref = (d: Pick<DocumentRecord, 'id' | 'kind' | 'projectId'>) =>
  `/edit/${d.kind === 'cv' ? 'cv' : d.kind === 'linkedin' ? 'linkedin' : 'letter'}?doc=${d.id}`;

/** Adds a snapshot, newest first, capped at 20. */
export function withVersion<T>(doc: DocumentRecord<T>, label: string): DocumentRecord<T> {
  return { ...doc, versions: [{ at: nowIso(), label, data: structuredClone(doc.data) }, ...doc.versions].slice(0, 20) };
}

export const firstCv = (docs: DocumentRecord[]) => docs.find((d) => d.kind === 'cv') as DocumentRecord<CvData> | undefined;
