const el=()=>({style:{},innerHTML:'',textContent:'',clientWidth:400,clientHeight:600,disabled:false,appendChild(){}});
const E={};global.document={getElementById:id=>E[id]||(E[id]=el()),querySelector:()=>null,createElement:el};
global.window=global;global.addEventListener=()=>{};global.localStorage={getItem:()=>null,setItem(){}};
const fs=require('fs');eval(require('./load-game')()+`
ask=async()=>'auto';modal=()=>{};
console.log("start");(async()=>{newGame();
for(let i=0;i<30&&!G.over;i++){ 
 // player: attack weakest neighbours with auto
 for(const p of G.prov.filter(p=>p.owner==='rome'&&p.army.length&&!p.moved)){
  if(p.id==='roma'&&G.turn<6)continue;const t=adj(p.id).map(P).filter(x=>x.owner!=='rome').sort((a,b)=>str(a.army)-str(b.army))[0];
  if(t){G.sel=p.id;G.pick=new Set(p.army.map(u=>u.id));await moveArmy(p,t)}
 }
 const r=P('roma');G.sel='roma';if(G.fac.rome.gold>300&&r.army.length<8)recruit('sword');
 await endTurn();
 const c={};G.prov.forEach(p=>c[p.owner]=(c[p.owner]||0)+1);
 console.log(G.turn,JSON.stringify(c),G.fac.rome.gold);
}
console.log(G.log);})();`);
