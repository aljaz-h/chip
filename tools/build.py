#!/usr/bin/env python3
"""Generates catalog.js and the SVG badge artwork for the site.
Usage: python3 build.py <site_dir>
"""
import json, os, sys, re
from PIL import ImageFont

OUT = sys.argv[1]

GROUPS = [
    ("gr", "Resolution"),
    ("gq", "Source"),
    ("gv", "Video / HDR"),
    ("gc", "Codec"),
    ("ga", "Audio"),
    ("gh", "Channels"),
    ("gs", "Streaming"),
    ("gl", "Language"),
    ("ge", "Release / Edition"),
    ("gp", "Provider / Cache"),
]

SEP = r"[ ._-]?"
# (group, id, name, pattern, enabled_by_default)
B = [
    # Resolution
    ("gr", "r-8k", "8K", r"(?i)\b(?:8k|4320[pi]?)\b", 1),
    ("gr", "r-4k", "4K", r"(?i)\b(?:4k|2160[pi]?|uhd)\b", 1),
    ("gr", "r-1440", "1440p", r"(?i)\b(?:1440[pi]?|qhd)\b", 0),
    ("gr", "r-1080", "1080p", r"(?i)\b(?:1080[pi]?|fhd)\b", 1),
    ("gr", "r-720", "720p", r"(?i)\b720[pi]?\b", 1),
    ("gr", "r-576", "576p", r"(?i)\b576[pi]?\b", 0),
    ("gr", "r-480", "480p", r"(?i)\b480[pi]?\b", 1),
    ("gr", "r-360", "360p", r"(?i)\b360[pi]?\b", 0),
    ("gr", "r-240", "240p", r"(?i)\b240[pi]?\b", 0),
    # Source
    ("gq", "q-remux", "REMUX", r"(?i)\bremux\b", 1),
    ("gq", "q-bluray", "BLURAY", r"(?i)^(?=.*\b(?:blu[ ._-]?ray|bd[ ._-]?rip|br[ ._-]?rip)\b)(?!.*\bremux\b)", 1),
    ("gq", "q-webdl", "WEB-DL", r"(?i)\bweb[ ._-]?dl\b", 1),
    ("gq", "q-webrip", "WEBRIP", r"(?i)\bweb[ ._-]?rip\b", 1),
    ("gq", "q-hdtv", "HDTV", r"(?i)\b(?:hdtv|pdtv|dsr)\b", 1),
    ("gq", "q-hdrip", "HDRIP", r"(?i)\bhd[ ._-]?rip\b", 0),
    ("gq", "q-dvdrip", "DVDRIP", r"(?i)\bdvd[ ._-]?rip\b", 0),
    ("gq", "q-dvd", "DVD", r"(?i)^(?=.*\bdvd\b)(?!.*\bdvd[ ._-]?(?:rip|scr))", 0),
    ("gq", "q-scr", "SCREENER", r"(?i)\b(?:dvd[ ._-]?scr(?:eener)?|screener)\b", 0),
    ("gq", "q-tc", "TELECINE", r"(?i)\b(?:hd[ ._-]?tc|tele[ ._-]?cine)\b", 0),
    ("gq", "q-ts", "TELESYNC", r"(?i)\b(?:hd[ ._-]?ts|tele[ ._-]?sync)\b", 0),
    ("gq", "q-cam", "CAM", r"(?i)\b(?:cam|hd[ ._-]?cam|cam[ ._-]?rip)\b", 1),
    # Video / HDR
    ("gv", "v-dv", "DV", r"(?i)(?:\bdolby[ ._-]?vision\b|\bdovi\b|\bdv\b)", 1),
    ("gv", "v-hdr10p", "HDR10+", r"(?i)\bhdr[ ._-]?10(?:\+|[ ._-]?plus)", 1),
    ("gv", "v-hdr10", "HDR10", r"(?i)^(?=.*\bhdr[ ._-]?10\b)(?!.*hdr[ ._-]?10(?:\+|[ ._-]?plus))", 1),
    ("gv", "v-hdr", "HDR", r"(?i)^(?=.*\bhdr\b)(?!.*hdr[ ._-]?10)", 1),
    ("gv", "v-hlg", "HLG", r"(?i)\bhlg\b", 0),
    ("gv", "v-sdr", "SDR", r"(?i)\bsdr\b", 0),
    ("gv", "v-imax", "IMAX", r"(?i)\bimax\b", 1),
    ("gv", "v-12bit", "12BIT", r"(?i)\b12[ ._-]?bit\b", 0),
    ("gv", "v-10bit", "10BIT", r"(?i)\b10[ ._-]?bit\b", 1),
    ("gv", "v-8bit", "8BIT", r"(?i)\b8[ ._-]?bit\b", 0),
    ("gv", "v-3d", "3D", r"(?i)\b(?:3d|h[ ._-]?sbs|h[ ._-]?ou)\b", 0),
    # Codec
    ("gc", "c-hevc", "HEVC", r"(?i)\b(?:hevc|[hx][ ._-]?265)\b", 1),
    ("gc", "c-avc", "AVC", r"(?i)\b(?:avc|[hx][ ._-]?264)\b", 1),
    ("gc", "c-av1", "AV1", r"(?i)\bav1\b", 1),
    ("gc", "c-vp9", "VP9", r"(?i)\bvp9\b", 0),
    ("gc", "c-vc1", "VC-1", r"(?i)\bvc[ ._-]?1\b", 0),
    ("gc", "c-mpeg2", "MPEG-2", r"(?i)\bmpeg[ ._-]?2\b", 0),
    ("gc", "c-xvid", "XVID", r"(?i)\bxvid\b", 0),
    # Audio
    ("ga", "a-atmos", "ATMOS", r"(?i)\batmos(?![a-z])", 1),
    ("ga", "a-truehd", "TRUEHD", r"(?i)\btrue[ ._-]?hd(?![a-z])", 1),
    ("ga", "a-dtsx", "DTS:X", r"(?i)\bdts[ ._:-]?x(?![a-z])", 1),
    ("ga", "a-dtshdma", "DTS-HD MA", r"(?i)\bdts[ ._-]?(?:hd[ ._-]?)?ma(?![a-z])", 1),
    ("ga", "a-dtshd", "DTS-HD", r"(?i)^(?=.*\bdts[ ._-]?hd(?![a-z]))(?!.*\bdts[ ._-]?(?:hd[ ._-]?)?ma(?![a-z]))(?!.*\bdts[ ._:-]?x(?![a-z]))", 1),
    ("ga", "a-dts", "DTS", r"(?i)^(?=.*\bdts(?![a-z]))(?!.*\bdts[ ._:-]?(?:hd|x|ma|es))", 1),
    ("ga", "a-ddp", "DD+", r"(?i)(?:\bdd[ ._-]?\+|\bddp|\be[ ._-]?ac[ ._-]?3\b|dolby[ ._-]?digital[ ._-]?plus)", 1),
    ("ga", "a-dd", "DD", r"(?i)^(?!.*(?:e[ ._-]?ac[ ._-]?3|dd[ ._-]?\+|ddp|digital[ ._-]?plus))(?=.*\b(?:dd(?![a-z+])|ac[ ._-]?3|dolby[ ._-]?digital))", 1),
    ("ga", "a-aac", "AAC", r"(?i)\baac(?![a-z])", 1),
    ("ga", "a-flac", "FLAC", r"(?i)\bflac(?![a-z])", 1),
    ("ga", "a-opus", "OPUS", r"(?i)\bopus(?![a-z])", 0),
    ("ga", "a-pcm", "PCM", r"(?i)\bl?pcm(?![a-z])", 0),
    ("ga", "a-mp3", "MP3", r"(?i)\bmp3(?![a-z])", 0),
    ("ga", "a-dual", "DUAL AUDIO", r"(?i)\bdual[ ._-]?audio\b", 1),
    ("ga", "a-multi", "MULTI AUDIO", r"(?i)(?:\bmulti[ ._-]?audio\b|\bmulti\b(?![ ._-]?sub))", 1),
    # Channels
    ("gh", "h-71", "7.1", r"(?i)(?<![0-9])7[. ][01](?![0-9])|\b8ch\b", 1),
    ("gh", "h-51", "5.1", r"(?i)(?<![0-9])5[. ]1(?![0-9])|\b6ch\b", 1),
    ("gh", "h-20", "2.0", r"(?i)(?<![0-9])2[. ]0(?![0-9])|\b2ch\b", 0),
    # Streaming
    ("gs", "s-nf", "NETFLIX", r"(?i)\b(?:nf|netflix)\b", 1),
    ("gs", "s-amzn", "PRIME", r"(?i)\b(?:amzn|amazon)\b", 1),
    ("gs", "s-dsnp", "DISNEY+", r"(?i)\b(?:dsnp|disney)", 1),
    ("gs", "s-max", "MAX", r"(?i)\b(?:hmax|hbo[ ._-]?max|max)\b", 1),
    ("gs", "s-atvp", "APPLE TV+", r"(?i)\b(?:atvp|apple[ ._-]?tv)", 1),
    ("gs", "s-hulu", "HULU", r"(?i)\bhulu\b", 1),
    ("gs", "s-pmtp", "PARAMOUNT+", r"(?i)\b(?:pmtp|paramount)", 1),
    ("gs", "s-pcok", "PEACOCK", r"(?i)\b(?:pcok|peacock)\b", 1),
    ("gs", "s-cr", "CRUNCHYROLL", r"(?i)\bcrunchyroll\b", 1),
    ("gs", "s-fun", "FUNIMATION", r"(?i)\bfunimation\b", 0),
    ("gs", "s-ip", "iPLAYER", r"(?i)\biplayer\b", 0),
    # Language
    ("gl", "l-en", "EN", r"(?i)\b(?:eng|english)\b", 1),
    ("gl", "l-es", "ES", r"(?i)\b(?:spa|spanish|latino|castellano)\b", 1),
    ("gl", "l-fr", "FR", r"(?i)\b(?:fre|fra|french|vff|vfq|truefrench)\b", 1),
    ("gl", "l-de", "DE", r"(?i)\b(?:ger|deu|german)\b", 1),
    ("gl", "l-it", "IT", r"(?i)\b(?:ita|italian)\b", 1),
    ("gl", "l-pt", "PT", r"(?i)\b(?:por|portuguese|pt[ ._-]?br)\b", 1),
    ("gl", "l-ru", "RU", r"(?i)\b(?:rus|russian)\b", 1),
    ("gl", "l-ja", "JA", r"(?i)\b(?:jpn|jap|japanese)\b", 1),
    ("gl", "l-ko", "KO", r"(?i)\b(?:kor|korean)\b", 1),
    ("gl", "l-zh", "ZH", r"(?i)\b(?:chi|zho|chinese|mandarin|cantonese)\b", 1),
    ("gl", "l-hi", "HI", r"(?i)\b(?:hin|hindi)\b", 0),
    ("gl", "l-ar", "AR", r"(?i)\b(?:ara|arabic)\b", 0),
    ("gl", "l-nl", "NL", r"(?i)\b(?:dut|nld|dutch)\b", 0),
    ("gl", "l-pl", "PL", r"(?i)\b(?:pol|polish)\b", 0),
    ("gl", "l-tr", "TR", r"(?i)\b(?:tur|turkish)\b", 0),
    ("gl", "l-sv", "SV", r"(?i)\b(?:swe|swedish)\b", 0),
    ("gl", "l-msub", "MULTI SUBS", r"(?i)\bmulti[ ._-]?sub(?:s|titles)?\b", 1),
    ("gl", "l-hsub", "HARDSUB", r"(?i)\b(?:hard[ ._-]?sub|hc[ ._-]?sub|hardcoded)\b", 1),
    ("gl", "l-vostfr", "VOSTFR", r"(?i)\bvostfr\b", 0),
    # Release / Edition
    ("ge", "e-pack", "PACK", r"(?i)\b(?:complete|season[ ._-]?pack|batch)\b", 1),
    ("ge", "e-proper", "PROPER", r"(?i)\bproper\b", 1),
    ("ge", "e-repack", "REPACK", r"(?i)\brepack\b", 1),
    ("ge", "e-extended", "EXTENDED", r"(?i)\bextended\b", 1),
    ("ge", "e-uncut", "UNCUT", r"(?i)\buncut\b", 1),
    ("ge", "e-unrated", "UNRATED", r"(?i)\bunrated\b", 0),
    ("ge", "e-dc", "DIRECTOR'S CUT", r"(?i)\bdirector'?s?[ ._-]?cut\b", 1),
    ("ge", "e-theatrical", "THEATRICAL", r"(?i)\btheatrical\b", 0),
    ("ge", "e-remaster", "REMASTERED", r"(?i)\bremaster(?:ed)?\b", 1),
    ("ge", "e-criterion", "CRITERION", r"(?i)\bcriterion\b", 0),
    ("ge", "e-hybrid", "HYBRID", r"(?i)\bhybrid\b", 1),
    ("ge", "e-matte", "OPEN MATTE", r"(?i)\bopen[ ._-]?matte\b", 0),
    # Provider / cache (depends on how your addon labels results)
    ("gp", "p-cached", "CACHED", r"(?i)(?:\[(?:rd|ad|pm|tb|dl|ed|oc|pkp?)\+\]|⚡|\bcached\b)", 0),
    ("gp", "p-rd", "RD", r"(?i)(?:\[rd[+ \]]|\breal[ ._-]?debrid\b)", 0),
    ("gp", "p-ad", "AD", r"(?i)(?:\[ad[+ \]]|\balldebrid\b)", 0),
    ("gp", "p-pm", "PM", r"(?i)(?:\[pm[+ \]]|\bpremiumize\b)", 0),
    ("gp", "p-tb", "TB", r"(?i)(?:\[tb[+ \]]|\btorbox\b)", 0),
    ("gp", "p-dl", "DL", r"(?i)(?:\[dl[+ \]]|\bdebrid[ ._-]?link\b)", 0),
]

