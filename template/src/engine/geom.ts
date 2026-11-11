import { getInputProps } from 'remotion';

// 基础：色板、字体、缓动、形状点。设计坐标固定 1920×1080，成片按比例缩放。

export type Pt = [number, number];
export const W = 1920;
export const H = 1080;
export const TAU = Math.PI * 2;

export const PAL = {
  sky: '#A9C4E6',
  night: '#232B6B',
  cream: '#FFF8E7',
  yellow: '#F2C14E',
  coral: '#E4574B',
  teal: '#2F9C8A',
  kraft: '#C9954F',
  pink: '#F3A6A8',
  lilac: '#B6A4E6',
  green: '#6DB36B',
  ink: '#232048',
  skin: '#EDB98F',
};

/** 底纸颜色 */
export const GROUND = { sky: '#A9C4E6', night: '#232B6B', sand: '#E3C9A0', mint: '#A8D8CB', lilac: '#CFC4F0', cream: '#F4EBD8' };
export type GroundName = keyof typeof GROUND;

/** 手写字体。随模板分发的是霞鹜漫黑（OFL-1.1，见 public/fonts）。渲染时可用 --props='{"font":"…"}' 临时换字体做对比。 */
export const HAND_FAMILY = 'LXGW Marker Gothic';
const override = (() => {
  if (typeof window === 'undefined') return undefined;
  try {
    return (getInputProps() as { font?: string }).font;
  } catch {
    return undefined;
  }
})();
export const FONT = override ?? `"${HAND_FAMILY}","PingFang SC","Microsoft YaHei",sans-serif`;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const EZ = {
  o3: (p: number) => 1 - (1 - p) ** 3,
  io2: (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2),
};
/** 固定种子的伪随机数：同一个种子永远得到同一个值，画面每次渲染都一样 */
export function rnd(i: number) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/* ---------- 形状点 ---------- */
export function rrPts(x: number, y: number, w: number, h: number, r: number, seed = 1, jit = 1.5): Pt[] {
  const p: Pt[] = [];
  const n = 7;
  ([[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]] as [number, number, number][]).forEach(([cx, cy, a0], k) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      p.push([cx + Math.cos(a) * r + (rnd(seed + k * 9 + i) - 0.5) * jit, cy + Math.sin(a) * r + (rnd(seed + k * 9 + i + 40) - 0.5) * jit]);
    }
  });
  return p;
}
export function ellPts(cx: number, cy: number, rx: number, ry: number, seed = 1, jit = 0.025, n = 56): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU, r = 1 + (rnd(seed + i) - 0.5) * jit * 2;
    return [cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r] as Pt;
  });
}
export function arcPts(cx: number, cy: number, r: number, a0: number, a1: number, n = 24): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + (a1 - a0) * (i / n);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt;
  });
}
export function bez(a: Pt, c: Pt, b: Pt, n = 48): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const k = i / (n - 1);
    return [(1 - k) ** 2 * a[0] + 2 * (1 - k) * k * c[0] + k * k * b[0], (1 - k) ** 2 * a[1] + 2 * (1 - k) * k * c[1] + k * k * b[1]] as Pt;
  });
}

/* ---------- 量字宽（只在浏览器里用） ---------- */
let meas: CanvasRenderingContext2D | null = null;
export function textWidth(text: string, size: number) {
  meas ??= document.createElement('canvas').getContext('2d')!;
  meas.font = `600 ${size}px ${FONT}`;
  return meas.measureText(text).width;
}
