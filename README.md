<div align="center">

<img src="assets/social-preview.png" alt="Chip: Fusion badge packs for Nuvio" width="720">

# Chip

**Pick badges, style them, design your own, export a pack for Nuvio.**
Minimal, square-edged, entirely in your browser.

[![Open the site](https://img.shields.io/badge/open%20the%20site-aljaz--h.github.io%2Fchip-f4f4f5?style=flat-square&labelColor=121213)](https://aljaz-h.github.io/chip/)

</div>

---

Chip is a static editor for Nuvio Fusion stream badge packs. There is no server, no account and no build step. Everything runs in your browser and nothing is uploaded.

<img src="assets/screenshot-main.png" alt="Chip main screen with the Plate design applied" width="100%">

## How to use it

1. Open **[aljaz-h.github.io/chip](https://aljaz-h.github.io/chip/)**.
2. Pick a look, switch the badges you want on or off, and check them against real stream titles in the preview.
3. Click **Create import URL** and copy the link. Nuvio asks for a link to the JSON, not the JSON itself.
4. In Nuvio open **Settings → Streams → Fusion badge URLs** (Android TV: **Settings → Layout → Streams**), paste the link, tap **Import**, then select it as the active pack. Menu labels can differ between versions. Nuvio stores the rules on import, so the badges keep working if the link later expires.

Want a link you can edit and re-import later? Put the JSON in a public GitHub Gist and use its raw link. The site has a small converter for Gist and Pastebin links.

## What it does

- **105 badges in 10 categories**: resolution, source, video/HDR, codec, audio, channels, streaming service, language, release/edition, and provider/cache.
- **10 color presets**: Ash, White, Outline, Black, Paper, Slate, Ember, Sage, Lime, Spectrum.
- **10 experimental designs** drawn as SVG artwork: Notch, Plate, Brackets, Underline, Terminal, Brutal, Hatch, Duotone, Ticket, Stamp.
- **Your own design**: shape, border, fill, accent bar, category tag, shadow, font, spacing, and an accent color per category, with a live preview and a contrast warning.
- **Live preview** against stream titles you paste, plus a health check on the pack.
- **Import** an existing pack by paste, file or raw URL, edit it, and export it again.
- Reorder badges and categories, and add your own badges with a custom regex.

<img src="assets/screenshot-designer.png" alt="The Your design builder" width="100%">

## Using your own design

Custom designs are drawn as one SVG per badge, so Nuvio has to download them from a public address.

1. Build the design, then in **Export** click **Download artwork (ZIP)**.
2. Unzip it into your repo's `badges/` folder so the files sit at `badges/custom/`, then commit and push.
3. Leave **Hosted at** empty (it points at the site's own `badges/` folder) and import the exported JSON into Nuvio.

Re-download and re-upload the ZIP whenever you change the design or rename a badge. There is also an experimental option to embed the artwork inside the JSON (about 70 KB). It is untested in Nuvio.

## Run your own copy

Fork the repo, then **Settings → Pages → Deploy from a branch → `main` / root**. Change `aljaz-h` in `index.html` (link previews) and `README.md` to your own account.

## Changing or adding badges

The catalog and the style presets live in `tools/build.py`. Edit the `B` list (badges) or `PRESETS` (styles), then regenerate `catalog.js` and the SVGs:

```
pip install pillow
python3 tools/build.py .
```

The script reads an Inter Bold font from a Linux path near the top of the SVG section. Change it to any bold sans font on your machine.

## Honest limits

- **Create import URL** uploads your pack (badge rules only) to a public paste service, paste.rs first and dpaste as a fallback. These calls are made from your browser, and I could not test them against the live services. If your network blocks them, use **Copy JSON** and a public Gist instead.
- Patterns are tested here with JavaScript regex. Nuvio uses its own engine, so check a few real streams after importing.
- The **Provider / Cache** category depends on how your addon words its results (for example `[RD+]`). Adjust those patterns to match what you see.
- Badges match *text*. A badge says what the release name says, not what the file contains.
- Designs, including your own, are untested in Nuvio. They use basic SVG features (shapes, a gradient, clip paths, dashes) and were checked in Chrome only. Nuvio's renderer may differ slightly, and text falls back to a system font if Inter is missing.
- The pack format (`groups` and `filters` with `tagStyle`, colors, `imageURL`) was taken from public Nuvio documentation and public packs. The tag style `filled` is assumed from Badger's own example. `bordered` and `filled and bordered` appear in public packs.

## Credits

Chip follows an idea other people built first. See **[CREDITS.md](CREDITS.md)**, in particular [Badger](https://github.com/Nintle/Badger) by Nintle and [Nuvio Badge Studio](https://itsvoidog.github.io/nuvio-badge-studio/) by Voidxo. The catalog, patterns, artwork and code in this repository were written for this project.

Not affiliated with Nuvio, Stremio or any streaming service. Names belong to their owners.
