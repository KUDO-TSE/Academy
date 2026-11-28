import { h, api, svg } from './ui.js';

// My Activities (trainee) and the Activity tab of a person (admin): the same log, read from the same endpoint.
const TYPES = [['all', 'All'], ['course', 'Courses'], ['test', 'Tests'], ['sandbox', 'Sandbox'], ['card', 'Cards'], ['visit', 'Connections']];
const GROUP = { step: 'course', recording: 'course', challenge: 'test', test: 'test', sandbox: 'sandbox', card: 'card', visit: 'visit' };
const LABEL = { step: 'Course step', recording: 'Recording', challenge: 'Challenge', test: 'Test', sandbox: 'Sandbox', card: 'Card', visit: 'Connection' };
const dayKey = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const time = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const dur = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
const ago = (d) => { const m = Math.round((Date.now() - new Date(d)) / 60e3); return m < 2 ? 'Now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`; };
const fact = (k, v, sub) => h('div', { class: 'jm-fact' }, h('span', { class: 'jm-fk' }, k), h('b', null, v), sub ? h('span', { class: 'jm-fs' }, sub) : null);

function weekBars(weeks) {
  const W = 640, H = 150, P = { l: 34, r: 8, t: 14, b: 26 }, max = Math.max(30, ...weeks.map((w) => w.minutes));
  const top = max > 120 ? Math.ceil(max / 120) * 120 : Math.ceil(max / 30) * 30, bw = (W - P.l - P.r) / weeks.length;
  const y = (v) => P.t + (1 - v / top) * (H - P.t - P.b);
  const grid = [0, top / 2, top].map((v) => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" class="ac-grid"/><text x="${P.l - 6}" y="${y(v) + 4}" text-anchor="end" class="ac-ax">${v >= 60 ? `${Math.round(v / 60)}h` : `${v}m`}</text>`).join('');
  const bars = weeks.map((w, i) => { const x = P.l + i * bw + bw * 0.18, bh = (H - P.t - P.b) - (y(w.minutes) - P.t), lab = new Date(w.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `<rect x="${x}" y="${y(w.minutes)}" width="${bw * 0.64}" height="${Math.max(0, bh)}" rx="4" class="ac-bar ${i === weeks.length - 1 ? 'now' : ''}"><title>Week of ${lab}: ${dur(w.minutes)}, ${w.visits} connection${w.visits === 1 ? '' : 's'}</title></rect>${i % 2 === 1 || i === weeks.length - 1 ? `<text x="${x + bw * 0.32}" y="${H - 8}" text-anchor="middle" class="ac-ax">${i === weeks.length - 1 ? 'This week' : lab}</text>` : ''}`; }).join('');
  return svg(`<svg class="ac-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Time in the Academy over the last twelve weeks">${grid}${bars}</svg>`);
}

/** The log itself, for the trainee page or the admin tab. */
export function activityPanel(load, { admin = false } = {}) {
  const box = h('div', { class: 'stack' }, h('div', { class: 'card muted' }, 'Loading the activity…'));
  load().then((d) => {
    const t = d.totals;
    const head = h('div', { class: 'jm-head' },
      fact('Last connection', t.last ? ago(t.last) : 'Never', t.last ? `${new Date(t.last).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${time(t.last)}` : 'No connection recorded yet'),
      fact('Time logged in', dur(t.minutes), `This week: ${dur(t.thisWeek)}`),
      fact('Days active', String(t.days), `${t.visits} connection${t.visits === 1 ? '' : 's'}`),
      fact('Activities', String(t.activities), t.first ? `Since ${new Date(t.first).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Courses, tests, recordings, cards'));
    const chart = h('section', { class: 'card' }, h('h2', null, 'Time in the Academy, week by week'), h('p', { class: 'sub keep' }, 'Time connected over the last twelve weeks. A connection ends after 30 minutes without activity.'), weekBars(d.weeks));
    let filter = 'all', shown = 60;
    const list = h('div');
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Show' }, TYPES.map(([k, l]) => h('button', { type: 'button', 'aria-pressed': String(k === filter), on: { click: (e) => { filter = k; shown = 60; seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); draw(); } } }, l)));
    const draw = () => {
      const evs = d.events.filter((e) => filter === 'all' || GROUP[e.type] === filter);
      if (!evs.length) { list.replaceChildren(h('div', { class: 'empty-note' }, h('b', null, 'Nothing here yet.'), admin ? ' This person has no activity of this kind.' : ' Your activity shows here as soon as you start a course.')); return; }
      const days = new Map();
      for (const e of evs.slice(0, shown)) { const k = dayKey(e.at); if (!days.has(k)) days.set(k, []); days.get(k).push(e); }
      list.replaceChildren(...[...days].map(([day, es]) => h('section', { class: 'ac-day' }, h('h3', null, day),
        h('ul', { class: 'ac-list' }, es.map((e) => h('li', { class: `ac-row t-${e.type}` },
          h('span', { class: 'ac-time' }, time(e.at)),
          h('span', { class: 'ac-dot', 'aria-hidden': 'true' }),
          h('div', { class: 'ac-what' }, h('span', { class: 'ac-type' }, LABEL[e.type]), e.module && !admin ? h('a', { href: `#${document.body.dataset.me === '1' ? 'me-' : ''}module-${e.module}` }, e.title) : h('b', null, e.title), h('span', { class: 'ac-detail' }, e.detail)),
          e.score != null ? h('span', { class: `chip ${e.score >= 80 ? 'green' : e.score >= 60 ? 'amber' : 'coral'}` }, `${e.score}%`) : null))))),
      evs.length > shown ? h('button', { type: 'button', class: 'btn', style: 'margin-top:12px', on: { click: () => { shown += 100; draw(); } } }, `Show more (${evs.length - shown} left)`) : null);
    };
    draw();
    const log = h('section', { class: 'card' }, h('div', { class: 'row spread ac-head' }, h('div', null, h('h2', null, 'Activity log'), h('p', { class: 'sub keep', style: 'margin:2px 0 0' }, 'Newest first, day by day, with the time and the score where there is one.')), seg), list);
    box.replaceChildren(head, chart, log);
  }).catch((e) => box.replaceChildren(h('div', { class: 'card empty' }, h('b', null, 'The activity could not load'), e.message)));
  return box;
}

/** The trainee page. */
export function activityView() {
  return h('div', { class: 'page' },
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'My Activities'), h('p', null, 'Everything done on your account: when you connected and for how long, and every course step, test, recording, sandbox exercise and card. Your KUDO Trainer sees the same log.'))),
    activityPanel(() => api('GET', '/api/me/activity')));
}
