import { UT, uname } from './data.js';
import { $, rnd } from './util.js';
import { nextId } from './state.js';
import { autoResolve } from './turn.js';
import { initScene, cleanupScene, onResize, fx3d, loop } from './battle-3d.js';
import { buildCards, updateHud } from './battle-hud.js';
import { modal, closeModal, ask } from './ui.js';
import { rand, seed, getState, setState } from './rng.js';

// ===================== TACTICAL BATTLE 3D =====================
export let B=null;
export const SPD={2:5,3:6.5,4:10};
export const CONTACT=6.5, RANGE=48, FIELD=80;
export const FIGMAX={inf:25,cav:12,eleph:4};
export function bodyOf(t){return t==='cav'?'cav':t==='eleph'?'eleph':'inf'}
export function alive(r){return !r.fled&&!r.dead}
export function rdist(a,b){return Math.hypot(a.x-b.x,a.z-b.z)}
export function fwd(r){return [Math.sin(r.face),Math.cos(r.face)]}
export function angWrap(d){while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d}
export function Hgt(x,z){
 const s=B?B.seed:0;
 let h=1.1*Math.sin(x*0.045+s)+0.9*Math.cos(z*0.05+s*2)+0.5*Math.sin((x+z)*0.08+s*3);
 const ox=Math.max(0,Math.abs(x)-105),oz=Math.max(0,Math.abs(z)-125);
 return h+ox*0.35+oz*0.35;
}

export function makeReg(o,side,x,z){
 const d=UT[o.t];const body=bodyOf(o.t);
 const r={id:nextId(),o,t:o.t,side,men:o.hp,start:Math.max(o.hp,1),morale:100,x,z,face:side==='p'?Math.PI:0,
  order:null,state:'idle',chargeT:0,cool:rand()*2,fled:false,dead:false,routing:false,inForest:false,
  spd:SPD[d.mov]||5,ranged:d.rng>1,cav:o.t==='cav'||o.t==='eleph',body,figs:[],bannerKey:''};
 const n=Math.max(1,Math.ceil(r.men/100*FIGMAX[body]));
 for(let i=0;i<n;i++)r.figs.push({x,z,ph:rand()*6.28,j:(rand()-.5)*0.3});
 return r;
}
export function formation(r){
 const b=r.body;
 return b==='inf'?{cols:8,sx:1.3,sz:1.6}:b==='cav'?{cols:6,sx:2.1,sz:3.0}:{cols:4,sx:4.2,sz:5.5};
}
export function setupBattle(att,def,af,df,playerSide,place,battleSeed){
 const pu=playerSide==='att'?att:def, eu=playerSide==='att'?def:att;
 // the battle runs on its own seed, so it can be replayed; the campaign stream is restored afterwards
 const rngSeed=(battleSeed??Math.floor(rand()*4294967296))>>>0, campRng=getState();seed(rngSeed);
 B={rngSeed,campRng,regs:[],att,def,playerSide,af,df,ef:playerSide==='att'?df:af,place,time:0,pending:[],seed:rand()*10,
  paused:true,speed:1,sel:new Set(),over:false,aiT:0,msgs:[],forests:[]};
 for(let i=0;i<3;i++)B.forests.push({x:(rand()-.5)*130,z:(rand()-.5)*40,r:9+rand()*7});
 const deploy=(units,side)=>{
  const zs=side==='p'?1:-1;
  const mel=units.filter(u=>UT[u.t].rng===1&&u.t!=='cav'),cav=units.filter(u=>u.t==='cav'),rng=units.filter(u=>UT[u.t].rng>1);
  const line=(arr,z)=>arr.forEach((u,i)=>B.regs.push(makeReg(u,side,(i-(arr.length-1)/2)*15,z*zs)));
  line(mel,38);line(rng,mel.length?54:40);
  const half=Math.max(mel.length,rng.length,1)*15/2;
  cav.forEach((u,i)=>B.regs.push(makeReg(u,side,(i%2?1:-1)*(half+12+Math.floor(i/2)*14),44*zs)));
 };
 deploy(pu,'p');deploy(eu,'e');
 B.init={p:0,e:0};B.cur={p:0,e:0};
 B.regs.forEach(r=>{B.init[r.side]+=r.men});
}

