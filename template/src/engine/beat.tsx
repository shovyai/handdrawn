import React, { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill, getInputProps, useCurrentFrame } from 'remotion';
import { Ground, Stage } from './paper';
import { EZ, FONT, GROUND, PAL, seg, textWidth } from './geom';
import { Part, Pencil, Pl, INK, cut, onePencil, posAt, toD } from './hd';
import { auditSvg } from './audit';

/** 成片里把画面缩小一点（k < 1），给底部字幕留出专用的区域 */
export const LayoutCtx = React.createContext<{ k: number }>({ k: 1 });

// 逐分句调度：每个字幕分句是一拍，这一拍要画的东西严格按顺序一笔接一笔。
// 铅笔速度全片固定；配音不动；起笔时间由分句起点和「讲到哪个词」决定；同一时刻只有一支笔。
// 画不完、画太慢、画太快都由 scripts/check.mjs 在出片前拦下来。

export const PEN = 1600; // 设计像素/秒，全片固定
export const CPS = 9; // 手写速度：每秒汉字数（拉丁字母按 0.55 个汉字算），全片固定
export const FILL = 0.28; // 上色时长，不占用笔的时间
const MIN_STROKE = 0.04;
const MAX_GAP = 1.6;
const MARGIN = 0.1; // 每句至少提前这么多秒画完（含上色），让完整的画面被看见
const HEAD = 0.5; // 开口后这么多秒内必须落笔

export type TClause = { text: string; start: number; end: number };
export type TSent = { n: number; spoken: string; start: number; end: number; norm: string; times: number[]; clauses: TClause[] };
export type TScene = { id: string; start: number; next: number; sentences: TSent[] };

type Opt = { at?: string; group?: string };
export type Op =
  | ({ k: 'draw'; parts: Part[] } & Opt)
  | ({ k: 'hand'; text: string; x: number; y: number; size?: number; color?: string; center?: boolean; rot?: number; maxW?: number } & Opt)
  | ({ k: 'fly'; pl: Pl; dur: number; color?: string; label?: string; keep?: boolean } & Opt)
  | ({ k: 'move'; target: string; x: number; y: number; s: number; dur: number } & Opt)
  | ({ k: 'fade'; target: string; dur: number } & Opt);
export type Beat = { s: number; c: number; ops: Op[] };

export const d = (parts: Part[], o: Opt = {}): Op => ({ k: 'draw', parts, ...o });
export const h = (text: string, x: number, y: number, o: Opt & { size?: number; color?: string; center?: boolean; rot?: number; maxW?: number } = {}): Op => ({ k: 'hand', text, x, y, ...o });
export const fly = (pl: Pl, dur: number, o: Opt & { color?: string; label?: string; keep?: boolean } = {}): Op => ({ k: 'fly', pl, dur, ...o });
export const mv = (target: string, x: number, y: number, s: number, dur = 0.4, o: Opt = {}): Op => ({ k: 'move', target, x, y, s, dur, ...o });
export const fade = (target: string, dur = 0.3, o: Opt = {}): Op => ({ k: 'fade', target, dur, ...o });
export const b = (s: number, c: number, ...ops: Op[]): Beat => ({ s, c, ops });

const norm = (s: string) => s.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
const strokeTime = (p: Part) => Math.max(MIN_STROKE, p.pl.len / PEN);
const handTime = (t: string) => Math.max(0.2, [...t].reduce((a, c) => a + (c.charCodeAt(0) > 255 ? 1 : c === ' ' ? 0.3 : 0.55), 0) / CPS);
// move（整组缩放让位）不占笔的时间：缩放的同时笔已经在空出来的地方画了
const opDur = (o: Op) => (o.k === 'draw' ? o.parts.reduce((a, p) => a + strokeTime(p), 0) : o.k === 'hand' ? handTime(o.text) : o.k === 'fly' ? o.dur : 0);

