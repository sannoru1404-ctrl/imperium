// Seeded pseudo-random generator (mulberry32).
// All game logic (campaign, AI, battle simulation) must use rand() instead of Math.random(),
// so that a game or a battle can be replayed exactly from its seed.
// Purely visual effects (corpse rotation, arrow spread) may keep Math.random().
let s = 1;
export function seed(n) { s = (n >>> 0) || 1; }
export function getState() { return s; }
export function setState(n) { s = n >>> 0; }
export function getSeed() { return s; }
export function rand() {
  s = (s + 0x6D2B79F5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
