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

## Access model: private admin + client template links

- **Admin only.** Only `inbox.ashen@gmail.com` can sign in or set up the account (`NEXT_PUBLIC_ADMIN_EMAILS` overrides this). Every page is behind that sign-in: the dashboard, editors, template gallery, letters, ATS checker and guide. Anyone else is sent to the sign-in page and refused.
- **Client template requests** (`/requests`, admin):
  1. Create a request for a client: their name, an optional WhatsApp number and email, a message, and either a hand-picked shortlist or all designs.
  2. Send them the link by WhatsApp, email or copy-paste.
- **Client page** (`/choose`): no sign-in, no menu, no other features. The client sees only the templates (shown with their own name), previews them, chooses one and sends their contact details.
- **Getting the choice back.** Every route available is used:
  - **Supabase connected:** saved online and shown automatically under Client requests.
  - **`NEXT_PUBLIC_WEB3FORMS_KEY` set** (repo variable or secret): emailed to the admin.
  - **Always:** the client can send a one-click email to the admin containing a selection link. Opening that link imports the choice; the code can also be pasted into "Import a selection".
- **Build the CV.** "Start CV in this template" creates a project and a CV already set to the chosen design, with the client's name and contact details filled in.

How secure is this? In cloud mode, the database itself enforces admin-only access (`supabase/migrations/0002_admin_and_requests.sql`): only emails in the `admins` table can read or write anything, and clients can only add a selection. After creating the admin account, turn off "Allow new users to sign up" in Supabase → Authentication. In local mode the app refuses other emails, and all data stays in the admin's own browser, which no one else can reach.

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
- A standalone `/ats-checker`: upload a CV (PDF, Word .docx, .txt, or a CV Engine / JSON Resume file) or paste its text. Files are parsed in the browser (pdf.js, mammoth) and never uploaded. It shows exactly the text an ATS would extract, adds file-level checks (scanned PDF with no text layer, tables, images, page count, file size and name), and runs the full structured check on JSON uploads. The printable ATS checklist is on the same page.
- Every design keeps real, selectable text in a linear reading order. Designs marked **ATS-optimized** use a single reading column; sidebar designs are marked **ATS-friendly**.

**Letters written from your CV, live** (`lib/letters/compose.ts`)
- Every cover letter, motivation letter and statement of purpose is composed from the linked CV:
  - the current role and earlier roles, and the top achievements, ranked by numbers and by how well they match the job ad
  - skills that match the job ad, education and grade, thesis and coursework
  - projects, certifications, languages (with CEFR levels for European letters), volunteering, awards, publications and work authorisation
- Each template has its own structure: graduate, career change, referral, prospecting, Canadian newcomer, executive, Master's, scholarship, PhD, Europass job, the SOP sections, and the Canadian study-plan sections.
- **Real time:** the letter re-writes itself as you change the CV (even in another tab), the job ad, the tone (confident, formal or warm), the length, or which CV sections to include.
- **Hand edits are kept:** a paragraph you rewrite is marked "Edited" and left alone; click "Regenerate" to hand it back.
- **Never invents facts:** a few short answers make the letter personal (why this company, career goals, referrer, funding and ties for study permits). Anything required but missing is flagged rather than made up.

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
- **JSON export & import:** every document (CV, letters, LinkedIn kit) exports as a complete CV Engine JSON file (`*.cv-engine.json`: content, design and settings) from the editor's Export menu or the project page, and re-imports via **Import JSON** on any project. CVs also export and import as JSON Resume. Full-account backup and restore is in Account settings.

## Getting started

```bash
npm install
cp .env.example .env.local   # all variables are optional
npm run dev                  # http://localhost:3000
```

| Script | |
| --- | --- |
| `npm run build` / `npm start` | Production build / server |
| `npm run build:pages` | Static export for GitHub Pages into `./out` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Engine tests: designs, ATS, keywords, grammar, letters, import/export |

### Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Enable cloud accounts and sync (otherwise local workspace mode) |
| `ANTHROPIC_API_KEY` | Enable the AI writing assistant (server-side only) |
| `LANGUAGETOOL_URL` | Enable the "Deep check" grammar pass, e.g. `https://api.languagetool.org/v2/check` |
| `ALLOWED_ORIGINS` | Origins allowed to call the API routes cross-origin (default `https://getmycv.github.io`) |

## Hosting

**GitHub Pages (this repo):** <https://getmycv.github.io/CV-Engine/>

`.github/workflows/deploy-pages.yml` builds the static version (`npm run build:pages`, served under `/CV-Engine`) and publishes it on every push to `main`. The one-time setting is **Settings → Pages → Source: GitHub Actions**; the workflow tries to switch it on automatically.

GitHub Pages serves files only, so the static site leaves out the two server routes:
- The AI assistant falls back to the offline writing helpers.
- The "Deep check" grammar pass is hidden; the built-in grammar checker still works.

Everything else runs in the browser: accounts, projects, all 468 designs, the ATS and grammar checks, letters, the LinkedIn kit, and PDF/Word export.

Optional repository variables (Settings → Secrets and variables → Actions → Variables):

| Variable | Effect on the Pages build |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cloud accounts instead of browser-only workspaces |
| `NEXT_PUBLIC_API_BASE` | URL of a server deployment of this app (e.g. on Vercel, with `ANTHROPIC_API_KEY` set) that the Pages site calls for AI and deep grammar checks. That server allows `https://getmycv.github.io` by default (`ALLOWED_ORIGINS`). |

**Node hosting (full app incl. AI routes):** `npm run build && npm start`, or import the repo into Vercel/Netlify/Render and set the env vars above.

## Project structure

```
app/                     Routes: landing, login, dashboard, project?id=, edit/{cv,letter,linkedin}?doc=,
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
