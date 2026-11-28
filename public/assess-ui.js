import { h, api, toast, fmtDate, mark } from './ui.js';

const CERT = [[1, 'Guessing'], [2, 'Fairly sure'], [3, 'Certain']];
const pctOf = (a, b) => Math.round((a / b) * 100);

// ------------------------------------------------------------------ mixed-format check
/** items: public items from the server. opts: { url, itemKey, onResult, title } */
export function checkForm(items, { url, itemKey, onResult, submitLabel = 'Check my answers', certainty = true } = {}) {
  const state = items.map((x) => ({ id: x.id, k: x.k, v: x.t === 'multi' ? [] : x.t === 'order' ? [...x.steps] : x.t === 'match' ? x.lefts.map(() => '') : null, c: null }));
  const box = h('form', { class: 'quiz', novalidate: true });
  const renderItem = (x, i) => {
    const st = state[i];
    const head = h('legend', null, `${i + 1}. ${x.q}`);
    const tag = { mcq: null, multi: x.pick ? `Pick ${x.pick}, a wrong pick cancels a right one` : 'Pick all that fit, wrong picks cancel right ones', match: 'Match each one', order: 'Put in order' }[x.t];
    let body;
    if (x.t === 'mcq') body = x.o.map((opt, oi) => h('label', { class: 'opt' }, h('input', { type: 'radio', name: `q${i}`, on: { change: () => { st.v = oi; } } }), h('span', null, opt)));
    else if (x.t === 'multi') body = x.o.map((opt, oi) => h('label', { class: 'opt' }, h('input', { type: 'checkbox', on: { change: (e) => { st.v = e.target.checked ? [...st.v, oi] : st.v.filter((z) => z !== oi); } } }), h('span', null, opt)));
    else if (x.t === 'match') body = h('div', { class: 'match' }, x.lefts.map((l, li) => h('label', { class: 'match-row' }, h('span', null, l), h('select', { 'aria-label': l, on: { change: (e) => { st.v[li] = e.target.value; } } }, h('option', { value: '' }, 'Choose…'), x.rights.map((r) => h('option', { value: r }, r))))));
    else if (x.t === 'order') {
      const list = h('ol', { class: 'order' });
      const draw = () => list.replaceChildren(...st.v.map((step, si) => h('li', null, h('span', null, step), h('span', { class: 'ord-btns' },
        h('button', { type: 'button', class: 'btn sm', 'aria-label': `Move "${step}" up`, disabled: si === 0, on: { click: () => { [st.v[si - 1], st.v[si]] = [st.v[si], st.v[si - 1]]; draw(); } } }, '↑'),
        h('button', { type: 'button', class: 'btn sm', 'aria-label': `Move "${step}" down`, disabled: si === st.v.length - 1, on: { click: () => { [st.v[si + 1], st.v[si]] = [st.v[si], st.v[si + 1]]; draw(); } } }, '↓')))));
      draw(); body = list;
    }
    const cert = x.t === 'mcq' && certainty ? h('div', { class: 'cert' }, h('span', { class: 'muted small' }, 'How sure are you?'), CERT.map(([c, l]) => h('label', { class: 'cert-pill' }, h('input', { type: 'radio', name: `c${i}`, on: { change: () => { st.c = c; } } }), h('span', null, l)))) : null;
    return h('fieldset', { class: 'qq' }, head, tag ? h('div', { class: 'muted small', style: 'margin:-2px 0 6px' }, tag) : null, body, cert);
  };
  box.append(...items.map(renderItem),
    certainty && items.some((x) => x.t === 'mcq') ? h('p', { class: 'muted small' }, 'Being honest about how sure you are pays: a certain wrong answer costs more than a guess, and lucky guesses only count half towards your level.') : null,
    h('button', { class: 'btn primary', type: 'submit' }, submitLabel));
  box.addEventListener('submit', async (e) => {
    e.preventDefault();
    for (const [i, x] of items.entries()) {
      const st = state[i];
      if (x.t === 'mcq' && st.v == null) return toast(`Answer question ${i + 1}.`, true);
      if (x.t === 'mcq' && certainty && st.c == null) return toast(`Say how sure you are on question ${i + 1}.`, true);
      if (x.t === 'match' && st.v.some((v) => !v)) return toast(`Match every line in question ${i + 1}.`, true);
    }
    try { onResult(await api('POST', url, { answers: state.map((s) => ({ id: s.id, k: s.k, v: s.v, c: s.c ?? 2 })), item_key: itemKey || null }), items); }
    catch (err) { toast(err.message, true); }
  });
  return box;
}