SAMPLES = [
    "Dune.Part.Two.2024.2160p.UHD.BluRay.REMUX.DV.HDR10+.HEVC.TrueHD.Atmos.7.1-GRP",
    "The.Bear.S03E01.1080p.AMZN.WEB-DL.DDP5.1.Atmos.H.264-GRP",
    "Spirited.Away.2001.1080p.BluRay.x265.10bit.DTS-HD.MA.5.1.JPN.Dual.Audio-GRP",
    "Movie.2023.720p.HDTV.x264.AAC.2.0.ENG.Multi-Subs [RD+]",
    "Oppenheimer.2023.IMAX.2160p.NF.WEB-DL.HDR10.Hybrid.DDP5.1.Atmos-GRP",
]

CREDITS = [
    {"name": "Badger", "by": "Nintle (Nint)", "url": "https://github.com/Nintle/Badger",
     "note": "The idea this site follows: a simple browser editor for Nuvio / Fusion badge packs."},
    {"name": "Nuvio Badge Studio", "by": "Voidxo", "url": "https://itsvoidog.github.io/nuvio-badge-studio/",
     "note": "Badger credits Voidxo for making its badge editor possible."},
    {"name": "Core Builds badge docs", "by": "Core Builds", "url": "https://core-builds.mintlify.app/nuvio-badges",
     "note": "Reference for how Nuvio badge packs and import work."},
    {"name": "NuvioSync badge guide", "by": "NuvioSync", "url": "https://nuviosync.com/blog/nuvio-badge-urls-stream-badges",
     "note": "Reference for native badge-rule JSON versus AIOStreams formatter text."},
    {"name": "Community badge packs", "by": "sweatycab, 9mousaa, Deigue, kingsizew and others",
     "url": "https://github.com/Deigue/nuvio-solid-badges",
     "note": "Public packs studied only to confirm the JSON fields. No artwork or patterns are copied here."},
]

