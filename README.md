# CV Engine

A complete CV-generation platform built with Next.js. Each user gets a private workspace of **projects** (one per job target), and each project holds every document that application needs:

| Document | What you get |
| --- | --- |
| **CV / résumé** | 468 designs (32 layout families × colour palettes), Europass and Canadian standard formats, region presets, live ATS score, grammar checker, PDF / Word / text / JSON Resume export |
| **Cover letter** | 18 templates (graduate, career change, executive, Canadian newcomer…) |
| **Motivation letter** | 7 templates (Master's, scholarship, Erasmus, Europass job, PhD, apprenticeship…) |
| **Statement of purpose** | 8 templates (MS CS, MBA, PhD, Data Science, MPH, Canadian study-permit study plan…) |
| **LinkedIn makeover** | 24 banner templates (1584×396), 8 profile-photo frames, post images, headline formulas, an About-section writer and a 14-point profile checklist |

Letters are filled automatically from the project (role, company, job ad) and the linked CV (name, current role, skills, best quantified achievement). They also borrow the CV's design, so the CV and letters look like a matching set.

## Features

**CV builder**
- Every section a professional CV can include: contact header, summary, experience, education, skills (grouped, with optional levels), languages (with the CEFR self-assessment grid), certifications, projects, awards, publications, volunteering, courses, memberships, interests, references, plus unlimited custom sections. Each section has inline guidance.
- Reorder, rename and hide sections. Undo/redo, autosave and version history (snapshots before design switches, AI rewrites and restores).
- Region presets for international, US, UK, Europass/EU, Canada, Australia, Gulf and academic CVs. Each preset sets section order, paper size, date format, and photo/personal-data rules, e.g. the photo is suppressed on US/UK/Canadian CVs.
- Live preview with exact A4/Letter pagination (`lib/paginate.ts`): blocks never split across a page edge, continuation pages get proper top margins, and sidebars and colour bands fill every page. The preview matches the PDF.

**ATS**
- 35+ weighted checks in six groups: contact & header, structure, content quality, length & format, keywords, and region rules. Each check explains how to fix the problem, with a "Fix" jump to the relevant section.
- Keyword extraction from the job ad, plus a match percentage. Click a missing keyword to add it to your skills.
- "What the ATS reads": the plain-text layer in reading order.
- A standalone `/ats-checker` for any pasted CV, plus the full printable ATS checklist.
- Every design keeps real, selectable text in a linear reading order. Designs marked **ATS-optimized** use a single reading column; sidebar designs are marked **ATS-friendly**.

**Grammar & style checker** (`lib/grammar`)
- Runs offline in the browser and checks:
  - 217 common misspellings
  - Confused words (its/it's, then/than, could of…) and a/an, including acronyms
  - Repeated words, capitalisation, punctuation spacing and wordiness
  - Passive voice, weak CV phrases ("responsible for"), clichés and first-person pronouns
  - US/UK/Canadian spelling consistency
- One-click fixes and "fix all safe issues".
- Optional deep pass through a LanguageTool server (`LANGUAGETOOL_URL`).

**AI writing assistant** (optional, needs `ANTHROPIC_API_KEY`)
- Rewrites bullets, drafts summaries, letters and LinkedIn About sections, suggests headlines, proofreads, and produces a tailoring plan for a job ad.
- The prompts forbid inventing facts and insert `[placeholders]` where a number is missing.
- Without a key, offline helpers take over: a bullet strengthener, a summary drafter and an About drafter.

**Accounts & storage**
- **Local workspace mode** (default, zero setup). Accounts with salted PBKDF2 password hashes and per-user projects are stored in the browser's IndexedDB. This keeps profiles separate on a shared machine, but it is not server-grade security.
- **Cloud mode.** Set the Supabase env vars and run `supabase/migrations/0001_init.sql`. You get email/password auth, and projects and documents live in Postgres with Row Level Security restricting every row to its owner.
- Full backup and restore (JSON) from Account settings; JSON Resume import/export.

## Getting started

```bash
npm install
cp .env.example .env.local   # all variables are optional
npm run dev                  # http://localhost:3000
```

| Script | |
| --- | --- |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Engine tests: designs, ATS, keywords, grammar, letters, import/export |

### Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Enable cloud accounts and sync (otherwise local workspace mode) |
| `ANTHROPIC_API_KEY` | Enable the AI writing assistant (server-side only) |
| `LANGUAGETOOL_URL` | Enable the "Deep check" grammar pass, e.g. `https://api.languagetool.org/v2/check` |

The AI and grammar routes are API routes, so deploy to a Node host (Vercel, Netlify, Render, a VPS), not static GitHub Pages.

## Project structure

```
app/                     Routes: landing, login, dashboard, projects/[id]/{cv,letter,linkedin}/[docId],
                         templates, letters, ats-checker, guide, settings, api/{ai,grammar}
components/cv            CvRenderer (all 468 designs), thumbnails, design gallery
components/editor        CV & letter editors, section editors, ATS/grammar/design panels
components/linkedin      LinkedIn makeover editor (canvas)
lib/types.ts             Data model (Project, DocumentRecord, CvData, LetterData, LinkedInData)
lib/cv-model.ts          Section catalog & guidance, region rules, defaults, sample CV
lib/designs              Families, palettes, fonts → design library
lib/ats                  ATS analyzer, keyword extraction, pasted-text checker, vocabularies
lib/grammar              Grammar/style rules and dictionaries
lib/letters              Letter templates and placeholder filling
lib/linkedin             Banner/photo/post renderers, headline formulas, checklist
lib/export               DOCX, plain text, JSON Resume
lib/store                Local (IndexedDB) and Supabase repositories + auth
lib/paginate.ts          Print-accurate pagination
supabase/migrations      Database schema with RLS
```

## Notes on design sources

The designs are original to this project. They are built from structured data, not imported Canva template files: Canva's licence does not allow its templates to be redistributed inside another product. Generating the designs from data is also what lets one CV switch between all 468 designs, stay ATS-parseable and export to Word. The Europass layouts follow the public Europass CV structure (CEFR grid, EQF levels) without using the EU's logo or branding.
