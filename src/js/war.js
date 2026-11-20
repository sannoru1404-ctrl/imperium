// Veterans, generals, reinforcements, army stances and historical events.
import { FACT, UT, PLAYER, XP_MAX, GEN_NAMES, TRAITS, GEN_XP, STANCES, AMBUSH_CHANCE, RAID_SHARE, EVENTS, MAX_ARMY, TRADITIONS, TRAD_XP } from './data.js';
import { G, P, adj, mk, str, addLog } from './state.js';
import { rand } from './rng.js';
import { atWar, declareWar } from './diplo.js';
import { modal } from './ui.js';

export const REINF_CAP=20;            // regiments per side in one battle
const isGen=u=>UT[u.t].general;

// ---------- generals ----------
const GOOD=Object.keys(TRAITS).filter(k=>!TRAITS[k].bad);
function newTrait(g){const free=GOOD.filter(k=>!g.traits.includes(k));if(free.length)g.traits.push(free[Math.floor(rand()*free.length)])}
export function makeGeneral(u,f){
 if(!u||!isGen(u)||u.g)return;
 const names=GEN_NAMES[(FACT[f]||{}).cult]||GEN_NAMES.west;
 const g={name:names[Math.floor(rand()*names.length)],rank:1,xp:0,traits:[]};
 if(rand()<0.15)g.traits.push('coward');else if(rand()<0.6)newTrait(g);
 u.g=g;
}
// give every general on the map a name (new recruits, starting armies, event hosts)
export function nameGenerals(){
 for(const p of G.prov){
  for(const u of p.army)if(isGen(u)&&!u.g)makeGeneral(u,p.owner);
  // an army that lost its general keeps its traditions for the next one
  const g=p.army.find(u=>isGen(u)&&u.g),k=p.army.find(u=>u.legacy);
  if(g&&k){if(!armyOf(g).tr.length)g.g.army=k.legacy;delete k.legacy}
 }
}
// ---------- army traditions ----------
export function armyOf(u){if(!u.g.army)u.g.army={xp:0,tr:[]};return u.g.army}
export function traditions(units){const g=units.find(x=>isGen(x)&&x.g&&x.g.army);return g?g.g.army.tr:[]}
function armyLearns(u,won){
 const a=armyOf(u);a.xp+=won?2:1;
 while(a.tr.length<TRAD_XP.length&&a.xp>=TRAD_XP[a.tr.length]){
  const free=Object.keys(TRADITIONS).filter(k=>!a.tr.includes(k));
  a.tr.push(free[Math.floor(rand()*free.length)]);
 }
}
export function genOf(units){const u=units.find(x=>isGen(x)&&x.g);return u?u.g:null}
export function hasTrait(units,t){const g=genOf(units);return !!(g&&g.traits.includes(t))}
export function genLabel(u){
 if(!u.g)return '';
 return `${u.g.name} ${'★'.repeat(u.g.rank)}${u.g.traits.length?' · '+u.g.traits.map(t=>TRAITS[t].n).join(', '):''}`;
}
// strength multiplier the general gives to the whole army (used by the campaign strength estimate)
export function genMult(units){const g=genOf(units);if(!g)return 1;let m=1+0.03*(g.rank-1)+0.04*((g.army&&g.army.tr.length)||0);if(g.traits.includes('strat'))m*=1.1;if(g.traits.includes('coward'))m*=0.95;if(g.traits.includes('brave'))m*=1.03;return m}
export function xpMult(u){return 1+0.06*(u.xp||0)}
export function stars(u){return u.xp?'<span style="color:#ffd84a">'+'★'.repeat(u.xp)+'</span>':''}

// survivors of a battle learn; generals climb in rank and gain traits
export function grantXP(units,won){
 const seen=new Set(),vets=traditions(units).includes('vets')?0.15:0;
 for(const u of units){if(seen.has(u.id))continue;seen.add(u.id);
  if(isGen(u)&&u.g){const g=u.g;g.xp+=won?2:1;armyLearns(u,won);
   while(g.rank<5&&g.xp>=GEN_XP[g.rank]){g.rank++;if(g.rank===2||g.rank===4)newTrait(g)}
   continue;}
  if((u.xp||0)<XP_MAX&&rand()<(won?0.55:0.2)+vets)u.xp=(u.xp||0)+1;
 }
}

