import { FACT, UT, RECRUIT, WIN_N, PLAYER, aiFactions, AI, START_YEAR, REBELS, MAJORS , MAX_ARMY, SETTLE_COST } from './data.js';
import { $, rnd, sleep } from './util.js';
import { G, mk, P, adj, newGame, save, addLog, income, str, garUnits, capOf } from './state.js';
import { render, capture, applyBattle, recruit, upgrade } from './map.js';
import { alive, tactical } from './battle-sim.js';
import { modal, closeModal, ask } from './ui.js';
import { rand } from './rng.js';
import { aiDiplomacy, atWar, declareWar, rel } from './diplo.js';
import { yearlyUpdate, garMax, aiEconomy, unitAvailable, unitCost, generals, maxGenerals, wallLevel, hasTech } from './rules.js';

// ===================== TURN =====================
export async function endTurn(){
 if(G.busy)return;G.busy=true;$('endBtn').disabled=true;
 G.sel=null;G.pick=new Set();
 aiDiplomacy();
 for(const f of aiFactions()){
  if(!G.prov.some(p=>p.owner===f))continue;
  await aiTurn(f);
  if(G.over)return;
 }
 // new turn
 G.turn++;
 for(const f in G.fac){if(f==='rebel')continue;G.fac[f].gold=Math.max(0,G.fac[f].gold+income(f).net)}
 G.prov.forEach(p=>{
  p.moved=false;p.rec=0;
  if(p.gar<garMax(p)&&G.turn%2===0)p.gar++;
  if(p.occ>0)p.occ--;
  // independent lands slowly raise their own warband
  if(p.owner==='rebel'&&G.turn%REBELS.armyEvery===0&&p.army.length<REBELS.armyMax)p.army.push(mk(REBELS.unit[p.army.length%REBELS.unit.length]));
  p.army.forEach(u=>u.hp=Math.min(100,u.hp+12));
 });
 yearlyUpdate();
 if(G.fac[PLAYER].gold===0&&income(PLAYER).net<0){const p=G.prov.find(p=>p.owner===PLAYER&&p.army.length);if(p){p.army.pop();addLog('Казна пуста — один отряд дезертировал!')}}
 G.busy=false;$('endBtn').disabled=false;
 checkEnd();save();render();
}
export function checkEnd(){
 if(G.over)return;
 const n=G.prov.filter(p=>p.owner===PLAYER).length;
 const ruler={rus:'князя',pol:'короля',hre:'императора',hun:'короля',byz:'базилевса',fra:'короля'}[PLAYER]||'государя';
 if(n===0){G.over=true;save();modal(`<h2>Держава пала</h2><p>У тебя не осталось ни одной земли. Твоё правление окончилось в ${START_YEAR-1+G.turn} году.</p><button class="pri" onclick="closeModal();showNewGame()">Новая игра</button>`);return}
 const rivals=MAJORS.filter(f=>f!==PLAYER);
 const rivalsGone=rivals.every(f=>!G.prov.some(p=>p.owner===f));
 if(n>=WIN_N||rivalsGone){G.over=true;save();modal(`<h2>${FACT[PLAYER].emblem} Слава!</h2><p>${rivalsGone?'Все великие державы пали перед тобой.':`Под твоей рукой ${n} земель.`} Ты создал великую державу за ${G.turn} лет. Слава ${ruler}!</p><button class="pri" onclick="closeModal();showNewGame()">Новая игра</button>`)}
}

