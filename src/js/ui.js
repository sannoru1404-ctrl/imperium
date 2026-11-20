import { WIN_N, MAJORS, FACT, EDICTS, EDICT_COST, TECH, PLAYER } from './data.js';
import * as D from './diplo.js';
import { income, orderOf, generals, maxGenerals, edictOf, setEdict, hasTech, techAvailable, setResearch, researchPoints } from './rules.js';
const PLAYER_=()=>PLAYER;
import { PROV_DEF } from './data.js';
import { $ } from './util.js';
import { G, addLog, SLOTS, readSlot, saveSlot, loadSlot, newGame } from './state.js';
import { render } from './map.js';

// ===================== UI HELPERS =====================
export function modal(html){$('modalRoot').innerHTML=`<div class="overlay"><div class="modal">${html}</div></div>`}
export function closeModal(){$('modalRoot').innerHTML=''}
// Tests (and later, replays) can answer dialogs automatically: setAutoAnswer((title,btns)=>'auto')
let autoAnswer=null;
export function setAutoAnswer(f){autoAnswer=f}
export function ask(title,body,btns){
 if(autoAnswer)return Promise.resolve(autoAnswer(title,btns));
 return new Promise(res=>{
  window.__ans=v=>{closeModal();res(v)};
  modal(`<h2>${title}</h2>${body}<div class="row" style="margin-top:14px">${btns.map(b=>`<button class="${b[2]?'pri':''}" onclick="__ans('${b[0]}')">${b[1]}</button>`).join('')}</div>`);
 });
}
export function toast(t){addLog(t);render()}
export function showHelp(){modal(`<h2>Как играть</h2>
<p><b>Цель:</b> собери ${WIN_N} земель или сокруши все остальные великие державы. Потеряешь все земли — конец.</p>
<p><b>Карта:</b> двигай пальцем, двумя пальцами — масштаб (или кнопки ＋ ／ − ／ ◎). Нажми свою землю с войском (⚔), выбери отряды и нажми на подсвеченную соседнюю землю. Голубой пунктир — путь по морю.</p>
<p><b>Казна и постройки:</b> земли приносят золото, войска стоят содержания. В каждой земле есть места под постройки: казармы, стрельбища и конюшни открывают отряды, пашни и торг дают доход, храм — порядок, стены — защиту. Город выше уровнем — больше мест и найма.</p>
<p><b>Порядок:</b> падает в захваченных и чужих по культуре землях и от податей. Если долго ниже нуля — бунт. Помогают войско в земле, храм и указ «Правда и покой».</p>
<p><b>Держава (☰):</b> указ на всю страну, знания (технологии), послы: мир, торговля, союз, война. Нападать можно только на тех, с кем война, и на вольные земли.</p>
<p><b>Воевода:</b> один на войско. Рядом с ним полки стойче и быстрее приходят в себя. Если он погибнет или побежит — всё войско дрогнет.</p>
<p><b>Опыт и черты:</b> выжившие в боях отряды получают звёзды ★ (до трёх): каждая прибавляет атаку, защиту и дух. Воеводы растут в чине и получают черты: стратег, храбрец, мастер осад, быстрый, хозяйственный (бывает и трус).</p>
<p><b>Подкрепления:</b> войско с воеводой в соседней земле само вступает в бой — и твоё, и вражеское. После боя оно возвращается домой.</p>
<p><b>Режимы войска</b> (кнопки под войском): ⛺ лагерь — +25% в обороне; 🏃 марш — два перехода по своим землям, но в бой войско придёт уставшим; 🌲 засада — нападающий может попасть в засаду и начать бой в колонне; 🔥 набег — грабит соседнюю вражескую землю, содержание вдвое меньше.</p>
<p><b>События:</b> в 1145 году в Прибалтику придёт Тевтонский орден, в 1175-м с востока — Монгольская орда, которая не заключает мира.</p>
<p><b>Битва:</b> идёт в реальном времени. Тапни полк (или карточку внизу), затем врага — атака, или землю — марш. Палец двигает камеру, двумя пальцами — масштаб и поворот. ⏸ — пауза, приказы можно отдавать на паузе.</p>
<p><b>Строй</b> (кнопка внизу): 🧱 стена щитов — пехота держит удар и стрелы спереди, но медленная; 🔺 клин — страшный натиск конницы; ⁘ рассыпной — стрелки теряют меньше от стрел.</p>
<p><b>Полосы на карточке:</b> зелёная — люди, жёлтая — боевой дух, синяя — силы. Уставшие полки слабее.</p>
<p><b>Осада:</b> город со стенами можно штурмовать сразу (пехота лезет по лестницам, у ворот — бьёт ворота; тапни по воротам, чтобы послать туда выбранные полки) или осадить: через год будет таран, а потом город сдастся от голода. Башни стреляют по штурмующим, а лучники на стене почти неуязвимы для стрел.</p>
<p>🛡️ Копейщики ×2 против конницы · Удар во фланг ×1.35, в тыл ×1.8 · 🏹 Стрелки бьют издалека, конные лучники сами держат дистанцию · ⛰ С холма бить сильнее, в гору идти тяжелее · Полк, стоявший на месте, встречает удар собранным.</p>
<button class="pri" onclick="closeModal()">Понятно</button>`)}

