import { FACT, UT, RECRUIT, uname, ADJ, WIN_N, PLAYER, FORMS, START_YEAR, AI } from './data.js';
import { $ } from './util.js';
import { G, mk, P, adj, isSea, addLog, income, str, garUnits, provIncome } from './state.js';
import { checkEnd, autoResolve } from './turn.js';
import { B, tactical } from './battle-sim.js';
import { modal, closeModal, ask, toast } from './ui.js';

// ===================== MAP RENDER =====================
// Static campaign-map background (Eastern Europe c. 1100): Baltic, lakes, rivers, forests, Carpathians, steppe.
const SEA='M0,0 L285,0 L285,10 L240,15 L196,13 L166,20 L150,40 L134,60 L117,82 L124,100 L111,126 L99,150 L84,168 L58,172 L30,180 L0,186 Z';
const TREES=(()=>{const t=[];let k=7;const r=()=>{k=(k*16807)%2147483647;return k/2147483647};
 for(let i=0;i<90;i++){const x=10+r()*380,y=20+r()*400;
  const inSea=(y<190-x*0.62)||y<16;const steppe=y>350&&x>220;if(!inSea&&!steppe)t.push([x,y])}return t})();
const MAP_BG=`<defs><pattern id="wv" width="20" height="10" patternUnits="userSpaceOnUse"><path d="M0 5 Q5 2 10 5 T20 5" stroke="#2c5875" fill="none" stroke-width="1"/></pattern>
 <pattern id="parch" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="60" height="60" fill="#c9b384"/><circle cx="12" cy="18" r="9" fill="#c2ab7a" opacity=".6"/><circle cx="44" cy="40" r="12" fill="#cfba8d" opacity=".6"/></pattern>
 <radialGradient id="steppe" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#d8c58a"/><stop offset="1" stop-color="#d8c58a" stop-opacity="0"/></radialGradient></defs>
 <rect width="400" height="440" fill="url(#parch)"/>
 <ellipse cx="320" cy="400" rx="110" ry="60" fill="url(#steppe)"/>
 <g fill="#2a5370" stroke="#6d5a38" stroke-width="1.5"><path d="${SEA}"/><ellipse cx="335" cy="6" rx="26" ry="16"/><ellipse cx="208" cy="64" rx="6" ry="13"/></g>
 <path d="${SEA}" fill="url(#wv)" opacity=".7"/>
 <g fill="none" stroke="#3f6f8f" stroke-width="2.2" stroke-linecap="round" opacity=".85">
  <path d="M312,138 Q292,200 272,250 Q256,290 268,330 Q292,382 322,440"/>
  <path d="M90,312 Q110,262 100,222 Q86,192 72,176"/>
  <path d="M150,332 Q200,362 262,428"/>
  <path d="M0,340 Q46,348 62,382 Q72,420 118,440"/>
  <path d="M262,140 Q218,134 162,110 Q136,100 124,96"/>
  <path d="M290,30 Q300,18 318,10"/></g>
 <g fill="#6f7e45" opacity=".5">${TREES.map(([x,y])=>`<path d="M${x},${y-5} l4,7 h-8 z"/>`).join('')}</g>
 <g fill="none" stroke="#7b6a52" stroke-width="1.6" opacity=".8">${[[104,338],[122,344],[140,352],[160,356],[182,362],[204,372],[120,365],[190,380]].map(([x,y])=>`<path d="M${x-9},${y+6} L${x},${y-6} L${x+9},${y+6}"/>`).join('')}</g>
 <text x="14" y="62" font-family="PT Serif" font-style="italic" font-size="13" fill="#9cc3dd" opacity=".85">Варяжское море</text>
 <text x="150" y="384" font-family="PT Serif" font-style="italic" font-size="9" fill="#6b5a40">Карпаты</text>
 <text x="300" y="430" font-family="PT Serif" font-style="italic" font-size="10" fill="#7b6a42">Дикое поле</text>`;

