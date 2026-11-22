// render.js — everything painted: the room, the header, the footer, every
// entity, the screens. One draw() call per frame; the main loop owns the state.
// The field is 1280x720 logical pixels, letterboxed into the canvas.

import { FIELD_W, FIELD_H, HEADER_H, FOOTER_Y, FOOTER_H, ROOM, PALETTE, TUNE } from './config.js';
import { PILLARS, PEDESTALS, VAULT_RECT, VAULT_ZONE, EXIT_ZONE, ENTRY_DOOR } from './level.js';

function fmtTime(t) {
  const s = Math.max(0, Math.ceil(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function alarmColor(alarm) {
  if (alarm < 50) return PALETTE.alarmGreen;
  if (alarm < 75) return PALETTE.alarmYellow;
  return PALETTE.alarmRed;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function centerText(ctx, text, x, y) {
  const w = ctx.measureText(text).width;
  ctx.fillText(text, x - w / 2, y);
}

function drawCone(ctx, x, y, angle, halfAngle, range, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawPanel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10, 12, 18, 0.92)';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = PALETTE.vaultGold;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ---- the room ----

function drawFloor(ctx) {
  const tile = 80;
  for (let ty = ROOM.y; ty < ROOM.y + ROOM.h; ty += tile) {
    for (let tx = ROOM.x; tx < ROOM.x + ROOM.w; tx += tile) {
      const col = ((tx - ROOM.x) / tile + (ty - ROOM.y) / tile) % 2 === 0;
      ctx.fillStyle = col ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(tx, ty, Math.min(tile, ROOM.x + ROOM.w - tx), Math.min(tile, ROOM.y + ROOM.h - ty));
    }
  }
  ctx.strokeStyle = PALETTE.floorLine;
  ctx.lineWidth = 1;
  for (let tx = ROOM.x; tx <= ROOM.x + ROOM.w; tx += tile) {
    ctx.beginPath();
    ctx.moveTo(tx, ROOM.y);
    ctx.lineTo(tx, ROOM.y + ROOM.h);
    ctx.stroke();
  }
  for (let ty = ROOM.y; ty <= ROOM.y + ROOM.h; ty += tile) {
    ctx.beginPath();
    ctx.moveTo(ROOM.x, ty);
    ctx.lineTo(ROOM.x + ROOM.w, ty);
    ctx.stroke();
  }
  // Room border.
  ctx.strokeStyle = PALETTE.wallTrim;
  ctx.lineWidth = 3;
  ctx.strokeRect(ROOM.x, ROOM.y, ROOM.w, ROOM.h);
}

// Gold carpet: the suggested quiet route, along the bottom and up the right.
function drawCarpet(ctx) {
  ctx.fillStyle = PALETTE.carpet;
  ctx.fillRect(60, 606, 1120, 62);
  ctx.fillRect(1120, 210, 60, 430);
  ctx.strokeStyle = PALETTE.carpetEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 606, 1120, 62);
  ctx.strokeRect(1120, 210, 60, 430);
  ctx.strokeStyle = 'rgba(201, 162, 39, 0.45)';
  ctx.lineWidth = 1;
  ctx.setLineDash([10, 8]);
  ctx.strokeRect(70, 616, 1100, 42);
  ctx.setLineDash([]);
}

function drawDoors(ctx) {
  // IN door, bottom-left, green glow.
  ctx.fillStyle = 'rgba(61, 220, 132, 0.25)';
  ctx.fillRect(ENTRY_DOOR.x - 34, ENTRY_DOOR.y - 20, 68, 40);
  ctx.strokeStyle = PALETTE.green;
  ctx.lineWidth = 3;
  ctx.strokeRect(ENTRY_DOOR.x - 34, ENTRY_DOOR.y - 20, 68, 40);
  ctx.fillStyle = PALETTE.green;
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('IN', ENTRY_DOOR.x, ENTRY_DOOR.y + 44);
  // OUT door, bottom-right, the getaway.
  ctx.fillStyle = 'rgba(61, 220, 132, 0.18)';
  ctx.fillRect(EXIT_ZONE.x, EXIT_ZONE.y, EXIT_ZONE.w, EXIT_ZONE.h);
  ctx.strokeStyle = PALETTE.green;
  ctx.lineWidth = 3;
  ctx.strokeRect(EXIT_ZONE.x, EXIT_ZONE.y, EXIT_ZONE.w, EXIT_ZONE.h);
  ctx.fillStyle = PALETTE.green;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('OUT', EXIT_ZONE.x + EXIT_ZONE.w / 2, EXIT_ZONE.y + EXIT_ZONE.h / 2 + 6);
  ctx.textAlign = 'left';
}

function drawCover(ctx) {
  for (const p of PILLARS) {
    ctx.fillStyle = PALETTE.pillar;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = PALETTE.pillarTop;
    ctx.fillRect(p.x + 6, p.y + 6, p.w - 12, p.h - 12);
    ctx.strokeStyle = PALETTE.pillarTrim;
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  }
  for (const p of PEDESTALS) {
    ctx.fillStyle = PALETTE.pillar;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.pillarTrim;
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  }
}

function drawVault(ctx, stage, time) {
  // Faint gold circle: stand inside it and hold E.
  if (!stage.vaultOpen) {
    ctx.strokeStyle = 'rgba(232, 185, 35, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(VAULT_ZONE.x, VAULT_ZONE.y, VAULT_ZONE.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Steel vault with gold trim.
  ctx.fillStyle = PALETTE.vaultDark;
  ctx.fillRect(VAULT_RECT.x, VAULT_RECT.y, VAULT_RECT.w, VAULT_RECT.h);
  ctx.fillStyle = PALETTE.vaultSteel;
  ctx.fillRect(VAULT_RECT.x + 6, VAULT_RECT.y + 6, VAULT_RECT.w - 12, VAULT_RECT.h - 12);
  ctx.strokeStyle = PALETTE.vaultGold;
  ctx.lineWidth = 3;
  ctx.strokeRect(VAULT_RECT.x, VAULT_RECT.y, VAULT_RECT.w, VAULT_RECT.h);
  if (stage.vaultOpen) {
    // Open door swung out + gold spilling from inside.
    ctx.fillStyle = PALETTE.vaultGold;
    ctx.beginPath();
    ctx.arc(VAULT_RECT.x + VAULT_RECT.w / 2, VAULT_RECT.y + VAULT_RECT.h / 2, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3b0';
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.arc(
        VAULT_RECT.x + VAULT_RECT.w / 2 + Math.cos(a) * 34,
        VAULT_RECT.y + VAULT_RECT.h / 2 + Math.sin(a) * 22,
        5, 0, Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.vaultGold;
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OPEN', VAULT_RECT.x + VAULT_RECT.w / 2, VAULT_RECT.y + VAULT_RECT.h + 20);
    ctx.textAlign = 'left';
  } else {
    // Closed door: split line + dial.
    ctx.strokeStyle = PALETTE.vaultDark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(VAULT_RECT.x + VAULT_RECT.w / 2, VAULT_RECT.y + 6);
    ctx.lineTo(VAULT_RECT.x + VAULT_RECT.w / 2, VAULT_RECT.y + VAULT_RECT.h - 6);
    ctx.stroke();
    ctx.fillStyle = PALETTE.vaultGold;
    ctx.beginPath();
    ctx.arc(VAULT_RECT.x + VAULT_RECT.w / 2, VAULT_RECT.y + VAULT_RECT.h / 2, 10, 0, Math.PI * 2);
    ctx.fill();
    // Hint, centred under the vault, clear of the pedestal below.
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Hold E to crack the vault', VAULT_ZONE.x, VAULT_ZONE.y + 34);
    ctx.textAlign = 'left';
    // Crack progress bar under the vault.
    if (stage.crack > 0) {
      const bw = VAULT_RECT.w;
      const bx = VAULT_RECT.x;
      const by = VAULT_RECT.y + VAULT_RECT.h + 6;
      ctx.fillStyle = '#10131a';
      ctx.fillRect(bx, by, bw, 10);
      ctx.fillStyle = PALETTE.vaultGold;
      ctx.fillRect(bx, by, bw * stage.crack, 10);
      ctx.strokeStyle = PALETTE.vaultGold;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, 10);
    }
  }
}

function drawGems(ctx, stage, time) {
  for (const g of stage.gems) {
    if (g.taken) continue;
    const tw = 0.6 + 0.4 * Math.sin(time * 4 + g.x);
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = PALETTE.gem;
    ctx.globalAlpha = tw;
    ctx.fillRect(-9, -9, 18, 18);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#fff3b0';
    ctx.lineWidth = 2;
    ctx.strokeRect(-9, -9, 18, 18);
    ctx.restore();
    // Sparkle cross.
    ctx.strokeStyle = `rgba(255, 243, 176, ${tw})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(g.x - 14, g.y);
    ctx.lineTo(g.x + 14, g.y);
    ctx.moveTo(g.x, g.y - 14);
    ctx.lineTo(g.x, g.y + 14);
    ctx.stroke();
  }
}

function drawCoin(ctx, stage) {
  const c = stage.coin;
  if (!c) return;
  const age = c.age ?? 0;
  const ttl = c.ttl ?? TUNE.lureLookSeconds;
  const frac = Math.min(1, age / ttl);
  ctx.strokeStyle = `rgba(245, 197, 66, ${1 - frac})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(c.x, c.y, 10 + age * 26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = PALETTE.gold;
  ctx.beginPath();
  ctx.arc(c.x, c.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a6d1a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawRipples(ctx, stage) {
  for (const r of stage.ripples) {
    const frac = r.age / 0.6;
    if (frac >= 1) continue;
    ctx.strokeStyle = `rgba(232, 234, 240, ${0.35 * (1 - frac)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 5 + frac * 18, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawGuards(ctx, stage) {
  for (const g of stage.guards) {
    drawCone(
      ctx, g.x, g.y, g.angle, TUNE.guardHalfAngle, TUNE.guardRange,
      g.spotting ? 'rgba(255, 210, 63, 0.22)' : 'rgba(255, 210, 63, 0.12)',
      'rgba(255, 210, 63, 0.35)',
    );
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.guardTrim;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Facing nose.
    ctx.fillStyle = PALETTE.guardTrim;
    ctx.beginPath();
    ctx.moveTo(g.x + Math.cos(g.angle) * 20, g.y + Math.sin(g.angle) * 20);
    ctx.lineTo(g.x + Math.cos(g.angle + 2.5) * 10, g.y + Math.sin(g.angle + 2.5) * 10);
    ctx.lineTo(g.x + Math.cos(g.angle - 2.5) * 10, g.y + Math.sin(g.angle - 2.5) * 10);
    ctx.closePath();
    ctx.fill();
    if (g.spotting) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 22);
      ctx.textAlign = 'left';
    } else if (g.lured) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - 22);
      ctx.textAlign = 'left';
    }
  }
}

function drawCameras(ctx, stage, time) {
  for (const c of stage.cameras) {
    drawCone(
      ctx, c.x, c.y, c.angle, c.halfAngle, c.range,
      c.spotting ? 'rgba(255, 77, 77, 0.22)' : 'rgba(255, 77, 77, 0.11)',
      'rgba(255, 77, 77, 0.35)',
    );
    ctx.fillStyle = PALETTE.camera;
    ctx.fillRect(c.x - 9, c.y - 7, 18, 14);
    ctx.strokeStyle = '#ffb3b3';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(c.x - 9, c.y - 7, 18, 14);
    // Blinking red lens.
    const blink = c.spotting ? 1 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 6));
    ctx.fillStyle = `rgba(255, 40, 40, ${blink})`;
    ctx.beginPath();
    ctx.arc(c.x + Math.cos(c.angle) * 10, c.y + Math.sin(c.angle) * 10, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CAM', c.x, c.y + 26);
    ctx.textAlign = 'left';
  }
}

function drawThief(ctx, stage) {
  const t = stage.thief;
  const r = t.sneaking ? 10 : t.r;
  if (t.sneaking) {
    ctx.strokeStyle = PALETTE.thiefTrim;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(t.x, t.y, r + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = PALETTE.thiefTrim;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SNEAK', t.x, t.y - r - 14);
    ctx.textAlign = 'left';
  }
  ctx.fillStyle = PALETTE.thief;
  ctx.beginPath();
  ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.thiefTrim;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Hood point in the facing direction.
  ctx.fillStyle = PALETTE.thiefTrim;
  ctx.beginPath();
  ctx.moveTo(t.x + Math.cos(t.angle) * (r + 6), t.y + Math.sin(t.angle) * (r + 6));
  ctx.lineTo(t.x + Math.cos(t.angle + 2.4) * (r - 2), t.y + Math.sin(t.angle + 2.4) * (r - 2));
  ctx.lineTo(t.x + Math.cos(t.angle - 2.4) * (r - 2), t.y + Math.sin(t.angle - 2.4) * (r - 2));
  ctx.closePath();
  ctx.fill();
}

// ---- header / footer / pills ----

function drawHeader(ctx, game) {
  const stage = game.stage;
  ctx.fillStyle = PALETTE.header;
  ctx.fillRect(0, 0, FIELD_W, HEADER_H);
  ctx.strokeStyle = PALETTE.headerLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, HEADER_H);
  ctx.lineTo(FIELD_W, HEADER_H);
  ctx.stroke();

  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(stage.name, 56, 40);

  // Big alarm meter.
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('ALARM', 400, 40);
  const bx = 470;
  const bw = 280;
  const by = 22;
  const bh = 22;
  ctx.fillStyle = '#10131a';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = alarmColor(stage.alarm);
  ctx.fillRect(bx, by, bw * Math.min(1, stage.alarm / 100), bh);
  ctx.strokeStyle = alarmColor(stage.alarm);
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`${Math.round(stage.alarm)}%`, bx + bw + 10, 40);

  const gemsTaken = stage.gems.filter((g) => g.taken).length;
  ctx.fillStyle = PALETTE.gem;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`◆ ${gemsTaken}/3`, 830, 40);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(`◉ ${stage.coinsLeft}`, 920, 40);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`SCORE ${game.score}`, 1000, 40);
  ctx.fillStyle = stage.timeLeft < 10 ? PALETTE.alarmRed : PALETTE.text;
  ctx.fillText(fmtTime(stage.timeLeft), 1180, 40);
}

function drawFooter(ctx) {
  ctx.fillStyle = PALETTE.footer;
  ctx.fillRect(0, FOOTER_Y, FIELD_W, FOOTER_H);
  ctx.strokeStyle = PALETTE.headerLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, FOOTER_Y);
  ctx.lineTo(FIELD_W, FOOTER_Y);
  ctx.stroke();
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'WASD / arrows move · Shift sneak · E hold to crack · C toss a coin to the mouse · P pause · M mute',
    FIELD_W / 2,
    FOOTER_Y + 23,
  );
  ctx.textAlign = 'left';
}

function drawPills(ctx, stage) {
  let y = 124;
  if (stage.seenBy) {
    ctx.fillStyle = 'rgba(255, 40, 40, 0.92)';
    roundRect(ctx, FIELD_W / 2 - 85, y, 170, 32, 16);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 19px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPOTTED!', FIELD_W / 2, y + 23);
    ctx.textAlign = 'left';
    y += 42;
  }
  if (stage.vaultOpen) {
    ctx.fillStyle = 'rgba(232, 185, 35, 0.92)';
    roundRect(ctx, FIELD_W / 2 - 95, y, 190, 32, 16);
    ctx.fill();
    ctx.fillStyle = '#1c1f2a';
    ctx.font = 'bold 19px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VAULT OPEN', FIELD_W / 2, y + 23);
    ctx.textAlign = 'left';
  }
}

function drawEdgePulse(ctx, stage, time) {
  if (stage.spottedFlash <= 0) return;
  const a = stage.spottedFlash * (0.28 + 0.12 * Math.sin(time * 10));
  ctx.strokeStyle = `rgba(255, 60, 60, ${a})`;
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, FIELD_W - 12, FIELD_H - 12);
}

// ---- screens ----

function drawTitle(ctx, game) {
  ctx.fillStyle = 'rgba(5, 6, 10, 0.62)';
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  drawPanel(ctx, 340, 130, 600, 440);
  ctx.fillStyle = PALETTE.vaultGold;
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE VAULT ROOM', FIELD_W / 2, 205);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '20px sans-serif';
  ctx.fillText('A one-room heist — cross the gallery, crack the vault, get out.', FIELD_W / 2, 245);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = PALETTE.dim;
  const lines = [
    'Guards patrol with vision cones. Cameras sweep the room.',
    'Stay out of sight or the alarm fills — at 100, you are busted.',
    'Hold E beside the vault to crack it (2.2 s), then reach OUT.',
    'Grab the 3 gems (+100 each). Toss a coin (C, −25) to lure a guard.',
    'Shift sneaks — slower, but the alarm fills half as fast.',
  ];
  lines.forEach((l, i) => ctx.fillText(l, FIELD_W / 2, 285 + i * 26));
  if (game.best > 0) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText(`Best score: ${game.best}`, FIELD_W / 2, 435);
  }
  const blink = 0.55 + 0.45 * Math.sin(game.time * 4);
  ctx.fillStyle = `rgba(232, 234, 240, ${blink})`;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Press SPACE or click to start', FIELD_W / 2, 505);
  ctx.textAlign = 'left';
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(5, 6, 10, 0.6)';
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  drawPanel(ctx, 490, 280, 300, 160);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', FIELD_W / 2, 350);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('Press P to resume', FIELD_W / 2, 395);
  ctx.textAlign = 'left';
}

function drawClear(ctx, game) {
  const b = game.stage.clearBonus;
  ctx.fillStyle = 'rgba(5, 6, 10, 0.6)';
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  drawPanel(ctx, 420, 140, 440, 420);
  ctx.fillStyle = PALETTE.vaultGold;
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VAULT CRACKED!', FIELD_W / 2, 205);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '19px sans-serif';
  const rows = [
    [`Vault`, `+${b.vault}`],
    [`Gems (${b.gems / 100} of 3)`, `+${b.gems}`],
    [`Time bonus (${b.timeSeconds}s left)`, `+${b.time}`],
    [`Quiet bonus (alarm ${b.alarmAtClear}%)`, `+${b.quiet}`],
  ];
  rows.forEach(([label, val], i) => {
    const y = 255 + i * 32;
    ctx.textAlign = 'left';
    ctx.fillText(label, 470, y);
    ctx.textAlign = 'right';
    ctx.fillText(val, 810, y);
    ctx.textAlign = 'left';
  });
  ctx.strokeStyle = PALETTE.headerLine;
  ctx.beginPath();
  ctx.moveTo(470, 395);
  ctx.lineTo(810, 395);
  ctx.stroke();
  ctx.fillStyle = PALETTE.vaultGold;
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Stage score', 470, 430);
  ctx.textAlign = 'right';
  ctx.fillText(`+${b.total}`, 810, 430);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = '19px sans-serif';
  ctx.fillText(`Total score: ${game.score}`, FIELD_W / 2, 475);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '16px sans-serif';
  ctx.fillText(
    game.stage.index < 2 ? 'Press N for the next stage' : 'Press N for the final tally',
    FIELD_W / 2, 520,
  );
  ctx.textAlign = 'left';
}

function drawBusted(ctx, game) {
  const timedOut = game.stage.bustReason === 'time';
  ctx.fillStyle = 'rgba(5, 6, 10, 0.62)';
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  drawPanel(ctx, 420, 200, 440, 300);
  ctx.fillStyle = PALETTE.alarmRed;
  ctx.font = 'bold 46px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(timedOut ? "TIME'S UP!" : 'BUSTED!', FIELD_W / 2, 275);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '18px sans-serif';
  ctx.fillText(
    timedOut ? 'The clock ran out before the getaway.' : 'The alarm hit 100 — the guards swarmed the room.',
    FIELD_W / 2, 320,
  );
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`Score: ${game.score}`, FIELD_W / 2, 365);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '16px sans-serif';
  ctx.fillText('Press R to retry this stage', FIELD_W / 2, 440);
  ctx.textAlign = 'left';
}

function drawFinal(ctx, game) {
  const stars = game.score >= 3000 ? 3 : game.score >= 2000 ? 2 : 1;
  ctx.fillStyle = 'rgba(5, 6, 10, 0.62)';
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  drawPanel(ctx, 420, 150, 440, 400);
  ctx.fillStyle = PALETTE.vaultGold;
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE FINAL TAKE', FIELD_W / 2, 215);
  ctx.font = '44px sans-serif';
  ctx.fillText('★'.repeat(stars) + '☆'.repeat(3 - stars), FIELD_W / 2, 275);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`Total score: ${game.score}`, FIELD_W / 2, 330);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '18px sans-serif';
  ctx.fillText(`Best score: ${game.best}`, FIELD_W / 2, 370);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '16px sans-serif';
  ctx.fillText('All three stages cleared — the vault is yours.', FIELD_W / 2, 420);
  ctx.fillText('Press R to run it again', FIELD_W / 2, 460);
  ctx.textAlign = 'left';
}

// ---- main entry ----

export function draw(ctx, canvas, game) {
  // Letterbox the 1280x720 field into the canvas.
  const scale = Math.min(canvas.width / FIELD_W, canvas.height / FIELD_H);
  const ox = (canvas.width - FIELD_W * scale) / 2;
  const oy = (canvas.height - FIELD_H * scale) / 2;
  ctx.setTransform(scale, 0, 0, scale, ox, oy);
  ctx.fillStyle = PALETTE.page;
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);

  const stage = game.stage;
  drawFloor(ctx);
  drawCarpet(ctx);
  drawDoors(ctx);
  drawCover(ctx);
  drawVault(ctx, stage, game.time);
  drawGems(ctx, stage, game.time);
  drawCoin(ctx, stage);
  drawRipples(ctx, stage);
  drawGuards(ctx, stage);
  drawCameras(ctx, stage, game.time);
  drawThief(ctx, stage);
  // Pills belong to live play only: on the clear / busted / final panels the
  // panel itself carries the news, and a pill at y=124 would sit half under it.
  if (game.screen === 'play' || game.screen === 'paused') drawPills(ctx, stage);
  drawHeader(ctx, game);
  drawFooter(ctx);
  drawEdgePulse(ctx, stage, game.time);

  if (game.screen === 'title') drawTitle(ctx, game);
  else if (game.screen === 'paused') drawPaused(ctx);
  else if (game.screen === 'clear') drawClear(ctx, game);
  else if (game.screen === 'busted') drawBusted(ctx, game);
  else if (game.screen === 'final') drawFinal(ctx, game);
}
