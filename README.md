<div align="center">

<img src="assets/social-preview.png" alt="Chip: Fusion badge packs for Nuvio" width="720">

# Chip

**Pick badges, style them, design your own, export a pack for Nuvio.**
Minimal, square-edged, entirely in your browser.

[![Open the site](https://img.shields.io/badge/open%20the%20site-aljaz--h.github.io%2Fchip-f4f4f5?style=flat-square&labelColor=121213)](https://aljaz-h.github.io/chip/)

</div>

---

Chip is a static editor for Nuvio Fusion stream badge packs. There is no server, no account and no build step. Everything runs in your browser and nothing is uploaded.

<img src="assets/screenshot-main.png" alt="Chip start screen with starter packs and the live preview" width="100%">

## How to use it

1. Open **[aljaz-h.github.io/chip](https://aljaz-h.github.io/chip/)**.
2. Start from a **starter pack** (or switch badges on and off yourself), pick a **look**, and check it against real stream titles in the preview. A look is either a *palette + fill style* (Nuvio draws it, nothing to host) or one of the *designs* (artwork images).
3. In **Export**, choose **GitHub Gist** (recommended). Create a token that only has the *gist* permission (the button opens the right page), paste it once, and click **Publish to Gist**. You get a link pinned to that version. Each time you update the pack you get a new link, because that is what makes Nuvio and GitHub fetch the fresh copy instead of a cached one. No token? Use **Manual Gist**: it copies the pack and opens gist.github.com, and the site turns your gist's address into the link.
4. In Nuvio open **Settings → Streams → Fusion badge URLs** (Android TV: **Settings → Layout → Streams**), paste the link, tap **Import**, then select it as the active pack. Menu labels can differ between versions.

## What it does

- **112 badges in 12 categories**: resolution, source, video/HDR, codec, audio, channels, streaming service, language, release/edition, provider/cache, **warnings** (low quality, upscaled, sample, dubbed) and **best match** combinations (for example 4K + HDR + lossless audio).
- **Starter packs**: Recommended, Minimal, Remux hunter, Anime, Audio nerd, Languages and Everything. One click sets which badges are on.
- **Palette + fill style**: pick a palette (Ash, White, Black, Paper, Slate, Ember, Sage, Lime, Spectrum, or your own color), then choose Filled, Bordered, Filled + border or Soft. Nuvio draws these itself, so nothing needs hosting.
- **Color by group or importance**: by group, each category has its own color. By importance, the best facts (4K, Remux, Dolby Vision, lossless audio, cached) are gold, quiet detail (codec, channels, services, editions) is muted and warnings are red, with everything else keeping its group color. It works with every palette and design.
- **Tone: Color, Mono or B/W**: keep a shape you like and change only its colors. Mono shades every badge from one color you choose, B/W uses black, white and greys. It applies to every palette, design and custom design. The recolored images are made in your browser and embedded in the pack, so nothing needs hosting. Borrowed images keep their own colors.
- **Rounded or sharp corners** for every design. Rounded is the default because Nuvio clips badges to a curve; sharp is there for if that changes.
- **29 designs in five groups** drawn as artwork (PNG, rendered from SVG): *Soft* (Pill, Capsule, Glass, Sticker), *Sharp* (Notch, Plate, Brutal, Ticket, Stamp, Slash, Ribbon), *Technical* (Brackets, Terminal, Hatch, Duotone, Neon, LCD) and *Minimal* (Underline, Glyph, Bare, Shine, Dot) and *Expressive* (Gem, Aura, Tape, Halftone, Blueprint, Tab, Beam, Fade). Glyph uses a small generic icon per category, no brand logos.
- **Your own design**, built in five layers (shape, fill, border, colors, content) plus text, with a live preview and a contrast warning. Start from any recipe.
- **Borrow images from another pack**: paste a pack's link and Chip uses its logo images for the badges it recognizes (matched by name). The images stay on the other author's server and they are credited on the page.
- **Live preview** against stream titles you paste, a coverage report (titles that get no badge, badges that never matched) and a health check on the pack.
- **Save or share your setup** as a file or a link that rebuilds it anywhere. It never includes your GitHub token.
- **Import** an existing pack by paste, file or raw URL, edit it, and export it again.
- Reorder badges and categories, and add your own badges with a custom regex.
- **Formatter builder** (`formatter.html`): write and preview AIOStreams custom formatter templates (name and description), start from six presets, insert fields and modifiers from a palette, test against sample streams you can edit, and check which template fields repeat what your badges already show. Share it as a link or copy the text.
- **Auto-play regex builder** (`regex.html`): tick what you want and never want, and get the one pattern Nuvio's *Auto-play regex match* uses. A tester shows which stream Nuvio would play (the first playable match in list order), with presets, three profiles to compare, checks for common pattern mistakes, and your formatter's output or pasted stream text as test data.

<img src="assets/screenshot-style.png" alt="Palettes, fill styles and the grouped designs" width="100%">

<img src="assets/screenshot-designer.png" alt="The Your design builder, grouped into layers" width="100%">

<img src="assets/screenshot-formatter.png" alt="The formatter builder with presets, editor and live preview" width="100%">

<img src="assets/screenshot-regex.png" alt="The auto-play regex builder with a live tester" width="100%">

## Using your own design

Your design is drawn in your browser as one PNG per badge.

- **Embedded (default):** the images go inside the JSON, so the Gist link alone is enough and nothing needs hosting. Badger works the same way. If badges come out empty in Nuvio, untick *Embed* in Export.
- **Hosted:** click **Download artwork (ZIP)**, unzip it into your repo's `badges/` folder so the files sit at `badges/custom/`, commit and push, and leave **Hosted at** empty (it points at the site's own `badges/` folder).

## Run your own copy

Fork the repo, then **Settings → Pages → Deploy from a branch → `main` / root**. Change `aljaz-h` in `index.html` (link previews) and `README.md` to your own account.

## Project layout

| Path | What it is |
| --- | --- |
| `index.html`, `style.css`, `app.js` | The badge editor: plain HTML, CSS and JavaScript, no build step |
| `formatter.html`, `formatter.css`, `formatter.js`, `formatter-engine.js`, `formatter-data.js` | The AIOStreams formatter builder, its small template interpreter and shared sample streams |
| `regex.html`, `regex.css`, `regex.js` | The Nuvio auto-play regex builder and tester |
| `catalog.js` | Generated: badges, patterns, presets, starter packs, credits |
| `badges/` | Generated artwork, one folder per design (`<design>/` and `<design>-round/`, plus `-tier` folders for the importance colors), 4x PNG |
| `tools/build.py` | Generates `catalog.js` and the artwork |
| `assets/` | README screenshots and the social preview |

## Changing or adding badges

The catalog, palettes, designs and starter packs live in `tools/build.py`. Edit the `B` list (badges), `PRESETS` (palettes), the `d_*` functions (designs) or `PACKS` (starter packs), then regenerate:

```
pip install pillow fonttools
sudo apt install librsvg2-bin    # provides rsvg-convert
python3 tools/build.py .
```

The script draws every label as vector outlines using Inter Bold and DejaVu Sans Mono Bold. It reads them from Linux paths (`INTER` and `MONO_FILE`), so change those to any bold fonts on your machine. Artwork is written as SVG to a scratch folder and rendered to PNG with `rsvg-convert`. Set `CHIP_KEEP_SVG=1` to keep the SVG sources. When you change `index.html`, `app.js` or `style.css`, bump `SITE_V` in `build.py` and run it again: it stamps the `?v=` cache-busting tags and the version check.

## Honest limits

- Your GitHub token is kept only in your browser and sent only to `api.github.com`. It is remembered only if you tick the box. Use a token with just the *gist* permission.
- I tried free paste sites (paste.rs, dpaste) for one-click links and removed them: an Android device rejected dpaste's security certificate during import, and paste sites can expire links. Gist links worked.
- I checked Chip's badges in Nuvio and they work for me. That is one person on one setup, so please report what you see on yours. Embedded images (your own design and the Mono and B/W tones) rely on the same approach as Badger. If badges show up empty, untick *Embed* and host the ZIP instead. Borrowed images depend on the other pack staying online.
- Patterns are tested here with JavaScript regex. Nuvio uses its own engine, so check a few real streams after importing.
- The **Provider / Cache** category depends on how your addon words its results (for example `[RD+]`). Adjust those patterns to match what you see.
- Badges match *text*. A badge says what the release name says, not what the file contains.
- Not every design has been tried on every device. My first version used SVG files, and Nuvio showed the shapes with no label inside. Badger and Nuvio's own examples use PNG for image badges, so every design now ships as a 4x PNG, with labels drawn as outlines, and image links carry a `?v=` tag so Nuvio fetches new files instead of cached ones. If something looks wrong, [open an issue](https://github.com/aljaz-h/chip/issues/new/choose) and say which design, which Nuvio version and which device.
- The pack format (`groups` and `filters` with `tagStyle`, colors, `imageURL`) was taken from public Nuvio documentation and public packs. The tag style `filled` is assumed from Badger's own example. `bordered` and `filled and bordered` appear in public packs.

- The formatter preview is my own interpreter of the template syntax, checked against AIOStreams v2.37.0. It skips `where`, `pluck`, `each` and `date`, uses a short built-in language list, and your instance's version decides what really renders.
- The regex tester follows how Nuvio's open source selectors behave (case-insensitive, text-only match, first playable match wins, skip words pulled out of negative lookaheads). It tests with JavaScript regex while Nuvio uses Java-style regex, and the sample streams are invented, so check real streams after pasting.

## License

[MIT](LICENSE). Credits for ideas and tools that came before are in [CREDITS.md](CREDITS.md).

## Credits

The formatter syntax belongs to [AIOStreams](https://github.com/Viren070/AIOStreams) by Viren070 (AGPL-3.0); Chip includes none of its code. Chip follows an idea other people built first. See **[CREDITS.md](CREDITS.md)**, in particular [Badger](https://github.com/Nintle/Badger) by Nintle and [Nuvio Badge Studio](https://itsvoidog.github.io/nuvio-badge-studio/) by Voidxo. The catalog, patterns, artwork and code in this repository were written for this project.

Not affiliated with Nuvio, Stremio or any streaming service. Names belong to their owners.
