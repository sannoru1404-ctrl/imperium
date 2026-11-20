import { FACT, UT, RECRUIT, uname, ADJ, WIN_N } from './data.js';
import { $ } from './util.js';
import { G, mk, P, adj, isSea, addLog, income, str, garUnits } from './state.js';
import { checkEnd, autoResolve } from './turn.js';
import { B, tactical } from './battle-sim.js';
import { modal, closeModal, ask, toast } from './ui.js';

// ===================== MAP RENDER =====================
export function render(){
 const f=G.fac.rome, inc=income('rome');
 $('sGold').innerHTML=`💰 ${f.gold} <span class="small" style="color:${inc.net>=0?'#7bc96f':'#e57373'}">${inc.net>=0?'+':''}${inc.net}</span>`;
 $('sTurn').innerHTML=`📜 Ход ${G.turn} · 🏛 ${G.prov.filter(p=>p.owner==='rome').length}/${WIN_N}`;
 $('log').innerHTML=G.log.slice(0,2).map((l,i)=>`<div style="opacity:${1-i*0.4}">${l}</div>`).join('');
 drawMap();drawPanel();
}
export function drawMap(){
 const sel=G.sel?P(G.sel):null;
 const canMove=sel&&sel.owner==='rome'&&sel.army.length&&!sel.moved&&pickedUnits(sel).length;
 const targets=canMove?adj(sel.id):[];
 let s=`<defs><pattern id="wv" width="20" height="10" patternUnits="userSpaceOnUse"><path d="M0 5 Q5 2 10 5 T20 5" stroke="#2c5875" fill="none" stroke-width="1"/></pattern>
 <filter id="sh"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-opacity=".6"/></filter></defs>
 <rect width="400" height="440" fill="#22465e"/><rect width="400" height="440" fill="url(#wv)"/>
 <g fill="#b9a374" stroke="#7a6640" stroke-width="1.5" filter="url(#sh)">
 <path d="M0,0 L400,0 L400,150 L375,160 L360,200 L372,252 L345,252 L330,215 L300,200 L285,160 L262,140 L250,150 L270,180 L300,230 L322,250 L305,268 L285,247 L270,252 L250,215 L225,175 L205,140 L180,160 L150,176 L120,176 L112,205 L102,255 L60,265 L28,242 L18,180 L38,130 L80,120 L88,100 L60,92 L20,62 L0,62 Z"/>
 <path d="M0,328 L60,318 L120,330 L180,318 L222,318 L238,335 L262,350 L300,370 L340,374 L400,368 L400,440 L0,440 Z"/>
 <path d="M238,288 L288,282 L272,312 Z"/><path d="M182,214 L199,214 L201,272 L184,274 Z"/></g>`;
 ADJ.forEach(([a,b,sea])=>{const A=P(a),B=P(b);s+=`<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="${sea?'#9cc3dd':'#5d4a2c'}" stroke-width="1.6" stroke-dasharray="${sea?'4 4':'2 3'}" opacity=".8"/>`});
 if(canMove)targets.forEach(t=>{const T=P(t);s+=`<line x1="${sel.x}" y1="${sel.y}" x2="${T.x}" y2="${T.y}" stroke="#ffd84a" stroke-width="3" opacity=".8"/>`});
 G.prov.forEach(p=>{
  const c=FACT[p.owner].c, isSel=G.sel===p.id, isT=targets.includes(p.id);
  const cap=FACT[p.owner].cap===p.id;
  if(isT)s+=`<circle cx="${p.x}" cy="${p.y}" r="20" fill="none" stroke="${p.owner==='rome'?'#ffd84a':'#ff5544'}" stroke-width="3" class="pulse"/>`;
  s+=`<g onclick="tapProv('${p.id}')" style="cursor:pointer">
  <circle cx="${p.x}" cy="${p.y}" r="22" fill="transparent"/>
  <circle cx="${p.x}" cy="${p.y}" r="${isSel?15:13}" fill="${c}" stroke="${isSel?'#ffd84a':'#1a120a'}" stroke-width="${isSel?3:2}"/>
  <text x="${p.x}" y="${p.y+4.5}" text-anchor="middle" font-size="12">${cap?'👑':['🏠','🏘','🏰'][p.lvl-1]}</text>
  <text x="${p.x}" y="${p.y+26}" text-anchor="middle" font-size="9.5" font-family="PT Serif" font-weight="700" fill="#fff" stroke="#1a120a" stroke-width="2.5" paint-order="stroke">${p.n}</text>`;
  if(p.army.length)s+=`<g transform="translate(${p.x+10},${p.y-20})"><rect x="0" y="0" width="22" height="13" rx="3" fill="#1a120a" stroke="${c}" stroke-width="1.5"/><text x="11" y="10" text-anchor="middle" font-size="9" fill="${p.moved&&p.owner==='rome'?'#888':'#fff'}" font-weight="700">⚔${p.army.length}</text></g>`;
  s+=`</g>`;
 });
 $('map').innerHTML=s;
}
export function pickedUnits(p){return p.army.filter(u=>G.pick.has(u.id))}
export function drawPanel(){
 const p=G.sel?P(G.sel):null;
 if(!p){$('pInfo').innerHTML=`<div class="small">Нажми на провинцию. Своей армией — нажми на соседнюю провинцию, чтобы идти туда или атаковать.</div>`;return}
 const own=p.owner==='rome', fc=FACT[p.owner];
 let h=`<div class="row" style="justify-content:space-between"><div><span class="h" style="font-size:17px;color:${fc.c==='#7d7468'?'#ccc':fc.c};filter:brightness(1.5)">${p.n}</span> <span class="small">· ${fc.n} · ур. ${p.lvl}</span></div>
 <div class="small">💰${Math.round(p.base*(1+0.5*(p.lvl-1)))} · 🔱${p.gar}</div></div>`;
 if(p.army.length){
  h+=`<div style="margin-top:6px">`;
  if(own)h+=`<div class="small">${p.moved?'Армия уже ходила.':'Нажимай на отряды, чтобы выбрать, кто пойдёт:'}</div>`;
  p.army.forEach(u=>{h+=`<span class="chip ${own&&G.pick.has(u.id)?'sel':''}" ${own?`onclick="togglePick(${u.id})"`:''}>${UT[u.t].i} ${uname(u.t,p.owner)} <span class="hpb"><i style="width:${u.hp}%"></i></span></span>`});
  h+=`</div><div class="small" style="margin-top:4px">Сила армии: ${Math.round(str(p.army))}</div>`;
 } else h+=`<div class="small" style="margin-top:6px">Армии нет. Гарнизон: ${p.gar} ополч.</div>`;
 if(own){
  const upc=400*p.lvl;
  h+=`<div class="row" style="margin-top:10px"><button onclick="openRecruit()" ${p.army.length>=8||p.rec>=p.lvl?'disabled':''}>⚒ Нанять (${p.lvl-p.rec})</button>
  ${p.lvl<3?`<button onclick="upgrade()" ${G.fac.rome.gold<upc?'disabled':''}>🏛 Улучшить · ${upc}</button>`:''}</div>`;
 } else {
  const neigh=adj(p.id).some(a=>P(a).owner==='rome'&&P(a).army.length);
  h+=`<div class="small" style="margin-top:6px">Оборона: ${Math.round(str(p.army)+str(garUnits(p),1.2))}${neigh?' — выбери свою соседнюю армию и атакуй.':''}</div>`;
 }
 $('pInfo').innerHTML=h;
}
export function togglePick(id){G.pick.has(id)?G.pick.delete(id):G.pick.add(id);render()}

