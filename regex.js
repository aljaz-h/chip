/* Regex builder UI for Nuvio's "Auto-play regex match". Independent implementation. */
(function () {
  'use strict';
  var F = window.ChipFormatter, D = window.ChipData;
  var $ = function (s) { return document.querySelector(s); };
  function el(tag, props) {
    var e = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) { e[k] = props[k]; });
    for (var i = 2; i < arguments.length; i++) if (arguments[i] != null) e.append(arguments[i]);
    return e;
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&'); }

  /* ------------------------------------------------------------- catalog */
  var CATS = [
    ['res', 'Resolution', [['4K', '2160p|4k|uhd'], ['1440p', '1440p|2k'], ['1080p', '1080p|fhd'], ['720p', '720p']]],
    ['src', 'Source', [['Remux', 'remux'], ['BluRay', 'blu-?ray|bdrip|brrip'], ['WEB-DL', 'web-?dl'], ['WEBRip', 'web-?rip'], ['HDTV', 'hdtv']]],
    ['hdr', 'HDR', [['Dolby Vision', 'dolby.?vision|\\bdv\\b'], ['HDR10+', 'hdr10\\+'], ['HDR10', 'hdr10'], ['Any HDR', 'hdr']]],
    ['aud', 'Audio', [['Atmos', 'atmos'], ['TrueHD', 'truehd'], ['DTS-HD', 'dts-?hd'], ['DTS:X', 'dts-?x'], ['DD+', 'dd\\+|ddp|e-?ac-?3'], ['5.1 or 7.1', '[57]\\.1']]],
    ['cod', 'Codec', [['HEVC', 'hevc|x265|h\\.?265'], ['AVC', 'x264|h\\.?264|avc'], ['AV1', 'av1']]],
    ['lang', 'Language', [['English', 'english|🇬🇧'], ['Multi', 'multi'], ['Dual audio', 'dual'], ['Japanese', 'japanese|🇯🇵'], ['French', 'french|🇫🇷'], ['German', 'german|🇩🇪'], ['Spanish', 'spanish|🇪🇸']]]
  ];
  var AVOID = [['CAM', 'cam'], ['HDCAM', 'hdcam'], ['Telesync', 'telesync'], ['TS', 'ts'], ['HDTS', 'hdts'], ['Screener', 'scr'], ['Sample', 'sample'], ['3D', '3d'], ['Hardcoded subs', 'hardsub'], ['HC', 'hc'], ['480p', '480p'], ['360p', '360p']];
  var JUNK = ['CAM', 'HDCAM', 'Telesync', 'HDTS', 'Screener', 'Sample', '3D'];

  var PRESETS = [
    ['4K HDR', 'Plays 4K with HDR, skips junk releases.', { sel: { res: ['4K'], hdr: ['Dolby Vision', 'HDR10+', 'HDR10', 'Any HDR'] }, avoid: JUNK }],
    ['Safe 1080p', 'Good for 1080p screens: 1080p only, no junk.', { sel: { res: ['1080p'] }, avoid: JUNK }],
    ['Remux + lossless', 'Remux releases with lossless or object audio.', { sel: { src: ['Remux'], aud: ['Atmos', 'TrueHD', 'DTS-HD', 'DTS:X'] }, avoid: JUNK }],
    ['No junk only', 'Anything except cams, screeners and samples.', { sel: {}, avoid: JUNK }],
    ['Anime dual audio', '1080p with dual or multi audio.', { sel: { res: ['1080p'], lang: ['Dual audio', 'Multi'] }, avoid: ['Sample', 'Hardcoded subs'] }]
  ];

  /* --------------------------------------------------------------- state */
  function blank(name) { return { name: name, sel: {}, avsel: {}, avoid: [], words: '', mode: 'any', avwords: '', raw: null }; }
  var state = { profiles: [blank('A')], active: 0, src: 'fmt', custom: '', order: [], playable: {} };
  function P() { return state.profiles[state.active]; }
  function save() { lsSet('chip:rx', JSON.stringify({ profiles: state.profiles, active: state.active, src: state.src, custom: state.custom })); }
  function sane(profiles) {
    return Array.isArray(profiles) && profiles.length && profiles.length <= 3 && profiles.every(function (p) { return p && typeof p === 'object' && p.sel && typeof p.sel === 'object'; });
  }
  function load() {
    var h = location.hash.match(/^#r=(.+)$/);
    if (h) {
      try {
        var o = JSON.parse(decodeURIComponent(escape(atob(h[1].replace(/-/g, '+').replace(/_/g, '/')))));
        if (sane(o.profiles)) { state.profiles = o.profiles.map(norm); state.active = 0; return 'shared'; }
      } catch (e) {}
      $('#rx-note').textContent = 'That share link could not be read, so your last setup is loaded.';
    }
    try {
      var s = JSON.parse(lsGet('chip:rx') || 'null');
      if (s && sane(s.profiles)) {
        state.profiles = s.profiles.map(norm); state.active = Math.min(Math.max(+s.active || 0, 0), state.profiles.length - 1);
        state.src = s.src === 'custom' ? 'custom' : 'fmt'; state.custom = typeof s.custom === 'string' ? s.custom : '';
      }
    } catch (e) {}
    return '';
  }
  function norm(p) {
    var b = blank(typeof p.name === 'string' ? p.name.slice(0, 12) : 'A');
    CATS.forEach(function (c) { b.sel[c[0]] = Array.isArray(p.sel[c[0]]) ? p.sel[c[0]].filter(function (x) { return typeof x === 'string'; }) : []; });
    b.avsel = {}; CATS.forEach(function (c) { b.avsel[c[0]] = p.avsel && Array.isArray(p.avsel[c[0]]) ? p.avsel[c[0]].filter(function (x) { return typeof x === 'string'; }) : []; });
    b.avoid = Array.isArray(p.avoid) ? p.avoid.filter(function (x) { return typeof x === 'string'; }) : [];
    b.words = typeof p.words === 'string' ? p.words : ''; b.mode = p.mode === 'all' ? 'all' : 'any';
    b.avwords = typeof p.avwords === 'string' ? p.avwords : ''; b.raw = typeof p.raw === 'string' ? p.raw : null;
    return b;
  }

  /* ---------------------------------------------------------- generation */
  function words(s) { return s.split(',').map(function (x) { return x.trim(); }).filter(Boolean); }
  function rows(p) { /* [{label, frag}] each becomes one lookahead */
    var out = [];
    CATS.forEach(function (c) {
      var chosen = (p.sel[c[0]] || []).map(function (id) { var t = c[2].filter(function (x) { return x[0] === id; })[0]; return t && t[1]; }).filter(Boolean);
      if (chosen.length) out.push({ label: c[1], frag: chosen.join('|') });
    });
    var w = words(p.words).map(esc);
    if (w.length) {
      if (p.mode === 'all') w.forEach(function (x, i) { out.push({ label: 'Your word ' + (i + 1), frag: x }); });
      else out.push({ label: 'Your words', frag: w.join('|') });
    }
    return out;
  }
  function avoidWords(p) {
    var a = (p.avoid || []).map(function (id) { var t = AVOID.filter(function (x) { return x[0] === id; })[0]; return t && t[1]; }).filter(Boolean);
    return a.concat(words(p.avwords).map(function (w) { return w.replace(/[^\w .\-]/g, ''); }).filter(Boolean));
  }
  function avRows(p) { /* [{label, frag}] one negative lookahead each, no word boundaries (fragments are specific) */
    var out = [];
    CATS.forEach(function (c) {
      var chosen = ((p.avsel || {})[c[0]] || []).map(function (id) { var t = c[2].filter(function (x) { return x[0] === id; })[0]; return t && t[1]; }).filter(Boolean);
      if (chosen.length) out.push({ label: c[1], frag: chosen.join('|') });
    });
    return out;
  }
  function generate(p) {
    var parts = rows(p).map(function (r) { return '(?=.*(' + r.frag + '))'; });
    avRows(p).forEach(function (r) { parts.push('(?!.*(' + r.frag + '))'); });
    var av = avoidWords(p);
    if (av.length) parts.push('(?!.*\\b(' + av.join('|') + ')\\b)');
    return parts.length ? '(?is)^' + parts.join('') : '';
  }
  function patternOf(p) { return p.raw !== null ? p.raw : generate(p); }

  /* -------------------------------------------------- Nuvio-style matching */
  function toJs(pattern) {
    var warns = [], flags = { i: 1 }, body = pattern.trim(), m;
    while ((m = /^\(\?([a-zA-Z]+)\)/.exec(body))) {
      m[1].split('').forEach(function (ch) {
        if (ch === 'i') flags.i = 1; else if (ch === 's') flags.s = 1; else if (ch === 'm') flags.m = 1;
        else warns.push('The flag (?' + ch + ') cannot be tested here.');
      });
      body = body.slice(m[0].length);
    }
    if (/\*\+|\+\+|\?\+|\(\?>|\\Q|\\E|\\A|\\z|\\Z|\\h|\\R/.test(body)) warns.push('This uses Java-only syntax (possessive quantifier, atomic group, \\Q..\\E or similar) that this page cannot test.');
    try { return { re: new RegExp(body, Object.keys(flags).join('')), warns: warns }; }
    catch (e) { return { err: e.message, warns: warns }; }
  }
  function configured(pattern) { var t = pattern.trim(); return !!t && /[A-Za-z0-9]/.test(t) && !toJs(t).err; }
  function exclusion(pattern) {
    var re = /\(\?![^)]*?\(([^)]+)\)/g, m, w = [];
    while ((m = re.exec(pattern))) m[1].split('|').forEach(function (x) { x = x.trim(); if (x) w.push(x); });
    return w;
  }
  function searchable(s) { return s.addon + ' ' + s.name + ' ' + '' + ' ' + s.desc + ' ' + ''; }
  function evaluate(pattern, p, streams) {
    var res = streams.map(function () { return { match: false, why: '' }; });
    if (!configured(pattern)) return { res: res, ok: false, win: -1 };
    var js = toJs(pattern), ex = exclusion(pattern);
    var exRe = ex.length ? new RegExp('\\b(' + ex.map(esc).join('|') + ')\\b', 'i') : null;
    var rr = p && p.raw === null ? rows(p) : [];
    streams.forEach(function (s, i) {
      var t = searchable(s), r = res[i];
      js.re.lastIndex = 0;
      if (!js.re.test(t)) {
        r.why = 'pattern does not match';
        if (p && p.raw === null) {
          var hit = avoidWords(p).filter(function (w) { return new RegExp('\\b' + esc(w) + '\\b', 'i').test(t); });
          if (hit.length) { r.why = 'skipped: contains "' + hit[0] + '"'; return; }
          var ah = avRows(p).filter(function (x) { return new RegExp(x.frag, 'i').test(t); });
          if (ah.length) { r.why = 'skipped: has excluded ' + ah[0].label.toLowerCase(); return; }
        }
        if (rr.length) {
          var miss = rr.filter(function (x) { return !new RegExp(x.frag, 'is').test(t); }).map(function (x) { return x.label; });
          if (miss.length) r.why = 'missing: ' + miss.join(', ');
        }
        return;
      }
      var h = exRe && exRe.exec(t);
      if (h) { r.why = 'skipped: contains "' + h[0] + '"'; return; }
      r.match = true;
    });
    return { res: res, ok: true, win: -1 };
  }
  function winner(ev, streams, order) {
    if (!ev.ok) return -1;
    for (var k = 0; k < order.length; k++) { var i = order[k]; if (ev.res[i] && ev.res[i].match && streams[i].playable) return i; }
    return -1;
  }

  /* ------------------------------------------------------------- streams */
  function fmtTemplates() {
    try { var s = JSON.parse(lsGet('chip:fmt') || 'null'); if (s && typeof s.n === 'string' && typeof s.d === 'string') return s; } catch (e) {}
    var d = D.PRESETS.filter(function (p) { return p.id === 'detailed'; })[0];
    return { n: d.name, d: d.desc };
  }
  function fmtStreams() {
    var t = fmtTemplates();
    return D.SAMPLES.map(function (s) {
      return { label: s.label, addon: (s.data.addon && s.data.addon.name) || '', name: F.render(t.n, s.data, []), desc: F.render(t.d, s.data, []), playableDefault: !(s.data.service && s.data.service.cached === false) };
    });
  }
  function parseCustom(text) {
    return text.split(/^\s*---\s*$/m).map(function (b) { return b.replace(/^\s*\n/, '').replace(/\s+$/, ''); }).filter(Boolean).map(function (b, i) {
      var lines = b.split('\n'), first = lines.shift(), bar = first.indexOf('|');
      return { label: 'Stream ' + (i + 1), addon: bar >= 0 ? first.slice(0, bar).trim() : '', name: bar >= 0 ? first.slice(bar + 1).trim() : first.trim(), desc: lines.join('\n'), playableDefault: true };
    });
  }
  function serialize(streams) { return streams.map(function (s) { return s.addon + ' | ' + s.name + (s.desc ? '\n' + s.desc : ''); }).join('\n---\n'); }
  var cur = [], lastKey = '';
  function currentStreams() {
    var base = state.src === 'custom' ? parseCustom(state.custom) : fmtStreams();
    var key = state.src + ':' + base.length;
    if (key !== lastKey) { lastKey = key; state.order = base.map(function (_, i) { return i; }); state.playable = {}; }
    cur = base.map(function (s, i) { s.playable = state.playable[i] !== undefined ? state.playable[i] : s.playableDefault; return s; });
    return cur;
  }

  /* ----------------------------------------------------------- rendering */
  function toggle(list, v) { var i = list.indexOf(v); if (i >= 0) list.splice(i, 1); else list.push(v); }
  function renderBuild() {
    var p = P(), box = $('#rx-cats'); box.replaceChildren();
    CATS.forEach(function (c) {
      var chips = el('div', { className: 'chips' });
      c[2].forEach(function (t) {
        var on = (p.sel[c[0]] || []).indexOf(t[0]) >= 0;
        chips.append(el('button', { type: 'button', className: 'tog' + (on ? ' on' : ''), textContent: t[0], 'aria-pressed': String(on), onclick: function () { p.sel[c[0]] = p.sel[c[0]] || []; toggle(p.sel[c[0]], t[0]); p.raw = null; update(); } }));
      });
      box.append(el('div', { className: 'catrow' }, el('span', { textContent: c[1] }), chips));
    });
    var av = $('#rx-avoid'); av.replaceChildren();
    CATS.forEach(function (c) {
      var chips = el('div', { className: 'chips' });
      c[2].forEach(function (t) {
        chips.append(el('button', { type: 'button', className: 'tog neg', textContent: t[0], onclick: function () { p.avsel[c[0]] = p.avsel[c[0]] || []; toggle(p.avsel[c[0]], t[0]); p.raw = null; update(); } }, null));
        chips.lastChild.dataset.k = 'av:' + c[0]; chips.lastChild.dataset.id = t[0];
      });
      av.append(el('div', { className: 'catrow' }, el('span', { textContent: c[1] }), chips));
    });
    var junk = el('div', { className: 'chips' });
    AVOID.forEach(function (t) {
      junk.append(el('button', { type: 'button', className: 'tog neg', textContent: t[0], onclick: function () { toggle(p.avoid, t[0]); p.raw = null; update(); } }));
      junk.lastChild.dataset.k = 'junk'; junk.lastChild.dataset.id = t[0];
    });
    av.append(el('div', { className: 'catrow' }, el('span', { textContent: 'Junk' }), junk));
    $('#rx-words').value = p.words; $('#rx-wordmode').value = p.mode; $('#rx-avwords').value = p.avwords;
    var tabs = $('#rx-profiles'); tabs.replaceChildren();
    state.profiles.forEach(function (q, i) {
      tabs.append(el('button', { type: 'button', className: i === state.active ? 'on' : '', textContent: 'Profile ' + q.name, onclick: function () { state.active = i; renderBuild(); update(); } }));
    });
    $('#rx-addprof').disabled = state.profiles.length >= 3; $('#rx-delprof').disabled = state.profiles.length <= 1;
  }
  function renderPresets() {
    var box = $('#rx-presets'); box.replaceChildren();
    PRESETS.forEach(function (pr) {
      box.append(el('button', { type: 'button', className: 'preset pack', onclick: function () {
        var p = P(); p.sel = {}; CATS.forEach(function (c) { p.sel[c[0]] = (pr[2].sel[c[0]] || []).slice(); });
        p.avoid = pr[2].avoid.slice(); p.avsel = {}; CATS.forEach(function (c) { p.avsel[c[0]] = (pr[2].avsel && pr[2].avsel[c[0]] || []).slice(); }); p.words = ''; p.avwords = ''; p.raw = null; renderBuild(); update();
      } }, el('span', { className: 'pname', textContent: pr[0] }), el('span', { className: 'pdesc', textContent: pr[1] })));
    });
  }
  function issue(list, lvl, msg) { list.push({ lvl: lvl, msg: msg }); }
  function renderChecks(pattern, ev, streams) {
    var list = [], t = pattern.trim();
    if (!t) issue(list, 'bad', 'Empty pattern. Nuvio treats this as not set, so nothing auto-plays.');
    else if (!/[A-Za-z0-9]/.test(t)) issue(list, 'bad', 'The pattern has no letters or digits. Nuvio ignores it.');
    else {
      var js = toJs(t);
      if (js.err) issue(list, 'bad', 'Not a valid pattern: ' + js.err);
      js.warns.forEach(function (w) { issue(list, 'bad', w); });
      if (!js.err) {
        if (/\.\*/.test(t) && !/^\(\?[a-z]*s[a-z]*\)/i.test(t)) issue(list, 'bad', 'This uses .* without (?s). Stream descriptions have line breaks, and . stops at them, so matches may be missed.');
        if (P().raw !== null) exclusion(t).forEach(function (w) { if (/[^\w .\-]/.test(w)) issue(list, 'bad', 'The skip word "' + w + '" has special characters. Nuvio pulls skip words out of the pattern and the TV app does not escape them. Use plain words.'); });
        if (streams.length) {
          var n = ev.res.filter(function (r) { return r.match; }).length;
          if (!n) issue(list, 'bad', 'Matches none of the ' + streams.length + ' test streams. Nuvio would auto-play nothing for them.');
          else if (n === streams.length) issue(list, 'bad', 'Matches every test stream, so it does not narrow anything. Nuvio plays the first playable one.');
        }
      }
    }
    if (!list.length) issue(list, 'ok', 'No problems found against the test streams.');
    var ul = $('#rx-checks'); ul.replaceChildren();
    list.forEach(function (x) { ul.append(el('li', { className: x.lvl, textContent: x.msg })); });
  }
  function renderTester(pattern, ev, streams) {
    var win = winner(ev, streams, state.order), sum = $('#rx-summary');
    if (!streams.length) sum.textContent = 'No streams to test. Add some in Custom text.';
    else if (!ev.ok) sum.textContent = 'Pattern not set or invalid: Nuvio ignores it and nothing auto-plays.';
    else if (win < 0) sum.textContent = 'No playable stream matches. Nuvio would auto-play nothing and show the list.';
    else { sum.replaceChildren(document.createTextNode('Nuvio would play: '), el('b', { textContent: streams[win].label }), document.createTextNode(' (position ' + (state.order.indexOf(win) + 1) + ' of ' + streams.length + ')')); }
    var box = $('#rx-streams'); box.replaceChildren();
    state.order.forEach(function (i, pos) {
      var s = streams[i]; if (!s) return;
      var r = ev.res[i] || { match: false, why: '' }, isWin = i === win;
      var tag = el('span', { className: 'tag' + (r.match ? ' yes' : ''), textContent: isWin ? 'plays' : r.match ? (s.playable ? 'match' : 'match, not playable') : 'no match' });
      var up = el('button', { type: 'button', className: 'sq', textContent: '↑', title: 'Move up', 'aria-label': 'Move up', disabled: pos === 0, onclick: function () { var o = state.order; o.splice(pos - 1, 0, o.splice(pos, 1)[0]); update(); } });
      var dn = el('button', { type: 'button', className: 'sq', textContent: '↓', title: 'Move down', 'aria-label': 'Move down', disabled: pos === state.order.length - 1, onclick: function () { var o = state.order; o.splice(pos + 1, 0, o.splice(pos, 1)[0]); update(); } });
      var cb = el('input', { type: 'checkbox', checked: s.playable, onchange: function () { state.playable[i] = cb.checked; update(); } });
      box.append(el('div', { className: 'rs' + (isWin ? ' win' : '') + (r.match ? '' : ' no') },
        el('h4', null, document.createTextNode((pos + 1) + '. ' + s.label), tag),
        el('div', { className: 'ctl' }, el('label', { className: 'ply', title: 'Uncached or unresolved streams are skipped by auto-play' }, cb, document.createTextNode('playable')), up, dn),
        el('div', { className: 'tx', textContent: s.addon + ' · ' + s.name + (s.desc ? '\n' + s.desc : '') }),
        r.why ? el('div', { className: 'why', textContent: r.why }) : null));
    });
    var cmp = $('#rx-compare'); cmp.replaceChildren();
    state.profiles.forEach(function (q, i) {
      var pat = patternOf(q), e = evaluate(pat, q, streams), w = winner(e, streams, state.order);
      cmp.append(el('div', null, el('b', { textContent: 'Profile ' + q.name + ': ' }), document.createTextNode(!pat.trim() ? 'no pattern yet' : !e.ok ? 'pattern not valid' : w >= 0 ? streams[w].label : 'no stream plays')));
    });
  }
  function update(skipOut) {
    var streams = currentStreams(), p = P(), pattern = patternOf(p);
    if (!skipOut) $('#rx-out').value = pattern;
    var ev = evaluate(pattern, p, streams);
    renderBuild_light();
    renderChecks(pattern, ev, streams); renderTester(pattern, ev, streams); save();
  }
  function renderBuild_light() { /* chips keep state through full re-render; avoid it while typing */
    var p = P();
    var chips = document.querySelectorAll('#rx-cats .tog'), k = 0;
    CATS.forEach(function (c) { c[2].forEach(function (t) { var on = (p.sel[c[0]] || []).indexOf(t[0]) >= 0; chips[k].classList.toggle('on', on); chips[k].setAttribute('aria-pressed', String(on)); k++; }); });
    Array.prototype.forEach.call(document.querySelectorAll('#rx-avoid .tog'), function (b) {
      var k = b.dataset.k, on = k === 'junk' ? p.avoid.indexOf(b.dataset.id) >= 0 : ((p.avsel || {})[k.slice(3)] || []).indexOf(b.dataset.id) >= 0;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
    });
    var HAND = 'Edited by hand. Changing a choice above replaces it.', n = $('#rx-note');
    if (p.raw !== null) n.textContent = HAND; else if (n.textContent === HAND) n.textContent = '';
  }

  /* ---------------------------------------------------------------- misc */
  function copy(text, label) {
    var note = $('#rx-note');
    function done(ok) { note.textContent = ok ? label + ' copied.' : 'Copy was blocked by the browser. Select the text and copy it by hand.'; }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    else { var t = el('textarea', { value: text }); document.body.append(t); t.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} t.remove(); done(ok); }
  }
  function shareLink() {
    var j = JSON.stringify({ profiles: state.profiles });
    return location.origin + location.pathname + '#r=' + btoa(unescape(encodeURIComponent(j))).replace(/\+/g, '-').replace(/\//g, '_');
  }
  function setSrc(m) {
    state.src = m;
    Array.prototype.forEach.call(document.querySelectorAll('#rx-src button'), function (b) { b.classList.toggle('on', b.dataset.m === m); });
    $('#rx-custombox').hidden = m !== 'custom';
    $('#rx-srcnote').textContent = m === 'fmt' ? 'Streams are the sample streams rendered with the template saved in the Formatter builder (or its Detailed preset).' : 'Edit the text below or paste real stream text from your addon.';
    if (m === 'custom' && !state.custom.trim()) { state.custom = serialize(fmtStreams()); }
    $('#rx-custom').value = state.custom;
    lastKey = '';
  }

  function init() {
    var how = load();
    $('#rx-words').addEventListener('input', function () { var p = P(); p.words = this.value; p.raw = null; update(); });
    $('#rx-wordmode').addEventListener('change', function () { var p = P(); p.mode = this.value; p.raw = null; update(); });
    $('#rx-avwords').addEventListener('input', function () { var p = P(); p.avwords = this.value; p.raw = null; update(); });
    $('#rx-out').addEventListener('input', function () { P().raw = this.value; update(true); });
    $('#rx-copy').onclick = function () { copy($('#rx-out').value, 'Pattern'); };
    $('#rx-share').onclick = function () { copy(shareLink(), 'Link'); };
    $('#rx-clear').onclick = function () { var p = P(), n = p.name; state.profiles[state.active] = blank(n); renderBuild(); update(); };
    $('#rx-addprof').onclick = function () { var names = ['A', 'B', 'C'].filter(function (n) { return !state.profiles.some(function (p) { return p.name === n; }); }); state.profiles.push(blank(names[0] || 'D')); state.active = state.profiles.length - 1; renderBuild(); update(); };
    $('#rx-delprof').onclick = function () { state.profiles.splice(state.active, 1); state.active = 0; renderBuild(); update(); };
    Array.prototype.forEach.call(document.querySelectorAll('#rx-src button'), function (b) { b.onclick = function () { setSrc(b.dataset.m); update(); }; });
    $('#rx-custom').addEventListener('input', function () { state.custom = this.value; update(); });
    renderPresets(); renderBuild(); setSrc(state.src); update();
    if (how === 'shared') $('#rx-note').textContent = 'Loaded from a share link.';
  }
  init();
})();
