import { FACT, UT, RECRUIT, uname, ADJ, WIN_N, PLAYER, FORMS, START_YEAR, AI, BUILDINGS, UNIT_REQ , MAX_ARMY, SETTLE_COST, UNIT_UPKEEP, GEN_UPKEEP } from './data.js';
import { MAP_W, MAP_H, SEA_PATH, ISLAND_PATHS, LAKE_PATHS, RIVER_PATHS, CELLS, PROVINCE_BORDERS } from './mapdata.js';
import { $ } from './util.js';
import { G, mk, P, adj, isSea, addLog, income, str, garUnits, provIncome, capOf } from './state.js';
import { checkEnd, autoResolve, siegeMods, siegeOpts, startSiege, hasRam, engines } from './turn.js';
import { atWar, rel, declareWar, REL_N, REL_I } from './diplo.js';
import { orderOf, wallLevel, usedSlots, slots, generals, maxGenerals, buildOptions, startBuild, buildingEffect, unitAvailable, unitCost, provinceOf, ownsProvince, isProvCap, edictAt, foodOf, regionFood, starving, faithOrder } from './rules.js';
import { B, tactical } from './battle-sim.js';
import { modal, closeModal, ask, toast } from './ui.js';
import { STANCES, TRAITS, EDICTS, PROVINCE_BONUS, FAITHS, TRADITIONS, TRAD_XP } from './data.js';
import { gatherReinforcements, reinfText, afterBattle, stanceOf, setStanceOf, stanceMods, genLabel, stars, makeGeneral, isGen } from './war.js';

// ===================== MAP RENDER =====================
// Layers: static geography (built once) → territory cells → dynamic (routes, regions, armies).
// The map is panned / zoomed by changing the SVG viewBox (VIEW).
export const VIEW={x:0,y:0,w:640};
let built=false, drag=null, pinch=null, suppressClick=false;
const ptr=new Map();

