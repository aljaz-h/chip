/* CHIP - Fusion badge builder for Nuvio. Plain JS, no dependencies. */
(() => {
'use strict';
const C = window.CATALOG;
if (document.documentElement.dataset.v !== window.CHIP_V && window.chipBanner) window.chipBanner('This page loaded mismatched files from an update. Hard-refresh (Ctrl+Shift+R, or Cmd+Shift+R on Mac).');
const KEY = 'chip:v1';
const STYLES = ['filled', 'bordered', 'filled and bordered'];
const PRESETS = Object.fromEntries(C.presets.map(p => [p.key, { ...p, theme: p.key }]));
PRESETS.yours = { key: 'yours', label: 'Yours', style: 'filled and bordered', fill: '#1a2233', border: '#8fb4ff', text: '#c4d6ff', theme: 'ash' };
PRESETS.custom = { key: 'custom', label: 'Yours', art: true, style: 'bordered', fill: 'none', border: 'none', text: '#ffffff', theme: 'custom' };
/* Colors are two layers: a palette (the preset) and a fill style applied on top of it. */
const FILL_STYLES = [['default', 'As designed'], ['filled', 'Filled'], ['bordered', 'Bordered'], ['both', 'Filled + border'], ['soft', 'Soft']];
const hex6 = c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
function restyle(c, fs) {
  const a = hex6(c.border) && lumOf(c.border) > .04 ? c.border : hex6(c.fill) && lumOf(c.fill) > .01 ? c.fill : hex6(c.border) ? c.border : null;
  if (!fs || fs === 'default' || !a) return c;
  const tint = t => { const n = parseInt(a.slice(1), 16); return '#' + [n >> 16 & 255, n >> 8 & 255, n & 255].map(x => Math.round(x + (255 - x) * t).toString(16).padStart(2, '0')).join(''); };
  const lift = lumOf(a) < .25 ? tint(.6) : lumOf(a) < .5 ? tint(.4) : a;
  if (fs === 'filled') return { ...c, fill: a, border: 'none', text: lumOf(a) > .35 ? '#121213' : '#f4f4f5', style: 'filled' };
  if (fs === 'bordered') return { ...c, fill: 'none', border: a, text: lift, style: 'bordered' };
  if (fs === 'both') return { ...c, fill: mixc(a, .22), border: a, text: lift, style: 'filled and bordered' };
  if (fs === 'soft') return { ...c, fill: mixc(a, .3), border: 'none', text: lift, style: 'filled' };
  return c;
}
function presetFor(p, gid, fs = S && S.fillStyle) {
  let base = p;
  if (p.key === 'yours') { const a = (S && S.accent) || '#8fb4ff'; base = { ...p, fill: mixc(a, .22), border: a, text: mixc(a, 1.5) }; }
  const c = { fill: base.fill, style: base.style, border: base.border, text: base.text, ...((base.groups || {})[gid] || {}) };
  return p.art ? c : restyle(c, fs);
}

const $ = (s, r = document) => r.querySelector(s);
function el(tag, props, ...kids) {
  const n = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (k === 'style') Object.assign(n.style, v);
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k in n) n[k] = v; else n.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) n.append(k.nodeType ? k : document.createTextNode(k));
  return n;
}