export function resultView(r, items, { pass = 0.8, baseline = false, onRetry, footer } = {}) {
  const acc = pctOf(r.correct, r.total); const passed = baseline || r.passed;
  const certMsg = r.cbm == null ? null : r.cbm >= 2 ? 'You knew what you knew: your certainty matched your answers well.' : r.cbm >= 0.5 ? 'Reasonable judgement of what you know. Look at the answers you were unsure of.' : 'Your certainty did not match your answers. Review the ones you were sure of but got wrong.';
  const ansText = (x, res) => {
    if (res.t === 'mcq') return h('div', null, 'Correct: ', h('b', null, res.correct.o[res.correct.a]), res.conf ? h('span', { class: 'muted small sep-l' }, `you said: ${CERT.find((c) => c[0] === res.conf)[1].toLowerCase()}`) : null);
    if (res.t === 'multi') return h('div', null, 'All that fit: ', h('b', null, res.correct.a.map((i) => res.correct.o[i]).join(', ')));
    if (res.t === 'match') return h('ul', { class: 'ans-list' }, res.correct.pairs.map((p) => h('li', null, `${p[0]} → `, h('b', null, p[1]))));
    if (res.t === 'order') return h('ol', { class: 'ans-list' }, res.correct.steps.map((s) => h('li', null, s)));
    return null;
  };
  return h('div', null,
    h('div', { class: `result ${passed ? 'pass' : 'fail'}` }, h('div', { class: 'big' }, `${acc}%`),
      h('div', null, h('b', null, baseline ? (r.counts === false ? 'Practice round' : 'Baseline recorded. Your plan uses it from now on.') : passed ? 'Passed' : `Below ${Math.round(pass * 100)}%: worth practising.`),
        r.counts === false && r.record ? h('div', { class: 'practice-note' }, `Practice round: your recorded score stays ${Math.round((r.record.correct / r.record.total) * 100)}% from your first attempt.`) : r.counts ? h('div', { class: 'practice-note rec' }, 'This is your recorded score. Retake it any time to practise; it will not change.') : null,
        certMsg ? h('div', { class: 'muted' }, certMsg) : null,
        r.confidentWrong ? h('div', { class: 'small', style: 'color:var(--danger);margin-top:4px' }, `${r.confidentWrong} answer${r.confidentWrong > 1 ? 's' : ''} you were certain of ${r.confidentWrong > 1 ? 'were' : 'was'} wrong: worth a second look.`) : null)),
    r.results.map((res, i) => h('div', { class: `qres ${res.score >= 0.999 ? 'qres-ok' : res.score > 0 ? 'qres-part' : 'qres-no'} ${res.confidentWrong ? 'cw' : ''}` },
      h('b', null, `${i + 1}. ${res.q}`), res.score > 0 && res.score < 0.999 ? h('span', { class: 'chip amber', style: 'margin-left:6px' }, `${Math.round(res.score * 100)}%`) : null,
      ansText(items[i], res), res.why ? h('div', { class: 'muted small' }, res.why) : null)),
    footer || onRetry ? h('div', { class: 'row result-foot', style: 'margin-top:12px' }, onRetry ? h('button', { class: 'btn', on: { click: onRetry } }, 'Practise with a new set of questions') : null, footer || h('a', { class: 'btn', href: '#training' }, 'Back to my plan')) : null);
}

