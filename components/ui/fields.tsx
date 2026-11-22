'use client';
import { useEffect, useRef } from 'react';
import { cx } from '@/lib/utils';

type Base = { label?: string; hint?: string; className?: string; id?: string };

export function Field({ label, hint, className, children, id }: Base & { children: React.ReactNode }) {
  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={id}>
          {label}
        </label>
      )}
      {children}
      {hint && <p className="mt-1 text-[11px] text-ink-mute">{hint}</p>}
    </div>
  );
}

let n = 0;
const useId = (id?: string) => {
  const r = useRef(id ?? `f${++n}`);
  return r.current;
};

export function TextInput({ label, hint, className, value, onChange, placeholder, type = 'text', id, autoComplete, list, maxLength }: Base & { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; autoComplete?: string; list?: string; maxLength?: number }) {
  const fid = useId(id);
  return (
    <Field label={label} hint={hint} className={className} id={fid}>
      <input id={fid} className="input" type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} list={list} maxLength={maxLength} spellCheck />
    </Field>
  );
}

export function TextArea({ label, hint, className, value, onChange, placeholder, rows = 4, id, autoGrow = true, maxLength }: Base & { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; autoGrow?: boolean; maxLength?: number }) {
  const fid = useId(id);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!autoGrow || !ref.current) return;
    ref.current.style.height = 'auto';
    ref.current.style.height = `${Math.max(ref.current.scrollHeight, rows * 22)}px`;
  }, [value, autoGrow, rows]);
  return (
    <Field label={label} hint={hint} className={className} id={fid}>
      <textarea ref={ref} id={fid} className="input resize-y leading-relaxed" rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} spellCheck maxLength={maxLength} />
    </Field>
  );
}

export function Select<T extends string>({ label, hint, className, value, onChange, options, id }: Base & { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  const fid = useId(id);
  return (
    <Field label={label} hint={hint} className={className} id={fid}>
      <select id={fid} className="input" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Toggle({ label, checked, onChange, className }: { label: string; checked: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <label className={cx('inline-flex cursor-pointer select-none items-center gap-2 text-sm text-ink-soft', className)}>
      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** Month picker that stores "YYYY-MM". */
export function MonthInput({ label, value, onChange, disabled, className }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; className?: string }) {
  const fid = useId();
  return (
    <Field label={label} className={className} id={fid}>
      <input id={fid} type="month" className="input" value={/^\d{4}-\d{2}$/.test(value) ? value : ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    </Field>
  );
}

/** Comma/Enter-separated tag editor. */
export function TagInput({ label, values, onChange, placeholder, className }: { label?: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string; className?: string }) {
  const fid = useId();
  const add = (raw: string) => {
    const items = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (items.length) onChange([...values, ...items.filter((i) => !values.includes(i))]);
  };
  return (
    <Field label={label} className={className} id={fid}>
      <div className="input flex min-h-[42px] flex-wrap items-center gap-1.5 py-1.5">
        {values.map((v, i) => (
          <span key={`${v}-${i}`} className="chip bg-brand-50 text-brand-700">
            {v}
            <button type="button" className="ml-0.5 text-brand-400 hover:text-brand-700" onClick={() => onChange(values.filter((_, j) => j !== i))} aria-label={`Remove ${v}`}>
              ×
            </button>
          </span>
        ))}
        <input
          id={fid}
          className="min-w-[120px] flex-1 border-0 bg-transparent p-0.5 text-sm outline-none focus:ring-0"
          placeholder={placeholder}
          onKeyDown={(e) => {
            const t = e.currentTarget;
            if ((e.key === 'Enter' || e.key === ',') && t.value.trim()) {
              e.preventDefault();
              add(t.value);
              t.value = '';
            } else if (e.key === 'Backspace' && !t.value && values.length) onChange(values.slice(0, -1));
          }}
          onBlur={(e) => {
            if (e.currentTarget.value.trim()) {
              add(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text');
            if (text.includes(',') || text.includes('\n')) {
              e.preventDefault();
              add(text.replace(/\n/g, ','));
            }
          }}
        />
      </div>
    </Field>
  );
}
