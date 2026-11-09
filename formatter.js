/* Formatter builder UI. Engine: formatter-engine.js. */
(function () {
  'use strict';
  var F = window.ChipFormatter;
  var $ = function (s) { return document.querySelector(s); };
  function el(tag, props) {
    var e = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) { e[k] = props[k]; });
    for (var i = 2; i < arguments.length; i++) e.append(arguments[i]);
    return e;
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var SAMPLES = window.ChipData.SAMPLES, PRESETS = window.ChipData.PRESETS;

  /* ------------------------------------------------------------- palette */
  var FIELD_GROUPS = [
    ['Quality', ['stream.resolution', 'stream.quality', 'stream.encode', 'stream.visualTags', 'stream.audioTags', 'stream.audioChannels', 'stream.edition', 'stream.editions', 'stream.upscaled', 'stream.repack']],
    ['File', ['stream.filename', 'stream.folderName', 'stream.size', 'stream.folderSize', 'stream.bitrate', 'stream.duration', 'stream.releaseGroup', 'stream.container', 'stream.message']],
    ['Title', ['stream.title', 'stream.year', 'stream.seasonEpisode', 'stream.formattedSeasons', 'stream.formattedEpisodes', 'stream.seasonPack', 'stream.network', 'stream.episodeTitle']],
    ['Language', ['stream.languages', 'stream.languageEmojis', 'stream.languageCodes', 'stream.smallLanguageCodes', 'stream.subtitles', 'stream.subtitleEmojis', 'stream.dubbed', 'stream.subbed']],
    ['Source', ['addon.name', 'service.shortName', 'service.name', 'service.cached', 'service.id', 'stream.type', 'stream.indexer', 'stream.seeders', 'stream.age', 'stream.library', 'stream.proxied', 'stream.private']],
    ['Scores', ['stream.seadex', 'stream.seadexBest', 'stream.regexMatched', 'stream.seScore', 'stream.nSeScore', 'stream.rseMatched']],
    ['Metadata', ['metadata.queryType', 'metadata.genres', 'metadata.runtime', 'metadata.isAnime']]
  ];
  var MODS = [
    ['Check', ["::exists", "::istrue", "::isfalse", "::>0", "::>=1", "::=p2p", "::~HDR", "::$DV", "::^MA", "::in('a','b')"]],
    ['Text', ["::upper", "::lower", "::title", "::smallcaps", "::trim", "::truncate(20)", "::replace('a','b')", "::remove('a')", "::subscript", "::superscript", "::default('N/A')"]],
    ['List', ["::join(' · ')", "::first", "::last", "::length", "::sort", "::rsort", "::unique", "::keep('a')", "::slice(0,2)", "::languageemoji", "::languagecode"]],
    ['Number', ["::bytes", "::sbytes", "::bytes2", "::sbytes2", "::bitrate", "::sbitrate", "::time", "::comma", "::star"]],
    ['Join', ["::and::", "::or::", "::xor::"]]
  ];
  var SNIPS = [
    ['Optional group (hides itself when empty)', '{?  ?}', 2],
    ['Yes / no', '{stream.library["yes"||"no"]}', 0],
    ['Yes / no / absent', '{service.cached["cached"||"not cached"||"n/a"]}', 0],
    ['Line break', '{tools.newLine}', 0],
    ['Remove this line', '{tools.removeLine}', 0]
  ];
  var lastTa = null, lastSel = [0, 0];
  function insertAt(text, caretBack, wrapGroup) {
    var ta = lastTa || $('#t-desc'), a = lastSel[0], b = lastSel[1], v = ta.value;
    var ins = text;
    if (wrapGroup && b > a) ins = '{?' + v.slice(a, b) + '?}';
    ta.value = v.slice(0, a) + ins + v.slice(b);
    var pos = a + ins.length - (wrapGroup && b > a ? 0 : (caretBack || 0));
    ta.focus(); ta.setSelectionRange(pos, pos); lastSel = [pos, pos];
    onChange();
  }
  function buildPalette() {
    var box = $('#palette'); box.replaceChildren();
    function det(title, chips) { var d = el('details', null, el('summary', { textContent: title }), chips); box.append(d); }
    FIELD_GROUPS.forEach(function (g) {
      var c = el('div', { className: 'chips' });
      g[1].forEach(function (p) { c.append(el('button', { type: 'button', textContent: p.split('.')[1], title: '{' + p + '}', onclick: function () { insertAt('{' + p + '}'); } })); });
      det('Fields: ' + g[0], c);
    });
    var mc = el('div', { className: 'chips' });
    MODS.forEach(function (g) { g[1].forEach(function (m) { mc.append(el('button', { type: 'button', textContent: m, title: g[0], onclick: function () { insertAt(m); } })); }); });
    det('Modifiers (add after a field, inside the braces)', mc);
    var sc = el('div', { className: 'chips' });
    SNIPS.forEach(function (s) { sc.append(el('button', { type: 'button', textContent: s[0], onclick: function () { insertAt(s[1], s[2], s[0].indexOf('group') > 0); } })); });
    det('Snippets', sc);
  }

  /* ---------------------------------------------------------------- state */
  var state = { n: PRESETS[0].name, d: PRESETS[0].desc, p: 'compact', s: 0, ov: [], edits: {} };
  function save() { lsSet('chip:fmt', JSON.stringify({ n: state.n, d: state.d, p: state.p, ov: state.ov })); }
  function load() {
    var h = location.hash.match(/^#s=(.+)$/);
    if (h) {
      try {
        var o = JSON.parse(decodeURIComponent(escape(atob(h[1].replace(/-/g, '+').replace(/_/g, '/')))));
        if (typeof o.n === 'string' && typeof o.d === 'string') { state.n = o.n; state.d = o.d; state.p = ''; return 'shared'; }
      } catch (e) { $('#copy-note').textContent = 'That share link could not be read, so the default preset is loaded.'; }
    }
    try {
      var s = JSON.parse(lsGet('chip:fmt') || 'null');
      if (s && typeof s.n === 'string' && typeof s.d === 'string') { state.n = s.n; state.d = s.d; state.p = s.p || ''; state.ov = Array.isArray(s.ov) ? s.ov : []; }
    } catch (e) {}
    return '';
  }

  /* ------------------------------------------------------------ rendering */
  function sampleData(i) { return state.edits[i] || SAMPLES[i].data; }
  function renderPreview() {
    var issues = [], d = sampleData(state.s);
    $('#p-name').textContent = F.render(state.n, d, issues);
    $('#p-desc').textContent = F.render(state.d, d, issues);
  }
  function collectIssues() {
    var seen = {}, list = [];
    SAMPLES.forEach(function (s, i) {
      var iss = [];
      F.render(state.n, sampleData(i), iss); F.render(state.d, sampleData(i), iss);
      iss.forEach(function (x) { if (!seen[x.msg]) { seen[x.msg] = 1; list.push(x); } });
    });
    var ul = $('#issues'); ul.replaceChildren();
    if (!list.length) ul.append(el('li', { className: 'ok', textContent: 'No problems found in the preview.' }));
    list.forEach(function (x) { ul.append(el('li', { className: x.lvl, textContent: x.msg })); });
  }
  var OVERLAP = [
    ['resolution', 'Resolution', ['stream.resolution']],
    ['quality', 'Source / quality', ['stream.quality']],
    ['visual', 'HDR / video', ['stream.visualTags']],
    ['audio', 'Audio', ['stream.audioTags']],
    ['channels', 'Channels', ['stream.audioChannels']],
    ['codec', 'Codec', ['stream.encode']],
    ['lang', 'Language', ['stream.languages', 'stream.languageEmojis', 'stream.languageCodes', 'stream.smallLanguageCodes', 'stream.uLanguages', 'stream.uLanguageEmojis', 'stream.uLanguageCodes', 'stream.uSmallLanguageCodes']],
    ['service', 'Provider / cache', ['service.id', 'service.shortName', 'service.name', 'service.cached']]
  ];
  function renderOverlap() {
    var box = $('#overlap-checks');
    if (!box.children.length) OVERLAP.forEach(function (o) {
      var cb = el('input', { type: 'checkbox', checked: state.ov.indexOf(o[0]) >= 0, onchange: function () {
        state.ov = OVERLAP.filter(function (x) { return box.querySelector('[data-k="' + x[0] + '"]').checked; }).map(function (x) { return x[0]; });
        save(); renderOverlap();
      } });
      cb.dataset.k = o[0];
      box.append(el('label', null, cb, document.createTextNode(o[1])));
    });
    var ul = $('#overlap-list'); ul.replaceChildren();
    var hits = 0;
    [['Name', state.n], ['Description', state.d]].forEach(function (t) {
      var used = F.fieldsUsed(t[1]);
      OVERLAP.forEach(function (o) {
        if (state.ov.indexOf(o[0]) < 0) return;
        o[2].forEach(function (f) {
          if (used.indexOf(f) >= 0) { hits++; ul.append(el('li', { className: 'bad', textContent: t[0] + ' uses {' + f + '}, which your ' + o[1].toLowerCase() + ' badge already shows.' })); }
        });
      });
    });
    if (!hits) ul.append(el('li', { className: 'ok', textContent: state.ov.length ? 'No repeats found.' : 'Tick what your badges show to check for repeats.' }));
  }
  function renderPresets() {
    var box = $('#fpresets'); box.replaceChildren();
    PRESETS.forEach(function (p) {
      var b = el('button', { type: 'button', className: 'preset pack' + (state.p === p.id ? ' on' : ''), onclick: function () {
        state.n = p.name; state.d = p.desc; state.p = p.id; $('#t-name').value = state.n; $('#t-desc').value = state.d; onChange(true);
      } }, el('span', { className: 'pname', textContent: p.label }), el('span', { className: 'pdesc', textContent: p.about }));
      box.append(b);
    });
  }
  function onChange(fromPreset) {
    state.n = $('#t-name').value; state.d = $('#t-desc').value;
    if (!fromPreset) { var cur = PRESETS.filter(function (p) { return p.name === state.n && p.desc === state.d; })[0]; state.p = cur ? cur.id : ''; }
    renderPresets(); renderPreview(); collectIssues(); renderOverlap(); save();
  }

  /* ----------------------------------------------------------------- copy */
  function copy(text, label) {
    var note = $('#copy-note');
    function done(ok) { note.textContent = ok ? label + ' copied.' : 'Copy was blocked by the browser. Select the text and copy it by hand.'; }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    else { var t = el('textarea', { value: text }); document.body.append(t); t.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} t.remove(); done(ok); }
  }
  function shareLink() {
    var j = JSON.stringify({ n: state.n, d: state.d });
    var b = btoa(unescape(encodeURIComponent(j))).replace(/\+/g, '-').replace(/\//g, '_');
    return location.origin + location.pathname + '#s=' + b;
  }

  /* ----------------------------------------------------------------- init */
  function buildSamples() {
    var box = $('#samples'); box.replaceChildren();
    SAMPLES.forEach(function (s, i) {
      box.append(el('button', { type: 'button', className: i === state.s ? 'on' : '', textContent: s.label, onclick: function () { state.s = i; buildSamples(); loadSampleJson(); renderPreview(); } }));
    });
  }
  function loadSampleJson() { $('#sample-json').value = JSON.stringify(sampleData(state.s), null, 1); $('#sample-err').textContent = ''; }

  function init() {
    var how = load();
    $('#t-name').value = state.n; $('#t-desc').value = state.d;
    ['#t-name', '#t-desc'].forEach(function (id) {
      var ta = $(id);
      ta.addEventListener('input', function () { onChange(false); });
      ['blur', 'select', 'keyup', 'click'].forEach(function (ev) { ta.addEventListener(ev, function () { lastTa = ta; lastSel = [ta.selectionStart, ta.selectionEnd]; }); });
    });
    $('#b-copy-name').onclick = function () { copy(state.n, 'Name'); };
    $('#b-copy-desc').onclick = function () { copy(state.d, 'Description'); };
    $('#b-copy-json').onclick = function () { copy(JSON.stringify({ name: state.n, description: state.d }, null, 2), 'JSON'); };
    $('#b-share').onclick = function () { copy(shareLink(), 'Link'); };
    $('#b-reset').onclick = function () { var p = PRESETS[0]; state.n = p.name; state.d = p.desc; state.p = p.id; $('#t-name').value = state.n; $('#t-desc').value = state.d; onChange(true); };
    $('#sample-json').addEventListener('input', function () {
      try { var o = JSON.parse(this.value); if (!o || typeof o !== 'object') throw new Error('Expected an object'); state.edits[state.s] = o; $('#sample-err').textContent = ''; onChange(true); }
      catch (e) { $('#sample-err').textContent = 'Not valid JSON yet: ' + e.message; }
    });
    buildPalette(); buildSamples(); loadSampleJson(); renderPresets(); renderPreview(); collectIssues(); renderOverlap();
    if (how === 'shared') $('#copy-note').textContent = 'Loaded from a share link.';
    $('#fpreset-note').textContent = PRESETS.length + ' presets. Your edits are kept in this browser.';
  }
  init();
})();
