import { PAL, Pt } from './geom';
import { Part, Pl, arc, curve, ell, line, poly, rect, INK, posAt } from './hd';

// 手绘图库：角色和物件，每个返回一组笔画（Part[]），放进 d(...) 里按顺序画出。坐标是设计空间 1920×1080，s 是缩放。

export const BLUE = '#4F7BD9';
export const ORANGE = '#F08A3C';
export const NAVY = '#3B4A8C';
export const CREAM = PAL.cream;
export { PAL, INK };

const tf = (cx: number, cy: number, s: number) => (x: number, y: number): Pt => [cx + x * s, cy + y * s];
let sd = 200;
const nx = () => ++sd;

/* ---------- 角色 ---------- */
/** 机器人前台：黄色方块，天线，耳麦 */
export const router = (cx: number, cy: number, s = 1): Part[] => {
  const p = tf(cx, cy, s);
  return [
    { pl: rect(cx - 70 * s, cy - 60 * s, 140 * s, 120 * s, 30 * s, nx()), w: 4.6, fill: PAL.yellow },
    { pl: line(p(2, -60), p(8, -104), nx(), 1.2), w: 4.2 },
    { pl: ell(...p(8, -114), 10 * s, 10 * s, nx()), w: 4, fill: PAL.coral },
    { pl: ell(...p(-26, -8), 6 * s, 6.5 * s, nx()), w: 3, fill: INK },
    { pl: ell(...p(26, -8), 6 * s, 6.5 * s, nx()), w: 3, fill: INK },
    { pl: arc(...p(0, 6), 22 * s, 0.25 * Math.PI, 0.75 * Math.PI, nx(), 1), w: 4 },
    { pl: arc(...p(0, -14), 76 * s, Math.PI * 1.04, Math.PI * 1.96, nx(), 1.4), w: 5, color: BLUE },
    { pl: rect(...p(-86, -20), 22 * s, 40 * s, 8 * s, nx()), w: 3.6, fill: BLUE },
    { pl: rect(...p(64, -20), 22 * s, 40 * s, 8 * s, nx()), w: 3.6, fill: BLUE },
  ];
};
export const desk = (cx: number, cy: number, s = 1, w = 280): Part[] => {
  const p = tf(cx, cy, s);
  return [
    { pl: rect(...p(-w / 2, 52), w * s, 78 * s, 14 * s, nx()), w: 4.4, fill: PAL.kraft },
    { pl: line(p(-w / 2 + 30, 130), p(-w / 2 + 30, 168), nx(), 1), w: 4.4 },
    { pl: line(p(w / 2 - 30, 130), p(w / 2 - 30, 168), nx(), 1), w: 4.4 },
  ];
};
const face = (p: ReturnType<typeof tf>, s: number, c = INK): Part[] => [
  { pl: ell(...p(-10, 3), 3.6 * s, 3.6 * s, nx()), w: 2, fill: c, color: c },
  { pl: ell(...p(10, 3), 3.6 * s, 3.6 * s, nx()), w: 2, fill: c, color: c },
  { pl: arc(...p(0, 8), 10 * s, 0.2 * Math.PI, 0.8 * Math.PI, nx(), 0.6), w: 3, color: c },
];
const head = (p: ReturnType<typeof tf>, s: number, skin = PAL.skin, lc: string = INK): Part => ({ pl: ell(...p(0, 0), 28 * s, 28 * s, nx()), w: 4, fill: skin, color: lc });
const bodyRect = (p: ReturnType<typeof tf>, s: number, fill: string, lc: string = INK): Part => ({ pl: rect(...p(-29, 24), 58 * s, 54 * s, 14 * s, nx()), w: 4, fill, color: lc });
/** 工程师：安全帽，蓝身子。(cx,cy) 是头心 */
export const worker = (cx: number, cy: number, s = 1, o: { body?: string; hat?: string; line?: string } = {}): Part[] => {
  const p = tf(cx, cy, s), lc = o.line ?? INK;
  const hat = poly([...arc(...p(0, -6), 33 * s, Math.PI, Math.PI * 2, nx(), 0).pts.filter((_, i) => i % 3 === 0)], true, nx(), 1);
  return [bodyRect(p, s, o.body ?? BLUE, lc), head(p, s, PAL.skin, lc), { pl: hat, w: 4, fill: o.hat ?? ORANGE, color: lc }, ...face(p, s, lc)];
};
/** 用户小人：深发、紫身子 */
export const person = (cx: number, cy: number, s = 1, body = '#7C6BC9'): Part[] => {
  const p = tf(cx, cy, s);
  return [
    bodyRect(p, s, body), head(p, s),
    { pl: arc(...p(0, -2), 30 * s, Math.PI * 1.02, Math.PI * 1.98, nx(), 0.8), w: 8, color: INK },
    ...face(p, s),
  ];
};
/** 保安：藏蓝帽，举名单板 */
export const guard = (cx: number, cy: number, s = 1): Part[] => {
  const p = tf(cx, cy, s);
  return [
    bodyRect(p, s, NAVY, INK), head(p, s),
    { pl: poly([...arc(...p(0, -8), 32 * s, Math.PI, Math.PI * 2, nx(), 0).pts.filter((_, i) => i % 3 === 0)], true, nx(), 1), w: 4, fill: NAVY },
    { pl: line(p(-34, -8), p(34, -8), nx(), 0.6), w: 5, color: INK },
    ...face(p, s),
    { pl: rect(...p(38, 22), 54 * s, 70 * s, 6 * s, nx()), w: 3.6, fill: CREAM },
    { pl: line(p(46, 40), p(84, 40), nx(), 0.5), w: 3 }, { pl: line(p(46, 56), p(80, 56), nx(), 0.5), w: 3 }, { pl: line(p(46, 72), p(84, 72), nx(), 0.5), w: 3 },
  ];
};
/** 秘书：眼镜、粉身子、一叠公文 */
export const secretary = (cx: number, cy: number, s = 1): Part[] => {
  const p = tf(cx, cy, s);
  return [
    bodyRect(p, s, PAL.pink), head(p, s),
    { pl: arc(...p(0, 0), 31 * s, Math.PI * 0.95, Math.PI * 2.05, nx(), 0.8), w: 9, color: '#6B3E2E' },
    { pl: ell(...p(-11, 3), 8 * s, 8 * s, nx()), w: 3 }, { pl: ell(...p(11, 3), 8 * s, 8 * s, nx()), w: 3 },
    { pl: line(p(-3, 3), p(3, 3), nx(), 0.3), w: 3 },
    { pl: arc(...p(0, 11), 8 * s, 0.2 * Math.PI, 0.8 * Math.PI, nx(), 0.5), w: 3 },
    { pl: rect(...p(36, 50), 60 * s, 18 * s, 4 * s, nx()), w: 3.4, fill: CREAM }, { pl: rect(...p(34, 38), 60 * s, 18 * s, 4 * s, nx()), w: 3.4, fill: PAL.sky },
  ];
};
/** 带班主管：红帽、青身子、茶杯 */
export const supervisor = (cx: number, cy: number, s = 1): Part[] => {
  const p = tf(cx, cy, s);
  return [
    bodyRect(p, s, PAL.teal), head(p, s),
    { pl: poly([...arc(...p(0, -6), 33 * s, Math.PI, Math.PI * 2, nx(), 0).pts.filter((_, i) => i % 3 === 0)], true, nx(), 1), w: 4, fill: PAL.coral },
    ...face(p, s),
    { pl: rect(...p(34, 46), 26 * s, 24 * s, 5 * s, nx()), w: 3.4, fill: CREAM },
    { pl: arc(...p(62, 58), 8 * s, -Math.PI / 2, Math.PI / 2, nx(), 0.4), w: 3.2 },
  ];
};
/** 机械手：只有手，没有头 */
export const mechHand = (cx: number, cy: number, s = 1): Part[] => {
  const p = tf(cx, cy, s);
  return [
    { pl: rect(...p(-24, 20), 48 * s, 70 * s, 8 * s, nx()), w: 4, fill: PAL.lilac },
    { pl: rect(...p(-38, -20), 76 * s, 44 * s, 12 * s, nx()), w: 4, fill: '#C9CCD8' },
    ...[-30, -10, 10, 30].map((x): Part => ({ pl: rect(...p(x - 6, -62), 12 * s, 44 * s, 6 * s, nx()), w: 3.4, fill: '#C9CCD8' })),
  ];
};