function buildStatic(){
 const svg=$('map');
 svg.setAttribute('preserveAspectRatio','xMidYMid slice');
 const landClip=`M0,0H${MAP_W}V${MAP_H}H0Z ${SEA_PATH} ${ISLAND_PATHS.join(' ')}`;
 svg.innerHTML=`<defs>
  <pattern id="wv" width="26" height="12" patternUnits="userSpaceOnUse"><path d="M0 6 Q6.5 2 13 6 T26 6" stroke="#2c5875" fill="none" stroke-width="1.2"/></pattern>
  <pattern id="parch" width="90" height="90" patternUnits="userSpaceOnUse"><rect width="90" height="90" fill="#cbb98c"/><circle cx="18" cy="26" r="14" fill="#c4b081" opacity=".6"/><circle cx="66" cy="60" r="18" fill="#d2c196" opacity=".6"/></pattern>
  <clipPath id="landClip"><path clip-rule="evenodd" d="${landClip}"/></clipPath></defs>
 <rect x="-2000" y="-2000" width="${MAP_W+4000}" height="${MAP_H+4000}" fill="#244a63"/>
 <rect width="${MAP_W}" height="${MAP_H}" fill="url(#parch)"/>
 <path d="${SEA_PATH}" fill="#2a5370"/><path d="${SEA_PATH}" fill="url(#wv)" opacity=".55"/>
 <g fill="url(#parch)" stroke="#6d5a38" stroke-width="1.5">${ISLAND_PATHS.map(d=>`<path d="${d}"/>`).join('')}</g>
 <g id="mCells" clip-path="url(#landClip)"></g>
 <path class="pv-border" d="${PROVINCE_BORDERS}" clip-path="url(#landClip)" fill="none" stroke="#2b1d10" stroke-width="2.6" stroke-opacity=".75" stroke-linecap="round"/>
 <g fill="#2a5370" stroke="#6d5a38" stroke-width="1">${LAKE_PATHS.map(d=>`<path d="${d}"/>`).join('')}</g>
 <g fill="none" stroke="#3f6f8f" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity=".85">${RIVER_PATHS.map(d=>`<path d="${d}"/>`).join('')}</g>
 <path d="${SEA_PATH}" fill="none" stroke="#6d5a38" stroke-width="1.6"/>
 <g class="sea-lbl" font-family="PT Serif" font-style="italic" fill="#9cc3dd" opacity=".85">
  <text x="610" y="330" font-size="26">Варяжское море</text><text x="80" y="560" font-size="30">Атлантика</text>
  <text x="560" y="1040" font-size="34">Средиземное море</text><text x="1180" y="770" font-size="26">Русское море</text>
  <text x="300" y="300" font-size="26">Северное море</text></g>
 <g id="mDyn"></g>`;
 bindMapInput(svg);
 built=true;
}
export function centerOn(id,w){const p=P(id);if(!p)return;if(w)VIEW.w=w;const h=viewH();VIEW.x=p.x-VIEW.w/2;VIEW.y=p.y-h/2;applyView()}
function viewH(){const svg=$('map');const r=svg.getBoundingClientRect?svg.getBoundingClientRect():{width:400,height:500};return VIEW.w*((r.height||500)/(r.width||400))}
export function applyView(){
 const svg=$('map');if(!svg.setAttribute)return;
 VIEW.w=Math.max(220,Math.min(MAP_W*1.05,VIEW.w));
 const h=viewH();
 VIEW.x=Math.max(-VIEW.w*0.3,Math.min(MAP_W-VIEW.w*0.7,VIEW.x));
 VIEW.y=Math.max(-h*0.3,Math.min(MAP_H-h*0.7,VIEW.y));
 svg.setAttribute('viewBox',`${VIEW.x.toFixed(1)} ${VIEW.y.toFixed(1)} ${VIEW.w.toFixed(1)} ${h.toFixed(1)}`);
 svg.classList&&svg.classList.toggle('far',VIEW.w>1000);
 svg.classList&&svg.classList.toggle('mid',VIEW.w>620&&VIEW.w<=1000);
}
export function zoomBy(f,cx,cy){
 const svg=$('map');const r=svg.getBoundingClientRect();const h=viewH();
 const fx=cx===undefined?0.5:(cx-r.left)/r.width, fy=cy===undefined?0.5:(cy-r.top)/r.height;
 const mx=VIEW.x+fx*VIEW.w, my=VIEW.y+fy*h;
 VIEW.w*=f;const h2=viewH();VIEW.x=mx-fx*VIEW.w;VIEW.y=my-fy*h2;applyView();
}
function bindMapInput(svg){
 if(!svg.addEventListener)return;
 svg.style.touchAction='none';
 svg.addEventListener('pointerdown',e=>{ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptr.size===1){drag={x:e.clientX,y:e.clientY,moved:0};suppressClick=false}
  else if(ptr.size===2){const a=[...ptr.values()];pinch={d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),cx:(a[0].x+a[1].x)/2,cy:(a[0].y+a[1].y)/2};drag=null}});
 svg.addEventListener('pointermove',e=>{const q=ptr.get(e.pointerId);if(!q)return;
  const dx=e.clientX-q.x,dy=e.clientY-q.y;q.x=e.clientX;q.y=e.clientY;
  if(ptr.size===1&&drag){drag.moved+=Math.abs(dx)+Math.abs(dy);if(drag.moved>8){suppressClick=true;try{svg.setPointerCapture(e.pointerId)}catch(_){}}
   const k=VIEW.w/svg.getBoundingClientRect().width;VIEW.x-=dx*k;VIEW.y-=dy*k;applyView()}
  else if(ptr.size===2&&pinch){const a=[...ptr.values()];const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
   suppressClick=true;zoomBy(pinch.d/Math.max(10,d),pinch.cx,pinch.cy);pinch.d=d}});
 const up=e=>{ptr.delete(e.pointerId);if(ptr.size<2)pinch=null;if(!ptr.size)drag=null};
 svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',up);
 svg.addEventListener('click',e=>{if(suppressClick){e.stopPropagation();e.preventDefault();suppressClick=false}},true);
 svg.addEventListener('wheel',e=>{e.preventDefault();zoomBy(e.deltaY>0?1.15:0.87,e.clientX,e.clientY)},{passive:false});
 window.addEventListener('resize',()=>applyView());
}

