import { h, api, toast, fmtDate } from './ui.js';

const CERT = [[1, 'Guessing'], [2, 'Fairly sure'], [3, 'Certain']];
const pctOf = (a, b) => Math.round((a / b) * 100);

// ------------------------------------------------------------------ mixed-format check
/** items: public items from the server. opts: { url, itemKey, onResult, title } */
export function checkForm(items, { url, itemKey, onResult, submitLabel = 'Check my answers', certainty = true } = {}) {
  const state = items.map((x) => ({ id: x.id, v: x.t === 'multi' ? [] : x.t === 'order' ? [...x.steps] : x.t === 'match' ? x.lefts.map(() => '') : null, c: null }));
  const box = h('form', { class: 'quiz', novalidate: true });
  const renderItem = (x, i) => {
    const st = state[i];
    const head = h('legend', null, `${i + 1}. ${x.q}`);
    const tag = { mcq: null, multi: 'Pick all that fit · wrong picks cancel right ones', match: 'Match each one', order: 'Put in order' }[x.t];
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
    try { onResult(await api('POST', url, { answers: state.map((s) => ({ id: s.id, v: s.v, c: s.c ?? 2 })), item_key: itemKey || null }), items); }
    catch (err) { toast(err.message, true); }
  });
  return box;
}

export function resultView(r, items, { pass = 0.8, baseline = false, onRetry } = {}) {
  const acc = pctOf(r.correct, r.total); const passed = baseline || r.passed;
  const certMsg = r.cbm == null ? null : r.cbm >= 2 ? 'You knew what you knew: your certainty matched your answers well.' : r.cbm >= 0.5 ? 'Reasonable judgement of what you know. Look at the answers you were unsure of.' : 'Your certainty did not match your answers. Review the ones you were sure of but got wrong.';
  const ansText = (x, res) => {
    if (res.t === 'mcq') return h('div', null, 'Correct: ', h('b', null, res.correct.o[res.correct.a]), res.conf ? h('span', { class: 'muted small' }, ` · you said: ${CERT.find((c) => c[0] === res.conf)[1].toLowerCase()}`) : null);
    if (res.t === 'multi') return h('div', null, 'All that fit: ', h('b', null, res.correct.a.map((i) => res.correct.o[i]).join(' · ')));
    if (res.t === 'match') return h('ul', { class: 'ans-list' }, res.correct.pairs.map((p) => h('li', null, `${p[0]} → `, h('b', null, p[1]))));
    if (res.t === 'order') return h('ol', { class: 'ans-list' }, res.correct.steps.map((s) => h('li', null, s)));
    return null;
  };
  return h('div', null,
    h('div', { class: `result ${passed ? 'pass' : 'fail'}` }, h('div', { class: 'big' }, `${acc}%`),
      h('div', null, h('b', null, baseline ? 'Baseline recorded. Your plan uses it from now on.' : passed ? 'Passed.' : `Not yet: you need ${Math.round(pass * 100)}%.`),
        certMsg ? h('div', { class: 'muted' }, certMsg) : null,
        r.confidentWrong ? h('div', { class: 'small', style: 'color:var(--danger);margin-top:4px' }, `${r.confidentWrong} answer${r.confidentWrong > 1 ? 's' : ''} you were certain of ${r.confidentWrong > 1 ? 'were' : 'was'} wrong: worth a second look.`) : null)),
    r.results.map((res, i) => h('div', { class: `qres ${res.score >= 0.999 ? 'qres-ok' : res.score > 0 ? 'qres-part' : 'qres-no'} ${res.confidentWrong ? 'cw' : ''}` },
      h('b', null, `${i + 1}. ${res.q}`), res.score > 0 && res.score < 0.999 ? h('span', { class: 'chip amber', style: 'margin-left:6px' }, `${Math.round(res.score * 100)}%`) : null,
      ansText(items[i], res), res.why ? h('div', { class: 'muted small' }, res.why) : null)),
    onRetry ? h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: 'btn', on: { click: onRetry } }, 'Try a new set of questions'), h('a', { class: 'btn', href: '#programme' }, 'Back to my programme')) : null);
}

