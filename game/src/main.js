// main.js — the game loop, guard AI, alarm, cracking, scoring and screens.
// Fixed 1/60 s steps, frames clamped to 0.25 s. Exposes a read-only
// window.__heist hook (state only) so an automated playtest can drive the
// game with real keys and read the live state without writing any of it.

import { FIELD_W, FIELD_H, ROOM, TUNE } from './config.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';
import { buildStage, BLOCKERS, VAULT_ZONE, EXIT_ZONE, STAGES } from './level.js';
import { watcherSees, circleHitsRect } from './vision.js';
import { draw } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const input = new Input(canvas);
const sfx = new SoundBank();

function loadBest() {
  try {
    return Number(window.localStorage.getItem('vault-room.best') || 0) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem('vault-room.best', String(value));
  } catch {
    // Best score is a nicety; a blocked storage never breaks the game.
  }
}

const game = {
  screen: 'title', // title | play | paused | clear | busted | final
  stageIndex: 0,
  stage: buildStage(0),
  score: 0,
  scoreAtStageStart: 0,
  stageScore: 0,
  best: loadBest(),
  muted: false,
  frozen: false, // shot mode: render the staged scene, never simulate
  shotName: null,
  time: 0, // wall time for blink / sparkle animation
  framesPainted: 0,
};

// Read-only hook for the automated playtest: it reads state, never writes it.
window.__heist = { state: game, version: 1 };

let stepTimer = 0; // footstep pacing
let crackTickTimer = 0;
let acc = 0;

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function addScore(n) {
  game.score += n;
  game.stageScore = game.score - game.scoreAtStageStart;
}

function updateBest() {
  if (game.score > game.best) {
    game.best = game.score;
    saveBest(game.best);
  }
}

function startGame() {
  game.score = 0;
  game.scoreAtStageStart = 0;
  game.stageScore = 0;
  game.stageIndex = 0;
  game.stage = buildStage(0);
  game.screen = 'play';
  setStatus(`Playing Stage 1 — ${STAGES[0].name}. Crack the vault, then get out!`);
}

function startStage(index) {
  game.stageIndex = index;
  game.stage = buildStage(index);
  game.scoreAtStageStart = game.score;
  game.stageScore = 0;
  game.screen = 'play';
  setStatus(`Playing Stage ${index + 1} — ${STAGES[index].name}. Crack the vault, then get out!`);
}

function retryStage() {
  game.score = game.scoreAtStageStart;
  game.stageScore = 0;
  game.stage = buildStage(game.stageIndex);
  game.screen = 'play';
  setStatus(`Playing Stage ${game.stageIndex + 1} — ${STAGES[game.stageIndex].name}. Crack the vault, then get out!`);
}

function clearStage() {
  const stage = game.stage;
  const gemsTaken = stage.gems.filter((g) => g.taken).length;
  const timeLeft = Math.max(0, stage.timeLeft);
  const bonus = {
    vault: TUNE.vaultScore,
    gems: gemsTaken * TUNE.gemScore,
    time: Math.ceil(timeLeft) * TUNE.timeBonusPerSecond,
    quiet: Math.round((100 - stage.alarm) * TUNE.quietBonusPerPoint),
    timeSeconds: Math.ceil(timeLeft),
    alarmAtClear: Math.round(stage.alarm),
  };
  bonus.total = bonus.vault + bonus.gems + bonus.time + bonus.quiet;
  stage.clearBonus = bonus;
  addScore(bonus.total);
  updateBest();
  game.screen = 'clear';
  sfx.arpeggio();
  setStatus(
    `Stage clear! Stage score ${bonus.total} — total ${game.score}. ` +
      (game.stageIndex < 2 ? 'Press N for the next stage.' : 'Press N for the final tally.'),
  );
}

function bust(reason) {
  const stage = game.stage;
  stage.bustReason = reason;
  game.screen = 'busted';
  sfx.sting();
  setStatus(
    reason === 'time'
      ? `Time's up! Score ${game.score}. Press R to retry this stage.`
      : `Busted! The alarm hit 100. Score ${game.score}. Press R to retry this stage.`,
  );
}

function nextStage() {
  if (game.stageIndex < 2) {
    startStage(game.stageIndex + 1);
  } else {
    updateBest();
    game.screen = 'final';
    setStatus(`Final score ${game.score} — best ${game.best}. Press R to run it again.`);
  }
}

function togglePause() {
  if (game.screen === 'play') {
    game.screen = 'paused';
    setStatus('Paused — press P to resume.');
  } else if (game.screen === 'paused') {
    game.screen = 'play';
    setStatus(`Playing Stage ${game.stageIndex + 1} — ${STAGES[game.stageIndex].name}.`);
  }
}