export function render(recenter){
 const f=G.fac[PLAYER], inc=income(PLAYER);
 $('sGold').innerHTML=`💰 ${f.gold} <span class="small" style="color:${inc.net>=0?'#7bc96f':'#e57373'}">${inc.net>=0?'+':''}${inc.net}</span>`;
 {const fd=foodOf(PLAYER),bad=starving(PLAYER);$('sFood').innerHTML=`<span style="color:${bad?'#e57373':fd.net<0?'#e0b34a':'inherit'}">🌾${fd.net>=0?'+':''}${fd.net}${bad?' голод':''}</span>`}
 $('sTurn').innerHTML=`📜 ${START_YEAR-1+G.turn} · 🏰 ${G.prov.filter(p=>p.owner===PLAYER).length}/${WIN_N}`;
 $('sFac').textContent=FACT[PLAYER].emblem||'⚑';
 $('log').innerHTML=G.log.slice(0,2).map((l,i)=>`<div style="opacity:${1-i*0.4}">${l}</div>`).join('');
 if(!built)buildStatic();
 drawMap();drawPanel();
 if(recenter)centerOn(capOf(PLAYER)||G.prov.find(p=>p.owner===PLAYER).id,440);
}
export function drawMap(){
 const sel=G.sel?P(G.sel):null;
 const canMove=sel&&sel.owner===PLAYER&&sel.army.length&&!sel.moved&&pickedUnits(sel).length;
 const targets=canMove?adj(sel.id):sel&&sel.besiege&&sel.owner===PLAYER&&pickedUnits(sel).length?[sel.besiege]:[];
 const cells=$('mCells');
 if(cells)cells.innerHTML=G.prov.map(p=>{const c=FACT[p.owner].c;return `<path d="${CELLS[p.id]}" fill="${c}" fill-opacity="${p.owner==='rebel'?.18:.45}" stroke="#2b1d10" stroke-opacity=".35" stroke-width="1.2"/>`}).join('');
 let s='';
 if(sel)adj(sel.id).forEach(t=>{const T=P(t),sea=isSea(sel.id,t),act=targets.includes(t);
  s+=`<line x1="${sel.x}" y1="${sel.y}" x2="${T.x}" y2="${T.y}" stroke="${act?'#ffd84a':sea?'#9cc3dd':'#5d4a2c'}" stroke-width="${act?4:2.2}" stroke-dasharray="${sea?'8 6':''}" opacity="${act?.9:.7}"/>`});
 G.prov.forEach(p=>{
  const c=FACT[p.owner].c, isSel=G.sel===p.id, isT=targets.includes(p.id);
  const cap=capOf(p.owner)===p.id;
  if(isT)s+=`<circle cx="${p.x}" cy="${p.y}" r="17" fill="none" stroke="${p.owner===PLAYER?'#ffd84a':'#ff5544'}" stroke-width="3.5" class="pulse"/>`;
  const r=cap?11:p.tier>=2?9:7.5;
  s+=`<g onclick="tapProv('${p.id}')" style="cursor:pointer" class="reg${cap||p.tier>=3?' big':''}">
  <circle cx="${p.x}" cy="${p.y}" r="20" fill="transparent"/>
  <circle cx="${p.x}" cy="${p.y}" r="${isSel?r+3:r}" fill="${c}" stroke="${isSel?'#ffd84a':'#1a120a'}" stroke-width="${isSel?3:1.8}"/>
  ${p.siege?`<text x="${p.x-r-10}" y="${p.y-r}" font-size="14">⛺</text>`:''}
  ${cap?`<text x="${p.x}" y="${p.y+4.5}" text-anchor="middle" font-size="12">👑</text>`:p.lvl>=3?`<text x="${p.x}" y="${p.y+4}" text-anchor="middle" font-size="10">🏰</text>`:''}
  <text class="lbl" x="${p.x}" y="${p.y+r+14}" text-anchor="middle" font-size="13" font-family="PT Serif" font-weight="700" fill="#fff" stroke="#1a120a" stroke-width="3" paint-order="stroke">${p.n}</text>`;
  if(p.army.length)s+=`<g transform="translate(${p.x+r-2},${p.y-r-12})"><rect width="24" height="14" rx="3" fill="#1a120a" stroke="${c}" stroke-width="1.5"/><text x="12" y="10.5" text-anchor="middle" font-size="10" fill="${p.moved&&p.owner===PLAYER?'#888':'#fff'}" font-weight="700">⚔${p.army.length}</text>${stanceOf(p)!=='none'?`<text x="30" y="11" font-size="11">${STANCES[stanceOf(p)].i}</text>`:''}</g>`;
  s+=`</g>`;
 });
 const dyn=$('mDyn');if(dyn)dyn.innerHTML=s;
}
export function pickedUnits(p){return p.army.filter(u=>G.pick.has(u.id))}
export let PANEL_TAB='army';
export function setTab(t){PANEL_TAB=t;drawPanel()}
function orderBadge(p){
 const o=orderOf(p),col=o>=20?'#7bc96f':o>=0?'#e0b34a':'#e57373';
 return `<span title="Порядок" style="color:${col}">⚖${o>0?'+':''}${o}</span>${p.unrest>3?` <span style="color:#e57373" title="Недовольство">🔥${Math.round(p.unrest)}/10</span>`:''}`;
}
export function drawPanel(){
 const p=G.sel?P(G.sel):null;
 if(!p){$('pInfo').innerHTML=`<div class="small">Двигай карту пальцем, двумя пальцами — масштаб. Нажми на свою землю с войском, затем на соседнюю — поход или атака. В походы ходят только войска с воеводой.</div>`;return}
 const own=p.owner===PLAYER, fc=FACT[p.owner];
 const w=wallLevel(p);
 let h=`<div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div><span class="h" style="font-size:17px;color:${fc.tc||fc.c};filter:brightness(1.4)">${p.n}</span> <span class="small">· ${fc.n} · ур. ${p.lvl}${w?` · ${w>1?'🏰':'🧱'}`:''}</span></div>
 <div class="small" style="white-space:nowrap">💰${p.occ>0?'0':provIncome(p)} · 🌾${regionFood(p)>=0?'+':''}${regionFood(p)} · 🔱${p.gar}${own?' · '+orderBadge(p):''}</div></div>`;
 {const pv=provinceOf(p.id),n=pv.regs.filter(id=>P(id).owner===p.owner).length,whole=ownsProvince(p.owner,pv.id),e=edictAt(p);
  h+=`<div class="small" style="margin-top:3px">🗺 <a href="#" style="color:var(--gold)" onclick="event.preventDefault();showRealm('edict')">${pv.n}</a>${isProvCap(p)?' · столица провинции':''} · ${whole?`вся (доход +${Math.round(PROVINCE_BONUS.inc*100)}%, порядок +${PROVINCE_BONUS.order})`:`${n}/${pv.regs.length}`}${e!=='none'?` · ${EDICTS[e].i} ${EDICTS[e].n}`:''}</div>`}
 if(p.rel){const fo=faithOrder(p);h+=`<div class="small">${Object.keys(p.rel).sort((a,b)=>p.rel[b]-p.rel[a]).map(x=>`${FAITHS[x].i} ${FAITHS[x].n} ${Math.round(p.rel[x]*100)}%`).join(' · ')}${fo<0?` <span style="color:#e57373">(порядок ${fo})</span>`:''}</div>`}
 if(p.siege)h+=`<div class="small" style="color:#e0b34a;margin-top:4px">⛺ Осада: ${FACT[p.siege.f].n}, ${p.siege.turns} г.${(()=>{const E=engines(p,p.siege.f);const e=[E.ram&&'таран',E.tower&&'башня',E.treb&&'требушет'].filter(Boolean);return e.length?' · готово: '+e.join(', '):''})()} · сдастся через ${Math.max(0,2+wallLevel(p)-p.siege.turns)} г.</div>`;
 if(own)h+=`<div class="tabs"><button class="${PANEL_TAB==='army'?'on':''}" onclick="setTab('army')">⚔ Войско</button><button class="${PANEL_TAB==='build'?'on':''}" onclick="setTab('build')">🏗 Постройки ${usedSlots(p)}/${slots(p)}</button></div>`;
 if(!own||PANEL_TAB==='army'){
  if(p.army.length){
   const gen=p.army.some(u=>UT[u.t].general);
   h+=`<div style="margin-top:6px">`;
   if(own&&p.besiege)h+=`<div class="small" style="color:#e0b34a">⛺ Войско осаждает ${P(p.besiege).n}. Нажми на город, чтобы штурмовать. <a href="#" style="color:var(--gold)" onclick="event.preventDefault();liftSiege()">Снять осаду</a></div>`;
   else if(own)h+=`<div class="small">${p.moved?'Войско уже ходило в этом году.':gen?'Выбери отряды для похода и нажми на соседнюю землю:':'Без воеводы войско ходит только по своим землям.'}</div>`;
   p.army.forEach(u=>{h+=`<span class="chip ${own&&G.pick.has(u.id)?'sel':''}" ${own?`onclick="togglePick(${u.id})"`:''}>${UT[u.t].i} ${u.g?u.g.name:uname(u.t,p.owner)}${stars(u)} <span class="hpb"><i style="width:${u.hp}%"></i></span></span>`});
   const gu=p.army.find(u=>isGen(u)&&u.g);
   if(gu)h+=`<div class="small" style="margin-top:4px">👑 Воевода ${genLabel(gu)}${gu.g.traits.length?'':' · черт нет'} <span style="opacity:.7">(опыт ${gu.g.xp})</span></div>`;
   if(gu){const a=gu.g.army||{xp:0,tr:[]},next=TRAD_XP[a.tr.length];
    h+=`<div class="small">🎖 Традиции войска: ${a.tr.length?a.tr.map(t=>`<span title="${TRADITIONS[t].d}">${TRADITIONS[t].i} ${TRADITIONS[t].n}</span>`).join(', '):'пока нет'}${next?` <span style="opacity:.7">(${a.xp}/${next})</span>`:''}</div>`}
   h+=`</div><div class="small" style="margin-top:4px">Сила войска: ${Math.round(str(p.army))}${own?` · воеводы ${generals(PLAYER)}/${maxGenerals(PLAYER)}`:''}${stanceOf(p)!=='none'?` · ${STANCES[stanceOf(p)].i} ${STANCES[stanceOf(p)].n}`:''}</div>`;
   if(own&&gen&&!p.besiege)h+=`<div class="row stances" style="margin-top:6px;gap:4px">${Object.keys(STANCES).map(k=>`<button class="${stanceOf(p)===k?'on pri':''}" style="padding:4px 7px;font-size:12px" title="${STANCES[k].d}" onclick="setStance('${k}')">${STANCES[k].i} ${STANCES[k].n}</button>`).join('')}</div>`;
  } else h+=`<div class="small" style="margin-top:6px">Войска нет. Гарнизон: ${p.gar} ополч.${own?` · воеводы ${generals(PLAYER)}/${maxGenerals(PLAYER)}`:''}</div>`;
  if(own){
   const upc=SETTLE_COST*p.lvl;
   h+=`<div class="row" style="margin-top:10px"><button onclick="openRecruit()" ${p.army.length>=MAX_ARMY||p.rec>=p.lvl?'disabled':''}>⚒ Нанять (${p.lvl-p.rec})</button>
   ${p.lvl<3?`<button onclick="upgrade()" ${G.fac[PLAYER].gold<upc?'disabled':''}>🏛 Город ур. ${p.lvl+1} · ${upc}</button>`:''}</div>`;
  } else {
   const neigh=adj(p.id).some(a=>P(a).owner===PLAYER&&P(a).army.length);
   if(p.owner!=='rebel'){const r=rel(PLAYER,p.owner);h+=`<div class="small" style="margin-top:6px">${REL_I[r]} С тобой: <b>${REL_N[r]}</b> · <a href="#" onclick="event.preventDefault();showRealm('diplo')" style="color:var(--gold)">дипломатия</a></div>`}
   h+=`<div class="small" style="margin-top:6px">Оборона: ${Math.round(str(p.army)+str(garUnits(p),1.2))}${w?` (стены усиливают защитников)`:''}${neigh?' — выбери своё соседнее войско с воеводой и атакуй.':''}</div>`;
  }
 } else {
  // buildings tab
  const B=p.b||{};
  h+=`<div style="margin-top:6px">`+(Object.keys(B).filter(k=>B[k]).map(k=>`<span class="chip">${BUILDINGS[k].i} ${BUILDINGS[k].n} ${B[k]}</span>`).join('')||'<span class="small">Построек нет.</span>');
  if(p.cons)h+=`<span class="chip" style="opacity:.7">🚧 ${BUILDINGS[p.cons.b].n} ${p.cons.lvl} — к следующему году</span>`;
  h+=`</div><div class="small" style="margin-top:6px">Мест: ${usedSlots(p)} из ${slots(p)} (больше мест — у города выше уровнем). Одна стройка в год.</div>`;
  h+=`<div class="row" style="margin-top:8px"><button onclick="openBuild()" ${p.cons?'disabled':''}>🏗 Строить</button></div>`;
 }
 $('pInfo').innerHTML=h;
}
export function openBuild(){
 const p=P(G.sel);if(!p||p.owner!==PLAYER)return;
 const h=buildOptions(p).map(o=>{const d=BUILDINGS[o.b];
  return `<div class="rec"><div>${d.i} <b>${d.n} ${o.lvl}</b><div class="small">${buildingEffect(o.b,o.lvl)}</div></div>
  <button onclick="doBuild('${o.b}')" ${o.ok?'':'disabled'}>${o.ok?'💰'+o.cost:o.why}</button></div>`}).join('');
 modal(`<h2>Стройка: ${p.n}</h2><p class="small">Мест: ${usedSlots(p)}/${slots(p)} · Готово будет к следующему году.</p>${h}<div class="row" style="margin-top:12px"><button onclick="closeModal()">Закрыть</button></div>`);
}
export function doBuild(b){const p=P(G.sel);if(startBuild(p,b)){closeModal();addLog(`${p.n}: заложено — ${BUILDINGS[b].n.toLowerCase()}.`);render()}}
export function togglePick(id){G.pick.has(id)?G.pick.delete(id):G.pick.add(id);render()}

