// Loads the real entry point (main.js) the way the browser does, to catch import/declaration errors.
import './setup.js';
await import('../src/js/main.js');
for (const f of ['newGame', 'loadGame', 'endTurn', 'tapProv', 'recruit', 'bForm', 'showSaves', 'showHelp'])
  if (typeof globalThis[f] !== 'function') throw new Error('missing global ' + f);
globalThis.newGame();
console.log('boot: ok (main.js loads, globals exposed, new game starts)');
// open every new dialog once
globalThis.showRealm('sum'); globalThis.showRealm('edict'); globalThis.showRealm('tech');
globalThis.pickTech('mil1'); globalThis.pickEdict('tax');
globalThis.tapProv('kiev'); globalThis.setTab('build'); globalThis.openBuild(); globalThis.doBuild('market'); globalThis.setTab('army');
const st = await import('../src/js/state.js');
if (!st.P('kiev').cons) throw new Error('construction did not start');
console.log('boot: dialogs ok (realm, decree, research, build)');
globalThis.showRealm('diplo');
const D = await import('../src/js/diplo.js');
if (D.rel('rus', 'cuman') !== 'war' || D.rel('rus', 'pol') !== 'ally') throw new Error('starting relations wrong');
console.log('boot: diplomacy ok');