# ---------- Style presets (used by the site AND the SVG artwork) ----------
SPECTRUM = {"gr": "#e5e5e8", "gq": "#8fb4ff", "gv": "#ffb86b", "gc": "#c4a1ff", "ga": "#7fd6a8",
            "gh": "#ff8f8f", "gs": "#ff7ac6", "gl": "#6fd3e0", "ge": "#e8d36a", "gp": "#a0a0a8"}
PRESETS = [
    dict(key="ash",      label="Ash",      style="filled and bordered", fill="#2b2b2e", border="#7a7a80", text="#f4f4f5"),
    dict(key="white",    label="White",    style="filled",              fill="#f4f4f5", border="#f4f4f5", text="#121213"),
    dict(key="outline",  label="Outline",  style="bordered",            fill="none",    border="#d4d4d8", text="#d4d4d8"),
    dict(key="black",    label="Black",    style="filled and bordered", fill="#000000", border="#ffffff", text="#ffffff"),
    dict(key="paper",    label="Paper",    style="filled and bordered", fill="#e9e6df", border="#1a1a1a", text="#1a1a1a"),
    dict(key="slate",    label="Slate",    style="filled and bordered", fill="#1f2a3a", border="#4f6b8f", text="#dbe6f5"),
    dict(key="ember",    label="Ember",    style="filled and bordered", fill="#2a1d17", border="#c8693a", text="#f3d9c8"),
    dict(key="sage",     label="Sage",     style="filled and bordered", fill="#1e2a24", border="#6f9a82", text="#d7eadf"),
    dict(key="lime",     label="Lime",     style="bordered",            fill="none",    border="#d6ff3f", text="#d6ff3f"),
    dict(key="spectrum", label="Spectrum", style="filled and bordered", fill="#1a1a1c", border="#e5e5e8", text="#e5e5e8",
         groups={g: {"border": c, "text": c} for g, c in SPECTRUM.items()}),
]

