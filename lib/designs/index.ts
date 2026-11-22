import { mix, readableOn } from '../utils';
import type { Region } from '../types';

/**
 * The CV design library.
 *
 * A design is a family (layout, header, heading, skills style, typography)
 * combined with a colour palette. 32 families × their palettes = 468 distinct
 * designs, all rendered from the same structured CV data — so a user can
 * switch designs without retyping anything, and every design keeps a real,
 * selectable text layer that applicant tracking systems can parse.
 */

export type LayoutKind =
  | 'single'
  | 'gutter'
  | 'compact'
  | 'minimal'
  | 'timeline'
  | 'sidebar-left'
  | 'sidebar-right'
  | 'banner'
  | 'banner-sidebar'
  | 'cards'
  | 'europass';

export type HeaderStyle = 'left' | 'center' | 'split' | 'band' | 'photo-left' | 'photo-center';
export type HeadingStyle = 'underline' | 'bar' | 'caps' | 'pill' | 'line-after' | 'boxed' | 'plain' | 'double';
export type SkillStyle = 'list' | 'tags' | 'bars' | 'dots' | 'columns' | 'inline';
export type SidebarTone = 'dark' | 'soft' | 'none';

export type DesignCategory = 'ats' | 'modern' | 'professional' | 'executive' | 'creative' | 'simple' | 'academic' | 'europass' | 'canadian' | 'photo';

export const CATEGORIES: { id: DesignCategory; label: string }[] = [
  { id: 'ats', label: 'ATS-optimized' },
  { id: 'modern', label: 'Modern' },
  { id: 'professional', label: 'Professional' },
  { id: 'executive', label: 'Executive' },
  { id: 'creative', label: 'Creative' },
  { id: 'simple', label: 'Simple' },
  { id: 'photo', label: 'With photo' },
  { id: 'academic', label: 'Academic' },
  { id: 'europass', label: 'Europass' },
  { id: 'canadian', label: 'Canadian' },
];

export type FontPair = { id: string; label: string; heading: string; body: string; google?: string[] };

export const FONTS: FontPair[] = [
  { id: 'arial', label: 'Arial (ATS classic)', heading: 'Arial, Helvetica, sans-serif', body: 'Arial, Helvetica, sans-serif' },
  { id: 'calibri', label: 'Calibri', heading: 'Calibri, Carlito, "Segoe UI", sans-serif', body: 'Calibri, Carlito, "Segoe UI", sans-serif' },
  { id: 'georgia', label: 'Georgia', heading: 'Georgia, "Times New Roman", serif', body: 'Georgia, "Times New Roman", serif' },
  { id: 'inter', label: 'Inter', heading: '"Inter", sans-serif', body: '"Inter", sans-serif', google: ['Inter:wght@400;500;600;700;800'] },
  { id: 'lato', label: 'Lato', heading: '"Lato", sans-serif', body: '"Lato", sans-serif', google: ['Lato:wght@400;700;900'] },
  { id: 'roboto', label: 'Roboto', heading: '"Roboto", sans-serif', body: '"Roboto", sans-serif', google: ['Roboto:wght@400;500;700'] },
  { id: 'open-sans', label: 'Open Sans', heading: '"Open Sans", sans-serif', body: '"Open Sans", sans-serif', google: ['Open+Sans:wght@400;600;700'] },
  { id: 'source-sans', label: 'Source Sans 3', heading: '"Source Sans 3", sans-serif', body: '"Source Sans 3", sans-serif', google: ['Source+Sans+3:wght@400;600;700'] },
  { id: 'ibm-plex', label: 'IBM Plex Sans', heading: '"IBM Plex Sans", sans-serif', body: '"IBM Plex Sans", sans-serif', google: ['IBM+Plex+Sans:wght@400;500;600;700'] },
  { id: 'work-sans', label: 'Work Sans', heading: '"Work Sans", sans-serif', body: '"Work Sans", sans-serif', google: ['Work+Sans:wght@400;500;600;700'] },
  { id: 'nunito', label: 'Nunito Sans', heading: '"Nunito Sans", sans-serif', body: '"Nunito Sans", sans-serif', google: ['Nunito+Sans:wght@400;600;700;800'] },
  { id: 'montserrat-open', label: 'Montserrat + Open Sans', heading: '"Montserrat", sans-serif', body: '"Open Sans", sans-serif', google: ['Montserrat:wght@500;600;700;800', 'Open+Sans:wght@400;600;700'] },
  { id: 'poppins-inter', label: 'Poppins + Inter', heading: '"Poppins", sans-serif', body: '"Inter", sans-serif', google: ['Poppins:wght@500;600;700', 'Inter:wght@400;500;600;700'] },
  { id: 'raleway-lato', label: 'Raleway + Lato', heading: '"Raleway", sans-serif', body: '"Lato", sans-serif', google: ['Raleway:wght@500;600;700;800', 'Lato:wght@400;700'] },
  { id: 'space-grotesk', label: 'Space Grotesk + Inter', heading: '"Space Grotesk", sans-serif', body: '"Inter", sans-serif', google: ['Space+Grotesk:wght@500;600;700', 'Inter:wght@400;500;600;700'] },
  { id: 'playfair-source', label: 'Playfair Display + Source Sans', heading: '"Playfair Display", serif', body: '"Source Sans 3", sans-serif', google: ['Playfair+Display:wght@600;700;800', 'Source+Sans+3:wght@400;600;700'] },
  { id: 'lora-inter', label: 'Lora + Inter', heading: '"Lora", serif', body: '"Inter", sans-serif', google: ['Lora:wght@500;600;700', 'Inter:wght@400;500;600;700'] },
  { id: 'merriweather', label: 'Merriweather + Source Sans', heading: '"Merriweather", serif', body: '"Source Sans 3", sans-serif', google: ['Merriweather:wght@700;900', 'Source+Sans+3:wght@400;600;700'] },
  { id: 'dm-serif', label: 'DM Serif + DM Sans', heading: '"DM Serif Display", serif', body: '"DM Sans", sans-serif', google: ['DM+Serif+Display', 'DM+Sans:wght@400;500;700'] },
  { id: 'garamond', label: 'EB Garamond', heading: '"EB Garamond", serif', body: '"EB Garamond", serif', google: ['EB+Garamond:wght@400;500;600;700'] },
];

