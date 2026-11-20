// Generals, veterans, reinforcements, stances and events.
import './setup.js';
import assert from 'node:assert';
import * as st from '../src/js/state.js';
import { endTurn, autoResolve } from '../src/js/turn.js';
import { moveArmy } from '../src/js/map.js';
import { setAutoAnswer } from '../src/js/ui.js';
import { UT, PLAYER, FACT, EVENTS } from '../src/js/data.js';
import * as W from '../src/js/war.js';
import * as R from '../src/js/rules.js';
import * as sim from '../src/js/battle-sim.js';
import { atWar } from '../src/js/diplo.js';

setAutoAnswer((t, btns) => (btns.some(b => b[0] === 'war') ? 'war' : 'auto'));
st.newGame(7, 'rus');
let G = st.G;
const gens = G.prov.flatMap(p => p.army).filter(u => UT[u.t].general);
assert(gens.length > 10 && gens.every(u => u.g && u.g.name), 'every general has a name');

// veterans: strength grows with stars, XP is granted to survivors
const a = [st.mk('spear'), st.mk('spear')], b = [st.mk('spear'), st.mk('spear')];
b.forEach(u => (u.xp = 3));
assert(st.str(b) > st.str(a) * 1.15, 'veterans are stronger');
const g = st.mk('gen'); W.makeGeneral(g, 'rus');
for (let i = 0; i < 10; i++) W.grantXP([g], true);
assert(g.g.rank >= 4 && g.g.traits.length >= 1, 'general ranks up: ' + JSON.stringify(g.g));
// veterans in the battle sim
sim.setupBattle([st.mk('spear')], [Object.assign(st.mk('spear'), { xp: 3 })], 'rus', 'pol', 'att', 't', 5);
const vr = sim.B.regs.find(r => r.side === 'e');
assert(vr.morale === 115 && vr.xpB === 1.5, 'veteran regiment bonuses');
sim.setupBattle([st.mk('spear'), st.mk('druzh')], [st.mk('spear')], 'rus', 'pol', 'att', 't', 5, null, { ambush: true });
assert(sim.B.regs.filter(r => r.side === 'p').every(r => r.morale <= 80), 'ambushed column is shaken');

// win rate: 3-star army against a green one of the same make-up
let vw = 0;
for (let i = 0; i < 300; i++) {
  const x = ['spear', 'spear', 'druzh', 'arch'].map(t => Object.assign(st.mk(t), { xp: 2 }));
  const y = ['spear', 'spear', 'druzh', 'arch'].map(t => st.mk(t));
  if (autoResolve(x, y, 1).win === 'att') vw++;
}
console.log('war: veterans (2★) vs green, auto-resolve win', Math.round(vw / 3) + '%');
assert(vw > 180, 'veterans should usually win');

// reinforcements: a neighbouring army with a general joins and goes home afterwards
{
  const to = G.prov.find(p => p.owner !== PLAYER && p.owner !== 'rebel' && st.adj(p.id).filter(x => st.P(x).owner === p.owner).length >= 1);
  const home = st.adj(to.id).map(st.P).find(p => p.owner === to.owner);
  const from = st.adj(to.id).map(st.P).find(p => p !== home);
  home.army = [st.mk('gen'), st.mk('spear'), st.mk('spear')];
  const att = [st.mk('gen'), st.mk('knight')], def = [st.mk('mil')];
  const list = W.gatherReinforcements(from, to, 'xx', att, def);
  assert(list.some(x => x.p === home && x.side === 'def') && def.length === 4, 'defender reinforcements join');
  const res = autoResolve(att, def, 1);
  W.afterBattle(res, list);
  assert(!res.def.some(u => home.army.includes(u)) && home.army.every(u => u.hp >= 15), 'reinforcements return home');
}

// stances: camp makes the defender stronger, raids plunder the neighbour
{
  const p = G.prov.find(q => q.owner === PLAYER && q.army.some(u => UT[u.t].general));
  W.setStanceOf(p, 'camp');
  const [am, dm] = W.stanceMods(null, p, []);
  assert(dm === 1.25 && am === 1, 'camp bonus');
  const foe = st.adj(p.id).map(st.P).find(q => q.owner !== PLAYER);
  const g0 = G.fac[PLAYER].gold;
  const up0 = R.upkeepOf(PLAYER);
  W.setStanceOf(p, 'raid');
  assert(R.upkeepOf(PLAYER) < up0, 'raiders cost less');
  if (foe.owner !== 'rebel' && !atWar(PLAYER, foe.owner)) G.rel[[PLAYER, foe.owner].sort().join('|')] = 'war';
  W.raids();
  assert(G.fac[PLAYER].gold > g0 && st.adj(p.id).map(st.P).some(q => q.raided > 0), 'raid gives loot');
  W.setStanceOf(p, 'none');
}

// march: two steps through own lands in one year
{
  const p = G.prov.find(q => q.owner === PLAYER && q.army.some(u => UT[u.t].general) && st.adj(q.id).filter(x => st.P(x).owner === PLAYER).length);
  const n1 = st.adj(p.id).map(st.P).find(q => q.owner === PLAYER);
  n1.army = n1.army.filter(u => !UT[u.t].general);
  W.setStanceOf(p, 'march');p.moved = false;
  G.sel = p.id; G.pick = new Set(p.army.map(u => u.id));
  await moveArmy(p, n1);
  assert(!n1.moved && n1.mstep === 1, 'first march step leaves a move');
}

// events: the Teutonic Order and the Horde appear on time and go to war
st.newGame(11, 'pol');
G = st.G;
G.turn = EVENTS[0].turn - 1;
await endTurn();
assert(G.prov.some(p => p.owner === 'teut') && G.fac.teut.cap, 'Teutonic Order spawned');
assert(atWar('teut', 'pol'), 'Order is at war with Poland');
G.turn = EVENTS[1].turn - 1;
await endTurn();
assert(G.prov.filter(p => p.owner === 'mong').length >= 3, 'Horde spawned');
assert(atWar('mong', 'pol') && atWar('mong', 'hun'), 'Horde at war with everyone');
for (let i = 0; i < 6; i++) { await endTurn(); if (G.over) break; }
const mongLands = G.prov.filter(p => p.owner === 'mong').length;
console.log('war: Horde lands 6 years after arrival:', mongLands);
assert(st.saveSlot('1') && st.loadSlot('1'), 'save/load with new state');
console.log('war: ok (generals, veterans, reinforcements, stances, events)');
