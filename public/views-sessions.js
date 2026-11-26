// Sessions: upload 1:1 and group session recordings or transcripts; the Academy finds the questions asked and
// the KUDO Trainer turns them into lesson FAQ entries or new check questions.
import { h, api, toast, modal, fmtDate, svg, importsHead } from './ui.js';

const KIND = { one_to_one: '1:1', group: 'Group session' };
const COV = { covered: ['green', 'Covered'], partly: ['amber', 'Partly covered'], gap: ['coral', 'Not covered'] };
const STATUS = { open: ['grey', 'To review'], faq: ['blue', 'Added as FAQ'], item: ['blue', 'Added as a question'], dismissed: ['grey', 'Dismissed'] };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Upload with progress (recordings can be large).
function upload(id, file, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('PUT', `/api/admin/sessions/${id}/file`);
    x.setRequestHeader('Content-Type', 'application/octet-stream'); x.setRequestHeader('X-Requested-With', 'academy');
    x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    x.onload = () => { let j = {}; try { j = JSON.parse(x.responseText); } catch { /* empty */ } x.status < 300 ? resolve(j) : reject(new Error(j.error || `Upload failed (${x.status})`)); };
    x.onerror = () => reject(new Error('Upload failed. Check your connection and try again.'));
    x.send(file);
  });
}

/** Stacked bars: per module, questions covered / partly / not covered. */
function coverageChart(rows) {
  const sm = window.matchMedia?.('(max-width: 700px)').matches; const W = sm ? 360 : 760, rowH = 30, lab = sm ? 120 : 230, bw = W - lab - 40, H = rows.length * rowH + 28, max = Math.max(...rows.map((r) => r.questions), 1);
  let g = '';
  rows.forEach((r, i) => {
    const y = i * rowH + 4; let x = lab;
    g += `<text x="${lab - 10}" y="${y + 16}" font-size="12.5" font-weight="600" fill="#231F20" text-anchor="end">${esc(r.title.length > (sm ? 16 : 32) ? `${r.title.slice(0, sm ? 15 : 31)}…` : r.title)}</text>`;
    for (const [k, col] of [['gap', '#DB6539'], ['partly', '#F8C63F'], ['covered', '#2F7A45']]) {
      const w = (r[k] / max) * bw; if (!w) continue;
      g += `<rect x="${x}" y="${y + 3}" width="${w}" height="18" fill="${col}" rx="3"><title>${esc(r.title)}: ${r[k]} ${k === 'gap' ? 'not covered' : k === 'partly' ? 'partly covered' : 'covered'}</title></rect>`; x += w;
    }
    g += `<text x="${x + 6}" y="${y + 16}" font-size="11.5" font-weight="700" fill="#231F20">${r.questions}</text>`;
  });
  return svg(`<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Questions from sessions by module">${g}</svg>`);
}