# ---------- SVG artwork ----------
TS = 14  # label size in a 24px badge (was 12)
FONT = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Bold.otf", TS)
R = 0  # outer corner radius; set to 8 while generating the "-round" sets (Nuvio rounds every badge and clips to it)

def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("'", "&#39;")

def rx(k=0.5):
    return max(0, R - k) if R else 0

def svg(label, fill, stroke, text):
    w = FONT.getlength(label) + len(label) * 0.3 + 18
    w = max(34, int(round(w)))
    h = 24
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
        f'<rect x="0.5" y="0.5" width="{w-1}" height="{h-1}" rx="{rx()}" fill="{fill}" stroke="{stroke}"/>'
        + outline(label, w / 2, 16.2 + 0.3635 * (TS - 12), text, TS, spacing=0.3) + '</svg>'
    )

# ---------- Experimental designs (SVG artwork only; they need Image mode) ----------
INTER = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"

# ---------- Text as vector outlines ----------
# Nuvio's image renderer does not reliably draw <text> (no font to use), which left badges as empty shapes.
# So every label is converted to filled <path> outlines and the SVGs contain no <text> at all.
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
_FT = {}
def _font(path):
    if path not in _FT:
        f = TTFont(path)
        _FT[path] = (f, f.getGlyphSet(), f.getBestCmap(), f["head"].unitsPerEm, f["hmtx"])
    return _FT[path]
