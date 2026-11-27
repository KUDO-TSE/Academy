import { h, api, toast, fmtDate, svg, tipI, metaRow, mark } from './ui.js';
import { weeksCard, readinessCard, levelsCard, weeksLabel } from './home.js';
import { SCENARIOS as SANDBOXES } from './sandbox.js';
import { storyPlayer } from './story.js';
import { revealNew } from './collectibles.js';
import { recapBanner, revealRecap } from './recap.js';
import { checkForm, resultView, walkthroughCard, explainCard, feedbackCard, challengeCard, spacedCard } from './assess-ui.js';

const mine = (i) => (i.owner || 'you') === 'you';

// ------------------------------------------------------------------ shared bits
export const KIND_LABEL = { scenario: 'Decision walkthrough', explain: 'Explain it', survey: 'Survey', lesson: 'Lesson', practice: 'Practice', check: 'Check', review: 'Spaced review', baseline: 'Baseline check', one_to_one: 'With your KUDO Trainer', milestone: 'Milestone', missed: 'Review', teach: 'Teach-back' };
const KIND_CHIP = { scenario: 'amber', explain: 'coral', survey: 'grey', lesson: 'blue', practice: 'amber', check: 'green', review: 'green', baseline: 'green', one_to_one: 'coral', milestone: 'coral', missed: 'blue', teach: 'amber' };
export const DEPTH_LABEL = { know: 'Know', setup: 'Set up', handover: 'Hand over' };
const check = () => svg('<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>');
const first = (n) => { const m = String(n || '').match(/\(([^)]+)\)/); return m ? `${m[1]} (test)` : String(n || '').split(' ')[0]; };

function itemHref(it) {
  if (it.kind === 'baseline') return '#module-baseline';
  if (it.kind === 'missed') return '#missed';
  if (it.kind === 'survey') return '#survey';
  if (it.module) return `#module-${it.module}${it.kind === 'review' ? `~${it.key}` : ''}`;
  return null;
}
/** Remember which step of a module to open on: the module page scrolls to it once drawn. */
export const focusStep = (kind) => { try { if (['lesson', 'practice', 'scenario', 'explain', 'check'].includes(kind)) sessionStorage.setItem('academy.focusStep', kind); } catch { /* not kept */ } };
const ACTION = new Proxy({}, { get: () => 'Take the course' }); // every step opens its course: one wording everywhere

function itemRow(it, { readOnly, compact } = {}) {
  const href = itemHref(it);
  const status = it.done ? h('span', { class: 'tick done', 'aria-label': 'Done' }, check()) : h('span', { class: 'tick', 'aria-label': 'Not done yet' });
  return h('div', { class: `pi ${it.done ? 'done' : ''}` }, status,
    h('div', { class: 'pi-main' },
      h('div', { class: 'pi-t' }, href && !readOnly ? h('a', { href, on: { click: () => focusStep(it.kind) } }, it.title) : it.title),
      h('div', { class: 'pi-meta' }, h('span', { class: `chip ${KIND_CHIP[it.kind] || 'grey'}` }, KIND_LABEL[it.kind] || it.kind), h('span', { class: 'muted small' }, `${it.minutes} min`),
        it.owner === 'jack' ? h('span', { class: 'muted small' }, 'Your KUDO Trainer books this') : null, it.mandatory ? h('span', { class: 'muted small' }, 'Core') : null, !compact && it.why ? tipI(it.why) : null,
        it.recorded != null ? h('span', { class: `chip ${it.below ? 'amber' : 'green'}` }, `Recorded ${it.recorded}%`) : null, it.signoff && it.done && it.signed_off ? h('span', { class: 'chip green' }, 'Signed off') : null, it.how ? h('span', { class: 'muted small' }, it.how) : null),
      null),
    href && !readOnly && !it.done && !compact ? h('a', { class: 'btn sm', href, on: { click: () => focusStep(it.kind) } }, ACTION[it.kind] || 'Open') : null);
}



// The module's explainer video: played in the page when the link is an embed link (SharePoint or Stream embed,
// YouTube no-cookie), otherwise opened in a new tab. Admins paste the link from the Curriculum page.
function videoBlock(m, admin) {
  const url = m.video;
  const embeddable = (u) => { try { const x = new URL(u); return (/\.sharepoint\.com$/.test(x.hostname) && /\/_layouts\/15\/embed\.aspx/i.test(x.pathname)) || (x.hostname === 'www.youtube-nocookie.com' && x.pathname.startsWith('/embed/')) || (x.hostname === 'player.vimeo.com' && x.pathname.startsWith('/video/')); } catch { return false; } };
  const view = url ? (embeddable(url) ? h('div', { class: 'video' }, h('iframe', { src: url, title: `Explainer video: ${m.title}`, allow: 'fullscreen; picture-in-picture', loading: 'lazy' }))
    : h('a', { class: 'btn', href: url, target: '_blank', rel: 'noopener' }, '▶ Watch the explainer video')) : null;
  if (!admin) return view;
  const input = h('input', { type: 'url', value: url || '', placeholder: 'Paste the video link (Vimeo, or a SharePoint embed link, plays in the page)', style: 'flex:1;min-width:240px' });
  return h('div', { class: 'stack', style: 'margin-bottom:10px' }, view, h('div', { class: 'row', style: 'gap:6px' }, input,
    h('button', { class: 'btn sm', on: { click: async () => { try { await api('PUT', `/api/admin/curriculum/${m.key}/video`, { url: input.value }); toast(input.value ? 'Video link saved' : 'Video link removed'); } catch (e) { toast(e.message, true); } } } }, 'Save video link')),
    h('div', { class: 'muted small' }, 'In SharePoint: open the video, Share, Embed, and copy the link inside src="…". Trainees need access to the file.'));
}

