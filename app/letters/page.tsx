'use client';
import { useState } from 'react';
import AppShell from '@/components/AppShell';
import LetterRenderer from '@/components/letters/LetterRenderer';
import { PAGE } from '@/components/cv/CvRenderer';
import ScaledSheet from '@/components/ScaledSheet';
import { LETTER_TEMPLATES, type LetterTemplate } from '@/lib/letters/templates';
import { newLetter, placeholderValues } from '@/lib/letters/model';
import { sampleCv } from '@/lib/cv-model';
import { DOC_KINDS } from '@/lib/types';
import { cx } from '@/lib/utils';
import Link from 'next/link';

const KINDS = ['cover', 'motivation', 'sop'] as const;

export default function LettersPage() {
  const [kind, setKind] = useState<(typeof KINDS)[number]>('cover');
  const [selected, setSelected] = useState<LetterTemplate>(LETTER_TEMPLATES[0]!);
  const list = LETTER_TEMPLATES.filter((t) => t.kind === kind);
  const cv = sampleCv();
  const values = { ...placeholderValues({ targetRole: 'Senior Data Analyst', company: 'Northwind Labs', region: 'canada' } as never, cv, ''), program: 'MSc in Data Science', targetUniversity: 'University of Toronto' };
  const letter = newLetter(selected, values, cv, null);
  letter.design.designId = 'meridian-navy';
  return (
    <AppShell>
      <div className="container-app py-10">
        <h1 className="font-display text-3xl font-bold">Cover letter, motivation letter & SOP templates</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">{LETTER_TEMPLATES.length} proven structures. In a project they are filled automatically from your CV and the job — anything in [brackets] is for you to personalise.</p>
        <div className="mt-6 flex gap-2">
          {KINDS.map((k) => (
            <button key={k} onClick={() => { setKind(k); setSelected(LETTER_TEMPLATES.find((t) => t.kind === k)!); }} className={cx('rounded-full px-4 py-1.5 text-sm font-semibold', kind === k ? 'bg-brand-600 text-white' : 'bg-white text-ink-soft ring-1 ring-slate-200')}>
              {DOC_KINDS.find((d) => d.id === k)?.label} ({LETTER_TEMPLATES.filter((t) => t.kind === k).length})
            </button>
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-2">
            {list.map((t) => (
              <button key={t.id} onClick={() => setSelected(t)} className={cx('w-full rounded-xl border p-3 text-left', selected.id === t.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50')}>
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-ink-mute">{t.category} · {t.description}</div>
              </button>
            ))}
          </div>
          <div>
            <div className="mb-3 flex justify-end">
              <Link href="/dashboard" className="btn-primary btn-sm">Use in a project</Link>
            </div>
            <ScaledSheet width={PAGE.A4.width} pageHeight={PAGE.A4.height} maxScale={0.85}>
              <LetterRenderer letter={letter} />
            </ScaledSheet>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
