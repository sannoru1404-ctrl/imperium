class V3{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}project(){this.x=0.1;this.y=0.1;this.z=0.5;return this}setScalar(s){return this.set(s,s,s)}}
class V2{constructor(x,y){this.x=x;this.y=y}}
class Color{constructor(){}set(){return this}setHex(){return this}multiplyScalar(){return this}}
class BA{constructor(a,s){this.array=a;this.itemSize=s;this.count=a.length/s}getX(i){return this.array[i*3]}getZ(i){return this.array[i*3+2]}setY(i,v){if(typeof v!=='number'||isNaN(v))throw Error('NaN Y');this.array[i*3+1]=v}setUsage(){return this}}
class BG{constructor(n=24){this.attributes={};this.index={};this.setAttribute('position',new BA(new Float32Array(n*3),3));this.setAttribute('normal',new BA(new Float32Array(n*3),3))}
 setAttribute(k,v){this.attributes[k]=v;return this}translate(){return this}rotateX(){return this}toNonIndexed(){const g=new BG(36);g.index=null;return g}computeVertexNormals(){}dispose(){}}
class BufferGeometry extends BG{constructor(){super(0);this.attributes={};this.index=null}}
class PlaneGeometry extends BG{constructor(w,h,a,b){super((a+1)*(b+1));const p=this.attributes.position.array;let i=0;for(let y=0;y<=b;y++)for(let x=0;x<=a;x++){p[i*3]=-w/2+x*w/a;p[i*3+2]=-h/2+y*h/b;i++}}}
class Mat{constructor(o={}){Object.assign(this,o)}dispose(){}}
class O3{constructor(){this.position=new V3();this.rotation=new V3();this.scale=new V3(1,1,1);this.matrix={};this.children=[];this.userData={};this.visible=true}updateMatrix(){}lookAt(x,y,z){if([x,y,z].some(v=>typeof v!=='number'||isNaN(v)))throw Error('lookAt NaN')}add(...o){this.children.push(...o)}remove(o){this.children=this.children.filter(c=>c!==o)}traverse(f){f(this);this.children.forEach(c=>c.traverse?c.traverse(f):f(c))}}
class Mesh extends O3{constructor(g,m){super();this.geometry=g;this.material=m}}
class IM extends Mesh{constructor(g,m,c){super(g,m);this.cap=c;this.count=c;this.instanceMatrix={setUsage(){},needsUpdate:false};this.instanceColor=null}
 setMatrixAt(i){if(i>=this.cap||i<0)throw Error('instance overflow '+i+'/'+this.cap)}setColorAt(i){if(i>=this.cap)throw Error('color overflow');this.instanceColor=this.instanceColor||{}}}
const mkEl=()=>{const L={};return{style:{},L,addEventListener:(k,f)=>L[k]=f,setPointerCapture(){},getBoundingClientRect:()=>({left:0,top:0,width:400,height:700}),remove(){}}};
global.THREE={Vector3:V3,Vector2:V2,Color,BufferAttribute:BA,BufferGeometry,BoxGeometry:BG,SphereGeometry:BG,CylinderGeometry:BG,ConeGeometry:BG,RingGeometry:BG,PlaneGeometry,
 MeshLambertMaterial:Mat,MeshBasicMaterial:Mat,SpriteMaterial:Mat,Mesh,InstancedMesh:IM,Sprite:class extends O3{constructor(m){super();this.material=m}},Object3D:O3,Scene:O3,
 Fog:class{},HemisphereLight:O3,DirectionalLight:O3,PerspectiveCamera:class extends O3{updateProjectionMatrix(){}},CanvasTexture:class{dispose(){}},
 WebGLRenderer:class{constructor(){this.domElement=mkEl();global.CANVAS=this.domElement}getContext(){return{}}setPixelRatio(){}setSize(){}render(){}dispose(){}forceContextLoss(){}},
 Raycaster:class{constructor(){this.ray={intersectPlane:(p,t)=>t.set(10,0,5)}}setFromCamera(){}},Plane:class{},DynamicDrawUsage:1,DoubleSide:2};
