import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TabStopType, TextRun, WidthType } from 'docx';
import type { CvData, LetterData } from '../types';
import { fullName, sectionTitle, visibleSections } from '../cv-model';
import { designById, themeFor } from '../designs';
import { displayUrl, filled, formatRange, formatYm } from '../utils';

/**
 * Editable Word exports. Deliberately single-column with real Word headings
 * and bullet lists and no text boxes: the most reliable .docx shape for ATS
 * uploads and for recruiters who edit CVs in Word. (Loaded on demand.)
 */
const PAGE = {
  A4: { width: 11906, height: 16838 },
  Letter: { width: 12240, height: 15840 },
};

export async function cvToDocx(cv: CvData): Promise<Blob> {
  const design = designById(cv.design.designId);
  const accent = themeFor(design, cv.design.accent).accent.replace('#', '').toUpperCase();
  const font = design.family.font === 'georgia' || design.family.font === 'garamond' || design.family.font.includes('serif') || design.family.font === 'merriweather' || design.family.font === 'lora-inter' ? 'Georgia' : 'Calibri';
  const fmt = cv.design.dateFormat;
  const p = cv.personal;
  const children: (Paragraph | Table)[] = [];
  const right = cv.design.pageSize === 'Letter' ? 10080 : 9638;

  const heading = (text: string) =>
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 80 },
        border: { bottom: { color: accent, space: 2, style: BorderStyle.SINGLE, size: 8 } },
        children: [new TextRun({ text: text.toUpperCase(), bold: true, color: accent, size: 22, font })],
      }),
    );
  const para = (text: string, opts: { italics?: boolean; color?: string; after?: number } = {}) =>
    children.push(new Paragraph({ spacing: { after: opts.after ?? 60 }, children: [new TextRun({ text, italics: opts.italics, color: opts.color, font, size: 21 })] }));
  const bullet = (text: string) => children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 30 }, children: [new TextRun({ text, font, size: 21 })] }));
  const entry = (title: string, org: string, dates: string, meta?: string) => {
    children.push(
      new Paragraph({
        spacing: { before: 120, after: 20 },
        tabStops: [{ type: TabStopType.RIGHT, position: right }],
        children: [
          new TextRun({ text: title, bold: true, font, size: 22 }),
          ...(filled(org) ? [new TextRun({ text: `, ${org}`, bold: true, color: accent, font, size: 22 })] : []),
          ...(filled(dates) ? [new TextRun({ text: `\t${dates}`, font, size: 20, color: '475569' })] : []),
        ],
      }),
    );
    if (filled(meta)) para(meta, { italics: true, color: '64748B', after: 40 });
  };

  children.push(new Paragraph({ heading: HeadingLevel.TITLE, spacing: { after: 40 }, children: [new TextRun({ text: fullName(p) || 'Your Name', bold: true, size: 44, font, color: '0F172A' })] }));
  if (filled(p.headline)) children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: p.headline, bold: true, color: accent, size: 24, font })] }));
  const contact = [p.email, p.phone, [p.city, p.country].filter(filled).join(', '), p.linkedin && displayUrl(p.linkedin), p.github && displayUrl(p.github), p.website && displayUrl(p.website)].filter(filled);
  if (contact.length) para(contact.join('  |  '), { color: '334155', after: 40 });
  if (filled(p.workAuthorization)) para(`Work authorization: ${p.workAuthorization}`, { color: '334155' });

  for (const k of visibleSections(cv)) {
    heading(sectionTitle(cv, k));
    switch (k) {
      case 'summary':
        cv.summary.split(/\n+/).filter(filled).forEach((t) => para(t));
        break;
      case 'experience':
        for (const x of cv.experience.filter((e) => filled(e.title) || filled(e.employer))) {
          entry(x.title, x.employer, formatRange(x.startDate, x.endDate, x.current, fmt), [[x.city, x.country].filter(filled).join(', '), x.employmentType].filter(filled).join(' · '));
          if (filled(x.description)) para(x.description);
          x.bullets.filter(filled).forEach(bullet);
        }
        break;
      case 'education':
        for (const e of cv.education.filter((x) => filled(x.degree) || filled(x.institution))) {
          entry([e.degree, e.field].filter(filled).join(' in '), e.institution, formatRange(e.startDate, e.endDate, e.current, fmt), [[e.city, e.country].filter(filled).join(', '), filled(e.grade) ? `Grade: ${e.grade}` : '', filled(e.eqfLevel) ? `EQF level ${e.eqfLevel}` : ''].filter(filled).join(' · '));
          e.bullets.filter(filled).forEach(bullet);
        }
        break;
      case 'skills':
        for (const g of cv.skills) {
          const items = g.items.map((i) => i.name).filter(filled);
          if (!items.length) continue;
          children.push(new Paragraph({ spacing: { after: 40 }, children: [...(filled(g.name) ? [new TextRun({ text: `${g.name}: `, bold: true, font, size: 21 })] : []), new TextRun({ text: items.join(', '), font, size: 21 })] }));
        }
        break;
      case 'languages':
        if (cv.design.designId.startsWith('europass') && cv.languages.some((l) => !l.native && filled(l.name))) {
          const native = cv.languages.filter((l) => l.native && filled(l.name));
          if (native.length) para(`Mother tongue(s): ${native.map((l) => l.name).join(', ')}`);
          const cell = (t: string, bold = false) => new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: t, bold, font, size: 18 })] })] });
          children.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({ tableHeader: true, children: ['', 'Listening', 'Reading', 'Spoken production', 'Spoken interaction', 'Writing'].map((t) => cell(t, true)) }),
                ...cv.languages
                  .filter((l) => !l.native && filled(l.name))
                  .map((l) => new TableRow({ children: [cell(l.name, true), cell(l.listening || '–'), cell(l.reading || '–'), cell(l.spokenProduction || '–'), cell(l.spokenInteraction || '–'), cell(l.writing || '–')] })),
              ],
            }),
          );
          para('Levels: A1 and A2: Basic user; B1 and B2: Independent user; C1 and C2: Proficient user', { color: '64748B' });
        } else {
          for (const l of cv.languages.filter((x) => filled(x.name))) para(`${l.name} — ${l.native ? 'Native' : [l.proficiency, l.listening].filter(filled).join(' ')}${filled(l.certificate) ? ` (${l.certificate})` : ''}`);
        }
        break;
      case 'certifications':
        cv.certifications.filter((c) => filled(c.name)).forEach((c) => bullet(`${c.name}${filled(c.issuer) ? ` — ${c.issuer}` : ''}${filled(c.date) ? ` (${formatYm(c.date, fmt)})` : ''}`));
        break;
      case 'projects':
        for (const pr of cv.projects.filter((x) => filled(x.name))) {
          entry(pr.name, pr.role, formatRange(pr.startDate, pr.endDate, false, fmt), pr.url ? displayUrl(pr.url) : '');
          if (filled(pr.description)) para(pr.description);
          if (filled(pr.tech)) para(`Tools: ${pr.tech}`, { color: '475569' });
        }
        break;
      case 'awards':
        for (const a of cv.awards.filter((x) => filled(x.title))) {
          entry(a.title, a.issuer, formatYm(a.date, fmt));
          if (filled(a.description)) para(a.description);
        }
        break;
      case 'publications':
        cv.publications.filter((x) => filled(x.title)).forEach((pu) => para(`${pu.authors} (${formatYm(pu.date, 'YYYY')}). ${pu.title}. ${pu.publisher}${pu.url ? `. ${pu.url}` : ''}`.trim()));
        break;
      case 'volunteering':
        for (const v of cv.volunteering.filter((x) => filled(x.role) || filled(x.organization))) {
          entry(v.role, v.organization, formatRange(v.startDate, v.endDate, v.current, fmt), v.city);
          if (filled(v.description)) para(v.description);
        }
        break;
      case 'courses':
        cv.courses.filter((x) => filled(x.name)).forEach((c) => bullet(`${c.name}${filled(c.provider) ? ` — ${c.provider}` : ''}${filled(c.date) ? ` (${formatYm(c.date, fmt)})` : ''}`));
        break;
      case 'memberships':
        cv.memberships.filter((x) => filled(x.name)).forEach((m) => bullet(`${m.name}${filled(m.role) ? ` — ${m.role}` : ''}`));
        break;
      case 'interests':
        para(cv.interests.filter(filled).join(' · '));
        break;
      case 'references':
        cv.references.filter((r) => filled(r.name)).forEach((r) => para(`${r.name}, ${[r.position, r.company].filter(filled).join(', ')} — ${[r.email, r.phone].filter(filled).join(' · ')}`));
        if (cv.referencesOnRequest && !cv.references.some((r) => filled(r.name))) para('References available upon request.');
        break;
      default: {
        const c = cv.custom.find((s) => `custom:${s.id}` === k);
        for (const e of c?.entries ?? []) {
          if (!filled(e.title) && !filled(e.description)) continue;
          entry(e.title, e.subtitle, e.date);
          if (filled(e.description)) para(e.description);
        }
      }
    }
  }

  const doc = new Document({
    creator: 'CV Engine',
    title: `${fullName(p) || 'CV'} — CV`,
    styles: { default: { document: { run: { font, size: 21 } } } },
    sections: [{ properties: { page: { size: PAGE[cv.design.pageSize], margin: { top: 1000, bottom: 1000, left: 1134, right: 1134 } } }, children }],
  });
  return Packer.toBlob(doc);
}

