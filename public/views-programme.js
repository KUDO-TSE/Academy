import { h, api, toast, fmtDate, svg, tipI } from './ui.js';
import { trajectoryChart } from './charts.js';
import { journeyMap } from './journey.js';
import { SCENARIOS as SANDBOXES } from './sandbox.js';
import { collectionStrip } from './collectibles.js';
import { checkForm, resultView, walkthroughCard, explainCard, feedbackCard, challengeCard, spacedCard } from './assess-ui.js';

// ------------------------------------------------------------------ shared bits
export const KIND_LABEL = { scenario: 'Decision walkthrough', explain: 'Explain it', survey: 'Survey', lesson: 'Lesson', practice: 'Practice', check: 'Check', review: 'Spaced review', baseline: 'Baseline check', one_to_one: 'With your KUDO Trainer', milestone: 'Milestone', missed: 'Review', teach: 'Teach-back' };
const KIND_CHIP = { scenario: 'amber', explain: 'coral', survey: 'grey', lesson: 'blue', practice: 'amber', check: 'green', review: 'green', baseline: 'green', one_to_one: 'coral', milestone: 'coral', missed: 'blue', teach: 'amber' };
export const DEPTH_LABEL = { know: 'Know', setup: 'Set up', handover: 'Hand over' };
const BAND_CHIP = { ready: 'green', nearly: 'blue', developing: 'amber', gap: 'coral', none: 'grey' };
const SOURCE = { test: 'Knowledge test', estimated: 'Estimated', self: 'Self Assessment (estimate)', check: 'Updated by your checks', coach: 'Updated by your KUDO Trainer', none: 'No data yet' };
const check = () => svg('<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>');
const moduleTitle = (data, key) => data.modules.find((m) => m.key === key)?.title || key;
const first = (n) => { const m = String(n || '').match(/\(([^)]+)\)/); return m ? `${m[1]} (test)` : String(n || '').split(' ')[0]; };

function itemHref(it) {
  if (it.kind === 'baseline') return '#module-baseline';
  if (it.kind === 'missed') return '#missed';
  if (it.kind === 'survey') return '#survey';
  if (it.module) return `#module-${it.module}${it.kind === 'review' ? `~${it.key}` : ''}`;
  return null;
}
const ACTION = { scenario: 'Start', explain: 'Record it', survey: 'Answer', lesson: 'Open lesson', practice: 'Open task', check: 'Take the check', review: 'Take the review', baseline: 'Start', missed: 'Open', teach: 'Open' };

function itemRow(it, { readOnly, compact } = {}) {
  const href = itemHref(it);
  const status = it.done ? h('span', { class: 'tick done', 'aria-label': 'Done' }, check()) : h('span', { class: 'tick', 'aria-label': 'Not done yet' });
  return h('div', { class: `pi ${it.done ? 'done' : ''}` }, status,
    h('div', { class: 'pi-main' },
      h('div', { class: 'pi-t' }, href && !readOnly ? h('a', { href }, it.title) : it.title),
      h('div', { class: 'pi-meta' }, h('span', { class: `chip ${KIND_CHIP[it.kind] || 'grey'}` }, KIND_LABEL[it.kind] || it.kind), h('span', { class: 'muted small' }, `${it.minutes} min`),
        it.owner === 'jack' ? h('span', { class: 'muted small' }, 'Your KUDO Trainer books this') : null, it.mandatory ? h('span', { class: 'muted small' }, 'Core') : null, !compact && it.why ? tipI(it.why) : null,
        it.recorded != null ? h('span', { class: `chip ${it.below ? 'amber' : 'green'}` }, `Recorded ${it.recorded}%`) : null, it.signoff && it.done ? h('span', { class: `chip ${it.signed_off ? 'green' : 'grey'}` }, it.signed_off ? 'Signed off' : 'Waiting for sign-off') : null, it.how ? h('span', { class: 'muted small' }, it.how) : null),
      null),
    href && !readOnly && !it.done && !compact ? h('a', { class: 'btn sm', href }, ACTION[it.kind] || 'Open') : null);
}

