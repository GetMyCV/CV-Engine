'use client';
import { useMemo, useState } from 'react';
import DesignThumb from './DesignThumb';
import { CATEGORIES, DESIGNS, FAMILIES, PALETTES, type DesignCategory } from '@/lib/designs';
import type { CvData, Region } from '@/lib/types';
import { cx } from '@/lib/utils';

/** Filterable, paginated grid of all designs. Used by the gallery page and the editor's design picker. */
export default function DesignGallery({
  cv,
  selected,
  onSelect,
  region = 'international',
  thumbWidth = 180,
  initialCategory,
}: {
  cv: CvData;
  selected?: string;
  onSelect: (id: string) => void;
  region?: Region;
  thumbWidth?: number;
  initialCategory?: DesignCategory | 'all';
}) {
  const [cat, setCat] = useState<DesignCategory | 'all'>(initialCategory ?? (region === 'europass' ? 'europass' : region === 'canada' ? 'canadian' : 'all'));
  const [palette, setPalette] = useState('all');
  const [family, setFamily] = useState('all');
  const [atsOnly, setAtsOnly] = useState(false);
  const [limit, setLimit] = useState(24);
  const list = useMemo(
    () =>
      DESIGNS.filter((d) => cat === 'all' || d.family.categories.includes(cat))
        .filter((d) => palette === 'all' || d.palette.id === palette)
        .filter((d) => family === 'all' || d.family.id === family)
        .filter((d) => !atsOnly || d.ats === 'optimized'),
    [cat, palette, family, atsOnly],
  );
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {[{ id: 'all' as const, label: 'All' }, ...CATEGORIES].map((c) => (
          <button key={c.id} onClick={() => { setCat(c.id); setLimit(24); }} className={cx('rounded-full px-3 py-1 text-xs font-semibold', cat === c.id ? 'bg-brand-600 text-white' : 'bg-white text-ink-soft ring-1 ring-slate-200 hover:bg-slate-50')}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <select className="input w-auto py-1.5" value={family} onChange={(e) => { setFamily(e.target.value); setLimit(24); }} aria-label="Layout family">
          <option value="all">All layouts ({FAMILIES.length})</option>
          {FAMILIES.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Colour">
          <button onClick={() => setPalette('all')} className={cx('rounded-full px-2 py-0.5 text-xs', palette === 'all' ? 'bg-ink text-white' : 'text-ink-soft')}>Any colour</button>
          {PALETTES.map((p) => (
            <button key={p.id} title={p.name} aria-label={p.name} onClick={() => { setPalette(p.id); setLimit(24); }} className={cx('h-5 w-5 rounded-full ring-offset-1', palette === p.id && 'ring-2 ring-ink')} style={{ background: p.accent }} />
          ))}
        </div>
        <label className="ml-auto inline-flex items-center gap-2 text-xs font-medium text-ink-soft">
          <input type="checkbox" checked={atsOnly} onChange={(e) => setAtsOnly(e.target.checked)} /> ATS-optimized only
        </label>
      </div>
      <p className="mt-3 text-xs text-ink-mute">{list.length} designs</p>
      <div className="mt-2 grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${thumbWidth}px, 1fr))` }}>
        {list.slice(0, limit).map((d) => (
          <button key={d.id} onClick={() => onSelect(d.id)} className={cx('group text-left', selected === d.id && 'scale-[0.98]')}>
            <div className={cx('overflow-hidden rounded-lg ring-1 transition group-hover:-translate-y-0.5 group-hover:shadow-sheet', selected === d.id ? 'ring-4 ring-brand-500' : 'ring-slate-200')}>
              <DesignThumb cv={cv} designId={d.id} width={thumbWidth} region={region} />
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="truncate text-xs font-semibold">{d.name}</span>
              {d.ats === 'optimized' && <span className="chip shrink-0 bg-emerald-50 text-emerald-700">ATS</span>}
            </div>
          </button>
        ))}
      </div>
      {limit < list.length && (
        <div className="mt-6 text-center">
          <button className="btn-secondary" onClick={() => setLimit((l) => l + 36)}>
            Show more ({list.length - limit} left)
          </button>
        </div>
      )}
    </div>
  );
}
