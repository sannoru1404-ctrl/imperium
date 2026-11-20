// Diplomacy: a ladder of relations (war < peace < non-aggression < trade < defensive alliance < military alliance),
// vassals and tribute, attitudes towards the player, AI decisions.
import { FACT, START_WARS, START_ALLIES, START_TRADE, DIPLO, PLAYER, FAITH, faithOf, MAJORS } from './data.js';
import { G, P, adj, str, addLog } from './state.js';
import { rand } from './rng.js';
import { provIncome } from './rules.js';

const key=(a,b)=>a<b?a+'|'+b:b+'|'+a;
export const REL_N={war:'Война',peace:'Мир',nap:'Ненападение',trade:'Торговля',def:'Оборонительный союз',ally:'Военный союз'};
export const REL_I={war:'⚔️',peace:'🕊',nap:'✋',trade:'⚖️',def:'🛡',ally:'🤝'};
export const RANK={war:0,peace:1,nap:2,trade:3,def:4,ally:5};

export function initDiplo(){
 G.rel={};G.relSince={};G.att={};G.vas={};G.trib=[];
 for(const [a,b] of START_WARS)G.rel[key(a,b)]='war';
 for(const [a,b] of START_TRADE)G.rel[key(a,b)]='trade';
 for(const [a,b] of START_ALLIES)G.rel[key(a,b)]='ally';
 for(const f in FACT)if(f!=='rebel')G.att[f]=0;
 for(const [a,b] of START_ALLIES){if(a===PLAYER)G.att[b]=40;if(b===PLAYER)G.att[a]=40}
 for(const [a,b] of START_WARS){if(a===PLAYER)G.att[b]=-40;if(b===PLAYER)G.att[a]=-40}
}
export function rel(a,b){if(a===b)return 'self';if(a==='rebel'||b==='rebel')return 'war';return (G.rel&&G.rel[key(a,b)])||'peace'}
export function atWar(a,b){return rel(a,b)==='war'}
export function atLeast(a,b,r){return RANK[rel(a,b)]>=RANK[r]}
export function since(a,b){return G.turn-((G.relSince&&G.relSince[key(a,b)])||0)}
function setRel(a,b,s){G.rel[key(a,b)]=s;G.relSince[key(a,b)]=G.turn}
export function alive(f){return G.prov.some(p=>p.owner===f)}
export function borders(a,b){return G.prov.some(p=>p.owner===a&&adj(p.id).some(x=>P(x).owner===b))}
export function power(f){let s=0;for(const p of G.prov)if(p.owner===f)s+=str(p.army)+8;return s}
export function sameFaith(a,b){return faithOf(a)===faithOf(b)}
const states=()=>Object.keys(FACT).filter(x=>x!=='rebel'&&alive(x));
export function warsOf(f){return states().filter(x=>x!==f&&atWar(f,x))}
export function alliesOf(f,r='def'){return states().filter(x=>x!==f&&atLeast(f,x,r))}
// vassals
export function overlord(f){return (G.vas&&G.vas[f])||null}
export function vassalsOf(f){return Object.keys(G.vas||{}).filter(v=>G.vas[v]===f&&alive(v))}
function landIncome(f){let s=0;for(const p of G.prov)if(p.owner===f)s+=provIncome(p);return s}