function tossCoin() {
  const stage = game.stage;
  if (game.screen !== 'play' || stage.coinsLeft <= 0) return;
  stage.coinsLeft -= 1;
  addScore(-TUNE.coinCost);
  const mx = Math.max(ROOM.x + 10, Math.min(ROOM.x + ROOM.w - 10, input.mouse.x));
  const my = Math.max(ROOM.y + 10, Math.min(ROOM.y + ROOM.h - 10, input.mouse.y));
  stage.coin = { x: mx, y: my, age: 0, ttl: TUNE.lureLookSeconds };
  let lured = 0;
  for (const g of stage.guards) {
    if (Math.hypot(g.x - mx, g.y - my) <= TUNE.lureRadius) {
      g.lured = { x: mx, y: my };
      g.lookT = TUNE.lureLookSeconds;
      g.wait = 0;
      lured += 1;
    }
  }
  sfx.clink();
  setStatus(
    lured > 0
      ? `Coin tossed! −25 — ${lured} guard${lured > 1 ? 's' : ''} go${lured > 1 ? '' : 'es'} to look.`
      : 'Coin tossed! −25 — no guard close enough to hear it.',
  );
}

// ---- one fixed simulation step ----

function moveThief(dt) {
  const stage = game.stage;
  const t = stage.thief;
  const mv = input.moveVector();
  t.sneaking = input.sneaking;
  t.moving = mv.x !== 0 || mv.y !== 0;
  if (!t.moving) return;
  const speed = t.sneaking ? TUNE.sneakSpeed : TUNE.walkSpeed;
  t.angle = Math.atan2(mv.y, mv.x);
  // Axis-separated movement: try x, then y, reverting the axis that hits a
  // blocker, so the thief slides along walls instead of sticking.
  const nx = t.x + mv.x * speed * dt;
  const clampedX = Math.max(ROOM.x + t.r, Math.min(ROOM.x + ROOM.w - t.r, nx));
  if (!BLOCKERS.some((b) => circleHitsRect(clampedX, t.y, t.r, b))) t.x = clampedX;
  const ny = t.y + mv.y * speed * dt;
  const clampedY = Math.max(ROOM.y + t.r, Math.min(ROOM.y + ROOM.h - t.r, ny));
  if (!BLOCKERS.some((b) => circleHitsRect(t.x, clampedY, t.r, b))) t.y = clampedY;
  // Footsteps + ripples.
  stepTimer -= dt;
  if (stepTimer <= 0) {
    stepTimer = t.sneaking ? 0.5 : 0.36;
    sfx.step(t.sneaking);
    stage.ripples.push({ x: t.x, y: t.y, age: 0 });
  }
}

function moveGuard(g, dt) {
  if (g.lured) {
    const dx = g.lured.x - g.x;
    const dy = g.lured.y - g.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 4) {
      g.angle = Math.atan2(dy, dx);
      g.x += (dx / dist) * g.speed * dt;
      g.y += (dy / dist) * g.speed * dt;
    } else {
      // Arrived: stand and scan the spot for the lure duration.
      g.lookT -= dt;
      g.angle += dt * 0.9;
      if (g.lookT <= 0) g.lured = null;
    }
    return;
  }
  if (g.wait > 0) {
    g.wait -= dt;
    return;
  }
  const [tx, ty] = g.waypoints[g.target];
  const dx = tx - g.x;
  const dy = ty - g.y;
  const dist = Math.hypot(dx, dy);
  const stepLen = g.speed * dt;
  if (dist <= Math.max(2, stepLen)) {
    g.x = tx;
    g.y = ty;
    g.wait = TUNE.guardWait;
    g.target = 1 - g.target;
  } else {
    g.angle = Math.atan2(dy, dx);
    g.x += (dx / dist) * stepLen;
    g.y += (dy / dist) * stepLen;
  }
}

