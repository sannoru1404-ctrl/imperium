import { UT, uname, FORMS } from './data.js';
import { $, rnd } from './util.js';
import { nextId } from './state.js';
import { autoResolve } from './turn.js';
import { initScene, cleanupScene, onResize, fx3d, loop } from './battle-3d.js';
import { buildCards, updateHud } from './battle-hud.js';
import { modal, closeModal, ask } from './ui.js';
import { rand, seed, getState, setState } from './rng.js';

// ===================== TACTICAL BATTLE (simulation, no graphics) =====================
export let B=null;
export const SPD={2:5,4:10};
export const CONTACT=6.5, FIELD=80;
export const FIGMAX={inf:25,cav:12};
export const AURA_R=30;
export function bodyOf(t){return UT[t].mov>2?'cav':'inf'}
export function alive(r){return !r.fled&&!r.dead}
export function rdist(a,b){return Math.hypot(a.x-b.x,a.z-b.z)}
export function fwd(r){return [Math.sin(r.face),Math.cos(r.face)]}
export function angWrap(d){while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function Hgt(x,z){
 const s=B?B.seed:0;
 let h=1.1*Math.sin(x*0.045+s)+0.9*Math.cos(z*0.05+s*2)+0.5*Math.sin((x+z)*0.08+s*3);
 if(B)for(const k of B.hills){const d2=((x-k.x)**2+(z-k.z)**2)/(k.r*k.r);if(d2<9)h+=k.h*Math.exp(-d2)}
 const ox=Math.max(0,Math.abs(x)-105),oz=Math.max(0,Math.abs(z)-125);
 return h+ox*0.35+oz*0.35;
}

export function makeReg(o,side,x,z,fac){
 const d=UT[o.t];const body=bodyOf(o.t);
 const r={id:nextId(),o,t:o.t,side,fac,men:o.hp,start:Math.max(o.hp,1),morale:100,stam:100,x,z,face:side==='p'?Math.PI:0,
  order:null,state:'idle',chargeT:0,idleT:5,braceT:0,cool:rand()*2,fled:false,dead:false,routing:false,inForest:false,
  spd:SPD[d.mov]||5,ranged:!!d.range,range:d.range||0,ammo:d.ammo||0,cav:d.mov>2,gen:!!d.general,skirmish:!!d.skirmish,
  form:d.charge&&d.forms&&d.forms.includes('wedge')?'wedge':'line',body,figs:[],bannerKey:''};
 const n=Math.max(1,Math.ceil(r.men/100*FIGMAX[body]));
 for(let i=0;i<n;i++)r.figs.push({x,z,ph:rand()*6.28,j:(rand()-.5)*0.3});
 return r;
}
// figure layout per formation (used by the renderer)
export function formation(r){
 if(r.body==='cav')return r.form==='wedge'?{cols:6,sx:1.9,sz:2.6,wedge:true}:r.form==='loose'?{cols:6,sx:3.4,sz:4.2}:{cols:6,sx:2.1,sz:3.0};
 if(r.form==='wall')return{cols:9,sx:1.05,sz:1.25};
 if(r.form==='loose')return{cols:8,sx:2.3,sz:2.6};
 return{cols:8,sx:1.3,sz:1.6};
}
export function canForm(r,f){return f==='line'||(UT[r.t].forms||[]).includes(f)}
export function setForm(r,f){if(canForm(r,f))r.form=f}

export function setupBattle(att,def,af,df,playerSide,place,battleSeed){
 const pu=playerSide==='att'?att:def, eu=playerSide==='att'?def:att;
 // the battle runs on its own seed, so it can be replayed; the campaign stream is restored afterwards
 const rngSeed=(battleSeed??Math.floor(rand()*4294967296))>>>0, campRng=getState();seed(rngSeed);
 B={rngSeed,campRng,regs:[],att,def,playerSide,af,df,pf:playerSide==='att'?af:df,ef:playerSide==='att'?df:af,place,time:0,pending:[],seed:rand()*10,
  paused:true,speed:1,sel:new Set(),over:false,aiT:0,msgs:[],forests:[],hills:[]};
 for(let i=0;i<3;i++)B.forests.push({x:(rand()-.5)*130,z:(rand()-.5)*40,r:9+rand()*7});
 // one or two real hills: holding the high ground matters
 const nh=1+(rand()<0.6?1:0);
 for(let i=0;i<nh;i++)B.hills.push({x:(rand()-.5)*120,z:(rand()-.5)*70,r:18+rand()*12,h:6+rand()*5});
 const deploy=(units,side,fac)=>{
  const zs=side==='p'?1:-1;
  const gen=units.filter(u=>UT[u.t].general);
  const mel=units.filter(u=>!UT[u.t].range&&UT[u.t].mov<=2),cav=units.filter(u=>UT[u.t].mov>2&&!UT[u.t].general),rng=units.filter(u=>UT[u.t].range&&UT[u.t].mov<=2);
  const line=(arr,z)=>arr.forEach((u,i)=>B.regs.push(makeReg(u,side,(i-(arr.length-1)/2)*15,z*zs,fac)));
  line(mel,38);line(rng,mel.length?54:40);
  const half=Math.max(mel.length,rng.length,1)*15/2;
  cav.forEach((u,i)=>B.regs.push(makeReg(u,side,(i%2?1:-1)*(half+12+Math.floor(i/2)*14),44*zs,fac)));
  gen.forEach((u,i)=>B.regs.push(makeReg(u,side,i*14,66*zs,fac)));
 };
 deploy(pu,'p',B.pf);deploy(eu,'e',B.ef);
 B.init={p:0,e:0};B.cur={p:0,e:0};
 B.regs.forEach(r=>{B.init[r.side]+=r.men});
}

// ---------- helpers ----------
export function turnTo(r,tx,tz,dt,rate=3){const d=angWrap(Math.atan2(tx-r.x,tz-r.z)-r.face);const m=rate*dt;r.face+=clamp(d,-m,m)}
export function fatigue(r){return r.stam>=50?1:r.stam>=25?0.9:0.75}
export function speedOf(r){
 let s=r.spd*(r.inForest?(r.cav?0.6:0.85):1)*(r.stam<25?0.8:1);
 if(r.form==='wall')s*=0.5;
 return s;
}
export function moveTo(r,tx,tz,dt,mult=1){
 const dx=tx-r.x,dz=tz-r.z,d=Math.hypot(dx,dz);if(d<0.4)return true;
 const ux=dx/d,uz=dz/d;
 const slope=(Hgt(r.x+ux*2,r.z+uz*2)-Hgt(r.x,r.z))/2;  // uphill slows, downhill speeds up a little
 const sp=speedOf(r)*mult*clamp(1-slope*1.2,0.65,1.15);const s=Math.min(d,sp*dt);
 r.x+=ux*s;r.z+=uz*s;turnTo(r,tx,tz,dt,6);return d<=s+0.4;
}
export function hasAura(r){
 return B.regs.some(g=>g.gen&&g!==r&&g.side===r.side&&alive(g)&&!g.routing&&rdist(g,r)<AURA_R);
}
function frontal(b,a){const [fx,fz]=fwd(b);const vx=a.x-b.x,vz=a.z-b.z,vl=Math.hypot(vx,vz)||1;return (fx*vx+fz*vz)/vl}
function heightMult(a,b){return 1+clamp((Hgt(a.x,a.z)-Hgt(b.x,b.z))*0.04,-0.15,0.2)}
function moraleHit(b,amount){b.morale-=amount*(hasAura(b)?0.75:1)}

export function meleeHit(a,b,dt,burst){
 const da=UT[a.t],db=UT[b.t];
 const atk=(da.range?da.atk*0.5:da.atk)*fatigue(a);let mult=1;
 if(da.antiCav&&b.cav)mult*=da.antiCav;
 if(a.cav&&db.range&&b.body==='inf')mult*=1.5;     // horsemen ride down archers
 if(b.routing)mult*=2;
 const dot=frontal(b,a);
 let fl=1;if(!b.routing){if(dot<-0.35)fl=1.8;else if(dot<0.35)fl=1.35}
 let def=db.def*fatigue(b)*(b.inForest?1.25:1);
 if(b.form==='wall'&&dot>0.35)def*=1.5;
 if(b.form==='wedge')def*=0.85;
 if(b.form==='loose')def*=0.8;
 if(b.braceT>0&&dot>0.35)def*=1.2;                 // a line that stood ready meets the attack braced
 const eff=atk*mult*fl*heightMult(a,b)/def*(0.35+0.65*a.men/a.start);
 let dmg;
 if(burst){
  const chargeM=(da.charge||(a.cav?1:0.45))*(a.form==='wedge'?1.4:1);
  dmg=9*eff*chargeM;
  const braced=dot>0.35&&(b.form==='wall'||db.antiCav);
  if(braced&&a.cav){dmg*=0.3;a.men-=6;moraleHit(a,10)}
  moraleHit(b,a.cav?15:6);
  if(a.cav){fx3d('charge',a,b);msg((a.side==='p'?'Твоя ':'Вражеская ')+uname(a.t,a.fac).toLowerCase()+' врезается в строй!')}
 } else dmg=1.0*dt*eff;
 b.men-=dmg;moraleHit(b,dmg*1.1+(fl>1&&!burst?(fl>1.5?5:2.5)*dt:0));
 if(fl>1.5&&!b.flankMsg&&b.side==='p'){b.flankMsg=true;msg('⚠ Удар в тыл: '+uname(b.t,b.fac))}
}
export function fire(a,b){
 const da=UT[a.t],db=UT[b.t];
 a.cool=(da.reload||3.2)*(0.9+rand()*0.2);
 a.ammo--;if(a.ammo<=0){a.ranged=false;a.skirmish=false;if(a.side==='p')msg('Кончились стрелы: '+uname(a.t,a.fac).toLowerCase())}
 let def=db.def*(1-(da.ap||0));
 let dmg=6.5*da.atk*fatigue(a)*heightMult(a,b)/Math.max(1,def)*(0.35+0.65*a.men/a.start);
 if(b.inForest)dmg*=0.5;
 const dot=frontal(b,a);
 if(dot>0.35&&b.body==='inf'&&!b.ranged)dmg*=b.form==='wall'?0.5:0.75; // shields
 if(b.form==='loose')dmg*=0.5;
 const dur=0.9+rdist(a,b)/60;
 B.pending.push({t:dur,b,dmg});
 fx3d('volley',a,b,dur);
}

// ---------- main step ----------
export function simStep(dt){
 B.time+=dt;
 B.pending=B.pending.filter(p=>{p.t-=dt;if(p.t<=0){if(alive(p.b)){p.b.men-=p.dmg;moraleHit(p.b,p.dmg)}return false}return true});
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
   // skirmishers step back from approaching infantry and cavalry before they make contact
   let threat=null;
   if(r.skirmish&&!contact&&!(r.order&&r.order.type==='move'))
    threat=foes.find(f=>!f.ranged&&!f.routing&&rdist(f,r)<(r.cav?22:16));
   if(r.order&&r.order.type==='move'){if(moveTo(r,r.order.x,r.order.z,dt)){r.order=null;r.state='idle'}else r.state='move'}
   else if(contact){r.state='fight';turnTo(r,contact.x,contact.z,dt);meleeHit(r,contact,dt)}
   else if(threat){
    // pick the most open direction (8 candidates): far from enemy melee, away from the field edge
    let best=null,bv=-1e9;
    for(let k=0;k<8;k++){const ang=k*Math.PI/4,cx=r.x+Math.sin(ang)*15,cz=r.z+Math.cos(ang)*15;
     let md=1e9;for(const f of foes)if(!f.ranged&&!f.routing)md=Math.min(md,Math.hypot(f.x-cx,f.z-cz));
     const out=Math.max(0,Math.abs(cx)-88)+Math.max(0,Math.abs(cz)-(FIELD+12));
     const v=md-out*4;if(v>bv){bv=v;best=[cx,cz]}}
    moveTo(r,best[0],best[1],dt);r.state='move';
    // horse archers shoot on the move; foot archers only reload
    r.cool-=dt*(r.cav?1:0.5);
    if(r.cav&&r.cool<=0){const tg2=foes.filter(f=>!f.routing&&rdist(f,r)<=r.range).sort((a,b)=>rdist(a,r)-rdist(b,r))[0];if(tg2)fire(r,tg2)}
   }
   else{
    if(!tg){let n=null,nd=1e9;for(const e of foes){if(e.routing)continue;const d=rdist(r,e);if(d<nd){nd=d;n=e}}if(n&&nd<=r.range)tg=n}
    if(tg){const d=rdist(r,tg);if(d>r.range){moveTo(r,tg.x,tg.z,dt);r.state='move'}else{r.state='aim';turnTo(r,tg.x,tg.z,dt);r.cool-=dt;if(r.cool<=0)fire(r,tg)}}
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
      if(!prevFight){
       r.braceT=r.idleT>3?6:0;
       if(r.form!=='wall'&&r.chargeT>(r.cav?1.2:1.5))meleeHit(r,tg,0,true);
      }
      r.state='fight';r.chargeT=0;turnTo(r,tg.x,tg.z,dt);meleeHit(r,tg,dt);
     }
    } else {r.state='idle';r.chargeT=0}
   }
  }
  // stamina, readiness, morale recovery
  if(r.state==='fight'){r.stam-=(r.form==='wall'?1.0:1.5)*dt;r.braceT=Math.max(0,r.braceT-dt)}
  else if(r.state==='move')r.stam-=(r.cav?1.0:0.8)*dt;
  else r.stam+=2.5*dt;
  r.stam=clamp(r.stam,0,100);
  r.idleT=(r.state==='idle'||r.state==='aim')?r.idleT+dt:0;
  if(r.state!=='fight')r.morale=Math.min(100,r.morale+3*dt*(hasAura(r)?2:1));
  if(B.cur[r.side]<B.init[r.side]*0.4)r.morale-=2*dt;
 }
 for(const r of B.regs){
  if(!alive(r))continue;
  if(r.men<=0.5){r.dead=true;r.men=0;if(r.gen)generalLost(r,true);continue}
  if(!r.routing&&(r.morale<=0||r.men<r.start*0.12)){r.routing=true;r.order=null;B.sel.delete(r);
   if(r.gen)generalLost(r,false);
   msg((r.side==='p'?'💀 Бегут твои: ':'🏳 Бегут враги: ')+uname(r.t,r.fac).toLowerCase())}
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
 for(const r of al){r.x=clamp(r.x,-100,100);if(!r.routing)r.z=clamp(r.z,-FIELD-25,FIELD+25)}
 B.aiT-=dt;if(B.aiT<=0){B.aiT=0.6;aiThink()}
 const act=s=>B.regs.some(r=>r.side===s&&alive(r)&&!r.routing);
 if(!act('e'))finishBattle('p');else if(!act('p'))finishBattle('e');
 else if(B.time>480)finishBattle(B.playerSide==='def'?'p':'e');
}
function generalLost(g,killed){
 if(g.lostDone)return;g.lostDone=true;
 for(const r of B.regs)if(r!==g&&r.side===g.side&&alive(r)&&!r.routing)r.morale-=25;
 msg(g.side==='p'?(killed?'☠ Пал наш воевода! Войско дрогнуло':'⚠ Наш воевода бежит!'):(killed?'⚔ Вражеский воевода убит!':'🏳 Вражеский воевода бежит!'));
}

