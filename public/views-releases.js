// Release notes (admin): import a KUDO release note, review what it changes in the Academy, apply or undo.
import { h, api, toast, fmtDate, importsHead } from './ui.js';

const KIND = { feature: ['New feature', 'blue'], fix: ['Fix or improvement', 'grey'], known: ['Known issue', 'amber'], removed: ['Removed', 'coral'] };
const PLURAL = { feature: ['new feature', 'new features'], fix: ['fix', 'fixes'], known: ['known issue', 'known issues'], removed: ['removal', 'removals'] };
const field = (label, el, hint) => h('label', { class: 'f' }, h('span', { class: 'l' }, label), el, hint ? h('span', { class: 'hint' }, hint) : null);
const b64 = (buf) => { let s = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000)); return btoa(s); };

export async function releasesView() {
  const { releases } = await api('GET', '/api/admin/releases');
  const title = h('input', { type: 'text', maxlength: 200, placeholder: 'For example: Release 24 November 2026' });
  const date = h('input', { type: 'date', value: new Date().toISOString().slice(0, 10) });
  const text = h('textarea', { style: 'min-height:220px', placeholder: 'Paste the release note: one bullet per change, under headings such as New features and Fixes and improvements' });
  let docx = null;
  const file = h('input', { type: 'file', accept: '.txt,.md,.docx', on: { change: async (e) => {
    const f = e.target.files[0]; if (!f) return; docx = null;
    if (/\.docx$/i.test(f.name)) { docx = b64(await f.arrayBuffer()); text.value = ''; text.placeholder = `${f.name} will be read when you analyse it`; } else text.value = await f.text();
    if (!title.value) title.value = f.name.replace(/\.[^.]+$/, '');
  } } });
  const go = h('button', { class: 'btn primary', type: 'button', on: { click: async () => {
    if (!docx && text.value.trim().length < 20) return toast('Paste the release note first', true);
    go.disabled = true; go.textContent = 'Analysing…';
    try { const r = await api('POST', '/api/admin/releases', { title: title.value, released_on: date.value, text: text.value, docx }); location.hash = `release-${r.id}`; }
    catch (e) { toast(e.message, true); go.disabled = false; go.textContent = 'Analyse release'; }
  } } }, 'Analyse release');

  const steps = [['Reads it', 'Each bullet becomes an item: new feature, fix or known issue.'], ['Finds where it lands', 'Maps each item to the modules it concerns, from what it says and the product names it uses.'],
    ['Flags what is out of date', 'Lesson lines and check questions the change may have made wrong, with a rewrite when the note says what replaced what.'], ['Drafts the updates', 'A What\'s new entry, a lesson FAQ entry, rewritten lines and questions to retire. You tick, edit and apply. Undo any time.']];
  const list = releases.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
    h('thead', null, h('tr', null, ['Release', 'Items', 'Modules', 'Flagged', 'Status', ''].map((x) => h('th', null, x)))),
    h('tbody', null, releases.map((r) => h('tr', null,
      h('td', null, h('b', null, r.title), h('div', { class: 'muted small' }, fmtDate(r.released_on))),
      h('td', null, String(r.count)), h('td', { class: 'small' }, `${r.modules.length}`),
      h('td', null, r.flagged ? String(r.flagged) : '–'),
      h('td', null, r.status === 'applied' ? h('span', { class: 'chip green' }, `Applied · ${r.notes + r.edits} changes`) : h('span', { class: 'chip amber' }, 'To review')),
      h('td', null, h('a', { class: 'btn sm', href: `#release-${r.id}` }, r.status === 'applied' ? 'Open' : 'Review'))))))) : h('div', { class: 'card empty' }, h('b', null, 'No release notes yet'), 'Import the next one when it comes out: the Academy keeps up with the product.');

  return h('div', { class: 'page' },
    ...importsHead('releases', 'Paste a KUDO release note. The Academy finds what it changes in the lessons and questions, drafts the updates, and you apply them.'),
    h('div', { class: 'grid g-8-4' },
      h('div', { class: 'card' }, h('h2', null, 'Import a release note'),
        h('div', { class: 'grid g2' }, field('Title', title), field('Release date', date)),
        field('Release note', text), field('Or a file', file, '.txt, .md or Word (.docx)'), h('div', { class: 'row' }, go)),
      h('div', { class: 'card' }, h('h2', null, 'What happens next'), h('ol', { class: 'rl-steps' }, steps.map(([t, d]) => h('li', null, h('b', null, t), h('span', null, d)))))),
    h('h2', { style: 'margin:28px 0 12px' }, 'Imported releases'), list);
}

