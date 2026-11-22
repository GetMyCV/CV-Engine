import type { DesignCategory } from './designs';
import { DESIGNS } from './designs';
import { nowIso, uid } from './utils';

/**
 * Client template requests.
 *
 * The admin creates a request for a client and sends them a link. The link
 * carries everything the client page needs (name, shortlist, message), so the
 * client page works on a static host with no login. The client's choice comes
 * back as a Selection — saved online (Supabase), emailed (Web3Forms), or as a
 * selection link the admin opens to import it.
 */
export type RequestStatus = 'sent' | 'selected' | 'in-progress' | 'done';

export type Selection = {
  requestId: string;
  designId: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  at: string;
};

export type TemplateRequest = {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  /** Empty = the client may choose from every design. */
  designIds: string[];
  /** Optional starting filter when designIds is empty. */
  category: DesignCategory | 'all';
  message: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  selection: Selection | null;
  /** Project created from the selection, if any. */
  projectId: string | null;
};

export const STATUS_LABEL: Record<RequestStatus, { label: string; className: string }> = {
  sent: { label: 'Waiting for client', className: 'bg-amber-100 text-amber-800' },
  selected: { label: 'Template chosen', className: 'bg-emerald-100 text-emerald-700' },
  'in-progress': { label: 'CV in progress', className: 'bg-blue-100 text-blue-700' },
  done: { label: 'Delivered', className: 'bg-slate-100 text-slate-600' },
};

export function newRequest(init: Partial<TemplateRequest> = {}): TemplateRequest {
  const now = nowIso();
  return { id: uid(), clientName: '', clientEmail: '', clientPhone: '', designIds: [], category: 'all', message: '', status: 'sent', createdAt: now, updatedAt: now, selection: null, projectId: null, ...init };
}

/* ------------------------------------------------------------ encoding */

const b64urlEncode = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const b64urlDecode = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

const VALID = new Set(DESIGNS.map((d) => d.id));
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

/** What the client link carries. Short keys keep URLs small. */
export type RequestLink = { id: string; name: string; designIds: string[]; category: DesignCategory | 'all'; message: string; admin: string };

export function encodeRequestLink(r: TemplateRequest, adminEmail: string): string {
  return b64urlEncode(JSON.stringify({ v: 1, i: r.id, n: r.clientName, d: r.designIds, c: r.category, m: r.message, a: adminEmail }));
}

export function decodeRequestLink(token: string): RequestLink | null {
  try {
    const j = JSON.parse(b64urlDecode(token));
    if (j?.v !== 1 || typeof j.i !== 'string') return null;
    return {
      id: str(j.i, 64),
      name: str(j.n, 120),
      designIds: Array.isArray(j.d) ? j.d.filter((x: unknown) => typeof x === 'string' && VALID.has(x)).slice(0, 500) : [],
      category: typeof j.c === 'string' ? (j.c as RequestLink['category']) : 'all',
      message: str(j.m, 1000),
      admin: str(j.a, 200),
    };
  } catch {
    return null;
  }
}

export const SELECTION_PREFIX = 'CVSEL1.';

export function encodeSelection(s: Selection): string {
  return SELECTION_PREFIX + b64urlEncode(JSON.stringify({ r: s.requestId, d: s.designId, n: s.name, e: s.email, p: s.phone, t: s.notes, at: s.at }));
}

export function decodeSelection(code: string): Selection | null {
  try {
    const raw = code.trim();
    const token = raw.includes(SELECTION_PREFIX) ? raw.slice(raw.indexOf(SELECTION_PREFIX) + SELECTION_PREFIX.length).split(/[\s&#]/)[0]! : raw;
    const j = JSON.parse(b64urlDecode(token));
    if (typeof j?.r !== 'string' || !VALID.has(j.d)) return null;
    return { requestId: str(j.r, 64), designId: j.d, name: str(j.n, 120), email: str(j.e, 200), phone: str(j.p, 60), notes: str(j.t, 2000), at: str(j.at, 40) || nowIso() };
  } catch {
    return null;
  }
}

/** Absolute URL of a page in this app, including the deployment's base path. */
export function appUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return `${typeof window !== 'undefined' ? window.location.origin : ''}${base}${path}`;
}

export const requestLinkUrl = (r: TemplateRequest, adminEmail: string) => appUrl(`/choose/?r=${encodeRequestLink(r, adminEmail)}`);
export const selectionImportUrl = (s: Selection) => appUrl(`/requests/?import=${encodeSelection(s).slice(SELECTION_PREFIX.length)}`);
