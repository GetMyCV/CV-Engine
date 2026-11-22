'use client';
import Link from 'next/link';
import { useState } from 'react';
import Icon from '@/components/ui/Icon';
import Modal from '@/components/ui/Modal';
import type { DocumentVersion } from '@/lib/types';
import type { SaveState } from './useDocument';
import { cx } from '@/lib/utils';

export type ExportItem = { label: string; hint?: string; icon: string; run: () => void | Promise<void> };

export default function EditorTopBar({
  backHref,
  backLabel,
  title,
  onTitle,
  save,
  undo,
  redo,
  canUndo,
  canRedo,
  exports,
  versions,
  onSnapshot,
  onRestore,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  onTitle: (t: string) => void;
  save: SaveState;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  exports: ExportItem[];
  versions: DocumentVersion[];
  onSnapshot: (label: string) => void;
  onRestore: (index: number) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [history, setHistory] = useState(false);
  return (
    <div className="no-print sticky top-0 z-30 flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
      <Link href={backHref} className="btn-ghost btn-sm" title={backLabel}>
        <Icon name="arrowLeft" /> <span className="hidden sm:inline">{backLabel}</span>
      </Link>
      <input className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold hover:border-slate-200 focus:border-brand-300 focus:outline-none sm:max-w-sm" value={title} onChange={(e) => onTitle(e.target.value)} aria-label="Document title" />
      <span className={cx('text-xs', save === 'error' ? 'text-red-600' : 'text-ink-mute')} aria-live="polite">
        {save === 'saving' ? 'Saving…' : save === 'saved' ? '✓ Saved' : save === 'error' ? 'Save failed — retrying on next change' : ''}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <button className="btn-ghost btn-sm" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo">↶</button>
        <button className="btn-ghost btn-sm" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">↷</button>
        <button className="btn-ghost btn-sm" onClick={() => setHistory(true)} title="Version history">
          <Icon name="history" /> <span className="hidden lg:inline">History</span>
        </button>
        <div className="relative">
          <button className="btn-primary btn-sm" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
            <Icon name="download" /> Export
          </button>
          {menu && (
            <div className="card absolute right-0 z-40 mt-2 w-64 animate-fade-in p-1.5" onMouseLeave={() => setMenu(false)}>
              {exports.map((e) => (
                <button
                  key={e.label}
                  className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-50"
                  onClick={async () => {
                    setMenu(false);
                    await e.run();
                  }}
                >
                  <Icon name={e.icon} className="mt-0.5 h-4 w-4 text-brand-600" />
                  <span>
                    <span className="block text-sm font-medium">{e.label}</span>
                    {e.hint && <span className="block text-[11px] text-ink-mute">{e.hint}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <Modal open={history} onClose={() => setHistory(false)} title="Version history" footer={<button className="btn-secondary" onClick={() => { onSnapshot('Manual save'); }}>Save current version</button>}>
        {versions.length === 0 ? (
          <p className="text-sm text-ink-mute">No saved versions yet. Versions are saved automatically before design switches, AI rewrites and restores — or save one now.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {versions.map((v, i) => (
              <li key={v.at + i} className="flex items-center justify-between gap-2 py-2.5">
                <div>
                  <div className="text-sm font-medium">{v.label}</div>
                  <div className="text-xs text-ink-mute">{new Date(v.at).toLocaleString()}</div>
                </div>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    onRestore(i);
                    setHistory(false);
                  }}
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