// ---------- enemy AI ----------
export function aiThink(){
 const mine=B.regs.filter(r=>r.side==='e'&&alive(r)&&!r.routing),foes=B.regs.filter(r=>r.side==='p'&&alive(r)&&!r.routing);
 if(!foes.length)return;
 const near=foes.some(f=>mine.some(m=>rdist(f,m)<45));
 const hold=B.playerSide==='att'&&B.time<40&&!near;   // defenders wait on their line
 const targeted=new Map();
 for(const r of mine)if(r.order&&r.order.type==='attack')targeted.set(r.order.tg,(targeted.get(r.order.tg)||0)+1);
 const center=(()=>{const a=mine.filter(m=>!m.gen);if(!a.length)return null;return{x:a.reduce((s,m)=>s+m.x,0)/a.length,z:a.reduce((s,m)=>s+m.z,0)/a.length}})();
 for(const r of mine){
  // formations
  const enemyCavNear=foes.some(f=>f.cav&&rdist(f,r)<35);
  if(canForm(r,'wedge'))r.form='wedge';
  else if(canForm(r,'wall'))r.form=(hold||(enemyCavNear&&r.state!=='move'))?'wall':'line';
  else if(canForm(r,'loose'))r.form=foes.some(f=>f.ranged&&rdist(f,r)<f.range+10)?'loose':'line';
  if(r.state==='fight'&&!r.ranged)continue;
  if(r.gen){
   // the general stays behind the line and joins where a fight can be won
   const fight=foes.filter(f=>f.state==='fight'&&rdist(f,r)<45).sort((a,b)=>a.morale-b.morale)[0];
   if(fight&&r.men>40){r.order={type:'attack',tg:fight};continue}
   if(center){r.order={type:'move',x:center.x,z:center.z-14};continue}
  }
  if(r.ranged){
   if(r.order&&r.order.type==='move'&&Math.hypot(r.order.x-r.x,r.order.z-r.z)>1)continue;
   if(hold){r.order=null;continue}
   let n=null,nd=1e9;for(const f of foes){const d=rdist(r,f);if(d<nd){nd=d;n=f}}
   r.order=n?{type:'attack',tg:n}:null;continue;
  }
  if(hold){r.order=null;continue}
  const cur=r.order&&r.order.type==='attack'&&alive(r.order.tg)&&!r.order.tg.routing?r.order.tg:null;
  let best=null,bs=-1e9;
  for(const f of foes){let s=-rdist(r,f);
   if(UT[r.t].antiCav&&f.cav)s+=30;if(r.cav&&f.ranged)s+=40;if(r.cav&&(UT[f.t].antiCav||f.form==='wall'))s-=40;
   s+=(1-f.morale/100)*20;if(f===cur)s+=12;
   s-=18*((targeted.get(f)||0)-(f===cur?1:0));          // spread out, don't all pile onto one regiment
   if(f.state==='fight'&&frontal(f,r)<0.35)s+=15;          // prefer hitting engaged enemies in the flank
   if(s>bs){bs=s;best=f}}
  if(best){if(cur!==best){if(cur)targeted.set(cur,targeted.get(cur)-1);targeted.set(best,(targeted.get(best)||0)+1)}r.order={type:'attack',tg:best}}
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
 const genDead=B.regs.some(r=>r.side==='p'&&r.gen&&r.dead);
 const txt=retreat?'Ты отступил с поля боя.':playerWon?'Враг бежит! Поле боя за тобой.':'Твои войска бегут...';
 if(B.headless){endBattle();return}
 setTimeout(()=>modal(`<h2>${playerWon?'🏆 Победа!':'💀 Поражение'}</h2><p>${txt}</p>${genDead?'<p>☠ Воевода пал в бою.</p>':''}<p class="small">Враг потерял: ${kills} · Твои потери: ${loss}</p><button class="pri" onclick="closeModal();endBattle()">Далее</button>`),playerWon?900:600);
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
