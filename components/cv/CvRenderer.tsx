import type { CSSProperties, ReactNode } from 'react';
import type { CvData, CvLanguage, SectionKey, SkillItem } from '@/lib/types';
import { designById, fontById, themeFor, type Design, type SkillStyle } from '@/lib/designs';
import { fullName, sectionTitle, visibleSections, REGION_RULES } from '@/lib/cv-model';
import { displayUrl, filled, formatRange, formatYm, toHref, cx } from '@/lib/utils';
import type { Region } from '@/lib/types';

export const PAGE = {
  A4: { width: 794, height: 1123 },
  Letter: { width: 816, height: 1056 },
} as const;

/** Sections that move to the side column in sidebar layouts. */
const SIDE_KEYS: SectionKey[] = ['skills', 'languages', 'certifications', 'interests', 'courses', 'memberships'];

type Props = {
  cv: CvData;
  /** Overrides cv.design.designId (template gallery thumbnails). */
  designId?: string;
  region?: Region;
  /** Render links as anchors (off inside clickable thumbnails). */
  links?: boolean;
};

/**
 * Renders a CV in any of the library's designs.
 *
 * Reading order is always linear: header, main column, then side column.
 * Columns are placed with CSS grid, so the text layer a PDF or an ATS sees
 * stays in a sensible top-to-bottom order whatever the visual layout.
 */
export default function CvRenderer({ cv, designId, region = 'international', links = true }: Props) {
  const design = designById(designId ?? cv.design.designId);
  const f = design.family;
  const theme = themeFor(design, cv.design.accent);
  const font = fontById(cv.design.font || f.font);
  const page = PAGE[cv.design.pageSize] ?? PAGE.A4;
  const rules = REGION_RULES[region];
  const allowPhoto = f.photo && cv.design.showPhoto && filled(cv.personal.photo) && rules.photo !== 'avoid';
  const showPersonal = rules.personalData !== 'avoid';

  const sections = visibleSections(cv);
  const hasSidebar = f.layout === 'sidebar-left' || f.layout === 'sidebar-right' || f.layout === 'banner-sidebar';
  const main = hasSidebar ? sections.filter((k) => !SIDE_KEYS.includes(k)) : sections;
  const side = hasSidebar ? sections.filter((k) => SIDE_KEYS.includes(k)) : [];
  const sideWidth = f.layout === 'banner-sidebar' ? 230 : 250;

  const spacing = { compact: 0.78, normal: 1, relaxed: 1.2 }[cv.design.spacing] * (f.layout === 'compact' ? 0.85 : 1);

  const vars = {
    '--accent': theme.accent,
    '--accent-dark': theme.dark,
    '--accent-soft': theme.soft,
    '--accent-line': theme.line,
    '--on-accent': theme.onAccent,
    '--side-bg': theme.sidebarBg,
    '--side-text': theme.sidebarText,
    '--side-w': `${sideWidth}px`,
    '--font-h': font.heading,
    '--font-b': font.body,
    '--gap': spacing,
    '--fs': cv.design.fontScale || 1,
    width: page.width,
    minHeight: page.height,
    background: hasSidebar
      ? f.layout === 'sidebar-left'
        ? `linear-gradient(90deg, var(--side-bg) 0 ${sideWidth}px, #fff ${sideWidth}px)`
        : `linear-gradient(270deg, var(--side-bg) 0 ${sideWidth}px, #fff ${sideWidth}px)`
      : '#fff',
  } as CSSProperties;

  const ctx: Ctx = { cv, design, links, showPersonal, inSide: false, region };

  return (
    <article
      className={cx('cv', `cv-l-${f.layout}`, `cv-h-${f.heading}`, `cv-hd-${f.header}`, f.sidebar === 'dark' && 'cv-side-dark')}
      style={vars}
      data-cv-sheet
      data-page-height={page.height}
      aria-label={`CV of ${fullName(cv.personal) || 'Your Name'}`}
    >
      <Header ctx={ctx} photo={allowPhoto} hasSidebar={hasSidebar} />
      <div className="cv-body">
        <main className="cv-main">
          {main.map((k) => (
            <Section key={k} k={k} ctx={ctx} />
          ))}
        </main>
        {hasSidebar && (
          <aside className="cv-side">
            {f.layout !== 'banner-sidebar' && <SideContact ctx={{ ...ctx, inSide: true }} photo={allowPhoto && f.header !== 'photo-left'} />}
            {side.map((k) => (
              <Section key={k} k={k} ctx={{ ...ctx, inSide: true }} />
            ))}
          </aside>
        )}
      </div>
    </article>
  );
}

