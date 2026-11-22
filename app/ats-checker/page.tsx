'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { CheckList, ScoreRing } from '@/components/ats/AtsPanel';
import { analyzeText } from '@/lib/ats/text';
import { ATS_CHECKLIST } from '@/lib/ats';

export default function AtsCheckerPage() {
  const [text, setText] = useState('');
  const [jd, setJd] = useState('');
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const result = useMemo(() => (text.trim().length > 40 ? analyzeText(text, jd) : null), [text, jd]);
  const totalItems = ATS_CHECKLIST.reduce((n, c) => n + c.items.length, 0);
  const done = Object.values(ticked).filter(Boolean).length;
  return (
    <AppShell>
      <div className="container-app py-10">
        <h1 className="font-display text-3xl font-bold">ATS checker & checklist</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">Paste the text of any CV (open your PDF, select all, copy) and optionally the job ad. If your CV pastes as a jumble, that is exactly what an applicant tracking system sees too.</p>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="cvtext">CV text</label>
              <textarea id="cvtext" className="input min-h-[280px] font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your CV here…" />
            </div>
            <div>
              <label className="label" htmlFor="jdtext">Job description (optional)</label>
              <textarea id="jdtext" className="input min-h-[140px] text-xs" value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the job ad to check keyword match…" />
            </div>
          </div>
          <div className="card p-5">
            {result ? (
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <ScoreRing score={result.score} label="ATS score" />
                  <div className="text-sm text-ink-soft">
                    {result.words} words
                    {result.keywords.all.length > 0 && <div>Keyword match: <b>{result.keywords.percent}%</b></div>}
                  </div>
                </div>
                {result.keywords.missing.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold">Missing keywords</div>
                    <div className="mt-1 flex flex-wrap gap-1">{result.keywords.missing.map((k) => <span key={k} className="chip bg-red-50 text-red-700">{k}</span>)}</div>
                  </div>
                )}
                <CheckList checks={result.checks} />
                <div className="rounded-xl bg-brand-50 p-4 text-sm">
                  <b>Fix everything in one place.</b> Rebuild this CV in CV Engine to get live scoring, ATS-safe designs and one-click grammar fixes.{' '}
                  <Link href="/login?mode=signup" className="font-semibold text-brand-700 underline">Start free →</Link>
                </div>
              </div>
            ) : (
              <div className="grid h-full place-items-center py-16 text-center text-sm text-ink-mute">Paste your CV to see the report.</div>
            )}
          </div>
        </div>

        <section className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold">The complete ATS checklist</h2>
              <p className="text-sm text-ink-mute">Tick items off as you go — {done}/{totalItems} done.</p>
            </div>
            <button className="btn-secondary btn-sm" onClick={() => window.print()}>Print checklist</button>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {ATS_CHECKLIST.map((group) => (
              <div key={group.category} className="card p-5">
                <h3 className="font-semibold">{group.category}</h3>
                <ul className="mt-3 space-y-2">
                  {group.items.map((item) => (
                    <li key={item}>
                      <label className="flex cursor-pointer gap-2.5 text-sm text-ink-soft">
                        <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={Boolean(ticked[item])} onChange={(e) => setTicked((t) => ({ ...t, [item]: e.target.checked }))} />
                        <span className={ticked[item] ? 'line-through opacity-60' : ''}>{item}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