export async function sessionsView() {
  const [list, ins, people] = await Promise.all([api('GET', '/api/admin/sessions'), api('GET', '/api/admin/sessions-insights'), api('GET', '/api/admin/trainees')]);
  // Upload form
  const kind = h('select', null, h('option', { value: 'one_to_one' }, '1:1 session'), h('option', { value: 'group' }, 'Group session'));
  const title = h('input', { type: 'text', maxlength: 200, placeholder: 'For example: 1:1 with Ana, Teams and Zoom' });
  const date = h('input', { type: 'date', value: new Date().toISOString().slice(0, 10) });
  const who = h('select', { multiple: true, size: 6, 'aria-label': 'Trainees in the session' }, people.map((p) => h('option', { value: p.id }, p.name)));
  const file = h('input', { type: 'file', accept: '.vtt,.docx,.txt,.srt,.mp4,.m4a,.mp3,.wav,.webm,.ogg,.mov,.aac' });
  const bar = h('div', { class: 'ph-bar', hidden: true }, h('i', { style: 'width:0%' }));
  const go = h('button', { class: 'btn primary', type: 'button' }, 'Upload and analyse');
  go.addEventListener('click', async () => {
    const f = file.files[0]; if (!f) return toast('Choose a file first.', true);
    const ids = [...who.selectedOptions].map((o) => Number(o.value));
    go.disabled = true; bar.hidden = false;
    try {
      const { id } = await api('POST', '/api/admin/sessions', { kind: kind.value, title: title.value || f.name, happened_on: date.value, user_ids: ids, filename: f.name });
      await upload(id, f, (p) => { bar.firstChild.style.width = `${Math.round(p * 100)}%`; });
      toast('Uploaded. The analysis runs in the background.');
      location.hash = `session-${id}`;
    } catch (e) { toast(e.message, true); go.disabled = false; }
  });

  const kpi = (label, value, note) => h('div', { class: 'card kpi' }, h('div', { class: 'label' }, label), h('div', { class: 'value' }, value), h('div', { class: 'note' }, note));
  return h('div', { class: 'page' },
    ...importsHead('sessions', 'Upload your 1:1 and group sessions. The Academy finds the questions people asked, checks whether the lessons and checks already cover them, and helps you turn the answers into new content. Nothing reaches trainees until you publish it.'),
    h('div', { class: 'grid g4' },
      kpi('Sessions analysed', ins.sessions, `${ins.questions} questions found`),
      kpi('To review', ins.open, 'Not or partly covered yet'),
      kpi('Added to the Academy', ins.published, 'FAQ entries and check questions'),
      kpi('Asked more than once', ins.recurring.length, 'Across different sessions')),
    h('div', { class: 'grid g-8-4', style: 'margin-top:16px' },
      h('div', { class: 'card' }, h('h2', null, 'What people ask, by module'), h('p', { class: 'sub' }, 'Green: the Academy already covers it. Yellow: partly. Coral: not covered yet, the best candidates for new content.'),
        ins.byModule.length ? coverageChart(ins.byModule) : h('div', { class: 'muted' }, 'Appears after the first session is analysed.')),
      h('div', { class: 'card' }, h('h2', null, 'Add a session'),
        h('label', { class: 'f' }, h('span', { class: 'l' }, 'Type'), kind),
        h('label', { class: 'f' }, h('span', { class: 'l' }, 'Title'), title),
        h('label', { class: 'f' }, h('span', { class: 'l' }, 'Date'), date),
        h('label', { class: 'f' }, h('span', { class: 'l' }, 'Who took part (Ctrl or Cmd to pick several)'), who),
        h('label', { class: 'f' }, h('span', { class: 'l' }, 'Transcript or recording'), file),
        h('p', { class: 'muted small' }, 'Best: the Teams transcript (.vtt or .docx). It is instant and knows who spoke. A recording (.mp4, .m4a, .mp3) also works: it is transcribed here, which takes a while for long sessions, and the file is deleted once transcribed.'),
        bar, go)),
    publishedCard(),
    ins.recurring.length ? h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'Questions that keep coming back'),
      h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Question', 'Module', 'Times', 'Sessions', ''].map((x) => h('th', null, x)))),
        h('tbody', null, ins.recurring.map((r) => h('tr', null, h('td', null, r.q), h('td', null, r.module), h('td', { class: 'num' }, r.count), h('td', { class: 'num' }, r.sessions),
          h('td', null, r.gap ? h('span', { class: 'chip coral' }, 'Not covered') : null, ' ', h('a', { href: `#session-${r.example.session}` }, 'Open'))))))) : null,
    h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'All sessions'),
      list.sessions.length ? h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Session', 'Date', 'Who', 'Status', 'Questions', 'To review'].map((x, i) => h('th', { class: i > 3 ? 'num' : '' }, x)))),
        h('tbody', null, list.sessions.map((s) => h('tr', null, h('td', null, h('a', { href: `#session-${s.id}` }, s.title), h('div', { class: 'muted small' }, KIND[s.kind])), h('td', null, fmtDate(s.happened_on)), h('td', null, s.people.join(', ') || '–'),
          h('td', null, h('span', { class: `chip ${{ ready: 'green', failed: 'coral', processing: 'amber', uploaded: 'grey' }[s.status]}` }, { ready: 'Ready', failed: 'Failed', processing: `Analysing ${s.progress || 0}%`, uploaded: 'Waiting for the file' }[s.status])),
          h('td', { class: 'num' }, s.questions), h('td', { class: 'num' }, s.toReview || ''))))) : h('div', { class: 'muted' }, 'No session yet. Upload the first one above.')));
}

