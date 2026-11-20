// Campaign rules: income, upkeep, public order, buildings, decrees, technologies, generals.
import { FACT, UT, BUILDINGS, UNIT_REQ, EDICTS, EDICT_COST, TECH, ORDER, GEN_UPKEEP, UNIT_UPKEEP, maxGeneralsFor, RECRUIT, PLAYER, REBELS, SETTLE_COST, RAID_SHARE } from './data.js';
import { G, P, mk, addLog } from './state.js';
import { rand } from './rng.js';
import { tradeIncome } from './diplo.js';

// ---------- technologies ----------
export function hasTech(f,id){return !!(G&&G.fac&&G.fac[f]&&G.fac[f].tech&&G.fac[f].tech[id])}
export function techAvailable(f,id){const t=TECH[id];return !hasTech(f,id)&&(!t.req||hasTech(f,t.req))}
export function researchPoints(f){
 const own=G.prov.filter(p=>p.owner===f);
 return 8+own.length+own.reduce((s,p)=>s+2*bLevel(p,'church'),0);
}
export function setResearch(f,id){if(techAvailable(f,id))G.fac[f].res={id,pts:(G.fac[f].res&&G.fac[f].res.id===id)?G.fac[f].res.pts:0}}

// ---------- decrees ----------
export function edictOf(f){return (G.fac[f]&&G.fac[f].edict)||'none'}
export function setEdict(f,e){
 const F=G.fac[f];if(edictOf(f)===e||!EDICTS[e])return false;
 if(e!=='none'){if(F.gold<EDICT_COST)return false;F.gold-=EDICT_COST}
 F.edict=e;return true;
}

// ---------- buildings ----------
export function bLevel(p,b){return (p.b&&p.b[b])||0}
export function slots(p){return p.lvl+3}
export function usedSlots(p){return Object.keys(p.b||{}).filter(k=>p.b[k]>0).length+(p.cons&&!bLevel(p,p.cons.b)?1:0)}
export function buildCost(f,b,lvl){return Math.round(BUILDINGS[b].lv[lvl-1].cost*(hasTech(f,'civ4')?0.75:1))}
// options for the next construction in a region: [{b,lvl,cost,ok,why}]
export function buildOptions(p){
 const f=p.owner,res=[];
 for(const b in BUILDINGS){
  const cur=bLevel(p,b),lvl=cur+1;
  if(lvl>BUILDINGS[b].lv.length)continue;
  const cost=buildCost(f,b,lvl);
  let why='';
  if(p.cons)why='уже строится';
  else if(!cur&&usedSlots(p)>=slots(p))why='нет места';
  else if(G.fac[f].gold<cost)why='мало золота';
  res.push({b,lvl,cost,ok:!why,why});
 }
 return res;
}
export function startBuild(p,b){
 const o=buildOptions(p).find(x=>x.b===b);if(!o||!o.ok)return false;
 G.fac[p.owner].gold-=o.cost;p.cons={b,lvl:o.lvl};return true;
}
export function buildingEffect(b,l){
 const e=BUILDINGS[b].lv[l-1],x=[];
 if(e.unlock&&e.unlock.length)x.push('найм: '+e.unlock.map(t=>UT[t].n.toLowerCase()).join(', '));
 if(e.inc)x.push(`доход +${Math.round(e.inc*100)}%`);
 if(e.gold)x.push(`+${e.gold} золота`);
 if(e.order)x.push(`порядок +${e.order}`);
 if(e.gar)x.push(`гарнизон +${e.gar}`);
 if(e.wall)x.push(e.wall>1?'каменные стены':'деревянные стены');
 return x.join(', ');
}
function sumEffect(p,key){let s=0;for(const b in p.b||{})for(let l=1;l<=p.b[b];l++)s+=BUILDINGS[b].lv[l-1][key]||0;return s}
export function wallLevel(p){let w=0;for(let l=1;l<=bLevel(p,'walls');l++)w=Math.max(w,BUILDINGS.walls.lv[l-1].wall||0);return w}
export function garMax(p){
 const cap=G.fac[p.owner]&&G.fac[p.owner].cap===p.id;
 return p.lvl+1+(p.owner==='rebel'?REBELS.garBonus:0)+(cap?2:0)+sumEffect(p,'gar')+(edictOf(p.owner)==='levy'?1:0);
}

// ---------- units ----------
export function unitAvailable(p,t){
 if(!RECRUIT[p.owner].includes(t))return false;
 const r=UNIT_REQ[t];return !r||bLevel(p,r[0])>=r[1];
}
export function unitCost(f,t){return Math.round(UT[t].cost*(edictOf(f)==='levy'?0.75:1))}
export function generals(f){return G.prov.reduce((s,p)=>s+p.army.filter(u=>UT[u.t].general&&p.owner===f).length,0)}
// AI states sitting on a big treasury raise an extra army for every 5000 gold
export function maxGenerals(f){return maxGeneralsFor(G.prov.filter(p=>p.owner===f).length)+(f!==PLAYER?Math.min(3,Math.floor((G.fac[f].gold||0)/5000)):0)}