// ------------------------------------------------------------------ decision walkthrough
export function walkthroughCard(moduleKey, w, { done, onEnd } = {}) {
  const box = h('div');
  const path = [], keys = [];
  const start = async () => {
    path.length = 0; keys.length = 0;
    // A fresh shuffle for every play: the first step comes from the server again.
    let first = w.first;
    try { const fresh = await api('GET', `/api/me/modules/${moduleKey}/walk`); if (fresh?.first) first = fresh.first; } catch { /* keep the one we have */ }
    draw({ next: first, done: [] });
  };
  const draw = (r) => {
    box.replaceChildren(...[
      h('div', { class: 'walk-intro' }, w.intro),
      ...r.done.map((d) => h('div', { class: `walk-step q${d.quality}` }, h('div', { class: 'muted small' }, d.step), h('div', null, h('b', null, 'You: '), d.chose), h('div', { class: 'walk-fb' }, d.fb), d.best ? h('div', { class: 'small' }, h('b', null, 'Best move: '), d.best) : null)),
      r.next ? h('div', { class: 'walk-now' }, h('b', null, r.next.text), r.next.choices.map((c, ci) => h('button', { class: 'walk-choice', type: 'button', on: { click: async () => {
        path.push(ci); keys.push(r.next.k);
        try { const res = await api('POST', `/api/me/modules/${moduleKey}/walk`, { path, keys }); draw(res); if (res.end) onEnd?.(); } catch (e) { path.pop(); keys.pop(); toast(e.message, true); }
      } } }, c))) : null,
      r.end ? h('div', { class: `result ${r.score / r.max >= 0.75 ? 'pass' : 'fail'}` }, h('div', { class: 'big' }, `${r.score}/${r.max}`), h('div', null, h('b', null, r.score === r.max ? 'Every call was the best one.' : 'Done. Read the feedback on the calls that were not the best.'), r.counts === false && r.record ? h('div', { class: 'practice-note' }, `Practice round: your recorded result stays ${r.record.correct}/${r.record.total}.`) : r.counts ? h('div', { class: 'practice-note rec' }, 'This is your recorded result. Play again any time to practise.') : null, h('div', null, h('button', { class: 'btn sm', style: 'margin-top:8px', on: { click: start } }, 'Play it again')))) : null].filter(Boolean));
  };
  box.append(h('p', { class: 'muted' }, `${w.steps} decisions. Each choice gets feedback straight away.`), h('button', { class: 'btn primary', on: { click: start } }, done ? 'Play again' : 'Start the walkthrough'));
  return box;
}

// ------------------------------------------------------------------ explain it (record or write)
function pickMime() {
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']) if (window.MediaRecorder?.isTypeSupported?.(m)) return m;
  return '';
}
const toBase64 = (blob) => new Promise((ok, ko) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1]); fr.onerror = ko; fr.readAsDataURL(blob); });

function resultBox(s, rubric) {
  const chipCls = { 1: 'coral', 2: 'amber', 3: 'green' };
  const auto = s.auto || {};
  const who = s.status === 'reviewed' ? 'Your KUDO Trainer\'s review' : 'Automatic review';
  return h('div', { class: 'review' },
    h('div', { class: 'row spread' }, h('b', null, who), auto.rating && s.status !== 'reviewed' ? h('span', { class: `chip ${{ solid: 'green', developing: 'amber', gap: 'coral' }[auto.rating]}` }, { solid: 'Solid', developing: 'Developing', gap: 'Gap' }[auto.rating]) : null),
    s.rubric ? h('div', { class: 'rub' }, rubric.map((c) => { const fbOnly = s.status !== 'reviewed' && (auto.feedbackOnly || []).includes(c.key);
      return h('span', { class: `chip ${fbOnly ? 'grey' : chipCls[s.rubric[c.key]]}`, title: fbOnly ? 'Feedback only: pace and filler words do not count towards your level.' : null }, `${c.label}: ${s.rubric[c.key]}/3${fbOnly ? ', tip only' : ''}`); })) : null,
    s.review_comment ? h('div', { style: 'margin-top:8px' }, s.review_comment) : null,
    s.counts === false ? h('div', { class: 'practice-note' }, 'Practice attempt: your recorded result is the one from your first submission.') : s.counts ? h('div', { class: 'practice-note rec' }, (s.kind === 'practice' ? 'First submission: this is your recorded result. Try again any time to practise.' : `First submission: this is your recorded result and it ${s.status === 'reviewed' ? 'moved your level with your KUDO Trainer\'s score' : 'moved your level. If your KUDO Trainer reviews it, their score replaces this one'}. Try again any time to practise.`)) : null,
    auto.points && s.status !== 'reviewed' ? h('ul', { class: 'pts' }, auto.points.map((p) => h('li', { class: p.covered ? 'yes' : 'no' }, mark(p.covered), ' ', p.point))) : null,
    auto.missed?.length && s.status !== 'reviewed' ? h('details', null, h('summary', null, 'Where the missed points are in the lesson'), auto.missed.map((x) => h('div', { class: 'small', style: 'margin-top:4px' }, h('b', null, `${x.point}: `), x.lesson))) : null,
    s.transcript ? h('details', null, h('summary', null, 'What the system heard'), h('div', { class: 'pre' }, s.transcript), h('div', { class: 'muted small' }, 'If the transcript is wrong (bad microphone, background noise), ask your KUDO Trainer to listen.')) : null,
    s.status === 'auto' ? h('div', { class: 'muted small', style: 'margin-top:6px' }, s.human_requested ? 'You asked your KUDO Trainer to look at it.' : s.needs_human ? 'Your KUDO Trainer will also look at this one.' : '') : null,
    s.auto?.error ? h('div', { class: 'muted small' }, s.auto.error) : null);
}

