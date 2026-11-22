// shots.js — the four staged screenshot scenes, driven by ?shot= in the URL.
// Each scene sets the live state to an exact, readable moment and the main loop
// then freezes the simulation, so the shot is a still of the game itself:
//   ?shot=start   — title panel over stage 1, guards mid-patrol
//   ?shot=play    — mid-heist: thief, cones, a tossed coin, alarm at 38%
//   ?shot=end     — stage 1 cleared: VAULT CRACKED! with the bonus breakdown
//   ?shot=stage2  — stage 2, sneaking thief, SPOTTED! by a camera, alarm 62%
// After two paints the main loop sets window.__shotReady for the screenshot tool.

import { buildStage } from './level.js';

function placeGuard(stage, i, x, y, angle) {
  const g = stage.guards[i];
  g.x = x;
  g.y = y;
  g.angle = angle;
  g.wait = 0;
  g.lured = null;
  g.lookT = 0;
  g.spotting = false;
}

function placeCamera(stage, i, angle, spotting = false) {
  const c = stage.cameras[i];
  c.angle = angle;
  c.spotting = spotting;
}

export function applyShot(name, game) {
  const statusEl = document.getElementById('status');
  const say = (t) => {
    if (statusEl) statusEl.textContent = t;
  };

  if (name === 'start') {
    game.stage = buildStage(0);
    game.score = 0;
    game.scoreAtStageStart = 0;
    game.stageScore = 0;
    game.screen = 'title';
    placeGuard(game.stage, 0, 380, 260, Math.PI / 2); // facing down the gallery
    placeGuard(game.stage, 1, 820, 180, 0); // facing east
    placeCamera(game.stage, 0, 1.2);
    game.stage.timeLeft = 150;
    say('The Vault Room — press Space or click to start.');
    return true;
  }

  if (name === 'play') {
    game.stage = buildStage(0);
    game.score = 100;
    game.scoreAtStageStart = 0;
    game.stageScore = 100;
    game.screen = 'play';
    const st = game.stage;
    st.thief.x = 640;
    st.thief.y = 480;
    st.thief.angle = -Math.PI / 2; // facing up the room
    placeGuard(st, 0, 380, 330, 0.55);
    placeGuard(st, 1, 860, 180, Math.PI); // facing west, back to the thief
    placeCamera(st, 0, 1.35);
    st.gems[0].taken = true; // one gem already pocketed: score 100
    st.alarm = 38;
    st.coinsLeft = 2;
    st.coin = { x: 760, y: 420, age: 1.2, ttl: 3 }; // tossed coin, ring mid-expand
    st.timeLeft = 112;
    st.seenBy = null;
    st.spottedFlash = 0;
    say('Playing Stage 1 — The Gallery. Crack the vault, then get out!');
    return true;
  }

  if (name === 'end') {
    game.stage = buildStage(0);
    game.score = 1242;
    game.scoreAtStageStart = 74;
    game.stageScore = 1168;
    game.screen = 'clear';
    const st = game.stage;
    st.thief.x = 1140;
    st.thief.y = 640;
    st.thief.angle = Math.PI / 2;
    st.vaultOpen = true;
    st.crack = 1;
    for (const g of st.gems) g.taken = true;
    st.alarm = 12;
    st.timeLeft = 96;
    st.clearBonus = {
      vault: 500,
      gems: 300,
      time: 192,
      quiet: 176,
      total: 1168,
      timeSeconds: 96,
      alarmAtClear: 12,
    };
    say('Stage clear! Stage score 1168 — total 1242. Press N for the next stage.');
    return true;
  }

  if (name === 'stage2') {
    game.stage = buildStage(1);
    game.score = 1300; // 1150 carried + 150 earned this stage
    game.scoreAtStageStart = 1150;
    game.stageScore = 150;
    game.screen = 'play';
    const st = game.stage;
    st.thief.x = 600;
    st.thief.y = 380;
    st.thief.angle = Math.PI; // facing west, sneaking across the floor
    st.thief.sneaking = true;
    placeGuard(st, 0, 380, 300, 0);
    placeGuard(st, 1, 900, 180, Math.PI / 2);
    placeCamera(st, 0, Math.PI / 2, true); // camera 1 is spotting the thief
    placeCamera(st, 1, 1.9);
    st.gems[1].taken = true;
    st.alarm = 62;
    st.seenBy = 'camera';
    st.spottedFlash = 0.8;
    st.coinsLeft = 1;
    st.timeLeft = 98;
    say('Playing Stage 2 — The Vault Floor. Crack the vault, then get out!');
    return true;
  }

  return false;
}