// ---------- war and peace ----------
// call: allies are called in (defensive allies of the victim, military allies of both sides)
export function declareWar(a,b,call=true){
 const was=rel(a,b);if(was==='war'||a===b)return;
 if(G.vas[b]===a||G.vas[a]===b){delete G.vas[a];delete G.vas[b]}   // a vassal rises up or is crushed
 setRel(a,b,'war');
 G.trib=(G.trib||[]).filter(t=>!((t.from===a&&t.to===b)||(t.from===b&&t.to===a)));
 if(a===PLAYER){
  G.att[b]=Math.min(G.att[b]||0,-50);
  // breaking a treaty makes everyone trust you less
  if(RANK[was]>=RANK.nap)for(const f in G.att)if(f!==b)G.att[f]-=10*(RANK[was]-1);
  addLog(`⚔ Ты объявил войну: ${FACT[b].n}.`);
 } else if(b===PLAYER){G.att[a]=Math.min(G.att[a]||0,-30);addLog(`⚔ ${FACT[a].n} объявляет тебе войну!`)}
 else if(borders(a,PLAYER)||borders(b,PLAYER))addLog(`${FACT[a].n} объявляет войну: ${FACT[b].n}.`);
 if(!call)return;
 // the victim's allies (defensive and military) and vassals stand by it
 for(const c of [...alliesOf(b,'def'),...vassalsOf(b)])if(c!==a&&!atLeast(c,a,'def'))joinWar(c,a,b);
 // the aggressor's military allies and vassals join the attack
 for(const c of [...alliesOf(a,'ally'),...vassalsOf(a)])if(c!==b&&!atLeast(c,b,'def'))joinWar(c,b,a);
}
function joinWar(c,enemy,friend){
 if(atWar(c,enemy))return;
 if(c===PLAYER)addLog(`🛡 Союзный долг: ты вступаешь в войну с ${FACT[enemy].n} на стороне ${FACT[friend].n}.`);
 else if(friend===PLAYER)addLog(`🛡 ${FACT[c].n} по договору вступают в войну с ${FACT[enemy].n}.`);
 declareWar(c,enemy,false);
 if(c===PLAYER)G.att[enemy]=Math.max(G.att[enemy],-30);   // no treachery: the player was called in
}
export function makePeace(a,b){if(!atWar(a,b)||a==='mong'||b==='mong')return false;  // the Horde knows no peace
 setRel(a,b,'peace');
 for(const [x,y] of [[a,b],[b,a]])for(const v of vassalsOf(x))if(atWar(v,y)&&y!=='mong')setRel(v,y,'peace');  // vassals follow
 if(a===PLAYER||b===PLAYER)addLog(`🕊 Мир с ${FACT[a===PLAYER?b:a].n}.`);
 return true;
}
function addTribute(from,to){
 const amt=Math.max(15,Math.round(DIPLO.tribShare*landIncome(from)));
 G.trib=(G.trib||[]).filter(t=>!(t.from===from&&t.to===to));
 G.trib.push({from,to,amt,until:G.turn+DIPLO.tribYears});
 return amt;
}
function makeVassal(v,o){
 G.vas[v]=o;setRel(v,o,'ally');
 G.trib=(G.trib||[]).filter(t=>!((t.from===v&&t.to===o)||(t.from===o&&t.to===v)));
 // the vassal leaves its other alliances and follows its lord's wars
 for(const x of states())if(x!==v&&x!==o){
  if(atLeast(v,x,'def'))setRel(v,x,'trade');
  if(atWar(o,x)&&!atWar(v,x))declareWar(v,x,false);
 }
 if(v===PLAYER||o===PLAYER)addLog(`👑 ${FACT[v].n} — вассал ${o===PLAYER?'твоей державы':FACT[o].n}.`);
}
export function releaseVassal(v){const o=G.vas[v];if(!o)return;delete G.vas[v];setRel(v,o,'def');if(o===PLAYER||v===PLAYER)addLog(`${FACT[v].n} больше не вассал.`)}

// ---------- money ----------
export function tradeIncome(f){
 let s=0;
 for(const x in FACT){if(x===f||x==='rebel')continue;
  if(atLeast(f,x,'trade'))s+=Math.min(DIPLO.tradeCap,G.prov.filter(p=>p.owner===x).length*DIPLO.tradePerRegion)}
 return s;
}
// tribute and vassal tax: positive = received
export function tributeIncome(f){
 let s=0;
 for(const t of G.trib||[]){if(t.until<G.turn)continue;if(t.to===f)s+=t.amt;if(t.from===f)s-=t.amt}
 const o=overlord(f);if(o)s-=Math.round(DIPLO.vassalTax*landIncome(f));
 for(const v of vassalsOf(f))s+=Math.round(DIPLO.vassalTax*landIncome(v));
 return s;
}
export function tributesOf(f){return (G.trib||[]).filter(t=>t.until>=G.turn&&(t.from===f||t.to===f))}

