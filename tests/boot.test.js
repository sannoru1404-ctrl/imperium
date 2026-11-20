// Loads the real entry point (main.js) the way the browser does, to catch import/declaration errors.
import './setup.js';
await import('../src/js/main.js');
for (const f of ['newGame', 'loadGame', 'endTurn', 'tapProv', 'recruit', 'bForm', 'showSaves', 'showHelp'])
  if (typeof globalThis[f] !== 'function') throw new Error('missing global ' + f);
globalThis.newGame();
console.log('boot: ok (main.js loads, globals exposed, new game starts)');