// ------------------------------------------------------------------ one session
function faqForm(f, s, done) {
  const mod = h('select', null, s.modules.map((m) => h('option', { value: m.key, selected: m.key === f.module }, m.title)));
  const qn = h('textarea', { rows: 2 }, f.q); const an = h('textarea', { rows: 5 }, f.answer || '');
  modal('Add to the lesson as a FAQ', h('div', null, h('p', { class: 'muted small' }, 'Trainees see it in the lesson under "Asked in sessions", without any name. Rewrite the answer as you want it to read.'),
    h('label', { class: 'f' }, h('span', { class: 'l' }, 'Module'), mod), h('label', { class: 'f' }, h('span', { class: 'l' }, 'Question'), qn), h('label', { class: 'f' }, h('span', { class: 'l' }, 'Answer'), an)),
  { actions: (close) => [h('button', { class: 'btn', on: { click: close } }, 'Cancel'), h('button', { class: 'btn primary', on: { click: async () => {
    try { await api('POST', '/api/admin/field-notes', { kind: 'faq', module: mod.value, question: qn.value, answer: an.value, session_id: s.id, finding_id: f.id }); close(); toast('Added to the lesson'); done(); } catch (e) { toast(e.message, true); }
  } } }, 'Publish')] });
}
function itemForm(f, s, done) {
  const mod = h('select', null, s.modules.map((m) => h('option', { value: m.key, selected: m.key === f.module }, m.title)));
  const obj = h('select', null, h('option', { value: '' }, 'Objective (optional)'));
  const fillObj = () => obj.replaceChildren(h('option', { value: '' }, 'Objective (optional)'), ...(s.modules.find((m) => m.key === mod.value)?.objectives || []).map((o, i) => h('option', { value: i }, `O${i + 1}: ${o}`)));
  mod.addEventListener('change', fillObj); fillObj();
  const qn = h('textarea', { rows: 2 }, f.q);
  const first = (f.answer || '').split(/(?<=[.!?])\s+/)[0] || '';
  const opts = [0, 1, 2, 3].map((i) => h('input', { type: 'text', maxlength: 200, value: i === 0 ? first.slice(0, 200) : '', placeholder: i === 0 ? 'The right answer' : `A wrong answer someone could believe (${i})` }));
  const radios = opts.map((_, i) => h('input', { type: 'radio', name: 'correct', checked: i === 0, 'aria-label': `Option ${i + 1} is correct` }));
  const why = h('textarea', { rows: 3 }, f.answer || '');
  modal('Make it a check question', h('div', null,
    h('p', { class: 'muted small' }, 'It joins the module\'s checks straight away. Write wrong answers that a trainee could really believe, about as long as the right one, so the answer is not given away.'),
    h('label', { class: 'f' }, h('span', { class: 'l' }, 'Module'), mod), h('label', { class: 'f' }, h('span', { class: 'l' }, 'Objective it tests'), obj),
    h('label', { class: 'f' }, h('span', { class: 'l' }, 'Question'), qn),
    h('div', { class: 'f' }, h('span', { class: 'l' }, 'Options (tick the right one)'), ...opts.map((o, i) => h('div', { class: 'row', style: 'gap:8px;margin-bottom:6px' }, radios[i], o))),
    h('label', { class: 'f' }, h('span', { class: 'l' }, 'Why (shown after answering)'), why)),
  { actions: (close) => [h('button', { class: 'btn', on: { click: close } }, 'Cancel'), h('button', { class: 'btn primary', on: { click: async () => {
    try {
      await api('POST', '/api/admin/field-notes', { kind: 'item', module: mod.value, question: qn.value, options: opts.map((o) => o.value), correct: radios.findIndex((r) => r.checked), answer: why.value, obj: obj.value === '' ? null : Number(obj.value), session_id: s.id, finding_id: f.id });
      close(); toast('Added to the checks'); done();
    } catch (e) { toast(e.message, true); }
  } } }, 'Add to the checks')] });
}

