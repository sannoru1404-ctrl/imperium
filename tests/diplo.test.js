// Diplomacy: treaty ladder, allies called into wars, vassals, tribute, AI treaties over time.
import './setup.js';
import assert from 'node:assert';
import * as st from '../src/js/state.js';
import * as D from '../src/js/diplo.js';
import * as R from '../src/js/rules.js';
import { endTurn } from '../src/js/turn.js';
import { setAutoAnswer } from '../src/js/ui.js';
setAutoAnswer(() => 'auto');
const K = (a, b) => [a, b].sort().join('|');

st.newGame(4, 'rus');
let G = st.G;
// ladder
G.att.hun = 40; G.att.byz = 40;
assert.ok(D.propose('hun', 'nap')[0]); assert.equal(D.rel('rus', 'hun'), 'nap');
assert.ok(!D.proposal('hun', 'nap')[0], 'nap twice');
assert.ok(D.propose('hun', 'trade')[0]); assert.ok(D.tradeIncome('rus') > 0);
G.relSince[K('rus', 'byz')] = -20;
assert.ok(D.propose('byz', 'def')[0]); assert.equal(D.rel('rus', 'byz'), 'def');

// defensive ally joins when its partner is attacked, not when the partner attacks
D.declareWar('sel', 'rus');
assert.ok(D.atWar('byz', 'sel'), 'Byzantium must defend Rus');
st.newGame(4, 'rus'); G = st.G;
G.rel[K('rus', 'hun')] = 'def';
D.declareWar('rus', 'novg');
assert.ok(!D.atWar('hun', 'novg'), 'a defensive ally does not join an attack');
G.rel[K('rus', 'hun')] = 'ally'; D.declareWar('rus', 'boh');
assert.ok(D.atWar('hun', 'boh'), 'a military ally joins the attack');
// the player is called in by a defensive treaty
G.rel[K('rus', 'byz')] = 'def'; D.declareWar('ven', 'byz');
assert.ok(D.atWar('rus', 'ven'), 'player must honour the treaty');
// breaking a treaty costs trust
const t0 = G.att.fra; G.rel[K('rus', 'den')] = 'trade'; D.declareWar('rus', 'den');
assert.ok(G.att.fra <= t0 - 20, 'treachery not punished');

// vassal: a small crushed state at war
st.newGame(4, 'rus'); G = st.G;
for (const p of G.prov.filter(p => p.owner === 'cuman').slice(1)) p.owner = 'rus';
for (const p of G.prov.filter(p => p.owner === 'cuman')) p.army = [];
G.turn = 5; G.relSince[K('rus', 'cuman')] = 1;
assert.ok(D.propose('cuman', 'vassal')[0], D.proposal('cuman', 'vassal')[1]);
assert.equal(D.overlord('cuman'), 'rus'); assert.equal(D.rel('rus', 'cuman'), 'ally');
assert.ok(D.tributeIncome('rus') > 0 && D.tributeIncome('cuman') < 0);
D.declareWar('rus', 'cher');
assert.ok(D.atWar('cuman', 'cher'), 'vassal follows its lord to war');
assert.ok(!D.proposal('pol', 'vassal')[0], 'a great power never becomes a vassal');

// tribute for peace
st.newGame(4, 'rus'); G = st.G; G.turn = 6;
D.declareWar('rus', 'polo'); G.relSince[K('rus', 'polo')] = 1;
for (const p of G.prov.filter(p => p.owner === 'polo')) p.army = [];
const inc0 = R.income('rus').net;
assert.ok(D.propose('polo', 'tribute')[0], D.proposal('polo', 'tribute')[1]);
assert.ok(!D.atWar('rus', 'polo') && R.income('rus').net > inc0, 'tribute must be paid');
D.declareWar('rus', 'polo');
assert.equal(D.tributesOf('rus').length, 0, 'war cancels tribute');

// AI makes treaties, vassals and tributes on its own
st.newGame(4, 'pol'); G = st.G;
for (let i = 0; i < 50; i++) await endTurn();
const rels = Object.values(G.rel), n = r => rels.filter(x => x === r).length;
console.log(`diplomacy: ok (after 50 years: nap ${n('nap')}, trade ${n('trade')}, def ${n('def')}, ally ${n('ally')}, war ${n('war')}, vassals ${Object.keys(G.vas).length}, tributes ${G.trib.length})`);
assert.ok(n('nap') + n('trade') + n('def') > 5, 'AI makes no treaties');