// ---------- reinforcements ----------
// Armies with a general that stand next to the battlefield join in. The whole army joins and stays in its own land.
export function gatherReinforcements(from,to,af,attUnits,defUnits){
 const df=to.owner;const list=[];
 const take=(f,arr,side)=>{
  if(f==='rebel')return;
  const cand=adj(to.id).map(P).filter(p=>p!==from&&p!==to&&p.owner===f&&!p.besiege&&p.army.some(isGen)&&!p.army.some(u=>arr.includes(u)))
   .sort((a,b)=>str(b.army)-str(a.army));
  for(const p of cand){if(arr.length+p.army.length>REINF_CAP)continue;arr.push(...p.army);list.push({p,side});break}   // one relief army per side
 };
 take(af,attUnits,'att');take(df,defUnits,'def');
 return list;
}
// how strong a relief army the defender of `to` can bring (to weigh an attack)
export function reliefStr(to){
 if(to.owner==='rebel')return 0;
 return Math.max(0,...adj(to.id).map(P).filter(p=>p.owner===to.owner&&!p.besiege&&p.army.some(isGen)).map(p=>str(p.army)));
}
export function reinfText(list,side){const l=list.filter(x=>x.side===side);if(!l.length)return '';return `<p class="small">🛡 Подкрепления: ${l.map(x=>`${x.p.n} (${x.p.army.length})`).join(', ')}</p>`}
// after the battle: reinforcements go home (the dead stay on the field), and are removed from the result
export function returnReinforcements(list,res){
 if(!list.length)return;
 const ids=new Set();
 for(const {p} of list){p.army.forEach(u=>ids.add(u.id));p.army=p.army.filter(u=>u.hp>=15)}
 res.att=res.att.filter(u=>!ids.has(u.id));res.def=res.def.filter(u=>!ids.has(u.id));
}

export function afterBattle(res,reinf,att,def){
 // a fallen general hands the army's traditions to a surviving regiment
 for(const [orig,surv] of [[att,res.att],[def,res.def]]){
  const g=(orig||[]).find(u=>isGen(u)&&u.g&&u.g.army&&u.g.army.tr.length);
  if(g&&!surv.includes(g)){const k=surv.find(u=>!isGen(u)&&!u.gar);if(k)k.legacy=g.g.army}
 }
 grantXP(res.att,res.win==='att');grantXP(res.def.filter(u=>!u.gar),res.win==='def');
 // reinforcements on the losing side that survived also go home (and learn a little)
 for(const {p,side} of reinf||[])if(res.win!==side)grantXP(p.army.filter(u=>u.hp>=15),false);
 returnReinforcements(reinf||[],res);
}

