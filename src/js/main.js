// Entry point: wires modules together and exposes the functions that inline onclick handlers call.
import { newGame, loadGame, readSlot } from './state.js';
import { endTurn } from './turn.js';
import { tapProv, togglePick, openRecruit, recruit, upgrade } from './map.js';
import { endBattle, bAuto, bRetreat } from './battle-sim.js';
import { cardTap, bPause, bSpeed, bSelAll, bCharge, bHalt, bForm } from './battle-hud.js';
import { closeModal, showHelp, showSaves, saveTo, loadFrom, showNewGame, startGame } from './ui.js';
import { zoomBy, centerOn } from './map.js';
import { G, capOf } from './state.js';
import { PLAYER } from './data.js';
import { $ } from './util.js';

Object.assign(window, {
  newGame: () => newGame(), loadGame, endTurn,
  tapProv, togglePick, openRecruit, recruit, upgrade,
  endBattle, bAuto, bRetreat, cardTap, bPause, bSpeed, bSelAll, bCharge, bHalt, bForm,
  closeModal, showHelp, showSaves, saveTo, loadFrom, showNewGame, startGame,
  mapZoom: f => zoomBy(f), mapHome: () => centerOn(capOf(PLAYER) || G.prov.find(p => p.owner === PLAYER).id, 440),
});

const auto = readSlot('auto');
if (auto && !auto.over) $('contBtn').style.display = '';
