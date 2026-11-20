import { FACT, UT, RECRUIT, WIN_N } from './data.js';
import { $, rnd, sleep } from './util.js';
import { G, mk, P, adj, newGame, save, addLog, income, str, garUnits } from './state.js';
import { render, capture, applyBattle, recruit, upgrade } from './map.js';
import { alive, tactical } from './battle-sim.js';
import { modal, closeModal, ask } from './ui.js';
import { rand } from './rng.js';

// ===================== TURN =====================
export async function endTurn(){
 if(G.busy)return;G.busy=true;$('endBtn').disabled=true;
 G.sel=null;G.pick=new Set();
 for(const f of ['carth','gaul','greek']){
  if(!G.prov.some(p=>p.owner===f))continue;
  await aiTurn(f);
  if(G.over)return;
 }
 // new turn
 G.turn++;
 for(const f in G.fac){if(f==='rebel')continue;G.fac[f].gold=Math.max(0,G.fac[f].gold+income(f).net)}
 G.prov.forEach(p=>{
  p.moved=false;p.rec=0;
  const gmax=p.lvl+1+(p.owner==='rebel'?1:0)+(FACT[p.owner].cap===p.id?2:0);
  if(p.gar<gmax&&G.turn%2===0)p.gar++;
  p.army.forEach(u=>u.hp=Math.min(100,u.hp+12));
 });
 if(G.fac.rome.gold===0&&income('rome').net<0){const p=G.prov.find(p=>p.owner==='rome'&&p.army.length);if(p){p.army.pop();addLog('Казна пуста — один отряд дезертировал!')}}
 G.busy=false;$('endBtn').disabled=false;
 checkEnd();save();render();
}
export function checkEnd(){
 if(G.over)return;
 const n=G.prov.filter(p=>p.owner==='rome').length;
 if(P('roma').owner!=='rome'){G.over=true;save();modal(`<h2>Рим пал</h2><p>Варвары у ворот, сенат разогнан. Твоя империя закончилась на ходу ${G.turn}.</p><button class="pri" onclick="closeModal();newGame()">Новая игра</button>`);return}
 if(n>=WIN_N||!G.prov.some(p=>['carth','gaul','greek'].includes(p.owner))){G.over=true;save();modal(`<h2>🦅 Триумф!</h2><p>Средиземное море стало Mare Nostrum. Ты покорил мир за ${G.turn} ходов. Ave, Imperator!</p><button class="pri" onclick="closeModal();newGame()">Новая игра</button>`)}
}

export async function aiTurn(f){
 const F=G.fac[f];
 const mine=()=>G.prov.filter(p=>p.owner===f);
 const border=p=>adj(p.id).some(a=>P(a).owner!==f);
 // upgrade
 if(F.gold>1400){const p=mine().filter(p=>p.lvl<3).sort((a,b)=>b.base-a.base)[0];if(p){F.gold-=400*p.lvl;p.lvl++}}
 // recruit
 const pool=RECRUIT[f], w={sword:3,spear:2,arch:2,cav:2,eleph:1};
 const bag=[];pool.forEach(t=>{for(let i=0;i<(w[t]||1);i++)bag.push(t)});
 const rp=mine().sort((a,b)=>(border(b)-border(a))||(b.lvl-a.lvl));
 for(const p of rp){
  while(p.army.length<8&&p.rec<p.lvl){
   const t=bag[Math.floor(rand()*bag.length)];
   const reserve=G.turn<4?0:150;
   if(F.gold<UT[t].cost+reserve||income(f).net<40)break;
   F.gold-=UT[t].cost;p.army.push(mk(t));p.rec++;
  }
 }
 // moves
 const aggr=f==='gaul'?1.15:1.3;
 for(const p of mine()){
  if(!p.army.length||p.moved||p.owner!==f)continue;
  const s=str(p.army);
  let best=null,bs=0;
  adj(p.id).forEach(a=>{const t=P(a);if(t.owner===f)return;
   const ds=str(t.army)+str(garUnits(t),1.2)+0.1;let r=s/ds;
   if(t.owner==='rome'){if(G.turn<4)return;r*=1.1}
   if(r>bs){bs=r;best=t}});
  if(best&&bs>aggr){
   // leave one unit at home if the home is threatened by Rome
   let units=p.army;
   const threat=adj(p.id).some(a=>P(a).owner==='rome'&&P(a).army.length);
   if(threat&&p.army.length>=4){units=p.army.slice(0,-1);p.army=p.army.slice(-1)} else p.army=[];
   await aiAttack(p,best,f,units);
   if(G.over)return;
  } else if(!border(p)){
   // move toward frontier
   const step=pathToBorder(p,f);
   if(step&&step.army.length+p.army.length<=8){step.army.push(...p.army);p.army=[];step.moved=true}
  }
 }
}
export function pathToBorder(start,f){
 const q=[[start.id,null]],seen=new Set([start.id]);
 while(q.length){const [id,first]=q.shift();const p=P(id);
  if(id!==start.id&&adj(id).some(a=>P(a).owner!==f))return P(first);
  for(const a of adj(id)){if(!seen.has(a)&&P(a).owner===f){seen.add(a);q.push([a,first||a])}}}
 return null;
}
export async function aiAttack(from,to,f,units){
 const def=[...to.army,...garUnits(to)];
 if(to.owner==='rome'){
  G.sel=to.id;render();
  if(!def.length){capture(to,f,units);render();await sleep(500);checkEnd();return}
  const ch=await ask(`⚠ ${FACT[f].n} атакуют!`,`<p>Враг вторгся в провинцию <b>${to.n}</b>.</p><p>Враг: <b>${Math.round(str(units))}</b> (${units.length} отр.)</p><p>Твоя оборона: <b>${Math.round(str(to.army)+str(garUnits(to),1.2))}</b> (${to.army.length} отр. + ${to.gar} ополч.)</p>`,
   [['fight','⚔ Командовать',1],['auto','🎲 Авторасчёт']]);
  const res=ch==='fight'?await tactical(units,def,f,'rome','def',to.n):autoResolve(units,def,1.2);
  applyBattle(from,to,f,res);G.sel=null;render();checkEnd();
 } else {
  if(!def.length){capture(to,f,units);return}
  const res=autoResolve(units,def,1.2);applyBattle(from,to,f,res);
 }
}
export function autoResolve(att,def,garBonus){
 const sa=str(att)*rnd(.85,1.15), sd=(str(def.filter(u=>!u.gar))+str(def.filter(u=>u.gar),garBonus))*rnd(.85,1.15);
 const win=sa>=sd?'att':'def';
 const W=win==='att'?att:def, L=win==='att'?def:att;
 const ratio=Math.min(sa,sd)/Math.max(sa,sd);
 W.forEach(u=>u.hp=Math.round(u.hp*(1-Math.min(.85,ratio*rnd(.35,.7)))));
 L.forEach(u=>u.hp=Math.round(u.hp*rnd(0,.35)));
 const alive=a=>a.filter(u=>u.hp>=15);
 return {win,att:alive(att),def:win==='def'?alive(def):[]};
}
