import React from 'react';
import { Composition } from 'remotion';
import './engine/font';
import { Film } from './Film';
import { FPS, totalFrames } from './plans';

// 默认出 1920×1080。要 2K（2560×1440）就把下面的 width、height 改掉，画面会按比例放大，不用改分镜。
export const Root: React.FC = () => (
  <Composition id="Film" component={Film} durationInFrames={totalFrames()} fps={FPS} width={1920} height={1080} defaultProps={{ subs: false }} />
);