export const fontById = (id: string) => FONTS.find((f) => f.id === id) ?? FONTS[3]!;

/** One Google Fonts stylesheet for every web font the designs use (files load lazily, per glyph range actually used). */
export const GOOGLE_FONTS_HREF = `https://fonts.googleapis.com/css2?${[...new Set(FONTS.flatMap((f) => f.google ?? []))]
  .map((g) => `family=${g}`)
  .join('&')}&display=swap`;

export type Palette = { id: string; name: string; accent: string };

export const PALETTES: Palette[] = [
  { id: 'ocean', name: 'Ocean', accent: '#1E5AA8' },
  { id: 'navy', name: 'Navy', accent: '#1F3A5F' },
  { id: 'sky', name: 'Sky', accent: '#0369A1' },
  { id: 'teal', name: 'Teal', accent: '#0F766E' },
  { id: 'emerald', name: 'Emerald', accent: '#047857' },
  { id: 'forest', name: 'Forest', accent: '#2F5D3A' },
  { id: 'graphite', name: 'Graphite', accent: '#334155' },
  { id: 'ink', name: 'Ink', accent: '#111827' },
  { id: 'plum', name: 'Plum', accent: '#6B2E5F' },
  { id: 'burgundy', name: 'Burgundy', accent: '#8C1C3A' },
  { id: 'crimson', name: 'Crimson', accent: '#B42318' },
  { id: 'sunset', name: 'Sunset', accent: '#C2410C' },
  { id: 'gold', name: 'Gold', accent: '#946200' },
  { id: 'indigo', name: 'Indigo', accent: '#4338CA' },
  { id: 'violet', name: 'Violet', accent: '#6D28D9' },
  { id: 'rose', name: 'Rose', accent: '#BE185D' },
  // Special-purpose palettes
  { id: 'blue', name: 'EU Blue', accent: '#0B4EA2' },
  { id: 'red', name: 'Maple Red', accent: '#B4232A' },
];

const STANDARD = PALETTES.slice(0, 16).map((p) => p.id);

export type Family = {
  id: string;
  name: string;
  description: string;
  categories: DesignCategory[];
  layout: LayoutKind;
  header: HeaderStyle;
  heading: HeadingStyle;
  skills: SkillStyle;
  sidebar: SidebarTone;
  font: string;
  /** Shows the photo slot when the user has a photo and the region allows it. */
  photo: boolean;
  icons: boolean;
  palettes: string[];
  regions?: Region[];
};