// ------------------------------------------------------------------ decision walkthrough
export function walkthroughCard(moduleKey, w, { done } = {}) {
  const box = h('div');
  const path = [];
  const start = () => { path.length = 0; draw({ next: w.first, done: [] }); };
  const draw = (r) => {
    box.replaceChildren(...[
      h('div', { class: 'walk-intro' }, w.intro),
      ...r.done.map((d) => h('div', { class: `walk-step q${d.quality}` }, h('div', { class: 'muted small' }, d.step), h('div', null, h('b', null, 'You: '), d.chose), h('div', { class: 'walk-fb' }, d.fb), d.best ? h('div', { class: 'small' }, h('b', null, 'Best move: '), d.best) : null)),
      r.next ? h('div', { class: 'walk-now' }, h('b', null, r.next.text), r.next.choices.map((c, ci) => h('button', { class: 'walk-choice', type: 'button', on: { click: async () => {
        path.push(ci);
        try { draw(await api('POST', `/api/me/modules/${moduleKey}/walk`, { path })); } catch (e) { path.pop(); toast(e.message, true); }
      } } }, c))) : null,
      r.end ? h('div', { class: `result ${r.score / r.max >= 0.75 ? 'pass' : 'fail'}` }, h('div', { class: 'big' }, `${r.score}/${r.max}`), h('div', null, h('b', null, r.score === r.max ? 'Every call was the best one.' : 'Done. Read the feedback on the calls that were not the best.'), h('div', null, h('button', { class: 'btn sm', style: 'margin-top:8px', on: { click: start } }, 'Play it again')))) : null].filter(Boolean));
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

export function explainCard(moduleKey, ex, submissions, rubric, { onDone } = {}) {
  const box = h('div');
  const last = submissions[0];
  const reviewBox = (s) => s.status === 'reviewed' ? h('div', { class: 'review' }, h('b', null, 'Jack\'s review'), h('div', { class: 'rub' }, rubric.map((c) => h('span', { class: `chip ${{ 1: 'coral', 2: 'amber', 3: 'green' }[s.rubric?.[c.key]]}` }, `${c.label}: ${s.rubric?.[c.key]}/3`))), s.review_comment ? h('div', { style: 'margin-top:6px' }, s.review_comment) : null)
    : h('div', { class: 'muted small' }, `Sent ${fmtDate(s.created_at)} · waiting for Jack's review.`);
  if (last) box.append(reviewBox(last));

  let rec = null, chunks = [], blob = null, startedAt = 0, timer = null;
  const time = h('span', { class: 'rec-time' }, '0:00');
  const player = h('audio', { controls: true, hidden: true });
  const recBtn = h('button', { class: 'btn primary', type: 'button' }, last ? 'Record a new one' : 'Start recording');
  const text = h('textarea', { rows: 4, placeholder: 'Or write it, as you would say it to the client.' });
  const send = h('button', { class: 'btn', type: 'button' }, 'Send to Jack');
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const stop = () => { if (rec && rec.state !== 'inactive') rec.stop(); clearInterval(timer); };
  recBtn.addEventListener('click', async () => {
    if (rec && rec.state === 'recording') return stop();
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return toast('Recording is not supported in this browser. Write it instead.', true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime(); chunks = [];
      rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' }); player.src = URL.createObjectURL(blob); player.hidden = false; recBtn.textContent = 'Record again'; recBtn.classList.remove('danger'); };
      rec.start(); startedAt = Date.now(); recBtn.textContent = 'Stop'; recBtn.classList.add('danger');
      timer = setInterval(() => { const s = (Date.now() - startedAt) / 1000; time.textContent = fmt(s); if (s >= 180) stop(); }, 250);
    } catch { toast('The microphone is blocked. Allow it in the browser, or write your answer.', true); }
  });
  send.addEventListener('click', async () => {
    if (rec && rec.state === 'recording') return toast('Stop the recording first.', true);
    try {
      const body = { text: text.value.trim() || null };
      if (blob) { body.audio = await toBase64(blob); body.mime = blob.type; body.seconds = (Date.now() - startedAt) / 1000; }
      const r = await api('POST', `/api/me/explain/${moduleKey}`, body);
      const ticks = r.points.map(() => h('input', { type: 'checkbox' }));
      box.replaceChildren(h('div', { class: 'ok' }, 'Sent to Jack. Now check yourself: which of these did you cover?'),
        h('div', { class: 'stack', style: 'margin-top:8px' }, r.points.map((p, i) => h('label', { class: 'opt' }, ticks[i], h('span', null, p)))),
        h('button', { class: 'btn primary', style: 'margin-top:10px', on: { click: async () => { await api('PATCH', `/api/me/explain/${r.id}/points`, { points: ticks.map((t, i) => (t.checked ? i : -1)).filter((i) => i >= 0) }); toast('Saved'); onDone?.(); } } }, 'Save my self-check'));
    } catch (e) { toast(e.message, true); }
  });
  box.append(h('div', { class: 'explain-prompt' }, ex.prompt),
    h('p', { class: 'muted small' }, 'Talk to the client as you would on a call: up to 3 minutes. Jack scores it on accuracy, completeness, clarity and hand-over.'),
    h('div', { class: 'row' }, recBtn, time), player, text, h('div', { style: 'margin-top:8px' }, send));
  return box;
}

// ------------------------------------------------------------------ feedback after a module
export function feedbackCard(moduleKey, { onDone } = {}) {
  const v = { clear: null, relevant: null, confidence: null };
  const scale = (k, label) => h('div', { class: 'fb-row' }, h('span', null, label), h('div', { class: 'fb-scale' }, [1, 2, 3, 4, 5].map((n) => h('label', null, h('input', { type: 'radio', name: `fb-${k}`, on: { change: () => { v[k] = n; } } }), h('span', null, n)))));
  const comment = h('textarea', { rows: 2, placeholder: 'One thing that would make this module better (optional)' });
  const box = h('div', { class: 'card fb-card' }, h('h2', null, 'How was this module?'), h('p', { class: 'sub' }, '20 seconds. It helps improve the Academy. Jack sees module results without names.'),
    scale('clear', 'It was clear'), scale('relevant', 'It fits what my clients ask'), scale('confidence', 'I could do this with a client now'),
    h('div', { class: 'muted small', style: 'margin:2px 0 8px' }, '1 = not at all · 5 = completely'), comment,
    h('button', { class: 'btn primary', style: 'margin-top:8px', on: { click: async () => {
      try { await api('POST', `/api/me/modules/${moduleKey}/feedback`, { ...v, comment: comment.value.trim() || null }); box.replaceChildren(h('div', { class: 'ok' }, 'Thank you. Noted.')); onDone?.(); } catch (e) { toast(e.message, true); }
    } } }, 'Send'));
  return box;
}

// ------------------------------------------------------------------ weekly challenge (programme page)
export function challengeCard() {
  const box = h('div', { class: 'card challenge' }, h('div', { class: 'muted' }, 'Loading…'));
  (async () => {
    const c = await api('GET', '/api/me/challenge');
    const head = h('div', { class: 'row spread' }, h('div', null, h('h2', null, 'Weekly challenge'), h('p', { class: 'sub', style: 'margin:2px 0 0' }, 'Four mixed questions from what you have already studied. Two minutes. Mixing topics is what makes it stick.')),
      h('div', { class: 'streak' }, h('b', null, c.streak), h('span', null, c.streak === 1 ? 'week in a row' : 'weeks in a row')));
    if (c.doneThisWeek) { box.replaceChildren(head, h('div', { class: 'ok', style: 'margin-top:10px' }, 'Done for this week. A new one opens on Monday.')); return; }
    const body = h('div', { style: 'margin-top:10px' }, h('button', { class: 'btn primary', on: { click: () => {
      body.replaceChildren(checkForm(c.items, { url: '/api/me/challenge', onResult: (r, items) => { body.replaceChildren(resultView({ ...r, passed: true }, items, { baseline: true }), h('div', { class: 'ok', style: 'margin-top:8px' }, `Streak: ${r.streak} week${r.streak === 1 ? '' : 's'}.`)); } }));
    } } }, 'Take this week\'s challenge'));
    box.replaceChildren(head, body);
  })().catch(() => box.replaceChildren(h('div', { class: 'muted' }, 'The weekly challenge could not load.')));
  return box;
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
  return h('div', { class: 'page lesson' }, h('a', { href: '#programme', class: 'muted' }, '← My programme'),
    h('div', { class: 'page-head', style: 'margin-top:8px' }, h('div', null, h('h1', null, 'How did the programme work for you?'), h('p', null, s.done ? 'You have already answered. You can update your answers.' : 'Ten questions, about five minutes. Ratings are 1 (not at all) to 5 (completely).'))),
    h('div', { class: 'card' }, s.questions.map((x, i) => h('div', { class: 'qq' }, h('b', null, `${i + 1}. ${x.q}`), h('div', { style: 'margin-top:6px' }, q(x)))),
      h('button', { class: 'btn primary', on: { click: async () => { try { await api('POST', '/api/me/survey', { answers }); toast('Thank you'); location.hash = 'programme'; } catch (e) { toast(e.message, true); } } } }, 'Send my answers')));
}
