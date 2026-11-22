// config.js — every tuning number and colour for The Vault Room, in one place.
// The Vault Room is a top-down heist game: one big vault room, a thief, patrolling
// guards with vision cones, sweeping wall cameras, a crackable vault and an alarm
// meter. All art is drawn in code; all sound is synthesised. No assets, no network.

// Logical field the game is drawn in (letterboxed to the window).
export const FIELD_W = 1280;
export const FIELD_H = 720;

// Header bar at the top, footer strip at the bottom, room in between.
export const HEADER_H = 64;
export const FOOTER_Y = 684;
export const FOOTER_H = 36;
export const ROOM = { x: 40, y: 84, w: 1200, h: 592 };

// Tuning: speeds in px/s, times in seconds, alarm in points 0-100.
export const TUNE = {
  thiefRadius: 13,
  walkSpeed: 172,
  sneakSpeed: 96,
  guardRange: 232,
  guardHalfAngle: 0.56, // ~32 degrees
  cameraRange: 262,
  cameraHalfAngle: 0.44, // ~25 degrees
  crackSeconds: 2.2,
  crackDecay: 0.5, // progress lost per second when E is released
  alarmDrain: 12, // points per second while unseen
  sneakFillFactor: 0.5, // sneaking halves how fast the alarm fills
  coinsPerStage: 3,
  coinCost: 25, // score paid per toss
  lureRadius: 340, // guards closer than this walk to a tossed coin
  lureLookSeconds: 3, // how long a lured guard looks at the landing spot
  gemScore: 100,
  vaultScore: 500,
  timeBonusPerSecond: 2,
  quietBonusPerPoint: 2,
  guardWait: 0.8, // pause at each end of a patrol segment
  step: 1 / 60, // fixed simulation step
  maxFrame: 0.25, // longest real frame the sim will swallow
  gemPickupRadius: 29, // thief radius + 16
};

// Palette: dark vault at night, gold loot, yellow guard cones, red cameras.
export const PALETTE = {
  page: '#0b0d12',
  header: '#12141c',
  headerLine: '#2c3140',
  footer: '#12141c',
  floorA: '#262b38',
  floorB: '#20242f',
  floorLine: '#313747',
  carpet: '#6b4d12',
  carpetEdge: '#c9a227',
  wall: '#171a22',
  wallTrim: '#3a4152',
  pillar: '#3d4457',
  pillarTop: '#4d556d',
  pillarTrim: '#c9a227',
  vaultSteel: '#8b93a5',
  vaultDark: '#5d6474',
  vaultGold: '#e8b923',
  gold: '#f5c542',
  gem: '#ffd94d',
  text: '#e8eaf0',
  dim: '#9aa1b5',
  green: '#3ddc84',
  red: '#ff4d4d',
  yellow: '#ffd23f',
  alarmGreen: '#3ddc84',
  alarmYellow: '#ffd23f',
  alarmRed: '#ff4d4d',
  thief: '#1c1f2a',
  thiefTrim: '#e8b923',
  guard: '#31435c',
  guardTrim: '#7fa8d8',
  camera: '#7a2020',
};
