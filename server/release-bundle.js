// Release-note bundles: a Word file with the release e-mails embedded in it (Outlook .msg files dropped into the
// document). The Academy reads every e-mail, keeps the product content only (no greeting, sign-off, signature, quoted
// reply or link) and turns it into release notes: one release per version, follow-up e-mails ("Re: ...") merged into
// the release they complete.
import zlib from 'node:zlib';
import CFB from 'cfb';

/** Every file of a .zip (a .docx is one), by name. */
export function zipEntries(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('This Word file could not be read.');
  const out = new Map(), n = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16);
  for (let k = 0; k < n; k++) {
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nameLen = buf.readUInt16LE(p + 28), extra = buf.readUInt16LE(p + 30), comment = buf.readUInt16LE(p + 32), local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28), raw = buf.subarray(start, start + csize);
    out.set(name, method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw));
    p += 46 + nameLen + extra + comment;
  }
  return out;
}

const stream = (cfb, name) => { const e = cfb.FileIndex.find((f) => f.name === name); return e?.content ? Buffer.from(e.content) : null; };

/** An embedded "Package" object: the file name and the bytes of the file inside it. */
function ole10Native(bin) {
  const d = stream(CFB.read(bin, { type: 'buffer' }), '\x01Ole10Native'); if (!d) return null;
  let p = 6; const cstr = () => { const e = d.indexOf(0, p); const s = d.toString('latin1', p, e); p = e + 1; return s; };
  const name = cstr(); cstr(); p += 4; p += 4 + d.readUInt32LE(p);
  const size = d.readUInt32LE(p); return { name: name.split(/[\\/]/).pop(), data: d.subarray(p + 4, p + 4 + size) };
}

/** Subject and plain-text body of an Outlook .msg file. */
function msgFields(buf) {
  const cfb = CFB.read(buf, { type: 'buffer' });
  const get = (tag) => { const u = stream(cfb, `__substg1.0_${tag}001F`); if (u) return u.toString('utf16le').replace(/\0+$/, ''); const a = stream(cfb, `__substg1.0_${tag}001E`); return a ? a.toString('latin1').replace(/\0+$/, '') : ''; };
  return { subject: get('0037'), body: get('1000') };
}

/** The e-mails embedded in a Word file, in document order. */
export function emailsFromDocx(buf) {
  const z = zipEntries(buf), xml = z.get('word/document.xml')?.toString('utf8') || '', rels = z.get('word/_rels/document.xml.rels')?.toString('utf8') || '';
  const target = Object.fromEntries([...rels.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], m[2]]));
  const seen = new Set(), out = [];
  for (const [, id] of xml.matchAll(/r:id="(rId\d+)"/g)) {
    const t = target[id]; if (!t || !t.startsWith('embeddings/') || seen.has(t)) continue; seen.add(t);
    try { const f = ole10Native(z.get(`word/${t}`)); if (f && /\.msg$/i.test(f.name)) out.push({ file: f.name, ...msgFields(f.data) }); } catch { /* not an e-mail: skipped */ }
  }
  return out;
}

