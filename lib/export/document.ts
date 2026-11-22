import type { DocumentRecord } from '../types';
import { nowIso } from '../utils';

/**
 * CV Engine's own JSON format for a single document: every field, the design
 * settings and section order, so a re-import reproduces the document exactly.
 * (JSON Resume export is also available for moving to other tools.)
 */
export type CvEngineDocumentFile = {
  app: 'cv-engine';
  format: 'cv-engine-document';
  version: 1;
  kind: DocumentRecord['kind'];
  title: string;
  exportedAt: string;
  data: unknown;
};

export function toDocumentFile(doc: Pick<DocumentRecord, 'kind' | 'title' | 'data'>): CvEngineDocumentFile {
  return { app: 'cv-engine', format: 'cv-engine-document', version: 1, kind: doc.kind, title: doc.title, exportedAt: nowIso(), data: doc.data };
}

export function isDocumentFile(raw: unknown): raw is CvEngineDocumentFile {
  const j = raw as Partial<CvEngineDocumentFile> | null;
  return Boolean(j && j.app === 'cv-engine' && j.format === 'cv-engine-document' && j.kind && j.data && typeof j.data === 'object');
}