export function tapProv(id){
 if(G.busy)return;
 const sel=G.sel?P(G.sel):null, t=P(id);
 if(sel&&sel.owner==='rome'&&!sel.moved&&adj(sel.id).includes(id)&&pickedUnits(sel).length){moveArmy(sel,t);return}
 G.sel=id;G.pick=new Set(t.owner==='rome'?t.army.map(u=>u.id):[]);render();
}

export async function moveArmy(from,to){
 const units=pickedUnits(from);
 if(to.owner==='rome'){
  if(to.army.length+units.length>8){toast('В армии не больше 8 отрядов.');return}
  from.army=from.army.filter(u=>!G.pick.has(u.id));
  to.army.push(...units);to.moved=true;
  G.sel=to.id;G.pick=new Set();addLog(`Армия перешла в ${to.n}.`);render();return;
 }
 const def=[...to.army,...garUnits(to)];
 if(!def.length){from.army=from.army.filter(u=>!G.pick.has(u.id));capture(to,'rome',units);G.sel=to.id;G.pick=new Set();render();checkEnd();return}
 const sa=Math.round(str(units)),sd=Math.round(str(to.army)+str(garUnits(to),1.2));
 const ch=await ask(`Битва за ${to.n}`,`<p>Твои силы: <b>${sa}</b> (${units.length} отр.)</p><p>Враг (${FACT[to.owner].n}): <b>${sd}</b> (${to.army.length} отр. + ${to.gar} ополч.)</p>${isSea(from.id,to.id)?'<p class="small">⛵ Морской десант</p>':''}`,
  [['fight','⚔ Командовать',1],['auto','🎲 Авторасчёт'],['no','Отмена']]);
 if(ch==='no')return;
 from.army=from.army.filter(u=>!G.pick.has(u.id));
 G.pick=new Set();
 const res=ch==='fight'?await tactical(units,def,'rome',to.owner,'att',to.n):autoResolve(units,def,1);
 applyBattle(from,to,'rome',res);
 G.sel=to.owner==='rome'?to.id:from.id;
 render();checkEnd();
}
export function capture(p,f,units){
 const old=p.owner;p.owner=f;p.army=units;p.gar=1;p.moved=true;
 addLog(`${FACT[f].n}: захвачена провинция ${p.n}!`);
 if(f==='rome'&&FACT[old].cap===p.id)addLog(`Пала столица — ${FACT[old].n} потрясены!`);
}
export function applyBattle(from,to,af,res){
 // res: {win:'att'|'def', att:[], def:[]} survivors
 const defF=to.owner;
 if(res.win==='att'){
  capture(to,af,res.att);
  if(af==='rome')res.retreated=false;
 } else {
  to.army=res.def.filter(u=>!u.gar);
  to.gar=Math.min(res.def.filter(u=>u.gar).length,to.lvl+2);
  // attackers survivors return
  const back=res.att.filter(u=>u.hp>0);
  from.army.push(...back.slice(0,Math.max(0,8-from.army.length)));
  from.moved=true;
  addLog(`${FACT[defF].n} отстояли ${to.n}. ${FACT[af].n} отступили.`);
 }
 if(res.win==='att')addLog(`Победа ${af==='rome'?'Рима':FACT[af].n} при ${to.n}.`);
}

