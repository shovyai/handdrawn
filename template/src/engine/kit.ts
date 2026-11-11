import { Part, Pl, curve, ell, line, poly, rect } from './hd';
import { Op, d, h } from './beat';
import { PAL, INK } from './lib';
import * as L from './lib';
import type { Beat } from './beat';

// 写分镜用的小零件和简写。坐标是设计空间 1920×1080。
let sd = 5000;
export const nx = () => ++sd;
export type XY = [number, number];
export const C = { center: true };
export const ROOMBLUE = '#DCE8F6', DARK = '#2B3270', GREY = '#C9CCD8';
export const box = (x: number, y: number, w: number, hh: number, fill: string = PAL.cream, lw = 4.2, r = 14): Part => ({ pl: rect(x, y, w, hh, r, nx()), w: lw, fill });
export const ln = (x0: number, y0: number, x1: number, y1: number, w = 3, color: string = INK): Part => ({ pl: line([x0, y0], [x1, y1], nx(), 0.6), w, color });
export const dash = (a: XY, z: XY, c?: XY, color: string = PAL.coral): Part => ({ pl: c ? curve(a, c, z, nx(), 1.2) : line(a, z, nx(), 1.2), w: 3.6, color, dash: '11 11' });
export const ring = (cx: number, cy: number, rx: number, ry: number, color: string = PAL.coral, w = 5): Part => ({ pl: ell(cx, cy, rx, ry, nx(), 2), w, color });
export const dot = (cx: number, cy: number, r: number, fill: string): Part => ({ pl: ell(cx, cy, r, r, nx(), 0.5), w: 2.6, fill });
export const scribble = (x: number, y: number, w: number, hh: number, n = 12, color: string = PAL.coral): Part => ({ pl: poly(Array.from({ length: n }, (_, i): XY => [x + (i / (n - 1)) * w, y + (i % 2 ? -hh : hh) * (0.6 + 0.4 * Math.sin(i * 2.3))]), false, nx(), 2), w: 4, color });
export const star = (cx: number, cy: number, r: number, fill: string = PAL.yellow): Part => ({ pl: poly(Array.from({ length: 10 }, (_, i): XY => { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r * 0.45 : r; return [cx + Math.cos(a) * q, cy + Math.sin(a) * q]; }), true, nx(), 0.5), w: 3.2, fill });
export const tri = (a: XY, b: XY, c: XY, fill: string): Part => ({ pl: poly([a, b, c], true, nx(), 0.8), w: 4, fill });
export const zig = (pts: XY[], color: string = INK, w = 4): Part => ({ pl: poly(pts, false, nx(), 0.8), w, color });
/** 轻量档案柜：一个外框加两道分隔线，比 L.cabinet 省笔 */
export const cab = (x: number, y: number, w: number, hh: number): Part[] => [box(x, y, w, hh, PAL.kraft, 4.6, 8), ln(x, y + hh / 3, x + w, y + hh / 3, 3.6), ln(x, y + (2 * hh) / 3, x + w, y + (2 * hh) / 3, 3.6), ln(x + w / 2 - 16, y + hh / 6, x + w / 2 + 16, y + hh / 6, 5), ln(x + w / 2 - 16, y + hh / 2, x + w / 2 + 16, y + hh / 2, 5), ln(x + w / 2 - 16, y + (5 * hh) / 6, x + w / 2 + 16, y + (5 * hh) / 6, 5)];
export const pl = (a: XY, z: XY): Pl => line(a, z, nx(), 0);
/** 带字的圆角块：先勾框上色，再写字 */
export const chip = (x: number, y: number, w: number, hh: number, fill: string, text: string, size = 34, o: { at?: string; group?: string } = {}): Op[] => [
  d([box(x, y, w, hh, fill, 3.8, 10)], o),
  h(text, x + w / 2, y + hh / 2 + size * 0.36, { ...C, size, group: o.group }),
];

/* ---------- 写分镜用的简写 ---------- */
type O = { at?: string; group?: string };
/** 一拍里所有笔画归到同一组（缩放、擦除时一起动） */
export const bg = (g: string, s: number, c: number, ...ops: Op[]): Beat => ({ s, c, ops: ops.map((o) => ('target' in o ? o : { ...o, group: o.group ?? g })) });
/** 居中手写字 */
export const t = (s: string, x: number, y: number, size = 36, color?: string, o: O & { rot?: number; maxW?: number } = {}): Op => h(s, x, y, { ...C, size, color, ...o });
export const ar = (a: XY, z: XY, c?: XY, color?: string, o: O = {}): Op => d(L.arrow(a, z, c, color), o);
export const dr = (parts: Part[], o: O = {}): Op => d(parts, o);
