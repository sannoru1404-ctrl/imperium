import { UT, uname, FORMS, ABIL } from './data.js';
import { $ } from './util.js';
import { B, alive, rdist, msg, canForm, hasAura, abReady, abOn, useAbility } from './battle-sim.js';
import { S3 } from './battle-3d.js';

// ---------- HUD ----------
export function buildCards(){
 $('bCards').innerHTML=B.regs.filter(r=>r.side==='p').map(r=>`<div class="card" id="card${r.id}" onclick="cardTap(${r.id})"><div class="ci">${UT[r.t].i}</div>${r.o.xp?`<div style="position:absolute;top:1px;right:3px;font-size:8px;color:#ffd84a">${'★'.repeat(r.o.xp)}</div>`:''}${r.o.g?`<div style="position:absolute;top:1px;left:3px;font-size:8px;color:#ffd84a">${r.o.g.rank}</div>`:''}<div class="cb"><i class="m"></i></div><div class="cb"><i class="mo"></i></div><div class="cb"><i class="st"></i></div>${(UT[r.t].abil||[]).length?`<div class="ab" onclick="event.stopPropagation();bAbil('${UT[r.t].abil[0]}',${r.id})">${ABIL[UT[r.t].abil[0]].i}</div>`:''}</div>`).join('');
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
 const s=Math.floor(B.time);$('bTime').textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0')+(B.siege?(B.siege.open?' · 🚪 выбиты':` · 🚪 ${Math.round(100*B.siege.gateHp/B.siege.gateMax)}%`):'');
 $('bPause').textContent=B.paused?'▶':'⏸';$('bPause').classList.toggle('pri',B.paused);
 $('bSpeed').textContent='×'+B.speed;
 $('bMsg').innerHTML=B.msgs.map(m=>`<div style="opacity:${Math.min(1,m.life)}">${m.t}</div>`).join('');
 B.regs.filter(r=>r.side==='p').forEach(r=>{const c=$('card'+r.id);if(!c)return;
  c.classList.toggle('sel',B.sel.has(r));c.classList.toggle('gone',!alive(r)||r.routing);
  c.querySelector('.m').style.width=Math.max(0,r.men)+'%';c.querySelector('.mo').style.width=Math.min(100,Math.max(0,r.morale))+'%';c.querySelector('.st').style.width=r.stam+'%';
  const ab=c.querySelector('.ab'),k=(UT[r.t].abil||[])[0];
  if(ab){const on=(UT[r.t].abil||[]).some(x=>abOn(r,x));ab.classList.toggle('on',on);ab.classList.toggle('cd',!on&&!abReady(r,k))}
  c.querySelector('.ci').textContent=r.routing?'🏳️':!alive(r)?'☠':UT[r.t].i+(r.form!=='line'?FORMS[r.form].i:'');});
 const sel=[...B.sel];
 const stamWord=v=>v>=75?'свежие':v>=50?'бодрые':v>=25?'устали':'измотаны';
 if(sel.length===1){const r=sel[0];
  $('bInfo').innerHTML=abilButtons(sel)+`<b>${uname(r.t,r.fac)}</b> · ${Math.round(r.men)} бойцов · дух ${Math.round(Math.max(0,r.morale))}% · ${stamWord(r.stam)}${r.form!=='line'?' · '+FORMS[r.form].n.toLowerCase():''}${hasAura(r)&&!r.gen?' · 👑 рядом воевода':''}`;
 } else $('bInfo').innerHTML=sel.length?abilButtons(sel)+`Выбрано полков: ${sel.length}`:'<span class="small">Тапни свой полк, затем — врага (атака) или землю (марш).</span>';
 const fr=sel.find(r=>(UT[r.t].forms||[]).length),f=fr?UT[fr.t].forms[0]:null;
 $('bForm').disabled=!fr;
 $('bForm').textContent=!fr?'Строй':sel.every(r=>r.form!=='line')?'▭ Обычный строй':FORMS[f].i+' '+FORMS[f].n;
}
function abilButtons(sel){
 const ks=[...new Set(sel.flatMap(r=>UT[r.t].abil||[]))];
 return ks.length?`<div class="row" style="gap:4px;margin-bottom:3px">${ks.map(k=>{const A=ABIL[k],any=sel.some(r=>abReady(r,k)),on=sel.some(r=>abOn(r,k));
  const cd=Math.ceil(Math.min(...sel.filter(r=>r.ab&&r.ab[k]).map(r=>r.ab[k].cd)));
  return `<button class="bbtn${on?' pri':''}" style="padding:3px 7px;font-size:12px" title="${A.d}" onclick="bAbil('${k}')" ${any?'':'disabled'}>${A.i} ${A.n}${!any&&cd>0?` ${cd}с`:''}</button>`}).join('')}</div>`:'';
}
// use an ability: on one regiment (card button) or on every selected regiment that has it
export function bAbil(k,id){
 if(!B||B.over)return;
 const rs=id?B.regs.filter(r=>r.id===id):[...B.sel];
 let n=0;for(const r of rs)if(useAbility(r,k))n++;
 if(!n&&id){const r=rs[0];const alt=(UT[r.t].abil||[]).find(x=>abReady(r,x));if(alt)useAbility(r,alt)}
 updateHud();
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

// Toggle the selected regiments between line and their special formation (shield wall / wedge / loose)
export function bForm(){
 if(!B||B.over)return;
 const sel=[...B.sel].filter(r=>alive(r)&&!r.routing&&(UT[r.t].forms||[]).length);if(!sel.length)return;
 const toLine=sel.every(r=>r.form!=='line');
 for(const r of sel){const f=toLine?'line':UT[r.t].forms[0];if(canForm(r,f))r.form=f}
 msg(toLine?'Обычный строй':sel.length===1?FORMS[sel[0].form].n+'!':'Сменить строй!');updateHud();
}