type Ctx = { cv: CvData; design: Design; links: boolean; showPersonal: boolean; inSide: boolean; region: Region };

/* ------------------------------------------------------------------ header */

function contactItems(ctx: Ctx) {
  const p = ctx.cv.personal;
  const location = [p.city, p.country].filter(filled).join(', ');
  const items: { kind: string; label: string; href?: string }[] = [];
  if (filled(p.email)) items.push({ kind: 'email', label: p.email, href: `mailto:${p.email}` });
  if (filled(p.phone)) items.push({ kind: 'phone', label: p.phone, href: `tel:${p.phone.replace(/[^\d+]/g, '')}` });
  if (location) items.push({ kind: 'location', label: location });
  if (filled(p.linkedin)) items.push({ kind: 'linkedin', label: displayUrl(p.linkedin), href: toHref(p.linkedin) });
  if (filled(p.github)) items.push({ kind: 'github', label: displayUrl(p.github), href: toHref(p.github) });
  if (filled(p.website)) items.push({ kind: 'website', label: displayUrl(p.website), href: toHref(p.website) });
  return items;
}

function personalItems(ctx: Ctx) {
  const p = ctx.cv.personal;
  const items: { label: string; value: string }[] = [];
  if (filled(p.workAuthorization)) items.push({ label: 'Work authorization', value: p.workAuthorization });
  if (ctx.showPersonal) {
    if (filled(p.nationality)) items.push({ label: 'Nationality', value: p.nationality });
    if (filled(p.dateOfBirth)) items.push({ label: 'Date of birth', value: p.dateOfBirth });
  }
  if (filled(p.drivingLicence)) items.push({ label: 'Driving licence', value: p.drivingLicence });
  return items;
}

function Icon({ kind }: { kind: string }) {
  const paths: Record<string, string> = {
    email: 'M3 5h18v14H3z M3 6l9 7 9-7',
    phone: 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2',
    location: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5',
    linkedin: 'M4 4h16v16H4z M8 10v6 M8 7.5v.01 M12 16v-6 M12 12.5a2.5 2.5 0 0 1 5 0V16',
    github: 'M9 19c-4 1.5-4-2-6-2.5m12 5v-3.5a3 3 0 0 0-.9-2.4c3-.3 6-1.5 6-6.5a5 5 0 0 0-1.4-3.5 4.6 4.6 0 0 0-.1-3.5s-1.1-.3-3.6 1.4a12.4 12.4 0 0 0-6.5 0C6 1.8 5 2.1 5 2.1a4.6 4.6 0 0 0-.1 3.5A5 5 0 0 0 3.5 9c0 5 3 6.2 6 6.5a3 3 0 0 0-.9 2.4V21',
    website: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3a14 14 0 0 1 0 18 M12 3a14 14 0 0 0 0 18',
  };
  return (
    <svg className="cv-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[kind] ?? paths.website} />
    </svg>
  );
}

function ContactLine({ ctx, vertical = false }: { ctx: Ctx; vertical?: boolean }) {
  const items = contactItems(ctx);
  const icons = ctx.design.family.icons;
  return (
    <ul className={cx('cv-contact', vertical && 'cv-contact-v')}>
      {items.map((i) => (
        <li key={i.kind}>
          {icons && <Icon kind={i.kind} />}
          {ctx.links && i.href ? <a href={i.href}>{i.label}</a> : <span>{i.label}</span>}
        </li>
      ))}
    </ul>
  );
}

