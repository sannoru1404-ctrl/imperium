// Diplomacy: war / peace / trade / alliance between states, attitudes towards the player, AI decisions.
import { FACT, START_WARS, START_ALLIES, START_TRADE, DIPLO, PLAYER } from './data.js';
import { G, P, adj, str, addLog } from './state.js';
import { rand } from './rng.js';

const key=(a,b)=>a<b?a+'|'+b:b+'|'+a;
export const REL_N={war:'Война',peace:'Мир',trade:'Торговля',ally:'Союз'};
export const REL_I={war:'⚔️',peace:'🕊',trade:'⚖️',ally:'🤝'};

export function initDiplo(){
 G.rel={};G.relSince={};G.att={};
 for(const [a,b] of START_WARS)G.rel[key(a,b)]='war';
 for(const [a,b] of START_TRADE)G.rel[key(a,b)]='trade';
 for(const [a,b] of START_ALLIES)G.rel[key(a,b)]='ally';
 for(const f in FACT)if(f!=='rebel')G.att[f]=0;
 for(const [a,b] of START_ALLIES){if(a===PLAYER)G.att[b]=40;if(b===PLAYER)G.att[a]=40}
 for(const [a,b] of START_WARS){if(a===PLAYER)G.att[b]=-40;if(b===PLAYER)G.att[a]=-40}
}
export function rel(a,b){if(a===b)return 'self';if(a==='rebel'||b==='rebel')return 'war';return (G.rel&&G.rel[key(a,b)])||'peace'}
export function atWar(a,b){return rel(a,b)==='war'}
export function since(a,b){return G.turn-((G.relSince&&G.relSince[key(a,b)])||0)}
function setRel(a,b,s){G.rel[key(a,b)]=s;G.relSince[key(a,b)]=G.turn}
export function alive(f){return G.prov.some(p=>p.owner===f)}
export function borders(a,b){return G.prov.some(p=>p.owner===a&&adj(p.id).some(x=>P(x).owner===b))}
export function power(f){let s=0;for(const p of G.prov)if(p.owner===f)s+=str(p.army)+8;return s}
export function warsOf(f){return Object.keys(FACT).filter(x=>x!==f&&x!=='rebel'&&alive(x)&&atWar(f,x))}

export function declareWar(a,b){
 const was=rel(a,b);if(was==='war')return;
 setRel(a,b,'war');
 if(a===PLAYER){
  G.att[b]=Math.min(G.att[b]||0,-50);
  // breaking a treaty makes everyone trust you less
  if(was!=='peace')for(const f in G.att)if(f!==b)G.att[f]-=10;
  addLog(`⚔ Ты объявил войну: ${FACT[b].n}.`);
 } else if(b===PLAYER){G.att[a]=Math.min(G.att[a]||0,-30);addLog(`⚔ ${FACT[a].n} объявляет тебе войну!`)}
 else if(borders(a,PLAYER)||borders(b,PLAYER))addLog(`${FACT[a].n} объявляет войну: ${FACT[b].n}.`);
}
export function makePeace(a,b){if(!atWar(a,b)||a==='mong'||b==='mong')return;  // the Horde knows no peace
setRel(a,b,'peace');
 if(a===PLAYER||b===PLAYER)addLog(`🕊 Мир с ${FACT[a===PLAYER?b:a].n}.`)}

export function tradeIncome(f){
 let s=0;
 for(const x in FACT){if(x===f||x==='rebel')continue;const r=rel(f,x);
  if(r==='trade'||r==='ally')s+=Math.min(DIPLO.tradeCap,G.prov.filter(p=>p.owner===x).length*DIPLO.tradePerRegion)}
 return s;
}

// ---------- player proposals: returns [accepted, reason] ----------
export function proposal(f,kind){
 const a=G.att[f]||0,me=power(PLAYER),them=power(f),r=rel(PLAYER,f);
 if(kind==='peace'){
  if(r!=='war')return [false,'Вы не воюете.'];
  if(f==='mong')return [false,'Орда не знает мира.'];
  const yrs=since(PLAYER,f);
  const score=a+40*(me/Math.max(1,them)-1)+6*yrs-10;
  return score>0?[true,'']:[false,yrs<2?'Слишком рано: война только началась.':'Они надеются победить.'];
 }
 if(kind==='trade'){
  if(r!=='peace')return [false,r==='war'?'Сначала нужен мир.':'Торговля уже идёт.'];
  return a>=-10?[true,'']:[false,'Они тебе не доверяют.'];
 }
 if(kind==='ally'){
  if(r==='war')return [false,'Сначала нужен мир.'];
  if(r==='ally')return [false,'Вы уже союзники.'];
  const common=warsOf(PLAYER).some(x=>atWar(f,x));
  const score=a+(common?30:0)+2*since(PLAYER,f)-35;
  return score>0?[true,'']:[false,'Мало доверия. Нужны торговля, годы мира или общий враг.'];
 }
 return [false,''];
}
export function propose(f,kind){
 const [ok,why]=proposal(f,kind);
 if(!ok)return [false,why];
 if(kind==='peace')makePeace(PLAYER,f);
 if(kind==='trade'){setRel(PLAYER,f,'trade');G.att[f]+=5;addLog(`⚖️ Торговый договор: ${FACT[f].n}.`)}
 if(kind==='ally'){setRel(PLAYER,f,'ally');G.att[f]+=10;addLog(`🤝 Союз: ${FACT[f].n}.`)}
 return [true,''];
}

// ---------- yearly AI diplomacy ----------
export function aiDiplomacy(){
 const fs=Object.keys(FACT).filter(f=>f!=='rebel'&&alive(f));
 // attitudes towards the player drift
 for(const f of fs){if(f===PLAYER)continue;const r=rel(PLAYER,f);
  let a=G.att[f]||0;
  a+=r==='ally'?4:r==='trade'?2:r==='war'?-1:0;
  if(borders(f,PLAYER)&&power(PLAYER)>2*power(f))a-=2;   // fear of a mighty neighbour
  a+=a>0?-0.5:a<0?0.5:0;
  G.att[f]=Math.max(-100,Math.min(100,a));
 }
 for(const a of fs){
  if(a===PLAYER)continue;
  for(const b of fs){
   if(b===a||(b!==PLAYER&&b<a))continue;            // each AI pair once
   const r=rel(a,b);if(r==='ally')continue;
   if(!borders(a,b))continue;
   const pa=power(a),pb=power(b);
   if(r==='war'){
    // tired or losing wars end in peace
    if(since(a,b)>=DIPLO.minWarYears&&b!==PLAYER&&rand()<DIPLO.peaceChance)makePeace(a,b);
    if(b===PLAYER&&a!=='mong'&&since(a,b)>=DIPLO.minWarYears+2&&pa<pb*0.7&&rand()<DIPLO.peaceChance){
     addLog(`🕊 ${FACT[a].n} предлагают мир — открой «Дипломатию».`);G.att[a]+=15}
   } else {
    // a much stronger neighbour may start a war; the player is attacked only if they are disliked
    const ratio=pa/Math.max(1,pb);
    const mood=b===PLAYER?(G.att[a]||0)<-10:true;
    if(ratio>1.6&&mood&&warsOf(a).length<2&&rand()<DIPLO.warChance*(r==='trade'?0.4:1))declareWar(a,b);
    else if(r==='peace'&&b!==PLAYER&&rand()<0.04)setRel(a,b,'trade');
   }
  }
 }
}