/* ---------- state ---------- */
let S;
function fresh(preset = 'ash') {
  const p = PRESETS[preset];
  return {
    v: 1, mode: 'text', theme: p.theme, preset, base: '', sel: null, q: '', embed: true, urlMode: 'gist', nround: true, corners: 'round', fillStyle: 'default', accent: '#8fb4ff', design: seedDesign('clean'),
    titles: C.samples.join('\n'),
    groups: C.groups.map((g, i) => ({ id: g.id, name: g.name, ...presetFor(p, g.id, 'default'), open: i === 0 })),
    badges: C.badges.map(b => ({ ...b, base: true })),
  };
}
function normalize(s) {
  if (!s.design) s.design = seedDesign('clean');
  if (s.urlMode !== 'gist' && s.urlMode !== 'manual') s.urlMode = 'gist';
  if (typeof s.nround !== 'boolean') s.nround = true;
  if (s.corners !== 'sharp') s.corners = 'round';
  if (!FILL_STYLES.some(f => f[0] === s.fillStyle)) s.fillStyle = 'default';
  if (!hex6(s.accent)) s.accent = '#8fb4ff';
  const have = new Set(s.badges.map(b => b.id)), gh = new Set(s.groups.map(g => g.id));
  C.groups.forEach(g => { if (!gh.has(g.id)) s.groups.push({ ...s.groups[0], id: g.id, name: g.name, open: false }); });
  C.badges.forEach(b => { if (!have.has(b.id)) s.badges.push({ ...b, base: true }); });
  return s;
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw); if (s && s.v === 1 && s.groups && s.badges) return normalize(s); }
  } catch (e) { /* storage unavailable */ }
  return fresh();
}
let saveT;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(flush, 250);
}
function flush() { clearTimeout(saveT); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

const G = id => S.groups.find(g => g.id === id) || S.groups[0];
const B = id => S.badges.find(b => b.id === id);
const resolve = b => {
  const g = G(b.g);
  return { fill: b.fill ?? g.fill, border: b.border ?? g.border, text: b.text ?? g.text, style: b.style ?? g.style };
};
const hex = c => (c === 'none' || !c) ? '#00000000' : c.toUpperCase();
function parseColor(c) {
  if (typeof c !== 'string') return undefined;
  const m = c.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (!m) return undefined;
  let h = m[1];
  if (h.length === 3) h = h.split('').map(x => x + x).join('');
  if (h.length === 8) { if (h.slice(0, 2) === '00') return 'none'; h = h.slice(2); } // AARRGGBB
  return '#' + h.toLowerCase();
}

/* ---------- regex ---------- */
const reCache = new Map();
function compile(p) {
  if (reCache.has(p)) return reCache.get(p);
  let s = p || '', flags = '', out;
  if (s.startsWith('(?i)')) { flags = 'i'; s = s.slice(4); }
  try { out = { re: new RegExp(s, flags) }; } catch (e) { out = { err: e.message.replace(/^Invalid regular expression: /, '') }; }
  reCache.set(p, out);
  return out;
}
const matches = (b, text) => { const c = compile(b.p); return !!(c.re && c.re.test(text)); };

/* ---------- export ---------- */
function baseUrl() {
  let u = (S.base || '').trim();
  if (!u) { try { u = new URL('badges/', location.href).href; } catch (e) { u = 'badges/'; } }
  return u.endsWith('/') ? u : u + '/';
}
const sfxFor = k => (S.corners === 'sharp' || (PRESETS[k] && PRESETS[k].noround)) ? '' : '-round';
const sfx = () => sfxFor(S.theme);
const customOn = b => S.mode === 'image' && S.theme === 'custom' && !b.img;
const artName = b => b.id.replace(/[^\w.-]/g, '_') + '.png';
function exportImg(b) {
  if (b.img) return b.img;
  if (customOn(b)) return S.embed ? (pngCache.get(artSvg(b)) || (kickPng(artSvg(b)), '')) : `${baseUrl()}custom/${artName(b)}`;
  if (S.mode === 'image' && b.base) return `${baseUrl()}${S.theme}${sfx()}/${b.id}.png?v=${C.artV}`;
  return '';
}
function previewImg(b) {
  if (b.img) return b.img;
  if (customOn(b)) return dataUri(artSvg(b));
  if (S.mode === 'image' && b.base) return `badges/${S.theme}${sfx()}/${b.id}.png`;
  return '';
}
function ordered() { // enabled badges in export order
  const out = [];
  for (const g of S.groups) for (const b of S.badges) if (b.g === g.id && b.on) out.push(b);
  return out;
}
function build() {
  const groups = [], filters = [];
  for (const g of S.groups) {
    const items = S.badges.filter(b => b.g === g.id && b.on);
    if (!items.length) continue;
    groups.push({ borderColor: hex(g.border), color: hex(g.fill), id: g.id, isExpanded: true, name: g.name });
    for (const b of items) {
      const r = resolve(b), f = { borderColor: hex(r.border), groupId: g.id, id: b.id };
      const u = exportImg(b); if (u) f.imageURL = u;
      Object.assign(f, { isEnabled: true, name: b.n, pattern: b.p, tagColor: hex(r.fill), tagStyle: r.style, textColor: hex(r.text), type: 'filter' });
      filters.push(f);
    }
  }
  return { groups, filters };
}

/* ---------- small UI parts ---------- */
function badgeEl(b) {
  const r = resolve(b), u = previewImg(b);
  if (u) return el('img', { className: 'badge-img', src: u, alt: b.n, title: b.n });
  const filled = r.style.includes('filled') && r.fill !== 'none';
  const bordered = r.style.includes('bordered') && r.border !== 'none';
  return el('span', { className: 'badge', title: b.n, style: {
    background: filled ? r.fill : 'transparent', borderColor: bordered ? r.border : 'transparent', color: r.text } }, b.n);
}

/* value: undefined = inherit, 'none', or '#rrggbb' */
function colorCtl(label, val, onChange, { inherit = false, onCommit } = {}) {
  const w = el('span', { className: 'col' });
  const inp = el('input', { type: 'color', value: (val && val !== 'none') ? val : '#000000', title: label, 'aria-label': label });
  const none = el('button', { className: 'sq', type: 'button', title: 'No color (transparent)', 'aria-label': label + ': transparent', textContent: '∅' });
  const inh = inherit ? el('button', { className: 'sq', type: 'button', title: 'Use category value', 'aria-label': label + ': inherit', textContent: '↺' }) : null;
  const paint = v => {
    w.classList.toggle('none', v === 'none'); w.classList.toggle('inh', v === undefined);
    none.classList.toggle('on', v === 'none'); if (inh) inh.classList.toggle('on', v === undefined);
  };
  paint(val);
  inp.addEventListener('input', () => { paint(inp.value); onChange(inp.value); });
  none.addEventListener('click', () => { const nv = val === 'none' ? (inherit ? undefined : inp.value) : 'none'; val = nv; paint(nv); onChange(nv); });
  if (inh) inh.addEventListener('click', () => { val = undefined; paint(undefined); onChange(undefined); });
  inp.addEventListener('input', () => { val = inp.value; });
  if (onCommit) inp.addEventListener('change', onCommit);
  w.append(el('span', null, label), inp, none);
  if (inh) w.append(inh);
  return w;
}
function styleSel(val, onChange, { inherit = false } = {}) {
  const s = el('select', { 'aria-label': 'Tag style' });
  if (inherit) s.append(el('option', { value: '', textContent: 'Style: category' }));
  for (const st of STYLES) s.append(el('option', { value: st, textContent: st }));
  s.value = val ?? '';
  s.addEventListener('change', () => onChange(s.value || undefined));
  return s;
}

/* ---------- renderers ---------- */
let msgT;
function msg(text, err) {
  const t = $('#toast'); clearTimeout(msgT);
  t.textContent = text || ''; t.className = 'toast' + (err ? ' err' : '') + (text ? ' show' : '');
  if (text && !text.endsWith('…')) msgT = setTimeout(() => t.classList.remove('show'), err ? 14000 : 5000);
}

function miniBadge(p, gid, text) {
  const c = presetFor(p, gid);
  return el('span', { className: 'badge', style: {
    background: c.style.includes('filled') && c.fill !== 'none' ? c.fill : 'transparent',
    borderColor: c.style.includes('bordered') ? c.border : 'transparent', color: c.text } }, text);
}
function renderPresets() {
  const colors = $('#presets'), designs = $('#designs');
  colors.replaceChildren(); designs.replaceChildren();
  const card = (k, p) => {
    const mini = p.art
      ? el('span', { className: 'pmini art' }, [['r-4k', 'gr', '4K'], ['v-dv', 'gv', 'DV'], ['a-atmos', 'ga', 'ATMOS']].map(([id, g, n]) =>
          el('img', { src: k === 'custom' ? dataUri(renderDesign(S.design, n, g)) : `badges/${k}${sfxFor(k)}/${id}.png`, alt: '', className: 'badge-img' })))
      : el('span', { className: 'pmini' }, miniBadge(p, 'gr', '4K'), miniBadge(p, 'gv', 'DV'), miniBadge(p, 'ga', 'ATMOS'));
    return el('button', { className: 'preset' + (k === 'custom' ? ' mine' : '') + (S.preset === k ? ' on' : ''), type: 'button', 'aria-pressed': String(S.preset === k), onclick: () => applyPreset(k) },
      el('span', { className: 'pname' }, k === 'custom' ? 'Yours · customize' : p.label), mini);
  };
  const mine = el('div', { className: 'pgrid' }, card('custom', PRESETS.custom)); designs.append(mine);
  for (const [k, p] of Object.entries(PRESETS)) if (!p.art && k !== 'custom' && k !== 'outline') colors.append(card(k, p));
  for (const cat of ['Soft', 'Sharp', 'Technical', 'Minimal', 'Expressive']) {
    const grid = el('div', { className: 'pgrid' });
    for (const [k, p] of Object.entries(PRESETS)) if (p.art && p.cat === cat) grid.append(card(k, p));
    designs.append(el('div', { className: 'sublbl', textContent: cat }), grid);
  }
}
function applyPreset(k) {
  const p = PRESETS[k], prev = PRESETS[S.preset];
  if (p.art) S.mode = 'image'; else if (prev && prev.art) S.mode = 'text';
  S.preset = k; S.theme = p.theme;
  for (const g of S.groups) Object.assign(g, presetFor(p, g.id));
  for (const b of S.badges) if (!b.borrowed) { delete b.fill; delete b.border; delete b.text; delete b.style; }
  renderAll(); save();
}

function renderFillStyle() {
  const native = !PRESETS[S.preset].art;
  const seg = $('#fillstyle'); seg.replaceChildren();
  for (const [v, l] of FILL_STYLES) seg.append(el('button', { type: 'button', className: S.fillStyle === v ? 'on' : '', textContent: l,
    onclick: () => { S.fillStyle = v; if (!PRESETS[S.preset].art) applyPreset(S.preset); else { renderFillStyle(); save(); } } }));
  $('#fill-wrap').hidden = !native;
  $('#yours-row').hidden = !(native && S.preset === 'yours');
  $('#yours-color').value = S.accent;
}
function renderStyle() {
  renderPresets();
  renderFillStyle();
  renderLab();
  document.querySelectorAll('#mode button').forEach(b => b.classList.toggle('on', b.dataset.mode === S.mode));
  $('#image-opts').hidden = S.mode !== 'image';
  document.querySelectorAll('#corners button').forEach(b => b.classList.toggle('on', b.dataset.c === S.corners));
  const th = $('#theme');
  if (!th.options.length) for (const [k, p] of Object.entries(PRESETS)) if (k !== 'yours') th.append(el('option', { value: k, textContent: p.label }));
  if (!PRESETS[S.theme]) S.theme = 'ash';
  th.value = S.theme;
  $('#base').value = S.base || '';
  $('#mode-hint').textContent = S.mode === 'text'
    ? 'Colored labels drawn by Nuvio from the settings below. Nothing needs hosting.'
    : 'Each badge uses a small PNG image from this site. Needs a public address (see below). Custom badges stay text unless you give them an image URL.';
  const g = $('#global'); g.replaceChildren();
  const first = S.groups[0] || {};
  const set = (key) => v => { for (const x of S.groups) x[key] = v; liveUpdate(); };
  const commit = () => { renderCatalog(); renderEditor(); };
  g.append(
    colorCtl('Fill', first.fill, set('fill'), { onCommit: commit }),
    colorCtl('Border', first.border, set('border'), { onCommit: commit }),
    colorCtl('Text', first.text, set('text'), { onCommit: commit }),
    styleSel(first.style, v => { set('style')(v); commit(); }));
}

function renderCatalog() {
  const root = $('#catalog'); root.replaceChildren();
  const q = S.q.trim().toLowerCase();
  const total = S.badges.length, on = S.badges.filter(b => b.on).length;
  $('#count').textContent = `${on} of ${total} on.`;
  S.groups.forEach((g, gi) => {
    const all = S.badges.filter(b => b.g === g.id);
    const list = q ? all.filter(b => (b.n + ' ' + b.id).toLowerCase().includes(q)) : all;
    if (q && !list.length) return;
    const open = q ? true : g.open;
    const onN = all.filter(b => b.on).length;
    const head = el('div', { className: 'grp-head' },
      el('button', { className: 'grp-toggle', type: 'button', 'aria-expanded': String(open), onclick: () => { g.open = !g.open; renderCatalog(); save(); } },
        el('span', { className: 'car' }, open ? '▾' : '▸'), g.name, el('span', { className: 'n' }, `${onN}/${all.length}`)),
      el('button', { className: 'sq', type: 'button', title: 'Turn category on', textContent: '+', onclick: () => { all.forEach(b => b.on = true); afterToggle(); } }),
      el('button', { className: 'sq', type: 'button', title: 'Turn category off', textContent: '−', onclick: () => { all.forEach(b => b.on = false); afterToggle(); } }),
      el('button', { className: 'sq', type: 'button', title: 'Move category up', textContent: '↑', disabled: gi === 0, onclick: () => { swap(S.groups, gi, gi - 1); renderCatalog(); renderPreview(); renderExport(); save(); } }),
      el('button', { className: 'sq', type: 'button', title: 'Move category down', textContent: '↓', disabled: gi === S.groups.length - 1, onclick: () => { swap(S.groups, gi, gi + 1); renderCatalog(); renderPreview(); renderExport(); save(); } }));
    const sec = el('div', { className: 'grp' }, head);
    if (open) {
      const commit = () => renderEditor();
      const gs = el('div', { className: 'grp-style' },
        colorCtl('Fill', g.fill, v => { g.fill = v; liveUpdate(); }, { onCommit: commit }),
        colorCtl('Border', g.border, v => { g.border = v; liveUpdate(); }, { onCommit: commit }),
        colorCtl('Text', g.text, v => { g.text = v; liveUpdate(); }, { onCommit: commit }),
        styleSel(g.style, v => { g.style = v; liveUpdate(); commit(); }));
      const rows = el('ul', { className: 'rows' });
      if (!list.length) rows.append(el('li', { className: 'empty' }, 'No badges in this category.'));
      for (const b of list) {
        const idx = all.indexOf(b);
        rows.append(el('li', { className: 'brow' + (b.on ? '' : ' off') + (S.sel === b.id ? ' sel' : ''), 'data-id': b.id },
          el('input', { type: 'checkbox', checked: b.on, 'aria-label': 'Include ' + b.n, onchange: e => { b.on = e.target.checked; afterToggle(); } }),
          el('span', { className: 'pv' }, badgeEl(b), el('span', { className: 'nm' }, b.base ? b.id : 'custom')),
          el('button', { className: 'sq', type: 'button', title: 'Move up', textContent: '↑', disabled: idx === 0 || !!q, onclick: () => { swapIn(all, idx, idx - 1); renderCatalog(); renderPreview(); renderExport(); save(); } }),
          el('button', { className: 'sq', type: 'button', title: 'Move down', textContent: '↓', disabled: idx === all.length - 1 || !!q, onclick: () => { swapIn(all, idx, idx + 1); renderCatalog(); renderPreview(); renderExport(); save(); } }),
          el('button', { className: 'sq' + (S.sel === b.id ? ' on' : ''), type: 'button', title: 'Edit', textContent: '✎', onclick: () => { S.sel = b.id; renderCatalog(); renderEditor(); save(); if (matchMedia('(max-width:999px)').matches) $('#editor').scrollIntoView(); } })));
      }
      sec.append(el('div', { className: 'grp-body' }, gs, rows));
    }
    root.append(sec);
  });
  if (!root.children.length) root.append(el('div', { className: 'empty' }, 'Nothing matches that search.'));
}
function swap(arr, i, j) { if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; }
function swapIn(groupList, i, j) { // swap two badges inside S.badges while keeping other badges where they are
  if (j < 0 || j >= groupList.length) return;
  const a = S.badges.indexOf(groupList[i]), b = S.badges.indexOf(groupList[j]);
  [S.badges[a], S.badges[b]] = [S.badges[b], S.badges[a]];
}
function repaintBadges() {
  document.querySelectorAll('.brow[data-id]').forEach(r => {
    const b = B(r.dataset.id), pv = r.querySelector('.pv'); if (b && pv) pv.replaceChild(badgeEl(b), pv.firstChild);
  });
  const p = $('#ed-prev'); if (p && S.sel && B(S.sel)) p.replaceChildren(badgeEl(B(S.sel)));
}
function liveUpdate() { repaintBadges(); renderPreview(); renderExport(); save(); }
function renderPacks() {
  const box = $('#packs'); if (!box) return; box.replaceChildren();
  for (const pk of C.packs) box.append(el('button', { type: 'button', className: 'preset pack', onclick: () => applyPack(pk) },
    el('span', { className: 'pname', textContent: pk.label }), el('span', { className: 'pdesc', textContent: pk.desc })));
}
function applyPack(pk) {
  const gs = new Set(pk.groups || []), ids = new Set(pk.ids || []), def = new Map(C.badges.map(b => [b.id, b.on]));
  let n = 0;
  for (const b of S.badges) {
    if (!b.base) continue;                      // your own badges stay as they are
    b.on = pk.all ? true : pk.rec ? !!def.get(b.id) : (ids.has(b.id) || gs.has(b.g));
    if (b.on) n++;
  }
  afterToggle(); msg(`${pk.label}: ${n} badges on. Your own badges were not changed.`);
}
function afterToggle() { renderCatalog(); renderPreview(); renderExport(); save(); }

function renderEditor() {
  const root = $('#editor-body'); root.replaceChildren();
  const b = S.sel && B(S.sel);
  if (!b) {
    root.append(el('p', { className: 'hint' }, 'Pick a badge with ✎ to change its name, pattern or colors. Or start a new one.'),
      el('button', { className: 'btn', type: 'button', onclick: newBadge }, '+ New custom badge'));
    return;
  }
  const upd = () => liveUpdate();
  const name = el('input', { type: 'text', value: b.n, spellcheck: false, id: 'ed-n', oninput: e => { b.n = e.target.value; upd(); } });
  const grp = el('select', { id: 'ed-g', onchange: e => { b.g = e.target.value; G(b.g).open = true; renderCatalog(); renderEditor(); liveUpdate(); } },
    S.groups.map(g => el('option', { value: g.id, textContent: g.name, selected: g.id === b.g })));
  const stat = el('p', { className: 'stat' });
  const pat = el('textarea', { rows: 3, id: 'ed-p', spellcheck: false, value: b.p, oninput: e => { b.p = e.target.value; test(); upd(); } });
  function test() {
    const c = compile(b.p);
    if (c.err) { stat.className = 'stat bad'; stat.textContent = 'Invalid pattern: ' + c.err; return; }
    const lines = S.titles.split('\n').map(x => x.trim()).filter(Boolean);
    const n = lines.filter(t => matches(b, t)).length;
    stat.className = 'stat'; stat.textContent = `Valid. Matches ${n} of ${lines.length} preview titles.`;
  }
  test();
  const img = el('input', { type: 'url', id: 'ed-i', value: b.img || '', spellcheck: false, placeholder: 'https://… (leave empty for text badge)', oninput: e => { b.img = e.target.value.trim() || undefined; upd(); } });
  const setC = k => v => { if (v === undefined) delete b[k]; else b[k] = v; upd(); };
  const fields = [
    el('div', { className: 'fld' }, el('label', { className: 'lbl', for: 'ed-n' }, 'Name (shown on text badges)'), name),
    el('div', { className: 'fld' }, el('label', { className: 'lbl', for: 'ed-g' }, 'Category'), grp),
    el('div', { className: 'fld' }, el('label', { className: 'lbl', for: 'ed-p' }, 'Match pattern (regex, add (?i) at the start to ignore case)'), pat, stat),
    el('div', { className: 'fld' }, el('div', { className: 'lbl' }, 'Colors (↺ = follow category)'),
      el('div', { className: 'ed-colors' },
        colorCtl('Fill', b.fill, setC('fill'), { inherit: true }), colorCtl('Border', b.border, setC('border'), { inherit: true }),
        colorCtl('Text', b.text, setC('text'), { inherit: true }), styleSel(b.style, v => { if (v) b.style = v; else delete b.style; upd(); }, { inherit: true }))),
    el('div', { className: 'fld' }, el('label', { className: 'lbl', for: 'ed-i' }, 'Image URL override'), img),
    el('div', { className: 'fld' }, el('div', { className: 'lbl' }, 'Preview'), el('div', { id: 'ed-prev' }, badgeEl(b))),
    el('div', { className: 'ed-actions' },
      el('label', { className: 'row', style: { gap: '8px' } }, el('input', { type: 'checkbox', checked: b.on, onchange: e => { b.on = e.target.checked; renderCatalog(); liveUpdate(); } }), 'Include in pack'),
      b.base ? el('button', { className: 'btn', type: 'button', onclick: () => resetBadge(b) }, 'Reset') : null,
      el('button', { className: 'btn', type: 'button', onclick: () => dupBadge(b) }, 'Duplicate'),
      b.base ? null : el('button', { className: 'btn', type: 'button', onclick: () => delBadge(b) }, 'Delete'),
      el('button', { className: 'btn ghost', type: 'button', onclick: () => { S.sel = null; renderCatalog(); renderEditor(); save(); } }, 'Close')),
  ];
  root.append(...fields);
}

function uid() { return 'c-' + Math.random().toString(36).slice(2, 8); }
function newBadge() {
  const cur = S.sel && B(S.sel);
  const b = { id: uid(), g: cur ? cur.g : S.groups[0].id, n: 'NEW', p: '(?i)\\bnew\\b', on: true, base: false };
  S.badges.push(b); S.sel = b.id; G(b.g).open = true;
  renderAll(); save();
}
function dupBadge(b) {
  const c = { ...b, id: uid(), base: false, n: b.n + ' 2' };
  S.badges.splice(S.badges.indexOf(b) + 1, 0, c); S.sel = c.id; G(c.g).open = true;
  renderAll(); save();
}
function delBadge(b) { S.badges.splice(S.badges.indexOf(b), 1); S.sel = null; renderAll(); save(); }
function resetBadge(b) {
  const d = C.badges.find(x => x.id === b.id); if (!d) return;
  Object.assign(b, { n: d.n, p: d.p, g: d.g }); delete b.fill; delete b.border; delete b.text; delete b.style; delete b.img;
  renderAll(); save();
}

function renderCoverage(box, lines, list) {
  box.replaceChildren();
  if (!lines.length || !list.length) { box.hidden = true; return; }
  box.hidden = false;
  const counts = new Map(list.map(b => [b, 0])), bare = [];
  for (const t of lines) {
    let any = false;
    for (const b of list) if (matches(b, t)) { counts.set(b, counts.get(b) + 1); any = true; }
    if (!any) bare.push(t);
  }
  const unused = list.filter(b => !counts.get(b)), used = list.filter(b => counts.get(b)).sort((a, b) => counts.get(b) - counts.get(a));
  const chip = (b, n) => el('span', { className: 'ccount' }, b.n, n == null ? '' : el('i', null, ` ×${n}`));
  const sum = `${lines.length - bare.length} of ${lines.length} titles get a badge · ${used.length} of ${list.length} badges matched`;
  const d = el('details', { className: 'cov' }, el('summary', null, 'Coverage: ' + sum));
  if (bare.length) d.append(el('p', { className: 'hint' }, 'Titles with no badge (check your patterns, or these titles are missing tags):'),
    el('ul', { className: 'cbare' }, bare.slice(0, 8).map(t => el('li', null, t))));
  if (used.length) d.append(el('p', { className: 'hint' }, 'Matched most often:'), el('div', { className: 'cwrap' }, used.slice(0, 12).map(b => chip(b, counts.get(b)))));
  if (unused.length) d.append(el('p', { className: 'hint' }, `Never matched by these ${lines.length} title${lines.length === 1 ? '' : 's'} (fine if they are rare; paste more titles to test them):`),
    el('div', { className: 'cwrap' }, unused.map(b => chip(b))));
  box.append(d);
}
function renderPreview() {
  const box = $('#cards'); box.replaceChildren();
  const lines = S.titles.split('\n').map(x => x.trim()).filter(Boolean);
  const list = ordered();
  const cov = $('#coverage'); if (cov) renderCoverage(cov, lines, list);
  for (const t of lines) {
    const hits = list.filter(b => matches(b, t));
    box.append(el('div', { className: 'card' }, el('div', { className: 't' }, t),
      el('div', { className: 'b' }, hits.length ? hits.map(badgeEl) : el('span', { className: 'none' }, 'no badges match'))));
  }
  if (!lines.length) box.append(el('div', { className: 'card' }, el('span', { className: 'none' }, 'Add a stream title above to see badges.')));
}

function renderExport() {
  const pack = build();
  $('#out').value = JSON.stringify(pack, null, 2);
  const un = $('#url-note'); if (un && !$('#url-box').hidden) {
    const stale = urlFor && urlFor !== $('#out').value;
    $('#url-box').classList.toggle('stale', !!stale);
    un.dataset.stale = stale ? '1' : '';
    const base = un.textContent.replace(/ ⚠.*$/, '');
    un.textContent = stale ? base + ' ⚠ You changed the pack since this link was made. Create a new link.' : base;
  }
  const h = $('#health'); h.replaceChildren();
  const add = (ok, text, warn) => h.append(el('li', { className: ok ? '' : (warn ? 'w' : '') }, el('b', null, ok ? '✓' : (warn ? '·' : '!')), text));
  const list = ordered();
  if (!list.length) add(false, 'The pack is empty. Turn on at least one badge.');
  else add(true, `${pack.filters.length} badges in ${pack.groups.length} categories.`);
  const bad = list.filter(b => compile(b.p).err);
  if (bad.length) add(false, `Invalid pattern in: ${bad.map(b => b.n).join(', ')}. Nuvio may ignore these.`);
  else if (list.length) add(true, 'Every pattern compiles in this browser.');
  const blank = list.filter(b => !b.n.trim() || !b.p.trim());
  if (blank.length) add(false, 'Some badges have an empty name or pattern.');
  const seen = {}; list.forEach(b => { const k = b.g + '|' + b.n; seen[k] = (seen[k] || 0) + 1; });
  const dup = Object.keys(seen).filter(k => seen[k] > 1).map(k => k.split('|')[1]);
  if (dup.length) add(false, `Same name twice in a category: ${[...new Set(dup)].join(', ')}.`, true);
  const lines = S.titles.split('\n').map(x => x.trim()).filter(Boolean);
  if (lines.length) {
    const dead = list.filter(b => !compile(b.p).err && !lines.some(t => matches(b, t)));
    add(true, `${list.length - dead.length - bad.length} of ${list.length} badges match at least one preview title.`, true);
  }
  const ab = $('#art-box'); ab.hidden = !(S.mode === 'image' && S.theme === 'custom');
  $('#embed').checked = !!S.embed;
  if (!ab.hidden) {
    if (S.embed) add(true, `Images are embedded in the JSON (about ${Math.round($('#out').value.length / 1024)} KB), so nothing needs hosting. If badges show empty in Nuvio, untick Embed and use the ZIP.`, true);
    else add(true, `Upload the artwork ZIP so the files are reachable at ${baseUrl()}custom/`, true);
  }
  if (S.mode === 'image' && !(S.theme === 'custom' && S.embed)) {
    const u = baseUrl();
    if (/^(file:|https?:\/\/(localhost|127\.|192\.168\.|10\.))/i.test(u)) add(false, 'Image badges point at a local address. Deploy the site (or set "Hosted at") before importing into Nuvio.');
    else add(true, 'Image badges point at ' + u);
  }
  add(true, 'Patterns are tested with JavaScript regex here. Nuvio uses its own engine, so check a real stream after importing.', true);
}

function renderCredits() {
  const ul = $('#credit-list');
  for (const c of C.credits) ul.append(el('li', null,
    el('span', null, el('a', { href: c.url, target: '_blank', rel: 'noopener noreferrer' }, c.name), ' · ', el('span', { className: 'by' }, c.by)),
    el('span', { className: 'note' }, c.note)));
}

/* ---------- design lab: a small parametric SVG badge engine ---------- */
const FONTS = { sans: 'Inter,Helvetica,Arial,sans-serif', mono: 'DejaVu Sans Mono,Menlo,Consolas,monospace', serif: 'Georgia,Times New Roman,serif' };
const mctx = document.createElement('canvas').getContext('2d');
const measure = (t, size, weight, fam) => { mctx.font = `${weight} ${size}px ${fam}`; return mctx.measureText(t).width; };
const mixc = (c, k) => { const n = parseInt(c.slice(1), 16); return '#' + [n >> 16 & 255, n >> 8 & 255, n & 255].map(x => Math.min(255, Math.round(x * k)).toString(16).padStart(2, '0')).join(''); };
const xesc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
const dataUri = svg => 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));