/** 这一步的笔收住之后，上色还要再持续多久 */
const opTail = (o: Op) => {
  if (o.k !== 'draw') return 0;
  let left = opDur(o), tail = 0;
  for (let i = o.parts.length - 1; i >= 0; i--) {
    if (o.parts[i].fill) tail = Math.max(tail, FILL - (opDur(o) - left));
    left -= strokeTime(o.parts[i]);
  }
  return Math.max(0, tail);
};

export type Item =
  | { k: 'stroke'; part: Part; t0: number; dur: number; group: string; key: string }
  | { k: 'hand'; op: Extract<Op, { k: 'hand' }>; t0: number; dur: number; group: string; key: string }
  | { k: 'fly'; op: Extract<Op, { k: 'fly' }>; t0: number; dur: number; group: string; key: string };
export type Move = { target: string; t0: number; dur: number; x: number; y: number; s: number };
export type Row = { s: number; c: number; text: string; speechStart: number; speechEnd: number; deadline: number; first: number; last: number; late: number; errors: string[] };
export type Fade = { target: string; t0: number; dur: number };
export type Plan = { id: string; dur: number; items: Item[]; moves: Move[]; fades: Fade[]; rows: Row[]; ground: string };

/** 把一个场景的所有拍排成绝对时间（相对场景起点，秒）。这是唯一决定「什么时候画」的地方。 */
export function plan(sc: TScene, beats: Beat[], ground: string = GROUND.sky): Plan {
  const items: Item[] = [];
  const moves: Move[] = [];
  const fades: Fade[] = [];
  const rows: Row[] = [];
  const base = sc.start;
  const clauses = sc.sentences.flatMap((s) => s.clauses.map((c, i) => ({ s: s.n, c: i, cl: c, sent: s })));
  let cursor = 0;
  clauses.forEach((cl, idx) => {
    const beat = beats.find((x) => x.s === cl.s && x.c === cl.c);
    const cs = cl.cl.start - base, ce = cl.cl.end - base;
    const deadline = (idx + 1 < clauses.length ? clauses[idx + 1].cl.start : sc.next) - base;
    const row: Row = { s: cl.s, c: cl.c, text: cl.cl.text, speechStart: cs, speechEnd: ce, deadline, first: cs, last: cs, late: 0, errors: [] };
    rows.push(row);
    if (!beat || !beat.ops.length) { row.errors.push('这一句没有画任何东西'); return; }
    // 只在本分句的时间范围内找锚词，同一句里重复的词不会找到前一个分句去
    let from = cl.sent.times.findIndex((v) => v - base >= cs - 0.4);
    if (from < 0) from = 0;
    const anchors = beat.ops.map((o, i) => {
      if (o.at) {
        const k = cl.sent.norm.indexOf(norm(o.at), from);
        if (k < 0) { row.errors.push(`找不到锚词「${o.at}」`); return i === 0 ? cs : null; }
        from = k + 1;
        // 第一笔最多等 0.4 秒：字幕一出现就要有笔在动，整句的字幕观众已经看到了
        return Math.max(cs, i === 0 ? Math.min(cl.sent.times[k] - base, cs + 0.4) : cl.sent.times[k] - base);
      }
      return i === 0 ? cs : null;
    });
    let t = Math.max(cursor, cs);
    if (cursor > cs + 0.001) row.errors.push(`上一句的笔还没收，晚了 ${(cursor - cs).toFixed(2)} 秒`);
    row.first = t;
    let i = 0;
    while (i < beat.ops.length) {
      let j = i + 1;
      while (j < beat.ops.length && anchors[j] === null) j++;
      const want = anchors[i] ?? t;
      if (t > want + 0.25) { row.late = Math.max(row.late, t - want); row.errors.push(beat.ops[i].at ? `比口播「${beat.ops[i].at}」慢 ${(t - want).toFixed(2)} 秒` : `开口 ${(t - want).toFixed(2)} 秒后才开始画（上一句拖过来了）`); }
      t = Math.max(t, want);
      // 最后一段的空余时间算到「上色也完成」为止，并且不越过下一句的起点
      const runEnd = j < beat.ops.length ? anchors[j]! : Math.min(ce - 0.05, deadline - MARGIN - 0.02) - opTail(beat.ops[beat.ops.length - 1]);
      const D = beat.ops.slice(i, j).reduce((a, o) => a + opDur(o), 0);
      const n = beat.ops.slice(i, j).filter((o) => opDur(o) > 0).length; // 缩放、擦除不占笔的时间，也不留间隔
      const gap = n > 1 ? Math.min(MAX_GAP, Math.max(0, runEnd - t - D) / (n - 1)) : 0;
      for (let k = i; k < j; k++) {
        const o = beat.ops[k];
        const group = o.group ?? '';
        const key = `${cl.s}.${cl.c}.${k}`;
        if (o.k === 'draw') {
          let p0 = t;
          o.parts.forEach((part, pi) => { const dur = strokeTime(part); items.push({ k: 'stroke', part, t0: p0, dur, group, key: `${key}.${pi}` }); p0 += dur; });
        } else if (o.k === 'hand') items.push({ k: 'hand', op: o, t0: t, dur: handTime(o.text), group, key });
        else if (o.k === 'fly') items.push({ k: 'fly', op: o, t0: t, dur: o.dur, group, key });
        else if (o.k === 'move') moves.push({ target: o.target, t0: t, dur: o.dur, x: o.x, y: o.y, s: o.s });
        else fades.push({ target: o.target, t0: t, dur: o.dur });
        t += opDur(o) + (k < j - 1 && opDur(o) > 0 ? gap : 0);
      }
      i = j;
    }
    row.last = t + opTail(beat.ops[beat.ops.length - 1]);
    cursor = t;
    if (row.last > deadline - MARGIN) row.errors.push(`没画完就到下一句：超出 ${(row.last - deadline + MARGIN).toFixed(2)} 秒`);
    const firstDraw = items.filter((x) => x.key.startsWith(`${cl.s}.${cl.c}.`)).reduce((a, x) => Math.min(a, x.t0), Infinity);
    if (firstDraw > cs + HEAD) row.errors.push(`开口 ${(firstDraw - cs).toFixed(2)} 秒后才落笔`);
    const speech = ce - cs;
    if (speech >= 1.2 && (row.last - cs) / speech < 0.6) row.errors.push(`画得比口播快：只占这句 ${Math.round(((row.last - cs) / speech) * 100)}%`);
  });
  return { id: sc.id, dur: sc.next - sc.start, items, moves, fades, rows, ground };
}