// ---------- simulation ----------
export function turnTo(r,tx,tz,dt,rate=3){const d=angWrap(Math.atan2(tx-r.x,tz-r.z)-r.face);const m=rate*dt;r.face+=Math.max(-m,Math.min(m,d))}
export function moveTo(r,tx,tz,dt,mult=1){
 const dx=tx-r.x,dz=tz-r.z,d=Math.hypot(dx,dz);if(d<0.4)return true;
 const sp=r.spd*mult*(r.inForest?(r.cav?0.6:0.85):1);const s=Math.min(d,sp*dt);
 r.x+=dx/d*s;r.z+=dz/d*s;turnTo(r,tx,tz,dt,6);return d<=s+0.4;
}
export function meleeHit(a,b,dt,burst){
 const da=UT[a.t],db=UT[b.t];
 const atk=a.ranged?da.atk*0.5:da.atk;let mult=1;
 if(a.t==='spear'&&b.cav)mult*=2;
 if(a.t==='cav'&&b.t==='arch')mult*=1.5;
 if(a.t==='eleph'&&b.t!=='spear')mult*=1.3;
 if(b.routing)mult*=2;
 const [fx,fz]=fwd(b);const vx=a.x-b.x,vz=a.z-b.z,vl=Math.hypot(vx,vz)||1;const dot=(fx*vx+fz*vz)/vl;
 let fl=1;if(!b.routing){if(dot<-0.35)fl=1.8;else if(dot<0.35)fl=1.35}
 const def=db.def*(b.inForest?1.25:1);
 const eff=atk*mult*fl/def*(0.35+0.65*a.men/a.start);
 let dmg;
 if(burst){dmg=9*eff;if(b.t==='spear'&&dot>0.35){dmg*=0.3;a.men-=6;a.morale-=10}b.morale-=15;fx3d('charge',a,b);msg((a.side==='p'?'Твоя ':'Вражеская ')+uname(a.t,a.side==='p'?'rome':B.ef).toLowerCase()+' врезается в строй!')}
 else dmg=1.0*dt*eff;
 b.men-=dmg;b.morale-=dmg*1.1+(fl>1&&!burst?(fl>1.5?5:2.5)*dt:0);
 if(fl>1.5&&!b.flankMsg&&b.side==='p'){b.flankMsg=true;msg('⚠ Удар в тыл: '+uname(b.t,'rome'))}
}
export function fire(a,b){
 a.cool=3.2+rand()*0.6;
 let dmg=5.5*UT[a.t].atk/UT[b.t].def*(0.35+0.65*a.men/a.start);
 if(b.inForest)dmg*=0.5;
 const [fx,fz]=fwd(b);const vx=a.x-b.x,vz=a.z-b.z,vl=Math.hypot(vx,vz)||1;
 if((fx*vx+fz*vz)/vl>0.35&&b.body==='inf'&&b.t!=='arch')dmg*=0.7; // shields
 const dur=0.9+rdist(a,b)/60;
 B.pending.push({t:dur,b,dmg});
 fx3d('volley',a,b,dur);
}
export function simStep(dt){
 B.time+=dt;
 B.pending=B.pending.filter(p=>{p.t-=dt;if(p.t<=0){if(alive(p.b)){p.b.men-=p.dmg;p.b.morale-=p.dmg*0.8}return false}return true});
 for(const s of ['p','e'])B.cur[s]=B.regs.filter(r=>r.side===s&&alive(r)&&!r.routing).reduce((a,r)=>a+r.men,0);
 for(const r of B.regs)if(alive(r))r.inForest=B.forests.some(f=>Math.hypot(r.x-f.x,r.z-f.z)<f.r);
 for(const r of B.regs){
  if(!alive(r))continue;
  const prevFight=r.state==='fight';
  if(r.routing){
   const ez=r.side==='p'?FIELD+40:-FIELD-40;moveTo(r,r.x*1.02,ez,dt,1.1);r.state='rout';
   if(Math.abs(r.z)>FIELD+30)r.fled=true;continue;
  }
  if(r.order&&r.order.type==='attack'){const tg=r.order.tg;if(!alive(tg)||(tg.routing&&!r.cav&&rdist(r,tg)>20))r.order=null}
  const foes=B.regs.filter(e=>e.side!==r.side&&alive(e));
  let contact=null,cd=1e9;
  for(const e of foes){const d=rdist(r,e);if(d<CONTACT&&d<cd){cd=d;contact=e}}
  let tg=r.order&&r.order.type==='attack'?r.order.tg:null;
  if(r.ranged){
   if(r.order&&r.order.type==='move'){if(moveTo(r,r.order.x,r.order.z,dt)){r.order=null;r.state='idle'}else r.state='move'}
   else if(contact){r.state='fight';turnTo(r,contact.x,contact.z,dt);meleeHit(r,contact,dt)}
   else{
    if(!tg){let n=null,nd=1e9;for(const e of foes){if(e.routing)continue;const d=rdist(r,e);if(d<nd){nd=d;n=e}}if(n&&nd<=RANGE)tg=n}
    if(tg){const d=rdist(r,tg);if(d>RANGE){moveTo(r,tg.x,tg.z,dt);r.state='move'}else{r.state='aim';turnTo(r,tg.x,tg.z,dt);r.cool-=dt;if(r.cool<=0)fire(r,tg)}}
    else r.state='idle';
   }
  } else {
   if(r.order&&r.order.type==='move'){
    if(contact&&cd<CONTACT*0.85){tg=contact;r.order=null}
    else if(moveTo(r,r.order.x,r.order.z,dt)){r.order=null;r.state='idle';r.chargeT=0}
    else{r.state='move';r.chargeT+=dt}
   }
   if(!(r.order&&r.order.type==='move')){
    if(!tg)tg=contact;
    if(tg){
     const d=rdist(r,tg);
     if(d>CONTACT){moveTo(r,tg.x,tg.z,dt,tg.routing&&r.cav?1.15:1);r.state='move';r.chargeT+=dt}
     else{
      if(!prevFight&&r.cav&&r.chargeT>1.2)meleeHit(r,tg,0,true);
      r.state='fight';r.chargeT=0;turnTo(r,tg.x,tg.z,dt);meleeHit(r,tg,dt);
     }
    } else {r.state='idle';r.chargeT=0}
   }
  }
  if(r.state!=='fight')r.morale=Math.min(100,r.morale+3*dt);
  if(B.cur[r.side]<B.init[r.side]*0.4)r.morale-=2*dt;
 }
 for(const r of B.regs){
  if(!alive(r))continue;
  if(r.men<=0.5){r.dead=true;r.men=0;continue}
  if(!r.routing&&(r.morale<=0||r.men<r.start*0.12)){r.routing=true;r.order=null;B.sel.delete(r);
   msg((r.side==='p'?'💀 Бегут твои ':'🏳 Бегут враги: ')+uname(r.t,r.side==='p'?'rome':B.ef).toLowerCase())}
 }
 // separation
 const al=B.regs.filter(r=>alive(r));
 for(let i=0;i<al.length;i++)for(let j=i+1;j<al.length;j++){
  const a=al[i],b=al[j];const same=a.side===b.side;const minD=same?(a.body==='inf'&&b.body==='inf'?10:12):4.5;
  const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);
  if(d<minD&&d>0.01){const p=(minD-d)*Math.min(1,dt*4)*0.5;const ux=dx/d,uz=dz/d;
   const wa=a.state==='fight'&&same?0.3:1,wb=b.state==='fight'&&same?0.3:1;
   a.x-=ux*p*wa;a.z-=uz*p*wa;b.x+=ux*p*wb;b.z+=uz*p*wb}
 }
 for(const r of al){r.x=Math.max(-100,Math.min(100,r.x));if(!r.routing)r.z=Math.max(-FIELD-25,Math.min(FIELD+25,r.z))}
 B.aiT-=dt;if(B.aiT<=0){B.aiT=0.6;aiThink()}
 const act=s=>B.regs.some(r=>r.side===s&&alive(r)&&!r.routing);
 if(!act('e'))finishBattle('p');else if(!act('p'))finishBattle('e');
 else if(B.time>480)finishBattle(B.playerSide==='def'?'p':'e');
}
export function aiThink(){
 const mine=B.regs.filter(r=>r.side==='e'&&alive(r)&&!r.routing),foes=B.regs.filter(r=>r.side==='p'&&alive(r)&&!r.routing);
 if(!foes.length)return;
 const near=foes.some(f=>mine.some(m=>rdist(f,m)<60));
 const hold=B.playerSide==='att'&&B.time<30&&!near;
 for(const r of mine){
  if(r.state==='fight'&&!r.ranged)continue;
  if(r.ranged){
   const thr=foes.find(f=>!f.ranged&&rdist(f,r)<16&&f.state!=='fight');
   if(thr&&r.state!=='fight'){const dx=r.x-thr.x,dz=r.z-thr.z,l=Math.hypot(dx,dz)||1;r.order={type:'move',x:Math.max(-95,Math.min(95,r.x+dx/l*14)),z:Math.max(-FIELD-20,Math.min(FIELD+20,r.z+dz/l*14))};continue}
   if(r.order&&r.order.type==='move'&&!(Math.hypot(r.order.x-r.x,r.order.z-r.z)<1))continue;
   if(hold){r.order=null;continue}
   let n=null,nd=1e9;for(const f of foes){const d=rdist(r,f);if(d<nd){nd=d;n=f}}
   r.order=n?{type:'attack',tg:n}:null;continue;
  }
  if(hold)continue;
  const cur=r.order&&r.order.type==='attack'&&alive(r.order.tg)&&!r.order.tg.routing?r.order.tg:null;
  let best=null,bs=-1e9;
  for(const f of foes){let s=-rdist(r,f);
   if(r.t==='spear'&&f.cav)s+=30;if(r.cav&&f.t==='arch')s+=40;if(r.cav&&f.t==='spear')s-=40;
   if(f.state==='fight')s+=15;s+=(1-f.morale/100)*20;if(f===cur)s+=12;
   if(s>bs){bs=s;best=f}}
  if(best)r.order={type:'attack',tg:best};
 }
}
export function msg(t){if(!B)return;B.msgs.push({t,life:3.5});if(B.msgs.length>3)B.msgs.shift()}

