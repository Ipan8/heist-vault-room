// level.js — the room and the fresh stage builder. One room, three stages:
// the same floor plan, more eyes, faster sweeps, tighter patrols each time.
// Every patrol segment is clear of every cover rect (guards have no wall
// collision, so a segment crossing a pillar would look broken).

import { ROOM, TUNE } from './config.js';

// Solid cover: blocks movement AND sight. Pillars 70x70, pedestals 56x56.
export const PILLARS = [
  { x: 300, y: 220, w: 70, h: 70 },
  { x: 620, y: 300, w: 70, h: 70 },
  { x: 940, y: 220, w: 70, h: 70 },
  { x: 460, y: 470, w: 70, h: 70 },
  { x: 780, y: 470, w: 70, h: 70 },
];
export const PEDESTALS = [
  { x: 180, y: 140, w: 56, h: 56 },
  { x: 1080, y: 420, w: 56, h: 56 },
  { x: 480, y: 130, w: 56, h: 56 },
];
export const COVER = [...PILLARS, ...PEDESTALS];

// The vault itself is solid too.
export const VAULT_RECT = { x: 1080, y: 96, w: 130, h: 104 };
// Stand inside this circle and hold E to crack the vault.
export const VAULT_ZONE = { x: 1145, y: 216, r: 96 };
// Reach this zone with the vault open to clear the stage.
export const EXIT_ZONE = { x: 1100, y: 628, w: 80, h: 48 };
// Where the thief walks in.
export const ENTRY_DOOR = { x: 130, y: 620 };
// Every solid rectangle, for movement and for sight.
export const BLOCKERS = [...COVER, VAULT_RECT];

// Gems sit in the same three risky spots every stage.
export const GEM_SPOTS = [
  { x: 210, y: 340 },
  { x: 640, y: 580 },
  { x: 1000, y: 400 },
];

// Stage table: name, clock, alarm fill rate, guards, cameras.
export const STAGES = [
  {
    name: 'Stage 1 — The Gallery',
    timeLimit: 150,
    fillRate: 26,
    guards: [
      { waypoints: [[380, 180], [380, 520]], speed: 70 },
      { waypoints: [[700, 180], [1020, 180]], speed: 70 },
    ],
    cameras: [{ x: 640, y: 96, baseAngle: Math.PI / 2, sweep: 0.55, speed: 0.5 }],
  },
  {
    name: 'Stage 2 — The Vault Floor',
    timeLimit: 135,
    fillRate: 30,
    guards: [
      { waypoints: [[380, 180], [380, 520]], speed: 86 },
      { waypoints: [[700, 180], [1020, 180]], speed: 86 },
    ],
    cameras: [
      { x: 640, y: 96, baseAngle: Math.PI / 2, sweep: 0.55, speed: 0.65 },
      { x: 1150, y: 96, baseAngle: Math.PI / 2, sweep: 0.6, speed: 0.65 },
    ],
  },
  {
    name: 'Stage 3 — The High Vault',
    timeLimit: 120,
    fillRate: 34,
    guards: [
      { waypoints: [[380, 180], [380, 520]], speed: 96 },
      { waypoints: [[700, 180], [1020, 180]], speed: 96 },
      { waypoints: [[900, 300], [900, 560]], speed: 90 },
    ],
    cameras: [
      { x: 640, y: 96, baseAngle: Math.PI / 2, sweep: 0.55, speed: 0.8 },
      { x: 1150, y: 96, baseAngle: Math.PI / 2, sweep: 0.6, speed: 0.8 },
      { x: 1228, y: 380, baseAngle: Math.PI, sweep: 0.5, speed: 0.8 },
    ],
  },
];

// Build a fresh stage: thief at the entry door, guards at their first
// waypoints, cameras at their base angles, gems unpicked, alarm at zero.
export function buildStage(index) {
  const def = STAGES[index];
  const guards = def.guards.map((g) => {
    const [sx, sy] = g.waypoints[0];
    const [tx, ty] = g.waypoints[1];
    return {
      x: sx,
      y: sy,
      angle: Math.atan2(ty - sy, tx - sx),
      speed: g.speed,
      waypoints: g.waypoints,
      target: 1, // waypoint index the guard walks toward
      wait: 0, // seconds left of the pause at a waypoint
      lured: null, // {x, y} landing spot of a tossed coin
      lookT: 0, // seconds left looking at a coin spot
      spotting: false,
    };
  });
  const cameras = def.cameras.map((c) => ({
    x: c.x,
    y: c.y,
    baseAngle: c.baseAngle,
    sweep: c.sweep,
    speed: c.speed,
    angle: c.baseAngle,
    range: TUNE.cameraRange,
    halfAngle: TUNE.cameraHalfAngle,
    spotting: false,
  }));
  return {
    index,
    name: def.name,
    timeLimit: def.timeLimit,
    timeLeft: def.timeLimit,
    elapsed: 0,
    fillRate: def.fillRate,
    alarm: 0,
    thief: {
      x: ENTRY_DOOR.x,
      y: ENTRY_DOOR.y,
      angle: 0,
      r: TUNE.thiefRadius,
      sneaking: false,
      moving: false,
    },
    guards,
    cameras,
    gems: GEM_SPOTS.map((g) => ({ x: g.x, y: g.y, taken: false })),
    coinsLeft: TUNE.coinsPerStage,
    coin: null, // {x, y, age, ttl} while a tossed coin lies on the floor
    vaultOpen: false,
    crack: 0, // 0..1 crack progress
    seenBy: null, // 'guard' | 'camera' | null
    spottedFlash: 0, // 0..1 red edge pulse while seen
    ripples: [], // footstep rings {x, y, age}
    clearBonus: null, // filled on stage clear
    bustReason: null, // 'alarm' | 'time'
  };
}

export { ROOM };