export function explainCard(moduleKey, ex, submissions, rubric, { onDone, kind = 'explain', type = 'speak' } = {}) {
  const box = h('div');
  const resultArea = h('div');
  const showResult = (s) => {
    const ask = s.status === 'auto' && !s.human_requested ? h('button', { class: 'btn sm', style: 'margin-top:8px', on: { click: async () => { await api('POST', `/api/me/explain/${s.id}/ask-jack`); toast('Your KUDO Trainer will listen to it'); s.human_requested = true; s.needs_human = true; showResult(s); } } }, s.kind === 'practice' || !s.transcript ? 'Ask your KUDO Trainer to look at it' : 'Ask your KUDO Trainer to listen') : null;
    resultArea.replaceChildren(...[resultBox(s, rubric), ask].filter(Boolean));
  };
  const poll = async (id, tries = 0) => {
    try {
      const s = await api('GET', `/api/me/explain/result/${id}`);
      if (s.status === 'processing' && tries < 60) { resultArea.replaceChildren(h('div', { class: 'processing' }, h('span', { class: 'spin' }), 'Transcribing and reviewing your explanation. This takes up to a minute.')); setTimeout(() => poll(id, tries + 1), 3000); return; }
      showResult(s); if (s.status !== 'processing') onDone?.({ silent: true });
    } catch (e) { resultArea.replaceChildren(h('div', { class: 'muted' }, e.message)); }
  };
  const last = submissions[0];
  if (last) { if (last.status === 'processing') poll(last.id); else if (last.status === 'submitted') resultArea.append(h('div', { class: 'muted small' }, `Sent ${fmtDate(last.created_at)}, waiting for your KUDO Trainer's review.`)); else showResult(last); }

  let rec = null, chunks = [], blob = null, startedAt = 0, timer = null, secs = 0;
  const time = h('span', { class: 'rec-time' }, '0:00');
  const player = h('audio', { controls: true, hidden: true });
  const recBtn = h('button', { class: 'btn primary', type: 'button' }, last ? 'Record a new one' : 'Start recording');
  const writeFirst = type !== 'speak';
  const text = h('textarea', { rows: writeFirst ? 9 : 4, 'aria-label': type === 'write' ? 'Your written answer' : 'Your answer', placeholder: type === 'write' ? 'Write it here, as you would send it.' : type === 'steps' ? 'Describe what you did, step by step, in order.' : 'Or write it, as you would say it to the client.' });
  const send = h('button', { class: 'btn', type: 'button' }, 'Send for review');
  const fmt = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
  const stop = () => { if (rec && rec.state !== 'inactive') rec.stop(); clearInterval(timer); };
  recBtn.addEventListener('click', async () => {
    if (rec && rec.state === 'recording') return stop();
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return toast('Recording is not supported in this browser. Write it instead.', true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime(); chunks = [];
      rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); secs = (Date.now() - startedAt) / 1000; blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' }); player.src = URL.createObjectURL(blob); player.hidden = false; recBtn.textContent = 'Record again'; recBtn.classList.remove('danger'); };
      rec.start(); startedAt = Date.now(); recBtn.textContent = 'Stop'; recBtn.classList.add('danger');
      timer = setInterval(() => { const x = (Date.now() - startedAt) / 1000; time.textContent = fmt(x); if (x >= 180) stop(); }, 250);
    } catch { toast('The microphone is blocked. Allow it in the browser, or write your answer.', true); }
  });
  send.addEventListener('click', async () => {
    if (rec && rec.state === 'recording') return toast('Stop the recording first.', true);
    try {
      const body = { text: text.value.trim() || null, kind };
      if (blob) { body.audio = await toBase64(blob); body.mime = blob.type; body.seconds = secs; }
      send.disabled = true;
      const r = await api('POST', `/api/me/explain/${moduleKey}`, body);
      blob = null; player.hidden = true; text.value = ''; time.textContent = '0:00';
      if (r.status === 'processing') poll(r.id); else resultArea.replaceChildren(h('div', { class: 'ok' }, 'Sent to your KUDO Trainer for review'));
    } catch (e) { toast(e.message, true); } finally { send.disabled = false; }
  });
  const hint = { speak: 'Talk as you would on a call, up to 3 minutes.', write: 'Write it as you would really send it.', steps: 'Do it in a test account first, then describe exactly what you did.' }[type];
  const recRow = h('div', { class: 'row' }, recBtn, time);
  if (writeFirst) { recBtn.textContent = 'Or record it instead'; recBtn.className = 'btn'; send.className = 'btn primary'; }
  box.append(h('div', { class: 'explain-prompt' }, ex.prompt),
    h('p', { class: 'muted small' }, `${hint} The system reviews it within a minute: key points covered, clarity, and whether you said when to hand over. ${submissions.length ? 'Your first submission is your recorded result; new ones are practice.' : 'Your first submission is the result we keep, so take your time. After that, try again as often as you like to practise.'}`),
    ...(writeFirst ? [text, recRow, player] : [recRow, player, text]), h('div', { style: 'margin-top:8px' }, send), h('div', { style: 'margin-top:12px' }, resultArea));
  return box;
}

