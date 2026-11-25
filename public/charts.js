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

// ------------------------------------------------------------------ programme visuals (v4)
const P = { primary: '#1B5C84', deep: '#11374F', soft: '#E3F0F9', teal: '#48A1D8', coral: '#DB6539', coralSoft: '#F7D7B4', green: '#2F7A45', greenSoft: '#E4EFE5', grid: '#EEF1F2', ink: '#231F20', muted: '#5E6A72', faint: '#9CAAB3' };

/**
 * The 12-week roadmap at a glance: phase bands, one square per step (done, due, coming), sessions with Jack and
 * milestones as flags, and a "you are here" marker. items = plan items with week, done, owner, kind, title.
 */
export function roadmap({ items, week, weeks = 12, phases, hrefFor = () => null }) {
  const W = 1040, L = 6, R = 6, colW = (W - L - R) / weeks, sq = 15, gap = 5, perRow = Math.max(1, Math.floor((colW - 8) / (sq + gap)));
  const mine = (w) => items.filter((i) => i.week === w && (i.owner || 'you') === 'you');
  const rows = Math.max(1, ...Array.from({ length: weeks }, (_, k) => Math.ceil(mine(k + 1).length / perRow)));
  const bandY = 0, bandH = 42, flagY = bandH + 8, flagH = 38, gridY = flagY + flagH + 6, gridH = rows * (sq + gap) + 6, axisY = gridY + gridH + 16, H = axisY + 34;
  const x0 = (w) => L + (w - 1) * colW;
  let g = '';
  // Phase bands
  for (const p of phases) {
    const x = x0(p.weeks[0]) + 1, w = (p.weeks[1] - p.weeks[0] + 1) * colW - 2;
    const state = week > p.weeks[1] ? 'past' : week >= p.weeks[0] ? 'now' : 'next';
    const fill = state === 'now' ? P.primary : state === 'past' ? P.greenSoft : P.soft, txt = state === 'now' ? '#fff' : state === 'past' ? P.green : P.deep;
    g += `<rect x="${x}" y="${bandY}" width="${w}" height="${bandH}" rx="9" fill="${fill}"/>`;
    g += `<text x="${x + 10}" y="${bandY + 17}" font-size="13" font-weight="800" fill="${txt}">${esc(p.name)}</text>`;
    g += `<text x="${x + 10}" y="${bandY + 32}" font-size="10.5" fill="${txt}" opacity=".85">${p.weeks[0] === p.weeks[1] ? `Week ${p.weeks[0]}` : `Weeks ${p.weeks[0]}–${p.weeks[1]}`}${state === 'past' ? ' · done' : ''}</text>`;
  }
  // Week columns: light stripe for the current week
  g += `<rect x="${x0(week)}" y="${flagY - 4}" width="${colW}" height="${axisY - flagY + 10}" rx="8" fill="${P.soft}" opacity=".7"/>`;
  // Flags: sessions with Jack and milestones
  const perWeek = {};
  for (const it of items.filter((i) => i.owner === 'jack')) {
    const k = perWeek[it.week] = (perWeek[it.week] || 0) + 1; if (k > 2) continue;
    const fy = flagY + (k - 1) * 19, fx = x0(it.week) + 5, fw = colW - 10;
    const col = it.done ? P.green : it.kind === 'milestone' ? P.coral : P.primary;
    const label = it.kind === 'milestone' ? 'Retest' : /mock/i.test(it.title) ? 'Mock call' : /mid/i.test(it.key) ? 'Mid-point' : /kick/i.test(it.key) ? 'Kick-off' : 'With Jack';
    g += `<g><title>${esc(it.title)}${it.done ? ' (done)' : ''}</title><path d="M${fx},${fy} h${fw} l-6,8 l6,8 h-${fw} z" fill="${col}"/><text x="${fx + 6}" y="${fy + 12}" font-size="11" font-weight="700" fill="#fff">${it.done ? '✓ ' : ''}${esc(label)}</text></g>`;
  }
  // Steps
  for (let w = 1; w <= weeks; w++) {
    mine(w).forEach((it, k) => {
      const cx = x0(w) + (colW - (perRow * (sq + gap) - gap)) / 2 + (k % perRow) * (sq + gap), cy = gridY + gridH - 6 - (Math.floor(k / perRow) + 1) * (sq + gap) + gap;
      const due = !it.done && w < week, now = !it.done && w === week;
      const fill = it.done ? P.deep : due ? P.coral : now ? '#fff' : '#fff', stroke = it.done ? P.deep : due ? P.coral : now ? P.primary : P.faint;
      const href = hrefFor(it);
      const shape = `<rect x="${cx}" y="${cy}" width="${sq}" height="${sq}" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="${now ? 2 : 1.4}"><title>Week ${w}: ${esc(it.title)} · ${it.done ? 'done' : due ? 'overdue' : now ? 'this week' : 'coming up'}</title></rect>`;
      g += href ? `<a href="${esc(href)}">${shape}</a>` : shape;
    });
  }
  // Axis
  for (let w = 1; w <= weeks; w++) g += `<text x="${x0(w) + colW / 2}" y="${axisY}" font-size="10.5" font-weight="${w === week ? 800 : 600}" fill="${w === week ? P.primary : P.muted}" text-anchor="middle">W${w}</text>`;
  // You are here
  const yx = x0(week) + colW / 2;
  g += `<line x1="${yx}" x2="${yx}" y1="${flagY - 4}" y2="${axisY - 12}" stroke="${P.coral}" stroke-width="2" stroke-dasharray="3 3"/>`;
  g += `<rect x="${yx - 38}" y="${axisY + 6}" width="76" height="20" rx="10" fill="${P.coral}"/><text x="${yx}" y="${axisY + 20}" font-size="11" font-weight="800" fill="#fff" text-anchor="middle">You: week ${week}</text>`;
  return svg(`<svg class="chart roadmap" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Your 12-week roadmap, week ${week} of ${weeks}">${g}</svg>`);
}

