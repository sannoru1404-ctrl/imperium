// Battle AI: the current AI ('e') must beat the old AI (reserve, flanking, rotation, abilities all off) on 'p'.
import './setup.js';
const sim = await import('../src/js/battle-sim.js');
const st = await import('../src/js/state.js');
const { seed } = await import('../src/js/rng.js');
const OLD = { reserve: false, flank: false, rotate: false, abil: false };
const P = process.env.P ? JSON.parse(process.env.P) : OLD, E = process.env.E ? JSON.parse(process.env.E) : sim.AI_SMART;
const ARM = [['gen','spear','spear','druzh','druzh','arch','arch','knight','knight'],['gen','mil','spear','druzh','xbow','arch','hasb','knight','spear','druzh'],['gen','spear','druzh','druzh','arch','hasb','hasb','knight'],['gen','spear','spear','spear','arch','xbow','knight','knight','hasb','druzh','druzh']];
function fight(a, d, side, s) {
  const att = a.map(t => st.mk(t)), def = d.map(t => st.mk(t)); let res;
  sim.setupBattle(att, def, 'rus', 'pol', side, 'x', s);
  const B = sim.B; B.headless = true; B.resolve = r => (res = r); B.paused = false; B.aiE = E;
  let t = 0, k = 0;
  while (sim.B && !sim.B.over && t < 600) { if (k++ % 18 === 0) sim.aiThink('p', P); sim.simStep(1 / 30); t += 1 / 30; }
  return (res.win === 'att') !== (side === 'att');   // 'e' won
}
const N = Number(process.env.N || Math.max(4, Math.round(Number(process.env.RUNS || 20) / 3))); let w = 0, n = 0;
for (let i = 0; i < N; i++) for (let j = 0; j < ARM.length; j++) { const A = ARM[j], D = ARM[(j + 1) % ARM.length];
  for (const side of ['att', 'def']) { seed(i + 1); if (fight(A, D, side, 900 + i)) w++; n++; } }
const pct = Math.round(100 * w / n);
console.log(`battle AI: ok (new AI beats the old one in ${pct}% of ${n} mirror battles)`);
if (pct < 58) { console.error('battle AI is not better than the old one'); process.exit(1); }
