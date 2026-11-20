// ===================== DATA =====================
// Grand campaign: Europe c. 1100. All balance numbers live here. Geography is in mapdata.js (generated).
import { REGION_DEF, ADJ_DEF } from './mapdata.js';

export const START_YEAR=1100;
// The player's faction is chosen at the start of a game.
export let PLAYER='rus';
export function setPlayer(f){PLAYER=f}
export const MAJORS=['rus','pol','hre','hun','byz','fra'];

// cult: culture (unit names, recruit pool) · major: playable great power · cap: starting capital
export const FACT={
 rus:{n:'Киевская Русь',c:'#b3261e',cult:'rus',major:1,cap:'kiev',emblem:'☦',d:'Стольный Киев. Собери под своей рукой раздробленные русские земли, отбей степь и поспорь с Польшей и Венгрией.'},
 pol:{n:'Польша',c:'#5bc0de',cult:'pol',major:1,cap:'krak',emblem:'🦅',d:'Королевство Пястов между Империей и Русью. Поморье и пруссы ждут меча, а соседи — слабости.'},
 hre:{n:'Священная Римская империя',c:'#e8762b',cult:'west',major:1,cap:'koln',emblem:'✠',d:'Самая большая держава Европы: от Фризии до Тосканы. Сильна, но растянута, и враги со всех сторон.'},
 hun:{n:'Венгрия',c:'#2e8b57',cult:'steppe',major:1,cap:'eszt',emblem:'✚',d:'Королевство Арпадов в Паннонии. Лучшие конные лучники Европы и путь к морю через Хорватию.'},
 byz:{n:'Византия',c:'#8e3b8e',cult:'byz',major:1,cap:'const',emblem:'☧',d:'Второй Рим, богатейшая держава. Верни Анатолию у сельджуков и удержи Балканы.'},
 fra:{n:'Франция',c:'#2a5bb5',cult:'west',major:1,cap:'paris',emblem:'⚜',d:'Король в Париже правит лишь по имени. Собери герцогства и вытесни англо-нормандцев с континента.'},
 eng:{n:'Англия',c:'#e3c33f',cult:'west',cap:'lond',emblem:'🦁'},
 den:{n:'Дания',c:'#d2689b',cult:'west',cap:'rosk',emblem:'✙'},
 swe:{n:'Швеция',c:'#9bb7e0',cult:'west',cap:'upps',emblem:'👑'},
 nor:{n:'Норвегия',c:'#4a6378',cult:'west',cap:'nidar',emblem:'🪓'},
 cas:{n:'Леон и Кастилия',c:'#c9925b',cult:'west',cap:'toled',emblem:'🏰'},
 sic:{n:'Норманны Сицилии',c:'#8db83e',cult:'west',cap:'paler',emblem:'⚔'},
 ven:{n:'Венеция',c:'#1c7c7d',cult:'west',cap:'venic',emblem:'🦁'},
 cro:{n:'Хорватия',c:'#9e4b4b',cult:'west',cap:'split',emblem:'⛨'},
 boh:{n:'Чехия',c:'#b38fe0',cult:'pol',cap:'prag',emblem:'🦁'},
 sel:{n:'Румский султанат',c:'#7a5c3a',cult:'islam',cap:'konya',emblem:'☪'},
 cru:{n:'Государства крестоносцев',c:'#efefe6',tc:'#efefe6',cult:'west',cap:'jerus',emblem:'✠'},
 fat:{n:'Фатимиды',c:'#556b2f',cult:'islam',cap:'cairo',emblem:'☪'},
 alm:{n:'Альморавиды',c:'#d9b28c',cult:'islam',cap:'marr',emblem:'☪'},
 novg:{n:'Новгород',c:'#8a3a2a',cult:'rus',cap:'novg',emblem:'☦'},
 suzd:{n:'Ростово-Суздальская земля',c:'#c4a35a',cult:'rus',cap:'rostov',emblem:'☦'},
 cher:{n:'Чернигов',c:'#e09a7a',cult:'rus',cap:'chern',emblem:'☦'},
 polo:{n:'Полоцк',c:'#a87f6a',cult:'rus',cap:'polot',emblem:'☦'},
 cuman:{n:'Половцы',c:'#d6d29a',cult:'steppe',cap:'cum1',emblem:'🐎'},
 rebel:{n:'Независимые земли',c:'#8a8278',tc:'#d0c8bc',cult:'west'},
};
export function aiFactions(){return Object.keys(FACT).filter(f=>f!==PLAYER&&f!=='rebel')}

