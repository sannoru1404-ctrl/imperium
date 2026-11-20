// Save slots: save, change state, load back, compare; old-format migration.
import './setup.js';
import * as st from '../src/js/state.js';
import { endTurn } from '../src/js/turn.js';
import { setAutoAnswer } from '../src/js/ui.js';
setAutoAnswer(() => 'auto');

st.newGame(7);
await endTurn(); await endTurn();
const snap = JSON.stringify(st.G.prov);
const turn = st.G.turn;
if (!st.saveSlot('2')) throw new Error('save failed');
await endTurn(); await endTurn();
if (!st.loadSlot('2')) throw new Error('load failed');
if (st.G.turn !== turn || JSON.stringify(st.G.prov) !== snap) throw new Error('loaded state differs');
// continuing from a loaded save is deterministic
await endTurn(); const a = JSON.stringify(st.G.prov);
st.loadSlot('2'); await endTurn(); const b = JSON.stringify(st.G.prov);
if (a !== b) throw new Error('replay after load differs');
// saves from the old Roman version (format v1 and the pre-slot format) are ignored, not loaded broken
localStorage.clear();
localStorage.setItem('imperium_save', JSON.stringify({ G: { ...st.G, pick: [] }, uid: 500 }));
localStorage.setItem('imperium_v1_auto', JSON.stringify({ v: 1, G: { ...st.G, pick: [] }, uid: 500 }));
if (st.readSlot('auto')) throw new Error('old-format save should be ignored');
console.log('saves: ok (slot save/load, deterministic continue, old formats ignored)');