const BASE = { shape: 'box', radius: 0, height: 24, padX: 9, borderW: 1, borderStyle: 'solid', borderColor: 'accent',
  fillMode: 'solid', fill: '#18181a', fill2: 'accentMid', bar: 'none', tag: false, shadow: 'none', shadowColor: '#f4f4f5',
  font: 'sans', weight: 700, size: 14, tracking: 0, caps: 'asis', textColor: '#f4f4f5', prefix: '', cursor: false,
  single: false, accent: '#8fb4ff' };
const SEEDS = {
  clean: { label: 'Clean box' },
  pill: { label: 'Pill', radius: 12, fillMode: 'solid', fill: 'accentDark', padX: 14 },
  capsule: { label: 'Capsule', radius: 12, fill: 'accent', borderW: 0, borderColor: 'none', textColor: '#0e0e0f', padX: 14 },
  sticker: { label: 'Sticker', radius: 4, fill: 'accent', borderColor: '#0e0e0f', borderW: 2, textColor: '#0e0e0f', padX: 11 },
  bare: { label: 'Bare text', shape: 'none', fillMode: 'none', borderW: 0, textColor: 'accent', padX: 4 },
  notch: { label: 'Notch', shape: 'chamfer', bar: 'left', borderColor: '#3a3a40', padX: 10 },
  plate: { label: 'Plate', tag: true },
  brackets: { label: 'Brackets', shape: 'brackets', fillMode: 'none', borderW: 1.5, padX: 11 },
  underline: { label: 'Underline', shape: 'none', fillMode: 'none', borderW: 0, bar: 'bottom', padX: 5 },
  terminal: { label: 'Terminal', font: 'mono', prefix: '>', cursor: true, borderColor: '#234d31', fill: '#0a0e0b', textColor: '#7dff9b' },
  brutal: { label: 'Brutal', fill: 'accent', borderColor: '#0e0e0f', borderW: 1.5, shadow: 'hard', textColor: '#0e0e0f', padX: 10 },
  hatch: { label: 'Hatch', fillMode: 'hatch', fill: '#121214', padX: 18 },
  duotone: { label: 'Duotone', fillMode: 'gradient', fill: 'accentDark', fill2: 'accentMid', textColor: '#ffffff', padX: 13 },
  ticket: { label: 'Ticket', shape: 'ticket', padX: 10 },
  stamp: { label: 'Stamp', fillMode: 'none', borderW: 1.5, borderStyle: 'double', textColor: 'accent', size: 12.5, padX: 14 },
};
function seedDesign(k) { const { label, ...o } = SEEDS[k] || SEEDS.clean; return { ...BASE, ...o, palette: { ...C.palette } }; }

