import type { CvData } from '../types';
import type { AtsCheck } from './index';
import { fromJson } from '../export/jsonresume';
import { isDocumentFile } from '../export/document';

/**
 * Reads an uploaded CV the way an applicant tracking system would: it pulls
 * out the text layer (PDF via pdf.js, Word via mammoth) in reading order and
 * records file-level problems ATS commonly trip on — scanned images with no
 * text, tables, embedded images, very large files. Everything runs in the
 * browser; the file never leaves the user's device.
 */
export type UploadedCv = {
  fileName: string;
  kind: 'pdf' | 'docx' | 'txt' | 'json';
  text: string;
  /** Set for JSON uploads (CV Engine or JSON Resume): enables the full structured check. */
  cv: CvData | null;
  pages: number | null;
  fileChecks: AtsCheck[];
};

export const ACCEPTED = '.pdf,.docx,.txt,.json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/json';
const MAX_BYTES = 15 * 1024 * 1024;

const check = (id: string, label: string, status: AtsCheck['status'], detail: string, weight = 4): AtsCheck => ({ id, category: 'Length & format', label, status, detail, weight });

export async function readCvFile(file: File): Promise<UploadedCv> {
  if (file.size > MAX_BYTES) throw new Error('That file is over 15 MB. CVs should be well under 2 MB.');
  const name = file.name.toLowerCase();
  const kind: UploadedCv['kind'] | null = name.endsWith('.pdf') || file.type === 'application/pdf' ? 'pdf' : name.endsWith('.docx') ? 'docx' : name.endsWith('.json') ? 'json' : name.endsWith('.txt') || file.type === 'text/plain' ? 'txt' : null;
  if (!kind) {
    if (name.endsWith('.doc')) throw new Error('Old .doc files cannot be read in the browser — save it as .docx or PDF and try again.');
    throw new Error('Upload a PDF, Word (.docx), text (.txt) or JSON file.');
  }

  const sizeCheck = check('file-size', 'File size under 2 MB', file.size <= 2 * 1024 * 1024 ? 'pass' : 'warn', `${(file.size / 1024).toFixed(0)} KB${file.size > 2 * 1024 * 1024 ? ' — many portals reject files over 2–5 MB. Compress images or remove them.' : '.'}`, 2);
  const nameCheck = check('file-name', 'Professional file name', /cv|resume|résumé/i.test(file.name) && !/final|v\d|copy|untitled|document\d*/i.test(file.name) ? 'pass' : 'warn', /cv|resume|résumé/i.test(file.name) ? `“${file.name}”.` : `“${file.name}” — rename it to Firstname-Lastname-CV.${kind}.`, 1);

  if (kind === 'json') {
    const raw = JSON.parse(await file.text());
    const cv = fromJson(raw);
    if (!cv) throw new Error(isDocumentFile(raw) ? 'This CV Engine file is a letter or LinkedIn kit, not a CV.' : 'This JSON is not a CV Engine CV or a JSON Resume file.');
    const { cvToPlainText } = await import('../export/text');
    return { fileName: file.name, kind, text: cvToPlainText(cv), cv, pages: null, fileChecks: [sizeCheck] };
  }

  if (kind === 'txt') {
    return { fileName: file.name, kind, text: await file.text(), cv: null, pages: null, fileChecks: [sizeCheck, check('file-type', 'File type', 'info', 'Plain text has no formatting to break, but most employers expect a PDF or .docx upload.', 0)] };
  }

  if (kind === 'docx') {
    const mammoth = await import('mammoth');
    const buf = await file.arrayBuffer();
    // mammoth's browser build takes an ArrayBuffer; its Node build (tests) takes a Buffer.
    const input = typeof window === 'undefined' ? { buffer: Buffer.from(buf) } : { arrayBuffer: buf };
    const [raw, html] = await Promise.all([mammoth.extractRawText(input), mammoth.convertToHtml(input)]);
    const text = raw.value.replace(/\n{3,}/g, '\n\n').trim();
    const tables = (html.value.match(/<table/g) ?? []).length;
    const images = (html.value.match(/<img/g) ?? []).length;
    return {
      fileName: file.name,
      kind,
      text,
      cv: null,
      pages: null,
      fileChecks: [
        check('file-type', 'ATS-readable file type', 'pass', 'Word .docx is accepted by every major ATS.', 3),
        check('text-layer', 'Text can be extracted', text.length > 200 ? 'pass' : 'fail', text.length > 200 ? `${text.length.toLocaleString()} characters extracted.` : 'Almost no text found — the content may be in text boxes, shapes or images, which most ATS skip.', 8),
        check('tables', 'No layout tables', tables === 0 ? 'pass' : 'warn', tables ? `${tables} table(s) found. Older ATS read tables cell by cell and scramble the order — use plain paragraphs and tab stops instead.` : 'No tables.', 4),
        check('images', 'No images carrying information', images === 0 ? 'pass' : 'warn', images ? `${images} image(s) found. ATS ignore images — make sure no contact details, skills or logos-with-text are only in images.` : 'No images.', 2),
        check('header-footer', 'Contact details in the body', 'info', 'Some ATS skip Word headers and footers — keep your name and contact details in the main body.', 0),
        sizeCheck,
        nameCheck,
      ],
    };
  }

  // PDF
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const lines: string[] = [];
  let images = 0;
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    let line = '';
    let lastY: number | null = null;
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const y = item.transform[5] as number;
      if (lastY !== null && Math.abs(y - lastY) > 2 && line.trim()) {
        lines.push(line.trim());
        line = '';
      }
      line += item.str;
      lastY = y;
      // pdf.js also emits empty end-of-line items; only real text makes a line.
      if (item.hasEOL && line.trim()) {
        lines.push(line.trim());
        line = '';
        lastY = null;
      }
    }
    if (line.trim()) lines.push(line.trim());
    lines.push('');
    const ops = await page.getOperatorList();
    images += ops.fnArray.filter((fn) => fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintInlineImageXObject).length;
  }
  const text = lines.join('\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const chars = text.replace(/\s/g, '').length;
  const pages = pdf.numPages;
  const perPage = chars / pages;
  return {
    fileName: file.name,
    kind,
    text,
    cv: null,
    pages,
    fileChecks: [
      check('file-type', 'ATS-readable file type', 'pass', 'PDF with a text layer is accepted by modern ATS.', 3),
      check('text-layer', 'Real, selectable text (not a scanned image)', perPage > 300 ? 'pass' : perPage > 40 ? 'warn' : 'fail', perPage > 300 ? `${chars.toLocaleString()} characters extracted from ${pages} page(s).` : 'Little or no text could be extracted — this looks like a scanned or image-based PDF. An ATS will see a blank CV. Export it again from Word or CV Engine.', 10),
      check('pages', 'Page count', pages <= 2 ? 'pass' : 'warn', `${pages} page(s). ${pages > 2 ? 'Most roles expect 1–2 pages (academic CVs excepted).' : ''}`.trim(), 3),
      check('images', 'Few images', images <= 1 ? 'pass' : 'warn', images <= 1 ? `${images} image(s).` : `${images} images — icons, charts and skill graphics are invisible to ATS. Make sure all information is also in text.`, 2),
      sizeCheck,
      nameCheck,
    ],
  };
}