export async function letterToDocx(l: LetterData): Promise<Blob> {
  const design = designById(l.design.designId);
  const accent = themeFor(design, l.design.accent).accent.replace('#', '').toUpperCase();
  const font = 'Calibri';
  const run = (text: string, o: { bold?: boolean; color?: string; size?: number } = {}) => new TextRun({ text, font, size: o.size ?? 22, bold: o.bold, color: o.color });
  const p = (text: string, after = 160, o: Parameters<typeof run>[1] = {}) => new Paragraph({ spacing: { after }, children: [run(text, o)] });
  const children: Paragraph[] = [
    new Paragraph({ spacing: { after: 40 }, children: [run(l.sender.name || 'Your Name', { bold: true, size: 36, color: '0F172A' })] }),
    ...(filled(l.sender.headline) ? [p(l.sender.headline, 40, { color: accent, bold: true })] : []),
    new Paragraph({
      spacing: { after: 300 },
      border: { bottom: { color: accent, space: 6, style: BorderStyle.SINGLE, size: 10 } },
      children: [run([l.sender.email, l.sender.phone, l.sender.city, l.sender.linkedin && displayUrl(l.sender.linkedin)].filter(filled).join('  ·  '), { color: '475569', size: 19 })],
    }),
    p(l.date, 240),
    ...[l.recipient.name, l.recipient.title, l.recipient.organization, ...l.recipient.address.split('\n')].filter(filled).map((t) => p(t, 0)),
    p('', 160),
    ...(filled(l.subject) ? [p(l.subject, 200, { bold: true })] : []),
    ...(filled(l.salutation) ? [p(l.salutation)] : []),
    ...l.blocks.flatMap((b) => [
      ...(l.showHeadings && filled(b.heading) ? [p(b.heading.toUpperCase(), 60, { bold: true, color: accent })] : []),
      ...b.body.split('\n').filter(filled).map((line) => (/^(•|-)\s/.test(line) ? new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [run(line.replace(/^(•|-)\s*/, ''))] }) : p(line))),
    ]),
    ...(filled(l.closing) ? [p(l.closing, 400)] : []),
    p(l.signature, 0, { bold: true }),
  ];
  const doc = new Document({
    creator: 'CV Engine',
    styles: { default: { document: { run: { font, size: 22 } } } },
    sections: [{ properties: { page: { size: PAGE[l.design.pageSize], margin: { top: 1134, bottom: 1134, left: 1300, right: 1300 } } }, children }],
  });
  return Packer.toBlob(doc);
}