// ------------------------------------------------------------------ feedback after a module
export function feedbackCard(moduleKey, { onDone } = {}) {
  const v = { clear: null, relevant: null, confidence: null };
  const scale = (k, label) => h('div', { class: 'fb-row' }, h('span', null, label), h('div', { class: 'fb-scale' }, [1, 2, 3, 4, 5].map((n) => h('label', null, h('input', { type: 'radio', name: `fb-${k}`, on: { change: () => { v[k] = n; } } }), h('span', null, n)))));
  const comment = h('textarea', { rows: 2, placeholder: 'One thing that would make this module better (optional)' });
  const box = h('div', { class: 'card fb-card' }, h('h2', null, 'How was this module?'), h('p', { class: 'sub' }, '20 seconds. It helps improve the Academy. Your KUDO Trainer sees module results without names.'),
    scale('clear', 'It was clear'), scale('relevant', 'It fits what my clients ask'), scale('confidence', 'I could do this with a client now'),
    h('div', { class: 'muted small', style: 'margin:2px 0 8px' }, '1 means not at all, 5 means completely'), comment,
    h('button', { class: 'btn primary', style: 'margin-top:8px', on: { click: async () => {
      try { await api('POST', `/api/me/modules/${moduleKey}/feedback`, { ...v, comment: comment.value.trim() || null }); box.replaceChildren(h('div', { class: 'ok' }, 'Thank you. Noted.')); onDone?.(); } catch (e) { toast(e.message, true); }
    } } }, 'Send'));
  return box;
}