// Warm-up before a recorded check: the formats on neutral content, marked in the browser, never stored.
function warmUp() {
  const items = [
    { t: 'mcq', q: 'How long is the Academy programme?', o: ['6 weeks', '12 weeks', '6 months', 'One year'], a: 1, why: 'Twelve weeks in four sections of three weeks' },
    { t: 'multi', q: 'Which of these are sections of your 12 weeks?', pick: 2, o: ['Start with the essentials', 'Expand and get certified', 'Holiday', 'Onboarding'], a: [0, 1], why: 'Start with the essentials, Master your priority scenarios, Cover every scenario, Expand and get certified' },
    { t: 'order', q: 'Put the four sections in order', steps: ['Start with the essentials', 'Master your priority scenarios', 'Cover every scenario', 'Expand and get certified'], why: 'From the basics to the retest, three weeks each' },
  ];
  const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
  const box = h('div');
  const draw = () => {
    const state = items.map((x) => ({ v: x.t === 'multi' ? [] : x.t === 'order' ? shuffle(x.steps) : null }));
    const list = items.map((x, i) => {
      const st = state[i]; let body;
      if (x.t === 'mcq') body = x.o.map((o, oi) => h('label', { class: 'opt' }, h('input', { type: 'radio', name: `wu${i}`, on: { change: () => { st.v = oi; } } }), h('span', null, o)));
      else if (x.t === 'multi') body = x.o.map((o, oi) => h('label', { class: 'opt' }, h('input', { type: 'checkbox', on: { change: (e) => { st.v = e.target.checked ? [...st.v, oi] : st.v.filter((z) => z !== oi); } } }), h('span', null, o)));
      else { const ol = h('ol', { class: 'order' }); const re = () => ol.replaceChildren(...st.v.map((stp, si) => h('li', null, h('span', null, stp), h('span', { class: 'ord-btns' }, h('button', { type: 'button', class: 'btn sm', disabled: si === 0, on: { click: () => { [st.v[si - 1], st.v[si]] = [st.v[si], st.v[si - 1]]; re(); } } }, '↑'), h('button', { type: 'button', class: 'btn sm', disabled: si === st.v.length - 1, on: { click: () => { [st.v[si + 1], st.v[si]] = [st.v[si], st.v[si + 1]]; re(); } } }, '↓'))))); re(); body = ol; }
      return h('fieldset', { class: 'qq' }, h('legend', null, `${i + 1}. ${x.q}`), h('div', { class: 'muted small' }, { mcq: 'One answer', multi: `Pick ${x.pick}`, order: 'Put in order' }[x.t]), body);
    });
    const check = h('button', { class: 'btn', type: 'button', on: { click: () => {
      const ok = items.map((x, i) => x.t === 'mcq' ? state[i].v === x.a : x.t === 'multi' ? state[i].v.length === x.a.length && x.a.every((k) => state[i].v.includes(k)) : state[i].v.join('|') === x.steps.join('|'));
      box.replaceChildren(h('div', { class: 'note-box' }, h('b', null, `Warm-up: ${ok.filter(Boolean).length} of ${items.length}. Not stored.`), items.map((x, i) => h('div', { class: 'small' }, mark(ok[i]), ` ${x.q} ${x.why}`)), h('button', { class: 'btn sm', style: 'margin-top:6px', on: { click: draw } }, 'Again')));
    } } }, 'Check the warm-up');
    box.replaceChildren(h('div', { class: 'stack' }, ...list, check));
  };
  const d = h('details', { class: 'warmup', style: 'margin:8px 0 12px' }, h('summary', null, 'First time? Try the question formats on three warm-up questions (not scored)'), box);
  draw();
  return d;
}

// The trainee keeps the first two focus areas and may choose the third. The KUDO Trainer approves the change.
function focusChoice() {
  const box = h('div');
  (async () => {
    const o = await api('GET', '/api/me/plan/options');
    if (!o.canChoose) return;
    if (o.pending) { box.replaceChildren(h('div', { class: 'muted small', style: 'margin-top:10px' }, 'Your change is waiting for your KUDO Trainer\'s approval.')); return; }
    box.replaceChildren(h('details', { style: 'margin-top:10px' }, h('summary', null, 'Prefer a different third focus area?'),
      h('p', { class: 'muted small' }, 'The first two come from your results and stay. For the third, pick what matters most for your clients. Your KUDO Trainer approves the change, then your plan updates.'),
      h('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' }, o.options.map((x) => h('button', { class: `btn sm ${x.current ? 'primary' : ''}`, disabled: x.current, on: { click: async () => {
        try { await api('POST', '/api/me/plan/focus', { third: x.scenario }); toast('Sent to your KUDO Trainer for approval'); box.replaceChildren(h('div', { class: 'muted small', style: 'margin-top:10px' }, 'Your change is waiting for your KUDO Trainer\'s approval.')); } catch (e) { toast(e.message, true); }
      } }, title: x.label }, `${x.short || x.label}: ${x.gap} points to go${x.current ? ' (current)' : ''}`)))));
  })().catch(() => {});
  return box;
}

