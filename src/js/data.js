// ===================== DATA =====================
// Prologue campaign: Eastern Europe, 1100. All balance numbers live here.

export const PLAYER='rus';
export const AI_FACTIONS=['pol','hun'];
export const START_YEAR=1100;

export const FACT={
 rus:{n:'Киевская Русь',adj:'Русские',c:'#b3261e',cap:'kiev',emblem:'☦'},
 pol:{n:'Польша',adj:'Поляки',c:'#c9a227',cap:'krak',emblem:'🦅'},
 hun:{n:'Венгрия',adj:'Венгры',c:'#3d8b5a',cap:'eszt',emblem:'✚'},
 rebel:{n:'Независимые земли',adj:'Местные',c:'#8a8278',tc:'#d0c8bc'}
};

// Unit types.
// atk/def: melee attack/defence · mov: campaign-era speed class (2 foot, 4 horse)
// range: shooting range in battle metres (0 = melee only) · reload: seconds between volleys
// ap: armour piercing (share of target defence ignored by missiles)
// antiCav: damage multiplier against cavalry · charge: charge strength multiplier
// ammo: volleys per battle · skirmish: keeps distance from enemy infantry automatically
// forms: formations the unit can take (see FORMS)
// names: per-faction name overrides
export const UT={
 mil:   {n:'Ополчение',     i:'🔱',atk:4,def:3,mov:2,cost:150,forms:['wall'],names:{rus:'Пешее ополчение',pol:'Крестьянское ополчение',hun:'Сельское ополчение'}},
 spear: {n:'Копейщики',     i:'🛡️',atk:5,def:7,mov:2,cost:300,antiCav:2,forms:['wall'],names:{}},
 druzh: {n:'Латная пехота', i:'⚔️',atk:8,def:7,mov:2,cost:450,forms:['wall'],names:{rus:'Пешая дружина',pol:'Пешие латники',hun:'Пешие воины'}},
 arch:  {n:'Лучники',       i:'🏹',atk:5,def:2,mov:2,cost:300,range:55,reload:3.0,ammo:16,skirmish:true,forms:['loose'],names:{}},
 xbow:  {n:'Арбалетчики',   i:'🎯',atk:8,def:3,mov:2,cost:400,range:42,reload:5.0,ammo:12,ap:0.4,forms:['loose'],names:{}},
 knight:{n:'Рыцари',        i:'🐴',atk:9,def:7,mov:4,cost:700,charge:1.6,forms:['wedge'],names:{rus:'Конная дружина',pol:'Рыцари',hun:'Венгерские рыцари'}},
 hasb:  {n:'Конные лучники',i:'🏇',atk:5,def:3,mov:4,cost:500,range:40,reload:3.0,ammo:20,skirmish:true,forms:['loose'],names:{rus:'Конные стрелки',hun:'Мадьярские конные лучники',rebel:'Половецкие конники'}},
 gen:   {n:'Воевода',       i:'👑',atk:7,def:6,mov:4,cost:400,charge:1.3,general:true,forms:['wedge'],names:{rus:'Князь с дружиной',pol:'Воевода с хоругвью',hun:'Палатин с дружиной'}},
};
export function isRanged(t){return !!UT[t].range}
export function isCav(t){return UT[t].mov>2}
export function uname(t,f){return (UT[t].names&&UT[t].names[f])||UT[t].n}

// Formations: effects are applied in battle-sim.js
export const FORMS={
 line: {n:'Обычный строй',i:'▭'},
 wall: {n:'Стена щитов',  i:'🧱',d:'Защита спереди ×1.5, стрелы спереди ×0.6, скорость ×0.5, без натиска'},
 wedge:{n:'Клин',         i:'🔺',d:'Натиск ×1.4, защита ×0.85'},
 loose:{n:'Рассыпной строй',i:'⁘',d:'Урон от стрел ×0.5, защита в ближнем бою ×0.8'},
};

export const RECRUIT={
 rus:['mil','spear','druzh','arch','hasb','knight','gen'],
 pol:['mil','spear','druzh','xbow','arch','knight','gen'],
 hun:['mil','spear','druzh','arch','hasb','knight','gen'],
 rebel:['mil','spear','arch']
};

