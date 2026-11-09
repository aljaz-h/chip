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

  /* ------------------------------------------------------------- samples */
  var USER = { languages: ['English'], subtitles: ['English'], resolutions: ['2160p', '1080p', '720p'], qualities: [], visualTags: [], audioTags: [], audioChannels: [], encodes: [], streamTypes: [], releaseGroups: [], keywords: [] };
  var SAMPLES = [
    { label: 'Movie 4K', data: {
      addon: { name: 'Torrentio' }, config: { addonName: 'Torrentio' },
      service: { id: 'realdebrid', shortName: 'RD', name: 'Real-Debrid', cached: true },
      stream: { filename: 'Dune.Part.Two.2024.2160p.UHD.BluRay.REMUX.DV.HDR10.HEVC.TrueHD.Atmos.7.1-FraMeSToR.mkv', folderName: 'Dune.Part.Two.2024.2160p.UHD.BluRay.REMUX', size: 62400000000, bitrate: 52000000, duration: 9960000, quality: 'BluRay REMUX', resolution: '2160p', visualTags: ['DV', 'HDR10'], audioTags: ['TrueHD', 'Atmos'], audioChannels: ['7.1'], encode: 'HEVC', releaseGroup: 'FraMeSToR', languages: ['English'], languageEmojis: ['🇬🇧'], languageCodes: ['EN'], subtitles: ['English', 'French'], subtitleEmojis: ['🇬🇧', '🇫🇷'], title: 'Dune Part Two', year: '2024', seeders: 142, indexer: 'Knaben', type: 'debrid', library: false, proxied: false, private: false, seasonPack: false, age: '3d', edition: null },
      metadata: { queryType: 'movie' }, user: USER } },
    { label: 'Series 1080p', data: {
      addon: { name: 'Comet' }, config: { addonName: 'Comet' },
      service: { id: 'torbox', shortName: 'TB', name: 'TorBox', cached: true },
      stream: { filename: 'The.Bear.S03E05.1080p.WEB-DL.DDP5.1.H.264-NTb.mkv', size: 2100000000, bitrate: 6200000, duration: 2220000, quality: 'WEB-DL', resolution: '1080p', visualTags: [], audioTags: ['DD+'], audioChannels: ['5.1'], encode: 'AVC', releaseGroup: 'NTb', languages: ['English', 'French', 'Spanish'], languageEmojis: ['🇬🇧', '🇫🇷', '🇪🇸'], languageCodes: ['EN', 'FR', 'ES'], subtitles: ['English'], subtitleEmojis: ['🇬🇧'], title: 'The Bear', year: '2022', seasons: [3], episodes: [5], seasonEpisode: ['S03', 'E05'], formattedSeasons: 'S03', formattedEpisodes: 'E05', seasonPack: false, seeders: 56, indexer: 'EZTV', type: 'debrid', library: true, proxied: false, private: false, network: 'FX' },
      metadata: { queryType: 'series' }, user: USER } },
    { label: 'Anime BD', data: {
      addon: { name: 'Nyaa' }, config: { addonName: 'Nyaa' },
      service: { id: 'alldebrid', shortName: 'AD', name: 'AllDebrid', cached: true },
      stream: { filename: '[Group] Frieren - 12 [BD 1080p HEVC 10bit Dual Audio FLAC].mkv', folderName: '[Group] Frieren (BD 1080p)', size: 9800000000, quality: 'BluRay', resolution: '1080p', visualTags: ['10bit'], audioTags: ['FLAC'], audioChannels: ['2.0'], encode: 'HEVC', releaseGroup: 'Group', languages: ['Japanese', 'English'], languageEmojis: ['🇯🇵', '🇬🇧'], languageCodes: ['JA', 'EN'], subtitles: ['English'], subtitleEmojis: ['🇬🇧'], title: 'Frieren', seasonEpisode: ['S01', 'E12'], seasonPack: true, folderSize: 98000000000, seeders: 31, indexer: 'Nyaa', type: 'debrid', library: false, proxied: false, private: false, seadex: true, seadexBest: true },
      metadata: { queryType: 'anime' }, user: USER } },
    { label: 'Uncached 720p', data: {
      addon: { name: 'Torrentio' }, config: { addonName: 'Torrentio' },
      service: { id: 'realdebrid', shortName: 'RD', name: 'Real-Debrid', cached: false },
      stream: { filename: 'Old.Movie.1998.720p.BluRay.x264-GRP.mkv', size: 1400000000, quality: 'BluRay', resolution: '720p', visualTags: [], audioTags: ['AAC'], audioChannels: ['2.0'], encode: 'AVC', releaseGroup: 'GRP', languages: ['English'], languageEmojis: ['🇬🇧'], title: 'Old Movie', year: '1998', seeders: 8, indexer: 'ThePirateBay', type: 'p2p', library: false, proxied: false, private: false, message: 'Download required' },
      metadata: { queryType: 'movie' }, user: USER } },
    { label: 'Sparse', data: {
      addon: { name: 'Some Addon' }, config: { addonName: 'Some Addon' },
      service: { id: null, shortName: null, name: null, cached: null },
      stream: { filename: 'video.mp4', type: 'http', library: false, proxied: true, private: false },
      metadata: { queryType: 'movie' }, user: USER } }
  ];

  /* ------------------------------------------------------------- presets */
  var PRESETS = [
    { id: 'compact', label: 'Compact', about: 'Cache icon, addon, resolution. Four short lines.',
      name: '{service.cached["⚡"||"⏳"]} {addon.name}{? {stream.resolution}?}',
      desc: "{?{stream.title::title}?}{? ({stream.year})?}{? {stream.seasonEpisode::join(' · ')}?}\n{?{stream.quality}?}{? · {stream.encode}?}{? · {stream.visualTags::join(' · ')}?}\n{stream.size::>0[\"{stream.size::sbytes}\"||\"\"]}{? · 👥 {stream.seeders}?}{? · {stream.indexer}?}\n{?{stream.languageEmojis::join(' ')}?}" },
    { id: 'detailed', label: 'Detailed', about: 'Everything useful, one emoji per fact.',
      name: '{stream.proxied["🕵️ "||""]}{service.cached["⚡"||"⏳"]} {addon.name}{service.id::exists[" [{service.shortName}]"||""]}\n{?{stream.resolution}?}',
      desc: "{?🎬 {stream.title::title}?}{? ({stream.year})?}{? {stream.seasonEpisode::join('')}?}\n{?🎥 {stream.quality} ?}{?🎞️ {stream.encode} ?}{?📺 {stream.visualTags::join(' | ')} ?}\n{?🎧 {stream.audioTags::join(' | ')} ?}{?🔊 {stream.audioChannels::join(' | ')}?}\n{stream.size::>0[\"📦 {stream.size::sbytes} \"||\"\"]}{stream.seeders::>0[\"👥 {stream.seeders} \"||\"\"]}{?🔍 {stream.indexer}?}\n{?🌎 {stream.languageEmojis::join(' ')}?}{?  📝 {stream.subtitleEmojis::join(' ')}?}\n{?🏷️ {stream.releaseGroup}?}\n{?ℹ️ {stream.message}?}" },
    { id: 'badge', label: 'Badge-friendly', about: 'Skips what Chip badges already show: resolution, source, HDR, audio, codec, language.',
      name: '{service.cached["⚡"||"⏳"]} {addon.name}',
      desc: "{?{stream.title::title}?}{? ({stream.year})?}{? {stream.seasonEpisode::join(' · ')}?}\n{stream.size::>0[\"{stream.size::sbytes}\"||\"\"]}{stream.duration::>0[\" · {stream.duration::time}\"||\"\"]}{? · 👥 {stream.seeders}?}\n{?{stream.releaseGroup}?}{? · {stream.indexer}?}\n{?ℹ️ {stream.message}?}" },
    { id: 'minimal', label: 'Minimal', about: 'Two short lines, nothing else.',
      name: '{addon.name}{? · {stream.resolution}?}',
      desc: "{stream.size::>0[\"{stream.size::sbytes}\"||\"\"]}{? · {stream.languageEmojis::join(' ')}?}" },
    { id: 'small', label: 'Small caps', about: 'Quiet lettering with dot separators.',
      name: "{service.cached[\"⚡\"||\"⏳\"]} {addon.name::smallcaps}{? · {stream.resolution::replace('2160p','4K')}?}",
      desc: "{?{stream.title::title}?}{? · {stream.year}?}\n{?{stream.quality::smallcaps}?}{? · {stream.visualTags::join(' · ')}?}{? · {stream.audioTags::join(' · ')}?}\n{stream.size::>0[\"{stream.size::sbytes}\"||\"\"]}{? · {stream.releaseGroup::smallcaps}?}\n{?{stream.languageCodes::join(' · ')}?}" },
    { id: 'friendly', label: 'Readable names', about: '2160p becomes 4K, 1080p FHD. Warns on low quality.',
      name: "{stream.resolution::exists[\"{stream.resolution::replace('2160p','4K UHD')::replace('1440p','QHD')::replace('1080p','FHD')::replace('720p','HD')}\"||\"Unknown\"]}{service.cached[\" ⚡\"||\" ⏳\"]}",
      desc: "{?{stream.quality}?}{? · {stream.encode}?}{? · {stream.visualTags::join(' ')}?}\n{stream.size::>0[\"{stream.size::sbytes}\"||\"\"]}{? · {addon.name}?}{? · {stream.indexer}?}\n{stream.resolution::in('480p','360p','240p')[\"⚠️ Low quality\"||\"\"]}" }
  ];

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