export async function releaseView(id) {
  const r = await api('GET', `/api/admin/releases/${id}`);
  const modTitle = (k) => r.modules.find((m) => m.key === k)?.title || k;
  const applied = r.status === 'applied';
  const count = h('span');
  const applyBtn = h('button', { class: 'btn primary', type: 'button' });
  const tally = () => {
    let n = 0;
    for (const it of r.items) { if (it.status !== 'open') continue; const a = it.actions; n += (a.whatsnew.on ? 1 : 0) + (a.faq.on ? 1 : 0) + a.edits.filter((e) => e.on).length + a.retire.filter((e) => e.on).length; }
    applyBtn.textContent = n ? `Apply ${n} change${n > 1 ? 's' : ''}` : 'Nothing ticked'; applyBtn.disabled = !n;
    count.textContent = `${r.items.filter((i) => i.status === 'open').length} items to apply`;
  };
  applyBtn.addEventListener('click', async () => {
    applyBtn.disabled = true;
    try { const { done } = await api('POST', `/api/admin/releases/${id}/apply`); toast(`Applied: ${done.whatsnew} news, ${done.faq} FAQ, ${done.edits} lines rewritten, ${done.retired} questions retired`); location.reload(); }
    catch (e) { toast(e.message, true); applyBtn.disabled = false; }
  });

  const save = (it) => { clearTimeout(it._t); it._t = setTimeout(() => api('PUT', `/api/admin/releases/${id}/items/${it.id}`, { actions: it.actions, modules: it.modules, status: it.status }).catch((e) => toast(e.message, true)), 400); tally(); };

  const itemCard = (it) => {
    const a = it.actions, ro = applied || it.status !== 'open';
    const [kl, kc] = KIND[it.kind] || KIND.feature;
    const tick = (obj, label, extra = null) => {
      const box = h('input', { type: 'checkbox', checked: obj.on, disabled: ro, on: { change: () => { obj.on = box.checked; extraBox.hidden = !box.checked; save(it); } } });
      const extraBox = h('div', { class: 'rl-extra', hidden: !obj.on }, extra);
      return h('div', { class: 'rl-act' }, h('label', { class: 'rl-tick' }, box, h('span', null, label)), extra ? extraBox : null);
    };
    // Modules: chips, removable, plus a picker
    const mods = h('div', { class: 'rl-mods' });
    const drawMods = () => mods.replaceChildren(h('span', { class: 'muted small' }, 'Concerns'),
      ...(it.modules.length ? it.modules.map((k) => h('span', { class: 'chip blue' }, modTitle(k), ro ? null : h('button', { class: 'chip-x', type: 'button', 'aria-label': `Remove ${modTitle(k)}`, on: { click: () => { it.modules = it.modules.filter((x) => x !== k); drawMods(); save(it); } } }, '×'))) : [h('span', { class: 'chip grey' }, 'General: no module')]),
      ro || it.modules.length >= 3 ? null : h('select', { class: 'rl-add', 'aria-label': 'Add a module', on: { change: (e) => { if (e.target.value) { it.modules.push(e.target.value); drawMods(); save(it); } } } }, h('option', { value: '' }, '+ Module'), r.modules.filter((m) => !it.modules.includes(m.key)).map((m) => h('option', { value: m.key }, m.title))));
    drawMods();

    if (!a.faq.module) a.faq.module = it.modules[0] || r.modules[0].key;
    const faqQ = h('input', { type: 'text', value: a.faq.question, disabled: ro, on: { input: (e) => { a.faq.question = e.target.value; save(it); } } });
    const faqA = h('textarea', { disabled: ro, on: { input: (e) => { a.faq.answer = e.target.value; save(it); } } }); faqA.value = a.faq.answer;
    const faqMod = h('select', { disabled: ro, on: { change: (e) => { a.faq.module = e.target.value; save(it); } } }, r.modules.map((m) => h('option', { value: m.key, selected: m.key === a.faq.module }, m.title)));

    const flags = it.flags.map((f) => {
      const strong = f.strength === 'strong';
      const head = h('div', { class: 'rl-fh' }, h('span', { class: `chip ${strong ? 'coral' : 'amber'}` }, strong ? 'Likely out of date' : 'Worth a check'), h('span', { class: 'muted small' }, `${modTitle(f.module)} · ${f.where}`));
      const orig = h('blockquote', { class: 'rl-orig' }, f.text, f.detail ? h('div', { class: 'muted small', style: 'margin-top:4px' }, f.detail) : null);
      let act = null;
      if (f.kind === 'line') {
        const e = a.edits.find((x) => x.ref === f.ref);
        const ta = h('textarea', { disabled: ro, on: { input: (ev) => { e.text = ev.target.value; save(it); } } }); ta.value = e.text;
        act = tick(e, f.suggestion ? 'Replace the line with this rewrite' : 'Rewrite this line', [ta, f.suggestion ? h('span', { class: 'hint' }, 'Drafted from the note. Check it before you apply.') : h('span', { class: 'hint' }, 'Edit the text: trainees see the new line, marked as updated.')]);
      } else {
        const e = a.retire.find((x) => x.ref === f.ref);
        act = tick(e, 'Retire this question', h('span', { class: 'hint' }, 'It leaves the check pool. You can write a new one from a session, or ask for one.'));
      }
      return h('div', { class: `rl-flag ${strong ? 'strong' : ''}` }, head, h('p', { class: 'small', style: 'margin:6px 0' }, f.reason), orig, act);
    });

    const status = it.status === 'applied' ? h('span', { class: 'chip green' }, 'Applied') : it.status === 'skipped' ? h('span', { class: 'chip grey' }, 'Skipped') : null;
    const skip = applied || it.status === 'applied' ? null : h('button', { class: 'btn sm', type: 'button', on: { click: () => { it.status = it.status === 'skipped' ? 'open' : 'skipped'; save(it); card.replaceWith(itemCard(it)); } } }, it.status === 'skipped' ? 'Include again' : 'Skip this item');
    const card = h('section', { class: `card rl-item ${it.status}` },
      h('div', { class: 'rl-ih' }, h('div', null, h('span', { class: `chip ${kc}` }, kl), h('h3', null, it.title)), h('div', { class: 'row' }, status, skip)),
      h('p', { class: 'rl-body' }, it.body), mods,
      it.status === 'skipped' ? null : h('div', { class: 'rl-acts' },
        h('div', { class: 'rl-sub' }, 'Proposed changes'),
        tick(a.whatsnew, h('span', null, h('b', null, 'Publish in What\'s new. '), h('span', { class: 'muted' }, it.modules.length ? `Trainees see it on their programme and at the top of the ${it.modules.map(modTitle).join(', ')} lesson${it.modules.length > 1 ? 's' : ''}` : 'Trainees see it on their programme'))),
        tick(a.faq, h('span', null, h('b', null, 'Add a lesson FAQ entry')), [field('Lesson', faqMod), field('Question', faqQ), field('Answer', faqA)]),
        flags.length ? h('div', { class: 'rl-sub', style: 'margin-top:14px' }, `What the Academy says today (${flags.length})`) : h('p', { class: 'muted small', style: 'margin:10px 0 0' }, 'Nothing in the lessons or questions contradicts this change.'),
        ...flags));
    return card;
  };

  const kinds = r.items.reduce((t, i) => { t[i.kind] = (t[i.kind] || 0) + 1; return t; }, {});
  const flagged = r.items.flatMap((i) => i.flags), strong = flagged.filter((f) => f.strength === 'strong').length;
  const touched = [...new Set(r.items.flatMap((i) => i.modules))];
  const stat = (k, v, s) => h('div', { class: 'jm-fact' }, h('span', { class: 'jm-fk' }, k), h('b', null, v), s ? h('span', { class: 'jm-fs' }, s) : null);
  tally();
  return h('div', { class: 'page rl-page' },
    h('a', { href: '#releases', class: 'muted small' }, '← Imports · Release notes'),
    h('div', { class: 'page-head', style: 'margin-top:8px' }, h('div', null, h('h1', null, r.title), h('p', null, `Released ${fmtDate(r.released_on)}${applied ? ` · applied ${fmtDate(r.applied_at)}` : ' · not applied yet'}`)),
      h('div', { class: 'row' }, applied ? h('button', { class: 'btn', on: { click: async () => { if (!confirm('Undo every change this release made? News and FAQ entries are withdrawn, lines go back to what they said and questions return to the pool.')) return; await api('POST', `/api/admin/releases/${id}/revert`); toast('Changes undone'); location.reload(); } } }, 'Undo all changes')
        : h('button', { class: 'btn', on: { click: async () => { if (!confirm('Delete this import?')) return; try { await api('DELETE', `/api/admin/releases/${id}`); location.hash = 'releases'; } catch (e) { toast(e.message, true); } } } }, 'Delete import'))),
    h('div', { class: 'jm-head' },
      stat('Items', String(r.items.length), Object.entries(kinds).map(([k, n]) => `${n} ${(PLURAL[k] || PLURAL.feature)[n > 1 ? 1 : 0]}`).join(' · ')),
      stat('Modules concerned', String(touched.length), touched.slice(0, 3).map(modTitle).join(', ') + (touched.length > 3 ? '…' : '')),
      stat('Likely out of date', String(strong), strong ? 'Lines or questions that contradict the note' : 'Nothing contradicts the note'),
      stat('Worth a check', String(flagged.length - strong), 'Close to what changed')),
    ...r.items.map(itemCard),
    applied ? null : h('div', { class: 'rl-bar' }, h('span', { class: 'muted' }, count, '. Nothing reaches trainees until you apply.'), applyBtn));
}