function update(dt) {
  const stage = game.stage;
  const thief = stage.thief;
  stage.elapsed += dt;
  stage.timeLeft -= dt;

  moveThief(dt);
  for (const g of stage.guards) moveGuard(g, dt);
  for (const c of stage.cameras) {
    c.angle = c.baseAngle + c.sweep * Math.sin(stage.elapsed * c.speed);
  }

  // Detection: any guard or camera with a clear sight line.
  let seenBy = null;
  for (const g of stage.guards) {
    g.spotting = watcherSees(
      { x: g.x, y: g.y, angle: g.angle, range: TUNE.guardRange, halfAngle: TUNE.guardHalfAngle },
      thief.x, thief.y, BLOCKERS,
    );
    if (g.spotting && !seenBy) seenBy = 'guard';
  }
  for (const c of stage.cameras) {
    c.spotting = watcherSees(c, thief.x, thief.y, BLOCKERS);
    if (c.spotting && !seenBy) seenBy = 'camera';
  }
  stage.seenBy = seenBy;
  if (seenBy) {
    const rate = stage.fillRate * (thief.sneaking ? TUNE.sneakFillFactor : 1);
    stage.alarm += rate * dt;
    stage.spottedFlash = 1;
  } else {
    stage.alarm = Math.max(0, stage.alarm - TUNE.alarmDrain * dt);
    stage.spottedFlash = Math.max(0, stage.spottedFlash - dt * 1.5);
  }
  stage.alarm = Math.min(100, stage.alarm);
  if (stage.alarm >= 100) {
    bust('alarm');
    return;
  }

  // Cracking: inside the vault zone, holding E.
  const inZone = Math.hypot(thief.x - VAULT_ZONE.x, thief.y - VAULT_ZONE.y) <= VAULT_ZONE.r;
  if (inZone && input.cracking && !stage.vaultOpen) {
    stage.crack += dt / TUNE.crackSeconds;
    crackTickTimer -= dt;
    if (crackTickTimer <= 0) {
      crackTickTimer = 0.12;
      sfx.crackTick();
    }
    if (stage.crack >= 1) {
      stage.crack = 1;
      stage.vaultOpen = true;
      addScore(TUNE.vaultScore);
      sfx.fanfare();
      setStatus('Vault cracked! +500 — get to the OUT door!');
    }
  } else {
    stage.crack = Math.max(0, stage.crack - TUNE.crackDecay * dt);
  }

  // Gems: walk over one to take it.
  for (const gem of stage.gems) {
    if (!gem.taken && Math.hypot(thief.x - gem.x, thief.y - gem.y) <= TUNE.gemPickupRadius) {
      gem.taken = true;
      addScore(TUNE.gemScore);
      sfx.chime();
      const taken = stage.gems.filter((g) => g.taken).length;
      setStatus(`Gem taken! +100 (${taken}/3).`);
    }
  }

  // Tossed coin ages out after its lure window.
  if (stage.coin) {
    stage.coin.age += dt;
    if (stage.coin.age >= stage.coin.ttl) stage.coin = null;
  }
  for (const r of stage.ripples) r.age += dt;
  stage.ripples = stage.ripples.filter((r) => r.age < 0.6);

  // Getaway: vault open and the thief inside the exit zone.
  if (
    stage.vaultOpen &&
    thief.x >= EXIT_ZONE.x && thief.x <= EXIT_ZONE.x + EXIT_ZONE.w &&
    thief.y >= EXIT_ZONE.y && thief.y <= EXIT_ZONE.y + EXIT_ZONE.h
  ) {
    clearStage();
    return;
  }

  if (stage.timeLeft <= 0) {
    stage.timeLeft = 0;
    bust('time');
  }
}

// ---- key / click actions ----

input.onTap = (code) => {
  sfx.unlock();
  if (code === 'KeyM') {
    game.muted = !game.muted;
    sfx.setMuted(game.muted);
    return;
  }
  if (game.screen === 'title') {
    if (code === 'Space' || code === 'Enter') startGame();
    return;
  }
  if (game.screen === 'play') {
    if (code === 'KeyP') togglePause();
    else if (code === 'KeyC') tossCoin();
    else if (code === 'KeyR') retryStage();
    return;
  }
  if (game.screen === 'paused') {
    if (code === 'KeyP') togglePause();
    return;
  }
  if (game.screen === 'clear') {
    if (code === 'KeyN') nextStage();
    else if (code === 'KeyR') retryStage();
    return;
  }
  if (game.screen === 'busted') {
    if (code === 'KeyR') retryStage();
    return;
  }
  if (game.screen === 'final') {
    if (code === 'KeyR') startGame();
  }
};

input.onClick = () => {
  sfx.unlock();
  if (game.screen === 'title') startGame();
};

// Tab hidden: auto-pause so the clock never runs while nobody watches.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.screen === 'play') togglePause();
});

// ---- shot mode: stage a scene from ?shot= and freeze the sim ----

const shotName = new URLSearchParams(window.location.search).get('shot');
if (shotName) {
  if (applyShot(shotName, game)) {
    game.frozen = true;
    game.shotName = shotName;
  }
}

setStatus('The Vault Room — press Space or click to start.');

// ---- the loop ----

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, TUNE.maxFrame);
  last = now;
  if (!game.frozen) {
    if (game.screen === 'play') {
      acc += dt;
      while (acc >= TUNE.step) {
        update(TUNE.step);
        acc -= TUNE.step;
        if (game.screen !== 'play') {
          acc = 0;
          break;
        }
      }
      sfx.tick(dt, game.stage.alarm, game.stage.timeLeft);
    }
    input.consume();
  }
  game.time += dt;
  draw(ctx, canvas, game);
  game.framesPainted += 1;
  if (game.frozen && game.framesPainted >= 2) window.__shotReady = true;
}
requestAnimationFrame(frame);