export const FAMILIES: Family[] = [
  // ---------------------------------------------------------------- ATS-optimized
  { id: 'ledger', name: 'Ledger', description: 'The safest possible layout: one column, standard headings, Arial.', categories: ['ats', 'simple', 'professional'], layout: 'single', header: 'left', heading: 'underline', skills: 'list', sidebar: 'none', font: 'arial', photo: false, icons: false, palettes: STANDARD },
  { id: 'meridian', name: 'Meridian', description: 'Centred header and clean rules. Works for every industry.', categories: ['ats', 'professional'], layout: 'single', header: 'center', heading: 'line-after', skills: 'list', sidebar: 'none', font: 'inter', photo: false, icons: false, palettes: STANDARD },
  { id: 'harbor', name: 'Harbor', description: 'Section titles in a left gutter: scannable and parser-friendly.', categories: ['ats', 'professional'], layout: 'gutter', header: 'split', heading: 'plain', skills: 'list', sidebar: 'none', font: 'source-sans', photo: false, icons: false, palettes: STANDARD },
  { id: 'heritage', name: 'Heritage', description: 'Traditional serif CV for law, finance and the public sector.', categories: ['ats', 'executive'], layout: 'single', header: 'center', heading: 'underline', skills: 'list', sidebar: 'none', font: 'georgia', photo: false, icons: false, palettes: STANDARD },
  { id: 'nimbus', name: 'Nimbus', description: 'Airy minimalism with small-caps headings.', categories: ['ats', 'simple', 'modern'], layout: 'minimal', header: 'left', heading: 'caps', skills: 'inline', sidebar: 'none', font: 'work-sans', photo: false, icons: false, palettes: STANDARD },
  { id: 'summit', name: 'Summit', description: 'Compact and dense — fits 10+ years on one page.', categories: ['ats', 'professional'], layout: 'compact', header: 'split', heading: 'bar', skills: 'columns', sidebar: 'none', font: 'roboto', photo: false, icons: false, palettes: STANDARD },
  { id: 'atlas', name: 'Atlas', description: 'Shaded section bands guide the eye down the page.', categories: ['ats', 'professional'], layout: 'single', header: 'left', heading: 'boxed', skills: 'list', sidebar: 'none', font: 'open-sans', photo: true, icons: true, palettes: STANDARD },
  { id: 'keystone', name: 'Keystone', description: 'A subtle timeline for experience; still one column.', categories: ['ats', 'modern'], layout: 'timeline', header: 'left', heading: 'line-after', skills: 'tags', sidebar: 'none', font: 'ibm-plex', photo: false, icons: true, palettes: STANDARD },
  { id: 'clarity', name: 'Clarity', description: 'Pill headings and skill tags on a single column.', categories: ['ats', 'modern'], layout: 'single', header: 'left', heading: 'pill', skills: 'tags', sidebar: 'none', font: 'lato', photo: false, icons: true, palettes: STANDARD },
  { id: 'scholar', name: 'Scholar', description: 'Academic CV with Garamond and double rules.', categories: ['ats', 'academic'], layout: 'single', header: 'center', heading: 'double', skills: 'list', sidebar: 'none', font: 'garamond', photo: false, icons: false, palettes: STANDARD, regions: ['academic'] },
  // ---------------------------------------------------------------------- Modern
  { id: 'aurora', name: 'Aurora', description: 'Dark sidebar with photo, skill bars and bold type.', categories: ['modern', 'photo', 'creative'], layout: 'sidebar-left', header: 'left', heading: 'caps', skills: 'bars', sidebar: 'dark', font: 'poppins-inter', photo: true, icons: true, palettes: STANDARD },
  { id: 'horizon', name: 'Horizon', description: 'Full-width colour band header over a single column.', categories: ['modern', 'professional'], layout: 'banner', header: 'band', heading: 'underline', skills: 'tags', sidebar: 'none', font: 'montserrat-open', photo: true, icons: true, palettes: STANDARD },
  { id: 'vertex', name: 'Vertex', description: 'Light right-hand sidebar with skill dots.', categories: ['modern'], layout: 'sidebar-right', header: 'left', heading: 'bar', skills: 'dots', sidebar: 'soft', font: 'raleway-lato', photo: false, icons: true, palettes: STANDARD },
  { id: 'prism', name: 'Prism', description: 'Band header plus a tinted sidebar for skills.', categories: ['modern', 'creative', 'photo'], layout: 'banner-sidebar', header: 'band', heading: 'line-after', skills: 'bars', sidebar: 'soft', font: 'nunito', photo: true, icons: true, palettes: STANDARD },
  { id: 'cascade', name: 'Cascade', description: 'Soft left sidebar, photo and tag skills.', categories: ['modern', 'photo'], layout: 'sidebar-left', header: 'photo-left', heading: 'underline', skills: 'tags', sidebar: 'soft', font: 'inter', photo: true, icons: true, palettes: STANDARD },
  { id: 'orbit', name: 'Orbit', description: 'Sections set on soft cards; contemporary and tidy.', categories: ['modern', 'creative'], layout: 'cards', header: 'left', heading: 'caps', skills: 'tags', sidebar: 'none', font: 'space-grotesk', photo: true, icons: true, palettes: STANDARD },
  { id: 'zenith', name: 'Zenith', description: 'Dark sidebar, dot ratings, strong hierarchy.', categories: ['modern', 'professional'], layout: 'sidebar-left', header: 'left', heading: 'plain', skills: 'dots', sidebar: 'dark', font: 'montserrat-open', photo: true, icons: true, palettes: STANDARD },
  { id: 'pulse', name: 'Pulse', description: 'Colour band, pill headings and an experience timeline.', categories: ['modern', 'creative'], layout: 'timeline', header: 'band', heading: 'pill', skills: 'tags', sidebar: 'none', font: 'poppins-inter', photo: true, icons: true, palettes: STANDARD },
  // ------------------------------------------------------------------- Executive
  { id: 'regent', name: 'Regent', description: 'Playfair headings and generous spacing for senior roles.', categories: ['executive', 'professional', 'ats'], layout: 'single', header: 'center', heading: 'double', skills: 'columns', sidebar: 'none', font: 'playfair-source', photo: false, icons: false, palettes: STANDARD },
  { id: 'sterling', name: 'Sterling', description: 'Dark band header and an executive summary up top.', categories: ['executive'], layout: 'banner', header: 'band', heading: 'caps', skills: 'columns', sidebar: 'none', font: 'lora-inter', photo: true, icons: true, palettes: STANDARD },
  { id: 'monarch', name: 'Monarch', description: 'Merriweather, split header and a light sidebar.', categories: ['executive', 'professional'], layout: 'sidebar-right', header: 'split', heading: 'line-after', skills: 'list', sidebar: 'soft', font: 'merriweather', photo: false, icons: false, palettes: STANDARD },
  { id: 'ambassador', name: 'Ambassador', description: 'Gutter headings with DM Serif for a refined feel.', categories: ['executive', 'ats'], layout: 'gutter', header: 'center', heading: 'plain', skills: 'columns', sidebar: 'none', font: 'dm-serif', photo: false, icons: false, palettes: STANDARD },
  // -------------------------------------------------------------------- Creative
  { id: 'mosaic', name: 'Mosaic', description: 'Centred photo header with cards and tags.', categories: ['creative', 'photo'], layout: 'cards', header: 'photo-center', heading: 'pill', skills: 'tags', sidebar: 'none', font: 'dm-serif', photo: true, icons: true, palettes: STANDARD },
  { id: 'canvas', name: 'Canvas', description: 'Bold dark sidebar and Space Grotesk type.', categories: ['creative', 'photo', 'modern'], layout: 'sidebar-left', header: 'left', heading: 'bar', skills: 'bars', sidebar: 'dark', font: 'space-grotesk', photo: true, icons: true, palettes: STANDARD },
  { id: 'studio', name: 'Studio', description: 'Large name in a colour band with dot skills.', categories: ['creative'], layout: 'banner', header: 'band', heading: 'line-after', skills: 'dots', sidebar: 'none', font: 'raleway-lato', photo: true, icons: true, palettes: STANDARD },
  // ---------------------------------------------------------------------- Simple
  { id: 'essential', name: 'Essential', description: 'No-frills Calibri CV that recruiters print well.', categories: ['simple', 'ats'], layout: 'single', header: 'left', heading: 'plain', skills: 'list', sidebar: 'none', font: 'calibri', photo: false, icons: false, palettes: STANDARD },
  { id: 'paper', name: 'Paper', description: 'Quiet, centred and minimal.', categories: ['simple', 'ats'], layout: 'minimal', header: 'center', heading: 'caps', skills: 'inline', sidebar: 'none', font: 'lato', photo: false, icons: false, palettes: STANDARD },
  // ---------------------------------------------------------------------- Europass
  { id: 'europass-classic', name: 'Europass Classic', description: 'The European CV structure: label column, CEFR language grid, EQF levels.', categories: ['europass', 'ats', 'photo'], layout: 'europass', header: 'split', heading: 'plain', skills: 'list', sidebar: 'none', font: 'open-sans', photo: true, icons: false, palettes: ['blue', 'navy', 'ocean', 'teal', 'graphite', 'ink'], regions: ['europass'] },
  { id: 'europass-modern', name: 'Europass Modern', description: 'Europass structure with a contemporary colour header.', categories: ['europass', 'photo'], layout: 'europass', header: 'band', heading: 'plain', skills: 'list', sidebar: 'none', font: 'inter', photo: true, icons: false, palettes: ['blue', 'navy', 'ocean', 'teal', 'graphite', 'ink'], regions: ['europass'] },
  // ---------------------------------------------------------------------- Canadian
  { id: 'maple-classic', name: 'Maple Classic', description: 'Canadian standard: 2 pages, Letter size, no photo or personal data.', categories: ['canadian', 'ats', 'professional'], layout: 'single', header: 'center', heading: 'underline', skills: 'columns', sidebar: 'none', font: 'arial', photo: false, icons: false, palettes: ['red', 'navy', 'graphite', 'ink', 'teal', 'forest', 'ocean', 'burgundy'], regions: ['canada'] },
  { id: 'maple-modern', name: 'Maple Modern', description: 'Canadian format with gutter headings and a skills summary first.', categories: ['canadian', 'ats', 'modern'], layout: 'gutter', header: 'split', heading: 'plain', skills: 'list', sidebar: 'none', font: 'source-sans', photo: false, icons: false, palettes: ['red', 'navy', 'graphite', 'ink', 'teal', 'forest', 'ocean', 'burgundy'], regions: ['canada'] },
  { id: 'maple-professional', name: 'Maple Professional', description: 'Compact Canadian résumé with a highlights-of-qualifications feel.', categories: ['canadian', 'ats', 'professional'], layout: 'compact', header: 'left', heading: 'bar', skills: 'columns', sidebar: 'none', font: 'calibri', photo: false, icons: false, palettes: ['red', 'navy', 'graphite', 'ink', 'teal', 'forest', 'ocean', 'burgundy'], regions: ['canada'] },
];