function renderDesign(d, label, gid) {
  const acc = d.single ? d.accent : (d.palette[gid] || d.accent);
  const Co = v => v === 'accent' ? acc : v === 'accentDark' ? mixc(acc, .16) : v === 'accentMid' ? mixc(acc, .62) : v;
  const fam = FONTS[d.font] || FONTS.sans, H = d.height, bw = d.borderW, sh = d.shadow === 'hard' ? 2 : 0;
  const t = (d.prefix ? d.prefix + ' ' : '') + (d.caps === 'upper' ? label.toUpperCase() : d.caps === 'lower' ? label.toLowerCase() : label);
  const tw = (measure(t, d.size, d.weight, fam) + d.tracking * t.length) * 1.05;
  const code = C.codes[gid] || '';
  const tagW = d.tag && code ? measure(code, 9.5, 700, FONTS.sans) * 1.05 + 11 : 0;
  const stub = d.shape === 'ticket' ? 16 : 0, bar = d.bar === 'left' ? 5 : 0, curW = d.cursor ? 9 : 0;
  const x0 = bar + stub + tagW;
  const w0 = Math.round(x0 + d.padX * 2 + tw + curW), W = w0 + sh, HT = H + sh;
  const i = bw / 2, hasStroke = bw > 0 && d.borderColor !== 'none';
  const stroke = hasStroke ? Co(d.borderColor) : 'none';
  const dash = d.borderStyle === 'dashed' ? ' stroke-dasharray="3 2"' : '';
  const sattr = `stroke="${stroke}" stroke-width="${hasStroke ? bw : 0}"${dash}`;
  const ch = Math.min(7, H / 3), r = 4, solid = ['box', 'chamfer', 'ticket'].includes(d.shape);
  const geom = extra => d.shape === 'chamfer'
      ? `<polygon points="${i},${i} ${w0 - ch - i},${i} ${w0 - i},${ch + i} ${w0 - i},${H - i} ${ch + i},${H - i} ${i},${H - ch - i}" ${extra}/>`
    : d.shape === 'ticket'
      ? `<path d="M${i},${i} H${w0 - i} V${H / 2 - r} A${r},${r} 0 0 0 ${w0 - i},${H / 2 + r} V${H - i} H${i} V${H / 2 + r} A${r},${r} 0 0 0 ${i},${H / 2 - r} Z" ${extra}/>`
    : d.shape === 'box'
      ? `<rect x="${i}" y="${i}" width="${w0 - bw}" height="${H - bw}" rx="${d.radius}" ${extra}/>`
    : `<rect x="0" y="0" width="${w0}" height="${H}" ${extra}/>`;
  let defs = `<clipPath id="c">${geom('')}</clipPath>`, parts = [];
  let fillRef = 'none';
  if (d.fillMode === 'solid' || d.fillMode === 'hatch') fillRef = Co(d.fill);
  if (d.fillMode === 'gradient') {
    defs += `<linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${Co(d.fill)}"/><stop offset="1" stop-color="${Co(d.fill2)}"/></linearGradient>`;
    fillRef = 'url(#g)';
  }
  if (sh) parts.push(`<rect x="${sh}" y="${sh}" width="${w0}" height="${H}" fill="${Co(d.shadowColor)}"/>`);
  if (solid) {
    if (d.fillMode === 'hatch') {
      let lines = ''; for (let x = -H; x < w0; x += 6) lines += `<line x1="${x}" y1="${H}" x2="${x + H}" y2="0" stroke="${acc}" stroke-opacity="0.5" stroke-width="1.2"/>`;
      parts.push(geom(`fill="${fillRef}" stroke="none"`), `<g clip-path="url(#c)">${lines}</g>`, geom(`fill="none" ${sattr}`),
        `<rect x="${x0 + 9}" y="4" width="${Math.max(2, w0 - x0 - 18)}" height="${H - 8}" fill="${fillRef}"/>`);
    } else parts.push(geom(`fill="${fillRef}" ${sattr}`));
    if (d.borderStyle === 'double' && hasStroke && d.shape !== 'ticket') {
      const k = bw + 2.5; parts.push(`<rect x="${k}" y="${k}" width="${Math.max(1, w0 - 2 * k)}" height="${Math.max(1, H - 2 * k)}" fill="none" stroke="${stroke}" stroke-width="0.75"/>`);
    }
  } else if (d.shape === 'brackets') {
    const L = 6, a = 0.75, bs = Math.max(bw, 1.5);
    parts.push(`<path d="M${a},${L} V${a} H${L} M${w0 - L},${a} H${w0 - a} V${L} M${w0 - a},${H - L} V${H - a} H${w0 - L} M${L},${H - a} H${a} V${H - L}" fill="none" stroke="${hasStroke ? stroke : acc}" stroke-width="${bs}"/>`);
  }
  if (d.bar === 'left') parts.push(`<rect x="0" y="0" width="5" height="${H}" fill="${acc}" clip-path="url(#c)"/>`);
  if (d.bar === 'top') parts.push(`<rect x="0" y="0" width="${w0}" height="3" fill="${acc}" clip-path="url(#c)"/>`);
  if (d.bar === 'bottom') parts.push(d.shape === 'none' ? `<rect x="0" y="${H - 5}" width="${w0}" height="3" fill="${acc}"/>`
    : `<rect x="0" y="${H - 3}" width="${w0}" height="3" fill="${acc}" clip-path="url(#c)"/>`);
  if (stub) parts.push(`<line x1="${bar + 15}" y1="4" x2="${bar + 15}" y2="${H - 4}" stroke="${acc}" stroke-width="1" stroke-dasharray="2 2"/><rect x="${bar + 6}" y="${H / 2 - 2}" width="4" height="4" fill="${acc}"/>`);
  if (tagW) parts.push(`<rect x="${bar + stub}" y="${i}" width="${tagW.toFixed(1)}" height="${H - bw}" fill="${acc}"/>`,
    `<text x="${(bar + stub + tagW / 2).toFixed(1)}" y="${(H / 2 + 3.4).toFixed(1)}" text-anchor="middle" font-family="${FONTS.sans}" font-size="9.5" font-weight="700" fill="#0e0e0f">${xesc(code)}</text>`);
  const ty = (H / 2 + d.size * 0.35 - (d.shape === 'none' && d.bar === 'bottom' ? 2 : 0)).toFixed(1);
  const ls = d.tracking > 0 ? ` letter-spacing="${d.tracking}"` : '';
  const tx = d.cursor ? (x0 + d.padX).toFixed(1) : ((x0 + w0) / 2).toFixed(1);
  parts.push(`<text xml:space="preserve" x="${tx}" y="${ty}" text-anchor="${d.cursor ? 'start' : 'middle'}" font-family="${fam}" font-size="${d.size}" font-weight="${d.weight}"${ls} fill="${Co(d.textColor)}">${xesc(t)}</text>`);
  if (d.cursor) parts.push(`<rect x="${(x0 + d.padX + tw / 1.05 + 3).toFixed(1)}" y="${H / 2 - 5}" width="6" height="10" fill="${Co(d.textColor)}"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${HT}" viewBox="0 0 ${W} ${HT}"><defs>${defs}</defs>${parts.join('')}</svg>`;
}
const artCache = new Map(); let artKey = '';
/* SVG -> 4x PNG in the browser (Nuvio's examples and Badger use PNG for image badges) */
const pngCache = new Map(); const pngBusy = new Set(); let pngT;
function rasterize(svg, scale = 4) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = Math.round((img.naturalWidth || 60) * scale); c.height = Math.round((img.naturalHeight || 24) * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/png'));
    };
    img.onerror = () => rej(new Error('could not draw a badge image'));
    img.src = dataUri(svg);
  });
}
function kickPng(svg) {
  if (pngCache.has(svg) || pngBusy.has(svg)) return;
  pngBusy.add(svg);
  rasterize(svg).then(u => { pngCache.set(svg, u); }).catch(() => {}).finally(() => { pngBusy.delete(svg); clearTimeout(pngT); if (!pngBusy.size) pngT = setTimeout(renderExport, 60); });
}
async function ensurePngs() {
  if (!(S.mode === 'image' && S.theme === 'custom' && S.embed)) return;
  const todo = ordered().filter(b => customOn(b)).map(b => artSvg(b)).filter(v => !pngCache.has(v));
  if (!todo.length) return;
  msg('Drawing the badge images…');
  await Promise.all(todo.map(v => rasterize(v).then(u => pngCache.set(v, u))));
  renderExport(); msg('');
}
const b64bytes = u => { const s = atob(u.split(',')[1]), a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; };
function artSvg(b) {
  const k = artKey + '|' + b.g + '|' + b.n;
  let v = artCache.get(k); if (!v) { v = renderDesign(S.design, b.n, b.g); artCache.set(k, v); }
  return v;
}
function designChanged() {
  artKey = JSON.stringify(S.design); artCache.clear();
  renderPresets(); renderLabPreview(); repaintBadges(); renderPreview(); renderExport(); save();
}