// ---------- stances ----------
export function stanceOf(p){return (p&&p.army.some(isGen)&&p.stance)||'none'}
export function setStanceOf(p,s){if(!STANCES[s])return;p.stance=s;if(s!=='march')p.mstep=0}
// battle modifiers from stances: [attacker multiplier, defender multiplier, ambushed?]
export function stanceMods(from,to,attUnits){
 let am=1,dm=1,amb=false,tired=false;
 const st=stanceOf(to);
 if(st==='camp')dm*=1.25;
 if(st==='ambush'&&!to.siege&&rand()<AMBUSH_CHANCE){amb=true;am*=0.8;to.stance='none'}   // an ambush works once
 if(from&&from.mstep&&!hasTrait(attUnits,'swift')){tired=true;am*=0.9}   // tired after a forced march
 return [am,dm,amb,tired];
}
// raiding armies plunder an enemy neighbour once a year
export function raids(){
 for(const p of G.prov){
  if(stanceOf(p)!=='raid')continue;
  const f=p.owner;
  const tg=adj(p.id).map(P).filter(q=>q.owner!==f&&(q.owner==='rebel'||atWar(f,q.owner))).sort((a,b)=>b.base-a.base)[0];
  if(!tg){p.stance='none';continue}
  const loot=Math.round(tg.base*RAID_SHARE*(1+0.25*(tg.lvl-1)));
  G.fac[f].gold+=loot;tg.raided=2;
  if(tg.owner!=='rebel'&&G.fac[tg.owner])G.fac[tg.owner].gold=Math.max(0,G.fac[tg.owner].gold-Math.round(loot/2));
  if(f===PLAYER)addLog(`🔥 Набег на ${tg.n}: добыча ${loot}.`);
  else if(tg.owner===PLAYER)addLog(`🔥 ${FACT[f].n} грабят ${tg.n}!`);
 }
 for(const p of G.prov)if(p.raided>0)p.raided--;
}
// after its moves the AI picks a stance for every army that stayed
export function aiStances(f){
 for(const p of G.prov){
  if(p.owner!==f||!p.army.some(isGen)||p.besiege)continue;
  if(p.moved){if(p.stance!=='camp')p.stance='none';continue}
  const foes=adj(p.id).map(P).filter(q=>q.owner!==f&&(q.owner==='rebel'||atWar(f,q.owner)));
  if(!foes.length){p.stance='none';continue}
  const threat=Math.max(0,...foes.map(q=>str(q.army)));
  const x=rand();
  if(threat>str(p.army)*0.8)p.stance=x<0.6?'camp':x<0.8?'ambush':'none';
  else p.stance=x<0.35?'raid':x<0.5?'camp':'none';
 }
}

// ---------- events ----------
export function runEvents(){
 G.ev=G.ev||{};
 for(const ev of EVENTS){
  if(G.ev[ev.id]||G.turn<ev.turn)continue;
  G.ev[ev.id]=true;
  const f=ev.id, lands=ev.where.map(P).filter(Boolean);
  if(!lands.length)continue;
  const victims=new Set();
  lands.forEach((p,i)=>{
   if(p.owner!==f)victims.add(p.owner);
   p.owner=f;p.siege=null;p.besiege=null;p.occ=0;p.unrest=0;p.gar=4;p.stance='none';
   p.army=i<ev.armies?ev.army.map(t=>mk(t)):[];
   p.army.forEach(u=>makeGeneral(u,f));
  });
  if(!G.fac[f])G.fac[f]={gold:0,tech:{},res:null};
  G.fac[f].cap=lands[0].id;G.fac[f].gold=(G.fac[f].gold||0)+3000;
  // the newcomers know their trade
  G.fac[f].tech={mil1:1,mil2:1,mil3:1};
  if(G.att)G.att[f]=-60;
  const foes=ev.war==='all'?Object.keys(FACT).filter(x=>x!==f&&x!=='rebel'&&G.prov.some(p=>p.owner===x)):ev.war.filter(x=>FACT[x]);
  victims.forEach(x=>{if(x!=='rebel')foes.push(x)});
  [...new Set(foes)].forEach(x=>{if(x!==f&&FACT[x])declareWar(f,x)});
  addLog(`${FACT[f].emblem} ${ev.n}: ${ev.text}`);
  modal(`<h2>${FACT[f].emblem} ${ev.n}</h2><p>${ev.text}</p><p class="small">Земли: ${lands.map(p=>p.n).join(', ')}.${foes.includes(PLAYER)?' <b>Они идут войной и на тебя.</b>':''}</p><button class="pri" onclick="closeModal()">Далее</button>`);
 }
}
// event hosts get supplies from home every year
export function eventSupply(){
 for(const ev of EVENTS)if(G.ev&&G.ev[ev.id]&&G.prov.some(p=>p.owner===ev.id))G.fac[ev.id].gold+=ev.id==='mong'?500:250;
}
export const EVENT_AGGR=1.15;
export { isGen, MAX_ARMY };