/* ---------- 渲染 ---------- */
const Stroke: React.FC<{ it: Extract<Item, { k: 'stroke' }>; now: number; id: string }> = ({ it, now, id }) => {
  const p = seg(now, it.t0, it.t0 + it.dur);
  if (p <= 0) return null;
  const { pl, color = INK, w = 4.2, fill, fillOp = 0.95, dash } = it.part;
  const pts = cut(pl, p);
  const head = pts[pts.length - 1];
  let fillEl: React.ReactNode = null;
  if (fill && p >= 1) {
    const q = EZ.o3(seg(now, it.t0 + it.dur, it.t0 + it.dur + FILL));
    const xs = pl.pts.map((v) => v[0]), ys = pl.pts.map((v) => v[1]);
    const x0 = Math.min(...xs) - 6, x1 = Math.max(...xs) + 6, y0 = Math.min(...ys) - 6, y1 = Math.max(...ys) + 6;
    fillEl = (
      <>
        {q < 1 && <clipPath id={id}><rect x={x0} y={y0} width={(x1 - x0) * q} height={y1 - y0} /></clipPath>}
        <path d={toD(pl.pts) + 'Z'} fill={fill} fillOpacity={fillOp} clipPath={q < 1 ? `url(#${id})` : undefined} stroke="none" transform="translate(2.5,2.5)" />
      </>
    );
  }
  return (
    <g>
      {fillEl}
      <path d={toD(pts)} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} />
      {p < 1 && <Pencil x={head[0]} y={head[1]} start={it.t0} />}
    </g>
  );
};

