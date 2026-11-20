const el=()=>({style:{},innerHTML:'',textContent:'',clientWidth:400,clientHeight:600,disabled:false,appendChild(){},classList:{toggle(){}},querySelector:()=>el()});
const E={};global.document={getElementById:id=>E[id]||(E[id]=el()),querySelector:()=>null,createElement:el};
global.window=global;global.addEventListener=()=>{};global.removeEventListener=()=>{};global.localStorage={getItem:()=>null,setItem(){}};
const fs=require('fs');eval(require('./load-game')()+`
modal=()=>{};newGame();
function run(pa,ea,side,label){
 const att=pa.map(t=>mk(t)),def=ea.map(t=>mk(t));
 let res;setupBattle(att,def,'rome','carth',side,'T');B.headless=true;B.resolve=r=>res=r;B.paused=false;
 // player AI: attack nearest each 1s (simple)
 let t=0;const stats={};
 while(B&&!B.over&&t<600){ if(Math.floor(t*10)%10===0){B.regs.filter(r=>r.side==='p'&&alive(r)&&!r.routing&&!r.order).forEach(r=>{let n=null,nd=1e9;B.regs.filter(e=>e.side==='e'&&alive(e)&&!e.routing).forEach(e=>{const d=rdist(r,e);if(d<nd){nd=d;n=e}});if(n)r.order={type:'attack',tg:n}})}
  simStep(0.034);t+=0.034}
 const tm=B?B.time:t; 
 console.log(label,'time',t.toFixed(0),'win',res&&res.win,'att',res.att.map(u=>u.t+':'+u.hp).join(','),'| def',res.def.map(u=>u.t+':'+u.hp).join(','));
}
run(['sword','sword','spear','arch','cav'],['sword','sword','eleph','cav','arch'],'att','even');
run(['sword','sword','spear','arch','cav'],['mil','mil'],'att','vs militia');
run(['sword'],['sword','sword','sword','arch'],'att','outnumbered');
run(['sword','sword','sword','sword','spear','spear','arch','arch'],['sword','sword','sword','sword','spear','cav','cav','eleph'],'def','big def');
`);
