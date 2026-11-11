import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { LayoutCtx, PlanView } from './engine/beat';
import { FilmScene, FPS, PLANS, SCENES } from './plans';

/** 画面缩到 90%，底部 10% 留给字幕（不压内容）。无字幕版也保留这块位置，方便以后自己加字幕。 */
const K = 0.9;

const Subs: React.FC<{ sc: FilmScene }> = ({ sc }) => {
  const t = useCurrentFrame() / FPS + sc.start;
  const { width, height } = useVideoConfig();
  const list = sc.sentences.flatMap((s) => s.clauses.map((c, i) => ({ text: c.text, start: c.start, end: i + 1 < s.clauses.length ? s.clauses[i + 1].start : c.end + 0.25 })));
  const cur = list.filter((c) => t >= c.start && t < c.end).pop();
  if (!cur) return null;
  const u = width / 1920;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: height * K, height: height * (1 - K), display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div
        style={{
          background: 'rgba(24,22,48,0.85)',
          color: '#FFF8E7',
          fontFamily: '"PingFang SC","Microsoft YaHei",sans-serif',
          fontSize: 40 * u,
          fontWeight: 600,
          padding: `${7 * u}px ${26 * u}px`,
          borderRadius: 14 * u,
          whiteSpace: 'nowrap',
        }}
      >
        {cur.text.replace(/[，。；、]$/, '')}
      </div>
    </div>
  );
};

/** 把所有场景按时间表接起来 */
export const Film: React.FC<{ subs?: boolean }> = ({ subs = false }) => {
  let at = 0;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {SCENES.map((sc) => {
        const frames = Math.round((sc.next - sc.start) * FPS);
        const from = at;
        at += frames;
        return (
          <Sequence key={sc.id} from={from} durationInFrames={frames}>
            <LayoutCtx.Provider value={{ k: K }}>
              <PlanView plan={PLANS[sc.id]} />
            </LayoutCtx.Provider>
            {subs && <Subs sc={sc} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