// ------------------------------------------------------------------ Home and My courses (one view, two parts)
export function programmeView(data, { readOnly = false, banner = null, part = 'home' } = {}) {
  if (data.status === 'pending' || data.status === 'none') {
    return h('div', { class: 'page' }, banner,
      h('div', { class: 'page-head' }, h('div', null, h('h1', null, `Welcome, ${first(data.user?.name)}`), h('p', null, 'Your personal Academy programme'))),
      h('div', { class: 'card empty' }, h('b', null, 'Your programme is being finalised'), 'Your KUDO Trainer is reviewing the plan built from your October results. It will appear here as soon as it is approved. Meanwhile, your results are under My results.'));
  }
  const { plan, state: st, settings } = data;
  const paceChip = { on: ['green', 'On pace'], close: ['amber', 'Slightly behind pace'], behind: ['coral', 'Behind pace'] }[st.progress.pace];
  const byPhase = data.phases.map((p) => ({ ...p, items: st.items.filter((i) => i.phase === p.n) }));
  // This week = what is due by now and not done yet, on the trainee's side, oldest first.
  const thisWeek = st.items.filter((i) => !i.done && (i.owner || 'you') === 'you' && i.week <= st.week).sort((a, b) => a.week - b.week).slice(0, 6);
  const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim() : `${m} min`);
  // Your steps only (the KUDO Trainer's sessions are theirs to book): the same count as the 12-week map.
  const mySteps = st.items.filter((i) => (i.owner || 'you') === 'you'), myDone = mySteps.filter((i) => i.done).length, myPct = mySteps.length ? Math.round((myDone / mySteps.length) * 100) : 0;

  const minWeek = thisWeek.reduce((t, i) => t + (i.minutes || 0), 0);
  const nextUp = thisWeek[0] || st.next[0] || null;

  // ---- Home: a tiled dashboard built around what to do next. One step leads; everything else is context.
  const nextHref = nextUp && !readOnly ? itemHref(nextUp) : null;
  const home = [
    h('div', { class: 'bento home-top' },
      h('section', { class: 'hero span-5' },
        h('div', { class: 'hero-main' },
          h('div', { class: 'hero-kicker' }, metaRow([`Week ${st.week} of ${st.weeks}`, data.phases.find((p) => st.week >= p.weeks[0] && st.week <= p.weeks[1])?.short])),
          h('h1', null, `Welcome back, ${first(data.user?.name) || 'there'}`),
          h('p', { class: 'hero-goal' }, settings.goal || 'Your custom programme to become a KUDO Champion.'),
          data.message ? h('div', { class: 'hero-msg' }, h('b', null, 'From your KUDO Trainer: '), data.message) : null,
          readOnly ? null : h('div', { class: 'hero-cta' },
            nextUp ? h('a', { class: 'btn primary lg', href: nextHref || '#training', on: { click: () => focusStep(nextUp.kind) } }, 'Take the course') : null,
            h('span', { class: 'hero-next' }, nextUp ? nextUp.title : 'Everything on your side is done for now.')))),
      h('section', { class: 'card span-3 prog-tile' },
        h('div', { class: 'row spread' }, h('h2', null, 'My Progress'), h('span', { class: `chip ${paceChip[0]}` }, paceChip[1])),
        h('div', { class: 'pt-ring' }, h('div', { class: 'ring big', style: `--p:${myPct}`, role: 'img', 'aria-label': `${myPct}% of your steps done` }, h('b', null, `${myPct}%`)),
          h('div', null, h('div', { class: 'pt-big' }, `${myDone} of ${mySteps.length}`), h('div', { class: 'muted small' }, 'steps done'))),
        h('div', { class: 'muted small' }, `${data.phases.find((p) => st.week >= p.weeks[0] && st.week <= p.weeks[1])?.name || ''}, weeks ${(data.phases.find((p) => st.week >= p.weeks[0] && st.week <= p.weeks[1]) || { weeks: [1, 3] }).weeks.join(' to ')}`)),
      readinessCard({ progression: st.progression || [], start: st.readiness.start, now: st.readiness.now, compact: true, cls: 'span-4', firstCheck: st.items.find((i) => mine(i) && !i.done && ['check', 'baseline', 'review'].includes(i.kind))?.title || null })),
    weeksCard({ title: 'My 12-weeks program', items: st.items, week: st.week, weeks: st.weeks, phases: data.phases, levels: st.levels, modules: data.modules, hrefFor: readOnly ? () => null : itemHref, onStep: (it) => focusStep(it.kind), pace: paceChip }),
    levelsCard(st.levels),
    data.shared?.length ? h('div', { class: 'card' }, h('h2', null, 'Notes from your KUDO Trainer sessions'), data.shared.map((n) => h('div', { class: 'note-box' }, h('b', null, n.title), h('div', null, n.text), h('div', { class: 'when' }, fmtDate(n.on))))) : null,
  ];

  // ---- My courses: the work on the left (this week, then the plan week by week), support on the right.
  const phaseBar = h('nav', { class: 'phasebar', 'aria-label': 'The four phases' }, byPhase.map((p) => {
    const mine = p.items.filter((i) => (i.owner || 'you') === 'you'), done = mine.filter((i) => i.done).length;
    const isNow = st.week >= p.weeks[0] && st.week <= p.weeks[1], past = st.week > p.weeks[1];
    return h('div', { class: `pb-ph ${isNow ? 'now' : past ? 'past' : ''}` },
      h('div', { class: 'pb-top' }, h('b', null, p.name), h('span', null, `${done}/${mine.length}`)),
      h('div', { class: 'bar' }, h('i', { style: `width:${mine.length ? Math.round((done / mine.length) * 100) : 0}%` })),
      h('small', null, isNow ? `${weeksLabel(p)}, you are here` : weeksLabel(p)));
  }));
  const training = [
    phaseBar,
    h('div', { class: 'bento training-grid' },
      h('div', { class: 'span-8 stack' },
        h('section', { class: 'card this-week' }, h('div', { class: 'row spread' }, h('h2', null, thisWeek.length ? 'This week' : 'My next courses'),
            h('span', { class: 'chip blue' }, thisWeek.length ? `${thisWeek.length} step${thisWeek.length > 1 ? 's' : ''}, about ${fmtMin(minWeek)}` : 'You are ahead of your plan')),
          thisWeek.length ? thisWeek.map((it) => itemRow(it, { readOnly })) : st.next.length ? st.next.map((it) => itemRow(it, { readOnly })) : h('div', { class: 'ok', style: 'margin-top:10px' }, 'Everything on your side is done. Well done.')),
        h('section', { class: 'plan-weeks' },
          h('div', { class: 'sec-head' }, h('h2', null, 'Your plan, week by week'), h('p', { class: 'muted small' }, 'The phase you are in is open. Open the others to look back or ahead.')),
          h('div', { class: 'phases' }, byPhase.map((p) => {
            const done = p.items.filter((i) => i.done).length;
            const weeks = [...new Set(p.items.map((i) => i.week))].sort((x, y) => x - y);
            const isNow = st.week >= p.weeks[0] && st.week <= p.weeks[1];
            return h('details', { class: `card phase ${isNow ? 'now' : ''}`, open: isNow },
              h('summary', { class: 'row spread' }, h('div', null, h('h2', null, p.name), h('p', { class: 'sub keep', style: 'margin:2px 0 0' }, p.aim), h('div', { class: 'phase-meta' }, metaRow([`Phase ${p.n}`, weeksLabel(p).toLowerCase(), isNow ? 'you are here' : null]))), h('span', { class: 'chip grey' }, `${done}/${p.items.length}`)),
              weeks.map((w) => { const wi = p.items.filter((i) => i.week === w); const wd = wi.filter((i) => i.done).length;
                return h('div', { class: 'wk' }, h('div', { class: `wk-h ${w === st.week ? 'now' : ''}` }, h('span', null, `Week ${w}${w === st.week ? ', this week' : ''}`), h('span', { class: 'wk-n' }, `${wd}/${wi.length}`)), wi.map((it) => itemRow(it, { readOnly, compact: false }))); }));
          })))),
      h('aside', { class: 'span-4 stack' },
        h('section', { class: 'card focus-card' }, h('h2', null, 'Your three focus areas'), h('p', { class: 'sub keep' }, plan.focusPinned ? 'Chosen with your KUDO Trainer' : 'Picked from your results, your clients and the team priorities'),
          plan.focus.length ? plan.focus.map((s2) => { const l = st.levels.find((x) => x.scenario === s2); const pct = Math.min(100, Math.round((l.now / Math.max(1, l.target)) * 100));
            return h('div', { class: 'focus-why' }, h('div', { class: 'row spread' }, h('b', null, l.label, ' ', tipI(`Because ${plan.focusReasons[s2]}.`)), h('span', { class: 'small muted' }, `${l.now}% of ${l.target}%`)), h('div', { class: 'bar' }, h('i', { style: `width:${pct}%` }))); })
            : h('div', { class: 'muted' }, 'You are already at target on every scenario: your plan keeps it sharp and proves it.'),
          plan.tip ? h('div', { class: 'tip' }, h('b', null, 'How you like to learn: '), plan.tip) : null,
          readOnly ? null : focusChoice()),
        readOnly ? null : challengeCard(),
        readOnly ? null : spacedCard(),
        h('section', { class: 'card trainer-tile' }, h('h2', null, 'With your KUDO Trainer'),
          st.jackNext.length ? st.jackNext.slice(0, 4).map((i) => h('div', { class: 'tt-row' }, h('span', { class: 'tt-wk' }, `W${i.week}`), h('span', null, i.title.replace(/\s*with your KUDO Trainer:?\s*/i, ': ').replace(/^: /, '').replace(/:\s*$/, '')))) : h('p', { class: 'muted small' }, 'No session planned yet.'),
          readOnly ? null : groupNext()))),
  ];
  const trainingHead = h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'My courses'), h('p', null, `Week ${st.week} of ${st.weeks}, ${myDone} of ${mySteps.length} steps done`)));

  if (part === 'training') return h('div', { class: 'page prog training stack' }, banner, trainingHead, ...training);
  if (part === 'all') return h('div', { class: 'page prog stack' }, banner, ...home, h('h2', { class: 'sec-h' }, 'Courses'), ...training);
  return h('div', { class: 'page prog home stack' }, banner, ...home);
}

