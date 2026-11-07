import {Assembly,bevelBox,matrix,limb} from './geo.js';
// Shared physical energy supplies. Templates share geometry/materials across drops;
// no per-pickup lights, shader compilation, canvas upload or particles per frame.
const pools=new WeakMap();
export function createPowerKit(T,{webgpu=false,accent=0xff6fb4,low=false}={}){
 let pool=pools.get(T);if(!pool){pool=new Map();pools.set(T,pool);}const key=[webgpu,accent,low].join(':');if(pool.has(key))return pool.get(key);
 const data=new Uint8Array(64*64*4);let seed=417;
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=140+Math.sin(y*1.8)*24+(seed/4294967296)*28,i=(y*64+x)*4;data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;}
 const grain=new T.DataTexture(data,64,64);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.needsUpdate=true;
 const alloy=new T.MeshStandardMaterial({color:0x687e90,metalness:.83,roughness:.38,roughnessMap:grain}),edge=new T.MeshStandardMaterial({color:0xa8bdc9,metalness:.85,roughness:.27,roughnessMap:grain}),dark=new T.MeshStandardMaterial({color:0x101b28,metalness:.35,roughness:.72,roughnessMap:grain}),ceramic=new T.MeshStandardMaterial({color:0xd5e0df,metalness:.18,roughness:.43}),glass=new T.MeshStandardMaterial({color:0x9ce6f3,metalness:.08,roughness:.16,transparent:true,opacity:.2,depthWrite:false});
 const time=webgpu&&T.TSL?T.TSL.uniform(0):{value:0};
 function glow(color){
  if(webgpu&&T.MeshStandardNodeMaterial&&T.TSL){const m=new T.MeshStandardNodeMaterial({color,metalness:.05,roughness:.34});const {sin,positionLocal,color:nodeColor}=T.TSL;const bands=sin(positionLocal.y.mul(39).sub(time.mul(3.2))).mul(.22).add(.85);m.emissiveNode=nodeColor(color).mul(bands);m.userData.nativePowerShader=true;return m;}
  return new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:1.05,roughness:.35,metalness:.08});
 }
 const cyan=glow(0x49dbff),pink=glow(accent),white=glow(0xc6efff);
 function buildToken(heal){
  const root=new T.Group(),a=new Assembly(),put=(g,m,p=[0,0,0],r=[0,0,0])=>{a.add(g,m,matrix(p,r),false);g.dispose();};
  const box=(s,p,m=alloy,r=[0,0,0])=>put(bevelBox(...s,Math.min(.018,Math.min(...s)*.18),1),m,p,r);
  const cylinder=(r1,r2,h,p,m=edge,segments=low?12:20)=>put(new T.CylinderGeometry(r1,r2,h,segments),m,p);
  if(heal){
   box([.43,.29,.19],[0,0,0],dark);box([.405,.26,.18],[0,0,.015],ceramic);box([.29,.20,.02],[0,0,.113],dark);
   box([.20,.045,.018],[0,0,.13],pink);box([.045,.19,.018],[0,0,.13],pink);
   for(const side of [-1,1]){box([.035,.13,.035],[side*.204,0,.10],edge);box([.026,.035,.14],[side*.16,-.147,0],dark);}
   box([.19,.025,.035],[0,.185,0],edge);for(const side of [-1,1])box([.025,.045,.035],[side*.083,.16,0],edge);
   for(let k=0;k<4;k++)box([.038,.012,.01],[-.07+k*.047,-.095,.126],cyan);
  }else{
   cylinder(.028,.028,.47,[0,0,0],dark);cylinder(.061,.061,.40,[0,0,0],cyan);
   for(const sy of [-1,1]){
    cylinder(.13,.117,.07,[0,sy*.245,0],alloy);cylinder(.099,.099,.025,[0,sy*.29,0],edge);cylinder(.041,.041,.035,[0,sy*.32,0],edge);
    cylinder(.119,.119,.017,[0,sy*.195,0],dark);
    for(let i=0;i<6;i++){const angle=i*Math.PI/3;box([.038,.019,.038],[Math.cos(angle)*.104,sy*.25,Math.sin(angle)*.104],dark,[0,-angle,0]);}
   }
   for(let i=0;i<4;i++){const angle=i*Math.PI/2;box([.038,.40,.041],[Math.cos(angle)*.10,0,Math.sin(angle)*.10],alloy,[0,-angle,0]);}
   const points=[];for(let i=0;i<=64;i++){const t=i/64,angle=t*Math.PI*6;points.push(new T.Vector3(Math.cos(angle)*.078,-.18+t*.36,Math.sin(angle)*.078));}
   put(new T.TubeGeometry(new T.CatmullRomCurve3(points),low?36:64,.009,low?4:6,false),white);
   put(new T.CylinderGeometry(.092,.092,.39,low?12:20,1,true),glass);
   box([.085,.10,.018],[0,0,.121],dark);for(let i=0;i<3;i++)box([.045,.013,.008],[0,-.025+i*.026,.134],pink);
  }
  a.build(root);for(const item of a.items)item.geometry.dispose();root.name=heal?'AEGIS / recharge médicale blindée':'AEGIS / capsule énergie à induction';return root;
 }
 const energy=buildToken(false),medical=buildToken(true),dock=new T.Group(),a=new Assembly();
 const add=(g,m,p=[0,0,0],r=[0,0,0])=>{a.add(g,m,matrix(p,r),false);g.dispose();};
 add(new T.CylinderGeometry(.27,.33,.075,low?16:24),dark,[0,.038,0]);add(new T.CylinderGeometry(.26,.27,.025,low?16:24),alloy,[0,.085,0]);
 for(let i=0;i<3;i++){const angle=i*Math.PI*2/3;add(new T.TorusGeometry(.21,.012,5,12,Math.PI*.42),cyan,[0,.103,0],[Math.PI/2,0,angle]);const x=Math.sin(angle)*.20,z=Math.cos(angle)*.20;add(bevelBox(.07,.13,.08,.01,1),edge,[x,.13,z]);}
 a.build(dock);for(const item of a.items)item.geometry.dispose();dock.name='AEGIS / socle inductif';
 const kit={energy,medical,dock,materials:{alloy,edge,dark,ceramic,glass,cyan,pink,white},time,update(t){time.value=t;}};pool.set(key,kit);return kit;
}
export function createSupplyPickup(T,{kind='cell',webgpu=false,accent=0xff6fb4,low=false,dock=true}={}){
 const kit=createPowerKit(T,{webgpu,accent,low}),root=new T.Group(),token=(kind==='heal'?kit.medical:kit.energy).clone(true);
 root.name='Recharge / '+kind;root.userData.powerProp=true;root.add(token);if(dock)root.add(kit.dock.clone(true));
 const pulse=t=>kit.update(t);
 const update=(time,phase=0)=>{pulse(time);token.position.y=.62+Math.sin(time*2.1+phase)*.045;token.rotation.y=time*.65+phase;};
 root.userData.update=update;root.userData.pulse=pulse;root.userData.dispose=()=>root.removeFromParent();update(0);
 return{root,token,update,dispose:root.userData.dispose};
}
// An enclosed reflector head with eight separate lenses, glands, cooling fins and a bent arm.
export function createStreetlamp(T,parent,{x=0,z=0,side=1,low=false,webgpu=false,accent=0xff6fb4}={}){
 const kit=createPowerKit(T,{webgpu,accent,low}),{alloy,edge,dark,glass,white}=kit.materials,root=new T.Group(),a=new Assembly();root.name='Lampadaire / optique industrielle';root.position.set(x,0,z);parent.add(root);
 const add=(g,m,p=[0,0,0],r=[0,0,0])=>{a.add(g,m,matrix(p,r),false);g.dispose();};
 const box=(s,p,m=dark,r=[0,0,0])=>add(bevelBox(...s,Math.min(.025,Math.min(...s)*.14),1),m,p,r);
 add(new T.CylinderGeometry(.105,.16,7.3,low?10:16),alloy,[0,3.65,0]);box([.48,.10,.48],[0,.05,0],dark);add(new T.CylinderGeometry(.24,.26,.16,12),edge,[0,.16,0]);
 for(const sx of [-1,1])for(const sz of [-1,1])add(new T.CylinderGeometry(.035,.035,.045,6),edge,[sx*.18,.12,sz*.18]);
 box([.13,.42,.035],[0,1.1,.143]);box([.08,.027,.02],[0,1.1,.167],edge);
 const points=[[0,6.7,0],[0,7.37,0],[-side*.35,7.65,0],[-side*1.7,7.6,0],[-side*2.65,7.45,0]].map(p=>new T.Vector3(...p));
 add(new T.TubeGeometry(new T.CatmullRomCurve3(points),20,.075,low?6:10,false),edge);
 const xx=-side*2.65;box([.66,.18,1.06],[xx,7.35,0],alloy);box([.58,.03,.95],[xx,7.24,0],dark);
 for(let i=0;i<7;i++)box([.53,.065,.025],[xx,7.46,-.38+i*.125],edge);
 for(const sx of [-1,1])for(let i=0;i<4;i++){
  const p=[xx+sx*.15,7.218,-.33+i*.22];add(new T.CylinderGeometry(.09,.065,.025,low?8:12),edge,p);add(new T.SphereGeometry(.065,low?8:12,6),white,[p[0],7.207,p[2]]);
 }
 box([.59,.012,.93],[xx,7.19,0],glass);add(limb([0,7.02,.11],[-side*.25,7.57,.11],.019,.019,6),dark);
 a.build(root);for(const item of a.items)item.geometry.dispose();root.userData.powerProp=true;return root;
}
