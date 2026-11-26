import { svg } from './ui.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Phones get narrower drawings with the same font sizes, so text stays readable once scaled to the screen.
export const small = () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 700px)').matches;
export const COLORS = { self: '#48A1D8', live: '#11374F', target: '#DB6539', grid: '#EEF1F2', ink: '#5E6A72' };

/** Horizontal paired bars: rows = [{label, self, live}] (values 0-100 or null). */
export function pairedBars(rows, { showSelf = true, showLive = true } = {}) {
  const sm = small(); const rowH = sm ? 36 : 38, labelW = sm ? 104 : 170, w = sm ? 360 : 640, barW = w - labelW - 44, top = 6;
  const H = top + rows.length * rowH + 18;
  let g = '';
  [0, 25, 50, 75, 100].forEach((t) => {
    const x = labelW + (t / 100) * barW;
    g += `<line x1="${x}" x2="${x}" y1="${top}" y2="${H - 18}" stroke="${COLORS.grid}"/><text x="${x}" y="${H - 4}" font-size="10" fill="${COLORS.ink}" text-anchor="middle">${t}</text>`;
  });
  rows.forEach((r, i) => {
    const y = top + i * rowH;
    g += `<text x="${labelW - 8}" y="${y + rowH / 2 + 4}" font-size="${sm ? 11.5 : 12.5}" font-weight="600" fill="#231F20" text-anchor="end">${esc(r.label)}</text>`;
    const bars = [];
    if (showSelf) bars.push(['self', r.self, COLORS.self]);
    if (showLive) bars.push(['live', r.live, COLORS.live]);
    const bh = bars.length === 2 ? 11 : 16;
    bars.forEach(([, v], j) => {
      const by = y + (rowH - bars.length * bh - (bars.length - 1) * 3) / 2 + j * (bh + 3);
      const col = bars[j][2];
      if (v == null) g += `<text x="${labelW + 4}" y="${by + bh - 2}" font-size="10.5" fill="#9CAAB3">no data</text>`;
      else g += `<rect x="${labelW}" y="${by}" width="${Math.max(2, (v / 100) * barW)}" height="${bh}" rx="4" fill="${col}"/><text x="${labelW + (v / 100) * barW + 6}" y="${by + bh - 2}" font-size="10.5" font-weight="600" fill="#231F20">${Math.round(v)}%</text>`;
    });
  });
  return svg(`<svg class="chart" viewBox="0 0 ${w} ${H}" width="100%" role="img" aria-label="Scores by scenario">${g}</svg>`);
}

