import { h, api, toast, fmtDate, svg } from './ui.js';

// ------------------------------------------------------------------ shared bits
export const KIND_LABEL = { lesson: 'Lesson', practice: 'Practice', check: 'Check', review: 'Spaced review', baseline: 'Baseline check', one_to_one: 'With Jack', milestone: 'Milestone', missed: 'Review', teach: 'Teach-back' };
const KIND_CHIP = { lesson: 'blue', practice: 'amber', check: 'green', review: 'green', baseline: 'green', one_to_one: 'coral', milestone: 'coral', missed: 'blue', teach: 'amber' };
export const DEPTH_LABEL = { know: 'Know', setup: 'Set up', handover: 'Hand over' };
const BAND_CHIP = { ready: 'green', nearly: 'blue', developing: 'amber', gap: 'coral', none: 'grey' };
const SOURCE = { test: 'Knowledge test', estimated: 'Estimated', self: 'Self Assessment (estimate)', check: 'Updated by your checks', coach: 'Updated by Jack', none: 'No data yet' };
const check = () => svg('<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>');
const moduleTitle = (data, key) => data.modules.find((m) => m.key === key)?.title || key;
const first = (n) => String(n || '').split(' ')[0];

function itemHref(it) {
  if (it.kind === 'baseline') return '#module-baseline';
  if (it.kind === 'missed') return '#missed';
  if (it.module) return `#module-${it.module}${it.kind === 'review' ? `~${it.key}` : ''}`;
  return null;
}
const ACTION = { lesson: 'Open lesson', practice: 'Open task', check: 'Take the check', review: 'Take the review', baseline: 'Start', missed: 'Open', teach: 'Open' };

function itemRow(it, { readOnly, compact } = {}) {
  const href = itemHref(it);
  const status = it.done ? h('span', { class: 'tick done', 'aria-label': 'Done' }, check()) : h('span', { class: 'tick', 'aria-label': 'Not done yet' });
  return h('div', { class: `pi ${it.done ? 'done' : ''}` }, status,
    h('div', { class: 'pi-main' },
      h('div', { class: 'pi-t' }, href && !readOnly ? h('a', { href }, it.title) : it.title),
      h('div', { class: 'pi-meta' }, h('span', { class: `chip ${KIND_CHIP[it.kind] || 'grey'}` }, KIND_LABEL[it.kind] || it.kind), h('span', { class: 'muted small' }, `${it.minutes} min`),
        it.owner === 'jack' ? h('span', { class: 'muted small' }, 'Jack books this') : null, it.mandatory ? h('span', { class: 'muted small' }, 'Core') : null,
        it.best != null ? h('span', { class: 'muted small' }, `Best ${it.best}%`) : null, it.signoff && it.done ? h('span', { class: `chip ${it.signed_off ? 'green' : 'grey'}` }, it.signed_off ? 'Signed off' : 'Waiting for sign-off') : null, it.how ? h('span', { class: 'muted small' }, it.how) : null),
      !compact && it.why ? h('div', { class: 'pi-why' }, it.why) : null),
    href && !readOnly && !it.done && !compact ? h('a', { class: 'btn sm', href }, ACTION[it.kind] || 'Open') : null);
}

function levelBars(levels) {
  return h('div', { class: 'lv' },
    h('div', { class: 'lv-legend' }, h('span', null, h('i', { class: 'k-base' }), 'October start'), h('span', null, h('i', { class: 'k-now' }), 'Now'), h('span', null, h('i', { class: 'k-tgt' }), 'Your target')),
    levels.map((l) => h('div', { class: `lv-row ${l.focus ? 'focus' : ''}` },
      h('div', { class: 'lv-name' }, h('b', null, l.short), l.focus ? h('span', { class: 'chip coral' }, 'Focus') : null, h('span', { class: 'muted small' }, DEPTH_LABEL[l.depth] || '')),
      h('div', { class: 'lv-track', title: `${l.note}` },
        h('i', { class: 'lv-base', style: `width:${l.baseline}%` }), h('i', { class: 'lv-now', style: `width:${l.now}%` }), h('i', { class: 'lv-tgt', style: `left:${l.target}%` })),
      h('div', { class: 'lv-val' }, h('b', null, `${l.now}%`), h('span', { class: `chip ${BAND_CHIP[l.band.key]}` }, l.band.label)))));
}