// Map after the political map of Europe c. 1100. [id, name, x, y, owner, base income]
export const PROV_DEF=[
 ['kiev','Киев',258,290,'rus',280],
 ['pereya','Переяславль',312,306,'rus',190],
 ['novg','Новгород',290,30,'rebel',240],
 ['pskov','Псков',228,52,'rebel',170],
 ['polot','Полоцк',218,132,'rebel',180],
 ['smol','Смоленск',308,150,'rebel',200],
 ['chern','Чернигов',372,238,'rebel',210],
 ['pinsk','Туров-Пинск',192,228,'rebel',150],
 ['volyn','Волынь',146,268,'rebel',170],
 ['galich','Галич',150,322,'rebel',190],
 ['krak','Краков',88,302,'pol',260],
 ['wroc','Вроцлав',30,282,'pol',200],
 ['gnie','Гнезно',40,232,'pol',190],
 ['mazov','Мазовия',108,222,'pol',160],
 ['pomor','Поморье',74,184,'rebel',150],
 ['pruss','Пруссия',132,170,'rebel',120],
 ['lith','Литва',172,150,'rebel',130],
 ['livon','Ливония',145,72,'rebel',130],
 ['estl','Эстляндия',192,38,'rebel',120],
 ['eszt','Эстергом',52,360,'hun',260],
 ['szeg','Сегед',82,402,'hun',200],
 ['trans','Трансильвания',168,398,'hun',180],
 ['cuman','Половецкая степь',300,385,'rebel',140],
];
// [a, b, sea?]
export const ADJ=[
 ['novg','pskov'],['novg','smol'],['novg','estl'],['pskov','estl'],['pskov','livon'],['pskov','polot'],
 ['polot','livon'],['polot','lith'],['polot','smol'],['polot','pinsk'],
 ['smol','chern'],['chern','kiev'],['chern','pereya'],['kiev','pereya'],['kiev','pinsk'],['kiev','volyn'],['kiev','galich'],['kiev','cuman'],['pereya','cuman'],
 ['pinsk','volyn'],['pinsk','lith'],['pinsk','mazov'],
 ['lith','livon'],['lith','pruss'],['lith','mazov'],['livon','estl'],
 ['pruss','pomor'],['pruss','mazov'],['pomor','gnie'],['pomor','mazov'],['pomor','livon',1],
 ['gnie','mazov'],['gnie','wroc'],['gnie','krak'],['mazov','krak'],['mazov','volyn'],
 ['wroc','krak'],['krak','galich'],['krak','eszt'],['volyn','galich'],
 ['galich','trans'],['galich','cuman'],['eszt','szeg'],['eszt','trans'],['szeg','trans'],['trans','cuman'],
];
export const START_ARMY={
 kiev:['gen','druzh','druzh','spear','arch','knight'],pereya:['gen','hasb','spear'],
 krak:['gen','knight','druzh','spear','xbow','arch'],gnie:['gen','spear','druzh'],wroc:['spear','xbow'],mazov:['spear','arch'],
 eszt:['gen','knight','hasb','hasb','spear','arch'],szeg:['hasb','spear'],trans:['gen','hasb','mil'],
 novg:['spear','druzh','arch'],chern:['druzh','spear'],cuman:['hasb','hasb','hasb'],lith:['mil','arch'],galich:['spear','arch'],smol:['spear','mil'],
};
export const START_GOLD={rus:1200,pol:1200,hun:1150,rebel:0};
export const WIN_N=15;
// Campaign AI tuning
export const AI={attackRatio:1.3,majorRatio:1.5,  // AI kingdoms are wary of attacking each other
 playerGraceTurns:4,playerBias:1.3,aggressive:{},
 maxAttacksPerTurn:3,   // each AI faction starts at most this many battles a year
 occupationTurns:2};    // a conquered land pays no taxes for this many years
// Independent lands: garrison size and a small standing force that regrows
export const REBELS={garBonus:2,armyEvery:3,armyMax:3,unit:['spear','arch','druzh']};
