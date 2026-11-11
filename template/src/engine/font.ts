import { continueRender, delayRender, staticFile } from 'remotion';
import { HAND_FAMILY } from './geom';

// 渲染前把手写字体加载好，否则第一帧可能用了备用字体，字宽也会量错。
if (typeof document !== 'undefined' && typeof FontFace !== 'undefined') {
  const handle = delayRender('加载手写字体');
  const face = new FontFace(HAND_FAMILY, `url(${staticFile('fonts/LXGWMarkerGothic-Regular.ttf')})`, { weight: '100 900' });
  face
    .load()
    .then((f) => {
      document.fonts.add(f);
      continueRender(handle);
    })
    .catch((e) => {
      console.error('手写字体加载失败', e);
      continueRender(handle);
    });
}