const SAMPLE_ART = [['4K', 'gr'], ['REMUX', 'gq'], ['DV', 'gv'], ['HDR10+', 'gv'], ['HEVC', 'gc'], ['ATMOS', 'ga'], ['DTS-HD MA', 'ga'],
  ['5.1', 'gh'], ['NETFLIX', 'gs'], ['JA', 'gl'], ["DIRECTOR'S CUT", 'ge'], ['CACHED', 'gp']];
const lumOf = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0); };
const ratioOf = (a, b) => { const x = lumOf(a), y = lumOf(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
function lowContrast() {
  const d = S.design, bgs = [];
  for (const g of C.groups) {
    const acc = d.single ? d.accent : (d.palette[g.id] || d.accent);
    const co = v => v === 'accent' ? acc : v === 'accentDark' ? mixc(acc, .16) : v === 'accentMid' ? mixc(acc, .62) : v;
    const fills = d.fillMode === 'none' || d.fill === 'none' ? ['#121214'] : d.fillMode === 'gradient' ? [co(d.fill), co(d.fill2)] : [co(d.fill)];
    for (const f of fills) if (/^#[0-9a-f]{6}$/i.test(f) && /^#[0-9a-f]{6}$/i.test(co(d.textColor)) && ratioOf(co(d.textColor), f) < 3) return g.name;
  }
  return '';
}
function renderLabPreview() {
  const box = $('#labprev'); if (!box) return; box.replaceChildren();
  const w = $('#labwarn'); if (w) { const bad = lowContrast(); w.textContent = bad ? `Heads up: text is hard to read on the ${bad} category (and maybe others). Try a lighter or darker text color.` : ''; }
  for (const [n, g] of SAMPLE_ART) box.append(el('img', { src: dataUri(renderDesign(S.design, n, g)), alt: n, className: 'badge-img' }));
}

function renderLab() {
  const lab = $('#lab'); lab.hidden = S.preset !== 'custom';
  if (lab.hidden) return;
  const ctl = $('#labctl'); ctl.replaceChildren();
  const seed = $('#seed');
  if (!seed.options.length) {
    seed.append(el('option', { value: '', textContent: 'Choose…' }));
    for (const [k, v] of Object.entries(SEEDS)) seed.append(el('option', { value: k, textContent: v.label }));
  }
  const D = () => S.design;
  const field = (label, node) => el('label', { className: 'lctl' }, el('span', null, label), node);
  const sel = (label, key, opts, after) => {
    const s2 = el('select', { onchange: e => { const v = e.target.value; D()[key] = typeof BASE[key] === 'number' ? Number(v) : v; designChanged(); if (after) renderLab(); } },
      opts.map(([v, l]) => el('option', { value: String(v), textContent: l })));
    s2.value = String(D()[key]); return field(label, s2);
  };
  const num = (label, key, min, max, step) => {
    const out = el('b', null, String(D()[key]));
    const inp = el('input', { type: 'range', min, max, step, value: D()[key], oninput: e => { D()[key] = Number(e.target.value); out.textContent = e.target.value; designChanged(); } });
    return field(label, el('span', { className: 'rng' }, inp, out));
  };
  const chk = (label, key) => field(label, el('input', { type: 'checkbox', checked: !!D()[key], onchange: e => { D()[key] = e.target.checked; designChanged(); } }));
  const TOK = [['accent', 'Category accent'], ['accentMid', 'Mid accent'], ['accentDark', 'Dark accent']];
  const tok = (label, key, { none = false } = {}) => {
    const toks = TOK.concat(none ? [['none', 'None']] : []).concat([['custom', 'Custom color']]);
    const v = D()[key], isTok = toks.some(([k]) => k === v && k !== 'custom');
    const s2 = el('select'), inp = el('input', { type: 'color', value: isTok ? '#ffffff' : v, hidden: isTok });
    toks.forEach(([k, l]) => s2.append(el('option', { value: k, textContent: l })));
    s2.value = isTok ? v : 'custom';
    s2.addEventListener('change', () => { inp.hidden = s2.value !== 'custom'; D()[key] = s2.value === 'custom' ? inp.value : s2.value; designChanged(); });
    inp.addEventListener('input', () => { D()[key] = inp.value; designChanged(); });
    return field(label, el('span', { className: 'tokc' }, s2, inp));
  };
  const group = (title, ...kids) => el('fieldset', { className: 'lgrp' }, el('legend', null, title), el('div', { className: 'lgrid' }, ...kids));

  ctl.append(
    group('1 · Shape',
      sel('Shape', 'shape', [['box', 'Box'], ['chamfer', 'Cut corners'], ['ticket', 'Ticket'], ['brackets', 'Corner marks'], ['none', 'No shape']]),
      num('Corner radius', 'radius', 0, 12, 1), num('Height', 'height', 20, 34, 1), num('Padding', 'padX', 3, 24, 1)),
    group('2 · Fill',
      sel('Fill', 'fillMode', [['solid', 'Solid'], ['gradient', 'Gradient'], ['hatch', 'Hatch'], ['none', 'None']]),
      tok('Fill color', 'fill', { none: true }), tok('Gradient end', 'fill2')),
    group('3 · Border',
      num('Border width', 'borderW', 0, 3, 0.5), sel('Border style', 'borderStyle', [['solid', 'Solid'], ['dashed', 'Dashed'], ['double', 'Double']]),
      tok('Border color', 'borderColor', { none: true }),
      sel('Shadow', 'shadow', [['none', 'None'], ['hard', 'Hard offset']]), tok('Shadow color', 'shadowColor')),
    el('fieldset', { className: 'lgrp' }, el('legend', null, '4 · Colors'),
      el('div', { className: 'lgrid' }, chk('Same accent for every category', 'single'),
        field('Single accent', el('input', { type: 'color', value: D().accent, oninput: e => { D().accent = e.target.value; designChanged(); } }))),
      el('div', { className: 'pal' }, C.groups.map(g => el('label', { className: 'lctl' }, el('span', null, g.name),
        el('input', { type: 'color', value: D().palette[g.id] || '#ffffff', oninput: e => { D().palette[g.id] = e.target.value; designChanged(); } }))))),
    group('5 · Content',
      chk('Category tag (RES, AUD…)', 'tag'), sel('Accent bar', 'bar', [['none', 'None'], ['left', 'Left'], ['top', 'Top'], ['bottom', 'Bottom']]),
      sel('Prefix', 'prefix', [['', 'None'], ['>', '>'], ['#', '#'], ['/', '/'], ['•', '•'], ['▸', '▸']]),
      chk('Block cursor', 'cursor'), sel('Case', 'caps', [['asis', 'As written'], ['upper', 'UPPER'], ['lower', 'lower']])),
    group('Text',
      sel('Font', 'font', [['sans', 'Sans'], ['mono', 'Mono'], ['serif', 'Serif']]),
      sel('Weight', 'weight', [[500, 'Medium'], [700, 'Bold'], [800, 'Extra bold']]),
      num('Size', 'size', 9, 17, 0.5), num('Letter spacing', 'tracking', 0, 2, 0.25),
      tok('Text color', 'textColor')));
  renderLabPreview();
}

/* minimal ZIP writer (stored, no compression) */
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u8 => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function makeZip(files) {
  const enc = new TextEncoder(), chunks = [], cd = []; let off = 0;
  for (const f of files) {
    const n = enc.encode(f.name), d = f.bytes || enc.encode(f.text), crc = crc32(d);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(12, 0x21, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, d.length, true); lh.setUint32(22, d.length, true); lh.setUint16(26, n.length, true);
    chunks.push(new Uint8Array(lh.buffer), n, d);
    const ce = new DataView(new ArrayBuffer(46));
    ce.setUint32(0, 0x02014b50, true); ce.setUint16(4, 20, true); ce.setUint16(6, 20, true); ce.setUint16(8, 0x0800, true); ce.setUint16(14, 0x21, true);
    ce.setUint32(16, crc, true); ce.setUint32(20, d.length, true); ce.setUint32(24, d.length, true); ce.setUint16(28, n.length, true); ce.setUint32(42, off, true);
    cd.push(new Uint8Array(ce.buffer), n);
    off += 30 + n.length + d.length;
  }
  const cdSize = cd.reduce((a, c) => a + c.length, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, off, true);
  return new Blob([...chunks, ...cd, new Uint8Array(end.buffer)], { type: 'application/zip' });
}
async function downloadArt() {
  let files;
  try { files = await Promise.all(S.badges.map(async b => ({ name: 'custom/' + artName(b), bytes: b64bytes(await rasterize(artSvg(b))) }))); }
  catch (e) { return msg('Could not create the images: ' + e.message + '.', true); }
  const url = URL.createObjectURL(makeZip(files));
  const a = el('a', { href: url, download: 'chip-custom-artwork.zip' }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  msg(`Downloaded ${files.length} PNG files. Unzip into your repo's badges/ folder so they sit at badges/custom/.`);
}

function renderAll() { renderPacks(); renderBorrow(); renderStyle(); renderCatalog(); renderEditor(); renderPreview(); renderExport(); }

/* ---------- import ---------- */
function importPack(data) {
  const filters = Array.isArray(data) ? data : (data && Array.isArray(data.filters) ? data.filters : []);
  const groups = data && Array.isArray(data.groups) ? data.groups : [];
  if (!filters.length) throw new Error('No "filters" array found in that JSON.');
  const proto = S.groups[0];
  const ensureGroup = (id, name) => {
    let g = S.groups.find(x => x.id === id);
    if (!g) { g = { id, name: name || id, fill: proto.fill, border: proto.border, text: proto.text, style: proto.style, open: true }; S.groups.push(g); }
    return g;
  };
  groups.forEach(g => g && g.id && ensureGroup(String(g.id), g.name));
  const byId = new Map(S.badges.map(b => [b.id, b]));
  const used = new Set(), order = [];
  let added = 0, matched = 0;
  filters.forEach((f, i) => {
    if (!f || typeof f !== 'object') return;
    let id = String(f.id || uid());
    if (used.has(id)) id = id + '-' + i;
    used.add(id);
    let b = byId.get(id);
    const gid = f.groupId ? ensureGroup(String(f.groupId)).id : (b ? b.g : S.groups[0].id);
    if (b) matched++;
    else { b = { id, g: gid, n: 'BADGE', p: '', base: false }; byId.set(id, b); added++; }
    b.g = gid; b.on = f.isEnabled !== false;
    if (typeof f.name === 'string') b.n = f.name;
    if (typeof f.pattern === 'string') b.p = f.pattern;
    b.fill = parseColor(f.tagColor); b.border = parseColor(f.borderColor); b.text = parseColor(f.textColor);
    b.style = STYLES.includes(f.tagStyle) ? f.tagStyle : undefined;
    b.img = typeof f.imageURL === 'string' && f.imageURL ? f.imageURL : undefined;
    for (const k of ['fill', 'border', 'text', 'style', 'img']) if (b[k] === undefined) delete b[k];
    order.push(b);
  });
  const orderSet = new Set(order);
  S.badges.forEach(b => { if (!orderSet.has(b)) b.on = false; });
  S.badges = [...order, ...S.badges.filter(b => !orderSet.has(b))];
  for (const b of order) if (!S.badges.includes(b)) S.badges.push(b);
  S.sel = null;
  renderAll(); save();
  msg(`Imported ${filters.length} badges (${matched} known, ${added} added as custom).`);
}
function tryImport(text) {
  try { importPack(JSON.parse(text)); }
  catch (e) { msg(e instanceof SyntaxError ? 'That is not valid JSON: ' + e.message : e.message, true); }
}


/* ---------- import URL ---------- */
let urlFor = '';
const NET_MS = window.CHIP_NET_MS || 10000;
async function tfetch(url, opts = {}, ms = NET_MS) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ac.signal }); }
  catch (e) { throw new Error(e.name === 'AbortError' ? 'timed out' : 'blocked or offline'); }
  finally { clearTimeout(t); }
}
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* ignore */ } };
const gistInfo = () => { try { return JSON.parse(lsGet('chip:gist') || 'null'); } catch (e) { return null; } };

