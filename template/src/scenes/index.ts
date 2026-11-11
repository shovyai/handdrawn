import type { Beat } from '../engine/beat';
import { S1, S2 } from './demo';

// 登记所有场景的分镜。键是 data/script.json 里场景的 id。
export const BEATS: Record<string, Beat[]> = { S1, S2 };
