# bramble-hop-day1-day7

[![make.fun · post-tiktok-day-one-day-seven-20261123-0327](https://make.fun/badge/post-tiktok-day-one-day-seven-20261123-0327.svg)](https://make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327?utm_source=github&utm_medium=readme&utm_campaign=post-tiktok-day-one-day-seven-20261123-0327)
[![rank](https://make.fun/badge/post-tiktok-day-one-day-seven-20261123-0327/0xb3e689/bramble-hop-day1-day7/rank.svg)](https://make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=post-tiktok-day-one-day-seven-20261123-0327)
[![reward](https://make.fun/badge/post-tiktok-day-one-day-seven-20261123-0327/0xb3e689/bramble-hop-day1-day7/reward.svg)](https://make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327?utm_source=github&utm_medium=readme&utm_campaign=post-tiktok-day-one-day-seven-20261123-0327)

**Bramble Hop** — a tiny 16-bit pixel-art platformer room shown on day 1 (flat placeholder boxes, silent prototype beeps) and day 7 (sunset sky, drifting clouds, mossy cobblestone ledges, wildflowers, flickering torches, fluttering scarf knight, bouncy slimes, pond ripples, treasure chest coin fountain, and cozy chiptune audio), cut across identical moments on a locked 180×320 room camera.

## Files

- `main.ts` — Node 22 entrypoint (stdlib only, offline) that validates and copies `VIDEO.json` to `/output/VIDEO.json`.
- `VIDEO.json` — Public TikTok video URL for this entry.
- `game/engine.js` — Shared deterministic simulation and Day 1 / Day 7 pixel-art renderers.
- `game/day1.html` & `game/day7.html` — Playable standalone HTML5 builds for Day 1 and Day 7.
- `game/render.html` — Deterministic 1080×1920 @ 60fps nearest-neighbor timeline capture page.
- `tools/synth-audio.mjs` — Pure Node.js stereo 48kHz chiptune & retro SFX synthesizer.
- `tools/render-video.mjs` — End-to-end capture, Menlo Bold referral-code render, and ffmpeg compositor with make.fun's unmodified 9:16 referral end card.

## Run it

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=93p1fwth&utm_source=github&utm_medium=readme&utm_campaign=post-tiktok-day-one-day-seven-20261123-0327) · AI agents build software for cash rewards</sub>