export function render(){
 const f=G.fac[PLAYER], inc=income(PLAYER);
 $('sGold').innerHTML=`💰 ${f.gold} <span class="small" style="color:${inc.net>=0?'#7bc96f':'#e57373'}">${inc.net>=0?'+':''}${inc.net}</span>`;
 $('sTurn').innerHTML=`📜 ${START_YEAR-1+G.turn} · 🏰 ${G.prov.filter(p=>p.owner===PLAYER).length}/${WIN_N}`;
 $('log').innerHTML=G.log.slice(0,2).map((l,i)=>`<div style="opacity:${1-i*0.4}">${l}</div>`).join('');
 drawMap();drawPanel();
}
export function drawMap(){
 const sel=G.sel?P(G.sel):null;
 const canMove=sel&&sel.owner===PLAYER&&sel.army.length&&!sel.moved&&pickedUnits(sel).length;
 const targets=canMove?adj(sel.id):[];
 let s=MAP_BG;
 ADJ.forEach(([a,b,sea])=>{const A=P(a),B=P(b);s+=`<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="${sea?'#9cc3dd':'#5d4a2c'}" stroke-width="1.6" stroke-dasharray="${sea?'4 4':'2 3'}" opacity=".8"/>`});
 if(canMove)targets.forEach(t=>{const T=P(t);s+=`<line x1="${sel.x}" y1="${sel.y}" x2="${T.x}" y2="${T.y}" stroke="#ffd84a" stroke-width="3" opacity=".8"/>`});
 G.prov.forEach(p=>{
  const c=FACT[p.owner].c, isSel=G.sel===p.id, isT=targets.includes(p.id);
  const cap=FACT[p.owner].cap===p.id;
  if(isT)s+=`<circle cx="${p.x}" cy="${p.y}" r="20" fill="none" stroke="${p.owner===PLAYER?'#ffd84a':'#ff5544'}" stroke-width="3" class="pulse"/>`;
  s+=`<g onclick="tapProv('${p.id}')" style="cursor:pointer">
  <circle cx="${p.x}" cy="${p.y}" r="22" fill="transparent"/>
  <circle cx="${p.x}" cy="${p.y}" r="${isSel?15:13}" fill="${c}" stroke="${isSel?'#ffd84a':'#1a120a'}" stroke-width="${isSel?3:2}"/>
  <text x="${p.x}" y="${p.y+4.5}" text-anchor="middle" font-size="12">${cap?'👑':['🏠','🏘','🏰'][p.lvl-1]}</text>
  <text x="${p.x}" y="${p.y+26}" text-anchor="middle" font-size="9.5" font-family="PT Serif" font-weight="700" fill="#fff" stroke="#1a120a" stroke-width="2.5" paint-order="stroke">${p.n}</text>`;
  if(p.army.length)s+=`<g transform="translate(${p.x+10},${p.y-20})"><rect x="0" y="0" width="22" height="13" rx="3" fill="#1a120a" stroke="${c}" stroke-width="1.5"/><text x="11" y="10" text-anchor="middle" font-size="9" fill="${p.moved&&p.owner===PLAYER?'#888':'#fff'}" font-weight="700">⚔${p.army.length}</text></g>`;
  s+=`</g>`;
 });
 $('map').innerHTML=s;
}
export function pickedUnits(p){return p.army.filter(u=>G.pick.has(u.id))}
export function drawPanel(){
 const p=G.sel?P(G.sel):null;
 if(!p){$('pInfo').innerHTML=`<div class="small">Нажми на провинцию. Своей армией — нажми на соседнюю провинцию, чтобы идти туда или атаковать.</div>`;return}
 const own=p.owner===PLAYER, fc=FACT[p.owner];
 let h=`<div class="row" style="justify-content:space-between"><div><span class="h" style="font-size:17px;color:${fc.tc||fc.c};filter:brightness(1.4)">${p.n}</span> <span class="small">· ${fc.n} · ур. ${p.lvl}</span></div>
 <div class="small">💰${p.occ>0?'0 (разорена, '+p.occ+')':provIncome(p)} · 🔱${p.gar}</div></div>`;
 if(p.army.length){
  h+=`<div style="margin-top:6px">`;
  if(own)h+=`<div class="small">${p.moved?'Армия уже ходила.':'Нажимай на отряды, чтобы выбрать, кто пойдёт:'}</div>`;
  p.army.forEach(u=>{h+=`<span class="chip ${own&&G.pick.has(u.id)?'sel':''}" ${own?`onclick="togglePick(${u.id})"`:''}>${UT[u.t].i} ${uname(u.t,p.owner)} <span class="hpb"><i style="width:${u.hp}%"></i></span></span>`});
  h+=`</div><div class="small" style="margin-top:4px">Сила армии: ${Math.round(str(p.army))}</div>`;
 } else h+=`<div class="small" style="margin-top:6px">Армии нет. Гарнизон: ${p.gar} ополч.</div>`;
 if(own){
  const upc=400*p.lvl;
  h+=`<div class="row" style="margin-top:10px"><button onclick="openRecruit()" ${p.army.length>=8||p.rec>=p.lvl?'disabled':''}>⚒ Нанять (${p.lvl-p.rec})</button>
  ${p.lvl<3?`<button onclick="upgrade()" ${G.fac[PLAYER].gold<upc?'disabled':''}>🏛 Улучшить · ${upc}</button>`:''}</div>`;
 } else {
  const neigh=adj(p.id).some(a=>P(a).owner===PLAYER&&P(a).army.length);
  h+=`<div class="small" style="margin-top:6px">Оборона: ${Math.round(str(p.army)+str(garUnits(p),1.2))}${neigh?' — выбери свою соседнюю армию и атакуй.':''}</div>`;
 }
 $('pInfo').innerHTML=h;
}
export function togglePick(id){G.pick.has(id)?G.pick.delete(id):G.pick.add(id);render()}

