/* Chip formatter engine: a small, independent interpreter for AIOStreams-style
   formatter templates, used only for the live preview. Written from the public
   syntax (checked against AIOStreams v2.37.0); it is not AIOStreams code.
   Unsupported modifiers (where, pluck, each, date) are reported, not guessed. */
(function () {
  'use strict';

  var FIELDS = {
    config: ['addonName'],
    stream: ['filename','folderName','size','bitrate','folderSize','library','quality','resolution','subbed','dubbed','languages','mediaInfoQuality','uLanguages','subtitles','uSubtitles','languageEmojis','uLanguageEmojis','subtitleEmojis','uSubtitleEmojis','languageCodes','uLanguageCodes','subtitleCodes','uSubtitleCodes','smallLanguageCodes','uSmallLanguageCodes','smallSubtitleCodes','uSmallSubtitleCodes','visualTags','audioTags','audioTracks','subtitleTracks','releaseGroup','regexMatched','rankedRegexMatched','regexScore','nRegexScore','encode','audioChannels','edition','editions','regraded','repack','proper','uncensored','unrated','upscaled','hasChapters','network','site','container','extension','indexer','year','title','country','episodeTitle','date','folderSeasons','formattedFolderSeasons','seasons','season','formattedSeasons','episodes','episode','formattedEpisodes','folderEpisodes','formattedFolderEpisodes','seasonEpisode','seasonPack','seeders','private','freeleech','age','ageHours','duration','infoHash','type','message','proxied','seadex','seadexBest','seScore','nSeScore','seMatched','rseMatched','preloading','idMatched'],
    metadata: ['queryType','type','isAnime','title','titles','year','yearEnd','runtime','episodeRuntime','genres','originalLanguage','country','season','episode','absoluteEpisode','relativeAbsoluteEpisode','episodeTitle','episodeTitles','latestSeason','daysSinceRelease','daysSinceFirstAired','daysSinceLastAired','hasNextEpisode','daysUntilNextEpisode','anilistId','malId','hasSeaDex'],
    user: ['languages','subtitles','resolutions','qualities','visualTags','audioTags','audioChannels','encodes','streamTypes','releaseGroups','keywords'],
    track: ['lang','codec','tag','tags','channels','title','default','forced','commentary','dub','original','hearingImpaired','visualImpaired'],
    service: ['id','shortName','name','cached'],
    addon: ['name','presetId','manifestUrl'],
    debug: ['json','jsonf']
  };
  var CANON = {};
  Object.keys(FIELDS).forEach(function (s) { FIELDS[s].forEach(function (p) { CANON[(s + '.' + p).toLowerCase()] = [s, p]; }); });

  var COMPARATORS = {
    and: function (a, b) { return a && b; }, or: function (a, b) { return a || b; },
    xor: function (a, b) { return (a || b) && !(a && b); },
    neq: function (a, b) { return a !== b; }, equal: function (a, b) { return a === b; },
    left: function (a) { return a; }, right: function (a, b) { return b; }
  };
  var NL = '\u0011', RL = '\u0012';
  var UNSUPPORTED = { where: 1, pluck: 1, each: 1, date: 1 };

  function exists(v) {
    if (v === undefined || v === null) return false;
    if (typeof v === 'string') return /\S/.test(v);
    if (Array.isArray(v)) return v.length > 0;
    return true;
  }
  function BadExpr(msg) { this.msg = msg; }

  /* ---------------------------------------------------------------- parsing */
  function matchBrace(s, i) { /* s[i] === '{' ; returns index of matching '}' or -1 */
    var d = 0;
    for (var k = i; k < s.length; k++) {
      if (s[k] === '{') d++;
      else if (s[k] === '}') { d--; if (d === 0) return k; }
    }
    return -1;
  }
  function matchGroup(s, i) { /* s starts '{?' at i ; returns index of '?}' */
    var d = 0;
    for (var k = i; k < s.length - 1; k++) {
      if (s[k] === '{' && s[k + 1] === '?') { d++; k++; }
      else if (s[k] === '?' && s[k + 1] === '}') { d--; if (d === 0) return k; k++; }
    }
    return -1;
  }
  function splitTop(s, sep) { /* split on sep at paren depth 0 */
    var out = [], d = 0, cur = '';
    for (var i = 0; i < s.length; i++) {
      if (s[i] === '(') d++;
      else if (s[i] === ')') d = Math.max(0, d - 1);
      if (d === 0 && s.substr(i, sep.length) === sep) { out.push(cur); cur = ''; i += sep.length - 1; }
      else cur += s[i];
    }
    out.push(cur);
    return out;
  }
  function parseBranches(body) {
    var res = [], i = 0;
    while (i < body.length) {
      while (body[i] === ' ') i++;
      if (body[i] !== '"') return null;
      i++;
      var d = 0, cur = '';
      for (; i < body.length; i++) {
        var c = body[i];
        if (c === '\\' && i + 1 < body.length) { cur += body[i + 1] === 'n' ? '\n' : body[i + 1]; i++; continue; }
        if (c === '{') d++;
        else if (c === '}') d--;
        else if (c === '"' && d <= 0) break;
        cur += c;
      }
      if (body[i] !== '"') return null;
      i++;
      res.push(cur);
      while (body[i] === ' ') i++;
      if (i >= body.length) break;
      if (body.substr(i, 2) !== '||') return null;
      i += 2;
    }
    return res.length >= 2 && res.length <= 3 ? res : null;
  }
  function parseOperandHead(tok) {
    var t = tok.trim();
    if (/^(['"])[\s\S]*\1$/.test(t) && t.length >= 2) return { literal: t.slice(1, -1), mods: [] };
    var m = /^([A-Za-z_]\w*)\.([A-Za-z_]\w*)$/.exec(t);
    if (!m) return null;
    var c = CANON[(m[1] + '.' + m[2]).toLowerCase()];
    if (!c) return { unknown: t };
    return { section: c[0], prop: c[1], mods: [] };
  }
  function parseExpr(src) {
    var head = src, check = null;
    var d = 0, at = -1;
    for (var i = 0; i < src.length; i++) {
      if (src[i] === '(') d++;
      else if (src[i] === ')') d = Math.max(0, d - 1);
      else if (src[i] === '[' && d === 0 && /^\s*"/.test(src.slice(i + 1))) { at = i; break; }
    }
    if (at >= 0) {
      if (!/\]\s*$/.test(src)) return null;
      var br = parseBranches(src.slice(at + 1).replace(/\]\s*$/, ''));
      if (!br) return null;
      check = { t: br[0], f: br[1], a: br[2] };
      head = src.slice(0, at);
    }
    var toks = splitTop(head, '::');
    var ops = [], comps = [], cur = parseOperandHead(toks[0]);
    if (!cur) return null;
    if (cur.unknown) return { src: src, unknown: cur.unknown };
    var needOperand = false;
    for (var k = 1; k < toks.length; k++) {
      var lt = toks[k].trim().toLowerCase();
      if (needOperand) {
        var nx = parseOperandHead(toks[k]);
        if (!nx) return null;
        if (nx.unknown) return { src: src, unknown: nx.unknown };
        cur = nx; needOperand = false; continue;
      }
      if (COMPARATORS.hasOwnProperty(lt)) { ops.push(cur); comps.push(lt); needOperand = true; continue; }
      cur.mods.push(toks[k].trim());
    }
    if (needOperand) return null;
    ops.push(cur);
    return { src: src, ops: ops, comps: comps, check: check };
  }
  function parse(tpl) {
    var nodes = [], raw = '', i = 0, n = tpl.length;
    function flush() { if (raw) { nodes.push({ t: 'raw', s: raw }); raw = ''; } }
    while (i < n) {
      if (tpl[i] === '{' && tpl[i + 1] === '?') {
        var e = matchGroup(tpl, i);
        if (e > 0) { flush(); nodes.push({ t: 'group', nodes: parse(tpl.slice(i + 2, e)) }); i = e + 2; continue; }
      }
      if (tpl[i] === '{') {
        var c = matchBrace(tpl, i);
        if (c > 0) {
          var src = tpl.slice(i + 1, c).trim();
          if (src === 'tools.newLine') { flush(); nodes.push({ t: 'tool', s: NL }); i = c + 1; continue; }
          if (src === 'tools.removeLine') { flush(); nodes.push({ t: 'tool', s: RL }); i = c + 1; continue; }
          var ex = parseExpr(src);
          if (ex) { flush(); ex.t = 'expr'; ex.lit = tpl.slice(i, c + 1); nodes.push(ex); i = c + 1; continue; }
        }
      }
      raw += tpl[i]; i++;
    }
    flush();
    return nodes;
  }

  /* -------------------------------------------------------------- modifiers */
  var SMALL = { a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ' };
  function smallcaps(s) { return s.split('').map(function (ch) { return SMALL[ch.toLowerCase()] || ch; }).join(''); }
  function mapChars(s, from, to) {
    var f = Array.from(from), t = Array.from(to), m = {};
    f.forEach(function (c, i) { if (i < t.length) m[c] = t[i]; });
    return Array.from(s).map(function (c) { return m[c] !== undefined ? m[c] : c; }).join('');
  }
  var LANG = { english:['EN','🇬🇧'], french:['FR','🇫🇷'], german:['DE','🇩🇪'], spanish:['ES','🇪🇸'], italian:['IT','🇮🇹'], portuguese:['PT','🇵🇹'], japanese:['JA','🇯🇵'], korean:['KO','🇰🇷'], chinese:['ZH','🇨🇳'], russian:['RU','🇷🇺'], dutch:['NL','🇳🇱'], hindi:['HI','🇮🇳'], arabic:['AR','🇸🇦'], polish:['PL','🇵🇱'], turkish:['TR','🇹🇷'], swedish:['SV','🇸🇪'], multi:['MULTI','🌐'], 'dual audio':['DUAL','🌐'] };
  function langCode(v) { var l = LANG[String(v).toLowerCase()]; return l ? l[0] : String(v).slice(0, 2).toUpperCase(); }
  function langEmoji(v) { var l = LANG[String(v).toLowerCase()]; return l ? l[1] : ''; }
  function uniq(a) { var seen = {}; return a.filter(function (x) { var k = String(x).toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; }); }
  function fmtBytes(b, k, round) {
    if (b === 0) return '0 B';
    var sz = k === 1024 ? ['B','KiB','MiB','GiB','TiB'] : ['B','KB','MB','GB','TB'];
    var i = Math.floor(Math.log(b) / Math.log(k)); var v = parseFloat((b / Math.pow(k, i)).toFixed(2));
    if (round) v = Math.round(v);
    return v + ' ' + sz[i];
  }
  function fmtSmartBytes(b, k) {
    if (b === 0) return '0 B';
    var sz = k === 1024 ? ['B','KiB','MiB','GiB','TiB'] : ['B','KB','MB','GB','TB'];
    var i = Math.floor(Math.log(b) / Math.log(k)); var raw = b / Math.pow(k, i); var ip = Math.floor(raw), s;
    if (ip >= 100) s = String(Math.round(raw));
    else if (ip >= 10) { var v = parseFloat(raw.toFixed(1)); s = v % 1 === 0 ? v.toFixed(0) : v.toFixed(1); }
    else s = String(parseFloat(raw.toFixed(2)));
    return s + ' ' + sz[i];
  }
  function fmtBitrate(b, round, smart) {
    if (!isFinite(b) || b <= 0) return '0 bps';
    var sz = ['bps','Kbps','Mbps','Gbps','Tbps'];
    var i = Math.min(4, Math.max(0, Math.floor(Math.log(b) / Math.log(1000)))); var raw = b / Math.pow(1000, i);
    if (smart) {
      var ip = Math.floor(raw), s;
      if (ip >= 100) s = String(Math.round(raw));
      else if (ip >= 10) { var v = parseFloat(raw.toFixed(1)); s = v % 1 === 0 ? v.toFixed(0) : v.toFixed(1); }
      else s = String(parseFloat(raw.toFixed(2)));
      return s + ' ' + sz[i];
    }
    return (round ? Math.round(raw) : parseFloat(raw.toFixed(2))) + ' ' + sz[i];
  }
  function normDur(d) { if (d < 0) return 0; return d < 1000 ? d * 60000 : d; }
  function fmtDur(ms) {
    var s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
    if (h > 0) return h + 'h:' + (m % 60) + 'm:' + (s % 60) + 's';
    if (s % 60 > 0) return (m % 60) + 'm:' + (s % 60) + 's';
    return (m % 60) + 'm';
  }
  function stars(pad) {
    return function (v) {
      var full = Math.floor(v / 20), half = v % 20 >= 10 ? 1 : 0;
      return '★'.repeat(full) + '⯪'.repeat(half) + (pad ? '☆'.repeat(Math.max(0, 5 - full - half)) : '');
    };
  }
  function sortBy(asc) {
    return function (a) {
      return a.slice().sort(function (x, y) {
        var r = (typeof x === 'number' && typeof y === 'number') ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true });
        return asc ? r : -r;
      });
    };
  }
  var STR = {
    upper: function (v) { return v.toUpperCase(); }, lower: function (v) { return v.toLowerCase(); },
    trim: function (v) { return v.trim(); },
    title: function (v) { return v.split(' ').map(function (w) { w = w.toLowerCase(); return w.charAt(0).toUpperCase() + w.slice(1); }).join(' '); },
    length: function (v) { return String(v.length); }, reverse: function (v) { return v.split('').reverse().join(''); },
    base64: function (v) { try { return btoa(unescape(encodeURIComponent(v))); } catch (e) { return v; } },
    string: function (v) { return v; }, smallcaps: smallcaps,
    subscript: function (v) { return mapChars(v, '0123456789+-=()', '₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎'); },
    superscript: function (v) { return mapChars(v, '0123456789+-=()', '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾'); },
    languagecode: langCode, languageemoji: langEmoji
  };
  var ARR = {
    join: function (v) { return v.join(', '); }, length: function (v) { return String(v.length); },
    first: function (v) { return v.length ? String(v[0]) : ''; }, last: function (v) { return v.length ? String(v[v.length - 1]) : ''; },
    random: function (v) { return v.length ? String(v[Math.floor(Math.random() * v.length)]) : ''; },
    sort: sortBy(true), rsort: sortBy(false), lsort: function (v) { return v.slice().sort(); },
    reverse: function (v) { return v.slice().reverse(); }, unique: uniq,
    languagecode: function (v) { return uniq(v.map(langCode).filter(Boolean)); },
    languageemoji: function (v) { return uniq(v.map(langEmoji).filter(Boolean)); },
    string: function (v) { return v.toString(); }
  };
  var NUM = {
    comma: function (v) { return v.toLocaleString('en-US'); }, hex: function (v) { return v.toString(16); },
    octal: function (v) { return v.toString(8); }, binary: function (v) { return v.toString(2); },
    bytes: function (v) { return fmtBytes(v, 1000); }, sbytes: function (v) { return fmtSmartBytes(v, 1000); },
    sbytes10: function (v) { return fmtSmartBytes(v, 1000); }, sbytes2: function (v) { return fmtSmartBytes(v, 1024); },
    rbytes: function (v) { return fmtBytes(v, 1000, true); }, bytes10: function (v) { return fmtBytes(v, 1000); },
    rbytes10: function (v) { return fmtBytes(v, 1000, true); }, bytes2: function (v) { return fmtBytes(v, 1024); },
    rbytes2: function (v) { return fmtBytes(v, 1024, true); },
    bitrate: function (v) { return fmtBitrate(v); }, rbitrate: function (v) { return fmtBitrate(v, true); },
    sbitrate: function (v) { return fmtBitrate(v, false, true); }, string: function (v) { return String(v); },
    time: function (v) { return fmtDur(normDur(v)); }, star: stars(false), pstar: stars(true)
  };
  var BOOL = { string: function (v) { return String(v); } };
  var PREFIX = ['>=', '<=', '$', '^', '~', '=', '>', '<'];

  function quoted(inner) {
    var out = [], re = /"([^"]*)"|'([^']*)'/g, m;
    while ((m = re.exec(inner))) out.push(m[1] !== undefined ? m[1] : m[2]);
    return out;
  }
  function unq(a) { var q = a[0]; return a.length >= 2 && (q === '"' || q === "'") && a.slice(-1) === q ? a.slice(1, -1) : undefined; }

  function applyMod(mod, v, ctx) {
    var lower = mod.toLowerCase();
    if (lower === 'istrue') return exists(v) ? v === true : false;
    if (lower === 'isfalse') return exists(v) ? v === false : false;
    if (lower === 'exists') return exists(v);
    var op = null;
    for (var i = 0; i < PREFIX.length; i++) if (lower.indexOf(PREFIX[i]) === 0) { op = PREFIX[i]; break; }
    if (op) {
      if (!exists(v)) return false;
      var rawCheck = lower.slice(op.length);
      var sv = (Array.isArray(v) ? v.join(',') : String(v)).toLowerCase();
      var check = /\s/.test(sv) ? rawCheck : rawCheck.replace(/\s/g, '');
      var arr = Array.isArray(v) && v.every(function (x) { return typeof x === 'string'; }) ? v.map(function (x) { return x.toLowerCase(); }) : null;
      var nv = Number(sv.replace(/,\s/g, '')), nc = Number(check.replace(/,\s/g, ''));
      var numeric = ['<', '<=', '>', '>=', '='].indexOf(op) >= 0 && !isNaN(nv) && !isNaN(nc) && !Array.isArray(v);
      var a = numeric ? nv : (['$', '^', '~'].indexOf(op) >= 0 && arr ? arr : sv), b = numeric ? nc : check;
      switch (op) {
        case '$': return typeof a === 'string' ? a.indexOf(b) === 0 : a[0] === b;
        case '^': return typeof a === 'string' ? (b.length > 0 && a.slice(-b.length) === b) : a[a.length - 1] === b;
        case '~': return a.indexOf(b) >= 0;
        case '=': return a === b;
        case '>=': return a >= b; case '>': return a > b; case '<=': return a <= b; default: return a < b;
      }
    }
    var open = mod.indexOf('(');
    if (open > 0 && mod.slice(-1) === ')') {
      var name = lower.slice(0, open), inner = mod.slice(open + 1, -1);
      if (UNSUPPORTED[name]) throw new BadExpr('The preview does not support ::' + name + '(…)');
      if (name === 'default') { var fb = unq(inner.trim()); if (fb === undefined) throw new BadExpr('default() needs a quoted value'); return exists(v) ? v : fb; }
      if (name === 'in') {
        var set = quoted(inner).map(function (x) { return x.toLowerCase(); });
        if (v === null || v === undefined) return false;
        if (Array.isArray(v)) return v.some(function (x) { return typeof x === 'string' && set.indexOf(x.toLowerCase()) >= 0; });
        return set.indexOf(String(v).toLowerCase()) >= 0;
      }
      if (v === null || v === undefined) return v;
      switch (name) {
        case 'replace': {
          var m = /^\s*(['"])([\s\S]*?)\1\s*,\s*(['"])([\s\S]*)\3\s*$/.exec(inner);
          if (!m || !m[2]) throw new BadExpr('replace() needs two quoted values');
          var rep = m[4].split('{tools.newLine}').join(NL).split('{tools.removeLine}').join(RL);
          if (typeof v === 'string') return v.split(m[2]).join(rep);
          if (Array.isArray(v)) return v.map(function (x) { return String(x).toLowerCase() === m[2].toLowerCase() ? rep : x; });
          throw new BadExpr('replace() applies to text or lists');
        }
        case 'remove': case 'keep': {
          var args = quoted(inner).filter(Boolean);
          if (!args.length) throw new BadExpr(name + '() needs quoted values');
          var low = args.map(function (x) { return x.toLowerCase(); });
          if (typeof v === 'string') { if (name === 'keep') throw new BadExpr('keep() applies to lists'); args.forEach(function (t) { v = v.split(t).join(''); }); return v; }
          if (Array.isArray(v)) return v.filter(function (x) { return (low.indexOf(String(x).toLowerCase()) >= 0) === (name === 'keep'); });
          throw new BadExpr(name + '() applies to text or lists');
        }
        case 'join': {
          var sep = unq(inner.trim());
          if (sep === undefined || !Array.isArray(v)) throw new BadExpr("join('…') applies to lists");
          return v.join(sep.split('{tools.newLine}').join(NL));
        }
        case 'truncate': {
          var lim = parseInt(inner, 10);
          if (isNaN(lim) || typeof v !== 'string') throw new BadExpr('truncate(n) applies to text');
          var g = Array.from(v); return g.length <= lim ? v : g.slice(0, lim).join('').replace(/\s+$/, '') + '…';
        }
        case 'slice': {
          var p = inner.split(',').map(function (x) { return parseInt(x.trim(), 10); });
          if (isNaN(p[0]) || !Array.isArray(v)) throw new BadExpr('slice(a,b) applies to lists');
          return v.slice(p[0], p.length > 1 && !isNaN(p[1]) ? p[1] : undefined);
        }
        case 'trim': {
          var chars = unq(inner.trim());
          if (chars === undefined || typeof v !== 'string') throw new BadExpr("trim('…') applies to text");
          var pts = Array.from(v), s0 = 0, e0 = pts.length;
          while (s0 < e0 && chars.indexOf(pts[s0]) >= 0) s0++;
          while (e0 > s0 && chars.indexOf(pts[e0 - 1]) >= 0) e0--;
          return pts.slice(s0, e0).join('');
        }
        case 'translate': {
          var ft = quoted(inner);
          if (ft.length < 2 || typeof v !== 'string') throw new BadExpr("translate('…','…') applies to text");
          return mapChars(v, ft[0], ft[1]);
        }
        case 'time': {
          var pat = unq(inner.trim());
          if (pat === undefined || typeof v !== 'number') throw new BadExpr("time('…') applies to numbers");
          var ms = normDur(v), H = Math.floor(ms / 3600000), M = Math.floor(ms / 60000) % 60, S = Math.floor(ms / 1000) % 60;
          var pad = function (x) { return x < 10 ? '0' + x : String(x); };
          return pat.replace(/%-H/g, H).replace(/%-M/g, M).replace(/%-S/g, S).replace(/%H/g, pad(H)).replace(/%M/g, pad(M)).replace(/%S/g, pad(S));
        }
        default: throw new BadExpr('Unknown modifier ::' + name + '(…)');
      }
    }
    if (UNSUPPORTED[lower]) throw new BadExpr('The preview does not support ::' + lower);
    if (v === null || v === undefined) return v;
    var table = typeof v === 'string' ? STR : Array.isArray(v) ? ARR : typeof v === 'number' ? NUM : typeof v === 'boolean' ? BOOL : null;
    if (!table || !table.hasOwnProperty(lower)) throw new BadExpr('::' + mod + ' does not apply to this kind of value');
    return table[lower](v);
  }

  /* -------------------------------------------------------------- rendering */
  function clean(v) { return typeof v === 'string' ? v.replace(/[\u0011\u0012]/g, '') : v; }
  function getField(data, s, p) {
    var sec = data && data[s]; if (!sec) return null;
    var v = sec[p]; if (v === undefined) return null;
    if (Array.isArray(v)) return v.map(clean);
    return clean(v);
  }
  function str(v) {
    if (Array.isArray(v)) return v.join(', ');
    return String(v);
  }
  function renderNodes(nodes, data, depth, issues) {
    var out = '', ok = true;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.t === 'raw' || n.t === 'tool') { out += n.s; continue; }
      if (n.t === 'group') { var g = renderNodes(n.nodes, data, depth, issues); if (g.ok) out += g.text; continue; }
      if (n.unknown) { out += n.lit; if (issues) issues.push({ lvl: 'bad', msg: 'Unknown field ' + n.unknown + ' (shown as plain text)' }); continue; }
      try {
        var res = [], pres = [];
        n.ops.forEach(function (op) {
          var v, present;
          if (op.literal !== undefined) { v = op.literal; present = true; }
          else { v = getField(data, op.section, op.prop); present = exists(v); }
          op.mods.forEach(function (m) {
            var before = v; v = applyMod(m, v, data);
            if (/^default\(/i.test(m) && exists(v) && !exists(before)) present = true;
          });
          res.push(v); pres.push(present);
        });
        var val = res[0], pr = pres[0];
        for (var c = 0; c < n.comps.length; c++) { val = COMPARATORS[n.comps[c]](val, res[c + 1]); pr = pr && pres[c + 1]; }
        if (n.check) {
          var branch;
          if (val === true) branch = n.check.t;
          else if (val === false) branch = n.check.f;
          else if (val === null || val === undefined) branch = n.check.a !== undefined ? n.check.a : '';
          else throw new BadExpr('A check needs a true/false value, got ' + (typeof val === 'object' ? 'a list' : 'text or a number') + ' (add ::exists, ::istrue or a comparison)');
          if (branch && depth < 5) out += renderNodes(parse(branch), data, depth + 1, issues).text;
        } else {
          if (val === null || val === undefined || !pr) { ok = false; continue; }
          var s = str(val);
          if (!/\S/.test(s) && !/[\u0011\u0012]/.test(s)) { ok = false; continue; }
          out += s;
        }
      } catch (e) {
        if (!(e instanceof BadExpr)) throw e;
        out += n.lit; if (issues) issues.push({ lvl: 'bad', msg: e.msg + ' in ' + n.lit });
      }
    }
    return { text: out, ok: ok };
  }
  function render(tpl, data, issues) {
    var r = renderNodes(parse(tpl), data, 0, issues).text;
    return r.split('\n').filter(function (l) { return l.trim() !== '' && l.indexOf(RL) < 0; }).join('\n').split(NL).join('\n');
  }
  /* every field a template mentions (for the overlap check) */
  function fieldsUsed(tpl) {
    var found = {};
    (function walk(nodes) {
      nodes.forEach(function (n) {
        if (n.t === 'group') walk(n.nodes);
        else if (n.t === 'expr' && n.ops) {
          n.ops.forEach(function (o) { if (o.section) found[o.section + '.' + o.prop] = 1; });
          if (n.check) [n.check.t, n.check.f, n.check.a].forEach(function (b) { if (b) walk(parse(b)); });
        }
      });
    })(parse(tpl));
    return Object.keys(found);
  }

  window.ChipFormatter = { FIELDS: FIELDS, render: render, parse: parse, fieldsUsed: fieldsUsed, exists: exists };
})();
