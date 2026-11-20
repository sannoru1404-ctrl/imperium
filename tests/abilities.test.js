// Battle abilities (charge, hold, volley, rally) and army traditions.
import './setup.js';
import assert from 'node:assert';
import * as sim from '../src/js/battle-sim.js';
import * as st from '../src/js/state.js';
import * as W from '../src/js/war.js';
import { seed } from '../src/js/rng.js';
import { TRAD_XP, TRADITIONS } from '../src/js/data.js';

// the player attacks; `use` may fire abilities each half second
function fight(a, d, s, use, gen) {
  const att = a.map(t => st.mk(t)), def = d.map(t => st.mk(t));
  if (gen) { att.push(gen); }
  let res; sim.setupBattle(att, def, 'rus', 'pol', 'att', 'test', s);
  const B = sim.B; B.headless = true; B.resolve = r => (res = r); B.paused = false;
  let t = 0, k = 0;
  while (sim.B && !sim.B.over && t < 600) {
    if (k++ % 15 === 0) for (const r of sim.B.regs) {
      if (r.side !== 'p' || !sim.alive(r) || r.routing) continue;
      if (use) use(r);
      if (r.order || r.ranged && r.cool > 0) continue;
      let n = null, nd = 1e9;
      for (const e of sim.B.regs) if (e.side === 'e' && sim.alive(e) && !e.routing) { const dd = sim.rdist(r, e); if (dd < nd) { nd = dd; n = e; } }
      if (n && !sim.abOn(r, 'hold')) r.order = { type: 'attack', tg: n };
    }
    sim.simStep(1 / 30); t += 1 / 30;
  }
  const hp = res.att.reduce((s2, u) => s2 + u.hp, 0);
  return { win: res.win === 'att', hp };
}
const N = Math.max(10, Number(process.env.RUNS || 10));
const near = (r, d) => sim.B.regs.some(e => e.side === 'e' && sim.alive(e) && !e.routing && sim.rdist(r, e) < d);
function rate(a, d, use) { let w = 0, hp = 0; for (let i = 0; i < N; i++) { seed(i + 1); const x = fight(a, d, 500 + i, use); if (x.win) w++; hp += x.hp; } return { w: Math.round(100 * w / N), hp: Math.round(hp / N) }; }

const kn0 = rate(['knight', 'knight', 'knight'], ['spear', 'spear', 'spear']);
const kn1 = rate(['knight', 'knight', 'knight'], ['spear', 'spear', 'spear'], r => { if (near(r, 30)) sim.useAbility(r, 'charge'); });
const ar0 = rate(['arch', 'arch', 'arch'], ['mil', 'mil', 'mil']);
const ar1 = rate(['arch', 'arch', 'arch'], ['mil', 'mil', 'mil'], r => { if (near(r, 50)) sim.useAbility(r, 'volley'); });
// defending foot against charging knights: they stand either way, with or without «hold»
function defend(use) { let w = 0, hp = 0;
  for (let i = 0; i < N; i++) { seed(i + 1);
    const att = ['knight', 'knight', 'knight'].map(t => st.mk(t)), def = ['spear', 'spear', 'spear'].map(t => st.mk(t)); let res;
    sim.setupBattle(att, def, 'pol', 'rus', 'def', 'test', 700 + i);
    const B = sim.B; B.headless = true; B.resolve = r => (res = r); B.paused = false;
    let t = 0, k = 0;
    while (sim.B && !sim.B.over && t < 600) { if (use && k++ % 15 === 0) for (const r of sim.B.regs) if (r.side === 'p' && sim.alive(r) && !r.routing && near(r, 14)) sim.useAbility(r, 'hold');
      sim.simStep(1 / 30); t += 1 / 30; }
    if (res.win === 'def') w++; hp += res.def.reduce((s2, u) => s2 + u.hp, 0); }
  return { w: Math.round(100 * w / N), hp: Math.round(hp / N) }; }
const dr0 = defend(false), dr1 = defend(true);
console.log(`abilities: knights vs spears ${kn0.w}% → charge ${kn1.w}% (hp ${kn0.hp}→${kn1.hp}); archers vs militia ${ar0.w}% → volley ${ar1.w}% (hp ${ar0.hp}→${ar1.hp}); spears holding vs knights ${dr0.w}% → hold ${dr1.w}% (hp ${dr0.hp}→${dr1.hp})`);
assert.ok(kn1.w + kn1.hp / 10 > kn0.w + kn0.hp / 10, 'charge does not help');
assert.ok(ar1.w + ar1.hp / 10 >= ar0.w + ar0.hp / 10, 'volley does not help');
assert.ok(dr1.w + dr1.hp / 10 > dr0.w + dr0.hp / 10, 'hold does not help');

// cooldowns and rally
st.newGame(1, 'rus');
sim.setupBattle([st.mk('gen'), st.mk('spear')], [st.mk('mil')], 'rus', 'pol', 'att', 'test', 5);
const g = sim.B.regs.find(r => r.gen), sp = sim.B.regs.find(r => r.t === 'spear');
assert.ok(sim.useAbility(g, 'rally') && !sim.useAbility(g, 'rally'), 'cooldown');
assert.ok(!sim.useAbility(sp, 'volley'), 'spearmen have no volley');
g.ab.rally.cd = 0; sp.routing = true; sp.morale = 0; sp.x = g.x + 5; sp.z = g.z;
sim.useAbility(g, 'rally');
assert.ok(!sp.routing && sp.morale >= 25, 'rally brings the routing back');

// traditions: battles teach the army; they survive the general's death
const gen = st.mk('gen'); W.makeGeneral(gen, 'rus');
for (let i = 0; i < 5; i++) W.grantXP([gen], true);
assert.equal(gen.g.army.tr.length, 3, 'three traditions after 5 victories (' + gen.g.army.xp + ' pts)');
assert.ok(gen.g.army.tr.every(t => TRADITIONS[t]));
const sold = st.mk('spear'), res = { win: 'def', att: [sold], def: [] };
W.afterBattle(res, [], [gen, sold], []);
assert.ok(sold.legacy && sold.legacy.tr.length === 3, 'legacy kept by a survivor');
const P = st.P('kiev'); const ng = st.mk('gen'); P.army = [sold, ng]; W.nameGenerals();
assert.equal(ng.g.army.tr.length, 3, 'the new general inherits the traditions');
assert.ok(!sold.legacy);
console.log(`traditions: ok (${TRAD_XP.join('/')} points → ${ng.g.army.tr.map(t => TRADITIONS[t].n).join(', ')})`);
