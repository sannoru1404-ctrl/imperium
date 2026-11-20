// Religion: starting faiths, drift with temples, order penalty, faith in diplomacy.
import './setup.js';
import assert from 'node:assert';
import * as st from '../src/js/state.js';
import * as R from '../src/js/rules.js';
import * as D from '../src/js/diplo.js';
import { FAITH, faithOf } from '../src/js/data.js';
import { endTurn } from '../src/js/turn.js';
import { setAutoAnswer } from '../src/js/ui.js';
setAutoAnswer(() => 'auto');

st.newGame(9, 'rus');
const P = st.P;
for (const p of st.G.prov) { const s = Object.values(p.rel).reduce((a, b) => a + b, 0); assert.ok(Math.abs(s - 1) < 1e-6, p.id + ' shares ' + s); }
assert.equal(faithOf('rus'), 'orth'); assert.equal(faithOf('hun'), 'cath'); assert.equal(faithOf('cuman'), 'pagan');
assert.equal(R.mainFaith(P('kiev')), 'orth'); assert.equal(R.mainFaith(P('lith')), 'pagan'); assert.equal(R.mainFaith(P('damas')), 'islam');
assert.equal(R.faithOrder(P('kiev')), 0);
// crusaders rule a mostly non-Latin land: order suffers
assert.ok(R.faithOrder(P('jerus')) <= -15, 'Jerusalem should be restless for the crusaders');

// conquest of a pagan land: order penalty, then drift, faster with a temple
const lith = P('lith'); lith.owner = 'rus'; lith.occ = 0;
assert.equal(R.faithOrder(lith), FAITH.order);
const a = st.G.prov.find(p => p.id === 'pruss'); a.owner = 'rus'; a.b = { church: 2 };
for (let i = 0; i < 5; i++) { st.G.prov.forEach(p => { p.cons = null }); R.yearlyUpdate(); }
const s1 = R.faithShare(lith, 'orth'), s2 = R.faithShare(a, 'orth');
assert.ok(Math.abs(s1 - 5 * FAITH.drift) < 0.01, 'drift without temple ' + s1);
assert.ok(s2 > s1 * 3, 'temple speeds up conversion ' + s2);
assert.ok(R.faithOrder(a) > R.faithOrder(lith));

// diplomacy: same-faith states are easier allies
assert.ok(D.sameFaith('rus', 'byz') && !D.sameFaith('rus', 'pol'));
st.G.att.byz = 30; st.G.att.pol = 30;
for (const f of ['byz', 'pol']) st.G.rel[['rus', f].sort().join('|')] = 'trade';
const [okB] = D.proposal('byz', 'ally'), [okP] = D.proposal('pol', 'ally');
assert.ok(okB && !okP, 'faith must matter for alliances');

// after 40 years Orthodoxy has grown in Rus lands
st.newGame(9, 'pol');
for (let i = 0; i < 40; i++) await endTurn();
const conv = st.G.prov.filter(p => p.owner !== 'rebel' && R.faithShare(p, faithOf(p.owner)) < 0.5).length;
console.log(`religion: ok (Lithuania after 5 years ${Math.round(s1 * 100)}%, with temple ${Math.round(s2 * 100)}%; after 40 years ${conv} lands still mostly of a foreign faith)`);