function levelBars(levels) {
  return h('div', { class: 'lv' },
    h('div', { class: 'lv-legend' }, h('span', null, h('i', { class: 'k-base' }), 'October start'), h('span', null, h('i', { class: 'k-now' }), 'Now'), h('span', null, h('i', { class: 'k-tgt' }), 'Your target')),
    levels.map((l) => h('div', { class: `lv-row ${l.focus ? 'focus' : ''}` },
      h('div', { class: 'lv-name' }, h('b', null, l.short), l.focus ? h('span', { class: 'chip coral' }, 'Focus') : null, h('span', { class: 'muted small' }, DEPTH_LABEL[l.depth] || '')),
      h('div', { class: 'lv-track', title: `${l.note}. Likely between ${Math.max(0, l.now - 10)}% and ${Math.min(100, l.now + 10)}%: a short check is one question away from 15 points.` },
        h('i', { class: 'lv-base', style: `width:${l.baseline}%` }), h('i', { class: 'lv-now', style: `width:${l.now}%` }),
        h('i', { class: 'lv-range', style: `left:${Math.max(0, l.now - 10)}%;width:${Math.min(100, l.now + 10) - Math.max(0, l.now - 10)}%` }), h('i', { class: 'lv-tgt', style: `left:${l.target}%` })),
      h('div', { class: 'lv-val' }, h('b', null, `${l.now}%`), l.baseline != null && l.now - l.baseline >= 5 ? h('span', { class: 'chip green', title: 'Since the start of your plan' }, `+${l.now - l.baseline}`) : h('span', { class: 'muted small' }, '±10'), h('span', { class: `chip ${BAND_CHIP[l.band.key]}` }, l.band.label)))));
}


// The module's explainer video: played in the page when the link is an embed link (SharePoint or Stream embed,
// YouTube no-cookie), otherwise opened in a new tab. Admins paste the link from the Curriculum page.
function videoBlock(m, admin) {
  const url = m.video;
  const embeddable = (u) => { try { const x = new URL(u); return (/\.sharepoint\.com$/.test(x.hostname) && /\/_layouts\/15\/embed\.aspx/i.test(x.pathname)) || (x.hostname === 'www.youtube-nocookie.com' && x.pathname.startsWith('/embed/')); } catch { return false; } };
  const view = url ? (embeddable(url) ? h('div', { class: 'video' }, h('iframe', { src: url, title: `Explainer video: ${m.title}`, allow: 'fullscreen', loading: 'lazy' }))
    : h('a', { class: 'btn', href: url, target: '_blank', rel: 'noopener' }, '▶ Watch the explainer video')) : null;
  if (!admin) return view;
  const input = h('input', { type: 'url', value: url || '', placeholder: 'Paste the video link (a SharePoint embed link plays in the page)', style: 'flex:1;min-width:240px' });
  return h('div', { class: 'stack', style: 'margin-bottom:10px' }, view, h('div', { class: 'row', style: 'gap:6px' }, input,
    h('button', { class: 'btn sm', on: { click: async () => { try { await api('PUT', `/api/admin/curriculum/${m.key}/video`, { url: input.value }); toast(input.value ? 'Video link saved' : 'Video link removed'); } catch (e) { toast(e.message, true); } } } }, 'Save video link')),
    h('div', { class: 'muted small' }, 'In SharePoint: open the video, Share, Embed, and copy the link inside src="…". Trainees need access to the file.'));
}

// Warm-up before a recorded check: the formats on neutral content, marked in the browser, never stored.
function warmUp() {
  const items = [
    { t: 'mcq', q: 'How long is the Academy programme?', o: ['6 weeks', '12 weeks', '6 months', 'One year'], a: 1, why: 'Twelve weeks in four phases' },
    { t: 'multi', q: 'Which of these are phases of your plan?', pick: 2, o: ['Warm-up', 'Prove it', 'Holiday', 'Onboarding'], a: [0, 1], why: 'Warm-up, Build, Broaden and Prove it' },
    { t: 'order', q: 'Put the four phases in order', steps: ['Warm-up', 'Build', 'Broaden', 'Prove it'], why: 'From the basics to proving it with your KUDO Trainer' },
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
      box.replaceChildren(h('div', { class: 'note-box' }, h('b', null, `Warm-up: ${ok.filter(Boolean).length} of ${items.length}. Not stored.`), items.map((x, i) => h('div', { class: 'small' }, `${ok[i] ? '✓' : '✗'} ${x.q} ${x.why}`)), h('button', { class: 'btn sm', style: 'margin-top:6px', on: { click: draw } }, 'Again')));
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
      } } }, `${x.label} · ${x.gap} points to go${x.current ? ' (current)' : ''}`)))));
  })().catch(() => {});
  return box;
}

