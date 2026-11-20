import { UT, uname } from './data.js';
import { $ } from './util.js';
import { P } from './state.js';
import { B, FIELD, FIGMAX, alive, rdist, angWrap, Hgt, formation, simStep, msg, isAttacker, wallSide } from './battle-sim.js';
import { updateHud } from './battle-hud.js';

// ---------- 3D scene ----------
export let S3=null;
export function mergeGeo(list){
 // list of BufferGeometry (already transformed) -> one non-indexed geometry with position+normal
 const parts=list.map(g=>g.index?g.toNonIndexed():g);
 let n=0;parts.forEach(g=>n+=g.attributes.position.count);
 const pos=new Float32Array(n*3),nor=new Float32Array(n*3);let o=0;
 parts.forEach(g=>{pos.set(g.attributes.position.array,o*3);nor.set(g.attributes.normal.array,o*3);o+=g.attributes.position.count});
 const m=new THREE.BufferGeometry();
 m.setAttribute('position',new THREE.BufferAttribute(pos,3));m.setAttribute('normal',new THREE.BufferAttribute(nor,3));
 return m;
}
export function box(w,h,d,x,y,z,rx){const g=new THREE.BoxGeometry(w,h,d);if(rx)g.rotateX(rx);g.translate(x||0,y||0,z||0);return g}
export function sph(r,x,y,z,half){const g=half?new THREE.SphereGeometry(r,8,5,0,Math.PI*2,0,Math.PI/2):new THREE.SphereGeometry(r,8,6);g.translate(x||0,y||0,z||0);return g}
export function cyl(r,h,x,y,z){const g=new THREE.CylinderGeometry(r,r,h,5);g.translate(x||0,y||0,z||0);return g}