export function tapProv(id){
 if(G.busy)return;
 const sel=G.sel?P(G.sel):null, t=P(id);
 if(sel&&sel.owner===PLAYER&&!sel.moved&&adj(sel.id).includes(id)&&pickedUnits(sel).length){moveArmy(sel,t);return}
 G.sel=id;G.pick=new Set(t.owner===PLAYER?t.army.map(u=>u.id):[]);render();
}

export async function moveArmy(from,to){
 const units=pickedUnits(from);
 if(to.owner===PLAYER){
  if(to.army.length+units.length>8){toast('В армии не больше 8 отрядов.');return}
  if(units.some(u=>UT[u.t].general)&&to.army.some(u=>UT[u.t].general)){toast('В одной армии может быть только один воевода.');return}
  from.army=from.army.filter(u=>!G.pick.has(u.id));
  to.army.push(...units);to.moved=true;
  G.sel=to.id;G.pick=new Set();addLog(`Армия перешла в ${to.n}.`);render();return;
 }
 const def=[...to.army,...garUnits(to)];
 if(!def.length){from.army=from.army.filter(u=>!G.pick.has(u.id));capture(to,PLAYER,units);G.sel=to.id;G.pick=new Set();render();checkEnd();return}
 const sa=Math.round(str(units)),sd=Math.round(str(to.army)+str(garUnits(to),1.2));
 const ch=await ask(`Битва за ${to.n}`,`<p>Твои силы: <b>${sa}</b> (${units.length} отр.)</p><p>Враг (${FACT[to.owner].n}): <b>${sd}</b> (${to.army.length} отр. + ${to.gar} ополч.)</p>${isSea(from.id,to.id)?'<p class="small">⛵ Морской десант</p>':''}`,
  [['fight','⚔ Командовать',1],['auto','🎲 Авторасчёт'],['no','Отмена']]);
 if(ch==='no')return;
 from.army=from.army.filter(u=>!G.pick.has(u.id));
 G.pick=new Set();
 const res=ch==='fight'?await tactical(units,def,PLAYER,to.owner,'att',to.n):autoResolve(units,def,1);
 applyBattle(from,to,PLAYER,res);
 G.sel=to.owner===PLAYER?to.id:from.id;
 render();checkEnd();
}
export function capture(p,f,units){
 const old=p.owner;p.owner=f;p.army=units;p.gar=1;p.moved=true;p.occ=AI.occupationTurns;
 addLog(`${FACT[f].n}: захвачена провинция ${p.n}!`);
 if(f===PLAYER&&FACT[old].cap===p.id)addLog(`Пала столица — ${FACT[old].n} потрясены!`);
}
export function applyBattle(from,to,af,res){
 // res: {win:'att'|'def', att:[], def:[]} survivors
 const defF=to.owner;
 if(res.win==='att'){
  capture(to,af,res.att);
  if(af===PLAYER)res.retreated=false;
 } else {
  to.army=res.def.filter(u=>!u.gar);
  to.gar=Math.min(res.def.filter(u=>u.gar).length,to.lvl+2);
  // attackers survivors return
  const back=res.att.filter(u=>u.hp>0);
  from.army.push(...back.slice(0,Math.max(0,8-from.army.length)));
  from.moved=true;
  addLog(`${FACT[defF].n} отстояли ${to.n}. ${FACT[af].n} отступили.`);
 }
 if(res.win==='att')addLog(`${af===PLAYER?'Наша победа':'Победа: '+FACT[af].n} при ${to.n}.`);
}

