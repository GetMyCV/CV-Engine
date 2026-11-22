import type { LinkedInData } from '../types';
import { mix, readableOn } from '../utils';

/**
 * Canvas renderers for the LinkedIn makeover kit: a 1584×396 banner, an
 * 800×800 profile photo frame and a 1200×627 post image — LinkedIn's
 * recommended sizes. Everything is drawn client-side; nothing is uploaded.
 */

export const BANNER = { width: 1584, height: 396 } as const;
export const AVATAR = { size: 800 } as const;
export const POST = { width: 1200, height: 627 } as const;

type Colors = { a: string; b: string; text: string };
type BgFn = (c: CanvasRenderingContext2D, w: number, h: number, col: Colors, rnd: () => number) => void;

const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const lin = (c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) => {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  return g;
};

export type BannerTemplate = { id: string; name: string; a: string; b: string; text: string; bg: BgFn; font: string };

export const BANNER_TEMPLATES: BannerTemplate[] = [
  {
    id: 'gradient-sweep', name: 'Gradient sweep', a: '#1E3A8A', b: '#0EA5E9', text: '#ffffff', font: 'Poppins',
    bg: (c, w, h, k) => { c.fillStyle = lin(c, 0, 0, w, h, [[0, k.a], [1, k.b]]); c.fillRect(0, 0, w, h); },
  },
  {
    id: 'aurora-mesh', name: 'Aurora mesh', a: '#4C1D95', b: '#DB2777', text: '#ffffff', font: 'Poppins',
    bg: (c, w, h, k) => {
      c.fillStyle = mix(k.a, '#000000', 0.35); c.fillRect(0, 0, w, h);
      for (const [x, y, r, col] of [[w * 0.2, h * 0.2, 420, k.a], [w * 0.75, h * 0.9, 520, k.b], [w * 0.95, 0, 360, mix(k.b, '#ffffff', 0.3)]] as [number, number, number, string][]) {
        const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'transparent'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      }
    },
  },
  {
    id: 'geo-triangles', name: 'Geometric triangles', a: '#0F766E', b: '#14B8A6', text: '#ffffff', font: 'Montserrat',
    bg: (c, w, h, k, r) => {
      c.fillStyle = k.a; c.fillRect(0, 0, w, h);
      const s = 132;
      for (let y = -1; y < h / s + 1; y++) for (let x = -1; x < w / s + 2; x++) {
        c.fillStyle = mix(k.a, r() > 0.5 ? k.b : '#000000', r() * 0.35);
        c.beginPath(); const ox = x * s + (y % 2) * (s / 2);
        c.moveTo(ox, y * s); c.lineTo(ox + s, y * s); c.lineTo(ox + s / 2, (y + 1) * s); c.closePath(); c.fill();
      }
    },
  },
  {
    id: 'circles', name: 'Floating circles', a: '#0B1F3A', b: '#F59E0B', text: '#ffffff', font: 'Poppins',
    bg: (c, w, h, k, r) => {
      c.fillStyle = k.a; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) { c.globalAlpha = 0.08 + r() * 0.25; c.fillStyle = r() > 0.6 ? k.b : '#ffffff'; c.beginPath(); c.arc(r() * w, r() * h, 10 + r() * 90, 0, Math.PI * 2); c.fill(); }
      c.globalAlpha = 1;
    },
  },
  {
    id: 'waves', name: 'Waves', a: '#1D4ED8', b: '#93C5FD', text: '#ffffff', font: 'Inter',
    bg: (c, w, h, k) => {
      c.fillStyle = k.a; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 5; i++) {
        c.fillStyle = mix(k.a, k.b, 0.15 + i * 0.12); c.globalAlpha = 0.55;
        c.beginPath(); c.moveTo(0, h);
        for (let x = 0; x <= w; x += 8) c.lineTo(x, h * (0.45 + i * 0.1) + Math.sin(x / (160 + i * 30) + i) * 26);
        c.lineTo(w, h); c.closePath(); c.fill();
      }
      c.globalAlpha = 1;
    },
  },
  {
    id: 'dot-grid', name: 'Dot grid', a: '#111827', b: '#22D3EE', text: '#ffffff', font: 'Space Grotesk',
    bg: (c, w, h, k) => {
      c.fillStyle = k.a; c.fillRect(0, 0, w, h);
      for (let y = 18; y < h; y += 26) for (let x = 18; x < w; x += 26) { c.fillStyle = k.b; c.globalAlpha = Math.max(0.05, (x / w) * 0.6); c.beginPath(); c.arc(x, y, 2.2, 0, Math.PI * 2); c.fill(); }
      c.globalAlpha = 1;
    },
  },
  {
    id: 'split-block', name: 'Split block', a: '#F8FAFC', b: '#2563EB', text: '#0F172A', font: 'Montserrat',
    bg: (c, w, h, k) => { c.fillStyle = k.a; c.fillRect(0, 0, w, h); c.fillStyle = k.b; c.beginPath(); c.moveTo(0, 0); c.lineTo(w * 0.36, 0); c.lineTo(w * 0.26, h); c.lineTo(0, h); c.fill(); },
  },
  {
    id: 'diagonal-stripes', name: 'Diagonal stripes', a: '#7C2D12', b: '#FB923C', text: '#ffffff', font: 'Poppins',
    bg: (c, w, h, k) => {
      c.fillStyle = k.a; c.fillRect(0, 0, w, h); c.save(); c.globalAlpha = 0.18; c.strokeStyle = k.b; c.lineWidth = 22;
      for (let x = -h; x < w; x += 70) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + h, 0); c.stroke(); }
      c.restore();
    },
  },
  {
    id: 'minimal-line', name: 'Minimal line', a: '#FFFFFF', b: '#0F766E', text: '#0F172A', font: 'Inter',
    bg: (c, w, h, k) => { c.fillStyle = k.a; c.fillRect(0, 0, w, h); c.fillStyle = k.b; c.fillRect(0, h - 14, w, 14); c.fillRect(w * 0.48, h * 0.3, 6, h * 0.4); },
  },
  {
    id: 'hexagons', name: 'Hexagons', a: '#1E1B4B', b: '#818CF8', text: '#ffffff', font: 'Space Grotesk',
    bg: (c, w, h, k, r) => {
      c.fillStyle = k.a; c.fillRect(0, 0, w, h); const s = 46;
      for (let row = -1; row < h / (s * 1.5) + 1; row++) for (let col = -1; col < w / (s * 1.73) + 1; col++) {
        const cx = col * s * 1.73 + (row % 2) * s * 0.866; const cy = row * s * 1.5;
        c.beginPath(); for (let i = 0; i < 6; i++) { const ang = (Math.PI / 3) * i + Math.PI / 6; c.lineTo(cx + s * 0.95 * Math.cos(ang), cy + s * 0.95 * Math.sin(ang)); } c.closePath();
        c.strokeStyle = k.b; c.globalAlpha = 0.12 + (cx / w) * 0.3; c.lineWidth = 2; c.stroke(); if (r() > 0.92) { c.fillStyle = k.b; c.globalAlpha = 0.25; c.fill(); }
      }
      c.globalAlpha = 1;
    },
  },
  {
    id: 'circuit', name: 'Tech circuit', a: '#022C22', b: '#34D399', text: '#ffffff', font: 'Space Grotesk',
    bg: (c, w, h, k, r) => {
      c.fillStyle = k.a; c.fillRect(0, 0, w, h); c.strokeStyle = k.b; c.lineWidth = 2;
      for (let i = 0; i < 46; i++) {
        c.globalAlpha = 0.15 + r() * 0.35; let x = w * 0.35 + r() * w * 0.65; let y = r() * h; c.beginPath(); c.moveTo(x, y);
        for (let j = 0; j < 4; j++) { if (r() > 0.5) x += (r() - 0.3) * 160; else y += (r() - 0.5) * 120; c.lineTo(x, y); }
        c.stroke(); c.fillStyle = k.b; c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill();
      }
      c.globalAlpha = 1;
    },
  },
  {
    id: 'corporate-bars', name: 'Corporate bars', a: '#0F172A', b: '#38BDF8', text: '#ffffff', font: 'Inter',
    bg: (c, w, h, k) => {
      c.fillStyle = k.a; c.fillRect(0, 0, w, h);
      [0.18, 0.32, 0.5, 0.72, 0.9].forEach((t, i) => { c.fillStyle = mix(k.a, k.b, 0.2 + i * 0.15); c.fillRect(w * 0.04 + i * 64, h * (1 - t), 44, h * t); });
    },
  },
  {
    id: 'blobs', name: 'Soft blobs', a: '#FFF7ED', b: '#F97316', text: '#431407', font: 'Poppins',
    bg: (c, w, h, k) => {
      c.fillStyle = k.a; c.fillRect(0, 0, w, h);
      for (const [x, y, rx, ry, al] of [[w * 0.08, h * 0.2, 260, 180, 0.35], [w * 0.3, h * 1.1, 300, 200, 0.22], [w * 0.98, h * 0.1, 220, 160, 0.2]] as number[][]) {
        c.globalAlpha = al!; c.fillStyle = k.b; c.beginPath(); c.ellipse(x!, y!, rx!, ry!, 0.4, 0, Math.PI * 2); c.fill();
      }
      c.globalAlpha = 1;
    },
  },
  {
    id: 'topography', name: 'Topography', a: '#14532D', b: '#BBF7D0', text: '#ffffff', font: 'Montserrat',
    bg: (c, w, h, k) => {
      c.fillStyle = k.a; c.fillRect(0, 0, w, h); c.strokeStyle = k.b; c.lineWidth = 1.5;
      for (let i = 0; i < 18; i++) { c.globalAlpha = 0.18; c.beginPath(); for (let x = 0; x <= w; x += 10) { const y = h * 0.1 + i * 22 + Math.sin(x / 120 + i * 0.6) * 18 + Math.cos(x / 47) * 6; if (x === 0) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke(); }
      c.globalAlpha = 1;
    },
  },
  {
    id: 'confetti', name: 'Confetti squares', a: '#FAFAFA', b: '#7C3AED', text: '#1E1B4B', font: 'Poppins',
    bg: (c, w, h, k, r) => {
      c.fillStyle = k.a; c.fillRect(0, 0, w, h);
      const cols = [k.b, mix(k.b, '#F59E0B', 0.6), mix(k.b, '#10B981', 0.6), mix(k.b, '#EF4444', 0.5)];
      for (let i = 0; i < 70; i++) { c.save(); c.translate(r() * w * 0.45, r() * h); c.rotate(r() * Math.PI); c.globalAlpha = 0.5; c.fillStyle = cols[i % cols.length]!; c.fillRect(-7, -7, 10 + r() * 10, 10 + r() * 10); c.restore(); }
    },
  },
  {
    id: 'spotlight', name: 'Spotlight', a: '#0A0A0A', b: '#EAB308', text: '#ffffff', font: 'Playfair Display',
    bg: (c, w, h, k) => {
      c.fillStyle = k.a; c.fillRect(0, 0, w, h);
      const g = c.createRadialGradient(w * 0.72, h * 0.5, 10, w * 0.72, h * 0.5, w * 0.5); g.addColorStop(0, mix(k.b, k.a, 0.65)); g.addColorStop(1, 'transparent'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = k.b; c.fillRect(w * 0.5, h * 0.78, 120, 4);
    },
  },
  {
    id: 'paper-cut', name: 'Paper cut layers', a: '#0C4A6E', b: '#7DD3FC', text: '#ffffff', font: 'Montserrat',
    bg: (c, w, h, k) => {
      c.fillStyle = k.a; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 4; i++) {
        c.fillStyle = mix(k.a, k.b, 0.12 + i * 0.1); c.shadowColor = 'rgba(0,0,0,.25)'; c.shadowBlur = 20;
        c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w * 0.45; x += 10) c.lineTo(x, h * (0.3 + i * 0.17) + Math.sin(x / 90 + i) * 30); c.lineTo(w * 0.45, h); c.closePath(); c.fill();
      }
      c.shadowBlur = 0;
    },
  },
  {
    id: 'grid-lines', name: 'Blueprint grid', a: '#172554', b: '#60A5FA', text: '#ffffff', font: 'Space Grotesk',
    bg: (c, w, h, k) => {
      c.fillStyle = k.a; c.fillRect(0, 0, w, h); c.strokeStyle = k.b; c.lineWidth = 1;
      for (let x = 0; x < w; x += 33) { c.globalAlpha = x % 165 === 0 ? 0.3 : 0.1; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
      for (let y = 0; y < h; y += 33) { c.globalAlpha = y % 165 === 0 ? 0.3 : 0.1; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      c.globalAlpha = 1;
    },
  },
  {
    id: 'duotone', name: 'Duotone halves', a: '#BE123C', b: '#1F2937', text: '#ffffff', font: 'Poppins',
    bg: (c, w, h, k) => { c.fillStyle = k.b; c.fillRect(0, 0, w, h); c.fillStyle = k.a; c.beginPath(); c.moveTo(w * 0.42, 0); c.lineTo(w, 0); c.lineTo(w, h); c.lineTo(w * 0.34, h); c.fill(); },
  },
  {
    id: 'rings', name: 'Concentric rings', a: '#3B0764', b: '#E879F9', text: '#ffffff', font: 'Poppins',
    bg: (c, w, h, k) => {
      c.fillStyle = k.a; c.fillRect(0, 0, w, h); c.strokeStyle = k.b; c.lineWidth = 2;
      for (let r = 40; r < 900; r += 38) { c.globalAlpha = Math.max(0.04, 0.4 - r / 2400); c.beginPath(); c.arc(w * 0.12, h * 0.5, r, 0, Math.PI * 2); c.stroke(); }
      c.globalAlpha = 1;
    },
  },
  {
    id: 'clean-white', name: 'Clean white', a: '#FFFFFF', b: '#1E3A8A', text: '#0F172A', font: 'Inter',
    bg: (c, w, h, k) => { c.fillStyle = k.a; c.fillRect(0, 0, w, h); c.fillStyle = mix(k.b, '#ffffff', 0.9); c.fillRect(0, 0, w * 0.32, h); c.fillStyle = k.b; c.fillRect(w * 0.32, 0, 8, h); },
  },
  {
    id: 'sunset', name: 'Sunset horizon', a: '#F43F5E', b: '#F59E0B', text: '#ffffff', font: 'Poppins',
    bg: (c, w, h, k) => {
      c.fillStyle = lin(c, 0, 0, 0, h, [[0, k.a], [1, k.b]]); c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(w * 0.18, h * 0.95, 160, Math.PI, 0); c.fill();
      for (let i = 0; i < 6; i++) { c.fillStyle = `rgba(255,255,255,${0.08 + i * 0.02})`; c.fillRect(0, h * 0.7 + i * 18, w * 0.4, 6); }
    },
  },
  {
    id: 'mono-type', name: 'Monogram', a: '#111827', b: '#F3F4F6', text: '#ffffff', font: 'Playfair Display',
    bg: (c, w, h, k) => { c.fillStyle = k.a; c.fillRect(0, 0, w, h); c.globalAlpha = 0.06; c.fillStyle = k.b; c.font = `700 ${h * 1.3}px "Playfair Display", serif`; c.textBaseline = 'middle'; c.fillText('“', w * 0.05, h * 0.8); c.globalAlpha = 1; },
  },
  {
    id: 'ribbon', name: 'Ribbon', a: '#ECFEFF', b: '#0E7490', text: '#083344', font: 'Montserrat',
    bg: (c, w, h, k) => {
      c.fillStyle = k.a; c.fillRect(0, 0, w, h); c.fillStyle = k.b;
      c.beginPath(); c.moveTo(0, h * 0.62); c.bezierCurveTo(w * 0.25, h * 0.2, w * 0.45, h * 1.05, w * 0.7, h * 0.55); c.lineTo(w * 0.7, h * 0.7); c.bezierCurveTo(w * 0.45, h * 1.2, w * 0.25, h * 0.35, 0, h * 0.78); c.fill();
      c.globalAlpha = 0.3; c.beginPath(); c.moveTo(0, h * 0.4); c.bezierCurveTo(w * 0.3, 0, w * 0.5, h * 0.8, w, h * 0.2); c.lineTo(w, h * 0.26); c.bezierCurveTo(w * 0.5, h * 0.9, w * 0.3, h * 0.1, 0, h * 0.46); c.fill(); c.globalAlpha = 1;
    },
  },
];

export const bannerTemplate = (id: string) => BANNER_TEMPLATES.find((t) => t.id === id) ?? BANNER_TEMPLATES[0]!;

function wrap(c: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (c.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

export async function ensureFonts(families: string[]) {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all(families.flatMap((f) => [document.fonts.load(`700 40px "${f}"`), document.fonts.load(`400 20px "${f}"`)]).map((p) => p.catch(() => undefined)));
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function cover(c: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, zoom = 1, ox = 0, oy = 0) {
  const scale = Math.max(w / img.width, h / img.height) * zoom;
  const dw = img.width * scale;
  const dh = img.height * scale;
  c.drawImage(img, x + (w - dw) / 2 + ox * w, y + (h - dh) / 2 + oy * h, dw, dh);
}

/** Draws the banner. LinkedIn's profile photo covers the lower-left on desktop, so text defaults to the right. */
export async function renderBanner(canvas: HTMLCanvasElement, data: LinkedInData['banner']) {
  const t = bannerTemplate(data.templateId);
  await ensureFonts([t.font, 'Inter']);
  const { width: w, height: h } = BANNER;
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d')!;
  const col: Colors = { a: data.accent || t.a, b: data.accent2 || t.b, text: data.textColor || t.text };
  t.bg(c, w, h, col, seeded(data.templateId.length * 977 + 13));
  const img = await loadImage(data.image);
  if (img) {
    c.save();
    c.globalAlpha = 0.9;
    cover(c, img, 0, 0, w, h);
    c.restore();
    c.fillStyle = lin(c, data.align === 'right' ? 0 : w, 0, data.align === 'right' ? w : 0, 0, [[0, 'rgba(0,0,0,0)'], [0.5, 'rgba(0,0,0,.35)'], [1, 'rgba(0,0,0,.8)']]);
    c.fillRect(0, 0, w, h);
    col.text = '#ffffff';
  }

  const right = data.align !== 'left';
  const pad = 80;
  const blockW = w * 0.5;
  const x = right ? w - pad : w * 0.33;
  c.textAlign = right ? 'right' : 'left';
  c.textBaseline = 'alphabetic';
  c.fillStyle = col.text;
  let y = 110;
  c.font = `700 52px "${t.font}", Inter, sans-serif`;
  if (data.name) {
    c.fillText(data.name, x, y);
    y += 52;
  }
  c.font = `600 30px "${t.font}", Inter, sans-serif`;
  for (const line of wrap(c, data.headline, blockW).slice(0, 2)) {
    c.fillText(line, x, y);
    y += 40;
  }
  if (data.tagline) {
    c.globalAlpha = 0.85;
    c.font = `400 24px Inter, sans-serif`;
    for (const line of wrap(c, data.tagline, blockW).slice(0, 2)) {
      c.fillText(line, x, y + 4);
      y += 32;
    }
    c.globalAlpha = 1;
  }
  const skills = data.skills.filter(Boolean).slice(0, 6);
  if (skills.length) {
    y += 22;
    c.font = `600 19px Inter, sans-serif`;
    const chipH = 36;
    const widths = skills.map((s) => c.measureText(s).width + 32);
    const total = widths.reduce((a, b) => a + b + 10, -10);
    let cx = right ? x - Math.min(total, blockW + 120) : x;
    const isLight = readableOn(col.text) === '#0f172a' ? false : true;
    for (let i = 0; i < skills.length; i++) {
      if ((right && cx + widths[i]! > x + 1) || (!right && cx + widths[i]! > w - pad)) break;
      c.fillStyle = isLight ? 'rgba(15,23,42,.08)' : 'rgba(255,255,255,.16)';
      roundRect(c, cx, y - 25, widths[i]!, chipH, 18);
      c.fill();
      c.strokeStyle = isLight ? 'rgba(15,23,42,.18)' : 'rgba(255,255,255,.35)';
      c.lineWidth = 1.5;
      c.stroke();
      c.fillStyle = col.text;
      c.textAlign = 'center';
      c.fillText(skills[i]!, cx + widths[i]! / 2, y);
      cx += widths[i]! + 10;
    }
    c.textAlign = right ? 'right' : 'left';
    y += 30;
  }
  if (data.contact) {
    c.font = `500 20px Inter, sans-serif`;
    c.globalAlpha = 0.9;
    c.fillStyle = col.text;
    c.fillText(data.contact, x, Math.min(h - 34, y + 30));
    c.globalAlpha = 1;
  }
}

export type AvatarFrame = { id: string; name: string };
export const AVATAR_FRAMES: AvatarFrame[] = [
  { id: 'clean', name: 'Clean background' },
  { id: 'ring', name: 'Solid ring' },
  { id: 'gradient-ring', name: 'Gradient ring' },
  { id: 'text-ring', name: 'Text ring' },
  { id: 'badge', name: 'Bottom badge' },
  { id: 'halo', name: 'Soft halo' },
  { id: 'duo', name: 'Duotone backdrop' },
  { id: 'dashed', name: 'Dashed ring' },
];

export async function renderAvatar(canvas: HTMLCanvasElement, a: LinkedInData['avatar']) {
  await ensureFonts(['Inter', 'Poppins']);
  const S = AVATAR.size;
  canvas.width = S;
  canvas.height = S;
  const c = canvas.getContext('2d')!;
  const ring = a.ringColor || '#2563EB';
  const bg = a.background || mix(ring, '#ffffff', 0.85);
  c.clearRect(0, 0, S, S);
  c.save();
  c.beginPath();
  c.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
  c.clip();
  if (a.frameId === 'duo') {
    c.fillStyle = lin(c, 0, 0, S, S, [[0, ring], [1, mix(ring, '#000000', 0.4)]]);
  } else if (a.frameId === 'halo') {
    const g = c.createRadialGradient(S / 2, S / 2, S * 0.1, S / 2, S / 2, S / 2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, bg);
    c.fillStyle = g;
  } else c.fillStyle = bg;
  c.fillRect(0, 0, S, S);
  const inset = a.frameId === 'clean' || a.frameId === 'duo' || a.frameId === 'halo' ? 0 : 44;
  const img = await loadImage(a.photo);
  c.save();
  c.beginPath();
  c.arc(S / 2, S / 2, S / 2 - inset, 0, Math.PI * 2);
  c.clip();
  if (img) cover(c, img, inset, inset, S - inset * 2, S - inset * 2, a.zoom || 1, a.offsetX || 0, a.offsetY || 0);
  else {
    c.fillStyle = mix(ring, '#ffffff', 0.6);
    c.fillRect(0, 0, S, S);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(S / 2, S * 0.4, S * 0.16, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(S / 2, S * 0.86, S * 0.3, S * 0.24, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();

  const r = S / 2 - 22;
  if (a.frameId === 'ring') {
    c.strokeStyle = ring;
    c.lineWidth = 40;
    c.beginPath();
    c.arc(S / 2, S / 2, r, 0, Math.PI * 2);
    c.stroke();
  } else if (a.frameId === 'gradient-ring') {
    c.strokeStyle = lin(c, 0, 0, S, S, [[0, ring], [0.5, mix(ring, '#F59E0B', 0.7)], [1, mix(ring, '#EC4899', 0.6)]]);
    c.lineWidth = 40;
    c.beginPath();
    c.arc(S / 2, S / 2, r, 0, Math.PI * 2);
    c.stroke();
  } else if (a.frameId === 'dashed') {
    c.strokeStyle = ring;
    c.lineWidth = 22;
    c.setLineDash([30, 18]);
    c.beginPath();
    c.arc(S / 2, S / 2, r, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);
  } else if (a.frameId === 'text-ring') {
    // Arc of colour across the bottom with curved text, in the style LinkedIn users know.
    c.strokeStyle = ring;
    c.lineWidth = 64;
    c.beginPath();
    c.arc(S / 2, S / 2, S / 2 - 32, Math.PI * 0.15, Math.PI * 0.95);
    c.stroke();
    const text = (a.ringText || 'OPEN TO OPPORTUNITIES').toUpperCase();
    c.font = '800 34px Poppins, Inter, sans-serif';
    c.fillStyle = readableOn(ring);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const radius = S / 2 - 32;
    const totalAngle = Math.PI * 0.72;
    const chars = [...text];
    const step = Math.min(totalAngle / Math.max(chars.length - 1, 1), 0.075);
    const startAngle = Math.PI * 0.55 + (step * (chars.length - 1)) / 2;
    chars.forEach((ch, i) => {
      const ang = startAngle - i * step;
      c.save();
      c.translate(S / 2 + radius * Math.cos(ang), S / 2 + radius * Math.sin(ang));
      c.rotate(ang - Math.PI / 2);
      c.fillText(ch, 0, 0);
      c.restore();
    });
  } else if (a.frameId === 'badge') {
    const text = a.ringText || 'Open to work';
    c.font = '700 40px Poppins, Inter, sans-serif';
    const tw = c.measureText(text).width + 70;
    c.fillStyle = ring;
    roundRect(c, (S - tw) / 2, S - 170, tw, 70, 35);
    c.fill();
    c.fillStyle = readableOn(ring);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, S / 2, S - 135);
  }
  c.restore();
}

export const POST_TEMPLATES = [
  { id: 'announce', name: 'Announcement' },
  { id: 'hiring', name: 'Open to work / hiring' },
  { id: 'quote', name: 'Quote' },
  { id: 'milestone', name: 'Milestone / certification' },
];

export async function renderPost(canvas: HTMLCanvasElement, p: LinkedInData['post'], name: string) {
  await ensureFonts(['Poppins', 'Inter', 'Playfair Display']);
  const { width: w, height: h } = POST;
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d')!;
  const a = p.accent || '#2563EB';
  const on = readableOn(a);
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  if (p.templateId === 'quote') {
    c.fillStyle = '#0F172A';
    c.fillRect(0, 0, w, h);
    c.fillStyle = a;
    c.font = '700 260px "Playfair Display", serif';
    c.fillText('“', 60, 270);
    c.fillStyle = '#ffffff';
    c.font = '600 46px "Playfair Display", serif';
    let y = 250;
    for (const line of wrap(c, p.title, w - 200).slice(0, 5)) {
      c.fillText(line, 100, y);
      y += 62;
    }
    c.fillStyle = a;
    c.fillRect(100, y + 10, 80, 5);
    c.font = '500 26px Inter, sans-serif';
    c.fillStyle = '#CBD5E1';
    c.fillText(p.subtitle || name, 100, y + 60);
    return;
  }
  c.fillStyle = p.templateId === 'milestone' ? '#ffffff' : a;
  c.fillRect(0, 0, w, h);
  if (p.templateId === 'milestone') {
    c.fillStyle = mix(a, '#ffffff', 0.88);
    c.beginPath();
    c.arc(w - 160, 170, 260, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = a;
    c.lineWidth = 14;
    c.beginPath();
    c.arc(w - 220, h / 2, 110, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = a;
    c.font = '800 96px Poppins, sans-serif';
    c.textAlign = 'center';
    c.fillText('✓', w - 220, h / 2 + 34);
    c.textAlign = 'left';
  } else {
    for (let i = 0; i < 9; i++) {
      c.fillStyle = `rgba(255,255,255,${0.05 + i * 0.01})`;
      c.beginPath();
      c.arc(w - 120, h - 40, 80 + i * 60, 0, Math.PI * 2);
      c.fill();
    }
  }
  const fg = p.templateId === 'milestone' ? '#0F172A' : on;
  c.fillStyle = fg;
  c.font = '700 22px Inter, sans-serif';
  c.globalAlpha = 0.75;
  c.fillText(p.templateId === 'hiring' ? '#OPENTOWORK' : p.templateId === 'milestone' ? 'MILESTONE' : 'ANNOUNCEMENT', 80, 120);
  c.globalAlpha = 1;
  c.font = '800 64px Poppins, sans-serif';
  let y = 210;
  for (const line of wrap(c, p.title, w * 0.62).slice(0, 3)) {
    c.fillText(line, 80, y);
    y += 76;
  }
  c.font = '400 30px Inter, sans-serif';
  c.globalAlpha = 0.9;
  for (const line of wrap(c, p.subtitle, w * 0.6).slice(0, 2)) {
    c.fillText(line, 80, y + 10);
    y += 42;
  }
  c.globalAlpha = 1;
  c.font = '600 24px Inter, sans-serif';
  c.fillText(name, 80, h - 60);
}
