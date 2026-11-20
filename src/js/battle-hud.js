import { UT, uname } from './data.js';
import { $ } from './util.js';
import { B, alive, rdist, msg } from './battle-sim.js';
import { S3 } from './battle-3d.js';

// ---------- HUD ----------
export function buildCards(){
 $('bCards').innerHTML=B.regs.filter(r=>r.side==='p').map(r=>`<div class="card" id="card${r.id}" onclick="cardTap(${r.id})"><div class="ci">${UT[r.t].i}</div><div class="cb"><i class="m"></i></div><div class="cb"><i class="mo"></i></div></div>`).join('');
}
export function cardTap(id){
 const r=B.regs.find(x=>x.id===id);if(!r||!alive(r)||r.routing)return;
 if(B.sel.has(r)&&B.sel.size===1){S3.cam.tx=r.x;S3.cam.tz=r.z+18*Math.cos(S3.cam.yaw);return}
 if(B.sel.has(r))B.sel.delete(r);else B.sel.add(r);updateHud();
}
export function updateHud(){
 if(!B)return;
 const sh=sd=>B.regs.filter(r=>r.side===sd&&alive(r)&&!r.routing).reduce((a,r)=>a+Math.max(0,r.men),0)/Math.max(1,B.init[sd])*100;
 $('barP').style.width=sh('p')+'%';$('barE').style.width=sh('e')+'%';
 const s=Math.floor(B.time);$('bTime').textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
 $('bPause').textContent=B.paused?'▶':'⏸';$('bPause').classList.toggle('pri',B.paused);
 $('bSpeed').textContent='×'+B.speed;
 $('bMsg').innerHTML=B.msgs.map(m=>`<div style="opacity:${Math.min(1,m.life)}">${m.t}</div>`).join('');
 B.regs.filter(r=>r.side==='p').forEach(r=>{const c=$('card'+r.id);if(!c)return;
  c.classList.toggle('sel',B.sel.has(r));c.classList.toggle('gone',!alive(r)||r.routing);
  c.querySelector('.m').style.width=Math.max(0,r.men)+'%';c.querySelector('.mo').style.width=Math.max(0,r.morale)+'%';
  c.querySelector('.ci').textContent=r.routing?'🏳️':!alive(r)?'☠':UT[r.t].i;});
 const sel=[...B.sel];
 $('bInfo').innerHTML=sel.length===1?`<b>${uname(sel[0].t,'rome')}</b> · ${Math.round(sel[0].men)} бойцов · боевой дух ${Math.round(Math.max(0,sel[0].morale))}%`:sel.length?`Выбрано полков: ${sel.length}`:'<span class="small">Тапни свой полк, затем — врага (атака) или землю (марш).</span>';
}
export function bPause(){if(!B||B.over)return;B.paused=!B.paused;updateHud()}
export function bSpeed(){if(!B)return;B.speed=B.speed===1?2:B.speed===2?3:1;updateHud()}
export function bSelAll(){if(!B)return;const a=B.regs.filter(r=>r.side==='p'&&alive(r)&&!r.routing);B.sel=new Set(B.sel.size===a.length?[]:a);updateHud()}
export function bCharge(){
 if(!B||B.over)return;const sel=B.sel.size?[...B.sel]:B.regs.filter(r=>r.side==='p'&&alive(r)&&!r.routing);
 const foes=B.regs.filter(r=>r.side==='e'&&alive(r)&&!r.routing);if(!foes.length)return;
 sel.forEach(r=>{let n=null,nd=1e9;foes.forEach(f=>{const d=rdist(r,f);if(d<nd){nd=d;n=f}});r.order={type:'attack',tg:n}});
 if(B.paused){B.paused=false}msg('⚔ В атаку!');updateHud();
}
export function bHalt(){if(!B)return;[...B.sel].forEach(r=>{r.order=r.ranged?null:{type:'move',x:r.x,z:r.z}});msg('Стоять!')}
