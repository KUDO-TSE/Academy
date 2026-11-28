// Guided tour: a short, role-based walk through the Academy Tracker.
// Shown automatically on the first sign-in (with Skip), then available any time from "Guided tour" in the menu.
// Each step can open a page (route), then highlights one element on it. When the element is not there (for example a
// trainee with no plan yet), the step shows as a centred card instead, so the tour never gets stuck.
import { h } from './ui.js';
import { kudogPuppet } from './kudog.js';

// ------------------------------------------------------------------ scripts
const TRAINEE = [
  { title: 'Woof! I am KUDOG', text: 'Your virtual coach, and your companion all the way through the KUDO Academy. This is your personal 12-week programme to master the KUDO client scenarios: what to set up yourself, what to hand over, and how to explain it to a client. It is self-paced, so work through it whenever suits you in the week. I will cheer every module you complete, show you your scores straight away, and when something is hard, help you train on it. Let me show you around: it takes about a minute.', center: true, mood: 'excited' },
  { route: 'programme', sel: '.prog .hero', title: 'Your goal and your progress', text: 'Your programme, built for you, with the goal set by your KUDO Trainer underneath, and how much of your plan is done. The pace tells you if you are on track for the 12 weeks.' },
  { route: 'programme', sel: '.roadmap-card', title: 'My 12-weeks program', text: 'Three months, each with its own colour and a short recap of what you learn. Your month is highlighted. Click a month to open it in My courses, week by week, with a Take the course button for each all-in-one course.' },
  { route: 'programme', sel: '.readiness-card', title: 'My Readiness, live', text: 'Your starting point is your October Self Assessment and knowledge test. Each time a test result moves one of your scenario levels, the line moves with it, and the latest changes are listed underneath.' },
  { route: 'programme', sel: '.levels-card', title: "My Knowledge's breakdown", text: 'Where you started, where you are now and your target for each scenario. Targets depend on your role: set it up yourself (80%) or hand it over (70%).' },
  { route: 'programme', sel: '.nav a[data-r="collection"]', title: 'Collect the cards', text: 'Your first card, First step, is waiting for you under My collection. Every other card is earned by working here: a phase cleared, a scenario at target, a module test passed, a sandbox exercise done well. They are yours to keep, and nobody else sees them.' },
  { route: 'programme', sel: '.nav a[data-r="news"]', title: 'KUDO News', text: 'Every KUDO release, newest first: a short summary to use with clients, then each change and the Academy module it updates.' },
  { route: 'training', sel: '.nav a[data-r="training"]', title: 'My courses: where you work', text: 'Every lesson, practice and check lives here: what is due this week first, then your whole plan, week by week.' },
  { route: 'training', sel: '.this-week', title: 'Start here every week', text: 'The steps due this week, with the time they take. Open one to learn, practise or take a check.' },
  { route: 'training', sel: '.focus-card', title: 'Your three focus areas', text: 'Picked from your results, your clients and the team priorities. You can swap the third one for another suggestion; your KUDO Trainer approves the change.' },
  { route: 'training', sel: '.challenge', title: 'Weekly challenge', text: 'Four mixed questions, two minutes, once a week. It keeps everything you have learned fresh, and it never changes your score.' },
  { route: 'module-foundations', sel: '.mtrack', title: 'Every module works the same way', text: 'In numbered steps: Learn (a short client story on slides, or One page), Practise (often in the sandbox, a replica of the KUDO screens and of the client\'s own tools, some starting with a client call), Decide, Explain it, then Prove it with the scored check. This tracker stays at the top: green is done, blue is up next, and a click takes you to the step. After each step I point you to the next one, and when the last is done I open your module recap by myself.' },
  { route: 'module-foundations', sel: '.check-card', title: 'Prove it', text: 'Your first attempt at a check is the score that counts for your learning curve. After that, retake it as often as you like: retakes are practice. Say honestly how sure you are: lucky guesses only count half.' },
  { route: 'programme', sel: '.nav a[data-r="results"]', title: 'Your results', text: 'Your score on every test: the module tests, decision walkthroughs, explain-it recordings and sandbox exercises you take here, then your October Self Assessment and knowledge test. Your first attempt is the result of record; retakes are practice.' },
  { route: 'programme', sel: '.nav a[data-r="progress"]', title: 'Your progress, live', text: 'How each test moves your level, up or down, scenario by scenario, against where you started in October. Lessons and practice never move it: only test results do.' },
  { route: 'programme', sel: '.co-fab', title: 'That is me: ask KUDOG', text: 'Click me any time. I answer from your own programme and results: what is next, when your sessions are, how you are progressing and how you are scored. For anything else, the second tab sends a question, remark or observation to your KUDO Trainer, and their reply comes back there.' },
  { route: 'programme', sel: '.nav .tour-link', title: 'Need a refresher?', text: 'Open this tour again from here at any time. Good luck, and enjoy the programme.' },
];

