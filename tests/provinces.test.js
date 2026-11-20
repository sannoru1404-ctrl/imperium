// Provinces: whole-province bonuses, provincial capital, decrees that lapse when the province breaks.
import './setup.js';
import assert from 'node:assert';
import * as st from '../src/js/state.js';
import * as R from '../src/js/rules.js';
import { PROVINCES, PROV_OF, PROV_DEF as REGION_DEF } from '../src/js/data.js';
import { PROVINCE_BORDERS } from '../src/js/mapdata.js';

// every region in exactly one province, capitals are the first region
assert.equal(Object.keys(PROV_OF).length, REGION_DEF.length);
for (const pv of Object.values(PROVINCES)) { assert.ok(pv.regs.length >= 1 && pv.regs.length <= 4); assert.equal(pv.cap, pv.regs[0]); }
assert.ok(PROVINCE_BORDERS.length > 1000, 'province borders missing');

st.newGame(7, 'rus');
const G = st.G, P = st.P;
assert.ok(R.ownsProvince('rus', 'p_kiev'), 'Rus starts with the whole Kiev land');
assert.ok(!R.ownsProvince('rus', 'p_volyn'), 'Galich is independent in 1100');
assert.ok(R.isProvCap(P('kiev')) && !R.isProvCap(P('turov')));

// bonus: income and order drop when the province is broken
const turov = P('turov'), inc0 = R.provIncome(turov), ord0 = R.orderOf(turov);
G.fac.rus.gold = 1000;
assert.ok(R.setEdict('rus', 'p_kiev', 'tax'));
assert.equal(G.fac.rus.gold, 800);
assert.equal(R.edictAt(turov), 'tax');
assert.ok(R.provIncome(turov) > inc0 && R.orderOf(turov) === ord0 - 15);
assert.ok(!R.setEdict('rus', 'p_volyn', 'tax'), 'no decree without the whole province');
assert.ok(!R.setEdict('rus', 'p_kiev', 'tax'), 'same decree twice');

P('pereya').owner = 'cuman';
assert.ok(!R.ownsProvince('rus', 'p_kiev'));
assert.equal(R.edictAt(turov), 'none', 'decree lapses with the province');
const incBroken = R.provIncome(turov), ordBroken = R.orderOf(turov);
assert.ok(incBroken < inc0, 'whole-province income bonus gone');
// Turov still holds the seat (Kiev): +5; whole-province +5 gone
assert.equal(ordBroken, ord0 - 5);
P('kiev').owner = 'cuman';
assert.equal(R.orderOf(turov), ord0 - 10, 'seat bonus gone with the capital');
// the new owner does not inherit the old decree
for (const id of ['kiev', 'pereya', 'turov']) P(id).owner = 'cuman';
assert.ok(R.ownsProvince('cuman', 'p_kiev'));
assert.equal(R.provEdict('p_kiev'), 'none');
// occupation breaks the province until it settles
P('turov').occ = 1;
assert.ok(!R.ownsProvince('cuman', 'p_kiev'));

// levy decree makes recruiting cheaper only inside the province
st.newGame(7, 'rus'); G.fac && (st.G.fac.rus.gold = 1000);
R.setEdict('rus', 'p_kiev', 'levy');
assert.ok(R.unitCost('rus', 'spear', P('kiev')) < R.unitCost('rus', 'spear', P('smol')));

// AI issues provincial decrees over a few years
st.newGame(11, 'pol');
const { endTurn } = await import('../src/js/turn.js');
for (let i = 0; i < 12; i++) await endTurn();
const issued = Object.values(st.G.pe).filter(r => r.f !== 'pol' && r.e !== 'none').length;
assert.ok(issued > 3, 'AI does not use provincial decrees: ' + issued);
const full = f => R.fullProvinces(f).length;
console.log(`provinces: ok (${Object.keys(PROVINCES).length} provinces; after 12 years HRE holds ${full('hre')} whole, Byzantium ${full('byz')}; AI decrees ${issued})`);