function showUrl(url, note) {
  urlFor = $('#out').value; $('#url-out').value = url; $('#url-box').hidden = false;
  $('#url-note').textContent = note; renderExport(); $('#url-out').select();
}
function updateUrlUI() {
  const gist = S.urlMode === 'gist';
  document.querySelectorAll('#urlmode button').forEach(b => b.classList.toggle('on', b.dataset.m === S.urlMode));
  $('#gist-box').hidden = !gist; $('#manual-box').hidden = gist;
  $('#btn-url').textContent = gist ? (gistInfo() ? 'Update Gist (new link)' : 'Publish to Gist') : 'Copy JSON & open Gist';
}
function readyToUpload() {
  if (!ordered().length) { msg('Turn on at least one badge first.', true); return false; }
  if (S.mode === 'image' && S.theme === 'custom' && !S.embed && !confirm('Your design artwork still has to be uploaded to your site (Download artwork ZIP). Create the link anyway?')) return false;
  return true;
}

async function publishGist() {
  const token = $('#gist-token').value.trim();
  if (!token) return msg('Paste a GitHub token first. "Create a token" opens the right page.', true);
  lsSet('chip:token', $('#gist-remember').checked ? token : null);
  const hdr = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' };
  const files = { 'chip-badges.json': { content: $('#out').value } };
  let g = gistInfo(), r;
  msg('Publishing to GitHub…');
  try {
    if (g) { r = await tfetch('https://api.github.com/gists/' + g.id, { method: 'PATCH', headers: hdr, body: JSON.stringify({ files }) }); if (r.status === 404) g = null; }
    if (!g) r = await tfetch('https://api.github.com/gists', { method: 'POST', headers: hdr, body: JSON.stringify({ description: 'Chip badge pack for Nuvio', public: true, files }) });
    if (!r.ok) throw new Error(r.status === 401 ? 'GitHub rejected the token' : (r.status === 403 || r.status === 404) ? 'the token needs the "gist" permission (or GitHub is rate limiting you)' : 'GitHub replied ' + r.status);
    const j = await r.json(), login = j.owner && j.owner.login;
    if (!j.id || !login) throw new Error('unexpected reply from GitHub');
    lsSet('chip:gist', JSON.stringify({ id: j.id, login }));
    updateUrlUI(); msg('');
    const ver = j.history && j.history[0] && j.history[0].version;
    showUrl(`https://gist.githubusercontent.com/${login}/${j.id}/raw/${ver ? ver + '/' : ''}chip-badges.json`,
      'Public Gist. This link is pinned to this exact version, so Nuvio and GitHub cannot serve an older copy. After every Update Gist the link changes: copy the new one and import it (remove the old pack in Nuvio first).');
  } catch (e) { msg('Could not publish: ' + e.message + '.', true); }
}