const ADMIN = [
  { title: 'Woof! I am KUDOG', text: 'The virtual coach of the KUDO Academy, and your guide to the admin side. Plans are built automatically from each trainee\'s results and your inputs; you approve them. Practice and recordings are reviewed by the system, so your time goes to coaching. Let me show you around: it takes about two minutes.', center: true, mood: 'excited' },
  { route: 'board', sel: '.nav a[data-r="board"]', title: 'My board: your week, organised', text: 'Everything that needs you: messages from trainees (reply from the card), plans to approve, sessions due, spot-checks, trainees to nudge (with a message ready to copy) and teach-back pairs. It suggests a week that fits your hours, and exports it to your calendar.' },
  { route: 'overview', sel: '.nav a[data-r="overview"]', title: 'Overview', text: 'The whole team at a glance: Self Assessment against the live test by scenario, the top training priorities, regions, and who has not taken the test yet.' },
  { route: 'team', sel: '.nav a[data-r="team"]', title: 'Team: one page per person', text: 'Open a trainee to see their results, their roadmap and readiness chart, and their plan. Log a 1:1 or a recording there (Inputs): it shapes their plan (levels move only with test results), and the plan updates as a draft.' },
  { route: 'programme', sel: '.nav a[data-r="programme"]', title: 'Programme: plans to approve', text: 'Every plan is a draft until you approve it, and so is every change to its structure. Check the differences, then approve one by one or all at once.' },
  { route: 'reviews', sel: '.nav a[data-r="reviews"]', title: 'Reviews: spot-checks only', text: 'Recordings and practice are reviewed automatically. You only see what was flagged, what a trainee asked you to look at, and a random 20% to keep the system honest.' },
  { route: 'releases', sel: '.nav a[data-r="imports"]', title: 'Imports: the Academy keeps learning', text: 'Three tabs. Results & rosters loads assessment rounds from CSV. Sessions takes your 1:1 and group recordings: the Academy finds the questions people asked and helps you turn them into FAQ entries and check questions. Release notes takes each KUDO release: it finds the lessons and questions the change affects, drafts the updates, and you apply them, or undo.' },
  { route: 'feedback', sel: '.nav a[data-r="feedback"]', title: 'Feedback and question quality', text: 'What trainees say about each module, which questions work and which need fixing, and how often the automatic review agrees with you.' },
  { route: 'curriculum', sel: '.nav a[data-r="curriculum"]', title: 'Curriculum', text: 'Every module, its lesson, questions and walkthrough. New questions are marked "New: to check". Paste each module\'s explainer video link here so it plays inside the lesson.' },
  { route: 'try', sel: '.nav a[data-r="try"]', title: 'Try as a trainee', text: 'Step into a test trainee to see and take the programme exactly as trainees do. Test trainees never count in any team figure.' },
  { route: 'board', sel: '.nav a[data-r="users"]', title: 'Users & access', text: 'Who can sign in. Add people, reset passwords and create test trainees that never count in team results.' },
  { route: 'board', sel: '.nav .tour-link', title: 'That is the tour', text: 'Open it again from here at any time. Trainees get their own tour the first time they sign in.' },
];

export const tourFor = (me) => (me.role === 'admin' && !me.actingAs ? ADMIN : TRAINEE);

// ------------------------------------------------------------------ engine
let active = null;

const waitFor = (sel, ms = 4000) => new Promise((resolve) => {
  const t0 = Date.now();
  const tick = () => {
    const el = sel && document.querySelector(sel);
    if (el && el.getBoundingClientRect().height > 0) return resolve(el);
    if (Date.now() - t0 > ms) return resolve(null);
    setTimeout(tick, 120);
  };
  tick();
});