/* ---------- 物件 ---------- */
export const windowBox = (x: number, y: number, w: number, h: number, fill = CREAM): Part[] => [
  { pl: rect(x, y, w, h, 16, nx()), w: 4.6, fill },
  { pl: ell(x + 30, y + 30, 8, 8, nx()), w: 3, fill: PAL.coral }, { pl: ell(x + 56, y + 30, 8, 8, nx()), w: 3, fill: PAL.yellow }, { pl: ell(x + 82, y + 30, 8, 8, nx()), w: 3, fill: PAL.green },
];
export const blackRoom = (x: number, y: number, w: number, h: number): Part[] => [
  { pl: rect(x, y, w, h, 18, nx()), w: 5, fill: PAL.night, fillOp: 0.93 },
  { pl: rect(x + w * 0.08, y + h * 0.14, w * 0.3, h * 0.32, 8, nx()), w: 3.6, color: CREAM, fill: PAL.sky },
  { pl: line([x, y + h * 0.82], [x + w, y + h * 0.82], nx(), 1), w: 3, color: CREAM },
];
export const bubbleBox = (x: number, y: number, w: number, h: number, fill: string): Part[] => [{ pl: rect(x, y, w, h, 20, nx()), w: 3.8, fill }];
export const avatar = (cx: number, cy: number, r: number, fill: string): Part[] => [{ pl: ell(cx, cy, r, r, nx()), w: 3.6, fill }];
export const ticket = (cx: number, cy: number, s = 1): Part[] => {
  const p = tf(cx, cy, s);
  return [
    { pl: rect(...p(-30, -78), 60 * s, 28 * s, 9 * s, nx()), w: 3.6, fill: PAL.kraft },
    { pl: rect(...p(-100, -60), 200 * s, 120 * s, 12 * s, nx()), w: 4.4, fill: CREAM },
    { pl: ell(...p(-72, -30), 7 * s, 7 * s, nx()), w: 3 }, { pl: ell(...p(72, -30), 7 * s, 7 * s, nx()), w: 3 },
  ];
};
export const envelope = (cx: number, cy: number, s = 1, fill = CREAM): Part[] => {
  const p = tf(cx, cy, s);
  return [
    { pl: rect(...p(-34, -24), 68 * s, 46 * s, 6 * s, nx()), w: 3.4, fill },
    { pl: poly([p(-34, -22), p(0, 4), p(34, -22)], false, nx(), 0.6), w: 3 },
  ];
};
export const laptop = (cx: number, cy: number, s = 1, open = true): Part[] => {
  const p = tf(cx, cy, s);
  return open
    ? [
        { pl: rect(...p(-95, -80), 190 * s, 118 * s, 10 * s, nx()), w: 4.4, fill: PAL.sky },
        { pl: poly([p(-120, 46), p(120, 46), p(104, 22), p(-104, 22)], true, nx(), 0.8), w: 4.4, fill: '#C9CCD8' },
      ]
    : [{ pl: poly([p(-120, 46), p(120, 46), p(104, 14), p(-104, 14)], true, nx(), 0.8), w: 4.4, fill: '#C9CCD8' }];
};
export const cloud = (cx: number, cy: number, s = 1, fill = CREAM): Part[] => {
  const pts: Pt[] = Array.from({ length: 72 }, (_, i) => {
    const t = (i / 72) * Math.PI * 2, up = Math.sin(t) < 0;
    const r = 1 + (up ? 0.2 * Math.abs(Math.cos(3.5 * t)) : 0.03);
    return [cx + Math.cos(t) * 150 * s * r, cy + Math.sin(t) * 78 * s * (up ? r : 0.9)] as Pt;
  });
  return [{ pl: poly(pts, true, nx(), 1.4), w: 4.4, fill }];
};
export const dbCyl = (cx: number, cy: number, s = 1, fill = PAL.yellow): Part[] => {
  const p = tf(cx, cy, s);
  return [
    { pl: rect(...p(-50, -50), 100 * s, 120 * s, 10 * s, nx()), w: 4.4, fill },
    { pl: ell(...p(0, -50), 50 * s, 16 * s, nx()), w: 4.4, fill: '#F6D77A' },
    { pl: arc(...p(0, -6), 50 * s, 0.12 * Math.PI, 0.88 * Math.PI, nx(), 0.5), w: 3.4 },
    { pl: arc(...p(0, 34), 50 * s, 0.12 * Math.PI, 0.88 * Math.PI, nx(), 0.5), w: 3.4 },
  ];
};
export const hourglass = (cx: number, cy: number, s = 1): Part[] => {
  const p = tf(cx, cy, s);
  return [
    { pl: poly([p(-30, -52), p(30, -52), p(0, 0)], true, nx(), 0.6), w: 4, fill: PAL.yellow },
    { pl: poly([p(-30, 52), p(30, 52), p(0, 0)], true, nx(), 0.6), w: 4, fill: '#F6D77A' },
    { pl: line(p(-38, -52), p(38, -52), nx(), 0.5), w: 5 }, { pl: line(p(-38, 52), p(38, 52), nx(), 0.5), w: 5 },
  ];
};
export const clockIcon = (cx: number, cy: number, s = 1): Part[] => {
  const p = tf(cx, cy, s);
  return [{ pl: ell(cx, cy, 34 * s, 34 * s, nx()), w: 4, fill: CREAM }, { pl: line(p(0, 0), p(0, -22), nx(), 0.4), w: 4 }, { pl: line(p(0, 0), p(16, 8), nx(), 0.4), w: 4 }];
};
export const bulb = (cx: number, cy: number, s = 1): Part[] => {
  const p = tf(cx, cy, s);
  return [
    { pl: ell(cx, cy, 26 * s, 28 * s, nx()), w: 4, fill: PAL.yellow },
    { pl: rect(...p(-13, 30), 26 * s, 14 * s, 4 * s, nx()), w: 3.6, fill: PAL.kraft },
    { pl: line(p(-42, -24), p(-54, -32), nx(), 0.6), w: 3.6 }, { pl: line(p(42, -24), p(54, -32), nx(), 0.6), w: 3.6 }, { pl: line(p(0, -42), p(0, -56), nx(), 0.6), w: 3.6 },
  ];
};
export const gear = (cx: number, cy: number, r: number): Part[] => [
  ...Array.from({ length: 8 }, (_, i): Part => {
    const a = (i / 8) * Math.PI * 2;
    return { pl: line([cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8], [cx + Math.cos(a) * r * 1.25, cy + Math.sin(a) * r * 1.25], nx(), 0.4), w: 8, color: INK };
  }),
  { pl: ell(cx, cy, r, r, nx()), w: 4, fill: '#C9CCD8' }, { pl: ell(cx, cy, r * 0.36, r * 0.36, nx()), w: 3.4, fill: CREAM },
];
export const check = (cx: number, cy: number, s = 1, color: string = PAL.green): Part[] => {
  const p = tf(cx, cy, s);
  return [{ pl: poly([p(-18, 0), p(-5, 15), p(20, -18)], false, nx(), 0.8), w: 8 * Math.max(0.7, s), color }];
};
export const crossX = (cx: number, cy: number, s = 1, color: string = PAL.coral): Part[] => {
  const p = tf(cx, cy, s);
  return [{ pl: line(p(-18, -18), p(18, 18), nx(), 1), w: 8 * Math.max(0.7, s), color }, { pl: line(p(18, -18), p(-18, 18), nx(), 1), w: 8 * Math.max(0.7, s), color }];
};
export const earIcon = (cx: number, cy: number, s = 1): Part[] => [
  { pl: arc(cx, cy, 24 * s, Math.PI * 0.85, Math.PI * 2.2, nx(), 1), w: 4.4 },
  { pl: arc(cx + 2 * s, cy + 2 * s, 11 * s, Math.PI * 0.9, Math.PI * 2.0, nx(), 0.8), w: 3.6 },
  { pl: line([cx - 20 * s, cy + 14 * s], [cx - 14 * s, cy + 34 * s], nx(), 0.8), w: 4.4 },
];
export const headsetIcon = (cx: number, cy: number): Part[] => [
  { pl: arc(cx, cy, 24, Math.PI, Math.PI * 2, nx(), 1), w: 5 },
  { pl: rect(cx - 33, cy - 6, 16, 28, 6, nx()), w: 3.4, fill: PAL.coral }, { pl: rect(cx + 17, cy - 6, 16, 28, 6, nx()), w: 3.4, fill: PAL.coral },
];
export const cabinet = (x: number, y: number, w: number, h: number, rows = 3): Part[] => [
  { pl: rect(x, y, w, h, 10, nx()), w: 4.6, fill: PAL.kraft },
  ...Array.from({ length: rows }, (_, i): Part[] => {
    const dh = (h - 24) / rows, yy = y + 12 + i * dh;
    return [{ pl: rect(x + 14, yy, w - 28, dh - 10, 6, nx()), w: 3.6, fill: '#DDB27A' }, { pl: line([x + w / 2 - 14, yy + dh / 2 - 5], [x + w / 2 + 14, yy + dh / 2 - 5], nx(), 0.4), w: 5 }];
  }).flat(),
];
export const sticky = (x: number, y: number, w: number, h: number, fill: string = PAL.yellow): Part[] => [{ pl: rect(x, y, w, h, 4, nx(), 1.2), w: 3.4, fill }];
export const docCard = (x: number, y: number, w: number, h: number, lines = 3, fill: string = CREAM): Part[] => [
  { pl: rect(x, y, w, h, 8, nx()), w: 3.8, fill },
  ...Array.from({ length: lines }, (_, i): Part => ({ pl: line([x + 14, y + 22 + i * 18], [x + w - 14 - (i % 2) * 24, y + 22 + i * 18], nx(), 0.5), w: 3, color: '#6B6A85' })),
];
export const sealRing = (cx: number, cy: number, r: number, color: string = PAL.coral): Part[] => [{ pl: ell(cx, cy, r, r, nx(), 2), w: 5, color }, { pl: ell(cx, cy, r - 9, r - 9, nx(), 1.5), w: 2.6, color }];
export const arrow = (a: Pt, b: Pt, c?: Pt, color: string = INK, w = 4.4): Part[] => {
  const pl: Pl = c ? curve(a, c, b, nx(), 1.6) : line(a, b, nx(), 1.6);
  const e = posAt(pl, 1), q = posAt(pl, 0.96), ang = Math.atan2(e.y - q.y, e.x - q.x);
  const hd = (da: number): Part => ({ pl: line([e.x - Math.cos(ang + da) * 26, e.y - Math.sin(ang + da) * 26], [e.x, e.y], nx(), 0.6), w, color });
  return [{ pl, w, color }, hd(0.5), hd(-0.5)];
};
export const dashedLine = (a: Pt, b: Pt, c?: Pt, color: string = INK): Part => ({ pl: c ? curve(a, c, b, nx(), 1.6) : line(a, b, nx(), 1.6), w: 3.6, color, dash: '11 11' });
export const bar = (x: number, y: number, w: number, h: number, fill: string): Part[] => [{ pl: rect(x, y, w, h, 6, nx(), 1), w: 4, fill }];
export const axes = (x: number, y: number, w: number, h: number): Part[] => [
  { pl: line([x, y], [x, y - h], nx(), 1), w: 4.4 }, { pl: line([x, y], [x + w, y], nx(), 1), w: 4.4 },
];
export const progress = (x: number, y: number, w: number, frac: number, fill: string = PAL.teal): Part[] => [
  { pl: rect(x, y, w, 26, 13, nx()), w: 3.6, fill: CREAM }, ...(frac > 0 ? [{ pl: rect(x + 3, y + 3, Math.max(14, (w - 6) * frac), 20, 10, nx()), w: 2, fill, color: fill } as Part] : []),
];
export const tablet = (x: number, y: number, w: number, h: number, fill: string = CREAM): Part[] => [{ pl: rect(x, y, w, h, 12, nx()), w: 4.2, fill }];