// ------------------------------------------------------------------ the programme page
export function programmeView(data, { readOnly = false, banner = null, part = 'home' } = {}) {
  if (data.status === 'pending' || data.status === 'none') {
    return h('div', { class: 'page' }, banner,
      h('div', { class: 'page-head' }, h('div', null, h('h1', null, `Welcome, ${first(data.user?.name)}`), h('p', null, 'Your personal Academy programme'))),
      h('div', { class: 'card empty' }, h('b', null, 'Your programme is being finalised'), 'Your KUDO Trainer is reviewing the plan built from your October results. It will appear here as soon as it is approved. Meanwhile, your results are under My results.'));
  }
  const { plan, state: st, settings } = data;
  const focusRows = st.levels.filter((l) => l.focus);
  const paceChip = { on: ['green', 'On pace'], close: ['amber', 'Slightly behind pace'], behind: ['coral', 'Behind pace'] }[st.progress.pace];
  const byPhase = data.phases.map((p) => ({ ...p, items: st.items.filter((i) => i.phase === p.n) }));
  // This week = what is due by now and not done yet, on the trainee's side, oldest first.
  const thisWeek = st.items.filter((i) => !i.done && (i.owner || 'you') === 'you' && i.week <= st.week).sort((a, b) => a.week - b.week).slice(0, 6);
  const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim() : `${m} min`);
  // Your steps only (the KUDO Trainer's sessions are theirs to book): the same count as the 12-week map.
  const mySteps = st.items.filter((i) => (i.owner || 'you') === 'you'), myDone = mySteps.filter((i) => i.done).length, myPct = mySteps.length ? Math.round((myDone / mySteps.length) * 100) : 0;
  const reached = st.levels.filter((l) => l.now >= l.target && (l.baseline ?? 0) < l.target);

  const minWeek = thisWeek.reduce((t, i) => t + (i.minutes || 0), 0);
  const nextUp = thisWeek[0] || st.next[0] || null;

  // ---- Home: the programme at a glance (no tasks to work through here; one button takes you to them)
  const home = [
    h('section', { class: 'hero' },
      h('div', { class: 'hero-main' },
        h('div', { class: 'eyebrow' }, `${first(data.user.name)}, this is your KUDO Academy`),
        h('h1', null, 'Your custom programme to become a KUDO Champion'),
        settings.goal ? h('p', { class: 'hero-goal' }, settings.goal) : null,
        h('div', { class: 'hero-meta' }, h('span', null, `Week ${st.week} of ${st.weeks} `, tipI('Self-paced: work through each week any time in the week.')), st.started_on ? h('span', null, `Started ${fmtDate(st.started_on)}`) : null),
        data.message ? h('div', { class: 'hero-msg' }, h('b', null, 'From your KUDO Trainer: '), data.message) : null,
        readOnly ? null : h('div', { class: 'hero-cta' }, h('a', { class: 'btn primary lg', href: '#training' }, nextUp ? 'Continue my training' : 'Open my training', ' →'),
          nextUp ? h('span', { class: 'hero-next' }, h('span', { class: 'muted' }, 'Next: '), nextUp.title) : null)),
      h('div', { class: 'hero-ring' }, h('div', { class: 'ring big', style: `--p:${myPct}`, role: 'img', 'aria-label': `${myPct}% of your steps done` }, h('b', null, `${myPct}%`)),
        h('div', null, `${myDone} of ${mySteps.length} steps`), h('span', { class: `chip ${paceChip[0]}` }, paceChip[1]))),
    h('div', { class: 'grid g3 home-stats' },
      stat('Readiness', `${st.readiness.now}%`, st.readiness.now !== st.readiness.start ? `${st.readiness.now - st.readiness.start >= 0 ? '+' : ''}${st.readiness.now - st.readiness.start} pts since you started at ${st.readiness.start}%` : `Started at ${st.readiness.start}% · ${st.readiness.end}% by week ${st.weeks}`),
      stat('Scenarios at target', `${st.readiness.ready} of ${st.readiness.of}`, reached.length ? `Reached in the Academy: ${reached.map((l) => l.short).join(', ')}` : `Target per scenario: Set up 80%, Hand over 70%`),
      stat('Focus areas', `${plan.focus.length}`, focusRows.map((l) => `${l.short} ${l.now}%`).join(' · ') || 'At target everywhere', true)),
    h('section', { class: 'card roadmap-card' },
      h('div', null, h('h2', null, 'Your 12 weeks at a glance'), h('p', { class: 'sub', style: 'margin:2px 0 0' }, 'Four phases, one stop per week. Each stop shows what the week covers, how much of it is done and when you meet your KUDO Trainer')),
      journeyMap({ items: st.items, week: st.week, weeks: st.weeks, phases: data.phases, levels: st.levels, modules: data.modules, hrefFor: readOnly ? () => null : itemHref })),
    h('section', { class: 'journey two' },
      h('div', { class: 'card jr wide' }, h('div', { class: 'jr-k' }, 'Your readiness, week by week'),
        trajectoryChart({ trajectory: st.trajectory || [], start: st.readiness.start, now: st.readiness.now, end: st.readiness.end, target: Math.round(st.levels.reduce((t, l) => t + l.target, 0) / st.levels.length), week: st.week, weeks: st.weeks }),
        h('div', { class: 'chart-key' }, h('span', null, h('i', { class: 'k-line' }), 'So far'), h('span', null, h('i', { class: 'k-dash' }), 'Where the plan takes you'), h('span', null, h('i', { class: 'k-tgt-line' }), 'Your target'))),
      h('div', { class: 'card jr' }, h('div', { class: 'jr-k' }, 'Where you will be'), h('div', { class: 'jr-big' }, `${st.readiness.end}%`), h('div', { class: 'muted' }, `Ready on all ${st.readiness.of} at your role's depth`),
        h('ul', { class: 'jr-out' }, st.outcomes.map((o) => h('li', null, h('b', null, o.label, ' ', tipI(o.can)), h('div', { class: 'muted small' }, o.scenarios.join(', '))))))),
    readOnly ? null : whatsNewCard(st),
    h('div', { class: 'card levels-card', style: 'margin-top:16px' }, h('h2', null, 'Your level, scenario by scenario', ' ', tipI('The light bar is where you started in October, the dark bar is where you are now, the line is your target. Targets depend on what your role needs: Set up 80%, Hand over 70%. Each level is an estimate: the thin line under each bar shows where it most likely sits, and small moves inside it do not change your plan.')), levelBars(st.levels)),
    data.shared?.length ? h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'Notes from your KUDO Trainer sessions'), data.shared.map((n) => h('div', { class: 'note-box' }, h('b', null, n.title), h('div', null, n.text), h('div', { class: 'when' }, fmtDate(n.on))))) : null,
    readOnly ? null : h('div', { style: 'margin-top:16px' }, collectionStrip()),
  ];

  // ---- My training: where you take on lessons, practice and checks
  const training = [
    h('div', { class: 'grid g-8-4', style: 'margin-bottom:16px' },
      h('div', { class: 'card this-week' }, h('div', { class: 'row spread' }, h('h2', null, thisWeek.length ? 'This week' : 'Up next'),
          h('span', { class: 'muted small' }, thisWeek.length ? `${thisWeek.length} step${thisWeek.length > 1 ? 's' : ''} · about ${fmtMin(minWeek)}` : 'You are ahead of your plan')),
        thisWeek.length ? thisWeek.map((it) => itemRow(it, { readOnly })) : st.next.length ? st.next.map((it) => itemRow(it, { readOnly })) : h('div', { class: 'ok', style: 'margin-top:10px' }, 'Everything on your side is done. Well done.'),
        st.jackNext.length ? h('div', { class: 'jack-next' }, h('b', null, 'Coming up with your KUDO Trainer: '), st.jackNext.map((i) => i.title.replace(/\s*with your KUDO Trainer:?\s*/i, ': ').replace(/^: /, '').replace(/:\s*$/, '')).join(' · ')) : null,
        readOnly ? null : challengeCard()),
      h('div', { class: 'card focus-card' }, h('h2', null, 'Why these three focus areas'), h('p', { class: 'sub' }, plan.focusPinned ? 'Chosen with your KUDO Trainer' : 'Picked from your results, your clients and the team priorities'),
        plan.focus.length ? plan.focus.map((s) => { const l = st.levels.find((x) => x.scenario === s); return h('div', { class: 'focus-why' }, h('div', { class: 'row spread' }, h('b', null, l.label, ' ', tipI(`Because ${plan.focusReasons[s]}.`)), h('span', { class: `chip ${BAND_CHIP[l.band.key]}` }, `${l.now}% → ${l.target}%`)), ); }) : h('div', { class: 'muted' }, 'You are already at target on every scenario: your plan keeps it sharp and proves it.'),
        plan.tip ? h('div', { class: 'tip' }, h('b', null, 'How you like to learn: '), plan.tip) : null,
        readOnly ? null : focusChoice())),
    readOnly ? null : h('div', { style: 'margin-bottom:16px' }, spacedCard()),
    h('h2', { class: 'sec-h plan-weeks' }, 'Your plan, week by week'), h('p', { class: 'sub' }, 'The phase you are in is open. Open the others to look back or ahead.'),
    h('div', { class: 'phases' }, byPhase.map((p) => {
      const done = p.items.filter((i) => i.done).length;
      const weeks = [...new Set(p.items.map((i) => i.week))].sort((a, b) => a - b);
      const isNow = st.week >= p.weeks[0] && st.week <= p.weeks[1];
      return h('details', { class: `card phase ${isNow ? 'now' : ''}`, open: isNow },
        h('summary', { class: 'row spread' }, h('div', null, h('div', { class: 'eyebrow dark' }, `Phase ${p.n} · weeks ${p.weeks[0]}–${p.weeks[1]}${isNow ? ' · you are here' : ''}`), h('h2', null, p.name), h('p', { class: 'sub', style: 'margin:2px 0 0' }, p.aim)), h('span', { class: 'chip grey' }, `${done}/${p.items.length}`)),
        weeks.map((w) => h('div', { class: 'wk' }, h('div', { class: `wk-h ${w === st.week ? 'now' : ''}` }, `Week ${w}${w === st.week ? ' · this week' : ''}`), p.items.filter((i) => i.week === w).map((it) => itemRow(it, { readOnly, compact: false })))));
    })),
  ];
  const trainingHead = h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'My training'), h('p', null, `Week ${st.week} of ${st.weeks} · ${myDone} of ${mySteps.length} steps done`)));

  if (part === 'training') return h('div', { class: 'page prog training' }, banner, trainingHead, ...training);
  if (part === 'all') return h('div', { class: 'page prog' }, banner, ...home, h('h2', { class: 'sec-h' }, 'Training'), ...training);
  return h('div', { class: 'page prog home' }, banner, ...home);
}

