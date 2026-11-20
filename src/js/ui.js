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
<p><b>Цель:</b> захвати ${WIN_N} из 18 провинций или уничтожь Карфаген, галлов и греков. Если падёт Рим — конец.</p>
<p><b>Карта:</b> нажми свою провинцию с армией (⚔), выбери отряды и нажми на подсвеченную соседнюю провинцию. Пунктир голубым — морской путь.</p>
<p><b>Экономика:</b> провинции приносят золото, каждый отряд стоит 20 в ход. Улучшай города: больше дохода, наймов и ополчения.</p>
<p><b>3D-битва:</b> идёт в реальном времени. Тапни свой полк (или карточку внизу), затем тапни врага — атака, или землю — марш. Палец двигает камеру, двумя пальцами — масштаб и поворот. ⏸ — пауза, во время паузы можно отдавать приказы.</p>
<p>Полки бегут, когда падает боевой дух (жёлтая полоса). Удар во фланг ×1.35, в тыл ×1.8 — обходи врага конницей!</p>
<p>🛡️ Копейщики ×2 против конницы и слонов · 🐎 Конница: натиск после разбега (2+ клетки), опасна для лучников · 🏹 Лучники бьют издалека, слабы вблизи · 🌲 Лес: защита и укрытие от стрел, но конница там вязнет.</p>
<button class="pri" onclick="closeModal()">Понятно</button>`)}

// ---------- save / load menu ----------
const slotName=s=>s==='auto'?'Автосохранение':'Слот '+s;
function slotInfo(d){
 if(!d)return '<span class="small">пусто</span>';
 const when=d.ts?new Date(d.ts).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'старый формат';
 return `<span class="small">Ход ${d.turn} · провинций ${d.owned}${d.over?' · игра окончена':''} · ${when}</span>`;
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