export async function sessionView(id) {
  const s = await api('GET', `/api/admin/sessions/${id}`);
  confirmDelete.hidden = true;
  const box = h('div', { class: 'page' });
  const reload = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
  const act = async (fid, body) => { try { await api('POST', `/api/admin/sessions/${s.id}/findings/${fid}`, body); reload(); } catch (e) { toast(e.message, true); } };
  if (s.status === 'processing' || s.status === 'uploaded') setTimeout(() => { if (location.hash === `#session-${id}`) reload(); }, 5000);

  const modTitle = Object.fromEntries(s.modules.map((m) => [m.key, m.title]));
  const findings = [...s.findings].sort((a, b) => ({ gap: 0, partly: 1, covered: 2 }[a.coverage] - { gap: 0, partly: 1, covered: 2 }[b.coverage]) || (b.seenBefore - a.seenBefore));
  const byMod = [...new Set(findings.map((f) => f.module))];
  const card = (f) => h('div', { class: `finding ${f.status !== 'open' ? 'settled' : ''}` },
    h('div', { class: 'row spread', style: 'gap:8px;flex-wrap:wrap' },
      h('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' }, h('span', { class: `chip ${COV[f.coverage][0]}` }, COV[f.coverage][1]), h('span', { class: `chip ${STATUS[f.status][0]}` }, STATUS[f.status][1]),
        f.seenBefore ? h('span', { class: 'chip amber' }, 'Asked before') : null, h('span', { class: 'muted small' }, f.role === 'host' ? 'You asked' : f.asker ? `Asked by ${f.asker}` : 'Asked in the session')),
      h('select', { class: 'sm', 'aria-label': 'Module', on: { change: (e) => act(f.id, { action: 'module', module: e.target.value }) } }, s.modules.map((m) => h('option', { value: m.key, selected: m.key === f.module }, m.title)))),
    h('div', { class: 'f-q' }, f.q),
    f.answer ? h('div', { class: 'f-a' }, h('b', null, 'Answer given: '), f.answer) : null,
    h('div', { class: 'muted small' }, h('b', null, `Closest in the Academy (${f.match.where}): `), f.match.text),
    f.status === 'open' ? h('div', { class: 'row', style: 'gap:6px;margin-top:8px;flex-wrap:wrap' },
      h('button', { class: 'btn sm primary', on: { click: () => faqForm(f, s, reload) } }, 'Add to lesson (FAQ)'),
      h('button', { class: 'btn sm', on: { click: () => itemForm(f, s, reload) } }, 'Make a check question'),
      h('button', { class: 'btn sm', on: { click: () => act(f.id, { action: 'dismiss' }) } }, 'Dismiss'))
      : f.status === 'dismissed' ? h('button', { class: 'btn sm', style: 'margin-top:8px', on: { click: () => act(f.id, { action: 'reopen' }) } }, 'Reopen') : null);

  const signalsBox = s.signals.length && s.people.length === 1 ? h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, `What this 1:1 says about ${s.people[0].name}`),
    h('p', { class: 'sub' }, 'Suggested from the transcript. Adding them as an input updates their levels; if their plan needs to change, it becomes a draft for you to approve.'),
    s.signals.map((x) => h('div', { class: 'row', style: 'gap:8px;padding:4px 0' }, h('span', { class: `chip ${{ gap: 'coral', developing: 'amber', solid: 'green' }[x.rating]}` }, x.rating), h('b', null, x.label || x.scenario), h('span', { class: 'muted small' }, `“${x.example}”`))),
    h('button', { class: 'btn primary', style: 'margin-top:8px', on: { click: async () => {
      try { const r = await api('POST', `/api/admin/trainees/${s.people[0].id}/inputs`, { kind: 'one_to_one', title: s.title, happened_on: String(s.happened_on).slice(0, 10), body: `From the session "${s.title}" (Sessions page).`, signals: s.signals.map(({ scenario, rating }) => ({ scenario, rating, note: 'From a session transcript' })) }); toast(r.planChanged ? 'Added. Their plan changed: approve it on their page.' : 'Added to their inputs'); } catch (e) { toast(e.message, true); }
    } } }, `Add to ${s.people[0].name.split(' ')[0]}'s inputs`)) : null;

  box.append(...[
    h('div', { class: 'page-head' }, h('div', null, h('a', { href: '#sessions', class: 'muted small' }, '← Imports · Sessions'), h('h1', null, s.title),
      h('p', null, `${KIND[s.kind]} · ${fmtDate(s.happened_on)}${s.people.length ? ` · ${s.people.map((p) => p.name).join(', ')}` : ''}${s.duration_s ? ` · ${Math.round(s.duration_s / 60)} min` : ''}`)),
    h('button', { class: 'btn', on: { click: async () => { if (!confirmDelete.hidden) { try { await api('DELETE', `/api/admin/sessions/${s.id}`); toast('Deleted'); location.hash = 'sessions'; } catch (e) { toast(e.message, true); } } else confirmDelete.hidden = false; } } }, 'Delete session')),
    confirmDelete,
    s.status === 'processing' || s.status === 'uploaded' ? h('div', { class: 'card' }, h('div', { class: 'processing' }, h('span', { class: 'spin' }), `Analysing… ${s.progress || 0}%. This page refreshes by itself.`), h('div', { class: 'ph-bar' }, h('i', { style: `width:${s.progress || 0}%` }))) : null,
    s.status === 'failed' ? h('div', { class: 'card warn-card' }, h('b', null, 'The analysis failed. '), s.error) : null,
    s.status === 'ready' ? h('div', { class: 'grid g4' },
      ...['gap', 'partly', 'covered'].map((k) => h('div', { class: 'card kpi' }, h('div', { class: 'label' }, COV[k][1]), h('div', { class: 'value' }, findings.filter((f) => f.coverage === k).length), h('div', { class: 'note' }, k === 'gap' ? 'Candidates for new content' : k === 'partly' ? 'Worth a clearer lesson' : 'Already in the Academy'))),
      h('div', { class: 'card kpi' }, h('div', { class: 'label' }, 'Added'), h('div', { class: 'value' }, findings.filter((f) => f.status === 'faq' || f.status === 'item').length), h('div', { class: 'note' }, 'FAQ entries and questions'))) : null,
    signalsBox,
    s.status === 'ready' ? (findings.length ? byMod.map((k) => h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, modTitle[k] || k), findings.filter((f) => f.module === k).map(card)))
      : h('div', { class: 'card empty', style: 'margin-top:16px' }, h('b', null, 'No product question found'), 'The transcript did not contain questions about KUDO scenarios.')) : null,
    s.transcript ? h('details', { class: 'card', style: 'margin-top:16px' }, h('summary', null, 'Transcript'), h('div', { class: 'pre', style: 'max-height:420px;overflow:auto' }, s.transcript)) : null].flat().filter(Boolean));
  return box;
}
const confirmDelete = h('div', { class: 'card warn-card', hidden: true }, 'Click "Delete session" again to delete it, with its transcript and findings. Content already added to the Academy stays.');

