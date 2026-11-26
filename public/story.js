// Step 1 · Learn as a story on slides. One idea per slide, Back / Next, arrow keys, a progress bar, and the slide
// you were on is remembered per module (light convenience; the one-page view is always one click away).
// Decisions are practice: the choice shows its consequence and is not scored or sent anywhere.
import { h } from './ui.js';

const KEY = (k) => `academy.story.${k}`;
const recall = (k) => { try { return Number(localStorage.getItem(KEY(k))) || 0; } catch { return 0; } };
const remember = (k, i) => { try { localStorage.setItem(KEY(k), String(i)); } catch { /* not kept */ } };

function mockView(mk) {
  return h('div', { class: 'st-mock', role: 'img', 'aria-label': `KUDO screen: ${mk.crumb}` },
    h('div', { class: 'st-mock-bar' }, h('i'), h('i'), h('i'), h('span', null, mk.crumb)),
    h('div', { class: 'st-mock-body' }, mk.items.map((it) => {
      const cls = `st-m ${it.t}${it.hi ? ' hi' : ''}`;
      if (it.t === 'button') return h('div', { class: cls }, h('span', { class: 'st-btn' }, it.label));
      if (it.t === 'field') return h('div', { class: cls }, h('small', null, it.label), h('div', { class: 'st-in' }, it.value));
      if (it.t === 'check') return h('div', { class: cls }, h('span', { class: 'st-box' }, '✓'), it.label);
      if (it.t === 'path') return h('div', { class: cls }, it.label);
      if (it.t === 'note') return h('div', { class: cls }, it.label);
      return h('div', { class: cls }, h('b', null, it.label), it.value ? h('span', null, it.value) : null);
    })));
}

function slideView(s, { onNext, toPractice }) {
  if (s.kind === 'scene') return h('div', { class: 'st-slide scene' },
    h('div', { class: 'st-tag' }, s.tag), h('blockquote', { class: 'st-quote' }, `“${s.quote}”`), h('div', { class: 'st-who' }, s.who), h('p', { class: 'st-say' }, s.say));
  if (s.kind === 'stakes') return h('div', { class: 'st-slide' }, h('h3', { class: 'st-title' }, s.title),
    h('div', { class: 'st-tiles' }, s.points.map(([a, b], i) => h('div', { class: 'st-tile' }, h('span', { class: 'st-n' }, i + 1), h('b', null, a), h('span', null, b)))), h('p', { class: 'st-say' }, s.say));
  if (s.kind === 'show') return h('div', { class: 'st-slide show' },
    h('div', { class: 'st-text' }, h('div', { class: 'st-tag' }, `Step ${s.step}`), h('h3', { class: 'st-title' }, s.title), h('p', { class: 'st-say' }, s.say)), mockView(s.mock));
  if (s.kind === 'decide') {
    const out = h('div', { class: 'st-then', 'aria-live': 'polite' });
    const opts = h('div', { class: 'st-opts' }, s.options.map((o) => h('button', { class: 'st-opt', type: 'button', on: { click: (e) => {
      opts.querySelectorAll('.st-opt').forEach((b, i) => { b.classList.toggle('ok', !!s.options[i].ok); b.disabled = true; });
      e.currentTarget.classList.add(o.ok ? 'picked-ok' : 'picked-no');
      const best = s.options.find((x) => x.ok);
      out.replaceChildren(h('div', { class: `st-cons ${o.ok ? 'ok' : 'no'}` }, h('b', null, o.ok ? 'That is what the expert does. ' : 'What happens: '), o.then),
        o.ok ? null : h('div', { class: 'st-cons ok' }, h('b', null, 'The expert: '), `${best.t}. ${best.then}`),
        h('button', { class: 'btn primary sm', type: 'button', style: 'margin-top:10px', on: { click: onNext } }, 'Continue'));
    } } }, o.t)));
    return h('div', { class: 'st-slide decide' }, h('div', { class: 'st-tag' }, s.tag), h('blockquote', { class: 'st-quote sm' }, `“${s.quote}”`), h('h3', { class: 'st-title' }, s.question), opts, out);
  }
  if (s.kind === 'traps') return h('div', { class: 'st-slide' }, h('h3', { class: 'st-title' }, s.title), h('ul', { class: 'st-traps' }, s.points.map((p) => h('li', null, p))));
  if (s.kind === 'recap') return h('div', { class: 'st-slide' }, h('h3', { class: 'st-title' }, s.title), h('ol', { class: 'st-recap' }, s.points.map((p) => h('li', null, p))),
    h('div', { class: 'st-next' }, h('span', null, s.next), toPractice ? h('button', { class: 'btn primary', type: 'button', on: { click: toPractice } }, 'Go to Step 2 →') : null));
  return h('div', { class: 'st-slide' });
}

/** The story player. story = { title, slides }. toPractice scrolls to Step 2. */
export function storyPlayer(moduleKey, story, { toPractice } = {}) {
  const N = story.slides.length;
  let i = Math.min(recall(moduleKey), N - 1);
  const stage = h('div', { class: 'st-stage' });
  const bar = h('div', { class: 'st-progress', role: 'progressbar', 'aria-valuemin': 1, 'aria-valuemax': N });
  const count = h('span', { class: 'st-count' });
  const back = h('button', { class: 'btn', type: 'button', on: { click: () => go(i - 1) } }, '← Back');
  const next = h('button', { class: 'btn primary', type: 'button', on: { click: () => go(i + 1) } }, 'Next →');
  const root = h('div', { class: 'story', tabindex: 0, 'aria-roledescription': 'slides', on: { keydown: (e) => {
    if (e.target.closest('button, textarea, input')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
  } } }, bar, stage, h('div', { class: 'st-nav' }, back, count, next));
  function go(n) {
    i = Math.max(0, Math.min(N - 1, n)); remember(moduleKey, i);
    stage.replaceChildren(slideView(story.slides[i], { onNext: () => go(i + 1), toPractice }));
    bar.replaceChildren(...story.slides.map((_, k) => h('i', { class: k < i ? 'done' : k === i ? 'on' : '' })));
    bar.setAttribute('aria-valuenow', i + 1);
    count.textContent = `${i + 1} / ${N}`;
    back.disabled = i === 0; next.hidden = i === N - 1;
  }
  go(i);
  return root;
}