const Write: React.FC<{ it: Extract<Item, { k: 'hand' }>; now: number; id: string }> = ({ it, now, id }) => {
  const p = seg(now, it.t0, it.t0 + it.dur);
  if (p <= 0) return null;
  const { text, x, y, size: s0 = 36, color = INK, center, rot = 0, maxW } = it.op;
  let size = s0, w = textWidth(text, size);
  if (maxW && w > maxW) { size = Math.floor((size * maxW) / w); w = textWidth(text, size); }
  const x0 = center ? x - w / 2 : x;
  return (
    <g transform={`rotate(${rot} ${x} ${y})`}>
      {p < 1 && <clipPath id={id}><rect x={x0 - 6} y={y - size * 1.1} width={w * p + 8} height={size * 1.6} /></clipPath>}
      <text x={x0} y={y} fontFamily={FONT} fontSize={size} fontWeight={600} fill={color} stroke={color} strokeWidth={size * 0.03} strokeLinejoin="round" clipPath={p < 1 ? `url(#${id})` : undefined}>{text}</text>
      {p < 1 && <Pencil x={x0 + w * p} y={y + size * 0.1} start={it.t0} />}
    </g>
  );
};

const Flyer: React.FC<{ it: Extract<Item, { k: 'fly' }>; now: number }> = ({ it, now }) => {
  const p = seg(now, it.t0, it.t0 + it.dur);
  if (p <= 0 || (p >= 1 && !it.op.keep)) return null;
  const { x, y } = posAt(it.op.pl, EZ.io2(p));
  const { color = PAL.cream, label } = it.op;
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-34} y={-24} width={68} height={46} rx={6} fill={color} stroke={INK} strokeWidth={3.2} />
      <path d="M-34 -22 L0 4 L34 -22" fill="none" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      {label && <text x={0} y={20} textAnchor="middle" fontFamily={FONT} fontSize={22} fontWeight={700} fill={PAL.coral}>{label}</text>}
    </g>
  );
};

function groupTf(moves: Move[], g: string, now: number) {
  let x = 0, y = 0, s = 1;
  for (const m of moves.filter((v) => v.target === g).sort((a, b) => a.t0 - b.t0)) {
    const q = EZ.io2(seg(now, m.t0, m.t0 + m.dur));
    x += (m.x - x) * q; y += (m.y - y) * q; s += (m.s - s) * q;
  }
  return `translate(${x.toFixed(2)},${y.toFixed(2)}) scale(${s.toFixed(4)})`;
}

export const PlanView: React.FC<{ plan: Plan }> = ({ plan: pl }) => {
  const now = useCurrentFrame() / 30;
  const ref = useRef<SVGSVGElement>(null);
  const { k } = React.useContext(LayoutCtx);
  useLayoutEffect(() => {
    onePencil(ref.current);
    if ((getInputProps() as { audit?: boolean }).audit && ref.current) auditSvg(ref.current, pl.id, Math.round(now * 30));
  });
  const groups = [...new Set(pl.items.map((i) => i.group))];
  return (
    <AbsoluteFill>
      <Ground color={pl.ground} />
      <Stage k={k}>
        <svg ref={ref} width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', left: 0, top: 0 }}>
          {groups.map((g) => (
            <g key={g || 'root'} transform={g ? groupTf(pl.moves, g, now) : undefined} opacity={1 - Math.max(0, ...pl.fades.filter((v) => v.target === g).map((v) => seg(now, v.t0, v.t0 + v.dur)))}>
              {pl.items.filter((i) => i.group === g).map((it) => {
                const id = `${pl.id}-${it.key.replace(/\./g, '-')}`;
                if (it.k === 'stroke') return <Stroke key={it.key} it={it} now={now} id={id} />;
                if (it.k === 'hand') return <Write key={it.key} it={it} now={now} id={id} />;
                return <Flyer key={it.key} it={it} now={now} />;
              })}
            </g>
          ))}
        </svg>
      </Stage>
    </AbsoluteFill>
  );
};