/** Readiness over the 12 weeks: where you started, the path so far, and the projected path to where you will be. */
export function trajectoryChart({ trajectory, start, now, end, target, week, weeks = 12 }) {
  const W = 520, H = 280, l = 40, r = 74, t = 24, b = 30, iw = W - l - r, ih = H - t - b;
  const lo = Math.max(0, Math.floor(Math.min(start, now, ...trajectory.map((p) => p.v)) / 10) * 10 - 10), hi = 100;
  const x = (w) => l + (w / weeks) * iw, y = (v) => t + ih - ((v - lo) / (hi - lo)) * ih;
  let g = '';
  for (let v = lo; v <= hi; v += 10) g += `<line x1="${l}" x2="${l + iw}" y1="${y(v)}" y2="${y(v)}" stroke="${P.grid}"/><text x="${l - 8}" y="${y(v) + 4}" font-size="11.5" fill="${P.muted}" text-anchor="end">${v}%</text>`;
  for (let w = 0; w <= weeks; w += 3) g += `<text x="${x(w)}" y="${H - 8}" font-size="12" fill="${P.muted}" text-anchor="middle">${w === 0 ? 'Start' : `W${w}`}</text>`;
  // Target band
  if (target != null) g += `<line x1="${l}" x2="${l + iw}" y1="${y(target)}" y2="${y(target)}" stroke="${P.coral}" stroke-dasharray="5 4" stroke-width="1.5"/><text x="${l + 6}" y="${y(target) - 7}" font-size="12.5" font-weight="700" fill="${P.coral}">Your target ${target}%</text>`;
  // Projection: from today to the end of week 12
  g += `<path d="M${x(week)},${y(now)} L${x(weeks)},${y(end)}" stroke="${P.teal}" stroke-width="3" stroke-dasharray="7 6" fill="none" stroke-linecap="round"/>`;
  g += `<circle cx="${x(weeks)}" cy="${y(end)}" r="7" fill="#fff" stroke="${P.teal}" stroke-width="3"/><text x="${x(weeks) + 12}" y="${y(end) + 5}" font-size="15" font-weight="800" fill="${P.teal}">${end}%</text>`;
  // Path so far (area + line)
  const pts = trajectory.length ? trajectory : [{ week: 0, v: start }, { week, v: now }];
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.week)},${y(p.v)}`).join(' ');
  g += `<path d="${line} L${x(pts[pts.length - 1].week)},${y(lo)} L${x(pts[0].week)},${y(lo)} Z" fill="${P.primary}" opacity=".08"/>`;
  g += `<path d="${line}" stroke="${P.primary}" stroke-width="3.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;
  g += `<circle cx="${x(0)}" cy="${y(start)}" r="5.5" fill="#fff" stroke="${P.deep}" stroke-width="3"><title>Start: ${start}%</title></circle><text x="${x(0) + 6}" y="${y(start) + 22}" font-size="13" font-weight="700" fill="${P.deep}">Start ${start}%</text>`;
  g += `<circle cx="${x(week)}" cy="${y(now)}" r="8" fill="${P.coral}" stroke="#fff" stroke-width="3"><title>Now: ${now}%</title></circle><text x="${x(week)}" y="${y(now) - 15}" font-size="14" font-weight="800" fill="${P.coral}" text-anchor="${week < 2 ? 'start' : 'middle'}">Now ${now}%</text>`;
  return svg(`<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Readiness: started at ${start}%, now ${now}%, ${end}% expected in week ${weeks}">${g}</svg>`);
}

/** Small donut: share of steps done. */
export function donut(pct, { size = 64, label = null } = {}) {
  const r = 26, c = 2 * Math.PI * r, d = (Math.max(0, Math.min(100, pct)) / 100) * c;
  return svg(`<svg viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-label="${pct}% done"><circle cx="32" cy="32" r="${r}" fill="none" stroke="${P.grid}" stroke-width="8"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="${P.primary}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${d} ${c}" transform="rotate(-90 32 32)"/><text x="32" y="36" font-size="${label ? 12 : 14}" font-weight="800" fill="${P.deep}" text-anchor="middle">${label ?? `${pct}%`}</text></svg>`);
}