MONO_FILE = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

def outline(label, x, y, fill, size=12, anchor="middle", file=None, spacing=0.0):
    f, gs, cmap, upm, hmtx = _font(file or INTER)
    k = size / upm
    names = [cmap.get(ord(ch), ".notdef") for ch in label]
    adv = [hmtx[n][0] * k + spacing for n in names]
    total = sum(adv) - spacing
    cx = x - total / 2 if anchor == "middle" else x
    d = []
    for n, a in zip(names, adv):
        pen = SVGPathPen(gs, ntos=lambda v: ("%.2f" % v).rstrip("0").rstrip("."))
        gs[n].draw(TransformPen(pen, (k, 0, 0, -k, cx, y)))
        c = pen.getCommands()
        if c:
            d.append(c)
        cx += a
    return f'<path d="{"".join(d)}" fill="{fill}"/>'
F8 = ImageFont.truetype(INTER, 9.5)
F11 = ImageFont.truetype(INTER, 12.5)
SANS = "Inter,Helvetica,Arial,sans-serif"
MONO = "DejaVu Sans Mono,Menlo,Consolas,monospace"
CODES = {"gr": "RES", "gq": "SRC", "gv": "VID", "gc": "COD", "ga": "AUD", "gh": "CH", "gs": "NET", "gl": "LNG", "ge": "REL", "gp": "PRV"}
H = 24

def tw(label, f=None):
    return (f or FONT).getlength(label) * 1.05

def mix(c, k):
    r, g, b = int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)
    return "#%02x%02x%02x" % (min(255, round(r * k)), min(255, round(g * k)), min(255, round(b * k)))

def wrap(w, body, h=H):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>'

