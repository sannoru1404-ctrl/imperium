import { WIN_N } from './data.js';
import { $ } from './util.js';
import { G, addLog, SLOTS, readSlot, saveSlot, loadSlot } from './state.js';
import { render } from './map.js';

// ===================== UI HELPERS =====================
export function modal(html){$('modalRoot').innerHTML=`<div class="overlay"><div class="modal">${html}</div></div>`}
export function closeModal(){$('modalRoot').innerHTML=''}
// Tests (and later, replays) can answer dialogs automatically: setAutoAnswer((title,btns)=>'auto')
let autoAnswer=null;
export function setAutoAnswer(f){autoAnswer=f}
export function ask(title,body,btns){
 if(autoAnswer)return Promise.resolve(autoAnswer(title,btns));
 return new Promise(res=>{
  window.__ans=v=>{closeModal();res(v)};
  modal(`<h2>${title}</h2>${body}<div class="row" style="margin-top:14px">${btns.map(b=>`<button class="${b[2]?'pri':''}" onclick="__ans('${b[0]}')">${b[1]}</button>`).join('')}</div>`);
 });
}
export function toast(t){addLog(t);render()}
export function showHelp(){modal(`<h2>Как играть</h2>
<p><b>Цель:</b> собери ${WIN_N} земель из 23 или возьми Краков и Эстергом. Если падёт Киев — конец.</p>
<p><b>Карта:</b> нажми свою землю с войском (⚔), выбери отряды и нажми на подсвеченную соседнюю землю. Голубой пунктир — путь по морю.</p>
<p><b>Казна:</b> земли приносят золото, каждый отряд стоит 20 в год. Отстраивай города: больше дохода, найма и ополчения.</p>
<p><b>Воевода:</b> один на войско. Рядом с ним полки стойче и быстрее приходят в себя. Если он погибнет или побежит — всё войско дрогнет.</p>
<p><b>Битва:</b> идёт в реальном времени. Тапни полк (или карточку внизу), затем врага — атака, или землю — марш. Палец двигает камеру, двумя пальцами — масштаб и поворот. ⏸ — пауза, приказы можно отдавать на паузе.</p>
<p><b>Строй</b> (кнопка внизу): 🧱 стена щитов — пехота держит удар и стрелы спереди, но медленная; 🔺 клин — страшный натиск конницы; ⁘ рассыпной — стрелки теряют меньше от стрел.</p>
<p><b>Полосы на карточке:</b> зелёная — люди, жёлтая — боевой дух, синяя — силы. Уставшие полки слабее.</p>
<p>🛡️ Копейщики ×2 против конницы · Удар во фланг ×1.35, в тыл ×1.8 · 🏹 Стрелки бьют издалека, конные лучники сами держат дистанцию · ⛰ С холма бить сильнее, в гору идти тяжелее · Полк, стоявший на месте, встречает удар собранным.</p>
<button class="pri" onclick="closeModal()">Понятно</button>`)}

// ---------- save / load menu ----------
const slotName=s=>s==='auto'?'Автосохранение':'Слот '+s;
function slotInfo(d){
 if(!d)return '<span class="small">пусто</span>';
 const when=d.ts?new Date(d.ts).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'старый формат';
 return `<span class="small">${1099+d.turn} г. · провинций ${d.owned}${d.over?' · игра окончена':''} · ${when}</span>`;
}
export function showSaves(){
 const inGame=!!G&&!G.over&&$('title').style.display==='none';
 const rows=SLOTS.map(s=>{const d=readSlot(s);
  return `<div class="rec"><div><b>${slotName(s)}</b><br>${slotInfo(d)}</div><div class="row" style="gap:6px;flex-wrap:nowrap">
   ${inGame&&s!=='auto'?`<button onclick="saveTo('${s}')">Сохранить</button>`:''}
   <button class="pri" onclick="loadFrom('${s}')" ${d?'':'disabled'}>Загрузить</button></div></div>`}).join('');
 modal(`<h2>Сохранения</h2>${rows}<div class="row" style="margin-top:12px"><button onclick="closeModal()">Закрыть</button></div>`);
}
export function saveTo(s){
 if(G&&G.busy)return;
 const ok=saveSlot(s);
 addLog(ok?`Игра сохранена: ${slotName(s).toLowerCase()}.`:'Не удалось сохранить игру.');
 render();showSaves();
}
export function loadFrom(s){closeModal();if(!loadSlot(s))modal('<h2>Ошибка</h2><p>Сохранение повреждено.</p><button onclick="closeModal()">Закрыть</button>')}
