'use client';
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { CheckList, ScoreRing } from '@/components/ats/AtsPanel';
import Icon from '@/components/ui/Icon';
import { analyzeText } from '@/lib/ats/text';
import { ATS_CHECKLIST, analyzeCv, type AtsCheck } from '@/lib/ats';
import { ACCEPTED, readCvFile, type UploadedCv } from '@/lib/ats/upload';
import { cx } from '@/lib/utils';

function scoreOf(checks: AtsCheck[]) {
  const scored = checks.filter((c) => c.weight > 0 && c.status !== 'info');
  const total = scored.reduce((s, c) => s + c.weight, 0);
  const earned = scored.reduce((s, c) => s + c.weight * (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0), 0);
  return total ? Math.round((earned / total) * 100) : 0;
}

export default function AtsCheckerPage() {
  const [text, setText] = useState('');
  const [jd, setJd] = useState('');
  const [file, setFile] = useState<UploadedCv | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const input = useRef<HTMLInputElement>(null);

  const result = useMemo(() => {
    if (file?.cv) {
      // Structured CV (CV Engine / JSON Resume): the full editor-grade check.
      const r = analyzeCv(file.cv, { jobDescription: jd });
      const checks = [...file.fileChecks, ...r.checks];
      return { score: scoreOf(checks), checks, keywords: r.keywords, words: r.stats.words, structured: true };
    }
    if (text.trim().length <= 40) return null;
    const r = analyzeText(text, jd);
    const checks = [...(file?.fileChecks ?? []), ...r.checks];
    return { score: scoreOf(checks), checks, keywords: r.keywords, words: r.words, structured: false };
  }, [text, jd, file]);

  const onFile = async (f: File) => {
    setError('');
    setReading(true);
    try {
      const up = await readCvFile(f);
      setFile(up);
      setText(up.text);
    } catch (e) {
      setFile(null);
      setError(e instanceof Error ? e.message : 'Could not read that file.');
    } finally {
      setReading(false);
    }
  };

  const totalItems = ATS_CHECKLIST.reduce((n, c) => n + c.items.length, 0);
  const done = Object.values(ticked).filter(Boolean).length;
  return (
    <AppShell>
      <div className="container-app py-10">
        <h1 className="font-display text-3xl font-bold">ATS checker & checklist</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Upload your CV (PDF, Word, text, or a CV Engine / JSON Resume file) or paste its text, and optionally the job ad. The file is read in your browser — it is never uploaded to a server. We extract the text exactly as an applicant tracking system would, so if it comes out jumbled, that is what the ATS sees too.
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => input.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                const f = e.dataTransfer.files[0];
                if (f) onFile(f);
              }}
              className={cx('flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition', drag ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-white hover:border-brand-400 hover:bg-brand-50/40')}
            >
              <Icon name="upload" className="h-8 w-8 text-brand-600" />
              <div className="mt-2 font-semibold">{reading ? 'Reading your CV…' : file ? `Checked: ${file.fileName}` : 'Upload your CV to check it'}</div>
              <div className="mt-1 text-xs text-ink-mute">Drag & drop or click · PDF, DOCX, TXT or JSON · max 15 MB</div>
              {file && (
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  <span className="chip bg-brand-100 text-brand-700">{file.kind.toUpperCase()}</span>
                  {file.pages && <span className="chip bg-slate-100 text-ink-soft">{file.pages} page{file.pages > 1 ? 's' : ''}</span>}
                  {file.cv && <span className="chip bg-emerald-100 text-emerald-700">Structured CV — full check</span>}
                </div>
              )}
              <input
                ref={input}
                type="file"
                accept={ACCEPTED}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                  e.target.value = '';
                }}
              />
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
            <div>
              <div className="flex items-center justify-between">
                <label className="label" htmlFor="cvtext">
                  {file && !file.cv ? 'Text extracted from your file (what the ATS reads)' : file?.cv ? 'Your CV as plain text' : 'Or paste your CV text'}
                </label>
                {file && (
                  <button className="text-xs font-semibold text-ink-mute hover:text-ink" onClick={() => { setFile(null); setText(''); }}>
                    Clear
                  </button>
                )}
              </div>
              <textarea
                id="cvtext"
                className="input min-h-[280px] font-mono text-xs"
                value={text}
                readOnly={Boolean(file?.cv)}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your CV here…"
              />
            </div>
            <div>
              <label className="label" htmlFor="jdtext">
                Job description (optional)
              </label>
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
                    {result.keywords.all.length > 0 && (
                      <div>
                        Keyword match: <b>{result.keywords.percent}%</b>
                      </div>
                    )}
                    <div className="text-xs text-ink-mute">{result.checks.filter((c) => c.status === 'fail' || c.status === 'warn').length} items to improve</div>
                  </div>
                </div>
                {result.keywords.missing.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold">Missing keywords</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {result.keywords.missing.map((k) => (
                        <span key={k} className="chip bg-red-50 text-red-700">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <CheckList checks={result.checks} />
                <div className="rounded-xl bg-brand-50 p-4 text-sm">
                  <b>Fix everything in one place.</b> {file?.cv ? 'Import this file into a project (New CV → Import JSON) to edit it with live scoring.' : 'Rebuild this CV in CV Engine to get live scoring, ATS-safe designs and one-click grammar fixes.'}{' '}
                  <Link href="/dashboard" className="font-semibold text-brand-700 underline">
                    Open CV Engine →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid h-full place-items-center py-16 text-center text-sm text-ink-mute">Upload or paste your CV to see the report.</div>
            )}
          </div>
        </div>

        <section className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold">The complete ATS checklist</h2>
              <p className="text-sm text-ink-mute">
                Tick items off as you go — {done}/{totalItems} done.
              </p>
            </div>
            <button className="btn-secondary btn-sm" onClick={() => window.print()}>
              Print checklist
            </button>
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