// The next group session, when the KUDO Trainer has scheduled one.
function groupNext() {
  const box = h('div');
  api('GET', '/api/me/group-sessions').then(({ sessions }) => { const g = sessions[0]; if (!g) return;
    box.replaceChildren(h('div', { class: 'jack-next group' }, h('b', null, 'Group session: '), `${new Date(g.starts_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}, ${g.title}${g.topic ? `, ${g.topic}` : ''} `, g.link ? h('a', { href: g.link, target: '_blank', rel: 'noopener' }, 'Join link') : null)); }).catch(() => {});
  return box;
}



// Step 1 body: the story on slides when the module has one, with a switch to the one-page text (sections, worked
// example, common mistakes); otherwise the one-page text. "Asked in sessions" stays visible under the story.
function lessonBody(m, onePage) {
  if (!m.story) return h('div', null, ...onePage());
  const box = h('div');
  let mode = (() => { try { return localStorage.getItem('academy.lessonView') || 'story'; } catch { return 'story'; } })();
  const toPractice = () => document.querySelector('.practice-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const draw = () => {
    const sw = h('div', { class: 'st-switch' }, h('button', { type: 'button', class: mode === 'story' ? 'on' : '', on: { click: () => set('story') } }, 'Slides'), h('button', { type: 'button', class: mode === 'page' ? 'on' : '', on: { click: () => set('page') } }, 'One page'));
    box.replaceChildren(sw, ...(mode === 'story' ? [storyPlayer(m.key, m.story, { toPractice }), m.faq?.length ? h('div', { class: 'faq' }, h('h3', null, 'Asked in sessions'), m.faq.map((f) => h('details', null, h('summary', null, f.question), h('p', null, f.answer)))) : null] : onePage()).filter(Boolean).flat().filter(Boolean));
  };
  const set = (v) => { mode = v; try { localStorage.setItem('academy.lessonView', v); } catch { /* not kept */ } draw(); };
  draw();
  return box;
}

// ------------------------------------------------------------------ module / lesson page
// The five steps of a module, in the order the plan gives them. "Prove it" (the scored check) comes last.
const STEP_ORDER = ['lesson', 'practice', 'scenario', 'explain', 'check'];
const STEP_NAME = { lesson: 'Learn', practice: 'Practise', scenario: 'Decide', explain: 'Explain it', check: 'Prove it' };
const STATE_CHIP = { done: ['green', 'Done'], next: ['blue', 'Up next'], todo: ['grey', 'To do'], optional: ['grey', 'Optional'], extra: ['green', 'Done, optional'] };