export function tapProv(id){
 if(G.busy)return;
 const sel=G.sel?P(G.sel):null, t=P(id);
 if(sel&&sel.owner===PLAYER&&(!sel.moved||sel.besiege===id)&&adj(sel.id).includes(id)&&pickedUnits(sel).length){moveArmy(sel,t);return}
 G.sel=id;G.pick=new Set(t.owner===PLAYER?t.army.map(u=>u.id):[]);render();
}

export async function moveArmy(from,to){
 const units=pickedUnits(from);
 if(to.owner===PLAYER){
  if(to.army.length+units.length>MAX_ARMY){toast(`В войске не больше ${MAX_ARMY} отрядов.`);return}
  if(units.some(u=>UT[u.t].general)&&to.army.some(u=>UT[u.t].general)){toast('В одной армии может быть только один воевода.');return}
  const march=stanceOf(from)==='march'&&units.some(isGen)&&!(from.mstep>0);
  from.army=from.army.filter(u=>!G.pick.has(u.id));
  to.army.push(...units);
  if(march){to.moved=false;to.mstep=1;to.stance='march'}else{to.moved=true;to.mstep=from.mstep>0||stanceOf(from)==='march'?2:0;to.stance=to.mstep?'march':'none'}
  if(!from.army.some(isGen)){from.stance='none';from.mstep=0}
  G.sel=to.id;G.pick=new Set();addLog(march?`Армия маршем вошла в ${to.n} — можно идти дальше.`:`Армия перешла в ${to.n}.`);render();return;
 }
 if(!units.some(u=>UT[u.t].general)){toast('В поход на чужие земли войско идёт только с воеводой.');return}
 if(to.owner!=='rebel'&&!atWar(PLAYER,to.owner)){
  const r=rel(PLAYER,to.owner);
  const ok=await ask(`Объявить войну?`,`<p>${FACT[to.owner].n} сейчас: <b>${REL_N[r]}</b>. Напасть на ${to.n} — значит объявить войну.${r!=='peace'?' Разрыв договора подорвёт доверие к тебе у всех держав.':''}</p>`,[['war','⚔ Объявить войну',1],['no','Отмена']]);
  if(ok!=='war')return;
  declareWar(PLAYER,to.owner);
 }
 const def=[...to.army,...garUnits(to)];
 const att=[...units];
 const reinf=gatherReinforcements(from,to,PLAYER,att,def);
 if(!def.length){from.army=from.army.filter(u=>!G.pick.has(u.id));capture(to,PLAYER,units);G.sel=to.id;G.pick=new Set();render();checkEnd();return}
 const sm=siegeMods(to,PLAYER);
 const sa=Math.round(str(att)),sd=Math.round(str(def.filter(u=>!u.gar))*sm[1]+str(garUnits(to),sm[0]));
 const tired=from.mstep>0;
 const w=wallLevel(to),ram=hasRam(to,PLAYER),E=engines(to,PLAYER);
 const eng=[E.ram&&'таран',E.tower&&'осадная башня',E.treb&&'требушет'].filter(Boolean);
 const wallTxt=w?`<p>🧱 ${w>1?'Каменные':'Деревянные'} стены. ${eng.length?'Готово: '+eng.join(', ')+'.':''} ${to.siege&&to.siege.f===PLAYER?(!E.tower?'Через год осады будет осадная башня.':!E.treb?'Требушет — ещё через год (с «Осадным делом» быстрее).':''):'Можно штурмовать по лестницам или осадить: через год — таран, через два — осадная башня, потом требушет. Через '+(2+w)+' года город сдастся от голода.'}</p>`:'';
 const ch=await ask(`${w?'Город':'Битва за'} ${to.n}`,`<p>Твои силы: <b>${sa}</b> (${att.length} отр.)</p>${reinfText(reinf,'att')}<p>Враг (${FACT[to.owner].n}): <b>${sd}</b> (${def.length-to.gar} отр. + ${to.gar} ополч.)</p>${reinfText(reinf,'def')}${stanceOf(to)==='camp'?'<p class="small">⛺ Враг стоит лагерем: в обороне сильнее.</p>':''}${tired?'<p class="small">🏃 Войско устало после марша.</p>':''}${wallTxt}${isSea(from.id,to.id)?'<p class="small">⛵ Морской десант</p>':''}`,
  w?[['fight',E.tower?'⚔ Штурм с башней':ram?'⚔ Штурм с тараном':'⚔ Штурм по лестницам',1],['auto','🎲 Авторасчёт штурма'],...(to.siege?[]:[['siege','⛺ Осадить']]),['no','Отмена']]
   :[['fight','⚔ Командовать',1],['auto','🎲 Авторасчёт'],['no','Отмена']]);
 if(ch==='no')return;
 if(ch==='siege'){startSiege(from,to,PLAYER);G.pick=new Set();render();return}
 from.army=from.army.filter(u=>!G.pick.has(u.id));
 G.pick=new Set();
 const [am,dm,amb,tr]=stanceMods(from,to,att);
 if(amb)await ask('🌲 Засада!',`<p>Враг ждал в засаде у ${to.n}! Войско в смятении и вступает в бой в походной колонне.</p>`,[['ok','К бою!',1]]);
 const res=ch==='fight'?await tactical(att,def,PLAYER,to.owner,'att',to.n,siegeOpts(to,PLAYER),{ambush:amb,camp:dm>1,tired:tr}):autoResolve(att,def,sm[0],sm[1]*dm,am);
 afterBattle(res,reinf,att,def);
 applyBattle(from,to,PLAYER,res);
 G.sel=to.owner===PLAYER?to.id:from.id;
 render();checkEnd();
}
export function capture(p,f,units){
 const old=p.owner;p.owner=f;p.army=units;p.gar=1;p.moved=true;p.occ=AI.occupationTurns;p.stance='none';p.mstep=0;
 addLog(`${FACT[f].n}: захвачена провинция ${p.n}!`);
 if(old!=='rebel'&&capOf(old)===p.id){
  // the capital moves to the richest remaining land
  const rest=G.prov.filter(q=>q.owner===old).sort((a,b)=>b.base*b.lvl-a.base*a.lvl);
  G.fac[old].cap=rest.length?rest[0].id:null;
  if(f===PLAYER||old===PLAYER)addLog(`Пала столица — ${FACT[old].n} потрясены!`);
 }
 if(!G.prov.some(q=>q.owner===old)&&old!=='rebel')addLog(`${FACT[old].n} — держава пала.`);
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
 const hasGen=p.army.some(u=>UT[u.t].general),genFull=generals(PLAYER)>=maxGenerals(PLAYER);
 let h='';
 RECRUIT[PLAYER].forEach(t=>{const d=UT[t];const cost=unitCost(PLAYER,t,p);
  let why='';
  if(d.general&&hasGen)why='есть';else if(d.general&&genFull)why='лимит';
  else if(!unitAvailable(p,t)){const r=UNIT_REQ[t];why=`нужны ${BUILDINGS[r[0]].n.toLowerCase()} ${r[1]}`}
  else if(G.fac[PLAYER].gold<cost)why='мало золота';
  h+=`<div class="rec"><div>${d.i} <b>${uname(t,PLAYER)}</b><div class="small">Атк ${d.atk} · Защ ${d.def} · ${d.mov>2?'конные':'пешие'}${unitTraits(t)?' · '+unitTraits(t):''}</div></div>
 <button onclick="recruit('${t}')" ${why?'disabled':''} style="white-space:nowrap">${why||'💰'+cost}</button></div>`});
 modal(`<h2>Набор: ${p.n}</h2><p class="small">Содержание: ${UNIT_UPKEEP} в год за отряд, ${GEN_UPKEEP} за воеводу. Воевод: ${generals(PLAYER)} из ${maxGenerals(PLAYER)} (растёт с числом земель). Наймов в этом году: ${p.lvl-p.rec}. Каждый полк ест 1 🌾 в год (сейчас ${(()=>{const fd=foodOf(PLAYER);return `${fd.net>=0?'+':''}${fd.net}, в амбарах ${fd.store}`})()}).</p>${h}<div class="row" style="margin-top:12px"><button onclick="closeModal()">Закрыть</button></div>`);
}
export function recruit(t){
 const p=P(G.sel),d=UT[t],cost=unitCost(PLAYER,t,p);
 if(G.fac[PLAYER].gold<cost||p.army.length>=MAX_ARMY||p.rec>=p.lvl||!unitAvailable(p,t)&&!d.general&&t!=='mil')return;
 if(d.general&&(p.army.some(u=>UT[u.t].general)||generals(PLAYER)>=maxGenerals(PLAYER)))return;
 G.fac[PLAYER].gold-=cost;p.rec++;const u=mk(t);makeGeneral(u,PLAYER);p.army.push(u);G.pick.add(u.id);
 closeModal();addLog(`Нанят отряд: ${uname(t,PLAYER)} (${p.n}).`);render();
 if(p.army.length<MAX_ARMY&&p.rec<p.lvl)openRecruit();
}
export function upgrade(){const p=P(G.sel),c=SETTLE_COST*p.lvl;if(G.fac[PLAYER].gold<c||p.lvl>=3)return;G.fac[PLAYER].gold-=c;p.lvl++;addLog(`${p.n} отстраивается (ур. ${p.lvl}).`);render()}

export function liftSiege(){const p=P(G.sel);if(!p||!p.besiege)return;const t=P(p.besiege);if(t)t.siege=null;p.besiege=null;addLog(`Осада ${t?t.n:''} снята.`);render()}

export function setStance(k){
 const p=P(G.sel);if(!p||p.owner!==PLAYER||!p.army.some(isGen)||!STANCES[k])return;
 setStanceOf(p,k);toast(`${STANCES[k].i} ${STANCES[k].n}: ${STANCES[k].d}`);render();
}