def txt(x, y, label, fill, size=TS, family=SANS, anchor="middle", weight=700):
    # y is the baseline a 12px label would use; shift it so a larger label stays vertically centred
    return outline(label, x, y + 0.3635 * (size - 12), fill, size, anchor, MONO_FILE if family == MONO else None)

def rrect(x, y, w, h, r):
    return f'x="{x}" y="{y}" width="{w}" height="{h}"' + (f' rx="{r}"' if r > 0 else "")

def d_notch(label, g):
    a = SPECTRUM[g]; w = round(tw(label) + 32); c = 6.5
    if R:
        d = (f"M{R},0.5 H{w-c} L{w-0.5},{c} V{H-R} A{R-0.5},{R-0.5} 0 0 1 {w-R},{H-0.5} H{c} L0.5,{H-c} V{R} A{R-0.5},{R-0.5} 0 0 1 {R},0.5 Z")
        shape = lambda extra: f'<path d="{d}" {extra}/>'
    else:
        pts = f"0.5,0.5 {w-c},0.5 {w-0.5},{c} {w-0.5},{H-0.5} {c},{H-0.5} 0.5,{H-c}"
        shape = lambda extra: f'<polygon points="{pts}" {extra}/>'
    return wrap(w, f'<defs><clipPath id="c">{shape("")}</clipPath></defs>'
        + shape('fill="#18181a" stroke="#3a3a40"')
        + f'<rect x="0" y="0" width="5" height="{H}" fill="{a}" clip-path="url(#c)"/>' + txt((w + 5) / 2, 16, label, "#f4f4f5"))

def d_plate(label, g):
    a = SPECTRUM[g]; code = CODES[g]
    cw = F8.getlength(code) * 1.05 + 11; vw = tw(label) + 18; w = round(cw + vw)
    box = rrect(0.5, 0.5, w - 1, H - 1, rx())
    return wrap(w, f'<defs><clipPath id="c"><rect {box}/></clipPath></defs>'
        f'<rect {box} fill="#18181a"/>'
        f'<g clip-path="url(#c)"><rect x="0" y="0" width="{cw + 0.5:.1f}" height="{H}" fill="{a}"/></g>'
        f'<rect {box} fill="none" stroke="{a}"/>'
        + txt(cw / 2 + 0.5, 15.2, code, "#0e0e0f", 9.5) + txt(cw + vw / 2, 16, label, "#f4f4f5"))

def d_brackets(label, g):
    a = SPECTRUM[g]; w = round(tw(label) + 28); L = 6
    if R:
        k = R; e = 3
        d = (f"M0.75,{k+e} V{k} A{k-0.75},{k-0.75} 0 0 1 {k},0.75 H{k+e} "
             f"M{w-k-e},0.75 H{w-k} A{k-0.75},{k-0.75} 0 0 1 {w-0.75},{k} V{k+e} "
             f"M{w-0.75},{H-k-e} V{H-k} A{k-0.75},{k-0.75} 0 0 1 {w-k},{H-0.75} H{w-k-e} "
             f"M{k+e},{H-0.75} H{k} A{k-0.75},{k-0.75} 0 0 1 0.75,{H-k} V{H-k-e}")
    else:
        d = (f"M0.75,{L} V0.75 H{L} M{w-L},0.75 H{w-0.75} V{L} "
             f"M{w-0.75},{H-L} V{H-0.75} H{w-L} M{L},{H-0.75} H0.75 V{H-L}")
    return wrap(w, f'<path d="{d}" fill="none" stroke="{a}" stroke-width="1.5"/>' + txt(w / 2, 16, label, "#f4f4f5"))

def d_underline(label, g):
    a = SPECTRUM[g]; w = round(tw(label) + 12)
    bar = f'<rect x="{R // 2}" y="19" width="{w - 2 * (R // 2)}" height="3" rx="1.5" fill="{a}"/>' if R else f'<rect x="0" y="19" width="{w}" height="3" fill="{a}"/>'
    return wrap(w, txt(w / 2, 15, label, "#f4f4f5") + bar)