// ===================== RECRUIT / UPGRADE =====================
export function openRecruit(){
 const p=P(G.sel);
 let h='';
 RECRUIT.rome.forEach(t=>{const d=UT[t];h+=`<div class="rec"><div>${d.i} <b>${d.rn||d.n}</b><div class="small">Атк ${d.atk} · Защ ${d.def} · Ход ${d.mov}${d.rng>1?' · Дальн. '+d.rng:''}${t==='spear'?' · ×2 против конницы':''}${t==='cav'?' · натиск':''}</div></div>
 <button onclick="recruit('${t}')" ${G.fac.rome.gold<d.cost?'disabled':''}>💰${d.cost}</button></div>`});
 modal(`<h2>Набор в ${p.n}</h2><p class="small">Содержание: 20 золота за отряд в ход. Осталось наймов: ${p.lvl-p.rec}</p>${h}<div class="row" style="margin-top:12px"><button onclick="closeModal()">Закрыть</button></div>`);
}
export function recruit(t){
 const p=P(G.sel),d=UT[t];
 if(G.fac.rome.gold<d.cost||p.army.length>=8||p.rec>=p.lvl)return;
 G.fac.rome.gold-=d.cost;p.rec++;const u=mk(t);p.army.push(u);G.pick.add(u.id);
 closeModal();addLog(`Нанят отряд: ${uname(t,'rome')} (${p.n}).`);render();
 if(p.army.length<8&&p.rec<p.lvl)openRecruit();
}
export function upgrade(){const p=P(G.sel),c=400*p.lvl;if(G.fac.rome.gold<c||p.lvl>=3)return;G.fac.rome.gold-=c;p.lvl++;addLog(`${p.n} разрастается (ур. ${p.lvl}).`);render()}