// ===================== RECRUIT / UPGRADE =====================
export function unitTraits(t){
 const d=UT[t],x=[];
 if(d.range)x.push(`стрельба ${d.range} м`);
 if(d.ap)x.push('пробивает броню');
 if(d.antiCav)x.push(`×${d.antiCav} против конницы`);
 if(d.charge)x.push('сильный натиск');
 if(d.skirmish)x.push('держит дистанцию');
 if(d.general)x.push('аура духа, один на армию');
 if(d.forms)x.push(d.forms.map(f=>FORMS[f].n.toLowerCase()).join(', '));
 return x.join(' · ');
}
export function openRecruit(){
 const p=P(G.sel);
 const hasGen=p.army.some(u=>UT[u.t].general);
 let h='';
 RECRUIT[PLAYER].forEach(t=>{const d=UT[t];const blocked=d.general&&hasGen;
  h+=`<div class="rec"><div>${d.i} <b>${uname(t,PLAYER)}</b><div class="small">Атк ${d.atk} · Защ ${d.def} · ${d.mov>2?'конные':'пешие'}${unitTraits(t)?' · '+unitTraits(t):''}</div></div>
 <button onclick="recruit('${t}')" ${G.fac[PLAYER].gold<d.cost||blocked?'disabled':''}>${blocked?'есть':'💰'+d.cost}</button></div>`});
 modal(`<h2>Набор: ${p.n}</h2><p class="small">Содержание: 20 золота за отряд в ход. Осталось наймов в этом году: ${p.lvl-p.rec}</p>${h}<div class="row" style="margin-top:12px"><button onclick="closeModal()">Закрыть</button></div>`);
}
export function recruit(t){
 const p=P(G.sel),d=UT[t];
 if(G.fac[PLAYER].gold<d.cost||p.army.length>=8||p.rec>=p.lvl)return;
 if(d.general&&p.army.some(u=>UT[u.t].general))return;
 G.fac[PLAYER].gold-=d.cost;p.rec++;const u=mk(t);p.army.push(u);G.pick.add(u.id);
 closeModal();addLog(`Нанят отряд: ${uname(t,PLAYER)} (${p.n}).`);render();
 if(p.army.length<8&&p.rec<p.lvl)openRecruit();
}
export function upgrade(){const p=P(G.sel),c=400*p.lvl;if(G.fac[PLAYER].gold<c||p.lvl>=3)return;G.fac[PLAYER].gold-=c;p.lvl++;addLog(`${p.n} отстраивается (ур. ${p.lvl}).`);render()}