const MONTHS = 'january february march april may june july august september october november december'.split(' ');
function dateOf(t) {
  const m = t.match(/(\d{1,2})\s+([A-Za-z]{3,9}),?\s+(\d{4})/) || t.match(/([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/);
  if (!m) return null;
  const [d, mon, y] = /^\d/.test(m[1]) ? [m[1], m[2], m[3]] : [m[2], m[1], m[3]];
  const k = MONTHS.findIndex((x) => x.startsWith(mon.toLowerCase().slice(0, 3)));
  return k < 0 ? null : `${y}-${String(k + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
const versionOf = (t) => t.match(/v\.?\s?(\d+(?:\.\d+)+)/i)?.[1] || null;

// What is not product content: greetings, the intro line, the date line, links to recordings or boards, sign-offs.
const NOISE = /^(hello|hi|dear)\b.*$|please take a look|here is (a|the) summary|^release date|^version\s*:|check out our latest|monday board|this recording|^apologies/i;
const STOP = /^(from:|sent:|-{3,}|_{5,}|a big thank you|best,?$|thanks,?$|thank you,?$|regards,?$|kind regards|cheers,?$)/i;
// A section heading is a line made only of section words ("New Features & Improvements", "Fixes and improvements").
const SECTION_LINE = /^((new|other|bug|minor)\s+)?(features?|integrations?|enhancements?|improvements?|fixes|known issues?|limitations?|still in progress|in progress|deprecations?|removed|changes)(\s*(&|and|,)\s*((new|bug|other)\s+)?(features?|integrations?|enhancements?|improvements?|fixes|changes))*\s*:?$/i;
const SECTIONS = [[/known issue|limitation|still in progress|in progress|not included|working on/i, 'Known issues'], [/deprecat|removed|retire/i, 'Removed'], [/feature|what'?s new|integration|^new\b/i, 'New features'], [/fix|bug|improvement|enhancement/i, 'Fixes']];

/** One e-mail as release-note text: section headings, then one "* Title: description" line per change. */
export function emailToNotes(body, { followUp = false } = {}) {
  const lines = [];
  for (const raw of String(body || '').replace(/\r/g, '').split('\n')) {
    const t = raw.replace(/ /g, ' ').replace(/<https?:[^>]*>|https?:\/\/\S+/g, '').trimEnd();
    if (STOP.test(t.trim())) break;
    if (!t.trim() || NOISE.test(t.trim())) continue;
    const m = t.match(/^(\s*)[*•\-–·]\s*(.*)$/);
    lines.push(m ? { bullet: true, depth: (m[1].match(/\t/g) || []).length + Math.floor((m[1].match(/ /g) || []).length / 3), text: m[2].trim() } : { bullet: false, indent: /^\s/.test(t), text: t.trim() });
  }
  // A bullet with no text takes the next line as its text.
  for (let i = 0; i < lines.length; i++) if (lines[i].bullet && !lines[i].text && lines[i + 1] && !lines[i + 1].bullet) { lines[i].text = lines[i + 1].text; lines.splice(i + 1, 1); }
  const looksTitle = (l) => l && !l.bullet && l.text.length <= 90 && !/[.!?:;,]$/.test(l.text) && !/^[a-z]/.test(l.text);
  const out = []; let section = followUp ? 'Fixes' : 'New features', group = null, item = null, run = false;
  const flush = () => { if (item) { out.push({ section, ...item }); item = null; } run = false; };
  const flushGroup = () => { if (group && group.parts.length) out.push({ section, title: group.title, body: group.parts.join('; ') }); group = null; };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i], next = lines[i + 1];
    const sec = !l.bullet && SECTION_LINE.test(l.text) ? SECTIONS.find(([re]) => re.test(l.text)) : null;
    if (sec) { flush(); flushGroup(); section = sec[1]; continue; }
    if (l.bullet && l.depth > 0) { if (group) group.parts.push(l.text); else if (item) item.body += `${item.body ? '; ' : ''}${l.text}`; continue; }
    if (l.bullet) {
      if (group) { group.parts.push(l.text); continue; }
      const c = l.text.match(/^([^:]{3,90}):\s+(.+)$/);
      const short = l.text.length <= 120 && !(c && !/[.!?]/.test(c[1]));
      const ownParagraph = next && !next.bullet && !looksTitle(next) && !SECTION_LINE.test(next.text);
      // Short bullets under a titled change are its details ("Last Name", "Email", "Password").
      if (short && item && item.title && (!ownParagraph || run)) { run = true; item.body += `${item.body ? (/[.!?]$/.test(item.body) ? ' ' : '; ') : ''}${l.text.replace(/[.;]$/, '')}`; continue; }
      // An untitled intro sentence ("The team is working on two issues:") gives way to the bullets under it.
      if (item && !item.title && short && !ownParagraph) item = null;
      flush();
      if (c && !/[.!?]/.test(c[1])) item = { title: c[1], body: c[2] };
      else if (l.text.length <= 90 && !/[.!?]$/.test(l.text)) item = { title: l.text, body: '' };
      else item = { title: '', body: l.text };
      continue;
    }
    // A short line on its own is a title: of the paragraph under it, or of the bullets under it.
    if (looksTitle(l) && next) {
      flush(); flushGroup();
      if (next.bullet && next.depth === 0) group = { title: l.text, parts: [] };
      else if (!looksTitle(next)) item = { title: l.text, body: '' };
      continue; // a title followed by another title is an area name (e.g. "Management Console"): dropped
    }
    if (group) { group.parts.push(l.text); continue; }
    if (item) { item.body += `${item.body ? (run ? '. ' : ' ') : ''}${l.text}`; run = false; continue; }
    item = { title: '', body: l.text.replace(/^I forgot to mention in my previous email that\s*(we have also released\s*)?/i, '').replace(/^Regarding my previous email,\s*/i, '') };
  }
  flush(); flushGroup();
  // A change without a title gets one: the words before its first colon, or its first clause, cut at a word.
  const titleOf = (t) => { const c = t.match(/^([^:.]{8,80}):/); if (c) return c[1]; const s1 = (t.match(/^(.{12,}?)[.!?,;](\s|$)/)?.[1] || t); return s1.length <= 80 ? s1 : `${s1.slice(0, 78).replace(/\s+\S*$/, '')}…`; };
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const order = ['New features', 'Fixes', 'Known issues', 'Removed'];
  const items = out.filter((x) => (x.title || x.body).length > 3 && (x.body || !x.title || x.title.length > 25))
    .map((x) => {
      let body = cap((x.body || x.title).replace(/\s+/g, ' ').trim());
      const sec = /not included in this release|will be released (soon|later)|still (being )?work/i.test(body) ? 'Known issues' : x.section;
      let title = cap((x.title || titleOf(body)).replace(/\s+/g, ' ').trim()).replace(/[:\s]+$/, '');
      // The body does not repeat its title.
      if (body.toLowerCase().startsWith(title.toLowerCase())) body = cap(body.slice(title.length).replace(/^[\s:.,;-]+/, '')) || '';
      return { section: sec, title, body };
    });
  return order.map((s) => { const its = items.filter((x) => x.section === s); return its.length ? `${s}\n${its.map((x) => (x.body ? `* ${x.title}: ${x.body}` : `* ${x.title}`)).join('\n')}` : null; }).filter(Boolean).join('\n\n');
}

/** Releases from a Word bundle: one per version, newest last, with title, version, date and release-note text. */
export function releasesFromDocx(buf, { versionFix = {} } = {}) {
  const emails = emailsFromDocx(buf);
  const rel = [];
  for (const e of emails) {
    const followUp = /^\s*(re|fw|fwd)\s*:/i.test(e.subject);
    const version = versionFix[versionOf(e.subject) + '@' + dateOf(e.subject)] || versionOf(e.subject) || versionOf(e.body);
    const released_on = dateOf(e.subject) || dateOf(e.body);
    const notes = emailToNotes(e.body, { followUp });
    if (!notes) continue;
    const same = rel.find((r) => r.version === version && r.released_on === released_on);
    if (followUp && same) {
      // A follow-up that says a fix is not in the release takes the matching change out, then adds it as a known issue.
      const words = (t) => new Set(t.toLowerCase().match(/[a-z]{5,}/g) || []);
      for (const known of notes.split('\n').filter((l) => l.startsWith('* ') && /not included/i.test(l))) {
        const kw = words(known); let best = null, bestScore = 0;
        for (const line of same.text.split('\n').filter((l) => l.startsWith('* '))) { const lw = words(line); const sc = [...kw].filter((w) => lw.has(w)).length / Math.max(1, Math.min(kw.size, lw.size)); if (sc > bestScore) { bestScore = sc; best = line; } }
        if (best && bestScore >= 0.3) same.text = same.text.split('\n').filter((l) => l !== best).join('\n');
      }
      same.text += `\n\n${notes}`; continue;
    }
    rel.push({ title: version ? `KUDO ${version}` : e.subject.replace(/^\s*(re|fw|fwd)\s*:\s*/i, '').trim(), version, released_on, text: notes });
  }
  return rel.sort((a, b) => String(a.released_on).localeCompare(String(b.released_on)));
}
