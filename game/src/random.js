// random.js — a tiny seeded generator (mulberry32) for anything that needs a
// repeatable roll. The game itself is deterministic by design: stage layouts are
// fixed tables in level.js, and this is here for sparkle and shuffle effects
// that should look the same every run for the same seed.

// mulberry32: small, fast, good enough for game effects. Seed is any integer.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Convenience wrapper: one generator with the helpers the game uses.
export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    // Integer in [min, max).
    int(min, max) {
      return min + Math.floor(next() * (max - min));
    },
    // Float in [min, max).
    range(min, max) {
      return min + next() * (max - min);
    },
    // Pick one element of an array.
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
  };
}
