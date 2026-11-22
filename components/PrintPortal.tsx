'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { paginate } from '@/lib/paginate';
import { PAGE } from '@/components/cv/CvRenderer';

/**
 * Renders a sheet at 100% size into a print-only container and opens the
 * browser's print dialog ("Save as PDF"). The PDF keeps real, selectable text
 * and clickable links. Page size comes from the sheet (A4 or US Letter).
 */
export function usePrint() {
  const [job, setJob] = useState<{ node: React.ReactNode; title: string; size: 'A4' | 'Letter' } | null>(null);
  useEffect(() => {
    if (!job) return;
    const prevTitle = document.title;
    document.title = job.title;
    const style = document.createElement('style');
    style.textContent = `@page { size: ${job.size === 'Letter' ? 'letter' : 'A4'}; margin: 0; }`;
    document.head.appendChild(style);
    const done = () => {
      document.title = prevTitle;
      style.remove();
      setJob(null);
    };
    // Wait for fonts and images before printing.
    const t = setTimeout(async () => {
      await document.fonts?.ready;
      const sheet = document.querySelector<HTMLElement>('.print-only [data-cv-sheet]');
      if (sheet) paginate(sheet, PAGE[job.size].height);
      window.addEventListener('afterprint', done, { once: true });
      window.print();
      setTimeout(() => job && document.title !== prevTitle && done(), 60_000);
    }, 250);
    return () => clearTimeout(t);
  }, [job]);
  const portal = job && typeof document !== 'undefined' ? createPortal(<div className="print-only">{job.node}</div>, document.body) : null;
  return { print: (node: React.ReactNode, title: string, size: 'A4' | 'Letter') => setJob({ node, title, size }), portal };
}
