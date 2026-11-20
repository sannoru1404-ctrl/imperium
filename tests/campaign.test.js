// Bots play whole campaigns: checks for crashes, determinism and rough balance.
import './setup.js';
import * as st from '../src/js/state.js';
import { endTurn } from '../src/js/turn.js';
import { moveArmy, recruit } from '../src/js/map.js';
import { setAutoAnswer } from '../src/js/ui.js';
import { str, garUnits, adj, P } from '../src/js/state.js';
import { PLAYER, FACT, UT } from '../src/js/data.js';
import { reliefStr } from '../src/js/war.js';

setAutoAnswer((t, btns) => (btns.some(b => b[0] === 'war') ? 'war' : 'auto'));
const N = Number(process.env.CAMPAIGNS || 100), MAX_TURNS = 80;

async function playerBot() {
  const G = st.G;
  const R = await import('../src/js/rules.js');
  // economy: research, a decree when rich, one building per year in the capital or a big town
  if (!G.fac[PLAYER].res) { const t = Object.keys((await import('../src/js/data.js')).TECH).find(id => R.techAvailable(PLAYER, id)); if (t) R.setResearch(PLAYER, t); }
  for (const pv of R.fullProvinces(PLAYER)) if (R.provEdict(pv) === 'none' && G.fac[PLAYER].gold > 1500) R.setEdict(PLAYER, pv, 'trade');
  for (const p of G.prov.filter(p => p.owner === PLAYER && !p.cons)) {
    for (const b of ['barracks', 'farm', 'market', 'church', 'range', 'stable']) { const o = R.buildOptions(p).find(x => x.b === b); if (o && o.ok && G.fac[PLAYER].gold - o.cost > 900) { R.startBuild(p, b); break; } }
  }
  // recruit in frontier lands: a general first, then troops the buildings allow
  for (const p of G.prov.filter(p => p.owner === PLAYER)) {
    const front = adj(p.id).some(a => P(a).owner !== PLAYER);
    if (!front) continue;
    G.sel = p.id;
    if (!p.army.some(u => UT[u.t].general) && R.generals(PLAYER) < R.maxGenerals(PLAYER) && G.fac[PLAYER].gold > 600) recruit('gen');
    const plan = ['spear', 'druzh', 'arch', 'knight', 'druzh', 'hasb', 'spear', 'mil'].filter(t => R.unitAvailable(p, t));
    while (plan.length && p.army.length < 8 && p.rec < p.lvl) { const t = plan[p.army.length % plan.length]; if (G.fac[PLAYER].gold < R.unitCost(PLAYER, t) + 150) break; recruit(t); }
  }
  // attack when clearly stronger, with a general, never leave the capital empty early
  for (const p of G.prov.filter(p => p.owner === PLAYER && p.army.length && !p.moved)) {
    if (!p.army.some(u => UT[u.t].general)) continue;
    if (p.id === st.capOf(PLAYER) && p.army.length < 6) continue;
    const t = adj(p.id).map(P).filter(x => x.owner !== PLAYER)
      .sort((a, b) => (str(a.army) + str(garUnits(a), 1.2) + reliefStr(a)) - (str(b.army) + str(garUnits(b), 1.2) + reliefStr(b)))[0];
    if (!t || str(p.army) < 1.3 * (str(t.army) + str(garUnits(t), 1.2) + reliefStr(t))) continue;
    G.sel = p.id; G.pick = new Set(p.army.map(u => u.id));
    await moveArmy(p, t);
    if (G.over) return;
  }
}

async function runCampaign(seed) {
  st.newGame(seed);
  while (!st.G.over && st.G.turn < MAX_TURNS) {
    await playerBot();
    if (st.G.over) break;
    await endTurn();
  }
  const owners = {};
  st.G.prov.forEach(p => (owners[p.owner] = (owners[p.owner] || 0) + 1));
  const result = !st.G.prov.some(p => p.owner === PLAYER) ? 'loss' : st.G.over ? 'win' : 'timeout';
  return { result, turn: st.G.turn, owners, hash: JSON.stringify(st.G.prov.map(p => [p.owner, p.army.length, p.gar])) };
}

const stats = { win: 0, loss: 0, timeout: 0 }, turns = [], factionShare = {};
for (let i = 1; i <= N; i++) {
  const r = await runCampaign(i);
  stats[r.result]++; turns.push(r.turn);
  for (const f in r.owners) factionShare[f] = (factionShare[f] || 0) + r.owners[f] / N;
}
// determinism: same seed -> same outcome
const a = await runCampaign(42), b = await runCampaign(42);
if (a.hash !== b.hash) { console.error('NOT DETERMINISTIC'); process.exit(1); }

console.log(`campaigns: ${N} | player wins ${stats.win}, losses ${stats.loss}, timeouts ${stats.timeout} | avg end turn ${(turns.reduce((x, y) => x + y, 0) / N).toFixed(1)}`);
console.log('avg provinces at end:', Object.entries(factionShare).map(([f, v]) => `${f} ${v.toFixed(1)}`).join(', '));
console.log('determinism: ok');
