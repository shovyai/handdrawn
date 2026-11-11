// 按讲解稿估算时间表：node scripts/timing.mjs
// 读 data/script.json，写 data/timing.json。没有配音时，按固定语速估算每个字什么时候被"念到"，
// 画面就按这个节奏一句一句画。以后有了配音，只要把 timing.json 换成按录音对齐的版本，分镜不用改。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = JSON.parse(fs.readFileSync(path.join(root, 'data/script.json'), 'utf8'));

const CPS = script.cps ?? 4.2; // 语速：每秒几个汉字
const GAP_CLAUSE = script.gapClause ?? 0.25; // 分句之间停顿（秒）
const GAP_SENT = script.gapSentence ?? 0.5; // 句子之间停顿
const LEAD = script.lead ?? 0.3; // 场景开头空白
const TAIL = script.tail ?? 0.9; // 场景结尾留着看完整画面

const keep = /[\p{L}\p{N}]/u;
const norm = (s) => [...s].filter((c) => keep.test(c)).join('').toLowerCase();
const clausesOf = (s) => (Array.isArray(s) ? s : String(s).split('|')).map((x) => x.trim()).filter(Boolean);

// 一串阿拉伯数字按中文念法估字数：25 → 二十五（3）、15 → 十五（2）、30 → 三十（2）、100 → 一百（2）；
// 四位及以上多半是年份或编号，按一位一个字念（2026 → 二零二六）。
function numSyllables(run) {
  const n = Number(run);
  if (run.length >= 4 || run.startsWith('0')) return run.length;
  if (n < 10) return 1;
  if (n < 20) return n % 10 ? 2 : 1;
  if (n < 100) return n % 10 ? 3 : 2;
  const d = [...run].map(Number);
  return 2 + (d[1] ? 2 : d[2] ? 1 : 0) + (d[2] ? 1 : 0); // 百位两字，十位两字，个位一字；中间是零念"零"
}
// 把一个分句拆成"保留下来的字"（和 norm 一一对应）以及每个字要念多久（单位：汉字）
function units(text) {
  const out = []; // 每个保留字一项 { u: 念这个字的长度, after: 这个字后面额外的长度 }
  const ch = [...text];
  for (let i = 0; i < ch.length; i++) {
    const c = ch[i];
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < ch.length && /[0-9]/.test(ch[j])) j++;
      const run = ch.slice(i, j).join('');
      const each = numSyllables(run) / run.length;
      for (let k = i; k < j; k++) out.push({ u: each, after: 0 });
      i = j - 1;
    } else if (keep.test(c)) {
      // 汉字 1 个单位；拉丁字母 0.3 个（一个英文单词大约念一个半汉字）
      out.push({ u: c.charCodeAt(0) > 255 ? 1 : 0.3, after: 0 });
    } else if ((c === '%' || c === '％') && out.length) {
      out[out.length - 1].after += 3; // 百分之
    }
  }
  return out;
}

let t = 0;
const scenes = script.scenes.map((sc) => {
  if (!sc.id) throw new Error('每个场景都要有 id');
  const start = t;
  t += LEAD;
  const sentences = sc.sentences.map((raw, si) => {
    const clauses = clausesOf(raw);
    const times = [];
    const cl = clauses.map((text, ci) => {
      if (ci > 0) t += GAP_CLAUSE;
      const c0 = t;
      for (const x of units(text)) {
        times.push(+t.toFixed(3));
        t += (x.u + x.after) / CPS;
      }
      return { text, start: +c0.toFixed(3), end: +t.toFixed(3) };
    });
    const spoken = clauses.join('');
    const s = { n: si + 1, spoken, start: cl[0].start, end: cl[cl.length - 1].end, norm: norm(spoken), times, clauses: cl };
    t += GAP_SENT;
    return s;
  });
  t += TAIL - GAP_SENT;
  return { id: sc.id, ground: sc.ground ?? 'sky', start: +start.toFixed(3), next: +t.toFixed(3), sentences };
});

const out = { source: 'estimate', cps: CPS, duration: +t.toFixed(3), scenes };
fs.writeFileSync(path.join(root, 'data/timing.json'), JSON.stringify(out, null, 1));
console.log(`时间表：${scenes.length} 个场景，${scenes.reduce((a, s) => a + s.sentences.length, 0)} 句，共 ${t.toFixed(1)} 秒（按每秒 ${CPS} 字估算）`);
