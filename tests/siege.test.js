// Siege battles (walls, gate, ladders, towers) and campaign sieges (blockade, ram, surrender).
import './setup.js';
import * as sim from '../src/js/battle-sim.js';
import * as st from '../src/js/state.js';
import * as T from '../src/js/turn.js';
import { setAutoAnswer } from '../src/js/ui.js';
setAutoAnswer(() => 'auto');

function storm(att, def, wall, ram, seed, eng = {}) {
  let res; const A = att.map(t => st.mk(t)), D = def.map(t => st.mk(t));
  sim.setupBattle(A, D, 'rus', 'pol', 'att', 't', seed, { wall, ram, ...eng }); const B = sim.B;
  B.headless = true; B.resolve = r => (res = r); B.paused = false;
  let t = 0, climbed = 0, maxGateHit = 0;
  while (sim.B && !sim.B.over && t < 600) {
    if (Math.round(t * 30) % 30 === 0) for (const r of B.regs) {
      if (r.side !== 'p' || !sim.alive(r) || r.routing || r.order) continue;
      if (!r.ranged && r.body === 'inf' && !B.siege.open && r.t === 'druzh') { r.order = { type: 'gate' }; continue; }
      let n = null, nd = 1e9; for (const e of B.regs) if (e.side === 'e' && sim.alive(e) && !e.routing) { const d = sim.rdist(r, e); if (d < nd) { nd = d; n = e; } }
      if (n) r.order = { type: 'attack', tg: n };
    }
    sim.simStep(1 / 30); t += 1 / 30;
    if (sim.B) { maxGateHit = Math.max(maxGateHit, B.siege.gateMax - B.siege.gateHp); climbed += B.regs.filter(r => r.side === 'p' && sim.wallSide(r.z) === B.siege.defSign).length ? 1 : 0; }
  }
  return { win: res.win, t, gate: maxGateHit, inside: climbed > 0, tower: !!(eng.tower) };
}
const army = ['gen', 'druzh', 'druzh', 'druzh', 'spear', 'spear', 'spear', 'arch', 'arch', 'knight', 'knight'], garrison = ['gen', 'spear', 'druzh', 'arch', 'xbow'];
let rows = [];
for (const [w, ram] of [[1, false], [1, true], [2, false], [2, true]]) {
  let wins = 0, inside = 0, gate = 0;
  for (let s = 1; s <= 10; s++) { const r = storm(army, garrison, w, ram, s); if (r.win === 'att') wins++; if (r.inside) inside++; if (r.gate > 0) gate++; }
  rows.push(`wall ${w}${ram ? '+ram' : '    '}: attacker wins ${wins}/10, got inside ${inside}/10, hit gate ${gate}/10`);
  if (!inside || !gate) { console.error('siege mechanics not working', rows.at(-1)); process.exit(1); }
}
// siege engines: the tower brings men over the wall, the trebuchet batters gate, towers and defenders
for (const [lbl, eng] of [['+ram+tower', { tower: true }], ['+ram+treb ', { treb: true }], ['+all      ', { tower: true, treb: true }]]) {
  let wins = 0, inside = 0;
  for (let s = 1; s <= 10; s++) { const r = storm(army, garrison, 2, true, s, eng); if (r.win === 'att') wins++; if (r.inside) inside++; }
  rows.push(`wall 2${lbl}: attacker wins ${wins}/10, got inside ${inside}/10`);
}
console.log(rows.join('\n'));
const base = +rows[3].match(/wins (\d+)/)[1], all = +rows[6].match(/wins (\d+)/)[1];
if (all < base) { console.error('siege engines do not help'); process.exit(1); }
// determinism of a siege battle
const a = storm(army, garrison, 2, true, 99), b = storm(army, garrison, 2, true, 99);
if (JSON.stringify(a) !== JSON.stringify(b)) { console.error('siege NOT DETERMINISTIC'); process.exit(1); }
// campaign: blockade a walled independent town until it surrenders
st.newGame(3, 'rus');
const kiev = st.P('kiev'), gal = st.P('galich');
gal.b = { walls: 1 }; gal.army = []; gal.gar = 3;
T.startSiege(kiev, gal, 'rus');
let y = 0; while (gal.owner !== 'rus' && y < 6) { T.sieges(); y++; }
if (gal.owner !== 'rus') { console.error('blockade did not take the town'); process.exit(1); }
console.log(`siege: ok (battle determinism; blockaded Galich surrendered after ${y} years)`);