export async function aiTurn(f){
 const F=G.fac[f];
 const mine=()=>G.prov.filter(p=>p.owner===f);
 const border=p=>adj(p.id).some(a=>P(a).owner!==f);
 // upgrade a settlement now and then
 if(F.gold>1600){const p=mine().filter(p=>p.lvl<3).sort((a,b)=>b.base-a.base)[0];if(p){F.gold-=SETTLE_COST*p.lvl;p.lvl++}}
 aiEconomy(f);
 // recruit: armies need a general to fight, so generals first (within the army limit)
 const hasGen=p=>p.army.some(u=>UT[u.t].general);
 const w={mil:1,spear:3,druzh:3,arch:2,xbow:2,knight:2,hasb:2};
 const rp=mine().sort((a,b)=>(border(b)-border(a))||(b.lvl-a.lvl));
 for(const p of rp){
  const pool=RECRUIT[f].filter(t=>!UT[t].general&&unitAvailable(p,t));
  const bag=[];pool.forEach(t=>{for(let i=0;i<(w[t]||1);i++)bag.push(t)});
  while(p.army.length<MAX_ARMY&&p.rec<p.lvl){
   const needGen=!hasGen(p)&&border(p)&&generals(f)<maxGenerals(f);
   const t=needGen&&F.gold>=unitCost(f,'gen')?'gen':bag[Math.floor(rand()*bag.length)];
   if(!t)break;
   const reserve=G.turn<4?0:150;
   if(F.gold<unitCost(f,t)+reserve||income(f).net<40)break;
   F.gold-=unitCost(f,t);p.army.push(mk(t));p.rec++;
  }
 }
 // moves
 const aggr=AI.aggressive[f]||AI.attackRatio;
 let attacks=0;
 for(const p of mine()){
  if(!p.army.length||p.moved||p.owner!==f)continue;
  if(!hasGen(p)){ // without a general the troops only march within our lands, towards an army that has one
   const step=pathToBorder(p,f);
   if(step&&!border(p)&&step.army.length+p.army.length<=MAX_ARMY){step.army.push(...p.army);p.army=[];step.moved=true}
   continue;
  }
  const s=str(p.army);
  let best=null,bs=0;
  adj(p.id).forEach(a=>{const t=P(a);if(t.owner===f)return;
   if(t.owner!=='rebel'&&!atWar(f,t.owner))return;
   const ds=str(t.army)+str(garUnits(t),1.2)+0.1;let r=s/ds;
   if(t.owner===PLAYER){if(G.turn<AI.playerGraceTurns)return;r*=AI.playerBias}
   else if(t.owner!=='rebel')r*=aggr/AI.majorRatio;
   if(r>bs){bs=r;best=t}});
  if(best&&bs>aggr&&attacks<AI.maxAttacksPerTurn){
   // keep enough at home to face the strongest neighbouring army (anyone's, not only the player's)
   const threat=Math.max(0,...adj(p.id).map(P).filter(t=>t.owner!==f&&t!==best).map(t=>str(t.army)));
   const need=threat*(capOf(f)===p.id?1.0:0.7)-str(garUnits(p),1.2);
   const sorted=[...p.army].filter(u=>!UT[u.t].general).sort((x,y)=>str([x])-str([y]));
   const gens=p.army.filter(u=>UT[u.t].general);
   const stay=[];while(need>0&&str(stay)<need&&sorted.length>1)stay.push(sorted.shift());
   sorted.unshift(...gens.slice(0,1));stay.push(...gens.slice(1));
   const units=sorted;
   const ds=str(best.army)+str(garUnits(best),1.2)+0.1;
   if(!units.length||str(units)/ds<=aggr)continue;
   attacks++;
   p.army=stay;
   await aiAttack(p,best,f,units);
   if(G.over)return;
  } else if(!border(p)){
   // move toward frontier
   const step=pathToBorder(p,f);
   if(step&&step.army.length+p.army.length<=MAX_ARMY){step.army.push(...p.army);p.army=[];step.moved=true}
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
 if(to.owner===PLAYER){
  G.sel=to.id;render();
  if(!def.length){capture(to,f,units);render();await sleep(500);checkEnd();return}
  const ch=await ask(`⚠ ${FACT[f].n} атакуют!`,`<p>Враг вторгся в провинцию <b>${to.n}</b>.</p><p>Враг: <b>${Math.round(str(units))}</b> (${units.length} отр.)</p><p>Твоя оборона: <b>${Math.round(str(to.army)+str(garUnits(to),1.2))}</b> (${to.army.length} отр. + ${to.gar} ополч.)</p>`,
   [['fight','⚔ Командовать',1],['auto','🎲 Авторасчёт']]);
  const res=ch==='fight'?await tactical(units,def,f,PLAYER,'def',to.n):autoResolve(units,def,...siegeMods(to,f));
  applyBattle(from,to,f,res);G.sel=null;render();checkEnd();
 } else {
  if(!def.length){capture(to,f,units);return}
  const res=autoResolve(units,def,...siegeMods(to,f));applyBattle(from,to,f,res);
 }
}
// walls make the garrison and the defending army stronger; siege engineering (tech) cancels part of it
export function siegeMods(to,attacker){
 const w=wallLevel(to),k=hasTech(attacker,'mil3')?0.75:1;
 return [1+(0.2+0.3*w)*k,1+0.15*w*k];
}
export function autoResolve(att,def,garBonus,defMult=1){
 const sa=str(att)*rnd(.85,1.15), sd=(str(def.filter(u=>!u.gar))*defMult+str(def.filter(u=>u.gar),garBonus))*rnd(.85,1.15);
 const win=sa>=sd?'att':'def';
 const W=win==='att'?att:def, L=win==='att'?def:att;
 const ratio=Math.min(sa,sd)/Math.max(sa,sd);
 W.forEach(u=>u.hp=Math.round(u.hp*(1-Math.min(.85,ratio*rnd(.35,.7)))));
 L.forEach(u=>u.hp=Math.round(u.hp*rnd(0,.35)));
 const alive=a=>a.filter(u=>u.hp>=15);
 return {win,att:alive(att),def:win==='def'?alive(def):[]};
}
