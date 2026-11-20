import { seed, getState, setState } from './rng.js';
import { FACT, UT, PROV_DEF, ADJ, START_ARMY } from './data.js';
import { $ } from './util.js';
import { render } from './map.js';

export let G=null; // game state
export let uid=1;
export function mk(t,hp=100){return {id:uid++,t,hp}}
export function P(id){return G.prov.find(p=>p.id===id)}
export function adj(id){return ADJ.filter(a=>a[0]===id||a[1]===id).map(a=>a[0]===id?a[1]:a[0])}
export function isSea(a,b){return ADJ.some(x=>((x[0]===a&&x[1]===b)||(x[0]===b&&x[1]===a))&&x[2])}

export function newGame(gameSeed){
 uid=1;
 const sd=(gameSeed??(Date.now()^Math.floor(Math.random()*1e9)))>>>0; seed(sd);
 G={seed:sd,turn:1,sel:null,pick:new Set(),log:[],
  fac:{rome:{gold:1200},carth:{gold:1000},gaul:{gold:900},greek:{gold:1000},rebel:{gold:0}},
  prov:PROV_DEF.map(d=>({id:d[0],n:d[1],x:d[2],y:d[3],owner:d[4],base:d[5],lvl:d[0]===FACT[d[4]]?.cap?2:1,gar:2,army:[],moved:false,rec:0}))};
 G.prov.forEach(p=>{if(FACT[p.owner].cap===p.id)p.lvl=2;p.gar=p.owner==='rebel'?3:FACT[p.owner].cap===p.id?4:2;(START_ARMY[p.id]||[]).forEach(t=>p.army.push(mk(t)))});
 $('title').style.display='none';
 addLog('Сенат вручил тебе легионы. Да начнётся завоевание!');
 render();
}
// ---------- saves: 3 manual slots + autosave, versioned ----------
export const SAVE_VER=1;
export const SLOTS=['auto','1','2','3'];
const key=slot=>'imperium_v'+SAVE_VER+'_'+slot;
export function saveSlot(slot='auto'){
 try{
  const owned=G.prov.filter(p=>p.owner==='rome').length;
  localStorage.setItem(key(slot),JSON.stringify({v:SAVE_VER,ts:Date.now(),turn:G.turn,owned,over:!!G.over,G:{...G,pick:[],busy:false},uid,rng:getState()}));
  return true;
 }catch(e){return false}
}
export function save(){return saveSlot('auto')}
export function readSlot(slot){
 try{
  let raw=localStorage.getItem(key(slot));
  if(!raw&&slot==='auto'){ // migrate the pre-slot save format (v0)
   const old=JSON.parse(localStorage.getItem('imperium_save')||'null');
   if(old&&old.G)return {v:0,ts:0,turn:old.G.turn,owned:old.G.prov.filter(p=>p.owner==='rome').length,over:!!old.G.over,G:old.G,uid:old.uid,rng:1};
   return null;
  }
  const d=JSON.parse(raw);
  return d&&d.v===SAVE_VER&&d.G?d:null;
 }catch(e){return null}
}
export function loadSlot(slot){
 const d=readSlot(slot);if(!d)return false;
 G=d.G;G.pick=new Set();G.busy=false;G.sel=null;uid=d.uid;setState(d.rng||1);
 $('title').style.display='none';render();return true;
}
export function loadGame(){if(!loadSlot('auto'))newGame()}

export function addLog(t){G.log.unshift(t);G.log=G.log.slice(0,4);}
export function income(f){
 let inc=0,up=0;
 G.prov.forEach(p=>{if(p.owner===f){inc+=Math.round(p.base*(1+0.5*(p.lvl-1)));up+=p.army.length*20}});
 return {inc,up,net:inc-up};
}
export function str(units,bonus=1){return units.reduce((s,u)=>{const d=UT[u.t];return s+(d.atk+d.def+(d.rng>1?2:0)+(d.mov>2?2:0))*u.hp/100},0)*bonus}
export function garUnits(p){const a=[];for(let i=0;i<p.gar;i++){const u=mk('mil');u.gar=true;a.push(u)}return a}

export function nextId(){return uid++}
