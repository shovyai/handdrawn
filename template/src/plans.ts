import timing from '../data/timing.json';
import { plan, Plan, TScene } from './engine/beat';
import { GROUND, GroundName } from './engine/geom';
import { BEATS } from './scenes';

export const FPS = 30;
export type FilmScene = TScene & { ground?: string };
export const SCENES = (timing as { scenes: FilmScene[] }).scenes;

const groundColor = (g?: string) => (g && g in GROUND ? GROUND[g as GroundName] : g) ?? GROUND.sky;

/** 每个场景的排程：什么时候画哪一笔。成片和校验脚本用的是同一份。 */
export const PLANS: Record<string, Plan> = Object.fromEntries(
  SCENES.map((sc) => {
    const beats = BEATS[sc.id];
    if (!beats) throw new Error(`场景 ${sc.id} 没有分镜：在 src/scenes/index.ts 的 BEATS 里登记它`);
    return [sc.id, plan(sc, beats, groundColor(sc.ground))];
  }),
);

export const totalFrames = () => SCENES.reduce((a, sc) => a + Math.round((sc.next - sc.start) * FPS), 0);
