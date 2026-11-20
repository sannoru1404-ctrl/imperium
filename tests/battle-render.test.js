const ctx2d=new Proxy({},{get:(t,k)=>k in t?t[k]:()=>{},set:(t,k,v)=>(t[k]=v,true)});
const el=()=>({style:{},innerHTML:'',textContent:'',clientWidth:400,clientHeight:700,disabled:false,appendChild(){},classList:{toggle(){}},querySelector:()=>el(),getContext:()=>ctx2d,width:0,height:0});
const E={};global.document={getElementById:id=>E[id]||(E[id]=el()),querySelector:()=>null,createElement:el};
global.window=global;global.devicePixelRatio=3;global.addEventListener=()=>{};global.removeEventListener=()=>{};global.localStorage={getItem:()=>null,setItem(){}};
let rafF=null;global.requestAnimationFrame=f=>{rafF=f;return 1};global.cancelAnimationFrame=()=>{};
require('./three-mock.js');
const fs=require('fs');eval(require('./load-game')()+`
modal=(h)=>{global.LASTMODAL=h};newGame();
(async()=>{
 const att=['sword','sword','spear','arch','cav','eleph','mil'].map(t=>mk(t)),def=['sword','spear','eleph','cav','arch','arch'].map(t=>mk(t));
 const pr=tactical(att,def,'rome','carth','att','Тест');
 console.log('3d started', !!S3);
 const C=CANVAS.L;
 // tap own unit: project mock returns center for every reg -> picks one
 C.pointerdown({pointerId:1,clientX:220,clientY:315,button:0});C.pointerup({pointerId:1,clientX:220,clientY:315,button:0});
 console.log('sel',B.sel.size);
 // drag pan
 C.pointerdown({pointerId:1,clientX:100,clientY:100,button:0});C.pointermove({pointerId:1,clientX:160,clientY:140});
 C.pointerdown({pointerId:2,clientX:200,clientY:200,button:0});C.pointermove({pointerId:2,clientX:260,clientY:280});C.pointerup({pointerId:2});C.pointerup({pointerId:1,clientX:160,clientY:140});
 C.wheel({deltaY:100,preventDefault(){}});
 bSelAll();bPause();bSpeed();bSpeed();bCharge();cardTap(B.regs[0].id);cardTap(B.regs[0].id);bHalt();bCharge();
 let now=0,frames=0;
 while(B&&!B.over&&frames<40000){now+=33;rafF(now);frames++}
 console.log('frames',frames,'over',B&&B.over,'corpses',S3&&S3.corpseN,'arrows',S3&&S3.arrows.length);
 const m=global.LASTMODAL;console.log((m||'').replace(/<[^>]+>/g,' ').slice(0,120));
 endBattle();const r=await pr;console.log('result',r.win,r.att.length,r.def.length,'S3',S3,'B',B);
})().catch(e=>console.log('ERR',e.stack));`);