/** Start the tour. go(route) changes the page; onEnd(completed) is called once, on Done or on Skip. */
export function startTour(steps, { go, onEnd } = {}) {
  if (active) active.close(false);
  let i = 0, closed = false;
  const shade = h('div', { class: 'tour-shade' });
  const spot = h('div', { class: 'tour-spot', hidden: true });
  const pop = h('div', { class: 'tour-pop', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tour-title' });
  const layer = h('div', { class: 'tour-layer' }, shade, spot, pop);
  document.body.append(layer);
  // KUDOG walks the trainee through: he sits in the card and reacts to each step.
  const dog = kudogPuppet({ size: 76, label: 'Pet KUDOG' }); dog.start();

  const close = (completed) => {
    if (closed) return; closed = true; active = null;
    window.removeEventListener('resize', place); window.removeEventListener('keydown', onKey, true); document.getElementById('main')?.removeEventListener('scroll', place);
    dog.stop(); layer.remove(); document.body.classList.remove('nav-open'); window.removeEventListener('scroll', place, true); onEnd?.(completed);
  };
  let target = null;
  function place() {
    if (closed) return;
    const s = steps[i];
    if (!target || s.center) {
      spot.hidden = true; shade.hidden = false; pop.classList.add('center'); pop.style.cssText = ''; return;
    }
    shade.hidden = true; spot.hidden = false; pop.classList.remove('center');
    const r = target.getBoundingClientRect(), pad = 8;
    Object.assign(spot.style, { transform: `translate(${r.left - pad}px, ${r.top - pad}px)`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
    const pw = Math.min(440, window.innerWidth - 24), ph = pop.offsetHeight || 220, vw = window.innerWidth, vh = window.innerHeight;
    if (vw <= 600) { // phones: the card sits at the bottom (or top, if the highlight is low on the screen)
      const low = r.top + r.height / 2 > vh / 2;
      pop.style.cssText = `left:12px;right:12px;width:auto;${low ? 'top:12px' : 'bottom:12px'}`; return;
    }
    let top, left;
    if (r.right + pad + 16 + pw < vw && r.width < vw * 0.5) { left = r.right + pad + 16; top = r.top; } // beside (nav items, small cards)
    else if (r.bottom + pad + 14 + ph < vh) { top = r.bottom + pad + 14; left = r.left; } // below
    else if (r.top - pad - 14 - ph > 0) { top = r.top - pad - 14 - ph; left = r.left; } // above
    else { top = vh - ph - 16; left = vw - pw - 16; } // large element: bottom right corner
    pop.style.cssText = `top:${Math.max(12, Math.min(top, vh - ph - 12))}px;left:${Math.max(12, Math.min(left, vw - pw - 12))}px;width:${pw}px`;
  }
  async function show(n) {
    i = Math.max(0, Math.min(n, steps.length - 1));
    const s = steps[i];
    pop.replaceChildren(h('div', { class: 'tour-loading' }, '…'));
    if (s.route && go) await go(s.route);
    // Phones: menu items live in the drawer (or the trainee tab bar); open what holds the step's target.
    let sel = s.sel;
    const small = window.innerWidth <= 860;
    if (small && sel && sel.startsWith('.nav ')) {
      const tab = sel.replace(/^\.nav /, '.tabbar ');
      if (document.querySelector(tab)?.getBoundingClientRect().height) { sel = tab; document.body.classList.remove('nav-open'); }
      else document.body.classList.add('nav-open');
    } else if (small) document.body.classList.remove('nav-open');
    target = s.center ? null : await waitFor(sel, 2500);
    if (closed) return;
    if (target) { const tall = target.getBoundingClientRect().height > window.innerHeight * (window.innerWidth <= 600 ? 0.45 : 0.6); target.scrollIntoView({ block: tall ? 'start' : 'center' }); if (tall) document.getElementById('main')?.scrollBy(0, -16); await new Promise((r) => setTimeout(r, 80)); }
    const last = i === steps.length - 1;
    pop.replaceChildren(
      h('div', { class: 'tour-head' }, h('span', { class: 'tour-count' }, `${i + 1} of ${steps.length}`), h('button', { class: 'tour-skip', type: 'button', on: { click: () => close(false) } }, last ? 'Close' : 'Skip tour')),
      h('div', { class: 'kd-says tour-kd' }, dog.el, h('div', { class: 'kd-bubble' }, h('h3', { id: 'tour-title' }, s.title), h('p', null, s.text))),
      h('div', { class: 'tour-dots', 'aria-hidden': 'true' }, steps.map((_, k) => h('i', { class: k === i ? 'on' : k < i ? 'past' : '' }))),
      h('div', { class: 'tour-actions' },
        i > 0 ? h('button', { class: 'btn sm', type: 'button', on: { click: () => show(i - 1) } }, 'Back') : h('span'),
        h('button', { class: 'btn sm primary tour-next', type: 'button', on: { click: () => (last ? close(true) : show(i + 1)) } }, last ? 'Done' : i === 0 ? 'Show me around' : 'Next')));
    place();
    dog.mood(s.mood || (last ? 'excited' : i % 2 ? 'listening' : 'tilt'));
    pop.querySelector('.tour-next')?.focus();
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(false); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); if (i < steps.length - 1) show(i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); if (i > 0) show(i - 1); }
  }
  window.addEventListener('resize', place); window.addEventListener('keydown', onKey, true); document.getElementById('main')?.addEventListener('scroll', place);
  window.addEventListener('scroll', place, true);
  active = { close };
  show(0);
  return active;
}
