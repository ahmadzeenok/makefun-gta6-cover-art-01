[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/ahmadzeenok/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/ahmadzeenok/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Built for the [Make GTA 6 Cover Art bounty](https://make.fun/bounty/gta6-cover-art-01) on make.fun.

# Neon Vice Cover Studio

A fan-made, offline web app that turns your photos and a caption into
GTA-style multi-panel cover art — the poster look with bold lettering and a
Vice City sunset / neon grade — and exports it as a PNG to share.

**Fan-made concept art. Not affiliated with Rockstar Games.** No Rockstar
logo, artwork, character or font is used anywhere. The lettering is Anton and
Pacifico, both under the SIL Open Font License (see `app/fonts/OFL.txt`). The
four sample photos are fictional people made with an image model.

## How to run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no network:
every script, font and sample photo is a file under `app/`, and your photos
are read on your own machine and never uploaded.

## Features

- **4 photo panels** — upload a photo per panel, or pick a bundled sample.
  Click a panel to select it, drag the photo inside it to position it, and
  zoom with the panel slider. One photo can fill all four panels.
- **4 layouts** — Hero + 3 (big left hero, three stacked right), Grid 2×2,
  Full-bleed (one photo + title band), Tilted stack (overlapping tilted
  snapshots).
- **4 grades** — Vice Sunset (magenta/orange), Neon Night (teal/pink),
  Golden Hour (amber), Mono Noir.
- **Caption** — editable title in Anton (uppercase, black outline + neon
  shadow) and a neon script subtitle in Pacifico, plus film grain and
  vignette toggles.
- **One-click PNG export** — 1080×1080, 1080×1350 and 1920×1080, or all
  three at once.

## Screenshots

`?shot=` fixes a reproducible scene for screenshots: `?shot=cover` draws the
exported cover full-viewport; `?shot=editor` shows the studio with photos
loaded. The query also takes `layout`, `grade`, `size` (square / portrait /
wide), `photos` (comma-separated sample names), `title` and `subtitle`.
See `shots.json`.

## Handing it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored `vendor/makefun-app.ts` library.

## License

MIT — see `LICENSE`.
