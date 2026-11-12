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
    ("gw", "Warnings"),
    ("gx", "Best match"),
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
    ("gl", "l-en", "EN", r"(?i)(?:\b(?:eng|english)\b|🇬🇧|🇺🇸)", 1),
    ("gl", "l-es", "ES", r"(?i)(?:\b(?:spa|spanish|latino|castellano)\b|🇪🇸|🇲🇽)", 1),
    ("gl", "l-fr", "FR", r"(?i)(?:\b(?:fre|fra|french|vff|vfq|truefrench)\b|🇫🇷)", 1),
    ("gl", "l-de", "DE", r"(?i)(?:\b(?:ger|deu|german)\b|🇩🇪)", 1),
    ("gl", "l-it", "IT", r"(?i)(?:\b(?:ita|italian)\b|🇮🇹)", 1),
    ("gl", "l-pt", "PT", r"(?i)(?:\b(?:por|portuguese|pt[ ._-]?br)\b|🇵🇹|🇧🇷)", 1),
    ("gl", "l-ru", "RU", r"(?i)(?:\b(?:rus|russian)\b|🇷🇺)", 1),
    ("gl", "l-ja", "JA", r"(?i)(?:\b(?:jpn|jap|japanese)\b|🇯🇵)", 1),
    ("gl", "l-ko", "KO", r"(?i)(?:\b(?:kor|korean)\b|🇰🇷)", 1),
    ("gl", "l-zh", "ZH", r"(?i)(?:\b(?:chi|zho|chinese|mandarin|cantonese)\b|🇨🇳|🇹🇼|🇭🇰)", 1),
    ("gl", "l-hi", "HI", r"(?i)(?:\b(?:hin|hindi)\b|🇮🇳)", 0),
    ("gl", "l-ar", "AR", r"(?i)(?:\b(?:ara|arabic)\b|🇸🇦)", 0),
    ("gl", "l-nl", "NL", r"(?i)(?:\b(?:dut|nld|dutch)\b|🇳🇱)", 0),
    ("gl", "l-pl", "PL", r"(?i)(?:\b(?:pol|polish)\b|🇵🇱)", 0),
    ("gl", "l-tr", "TR", r"(?i)(?:\b(?:tur|turkish)\b|🇹🇷)", 0),
    ("gl", "l-sv", "SV", r"(?i)(?:\b(?:swe|swedish)\b|🇸🇪)", 0),
    ("gl", "l-ro", "RO", r"(?i)(?:\b(?:rum|ron|romanian|ro)\b|🇷🇴)", 0),
    ("gl", "l-cs", "CS", r"(?i)(?:\b(?:cze|ces|czech|cs)\b|🇨🇿)", 0),
    ("gl", "l-hu", "HU", r"(?i)(?:\b(?:hun|hungarian|hu)\b|🇭🇺)", 0),
    ("gl", "l-el", "EL", r"(?i)(?:\b(?:greek|ell)\b|🇬🇷)", 0),
    ("gl", "l-he", "HE", r"(?i)(?:\b(?:heb|hebrew)\b|🇮🇱)", 0),
    ("gl", "l-th", "TH", r"(?i)(?:\b(?:tha|thai|th)\b|🇹🇭)", 0),
    ("gl", "l-vi", "VI", r"(?i)(?:\b(?:vie|vietnamese|vi)\b|🇻🇳)", 0),
    ("gl", "l-id", "ID", r"(?i)(?:\b(?:indonesian)\b|🇮🇩)", 0),
    ("gl", "l-uk", "UK", r"(?i)(?:\b(?:ukr|ukrainian|uk)\b|🇺🇦)", 0),
    ("gl", "l-bg", "BG", r"(?i)(?:\b(?:bul|bulgarian|bg)\b|🇧🇬)", 0),
    ("gl", "l-sr", "SR", r"(?i)(?:\b(?:srp|serbian|sr)\b|🇷🇸)", 0),
    ("gl", "l-hr", "HR", r"(?i)(?:\b(?:hrv|croatian|hr)\b|🇭🇷)", 0),
    ("gl", "l-sk", "SK", r"(?i)(?:\b(?:slk|slovak)\b|🇸🇰)", 0),
    ("gl", "l-sl", "SL", r"(?i)(?:\b(?:slv|slovenian)\b|🇸🇮)", 0),
    ("gl", "l-da", "DA", r"(?i)(?:\b(?:danish)\b|🇩🇰)", 0),
    ("gl", "l-no", "NO", r"(?i)(?:\b(?:nob|norwegian)\b|🇳🇴)", 0),
    ("gl", "l-fi", "FI", r"(?i)(?:\b(?:finnish)\b|🇫🇮)", 0),
    ("gl", "l-fa", "FA", r"(?i)(?:\b(?:fas|persian|farsi)\b|🇮🇷)", 0),
    ("gl", "l-ms", "MS", r"(?i)(?:\b(?:msa|malay)\b|🇲🇾)", 0),
    ("gl", "l-ta", "TA", r"(?i)(?:\b(?:tamil)\b|🇱🇰)", 0),
    ("gl", "l-te", "TE", r"(?i)(?:\b(?:telugu)\b|🇮🇳)", 0),
    ("gl", "l-bn", "BN", r"(?i)(?:\b(?:bengali)\b|🇧🇩)", 0),
    ("gl", "l-ca", "CA", r"(?i)(?:\b(?:catalan)\b)", 0),
    ("gl", "l-lt", "LT", r"(?i)(?:\b(?:lit|lithuanian|lt)\b|🇱🇹)", 0),
    ("gl", "l-lv", "LV", r"(?i)(?:\b(?:lav|latvian|lv)\b|🇱🇻)", 0),
    ("gl", "l-et", "ET", r"(?i)(?:\b(?:estonian)\b|🇪🇪)", 0),
    ("gl", "l-esub", "EMBEDDED SUBS", r"(?i)\b(?:embedded|soft)[ ._-]?subs?(?:titles?)?\b", 0),
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
    ("ge", "e-seadex", "SEADEX", r"(?i)(?:\bsea[ ._-]?dex\b|\bseadex[ ._-]?best\b)", 0),
    ("ge", "e-hybrid", "HYBRID", r"(?i)\bhybrid\b", 1),
    ("ge", "e-matte", "OPEN MATTE", r"(?i)\bopen[ ._-]?matte\b", 0),
    # Provider / cache (depends on how your addon labels results)
    ("gp", "p-cached", "CACHED", r"(?i)(?:\[(?:rd|ad|pm|tb|dl|ed|oc|pkp?)\+\]|⚡|\bcached\b)", 0),
    ("gp", "p-rd", "RD", r"(?i)(?:\[rd[+ \]]|\breal[ ._-]?debrid\b)", 0),
    ("gp", "p-ad", "AD", r"(?i)(?:\[ad[+ \]]|\balldebrid\b)", 0),
    ("gp", "p-pm", "PM", r"(?i)(?:\[pm[+ \]]|\bpremiumize\b)", 0),
    ("gp", "p-tb", "TB", r"(?i)(?:\[tb[+ \]]|\btorbox\b)", 0),
    ("gp", "p-dl", "DL", r"(?i)(?:\[dl[+ \]]|\bdebrid[ ._-]?link\b)", 0),
    # Warnings: things to avoid
    ("gw", "w-lowq", "LOW QUALITY", r"(?i)\b(?:cam(?:[ ._-]?rip)?|hd[ ._-]?cam|hd[ ._-]?ts|tele[ ._-]?(?:sync|cine)|hd[ ._-]?tc|dvd[ ._-]?scr(?:eener)?)\b", 1),
    ("gw", "w-upscale", "UPSCALED", r"(?i)\b(?:upscal(?:e|ed|ing)|ai[ ._-]?upscale)\b", 1),
    ("gw", "w-sample", "SAMPLE", r"(?i)\bsample\b", 1),
    ("gw", "w-dub", "DUBBED", r"(?i)\b(?:dubbed|dubbing)\b", 0),
    # Best match: combinations (lookaheads, so order in the title does not matter)
    ("gx", "x-4khdr", "4K HDR", r"(?i)^(?=.*\b(?:2160[pi]?|4k|uhd)\b)(?=.*(?:\bhdr|\bdolby[ ._-]?vision\b|\bdovi\b|\bdv\b))", 0),
    ("gx", "x-remux4k", "REMUX 4K", r"(?i)^(?=.*\bremux\b)(?=.*\b(?:2160[pi]?|4k|uhd)\b)", 0),
    ("gx", "x-top", "TOP TIER", r"(?i)^(?=.*\b(?:2160[pi]?|4k|uhd)\b)(?=.*(?:\bhdr|\bdolby[ ._-]?vision\b|\bdovi\b|\bdv\b))(?=.*\b(?:remux|blu[ ._-]?ray)\b)(?=.*(?:\batmos|\btrue[ ._-]?hd|\bdts[ ._:-]?x|\bdts[ ._-]?(?:hd[ ._-]?)?ma))", 1),
]