// ---------- save / load menu ----------
const slotName=s=>s==='auto'?'Автосохранение':'Слот '+s;
function slotInfo(d){
 if(!d)return '<span class="small">пусто</span>';
 const when=d.ts?new Date(d.ts).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'старый формат';
 return `<span class="small">${1099+d.turn} г. · провинций ${d.owned}${d.over?' · игра окончена':''} · ${when}</span>`;
}
export function showSaves(){
 const inGame=!!G&&!G.over&&$('title').style.display==='none';
 const rows=SLOTS.map(s=>{const d=readSlot(s);
  return `<div class="rec"><div><b>${slotName(s)}</b><br>${slotInfo(d)}</div><div class="row" style="gap:6px;flex-wrap:nowrap">
   ${inGame&&s!=='auto'?`<button onclick="saveTo('${s}')">Сохранить</button>`:''}
   <button class="pri" onclick="loadFrom('${s}')" ${d?'':'disabled'}>Загрузить</button></div></div>`}).join('');
 modal(`<h2>Сохранения</h2>${rows}<div class="row" style="margin-top:12px"><button onclick="closeModal()">Закрыть</button></div>`);
}
export function saveTo(s){
 if(G&&G.busy)return;
 const ok=saveSlot(s);
 addLog(ok?`Игра сохранена: ${slotName(s).toLowerCase()}.`:'Не удалось сохранить игру.');
 render();showSaves();
}
export function loadFrom(s){closeModal();if(!loadSlot(s))modal('<h2>Ошибка</h2><p>Сохранение повреждено.</p><button onclick="closeModal()">Закрыть</button>')}

// ---------- new game: choose a great power ----------
const DIFF={rus:'средне',pol:'средне',hre:'легко',hun:'средне',byz:'легко',fra:'сложно'};
export function showNewGame(){
 const rows=MAJORS.map(f=>{const F=FACT[f];const n=PROV_DEF.filter(d=>d[4]===f).length;
  return `<div class="rec" style="align-items:flex-start;gap:10px"><div style="flex:1"><div><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${F.c};margin-right:6px;vertical-align:-1px"></span><b>${F.emblem} ${F.n}</b></div>
   <div class="small" style="margin:3px 0">${F.d}</div><div class="small">Земель: ${n} · сложность: ${DIFF[f]}</div></div>
   <button class="pri" onclick="startGame('${f}')">Играть</button></div>`}).join('');
 modal(`<h2>Выбери державу</h2><p class="small">Европа, ${1100} год. Цель — ${WIN_N} земель или гибель всех остальных великих держав.</p>${rows}<div class="row" style="margin-top:12px"><button onclick="closeModal()">Назад</button></div>`);
}
export function startGame(f){closeModal();newGame(undefined,f)}

