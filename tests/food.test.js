// Food: granary, famine (order, no replenishment), attrition on foreign soil, AI disbanding, farms.
import './setup.js';
import assert from 'node:assert';
import * as st from '../src/js/state.js';
import * as R from '../src/js/rules.js';
import { FOOD, UT } from '../src/js/data.js';
import { endTurn } from '../src/js/turn.js';
import { setAutoAnswer } from '../src/js/ui.js';
setAutoAnswer(() => 'auto');

st.newGame(5, 'rus');
const G = st.G, P = st.P, kiev = P('kiev');
const f0 = R.foodOf('rus');
assert.ok(f0.net > 0 && f0.store === FOOD.startStore, 'Rus starts fed');
// a farm level adds food, a bigger town eats more
const turov = P('turov'), t0 = R.regionFood(turov);
turov.b.farm = 2; assert.equal(R.regionFood(turov), t0 + 3);
turov.lvl = 3; assert.equal(R.regionFood(turov), t0 + 3 - FOOD.town[3]);
// event hosts and rebels do not eat
assert.ok(!R.eatsFood('mong') && !R.eatsFood('rebel') && R.eatsFood('rus'));

// a huge army empties the granary, then famine
for (let i = 0; i < 40; i++) P('smol').army.push(st.mk('mil'));
const net = R.foodOf('rus').net; assert.ok(net < -FOOD.startStore);
const ord = R.orderOf(kiev);
R.foodYear();
assert.ok(R.starving('rus') && G.fac.rus.food === 0);
assert.equal(R.orderOf(kiev), ord + FOOD.famineOrder);
// no replenishment while starving
kiev.army.forEach(u => u.hp = 50);
await endTurn();
assert.ok(kiev.army.every(u => u.hp === 50), 'regiments must not heal in famine');
P('smol').army = [];
R.foodYear();
assert.ok(!R.starving('rus'), 'famine ends when food is back');

// attrition: a besieging army loses men, a home army heals
st.newGame(5, 'rus');
const k = st.P('kiev'), tur = st.P('turov');
k.besiege = 'cum1'; k.army.forEach(u => u.hp = 90); tur.army = [st.mk('spear', 60)];
await endTurn();
assert.ok(k.army.every(u => u.hp <= 90 - FOOD.siegeLoss || u.hp === 20 ), 'besiegers lose men');
assert.equal(tur.army[0].hp, 72, 'home army heals');

// AI: a starving state disbands regiments until the food balance is even
st.newGame(5, 'pol');
const hre = st.G.prov.filter(p => p.owner === 'hre');
for (let i = 0; i < 150; i++) hre[i % hre.length].army.push(st.mk('mil'));
st.G.fac.hre.food = 0; st.G.fac.hre.famine = true;
const before = hre.reduce((s, p) => s + p.army.length, 0);
await endTurn();
const after = hre.reduce((s, p) => s + p.army.length, 0);
assert.ok(after < before - 50, `AI did not disband (${before} → ${after})`);
console.log(`food: ok (Rus start +${f0.net}, famine order ${FOOD.famineOrder}, HRE disbanded ${before - after} regiments)`);