function cone(r,h,x,y,z){const g=new THREE.ConeGeometry(r,h,8);g.translate(x||0,y||0,z||0);return g}
export function bodyParts(){
 // per unit type: list of [geometry, colorKey]; colorKey 'side' / 'shield' = coloured per army
 const SIDE='side',SH='shield',WOOD=0x8a6a40,STEEL=0xb8b8b8,SKIN=0xd9a67a,LEATHER=0x6b4a2b;
 const legs=()=>[mergeGeo([box(.18,.8,.22,-.12,.4,0),box(.18,.8,.22,.12,.4,0)]),0x4a3622];
 const inf=()=>[legs(),[box(.55,.75,.35,0,1.17,0),SIDE],[sph(.17,0,1.72,0),SKIN]];
 const shishak=[mergeGeo([sph(.2,0,1.75,0,true),cone(.2,.4,0,2.05,0)]),STEEL];          // pointed Rus/eastern helmet
 const roundShield=[box(.62,.62,.08,-.12,1.1,.3),SH];
 const kiteShield=[mergeGeo([box(.56,.8,.08,-.12,1.2,.3),box(.36,.35,.08,-.12,.66,.3)]),SH];
 const horse=(cap)=>[
  [mergeGeo([box(.62,.66,1.8,0,1.2,0),box(.34,.8,.4,0,1.7,.9,-0.5),box(.3,.3,.65,0,2.05,1.15)]),LEATHER],
  [mergeGeo([box(.16,.85,.16,-.22,.43,.65),box(.16,.85,.16,.22,.43,.65),box(.16,.85,.16,-.22,.43,-.65),box(.16,.85,.16,.22,.43,-.65),box(.1,.6,.1,0,1.2,-.95)]),0x3e2a18],
  ...(cap?[[box(.76,.7,1.95,0,1.12,0),SIDE]]:[])];
 return{
  mil:[...inf(),[sph(.19,0,1.76,0,true),LEATHER],[cyl(.03,2.6,.3,1.3,.1),WOOD]],
  spear:[...inf(),shishak,roundShield,[cyl(.035,3.4,.32,1.6,.15),WOOD]],
  druzh:[...inf(),shishak,[box(.6,.5,.38,0,1.0,0),STEEL],kiteShield,[box(.06,.06,.75,.32,1.05,.4),STEEL]],
  arch:[...inf(),[sph(.19,0,1.76,0,true),LEATHER],[mergeGeo([box(.05,1.3,.05,-.35,1.25,.15),box(.06,.6,.06,-.38,1.25,.22)]),0x5a3a1a]],
  xbow:[...inf(),[mergeGeo([sph(.19,0,1.76,0,true),cyl(.32,.04,0,1.8,0)]),STEEL],[mergeGeo([box(.08,.08,.75,.1,1.25,.35),box(.7,.05,.05,.1,1.25,.68)]),0x5a3a1a]],
  knight:[...horse(true),[box(.5,.7,.35,0,1.95,-.1),STEEL],[cyl(.19,.38,0,2.5,-.1),STEEL],[box(.5,.6,.07,-.32,1.95,.05),SH],[box(.07,.07,3.6,.3,2.05,.9),WOOD]],
  hasb:[...horse(false),[box(.5,.7,.35,0,1.95,-.1),SIDE],[sph(.16,0,2.48,-.1),SKIN],[mergeGeo([sph(.18,0,2.5,-.1,true),cone(.18,.3,0,2.75,-.1)]),LEATHER],[mergeGeo([box(.05,1.2,.05,-.35,2.1,.05),box(.06,.55,.06,-.38,2.1,.12)]),0x5a3a1a]],
  gen:[...horse(true),[box(.52,.72,.36,0,1.95,-.1),STEEL],[mergeGeo([sph(.19,0,2.5,-.1,true),cone(.19,.4,0,2.82,-.1)]),0xd4af37],[box(.6,.9,.06,0,1.85,-.32),SIDE],[cyl(.03,3.2,-.3,2.8,-.4),WOOD],[box(.04,.6,.9,-.3,4.0,-.85),SH]],
 };
}
export const SIDECOL={p:0xb3261e,e:0x2649a8},SHCOL={p:0xd8a63a,e:0xc9c9c9};
export function initScene(){
 if(typeof THREE==='undefined')return false;
 const wrap=$('b3d');
 const R=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 if(!R.getContext())return false;
 R.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
 wrap.appendChild(R.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xa9c8e0);scene.fog=new THREE.Fog(0xa9c8e0,140,330);
 const camera=new THREE.PerspectiveCamera(50,1,0.5,900);
 scene.add(new THREE.HemisphereLight(0xeaf3ff,0x4d5a30,0.85));
 const sun=new THREE.DirectionalLight(0xfff0d0,0.85);sun.position.set(60,110,40);scene.add(sun);
 S3={R,scene,camera,cam:{tx:0,tz:B.playerSide?30:0,dist:95,yaw:0,pitch:0.75},meshes:{},banners:new Map(),rings:new Map(),markers:[],arrows:[],corpseN:0,t:0,ptr:new Map()};
 // ground
 const g=new THREE.PlaneGeometry(420,420,110,110);g.rotateX(-Math.PI/2);
 const pos=g.attributes.position,cols=new Float32Array(pos.count*3);
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,Hgt(x,z));
  const n=Math.sin(x*0.3)*Math.cos(z*0.27)*0.5+Math.sin(x*0.07+z*0.11)*0.5;
  let c=[0.36+n*0.05,0.5+n*0.06,0.22+n*0.03];
  const inF=B.forests.some(f=>Math.hypot(x-f.x,z-f.z)<f.r+2);if(inF)c=[0.24,0.36,0.15];
  const hh=Hgt(x,z);if(hh>6){const k=Math.min(1,(hh-6)/14);c=[c[0]*(1-k)+0.5*k,c[1]*(1-k)+0.46*k,c[2]*(1-k)+0.38*k]}
  cols[i*3]=c[0];cols[i*3+1]=c[1];cols[i*3+2]=c[2];
 }
 g.setAttribute('color',new THREE.BufferAttribute(cols,3));g.computeVertexNormals();
 scene.add(new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true})));
 // trees
 const trees=[];
 B.forests.forEach(f=>{const n=Math.round(f.r*f.r*0.16);for(let i=0;i<n;i++){const a=Math.random()*6.28,d=Math.sqrt(Math.random())*f.r;trees.push([f.x+Math.cos(a)*d,f.z+Math.sin(a)*d])}});
 for(let i=0;i<160;i++){let x=(Math.random()-.5)*400,z=(Math.random()-.5)*400;if(Math.abs(x)<100&&Math.abs(z)<115)continue;trees.push([x,z])}
 const trunkG=cyl(.3,2,0,1,0),crownG=new THREE.ConeGeometry(1.7,5,7);crownG.translate(0,4.3,0);
 const tr=new THREE.InstancedMesh(trunkG,new THREE.MeshLambertMaterial({color:0x5a4027}),trees.length);
 const cr=new THREE.InstancedMesh(crownG,new THREE.MeshLambertMaterial({color:0x2f5a2a}),trees.length);
 const dm=new THREE.Object3D();
 trees.forEach(([x,z],i)=>{dm.position.set(x,Hgt(x,z)-0.2,z);dm.rotation.set(0,Math.random()*6,0);const s=0.8+Math.random()*0.6;dm.scale.set(s,s*(0.9+Math.random()*0.4),s);dm.updateMatrix();tr.setMatrixAt(i,dm.matrix);cr.setMatrixAt(i,dm.matrix)});
 tr.frustumCulled=false;cr.frustumCulled=false;scene.add(tr,cr);
 // soldiers
 const parts=bodyParts();
 const capBy={};B.regs.forEach(r=>{capBy[r.t]=(capBy[r.t]||0)+r.figs.length});
 for(const t in capBy){
  S3.meshes[t]=parts[t].map(([geo,col])=>{
   const m=new THREE.InstancedMesh(geo,new THREE.MeshLambertMaterial({color:typeof col==='number'?col:0xffffff}),capBy[t]);
   m.userData.ck=col;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;
   if(typeof col!=='number'){const c=new THREE.Color(1,1,1);for(let i=0;i<capBy[t];i++)m.setColorAt(i,c)}
   scene.add(m);return m});
 }
 // corpses
 const cg=mergeGeo([box(.5,.28,1.5,0,.14,0),sph(.17,0,.17,.9)]);
 S3.corpses=new THREE.InstancedMesh(cg,new THREE.MeshLambertMaterial({color:0xffffff}),1500);S3.corpses.frustumCulled=false;{const c=new THREE.Color(1,1,1);for(let i=0;i<1500;i++)S3.corpses.setColorAt(i,c)}S3.corpses.count=0;scene.add(S3.corpses);
 // arrows
 S3.arrowM=new THREE.InstancedMesh(box(.06,.06,1.1),new THREE.MeshBasicMaterial({color:0x2a1c10}),500);S3.arrowM.count=0;S3.arrowM.frustumCulled=false;scene.add(S3.arrowM);
 S3.dm=dm;S3.col=new THREE.Color();S3.v=new THREE.Vector3();S3.ray=new THREE.Raycaster();S3.plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
 if(B.siege)buildSiege(scene);
 // banners & rings
 B.regs.forEach(r=>{
  const c=document.createElement('canvas');c.width=128;c.height=72;
  const tex=new THREE.CanvasTexture(c);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true}));
  sp.scale.set(7,3.94,1);sp.renderOrder=10;scene.add(sp);S3.banners.set(r,{c,tex,sp});
  const ring=new THREE.Mesh(new THREE.RingGeometry(7,7.8,32),new THREE.MeshBasicMaterial({color:0xffd84a,transparent:true,opacity:.85,depthTest:false,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.renderOrder=5;ring.visible=false;scene.add(ring);S3.rings.set(r,ring);
 });
 S3.cam.tz=14;
 bindInput(R.domElement);
 window.addEventListener('resize',onResize);
 return true;
}
export function cleanupScene(){
 if(!S3)return;
 cancelAnimationFrame(B&&B.raf);
 window.removeEventListener('resize',onResize);
 try{S3.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(o.material.map)o.material.map.dispose();o.material.dispose()}});
 S3.R.dispose();S3.R.forceContextLoss&&S3.R.forceContextLoss();S3.R.domElement.remove()}catch(e){}
 S3=null;
}
export function onResize(){
 if(!S3)return;const w=$('b3d').clientWidth,h=$('b3d').clientHeight;
 S3.R.setSize(w,h);S3.camera.aspect=w/h;S3.camera.updateProjectionMatrix();
}
export function updateCamera(){
 const c=S3.cam;c.pitch=Math.max(0.22,Math.min(1.42,c.pitch));c.dist=Math.max(18,Math.min(190,c.dist));
 c.tx=Math.max(-130,Math.min(130,c.tx));c.tz=Math.max(-130,Math.min(130,c.tz));
 const ty=Hgt(c.tx,c.tz);
 S3.camera.position.set(c.tx+Math.sin(c.yaw)*Math.cos(c.pitch)*c.dist,ty+Math.sin(c.pitch)*c.dist,c.tz+Math.cos(c.yaw)*Math.cos(c.pitch)*c.dist);
 const camY=S3.camera.position.y,gy=Hgt(S3.camera.position.x,S3.camera.position.z)+3;if(camY<gy)S3.camera.position.y=gy;
 S3.camera.lookAt(c.tx,ty,c.tz);
}
// ---------- input ----------
export function bindInput(el){
 el.style.touchAction='none';
 const P=S3.ptr;let tapStart=null,pinch=null;
 const pinchState=()=>{const a=[...P.values()];const dx=a[1].x-a[0].x,dy=a[1].y-a[0].y;return{d:Math.hypot(dx,dy),ang:Math.atan2(dy,dx),my:(a[0].y+a[1].y)/2}};
 el.addEventListener('pointerdown',e=>{el.setPointerCapture(e.pointerId);P.set(e.pointerId,{x:e.clientX,y:e.clientY,b:e.button});
  if(P.size===1)tapStart={x:e.clientX,y:e.clientY,t:performance.now(),moved:0};else{tapStart=null;pinch=pinchState()}});
 el.addEventListener('pointermove',e=>{const p=P.get(e.pointerId);if(!p)return;
  const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;const c=S3.cam;
  if(P.size===1){
   if(tapStart)tapStart.moved+=Math.abs(dx)+Math.abs(dy);
   if(p.b===2||e.shiftKey){c.yaw-=dx*0.006;c.pitch+=dy*0.004}
   else{const k=c.dist*0.0021*(600/Math.max(400,$('b3d').clientHeight));
    const rx=Math.cos(c.yaw),rz=-Math.sin(c.yaw),fx=-Math.sin(c.yaw),fz=-Math.cos(c.yaw);
    c.tx-=rx*dx*k;c.tz-=rz*dx*k;c.tx+=fx*dy*k;c.tz+=fz*dy*k;}
  } else if(P.size===2&&pinch){
   const s=pinchState();c.dist*=pinch.d/Math.max(10,s.d);c.yaw-=angWrap(s.ang-pinch.ang);c.pitch+=(s.my-pinch.my)*0.004;pinch=s;
  }});
 const up=e=>{
  if(P.size===1&&tapStart&&tapStart.moved<10&&performance.now()-tapStart.t<450&&e.button!==2)handleTap(e.clientX,e.clientY);
  P.delete(e.pointerId);if(P.size<2)pinch=null;if(P.size===0)tapStart=null;
 };
 el.addEventListener('pointerup',up);el.addEventListener('pointercancel',e=>{P.delete(e.pointerId);pinch=null;tapStart=null});
 el.addEventListener('wheel',e=>{e.preventDefault();S3.cam.dist*=e.deltaY>0?1.1:0.9},{passive:false});
 el.addEventListener('contextmenu',e=>e.preventDefault());
}
export function toScreen(x,y,z){const v=S3.v.set(x,y,z).project(S3.camera);const r=S3.R.domElement.getBoundingClientRect();return{x:(v.x+1)/2*r.width+r.left,y:(1-v.y)/2*r.height+r.top,ok:v.z<1}}
export function handleTap(cx,cy){
 if(!B||B.over)return;
 let best=null,bd=1e9;
 for(const r of B.regs){if(!alive(r))continue;const h=Hgt(r.x,r.z)+1.5;
  const s=toScreen(r.x,h,r.z);if(!s.ok)continue;const s2=toScreen(r.x+6,h,r.z);const rad=Math.max(34,Math.hypot(s2.x-s.x,s2.y-s.y));
  const b=toScreen(r.x,h+5.5,r.z);// banner
  const d=Math.min(Math.hypot(cx-s.x,cy-s.y),Math.hypot(cx-b.x,cy-b.y));if(d<rad&&d<bd){bd=d;best=r}}
 if(best&&best.side==='p'){if(best.routing)return;B.sel=new Set([best]);updateHud();return}
 const sel=[...B.sel].filter(r=>alive(r)&&!r.routing);
 if(best&&best.side==='e'){
  if(!sel.length){msg(uname(best.t,B.ef)+': '+Math.round(best.men)+' бойцов');return}
  sel.forEach(r=>r.order={type:'attack',tg:best});marker(best.x,best.z,0xff4433);return;
 }
 if(!sel.length)return;
 const rect=S3.R.domElement.getBoundingClientRect();
 const ndc=new THREE.Vector2((cx-rect.left)/rect.width*2-1,-((cy-rect.top)/rect.height)*2+1);
 S3.ray.setFromCamera(ndc,S3.camera);const hit=new THREE.Vector3();
 if(!S3.ray.ray.intersectPlane(S3.plane,hit))return;
 if(B.siege&&!B.siege.open&&Math.hypot(hit.x,hit.z-B.siege.W)<14){
  const rams=sel.filter(r=>isAttacker(r)&&r.body==='inf'&&!r.ranged);
  if(rams.length){rams.forEach(r=>r.order={type:'gate'});marker(0,B.siege.W,0xffaa33);msg('Бить ворота!');return}
 }
 const mx=sel.reduce((a,r)=>a+r.x,0)/sel.length,mz=sel.reduce((a,r)=>a+r.z,0)/sel.length;
 sel.forEach(r=>{r.order={type:'move',x:Math.max(-95,Math.min(95,hit.x+(r.x-mx))),z:Math.max(-FIELD-20,Math.min(FIELD+20,hit.z+(r.z-mz)))}});
 marker(hit.x,hit.z,0x6fd0ff);
}
export function marker(x,z,col){
 if(!S3)return;
 const m=new THREE.Mesh(new THREE.RingGeometry(1.5,2.3,24),new THREE.MeshBasicMaterial({color:col,transparent:true,depthTest:false,side:THREE.DoubleSide}));
 m.rotation.x=-Math.PI/2;m.position.set(x,Hgt(x,z)+0.3,z);m.renderOrder=6;S3.scene.add(m);S3.markers.push({m,life:1.2});
}
// ---------- fx ----------
export function fx3d(kind,a,b,dur){
 if(!S3)return;
 if(kind==='stone'){S3.stoneFly={sx:a.x,sz:a.z,ex:b.x,ez:b.z,t:0,dur};return}
 if(kind==='volley'){
  const n=Math.min(14,4+Math.ceil(a.figs.length/2));
  for(let i=0;i<n;i++){const f=a.figs[Math.floor(Math.random()*a.figs.length)]||a;
   const tf=b.figs[Math.floor(Math.random()*b.figs.length)]||b;
   if(S3.arrows.length<480)S3.arrows.push({sx:f.x,sz:f.z,sy:Hgt(f.x,f.z)+(a.tower?9:1.6),ex:tf.x+(Math.random()-.5)*3,ez:tf.z+(Math.random()-.5)*3,t:-Math.random()*0.25,dur:dur*(0.92+Math.random()*0.16),hgt:6+rdist(a,b)*0.22})}
 }
}
export function addCorpse(f,r){
 if(!S3||S3.corpseN>=1500)return;
 const dm=S3.dm,sc=r.body==='inf'?1:1.6;
 dm.position.set(f.x,Hgt(f.x,f.z)+0.02,f.z);dm.rotation.set(0,Math.random()*6.28,0);dm.scale.set(sc,sc*0.8,sc);dm.updateMatrix();
 S3.corpses.setMatrixAt(S3.corpseN,dm.matrix);
 S3.col.setHex(r.body==='inf'?SIDECOL[r.side]:0x5a3e24).multiplyScalar(0.6);
 S3.corpses.setColorAt(S3.corpseN,S3.col);
 S3.corpseN++;S3.corpses.count=S3.corpseN;S3.corpses.instanceMatrix.needsUpdate=true;if(S3.corpses.instanceColor)S3.corpses.instanceColor.needsUpdate=true;
}
// ---------- per-frame visuals ----------
export function syncFigures(dt){
 const t=S3.t;const counters={};
 for(const k in S3.meshes)counters[k]=0;
 const dm=S3.dm;
 for(const r of B.regs){
  // figure count follows men
  const want=r.dead||r.fled?0:Math.max(1,Math.ceil(r.men/100*FIGMAX[r.body]));
  while(r.figs.length>want){
   const fc=formation(r).cols;const i=r.dead||r.fled?0:Math.floor(Math.random()*Math.min(fc,r.figs.length));
   const f=r.figs.splice(i,1)[0];if(!r.fled)addCorpse(f,r);
  }
  if(!r.figs.length)continue;
  const F=formation(r);const n=r.figs.length;const rows=Math.ceil(n/F.cols);
  const fighting=r.state==='fight'||r.state==='bash',moving=r.state==='move'||r.state==='rout';
  const S=B.siege,onWall=S&&r.ranged&&!isAttacker(r)&&Math.abs(r.z-S.W)<7&&wallSide(r.z)===S.defSign;
  const climbK=S&&r.climb>0?Math.min(1,r.climb/S.climbT):0;
  const sa=Math.sin(r.face),ca=Math.cos(r.face);
  const meshes=S3.meshes[r.t];
  for(let i=0;i<n;i++){
   const f=r.figs[i];
   const row=Math.floor(i/F.cols),inRow=row<rows-1?F.cols:n-row*F.cols,col=i%F.cols;
   let lx=(col-(inRow-1)/2)*F.sx,lz=((rows-1)/2-row)*F.sz*(fighting?0.75:1);
   if(F.wedge){ // triangle, point towards the enemy
    let wr=0,c=i;while(c>wr){c-=wr+1;wr++}
    let wrows=0,tot=0;while(tot<n){wrows++;tot+=wrows}
    lx=(c-wr/2)*F.sx;lz=((wrows-1)/2-wr)*F.sz;
   }
   if(r.routing){lx*=2.3;lz*=2;lx+=Math.sin(f.ph*7)*3;lz+=Math.cos(f.ph*5)*3}
   if(fighting){lx+=Math.sin(t*1.3+f.ph)*0.35;lz+=Math.sin(t*1.1+f.ph*2)*0.3+(row===0?0.8:0)}
   const sx=r.x+lx*ca+lz*sa,sz=r.z-lx*sa+lz*ca;
   const k=Math.min(1,dt*(r.routing?2.5:3.5));
   f.x+=(sx-f.x)*k;f.z+=(sz-f.z)*k;
   let y=Hgt(f.x,f.z)+(onWall?4.6:0)+(climbK&&row<2?climbK*5.2:0),fa=r.face+f.j;
   if(moving)y+=Math.abs(Math.sin(t*(r.cav?11:9)+f.ph))*(r.cav?0.25:0.12);
   let lunge=0;
   if(fighting&&row<2){lunge=Math.max(0,Math.sin(t*7+f.ph*3))*0.45;fa+=Math.sin(t*5+f.ph)*0.25}
   dm.position.set(f.x+Math.sin(fa)*lunge,y,f.z+Math.cos(fa)*lunge);
   dm.rotation.set(0,fa,0);dm.scale.set(1,1,1);dm.updateMatrix();
   const idx=counters[r.t]++;
   for(const m of meshes){m.setMatrixAt(idx,dm.matrix);
    const ck=m.userData.ck;if(ck==='side'||ck==='shield'){S3.col.setHex(ck==='side'?SIDECOL[r.side]:SHCOL[r.side]);if(r.routing)S3.col.multiplyScalar(0.7);m.setColorAt(idx,S3.col)}}
  }
 }
 for(const k in S3.meshes)for(const m of S3.meshes[k]){m.count=counters[k];m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true}
}
export function drawBanner(r,bn){
 const sel=B.sel.has(r);const key=[Math.round(r.men),Math.round(r.morale/5),r.routing,sel,r.dead||r.fled].join('|');
 if(key===r.bannerKey)return;r.bannerKey=key;
 const c=bn.c,x=c.getContext('2d');x.clearRect(0,0,128,72);
 const col=r.side==='p'?'#b3261e':'#2649a8';
 x.fillStyle='rgba(20,14,10,.78)';x.strokeStyle=sel?'#ffd84a':col;x.lineWidth=sel?6:4;
 rr(x,4,4,120,52,10);x.fill();x.stroke();
 x.font='30px serif';x.textAlign='center';x.textBaseline='middle';x.fillText(r.routing?'🏳️':UT[r.t].i,30,30);
 x.fillStyle='#000';x.fillRect(56,16,60,9);x.fillRect(56,33,60,7);
 x.fillStyle=r.men>50?'#7bc96f':r.men>25?'#e0b34a':'#e05a4a';x.fillRect(56,16,60*Math.max(0,r.men)/100,9);
 x.fillStyle='#e8c35a';x.fillRect(56,33,60*Math.max(0,r.morale)/100,7);
 x.fillStyle=col;x.beginPath();x.moveTo(56,56);x.lineTo(72,56);x.lineTo(64,70);x.fill();
 bn.tex.needsUpdate=true;
}
export function rr(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath()}
export function syncOverlays(dt){
 for(const [r,bn] of S3.banners){
  const vis=alive(r)&&r.figs.length>0;bn.sp.visible=vis;
  const ring=S3.rings.get(r);ring.visible=vis&&B.sel.has(r);
  if(!vis)continue;
  const ox=r.figs.reduce((a,f)=>a+f.x,0)/r.figs.length,oz=r.figs.reduce((a,f)=>a+f.z,0)/r.figs.length;
  bn.sp.position.set(ox,Hgt(ox,oz)+(r.body==='cav'?6.5:5),oz);
  const sc=Math.max(0.75,Math.min(1.6,S3.cam.dist/95));bn.sp.scale.set(7*sc,3.94*sc,1);
  drawBanner(r,bn);
  if(ring.visible){ring.position.set(r.x,Hgt(r.x,r.z)+0.4,r.z);ring.material.opacity=0.6+0.3*Math.sin(S3.t*5)}
 }
 S3.markers=S3.markers.filter(k=>{k.life-=dt;k.m.material.opacity=Math.max(0,k.life);k.m.scale.setScalar(1+(1.2-k.life)*0.8);if(k.life<=0){S3.scene.remove(k.m);k.m.geometry.dispose();k.m.material.dispose();return false}return true});
 // arrows
 const dm=S3.dm;let n=0;
 S3.arrows=S3.arrows.filter(a=>a.t<a.dur);
 for(const a of S3.arrows){
  a.t+=dt*(B.paused?0:B.speed);if(a.t<0)continue;
  const p=Math.min(1,a.t/a.dur),p2=Math.min(1,p+0.02);
  const ey=Hgt(a.ex,a.ez)+0.5;
  const P=(q)=>[a.sx+(a.ex-a.sx)*q,a.sy+(ey-a.sy)*q+Math.sin(Math.PI*q)*a.hgt,a.sz+(a.ez-a.sz)*q];
  const c=P(p),d=P(p2);dm.position.set(c[0],c[1],c[2]);dm.scale.set(1,1,1);dm.lookAt(d[0],d[1],d[2]);dm.updateMatrix();
  S3.arrowM.setMatrixAt(n++,dm.matrix);
 }
 S3.arrowM.count=n;S3.arrowM.instanceMatrix.needsUpdate=true;
 if(B.siege)syncSiege();
}
export function loop(now){
 if(!B||!S3)return;
 const rdt=Math.min(0.05,(now-B.last)/1000);B.last=now;S3.t+=rdt;
 if(!B.paused&&!B.over){const st=rdt*B.speed;const steps=Math.ceil(st/0.034);for(let i=0;i<steps&&!B.over;i++)simStep(st/steps)}
 B.msgs.forEach(m=>m.life-=rdt);B.msgs=B.msgs.filter(m=>m.life>0);
 updateCamera();syncFigures(rdt);syncOverlays(rdt);
 S3.R.render(S3.scene,S3.camera);
 B.hudT=(B.hudT||0)-rdt;if(B.hudT<=0){B.hudT=0.25;updateHud()}
 if(B&&S3)B.raf=requestAnimationFrame(loop);
}

