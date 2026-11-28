// KUDOG's module recap: when every step of a module is done, he congratulates the trainee with each task's score and
// the module score. Below the pass mark, or below where they started, he is supportive and gives a training plan.
import { h, api } from './ui.js';
import { kudogSays } from './kudog.js';

const SB_TITLE = { 'platform-1': 'Sandbox: run a meeting', 'platform-2': 'Sandbox: second meeting', 'hi-1': 'Sandbox: hybrid event', 'rtmp-1': 'Sandbox: stream to YouTube', 'hls-1': 'Sandbox: web page broadcast', 'widget-1': 'Sandbox: embed the widget', 'ringcentral-1': 'Sandbox: RingCentral Events', 'zoom-1': 'Sandbox: KUDO in Zoom', 'teams-1': 'Sandbox: KUDO in Teams', 'meet-1': 'Sandbox: KUDO in Google Meet', 'webex-1': 'Sandbox: KUDO in Webex' };
const href = (k) => `${document.body.dataset.me === '1' ? 'me-' : ''}${k}`;

function scoreTable(r) {
  const chip = (s) => h('span', { class: `chip ${s >= r.pass ? 'green' : 'amber'}` }, `${s}%`);
  return h('table', { class: 'tbl recap-tbl' },
    h('thead', null, h('tr', null, h('th', null, 'Task'), h('th', { class: 'num' }, 'Score'))),
    h('tbody', null, r.tasks.map((t) => h('tr', null,
      h('td', null, t.kind === 'sandbox' ? SB_TITLE[t.sandbox] || 'Sandbox exercise' : t.label, t.note ? h('span', { class: 'muted small' }, ` (${t.note})`) : null),
      h('td', { class: 'num' }, t.score != null ? chip(t.score) : h('span', { class: 'muted small' }, t.done ? 'Done' : 'Not done'))))),
    r.overall != null ? h('tfoot', null, h('tr', null, h('th', null, 'Module score', h('span', { class: 'muted small' }, ' (average of the scored tasks)')), h('th', { class: 'num' }, chip(r.overall)))) : null);
}

/** How to train on this module: specific to the tasks that were under the mark. */
function trainingPlan(r) {
  const w = new Set(r.weak); const tips = [];
  if (w.has('check')) tips.push(`Retake the module check as practice. It draws new questions${r.poolSize ? ` from a pool of ${r.poolSize}` : ''}; your recorded score stays, and you will see what has stuck.`);
  if (w.has('scenario')) tips.push('Replay the Decide walkthrough and look for the path an expert would take.');
  if (w.has('explain')) tips.push(`Record your explanation again${r.missed.length ? `, and this time add: ${r.missed.join('; ')}` : ''}.`);
  if (w.has('practice')) tips.push('Do the practice task again, step by step, with the lesson open beside it.');
  if (w.has('sandbox')) tips.push('Run the sandbox exercise again. Take your time on the client call, and use a hint only when you are stuck.');
  tips.push('Go back over the lesson in One page mode, at your own pace: the expert steps and the traps are where most points are lost.');
  tips.push(r.review ? `Your spaced review in week ${r.review.week} is your next scored chance on this module. You will be ready.` : 'Your next scored chance is the retest at the end of the programme. Practice now pays off then.');
  tips.push('Stuck on something? Ask me any time, or write to your KUDO Trainer from my panel.');
  return h('div', { class: 'recap-plan' }, h('h3', null, 'How to get better next time'), h('ol', null, tips.map((t) => h('li', null, t))));
}

export function showRecap(r, { onClose, markSeen = true } = {}) {
  const vsStart = r.initial != null && r.overall != null ? (r.overall >= r.initial ? ` and up from ${r.initial}% when you started on ${r.scenario}` : '') : '';
  let say, mood, actions;
  if (r.verdict === 'great') {
    mood = 'excited';
    say = [`Woof woof! You completed ${r.title}.`, `Your module score is ${r.overall}%, above the ${r.pass}% mark${vsStart}. That is a proper KUDO expert move. Proud of you!`];
    actions = (close) => [h('a', { class: 'btn', href: `#${href(`module-${r.key}`)}`, on: { click: close } }, 'See the module'),
      r.next ? h('a', { class: 'btn primary', href: `#${href(r.next.module ? `module-${r.next.module}` : 'training')}`, on: { click: close } }, 'Keep going') : h('button', { type: 'button', class: 'btn primary', on: { click: close } }, 'Keep going')];
  } else if (r.verdict === 'support') {
    mood = 'concerned';
    const parts = [];
    if (r.overall < r.pass) parts.push(`under the ${r.pass}% mark`);
    if (r.initial != null && r.overall < r.initial) parts.push(`a little under the ${r.initial}% you started with on ${r.scenario}`);
    say = [`You completed ${r.title}, and that deserves a tail wag.`, `Your module score is ${r.overall}%, ${parts.join(', and ')}. That happens to everyone: now we know exactly where to train, and I will be right here with you.`];
    actions = (close) => [h('button', { type: 'button', class: 'btn', on: { click: close } }, 'Later'), h('a', { class: 'btn primary', href: `#${href(`module-${r.key}`)}`, on: { click: close } }, 'Train on it now')];
  } else {
    mood = 'happy';
    say = [`You completed every step of ${r.title}. Nicely done!`];
    actions = (close) => [h('button', { type: 'button', class: 'btn primary', on: { click: close } }, 'Keep going')];
  }
  const body = h('div', null, scoreTable(r), r.verdict === 'support' ? trainingPlan(r) : r.next ? h('p', { class: 'muted', style: 'margin:10px 0 0' }, `Next up: ${r.next.title}`) : null);
  if (markSeen) api('POST', `/api/me/recaps/${encodeURIComponent(r.key)}/seen`).catch(() => {});
  return kudogSays({ title: `Module complete: ${r.title}`, say, mood, body, actions, wide: true, onClose });
}

/** After each trainee page: show the next completed module whose recap has not been seen. Resolves true if one opened. */
let checking = false;
export async function revealRecap(onClose) {
  // Never over the guided tour: it shows when the tour ends.
  if (checking || document.querySelector('.kd-modal, .reveal, .tour-layer')) return false;
  checking = true;
  try {
    const { recap } = await api('GET', '/api/me/recaps/pending');
    if (!recap) return false;
    showRecap(recap, { onClose });
    return true;
  } catch { return false; } finally { checking = false; }
}

/** The "module complete" line on a module page, with a button to open the recap again. */
export function recapBanner(key) {
  const box = h('div');
  api('GET', `/api/me/modules/${encodeURIComponent(key)}/recap`).then(({ recap: r }) => {
    if (!r?.complete) return;
    box.replaceChildren(h('div', { class: `recap-banner ${r.verdict}` },
      h('span', { class: 'kd-face', 'aria-hidden': 'true', style: 'background-image:url(/kudog-face.webp)' }),
      h('div', null, h('b', null, 'Module complete'), r.overall != null ? h('span', null, ` Module score ${r.overall}%${r.verdict === 'support' ? '. KUDOG has a plan to train on it.' : '.'}`) : null),
      h('button', { type: 'button', class: 'btn sm', on: { click: () => showRecap(r, { markSeen: false }) } }, 'See my recap')));
  }).catch(() => {});
  return box;
}
