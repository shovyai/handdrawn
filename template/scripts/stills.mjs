// 检查图：node scripts/stills.mjs [场景id,…] [--props '{"font":"…"}']
// 每个分句画完那一刻截一帧，存到 output/stills/，同时跑版面自检（字压字、出框、出画面），最后拼一张联系图。
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const pi = args.indexOf('--props');
const extra = pi >= 0 ? JSON.parse(args.splice(pi, 2)[1]) : {};
const only = args[0]?.split(',');
const timing = JSON.parse(fs.readFileSync(path.join(root, 'data/timing.json'), 'utf8'));
const outDir = path.join(root, 'output/stills');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.ts') });
const inputProps = { subs: true, audit: true, ...extra };
const composition = await selectComposition({ serveUrl, id: 'Film', inputProps });

// 每个分句：在下一个分句开始前 0.12 秒截图（这时这一句应该已经画完）
let offset = 0;
const shots = [];
for (const sc of timing.scenes) {
  const frames = Math.round((sc.next - sc.start) * 30);
  if (!only || only.includes(sc.id)) {
    const cl = sc.sentences.flatMap((s) => s.clauses.map((c, i) => ({ s: s.n, c: i, start: c.start })));
    cl.forEach((c, i) => {
      const until = i + 1 < cl.length ? cl[i + 1].start : sc.next;
      shots.push({ name: `${sc.id}-${c.s}.${c.c + 1}`, frame: offset + Math.max(0, Math.round((until - sc.start - 0.12) * 30)) });
    });
  }
  offset += frames;
}

const issues = [];
for (const sh of shots) {
  const file = path.join(outDir, `${sh.name}.png`);
  await renderStill({
    serveUrl,
    composition,
    inputProps,
    frame: Math.min(sh.frame, composition.durationInFrames - 1),
    output: file,
    onBrowserLog: (log) => {
      const m = log.text.match(/^HDAUDIT\|(.*)$/);
      if (m) {
        const r = JSON.parse(m[1]);
        r.issues.forEach((x) => issues.push(`${sh.name}：${x}`));
      }
    },
  });
  process.stdout.write('.');
}
console.log(`\n检查图 ${shots.length} 张：${path.relative(root, outDir)}/`);

// 联系图（需要本机装了 ffmpeg；没有就跳过）
try {
  const list = fs.readdirSync(outDir).filter((f) => f.endsWith('.png')).sort();
  const tmp = path.join(outDir, '_seq');
  fs.mkdirSync(tmp);
  list.forEach((f, i) => fs.copyFileSync(path.join(outDir, f), path.join(tmp, `${String(i).padStart(3, '0')}.png`)));
  const cols = 3, rows = Math.ceil(list.length / cols);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(tmp, '%03d.png'), '-vf', `scale=640:-1,tile=${cols}x${rows}:padding=6:color=white`, '-frames:v', '1', path.join(outDir, '_contact.jpg')]);
  fs.rmSync(tmp, { recursive: true });
  console.log(`联系图：${path.relative(root, outDir)}/_contact.jpg`);
} catch {
  console.log('没有 ffmpeg，跳过联系图');
}

if (issues.length) {
  console.log(`\n版面问题 ${issues.length} 条：`);
  [...new Set(issues)].forEach((x) => console.log('  ' + x));
  process.exit(1);
}
console.log('版面自检通过');
