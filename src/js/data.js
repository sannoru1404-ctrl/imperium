// ===================== DATA =====================
// Grand campaign: Europe c. 1100. All balance numbers live here. Geography is in mapdata.js (generated).
import { REGION_DEF, ADJ_DEF, PROVINCE_DEF } from './mapdata.js';

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
 teut:{n:'Тевтонский орден',c:'#2b2b2b',tc:'#e8e4dc',cult:'west',cap:null,emblem:'✠',event:1},
 mong:{n:'Монгольская орда',c:'#4a2d6b',tc:'#c9b6e6',cult:'steppe',cap:null,emblem:'🏹',event:1},
 rebel:{n:'Независимые земли',c:'#8a8278',tc:'#d0c8bc',cult:'west'},
};
// ===================== RELIGION =====================
export const FAITHS={
 orth:{n:'Православие',i:'☦'},
 cath:{n:'Католичество',i:'✝'},
 islam:{n:'Ислам',i:'☪'},
 pagan:{n:'Язычество',i:'🌳'},
};
const FAITH_OF={rus:'orth',byz:'orth',novg:'orth',suzd:'orth',cher:'orth',polo:'orth',
 sel:'islam',fat:'islam',alm:'islam',cuman:'pagan',mong:'pagan'};
export function faithOf(f){return FAITH_OF[f]||'cath'}
// who the people of a land pray to in 1100 when it differs from its owner (shares sum to 1)
export const REGION_FAITH={
 lith:{pagan:1},pruss:{pagan:1},cour:{pagan:1},livon:{pagan:1},estl:{pagan:1},tavas:{pagan:1},karel:{pagan:.8,orth:.2},
 szcz:{pagan:.7,cath:.3},gdan:{pagan:.6,cath:.4},
 galich:{orth:1},peremy:{orth:1},ras:{orth:1},dukl:{orth:.7,cath:.3},bosn:{cath:.5,orth:.5},
 georg:{orth:1},alan:{orth:.7,pagan:.3},armen:{orth:1},tarsu:{orth:.6,islam:.4},
 alepp:{islam:1},damas:{islam:1},tripl:{islam:.7,orth:.3},mosul:{islam:1},bagh:{islam:1},
 antio:{orth:.5,islam:.3,cath:.2},edess:{orth:.6,islam:.3,cath:.1},jerus:{islam:.4,orth:.4,cath:.2},
 mahd:{islam:1},tripo:{islam:1},beja:{islam:1},barca:{islam:1},
 zarag:{islam:1},valen:{islam:.9,cath:.1},balea:{islam:1},grana:{islam:.9,cath:.1},toled:{cath:.7,islam:.3},
 paler:{cath:.4,islam:.4,orth:.2},cosen:{orth:.5,cath:.5},bari:{cath:.7,orth:.3},
 konya:{islam:.4,orth:.6},ankar:{islam:.4,orth:.6},kays:{islam:.4,orth:.6},melit:{islam:.4,orth:.6},
};
// drift: share of the owner's faith gained per year (base + per temple level), order at 0% owner's faith
export const FAITH={drift:0.02,church:0.03,order:-20,
 attSame:0.5,attOther:-0.5,          // yearly attitude drift towards the player
 warOther:1.6,warSame:0.6,           // AI war chance multiplier against other / same faith
 allySame:15,allyOther:-15};         // alliance proposal score
export function aiFactions(){return Object.keys(FACT).filter(f=>f!==PLAYER&&f!=='rebel')}

