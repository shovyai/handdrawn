import React, { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { H, TAU, W, rnd } from './geom';

// 底纸：一种纸色 + 水粉笔触 + 纸纤维 + 蜡笔颗粒。纹理只生成一次，之后每帧直接贴图，所以底纸不会闪。

type G = CanvasRenderingContext2D;
const SS = 1.5; // 纹理清晰度（相对设计坐标）

function tile(size: number, draw: (g: G) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!);
  return c;
}
function wrap(g: G, size: number, f: () => void) {
  for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
    g.save();
    g.translate(dx, dy);
    f();
    g.restore();
  }
}
type Tex = { brush: HTMLCanvasElement; fiber: HTMLCanvasElement; grain: HTMLCanvasElement };
let TEX: Tex | null = null;
function tex(): Tex {
  if (TEX) return TEX;
  TEX = {
    brush: tile(512, (g) => {
      g.lineCap = 'round';
      for (let i = 0; i < 70; i++) {
        const x = rnd(i * 1.3) * 512, y = rnd(i * 2.9) * 512;
        const len = 70 + rnd(i * 4.1) * 220, width = 7 + rnd(i * 5.3) * 26, slope = -0.08 + rnd(i * 6.7) * 0.16;
        wrap(g, 512, () => {
          g.strokeStyle = i % 3 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.045)';
          g.lineWidth = width;
          g.beginPath();
          g.moveTo(x, y);
          g.quadraticCurveTo(x + len * 0.5, y + slope * len * 0.5 - 3, x + len, y + slope * len);
          g.stroke();
          for (let j = 0; j < 6; j++) {
            const off = (rnd(i * 13 + j) - 0.5) * width;
            g.strokeStyle = j % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.03)';
            g.lineWidth = 0.5 + rnd(i + j * 7) * 1.1;
            g.beginPath();
            g.moveTo(x + 8, y + off);
            g.lineTo(x + len - 8, y + off + slope * len);
            g.stroke();
          }
        });
      }
    }),
    fiber: tile(256, (g) => {
      for (let i = 0; i < 700; i++) {
        g.fillStyle = i % 3 ? `rgba(255,255,255,${0.05 + rnd(i * 1.9) * 0.06})` : `rgba(0,0,0,${0.035 + rnd(i * 2.7) * 0.04})`;
        g.fillRect(rnd(i * 5.1) * 256, rnd(i * 8.7) * 256, 1, 1);
      }
      g.lineWidth = 0.8;
      for (let i = 0; i < 60; i++) {
        const x = rnd(i * 6.3) * 256, y = rnd(i * 4.4) * 256, a = rnd(i * 9.9) * TAU, l = 3 + rnd(i) * 7;
        g.strokeStyle = `rgba(0,0,0,${0.04 + rnd(i * 3) * 0.04})`;
        wrap(g, 256, () => {
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
          g.stroke();
        });
      }
    }),
    grain: tile(256, (g) => {
      for (let i = 0; i < 520; i++) {
        const r = 0.6 + rnd(i) * 1.4;
        g.fillStyle = i % 2 ? `rgba(255,255,255,${0.08 + rnd(i * 2) * 0.1})` : `rgba(0,0,0,${0.04 + rnd(i * 5) * 0.06})`;
        g.fillRect(rnd(i * 3.7) * 256, rnd(i * 9.1) * 256, r, r);
      }
    }),
  };
  return TEX;
}
function wash(g: G, name: keyof Tex, alpha: number, ext: number) {
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = g.createPattern(tex()[name], 'repeat')!;
  g.fillRect(-ext, -ext, ext * 2, ext * 2);
  g.restore();
}

const PAPER = new Map<string, HTMLCanvasElement>();
function paper(color: string, angle: number) {
  const key = `${color}:${angle}`;
  const hit = PAPER.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = W * SS;
  c.height = H * SS;
  const g = c.getContext('2d')!;
  g.scale(SS, SS);
  g.fillStyle = color;
  g.fillRect(0, 0, W, H);
  g.save();
  g.rotate(angle);
  wash(g, 'brush', 1.5, 2400);
  g.restore();
  wash(g, 'fiber', 0.9, 2400);
  wash(g, 'grain', 0.35, 2400);
  PAPER.set(key, c);
  return c;
}

/** 满幅底纸 */
export const Ground: React.FC<{ color: string; angle?: number }> = ({ color, angle = -0.07 }) => {
  const { width, height } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, width, height);
    g.drawImage(paper(color, angle), 0, 0, width, height);
  });
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={width} height={height} style={{ width: '100%', height: '100%' }} />
    </AbsoluteFill>
  );
};

/** 1920×1080 的设计空间，等比缩放到成片；k < 1 时整体缩小、水平居中、贴顶，给底部字幕让位 */
export const Stage: React.FC<{ children: React.ReactNode; k?: number }> = ({ children, k = 1 }) => {
  const { width } = useVideoConfig();
  const s = (width / W) * k;
  return (
    <div style={{ position: 'absolute', left: (width - W * s) / 2, top: 0, width: W, height: H, transform: `scale(${s})`, transformOrigin: '0 0' }}>
      {children}
    </div>
  );
};
