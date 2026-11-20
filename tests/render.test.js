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
// a siege battle: walls, towers, gate, town and ladders on the mock renderer
const att2 = ['gen', 'druzh', 'druzh', 'spear', 'spear', 'arch', 'knight'].map(t => mk(t));
const def2 = ['gen', 'spear', 'druzh', 'arch', 'xbow'].map(t => mk(t));
const pr2 = sim.tactical(att2, def2, 'rus', 'pol', 'att', 'Осада', { wall: 2, ram: true, tower: true, treb: true });
if (!r3.S3 || !r3.S3.gate || !r3.S3.ladders || !r3.S3.tw || !r3.S3.tb) { console.error('siege scenery missing'); process.exit(1); }
const C2 = globalThis.CANVAS.L;
hud.bSelAll(); C2.pointerdown({ pointerId: 1, clientX: 220, clientY: 315, button: 0 }); C2.pointerup({ pointerId: 1, clientX: 220, clientY: 315, button: 0 });
hud.bPause(); hud.bSpeed(); hud.bSpeed(); hud.bCharge();
let f2 = 0, ladders = 0, docked = false, stones = 0; while (sim.B && !sim.B.over && f2 < 40000) { now += 33; globalThis.__raf(now); f2++; ladders = Math.max(ladders, r3.S3 ? r3.S3.ladders.count : 0); if (sim.B && sim.B.siege.tw.docked) docked = true; if (r3.S3 && r3.S3.stoneFly) stones++; }
const gateOpen = sim.B && sim.B.siege.open;
await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0));
sim.endBattle(); const res2 = await pr2;
console.log(`siege render: frames ${f2}, max ladders ${ladders}, gate broken ${gateOpen}, tower docked ${docked}, stone frames ${stones}, result ${res2.win}`);
if (!stones) { console.error('trebuchet does not throw'); process.exit(1); }