const stat = (label, value, note, keep) => h('div', { class: 'card kpi' }, h('div', { class: 'label' }, label), h('div', { class: 'value' }, value), h('div', { class: keep ? 'note keep' : 'note' }, note));

// ------------------------------------------------------------------ module / lesson page
export function moduleView(m, { mode = 'trainee', planItems = [], onDone } = {}) {
  const admin = mode === 'admin';
  const mine = planItems.filter((i) => i.module === m.key);
  const why = mine.find((i) => i.why && i.kind === 'lesson')?.why || mine.find((i) => i.why)?.why;
  const reviewKey = m.reviewKey || null;
  const practiceItem = mine.find((i) => i.kind === 'practice');
  const lessonItem = mine.find((i) => i.kind === 'lesson');

  const markBtn = (it, label) => {
    if (!it || admin) return null;
    if (it.done) return h('span', { class: 'chip green' }, 'Done');
    const note = h('textarea', { rows: 2, placeholder: it.kind === 'practice' ? 'One line on what you did or learned (your KUDO Trainer sees this)' : 'Optional note' });
    return h('div', { class: 'stack', style: 'margin-top:10px' }, note, h('button', { class: 'btn primary', on: { click: async () => { try { await api('POST', `/api/me/items/${it.key}/done`, { note: note.value }); toast('Nice work. Ticked off.'); onDone?.(); } catch (e) { toast(e.message, true); } } } }, label));
  };

  // Check: a fresh random draw of mixed formats each time.
  const quizBox = h('div');
  const fbBox = h('div');
  const drawQuiz = async (fresh) => {
    let items = m.check;
    if (fresh && !admin) { try { items = (await api('GET', `/api/me/modules/${m.key}`)).check; } catch { /* keep */ } }
    quizBox.replaceChildren(checkForm(items, { url: `/api/me/modules/${m.key}/attempt`, itemKey: reviewKey, certainty: true, onResult: (r, its) => {
      quizBox.replaceChildren(resultView(r, its, { pass: m.pass || 0.8, baseline: m.key === 'baseline', onRetry: () => drawQuiz(true) }));
      if (m.key !== 'baseline' && !m.feedbackGiven && !admin) fbBox.replaceChildren(feedbackCard(m.key));
    } }));
  };
  if (admin) {
    const LVL = { recall: 'Recall', apply: 'Apply', decide: 'Decide' };
    const tagged = m.pool.filter((x) => x.obj != null);
    const cover = (m.objectives || []).map((o, oi) => ({ o, n: tagged.filter((x) => x.obj === oi).length }));
    quizBox.append(h('p', { class: 'muted small' }, `Pool of ${m.pool.length} items (${m.pool.filter((x) => x.reserve).length} kept back for the next cycle); each attempt draws ${Math.min(6, m.pool.filter((x) => !x.reserve).length)}, with at least one of each format.`),
      tagged.length ? h('div', { class: 'note-box' }, h('b', null, 'Objective coverage (tagged questions)'), h('ul', { class: 'ans-list' }, cover.map((c, ci) => h('li', null, `O${ci + 1} · ${c.o} `, h('span', { class: `chip ${c.n ? 'green' : 'coral'}` }, c.n ? `${c.n}` : 'no question'))))) : null,
      ...m.pool.map((x, i) => h('div', { class: 'qq' }, h('b', null, `${i + 1}. ${x.q}`), h('span', { class: 'chip grey', style: 'margin-left:6px' }, { mcq: 'Single answer + certainty', multi: 'Pick all that fit', match: 'Match', order: 'Order' }[x.t]),
        x.obj != null ? h('span', { class: 'chip grey', style: 'margin-left:4px' }, `O${x.obj + 1} · ${LVL[x.lvl] || ''}`) : null,
        x.reserve ? h('span', { class: 'chip amber', style: 'margin-left:4px' }, 'Next cycle') : null,
        x.field ? h('span', { class: 'chip blue', style: 'margin-left:4px' }, 'From a session') : null,
        x.obj != null ? h('span', { class: 'chip coral', style: 'margin-left:4px', title: 'Drafted from the lesson content; your KUDO Trainer checks before the January cycle.' }, 'New: to check') : null,
        x.t === 'mcq' || x.t === 'multi' ? h('ul', null, x.o.map((o, oi) => h('li', { class: (x.t === 'mcq' ? x.a === oi : x.a.includes(oi)) ? 'right' : '' }, o))) : null,
        x.t === 'match' ? h('ul', null, x.pairs.map((p) => h('li', null, `${p[0]} → `, h('b', null, p[1])))) : null,
        x.t === 'order' ? h('ol', null, x.steps.map((st) => h('li', null, st))) : null,
        h('div', { class: 'why' }, x.why))));
  } else drawQuiz(false);
  const walkItem = mine.find((i) => i.kind === 'scenario');
  const walkCard = m.walkthrough || m.walkthroughFull ? h('div', { class: 'card', style: 'margin-top:16px' }, h('div', { class: 'eyebrow dark' }, 'Decide'), h('h2', null, `Walkthrough: ${(m.walkthrough || m.walkthroughFull).title}`),
    admin ? h('div', null, h('p', null, m.walkthroughFull.intro), m.walkthroughFull.steps.map((st, si) => h('div', { class: 'qq' }, h('b', null, `${si + 1}. ${st.text}`), h('ul', null, st.choices.map((c) => h('li', null, h('span', { class: `chip ${['coral', 'amber', 'green'][c.q]}` }, ['Wrong', 'OK', 'Best'][c.q]), ' ', c.t, h('div', { class: 'muted small' }, c.fb)))))))
      : walkthroughCard(m.key, m.walkthrough, { done: !!(walkItem?.done || m.walkAttempts?.length) })) : null;
  const ex = m.explain || m.explainFull;
  const explainBox = ex ? h('div', { class: 'card', style: 'margin-top:16px' }, h('div', { class: 'eyebrow dark' }, 'Explain it'), h('h2', null, 'Say it like you would to the client'),
    admin ? h('div', null, h('div', { class: 'explain-prompt' }, ex.prompt), h('b', null, 'Key points'), h('ul', null, ex.points.map((p) => h('li', null, p)))) : explainCard(m.key, ex, m.submissions || [], m.rubric || [], { onDone })) : null;

  const rec = (m.attempts || []).filter((a) => a.counts !== false && !(a.item_key || '').startsWith('review.')).slice(-1)[0];
  const last = rec;
  return h('div', { class: 'page lesson' },
    h('a', { href: admin ? '#curriculum' : '#training', class: 'muted' }, admin ? '← Curriculum' : '← My training'),
    h('div', { class: 'page-head', style: 'margin-top:8px' }, h('div', null,
      h('div', { class: 'row' }, m.depth ? h('span', { class: 'chip blue' }, `Depth: ${DEPTH_LABEL[m.depth]}`) : null, m.minutes ? h('span', { class: 'chip grey' }, `About ${m.minutes} min`) : null, m.scenarioLabel ? h('span', { class: 'chip grey' }, m.scenarioLabel) : null, m.delivery && m.delivery !== 'both' ? h('span', { class: 'chip grey' }, m.delivery === 'ai' ? 'AI Translation' : 'Human Interpretation') : null),
      h('h1', { style: 'margin-top:8px' }, m.title), h('p', null, m.summary))),
    why || reviewKey ? h('div', { class: 'card why-card' }, h('b', null, reviewKey ? 'Spaced review. ' : 'Why this is in your plan. '), reviewKey ? 'Retrieve it from memory first, then check. A pass here completes the review.' : why) : null,
    m.key === 'baseline' ? null : h('div', { class: 'grid g-8-4' },
      h('div', { class: 'stack' },
        h('div', { class: 'card' }, h('h2', null, 'By the end you can'), h('ol', { class: 'obj' }, m.objectives.map((o) => h('li', null, o)))),
        h('div', { class: 'card lesson-card' }, h('div', { class: 'eyebrow dark' }, 'Step 1 · Learn'), h('h2', null, 'The lesson'),
          videoBlock(m, admin),
          updatesBlock(m.updates, Object.keys(m.updatedLines || {}).length),
          m.sections.map((s, si) => h('details', { class: 'les', open: si === 0 || s.points.some((_, pi) => m.updatedLines?.[`${si}.${pi}`]) }, h('summary', null, h('h3', null, s.title), h('span', { class: 'les-n' }, `${s.points.length}`)), h('ul', null, s.points.map((p, pi) => { const u = m.updatedLines?.[`${si}.${pi}`]; return h('li', { class: u ? 'upd' : null }, p, u ? h('span', { class: 'upd-tag', title: `Changed with ${u.release || 'a release'}` }, 'Updated') : null); })))),
          m.faq?.length ? h('div', { class: 'faq' }, h('h3', null, 'Asked in sessions'), m.faq.map((f) => h('details', null, h('summary', null, f.question), h('p', null, f.answer)))) : null,
          m.caseStudy ? h('div', { class: 'case' }, h('h3', null, 'Worked example'), h('p', null, m.caseStudy.example), h('div', { class: 'muted small' }, 'An illustrative case built from the lesson')) : null,
          m.caseStudy?.mistakes?.length ? h('div', { class: 'mistakes' }, h('h3', null, 'Common mistakes'), h('ul', null, m.caseStudy.mistakes.map((x) => h('li', null, x)))) : null,
          lessonItem ? markBtn(lessonItem, 'I have worked through the lesson') : null),
        (m.practiceTask || m.practiceFull) ? h('div', { class: 'card practice-card' }, h('div', { class: 'eyebrow dark' }, 'Step 2 · Practise'), h('h2', null, 'Do it for real'),
          practiceItem?.done ? h('div', { class: 'ok', style: 'margin-bottom:8px' }, practiceItem.signed_off ? 'Practice passed and signed off' : 'Practice done') : !practiceItem && !admin ? h('p', { class: 'muted small' }, 'Optional for you: not in your plan') : null,
          admin ? h('div', null, h('div', { class: 'explain-prompt' }, m.practiceFull.prompt), h('div', { class: 'muted small' }, `Format: ${{ write: 'written', speak: 'spoken', steps: 'step-by-step account' }[m.practiceFull.type]}. Reviewed automatically.`), h('b', null, 'Key points'), h('ul', null, m.practiceFull.points.map((p) => h('li', null, p))))
            : SANDBOX_FOR[m.key] && !sbxReplaces(m.key) ? h('div', null, sandboxBlock(m.key), h('h3', { class: 'sbx-then' }, 'Then the written task'), explainCard(m.key, m.practiceTask, m.practiceSubmissions || [], m.rubric || [], { onDone, kind: 'practice', type: m.practiceTask.type }))
            : SANDBOX_FOR[m.key] ? h('div', null, sandboxBlock(m.key), h('details', { class: 'sbx-old' }, h('summary', null, 'Or describe what you did in a test account'), explainCard(m.key, m.practiceTask, m.practiceSubmissions || [], m.rubric || [], { onDone, kind: 'practice', type: m.practiceTask.type })))
            : explainCard(m.key, m.practiceTask, m.practiceSubmissions || [], m.rubric || [], { onDone, kind: 'practice', type: m.practiceTask.type }),
          m.practice?.length ? h('details', { style: 'margin-top:12px' }, h('summary', null, 'More ways to practise (optional)'), h('ol', { class: 'obj' }, m.practice.map((p) => h('li', null, p)))) : null) : null),
      h('div', { class: 'stack' },
        h('div', { class: 'card' }, h('h2', null, 'Go deeper'), h('p', { class: 'sub' }, 'Videos, the CM Onboarding Guide and the Help Center'),
          m.learn.map((r) => h('a', { class: 'res', href: r.url, target: '_blank', rel: 'noopener noreferrer' }, h('span', { class: `chip ${r.type === 'video' ? 'coral' : r.type === 'guide' ? 'amber' : 'blue'}` }, { video: 'Video', guide: 'Guide', article: 'Help Center' }[r.type]), h('span', null, r.title, r.note ? h('span', { class: 'muted small' }, ` · ${r.note}`) : null)))),
        h('div', { class: 'card' }, h('h2', null, 'When to hand over'), h('ul', { class: 'esc' }, m.escalate.map((e) => h('li', null, e)))))),
    h('div', { class: 'card check-card', style: 'margin-top:16px' }, h('div', { class: 'eyebrow dark' }, m.key === 'baseline' ? 'Baseline' : 'Step 3 · Check'), h('div', { class: 'row spread' }, h('h2', null, m.key === 'baseline' ? 'One question per scenario' : 'Prove it'), last ? h('span', { class: 'chip blue' }, `Recorded score ${Math.round((last.correct / last.total) * 100)}% · ${fmtDate(last.created_at)}`) : null),
      h('p', { class: 'sub' }, m.key === 'baseline' ? 'No pass mark: answer honestly, it aims your plan at the right gaps.' : last ? 'Your recorded score is from your first attempt. Retakes are for practice: a new mix of questions each time, and they do not change your score.' : `Your first attempt is the score we keep, so take your time (aim for ${Math.round((m.pass || 0.8) * 100)}%). After that, retake it as often as you like to practise.`), !last && !admin ? warmUp() : null, quizBox),
    walkCard, explainBox, fbBox,
  );
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
  return h('div', { class: 'page lesson' }, h('a', { href: '#training', class: 'muted' }, '← My training'),
    h('div', { class: 'page-head', style: 'margin-top:8px' }, h('div', null, h('h1', null, 'The questions you missed in October'), h('p', null, 'Say your answer out loud first, then reveal. Retrieval is what makes it stick.'))),
    h('div', { class: 'card' }, list.length ? list.map((x) => { const a = h('div', { class: 'a', hidden: true }, 'Answer: ', x.answer || '–'); return h('div', { class: 'q-item' }, h('b', null, `Q${x.qnum}. ${x.question}`), h('div', null, h('button', { class: 'btn sm', style: 'margin-top:6px', on: { click: (e) => { a.hidden = false; e.target.remove(); } } }, 'Reveal answer')), a); }) : h('div', { class: 'ok' }, 'No missed questions on record.'),
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
/** "New in KUDO": the latest release, changes that touch your focus scenarios first. Loads on its own. */
function whatsNewCard(st) {
  const box = h('section', { class: 'card wn-card', hidden: true });
  const focus = new Set(st.levels.filter((l) => l.focus).map((l) => l.scenario));
  const shortOf = (s) => st.levels.find((l) => l.scenario === s)?.short;
  api('GET', '/api/me/whats-new').then(({ updates }) => {
    if (!updates.length) return;
    const latest = updates[0].release_id, rel = updates.filter((u) => u.release_id === latest);
    const mine = (u) => u.modules.some((m) => focus.has(m.scenario));
    rel.sort((a, b) => Number(mine(b)) - Number(mine(a)));
    const row = (u) => h('li', { class: mine(u) ? 'mine' : null },
      h('span', { class: `wn-k ${u.kind}` }, RKIND[u.kind] || 'Changed'),
      h('div', null, h('div', { class: 'wn-t' }, u.modules[0] ? h('a', { href: `#module-${u.modules[0].key}` }, u.title) : u.title,
        mine(u) ? h('span', { class: 'chip coral' }, `Your focus: ${u.modules.filter((m) => focus.has(m.scenario)).map((m) => shortOf(m.scenario)).join(', ')}`) : null),
        h('p', null, u.body)));
    const list = h('ul', { class: 'wn-list' }, rel.slice(0, 4).map(row));
    const more = rel.length > 4 ? h('button', { class: 'btn sm', type: 'button', on: { click: () => { list.replaceChildren(...rel.map(row)); more.remove(); } } }, `Show all ${rel.length} changes`) : null;
    const n = rel.filter(mine).length;
    box.replaceChildren(h('div', { class: 'row spread' }, h('div', null, h('h2', null, 'New in KUDO'), h('p', { class: 'sub', style: 'margin:2px 0 0' }, `Released ${fmtDate(rel[0].released_on)} · ${rel.length} change${rel.length > 1 ? 's' : ''}${n ? `, ${n} in your focus areas` : ''}. Open one to see it in its lesson`))), list, more);
    box.hidden = false;
  }).catch(() => {});
  return box;
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
    last.replaceChildren(h('b', null, `Result of record: ${rec.score}%`), rec.score >= 80 ? h('span', { class: 'chip green', style: 'margin-left:8px' }, 'Passed') : h('span', { class: 'chip amber', style: 'margin-left:8px' }, 'Below 80%'), runs.length > 1 ? ` · ${runs.length - 1} practice run${runs.length > 2 ? 's' : ''}, best ${Math.max(...runs.map((r) => r.score))}%` : '');
  }).catch(() => {});
  return h('div', { class: 'sbx-entry' },
    h('div', null, h('span', { class: 'chip blue' }, 'Sandbox'), h('h3', null, `Scenario ${sc.num}: ${sc.title}`), h('p', { class: 'sbx-req', title: sc.request }, sc.request),
      h('div', { class: 'row', style: 'gap:6px;margin-top:6px' }, h('span', { class: 'chip grey' }, 'Replica of the KUDO screens'), h('span', { class: 'chip grey' }, 'Scored'), h('span', { class: 'chip grey' }, 'First run counts'),
        tipI('Everything you click is recorded: you get a score (outcome, path, time), your path next to the expert\'s, and what you missed. Your first run is your result of record' + (sc.replaces ? '; passing it (80%) signs this practice off.' : replaced ? '.' : '. The written task below is still part of this step.'))), last),
    h('a', { class: 'btn primary', href: `#sandbox-${key}` }, 'Open the sandbox'));
}