// ---------- start / finish ----------
export function tactical(att,def,af,df,playerSide,place){
 return new Promise(resolve=>{
  setupBattle(att,def,af,df,playerSide,place);
  B.resolve=resolve;
  let ok=false;
  try{ok=initScene()}catch(e){console.error(e);ok=false}
  if(!ok){
   cleanupScene();
   setState(B.campRng);const res=autoResolve(att,def,1.2);B=null;
   ask('3D недоступно','<p>Не удалось запустить 3D на этом устройстве — битва рассчитана автоматически.</p>',[['ok','Далее',1]]).then(()=>resolve(res));
   return;
  }
  $('battle').style.display='block';
  $('bTitle').textContent='⚔ '+place;
  onResize();
  msg(playerSide==='att'?'Ты атакуешь. Расставь войска и жми ▶':'Враг наступает! Расставь войска и жми ▶');
  buildCards();updateHud();
  B.last=performance.now();B.raf=requestAnimationFrame(loop);
 });
}
export function finishBattle(w,retreat){
 if(B.over)return;B.over=true;B.paused=true;
 const playerWon=w==='p';
 B.regs.forEach(r=>{r.o.hp=Math.round(Math.max(0,r.men));if(r.side!==w)r.o.hp=Math.round(r.o.hp*(retreat?0.8:0.6))});
 const keep=a=>a.filter(u=>u.hp>=12);
 const winSide=(playerWon===(B.playerSide==='att'))?'att':'def';
 B.result={win:winSide,att:keep(B.att),def:winSide==='def'?keep(B.def):[]};
 const kills=Math.round(B.init.e-B.regs.filter(r=>r.side==='e').reduce((a,r)=>a+Math.max(0,r.men),0));
 const loss=Math.round(B.init.p-B.regs.filter(r=>r.side==='p').reduce((a,r)=>a+Math.max(0,r.men),0));
 const txt=retreat?'Ты отступил с поля боя.':playerWon?'Враг бежит! Поле боя за тобой.':'Твои войска бегут...';
 if(B.headless){endBattle();return}
 setTimeout(()=>modal(`<h2>${playerWon?'🏆 Победа!':'💀 Поражение'}</h2><p>${txt}</p><p class="small">Враг потерял: ${kills} · Твои потери: ${loss}</p><button class="pri" onclick="closeModal();endBattle()">Далее</button>`),playerWon?900:600);
}
export function endBattle(){
 const r=B.resolve,res=B.result;setState(B.campRng);
 cleanupScene();$('battle').style.display='none';B=null;r(res);
}
export function bAuto(){
 if(!B||B.over)return;
 const ps=B.regs.filter(u=>u.side==='p'&&alive(u)&&!u.routing),es=B.regs.filter(u=>u.side==='e'&&alive(u)&&!u.routing);
 const S=a=>a.reduce((s,r)=>{const d=UT[r.t];return s+(d.atk+d.def+(r.ranged?2:0)+(r.cav?2:0))*r.men/100*(0.4+0.6*Math.max(0,r.morale)/100)},0);
 const sp=S(ps)*rnd(.85,1.15),se=S(es)*rnd(.85,1.15);
 const w=sp>=se?'p':'e';const ratio=Math.min(sp,se)/Math.max(sp,se||1);
 (w==='p'?ps:es).forEach(u=>u.men*=1-Math.min(.8,ratio*rnd(.3,.6)));
 finishBattle(w);
}
export async function bRetreat(){
 if(!B||B.over)return;
 const was=B.paused;B.paused=true;
 const ok=await ask('Отступить?','<p>Битва будет проиграна, но большая часть уцелевших спасётся.</p>',[['y','Отступить',1],['n','Сражаться']]);
 if(!B)return;
 if(ok==='y')finishBattle('e',true);else B.paused=was;
}
