import { seed, getState, setState } from './rng.js';
import { FACT, UT, PROV_DEF, ADJ, START_ARMY, START_ARMY_CULT, START_GOLD, PLAYER, setPlayer, START_YEAR } from './data.js';
import { $ } from './util.js';
import { render } from './map.js';

export let G=null; // game state
export let uid=1;
export function mk(t,hp=100){return {id:uid++,t,hp}}
export function P(id){return G.prov.find(p=>p.id===id)}
export function adj(id){return ADJ.filter(a=>a[0]===id||a[1]===id).map(a=>a[0]===id?a[1]:a[0])}
export function isSea(a,b){return ADJ.some(x=>((x[0]===a&&x[1]===b)||(x[0]===b&&x[1]===a))&&x[2])}

export function capOf(f){return G.fac[f]&&G.fac[f].cap}
export function newGame(gameSeed,faction){
 uid=1;
 if(faction)setPlayer(faction);
 const sd=(gameSeed??(Date.now()^Math.floor(Math.random()*1e9)))>>>0; seed(sd);
 G={seed:sd,player:PLAYER,turn:1,sel:null,pick:new Set(),log:[],fac:{},
  prov:PROV_DEF.map(d=>({id:d[0],n:d[1],x:d[2],y:d[3],owner:d[4],base:d[5],tier:d[6],lvl:d[6]>=3?2:1,gar:2,army:[],moved:false,rec:0}))};
 for(const f in FACT)G.fac[f]={gold:f==='rebel'?0:FACT[f].major?START_GOLD.major:START_GOLD.minor,cap:FACT[f].cap};
 const conv=f=>{const c=START_ARMY_CULT[FACT[f].cult];return t=>c?c(t):t};
 for(const f in FACT){
  if(f==='rebel')continue;
  const own=G.prov.filter(p=>p.owner===f);if(!own.length)continue;
  const cap=G.prov.find(p=>p.id===FACT[f].cap)||own[0];
  (FACT[f].major?START_ARMY.major:START_ARMY.minor).map(conv(f)).forEach(t=>cap.army.push(mk(t)));
  if(FACT[f].major){const second=own.filter(p=>p!==cap).sort((a,b)=>b.tier-a.tier)[0];if(second)START_ARMY.major2.map(conv(f)).forEach(t=>second.army.push(mk(t)))}
 }
 G.prov.forEach(p=>{
  const cap=capOf(p.owner)===p.id;
  p.gar=p.owner==='rebel'?3+p.tier:cap?4:2;
  if(p.owner==='rebel'&&p.tier>=2)START_ARMY.rebelBig.forEach(t=>p.army.push(mk(t)));
 });
 $('title').style.display='none';
 addLog(`Лето ${START_YEAR}-е. ${FACT[PLAYER].n}: ${FACT[PLAYER].d||'собирай земли'}`);
 render(true);
}
// ---------- saves: 3 manual slots + autosave, versioned ----------
export const SAVE_VER=3; // v3: grand campaign map of Europe (older saves are not compatible)
export const SLOTS=['auto','1','2','3'];
const key=slot=>'imperium_v'+SAVE_VER+'_'+slot;
export function saveSlot(slot='auto'){
 try{
  const owned=G.prov.filter(p=>p.owner===PLAYER).length;
  localStorage.setItem(key(slot),JSON.stringify({v:SAVE_VER,ts:Date.now(),turn:G.turn,owned,over:!!G.over,G:{...G,pick:[],busy:false},uid,rng:getState()}));
  return true;
 }catch(e){return false}
}
export function save(){return saveSlot('auto')}
export function readSlot(slot){
 try{
  const d=JSON.parse(localStorage.getItem(key(slot))||'null');
  return d&&d.v===SAVE_VER&&d.G?d:null;
 }catch(e){return null}
}
export function loadSlot(slot){
 const d=readSlot(slot);if(!d)return false;
 G=d.G;G.pick=new Set();G.busy=false;G.sel=null;uid=d.uid;setState(d.rng||1);setPlayer(G.player);
 $('title').style.display='none';render(true);return true;
}
export function loadGame(){if(!loadSlot('auto'))newGame()}

export function addLog(t){G.log.unshift(t);G.log=G.log.slice(0,4);}
export function provIncome(p){return p.occ>0?0:Math.round(p.base*(1+0.5*(p.lvl-1)))}
export function income(f){
 let inc=0,up=0;
 G.prov.forEach(p=>{if(p.owner===f){inc+=provIncome(p);up+=p.army.length*20}});
 return {inc,up,net:inc-up};
}
export function str(units,bonus=1){return units.reduce((s,u)=>{const d=UT[u.t];return s+(d.atk+d.def+(d.range?2:0)+(d.mov>2?2:0)+(d.general?3:0))*u.hp/100},0)*bonus}
export function garUnits(p){const a=[];for(let i=0;i<p.gar;i++){const u=mk('mil');u.gar=true;a.push(u)}return a}

export function nextId(){return uid++}