// ---------- the realm: decrees, technologies, summary ----------
let REALM_TAB='sum';
export function showRealm(tab){
 if(tab)REALM_TAB=tab;
 const f=PLAYER_(),F=G.fac[f],inc=income(f);
 const tabs=[['sum','📊 Держава'],['diplo','🤝 Послы'],['edict','📜 Указ'],['tech','🔬 Знания']].map(([k,n])=>`<button class="${REALM_TAB===k?'on':''}" onclick="showRealm('${k}')">${n}</button>`).join('');
 let body='';
 if(REALM_TAB==='sum'){
  const own=G.prov.filter(p=>p.owner===f);
  const low=own.filter(p=>orderOf(p)<0);
  body=`<p>Земель: <b>${own.length}</b> из ${WIN_N} для победы · Воевод: <b>${generals(f)}/${maxGenerals(f)}</b></p>
  <p>Доход: <b>+${inc.inc}</b> · Содержание войск: <b>−${inc.up}</b> · Итого: <b style="color:${inc.net>=0?'#7bc96f':'#e57373'}">${inc.net>=0?'+':''}${inc.net}</b> в год</p>
  <p>Указ: <b>${EDICTS[edictOf(f)].n}</b> · Изучается: <b>${F.res?TECH[F.res.id].n+` (${F.res.pts}/${TECH[F.res.id].cost})`:'ничего'}</b> (+${researchPoints(f)} в год)</p>
  ${low.length?`<p style="color:#e57373">Неспокойно: ${low.map(p=>p.n).join(', ')}. Поставь войско, храм или указ «Правда и покой».</p>`:'<p class="small">Во всех землях спокойно.</p>'}
  <div class="row" style="margin-top:10px"><button onclick="showSaves()">💾 Сохранения</button><button onclick="showHelp()">? Как играть</button></div>`;
 } else if(REALM_TAB==='diplo'){
  const fs=Object.keys(FACT).filter(x=>x!==f&&x!=='rebel'&&D.alive(x));
  const order=x=>(D.atWar(f,x)?0:D.borders(f,x)?1:2);
  fs.sort((a,b)=>order(a)-order(b)||D.power(b)-D.power(a));
  body=`<p class="small">Торговля даёт доход обеим сторонам. Союзники не нападают друг на друга. Отношение — как к тебе относятся (от −100 до 100).</p>`+fs.map(x=>{const r=D.rel(f,x),a=Math.round(G.att[x]||0);
   const btn=(k,n)=>{const [ok]=D.proposal(x,k);return `<button onclick="diplo('${x}','${k}')" ${ok?'':'style="opacity:.55"'}>${n}</button>`};
   const acts=r==='war'?btn('peace','🕊 Мир'):r==='peace'?btn('trade','⚖️ Торговля')+btn('ally','🤝 Союз')+`<button onclick="diplo('${x}','war')">⚔ Война</button>`:r==='trade'?btn('ally','🤝 Союз')+`<button onclick="diplo('${x}','war')">⚔ Война</button>`:`<button onclick="diplo('${x}','war')">⚔ Война</button>`;
   return `<div class="rec" style="flex-wrap:wrap"><div style="min-width:150px;flex:1"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${FACT[x].c};margin-right:5px"></span><b>${FACT[x].n}</b>
    <div class="small">${D.REL_I[r]} ${D.REL_N[r]}${D.borders(f,x)?' · сосед':''} · отношение <span style="color:${a>=20?'#7bc96f':a>=-10?'#e0b34a':'#e57373'}">${a>0?'+':''}${a}</span> · сила ${Math.round(D.power(x))}</div></div>
    <div class="row" style="gap:4px">${acts}</div></div>`}).join('');
 } else if(REALM_TAB==='edict'){
  body=`<p class="small">Действует один указ на всю державу. Смена стоит ${EDICT_COST} золота.</p>`+Object.keys(EDICTS).map(e=>{const E=EDICTS[e],on=edictOf(f)===e;
   return `<div class="rec"><div>${E.i} <b>${E.n}</b><div class="small">${E.d}</div></div><button class="${on?'pri':''}" onclick="pickEdict('${e}')" ${on||(e!=='none'&&F.gold<EDICT_COST)?'disabled':''}>${on?'действует':'принять'}</button></div>`}).join('');
 } else {
  body=`<p class="small">Очки знаний: +${researchPoints(f)} в год (больше земель и храмов — быстрее).</p>`+['mil','civ'].map(br=>`<h3 style="margin:10px 0 4px;font-size:15px">${br==='mil'?'⚔ Военное дело':'🏛 Устройство державы'}</h3>`+
   Object.keys(TECH).filter(id=>TECH[id].br===br).map(id=>{const T=TECH[id],done=hasTech(f,id),cur=F.res&&F.res.id===id,can=techAvailable(f,id);
    return `<div class="rec"><div>${done?'✅':cur?'⏳':can?'▫':'🔒'} <b>${T.n}</b> <span class="small">${T.cost} очк.</span><div class="small">${T.d}</div>${cur?`<div class="hpb" style="width:120px;margin-top:4px"><i style="width:${Math.round(100*F.res.pts/T.cost)}%"></i></div>`:''}</div>
    ${done?'':`<button onclick="pickTech('${id}')" ${!can||cur?'disabled':''}>${cur?'изучается':'изучать'}</button>`}</div>`}).join('')).join('');
 }
 modal(`<h2>${FACT[f].emblem} ${FACT[f].n}</h2><div class="tabs">${tabs}</div>${body}<div class="row" style="margin-top:12px"><button onclick="closeModal()">Закрыть</button></div>`);
}
export function pickEdict(e){if(setEdict(PLAYER_(),e)){addLog(`Новый указ: ${EDICTS[e].n}.`);render()}showRealm('edict')}
export function pickTech(id){setResearch(PLAYER_(),id);showRealm('tech')}

export async function diplo(x,kind){
 const f=PLAYER_();
 if(kind==='war'){const ok=await ask('Объявить войну?',`<p>${FACT[x].n}: ${D.REL_N[D.rel(f,x)]}.${D.rel(f,x)!=='peace'?' Разрыв договора подорвёт доверие всех держав.':''}</p>`,[['y','⚔ Объявить',1],['n','Отмена']]);
  if(ok==='y'){D.declareWar(f,x);render()}showRealm('diplo');return}
 const [ok,why]=D.propose(x,kind);
 if(ok){render();showRealm('diplo')}
 else{await ask('Отказ',`<p>${FACT[x].n} отказываются. ${why}</p>`,[['ok','Понятно',1]]);showRealm('diplo')}
}