def d_terminal(label, g):
    n = len(label); cw = 0.602 * (TS + 1)
    w = round(8 + (n + 2) * cw + 4 + 6 + 8)
    return wrap(w, f'<rect {rrect(0.5, 0.5, w - 1, H - 1, rx())} fill="#0a0e0b" stroke="#234d31"/>'
        + txt(8 + (R // 3), 16, "> " + label, "#7dff9b", TS + 1, MONO, "start", 700)
        + f'<rect x="{8 + (R // 3) + (n + 2) * cw + 3:.1f}" y="7" width="6" height="10" fill="#7dff9b"/>')

def d_brutal(label, g):
    a = SPECTRUM[g]; w2 = round(tw(label) + 22); h2 = H - 2
    r1 = max(0, R - 2) if R else 0
    return wrap(w2 + 2, f'<rect {rrect(2, 2, w2, h2, r1)} fill="#f4f4f5"/>'
        f'<rect {rrect(0.75, 0.75, w2 - 1.5, h2 - 1.5, max(0, r1 - 0.75) if R else 0)} fill="{a}" stroke="#0e0e0f" stroke-width="1.5"/>'
        + txt(w2 / 2, 15, label, "#0e0e0f"))

def d_hatch(label, g):
    a = SPECTRUM[g]; w = round(tw(label) + 40)
    lines = "".join(f'<line x1="{i}" y1="{H}" x2="{i+H}" y2="0" stroke="{a}" stroke-opacity="0.5" stroke-width="1.2"/>' for i in range(-H, w, 6))
    box = rrect(0.5, 0.5, w - 1, H - 1, rx())
    return wrap(w, f'<defs><clipPath id="c"><rect {box}/></clipPath></defs>'
        f'<rect {box} fill="#121214"/><g clip-path="url(#c)">{lines}</g>'
        f'<rect {box} fill="none" stroke="{a}"/>'
        f'<rect {rrect(10 + R // 2, 4, w - 20 - R, 16, 2 if R else 0)} fill="#121214"/>' + txt(w / 2, 16, label, "#f4f4f5"))

def d_duotone(label, g):
    a = SPECTRUM[g]; w = round(tw(label) + 28)
    return wrap(w, f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{mix(a, 0.16)}"/>'
        f'<stop offset="1" stop-color="{mix(a, 0.62)}"/></linearGradient></defs>'
        f'<rect {rrect(0.5, 0.5, w - 1, H - 1, rx())} fill="url(#g)" stroke="{a}"/>' + txt(w / 2, 16, label, "#ffffff"))

def d_ticket(label, g):
    a = SPECTRUM[g]; w = round(tw(label) + 42); r = 4
    if R:
        path = (f"M{R},0.5 H{w-R} A{R-0.5},{R-0.5} 0 0 1 {w-0.5},{R} V{12-r} A{r},{r} 0 0 0 {w-0.5},{12+r} V{H-R} A{R-0.5},{R-0.5} 0 0 1 {w-R},{H-0.5} "
                f"H{R} A{R-0.5},{R-0.5} 0 0 1 0.5,{H-R} V{12+r} A{r},{r} 0 0 0 0.5,{12-r} V{R} A{R-0.5},{R-0.5} 0 0 1 {R},0.5 Z")
    else:
        path = f"M0.5,0.5 H{w-0.5} V{12-r} A{r},{r} 0 0 0 {w-0.5},{12+r} V{H-0.5} H0.5 V{12+r} A{r},{r} 0 0 0 0.5,{12-r} Z"
    return wrap(w, f'<path d="{path}" fill="#18181a" stroke="{a}"/>'
        f'<line x1="15" y1="4" x2="15" y2="20" stroke="{a}" stroke-width="1" stroke-dasharray="2 2"/>'
        f'<rect x="6" y="10" width="4" height="4" fill="{a}"/>' + txt((16 + w - 8) / 2, 16, label, "#f4f4f5"))

def d_stamp(label, g):
    a = SPECTRUM[g]; w = round(tw(label, F11) + 32)
    return wrap(w, f'<rect {rrect(0.75, 0.75, w - 1.5, H - 1.5, max(0, R - 0.75) if R else 0)} fill="none" stroke="{a}" stroke-width="1.5"/>'
        f'<rect {rrect(3.5, 3.5, w - 7, H - 7, max(0, R - 3.5) if R else 0)} fill="none" stroke="{a}" stroke-width="0.75"/>'
        + txt(w / 2, 15.8, label, a, 12.5))

DESIGNS = {"notch": d_notch, "plate": d_plate, "brackets": d_brackets, "underline": d_underline, "terminal": d_terminal,
           "brutal": d_brutal, "hatch": d_hatch, "duotone": d_duotone, "ticket": d_ticket, "stamp": d_stamp}
for k, lab in [("notch", "Notch"), ("plate", "Plate"), ("brackets", "Brackets"), ("underline", "Underline"), ("terminal", "Terminal"),
               ("brutal", "Brutal"), ("hatch", "Hatch"), ("duotone", "Duotone"), ("ticket", "Ticket"), ("stamp", "Stamp")]:
    PRESETS.append(dict(key=k, label=lab, art=True, style="bordered", fill="none", border="none", text="#ffffff"))

ROUND_R = 8
for _round in (0, ROUND_R):
    R = _round
    for pr in PRESETS:
        d = os.path.join(OUT, "badges", pr["key"] + ("-round" if R else ""))
        os.makedirs(d, exist_ok=True)
        for g, i, name, pat, on in B:
            if pr.get("art"):
                out = DESIGNS[pr["key"]](name, g)
            else:
                o = pr.get("groups", {}).get(g, {})
                out = svg(name, pr["fill"], o.get("border", pr["border"]), o.get("text", pr["text"]))
            with open(os.path.join(d, i + ".svg"), "w") as f:
                f.write(out)
R = 0

# ---------- PNG renders (what Nuvio actually loads) ----------
# Nuvio's own examples and Badger use PNG for image badges, and its SVG support is unverified, so every artwork
# SVG is also rendered to a 3x PNG (needs the rsvg-convert tool). The site's previews keep using the SVGs.
import subprocess
for _pr, _sfx in [(p_, s_) for s_ in ("", "-round") for p_ in PRESETS]:
    _d = os.path.join(OUT, "badges", _pr["key"] + _sfx)
    for _i in [b[1] for b in B]:
        subprocess.run(["rsvg-convert", "-z", "4", "-f", "png", "-o", os.path.join(_d, _i + ".png"), os.path.join(_d, _i + ".svg")], check=True)

# ---------- versions ----------
# SITE_V: bump when index.html, app.js or style.css change. It stamps the ?v= query strings and data-v in index.html,
# so browsers fetch matching files and the page can warn if it ever runs mismatched ones.
# ART_V: a hash of all artwork. It is appended to image URLs in exported packs, so an app that caches images by
# URL (Nuvio) downloads them again when the artwork changes.
import hashlib
SITE_V = "7"
_h = hashlib.sha1()
for _r, _d, _fs in sorted(os.walk(os.path.join(OUT, "badges"))):
    for _f in sorted(_fs):
        if _f.endswith(".png"): continue
        _h.update(open(os.path.join(_r, _f), "rb").read())
ART_V = _h.hexdigest()[:8]

# ---------- catalog.js ----------
ids = [b[1] for b in B]
assert len(ids) == len(set(ids)), "duplicate ids"
gids = {g for g, _ in GROUPS}
assert all(b[0] in gids for b in B)

catalog = {
    "groups": [{"id": g, "name": n} for g, n in GROUPS],
    "badges": [{"id": i, "g": g, "n": n, "p": p, "on": bool(on)} for g, i, n, p, on in B],
    "presets": PRESETS,
    "palette": SPECTRUM,
    "codes": CODES,
    "samples": SAMPLES,
    "credits": CREDITS,
    "artV": ART_V,
    "roundR": ROUND_R,
}
with open(os.path.join(OUT, "catalog.js"), "w") as f:
    f.write("// Generated by build.py - edit the catalog there, not here.\n")
    f.write("window.CATALOG = " + json.dumps(catalog, indent=1, ensure_ascii=True) + ";\n")
    f.write('window.CHIP_V = "%s";\n' % SITE_V)
_ip = os.path.join(OUT, "index.html")
_t = open(_ip).read()
_t = re.sub(r'data-v="[^"]*"', 'data-v="%s"' % SITE_V, _t)
_t = re.sub(r'(href="style\.css|src="catalog\.js|src="app\.js)(\?v=[^"]*)?"', lambda m: '%s?v=%s"' % (m.group(1), SITE_V), _t)
open(_ip, "w").write(_t)
print(len(B), "badges,", len(GROUPS), "groups,", len(PRESETS), "presets")