// ---------- player proposals: returns [accepted, reason] ----------
const faithBonus=f=>sameFaith(PLAYER,f)?FAITH.allySame:FAITH.allyOther;
function peaceScore(f){const a=G.att[f]||0,me=power(PLAYER),them=power(f),yrs=since(PLAYER,f);return a+40*(me/Math.max(1,them)-1)+6*yrs-10}
export function proposal(f,kind){
 const a=G.att[f]||0,me=power(PLAYER),them=power(f),r=rel(PLAYER,f),ratio=me/Math.max(1,them);
 const vas=overlord(f);
 if(vas&&vas!==PLAYER&&kind!=='peace'&&kind!=='war')return [false,`Они вассалы ${FACT[vas].n} и не решают сами.`];
 if(kind==='peace'){
  if(r!=='war')return [false,'Вы не воюете.'];
  if(f==='mong')return [false,'Орда не знает мира.'];
  return peaceScore(f)>0?[true,'']:[false,since(PLAYER,f)<2?'Слишком рано: война только началась.':'Они надеются победить.'];
 }
 if(kind==='payPeace'){
  if(r!=='war')return [false,'Вы не воюете.'];
  if(f==='mong')return [false,'Орда не знает мира.'];
  return peaceScore(f)+30>0?[true,'']:[false,'Даже за дань они не хотят мира.'];
 }
 if(kind==='tribute'){
  if(r==='war'&&since(PLAYER,f)<2)return [false,'Слишком рано: война только началась.'];
  if(RANK[r]>=RANK.trade)return [false,'С друзьями дань не берут.'];
  if(tributesOf(f).some(t=>t.to===PLAYER))return [false,'Они уже платят тебе дань.'];
  return ratio>(r==='war'?2:3)?[true,'']:[false,'Они не боятся тебя настолько, чтобы платить.'];
 }
 if(kind==='vassal'){
  if(MAJORS.includes(f))return [false,'Великая держава не станет вассалом.'];
  if(vas===PLAYER)return [false,'Они уже твои вассалы.'];
  const lands=G.prov.filter(p=>p.owner===f).length;
  if(r==='war')return ratio>3&&lands<=3&&since(PLAYER,f)>=2?[true,'']:[false,'Нужно разбить их сильнее: ты должен быть втрое сильнее, а у них — не больше 3 земель.'];
  return ratio>5&&a>=20?[true,'']:[false,'Без войны вассалом станут лишь очень слабые и дружные с тобой.'];
 }
 if(kind==='nap'){
  if(r!=='peace')return [false,r==='war'?'Сначала нужен мир.':'Договор уже есть.'];
  return a+10+(sameFaith(PLAYER,f)?5:0)>0?[true,'']:[false,'Они тебе не доверяют.'];
 }
 if(kind==='trade'){
  if(RANK[r]>=RANK.trade)return [false,'Торговля уже идёт.'];
  if(r==='war')return [false,'Сначала нужен мир.'];
  return a>=-10?[true,'']:[false,'Они тебе не доверяют.'];
 }
 const common=warsOf(PLAYER).some(x=>atWar(f,x));
 if(kind==='def'){
  if(RANK[r]>=RANK.def)return [false,'Союз уже есть.'];
  if(RANK[r]<RANK.nap)return [false,r==='war'?'Сначала нужен мир.':'Сначала — договор о ненападении.'];
  const score=a+(common?20:0)+1.5*since(PLAYER,f)-25+faithBonus(f);
  return score>0?[true,'']:[false,'Мало доверия. Нужны торговля, годы мира или общий враг'+(sameFaith(PLAYER,f)?'.':' — а ещё вы разной веры.')];
 }
 if(kind==='ally'){
  if(r==='war')return [false,'Сначала нужен мир.'];
  if(r==='ally')return [false,'Вы уже союзники.'];
  const score=a+(common?30:0)+2*since(PLAYER,f)-35+(r==='def'?10:0)+faithBonus(f);
  return score>0?[true,'']:[false,'Мало доверия. Нужны торговля, годы мира или общий враг'+(sameFaith(PLAYER,f)?'.':' — а ещё вы разной веры.')];
 }
 return [false,''];
}
export function propose(f,kind){
 const [ok,why]=proposal(f,kind);
 if(!ok)return [false,why];
 if(kind==='peace')makePeace(PLAYER,f);
 if(kind==='payPeace'){makePeace(PLAYER,f);const amt=addTribute(PLAYER,f);addLog(`💰 Мир куплен: ты платишь ${FACT[f].n} ${amt} золота в год ${DIPLO.tribYears} лет.`)}
 if(kind==='tribute'){if(atWar(PLAYER,f))makePeace(PLAYER,f);const amt=addTribute(f,PLAYER);G.att[f]-=15;addLog(`💰 ${FACT[f].n} платят тебе дань: ${amt} в год, ${DIPLO.tribYears} лет.`)}
 if(kind==='vassal'){if(atWar(PLAYER,f))setRel(PLAYER,f,'peace');makeVassal(f,PLAYER)}
 if(kind==='nap'){setRel(PLAYER,f,'nap');G.att[f]+=3;addLog(`✋ Договор о ненападении: ${FACT[f].n}.`)}
 if(kind==='trade'){setRel(PLAYER,f,'trade');G.att[f]+=5;addLog(`⚖️ Торговый договор: ${FACT[f].n}.`)}
 if(kind==='def'){setRel(PLAYER,f,'def');G.att[f]+=8;addLog(`🛡 Оборонительный союз: ${FACT[f].n}.`)}
 if(kind==='ally'){setRel(PLAYER,f,'ally');G.att[f]+=10;addLog(`🤝 Военный союз: ${FACT[f].n}.`)}
 return [true,''];
}

