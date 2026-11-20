// Drives the 3D battle code against a three.js mock to catch runtime errors in rendering/input.
import './setup.js';
import './three-mock.js';
import * as sim from '../src/js/battle-sim.js';
import * as r3 from '../src/js/battle-3d.js';
import * as hud from '../src/js/battle-hud.js';
import { mk, newGame } from '../src/js/state.js';

newGame(5);
const att = ['gen', 'druzh', 'spear', 'arch', 'knight', 'hasb', 'mil'].map(t => mk(t));
const def = ['gen', 'druzh', 'xbow', 'knight', 'arch', 'spear'].map(t => mk(t));
const pr = sim.tactical(att, def, 'rus', 'pol', 'att', 'Тест');
hud.bSelAll(); hud.bForm(); hud.bForm();
if (!r3.S3) { console.error('3D did not start'); process.exit(1); }
const C = globalThis.CANVAS.L;
C.pointerdown({ pointerId: 1, clientX: 220, clientY: 315, button: 0 }); C.pointerup({ pointerId: 1, clientX: 220, clientY: 315, button: 0 });
C.pointerdown({ pointerId: 1, clientX: 100, clientY: 100, button: 0 }); C.pointermove({ pointerId: 1, clientX: 160, clientY: 140 });
C.pointerdown({ pointerId: 2, clientX: 200, clientY: 200, button: 0 }); C.pointermove({ pointerId: 2, clientX: 260, clientY: 280 });
C.pointerup({ pointerId: 2 }); C.pointerup({ pointerId: 1, clientX: 160, clientY: 140 });
C.wheel({ deltaY: 100, preventDefault() {} });
hud.bSelAll(); hud.bPause(); hud.bSpeed(); hud.bSpeed(); hud.bCharge(); hud.cardTap(sim.B.regs[0].id); hud.bHalt(); hud.bCharge();
let now = 0, frames = 0;
while (sim.B && !sim.B.over && frames < 40000) { now += 33; globalThis.__raf(now); frames++; }
const corpses = r3.S3 && r3.S3.corpseN;
await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0));
sim.endBattle();
const res = await pr;
console.log(`frames ${frames}, corpses ${corpses}, result ${res.win}, cleaned up: ${r3.S3 === null && sim.B === null}`);
if (!(r3.S3 === null && sim.B === null)) process.exit(1);