function Photo({ src, className }: { src: string; className?: string }) {
  return <img src={src} alt="" className={cx('cv-photo', className)} />;
}

function Header({ ctx, photo, hasSidebar }: { ctx: Ctx; photo: boolean; hasSidebar: boolean }) {
  const { cv, design } = ctx;
  const f = design.family;
  const name = fullName(cv.personal) || 'Your Name';
  const headline = cv.personal.headline;
  const personal = personalItems(ctx);
  const contactInSidebar = hasSidebar && f.layout !== 'banner-sidebar';

  const nameBlock = (
    <div className="cv-name-block">
      <h1 className="cv-name">{name}</h1>
      {filled(headline) && <p className="cv-headline">{headline}</p>}
    </div>
  );

  const extras = !contactInSidebar && personal.length > 0 && (
    <p className="cv-personal">
      {personal.map((p, i) => (
        <span key={p.label}>
          {i > 0 && ' · '}
          <b>{p.label}:</b> {p.value}
        </span>
      ))}
    </p>
  );

  if (f.layout === 'europass') {
    return (
      <header className={cx('cv-header', f.header === 'band' && 'cv-band')}>
        <div className="cv-eu-head">
          {photo && <Photo src={cv.personal.photo} className="cv-photo-sq" />}
          <div>
            {nameBlock}
            <ContactLine ctx={ctx} />
            {extras}
          </div>
        </div>
      </header>
    );
  }

  const showPhotoHere = photo && (f.header === 'photo-left' || f.header === 'photo-center' || (!contactInSidebar && f.header !== 'split'));

  return (
    <header className={cx('cv-header', f.header === 'band' && 'cv-band')}>
      <div className="cv-header-inner">
        {showPhotoHere && <Photo src={cv.personal.photo} />}
        <div className="cv-header-text">
          {nameBlock}
          {!contactInSidebar && f.header !== 'split' && <ContactLine ctx={ctx} />}
          {extras}
        </div>
        {!contactInSidebar && f.header === 'split' && (
          <div className="cv-split-contact">
            <ContactLine ctx={ctx} vertical />
          </div>
        )}
      </div>
    </header>
  );
}

