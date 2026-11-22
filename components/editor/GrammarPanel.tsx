'use client';
import { useEffect, useMemo, useState } from 'react';
import { applyFix, checkText, summarizeIssues, type GrammarIssue, type GrammarLocale } from '@/lib/grammar';
import type { CheckField } from '@/lib/grammar/fields';
import { aiEnabled, runAi } from '@/lib/ai/client';
import { useToast } from '@/components/ui/Toast';
import Icon from '@/components/ui/Icon';
import { cx } from '@/lib/utils';

const TYPE_STYLE: Record<string, string> = {
  spelling: 'bg-red-50 text-red-700',
  grammar: 'bg-orange-50 text-orange-700',
  punctuation: 'bg-yellow-50 text-yellow-800',
  style: 'bg-violet-50 text-violet-700',
  clarity: 'bg-sky-50 text-sky-700',
};

/**
 * Grammar & style checker over every text field of a document. Built-in rules
 * run live; "Deep check" adds LanguageTool (if configured) and "AI proofread"
 * uses the AI assistant (if configured).
 */
export default function GrammarPanel<D>({ doc, fields, onApply, defaultLocale, mode }: { doc: D; fields: CheckField<D>[]; onApply: (next: D) => void; defaultLocale: GrammarLocale; mode: 'cv' | 'letter' }) {
  const [locale, setLocale] = useState<GrammarLocale>(defaultLocale);
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [types, setTypes] = useState<Set<string>>(new Set(['spelling', 'grammar', 'punctuation', 'style', 'clarity']));
  const [deep, setDeep] = useState<Record<string, GrammarIssue[]>>({});
  const [deepAvailable, setDeepAvailable] = useState(false);
  const [ai, setAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetch('/api/grammar').then((r) => r.json()).then((d) => setDeepAvailable(Boolean(d.enabled))).catch(() => undefined);
    aiEnabled().then(setAi);
  }, []);

  const results = useMemo(
    () =>
      fields.map((f) => {
        const builtIn = checkText(f.text, { locale, mode });
        const extra = (deep[f.key] ?? []).filter((d) => !builtIn.some((b) => b.offset === d.offset));
        return { field: f, issues: [...builtIn, ...extra].filter((i) => types.has(i.type) && !ignored.has(`${f.key}:${i.text}:${i.message}`)) };
      }),
    [fields, locale, mode, deep, types, ignored],
  );
  const all = results.flatMap((r) => r.issues);
  const counts = summarizeIssues(all);

  const runDeep = async () => {
    setBusy(true);
    try {
      const out: Record<string, GrammarIssue[]> = {};
      for (const f of fields) {
        const res = await fetch('/api/grammar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: f.text, language: locale }) });
        if (!res.ok) throw new Error('Deep check is unavailable right now.');
        const data = (await res.json()) as { matches: Omit<GrammarIssue, 'id' | 'text' | 'source'>[] };
        out[f.key] = data.matches.map((m, i) => ({ ...m, id: `${f.key}-lt-${i}`, text: f.text.slice(m.offset, m.offset + m.length), source: 'languagetool' }));
      }
      setDeep(out);
      toast('Deep check complete', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Deep check failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const fix = (f: CheckField<D>, issue: GrammarIssue, rep: string) => {
    onApply(f.apply(doc, applyFix(f.text, issue, rep)));
    setDeep((d) => ({ ...d, [f.key]: [] }));
  };

  const fixAll = () => {
    let next = doc;
    for (const r of results) {
      let text = r.field.text;
      // Apply from the end so earlier offsets stay valid.
      const fixable = r.issues.filter((i) => i.replacements.length && i.source === 'built-in' && i.type !== 'style').sort((a, b) => b.offset - a.offset);
      for (const i of fixable) text = applyFix(text, i, i.replacements[0]!);
      if (text !== r.field.text) next = r.field.apply(next, text);
    }
    onApply(next);
    setDeep({});
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-auto py-1.5" value={locale} onChange={(e) => setLocale(e.target.value as GrammarLocale)} aria-label="English variant">
          <option value="en-US">English (US)</option>
          <option value="en-GB">English (UK)</option>
          <option value="en-CA">English (Canada)</option>
        </select>
        <button className="btn-secondary btn-sm" onClick={fixAll} disabled={!all.some((i) => i.replacements.length && i.type !== 'style')}>
          <Icon name="wand" className="h-3.5 w-3.5" /> Fix all safe issues
        </button>
        {deepAvailable && (
          <button className="btn-secondary btn-sm" onClick={runDeep} disabled={busy}>
            <Icon name="spell" className="h-3.5 w-3.5" /> {busy ? 'Checking…' : 'Deep check'}
          </button>
        )}
      </div>
      <div className="grid grid-cols-5 gap-1.5 text-center">
        {(Object.keys(counts) as (keyof typeof counts)[]).map((t) => (
          <button
            key={t}
            onClick={() => setTypes((s) => { const n = new Set(s); if (n.has(t)) n.delete(t); else n.add(t); return n; })}
            className={cx('rounded-lg px-1 py-1.5 text-[11px] font-semibold capitalize ring-1 ring-inset', types.has(t) ? `${TYPE_STYLE[t]} ring-transparent` : 'bg-white text-ink-mute ring-slate-200 line-through')}
          >
            <div className="text-base">{counts[t]}</div>
            {t}
          </button>
        ))}
      </div>
      {all.length === 0 ? (
        <div className="rounded-xl bg-emerald-50 p-4 text-center text-sm text-emerald-700">
          <Icon name="check" className="mx-auto h-6 w-6" />
          No issues found in {fields.length} text fields.
        </div>
      ) : (
        <div className="space-y-3">
          {results
            .filter((r) => r.issues.length)
            .map((r) => (
              <div key={r.field.key} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="truncate text-xs font-semibold text-ink-soft">{r.field.label}</h4>
                  {ai && (
                    <button
                      className="text-[11px] font-semibold text-violet-600 hover:underline"
                      onClick={async () => {
                        try {
                          const text = await runAi('proofread', { text: r.field.text, locale });
                          onApply(r.field.apply(doc, text));
                        } catch (e) {
                          toast(e instanceof Error ? e.message : 'Failed', 'error');
                        }
                      }}
                    >
                      ✨ AI proofread
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  <Highlighted text={r.field.text} issues={r.issues} />
                </p>
                <ul className="mt-2 space-y-1.5">
                  {r.issues.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className={cx('chip', TYPE_STYLE[i.type])}>{i.type}</span>
                      <span className="text-ink-soft">{i.message}</span>
                      {i.replacements.slice(0, 3).map((rep) => (
                        <button key={rep} className="rounded bg-emerald-600 px-1.5 py-0.5 font-semibold text-white hover:bg-emerald-700" onClick={() => fix(r.field, i, rep)}>
                          {rep || '(remove)'}
                        </button>
                      ))}
                      {i.replacements.length === 0 && i.type === 'clarity' && i.message.includes('cut') && (
                        <button className="rounded bg-slate-600 px-1.5 py-0.5 font-semibold text-white" onClick={() => fix(r.field, i, '')}>
                          Remove
                        </button>
                      )}
                      <button className="text-ink-mute hover:text-ink" onClick={() => setIgnored((s) => new Set(s).add(`${r.field.key}:${i.text}:${i.message}`))}>
                        Ignore
                      </button>
                      {i.source === 'languagetool' && <span className="text-[10px] text-ink-mute">LanguageTool</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      )}
      <p className="text-[11px] text-ink-mute">The built-in checker runs privately in your browser. Your browser’s own spell-checker also underlines words while you type.</p>
    </div>
  );
}

function Highlighted({ text, issues }: { text: string; issues: GrammarIssue[] }) {
  const parts: React.ReactNode[] = [];
  let pos = 0;
  [...issues].sort((a, b) => a.offset - b.offset).forEach((i, n) => {
    if (i.offset < pos) return;
    parts.push(text.slice(pos, i.offset));
    parts.push(
      <mark key={n} className={cx('rounded px-0.5', i.type === 'spelling' ? 'bg-red-100' : i.type === 'grammar' ? 'bg-orange-100' : i.type === 'punctuation' ? 'bg-yellow-100' : i.type === 'style' ? 'bg-violet-100' : 'bg-sky-100')} title={i.message}>
        {text.slice(i.offset, i.offset + i.length) || '␣'}
      </mark>,
    );
    pos = i.offset + i.length;
  });
  parts.push(text.slice(pos));
  return <>{parts}</>;
}
