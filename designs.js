/* Chip: the built-in badge designs, drawn in the browser.
   This is a hand port of the designs in tools/build.py, so a custom badge can be drawn in the same design
   as the built-in ones. Lettering comes from glyphs.js (Inter Bold outlines, so no font is needed). */
(function () {
  'use strict';
  var G = window.GLYPHS, H = 24, TS = 14;
  var SPEC = { gr: '#e5e5e8', gq: '#8fb4ff', gv: '#ffb86b', gc: '#c4a1ff', ga: '#7fd6a8', gh: '#ff8f8f', gs: '#ff7ac6', gl: '#6fd3e0', ge: '#e8d36a', gp: '#a0a0a8', gw: '#ff6b6b', gx: '#ffd54a' };
  var CODES = { gr: 'RES', gq: 'SRC', gv: 'VID', gc: 'COD', ga: 'AUD', gh: 'CH', gs: 'NET', gl: 'LNG', ge: 'REL', gp: 'PRV', gw: 'WRN', gx: 'TOP' };
  var NOROUND = { underline: 1, pill: 1, capsule: 1, bare: 1, shine: 1, dot: 1, gem: 1, tape: 1 };
  var R = 0, ACC = null;

  var acc = function (g) { return ACC || SPEC[g] || '#e5e5e8'; };
  var pyround = function (x) { var r = Math.round(x); return (Math.abs(x % 1) === 0.5 && r % 2) ? r - 1 : r; };
  var range = function (a, b, s) { var o = []; s = s || 1; for (var i = a; i < b; i += s) o.push(i); return o; };
  var f1 = function (n) { return n.toFixed(1); };
  var f2 = function (n) { return n.toFixed(2); };

  function pil(label, size) {
    var t = G.pil[size || '14'], n = 0, prev = '', k = parseFloat(size || '14') / 14;
    for (var ch of label) {
      n += (t[ch] !== undefined ? t[ch] : t['?']);
      if (prev && G.kern[prev + ch]) n += G.kern[prev + ch] * k;
      prev = ch;
    }
    return n;
  }
  var tw = function (label, size) { return pil(label, size) * 1.05; };
  var rx = function (k) { k = k === undefined ? 0.5 : k; return R ? Math.max(0, R - k) : 0; };
  var rrect = function (x, y, w, h, r) { return 'x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' + (r > 0 ? ' rx="' + r + '"' : ''); };
  var wrap = function (w, body) { return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + H + '" viewBox="0 0 ' + w + ' ' + H + '">' + body + '</svg>'; };

  function shiftPath(d, dx) {
    return d.replace(/([MLQCHV])([^MLQCHVZ]*)/g, function (m, c, a) {
      if (c === 'V') return m;
      var n = a.trim().split(/[ ,]+/).map(Number);
      for (var i = 0; i < n.length; i++) if (c === 'H' || i % 2 === 0) n[i] += dx;
      return c + n.join(' ');
    });
  }
  // label as filled outlines. extra is added to the <path> (used for glow filters)
  function outline(label, x, y, fill, size, anchor, mono, extra) {
    var F = mono ? G.mono : G.inter, k = size / F.upm;
    var cs = Array.from(label).map(function (c) { return F.g[c] ? c : '?'; });
    var total = 0; cs.forEach(function (c) { total += F.g[c][0] * k; });
    var cx = anchor === 'start' ? x : x - total / 2, d = '';
    cs.forEach(function (c) {
      var gl = F.g[c];
      if (gl[1]) d += shiftPath(gl[1], cx / k);
      cx += gl[0] * k;
    });
    var p = '<path transform="translate(0 ' + y + ') scale(' + k + ' ' + (-k) + ')" d="' + d + '" fill="' + fill + '"/>';
    return extra ? '<g ' + extra + '>' + p + '</g>' : p;   // effects go on a group so blur sizes are not scaled with the glyphs
  }
  function txt(x, y, label, fill, size, mono, anchor, extra) {
    size = size || TS;
    return outline(label, x, y + 0.3635 * (size - 12), fill, size, anchor || 'middle', mono, extra);
  }

  function mix(c, k) {
    var r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
    var h = function (v) { return ('0' + Math.min(255, pyround(v * k)).toString(16)).slice(-2); };
    return '#' + h(r) + h(g) + h(b);
  }
  function tint(c, t) {
    var r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
    var h = function (v) { return ('0' + pyround(v + (255 - v) * t).toString(16)).slice(-2); };
    return '#' + h(r) + h(g) + h(b);
  }
  function rpoly(pts, r) {
    var n = pts.length;
    if (!r) return 'M' + pts.map(function (p) { return f2(p[0]) + ',' + f2(p[1]); }).join(' L') + ' Z';
    var out = [];
    var toward = function (a, b, d) { var L = Math.hypot(b[0] - a[0], b[1] - a[1]); return [a[0] + (b[0] - a[0]) / L * d, a[1] + (b[1] - a[1]) / L * d]; };
    for (var i = 0; i < n; i++) {
      var p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
      var l0 = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]), l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      var d = Math.min(r, l0 / 2, l2 / 2);
      out.push([toward(p1, p0, d), p1, toward(p1, p2, d)]);
    }
    var s = 'M' + f2(out[0][0][0]) + ',' + f2(out[0][0][1]);
    out.forEach(function (o, i) {
      if (i) s += ' L' + f2(o[0][0]) + ',' + f2(o[0][1]);
      s += ' Q' + f2(o[1][0]) + ',' + f2(o[1][1]) + ' ' + f2(o[2][0]) + ',' + f2(o[2][1]);
    });
    return s + ' Z';
  }

  function icon(g, a) {
    var st = 'stroke="' + a + '" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"', fl = 'fill="' + a + '"';
    var I = {
      gr: '<rect x="1" y="1.5" width="10" height="9" ' + st + '/><rect x="3.8" y="4.2" width="4.4" height="3.6" ' + fl + '/>',
      gq: '<circle cx="6" cy="6" r="4.9" ' + st + '/><circle cx="6" cy="6" r="1.4" ' + fl + '/>',
      gv: '<circle cx="6" cy="6" r="2.2" ' + fl + '/>' + [[1, 0], [-1, 0], [0, 1], [0, -1], [.7, .7], [-.7, .7], [.7, -.7], [-.7, -.7]].map(function (p) { return '<line x1="' + f2(6 + 3.6 * p[0]) + '" y1="' + f2(6 + 3.6 * p[1]) + '" x2="' + f2(6 + 5.4 * p[0]) + '" y2="' + f2(6 + 5.4 * p[1]) + '" ' + st + '/>'; }).join(''),
      gc: '<rect x="2.6" y="2.6" width="6.8" height="6.8" ' + st + '/>' + [4.6, 7.4].map(function (x) { return '<line x1="' + x + '" y1="0.6" x2="' + x + '" y2="2.6" ' + st + '/><line x1="' + x + '" y1="9.4" x2="' + x + '" y2="11.4" ' + st + '/>'; }).join(''),
      ga: '<path d="M1,4.4 H3.4 L6.4,1.8 V10.2 L3.4,7.6 H1 Z" ' + fl + '/><path d="M8.2,4.2 Q9.6,6 8.2,7.8 M9.6,2.6 Q12,6 9.6,9.4" ' + st + '/>',
      gh: [[1.8, 4], [4.2, 7], [6.6, 10], [9.0, 7], [11.0, 4]].map(function (p) { return '<line x1="' + p[0] + '" y1="' + (11 - p[1]) + '" x2="' + p[0] + '" y2="11" ' + st + '/>'; }).join(''),
      gs: '<rect x="0.9" y="1.6" width="10.2" height="8.8" rx="2" ' + st + '/><path d="M4.8,3.9 L8.2,6 L4.8,8.1 Z" ' + fl + '/>',
      gl: '<path d="M1,1.6 H11 V8 H6.4 L3.4,10.6 V8 H1 Z" ' + st + '/>',
      ge: '<path d="M6,0.9 L7.6,4.3 L11.2,4.7 L8.5,7.2 L9.3,10.9 L6,9 L2.7,10.9 L3.5,7.2 L0.8,4.7 L4.4,4.3 Z" ' + fl + '/>',
      gp: '<path d="M7,0.8 L2.2,6.6 H5.6 L4.8,11.2 L9.8,5.2 H6.4 Z" ' + fl + '/>',
      gw: '<path d="M6,1 L11.2,10.4 H0.8 Z" ' + st + '/><line x1="6" y1="4.6" x2="6" y2="7.2" ' + st + '/><circle cx="6" cy="8.9" r="0.55" ' + fl + '/>',
      gx: '<path d="M6,0.9 L11.1,6 L6,11.1 L0.9,6 Z" ' + fl + '/>'
    };
    return I[g] || I.gr;
  }

  var D = {};
  D.notch = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 32), c = 6.5, shape;
    if (R) {
      var d = 'M' + R + ',0.5 H' + (w - c) + ' L' + (w - 0.5) + ',' + c + ' V' + (H - R) + ' A' + (R - 0.5) + ',' + (R - 0.5) + ' 0 0 1 ' + (w - R) + ',' + (H - 0.5) + ' H' + c + ' L0.5,' + (H - c) + ' V' + R + ' A' + (R - 0.5) + ',' + (R - 0.5) + ' 0 0 1 ' + R + ',0.5 Z';
      shape = function (e) { return '<path d="' + d + '" ' + e + '/>'; };
    } else {
      var pts = '0.5,0.5 ' + (w - c) + ',0.5 ' + (w - 0.5) + ',' + c + ' ' + (w - 0.5) + ',' + (H - 0.5) + ' ' + c + ',' + (H - 0.5) + ' 0.5,' + (H - c);
      shape = function (e) { return '<polygon points="' + pts + '" ' + e + '/>'; };
    }
    return wrap(w, '<defs><clipPath id="c">' + shape('') + '</clipPath></defs>' + shape('fill="#18181a" stroke="#3a3a40"') +
      '<rect x="0" y="0" width="5" height="' + H + '" fill="' + a + '" clip-path="url(#c)"/>' + txt((w + 5) / 2, 16, label, '#f4f4f5'));
  };
  D.plate = function (label, g) {
    var a = acc(g), code = CODES[g] || 'TAG', cw = pil(code, '9.5') * 1.05 + 11, vw = tw(label) + 18, w = pyround(cw + vw);
    var box = rrect(0.5, 0.5, w - 1, H - 1, rx());
    return wrap(w, '<defs><clipPath id="c"><rect ' + box + '/></clipPath></defs><rect ' + box + ' fill="#18181a"/>' +
      '<g clip-path="url(#c)"><rect x="0" y="0" width="' + f1(cw + 0.5) + '" height="' + H + '" fill="' + a + '"/></g>' +
      '<rect ' + box + ' fill="none" stroke="' + a + '"/>' + txt(cw / 2 + 0.5, 15.2, code, '#0e0e0f', 9.5) + txt(cw + vw / 2, 16, label, '#f4f4f5'));
  };
  D.brackets = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 28), L = 6, d;
    if (R) {
      var k = R, e = 3, q = k - 0.75;
      d = 'M0.75,' + (k + e) + ' V' + k + ' A' + q + ',' + q + ' 0 0 1 ' + k + ',0.75 H' + (k + e) + ' ' +
        'M' + (w - k - e) + ',0.75 H' + (w - k) + ' A' + q + ',' + q + ' 0 0 1 ' + (w - 0.75) + ',' + k + ' V' + (k + e) + ' ' +
        'M' + (w - 0.75) + ',' + (H - k - e) + ' V' + (H - k) + ' A' + q + ',' + q + ' 0 0 1 ' + (w - k) + ',' + (H - 0.75) + ' H' + (w - k - e) + ' ' +
        'M' + (k + e) + ',' + (H - 0.75) + ' H' + k + ' A' + q + ',' + q + ' 0 0 1 0.75,' + (H - k) + ' V' + (H - k - e);
    } else {
      d = 'M0.75,' + L + ' V0.75 H' + L + ' M' + (w - L) + ',0.75 H' + (w - 0.75) + ' V' + L + ' M' + (w - 0.75) + ',' + (H - L) + ' V' + (H - 0.75) + ' H' + (w - L) + ' M' + L + ',' + (H - 0.75) + ' H0.75 V' + (H - L);
    }
    return wrap(w, '<path d="' + d + '" fill="none" stroke="' + a + '" stroke-width="1.5"/>' + txt(w / 2, 16, label, '#f4f4f5'));
  };
  D.underline = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 12), h2 = Math.floor(R / 2);
    var bar = R ? '<rect x="' + h2 + '" y="19" width="' + (w - 2 * h2) + '" height="3" rx="1.5" fill="' + a + '"/>' : '<rect x="0" y="19" width="' + w + '" height="3" fill="' + a + '"/>';
    return wrap(w, txt(w / 2, 15, label, '#f4f4f5') + bar);
  };
  D.terminal = function (label, g) {
    var n = Array.from(label).length, cw = 0.602 * (TS + 1), w = pyround(8 + (n + 2) * cw + 4 + 6 + 8), r3 = Math.floor(R / 3);
    return wrap(w, '<rect ' + rrect(0.5, 0.5, w - 1, H - 1, rx()) + ' fill="#0a0e0b" stroke="#234d31"/>' +
      txt(8 + r3, 16, '> ' + label, '#7dff9b', TS + 1, true, 'start') +
      '<rect x="' + f1(8 + r3 + (n + 2) * cw + 3) + '" y="7" width="6" height="10" fill="#7dff9b"/>');
  };
  D.brutal = function (label, g) {
    var a = acc(g), w2 = pyround(tw(label) + 22), h2 = H - 2, r1 = R ? Math.max(0, R - 2) : 0;
    return wrap(w2 + 2, '<rect ' + rrect(2, 2, w2, h2, r1) + ' fill="#f4f4f5"/>' +
      '<rect ' + rrect(0.75, 0.75, w2 - 1.5, h2 - 1.5, R ? Math.max(0, r1 - 0.75) : 0) + ' fill="' + a + '" stroke="#0e0e0f" stroke-width="1.5"/>' + txt(w2 / 2, 15, label, '#0e0e0f'));
  };
  D.hatch = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 40), h2 = Math.floor(R / 2);
    var lines = range(-H, w, 6).map(function (i) { return '<line x1="' + i + '" y1="' + H + '" x2="' + (i + H) + '" y2="0" stroke="' + a + '" stroke-opacity="0.5" stroke-width="1.2"/>'; }).join('');
    var box = rrect(0.5, 0.5, w - 1, H - 1, rx());
    return wrap(w, '<defs><clipPath id="c"><rect ' + box + '/></clipPath></defs><rect ' + box + ' fill="#121214"/><g clip-path="url(#c)">' + lines + '</g>' +
      '<rect ' + box + ' fill="none" stroke="' + a + '"/><rect ' + rrect(10 + h2, 4, w - 20 - R, 16, R ? 2 : 0) + ' fill="#121214"/>' + txt(w / 2, 16, label, '#f4f4f5'));
  };
  D.duotone = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 28);
    return wrap(w, '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + mix(a, 0.16) + '"/><stop offset="1" stop-color="' + mix(a, 0.62) + '"/></linearGradient></defs>' +
      '<rect ' + rrect(0.5, 0.5, w - 1, H - 1, rx()) + ' fill="url(#g)" stroke="' + a + '"/>' + txt(w / 2, 16, label, '#ffffff'));
  };
  D.ticket = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 42), r = 4, path;
    if (R) {
      var q = R - 0.5;
      path = 'M' + R + ',0.5 H' + (w - R) + ' A' + q + ',' + q + ' 0 0 1 ' + (w - 0.5) + ',' + R + ' V' + (12 - r) + ' A' + r + ',' + r + ' 0 0 0 ' + (w - 0.5) + ',' + (12 + r) + ' V' + (H - R) + ' A' + q + ',' + q + ' 0 0 1 ' + (w - R) + ',' + (H - 0.5) + ' ' +
        'H' + R + ' A' + q + ',' + q + ' 0 0 1 0.5,' + (H - R) + ' V' + (12 + r) + ' A' + r + ',' + r + ' 0 0 0 0.5,' + (12 - r) + ' V' + R + ' A' + q + ',' + q + ' 0 0 1 ' + R + ',0.5 Z';
    } else {
      path = 'M0.5,0.5 H' + (w - 0.5) + ' V' + (12 - r) + ' A' + r + ',' + r + ' 0 0 0 ' + (w - 0.5) + ',' + (12 + r) + ' V' + (H - 0.5) + ' H0.5 V' + (12 + r) + ' A' + r + ',' + r + ' 0 0 0 0.5,' + (12 - r) + ' Z';
    }
    return wrap(w, '<path d="' + path + '" fill="#18181a" stroke="' + a + '"/><line x1="15" y1="4" x2="15" y2="20" stroke="' + a + '" stroke-width="1" stroke-dasharray="2 2"/>' +
      '<rect x="6" y="10" width="4" height="4" fill="' + a + '"/>' + txt((16 + w - 8) / 2, 16, label, '#f4f4f5'));
  };
  D.stamp = function (label, g) {
    var a = acc(g), w = pyround(tw(label, '12.5') + 32);
    return wrap(w, '<rect ' + rrect(0.75, 0.75, w - 1.5, H - 1.5, R ? Math.max(0, R - 0.75) : 0) + ' fill="none" stroke="' + a + '" stroke-width="1.5"/>' +
      '<rect ' + rrect(3.5, 3.5, w - 7, H - 7, R ? Math.max(0, R - 3.5) : 0) + ' fill="none" stroke="' + a + '" stroke-width="0.75"/>' + txt(w / 2, 15.8, label, a, 12.5));
  };
  D.glyph = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 40), r4 = Math.floor(R / 4);
    return wrap(w, '<rect ' + rrect(0.5, 0.5, w - 1, H - 1, rx()) + ' fill="#18181a" stroke="#3a3a40"/>' +
      '<g transform="translate(' + (9 + r4) + ',6)">' + icon(g, a) + '</g>' +
      '<line x1="' + (26 + r4) + '" y1="5" x2="' + (26 + r4) + '" y2="19" stroke="#3a3a40"/>' + txt((28 + r4 + w - 8) / 2 + 1, 16, label, '#f4f4f5'));
  };
  D.pill = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 30);
    return wrap(w, '<rect ' + rrect(0.5, 0.5, w - 1, H - 1, 11.5) + ' fill="' + mix(a, 0.2) + '" stroke="' + a + '"/>' + txt(w / 2, 16, label, tint(a, 0.45)));
  };
  D.capsule = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 30);
    return wrap(w, '<rect ' + rrect(0, 0, w, H, 12) + ' fill="' + a + '"/>' + txt(w / 2, 16, label, '#0e0e0f'));
  };
  D.bare = function (label, g) { var w = pyround(tw(label) + 8); return wrap(w, txt(w / 2, 16, label, acc(g))); };
  D.shine = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 8);
    return wrap(w, '<defs><linearGradient id="t" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="' + tint(a, 0.7) + '"/><stop offset="0.5" stop-color="' + a + '"/><stop offset="1" stop-color="' + mix(a, 0.62) + '"/></linearGradient></defs>' + txt(w / 2, 16, label, 'url(#t)'));
  };
  D.dot = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 30);
    return wrap(w, '<circle cx="9" cy="12" r="3.5" fill="' + a + '"/>' + txt((w + 14) / 2, 16, label, '#f4f4f5'));
  };
  D.slash = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 34), k = 6;
    var d = rpoly([[k, 0.5], [w - 0.5, 0.5], [w - k, H - 0.5], [0.5, H - 0.5]], R ? 6 : 0);
    var stripe = [[k + 4, 0.5], [k + 8, 0.5], [8, H - 0.5], [4, H - 0.5]];
    return wrap(w, '<defs><clipPath id="c"><path d="' + d + '"/></clipPath></defs><path d="' + d + '" fill="#18181a"/>' +
      '<g clip-path="url(#c)"><path d="' + rpoly(stripe, 0) + '" fill="' + a + '"/></g><path d="' + d + '" fill="none" stroke="' + a + '"/>' + txt((w + 6) / 2, 16, label, '#f4f4f5'));
  };
  D.glass = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 30), r = rx() || 3;
    return wrap(w, '<defs><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0.06"/><stop offset="1" stop-color="' + a + '" stop-opacity="0.16"/></linearGradient></defs>' +
      '<rect ' + rrect(0.5, 0.5, w - 1, H - 1, r) + ' fill="url(#h)" stroke="' + a + '" stroke-opacity="0.75"/>' + txt(w / 2, 16, label, '#ffffff'));
  };
  D.neon = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 34), r = R ? 9 : 2, box = rrect(3.5, 3.5, w - 7, H - 7, r);
    var glow = txt(w / 2, 16, label, a, null, false, null, 'filter="url(#b)" opacity="0.85"');
    return wrap(w, '<defs><filter id="b" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="1.7"/></filter></defs>' +
      '<rect ' + box + ' fill="none" stroke="' + a + '" stroke-width="3" filter="url(#b)" opacity="0.8"/>' +
      '<rect ' + box + ' fill="#0b0b0d" fill-opacity="0.55" stroke="' + tint(a, 0.5) + '" stroke-width="1.2"/>' + glow + txt(w / 2, 16, label, tint(a, 0.75)));
  };
  D.sticker = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 26), r = R || 3;
    return wrap(w, '<rect ' + rrect(0, 0, w, H, r) + ' fill="#f4f4f5"/><rect ' + rrect(1.5, 1.5, w - 3, H - 3, Math.max(0, r - 1.5)) + ' fill="' + a + '" stroke="#0e0e0f" stroke-width="1.5"/>' + txt(w / 2, 16, label, '#0e0e0f'));
  };
  D.ribbon = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 38), t = 7;
    var pts = [[0.5, 0.5], [w - 0.5, 0.5], [w - t, H / 2], [w - 0.5, H - 0.5], [0.5, H - 0.5]];
    return wrap(w, '<path d="' + rpoly(pts, R || 0) + '" fill="' + a + '"/>' + txt((w - t + 2) / 2, 16, label, '#0e0e0f'));
  };
  D.lcd = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 30), box = rrect(0.5, 0.5, w - 1, H - 1, rx());
    var scan = range(2, H, 3).map(function (y) { return '<line x1="0" y1="' + y + '" x2="' + w + '" y2="' + y + '" stroke="#000" stroke-opacity="0.22" stroke-width="1"/>'; }).join('');
    var glow = txt(w / 2, 16, label, a, null, false, null, 'filter="url(#b)" opacity="0.9"');
    return wrap(w, '<defs><filter id="b" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="1.4"/></filter><clipPath id="c"><rect ' + box + '/></clipPath></defs>' +
      '<rect ' + box + ' fill="' + mix(a, 0.1) + '" stroke="' + mix(a, 0.42) + '"/><g clip-path="url(#c)">' + scan + '</g>' + glow + txt(w / 2, 16, label, tint(a, 0.15)));
  };
  D.gem = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 38), c = 6;
    var d = rpoly([[c, .5], [w - c, .5], [w - .5, c], [w - .5, H - c], [w - c, H - .5], [c, H - .5], [.5, H - c], [.5, c]], 0);
    var top = rpoly([[c, .5], [w - c, .5], [w - .5, c], [.5, c]], 0);
    var mid = rpoly([[.5, c], [w - .5, c], [w - .5, H - c], [.5, H - c]], 0);
    var bot = rpoly([[.5, H - c], [w - .5, H - c], [w - c, H - .5], [c, H - .5]], 0);
    return wrap(w, '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + tint(a, 0.35) + '"/><stop offset="0.55" stop-color="' + a + '"/><stop offset="1" stop-color="' + mix(a, 0.6) + '"/></linearGradient><clipPath id="c"><path d="' + d + '"/></clipPath></defs>' +
      '<path d="' + d + '" fill="url(#g)"/><g clip-path="url(#c)"><path d="' + top + '" fill="#fff" fill-opacity="0.22"/><path d="' + mid + '" fill="#fff" fill-opacity="0.04"/><path d="' + bot + '" fill="#000" fill-opacity="0.18"/></g>' +
      '<path d="' + d + '" fill="none" stroke="' + tint(a, 0.6) + '" stroke-opacity="0.8"/>' + txt(w / 2, 16, label, '#0e0e0f'));
  };
  D.aura = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 36), box = rrect(0.5, 0.5, w - 1, H - 1, rx());
    return wrap(w, '<defs><radialGradient id="r" cx="0.5" cy="0.5" r="0.65"><stop offset="0" stop-color="' + a + '" stop-opacity="0.62"/><stop offset="0.7" stop-color="' + a + '" stop-opacity="0.12"/><stop offset="1" stop-color="' + a + '" stop-opacity="0"/></radialGradient><clipPath id="c"><rect ' + box + '/></clipPath></defs>' +
      '<rect ' + box + ' fill="#0f0f11"/><g clip-path="url(#c)"><ellipse cx="' + (w / 2) + '" cy="12" rx="' + (w * 0.62) + '" ry="15" fill="url(#r)"/></g><rect ' + box + ' fill="none" stroke="' + mix(a, 0.45) + '"/>' + txt(w / 2, 16, label, '#ffffff'));
  };
  D.tape = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 34), t = 3;
    var left = range(0, 7).map(function (i) { return [i % 2 === 0 ? t : 0, i * 4]; });
    var right = range(0, 7).map(function (i) { return [w - (i % 2 === 0 ? t : 0), (6 - i) * 4]; });
    var d = 'M' + left.concat(right).map(function (p) { return f1(p[0]) + ',' + f1(p[1]); }).join(' L') + ' Z';
    return wrap(w, '<defs><clipPath id="c"><path d="' + d + '"/></clipPath></defs><path d="' + d + '" fill="' + a + '" fill-opacity="0.92"/><g clip-path="url(#c)"><rect x="0" y="0" width="' + w + '" height="9" fill="#fff" fill-opacity="0.16"/>' +
      '<rect x="0" y="' + (H - 3) + '" width="' + w + '" height="3" fill="#000" fill-opacity="0.12"/></g>' + txt(w / 2, 16, label, '#0e0e0f'));
  };
  D.halftone = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 48), box = rrect(0.5, 0.5, w - 1, H - 1, rx()), dots = '';
    range(4, 30, 4).forEach(function (x, ci) {
      range(4, H, 4).forEach(function (y) {
        var rr = Math.max(0, 1.9 - ci * 0.3);
        if (rr > 0.25) dots += '<circle cx="' + x + '" cy="' + y + '" r="' + f2(rr) + '" fill="' + a + '"/>';
      });
    });
    return wrap(w, '<defs><clipPath id="c"><rect ' + box + '/></clipPath></defs><rect ' + box + ' fill="#131315"/><g clip-path="url(#c)">' + dots + '</g>' +
      '<rect ' + box + ' fill="none" stroke="' + mix(a, 0.5) + '"/>' + txt((26 + w - 6) / 2 + 2, 16, label, '#f4f4f5'));
  };
  D.blueprint = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 38), box = rrect(0.5, 0.5, w - 1, H - 1, rx());
    var grid = range(6, w, 6).map(function (x) { return '<line x1="' + x + '" y1="0" x2="' + x + '" y2="' + H + '" stroke="' + a + '" stroke-opacity="0.16"/>'; }).join('') +
      range(6, H, 6).map(function (y) { return '<line x1="0" y1="' + y + '" x2="' + w + '" y2="' + y + '" stroke="' + a + '" stroke-opacity="0.16"/>'; }).join('');
    var tk = 4, ticks = '';
    if (!R) [[0.5, 0.5, 1, 1], [w - 0.5, 0.5, -1, 1], [0.5, H - 0.5, 1, -1], [w - 0.5, H - 0.5, -1, -1]].forEach(function (p) {
      ticks += '<path d="M' + p[0] + ',' + (p[1] + p[3] * tk) + ' V' + p[1] + ' H' + (p[0] + p[2] * tk) + '" fill="none" stroke="' + tint(a, 0.5) + '" stroke-width="1.6"/>';
    });
    return wrap(w, '<defs><clipPath id="c"><rect ' + box + '/></clipPath></defs><rect ' + box + ' fill="' + mix(a, 0.13) + '"/><g clip-path="url(#c)">' + grid + '</g>' +
      '<rect ' + box + ' fill="none" stroke="' + a + '" stroke-dasharray="3 2" stroke-opacity="0.85"/>' + ticks + txt(w / 2, 16, label, tint(a, 0.7)));
  };
  D.tab = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 30), tb = 5;
    var d = rpoly([[0.5, H - 0.5], [0.5, 0.5], [13, 0.5], [16, tb], [w - 0.5, tb], [w - 0.5, H - 0.5]], R || 0);
    var tabp = rpoly([[0.5, 0.5], [13, 0.5], [16, tb + 0.5], [0.5, tb + 0.5]], 0);
    return wrap(w, '<defs><clipPath id="c"><path d="' + d + '"/></clipPath></defs><path d="' + d + '" fill="#18181a"/><g clip-path="url(#c)"><path d="' + tabp + '" fill="' + a + '"/></g>' +
      '<path d="' + d + '" fill="none" stroke="' + a + '"/>' + txt(w / 2, 18, label, '#f4f4f5'));
  };
  D.beam = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 32), box = rrect(0.5, 0.5, w - 1, H - 1, rx());
    return wrap(w, '<defs><linearGradient id="l" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="' + a + '" stop-opacity="0.42"/><stop offset="0.65" stop-color="' + a + '" stop-opacity="0"/></linearGradient>' +
      '<filter id="b" x="-10%" y="-100%" width="120%" height="300%"><feGaussianBlur stdDeviation="1.6"/></filter><clipPath id="c"><rect ' + box + '/></clipPath></defs>' +
      '<rect ' + box + ' fill="#121214"/><rect ' + box + ' fill="url(#l)"/><g clip-path="url(#c)"><rect x="3" y="' + (H - 3) + '" width="' + (w - 6) + '" height="3" fill="' + a + '" filter="url(#b)"/>' +
      '<rect x="0" y="' + (H - 2) + '" width="' + w + '" height="2" fill="' + tint(a, 0.25) + '"/></g><rect ' + box + ' fill="none" stroke="#2c2c32"/>' + txt(w / 2, 15.5, label, '#ffffff'));
  };
  D.fade = function (label, g) {
    var a = acc(g), w = pyround(tw(label) + 30), box = rrect(0.9, 0.9, w - 1.8, H - 1.8, R ? rx(0.9) : 0);
    return wrap(w, '<defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + tint(a, 0.3) + '"/><stop offset="0.5" stop-color="' + a + '" stop-opacity="0.22"/><stop offset="1" stop-color="' + a + '" stop-opacity="0.8"/></linearGradient></defs>' +
      '<rect ' + box + ' fill="#131315" stroke="url(#s)" stroke-width="1.8"/>' + txt(w / 2, 16, label, tint(a, 0.8)));
  };

  // drawDesign(key, label, groupId, { round: bool, accent: '#rrggbb' }) -> SVG text, or '' when the design is unknown
  window.drawDesign = function (key, label, gid, o) {
    var f = D[key]; if (!f || !G) return '';
    o = o || {};
    R = o.round && !NOROUND[key] ? 8 : 0; ACC = o.accent || null;
    try { return f(label, gid); } finally { R = 0; ACC = null; }
  };
  window.hasDesign = function (key) { return !!D[key]; };
})();