async function manualGist() {
  const text = $('#out').value; let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { const o = $('#out'); o.focus(); o.select(); try { ok = document.execCommand('copy'); } catch (e2) { /* ignore */ } }
  window.open('https://gist.github.com/', '_blank', 'noopener');
  msg(ok ? 'Pack copied. Paste it into the new Gist tab.' : 'Could not copy automatically. Use Copy JSON, then paste it into the Gist tab.', !ok);
}
async function createUrl() {
  if (!readyToUpload()) return;
  try { await ensurePngs(); } catch (e) { return msg('Could not draw the images: ' + e.message + '.', true); }
  const btn = $('#btn-url'); btn.disabled = true;
  if (S.urlMode === 'gist') btn.textContent = 'Publishing…';
  try { await (S.urlMode === 'gist' ? publishGist() : manualGist()); }
  catch (e) { msg('Could not publish: ' + (e && e.message || e) + '.', true); if (window.chipBanner) window.chipBanner('Could not publish: ' + (e && e.message || e)); }
  finally { btn.disabled = false; updateUrlUI(); }
}

/* ---------- save / share a setup ---------- */
/* Only what differs from the built-in catalog is stored, so a share link stays short. */
function packSetup(st) {
  const def = new Map(C.badges.map(b => [b.id, JSON.stringify({ ...b, base: true })]));
  const o = { ...st };
  o.badges = st.badges.filter(b => def.get(b.id) !== JSON.stringify(b));
  const ids = st.badges.map(b => b.id), dids = C.badges.map(b => b.id);
  if (!(ids.length === dids.length && ids.every((x, i) => x === dids[i]))) o.order = ids;
  if (st.titles === C.samples.join('\n')) delete o.titles;
  delete o.sel; delete o.q;
  return o;
}
function unpackSetup(o) {
  if (!o || o.v !== 1 || !Array.isArray(o.groups)) throw new Error('that is not a Chip setup');
  const base = C.badges.map(b => ({ ...b, base: true })), got = Array.isArray(o.badges) ? o.badges : [];
  const m = new Map(got.map(b => [b.id, b]));
  let list = base.map(b => m.get(b.id) || b);
  list = list.concat(got.filter(b => !base.some(x => x.id === b.id)));
  if (Array.isArray(o.order)) { const pos = new Map(o.order.map((x, i) => [x, i])); list.sort((a, b) => (pos.has(a.id) ? pos.get(a.id) : 1e9) - (pos.has(b.id) ? pos.get(b.id) : 1e9)); }
  return normalize({ ...fresh(), ...o, badges: list, titles: o.titles ?? C.samples.join('\n'), sel: null, q: '' });
}
const toB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const fromB64 = t => { const s = atob(t.replace(/-/g, '+').replace(/_/g, '/')), a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; };
async function encodeSetup(st) {
  const raw = new TextEncoder().encode(JSON.stringify(packSetup(st)));
  if (window.CompressionStream) {
    const out = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
    return 's.' + toB64(out);
  }
  return 'j.' + toB64(raw);
}
async function decodeSetup(t) {
  const [kind, data] = [t.slice(0, 2), t.slice(2)], bytes = fromB64(data);
  const u8 = kind === 's.' ? new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()) : bytes;
  return unpackSetup(JSON.parse(new TextDecoder().decode(u8)));
}
function useSetup(st) {
  S = st; artKey = JSON.stringify(S.design); artCache.clear();
  $('#titles').value = S.titles; $('#search').value = '';
  $('#nround').checked = !!S.nround; $('#cards').classList.toggle('nround', !!S.nround);
  updateUrlUI(); renderAll(); save();
}
async function copyShareLink() {
  try {
    const url = location.href.split('#')[0] + '#setup=' + await encodeSetup(S);
    const ok = await copyText(url);
    msg(ok ? `Share link copied (${Math.round(url.length / 1024 * 10) / 10} KB). Anyone who opens it gets your setup.` : 'Could not copy. Try Save setup instead.', !ok);
  } catch (e) { msg('Could not create a link: ' + e.message + '. Try Save setup instead.', true); }
}
function saveSetupFile() {
  const blob = new Blob([JSON.stringify({ chip: 'setup', ...packSetup(S) }, null, 1)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), a = el('a', { href: url, download: 'chip-setup.json' });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
  msg('Saved chip-setup.json. Use Load setup to bring it back on any device.');
}
async function loadSetupFile(file) {
  try { const st = unpackSetup(JSON.parse(await file.text())); if (!confirm('Load this setup? It replaces what you have now.')) return; useSetup(st); msg('Setup loaded.'); }
  catch (e) { msg('Could not load that file: ' + e.message + '.', true); }
}
async function applyHash() {
  const m = location.hash.match(/^#setup=(.+)$/); if (!m) return;
  try {
    const st = await decodeSetup(m[1]);
    history.replaceState(null, '', location.href.split('#')[0]);
    if (lsGet(KEY) && !confirm('Open the shared setup? It replaces the setup saved in this browser.')) return;
    useSetup(st); msg('Shared setup loaded.');
  } catch (e) { msg('That share link could not be read. It may be cut off or damaged.', true); }
}

/* ---------- borrow images from another pack ---------- */
const normName = t => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
function repoOf(u) { const m = String(u).match(/^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\//i); return m ? { user: m[1], repo: m[2], url: `https://github.com/${m[1]}/${m[2]}` } : null; }
function undoBorrow(b) { delete b.img; delete b.fill; delete b.border; delete b.text; delete b.style; delete b.borrowed; }
function borrowFromPack(data, source) {
  const filters = (Array.isArray(data) ? data : (data && data.filters) || []).filter(f => f && typeof f.imageURL === 'string' && /^https?:\/\//i.test(f.imageURL) && typeof f.name === 'string');
  if (!filters.length) throw new Error('that pack has no image badges');
  let n = 0; const used = new Set();
  for (const b of S.badges) {
    if (!b.base || b.img) continue;
    const hits = filters.filter(f => { const c = compile(f.pattern); return c.re && c.re.test(b.n); });
    if (!hits.length) continue;
    const key = normName(b.n);
    const pick = hits.find(f => normName(f.name) === key) || hits.find(f => normName(f.name).includes(key) || key.includes(normName(f.name))) || hits[0];
    b.img = pick.imageURL; b.fill = 'none'; b.border = 'none'; b.text = 'none'; b.style = 'filled and bordered'; b.borrowed = true;
    used.add(pick.imageURL); n++;
  }
  if (!n) throw new Error('none of its images matched your badges');
  const repo = repoOf(source) || repoOf(filters[0].imageURL);
  S.borrow = { url: source || '', count: n, user: repo && repo.user, repo: repo && repo.repo, link: repo && repo.url };
  return n;
}
function renderBorrow() {
  const st = $('#borrow-status'), un = $('#btn-unborrow'), cr = $('#borrow-credit');
  const n = S.badges.filter(b => b.borrowed).length;
  un.hidden = !n;
  st.textContent = n ? `${n} badges use borrowed images.` + (S.borrow && S.borrow.user ? ` Source: ${S.borrow.user}/${S.borrow.repo}.` : '') : '';
  cr.replaceChildren();
  if (n && S.borrow) {
    cr.hidden = false;
    cr.append(el('li', null, el('span', null, 'Borrowed images · ', S.borrow.link ? el('a', { href: S.borrow.link, target: '_blank', rel: 'noopener noreferrer' }, `${S.borrow.user}/${S.borrow.repo}`) : (S.borrow.url || 'another pack')),
      el('span', { className: 'note' }, 'Your pack links to images hosted by their author. Logos belong to their owners; check the source for its terms.')));
  } else cr.hidden = true;
}
async function doBorrow(text, source) {
  try { const n = borrowFromPack(JSON.parse(text), source); renderAll(); save(); msg(`Borrowed images for ${n} badges. Turn on the ones you want in Badges.`); }
  catch (e) { msg('Could not borrow: ' + (e instanceof SyntaxError ? 'that is not valid JSON' : e.message) + '.', true); }
}
async function borrowUrl() {
  const u = $('#borrow-url').value.trim(); if (!/^https?:\/\//i.test(u)) return msg('Paste the link to a pack first.', true);
  msg('Loading the pack…');
  try { const r = await tfetch(u); if (!r.ok) throw new Error('HTTP ' + r.status); await doBorrow(await r.text(), u); }
  catch (e) { msg('Could not load that link (' + e.message + '). Some hosts block browser requests. Paste the JSON instead.', true); }
}

/* ---------- wiring ---------- */
function toRaw(u) {
  u = u.trim().split('#')[0].split('?')[0];
  let m = u.match(/^https?:\/\/pastebin\.com\/(?!raw\/)([A-Za-z0-9]+)\/?$/);
  if (m) return 'https://pastebin.com/raw/' + m[1];
  m = u.match(/^https?:\/\/gist\.github\.com\/([^/]+)\/([0-9a-f]+)(?:\/raw(?:\/[^/]+)?)?\/?$/i);
  if (m) return `https://gist.githubusercontent.com/${m[1]}/${m[2]}/raw`;
  return '';
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; }
  catch (e) { const o = $('#out'); o.focus(); o.select(); try { return document.execCommand('copy'); } catch (e2) { return false; } }
}

function wire() {
  $('#btn-import-toggle').addEventListener('click', e => {
    const box = $('#import-box'); box.hidden = !box.hidden; e.currentTarget.setAttribute('aria-expanded', String(!box.hidden));
  });
  $('#yours-color').addEventListener('input', e => {
    S.accent = e.target.value;
    for (const g of S.groups) Object.assign(g, presetFor(PRESETS.yours, g.id));
    for (const b of S.badges) if (!b.borrowed) { delete b.fill; delete b.border; delete b.text; delete b.style; }
    renderPresets(); liveUpdate(); save();
  });
  $('#btn-borrow').addEventListener('click', borrowUrl);
  $('#btn-borrow-paste').addEventListener('click', () => doBorrow($('#borrow-text').value, ''));
  $('#btn-unborrow').addEventListener('click', () => { S.badges.forEach(b => { if (b.borrowed) undoBorrow(b); }); delete S.borrow; renderAll(); save(); msg('Removed the borrowed images.'); });
  $('#btn-share').addEventListener('click', copyShareLink);
  $('#btn-save').addEventListener('click', saveSetupFile);
  $('#setup-file').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) loadSetupFile(f); });
  $('#btn-reset').addEventListener('click', () => {
    if (!confirm('Reset all badges, colors and custom badges?')) return;
    S = fresh(); artKey = JSON.stringify(S.design); artCache.clear(); reCache.clear(); $('#titles').value = S.titles; renderAll(); save(); msg('Reset.');
  });
  $('#btn-import-paste').addEventListener('click', () => tryImport($('#import-text').value));
  $('#import-file').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    tryImport(await f.text()); e.target.value = '';
  });
  $('#btn-import-url').addEventListener('click', async () => {
    const u = $('#import-url').value.trim(); if (!u) return msg('Enter a URL first.', true);
    try { const r = await fetch(u); if (!r.ok) throw new Error('HTTP ' + r.status); tryImport(await r.text()); }
    catch (e) { msg('Could not load that URL (' + e.message + '). Some hosts block browser requests. Paste the JSON instead.', true); }
  });
  document.querySelectorAll('#mode button').forEach(b => b.addEventListener('click', () => { S.mode = b.dataset.mode; renderStyle(); renderCatalog(); renderEditor(); renderPreview(); renderExport(); save(); }));
  const nr = () => { $('#nround').checked = !!S.nround; $('#cards').classList.toggle('nround', !!S.nround); };
  nr(); $('#nround').addEventListener('change', e => { S.nround = e.target.checked; nr(); save(); });
  document.querySelectorAll('#corners button').forEach(b => b.addEventListener('click', () => { S.corners = b.dataset.c; renderStyle(); renderPresets(); renderCatalog(); renderEditor(); renderPreview(); renderExport(); save(); }));
  $('#theme').addEventListener('change', e => { S.theme = e.target.value; renderPreview(); renderCatalog(); renderEditor(); renderExport(); save(); });
  $('#base').addEventListener('input', e => { S.base = e.target.value.trim(); renderExport(); save(); });
  $('#search').addEventListener('input', e => { S.q = e.target.value; renderCatalog(); });
  $('#btn-all').addEventListener('click', () => { S.badges.forEach(b => b.on = true); afterToggle(); });
  $('#btn-none').addEventListener('click', () => { S.badges.forEach(b => b.on = false); afterToggle(); });
  $('#btn-new').addEventListener('click', newBadge);
  $('#titles').addEventListener('input', e => { S.titles = e.target.value; renderPreview(); renderExport(); renderEditor(); save(); });
  $('#btn-copy').addEventListener('click', async () => { await ensurePngs(); msg(await copyText($('#out').value) ? 'Copied the pack JSON.' : 'Copy failed. Select the text and copy it manually.', false); });
  $('#btn-download').addEventListener('click', async () => {
    await ensurePngs();
    const a = el('a', { href: URL.createObjectURL(new Blob([$('#out').value], { type: 'application/json' })), download: 'chip-badges.json' });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#seed').addEventListener('change', e => { if (!e.target.value) return; S.design = seedDesign(e.target.value); e.target.value = ''; renderLab(); designChanged(); });
  $('#embed').addEventListener('change', e => { S.embed = e.target.checked; renderExport(); save(); });
  $('#btn-art').addEventListener('click', downloadArt);
  $('#btn-url').addEventListener('click', createUrl);
  document.querySelectorAll('#urlmode button').forEach(b => b.addEventListener('click', () => { S.urlMode = b.dataset.m; updateUrlUI(); save(); }));
  $('#btn-forget').addEventListener('click', () => { lsSet('chip:token', null); lsSet('chip:gist', null); $('#gist-token').value = ''; $('#gist-remember').checked = false; updateUrlUI(); msg('Token forgotten. The next publish creates a new Gist.'); });
  $('#btn-url-copy').addEventListener('click', async () => { const i = $('#url-out'); i.select(); let ok = false; try { await navigator.clipboard.writeText(i.value); ok = true; } catch (e) { try { ok = document.execCommand('copy'); } catch (e2) { /* ignore */ } } msg(ok ? 'Copied the import URL.' : 'Copy failed. Select the link and copy it manually.', !ok); });
  $('#btn-raw-copy').addEventListener('click', async () => { const i = $('#raw-out'); if (!i.value) return msg('Get the link first.', true); i.select(); let ok = false; try { await navigator.clipboard.writeText(i.value); ok = true; } catch (e) { try { ok = document.execCommand('copy'); } catch (e2) { /* ignore */ } } msg(ok ? 'Copied the import link.' : 'Copy failed. Select the link and copy it manually.', !ok); });
  $('#btn-raw').addEventListener('click', () => {
    const r = toRaw($('#raw-in').value), o = $('#raw-out');
    o.value = r || ''; if (!r) { o.placeholder = 'Not a Gist address. Paste the page address of your gist.'; msg('That does not look like a gist address (gist.github.com/you/…).', true); }
    if (r) { o.focus(); o.select(); }
  });
}

S = load();
artKey = JSON.stringify(S.design);
$('#titles').value = S.titles;
$('#search').value = S.q = '';
renderCredits();
wire();
{ const tk = lsGet('chip:token'); if (tk) { $('#gist-token').value = tk; $('#gist-remember').checked = true; } }
updateUrlUI();
renderAll();
applyHash();
})();