// ---------- order ----------
export function orderOf(p){
 if(p.owner==='rebel')return 0;
 const f=p.owner;let o=ORDER.base;
 if(p.occ>0)o+=ORDER.occupied;
 if(p.cult0&&p.cult0!==FACT[f].cult)o+=ORDER.foreign;
 o+=sumEffect(p,'order');
 o+=Math.min(ORDER.maxGarrison,p.army.length*ORDER.perGarrison);
 const e=edictOf(f);if(e==='tax')o-=15;if(e==='peace')o+=15;
 if(hasTech(f,'civ3'))o+=10;
 if(p.raided>0)o-=10;                 // plundered by raiders
 return Math.max(-100,Math.min(100,o));
}

// ---------- money ----------
export function provIncome(p){
 if(p.occ>0)return 0;
 const f=p.owner;
 let v=p.base*(1+0.25*(p.lvl-1))*(1+sumEffect(p,'inc'));
 let g=sumEffect(p,'gold');
 if(edictOf(f)==='trade')g*=1.3;
 if(hasTech(f,'civ2'))g*=1.3;
 v+=g;
 if(hasTech(f,'civ1'))v*=1.1;
 const e=edictOf(f);if(e==='tax')v*=1.2;if(e==='peace')v*=0.95;
 if(orderOf(p)<ORDER.poorBelow)v*=0.5;
 if(p.raided>0)v*=1-RAID_SHARE;
 return Math.round(v);
}
export function upkeepOf(f){
 let up=0;
 for(const p of G.prov)if(p.owner===f){
  let a=0;for(const u of p.army)a+=UT[u.t].general?GEN_UPKEEP:UNIT_UPKEEP;
  const g=p.army.find(u=>UT[u.t].general&&u.g);
  if(g&&g.g.traits.includes('thrift'))a*=0.75;      // a thrifty general
  if(g&&p.stance==='raid')a*=0.5;                    // raiders live off the land
  up+=a;
 }
 return Math.round(up*(hasTech(f,'mil4')?0.75:1));
}
export function income(f){
 let inc=0;
 for(const p of G.prov)if(p.owner===f)inc+=provIncome(p);
 inc+=tradeIncome(f);
 const up=upkeepOf(f);
 return {inc,up,net:inc-up};
}

// ---------- yearly processing (for every state) ----------
export function yearlyUpdate(){
 for(const p of G.prov){
  // construction finishes
  if(p.cons){p.b=p.b||{};p.b[p.cons.b]=p.cons.lvl;
   if(p.owner===PLAYER)addLog(`${p.n}: построено — ${BUILDINGS[p.cons.b].n.toLowerCase()} (ур. ${p.cons.lvl}).`);
   p.cons=null}
  // unrest and revolts
  if(p.owner!=='rebel'){
   const o=orderOf(p);
   p.unrest=Math.max(0,(p.unrest||0)+(o<0?-o/10:-2));
   if(p.unrest>=ORDER.revoltAt&&p.army.length<3){
    const old=p.owner;
    if(old===PLAYER)addLog(`⚠ Бунт! ${p.n} отложилась от державы.`);
    p.owner='rebel';p.unrest=0;p.occ=0;p.gar=3;p.army=[mk('mil'),mk('spear'),mk('mil')];
    if(G.fac[old].cap===p.id){const rest=G.prov.filter(q=>q.owner===old).sort((a,b)=>b.base-a.base);G.fac[old].cap=rest.length?rest[0].id:null}
   }
  }
 }
 // research
 for(const f in G.fac){
  if(f==='rebel'||!G.prov.some(p=>p.owner===f))continue;
  const F=G.fac[f];F.tech=F.tech||{};
  if(!F.res||!techAvailable(f,F.res.id)){
   const next=Object.keys(TECH).filter(id=>techAvailable(f,id)).sort((a,b)=>TECH[a].cost-TECH[b].cost);
   if(f!==PLAYER&&next.length)F.res={id:next[Math.floor(rand()*Math.min(2,next.length))],pts:0};
   else if(!next.length)F.res=null;
  }
  if(F.res){F.res.pts+=researchPoints(f);
   if(F.res.pts>=TECH[F.res.id].cost){F.tech[F.res.id]=1;if(f===PLAYER)addLog(`📜 Изучено: ${TECH[F.res.id].n}.`);F.res=null}}
 }
}

// ---------- AI economy ----------
const AI_BUILD_ORDER=['barracks','farm','market','range','church','stable','walls'];
export function aiEconomy(f){
 const F=G.fac[f];
 // decree: taxes while order allows it, otherwise peace
 const own=G.prov.filter(p=>p.owner===f);
 const unhappy=own.filter(p=>orderOf(p)<0).length;
 const want=unhappy>own.length/4?'peace':F.gold<300?'tax':'trade';
 if(edictOf(f)!==want&&F.gold>EDICT_COST+300&&rand()<0.3)setEdict(f,want);
 // build where useful (a few towns a year), keeping a reserve for the army
 const towns=own.filter(p=>!p.cons).sort((a,b)=>b.tier-a.tier||b.base-a.base);
 let built=0;
 for(const p of towns){
  if(built>=3||F.gold<800)break;
  for(const b of AI_BUILD_ORDER){const o=buildOptions(p).find(x=>x.b===b);if(o&&o.ok&&F.gold-o.cost>500){startBuild(p,b);built++;break}}
 }
 // grow settlements when rich
 if(F.gold>2500){const p=own.filter(p=>p.lvl<3).sort((a,b)=>b.base-a.base)[0];if(p){F.gold-=SETTLE_COST*p.lvl;p.lvl++}}
}
