import { svg } from './ui.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const COLORS = { self: '#48A1D8', live: '#11374F', target: '#DB6539', grid: '#EEF1F2', ink: '#5E6A72' };

/** Horizontal paired bars: rows = [{label, self, live}] (values 0-100 or null). */
export function pairedBars(rows, { showSelf = true, showLive = true } = {}) {
  const rowH = 38, labelW = 170, w = 640, barW = w - labelW - 54, top = 6;
  const H = top + rows.length * rowH + 18;
  let g = '';
  [0, 25, 50, 75, 100].forEach((t) => {
    const x = labelW + (t / 100) * barW;
    g += `<line x1="${x}" x2="${x}" y1="${top}" y2="${H - 18}" stroke="${COLORS.grid}"/><text x="${x}" y="${H - 4}" font-size="10" fill="${COLORS.ink}" text-anchor="middle">${t}</text>`;
  });
  rows.forEach((r, i) => {
    const y = top + i * rowH;
    g += `<text x="${labelW - 12}" y="${y + rowH / 2 + 4}" font-size="12.5" font-weight="600" fill="#231F20" text-anchor="end">${esc(r.label)}</text>`;
    const bars = [];
    if (showSelf) bars.push(['self', r.self, COLORS.self]);
    if (showLive) bars.push(['live', r.live, COLORS.live]);
    const bh = bars.length === 2 ? 11 : 16;
    bars.forEach(([, v], j) => {
      const by = y + (rowH - bars.length * bh - (bars.length - 1) * 3) / 2 + j * (bh + 3);
      const col = bars[j][2];
      if (v == null) g += `<text x="${labelW + 4}" y="${by + bh - 2}" font-size="10.5" fill="#9CAAB3">no data</text>`;
      else g += `<rect x="${labelW}" y="${by}" width="${Math.max(2, (v / 100) * barW)}" height="${bh}" rx="4" fill="${col}"/><text x="${labelW + (v / 100) * barW + 6}" y="${by + bh - 2}" font-size="10.5" font-weight="700" fill="#231F20">${Math.round(v)}%</text>`;
    });
  });
  return svg(`<svg class="chart" viewBox="0 0 ${w} ${H}" width="100%" role="img" aria-label="Scores by scenario">${g}</svg>`);
}

/** Line chart over rounds. series = [{name,color,points:[{x:label,y:number|null}]}], optional targets [{y,label}] */
export function lineChart(labels, series, { targetY = null } = {}) {
  const w = 640, h = 260, l = 40, r = 20, t = 14, b = 48;
  const iw = w - l - r, ih = h - t - b;
  const x = (i) => l + (labels.length === 1 ? iw / 2 : (i / (labels.length - 1)) * iw);
  const y = (v) => t + ih - (v / 100) * ih;
  let g = '';
  [0, 25, 50, 75, 100].forEach((v) => { g += `<line x1="${l}" x2="${w - r}" y1="${y(v)}" y2="${y(v)}" stroke="${COLORS.grid}"/><text x="${l - 8}" y="${y(v) + 4}" font-size="10" fill="${COLORS.ink}" text-anchor="end">${v}</text>`; });
  labels.forEach((lb, i) => { g += `<text x="${x(i)}" y="${h - 22}" font-size="11" font-weight="600" fill="#231F20" text-anchor="middle">${esc(lb.length > 16 ? lb.slice(0, 15) + '…' : lb)}</text>`; });
  if (targetY != null) g += `<line x1="${l}" x2="${w - r}" y1="${y(targetY)}" y2="${y(targetY)}" stroke="${COLORS.target}" stroke-dasharray="5 4"/><text x="${w - r}" y="${y(targetY) - 5}" font-size="10.5" font-weight="700" fill="${COLORS.target}" text-anchor="end">Target ${targetY}%</text>`;
  series.forEach((s) => {
    const pts = s.points.map((p, i) => (p.y == null ? null : [x(i), y(p.y), p.y]));
    const path = pts.filter(Boolean).map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
    if (pts.filter(Boolean).length > 1) g += `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
    pts.filter(Boolean).forEach((p) => { g += `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="#fff" stroke="${s.color}" stroke-width="3"/><text x="${p[0]}" y="${p[1] - 11}" font-size="11" font-weight="700" fill="${s.color}" text-anchor="middle">${Math.round(p[2])}%</text>`; });
  });
  return svg(`<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="Progress over time">${g}</svg>`);
}