// ------------------------------------------------------------------ weekly challenge (My courses)
export function challengeCard() {
  const box = h('div', { class: 'card challenge' }, h('div', { class: 'muted' }, 'Loading…'));
  (async () => {
    const c = await api('GET', '/api/me/challenge');
    const head = h('div', { class: 'row spread' }, h('div', null, h('h2', null, 'Weekly challenge'), h('p', { class: 'sub keep', style: 'margin:2px 0 0' }, 'Four mixed questions from what you have already studied. Two minutes. Mixing topics is what makes it stick.')),
      h('div', { class: 'streak', title: 'Weeks with a challenge done. It never resets: a busy week costs nothing.' }, h('b', null, c.weeksSoFar ? `${c.weeksActive} of ${c.weeksSoFar}` : c.weeksActive), h('span', null, c.weeksSoFar ? 'weeks active so far' : (c.weeksActive === 1 ? 'week active' : 'weeks active'))));
    if (c.doneThisWeek) { box.replaceChildren(head, h('div', { class: 'ok', style: 'margin-top:10px' }, 'Done for this week. A new one opens on Monday.'), h('div', { class: 'ch-body' }, h('a', { class: 'btn', href: `#${document.body.dataset.me === '1' ? 'me-' : ''}challenge` }, 'Questions to review'))); return; }
    const facts = h('div', { class: 'ch-facts' }, h('span', { class: 'chip grey' }, '4 questions'), h('span', { class: 'chip grey' }, '2 minutes'), h('span', { class: 'chip grey' }, 'Never changes your score'));
    // The challenge opens on its own page, with the questions to review under it.
    const body = h('div', { class: 'ch-body' }, h('a', { class: 'btn primary', href: `#${document.body.dataset.me === '1' ? 'me-' : ''}challenge` }, 'Take this week\'s challenge'));
    box.replaceChildren(head, facts, body);
  })().catch(() => box.replaceChildren(h('div', { class: 'muted' }, 'The weekly challenge could not load.')));
  return box;
}

