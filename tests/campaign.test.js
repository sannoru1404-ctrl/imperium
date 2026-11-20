// Bots play whole campaigns: checks for crashes, determinism and rough balance.
import './setup.js';
import * as st from '../src/js/state.js';
import { endTurn } from '../src/js/turn.js';
import { moveArmy, recruit } from '../src/js/map.js';
import { setAutoAnswer } from '../src/js/ui.js';
import { str, garUnits, adj, P } from '../src/js/state.js';
import { PLAYER, FACT, UT } from '../src/js/data.js';

setAutoAnswer(() => 'auto');
const N = Number(process.env.CAMPAIGNS || 100), MAX_TURNS = 80;

async function playerBot() {
  const G = st.G;
  // recruit in frontier provinces
  for (const p of G.prov.filter(p => p.owner === PLAYER)) {
    const front = adj(p.id).some(a => P(a).owner !== PLAYER);
    if (!front) continue;
    G.sel = p.id;
    const plan = ['spear', 'druzh', 'arch', 'knight', 'druzh', 'hasb', 'spear'];
    if (!p.army.some(u => UT[u.t].general) && G.fac[PLAYER].gold > 600) recruit('gen');
    while (p.army.length < 8 && p.rec < p.lvl) { const t = plan[p.army.length % plan.length]; if (G.fac[PLAYER].gold < UT[t].cost + 150) break; recruit(t); }
  }
  // attack when clearly stronger, never leave Rome empty early
  for (const p of G.prov.filter(p => p.owner === PLAYER && p.army.length && !p.moved)) {
    if (p.id === st.capOf(PLAYER) && p.army.length < 6) continue;
    const t = adj(p.id).map(P).filter(x => x.owner !== PLAYER)
      .sort((a, b) => (str(a.army) + str(garUnits(a), 1.2)) - (str(b.army) + str(garUnits(b), 1.2)))[0];
    if (!t || str(p.army) < 1.3 * (str(t.army) + str(garUnits(t), 1.2))) continue;
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
