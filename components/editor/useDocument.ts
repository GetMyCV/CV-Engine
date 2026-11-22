'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DocumentRecord, Project } from '@/lib/types';
import type { Repo } from '@/lib/store';
import { debounce } from '@/lib/utils';
import { withVersion } from '@/lib/projects';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Loads a document and its project, keeps an undo/redo history, and autosaves
 * (debounced) after every change. Also snapshots a version before risky
 * operations (design switches, AI rewrites, restores).
 */
export function useDocument<T>(repo: Repo, docId: string, normalize: (raw: unknown) => T) {
  const [doc, setDoc] = useState<DocumentRecord<T> | null | undefined>(undefined);
  const [project, setProject] = useState<Project | null>(null);
  const [save, setSave] = useState<SaveState>('idle');
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const [, force] = useState(0);
  const latest = useRef<DocumentRecord<T> | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const d = await repo.getDocument(docId);
      if (!alive) return;
      if (!d) return setDoc(null);
      const typed = { ...d, data: normalize(d.data) } as DocumentRecord<T>;
      latest.current = typed;
      setDoc(typed);
      setProject(await repo.getProject(d.projectId));
    })().catch(() => alive && setDoc(null));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, docId]);

  const persist = useMemo(
    () =>
      debounce(async (d: DocumentRecord<T>) => {
        setSave('saving');
        try {
          await repo.saveDocument(d);
          setSave('saved');
        } catch {
          setSave('error');
        }
      }, 700),
    [repo],
  );

  // Flush on tab close.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (save === 'saving') {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [save]);

  const commit = useCallback(
    (next: DocumentRecord<T>, record = true) => {
      if (record && latest.current) {
        past.current = [...past.current.slice(-60), latest.current.data];
        future.current = [];
      }
      latest.current = next;
      setDoc(next);
      setSave('saving');
      persist(next);
    },
    [persist],
  );

  const setData = useCallback(
    (updater: T | ((prev: T) => T)) => {
      const cur = latest.current;
      if (!cur) return;
      const data = typeof updater === 'function' ? (updater as (p: T) => T)(cur.data) : updater;
      commit({ ...cur, data });
    },
    [commit],
  );

  const setTitle = useCallback((title: string) => latest.current && commit({ ...latest.current, title }, false), [commit]);

  const undo = useCallback(() => {
    const cur = latest.current;
    const prev = past.current.pop();
    if (!cur || prev === undefined) return;
    future.current.push(cur.data);
    commit({ ...cur, data: prev }, false);
    force((n) => n + 1);
  }, [commit]);
  const redo = useCallback(() => {
    const cur = latest.current;
    const next = future.current.pop();
    if (!cur || next === undefined) return;
    past.current.push(cur.data);
    commit({ ...cur, data: next }, false);
    force((n) => n + 1);
  }, [commit]);

  const snapshot = useCallback((label: string) => latest.current && commit(withVersion(latest.current, label), false), [commit]);
  const restore = useCallback(
    (index: number) => {
      const cur = latest.current;
      const v = cur?.versions[index];
      if (!cur || !v) return;
      const withBackup = withVersion(cur, 'Before restore');
      commit({ ...withBackup, data: normalize(v.data) });
    },
    [commit, normalize],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return; // native field undo
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  return { doc, project, setProject, save, setData, setTitle, undo, redo, canUndo: past.current.length > 0, canRedo: future.current.length > 0, snapshot, restore };
}
