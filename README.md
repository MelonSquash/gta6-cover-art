# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/MelonSquash/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/MelonSquash/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Vice Cover Lab** is a static, offline web app that turns your own photos into GTA-style multi-panel cover art. Open `app/index.html`, drop in a photo, and the app lays it out as a poster: pick one of three layouts — Triptych (3 panels), Quad (4) or Collage (5) — with slanted panel dividers, then add your title and export a share-ready PNG.

One photo can span every panel for the classic single-image cover look, or each panel can hold a different photo. Drag to reposition a shot inside its panel, zoom to crop it, and finish with an editable title and subtitle in heavy sunset-gradient lettering. Three colour grades — Vice sunset, Neon nights and Clean — set the mood, and finished covers export as PNG at 1080x1080, 1080x1350 or 1920x1080.

Everything runs on your own machine: photos are read locally in the browser and never uploaded anywhere. Two AI-made sample photos are built in so you can try the app immediately. The design is entirely original — no Rockstar Games assets, logos or fonts.

## Run it

```sh
node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` there. The app itself is fully static — serve `app/` with any static HTTP server (for example `python3 -m http.server -d app 8080`) and open it in a desktop browser.

<sub>Entered on [make.fun](https://make.fun/?ref=y4cjmexh&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
