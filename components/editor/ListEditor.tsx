'use client';
import { useState } from 'react';
import Icon from '@/components/ui/Icon';
import { cx } from '@/lib/utils';

/** Generic editor for a list of entries: add, remove, duplicate, reorder, collapse. */
export default function ListEditor<T extends { id: string }>({
  items,
  onChange,
  create,
  render,
  summary,
  addLabel,
  empty,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  render: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
  summary: (item: T) => string;
  addLabel: string;
  empty?: string;
}) {
  const [open, setOpen] = useState<string | null>(items.length === 1 ? items[0]!.id : null);
  const move = (i: number, d: number) => {
    const next = [...items];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x!);
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {items.length === 0 && empty && <p className="text-xs text-ink-mute">{empty}</p>}
      {items.map((item, i) => {
        const isOpen = open === item.id;
        return (
          <div key={item.id} className={cx('rounded-xl border bg-white', isOpen ? 'border-brand-200 shadow-sm' : 'border-slate-200')}>
            <div className="flex items-center gap-1 px-3 py-2">
              <button className="min-w-0 flex-1 truncate text-left text-sm font-medium" onClick={() => setOpen(isOpen ? null : item.id)} aria-expanded={isOpen}>
                <span className={cx('mr-1.5 inline-block transition', isOpen && 'rotate-90')}>›</span>
                {summary(item) || <span className="text-ink-mute">(untitled)</span>}
              </button>
              <button className="btn-ghost btn-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                <Icon name="up" className="h-3.5 w-3.5" />
              </button>
              <button className="btn-ghost btn-sm" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                <Icon name="down" className="h-3.5 w-3.5" />
              </button>
              <button
                className="btn-ghost btn-sm"
                onClick={() => {
                  const copy = { ...structuredClone(item), id: create().id };
                  const next = [...items];
                  next.splice(i + 1, 0, copy);
                  onChange(next);
                }}
                aria-label="Duplicate"
              >
                <Icon name="copy" className="h-3.5 w-3.5" />
              </button>
              <button className="btn-ghost btn-sm text-red-500" onClick={() => onChange(items.filter((x) => x.id !== item.id))} aria-label="Remove">
                <Icon name="trash" className="h-3.5 w-3.5" />
              </button>
            </div>
            {isOpen && <div className="border-t border-slate-100 p-3">{render(item, (patch) => onChange(items.map((x) => (x.id === item.id ? { ...x, ...patch } : x))))}</div>}
          </div>
        );
      })}
      <button
        className="btn-secondary btn-sm w-full border-dashed"
        onClick={() => {
          const n = create();
          onChange([...items, n]);
          setOpen(n.id);
        }}
      >
        <Icon name="plus" className="h-3.5 w-3.5" /> {addLabel}
      </button>
    </div>
  );
}

/** Editable list of bullet strings with reorder and an optional per-list action. */
export function BulletList({ bullets, onChange, placeholder }: { bullets: string[]; onChange: (b: string[]) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      {bullets.map((b, i) => (
        <div key={i} className="flex items-start gap-1">
          <span className="mt-2.5 text-brand-400">•</span>
          <textarea
            className="input min-h-[38px] flex-1 resize-none py-1.5 leading-snug"
            rows={Math.max(1, Math.ceil(b.length / 70))}
            value={b}
            placeholder={placeholder}
            spellCheck
            onChange={(e) => onChange(bullets.map((x, j) => (j === i ? e.target.value.replace(/\n/g, ' ') : x)))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const next = [...bullets];
                next.splice(i + 1, 0, '');
                onChange(next);
                setTimeout(() => (e.currentTarget.parentElement?.nextElementSibling?.querySelector('textarea') as HTMLTextAreaElement | null)?.focus(), 0);
              } else if (e.key === 'Backspace' && !b && bullets.length > 1) {
                e.preventDefault();
                onChange(bullets.filter((_, j) => j !== i));
              }
            }}
          />
          <div className="flex flex-col">
            <button className="px-1 text-ink-mute hover:text-ink disabled:opacity-30" disabled={i === 0} onClick={() => { const n = [...bullets]; [n[i - 1], n[i]] = [n[i]!, n[i - 1]!]; onChange(n); }} aria-label="Move bullet up">
              <Icon name="up" className="h-3 w-3" />
            </button>
            <button className="px-1 text-ink-mute hover:text-red-600" onClick={() => onChange(bullets.filter((_, j) => j !== i))} aria-label="Remove bullet">
              <Icon name="x" className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}
      <button className="text-xs font-semibold text-brand-600 hover:underline" onClick={() => onChange([...bullets, ''])}>
        + Add bullet
      </button>
    </div>
  );
}
