// Static, decor-only ports of RLH external vehicles.
// Source silhouettes: RLH Defender 110 V570 and FPTL SIDES V396.
// Cockpits, audio, wheel dynamics, physics, network assets and interaction
// bindings are deliberately omitted. One merged mesh per source material.
import {Assembly,bevelBox,matrix,limb} from './geo.js';
import {createRLHCivilCarSource} from './rlh-civil-car-v750.js';
export const RLH_FLEET_REV='RLH-static-outdoors-V570-V396-V750-2026-11';
const kinds=new Set(['defender','fptl','civil']);
const defaultMat=(T,color,metalness=.5,roughness=.64)=>new T.MeshStandardMaterial({color,metalness,roughness});
function palette(T,M){
 return {
  red:M.red||defaultMat(T,0x9e222c),white:M.white||defaultMat(T,0xd9dad8,.15),
  yellow:M.yellow||defaultMat(T,0xbca035),steel:M.steel||defaultMat(T,0x848e93,.78,.4),
  body:M.paintedMetal||defaultMat(T,0x555c65),dark:M.dark||defaultMat(T,0x202a31),
  black:M.black||defaultMat(T,0x111519,.1,.9),
  glass:M.glass||defaultMat(T,0x41545c,.2,.18),
  light:M.cyan||M.white||defaultMat(T,0xbcd9e5,.08,.18),
  rear:M.redGlow||M.red||defaultMat(T,0x9f1f2a)
 };
}
function builder(T,parent,M,low,name){
 const out=new T.Group();out.name=name;parent.add(out);
 const a=new Assembly(), stats={parts:0,batches:0,vertices:0};
 const put=(g,mat,mat4=null)=>{
  a.add(g,mat,mat4,!low);g.dispose();stats.parts++;
 };
 const box=(m,size,pos,round=.015,rot=[0,0,0])=>{
  const r=Math.min(round,...size.map(v=>v*.20));put(r?bevelBox(...size,r,low?1:2):new T.BoxGeometry(...size),m,matrix(pos,rot));
 };
 const cyl=(m,r,h,pos,rot=[0,0,0])=>put(new T.CylinderGeometry(r,r,h,low?10:20),m,matrix(pos,rot));
 const ring=(m,r,t,pos,rot=[0,0,0],arc=Math.PI*2)=>put(new T.TorusGeometry(r,t,low?4:6,low?14:28,arc),m,matrix(pos,rot));
 const rod=(m,start,end,r=.022)=>put(limb(start,end,r,r,low?6:12),m);
 const profile=(m,points,width,offset=[0,0,0],depth=.055)=>{
  const shape=new T.Shape();
  points.forEach(([z,y],i)=>i?shape.lineTo(z,y):shape.moveTo(z,y));
  shape.closePath();
  const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1,curveSegments:low?4:9});
  g.rotateY(Math.PI/2);g.translate(offset[0],offset[1],offset[2]);
  put(g,m);
 };
 function wheels(zs,xs,rad){
  for(const z of zs)for(const side of [-1,1]){
   const x=side*xs;
   cyl(M.black,rad,.22,[x,rad,z],[0,0,Math.PI/2]);
   cyl(M.steel,rad*.65,.024,[x+side*.125,rad,z],[0,0,Math.PI/2]);
   cyl(M.dark,rad*.17,.035,[x+side*.145,rad,z],[0,0,Math.PI/2]);
   if(!low)for(let i=0;i<8;i++){
    const t=Math.PI*2*i/8;
    cyl(M.steel,.016,.02,[x+side*.16,rad+Math.cos(t)*rad*.39,z+Math.sin(t)*rad*.39],[0,0,Math.PI/2]);
   }
   ring(M.dark,rad*.86,.026,[x+side*.14,rad,z],[0,Math.PI/2,0]);
  }
 }
 function defender(){
  // Exterior dimensions, wheelbase and side profile track the RLH V570 build.
  box(M.dark,[1.62,.12,4.14],[0,.48,0]);
  for(const x of [-.56,.56])box(M.steel,[.09,.15,3.9],[x,.43,0]);
  wheels([-1.4,1.4],.93,.44);
  for(const side of [-1,1]){
   const x=side*.89;
   // Real cut-out wheel arches on front and rear quarter panels.
   for(const zc of [-1.4,1.4]){
    const start=zc-0.78,end=zc+.78;
    const outline=[[start,.72],[zc-.54,.72]];
    for(let k=0;k<=12;k++){
     const theta=Math.PI-k*Math.PI/12;
     outline.push([zc+.54*Math.cos(theta),.72+.54*Math.sin(theta)]);
    }
    outline.push([end,.72],[end,1.30],[start,1.30]);
    profile(M.red,outline, .066,[x,0,0],.065);
    ring(M.black,.54,.035,[side*.95,.72,zc],[0,Math.PI/2,0],Math.PI);
   }
   box(M.red,[.06,.60,1.32],[x,1.08,-.32],.012);
   box(M.red,[.06,.60,.88],[x,1.08,.71],.012);
   box(M.yellow,[.014,.06,3.02],[side*.927,.95,-.15],.002);
   for(const z of [-.80,.51]){
    box(M.black,[.027,.039,.20],[side*.932,1.31,z],.004);
    for(const y of [1.07,1.47])box(M.steel,[.035,.065,.075],[side*.940,y,z-.28],.004);
   }
   for(const z of [-.35,.75,1.6]){
    box(M.glass,[.024,.64,z===1.6?.70:.72],[side*.88,1.72,z],.007);
    box(M.dark,[.028,.04,.79],[side*.894,2.06,z],.003);
   }
   rod(M.red,[x,1.35,-1.06],[x,2.08,-.85],.034);
   for(const z of [.24,1.12,2.06])rod(M.red,[x,1.35,z],[x,2.12,z],.032);
   box(M.black,[.16,.08,.99],[side*.97,.63,-.42],.009);
   // Door mirror and emergency snorkel remain fixed for scenery.
   box(M.dark,[.14,.21,.18],[side*1.11,1.58,-.92],.019);
  }
  box(M.red,[1.72,.17,1.17],[0,1.26,-1.59],.026);
  box(M.red,[1.75,.50,.14],[0,1.03,-2.14],.035);
  box(M.black,[.87,.38,.06],[0,1.04,-2.24],.009);
  for(let k=0;k<8;k++)box(M.steel,[.78,.012,.026],[0,.91+k*.040,-2.273],.002);
  for(const x of [-.65,.65]){
   cyl(M.dark,.155,.045,[x,1.08,-2.25],[Math.PI/2,0,0]);
   cyl(M.light,.121,.05,[x,1.08,-2.278],[Math.PI/2,0,0]);
  }
  box(M.black,[1.97,.16,.25],[0,.69,-2.29],.029);
  box(M.white,[1.81,.13,3.07],[0,2.13,.59],.047);
  box(M.glass,[1.65,.66,.019],[0,1.72,-.96],.004,[.29,0,0]);
  box(M.red,[1.67,.57,.08],[0,1.03,2.10],.035);
  box(M.glass,[1.50,.54,.024],[0,1.75,2.154],.005);
  box(M.black,[1.91,.15,.18],[0,.67,2.21],.017);
  // Roof rack, spare wheel, snorkel, skid plate.
  for(const x of [-.73,.73]){
   rod(M.steel,[x,2.22,-.58],[x,2.22,1.9],.024);
   for(const z of [-.5,.65,1.8])rod(M.steel,[x,2.17,z],[x,2.37,z],.016);
  }
  for(let k=0;k<8;k++){const z=-.48+k*.3;rod(M.steel,[-.73,2.25,z],[.73,2.25,z],.016);}
  rod(M.dark,[.86,1.32,-1.52],[1.0,1.44,-1.03],.045);
  rod(M.dark,[1.0,1.44,-1.03],[.96,2.20,-.80],.045);
  box(M.dark,[.17,.11,.24],[.96,2.23,-.80],.015);
  cyl(M.black,.40,.16,[0,1.28,2.36],[0,0,Math.PI/2]);
  cyl(M.steel,.23,.022,[.095,1.28,2.36],[0,0,Math.PI/2]);
  box(M.black,[1.34,.09,.19],[0,2.30,-.65],.012);
  for(let i=0;i<6;i++)box(M.light,[.15,.045,.11],[-.50+i*.2,2.35,-.66],.009);
  for(const x of [-.74,.74])for(let i=0;i<3;i++)
   box(i===0?M.white:i===1?M.yellow:M.rear,[.12,.11,.025],[x,.91+i*.17,2.196],.006);
 }
 function fptl(){
  // FPTL exterior follows the original RLH V396 / FPT SIDES ~2.36×7.0×3.5m.
  for(const x of [-.60,.60])box(M.dark,[.14,.18,6.0],[x,.52,-.13]);
  for(const z of [-2.65,-1.2,.2,1.4,2.43])box(M.steel,[1.33,.07,.12],[0,.54,z]);
  wheels([-2.31,1.92],1.09,.49);
  box(M.red,[2.22,1.40,2.61],[0,2.02,-1.95],.07);
  box(M.red,[2.25,.75,.24],[0,1.66,-3.26],.075);
  box(M.black,[2.33,.48,.36],[0,1.08,-3.27],.035);
  box(M.dark,[1.56,.40,.05],[0,1.64,-3.47],.023);
  for(let k=0;k<6;k++)box(M.steel,[1.35,.021,.023],[0,1.51+k*.05,-3.50],.002);
  for(const side of [-1,1]){
   const x=side*1.115;
   box(M.black,[.085,.20,1.7],[x,1.02,-2.05],.008);
   box(M.glass,[.025,.57,1.48],[side*1.13,2.54,-2.0],.008);
   box(M.red,[.06,.90,1.12],[x,1.67,-2.0],.019);
   box(M.yellow,[.011,.09,1.2],[side*1.16,1.50,-2],.002);
   box(M.steel,[.26,.30,.30],[side*1.18,2.50,-3.01],.027);
   for(const z of [-2.3,-1.25])box(M.steel,[.11,.10,.14],[side*1.16,1.15,z],.008);
   box(M.black,[.42,.21,.10],[side*.76,1.18,-3.49],.028);
   box(M.light,[.37,.16,.018],[side*.76,1.18,-3.56],.018);
  }
  box(M.red,[2.29,.14,2.62],[0,3.02,-1.93],.061);
  box(M.glass,[2.07,.74,.022],[0,2.57,-3.23],.015,[.13,0,0]);
  for(const x of [-1.10,1.10])box(M.red,[.115,.98,.16],[x,2.57,-3.16],.035,[.12,0,0]);
  box(M.red,[2.23,1.70,3.57],[0,2.19,1.26],.045);
  box(M.red,[2.34,.18,3.86],[0,3.06,1.35],.026);
  for(const side of [-1,1]){
   // RLH FPTL signature: two yellow roller shutter faces, 24 ribs each.
   const x=side*1.187;
   box(M.black,[.055,1.68,3.55],[x,2.13,1.34],.011);
   for(let k=0;k<(low?12:24);k++)
    box(M.yellow,[.023,1.52/(low?12:24),3.49],[x+side*.035,1.43+(k+.5)*1.52/(low?12:24),1.36],.002);
   box(M.steel,[.052,.044,1.41],[x+side*.055,1.46,1.35],.005);
   for(const z of [-.44,2.91])box(M.red,[.11,1.69,.09],[side*1.19,2.14,z],.014);
   for(const z of [.28,2.55])box(M.black,[.33,.34,.52],[side*1.03,.94,z],.036);
  }
  // Roof ladder and fixed support rails.
  for(const x of [-.65,-.06])rod(M.steel,[x,3.34,-1.65],[x,3.34,2.83],.029);
  for(let k=0;k<15;k++)box(M.steel,[.67,.036,.045],[-.36,3.36,-1.58+k*.30],.006);
  for(const x of [-.89,.89])box(M.black,[.32,.055,.18],[x,3.17,-2.55],.009);
  for(const x of [-.89,.89])box(M.light,[.26,.041,.12],[x,3.22,-2.55],.007);
  // Rear pump: visible pressure gauges and two outlets, no simulated water.
  box(M.dark,[2.06,1.58,.08],[0,2.11,3.23],.009);
  box(M.steel,[2.36,.16,.35],[0,1.23,3.37],.014);
  for(const x of [-.40,.40]){
   cyl(M.steel,.16,.06,[x,2.56,3.31],[Math.PI/2,0,0]);
   cyl(M.black,.11,.016,[x,2.56,3.36],[Math.PI/2,0,0]);
   cyl(M.steel,.09,.21,[x,1.67,3.34],[Math.PI/2,0,0]);
   ring(M.yellow,.085,.013,[x,1.67,3.465]);
  }
  for(const x of [-.92,.92])box(M.rear,[.13,.22,.045],[x,1.28,3.46],.007);
  // Light, static hose reel: one ring per winding, no moving mechanism.
  for(let i=0;i<(low?3:7);i++)
   ring(M.yellow,.16+i*.016,.013,[-.35+i*.035,2.76,3.35],[0,Math.PI/2,0]);
 }
 if(M.kind==='defender')defender();
 else fptl();
 const meshes=a.build(out,{name:'RLH / non jouable / lots GPU statiques'});
 for(const item of a.items)item.geometry.dispose();
 a.items.length=0;
 stats.batches=meshes.length;
 stats.vertices=meshes.reduce((n,m)=>n+(m.geometry.attributes.position?.count||0),0);
 out.userData.staticVehicle={kind:M.kind,revision:RLH_FLEET_REV,nonPlayable:true,noControls:true,
  noRuntimePhysics:true,renderBatches:stats.batches,source:M.kind==='defender'?'RLH Defender V570':'RLH FPTL V396'};
 return out;
}
function batchSourceCar(T,source,low){
 source.updateMatrixWorld(true,true);
 const root=new T.Group(),a=new Assembly();root.name='RLH V750 / voiture civile statique';
 let parts=0;
 source.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.geometry||!mesh.material)return;
  a.add(mesh.geometry,mesh.material,mesh.matrixWorld,!low);parts++;
 });
 const meshes=a.build(root,{name:'RLH V750 / pièces fusionnées par matériau'});
 for(const it of a.items)it.geometry.dispose();a.items.length=0;
 root.userData.staticVehicle={kind:'civil',revision:RLH_FLEET_REV,nonPlayable:true,
  noControls:true,noRuntimePhysics:true,source:'RLH civil-car V750 — body profiles unchanged',
  sourceMeshes:parts,renderBatches:meshes.length};
 return root;
}
export function createRLHStaticVehicle(T,kind,{low=false,M={},type='berline',color=0x626d78}={}){
 if(!kinds.has(kind))throw Error('Unsupported RLH static vehicle: '+kind);
 if(kind==='civil')return batchSourceCar(T,createRLHCivilCarSource(T,{type,color,seed:2}),low);
 const P={...palette(T,M),kind};
 return builder(T,new T.Group(),P,low,kind).children[0];
}