// Unit types.
// atk/def: melee attack/defence · mov: 2 foot, 4 horse
// range: shooting range in battle metres (0 = melee only) · reload: seconds between volleys
// ap: armour piercing (share of target defence ignored by missiles)
// antiCav: damage multiplier against cavalry · charge: charge strength multiplier
// ammo: volleys per battle · skirmish: keeps distance from enemy infantry automatically
// forms: formations the unit can take (see FORMS) · names: per-culture name overrides
export const UT={
 mil:   {n:'Ополчение',     i:'🔱',atk:4,def:3,mov:2,cost:150,forms:['wall'],names:{rus:'Пешее ополчение',pol:'Крестьянское ополчение',west:'Ополчение',islam:'Ополчение гази'}},
 spear: {n:'Копейщики',     i:'🛡️',atk:5,def:7,mov:2,cost:300,antiCav:2,forms:['wall'],names:{}},
 druzh: {n:'Латная пехота', i:'⚔️',atk:8,def:7,mov:2,cost:450,forms:['wall'],names:{rus:'Пешая дружина',pol:'Пешие латники',west:'Спешенные рыцари',byz:'Скутаты',islam:'Гулямы',steppe:'Пешие воины'}},
 arch:  {n:'Лучники',       i:'🏹',atk:5,def:2,mov:2,cost:300,range:55,reload:3.0,ammo:16,skirmish:true,forms:['loose'],names:{}},
 xbow:  {n:'Арбалетчики',   i:'🎯',atk:8,def:3,mov:2,cost:400,range:42,reload:5.0,ammo:12,ap:0.4,forms:['loose'],names:{}},
 knight:{n:'Рыцари',        i:'🐴',atk:9,def:7,mov:4,cost:700,charge:1.6,forms:['wedge'],names:{rus:'Конная дружина',pol:'Рыцари',west:'Рыцари',byz:'Катафракты',islam:'Тяжёлая конница',steppe:'Знатные всадники'}},
 hasb:  {n:'Конные лучники',i:'🏇',atk:5,def:3,mov:4,cost:500,range:40,reload:3.0,ammo:20,skirmish:true,forms:['loose'],names:{rus:'Конные стрелки',steppe:'Конные лучники',byz:'Трапезиты',islam:'Туркоманы'}},
 gen:   {n:'Воевода',       i:'👑',atk:7,def:6,mov:4,cost:400,charge:1.3,general:true,forms:['wedge'],names:{rus:'Князь с дружиной',pol:'Воевода с хоругвью',west:'Сеньор со свитой',byz:'Стратиг с тагмой',islam:'Эмир с гвардией',steppe:'Хан с нукерами'}},
};

export function isRanged(t){return !!UT[t].range}
export function isCav(t){return UT[t].mov>2}
export function uname(t,f){const c=FACT[f]&&FACT[f].cult;return (UT[t].names&&(UT[t].names[c]))||UT[t].n}

// Formations: effects are applied in battle-sim.js
export const FORMS={
 line: {n:'Обычный строй',i:'▭'},
 wall: {n:'Стена щитов',  i:'🧱',d:'Защита спереди ×1.5, стрелы спереди ×0.6, скорость ×0.5, без натиска'},
 wedge:{n:'Клин',         i:'🔺',d:'Натиск ×1.4, защита ×0.85'},
 loose:{n:'Рассыпной строй',i:'⁘',d:'Урон от стрел ×0.5, защита в ближнем бою ×0.8'},
};


export const RECRUIT_BY_CULT={
 rus:['mil','spear','druzh','arch','hasb','knight','gen'],
 pol:['mil','spear','druzh','xbow','arch','knight','gen'],
 west:['mil','spear','druzh','xbow','arch','knight','gen'],
 steppe:['mil','spear','druzh','arch','hasb','knight','gen'],
 byz:['mil','spear','druzh','arch','xbow','hasb','knight','gen'],
 islam:['mil','spear','druzh','arch','hasb','knight','gen'],
};
export const RECRUIT=new Proxy({},{get:(_,f)=>f==='rebel'?['mil','spear','arch']:RECRUIT_BY_CULT[(FACT[f]||FACT.rebel).cult]});

// Regions come from the generated map: [id, name, x, y, owner, tier]
export const TIER_INCOME={1:130,2:190,3:260};
export const PROV_DEF=REGION_DEF.map(([id,n,x,y,owner,tier])=>[id,n,x,y,owner,TIER_INCOME[tier],tier]);
export const ADJ=ADJ_DEF;

// Starting forces
export const START_ARMY={
 major:['gen','druzh','spear','spear','arch','knight'],
 major2:['gen','spear','arch','knight'],
 minor:['gen','spear','druzh','arch'],
 rebelBig:['spear','arch'],
};
export const START_ARMY_CULT={steppe:t=>t==='arch'?'hasb':t};
export const START_GOLD={major:1200,minor:600};
export const WIN_N=35;      // regions needed for victory
// Campaign AI tuning
export const AI={attackRatio:1.45,majorRatio:1.5,  // AI kingdoms are wary of attacking each other
 playerGraceTurns:8,playerBias:0.9,aggressive:{},
 maxAttacksPerTurn:3,   // each AI faction starts at most this many battles a year
 occupationTurns:2};    // a conquered land pays no taxes for this many years
// Independent lands: garrison size and a small standing force that regrows
export const REBELS={garBonus:2,armyEvery:3,armyMax:3,unit:['spear','arch','druzh']};