function SideContact({ ctx, photo }: { ctx: Ctx; photo: boolean }) {
  const personal = personalItems(ctx);
  return (
    <section className="cv-section cv-side-contact">
      {photo && <Photo src={ctx.cv.personal.photo} className="cv-photo-side" />}
      <h2 className="cv-h">
        <span>Contact</span>
      </h2>
      <ContactLine ctx={ctx} vertical />
      {personal.length > 0 && (
        <dl className="cv-personal-list">
          {personal.map((p) => (
            <div key={p.label}>
              <dt>{p.label}</dt>
              <dd>{p.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- sections */

function Heading({ children }: { children: ReactNode }) {
  return (
    <h2 className="cv-h">
      <span>{children}</span>
    </h2>
  );
}

function Link({ ctx, url }: { ctx: Ctx; url: string }) {
  if (!filled(url)) return null;
  return ctx.links ? (
    <a className="cv-link" href={toHref(url)}>
      {displayUrl(url)}
    </a>
  ) : (
    <span className="cv-link">{displayUrl(url)}</span>
  );
}

function Entry({
  title,
  org,
  meta,
  dates,
  children,
  ctx,
}: {
  title: string;
  org?: string;
  meta?: string;
  dates?: string;
  children?: ReactNode;
  ctx: Ctx;
}) {
  const layout = ctx.design.family.layout;
  const datesInGutter = layout === 'europass' && !ctx.inSide;
  return (
    <div className={cx('cv-entry', layout === 'timeline' && !ctx.inSide && 'cv-entry-tl')}>
      {datesInGutter && dates && <div className="cv-entry-gdate">{dates}</div>}
      <div className="cv-entry-body">
        <div className="cv-entry-head">
          <h3 className="cv-entry-title">
            {title}
            {org && (
              <>
                <span className="cv-sep">{ctx.inSide ? <br /> : ', '}</span>
                <span className="cv-entry-org">{org}</span>
              </>
            )}
          </h3>
          {!datesInGutter && dates && <span className="cv-entry-date">{dates}</span>}
        </div>
        {meta && <p className="cv-entry-meta">{meta}</p>}
        {children}
      </div>
    </div>
  );
}

const Bullets = ({ items }: { items: string[] }) => {
  const list = items.filter(filled);
  if (!list.length) return null;
  return (
    <ul className="cv-bullets">
      {list.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  );
};

const Para = ({ text }: { text: string }) =>
  filled(text) ? (
    <>
      {text
        .split(/\n+/)
        .filter(filled)
        .map((t, i) => (
          <p key={i} className="cv-para">
            {t}
          </p>
        ))}
    </>
  ) : null;

function Section({ k, ctx }: { k: SectionKey; ctx: Ctx }) {
  const { cv } = ctx;
  const fmt = cv.design.dateFormat;
  const title = sectionTitle(cv, k);
  const body = (() => {
    switch (k) {
      case 'summary':
        return <Para text={cv.summary} />;
      case 'experience':
        return cv.experience
          .filter((x) => filled(x.title) || filled(x.employer))
          .map((x) => (
            <Entry
              key={x.id}
              ctx={ctx}
              title={x.title}
              org={x.employer}
              dates={formatRange(x.startDate, x.endDate, x.current, fmt)}
              meta={[ [x.city, x.country].filter(filled).join(', '), x.employmentType ].filter(filled).join(' · ')}
            >
              <Para text={x.description} />
              <Bullets items={x.bullets} />
            </Entry>
          ));
      case 'education':
        return cv.education
          .filter((e) => filled(e.degree) || filled(e.institution))
          .map((e) => (
            <Entry
              key={e.id}
              ctx={ctx}
              title={[e.degree, e.field].filter(filled).join(ctx.design.family.layout === 'europass' ? ' – ' : ' in ')}
              org={e.institution}
              dates={formatRange(e.startDate, e.endDate, e.current, fmt)}
              meta={[
                [e.city, e.country].filter(filled).join(', '),
                filled(e.grade) ? `Grade: ${e.grade}` : '',
                filled(e.eqfLevel) ? `EQF level ${e.eqfLevel}` : '',
              ]
                .filter(filled)
                .join(' · ')}
            >
              <Bullets items={e.bullets} />
            </Entry>
          ));
      case 'skills':
        return <Skills ctx={ctx} />;
      case 'languages':
        return <Languages ctx={ctx} />;
      case 'certifications':
        return (
          <ul className="cv-simple">
            {cv.certifications
              .filter((c) => filled(c.name))
              .map((c) => (
                <li key={c.id}>
                  <b>{c.name}</b>
                  {filled(c.issuer) && <> — {c.issuer}</>}
                  {filled(c.date) && <span className="cv-muted"> ({formatYm(c.date, fmt)}{filled(c.expiry) ? ` – ${formatYm(c.expiry, fmt)}` : ''})</span>}
                  {filled(c.credentialId) && <span className="cv-muted"> · ID {c.credentialId}</span>}
                  {filled(c.url) && <> · <Link ctx={ctx} url={c.url} /></>}
                </li>
              ))}
          </ul>
        );
      case 'projects':
        return cv.projects
          .filter((p) => filled(p.name))
          .map((p) => (
            <Entry key={p.id} ctx={ctx} title={p.name} org={p.role} dates={formatRange(p.startDate, p.endDate, false, fmt)}>
              {filled(p.url) && (
                <p className="cv-entry-meta">
                  <Link ctx={ctx} url={p.url} />
                </p>
              )}
              <Para text={p.description} />
              {filled(p.tech) && (
                <p className="cv-para cv-muted">
                  <b>Tools:</b> {p.tech}
                </p>
              )}
            </Entry>
          ));
      case 'awards':
        return cv.awards
          .filter((a) => filled(a.title))
          .map((a) => (
            <Entry key={a.id} ctx={ctx} title={a.title} org={a.issuer} dates={formatYm(a.date, fmt)}>
              <Para text={a.description} />
            </Entry>
          ));
      case 'publications':
        return (
          <ul className="cv-simple">
            {cv.publications
              .filter((p) => filled(p.title))
              .map((p) => (
                <li key={p.id}>
                  {filled(p.authors) && <>{p.authors} </>}
                  {filled(p.date) && <>({formatYm(p.date, 'YYYY')}). </>}
                  <b>{p.title}</b>
                  {filled(p.publisher) && <>. <i>{p.publisher}</i></>}
                  {filled(p.url) && <>. <Link ctx={ctx} url={p.url} /></>}
                </li>
              ))}
          </ul>
        );
      case 'volunteering':
        return cv.volunteering
          .filter((v) => filled(v.role) || filled(v.organization))
          .map((v) => (
            <Entry key={v.id} ctx={ctx} title={v.role} org={v.organization} meta={v.city} dates={formatRange(v.startDate, v.endDate, v.current, fmt)}>
              <Para text={v.description} />
            </Entry>
          ));
      case 'courses':
        return (
          <ul className="cv-simple">
            {cv.courses
              .filter((c) => filled(c.name))
              .map((c) => (
                <li key={c.id}>
                  <b>{c.name}</b>
                  {filled(c.provider) && <> — {c.provider}</>}
                  {filled(c.date) && <span className="cv-muted"> ({formatYm(c.date, fmt)})</span>}
                </li>
              ))}
          </ul>
        );
      case 'memberships':
        return (
          <ul className="cv-simple">
            {cv.memberships
              .filter((m) => filled(m.name))
              .map((m) => (
                <li key={m.id}>
                  <b>{m.name}</b>
                  {filled(m.role) && <> — {m.role}</>}
                  {(filled(m.startDate) || filled(m.endDate)) && <span className="cv-muted"> ({formatRange(m.startDate, m.endDate, !m.endDate, fmt)})</span>}
                </li>
              ))}
          </ul>
        );
      case 'interests':
        return <p className="cv-para">{cv.interests.filter(filled).join(' · ')}</p>;
      case 'references':
        return (
          <>
            <div className="cv-refs">
              {cv.references
                .filter((r) => filled(r.name))
                .map((r) => (
                  <div key={r.id} className="cv-ref">
                    <b>{r.name}</b>
                    <div>{[r.position, r.company].filter(filled).join(', ')}</div>
                    {filled(r.relationship) && <div className="cv-muted">{r.relationship}</div>}
                    <div className="cv-muted">{[r.email, r.phone].filter(filled).join(' · ')}</div>
                  </div>
                ))}
            </div>
            {cv.referencesOnRequest && !cv.references.some((r) => filled(r.name)) && <p className="cv-para">References available upon request.</p>}
          </>
        );
      default: {
        const c = cv.custom.find((s) => `custom:${s.id}` === k);
        if (!c) return null;
        return c.entries
          .filter((e) => filled(e.title) || filled(e.description))
          .map((e) => (
            <Entry key={e.id} ctx={ctx} title={e.title} org={e.subtitle} dates={e.date}>
              <Para text={e.description} />
            </Entry>
          ));
      }
    }
  })();

  return (
    <section className={cx('cv-section', `cv-s-${k.split(':')[0]}`)}>
      <Heading>{title}</Heading>
      <div className="cv-section-body">{body}</div>
    </section>
  );
}

function Skills({ ctx }: { ctx: Ctx }) {
  const groups = ctx.cv.skills.map((g) => ({ ...g, items: g.items.filter((i) => filled(i.name)) })).filter((g) => g.items.length);
  let style: SkillStyle = ctx.design.family.skills;
  if (ctx.design.family.layout === 'europass') style = 'list';
  // Rating styles only make sense in narrow columns; fall back to tags in the main column.
  if ((style === 'bars' || style === 'dots') && !ctx.inSide) style = 'tags';

  if (style === 'inline') {
    return <p className="cv-para">{groups.flatMap((g) => g.items.map((i) => i.name)).join(' · ')}</p>;
  }
  return (
    <div className={cx('cv-skills', `cv-skills-${style}`)}>
      {groups.map((g) => (
        <div key={g.id} className="cv-skill-group">
          {style === 'list' ? (
            <p className="cv-para">
              {filled(g.name) && <b>{g.name}: </b>}
              {g.items.map((i) => i.name).join(', ')}
            </p>
          ) : (
            <>
              {filled(g.name) && <h3 className="cv-skill-group-name">{g.name}</h3>}
              <SkillItems items={g.items} style={style} />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function SkillItems({ items, style }: { items: SkillItem[]; style: SkillStyle }) {
  if (style === 'tags') {
    return (
      <ul className="cv-tags">
        {items.map((i) => (
          <li key={i.name}>{i.name}</li>
        ))}
      </ul>
    );
  }
  if (style === 'columns') {
    return (
      <ul className="cv-columns">
        {items.map((i) => (
          <li key={i.name}>{i.name}</li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="cv-ratings">
      {items.map((i) => (
        <li key={i.name}>
          <span>{i.name}</span>
          {style === 'bars' ? (
            <span className="cv-bar" aria-hidden="true">
              <span style={{ width: `${(Math.max(1, Math.min(5, i.level || 3)) / 5) * 100}%` }} />
            </span>
          ) : (
            <span className="cv-dots" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={n <= (i.level || 3) ? 'on' : ''} />
              ))}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

const CEFR_FIELDS: { key: keyof CvLanguage; label: string }[] = [
  { key: 'listening', label: 'Listening' },
  { key: 'reading', label: 'Reading' },
  { key: 'spokenProduction', label: 'Spoken production' },
  { key: 'spokenInteraction', label: 'Spoken interaction' },
  { key: 'writing', label: 'Writing' },
];

function Languages({ ctx }: { ctx: Ctx }) {
  const langs = ctx.cv.languages.filter((l) => filled(l.name));
  const native = langs.filter((l) => l.native);
  const other = langs.filter((l) => !l.native);
  const europass = ctx.design.family.layout === 'europass';
  if (europass) {
    return (
      <div className="cv-eu-lang">
        {native.length > 0 && (
          <p className="cv-para">
            <b>Mother tongue(s):</b> {native.map((l) => l.name).join(', ')}
          </p>
        )}
        {other.length > 0 && (
          <>
            <p className="cv-para">
              <b>Other language(s):</b>
            </p>
            <table className="cv-cefr">
              <thead>
                <tr>
                  <th />
                  <th colSpan={2}>Understanding</th>
                  <th colSpan={2}>Speaking</th>
                  <th>Writing</th>
                </tr>
                <tr>
                  <th />
                  {CEFR_FIELDS.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {other.map((l) => (
                  <tr key={l.id}>
                    <th scope="row">
                      {l.name}
                      {filled(l.certificate) && <div className="cv-muted">{l.certificate}</div>}
                    </th>
                    {CEFR_FIELDS.map((c) => (
                      <td key={c.key}>{(l[c.key] as string) || '–'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="cv-tiny">Levels: A1 and A2: Basic user · B1 and B2: Independent user · C1 and C2: Proficient user</p>
          </>
        )}
      </div>
    );
  }
  const levelOf = (l: CvLanguage) => {
    if (l.native) return 'Native';
    const cefr = [l.listening, l.reading, l.spokenInteraction, l.spokenProduction, l.writing].filter(Boolean).sort().pop();
    return [l.proficiency, cefr ? `(${cefr})` : ''].filter(filled).join(' ');
  };
  return (
    <ul className="cv-simple cv-langs">
      {langs.map((l) => (
        <li key={l.id}>
          <b>{l.name}</b>
          {levelOf(l) && <> — {levelOf(l)}</>}
          {filled(l.certificate) && <span className="cv-muted"> · {l.certificate}</span>}
        </li>
      ))}
    </ul>
  );
}
