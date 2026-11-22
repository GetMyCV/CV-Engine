'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { paginate } from '@/lib/paginate';

/**
 * Shows an A4/Letter sheet scaled to fit its container, with dashed lines
 * where pages break, and reports the page count to the parent.
 */
export default function ScaledSheet({
  children,
  width,
  pageHeight,
  maxScale = 1,
  onPages,
  guides = true,
  fixedScale,
}: {
  children: React.ReactNode;
  width: number;
  pageHeight: number;
  maxScale?: number;
  onPages?: (n: number) => void;
  guides?: boolean;
  fixedScale?: number;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(fixedScale ?? 0.5);
  const [height, setHeight] = useState(pageHeight);

  useLayoutEffect(() => {
    if (fixedScale) return;
    const el = outer.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(maxScale, el.clientWidth / width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, maxScale, fixedScale]);

  // Re-paginate whenever the document changes, then report the page count.
  useEffect(() => {
    const sheet = inner.current?.querySelector<HTMLElement>('[data-cv-sheet]');
    if (!sheet) return;
    const t = setTimeout(() => {
      const n = paginate(sheet, pageHeight);
      setHeight(n * pageHeight);
      onPages?.(n);
    }, 120);
    return () => clearTimeout(t);
  }, [pageHeight, onPages, children]);

  // Web fonts can arrive after the first pass and change line breaks.
  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => {
      const sheet = inner.current?.querySelector<HTMLElement>('[data-cv-sheet]');
      if (!alive || !sheet) return;
      const n = paginate(sheet, pageHeight);
      setHeight(n * pageHeight);
      onPages?.(n);
    });
    return () => {
      alive = false;
    };
  }, [pageHeight, onPages]);

  const pages = Math.max(1, Math.ceil((height - 2) / pageHeight));
  return (
    <div ref={outer} className="w-full">
      <div className="relative mx-auto overflow-hidden shadow-sheet" style={{ width: width * scale, height: pages * pageHeight * scale }}>
        <div ref={inner} style={{ width, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <div style={{ background: '#fff' }}>{children}</div>
        </div>
        {guides &&
          Array.from({ length: pages - 1 }, (_, i) => (
            <div key={i} className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-rose-300" style={{ top: (i + 1) * pageHeight * scale }}>
              <span className="absolute right-1 top-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">Page {i + 2}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