// ---------- yearly AI diplomacy ----------
export function aiDiplomacy(){
 const fs=states();
 G.vas=G.vas||{};G.trib=(G.trib||[]).filter(t=>t.until>=G.turn&&alive(t.from)&&alive(t.to));
 for(const v in G.vas)if(!alive(v)||!alive(G.vas[v]))delete G.vas[v];
 // attitudes towards the player drift
 for(const f of fs){if(f===PLAYER)continue;const r=rel(PLAYER,f);
  let a=G.att[f]||0;
  a+=r==='ally'?4:r==='def'?3:r==='trade'?2:r==='nap'?1:r==='war'?-1:0;
  a+=sameFaith(PLAYER,f)?FAITH.attSame:FAITH.attOther;
  if(tributesOf(f).some(t=>t.from===f&&t.to===PLAYER))a-=1;      // paying tribute breeds resentment
  if(borders(f,PLAYER)&&power(PLAYER)>2*power(f))a-=2;   // fear of a mighty neighbour
  a+=a>0?-0.5:a<0?0.5:0;
  G.att[f]=Math.max(-100,Math.min(100,a));
 }
 // vassals break free when their lord grows weak
 for(const v of Object.keys(G.vas)){const o=G.vas[v];
  if(v!==PLAYER&&power(o)<power(v)*1.5&&rand()<0.2){
   if(o===PLAYER)addLog(`👑 ${FACT[v].n} сбрасывают твою власть!`);releaseVassal(v);setRel(v,o,'peace')}}
 for(const a of fs){
  if(a===PLAYER)continue;
  for(const b of fs){
   if(b===a||(b!==PLAYER&&b<a))continue;            // each AI pair once
   if(G.vas[a]||(G.vas[b]&&b!==PLAYER&&G.vas[b]!==a)){   // vassals only make peace on their own
    if(atWar(a,b)&&G.vas[a]!==b&&G.vas[b]!==a&&since(a,b)>=DIPLO.minWarYears&&b!==PLAYER&&rand()<DIPLO.peaceChance&&!atWar(G.vas[a]||a,G.vas[b]||b))makePeace(a,b);
    continue;
   }
   const r=rel(a,b);if(r==='ally')continue;
   if(!borders(a,b)&&r!=='war')continue;
   const pa=power(a),pb=power(b);
   if(r==='war'){
    if(!borders(a,b))continue;
    // a crushed small state becomes a vassal or pays tribute
    if(b!==PLAYER&&since(a,b)>=3){
     const [big,small]=pa>pb?[a,b]:[b,a],k=Math.max(pa,pb)/Math.max(1,Math.min(pa,pb));
     const lands=G.prov.filter(p=>p.owner===small).length;
     if(k>3&&lands<=2&&!MAJORS.includes(small)&&small!=='mong'&&big!=='mong'&&rand()<0.15){setRel(a,b,'peace');makeVassal(small,big);continue}
     if(k>2&&small!=='mong'&&big!=='mong'&&rand()<DIPLO.peaceChance){makePeace(a,b);addTribute(small,big);continue}
    }
    // tired or losing wars end in peace
    if(since(a,b)>=DIPLO.minWarYears&&b!==PLAYER&&rand()<DIPLO.peaceChance)makePeace(a,b);
    if(b===PLAYER&&a!=='mong'&&since(a,b)>=DIPLO.minWarYears+2&&pa<pb*0.7&&rand()<DIPLO.peaceChance){
     addLog(`🕊 ${FACT[a].n} предлагают мир — открой «Дипломатию».`);G.att[a]+=15}
   } else {
    // a much stronger neighbour may start a war; the player is attacked only if they are disliked
    if(r==='def')continue;
    const ratio=pa/Math.max(1,pb);
    const mood=b===PLAYER?(G.att[a]||0)<-10:true;
    const fm=sameFaith(a,b)?FAITH.warSame:FAITH.warOther;
    const tm=r==='nap'?0.3:r==='trade'?0.4:1;
    const helpers=alliesOf(b,'def').reduce((s,c)=>s+power(c),0)*0.5;   // the victim's allies deter
    if(pa/Math.max(1,pb+helpers)>DIPLO.warRatio&&mood&&warsOf(a).length<2&&rand()<DIPLO.warChance*fm*tm)declareWar(a,b);
    else if(b!==PLAYER){
     const same=sameFaith(a,b),allies=x=>alliesOf(x,'def').length;
     const foe=warsOf(a).some(x=>atWar(b,x));
     if(r==='peace'&&rand()<DIPLO.napChance*(same?1.5:0.7))setRel(a,b,'nap');
     else if(r==='nap'&&rand()<DIPLO.tradeChance*(same?1.2:0.6))setRel(a,b,'trade');
     else if(r==='trade'&&(same||foe)&&allies(a)<DIPLO.maxAllies&&allies(b)<DIPLO.maxAllies&&rand()<DIPLO.defChance*(foe?3:1))setRel(a,b,'def');
    }
   }
  }
 }
}
