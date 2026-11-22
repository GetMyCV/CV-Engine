'use client';
import { useState } from 'react';
import type { CvData, Region, SectionKey } from '@/lib/types';
import { DESIGN_COUNT, FONTS, PALETTES, designById } from '@/lib/designs';
import { REGION_RULES, sectionTitle, sectionHasContent, newCustomSection } from '@/lib/cv-model';
import Modal from '@/components/ui/Modal';
import DesignGallery from '@/components/cv/DesignGallery';
import DesignThumb from '@/components/cv/DesignThumb';
import { Select, Toggle } from '@/components/ui/fields';
import Icon from '@/components/ui/Icon';
import { cx } from '@/lib/utils';

export default function DesignPanel({ cv, set, region, onSnapshot }: { cv: CvData; set: (fn: (cv: CvData) => CvData) => void; region: Region; onSnapshot: (label: string) => void }) {
  const [gallery, setGallery] = useState(false);
  const design = designById(cv.design.designId);
  const d = cv.design;
  const up = (patch: Partial<CvData['design']>) => set((c) => ({ ...c, design: { ...c.design, ...patch } }));
  const rules = REGION_RULES[region];
  return (
    <div className="space-y-5">
      <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="overflow-hidden rounded ring-1 ring-slate-200">
          <DesignThumb cv={cv} designId={d.designId} width={96} region={region} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{design.name}</div>
          <p className="text-xs text-ink-mute">{design.family.description}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className={cx('chip', design.ats === 'optimized' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{design.ats === 'optimized' ? 'ATS-optimized' : 'ATS-friendly'}</span>
            {design.family.photo && <span className="chip bg-slate-100 text-ink-soft">Photo slot</span>}
          </div>
          <button className="btn-primary btn-sm mt-2" onClick={() => setGallery(true)}>
            <Icon name="palette" className="h-3.5 w-3.5" /> Change design ({DESIGN_COUNT})
          </button>
        </div>
      </div>

      <div>
        <span className="label">Accent colour</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => up({ accent: '' })} className={cx('rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-slate-200', !d.accent && 'bg-ink text-white')}>Design default</button>
          {PALETTES.map((p) => (
            <button key={p.id} title={p.name} aria-label={p.name} onClick={() => up({ accent: p.accent })} className={cx('h-6 w-6 rounded-full ring-offset-1', d.accent === p.accent && 'ring-2 ring-ink')} style={{ background: p.accent }} />
          ))}
          <input type="color" aria-label="Custom colour" value={d.accent || design.palette.accent} onChange={(e) => up({ accent: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-slate-200" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Font" value={d.font} onChange={(v) => up({ font: v })} options={[{ value: '', label: `Design default (${FONTS.find((f) => f.id === design.family.font)?.label})` }, ...FONTS.map((f) => ({ value: f.id, label: f.label }))]} />
        <Select label="Paper size" value={d.pageSize} onChange={(v) => up({ pageSize: v })} options={[{ value: 'A4', label: 'A4 (international)' }, { value: 'Letter', label: 'US Letter (US & Canada)' }]} hint={d.pageSize !== rules.pageSize ? `${rules.pageSize} is standard for this project’s region.` : undefined} />
        <Select label="Date format" value={d.dateFormat} onChange={(v) => up({ dateFormat: v })} options={[{ value: 'MMM YYYY', label: 'Jan 2024' }, { value: 'MMMM YYYY', label: 'January 2024' }, { value: 'MM/YYYY', label: '01/2024 (Europass)' }, { value: 'YYYY', label: '2024' }]} />
        <Select label="Spacing" value={d.spacing} onChange={(v) => up({ spacing: v })} options={[{ value: 'compact', label: 'Compact — fit more' }, { value: 'normal', label: 'Normal' }, { value: 'relaxed', label: 'Relaxed' }]} />
        <div className="sm:col-span-2">
          <label className="label" htmlFor="fs">Text size: {Math.round(d.fontScale * 100)}%</label>
          <input id="fs" type="range" min={0.85} max={1.15} step={0.01} value={d.fontScale} onChange={(e) => up({ fontScale: Number(e.target.value) })} className="w-full" />
        </div>
        <Toggle label="Show photo (if design and region allow)" checked={d.showPhoto} onChange={(v) => up({ showPhoto: v })} />
      </div>

      <SectionOrder cv={cv} set={set} />

      <Modal open={gallery} onClose={() => setGallery(false)} title={`Choose a design — ${DESIGN_COUNT} options`} wide="xl">
        <DesignGallery
          cv={cv}
          selected={d.designId}
          region={region}
          onSelect={(id) => {
            onSnapshot(`Before switching to ${designById(id).name}`);
            up({ designId: id, accent: '' });
            setGallery(false);
          }}
        />
      </Modal>
    </div>
  );
}

function SectionOrder({ cv, set }: { cv: CvData; set: (fn: (cv: CvData) => CvData) => void }) {
  const move = (i: number, dir: number) =>
    set((c) => {
      const o = [...c.sectionOrder];
      const [x] = o.splice(i, 1);
      o.splice(i + dir, 0, x!);
      return { ...c, sectionOrder: o };
    });
  const toggle = (k: SectionKey) => set((c) => ({ ...c, hiddenSections: c.hiddenSections.includes(k) ? c.hiddenSections.filter((x) => x !== k) : [...c.hiddenSections, k] }));
  return (
    <div>
      <span className="label">Section order & visibility</span>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {cv.sectionOrder.map((k, i) => {
          const hidden = cv.hiddenSections.includes(k);
          const empty = !sectionHasContent(cv, k);
          return (
            <li key={k} className={cx('flex items-center gap-1 px-3 py-1.5 text-sm', (hidden || empty) && 'text-ink-mute')}>
              <span className="flex-1 truncate">
                {sectionTitle(cv, k)}
                {empty && <span className="ml-1 text-[10px]">(empty)</span>}
              </span>
              <input
                className="input w-32 py-0.5 text-xs"
                placeholder="Rename…"
                value={cv.sectionTitles[k] ?? ''}
                onChange={(e) => set((c) => ({ ...c, sectionTitles: { ...c.sectionTitles, [k]: e.target.value } }))}
                aria-label={`Rename ${sectionTitle(cv, k)}`}
              />
              <button className="btn-ghost btn-sm" onClick={() => toggle(k)} aria-label={hidden ? 'Show' : 'Hide'}>
                <Icon name={hidden ? 'eyeOff' : 'eye'} className="h-3.5 w-3.5" />
              </button>
              <button className="btn-ghost btn-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                <Icon name="up" className="h-3.5 w-3.5" />
              </button>
              <button className="btn-ghost btn-sm" disabled={i === cv.sectionOrder.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                <Icon name="down" className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
      </ul>
      <button
        className="btn-secondary btn-sm mt-2"
        onClick={() =>
          set((c) => {
            const s = newCustomSection();
            return { ...c, custom: [...c.custom, s], sectionOrder: [...c.sectionOrder, `custom:${s.id}` as SectionKey] };
          })
        }
      >
        <Icon name="plus" className="h-3.5 w-3.5" /> Add custom section
      </button>
    </div>
  );
}