SAMPLES = [
    "Dune.Part.Two.2024.2160p.UHD.BluRay.REMUX.DV.HDR10+.HEVC.TrueHD.Atmos.7.1-GRP",
    "The.Bear.S03E01.1080p.AMZN.WEB-DL.DDP5.1.Atmos.H.264-GRP",
    "Spirited.Away.2001.1080p.BluRay.x265.10bit.DTS-HD.MA.5.1.JPN.Dual.Audio-GRP",
    "Movie.2023.720p.HDTV.x264.AAC.2.0.ENG.Multi-Subs [RD+]",
    "Oppenheimer.2023.IMAX.2160p.NF.WEB-DL.HDR10.Hybrid.DDP5.1.Atmos-GRP",
    "Some.Movie.2024.HDCAM.x264.AAC-GRP",
    "Old.Show.S01.480p.AI.Upscaled.DVDRip.Dubbed",
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
    {"name": "Elite-Badges", "by": "leonevz", "url": "https://github.com/leonevz/Elite-Badges",
     "note": "A logo-image pack used as the test case for Borrow images. Chip does not copy or host any of its files."},
    {"name": "Community badge packs", "by": "sweatycab, 9mousaa, Deigue, kingsizew and others",
     "url": "https://github.com/Deigue/nuvio-solid-badges",
     "note": "Public packs studied only to confirm the JSON fields. No artwork or patterns are copied here."},
]

# ---------- Style presets (used by the site AND the SVG artwork) ----------
SPECTRUM = {"gr": "#e5e5e8", "gq": "#8fb4ff", "gv": "#ffb86b", "gc": "#c4a1ff", "ga": "#7fd6a8",
            "gh": "#ff8f8f", "gs": "#ff7ac6", "gl": "#6fd3e0", "ge": "#e8d36a", "gp": "#a0a0a8", "gw": "#ff6b6b", "gx": "#ffd54a"}
ACC = [None]   # accent override used while rendering importance (tier) variants
def acc(g):
    return ACC[0] or SPECTRUM[g]

# ---------- importance tiers ----------
# hero = the facts worth a glance (gold), core = everything else people choose by (keeps its group color),
# info = quiet detail (muted), warn = low quality or playback risk (red).
TIER_COL = {"hero": "#ffd54a", "info": "#8a8a93", "warn": "#ff6b6b"}
_HERO = {"r-8k", "r-4k", "q-remux", "v-dv", "v-hdr10p", "v-imax", "a-atmos", "a-truehd", "a-dtsx", "a-dtshdma", "p-cached", "x-4khdr", "x-remux4k", "x-top"}
_WARN = {"q-scr", "q-tc", "q-ts", "q-cam", "c-xvid", "r-360", "r-240"}
_INFO_G = {"gc", "gh", "gs", "ge", "gp"}
_INFO = {"a-dd", "a-aac", "a-mp3", "a-opus", "a-pcm", "v-8bit", "v-10bit", "v-12bit", "l-msub", "l-hsub"}
def tier_of(i, g):
    if g == "gw" or i in _WARN: return "warn"
    if i in _HERO: return "hero"
    if g in _INFO_G or i in _INFO: return "info"
    return "core"
def tier_has_variant(i, g):
    c = TIER_COL.get(tier_of(i, g))
    return bool(c) and c != SPECTRUM[g]

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
CODES = {"gr": "RES", "gq": "SRC", "gv": "VID", "gc": "COD", "ga": "AUD", "gh": "CH", "gs": "NET", "gl": "LNG", "ge": "REL", "gp": "PRV", "gw": "WRN", "gx": "TOP"}
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
    a = acc(g); w = round(tw(label) + 32); c = 6.5
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
    a = acc(g); code = CODES[g]
    cw = F8.getlength(code) * 1.05 + 11; vw = tw(label) + 18; w = round(cw + vw)
    box = rrect(0.5, 0.5, w - 1, H - 1, rx())
    return wrap(w, f'<defs><clipPath id="c"><rect {box}/></clipPath></defs>'
        f'<rect {box} fill="#18181a"/>'
        f'<g clip-path="url(#c)"><rect x="0" y="0" width="{cw + 0.5:.1f}" height="{H}" fill="{a}"/></g>'
        f'<rect {box} fill="none" stroke="{a}"/>'
        + txt(cw / 2 + 0.5, 15.2, code, "#0e0e0f", 9.5) + txt(cw + vw / 2, 16, label, "#f4f4f5"))

def d_brackets(label, g):
    a = acc(g); w = round(tw(label) + 28); L = 6
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
    a = acc(g); w = round(tw(label) + 12)
    bar = f'<rect x="{R // 2}" y="19" width="{w - 2 * (R // 2)}" height="3" rx="1.5" fill="{a}"/>' if R else f'<rect x="0" y="19" width="{w}" height="3" fill="{a}"/>'
    return wrap(w, txt(w / 2, 15, label, "#f4f4f5") + bar)

