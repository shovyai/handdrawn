import React from 'react';
import { EZ, PAL, Pt, arcPts, bez, ellPts, rrPts } from './geom';

// 手绘笔画的底层：所有线条都是点列，沿法线加低频起伏，看起来像手画的，但每次渲染完全一样。

export const INK = PAL.ink;

/** 一条可以按长度切开的线 */
export type Pl = { pts: Pt[]; cum: number[]; len: number };
/** 一笔：线 + 线色、线宽、可选填色、可选虚线 */
export type Part = { pl: Pl; color?: string; w?: number; fill?: string; dash?: string; fillOp?: number };

function build(pts: Pt[]): Pl {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] || 1 };
}
function dense(pts: Pt[], step = 7): Pt[] {
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}
/** 沿法线加缓慢起伏，像手抖：低频，不闪烁 */
function wob(pts: Pt[], seed: number, amp: number): Pl {
  const d = dense(pts);
  let s = 0;
  const out: Pt[] = [];
  d.forEach((p, i) => {
    if (i > 0) s += Math.hypot(p[0] - d[i - 1][0], p[1] - d[i - 1][1]);
    const q = d[Math.min(d.length - 1, i + 1)], r = d[Math.max(0, i - 1)];
    const tx = q[0] - r[0], ty = q[1] - r[1], n = Math.hypot(tx, ty) || 1;
    const o = (amp * (Math.sin(s * 0.045 + seed * 1.7) + 0.55 * Math.sin(s * 0.121 + seed * 3.3))) / 1.55;
    out.push([p[0] - (ty / n) * o, p[1] + (tx / n) * o]);
  });
  return build(out);
}

export const line = (a: Pt, b: Pt, seed = 1, amp = 2) => wob([a, b], seed, amp);
export const curve = (a: Pt, c: Pt, b: Pt, seed = 1, amp = 2) => wob(bez(a, c, b, 30), seed, amp);
export const rect = (x: number, y: number, w: number, h: number, r = 12, seed = 1, amp = 1.6) => {
  const p = rrPts(x, y, w, h, r, seed, 0);
  return wob([...p, p[0]], seed, amp);
};
export const ell = (cx: number, cy: number, rx: number, ry: number, seed = 1, amp = 1.4) => {
  const p = ellPts(cx, cy, rx, ry, seed, 0, 36);
  return wob([...p, p[0]], seed, amp);
};
export const arc = (cx: number, cy: number, r: number, a0: number, a1: number, seed = 1, amp = 1.4) => wob(arcPts(cx, cy, r, a0, a1, 18), seed, amp);
export const poly = (pts: Pt[], close = false, seed = 1, amp = 1.6) => wob(close ? [...pts, pts[0]] : pts, seed, amp);
export const join = (...ps: Pl[]) => build(ps.flatMap((p) => p.pts));

export const posAt = (pl: Pl, p: number) => {
  const L = Math.min(1, Math.max(0, p)) * pl.len;
  let i = 1;
  while (i < pl.cum.length - 1 && pl.cum[i] < L) i++;
  const a = pl.pts[i - 1], b = pl.pts[i], span = pl.cum[i] - pl.cum[i - 1] || 1, f = Math.min(1, Math.max(0, (L - pl.cum[i - 1]) / span));
  return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
};
/** 只取线的前 p（0–1） */
export function cut(pl: Pl, p: number): Pt[] {
  if (p >= 1) return pl.pts;
  const L = pl.len * p;
  const out: Pt[] = [];
  for (let i = 0; i < pl.pts.length; i++) {
    if (pl.cum[i] <= L) out.push(pl.pts[i]);
    else {
      const a = pl.pts[i - 1], f = (L - pl.cum[i - 1]) / (pl.cum[i] - pl.cum[i - 1] || 1);
      out.push([a[0] + (pl.pts[i][0] - a[0]) * f, a[1] + (pl.pts[i][1] - a[1]) * f]);
      break;
    }
  }
  return out.length > 1 ? out : [pl.pts[0], pl.pts[0]];
}
export const toD = (pts: Pt[]) => 'M' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L');
export { EZ };

/* ---------- 铅笔 ---------- */
export const Pencil: React.FC<{ x: number; y: number; start?: number }> = ({ x, y, start = 0 }) => (
  <g data-pencil="1" data-start={start} transform={`translate(${x},${y}) rotate(32)`} style={{ pointerEvents: 'none' }}>
    <polygon points="0,0 -6,-20 6,-20" fill="#EBCB9C" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
    <polygon points="0,0 -2.2,-7.5 2.2,-7.5" fill={INK} />
    <rect x={-6} y={-78} width={12} height={58} fill={PAL.yellow} stroke={INK} strokeWidth={2.4} />
    <rect x={-6} y={-90} width={12} height={12} rx={3} fill={PAL.coral} stroke={INK} strokeWidth={2.4} />
  </g>
);
/** 同一时刻只留一支铅笔：多支同时出现时只显示最早开始的那支 */
export function onePencil(svg: SVGSVGElement | null) {
  if (!svg) return;
  const ps = [...svg.querySelectorAll<SVGElement>('[data-pencil]')];
  ps.forEach((e) => (e.style.display = ''));
  ps.sort((a, b) => Number(a.dataset.start) - Number(b.dataset.start)).slice(1).forEach((e) => (e.style.display = 'none'));
}