function timeline(data, st) {
  const W = st.weeks;
  return h('div', { class: 'tl' },
    h('div', { class: 'tl-bar' }, data.phases.map((p) => h('div', { class: `tl-ph ${st.week >= p.weeks[0] && st.week <= p.weeks[1] ? 'on' : st.week > p.weeks[1] ? 'past' : ''}`, style: `flex:${p.weeks[1] - p.weeks[0] + 1}` },
      h('b', null, p.name), h('span', null, p.weeks[0] === p.weeks[1] ? `Week ${p.weeks[0]}` : `Weeks ${p.weeks[0]}–${p.weeks[1]}`))),
    h('i', { class: 'tl-you', style: `left:calc(${((st.week - 0.5) / W) * 100}% - 1px)` }, h('span', null, `You: week ${st.week}`))));
}

// ------------------------------------------------------------------ the programme page
export function programmeView(data, { readOnly = false, banner = null } = {}) {
  if (data.status === 'pending' || data.status === 'none') {
    return h('div', { class: 'page' }, banner,
      h('div', { class: 'page-head' }, h('div', null, h('h1', null, `Welcome, ${first(data.user?.name)}`), h('p', null, 'Your personal Academy programme.'))),
      h('div', { class: 'card empty' }, h('b', null, 'Your programme is being finalised'), 'Jack is reviewing the plan built from your October results. It will appear here as soon as it is approved. Meanwhile, your results are under My results.'));
  }
  const { plan, state: st, settings } = data;
  const focusRows = st.levels.filter((l) => l.focus);
  const paceChip = { on: ['green', 'On pace'], close: ['amber', 'Slightly behind pace'], behind: ['coral', 'Behind pace'] }[st.progress.pace];
  const byPhase = data.phases.map((p) => ({ ...p, items: st.items.filter((i) => i.phase === p.n) }));

  return h('div', { class: 'page prog' }, banner,
    h('section', { class: 'hero' },
      h('div', { class: 'hero-main' },
        h('div', { class: 'eyebrow' }, `${first(data.user.name)}'s KUDO Academy programme`),
        h('h1', null, settings.goal),
        h('div', { class: 'hero-meta' }, h('span', null, `Week ${st.week} of ${st.weeks}`), h('span', null, 'Self-paced: work through it any time in the week'), st.started_on ? h('span', null, `Started ${fmtDate(st.started_on)}`) : null),
        data.message ? h('div', { class: 'hero-msg' }, h('b', null, 'From Jack: '), data.message) : null),
      h('div', { class: 'hero-ring' }, h('div', { class: 'ring big', style: `--p:${st.progress.pct}`, role: 'img', 'aria-label': `${st.progress.pct}% of your plan done` }, h('b', null, `${st.progress.pct}%`)),
        h('div', null, `${st.progress.done} of ${st.progress.total} steps done`), h('span', { class: `chip ${paceChip[0]}` }, paceChip[1]))),

    h('section', { class: 'journey' },
      h('div', { class: 'card jr' }, h('div', { class: 'jr-k' }, '1 · Where you are now'), h('div', { class: 'jr-big' }, `${st.readiness.now}%`), h('div', { class: 'muted' }, `Average readiness across the 12 scenarios. Ready on ${st.readiness.ready} of ${st.readiness.of}.`),
        st.readiness.now !== st.readiness.start ? h('div', { class: 'small', style: 'margin-top:6px' }, `You started at ${st.readiness.start}%.`) : null,
        h('div', { class: 'jr-chips' }, focusRows.map((l) => h('span', { class: 'chip coral' }, `${l.short} ${l.now}%`)))),
      h('div', { class: 'card jr wide' }, h('div', { class: 'jr-k' }, '2 · Your next 12 weeks'), timeline(data, st),
        h('div', { class: 'jr-phases' }, data.phases.map((p) => h('div', null, h('b', null, p.name), h('span', { class: 'muted small' }, p.aim))))),
      h('div', { class: 'card jr' }, h('div', { class: 'jr-k' }, '3 · Where you will be'), h('div', { class: 'jr-big' }, `${st.readiness.end}%`), h('div', { class: 'muted' }, `Ready on all ${st.readiness.of} scenarios at your role's depth:`),
        h('ul', { class: 'jr-out' }, st.outcomes.map((o) => h('li', null, h('b', null, `${o.label}: `), o.can.toLowerCase(), ' — ', h('span', { class: 'muted' }, o.scenarios.join(', '))))))),

    h('div', { class: 'grid g-8-4', style: 'margin-top:16px' },
      h('div', { class: 'card' }, h('div', { class: 'row spread' }, h('h2', null, 'Up next'), h('span', { class: 'muted small' }, 'In the order of your plan')),
        st.next.length ? st.next.map((it) => itemRow(it, { readOnly })) : h('div', { class: 'ok', style: 'margin-top:10px' }, 'Everything on your side is done. Well done.'),
        st.jackNext.length ? h('div', { class: 'jack-next' }, h('b', null, 'Coming up with Jack: '), st.jackNext.map((i) => i.title).join(' · ')) : null),
      h('div', { class: 'card' }, h('h2', null, 'Why these three focus areas'), h('p', { class: 'sub' }, plan.focusPinned ? 'Chosen with Jack.' : 'Picked from your results, your clients and the team priorities.'),
        plan.focus.length ? plan.focus.map((s) => { const l = st.levels.find((x) => x.scenario === s); return h('div', { class: 'focus-why' }, h('div', { class: 'row spread' }, h('b', null, l.label), h('span', { class: `chip ${BAND_CHIP[l.band.key]}` }, `${l.now}% → ${l.target}%`)), h('div', { class: 'muted small' }, `Because ${plan.focusReasons[s]}.`)); }) : h('div', { class: 'muted' }, 'You are already at target on every scenario: your plan keeps it sharp and proves it.'),
        plan.tip ? h('div', { class: 'tip' }, h('b', null, 'How you like to learn: '), plan.tip) : null)),

    h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'Your level, scenario by scenario'), h('p', { class: 'sub' }, 'The light bar is where you started in October, the dark bar is where you are now, the line is your target. Targets depend on what your role needs: Set up 80%, Hand over 70%.'), levelBars(st.levels)),

    h('h2', { class: 'sec-h' }, 'Your plan, week by week'),
    h('div', { class: 'phases' }, byPhase.map((p) => {
      const done = p.items.filter((i) => i.done).length;
      const weeks = [...new Set(p.items.map((i) => i.week))].sort((a, b) => a - b);
      return h('div', { class: `card phase ${st.week >= p.weeks[0] && st.week <= p.weeks[1] ? 'now' : ''}` },
        h('div', { class: 'row spread' }, h('div', null, h('div', { class: 'eyebrow dark' }, `Phase ${p.n} · weeks ${p.weeks[0]}–${p.weeks[1]}`), h('h2', null, p.name), h('p', { class: 'sub', style: 'margin:2px 0 0' }, p.aim)), h('span', { class: 'chip grey' }, `${done}/${p.items.length}`)),
        weeks.map((w) => h('div', { class: 'wk' }, h('div', { class: `wk-h ${w === st.week ? 'now' : ''}` }, `Week ${w}${w === st.week ? ' · this week' : ''}`), p.items.filter((i) => i.week === w).map((it) => itemRow(it, { readOnly, compact: false })))));
    })),

    data.shared?.length ? h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'Notes from your sessions with Jack'), data.shared.map((n) => h('div', { class: 'note-box' }, h('b', null, n.title), h('div', null, n.text), h('div', { class: 'when' }, fmtDate(n.on))))) : null,
    h('p', { class: 'muted small', style: 'margin-top:18px' }, 'Your plan updates as you go: checks, practice and your sessions with Jack move your levels. When the plan itself needs to change, Jack reviews it first.'),
  );
}

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
    const note = h('textarea', { rows: 2, placeholder: it.kind === 'practice' ? 'One line on what you did or learned (Jack sees this)' : 'Optional note' });
    return h('div', { class: 'stack', style: 'margin-top:10px' }, note, h('button', { class: 'btn primary', on: { click: async () => { try { await api('POST', `/api/me/items/${it.key}/done`, { note: note.value }); toast('Nice work. Ticked off.'); onDone?.(); } catch (e) { toast(e.message, true); } } } }, label));
  };

  // Quiz
  const quizBox = h('div');
  const drawQuiz = () => {
    const picks = new Array(m.quiz.length).fill(null);
    const form = h('form', { class: 'quiz', novalidate: true, on: { submit: async (e) => {
      e.preventDefault();
      if (picks.some((p) => p == null)) return toast('Answer every question first.', true);
      try {
        const r = await api('POST', `/api/me/modules/${m.key}/attempt`, { answers: picks, item_key: reviewKey });
        showResult(r);
      } catch (err) { toast(err.message, true); }
    } } },
    m.quiz.map((x, qi) => h('fieldset', { class: 'qq' }, h('legend', null, `${qi + 1}. ${x.q}`), x.scenario && m.key === 'baseline' ? h('span', { class: 'chip grey' }, x.scenarioShort || x.scenario) : null,
      x.o.map((opt, oi) => h('label', { class: 'opt' }, h('input', { type: 'radio', name: `q${qi}`, value: oi, disabled: admin, checked: admin && x.a === oi, on: { change: () => { picks[qi] = oi; } } }), h('span', null, opt))),
      admin && x.why ? h('div', { class: 'why' }, x.why) : null)),
    admin ? null : h('button', { class: 'btn primary', type: 'submit' }, 'Check my answers'));
    quizBox.replaceChildren(form);
  };
  const showResult = (r) => {
    const pass = r.passed;
    quizBox.replaceChildren(h('div', null,
      h('div', { class: `result ${pass ? 'pass' : 'fail'}` }, h('div', { class: 'big' }, `${r.correct}/${r.total}`), h('div', null, h('b', null, m.key === 'baseline' ? 'Baseline recorded. Your plan has been updated.' : pass ? 'Passed. This module check is complete.' : `Not yet: you need ${Math.ceil(r.total * (m.pass || 0.8))} correct.`), h('div', { class: 'muted' }, r.planChanged ? 'Your results changed your levels. Jack will review any change to your plan.' : 'Your levels are updated.'))),
      r.results.map((x, i) => h('div', { class: `qres ${x.ok ? 'qres-ok' : 'qres-no'}` }, h('b', null, `${i + 1}. ${m.quiz[i].q}`), h('div', null, x.ok ? 'Correct: ' : `Your answer: ${m.quiz[i].o[x.choice]}. Correct: `, h('b', null, m.quiz[i].o[x.a])), h('div', { class: 'muted small' }, x.why))),
      h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: 'btn', on: { click: drawQuiz } }, pass ? 'Try again for practice' : 'Try again'), h('a', { class: 'btn', href: '#programme' }, 'Back to my programme'))));
    onDone?.({ silent: true });
  };
  drawQuiz();

  const last = m.attempts?.[0];
  return h('div', { class: 'page lesson' },
    h('a', { href: admin ? '#curriculum' : '#programme', class: 'muted' }, admin ? '← Curriculum' : '← My programme'),
    h('div', { class: 'page-head', style: 'margin-top:8px' }, h('div', null,
      h('div', { class: 'row' }, m.depth ? h('span', { class: 'chip blue' }, `Depth: ${DEPTH_LABEL[m.depth]}`) : null, m.minutes ? h('span', { class: 'chip grey' }, `About ${m.minutes} min`) : null, m.scenarioLabel ? h('span', { class: 'chip grey' }, m.scenarioLabel) : null, m.delivery && m.delivery !== 'both' ? h('span', { class: 'chip grey' }, m.delivery === 'ai' ? 'AI Translation' : 'Human Interpretation') : null),
      h('h1', { style: 'margin-top:8px' }, m.title), h('p', null, m.summary))),
    why || reviewKey ? h('div', { class: 'card why-card' }, h('b', null, reviewKey ? 'Spaced review. ' : 'Why this is in your plan. '), reviewKey ? 'Retrieve it from memory first, then check. A pass here completes the review.' : why) : null,
    m.key === 'baseline' ? null : h('div', { class: 'grid g-8-4' },
      h('div', { class: 'stack' },
        h('div', { class: 'card' }, h('h2', null, 'By the end you can'), h('ol', { class: 'obj' }, m.objectives.map((o) => h('li', null, o)))),
        h('div', { class: 'card' }, h('div', { class: 'eyebrow dark' }, 'Step 1 · Learn'), h('h2', null, 'The lesson'),
          m.sections.map((s) => h('div', { class: 'les' }, h('h3', null, s.title), h('ul', null, s.points.map((p) => h('li', null, p))))),
          lessonItem ? markBtn(lessonItem, 'I have worked through the lesson') : null),
        m.practice?.length ? h('div', { class: 'card' }, h('div', { class: 'eyebrow dark' }, 'Step 2 · Practise'), h('h2', null, 'Do it for real'), h('ol', { class: 'obj' }, m.practice.map((p) => h('li', null, p))),
          practiceItem?.signoff ? h('p', { class: 'muted small' }, 'This practice is signed off by Jack.') : null, practiceItem ? markBtn(practiceItem, 'I have done the practice') : h('p', { class: 'muted small' }, 'Optional for you: not in your plan.')) : null),
      h('div', { class: 'stack' },
        h('div', { class: 'card' }, h('h2', null, 'Go deeper'), h('p', { class: 'sub' }, 'Videos, the CM Onboarding Guide and the Help Center.'),
          m.learn.map((r) => h('a', { class: 'res', href: r.url, target: '_blank', rel: 'noopener noreferrer' }, h('span', { class: `chip ${r.type === 'video' ? 'coral' : r.type === 'guide' ? 'amber' : 'blue'}` }, { video: 'Video', guide: 'Guide', article: 'Help Center' }[r.type]), h('span', null, r.title, r.note ? h('span', { class: 'muted small' }, ` · ${r.note}`) : null)))),
        h('div', { class: 'card' }, h('h2', null, 'When to hand over'), h('ul', { class: 'esc' }, m.escalate.map((e) => h('li', null, e)))))),
    h('div', { class: 'card', style: 'margin-top:16px' }, h('div', { class: 'eyebrow dark' }, m.key === 'baseline' ? 'Baseline' : 'Step 3 · Check'), h('div', { class: 'row spread' }, h('h2', null, m.key === 'baseline' ? 'One question per scenario' : 'Prove it'), last ? h('span', { class: 'muted small' }, `Last attempt ${last.correct}/${last.total} · ${fmtDate(last.created_at)}`) : null),
      h('p', { class: 'sub' }, m.key === 'baseline' ? 'No pass mark: answer honestly, it aims your plan at the right gaps.' : `Pass with ${Math.round((m.pass || 0.8) * 100)}%. You see why each answer is right straight after.`), quizBox),
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
  return h('div', { class: 'page lesson' }, h('a', { href: '#programme', class: 'muted' }, '← My programme'),
    h('div', { class: 'page-head', style: 'margin-top:8px' }, h('div', null, h('h1', null, 'The questions you missed in October'), h('p', null, 'Say your answer out loud first, then reveal. Retrieval is what makes it stick.'))),
    h('div', { class: 'card' }, list.length ? list.map((x) => { const a = h('div', { class: 'a', hidden: true }, 'Answer: ', x.answer || '–'); return h('div', { class: 'q-item' }, h('b', null, `Q${x.qnum}. ${x.question}`), h('div', null, h('button', { class: 'btn sm', style: 'margin-top:6px', on: { click: (e) => { a.hidden = false; e.target.remove(); } } }, 'Reveal answer')), a); }) : h('div', { class: 'ok' }, 'No missed questions on record.'),
      it && !readOnly ? h('div', { style: 'margin-top:14px' }, it.done ? h('span', { class: 'chip green' }, 'Done') : h('button', { class: 'btn primary', on: { click: async () => { await api('POST', '/api/me/items/missed/done', {}); toast('Ticked off.'); rerender(); } } }, 'I have gone through them all')) : null));
}
