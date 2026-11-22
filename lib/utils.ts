import type { DateFormat, YearMonth } from './types';

export const uid = (prefix = '') =>
  `${prefix}${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`}`;

export const nowIso = () => new Date().toISOString();

export const clone = <T,>(v: T): T => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

export const filled = (s?: string | null): s is string => Boolean(s && s.trim());

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

export const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Formats a stored "YYYY-MM" / "YYYY" value. Free text is returned unchanged. */
export function formatYm(value: YearMonth, format: DateFormat = 'MMM YYYY'): string {
  if (!value) return '';
  const m = value.match(/^(\d{4})(?:-(\d{1,2}))?$/);
  if (!m) return value;
  const year = m[1];
  const month = m[2] ? Number(m[2]) : 0;
  if (!month || format === 'YYYY') return year;
  if (format === 'MM/YYYY') return `${String(month).padStart(2, '0')}/${year}`;
  if (format === 'MMMM YYYY') return `${MONTHS_LONG[month - 1]} ${year}`;
  return `${MONTHS_SHORT[month - 1]} ${year}`;
}

export function formatRange(start: YearMonth, end: YearMonth, current: boolean, format: DateFormat = 'MMM YYYY') {
  const s = formatYm(start, format);
  const e = current ? 'Present' : formatYm(end, format);
  if (s && e) return s === e ? s : `${s} – ${e}`;
  return s || e;
}

/** Months between two "YYYY-MM" values (end defaults to today). */
export function monthsBetween(start: YearMonth, end?: YearMonth): number | null {
  const parse = (v: string) => {
    const m = v.match(/^(\d{4})(?:-(\d{1,2}))?$/);
    return m ? Number(m[1]) * 12 + (m[2] ? Number(m[2]) - 1 : 0) : null;
  };
  const s = parse(start);
  const now = new Date();
  const e = end ? parse(end) : now.getFullYear() * 12 + now.getMonth();
  if (s === null || e === null) return null;
  return e - s;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

export const displayUrl = (url: string) => url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
export const toHref = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  const d = (...args: A) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  d.flush = () => t && clearTimeout(t);
  return d;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .slice(0, 60) || 'document';

/** Reads an image file and downsizes it (photos stay small in storage). */
export function readImage(file: File, max = 600): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not open that image.'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** WCAG relative-luminance contrast ratio between two hex colours. */
export function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const [r, g, bl] = [0, 2, 4].map((i) => {
      const c = parseInt(full.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1! + 0.05) / (l2! + 0.05);
}

/** Picks black or white text for a background colour. */
export const readableOn = (bg: string) => (contrast(bg, '#ffffff') >= 4.5 ? '#ffffff' : '#0f172a');

export function mix(hex: string, withHex: string, amount: number) {
  const p = (h: string) => {
    const s = h.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  };
  const a = p(hex);
  const b = p(withHex);
  return `#${a.map((v, i) => Math.round(v + (b[i]! - v) * amount).toString(16).padStart(2, '0')).join('')}`;
}