/** The weekly challenge page: this week's four questions, then the questions missed in the initial assessment. */
export async function challengeView() {
  const me = document.body.dataset.me === '1' ? 'me-' : '';
  const [c, data] = await Promise.all([api('GET', '/api/me/challenge'), api('GET', '/api/me').catch(() => null)]);
  const facts = h('div', { class: 'ch-facts' }, h('span', { class: 'chip grey' }, '4 questions'), h('span', { class: 'chip grey' }, '2 minutes'), h('span', { class: 'chip grey' }, 'Never changes your score'));
  const streak = h('div', { class: 'streak', title: 'Weeks with a challenge done. It never resets: a busy week costs nothing.' }, h('b', null, c.weeksSoFar ? `${c.weeksActive} of ${c.weeksSoFar}` : c.weeksActive), h('span', null, c.weeksSoFar ? 'weeks active so far' : 'weeks active'));
  const body = h('div', { class: 'ch-page-body' });
  if (c.doneThisWeek) body.append(h('div', { class: 'ok' }, 'Done for this week. A new challenge opens on Monday. Meanwhile, go through the questions to review below.'));
  else body.append(checkForm(c.items, { url: '/api/me/challenge', onResult: (r, items) => { body.replaceChildren(resultView({ ...r, passed: true, counts: false }, items, { baseline: true }), h('div', { class: 'ok', style: 'margin-top:8px' }, 'Done for this week. A new challenge opens on Monday.')); body.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }));
  const challenge = h('section', { class: 'card challenge ch-page' },
    h('div', { class: 'row spread' }, h('div', null, h('h2', null, 'This week\'s questions'), h('p', { class: 'sub keep', style: 'margin:2px 0 0' }, 'Four mixed questions from what you have already studied. Mixing topics is what makes it stick.')), streak),
    facts, body);
  return h('div', { class: 'page lesson' }, h('a', { href: `#${me}training`, class: 'muted back-link' }, 'Back to My courses'),
    h('div', { class: 'page-head', style: 'margin-top:8px' }, h('div', null, h('h1', null, 'Weekly challenge'), h('p', null, 'A short weekly workout, then the questions from your initial assessment to go through again.'))),
    h('div', { class: 'stack' }, challenge, data ? questionsToReview(data) : null));
}

/** The questions missed in the knowledge test, with the correct answer. */
export function questionsToReview(data) {
  const live = data.rounds.filter((r) => r.kind === 'live' && data.scores.some((s) => s.round_id === r.id));
  let round = live.length ? live[live.length - 1].id : null;
  const short = (k) => data.scenarios.find((s) => s.key === k)?.short || k;
  const box = h('div');
  const draw = () => {
    box.replaceChildren();
    const all = data.questions.filter((q) => q.round_id === round), qs = all.filter((q) => !q.correct);
    if (!all.length) { box.append(h('div', { class: 'muted' }, 'Question-by-question results are not available for your test.')); return; }
    if (!qs.length) { box.append(h('div', { class: 'ok' }, 'You answered every question correctly. Well done.')); return; }
    box.append(h('p', { class: 'muted small', style: 'margin:0 0 4px' }, `${qs.length} question${qs.length > 1 ? 's' : ''} to go through.`));
    qs.forEach((q) => box.append(h('div', { class: 'q-item' }, h('div', { class: 'row' }, h('span', { class: 'chip blue' }, short(q.scenario)), q.level ? h('span', { class: 'chip grey' }, q.level) : null), h('div', { style: 'margin-top:6px;font-weight:600' }, q.question), q.answer ? h('div', { class: 'a' }, 'Correct answer: ', q.answer) : null)));
  };
  draw();
  return h('section', { class: 'card q-review' }, h('div', { class: 'row spread' }, h('div', null, h('h2', null, 'Questions to review'), h('p', { class: 'sub keep', style: 'margin:2px 0 0' }, 'These are the questions you missed during your initial assessment, with their correct answer. Going through these regularly will boost your knowledge.')),
    live.length > 1 ? h('select', { style: 'width:auto', 'aria-label': 'Test', on: { change: (e) => { round = Number(e.target.value); draw(); } } }, live.map((r) => h('option', { value: r.id, selected: r.id === round }, r.label))) : null), box);
}

// ------------------------------------------------------------------ end-of-programme survey
export async function surveyView() {
  const s = await api('GET', '/api/me/survey');
  const answers = {};
  const q = (x) => {
    if (x.type === 'scale5') return h('div', { class: 'fb-scale' }, [1, 2, 3, 4, 5].map((n) => h('label', null, h('input', { type: 'radio', name: x.key, on: { change: () => { answers[x.key] = n; } } }), h('span', null, n))));
    if (x.type === 'nps') return h('div', { class: 'fb-scale nps' }, [...Array(11).keys()].map((n) => h('label', null, h('input', { type: 'radio', name: x.key, on: { change: () => { answers[x.key] = n; } } }), h('span', null, n))));
    if (x.type === 'choice') return h('div', null, x.o.map((o) => h('label', { class: 'opt' }, h('input', { type: 'radio', name: x.key, on: { change: () => { answers[x.key] = o; } } }), h('span', null, o))));
    return h('textarea', { rows: 2, on: { input: (e) => { answers[x.key] = e.target.value; } } });
  };
  return h('div', { class: 'page lesson' }, h('a', { href: '#programme', class: 'muted' }, 'Back to Home'),
    h('div', { class: 'page-head', style: 'margin-top:8px' }, h('div', null, h('h1', null, 'How did the programme work for you?'), h('p', null, s.done ? 'You have already answered. You can update your answers.' : 'Ten questions, about five minutes. Ratings are 1 (not at all) to 5 (completely).'))),
    h('div', { class: 'card' }, s.questions.map((x, i) => h('div', { class: 'qq' }, h('b', null, `${i + 1}. ${x.q}`), h('div', { style: 'margin-top:6px' }, q(x)))),
      h('button', { class: 'btn primary', on: { click: async () => { try { await api('POST', '/api/me/survey', { answers }); toast('Thank you'); location.hash = `${document.body.dataset.me ? 'me-' : ''}programme`; } catch (e) { toast(e.message, true); } } } }, 'Send my answers')));
}