// What sessions added to the Academy (FAQ entries and check questions), with a way to withdraw each one.
function publishedCard() {
  const box = h('div', { class: 'card', style: 'margin-top:16px' });
  const load = async () => {
    const { notes } = await api('GET', '/api/admin/field-notes');
    if (!notes.length) { box.hidden = true; return; }
    box.hidden = false;
    box.replaceChildren(h('h2', null, 'Added to the Academy'), h('p', { class: 'sub keep' }, `${notes.length} FAQ entr${notes.length === 1 ? 'y' : 'ies'} and check questions from sessions`),
      ...notes.map((n) => h('div', { class: 'row spread', style: 'padding:8px 0;border-top:1px solid var(--border-soft);gap:12px' },
        h('div', null, h('span', { class: 'chip grey', style: 'margin-right:6px' }, n.kind === 'faq' ? 'FAQ' : 'Check question'), h('b', null, n.question), h('div', { class: 'muted small' }, `${n.module_key} · ${fmtDate(n.published_at)}`)),
        h('button', { class: 'btn sm', on: { click: async () => { if (!window.confirm('Withdraw it from the Academy? Trainees stop seeing it; the session finding goes back to open.')) return; try { await api('DELETE', `/api/admin/field-notes/${n.id}`); toast('Withdrawn'); load(); } catch (e) { toast(e.message, true); } } } }, 'Withdraw'))));
  };
  load().catch(() => { box.hidden = true; });
  return box;
}