def d_terminal(label, g):
    n = len(label); cw = 0.602 * (TS + 1)
    w = round(8 + (n + 2) * cw + 4 + 6 + 8)
    return wrap(w, f'<rect {rrect(0.5, 0.5, w - 1, H - 1, rx())} fill="#0a0e0b" stroke="#234d31"/>'
        + txt(8 + (R // 3), 16, "> " + label, "#7dff9b", TS + 1, MONO, "start", 700)
        + f'<rect x="{8 + (R // 3) + (n + 2) * cw + 3:.1f}" y="7" width="6" height="10" fill="#7dff9b"/>')

def d_brutal(label, g):
    a = acc(g); w2 = round(tw(label) + 22); h2 = H - 2
    r1 = max(0, R - 2) if R else 0
    return wrap(w2 + 2, f'<rect {rrect(2, 2, w2, h2, r1)} fill="#f4f4f5"/>'
        f'<rect {rrect(0.75, 0.75, w2 - 1.5, h2 - 1.5, max(0, r1 - 0.75) if R else 0)} fill="{a}" stroke="#0e0e0f" stroke-width="1.5"/>'
        + txt(w2 / 2, 15, label, "#0e0e0f"))

def d_hatch(label, g):
    a = acc(g); w = round(tw(label) + 40)
    lines = "".join(f'<line x1="{i}" y1="{H}" x2="{i+H}" y2="0" stroke="{a}" stroke-opacity="0.5" stroke-width="1.2"/>' for i in range(-H, w, 6))
    box = rrect(0.5, 0.5, w - 1, H - 1, rx())
    return wrap(w, f'<defs><clipPath id="c"><rect {box}/></clipPath></defs>'
        f'<rect {box} fill="#121214"/><g clip-path="url(#c)">{lines}</g>'
        f'<rect {box} fill="none" stroke="{a}"/>'
        f'<rect {rrect(10 + R // 2, 4, w - 20 - R, 16, 2 if R else 0)} fill="#121214"/>' + txt(w / 2, 16, label, "#f4f4f5"))

def d_duotone(label, g):
    a = acc(g); w = round(tw(label) + 28)
    return wrap(w, f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{mix(a, 0.16)}"/>'
        f'<stop offset="1" stop-color="{mix(a, 0.62)}"/></linearGradient></defs>'
        f'<rect {rrect(0.5, 0.5, w - 1, H - 1, rx())} fill="url(#g)" stroke="{a}"/>' + txt(w / 2, 16, label, "#ffffff"))

def d_ticket(label, g):
    a = acc(g); w = round(tw(label) + 42); r = 4
    if R:
        path = (f"M{R},0.5 H{w-R} A{R-0.5},{R-0.5} 0 0 1 {w-0.5},{R} V{12-r} A{r},{r} 0 0 0 {w-0.5},{12+r} V{H-R} A{R-0.5},{R-0.5} 0 0 1 {w-R},{H-0.5} "
                f"H{R} A{R-0.5},{R-0.5} 0 0 1 0.5,{H-R} V{12+r} A{r},{r} 0 0 0 0.5,{12-r} V{R} A{R-0.5},{R-0.5} 0 0 1 {R},0.5 Z")
    else:
        path = f"M0.5,0.5 H{w-0.5} V{12-r} A{r},{r} 0 0 0 {w-0.5},{12+r} V{H-0.5} H0.5 V{12+r} A{r},{r} 0 0 0 0.5,{12-r} Z"
    return wrap(w, f'<path d="{path}" fill="#18181a" stroke="{a}"/>'
        f'<line x1="15" y1="4" x2="15" y2="20" stroke="{a}" stroke-width="1" stroke-dasharray="2 2"/>'
        f'<rect x="6" y="10" width="4" height="4" fill="{a}"/>' + txt((16 + w - 8) / 2, 16, label, "#f4f4f5"))

def d_stamp(label, g):
    a = acc(g); w = round(tw(label, F11) + 32)
    return wrap(w, f'<rect {rrect(0.75, 0.75, w - 1.5, H - 1.5, max(0, R - 0.75) if R else 0)} fill="none" stroke="{a}" stroke-width="1.5"/>'
        f'<rect {rrect(3.5, 3.5, w - 7, H - 7, max(0, R - 3.5) if R else 0)} fill="none" stroke="{a}" stroke-width="0.75"/>'
        + txt(w / 2, 15.8, label, a, 12.5))


# Generic pictograms (no brand marks), drawn on a 12x12 grid. One per category.
def icon(g, a):
    st = f'stroke="{a}" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"'
    fl = f'fill="{a}"'
    I = {
      "gr": f'<rect x="1" y="1.5" width="10" height="9" {st}/><rect x="3.8" y="4.2" width="4.4" height="3.6" {fl}/>',
      "gq": f'<circle cx="6" cy="6" r="4.9" {st}/><circle cx="6" cy="6" r="1.4" {fl}/>',
      "gv": f'<circle cx="6" cy="6" r="2.2" {fl}/>' + "".join(f'<line x1="{6+3.6*c:.2f}" y1="{6+3.6*d:.2f}" x2="{6+5.4*c:.2f}" y2="{6+5.4*d:.2f}" {st}/>' for c, d in [(1,0),(-1,0),(0,1),(0,-1),(.7,.7),(-.7,.7),(.7,-.7),(-.7,-.7)]),
      "gc": f'<rect x="2.6" y="2.6" width="6.8" height="6.8" {st}/>' + "".join(f'<line x1="{x}" y1="0.6" x2="{x}" y2="2.6" {st}/><line x1="{x}" y1="9.4" x2="{x}" y2="11.4" {st}/>' for x in (4.6, 7.4)),
      "ga": f'<path d="M1,4.4 H3.4 L6.4,1.8 V10.2 L3.4,7.6 H1 Z" {fl}/><path d="M8.2,4.2 Q9.6,6 8.2,7.8 M9.6,2.6 Q12,6 9.6,9.4" {st}/>',
      "gh": "".join(f'<line x1="{x}" y1="{11-h}" x2="{x}" y2="11" {st}/>' for x, h in [(1.8, 4), (4.2, 7), (6.6, 10), (9.0, 7), (11.0, 4)]),
      "gs": f'<rect x="0.9" y="1.6" width="10.2" height="8.8" rx="2" {st}/><path d="M4.8,3.9 L8.2,6 L4.8,8.1 Z" {fl}/>',
      "gl": f'<path d="M1,1.6 H11 V8 H6.4 L3.4,10.6 V8 H1 Z" {st}/>',
      "ge": f'<path d="M6,0.9 L7.6,4.3 L11.2,4.7 L8.5,7.2 L9.3,10.9 L6,9 L2.7,10.9 L3.5,7.2 L0.8,4.7 L4.4,4.3 Z" {fl}/>',
      "gp": f'<path d="M7,0.8 L2.2,6.6 H5.6 L4.8,11.2 L9.8,5.2 H6.4 Z" {fl}/>',
      "gw": f'<path d="M6,1 L11.2,10.4 H0.8 Z" {st}/><line x1="6" y1="4.6" x2="6" y2="7.2" {st}/><circle cx="6" cy="8.9" r="0.55" {fl}/>',
      "gx": f'<path d="M6,0.9 L11.1,6 L6,11.1 L0.9,6 Z" {fl}/>',
    }
    return I[g]

def d_glyph(label, g):
    a = acc(g); w = round(tw(label) + 40)
    return wrap(w, f'<rect {rrect(0.5, 0.5, w - 1, H - 1, rx())} fill="#18181a" stroke="#3a3a40"/>'
        f'<g transform="translate({9 + R // 4},6)">{icon(g, a)}</g>'
        f'<line x1="{26 + R // 4}" y1="5" x2="{26 + R // 4}" y2="19" stroke="#3a3a40"/>'
        + txt((28 + R // 4 + w - 8) / 2 + 1, 16, label, "#f4f4f5"))


# ---------- more designs ----------
def tint(c, t):
    r, g, b = int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)
    return "#%02x%02x%02x" % (round(r + (255 - r) * t), round(g + (255 - g) * t), round(b + (255 - b) * t))

def rpoly(pts, r):
    """Polygon path with rounded corners (quadratic curves), radius r."""
    n = len(pts)
    if not r:
        return "M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in pts) + " Z"
    out = []
    for i in range(n):
        p0, p1, p2 = pts[i - 1], pts[i], pts[(i + 1) % n]
        def toward(a, b, d):
            L = ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2) ** 0.5
            return (a[0] + (b[0] - a[0]) / L * d, a[1] + (b[1] - a[1]) / L * d)
        l0 = ((p0[0] - p1[0]) ** 2 + (p0[1] - p1[1]) ** 2) ** 0.5
        l2 = ((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2) ** 0.5
        d = min(r, l0 / 2, l2 / 2)
        a, b = toward(p1, p0, d), toward(p1, p2, d)
        out.append((a, p1, b))
    d = f"M{out[0][0][0]:.2f},{out[0][0][1]:.2f}"
    for i, (a, c, b) in enumerate(out):
        if i: d += f" L{a[0]:.2f},{a[1]:.2f}"
        d += f" Q{c[0]:.2f},{c[1]:.2f} {b[0]:.2f},{b[1]:.2f}"
    return d + " Z"

def d_pill(label, g):
    a = acc(g); w = round(tw(label) + 30)
    return wrap(w, f'<rect {rrect(0.5, 0.5, w - 1, H - 1, 11.5)} fill="{mix(a, 0.2)}" stroke="{a}"/>' + txt(w / 2, 16, label, tint(a, 0.45)))

def d_capsule(label, g):
    a = acc(g); w = round(tw(label) + 30)
    return wrap(w, f'<rect {rrect(0, 0, w, H, 12)} fill="{a}"/>' + txt(w / 2, 16, label, "#0e0e0f"))

def d_bare(label, g):
    a = acc(g); w = round(tw(label) + 8)
    return wrap(w, txt(w / 2, 16, label, a))

def d_shine(label, g):
    a = acc(g); w = round(tw(label) + 8)
    return wrap(w, f'<defs><linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{tint(a, 0.7)}"/>'
        f'<stop offset="0.5" stop-color="{a}"/><stop offset="1" stop-color="{mix(a, 0.62)}"/></linearGradient></defs>'
        + txt(w / 2, 16, label, "url(#t)"))

def d_dot(label, g):
    a = acc(g); w = round(tw(label) + 30)
    return wrap(w, f'<circle cx="9" cy="12" r="3.5" fill="{a}"/>' + txt((w + 14) / 2, 16, label, "#f4f4f5"))

def d_slash(label, g):
    a = acc(g); w = round(tw(label) + 34); k = 6
    pts = [(k, 0.5), (w - 0.5, 0.5), (w - k, H - 0.5), (0.5, H - 0.5)]
    d = rpoly(pts, 6 if R else 0)
    stripe = [(k + 4, 0.5), (k + 8, 0.5), (8, H - 0.5), (4, H - 0.5)]
    return wrap(w, f'<defs><clipPath id="c"><path d="{d}"/></clipPath></defs><path d="{d}" fill="#18181a"/>'
        f'<g clip-path="url(#c)"><path d="{rpoly(stripe, 0)}" fill="{a}"/></g><path d="{d}" fill="none" stroke="{a}"/>'
        + txt((w + 6) / 2, 16, label, "#f4f4f5"))

def d_glass(label, g):
    a = acc(g); w = round(tw(label) + 30); r = rx() or 3
    return wrap(w, f'<defs><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>'
        f'<stop offset="0.5" stop-color="#ffffff" stop-opacity="0.06"/><stop offset="1" stop-color="{a}" stop-opacity="0.16"/></linearGradient></defs>'
        f'<rect {rrect(0.5, 0.5, w - 1, H - 1, r)} fill="url(#h)" stroke="{a}" stroke-opacity="0.75"/>' + txt(w / 2, 16, label, "#ffffff"))

def d_neon(label, g):
    a = acc(g); w = round(tw(label) + 34); r = 9 if R else 2
    box = rrect(3.5, 3.5, w - 7, H - 7, r)
    glow = txt(w / 2, 16, label, a).replace("/>", ' filter="url(#b)" opacity="0.85"/>')
    return wrap(w, '<defs><filter id="b" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="1.7"/></filter></defs>'
        f'<rect {box} fill="none" stroke="{a}" stroke-width="3" filter="url(#b)" opacity="0.8"/>'
        f'<rect {box} fill="#0b0b0d" fill-opacity="0.55" stroke="{tint(a, 0.5)}" stroke-width="1.2"/>' + glow + txt(w / 2, 16, label, tint(a, 0.75)))

def d_sticker(label, g):
    a = acc(g); w = round(tw(label) + 26); r = R or 3
    return wrap(w, f'<rect {rrect(0, 0, w, H, r)} fill="#f4f4f5"/>'
        f'<rect {rrect(1.5, 1.5, w - 3, H - 3, max(0, r - 1.5))} fill="{a}" stroke="#0e0e0f" stroke-width="1.5"/>' + txt(w / 2, 16, label, "#0e0e0f"))

def d_ribbon(label, g):
    a = acc(g); w = round(tw(label) + 38); t = 7
    pts = [(0.5, 0.5), (w - 0.5, 0.5), (w - t, H / 2), (w - 0.5, H - 0.5), (0.5, H - 0.5)]
    return wrap(w, f'<path d="{rpoly(pts, R if R else 0)}" fill="{a}"/>' + txt((w - t + 2) / 2, 16, label, "#0e0e0f"))

def d_lcd(label, g):
    a = acc(g); w = round(tw(label) + 30)
    box = rrect(0.5, 0.5, w - 1, H - 1, rx())
    scan = "".join(f'<line x1="0" y1="{y}" x2="{w}" y2="{y}" stroke="#000" stroke-opacity="0.22" stroke-width="1"/>' for y in range(2, H, 3))
    glow = txt(w / 2, 16, label, a).replace("/>", ' filter="url(#b)" opacity="0.9"/>')
    return wrap(w, '<defs><filter id="b" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="1.4"/></filter>'
        f'<clipPath id="c"><rect {box}/></clipPath></defs>'
        f'<rect {box} fill="{mix(a, 0.1)}" stroke="{mix(a, 0.42)}"/><g clip-path="url(#c)">{scan}</g>' + glow + txt(w / 2, 16, label, tint(a, 0.15)))


# ---------- Expressive designs (original shapes and lighting) ----------
def d_gem(label, g):
    a = acc(g); w = round(tw(label) + 38); c = 6
    pts = [(c, .5), (w - c, .5), (w - .5, c), (w - .5, H - c), (w - c, H - .5), (c, H - .5), (.5, H - c), (.5, c)]
    d = rpoly(pts, 0)
    top = rpoly([(c, .5), (w - c, .5), (w - .5, c), (.5, c)], 0)
    mid = rpoly([(.5, c), (w - .5, c), (w - .5, H - c), (.5, H - c)], 0)
    bot = rpoly([(.5, H - c), (w - .5, H - c), (w - c, H - .5), (c, H - .5)], 0)
    return wrap(w, f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{tint(a, 0.35)}"/>'
        f'<stop offset="0.55" stop-color="{a}"/><stop offset="1" stop-color="{mix(a, 0.6)}"/></linearGradient>'
        f'<clipPath id="c"><path d="{d}"/></clipPath></defs>'
        f'<path d="{d}" fill="url(#g)"/><g clip-path="url(#c)">'
        f'<path d="{top}" fill="#fff" fill-opacity="0.22"/><path d="{mid}" fill="#fff" fill-opacity="0.04"/><path d="{bot}" fill="#000" fill-opacity="0.18"/></g>'
        f'<path d="{d}" fill="none" stroke="{tint(a, 0.6)}" stroke-opacity="0.8"/>' + txt(w / 2, 16, label, "#0e0e0f"))

def d_aura(label, g):
    a = acc(g); w = round(tw(label) + 36)
    box = rrect(0.5, 0.5, w - 1, H - 1, rx())
    return wrap(w, f'<defs><radialGradient id="r" cx="0.5" cy="0.5" r="0.65"><stop offset="0" stop-color="{a}" stop-opacity="0.62"/>'
        f'<stop offset="0.7" stop-color="{a}" stop-opacity="0.12"/><stop offset="1" stop-color="{a}" stop-opacity="0"/></radialGradient>'
        f'<clipPath id="c"><rect {box}/></clipPath></defs>'
        f'<rect {box} fill="#0f0f11"/><g clip-path="url(#c)"><ellipse cx="{w / 2}" cy="12" rx="{w * 0.62}" ry="15" fill="url(#r)"/></g>'
        f'<rect {box} fill="none" stroke="{mix(a, 0.45)}"/>' + txt(w / 2, 16, label, "#ffffff"))

def d_tape(label, g):
    a = acc(g); w = round(tw(label) + 34); t = 3
    left = [(t if i % 2 == 0 else 0, i * 4) for i in range(0, 7)]
    right = [(w - (t if i % 2 == 0 else 0), (6 - i) * 4) for i in range(0, 7)]
    pts = left + right
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + " Z"
    return wrap(w, f'<defs><clipPath id="c"><path d="{d}"/></clipPath></defs>'
        f'<path d="{d}" fill="{a}" fill-opacity="0.92"/><g clip-path="url(#c)"><rect x="0" y="0" width="{w}" height="9" fill="#fff" fill-opacity="0.16"/>'
        f'<rect x="0" y="{H - 3}" width="{w}" height="3" fill="#000" fill-opacity="0.12"/></g>' + txt(w / 2, 16, label, "#0e0e0f"))

def d_halftone(label, g):
    a = acc(g); w = round(tw(label) + 48)
    box = rrect(0.5, 0.5, w - 1, H - 1, rx())
    dots = ""
    for ci, x in enumerate(range(4, 30, 4)):
        for y in range(4, H, 4):
            rr = max(0.0, 1.9 - ci * 0.3)
            if rr > 0.25:
                dots += f'<circle cx="{x}" cy="{y}" r="{rr:.2f}" fill="{a}"/>'
    return wrap(w, f'<defs><clipPath id="c"><rect {box}/></clipPath></defs>'
        f'<rect {box} fill="#131315"/><g clip-path="url(#c)">{dots}</g>'
        f'<rect {box} fill="none" stroke="{mix(a, 0.5)}"/>' + txt((26 + w - 6) / 2 + 2, 16, label, "#f4f4f5"))

def d_blueprint(label, g):
    a = acc(g); w = round(tw(label) + 38)
    box = rrect(0.5, 0.5, w - 1, H - 1, rx())
    grid = "".join(f'<line x1="{x}" y1="0" x2="{x}" y2="{H}" stroke="{a}" stroke-opacity="0.16"/>' for x in range(6, w, 6))
    grid += "".join(f'<line x1="0" y1="{y}" x2="{w}" y2="{y}" stroke="{a}" stroke-opacity="0.16"/>' for y in range(6, H, 6))
    tk = 4; ticks = ""
    if not R:
        for (x, y, sx, sy) in [(0.5, 0.5, 1, 1), (w - 0.5, 0.5, -1, 1), (0.5, H - 0.5, 1, -1), (w - 0.5, H - 0.5, -1, -1)]:
            ticks += f'<path d="M{x},{y + sy * tk} V{y} H{x + sx * tk}" fill="none" stroke="{tint(a, 0.5)}" stroke-width="1.6"/>'
    return wrap(w, f'<defs><clipPath id="c"><rect {box}/></clipPath></defs>'
        f'<rect {box} fill="{mix(a, 0.13)}"/><g clip-path="url(#c)">{grid}</g>'
        f'<rect {box} fill="none" stroke="{a}" stroke-dasharray="3 2" stroke-opacity="0.85"/>{ticks}' + txt(w / 2, 16, label, tint(a, 0.7)))

def d_tab(label, g):
    a = acc(g); w = round(tw(label) + 30); tb = 5
    pts = [(0.5, H - 0.5), (0.5, 0.5), (13, 0.5), (16, tb), (w - 0.5, tb), (w - 0.5, H - 0.5)]
    d = rpoly(pts, R if R else 0)
    tabp = rpoly([(0.5, 0.5), (13, 0.5), (16, tb + 0.5), (0.5, tb + 0.5)], 0)
    return wrap(w, f'<defs><clipPath id="c"><path d="{d}"/></clipPath></defs>'
        f'<path d="{d}" fill="#18181a"/><g clip-path="url(#c)"><path d="{tabp}" fill="{a}"/></g>'
        f'<path d="{d}" fill="none" stroke="{a}"/>' + txt(w / 2, 18, label, "#f4f4f5"))

def d_beam(label, g):
    a = acc(g); w = round(tw(label) + 32)
    box = rrect(0.5, 0.5, w - 1, H - 1, rx())
    return wrap(w, f'<defs><linearGradient id="l" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="{a}" stop-opacity="0.42"/>'
        f'<stop offset="0.65" stop-color="{a}" stop-opacity="0"/></linearGradient>'
        f'<filter id="b" x="-10%" y="-100%" width="120%" height="300%"><feGaussianBlur stdDeviation="1.6"/></filter>'
        f'<clipPath id="c"><rect {box}/></clipPath></defs>'
        f'<rect {box} fill="#121214"/><rect {box} fill="url(#l)"/>'
        f'<g clip-path="url(#c)"><rect x="3" y="{H - 3}" width="{w - 6}" height="3" fill="{a}" filter="url(#b)"/>'
        f'<rect x="0" y="{H - 2}" width="{w}" height="2" fill="{tint(a, 0.25)}"/></g>'
        f'<rect {box} fill="none" stroke="#2c2c32"/>' + txt(w / 2, 15.5, label, "#ffffff"))

def d_fade(label, g):
    a = acc(g); w = round(tw(label) + 30)
    box = rrect(0.9, 0.9, w - 1.8, H - 1.8, rx(0.9) if R else 0)
    return wrap(w, f'<defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{tint(a, 0.3)}"/>'
        f'<stop offset="0.5" stop-color="{a}" stop-opacity="0.22"/><stop offset="1" stop-color="{a}" stop-opacity="0.8"/></linearGradient></defs>'
        f'<rect {box} fill="#131315" stroke="url(#s)" stroke-width="1.8"/>' + txt(w / 2, 16, label, tint(a, 0.8)))

PX = {
    'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'B': ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    'C': ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    'D': ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    'F': ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    'G': ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
    'H': ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'I': ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    'J': ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
    'K': ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    'L': ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    'M': ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    'N': ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
    'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'P': ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    'Q': ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
    'R': ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    'T': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    'U': ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'V': ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    'W': ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
    'X': ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    'Z': ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
    '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
    '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
    '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
    '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
    '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
    '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
    '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
    ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
    '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
    '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
    '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
    '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
    "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
    '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
    ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
    ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
}


def pxtext(label, x, y, s, fill, shadow=None):
    out = []; cx = x
    for ch in label.upper():
        g = PX.get(ch, PX["?"])
        for ry, row in enumerate(g):
            for rxx, c in enumerate(row):
                if c == "#":
                    if shadow:
                        out.append(f'<rect x="{cx + rxx * s + s * .5}" y="{y + ry * s + s * .5}" width="{s}" height="{s}" fill="{shadow}"/>')
                    out.append(f'<rect x="{cx + rxx * s}" y="{y + ry * s}" width="{s}" height="{s}" fill="{fill}"/>')
        cx += 6 * s
    return "".join(out)

def d_rarity(label, g):
    a = acc(g); w = round(tw(label) + 40); c = 5
    d = rpoly([(c, .5), (w - c, .5), (w - .5, c), (w - .5, H - c), (w - c, H - .5), (c, H - .5), (.5, H - c), (.5, c)], 0)
    di = rpoly([(c + 1.5, 2.5), (w - c - 1.5, 2.5), (w - 2.5, c + 1.5), (w - 2.5, H - c - 1.5), (w - c - 1.5, H - 2.5), (c + 1.5, H - 2.5), (2.5, H - c - 1.5), (2.5, c + 1.5)], 0)
    stud = lambda x: f'<path d="M{x},8.6 l2.4,3.4 l-2.4,3.4 l-2.4,-3.4 Z" fill="{tint(a, .55)}"/>'
    return wrap(w, f'<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{tint(a, .55)}"/><stop offset=".5" stop-color="{a}"/><stop offset="1" stop-color="{mix(a, .55)}"/></linearGradient>'
        f'<linearGradient id="i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{mix(a, .34)}"/><stop offset="1" stop-color="#0c0c0e"/></linearGradient><clipPath id="c"><path d="{di}"/></clipPath></defs>'
        f'<path d="{d}" fill="url(#f)"/><path d="{di}" fill="url(#i)"/><g clip-path="url(#c)"><rect x="0" y="2" width="{w}" height="7" fill="#fff" fill-opacity=".09"/></g>'
        f'<path d="{di}" fill="none" stroke="#000" stroke-opacity=".5"/>' + stud(8) + stud(w - 8) + txt(w / 2, 16, label, tint(a, .82)))

def d_pixel(label, g):
    a = acc(g); s = 2; w = (len(label) * 6 * s - s) + 22; h = H; st = 2
    if R:
        pts = [(4, 0), (w - 4, 0), (w - 4, 2), (w - 2, 2), (w - 2, 4), (w, 4), (w, h - 4), (w - 2, h - 4), (w - 2, h - 2), (w - 4, h - 2), (w - 4, h), (4, h), (4, h - 2), (2, h - 2), (2, h - 4), (0, h - 4), (0, 4), (2, 4), (2, 2), (4, 2)]
    else:
        pts = [(st, 0), (w - st, 0), (w - st, st), (w, st), (w, h - st), (w - st, h - st), (w - st, h), (st, h), (st, h - st), (0, h - st), (0, st), (st, st)]
    cs = 4 if R else st
    d = "M" + " L".join(f"{x},{y}" for x, y in pts) + " Z"
    return wrap(w + 2, f'<g transform="translate(2 2)"><path d="{d}" fill="#000" fill-opacity=".55"/></g><g transform="translate(0 -1)"><path d="{d}" fill="{mix(a, .28)}"/>'
        f'<path d="M{cs},1 H{w - cs}" stroke="{tint(a, .5)}" stroke-width="2" fill="none"/><path d="M{cs},{h - 1} H{w - cs}" stroke="#000" stroke-opacity=".5" stroke-width="2" fill="none"/>'
        + pxtext(label, 11, 5.5, s, tint(a, .75), "#000") + '</g>')

def d_arcade(label, g):
    a = acc(g); w = round(tw(label) + 40); box = rrect(.5, .5, w - 1, H - 1, rx(.5))
    top = txt(w / 2, 16, label, "#000").replace("/>", ' stroke="#000" stroke-width="3.2" stroke-linejoin="round"/>')
    scan = "".join(f'<line x1="0" y1="{y}" x2="{w}" y2="{y}" stroke="#fff" stroke-opacity=".05"/>' for y in range(1, H, 3))
    return wrap(w + 1, f'<defs><linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{tint(a, .62)}"/><stop offset=".5" stop-color="{tint(a, .62)}"/><stop offset=".5" stop-color="{a}"/><stop offset="1" stop-color="{a}"/></linearGradient>'
        f'<clipPath id="c"><rect {box}/></clipPath></defs><rect {box} fill="#0c0a18"/><g clip-path="url(#c)">{scan}'
        f'<rect x="0" y="0" width="{w}" height="2.2" fill="{a}"/><rect x="0" y="{H - 2.2}" width="{w}" height="2.2" fill="{a}"/></g><rect {box} fill="none" stroke="{a}" stroke-opacity=".6"/>'
        f'<g transform="translate(1.2 1.4)">' + txt(w / 2, 16, label, "#000") + '</g>' + top + txt(w / 2, 16, label, "url(#t)"))

def d_chrome(label, g):
    a = acc(g); w = round(tw(label) + 34); box = rrect(.5, .5, w - 1, H - 1, rx()); t = lambda k: mix(tint(a, .55), k)
    return wrap(w, f'<defs><linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f7fb"/><stop offset=".46" stop-color="{t(.82)}"/><stop offset=".5" stop-color="{t(.38)}"/><stop offset=".74" stop-color="{t(.7)}"/><stop offset="1" stop-color="#e9eaf0"/></linearGradient></defs>'
        f'<rect {box} fill="url(#m)" stroke="#4a4a52"/><rect {rrect(1.5, 1.5, w - 3, H - 3, max(0, R - 1.5) if R else 0)} fill="none" stroke="#fff" stroke-opacity=".75"/>'
        f'<g transform="translate(0 .8)">' + txt(w / 2, 16, label, "#ffffff") + '</g>' + txt(w / 2, 16, label, "#1d1d24"))

def d_pastel(label, g):
    a = acc(g); w = round(tw(label) + 32); box = rrect(.5, .5, w - 1, H - 1, rx() or 6)
    return wrap(w, f'<rect {box} fill="{tint(a, .84)}" stroke="{tint(a, .5)}"/>' + txt(w / 2, 16, label, mix(a, .36)))

def d_stack(label, g):
    a = acc(g); code = CODES.get(g, "TAG")
    lw = F11.getlength(label) * 1.05 * (11 / 12.5); cw = F8.getlength(code) * 1.05 * (6 / 9.5) + len(code) * 0.5
    w = round(max(lw, cw) + 28); box = rrect(.5, .5, w - 1, H - 1, rx())
    return wrap(w, f'<defs><clipPath id="c"><rect {box}/></clipPath></defs><rect {box} fill="#18181a"/><g clip-path="url(#c)"><rect x="0" y="0" width="3.5" height="{H}" fill="{a}"/></g><rect {box} fill="none" stroke="#3a3a40"/>'
        + outline(code, (w + 3.5) / 2, 8.4, a, 6) + outline(label, (w + 3.5) / 2, 19, "#f4f4f5", 11))

def d_orb(label, g):
    a = acc(g); w = round(tw(label) + 48); box = rrect(8, 1.5, w - 8.5, H - 3, rx(2) or 6)
    return wrap(w, f'<defs><linearGradient id="o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{tint(a, .45)}"/><stop offset="1" stop-color="{mix(a, .78)}"/></linearGradient></defs>'
        f'<rect {box} fill="#17171a" stroke="#3a3a40"/><circle cx="12.5" cy="12" r="10.5" fill="url(#o)" stroke="#0b0b0d" stroke-opacity=".55"/><g transform="translate(6.5 6)">{icon(g, "#101012")}</g>' + txt((24 + w) / 2 + 1, 16, label, "#f4f4f5"))

DESIGN_CAT = {}
for _c, _ks in [("Soft", ["pill", "capsule", "glass", "sticker", "pastel"]),
                ("Sharp", ["notch", "plate", "brutal", "slash", "ribbon", "stamp", "ticket", "stack"]),
                ("Technical", ["terminal", "lcd", "hatch", "brackets", "neon", "duotone", "pixel", "arcade"]),
                ("Minimal", ["underline", "bare", "shine", "dot", "glyph"]),
                ("Expressive", ["gem", "aura", "tape", "halftone", "blueprint", "tab", "beam", "fade", "rarity", "chrome", "orb"])]:
    for _k in _ks:
        DESIGN_CAT[_k] = _c
# designs whose corners do not matter: one set serves both Corners options
NOROUND = {"underline", "pill", "capsule", "bare", "shine", "dot", "gem", "tape"}
DESIGNS = {"pill": d_pill, "capsule": d_capsule, "bare": d_bare, "shine": d_shine, "dot": d_dot, "slash": d_slash, "glass": d_glass, "neon": d_neon, "sticker": d_sticker, "ribbon": d_ribbon, "lcd": d_lcd, "glyph": d_glyph, "notch": d_notch, "plate": d_plate, "brackets": d_brackets, "underline": d_underline, "terminal": d_terminal,
           "brutal": d_brutal, "hatch": d_hatch, "duotone": d_duotone, "ticket": d_ticket, "stamp": d_stamp,
           "gem": d_gem, "aura": d_aura, "tape": d_tape, "halftone": d_halftone, "blueprint": d_blueprint, "tab": d_tab, "beam": d_beam, "fade": d_fade, "rarity": d_rarity, "pixel": d_pixel, "arcade": d_arcade, "chrome": d_chrome, "pastel": d_pastel, "stack": d_stack, "orb": d_orb}
for k, lab in [("notch", "Notch"), ("plate", "Plate"), ("brackets", "Brackets"), ("underline", "Underline"), ("terminal", "Terminal"),
               ("brutal", "Brutal"), ("hatch", "Hatch"), ("duotone", "Duotone"), ("ticket", "Ticket"), ("stamp", "Stamp"), ("glyph", "Glyph"), ("pill", "Pill"), ("capsule", "Capsule"), ("bare", "Bare"), ("shine", "Shine"), ("dot", "Dot"), ("slash", "Slash"), ("glass", "Glass"), ("neon", "Neon"), ("sticker", "Sticker"), ("ribbon", "Ribbon"), ("lcd", "LCD"), ("gem", "Gem"), ("aura", "Aura"), ("tape", "Tape"), ("halftone", "Halftone"), ("blueprint", "Blueprint"), ("tab", "Tab"), ("beam", "Beam"), ("fade", "Fade"), ("rarity", "Rarity"), ("pixel", "Pixel"), ("arcade", "Arcade"), ("chrome", "Chrome"), ("pastel", "Pastel"), ("stack", "Stack"), ("orb", "Orb")]:
    PRESETS.append(dict(key=k, label=lab, art=True, style="bordered", fill="none", border="none", text="#ffffff",
                        cat=DESIGN_CAT[k], **({"noround": True} if k in NOROUND else {})))

ROUND_R = 8
import shutil, subprocess, tempfile
SVG_TMP = tempfile.mkdtemp(prefix="chip-svg-")
shutil.rmtree(os.path.join(OUT, "badges"), ignore_errors=True)
SETS = []   # (preset, suffix) pairs that get artwork
for _round in (0, ROUND_R):
    R = _round
    for pr in PRESETS:
        if R and pr.get("noround"):
            continue
        sfx_ = "-round" if R else ""
        SETS.append((pr, sfx_))
        d = os.path.join(SVG_TMP, pr["key"] + sfx_)
        os.makedirs(d, exist_ok=True)
        for g, i, name, pat, on in B:
            if pr.get("art"):
                out = DESIGNS[pr["key"]](name, g)
            else:
                o = pr.get("groups", {}).get(g, {})
                out = svg(name, pr["fill"], o.get("border", pr["border"]), o.get("text", pr["text"]))
            with open(os.path.join(d, i + ".svg"), "w") as f:
                f.write(out)
        if pr.get("art"):
            td = os.path.join(SVG_TMP, pr["key"] + "-tier" + sfx_)
            os.makedirs(td, exist_ok=True)
            for g, i, name, pat, on in B:
                if tier_has_variant(i, g):
                    ACC[0] = TIER_COL[tier_of(i, g)]
                    out = DESIGNS[pr["key"]](name, g)
                    ACC[0] = None
                    with open(os.path.join(td, i + ".svg"), "w") as f:
                        f.write(out)
            SETS.append((dict(key=pr["key"] + "-tier"), sfx_))
R = 0

# ---------- Starter packs: one click switches the right badges on and the rest off ----------
PACKS = [
    dict(key="recommended", label="Recommended", desc="The default set: most categories, common badges.", rec=True),
    dict(key="minimal", label="Minimal", desc="Just the essentials, so streams stay uncluttered.",
         ids=["r-4k", "r-1080", "r-720", "q-remux", "q-bluray", "q-webdl", "v-dv", "v-hdr10p", "v-hdr10", "v-hdr", "a-atmos", "a-truehd", "w-lowq"]),
    dict(key="remux", label="Remux hunter", desc="Top-quality sources, HDR, lossless audio and the best-match tags.",
         ids=["r-8k", "r-4k", "r-1080", "q-remux", "q-bluray", "v-dv", "v-hdr10p", "v-hdr10", "v-hdr", "v-imax", "v-10bit", "c-hevc", "c-av1",
              "a-atmos", "a-truehd", "a-dtsx", "a-dtshdma", "h-71", "e-hybrid", "x-top", "x-remux4k", "x-4khdr", "w-lowq", "w-upscale"]),
    dict(key="anime", label="Anime", desc="Dual audio, subtitles, batches and the codecs fansubs use.",
         ids=["r-1080", "r-720", "r-480", "q-bluray", "q-webdl", "q-webrip", "v-10bit", "c-hevc", "c-av1", "c-avc", "a-flac", "a-aac", "a-opus",
              "a-dual", "a-multi", "l-ja", "l-en", "l-msub", "l-hsub", "e-pack", "e-seadex", "s-cr", "s-fun", "w-lowq", "w-upscale", "w-dub"]),
    dict(key="audio", label="Audio nerd", desc="Every audio format and channel layout, plus the resolution.",
         groups=["ga", "gh"], ids=["r-4k", "r-1080", "r-720", "q-remux", "w-lowq"]),
    dict(key="languages", label="Languages", desc="Every language, subtitle and dual-audio tag.",
         groups=["gl"], ids=["a-dual", "a-multi", "r-4k", "r-1080", "r-720", "w-lowq", "w-dub"]),
    dict(key="everything", label="Everything", desc="All badges on. Good for checking what matches.", all=True),
]
_known = {b[1] for b in B}
for _p in PACKS:
    for _i in _p.get("ids", []):
        assert _i in _known, "unknown id in pack: " + _i

# ---------- PNG renders (what Nuvio actually loads) ----------
# Nuvio's own examples and Badger use PNG for image badges, and its SVG support is unverified, so every design is
# rendered to a 4x PNG (needs the rsvg-convert tool). The SVG sources live in a scratch folder and are not committed.
for _pr, _sfx in SETS:
    _d = os.path.join(OUT, "badges", _pr["key"] + _sfx)
    os.makedirs(_d, exist_ok=True)
    _src = os.path.join(SVG_TMP, _pr["key"] + _sfx)
    for _f in sorted(os.listdir(_src)):
        subprocess.run(["rsvg-convert", "-z", "4", "-f", "png", "-o", os.path.join(_d, _f[:-4] + ".png"),
                        os.path.join(_src, _f)], check=True)
if os.environ.get("CHIP_KEEP_SVG"):
    print("SVG sources kept in", SVG_TMP)
else:
    shutil.rmtree(SVG_TMP, ignore_errors=True)

# ---------- versions ----------
# SITE_V: bump when index.html, app.js or style.css change. It stamps the ?v= query strings and data-v in index.html,
# so browsers fetch matching files and the page can warn if it ever runs mismatched ones.
# ART_V: a hash of all artwork. It is appended to image URLs in exported packs, so an app that caches images by
# URL (Nuvio) downloads them again when the artwork changes.
import hashlib
SITE_V = "29"
_h = hashlib.sha1()
for _r, _d, _fs in sorted(os.walk(os.path.join(OUT, "badges"))):
    for _f in sorted(_fs):
        _h.update(open(os.path.join(_r, _f), "rb").read())
ART_V = _h.hexdigest()[:8]

# ---------- catalog.js ----------
ids = [b[1] for b in B]
assert len(ids) == len(set(ids)), "duplicate ids"
gids = {g for g, _ in GROUPS}
assert all(b[0] in gids for b in B)

catalog = {
    "groups": [{"id": g, "name": n} for g, n in GROUPS],
    "badges": [dict({"id": i, "g": g, "n": n, "p": p, "on": bool(on), "t": tier_of(i, g)}, **({"tv": 1} if tier_has_variant(i, g) else {})) for g, i, n, p, on in B],
    "tiers": TIER_COL,
    "presets": PRESETS,
    "palette": SPECTRUM,
    "codes": CODES,
    "samples": SAMPLES,
    "credits": CREDITS,
    "artV": ART_V,
    "roundR": ROUND_R,
    "packs": PACKS,
}
with open(os.path.join(OUT, "catalog.js"), "w") as f:
    f.write("// Generated by build.py - edit the catalog there, not here.\n")
    f.write("window.CATALOG = " + json.dumps(catalog, indent=1, ensure_ascii=True) + ";\n")
    f.write('window.CHIP_V = "%s";\n' % SITE_V)
# ---------- glyphs.js: lettering data so the browser can draw custom badges in any built-in design ----------
def _emit_glyphs():
    chars = [chr(c) for c in list(range(32, 127)) + list(range(160, 256))] + list("\u2022\u00b7\u2026\u2019\u201c\u201d\u2013\u2014\u20ac")
    out = {"inter": {}, "mono": {}, "pil": {"14": {}, "12.5": {}, "9.5": {}}}
    for key, path in (("inter", INTER), ("mono", MONO_FILE)):
        f, gs, cmap, upm, hmtx = _font(path)
        out[key]["upm"] = upm
        gl = {}
        for ch in chars:
            n = cmap.get(ord(ch))
            if not n:
                continue
            pen = SVGPathPen(gs, ntos=lambda v: ("%d" % round(v)))
            gs[n].draw(pen)
            gl[ch] = [hmtx[n][0], pen.getCommands()]
        out[key]["g"] = gl
    for size, fnt in (("14", FONT), ("12.5", F11), ("9.5", F8)):
        for ch in chars:
            out["pil"][size][ch] = round(fnt.getlength(ch), 3)
    asc = [chr(c) for c in range(32, 127)]
    out["kern"] = {}
    for x in asc:
        for y in asc:
            dk = FONT.getlength(x + y) - FONT.getlength(x) - FONT.getlength(y)
            if abs(dk) > 1e-6:
                out["kern"][x + y] = round(dk, 3)
    with open(os.path.join(OUT, "glyphs.js"), "w") as fh:
        fh.write("// Generated by build.py. Lettering data (Inter Bold, DejaVu Sans Mono Bold) used to draw custom badges.\n")
        fh.write("window.GLYPHS = " + json.dumps(out, ensure_ascii=True, separators=(",", ":")) + ";\n")
_emit_glyphs()
for _page in ("index.html", "formatter.html", "regex.html"):
    _ip = os.path.join(OUT, _page)
    if not os.path.exists(_ip):
        continue
    _t = open(_ip).read()
    _t = re.sub(r'data-v="[^"]*"', 'data-v="%s"' % SITE_V, _t)
    _t = re.sub(r'(href="style\.css|href="formatter\.css|href="regex\.css|src="formatter-data\.js|src="regex\.js|src="catalog\.js|src="app\.js|src="formatter-engine\.js|src="formatter\.js|src="glyphs\.js|src="designs\.js)(\?v=[^"]*)?"', lambda m: '%s?v=%s"' % (m.group(1), SITE_V), _t)
    open(_ip, "w").write(_t)
print(len(B), "badges,", len(GROUPS), "groups,", len(PRESETS), "presets")
