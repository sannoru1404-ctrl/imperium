// Headless real-time battles: unit-vs-unit balance matrix + determinism.
import './setup.js';
import * as sim from '../src/js/battle-sim.js';
import { mk } from '../src/js/state.js';
import { seed } from '../src/js/rng.js';

function fight(attTypes, defTypes, battleSeed) {
  const att = attTypes.map(t => mk(t)), def = defTypes.map(t => mk(t));
  let res;
  sim.setupBattle(att, def, 'rome', 'carth', 'att', 'test', battleSeed);
  const B = sim.B;
  B.headless = true; B.resolve = r => (res = r); B.paused = false;
  let t = 0;
  while (sim.B && !sim.B.over && t < 600) {
    // player side: attack the nearest enemy with idle regiments
    if (Math.round(t * 30) % 30 === 0) for (const r of sim.B.regs) {
      if (r.side !== 'p' || !sim.alive(r) || r.routing || r.order) continue;
      let n = null, nd = 1e9;
      for (const e of sim.B.regs) if (e.side === 'e' && sim.alive(e) && !e.routing) { const d = sim.rdist(r, e); if (d < nd) { nd = d; n = e; } }
      if (n) r.order = { type: 'attack', tg: n };
    }
    sim.simStep(1 / 30); t += 1 / 30;
  }
  return { win: res.win, time: Math.round(t), left: res.att.map(u => u.hp).concat(['|'], res.def.map(u => u.hp)).join(',') };
}

const types = ['sword', 'spear', 'arch', 'cav', 'eleph', 'mil'];
const RUNS = Number(process.env.RUNS || 20);
console.log('win % of ROW (attacking, 3 regiments) vs COLUMN (defending, 3 regiments), ' + RUNS + ' runs each');
console.log('        ' + types.map(t => t.padStart(6)).join(''));
let total = 0;
for (const a of types) {
  let line = a.padEnd(8);
  for (const d of types) {
    let w = 0;
    for (let i = 0; i < RUNS; i++) { seed(i + 1); if (fight([a, a, a], [d, d, d], 1000 + i).win === 'att') w++; total++; }
    line += String(Math.round((100 * w) / RUNS)).padStart(6);
  }
  console.log(line);
}
const x = fight(['sword', 'spear', 'arch', 'cav'], ['sword', 'eleph', 'cav', 'arch'], 777);
const y = fight(['sword', 'spear', 'arch', 'cav'], ['sword', 'eleph', 'cav', 'arch'], 777);
if (JSON.stringify(x) !== JSON.stringify(y)) { console.error('NOT DETERMINISTIC', x, y); process.exit(1); }
console.log(`battles: ${total + 2} | determinism: ok (${x.win}, ${x.time}s)`);
