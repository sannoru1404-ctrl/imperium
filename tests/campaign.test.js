// Bots play whole campaigns: checks for crashes, determinism and rough balance.
import './setup.js';
import * as st from '../src/js/state.js';
import { endTurn } from '../src/js/turn.js';
import { moveArmy, recruit, upgrade } from '../src/js/map.js';
import { setAutoAnswer } from '../src/js/ui.js';
import { str, garUnits, adj, P } from '../src/js/state.js';
import { PLAYER, FACT, UT } from '../src/js/data.js';
import { reliefStr } from '../src/js/war.js';

let WANT = 'auto';   // what the bot answers to the battle dialog: 'auto' (auto-resolve) or 'siege'
setAutoAnswer((t, btns) => (btns.some(b => b[0] === 'war') ? 'war' : btns.some(b => b[0] === WANT) ? WANT : 'auto'));
const D = await import('../src/js/diplo.js');
// default: 20 campaigns of 100 years for each of the six great powers
const N = Number(process.env.CAMPAIGNS || 20), MAX_TURNS = Number(process.env.MAX_TURNS || 100);
const FACTIONS = (process.env.FACTIONS || 'rus,pol,hre,hun,byz,fra').split(',');

async function playerBot() {
  const G = st.G;
  const R = await import('../src/js/rules.js');
  // economy: research, a decree when rich, one building per year in the capital or a big town
  if (!G.fac[PLAYER].res) { const t = Object.keys((await import('../src/js/data.js')).TECH).find(id => R.techAvailable(PLAYER, id)); if (t) R.setResearch(PLAYER, t); }
  for (const pv of R.fullProvinces(PLAYER)) if (R.provEdict(pv) === 'none' && G.fac[PLAYER].gold > 1500) R.setEdict(PLAYER, pv, 'trade');
  for (const p of G.prov.filter(p => p.owner === PLAYER && !p.cons)) {
    for (const b of (R.foodOf(PLAYER).net < 3 ? ['farm', 'barracks', 'market', 'church', 'range', 'stable'] : ['barracks', 'farm', 'market', 'church', 'range', 'stable'])) { const o = R.buildOptions(p).find(x => x.b === b); if (o && o.ok && G.fac[PLAYER].gold - o.cost > 900) { R.startBuild(p, b); break; } }
  }
  // grow towns when rich (more recruits a year)
  if (G.fac[PLAYER].gold > 2500) { const p = G.prov.filter(p => p.owner === PLAYER && p.lvl < 3 && !p.occ).sort((a, b) => b.base - a.base)[0]; if (p) { G.sel = p.id; upgrade(); } }
  const front = p => adj(p.id).some(a => P(a).owner !== PLAYER);
  const hasGen = p => p.army.some(u => UT[u.t].general);
  // interior troops march towards the front and join an army with a general
  for (const p of G.prov.filter(p => p.owner === PLAYER && p.army.length && !p.moved && !front(p) && !hasGen(p))) {
    const to = adj(p.id).map(P).filter(q => q.owner === PLAYER).sort((a, b) => (front(b) - front(a)) || (hasGen(b) - hasGen(a)))[0];
    if (!to || to.army.length + p.army.length > 12) continue;
    G.sel = p.id; G.pick = new Set(p.army.map(u => u.id)); await moveArmy(p, to);
  }
  // recruit in frontier lands: a general first, then troops the buildings allow (a full army of 12)
  for (const p of G.prov.filter(p => p.owner === PLAYER)) {
    if (!front(p)) continue;
    G.sel = p.id;
    if (!p.army.some(u => UT[u.t].general) && R.generals(PLAYER) < R.maxGenerals(PLAYER) && G.fac[PLAYER].gold > 600) recruit('gen');
    const plan = ['spear', 'druzh', 'arch', 'knight', 'druzh', 'hasb', 'spear', 'mil'].filter(t => R.unitAvailable(p, t));
    while (plan.length && p.army.length < (hasGen(p) ? 12 : 6) && p.rec < p.lvl) { const t = plan[p.army.length % plan.length]; if (G.fac[PLAYER].gold < R.unitCost(PLAYER, t, p) + 150) break; const fd = R.foodOf(PLAYER); if (fd.net < 2 && fd.store < 20) break; recruit(t); }
  }
  // diplomacy: keep friends, make peace on distant fronts when fighting too many wars
  const wars = D.warsOf(PLAYER);
  if (wars.length > 2) for (const f of wars) if (!D.borders(PLAYER, f) && D.proposal(f, 'peace')[0]) D.propose(f, 'peace');
  for (const f of Object.keys(FACT)) if (f !== PLAYER && f !== 'rebel' && D.alive(f) && D.rel(PLAYER, f) === 'peace' && D.borders(PLAYER, f) && D.proposal(f, 'nap')[0] && !D.atWar(PLAYER, f)) { if (G.fac[PLAYER].gold > 0 && (st.G.turn % 7 === 0)) D.propose(f, 'trade'); }
  // a new war: against a weaker neighbour, only while fighting fewer than two bordering wars;
  // trade partners only when there is nobody else to fight; never allies
  const borderWars = D.warsOf(PLAYER).filter(f => D.borders(PLAYER, f)).length;
  const enemyNear = G.prov.some(p => p.owner === PLAYER && adj(p.id).some(a => P(a).owner === 'rebel' || (P(a).owner !== PLAYER && D.atWar(PLAYER, P(a).owner))));
  const canTarget = x => x.owner === 'rebel' || D.atWar(PLAYER, x.owner) ||
    (borderWars < 2 && D.power(x.owner) < D.power(PLAYER) && (['peace', 'nap'].includes(D.rel(PLAYER, x.owner)) || (!enemyNear && D.rel(PLAYER, x.owner) === 'trade')));
  // attack when clearly stronger, with a general, never leave the capital empty early
  for (const p of G.prov.filter(p => p.owner === PLAYER && p.army.length && !p.moved)) {
    if (!p.army.some(u => UT[u.t].general)) continue;
    if (p.id === st.capOf(PLAYER) && p.army.length < 6) continue;
    if (p.besiege) continue;   // the siege does its work
    const t = adj(p.id).map(P).filter(x => x.owner !== PLAYER && canTarget(x))
      .sort((a, b) => (str(a.army) + str(garUnits(a), 1.2) + reliefStr(a)) - (str(b.army) + str(garUnits(b), 1.2) + reliefStr(b)))[0];
    if (!t) continue;
    const ratio = (str(p.army) + reliefStr(t, PLAYER, p)) / (str(t.army) + str(garUnits(t), 1.2) + reliefStr(t) + 0.1);
    const walled = R.wallLevel(t) > 0 && !t.siege;
    if (ratio < 1.15 && !(walled && ratio > 0.8)) continue;
    WANT = walled && ratio < 1.6 ? 'siege' : 'auto';   // blockade a strong walled town instead of storming it
    G.sel = p.id; G.pick = new Set(p.army.map(u => u.id));
    await moveArmy(p, t);
    WANT = 'auto';
    if (G.over) return;
  }
}