// Unit types.
// atk/def: melee attack/defence · mov: 2 foot, 4 horse
// range: shooting range in battle metres (0 = melee only) · reload: seconds between volleys
// ap: armour piercing (share of target defence ignored by missiles)
// antiCav: damage multiplier against cavalry · charge: charge strength multiplier
// ammo: volleys per battle · skirmish: keeps distance from enemy infantry automatically
// forms: formations the unit can take (see FORMS) · names: per-culture name overrides
export const UT={
 mil:   {n:'Ополчение',     i:'🔱',abil:['hold'],atk:4,def:3,mov:2,cost:150,forms:['wall'],names:{rus:'Пешее ополчение',pol:'Крестьянское ополчение',west:'Ополчение',islam:'Ополчение гази'}},
 spear: {n:'Копейщики',     i:'🛡️',abil:['hold'],atk:5,def:7,mov:2,cost:300,antiCav:2,forms:['wall'],names:{}},
 druzh: {n:'Латная пехота', i:'⚔️',abil:['hold','charge'],atk:8,def:7,mov:2,cost:450,forms:['wall'],names:{rus:'Пешая дружина',pol:'Пешие латники',west:'Спешенные рыцари',byz:'Скутаты',islam:'Гулямы',steppe:'Пешие воины'}},
 arch:  {n:'Лучники',       i:'🏹',abil:['volley'],atk:5,def:2,mov:2,cost:300,range:55,reload:3.0,ammo:16,skirmish:true,forms:['loose'],names:{}},
 xbow:  {n:'Арбалетчики',   i:'🎯',abil:['volley'],atk:8,def:3,mov:2,cost:400,range:42,reload:5.0,ammo:12,ap:0.4,forms:['loose'],names:{}},
 knight:{n:'Рыцари',        i:'🐴',abil:['charge'],atk:9,def:7,mov:4,cost:700,charge:1.6,forms:['wedge'],names:{rus:'Конная дружина',pol:'Рыцари',west:'Рыцари',byz:'Катафракты',islam:'Тяжёлая конница',steppe:'Знатные всадники'}},
 hasb:  {n:'Конные лучники',i:'🏇',abil:['volley'],atk:5,def:3,mov:4,cost:500,range:40,reload:3.0,ammo:20,skirmish:true,forms:['loose'],names:{rus:'Конные стрелки',steppe:'Конные лучники',byz:'Трапезиты',islam:'Туркоманы'}},
 gen:   {n:'Воевода',       i:'👑',abil:['rally','charge'],atk:7,def:6,mov:4,cost:400,charge:1.3,general:true,forms:['wedge'],names:{rus:'Князь с дружиной',pol:'Воевода с хоругвью',west:'Сеньор со свитой',byz:'Стратиг с тагмой',islam:'Эмир с гвардией',steppe:'Хан с нукерами'}},
};

