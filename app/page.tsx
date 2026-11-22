import Link from 'next/link';
import AppShell from '@/components/AppShell';
import DesignThumb from '@/components/cv/DesignThumb';
import { sampleCv } from '@/lib/cv-model';
import { DESIGN_COUNT, FAMILIES } from '@/lib/designs';
import { LETTER_TEMPLATES } from '@/lib/letters/templates';
import { BANNER_TEMPLATES } from '@/lib/linkedin/render';

const FEATURES = [
  { title: 'ATS-friendly by construction', body: 'Real text, standard headings and linear reading order in every design. A live ATS score with 35+ checks and job-ad keyword matching.', icon: '🎯' },
  { title: `${DESIGN_COUNT} professional designs`, body: `${FAMILIES.length} layout families × curated colour palettes — switch designs instantly without retyping anything.`, icon: '🎨' },
  { title: 'Europass & Canadian formats', body: 'EU-standard CVs with the CEFR language grid and EQF levels; Canadian résumés on Letter paper with no photo or personal data.', icon: '🌍' },
  { title: 'Cover, motivation & SOP letters', body: `${LETTER_TEMPLATES.length} proven templates auto-filled from your CV and project, styled to match your CV.`, icon: '✉️' },
  { title: 'LinkedIn makeover kit', body: `${BANNER_TEMPLATES.length} banner designs, profile-photo frames, post images, headline formulas and an About-section writer.`, icon: '💼' },
  { title: 'Grammar & style checker', body: 'Spelling, grammar, a/an, passive voice, weak phrases, clichés and US/UK/Canadian spelling — live, offline, with one-click fixes.', icon: '✍️' },
  { title: 'Projects for every application', body: 'Keep each job target in its own project: the job ad, tailored CV, letters, LinkedIn kit and status in one place.', icon: '🗂️' },
  { title: 'AI writing assistant', body: 'Rewrite bullets, draft summaries and letters, and get a tailoring plan for a job ad (when enabled on the server).', icon: '✨' },
  { title: 'PDF, Word, text & JSON', body: 'Print-perfect PDFs with clickable links, editable .docx, ATS plain text, and JSON Resume import/export.', icon: '📄' },
];

export default function Home() {
  const cv = sampleCv();
  const showcase = ['aurora-ocean', 'meridian-navy', 'horizon-teal', 'europass-classic-blue', 'maple-classic-red', 'canvas-plum', 'regent-ink', 'prism-sunset'];
  return (
    <AppShell>
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="container-app grid items-center gap-10 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            <span className="chip bg-brand-100 text-brand-700">ATS checker · Grammar checker · {DESIGN_COUNT} designs</span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              The complete engine for <span className="text-brand-600">CVs that get interviews</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-soft">
              Build ATS-friendly CVs, Europass and Canadian résumés, cover letters, motivation letters, statements of purpose and LinkedIn makeover images — organised into a project for every application.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login?mode=signup" className="btn-primary px-5 py-3 text-base">Create your free workspace</Link>
              <Link href="/templates" className="btn-secondary px-5 py-3 text-base">Browse {DESIGN_COUNT} designs</Link>
            </div>
            <p className="mt-4 text-xs text-ink-mute">No credit card. Your data stays in your account — export it any time.</p>
          </div>
          <div className="relative h-[420px]">
            {showcase.slice(0, 3).map((id, i) => (
              <div key={id} className="absolute overflow-hidden rounded-lg shadow-sheet ring-1 ring-slate-200" style={{ left: `${i * 22}%`, top: i * 28, transform: `rotate(${(i - 1) * 4}deg)`, zIndex: i }}>
                <DesignThumb cv={cv} designId={id} width={250} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-app py-16">
        <h2 className="text-center font-display text-3xl font-bold">Everything a professional job application needs</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <div className="text-2xl" aria-hidden="true">{f.icon}</div>
              <h3 className="mt-3 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16">
        <div className="container-app">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold">Designs for every industry and country</h2>
              <p className="mt-2 text-ink-soft">ATS-optimized, modern, executive, creative, academic, Europass and Canadian.</p>
            </div>
            <Link href="/templates" className="btn-secondary">See all {DESIGN_COUNT}</Link>
          </div>
          <div className="mt-8 flex gap-5 overflow-x-auto pb-4">
            {showcase.map((id) => (
              <Link key={id} href={`/templates?design=${id}`} className="shrink-0 overflow-hidden rounded-lg shadow-card ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-sheet">
                <DesignThumb cv={cv} designId={id} width={200} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-app grid gap-8 py-16 lg:grid-cols-3">
        {[
          { step: '1', title: 'Create a project', body: 'One per job target — add the job ad, the company and the country standard (US, UK, Europass, Canada…).' },
          { step: '2', title: 'Build your documents', body: 'CV, cover letter, motivation letter or SOP and a LinkedIn kit, all sharing your details and matching designs.' },
          { step: '3', title: 'Check and export', body: 'Fix every ATS and grammar issue, hit a strong keyword match, then export PDF or Word.' },
        ].map((s) => (
          <div key={s.step} className="flex gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-600 font-bold text-white">{s.step}</div>
            <div>
              <h3 className="font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{s.body}</p>
            </div>
          </div>
        ))}
      </section>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-ink-mute">
        CV Engine · <Link href="/guide" className="hover:text-ink">CV guide</Link> · <Link href="/ats-checker" className="hover:text-ink">ATS checklist</Link> · <Link href="/templates" className="hover:text-ink">Templates</Link>
      </footer>
    </AppShell>
  );
}
