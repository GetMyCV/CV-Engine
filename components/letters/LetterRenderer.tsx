import type { CSSProperties } from 'react';
import type { LetterData } from '@/lib/types';
import { designById, fontById, themeFor } from '@/lib/designs';
import { PAGE } from '@/components/cv/CvRenderer';
import { cx, displayUrl, filled } from '@/lib/utils';

/**
 * Renders a letter in the same visual language as the matching CV design
 * (header style, colours, fonts), so a CV and its cover letter look like a set.
 */
export default function LetterRenderer({ letter }: { letter: LetterData }) {
  const design = designById(letter.design.designId);
  const f = design.family;
  const theme = themeFor(design, letter.design.accent);
  const font = fontById(letter.design.font || f.font);
  const page = PAGE[letter.design.pageSize] ?? PAGE.A4;
  const variant = f.header === 'band' || f.layout === 'banner' || f.layout === 'banner-sidebar' ? 'band' : f.layout === 'sidebar-left' || f.layout === 'sidebar-right' ? 'side' : f.header === 'center' || f.header === 'photo-center' ? 'center' : 'left';
  const s = letter.sender;
  const contact = [s.email, s.phone, s.city, s.linkedin && displayUrl(s.linkedin)].filter(filled);

  const style = {
    '--accent': theme.accent,
    '--accent-soft': theme.soft,
    '--accent-line': theme.line,
    '--accent-dark': theme.dark,
    '--on-accent': theme.onAccent,
    '--font-h': font.heading,
    '--font-b': font.body,
    '--fs': letter.design.fontScale || 1,
    width: page.width,
    minHeight: page.height,
  } as CSSProperties;

  return (
    <article className={cx('letter', `letter-${variant}`)} style={style} data-cv-sheet data-page-height={page.height}>
      {variant === 'side' && <div className="letter-strip" aria-hidden="true" />}
      <header className="letter-head">
        <h1 className="letter-name">{s.name || 'Your Name'}</h1>
        {filled(s.headline) && <p className="letter-headline">{s.headline}</p>}
        {contact.length > 0 && <p className="letter-contact">{contact.join('  ·  ')}</p>}
      </header>
      <div className="letter-body">
        <p className="letter-date">{letter.date}</p>
        {[letter.recipient.name, letter.recipient.title, letter.recipient.organization, letter.recipient.address].some(filled) && (
          <address className="letter-recipient">
            {[letter.recipient.name, letter.recipient.title, letter.recipient.organization]
              .filter(filled)
              .map((l) => (
                <span key={l}>{l}</span>
              ))}
            {letter.recipient.address
              .split('\n')
              .filter(filled)
              .map((l, i) => (
                <span key={i}>{l}</span>
              ))}
          </address>
        )}
        {filled(letter.subject) && <p className="letter-subject">{letter.subject}</p>}
        {filled(letter.salutation) && <p className="letter-p">{letter.salutation}</p>}
        {letter.blocks.map((b) => (
          <section key={b.id} className="letter-block">
            {letter.showHeadings && filled(b.heading) && <h2 className="letter-h">{b.heading}</h2>}
            {b.body
              .split(/\n(?=•|-\s)|\n{2,}/)
              .filter(filled)
              .map((para, i) =>
                /^(•|-\s)/.test(para.trim()) ? (
                  <ul key={i} className="letter-ul">
                    {para
                      .split('\n')
                      .filter(filled)
                      .map((li, j) => (
                        <li key={j}>{li.replace(/^(•|-)\s*/, '')}</li>
                      ))}
                  </ul>
                ) : (
                  <p key={i} className="letter-p">
                    {para.split('\n').map((line, j) => (
                      <span key={j}>
                        {j > 0 && <br />}
                        {line}
                      </span>
                    ))}
                  </p>
                ),
              )}
          </section>
        ))}
        {filled(letter.closing) && <p className="letter-p letter-closing">{letter.closing}</p>}
        <p className="letter-signature">{letter.signature}</p>
      </div>
    </article>
  );
}
