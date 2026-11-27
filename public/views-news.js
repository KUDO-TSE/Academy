// KUDO News: every KUDO release the Academy has taken in, newest first. Each one opens with an executive summary
// written for client conversations, then lists every change by type, with the Academy modules it touches.
import { h, api } from './ui.js';

const KINDS = [['feature', 'New features', 'green'], ['fix', 'Improvements and fixes', 'blue'], ['known', 'Known issues', 'amber'], ['removed', 'Retired', 'grey']];
const COUNT = { feature: ['new feature', 'new features'], fix: ['improvement', 'improvements'], known: ['known issue', 'known issues'], removed: ['retired', 'retired'] };
const day = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const short = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const anchor = (r) => `rel-${r.id}`;

export function newsView() {
  const body = h('div', { class: 'news-body' }, h('div', { class: 'card muted' }, 'Loading the news…'));
  const page = h('div', { class: 'page news-page' },
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'KUDO News'), h('p', null, 'What changed in KUDO, release by release: a short summary to use with clients, then every change in detail.'))),
    body);
  api('GET', '/api/me/news').then(({ releases }) => {
    if (!releases.length) { body.replaceChildren(h('div', { class: 'card empty' }, h('b', null, 'No release yet'), 'When a KUDO release is added to the Academy, its summary and changes appear here.')); return; }
    const index = h('nav', { class: 'news-index', 'aria-label': 'Releases' },
      h('div', { class: 'ni-h' }, 'Releases'),
      h('ol', null, releases.map((r, k) => h('li', null, h('a', { href: `#news`, class: k === 0 ? 'is-on' : '', on: { click: (e) => { e.preventDefault(); index.querySelectorAll('a').forEach((a) => a.classList.toggle('is-on', a === e.currentTarget)); document.getElementById(anchor(r))?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); } } },
        h('b', null, r.version ? `KUDO ${r.version}` : r.title), h('span', null, short(r.released_on)), k === 0 ? h('span', { class: 'chip blue' }, 'Latest') : null)))));
    const articles = releases.map((r, k) => {
      const counts = KINDS.map(([kk]) => [kk, r.items.filter((i) => i.kind === kk).length]).filter(([, n]) => n);
      return h('article', { class: `card news-rel ${k === 0 ? 'latest' : ''}`, id: anchor(r), 'aria-labelledby': `${anchor(r)}-h` },
        h('header', { class: 'nr-head' },
          h('div', null,
            h('h2', { id: `${anchor(r)}-h` }, r.version ? `KUDO ${r.version}` : r.title),
            h('p', { class: 'nr-date' }, `Released on ${day(r.released_on)}${r.version && r.title && !r.title.includes(r.version) ? `, ${r.title}` : ''}`)),
          h('div', { class: 'nr-counts' }, counts.map(([kk, n]) => h('span', { class: `chip ${KINDS.find((x) => x[0] === kk)[2]}` }, `${n} ${COUNT[kk][n > 1 ? 1 : 0]}`)))),
        h('section', { class: 'nr-sum', 'aria-label': 'Executive summary' }, String(r.summary || '').split(/\n{2,}/).filter(Boolean).map((p) => h('p', null, p))),
        h('details', { class: 'nr-all', open: k === 0 },
          h('summary', null, `Every change (${r.items.length})`),
          KINDS.map(([kk, label]) => {
            const list = r.items.filter((i) => i.kind === kk);
            if (!list.length) return null;
            return h('div', { class: `nr-kind k-${kk}` }, h('h3', null, label),
              h('ul', null, list.map((i) => h('li', null, h('b', null, i.title), h('p', null, i.body),
                i.modules.length ? h('div', { class: 'nr-mods' }, h('span', null, 'In the Academy:'), i.modules.map((m) => h('a', { class: 'chip grey', href: `#module-${m.key}` }, m.title))) : null))));
          })));
    });
    body.replaceChildren(h('div', { class: 'news-grid' }, index, h('div', { class: 'news-main' }, articles)));
  }).catch((e) => body.replaceChildren(h('div', { class: 'card empty' }, h('b', null, 'The news could not be loaded'), e.message)));
  return page;
}
