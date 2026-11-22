/**
 * Paginates a rendered CV/letter sheet for print.
 *
 * Browsers print full-bleed sheets with @page margin 0 (so coloured sidebars
 * and header bands reach the paper edge), which means continuation pages would
 * start flush against the top edge. This pushes any block that would cross a
 * page boundary onto the next page with a top margin, keeps headings with the
 * content that follows them, and extends the sheet to a whole number of pages
 * so backgrounds fill the last page. The on-screen preview runs the same code,
 * so what you see is exactly what prints.
 */
const LEAVES = [
  '.cv-header',
  '.cv-h',
  '.cv-entry-head',
  '.cv-entry-meta',
  '.cv-entry-gdate',
  '.cv-para',
  '.cv-bullets > li',
  '.cv-simple > li',
  '.cv-skill-group-name',
  '.cv-skill-group > .cv-para',
  '.cv-tags',
  '.cv-columns',
  '.cv-ratings > li',
  '.cv-ref',
  '.cv-cefr',
  '.cv-tiny',
  '.cv-contact-v',
  '.cv-personal-list',
  '.cv-photo-side',
  '.letter-date',
  '.letter-recipient',
  '.letter-subject',
  '.letter-h',
  '.letter-p',
  '.letter-ul > li',
  '.letter-signature',
].join(',');

const KEEP_WITH_NEXT = new Set(['cv-h', 'cv-entry-head', 'cv-skill-group-name', 'letter-h']);

export function paginate(sheet: HTMLElement, pageHeight: number, opts: { top?: number; bottom?: number } = {}) {
  const TOP = opts.top ?? 44;
  const BOTTOM = opts.bottom ?? 40;
  // Reset previous pushes.
  sheet.querySelectorAll<HTMLElement>('[data-pushed]').forEach((el) => {
    el.style.borderTop = '';
    el.style.backgroundClip = '';
    el.style.marginTop = '';
    el.style.breakBefore = '';
    delete el.dataset.pushed;
  });
  sheet.style.minHeight = '';
  // Bottom padding is replaced by the BOTTOM safe zone below (see cv.css).
  sheet.dataset.paginated = '1';
  const rect0 = sheet.getBoundingClientRect();
  const scale = rect0.height / (sheet.offsetHeight || 1) || 1;
  const leaves = Array.from(sheet.querySelectorAll<HTMLElement>(LEAVES)).filter((el) => !el.parentElement?.closest('.cv-header') || el.matches('.cv-header'));

  for (let i = 0; i < leaves.length; i++) {
    const el = leaves[i]!;
    if (el.offsetParent === null) continue;
    const sheetTop = sheet.getBoundingClientRect().top;
    const r = el.getBoundingClientRect();
    const top = (r.top - sheetTop) / scale;
    let bottom = (r.bottom - sheetTop) / scale;
    // Keep headings and entry titles with the first line of what follows them.
    if ([...el.classList].some((c) => KEEP_WITH_NEXT.has(c))) {
      const next = leaves.slice(i + 1).find((n) => n.offsetParent !== null && !n.matches('.cv-entry-meta, .cv-entry-gdate') && el.parentElement?.closest('.cv-main, .cv-side, .cv-body, .letter-body') === n.parentElement?.closest('.cv-main, .cv-side, .cv-body, .letter-body'));
      bottom = next ? Math.max(bottom, (next.getBoundingClientRect().top - sheetTop) / scale + 22) : bottom + 34;
    }
    const page = Math.floor(top / pageHeight);
    const limit = (page + 1) * pageHeight - BOTTOM;
    if (bottom > limit && top > page * pageHeight + TOP + 4) {
      // Headings may draw their own top rule, so their section takes the push instead.
      // On screen: margin + border move the block to TOP px below the page line.
      // In print: break-before starts a new page, cv.css zeroes the margin, and the
      // TOP px transparent border becomes the new page's top space.
      const target = el.matches('.cv-h') && el.parentElement ? el.parentElement : el;
      const push = (page + 1) * pageHeight + TOP - top;
      const margin = parseFloat(getComputedStyle(target).marginTop) || 0;
      target.dataset.pushed = '1';
      target.style.marginTop = `${margin + push - TOP}px`;
      target.style.borderTop = `${TOP}px solid transparent`;
      target.style.backgroundClip = 'padding-box';
      target.style.breakBefore = 'page';
    }
  }
  // Count pages from the last line of text, not the sheet's bottom padding.
  const sheetTop = sheet.getBoundingClientRect().top;
  const lastBottom = leaves.reduce((m, el) => (el.offsetParent === null ? m : Math.max(m, (el.getBoundingClientRect().bottom - sheetTop) / scale)), 0);
  const pages = Math.max(1, Math.ceil((lastBottom + 8) / pageHeight));
  // A hair under whole pages: CSS px → mm rounding must never spill onto a blank extra page.
  sheet.style.minHeight = `${pages * pageHeight - 3}px`;
  return pages;
}