// ---------- siege scenery: wall with crenellations, towers, gate, a town behind, ladders ----------
function buildSiege(scene){
 const S=B.siege,W=S.W,ds=S.defSign;
 const stone=new THREE.MeshLambertMaterial({color:S.wall>1?0x9a9286:0x7a5a3a});
 const segs=[];for(let x=-124;x<=124;x+=8)if(Math.abs(x)>8)segs.push(x);
 const seg=new THREE.InstancedMesh(box(8.3,6,3,0,3,0),stone,segs.length);
 const mer=new THREE.InstancedMesh(box(1.1,1.1,0.9,0,0,0),stone,segs.length*4);
 const dm=S3.dm;let k=0;
 segs.forEach((x,i)=>{const y=Hgt(x,W)-0.6;dm.position.set(x,y,W);dm.rotation.set(0,0,0);dm.scale.set(1,1,1);dm.updateMatrix();seg.setMatrixAt(i,dm.matrix);
  for(let j=0;j<4;j++){dm.position.set(x-3+j*2,y+6.5,W-ds*1.1);dm.updateMatrix();mer.setMatrixAt(k++,dm.matrix)}});
 seg.frustumCulled=mer.frustumCulled=false;scene.add(seg,mer);
 const tw=new THREE.InstancedMesh(box(5.5,10,5.5,0,5,0),stone,S.towers.length);
 const roof=new THREE.InstancedMesh((()=>{const g=new THREE.ConeGeometry(4.4,3.5,4);g.rotateY(Math.PI/4);g.translate(0,11.7,0);return g})(),new THREE.MeshLambertMaterial({color:0x6b2f22}),S.towers.length);
 S.towers.forEach((t,i)=>{dm.position.set(t.x,Hgt(t.x,W)-0.6,W);dm.updateMatrix();tw.setMatrixAt(i,dm.matrix);roof.setMatrixAt(i,dm.matrix)});
 tw.frustumCulled=roof.frustumCulled=false;scene.add(tw,roof);
 // the gate and the arch above it
 const gy=Hgt(0,W)-0.6;
 S3.gate=new THREE.Mesh(box(12,5.5,1.4,0,2.75,0),new THREE.MeshLambertMaterial({color:0x5a3a1e}));S3.gate.position.set(0,gy,W);scene.add(S3.gate);
 const arch=new THREE.Mesh(box(13,1.6,3.2,0,6.6,0),stone);arch.position.set(0,gy,W);scene.add(arch);
 // a small town behind the wall
 const N=22,hb=new THREE.InstancedMesh(box(4,3,4,0,1.5,0),new THREE.MeshLambertMaterial({color:0xd8c9a8}),N);
 const hr=new THREE.InstancedMesh((()=>{const g=new THREE.ConeGeometry(3.4,2.6,4);g.rotateY(Math.PI/4);g.translate(0,4.3,0);return g})(),new THREE.MeshLambertMaterial({color:0x8a3b26}),N);
 let seed=7;const rr=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
 for(let i=0;i<N;i++){const x=(rr()-.5)*170,z=W+ds*(30+rr()*40);dm.position.set(x,Hgt(x,z),z);dm.rotation.set(0,rr()*3,0);dm.updateMatrix();hb.setMatrixAt(i,dm.matrix);hr.setMatrixAt(i,dm.matrix)}
 dm.rotation.set(0,0,0);hb.frustumCulled=hr.frustumCulled=false;scene.add(hb,hr);
 // ladders, placed each frame where regiments climb
 S3.ladders=new THREE.InstancedMesh(mergeGeo([box(.15,7,.15,-.45,3.5,0),box(.15,7,.15,.45,3.5,0),...[1,2.2,3.4,4.6,5.8].map(y=>box(.9,.1,.1,0,y,0))]),new THREE.MeshLambertMaterial({color:0x7a5a34}),60);
 S3.ladders.count=0;S3.ladders.frustumCulled=false;scene.add(S3.ladders);
 // siege engines
 const wood=new THREE.MeshLambertMaterial({color:0x6e4b2a}),hide=new THREE.MeshLambertMaterial({color:0x8a6a44});
 if(S.tw){
  S3.tw=new THREE.Mesh(mergeGeo([box(6,13,6,0,6.5,0),box(6.6,.6,6.6,0,13.2,0),...[-2.4,2.4].map(x=>box(.8,1.2,1.2,x,.6,-2.4)),...[-2.4,2.4].map(x=>box(.8,1.2,1.2,x,.6,2.4))]),hide);
  S3.twBridge=new THREE.Mesh(box(4,.4,5,0,0,0),wood);S3.twBridge.visible=false;
  scene.add(S3.tw,S3.twBridge);
 }
 if(S.tb){
  const g=new THREE.Group();
  g.add(new THREE.Mesh(mergeGeo([box(5,1,7,0,.5,0),box(.8,7,.8,-1.8,4,0),box(.8,7,.8,1.8,4,0),box(4.4,.6,.6,0,7.3,0)]),wood));
  S3.tbArm=new THREE.Group();S3.tbArm.position.set(0,7.3,0);
  S3.tbArm.add(new THREE.Mesh(mergeGeo([box(.5,.5,12,0,0,2.5),box(1.6,1.6,1.6,0,-.8,-3.2)]),wood));
  g.add(S3.tbArm);g.position.set(S.tb.x,Hgt(S.tb.x,S.tb.z),S.tb.z);g.rotation.y=S.defSign>0?0:Math.PI;
  S3.tb=g;scene.add(g);
 }
 S3.stone=new THREE.Mesh(new THREE.SphereGeometry(0.9,8,6),new THREE.MeshLambertMaterial({color:0x777066}));S3.stone.visible=false;scene.add(S3.stone);
 // wall towers knocked down by stones are hidden
 S3.wallTowers=[tw,roof];
}
function syncSiege(){
 const S=B.siege,W=S.W,dm=S3.dm;
 if(S.open&&S3.gate.visible){S3.gate.visible=false;
  const deb=new THREE.InstancedMesh(box(2.2,.4,1,0,.2,0),new THREE.MeshLambertMaterial({color:0x4a2f17}),8);
  for(let i=0;i<8;i++){dm.position.set((i-4)*1.5,Hgt(0,W),W+(i%3-1)*1.5);dm.rotation.set(0,i*0.9,0);dm.updateMatrix();deb.setMatrixAt(i,dm.matrix)}
  dm.rotation.set(0,0,0);S3.scene.add(deb)}
 let n=0;
 if(S3.tw){const t=S.tw;S3.tw.visible=!t.dead;S3.tw.position.set(t.x,Hgt(t.x,t.z)-0.3,t.z);
  S3.twBridge.visible=t.docked&&!t.dead;S3.twBridge.position.set(t.x,Hgt(t.x,W)+6.3,W-S.defSign*0.5)}
 if(S3.tb)S3.tbArm.rotation.x=(S.defSign>0?1:-1)*(S.tb.throwT>0?-1.1*S.tb.throwT:0.9);
 const sf=S3.stoneFly;
 if(sf){sf.t+=(B.paused?0:B.speed)/60;const p=Math.min(1,sf.t/sf.dur);
  S3.stone.visible=p<1;S3.stone.position.set(sf.sx+(sf.ex-sf.sx)*p,Hgt(sf.sx,sf.sz)+9+(Hgt(sf.ex,sf.ez)+5-Hgt(sf.sx,sf.sz)-9)*p+Math.sin(Math.PI*p)*22,sf.sz+(sf.ez-sf.sz)*p);
  if(p>=1)S3.stoneFly=null}
 if(S3.wallTowers&&S.towers.some(t=>t.dead&&!t.hidden)){
  S.towers.forEach((t,i)=>{if(t.dead&&!t.hidden){t.hidden=true;dm.position.set(t.x,-50,W);dm.scale.set(0.01,0.01,0.01);dm.updateMatrix();
   for(const m of S3.wallTowers){m.setMatrixAt(i,dm.matrix);m.instanceMatrix.needsUpdate=true}dm.scale.set(1,1,1)}})}
 for(const r of B.regs){if(!(r.climb>0)||!alive(r)||r.state==='tower')continue;
  const s=wallSide(r.z);
  for(const dx of [-3,0,3]){if(n>=60)break;dm.position.set(r.x+dx,Hgt(r.x,W)-0.4,W+s*2.2);dm.rotation.set(-s*0.32,0,0);dm.scale.set(1,1,1);dm.updateMatrix();S3.ladders.setMatrixAt(n++,dm.matrix)}}
 dm.rotation.set(0,0,0);
 S3.ladders.count=n;S3.ladders.instanceMatrix.needsUpdate=true;
}
