/* ---------- 版面自检：文字重叠、压在框边、出画面（渲染时传 audit:true 才运行，结果用 console.log 输出，scripts/stills.mjs 收集） ---------- */
type R = { x0: number; y0: number; x1: number; y1: number };
export function auditSvg(svg: SVGSVGElement, id: string, frame: number) {
  const sr = svg.getBoundingClientRect();
  const k = sr.width / 1920;
  const rect = (el: Element): R => {
    const r = el.getBoundingClientRect();
    return { x0: (r.left - sr.left) / k, y0: (r.top - sr.top) / k, x1: (r.right - sr.left) / k, y1: (r.bottom - sr.top) / k };
  };
  const op = (el: Element) => {
    let o = 1;
    for (let e: Element | null = el; e && e !== svg; e = e.parentElement) o *= parseFloat(e.getAttribute('opacity') ?? '1');
    return o;
  };
  const area = (r: R) => Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);
  const inter = (a: R, b: R): R => ({ x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) });
  const texts = [...svg.querySelectorAll('text')].filter((e) => op(e) > 0.9 && (e.textContent ?? '').trim()).map((e) => ({ s: e.textContent!.trim(), r: rect(e) }));
  const shapes = [...svg.querySelectorAll('path')]
    .filter((e) => !e.closest('clipPath') && (e.getAttribute('fill') ?? 'none') !== 'none' && e.getAttribute('stroke') === 'none' && op(e) > 0.5)
    .map((e) => rect(e))
    .filter((r) => area(r) < 1920 * 1080 * 0.7 && area(r) > 400);
  const issues: string[] = [];
  const fmt = (r: R) => `(${Math.round(r.x0)},${Math.round(r.y0)})-(${Math.round(r.x1)},${Math.round(r.y1)})`;
  texts.forEach((a, i) => {
    if (a.r.x0 < -4 || a.r.y0 < -4 || a.r.x1 > 1924 || a.r.y1 > 1084) issues.push(`出画面：「${a.s}」${fmt(a.r)}`);
    texts.slice(i + 1).forEach((b) => {
      const o = inter(a.r, b.r), s = Math.min(area(a.r), area(b.r));
      if (s > 0 && area(o) > 0.12 * s) issues.push(`字压字：「${a.s}」×「${b.s}」${fmt(o)}`);
    });
    const cx = (a.r.x0 + a.r.x1) / 2, cy = (a.r.y0 + a.r.y1) / 2;
    shapes.forEach((sh) => {
      const o = inter(a.r, sh), ao = area(o), at = area(a.r);
      if (ao <= 0) return;
      const inside = cx > sh.x0 && cx < sh.x1 && cy > sh.y0 && cy < sh.y1;
      if (inside && ao < 0.94 * at) issues.push(`出框：「${a.s}」超出 ${fmt(sh)}`);
      else if (!inside && ao > 0.06 * at && ao < 0.94 * at) issues.push(`压框边：「${a.s}」${fmt(a.r)} 压在 ${fmt(sh)} 的边上`);
    });
  });
  console.log('HDAUDIT|' + JSON.stringify({ id, frame, issues: [...new Set(issues)] }));
}