/** Line chart over rounds. series = [{name,color,points:[{x:label,y:number|null}]}], optional targets [{y,label}] */
export function lineChart(labels, series, { targetY = null } = {}) {
  const sm = small(); const w = sm ? 360 : 640, h = sm ? 240 : 260, l = 36, r = 16, t = 14, b = 48;
  const iw = w - l - r, ih = h - t - b;
  const x = (i) => l + (labels.length === 1 ? iw / 2 : (i / (labels.length - 1)) * iw);
  const y = (v) => t + ih - (v / 100) * ih;
  let g = '';
  [0, 25, 50, 75, 100].forEach((v) => { g += `<line x1="${l}" x2="${w - r}" y1="${y(v)}" y2="${y(v)}" stroke="${COLORS.grid}"/><text x="${l - 8}" y="${y(v) + 4}" font-size="10" fill="${COLORS.ink}" text-anchor="end">${v}</text>`; });
  labels.forEach((lb, i) => { g += `<text x="${x(i)}" y="${h - 22}" font-size="11" font-weight="600" fill="#231F20" text-anchor="middle">${esc(lb.length > 16 ? lb.slice(0, 15) + '…' : lb)}</text>`; });
  if (targetY != null) g += `<line x1="${l}" x2="${w - r}" y1="${y(targetY)}" y2="${y(targetY)}" stroke="${COLORS.target}" stroke-dasharray="5 4"/><text x="${w - r}" y="${y(targetY) - 5}" font-size="10.5" font-weight="600" fill="${COLORS.target}" text-anchor="end">Target ${targetY}%</text>`;
  series.forEach((s) => {
    const pts = s.points.map((p, i) => (p.y == null ? null : [x(i), y(p.y), p.y]));
    const path = pts.filter(Boolean).map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
    if (pts.filter(Boolean).length > 1) g += `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
    pts.filter(Boolean).forEach((p) => { g += `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="#fff" stroke="${s.color}" stroke-width="3"/><text x="${p[0]}" y="${p[1] - 11}" font-size="11" font-weight="600" fill="${s.color}" text-anchor="middle">${Math.round(p[2])}%</text>`; });
  });
  return svg(`<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="Progress over time">${g}</svg>`);
}

// ------------------------------------------------------------------ programme visuals (v4)
const P = { primary: '#1B5C84', deep: '#11374F', soft: '#E3F0F9', teal: '#48A1D8', coral: '#DB6539', coralSoft: '#F7D7B4', green: '#2F7A45', greenSoft: '#E4EFE5', grid: '#EEF1F2', ink: '#231F20', muted: '#5E6A72', faint: '#9CAAB3' };

/** Readiness over the 12 weeks: where you started, the path so far, and the projected path to where you will be. */
export function trajectoryChart({ trajectory, start, now, end, target, week, weeks = 12 }) {
  const W = small() ? 400 : 520, H = 280, l = 40, r = 74, t = 24, b = 30, iw = W - l - r, ih = H - t - b;
  const lo = Math.max(0, Math.floor(Math.min(start, now, ...trajectory.map((p) => p.v)) / 10) * 10 - 10), hi = 100;
  const x = (w) => l + (w / weeks) * iw, y = (v) => t + ih - ((v - lo) / (hi - lo)) * ih;
  let g = '';
  for (let v = lo; v <= hi; v += 10) g += `<line x1="${l}" x2="${l + iw}" y1="${y(v)}" y2="${y(v)}" stroke="${P.grid}"/><text x="${l - 8}" y="${y(v) + 4}" font-size="11.5" fill="${P.muted}" text-anchor="end">${v}%</text>`;
  for (let w = 0; w <= weeks; w += 3) g += `<text x="${x(w)}" y="${H - 8}" font-size="12" fill="${P.muted}" text-anchor="middle">${w === 0 ? 'Start' : `W${w}`}</text>`;
  // Target band
  if (target != null) g += `<line x1="${l}" x2="${l + iw}" y1="${y(target)}" y2="${y(target)}" stroke="${P.coral}" stroke-dasharray="5 4" stroke-width="1.5"/><text x="${l + 6}" y="${y(target) - 7}" font-size="12.5" font-weight="600" fill="${P.coral}">Your target ${target}%</text>`;
  // Projection: from today to the end of week 12
  g += `<path d="M${x(week)},${y(now)} L${x(weeks)},${y(end)}" stroke="${P.teal}" stroke-width="3" stroke-dasharray="7 6" fill="none" stroke-linecap="round"/>`;
  g += `<circle cx="${x(weeks)}" cy="${y(end)}" r="7" fill="#fff" stroke="${P.teal}" stroke-width="3"/><text x="${x(weeks) + 12}" y="${y(end) + 5}" font-size="15" font-weight="600" fill="${P.teal}">${end}%</text>`;
  // Path so far (area + line)
  const pts = trajectory.length ? trajectory : [{ week: 0, v: start }, { week, v: now }];
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.week)},${y(p.v)}`).join(' ');
  g += `<path d="${line} L${x(pts[pts.length - 1].week)},${y(lo)} L${x(pts[0].week)},${y(lo)} Z" fill="${P.primary}" opacity=".08"/>`;
  g += `<path d="${line}" stroke="${P.primary}" stroke-width="3.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;
  g += `<circle cx="${x(0)}" cy="${y(start)}" r="5.5" fill="#fff" stroke="${P.deep}" stroke-width="3"><title>Start: ${start}%</title></circle><text x="${x(0) + 6}" y="${y(start) + 22}" font-size="13" font-weight="600" fill="${P.deep}">Start ${start}%</text>`;
  g += `<circle cx="${x(week)}" cy="${y(now)}" r="8" fill="${P.coral}" stroke="#fff" stroke-width="3"><title>Now: ${now}%</title></circle><text x="${x(week)}" y="${y(now) - 15}" font-size="14" font-weight="600" fill="${P.coral}" text-anchor="${week < 2 ? 'start' : 'middle'}">Now ${now}%</text>`;
  return svg(`<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Readiness: started at ${start}%, now ${now}%, ${end}% expected in week ${weeks}">${g}</svg>`);
}

/** Small donut: share of steps done. */
export function donut(pct, { size = 64, label = null } = {}) {
  const r = 26, c = 2 * Math.PI * r, d = (Math.max(0, Math.min(100, pct)) / 100) * c;
  return svg(`<svg viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-label="${pct}% done"><circle cx="32" cy="32" r="${r}" fill="none" stroke="${P.grid}" stroke-width="8"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="${P.primary}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${d} ${c}" transform="rotate(-90 32 32)"/><text x="32" y="36" font-size="${label ? 12 : 14}" font-weight="600" fill="${P.deep}" text-anchor="middle">${label ?? `${pct}%`}</text></svg>`);
}


/**
 * Progress since October, one row per scenario: a hollow dot where you started, a filled dot where your tests put you
 * now, the line between them green (up) or coral (down), your target as a tick, and the change on the right.
 */
export function progressDumbbell(rows) {
  const sm = small(); const rowH = sm ? 34 : 36, labelW = sm ? 96 : 150, w = sm ? 360 : 640, deltaW = sm ? 44 : 56, barW = w - labelW - deltaW - 12, top = 6;
  const H = top + rows.length * rowH + 18;
  const x = (v) => labelW + (Math.max(0, Math.min(100, v)) / 100) * barW;
  let g = '';
  [0, 25, 50, 75, 100].forEach((t) => { g += `<line x1="${x(t)}" x2="${x(t)}" y1="${top}" y2="${H - 18}" stroke="${COLORS.grid}"/><text x="${x(t)}" y="${H - 4}" font-size="10" fill="${COLORS.ink}" text-anchor="middle">${t}</text>`; });
  rows.forEach((r, i) => {
    const y = top + i * rowH + rowH / 2, d = r.now - r.start;
    const col = d > 0 ? P.green : d < 0 ? P.coral : P.faint;
    g += `<g><title>${esc(r.label)}: ${r.start}% in October, ${r.now}% now${r.tests ? ` after ${r.tests} test${r.tests > 1 ? 's' : ''}` : ', no test yet'}</title>`;
    g += `<text x="${labelW - 10}" y="${y + 4}" font-size="${sm ? 11.5 : 12.5}" font-weight="${r.focus ? 600 : 500}" fill="${r.focus ? P.deep : '#231F20'}" text-anchor="end">${esc(r.label)}</text>`;
    g += `<line x1="${labelW}" x2="${labelW + barW}" y1="${y}" y2="${y}" stroke="${P.grid}" stroke-width="6" stroke-linecap="round"/>`;
    if (r.target != null) g += `<line x1="${x(r.target)}" x2="${x(r.target)}" y1="${y - 9}" y2="${y + 9}" stroke="${P.coral}" stroke-width="2" opacity=".55"/>`;
    if (d !== 0) g += `<line x1="${x(r.start)}" x2="${x(r.now)}" y1="${y}" y2="${y}" stroke="${col}" stroke-width="6" stroke-linecap="round"/>`;
    g += `<circle cx="${x(r.start)}" cy="${y}" r="5.5" fill="#fff" stroke="${P.faint}" stroke-width="2"/>`;
    g += `<circle cx="${x(r.now)}" cy="${y}" r="7" fill="${d === 0 ? P.deep : col}" stroke="#fff" stroke-width="2"/>`;
    const txt = d > 0 ? `+${d}` : d < 0 ? `−${-d}` : (r.tests ? '±0' : '–');
    g += `<text x="${w - 4}" y="${y + 4}" font-size="13" font-weight="600" fill="${d > 0 ? P.green : d < 0 ? '#B44E28' : P.muted}" text-anchor="end">${txt}</text></g>`;
  });
  return svg(`<svg class="chart" viewBox="0 0 ${w} ${H}" width="100%" role="img" aria-label="Change in each scenario since October">${g}</svg>`);
}
