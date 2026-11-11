// 时间表校验：node scripts/check.mjs [场景id,…]
// 出片前跑。任何一句「没画完就到下一句」「比口播慢」「画得太快」「开口很久才落笔」「没有画东西」都算失败（退出码 1）。
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const only = process.argv[2]?.split(',');
const out = path.join(root, 'node_modules/.cache/handdrawn-check.mjs');
fs.mkdirSync(path.dirname(out), { recursive: true });
await esbuild.build({
  stdin: { contents: "export { PLANS } from './src/plans';", resolveDir: root, loader: 'ts' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: out,
  logLevel: 'error',
  jsx: 'automatic',
  banner: { js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);" },
  loader: { '.ttf': 'empty', '.png': 'empty', '.jpg': 'empty', '.mp3': 'empty', '.css': 'empty' },
});
const { PLANS } = await import(pathToFileURL(out).href + '?' + Date.now());
let bad = 0, n = 0;
for (const [id, p] of Object.entries(PLANS)) {
  if (only && !only.includes(id)) continue;
  console.log(`\n== ${id}（${p.dur.toFixed(1)} 秒）`);
  for (const r of p.rows) {
    n++;
    const load = ((r.last - r.speechStart) / Math.max(0.01, r.speechEnd - r.speechStart)) * 100;
    if (r.errors.length) bad++;
    console.log(`${r.errors.length ? '✗' : '✓'} 第${r.s}句-${r.c + 1} 口播 ${r.speechStart.toFixed(2)}–${r.speechEnd.toFixed(2)} 画 ${r.first.toFixed(2)}–${r.last.toFixed(2)} 占 ${load.toFixed(0)}% ${r.text.slice(0, 16)} ${r.errors.join('；')}`);
  }
}
console.log(`\n共 ${n} 个分句，失败 ${bad} 个`);
process.exit(bad ? 1 : 0);
