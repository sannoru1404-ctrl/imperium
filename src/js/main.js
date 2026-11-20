// Entry point: wires modules together and exposes the functions that inline onclick handlers call.
import { newGame, loadGame, readSlot } from './state.js';
import { endTurn } from './turn.js';
import { tapProv, togglePick, openRecruit, recruit, upgrade } from './map.js';
import { endBattle, bAuto, bRetreat } from './battle-sim.js';
import { cardTap, bPause, bSpeed, bSelAll, bCharge, bHalt } from './battle-hud.js';
import { closeModal, showHelp, showSaves, saveTo, loadFrom } from './ui.js';
import { $ } from './util.js';

Object.assign(window, {
  newGame: () => newGame(), loadGame, endTurn,
  tapProv, togglePick, openRecruit, recruit, upgrade,
  endBattle, bAuto, bRetreat, cardTap, bPause, bSpeed, bSelAll, bCharge, bHalt,
  closeModal, showHelp, showSaves, saveTo, loadFrom,
});

const auto = readSlot('auto');
if (auto && !auto.over) $('contBtn').style.display = '';