export function moduleView(m, { mode = 'trainee', planItems = [], onDone } = {}) {
  const admin = mode === 'admin';
  let items = planItems;
  const mineOf = () => items.filter((i) => i.module === m.key);
  const mine = mineOf();
  const why = mine.find((i) => i.why && i.kind === 'lesson')?.why || mine.find((i) => i.why)?.why;
  const reviewKey = m.reviewKey || null;
  const itemOf = (kind) => mineOf().find((i) => i.kind === kind);
  const baseline = m.key === 'baseline';

  // Which steps this module has, numbered in order.
  const ex = m.explain || m.explainFull;
  const has = { lesson: !baseline, practice: !baseline && !!(m.practiceTask || m.practiceFull), scenario: !baseline && !!(m.walkthrough || m.walkthroughFull), explain: !baseline && !!ex, check: true };
  const kinds = STEP_ORDER.filter((k) => has[k]);
  const num = (k) => kinds.indexOf(k) + 1;
  const steps = {}; // kind -> { card, chip }
  // Done without a plan item (an optional step the trainee did anyway).
  const didExtra = { scenario: () => !!m.walkAttempts?.length, explain: () => !!m.submissions?.length, practice: () => !!m.practiceSubmissions?.length, check: () => !!(m.attempts || []).length, lesson: () => false };
  const stateOf = (k) => {
    const it = itemOf(k);
    if (!it) return didExtra[k]() ? 'extra' : 'optional';
    if (it.done) return 'done';
    return nextOpen() === k ? 'next' : 'todo';
  };
  const planned = () => kinds.filter((k) => itemOf(k));
  // Up next follows the plan's own order (some plans say: try the practice first).
  const nextOpen = () => mineOf().find((i) => kinds.includes(i.kind) && !i.done)?.kind;
  const stepHead = (k, title, sub) => {
    const chip = h('span', { class: 'chip' });
    steps[k] = { chip };
    return h('div', { class: 'step-head' }, h('div', null, h('h2', null, `Step ${num(k)}: ${title}`), sub ? h('div', { class: 'step-sub' }, sub) : null), admin ? null : chip);
  };
  const stepCard = (k, cls, ...body) => { const card = h('div', { class: `card step-card ${cls || ''}`, id: `step-${k}` }, ...body); (steps[k] = steps[k] || {}).card = card; return card; };
  const goTo = (k, { flash = true } = {}) => { const c = steps[k]?.card; if (!c) return; c.scrollIntoView({ behavior: 'smooth', block: 'start' }); if (flash) { c.classList.remove('step-flash'); void c.offsetWidth; c.classList.add('step-flash'); } };

  // The step tracker, sticky at the top of the page.
  const tracker = h('nav', { class: 'mtrack', 'aria-label': 'Steps in this module' });
  const nextBars = []; // "next step" hand-offs inside cards, redrawn with the state
  const nextBar = (after) => { const box = h('div', { class: 'step-next', hidden: true }); nextBars.push({ box, after }); return box; };
  const paint = () => {
    if (admin || baseline) return;
    const pl = planned(), done = pl.filter((k) => itemOf(k).done).length, nx = nextOpen();
    tracker.replaceChildren(
      h('div', { class: 'mtrack-sum' }, pl.length ? (done === pl.length ? h('b', null, 'Module complete') : h('span', null, h('b', null, `${done} of ${pl.length}`), ' steps done')) : h('span', { class: 'muted' }, 'Not in your plan: every step is optional')),
      h('ol', { class: 'mtrack-steps' }, kinds.map((k) => { const st = stateOf(k);
        return h('li', null, h('button', { type: 'button', class: `mtrack-step ${st}`, 'aria-current': st === 'next' ? 'step' : null, on: { click: () => goTo(k) } },
          h('span', { class: 'mtrack-dot', 'aria-hidden': 'true' }, st === 'done' || st === 'extra' ? check() : String(num(k))),
          h('span', { class: 'mtrack-l' }, STEP_NAME[k], h('span', { class: 'sr' }, `, ${STATE_CHIP[st][1]}`)))); })));
    for (const k of kinds) {
      const st = stateOf(k), s2 = steps[k]; if (!s2) continue;
      s2.chip.className = `chip ${STATE_CHIP[st][0]}`; s2.chip.textContent = STATE_CHIP[st][1];
      s2.card?.classList.toggle('is-done', st === 'done' || st === 'extra'); s2.card?.classList.toggle('is-next', st === 'next');
    }
    for (const nb of nextBars) {
      const after = nb.after, mineDone = itemOf(after)?.done || (stateOf(after) === 'extra');
      if (!mineDone) { nb.box.hidden = true; continue; }
      nb.box.hidden = false;
      nb.box.replaceChildren(nx
        ? h('div', { class: 'row spread' }, h('span', null, mark(true), ' ', h('b', null, `${STEP_NAME[after]}: done.`), ` Next is step ${num(nx)}, ${STEP_NAME[nx]}.`), h('button', { type: 'button', class: 'btn primary sm', on: { click: () => goTo(nx) } }, `Go to step ${num(nx)}`))
        : pl.length ? h('div', { class: 'row spread' }, h('span', null, mark(true), ' ', h('b', null, 'Every step is done.'), ' KUDOG has your module recap.'), h('button', { type: 'button', class: 'btn primary sm', on: { click: () => finishModule(true) } }, 'See my recap')) : h('span', null, mark(true), ' Done.'));
    }
  };
  // The module is finished: KUDOG's recap opens by itself; closing it moves the trainee on.
  let finishing = false;
  const finishModule = async (asked) => {
    if (finishing) return; finishing = true;
    const here = location.hash;
    const shown = await revealRecap(() => { setTimeout(() => { if (location.hash === here) location.hash = `#${document.body.dataset.me === '1' ? 'me-' : ''}training`; }, 0); });
    if (!shown) revealNew();
    finishing = false;
    if (!shown && asked) { recapBox.replaceChildren(recapBanner(m.key)); recapBox.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  };
  // Refresh the step states in place (no page reload, no jump to the top).
  const refresh = async ({ advanceFrom } = {}) => {
    try { items = (await api('GET', '/api/me/programme')).state?.items || items; } catch { /* keep */ }
    try { const fresh = await api('GET', `/api/me/modules/${m.key}`); Object.assign(m, { attempts: fresh.attempts, walkAttempts: fresh.walkAttempts, submissions: fresh.submissions, practiceSubmissions: fresh.practiceSubmissions }); } catch { /* keep */ }
    paint();
    if (!advanceFrom) return;
    const pl = planned();
    if (pl.length && pl.every((k) => itemOf(k).done)) { if (advanceFrom !== 'check') finishModule(false); return; }
    if (advanceFrom !== 'check') setTimeout(() => revealNew(), 1400); // a card earned by this step (after a check: once the answers are read)
    const nx = nextOpen();
    if (nx && advanceFrom !== 'check') { toast(`${STEP_NAME[advanceFrom]}: done. Next, step ${num(nx)}: ${STEP_NAME[nx]}.`); setTimeout(() => goTo(nx), 600); }
  };
  const stepDone = (k) => (o) => { refresh({ advanceFrom: k }); if (!o?.silent) onDone?.({ silent: true }); };

  const markBtn = (it, label) => {
    if (!it || admin) return null;
    if (it.done) return h('span', { class: 'row', style: 'gap:8px' }, h('span', { class: 'chip green' }, 'Done'), it.signed_off ? null : h('button', { class: 'k-link small btn-link', type: 'button', on: { click: async () => { try { await api('DELETE', `/api/me/items/${it.key}/done`); toast('Marked as not done'); await refresh(); lessonMark.replaceChildren(markBtn(itemOf('lesson'), label)); } catch (e) { toast(e.message, true); } } } }, 'Undo'));
    const note = h('textarea', { rows: 2, placeholder: it.kind === 'practice' ? 'One line on what you did or learned (your KUDO Trainer sees this)' : 'Optional note' });
    return h('div', { class: 'stack', style: 'margin-top:10px' }, note, h('button', { class: 'btn primary', on: { click: async () => { try { await api('POST', `/api/me/items/${it.key}/done`, { note: note.value }); await refresh({ advanceFrom: 'lesson' }); lessonMark.replaceChildren(markBtn(itemOf('lesson'), label)); } catch (e) { toast(e.message, true); } } } }, label));
  };

  // Check: a fresh random draw of mixed formats each time.
  const quizBox = h('div');
  const fbBox = h('div');
  const recapBox = h('div');
  const drawQuiz = async (fresh) => {
    let items0 = m.check;
    if (fresh && !admin) { try { items0 = (await api('GET', `/api/me/modules/${m.key}`)).check; } catch { /* keep */ } }
    quizBox.replaceChildren(checkForm(items0, { url: `/api/me/modules/${m.key}/attempt`, itemKey: reviewKey, certainty: true, onResult: async (r, its) => {
      const foot = h('div', { class: 'row', style: 'margin-top:12px' });
      quizBox.replaceChildren(resultView(r, its, { pass: m.pass || 0.8, baseline, onRetry: () => { drawQuiz(true); goTo('check', { flash: false }); }, footer: foot }));
      // Land on the result, not wherever the long form left the page.
      steps.check?.card ? goTo('check', { flash: false }) : quizBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (!baseline && !m.feedbackGiven && !admin) fbBox.replaceChildren(feedbackCard(m.key));
      if (baseline || admin) { foot.append(h('a', { class: 'btn primary', href: '#training' }, 'Back to my plan')); return; }
      await refresh({ advanceFrom: 'check' });
      const pl = planned(), nx = nextOpen();
      if (pl.length && pl.every((k) => itemOf(k).done)) {
        foot.append(h('button', { type: 'button', class: 'btn primary', on: { click: () => finishModule(true) } }, 'Finish the module'));
        // KUDOG opens the recap by himself once the trainee has scrolled through the answers.
        const io = new IntersectionObserver((en) => { if (en.some((e) => e.isIntersecting)) { io.disconnect(); setTimeout(() => finishModule(false), 1200); } });
        setTimeout(() => io.observe(foot), 1500); // after the scroll to the result has settled
      } else {
        if (nx) foot.append(h('button', { type: 'button', class: 'btn primary', on: { click: () => goTo(nx) } }, `Next: step ${num(nx)}, ${STEP_NAME[nx]}`));
        const io = new IntersectionObserver((en) => { if (en.some((e) => e.isIntersecting)) { io.disconnect(); setTimeout(() => revealNew(), 800); } });
        setTimeout(() => io.observe(foot), 1500); // after the scroll to the result has settled
      }
      if (!nx && !(pl.length && pl.every((k) => itemOf(k).done))) foot.append(h('a', { class: 'btn', href: '#training' }, 'Back to my plan'));
    } }));
  };
  if (admin) {
    const LVL = { recall: 'Recall', apply: 'Apply', decide: 'Decide' };
    const tagged = m.pool.filter((x) => x.obj != null);
    const cover = (m.objectives || []).map((o, oi) => ({ o, n: tagged.filter((x) => x.obj === oi).length }));
    quizBox.append(h('p', { class: 'muted small' }, `Pool of ${m.pool.length} items (${m.pool.filter((x) => x.reserve).length} kept back for the next cycle); each attempt draws ${Math.min(6, m.pool.filter((x) => !x.reserve).length)}, with at least one of each format.`),
      tagged.length ? h('div', { class: 'note-box' }, h('b', null, 'Objective coverage (tagged questions)'), h('ul', { class: 'ans-list' }, cover.map((c, ci) => h('li', null, `O${ci + 1}: ${c.o} `, h('span', { class: `chip ${c.n ? 'green' : 'coral'}` }, c.n ? `${c.n}` : 'no question'))))) : null,
      ...m.pool.map((x, i) => h('div', { class: 'qq' }, h('b', null, `${i + 1}. ${x.q}`), h('span', { class: 'chip grey', style: 'margin-left:6px' }, { mcq: 'Single answer + certainty', multi: 'Pick all that fit', match: 'Match', order: 'Order' }[x.t]),
        x.obj != null ? h('span', { class: 'chip grey', style: 'margin-left:4px' }, `O${x.obj + 1}, ${LVL[x.lvl] || ''}`) : null,
        x.reserve ? h('span', { class: 'chip amber', style: 'margin-left:4px' }, 'Next cycle') : null,
        x.field ? h('span', { class: 'chip blue', style: 'margin-left:4px' }, 'From a session') : null,
        x.obj != null ? h('span', { class: 'chip coral', style: 'margin-left:4px', title: 'Drafted from the lesson content; your KUDO Trainer checks before the January cycle.' }, 'New: to check') : null,
        x.t === 'mcq' || x.t === 'multi' ? h('ul', null, x.o.map((o, oi) => h('li', { class: (x.t === 'mcq' ? x.a === oi : x.a.includes(oi)) ? 'right' : '' }, o))) : null,
        x.t === 'match' ? h('ul', null, x.pairs.map((p) => h('li', null, `${p[0]} → `, h('b', null, p[1])))) : null,
        x.t === 'order' ? h('ol', null, x.steps.map((st) => h('li', null, st))) : null,
        h('div', { class: 'why' }, x.why))));
  } else drawQuiz(false);
  const walkData = m.walkthrough || m.walkthroughFull;
  const walkCard = has.scenario ? stepCard('scenario', null, stepHead('scenario', 'Decide', walkData.title),
    admin ? h('div', null, h('p', null, m.walkthroughFull.intro), m.walkthroughFull.steps.map((st, si) => h('div', { class: 'qq' }, h('b', null, `${si + 1}. ${st.text}`), h('ul', null, st.choices.map((c) => h('li', null, h('span', { class: `chip ${['coral', 'amber', 'green'][c.q]}` }, ['Wrong', 'OK', 'Best'][c.q]), ' ', c.t, h('div', { class: 'muted small' }, c.fb)))))))
      : walkthroughCard(m.key, m.walkthrough, { done: !!(itemOf('scenario')?.done || m.walkAttempts?.length), onEnd: stepDone('scenario') }), nextBar('scenario')) : null;
  const explainBox = has.explain ? stepCard('explain', null, stepHead('explain', 'Explain it to the client'),
    admin ? h('div', null, h('div', { class: 'explain-prompt' }, ex.prompt), h('b', null, 'Key points'), h('ul', null, ex.points.map((p) => h('li', null, p)))) : explainCard(m.key, ex, m.submissions || [], m.rubric || [], { onDone: stepDone('explain') }), nextBar('explain')) : null;

  const rec = (m.attempts || []).filter((a) => a.counts !== false && !(a.item_key || '').startsWith('review.')).slice(-1)[0];
  const last = rec;
  const lessonItem = itemOf('lesson'), practiceItem = itemOf('practice');
  const lessonMark = h('div', null, lessonItem ? markBtn(lessonItem, 'I have worked through the lesson') : null);
  const practiceDone = stepDone('practice');
  const lessonCard = has.lesson ? stepCard('lesson', 'lesson-card', stepHead('lesson', 'Learn'),
          videoBlock(m, admin),
          updatesBlock(m.updates, Object.keys(m.updatedLines || {}).length),
          lessonBody(m, () => [
          m.sections.map((s, si) => h('details', { class: 'les', open: si === 0 || s.points.some((_, pi) => m.updatedLines?.[`${si}.${pi}`]) }, h('summary', null, h('h3', null, s.title), h('span', { class: 'les-n' }, `${s.points.length}`)), h('ul', null, s.points.map((p, pi) => { const u = m.updatedLines?.[`${si}.${pi}`]; return h('li', { class: u ? 'upd' : null }, p, u ? h('span', { class: 'upd-tag', title: `Changed with ${u.release || 'a release'}` }, 'Updated') : null); })))),
          m.faq?.length ? h('div', { class: 'faq' }, h('h3', null, 'Asked in sessions'), m.faq.map((f) => h('details', null, h('summary', null, f.question), h('p', null, f.answer)))) : null,
          m.caseStudy ? h('div', { class: 'case' }, h('h3', null, 'Worked example'), h('p', null, m.caseStudy.example), h('div', { class: 'muted small' }, 'An illustrative case built from the lesson')) : null,
          m.caseStudy?.mistakes?.length ? h('div', { class: 'mistakes' }, h('h3', null, 'Common mistakes'), h('ul', null, m.caseStudy.mistakes.map((x) => h('li', null, x)))) : null
          ]),
          lessonMark, nextBar('lesson')) : null;
  const practiceCard = has.practice ? stepCard('practice', 'practice-card', stepHead('practice', 'Practise'),
          practiceItem?.done ? h('div', { class: 'ok', style: 'margin-bottom:8px' }, practiceItem.signed_off ? 'Practice passed and signed off' : 'Practice done') : !practiceItem && !admin ? h('p', { class: 'muted small' }, 'Optional for you: not in your plan') : null,
          admin ? h('div', null, h('div', { class: 'explain-prompt' }, m.practiceFull.prompt), h('div', { class: 'muted small' }, `Format: ${{ write: 'written', speak: 'spoken', steps: 'step-by-step account' }[m.practiceFull.type]}. Reviewed automatically.`), h('b', null, 'Key points'), h('ul', null, m.practiceFull.points.map((p) => h('li', null, p))))
            : SANDBOX_FOR[m.key] && !sbxReplaces(m.key) ? h('div', null, sandboxBlock(m.key), h('h3', { class: 'sbx-then' }, 'Then the written task'), explainCard(m.key, m.practiceTask, m.practiceSubmissions || [], m.rubric || [], { onDone: practiceDone, kind: 'practice', type: m.practiceTask.type }))
            : SANDBOX_FOR[m.key] ? h('div', null, sandboxBlock(m.key), h('details', { class: 'sbx-old' }, h('summary', null, 'Or describe what you did in a test account'), explainCard(m.key, m.practiceTask, m.practiceSubmissions || [], m.rubric || [], { onDone: practiceDone, kind: 'practice', type: m.practiceTask.type })))
            : explainCard(m.key, m.practiceTask, m.practiceSubmissions || [], m.rubric || [], { onDone: practiceDone, kind: 'practice', type: m.practiceTask.type }),
          m.practice?.length ? h('details', { style: 'margin-top:12px' }, h('summary', null, 'More ways to practise (optional)'), h('ol', { class: 'obj' }, m.practice.map((p) => h('li', null, p)))) : null, nextBar('practice')) : null;
  const checkCard = stepCard('check', 'check-card', baseline ? h('div', { class: 'step-head' }, h('h2', null, 'Baseline: one question per scenario')) : stepHead('check', 'Prove it', null),
      last && !baseline ? h('span', { class: 'chip blue' }, `Recorded score ${Math.round((last.correct / last.total) * 100)}%, ${fmtDate(last.created_at)}`) : null,
      h('p', { class: 'sub' }, baseline ? 'No pass mark: answer honestly, it aims your plan at the right gaps.' : last ? 'Your recorded score is from your first attempt. Retakes are for practice: a new mix of questions each time, and they do not change your score.' : `Your first attempt is the score we keep, so take your time (aim for ${Math.round((m.pass || 0.8) * 100)}%). After that, retake it as often as you like to practise.`), !last && !admin ? warmUp() : null, quizBox, nextBar('check'));

  const page = h('div', { class: 'page lesson' },
    h('a', { href: admin ? '#curriculum' : '#training', class: 'muted back-link' }, admin ? 'Back to Curriculum' : 'Back to My courses'),
    h('div', { class: 'page-head', style: 'margin-top:8px' }, h('div', null,
      h('h1', null, m.title), h('p', null, m.summary),
      h('div', { class: 'lesson-meta' }, metaRow([m.depth ? `${DEPTH_LABEL[m.depth]} depth` : null, m.minutes ? `about ${m.minutes} min` : null, m.delivery && m.delivery !== 'both' ? (m.delivery === 'ai' ? 'AI Translation' : 'Human Interpretation') : null]),
        m.depth ? h('span', null, ' ', tipI('Depth is how far your role takes this scenario: Set up (you do it yourself), Hand over (you prepare it and pass it on), Know (you can explain it).')) : null),
      why || reviewKey ? h('p', { class: 'why-line' }, h('b', null, reviewKey ? 'Spaced review: ' : 'Why it is in your plan: '), reviewKey ? 'retrieve it from memory first, then check. A pass here completes the review.' : why) : null)),
    admin || baseline ? null : tracker,
    admin || baseline ? null : h('div', null, recapBox, recapBanner(m.key)),
    baseline ? null : h('div', { class: 'grid g-8-4' },
      h('div', { class: 'stack' }, lessonCard, practiceCard),
      h('div', { class: 'stack' },
        h('div', { class: 'card' }, h('h2', null, 'By the end you can'), h('ol', { class: 'obj' }, m.objectives.map((o) => h('li', null, o)))),
        h('div', { class: 'card' }, h('h2', null, 'Go deeper'), h('p', { class: 'sub' }, 'Videos, the CM Onboarding Guide and the Help Center'),
          m.learn.map((r) => h('a', { class: 'res', href: r.url, target: '_blank', rel: 'noopener noreferrer' }, h('span', { class: `chip ${r.type === 'video' ? 'coral' : r.type === 'guide' ? 'amber' : 'blue'}` }, { video: 'Video', guide: 'Guide', article: 'Help Center' }[r.type]), h('span', null, r.title, r.note ? h('span', { class: 'muted small' }, `, ${r.note}`) : null)))),
        h('div', { class: 'card' }, h('h2', null, 'When to hand over'), h('ul', { class: 'esc' }, m.escalate.map((e) => h('li', null, e)))))),
    walkCard, explainBox, checkCard, fbBox,
  );
  paint();
  // Opened on a given step (from the plan, or back from a sandbox): go straight there.
  if (!admin && !baseline) {
    let want = null; try { want = sessionStorage.getItem('academy.focusStep'); sessionStorage.removeItem('academy.focusStep'); } catch { /* none */ }
    if (want === 'practice' || want === 'sandbox') { refresh({ advanceFrom: undefined }); }
    if (want && steps[want === 'sandbox' ? 'practice' : want]) setTimeout(() => goTo(want === 'sandbox' ? 'practice' : want, { flash: true }), 250);
  }
  return page;
}

export async function moduleRoute(key, { planItems = [], rerender }) {
  const [mk, reviewKey] = key.split('~');
  const m = await api('GET', `/api/me/modules/${mk}`);
  if (reviewKey) m.reviewKey = reviewKey;
  return moduleView(m, { planItems, onDone: (o) => { if (!o?.silent) rerender(); } });
}

export async function missedView({ readOnly = false, rerender, planItems = [] }) {
  const list = await api('GET', '/api/me/missed');
  const it = planItems.find((i) => i.key === 'missed');
  return h('div', { class: 'page lesson' }, h('a', { href: '#training', class: 'muted' }, 'Back to My courses'),
    h('div', { class: 'page-head', style: 'margin-top:8px' }, h('div', null, h('h1', null, 'The questions you missed in October'), h('p', null, 'Say your answer out loud first, then reveal. Retrieval is what makes it stick.'))),
    h('div', { class: 'card' }, list.length ? list.map((x) => { const a = h('div', { class: 'a', hidden: true }, 'Answer: ', x.answer || 'None'); return h('div', { class: 'q-item' }, h('b', null, `Q${x.qnum}. ${x.question}`), h('div', null, h('button', { class: 'btn sm', style: 'margin-top:6px', on: { click: (e) => { a.hidden = false; e.target.remove(); } } }, 'Reveal answer')), a); }) : h('div', { class: 'ok' }, 'No missed questions on record.'),
      it && !readOnly ? h('div', { style: 'margin-top:14px' }, it.done ? h('span', { class: 'chip green' }, 'Done') : h('button', { class: 'btn primary', on: { click: async () => { await api('POST', '/api/me/items/missed/done', {}); toast('Ticked off'); rerender(); } } }, 'I have gone through them all')) : null));
}

// ------------------------------------------------------------------ product changes
const RKIND = { feature: 'New', fix: 'Fixed', known: 'Known issue', removed: 'Removed' };
/** The lesson's recent product updates, above the lesson text. */
function updatesBlock(list, edited = 0) {
  if (!list?.length) return null;
  return h('div', { class: 'upd-box' }, h('h3', null, 'Recent product changes'),
    list.map((u) => h('div', { class: 'upd-item' }, h('div', { class: 'upd-h' }, h('span', { class: `chip ${u.kind === 'feature' ? 'blue' : 'grey'}` }, RKIND[u.kind] || 'Changed'), h('b', null, u.title), h('span', { class: 'muted small' }, fmtDate(u.released_on))), h('p', null, u.body))),
    edited ? h('p', { class: 'muted small', style: 'margin:6px 0 0' }, 'Lines marked Updated below already reflect these changes') : null);
}

// ------------------------------------------------------------------ sandbox practice
// Every sandbox exercise of a module, in scenario order. One that "replaces" stands in for the written practice task.
const SANDBOX_FOR = {};
Object.entries(SANDBOXES).sort((a, b) => a[1].num - b[1].num).forEach(([k, v]) => { (SANDBOX_FOR[v.module] = SANDBOX_FOR[v.module] || []).push(k); });
const sbxReplaces = (mk) => (SANDBOX_FOR[mk] || []).some((k) => SANDBOXES[k].replaces);
function sandboxBlock(moduleKey) { return h('div', { class: 'stack' }, ...SANDBOX_FOR[moduleKey].map((k) => sandboxOne(k, sbxReplaces(moduleKey)))); }
function sandboxOne(key, replaced) {
  const sc = SANDBOXES[key];
  const last = h('div', { class: 'muted small' });
  api('GET', `/api/me/sandbox/${key}`).then(({ runs }) => {
    if (!runs.length) { last.textContent = 'Not tried yet'; return; }
    const rec = runs.find((r) => r.record) || runs[0];
    last.replaceChildren(h('b', null, `Result of record: ${rec.score}%`), rec.score >= 80 ? h('span', { class: 'chip green', style: 'margin-left:8px' }, 'Passed') : h('span', { class: 'chip amber', style: 'margin-left:8px' }, 'Below 80%'), runs.length > 1 ? `, ${runs.length - 1} practice run${runs.length > 2 ? 's' : ''}, best ${Math.max(...runs.map((r) => r.score))}%` : '');
  }).catch(() => {});
  return h('div', { class: 'sbx-entry' },
    h('div', null, h('h3', null, `Sandbox: ${sc.title}`), h('p', { class: 'sbx-req', title: sc.brief ? sc.brief.opening : sc.request }, sc.brief ? `The client: “${sc.brief.opening}”` : sc.request),
      h('div', { class: 'sbx-meta' }, metaRow([`Scenario ${sc.num}`, sc.brief ? 'starts with a client call' : null, 'scored, your first run counts']),
        tipI((sc.brief ? 'You first talk to the client: ask what decides the set-up, then choose the solution and build it. ' : '') + 'Everything you click is recorded: you get a score (outcome, path, time' + (sc.brief ? ', plus the client call and your choice' : '') + '), your path next to the expert\'s, and what you missed. Your first run is your result of record' + (sc.replaces ? '; passing it (80%) signs this practice off.' : replaced ? '.' : '. The written task below is still part of this step.'))), last),
    h('a', { class: 'btn primary', href: `#sandbox-${key}` }, 'Open the sandbox'));
}