async function diag() {
  const R = await import('../src/js/rules.js'), D = await import('../src/js/diplo.js');
  const G = st.G, F = PLAYER, me = G.prov.filter(p => p.owner === F), inc = R.income(F), fd = R.foodOf(F);
  const units = me.reduce((s, p) => s + p.army.length, 0);
  const foes = new Set(me.flatMap(p => adj(p.id).map(P).filter(q => q.owner !== F).map(q => q.owner)));
  console.log(`y${G.turn} lands ${me.length} gold ${G.fac[F].gold} net ${inc.net} (inc ${inc.inc} up ${inc.up}) food ${fd.net}/${fd.store}${R.starving(F) ? '!' : ''} units ${units} gens ${R.generals(F)}/${R.maxGenerals(F)} | ${[...foes].map(f => f + ':' + D.rel(F, f)).join(' ')}`);
  const bad = me.filter(p => R.orderOf(p) < 0).map(p => p.n + R.orderOf(p)); if (bad.length) console.log('   unrest', bad.join(', '));
}
async function runCampaign(seed, faction) {
  st.newGame(seed, faction);
  const at = {};
  while (!st.G.over && st.G.turn < MAX_TURNS) {
    if (st.G.turn % 20 === 0) at[st.G.turn] = st.G.prov.filter(p => p.owner === PLAYER).length;
    if (process.env.DIAG && st.G.turn % 10 === 0) await diag();
    await playerBot();
    if (st.G.over) break;
    await endTurn();
  }
  const owners = {};
  st.G.prov.forEach(p => (owners[p.owner] = (owners[p.owner] || 0) + 1));
  const result = !st.G.prov.some(p => p.owner === PLAYER) ? 'loss' : st.G.over ? 'win' : 'timeout';
  return { result, turn: st.G.turn, owners, at, hash: JSON.stringify(st.G.prov.map(p => [p.owner, p.army.length, p.gar])) };
}

for (const FAC of FACTIONS) {
const stats = { win: 0, loss: 0, timeout: 0 }, turns = [], factionShare = {}, curve = {}, winTurns = [];
for (let i = 1; i <= N; i++) {
  const r = await runCampaign(i, FAC);
  stats[r.result]++; turns.push(r.turn); if (r.result === 'win') winTurns.push(r.turn);
  for (const t in r.at) { curve[t] = curve[t] || [0, 0]; curve[t][0] += r.at[t]; curve[t][1]++; }
  for (const f in r.owners) factionShare[f] = (factionShare[f] || 0) + r.owners[f] / N;
}
// determinism: same seed -> same outcome
const a = await runCampaign(42, FAC), b = await runCampaign(42, FAC);
if (a.hash !== b.hash) { console.error('NOT DETERMINISTIC'); process.exit(1); }
const wt = winTurns.sort((x, y) => x - y);
console.log(`campaigns ${FAC}: ${N} | player wins ${stats.win}, losses ${stats.loss}, timeouts ${stats.timeout} | avg end turn ${(turns.reduce((x, y) => x + y, 0) / N).toFixed(1)}${wt.length ? ` | win turn median ${wt[Math.floor(wt.length / 2)]}, range ${wt[0]}–${wt.at(-1)}` : ''}`);
console.log(`  ${PLAYER} lands by year: ` + Object.entries(curve).map(([t, v]) => `${t}: ${(v[0] / v[1]).toFixed(1)}${v[1] < N ? ` (${v[1]} games)` : ''}`).join(', '));
console.log('  avg provinces at end:', Object.entries(factionShare).sort((x, y) => y[1] - x[1]).map(([f, v]) => `${f} ${v.toFixed(1)}`).join(', '));
}
console.log('determinism: ok');
