// vision.js — the sight rules. A watcher (guard or camera) sees the thief when
// the thief is inside its range, inside its half-angle cone, and the straight
// segment watcher -> thief hits no blocker (cover or vault). The drawn cone is
// a plain sector and may cover a wall; this check is what decides detection.

// Wrap an angle difference to [-PI, PI].
export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

// Does the segment (x1,y1)-(x2,y2) touch rectangle r {x, y, w, h}?
// Slab test on the segment's parametric form. A segment that starts inside
// the rectangle counts as crossing it.
export function segmentHitsRect(x1, y1, x2, y2, r) {
  if (x1 >= r.x && x1 <= r.x + r.w && y1 >= r.y && y1 <= r.y + r.h) return true;
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  const axes = [
    [dx, r.x - x1, r.x + r.w - x1],
    [dy, r.y - y1, r.y + r.h - y1],
  ];
  for (const [d, lo, hi] of axes) {
    if (Math.abs(d) < 1e-12) {
      if (lo > 0 || hi < 0) return false;
    } else {
      let t1 = lo / d;
      let t2 = hi / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      if (t1 > tMin) tMin = t1;
      if (t2 < tMax) tMax = t2;
      if (tMin > tMax) return false;
    }
  }
  return true;
}

// True when no blocker rectangle stands between the two points.
export function hasLineOfSight(x1, y1, x2, y2, blockers) {
  for (const b of blockers) {
    if (segmentHitsRect(x1, y1, x2, y2, b)) return false;
  }
  return true;
}

// The full sight test for one watcher. watcher: {x, y, angle, range, halfAngle}.
// A thief closer than 1 px counts as seen (the watcher is standing on them).
export function watcherSees(watcher, tx, ty, blockers) {
  const dx = tx - watcher.x;
  const dy = ty - watcher.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  if (dist > watcher.range) return false;
  const toThief = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(toThief, watcher.angle)) > watcher.halfAngle) {
    return false;
  }
  return hasLineOfSight(watcher.x, watcher.y, tx, ty, blockers);
}

// Circle (cx, cy, r) against rectangle: true when they overlap. Used for the
// thief's movement collision, resolved one axis at a time by the caller.
export function circleHitsRect(cx, cy, r, rect) {
  const nearX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const nearY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy < r * r;
}

// Push a circle out of a rectangle along the smallest penetration axis.
// Returns the corrected {x, y}. Only call when they overlap.
export function resolveCircleRect(cx, cy, r, rect) {
  const nearX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const nearY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nearX;
  const dy = cy - nearY;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return { x: cx, y: cy };
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    const push = (r - d) / d;
    return { x: cx + dx * push, y: cy + dy * push };
  }
  // Centre inside the rectangle: push out along the nearest face.
  const left = cx - rect.x;
  const right = rect.x + rect.w - cx;
  const top = cy - rect.y;
  const bottom = rect.y + rect.h - cy;
  const m = Math.min(left, right, top, bottom);
  if (m === left) return { x: rect.x - r, y: cy };
  if (m === right) return { x: rect.x + rect.w + r, y: cy };
  if (m === top) return { x: cx, y: rect.y - r };
  return { x: cx, y: rect.y + rect.h + r };
}
