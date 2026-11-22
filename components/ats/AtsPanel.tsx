'use client';
import { useMemo, useState } from 'react';
import type { CvData, Project } from '@/lib/types';
import { analyzeCv, type AtsCheck, type CheckCategory } from '@/lib/ats';
import { TextArea } from '@/components/ui/fields';
import Icon from '@/components/ui/Icon';
import { cx } from '@/lib/utils';

export function ScoreRing({ score, size = 96, label }: { score: number; size?: number; label?: string }) {
  const stroke = size < 60 ? 4 : 8;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const color = score >= 85 ? '#059669' : score >= 70 ? '#2563EB' : score >= 50 ? '#D97706' : '#DC2626';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#E2E8F0" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset .5s' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className={size < 60 ? 'text-xs font-bold' : 'text-2xl font-bold'} style={{ color }}>{score}</div>
          {label && <div className="text-[10px] font-semibold text-ink-mute">{label}</div>}
        </div>
      </div>
    </div>
  );
}

const STATUS_ICON: Record<AtsCheck['status'], { icon: string; cls: string }> = {
  pass: { icon: 'check', cls: 'bg-emerald-100 text-emerald-700' },
  warn: { icon: 'alert', cls: 'bg-amber-100 text-amber-700' },
  fail: { icon: 'x', cls: 'bg-red-100 text-red-700' },
  info: { icon: 'info', cls: 'bg-slate-100 text-slate-600' },
};

export function CheckList({ checks, onFix }: { checks: AtsCheck[]; onFix?: (target: string) => void }) {
  const cats = [...new Set(checks.map((c) => c.category))] as CheckCategory[];
  const [hidePass, setHidePass] = useState(false);
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-xs text-ink-soft">
        <input type="checkbox" checked={hidePass} onChange={(e) => setHidePass(e.target.checked)} /> Show only items to fix
      </label>
      {cats.map((cat) => {
        const list = checks.filter((c) => c.category === cat && (!hidePass || c.status === 'warn' || c.status === 'fail'));
        if (!list.length) return null;
        const passed = checks.filter((c) => c.category === cat && c.status === 'pass').length;
        const total = checks.filter((c) => c.category === cat && c.status !== 'info').length;
        return (
          <div key={cat}>
            <h4 className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-ink-mute">
              {cat}
              <span className="font-semibold normal-case tracking-normal">{passed}/{total}</span>
            </h4>
            <ul className="mt-2 space-y-1.5">
              {list.map((c) => (
                <li key={c.id} className="flex gap-2 rounded-lg bg-white p-2 ring-1 ring-slate-100">
                  <span className={cx('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full', STATUS_ICON[c.status].cls)}>
                    <Icon name={STATUS_ICON[c.status].icon} className="h-3 w-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{c.label}</div>
                    <div className="text-xs leading-relaxed text-ink-mute">{c.detail}</div>
                  </div>
                  {onFix && c.fix && (c.status === 'warn' || c.status === 'fail') && (
                    <button className="btn-ghost btn-sm shrink-0 self-start text-brand-600" onClick={() => onFix(c.fix!)}>
                      Fix
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export default function AtsPanel({ cv, project, pages, onProject, onAddSkill, onFix }: { cv: CvData; project: Project | null; pages: number; onProject: (p: Partial<Project>) => void; onAddSkill: (skill: string) => void; onFix: (target: string) => void }) {
  const report = useMemo(() => analyzeCv(cv, { region: project?.region, jobDescription: project?.jobDescription, targetRole: project?.targetRole, pages }), [cv, project, pages]);
  const [showText, setShowText] = useState(false);
  const [showJd, setShowJd] = useState(!project?.jobDescription);
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <ScoreRing score={report.score} label={report.grade} />
        <div className="grid flex-1 grid-cols-2 gap-2 text-center text-xs">
          <div className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{report.keywords.all.length ? `${report.keywords.percent}%` : '—'}</div>Keyword match</div>
          <div className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{pages}</div>Page{pages > 1 ? 's' : ''}</div>
          <div className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{report.stats.quantified}/{report.stats.bullets}</div>Quantified</div>
          <div className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{report.stats.words}</div>Words</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <button className="flex w-full items-center justify-between text-sm font-semibold" onClick={() => setShowJd((s) => !s)}>
          Job description {project?.jobDescription ? '✓' : '(paste to match keywords)'}
          <span>{showJd ? '−' : '+'}</span>
        </button>
        {showJd && <TextArea className="mt-2" value={project?.jobDescription ?? ''} onChange={(v) => onProject({ jobDescription: v })} rows={6} autoGrow={false} placeholder="Paste the job ad here…" />}
        {report.keywords.all.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-semibold text-ink-soft">Keywords from the ad</div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {report.keywords.matched.map((k) => (
                <span key={k} className="chip bg-emerald-50 text-emerald-700">✓ {k}</span>
              ))}
              {report.keywords.missing.map((k) => (
                <button key={k} className="chip bg-red-50 text-red-700 hover:bg-red-100" title="Add to skills" onClick={() => onAddSkill(k)}>
                  + {k}
                </button>
              ))}
            </div>
            {report.keywords.missing.length > 0 && <p className="mt-1.5 text-[11px] text-ink-mute">Click a missing keyword to add it to your skills — only add skills you really have, and use them in your bullets too.</p>}
          </div>
        )}
      </div>

      <CheckList checks={report.checks} onFix={onFix} />

      <div>
        <button className="btn-secondary btn-sm" onClick={() => setShowText((s) => !s)}>
          <Icon name="eye" className="h-3.5 w-3.5" /> {showText ? 'Hide' : 'Show'} what the ATS reads
        </button>
        {showText && <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">{report.plainText}</pre>}
      </div>
    </div>
  );
}