export type Design = {
  id: string;
  name: string;
  family: Family;
  palette: Palette;
  /** "ATS-optimized": single reading column. "ATS-friendly": columns, but text order is still linear. */
  ats: 'optimized' | 'friendly';
};

const ATS_OPTIMIZED: LayoutKind[] = ['single', 'gutter', 'compact', 'minimal', 'timeline', 'europass'];

export const DESIGNS: Design[] = FAMILIES.flatMap((family) =>
  family.palettes.map((pid) => {
    const palette = PALETTES.find((p) => p.id === pid)!;
    return {
      id: `${family.id}-${palette.id}`,
      name: `${family.name} · ${palette.name}`,
      family,
      palette,
      ats: ATS_OPTIMIZED.includes(family.layout) ? 'optimized' : 'friendly',
    } satisfies Design;
  }),
);

export const DESIGN_COUNT = DESIGNS.length;

export const designById = (id: string): Design => DESIGNS.find((d) => d.id === id) ?? DESIGNS.find((d) => d.id === 'meridian-ocean')!;

/** The colours a renderer needs, derived from the accent. */
export function themeFor(design: Design, accentOverride?: string) {
  const accent = accentOverride || design.palette.accent;
  const dark = mix(accent, '#0b1220', 0.35);
  const soft = mix(accent, '#ffffff', 0.92);
  const line = mix(accent, '#ffffff', 0.7);
  const sidebarBg = design.family.sidebar === 'dark' ? dark : design.family.sidebar === 'soft' ? soft : '#ffffff';
  const sidebarText = design.family.sidebar === 'dark' ? '#ffffff' : '#1f2937';
  return { accent, dark, soft, line, sidebarBg, sidebarText, onAccent: readableOn(accent) };
}