// Battle abilities (buttons on the regiment cards). dur: seconds active, cd: cooldown in seconds.
export const ABIL={
 charge:{n:'Натиск',i:'💨',dur:10,cd:60,d:'10 с: быстрее на 30%, удар с разбега в 1.5 раза сильнее.'},
 hold:  {n:'Стоять насмерть',i:'🪨',dur:20,cd:90,d:'20 с: защита +25%, дух почти не падает, полк не бежит.'},
 volley:{n:'Залп',i:'🎇',dur:0,cd:45,d:'Сразу залп двойной силы.'},
 rally: {n:'Сплотить',i:'📯',dur:0,cd:90,d:'Дух +25 полкам рядом с воеводой, бегущие возвращаются в бой.'},
};
// Army traditions: the army (not only its general) learns. Points: 1 per battle, +1 for a victory.
export const TRAD_XP=[2,5,9];
export const TRADITIONS={
 drill: {n:'Выучка',i:'🛡',d:'+1 к защите всех полков'},
 fury:  {n:'Ярость',i:'🔥',d:'+0.75 к атаке всех полков'},
 march: {n:'Походная закалка',i:'🥾',d:'усталость копится на 25% медленнее'},
 iron:  {n:'Железная стойкость',i:'⛓',d:'дух +10 в начале боя'},
 vets:  {n:'Школа ветеранов',i:'⭐',d:'полки чаще получают звёзды'},
 forage:{n:'Фуражиры',i:'🌾',d:'войско ест вдвое меньше'},
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
export const TIER_INCOME={1:90,2:140,3:200};
export const PROV_DEF=REGION_DEF.map(([id,n,x,y,owner,tier])=>[id,n,x,y,owner,TIER_INCOME[tier],tier]);
export const ADJ=ADJ_DEF;
// Provinces: groups of 2–4 regions; the first region is the provincial capital.
export const PROVINCES=Object.fromEntries(PROVINCE_DEF.map(([id,n,rs])=>[id,{id,n,regs:rs,cap:rs[0]}]));
export const PROV_OF=Object.fromEntries(PROVINCE_DEF.flatMap(([id,,rs])=>rs.map(r=>[r,id])));
// whole province held: income and order bonus in each of its regions; a provincial decree becomes possible.
// holding the provincial capital: order bonus in your other regions of that province.
export const PROVINCE_BONUS={inc:0.15,order:5,seatOrder:5};

// Starting forces
export const START_ARMY={
 major:['gen','druzh','spear','spear','arch','knight'],
 major2:['gen','spear','arch','knight'],
 minor:['gen','spear','druzh','arch'],
 rebelBig:['spear','arch'],
};
export const START_ARMY_CULT={steppe:t=>t==='arch'?'hasb':t};
export const START_GOLD={major:1200,minor:600};
// Victory: each great power needs its starting lands + WIN.extra, within [min, max] (a small realm has less to conquer)
export const WIN={extra:22,min:28,max:34};
export function winTarget(f){const n=PROV_DEF.filter(d=>d[4]===f).length;return Math.max(WIN.min,Math.min(WIN.max,n+WIN.extra))}
export function winN(){return winTarget(PLAYER)}
// Campaign AI tuning
export const AI={attackRatio:1.3,majorRatio:1.35,siegeRatio:0.85,  // siegeRatio: blockade walls when this strong vs army + garrison
  // AI kingdoms are wary of attacking each other
 playerGraceTurns:8,playerBias:0.9,aggressive:{},
 maxAttacksPerTurn:3,   // each AI faction starts at most this many battles a year
 occupationTurns:1,     // a conquered land pays no taxes for this many years
 lootMult:1.5,
 guardBorder:4,guardInner:2,   // regiments the AI raises in a land without a general          // gold taken with a town: base income × (1 + town level) × this
 provinceBias:1.3};     // AI prefers a target that completes one of its provinces (×1.15 if it only adds to one)
// Independent lands: garrison size and a small standing force that regrows
export const REBELS={garBonus:1,armyEvery:4,armyMax:2,unit:['spear','arch','druzh']};

// ===================== ECONOMY (Rome II-style) =====================
// Building chains; a region has (settlement level + 3) slots. Effects:
// unlock: unit types recruitable here · inc: +share of region income · gold: flat gold
// order: public order · gar: extra garrison · wall: walls level (sieges)
export const BUILDINGS={
 barracks:{n:'Казармы',     i:'⚔️',lv:[{cost:300,unlock:['spear']},{cost:650,unlock:['druzh']}]},
 range:   {n:'Стрельбище',  i:'🏹',lv:[{cost:300,unlock:['arch']},{cost:650,unlock:['xbow']}]},
 stable:  {n:'Конюшни',     i:'🐎',lv:[{cost:400,unlock:['hasb']},{cost:900,unlock:['knight']}]},
 farm:    {n:'Пашни',       i:'🌾',lv:[{cost:250,inc:0.05,food:3},{cost:500,inc:0.1,food:3},{cost:900,inc:0.15,food:3}]},
 market:  {n:'Торг',        i:'⚖️',lv:[{cost:350,gold:25},{cost:700,gold:40},{cost:1200,gold:60}]},
 church:  {n:'Храм',        i:'⛪',lv:[{cost:300,order:10,faith:1},{cost:650,order:20,faith:1},{cost:1100,order:30,faith:1}]},
 walls:   {n:'Стены',       i:'🧱',lv:[{cost:400,gar:2,wall:1},{cost:900,gar:4,wall:2}]},
};
// which building level a unit needs (mil and gen need nothing)
export const UNIT_REQ={spear:['barracks',1],druzh:['barracks',2],arch:['range',1],xbow:['range',2],hasb:['stable',1],knight:['stable',2]};
export const GEN_UPKEEP=50, UNIT_UPKEEP=25;
// Food: one balance per state. Villages feed, towns and regiments eat. Surplus fills the granary,
// a deficit empties it; with an empty granary the state starves.
// tier: food a region yields (small lands are farmland) · farm: per level of Пашни (in BUILDINGS)
// town: what a settlement of level 1..3 eats · unit: per regiment (the general's retinue eats nothing extra)
export const FOOD={tier:{1:4,2:3,3:2},town:{1:0,2:2,3:5},unit:1,raided:0.5,
 store:60,startStore:20,
 famineOrder:-15,        // order in every land while starving
 siegeLoss:8,occLoss:4}; // hp a regiment loses per year besieging / standing in a freshly conquered land (no replenishment there)
export const MAX_ARMY=12;   // regiments in one army (incl. the general)

// Decrees are issued per province, only while the whole province is held; changing one costs gold.
export const EDICTS={
 none: {n:'Без указа',i:'—',d:'Ничего не меняется.'},
 tax:  {n:'Подати',i:'💰',d:'Доход +20%, порядок −15 в землях провинции.'},
 peace:{n:'Правда и покой',i:'🕊',d:'Порядок +15 в землях провинции, доход −5%.'},
 levy: {n:'Ополчение',i:'⚔️',d:'Найм в провинции на 25% дешевле, гарнизоны +1.'},
 trade:{n:'Торговые льготы',i:'⚖️',d:'Торги в провинции приносят на 30% больше.'},
};
export const EDICT_COST=200;

// Technologies: two branches. Research points per year: 8 + lands + 2 per temple level.
export const TECH={
 mil1:{n:'Кольчуга',br:'mil',cost:80,d:'+1 к защите всех отрядов в бою.'},
 mil2:{n:'Рыцарство',br:'mil',req:'mil1',cost:170,d:'Натиск конницы сильнее на 20%.'},
 mil3:{n:'Осадное дело',br:'mil',req:'mil2',cost:280,d:'Вражеские стены и гарнизоны слабее на 25%.'},
 mil4:{n:'Постоянное войско',br:'mil',req:'mil3',cost:400,d:'Содержание войск −25%.'},
 civ1:{n:'Трёхполье',br:'civ',cost:80,d:'Доход земель +10%.'},
 civ2:{n:'Торговые пути',br:'civ',req:'civ1',cost:170,d:'Торги приносят на 30% больше.'},
 civ3:{n:'Право и суд',br:'civ',req:'civ2',cost:280,d:'Порядок +10 во всех землях.'},
 civ4:{n:'Каменное зодчество',br:'civ',req:'civ3',cost:400,d:'Постройки дешевле на 25%.'},
};
// Public order and revolts
export const ORDER={base:10,occupied:-40,foreign:-15,perGarrison:3,maxGarrison:15,poorBelow:-20,revoltAt:10};
// Army limit: number of generals a state may field
export function maxGeneralsFor(regions){return Math.min(12,2+Math.floor(regions/3))}

// ===================== DIPLOMACY =====================
// Relations between states form a ladder: 'war' < 'peace' < 'nap' (non-aggression) < 'trade' < 'def' (defensive alliance)
// < 'ally' (military alliance). Each step includes the ones below. Vassals (G.vas) and tribute (G.trib) come on top.
// Independent lands ('rebel') can always be attacked. Wars standing in 1100 (approximate):
export const START_WARS=[['rus','cuman'],['byz','sel'],['cru','fat'],['cru','sel'],['cas','alm'],['hun','cro'],['sic','byz'],['eng','fra']];
export const START_ALLIES=[['byz','ven'],['hre','boh'],['rus','pol']];
export const START_TRADE=[['ven','sic'],['den','swe'],['novg','swe'],['eng','den'],['rus','byz']];
export const SETTLE_COST=600;      // ×current level to grow a settlement
export const DIPLO={tradePerRegion:4,tradeCap:60,warChance:0.12,peaceChance:0.08,minWarYears:6,warRatio:1.25,
 vassalTax:0.2,        // share of a vassal's land income paid to the overlord
 tribShare:0.15,tribYears:10, // tribute: share of the payer's land income, for this many years
 maxAllies:2,          // AI states keep at most this many alliances (def + ally)
 napChance:0.03,tradeChance:0.03,defChance:0.02};

// ===================== VETERANS & GENERALS =====================
// Units gain experience (0..3 stars) by surviving battles: each star +0.5 atk/def and +5 morale.
export const XP_MAX=3;
// Generals have a name, a rank (1..5) and traits. A new trait comes with every second rank.
export const GEN_NAMES={
 rus:['Мстислав','Ярополк','Всеволод','Изяслав','Ростислав','Святополк','Давыд','Олег','Глеб','Вячеслав','Андрей','Юрий'],
 pol:['Болеслав','Збигнев','Мешко','Казимир','Владислав','Пётр Властович','Сецех','Генрих'],
 west:['Готфрид','Балдуин','Роберт','Генрих','Вильгельм','Раймунд','Боэмунд','Танкред','Конрад','Фридрих','Гуго','Лотарь'],
 steppe:['Коломан','Альмош','Бела','Ласло','Шарукан','Боняк','Кончак','Аепа'],
 byz:['Алексей','Иоанн','Мануил','Никифор','Георгий Палеолог','Константин','Михаил','Андроник'],
 islam:['Кылыч-Арслан','Афдаль','Юсуф ибн Ташфин','Али','Тугтегин','Рыдван','Зенги','Маудуд'],
};
export const TRAITS={
 strat:{n:'Стратег',d:'Войско сильнее на 10% (и в авторасчёте)'},
 brave:{n:'Храбрец',d:'Боевой дух всего войска +10, аура шире'},
 siege:{n:'Мастер осад',d:'Ворота падают вдвое быстрее, город сдаётся на год раньше'},
 swift:{n:'Быстрый',d:'Марш без усталости: можно идти и затем атаковать'},
 thrift:{n:'Хозяйственный',d:'Содержание его войска −25%'},
 coward:{n:'Трус',bad:1,d:'Боевой дух войска −10'},
};
export const GEN_XP=[0,2,5,9,14];   // battle points needed for ranks 1..5

// ===================== ARMY STANCES =====================
export const STANCES={
 none:  {n:'Обычный',i:'▭',d:'Войско ходит и сражается как обычно.'},
 camp:  {n:'Лагерь',i:'⛺',d:'Войско стоит и укрепляется: в обороне сильнее на 25%, полки встречают врага собранными.'},
 march: {n:'Марш',i:'🏃',d:'По своим землям можно пройти два перехода за год. Напав после марша, войско начнёт бой уставшим.'},
 ambush:{n:'Засада',i:'🌲',d:'Если враг нападёт на эту землю, он может (в половине случаев) попасть в засаду: начнёт бой в походной колонне и в смятении. Не работает в осаждённом городе.'},
 raid:  {n:'Набег',i:'🔥',d:'Грабит соседнюю вражескую землю: забирает часть её дохода и подрывает порядок. Содержание войска вдвое меньше.'},
};
export const AMBUSH_CHANCE=0.5, RAID_SHARE=0.25;

// ===================== EVENTS =====================
// New powers enter the stage in a given year (turn = year − 1099).
export const EVENTS=[
 {turn:46,id:'teut',n:'Тевтонский орден',where:['pruss','livon','cour'],army:['gen','knight','knight','knight','druzh','druzh','xbow','xbow','spear','spear'],armies:2,
  war:['rus','novg','polo','pol','lith'],text:'Рыцари Тевтонского ордена высадились в Прибалтике и несут крест мечом.'},
 {turn:76,id:'mong',n:'Монгольская орда',where:['cum2','tmut','cum1','ryaz'],army:['gen','hasb','hasb','hasb','hasb','hasb','hasb','knight','knight','knight','spear','spear'],armies:3,
  war:'all',text:'С востока пришла Орда. Тумены монголов сметают всё на своём пути.'},
];
