# The Vault Room

A top-down vault-room heist game: cross one big vault room as a thief, slip past
guards with vision cones and sweeping wall cameras, crack the vault, grab the
gems, and get out the exit door before the alarm meter fills. Three stages, same
room, more eyes and faster patrols each time.

[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Ipan8/heist-vault-room/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Ipan8/heist-vault-room/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

Built for the [make.fun "Make the best heist game" bounty](https://make.fun/bounty/best-heist-game-20261122-0559).

## Play

Open `game/index.html` in a desktop browser (or run `node serve.ts` and open
http://localhost:8080). No network, no build step — all art is drawn in code and
all sound is synthesised with WebAudio.

- **Move:** WASD / arrow keys — **Shift** sneaks (slower, halves alarm fill)
- **Crack the vault:** stand in the gold vault zone and hold **E** (2.2 s)
- **Toss a coin:** **C** throws a coin to the mouse position (costs 25 points);
  guards within range walk over to look for 3 s
- **Pause:** P — **Retry stage:** R — **Next stage:** N — **Mute:** M

Guards patrol waypoint loops and cameras sweep the room. While any of them sees
you the alarm fills; while hidden it drains. At 100 the stage is busted. Crack
the vault (+500), collect the 3 gems (+100 each), then reach the exit door for
the getaway and the stage-clear bonus (time + quiet).

## Layout

- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to `/output` and
  writes `dossier.json`
- `game/index.html` + `game/src/` — the game: `config.js` (tuning),
  `random.js` (seeded RNG), `audio.js` (synth), `level.js` (room + stages),
  `vision.js` (line of sight + cones), `input.js` (keyboard + mouse),
  `render.js` (all painting + screens), `main.js` (loop, guard AI, alarm,
  crack, scoring), `shots.js` (staged screenshot scenes)
- `screenshots/` — 4 real renders of the game
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

License: MIT (see `LICENSE`).
