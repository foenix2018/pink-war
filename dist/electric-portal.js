// Validated Pink Wars electric breach: 3D branching arcs, split inductors and a WGSL field.
// Regular materials keep the same geometry on WebGL / iPhone; the field uses native TSL on WebGPU.
export const PORTAL_OPEN_SECONDS=2.65,PORTAL_CLOSE_SECONDS=1.95;
export function portalEnvelope(age,closingAge=null){
 const s=(a,b,x)=>{const v=Math.max(0,Math.min(1,(x-a)/(b-a)));return v*v*(3-2*v);},c=closingAge??-1;
 return {charge:s(0,1.5,age)*(1-s(1.65,1.95,c)),opening:s(1.28,2.65,age)*(1-s(0,1.68,c)),height:s(.55,1.65,age)*(1-s(1.1,1.8,c))};
}
export function createElectricPortal(T,{height=5.44,low=false,webgpu=false,lights=true}={}){
 const group=new T.Group();group.name='PINK WARS / electric arc portal';group.scale.setScalar(height/5.44);
 const scene=group;
 const mat=(color,roughness=.5,metalness=.5)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const steel=mat(0x566878,.38,.78),dark=mat(0x101b26,.52,.65),edge=mat(0x8596a8,.28,.8),paint=mat(0x374353,.42,.65);
 const pink=new T.MeshBasicMaterial({color:0xff1e80,toneMapped:false}),cyan=new T.MeshBasicMaterial({color:0x80f2ff,toneMapped:false});
 const cold=new T.PointLight(0x43e9ff,0,13,2),hot=new T.PointLight(0xff1e75,0,12,2);cold.position.set(-1.4,2.8,1);hot.position.set(1.4,1.8,1.6);if(lights)group.add(cold,hot);
function mesh(g,m,p=[0,0,0],parent=scene,r=[0,0,0]){const o=new T.Mesh(g,m);o.position.set(...p);o.rotation.set(...r);parent.add(o);return o;}
function box(s,p,m=dark,parent=scene,r=[0,0,0]){const g=new T.BoxGeometry(...s);return mesh(g,m,p,parent,r);}
function rod(a,b,r=.035,m=steel,parent=scene){const u=new T.Vector3(...a),v=new T.Vector3(...b),d=v.clone().sub(u),o=mesh(new T.CylinderGeometry(r,r,d.length(),10),m,u.add(v).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
function plate(w,h,d,p,m=paint,parent=scene,r=[0,0,0]){const c=Math.min(w,h)*.17,s=new T.Shape();s.moveTo(-w/2+c,-h/2);s.lineTo(w/2-c,-h/2);s.lineTo(w/2,-h/2+c);s.lineTo(w/2,h/2-c);s.lineTo(w/2-c,h/2);s.lineTo(-w/2+c,h/2);s.lineTo(-w/2,h/2-c);s.lineTo(-w/2,-h/2+c);s.closePath();const g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:2,steps:1});g.translate(0,0,-d/2);return mesh(g,m,p,parent,r);}
const podTips=[];
for(const side of [-1,1]){
 const g=new T.Group();g.position.set(side*2.15,0,.2);g.rotation.y=-side*.24;scene.add(g);
 plate(1.1,.23,1.6,[0,.12,0],steel,g,[Math.PI/2,0,0]);box([.85,.38,1.1],[0,.27,0],dark,g);
 plate(.58,1.2,.42,[0,.95,0],paint,g,[0,0,side*-.18]);
 for(const xx of [-.3,.3])for(const zz of [-.45,.45])mesh(new T.CylinderGeometry(.06,.06,.025,6),edge,[xx,.49,zz],g);
 for(let k=0;k<6;k++)box([.5,.025,.3],[0,.65+k*.1,.28],steel,g);
 const tip=new T.Vector3(side*1.85,1.52,.25);podTips.push(tip);
 rod([side*2.15,.7,.1],tip.toArray(),.075,edge);mesh(new T.SphereGeometry(.09,16,8),cyan,tip.toArray());
 rod([side*2.15,.25,-.4],[side*3.1,.1,-2.8],.06,dark);
}
mesh(new T.CylinderGeometry(2.75,2.9,.09,64),dark,[0,.005,0]);
for(let i=0;i<16;i++){const a=i*Math.PI/8;plate(.28,.06,.36,[Math.sin(a)*2.7,.06,Math.cos(a)*2.7],i%2?steel:edge,scene,[Math.PI/2,0,-a]);}

 // Bake the static inductors into one draw per material; arcs remain independent instances.
 const hardware=new Map();group.updateMatrixWorld(true);
 const inverse=new T.Matrix4().copy(group.matrixWorld).invert(),retired=new Set();
 group.traverse(o=>{if(o.isMesh){const g=o.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld));const flat=g.index?g.toNonIndexed():g;if(flat!==g)g.dispose();const list=hardware.get(o.material)||[];list.push({mesh:o,geometry:flat});hardware.set(o.material,list);retired.add(o.geometry);}});
 for(const [material,items] of hardware){
  const geometry=new T.BufferGeometry();
  for(const name of ['position','normal','uv']){const size=name==='uv'?2:3,length=items.reduce((n,i)=>n+i.geometry.attributes[name].array.length,0),array=new Float32Array(length);let at=0;for(const i of items){array.set(i.geometry.attributes[name].array,at);at+=i.geometry.attributes[name].array.length;}geometry.setAttribute(name,new T.BufferAttribute(array,size));}
  group.add(new T.Mesh(geometry,material));for(const i of items){i.mesh.removeFromParent();i.geometry.dispose();}
 }
 for(const g of retired)g.dispose();
 let timeNode,openNode,arrivalNode,fieldMat,field;
 if(webgpu&&T.TSL){
const {uniform,uv,vec3,vec4,sin,cos,mix,smoothstep,mx_noise_float}=T.TSL;
timeNode=uniform(0),openNode=uniform(1),arrivalNode=uniform(0);const p=uv().sub(.5).mul(2),radius=p.length();
const flow=vec3(p.mul(3.2),timeNode.mul(.19));
const n=mx_noise_float(flow).mul(.6).add(mx_noise_float(flow.mul(2.3).add(timeNode.mul(.11))).mul(.25));
const ring=sin(radius.mul(25).sub(timeNode.mul(3.4)).add(n.mul(6))).mul(.5).add(.5);
const edgeMask=smoothstep(.65,.98,radius).mul(smoothstep(1.03,.94,radius));
const interior=mix(vec3(.004,.014,.025),vec3(.018,.10,.15),n.add(.3).clamp(0,1));
fieldMat=new T.MeshBasicNodeMaterial({transparent:true,depthWrite:false,side:T.DoubleSide});
fieldMat.colorNode=interior.add(vec3(.12,.78,1).mul(edgeMask.mul(ring.mul(1.3).add(.45)))).add(vec3(.8,.035,.28).mul(edgeMask.mul(n.mul(2).max(0)))).add(vec3(.2,.7,1).mul(arrivalNode.mul(.25).mul(ring.pow(7))));
fieldMat.opacityNode=smoothstep(1.02,.94,radius).mul(openNode).mul(.92);
fieldMat.positionNode=vec3(T.TSL.positionLocal.x,T.TSL.positionLocal.y,sin(radius.mul(18).sub(timeNode.mul(3))).mul(.035).add(n.mul(.14)));
field=mesh(new T.PlaneGeometry(3.5,5.1,40,56),fieldMat,[0,2.72,0]);

 }else{
  // A textured turbulent membrane, without unsupported ShaderMaterial nodes on WebGL.
  const size=128,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const px=(x+.5)/size*2-1,py=(y+.5)/size*2-1,r=Math.hypot(px,py),i=(y*size+x)*4;
   const n=Math.sin(px*14+Math.sin(py*12))*Math.cos(py*19+px*9),edge=Math.exp(-(((r-.91)/.055)**2));
   data[i]=5+edge*95;data[i+1]=17+(n+1)*7+edge*180;data[i+2]=28+(n+1)*12+edge*220;data[i+3]=Math.max(0,Math.min(1,(1-r)*22))*225;
  }
  const texture=new T.DataTexture(data,size,size);texture.needsUpdate=true;
  fieldMat=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false});
  field=mesh(new T.PlaneGeometry(3.5,5.1),fieldMat,[0,2.72,0]);
  timeNode={value:0};openNode={value:0};arrivalNode={value:0};
 }
const maxSegments=low?700:1400,arcGeo=new T.CylinderGeometry(1,1,1,6),coreMat=new T.MeshBasicMaterial({color:0xc8f9ff,toneMapped:false}),arcHalo=new T.MeshBasicMaterial({color:0x29bfff,transparent:true,opacity:.18,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
const cores=new T.InstancedMesh(arcGeo,coreMat,maxSegments),halos=new T.InstancedMesh(arcGeo,arcHalo,maxSegments);for(const o of [cores,halos]){o.frustumCulled=false;o.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(o);}
const coreColors=[new T.Color(0xbefaff),new T.Color(0xff90cd)],haloColors=[new T.Color(0x238eff),new T.Color(0xff157d)];
const pose=new T.Object3D(),up=new T.Vector3(0,1,0),delta=new T.Vector3(),a0=new T.Vector3(),a1=new T.Vector3();let used=0;
const hash=(a,b=0)=>{const x=Math.sin(a*127.1+b*311.7)*43758.5453;return x-Math.floor(x);};
function line(a,b,r=.008,tint=0){if(used>=maxSegments)return;delta.copy(b).sub(a);const len=delta.length();if(len<.0001)return;pose.position.copy(a).add(b).multiplyScalar(.5);pose.quaternion.setFromUnitVectors(up,delta.divideScalar(len));pose.scale.set(r,len,r);pose.updateMatrix();cores.setMatrixAt(used,pose.matrix);cores.setColorAt(used,coreColors[tint?1:0]);pose.scale.set(r*3.5,len,r*3.5);pose.updateMatrix();halos.setMatrixAt(used,pose.matrix);halos.setColorAt(used,haloColors[tint?1:0]);used++;}
const arcScratch=Array.from({length:2},()=>({prev:new T.Vector3(),point:new T.Vector3(),end:new T.Vector3()}));
function lightning(from,to,seed,t,amp=.16,r=.008,branch=true){
 const {prev,point,end}=arcScratch[branch?0:1];prev.copy(from);const frame=Math.floor(t*18),count=15;
 for(let k=1;k<=count;k++){
  const f=k/count,fall=Math.sin(f*Math.PI);point.copy(from).lerp(to,f);
  point.x+=(hash(seed+k,frame)-.5)*amp*fall;point.y+=(hash(seed+k+30,frame)-.5)*amp*fall;point.z+=(hash(seed+k+60,frame)-.5)*amp*fall;
  line(prev,point,r,seed%3===0);
  if(branch&&k%5===0){end.copy(point);end.x+=(hash(k+80+seed,frame)-.5)*.45;end.y+=(hash(k+20+seed,frame)-.5)*.45;end.z+=.12;lightning(point,end,seed+k+100,t,amp*.5,r*.43,false);}
  prev.copy(point);
 }
}
function ringPoint(a,w,h,t,offset=0,target=new T.Vector3()){const jitter=(Math.sin(a*17+t*13)+Math.sin(a*31-t*17))*.012;return target.set(Math.sin(a)*(1.75*w+jitter+offset),2.72+Math.cos(a)*(2.55*h+jitter+offset),.08+Math.sin(a*9+t*8)*.035);}
function haloTexture(){const s=64,d=new Uint8Array(s*s*4);for(let y=0;y<s;y++)for(let x=0;x<s;x++){const r=Math.hypot((x+.5)/s*2-1,(y+.5)/s*2-1),i=(y*s+x)*4;d[i]=d[i+1]=d[i+2]=255;d[i+3]=Math.max(0,Math.exp(-r*r*7)-Math.exp(-7))*255;}const t=new T.DataTexture(d,s,s);t.needsUpdate=true;return t;}
const glowTex=haloTexture(),glowMat=new T.SpriteMaterial({map:glowTex,color:0x56dcff,transparent:true,opacity:.6,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}),flares=[];
for(let i=0;i<12;i++){const s=new T.Sprite(glowMat);scene.add(s);flares.push(s);}
const floorGlowMat=new T.MeshBasicMaterial({map:glowTex,color:0x37badc,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});const groundGlow=mesh(new T.PlaneGeometry(7,6),floorGlowMat,[0,.058,.9],scene,[-Math.PI/2,0,0]);
// Ion motes follow the electrical field, then fall with gravity after closure.
const particles=low?70:160,particleGeo=new T.BufferGeometry(),particlePositions=new Float32Array(particles*3);particleGeo.setAttribute('position',new T.BufferAttribute(particlePositions,3));const particleMat=new T.PointsMaterial({color:0xb4edff,size:.035,transparent:true,opacity:.8,depthWrite:false});const motes=new T.Points(particleGeo,particleMat);motes.frustumCulled=false;scene.add(motes);

 const particleOrigin=new T.Vector3();
 let disposed=false;
 function update(time,{age=4,closingAge=null}={}){
  if(disposed)return false;
  const t=time,{charge,opening,height}=portalEnvelope(age,closingAge),width=.012+.988*opening,c=closingAge??-1;
  const active=age>=0&&(charge>.001||opening>.001),flash=Math.exp(-(((age-1.55)/.10)**2))+Math.exp(-(((c-1.62)/.05)**2));
  group.visible=age>=0&&(closingAge===null||closingAge<PORTAL_CLOSE_SECONDS);
  timeNode.value=t;openNode.value=opening;arrivalNode.value=0;field.scale.set(width,Math.max(.001,height),1);field.visible=opening>.005;
  if(!webgpu)fieldMat.opacity=opening;
  cold.intensity=charge*55+opening*50+flash*130;hot.intensity=opening*60;floorGlowMat.opacity=opening*.25+flash*.30;
  used=0;
  if(active){
   const segments=low?48:88;
   for(let j=0;j<(low?1:2);j++)for(let i=0;i<segments;i++){
    const a=i/segments*Math.PI*2;line(ringPoint(a,width,height,t,j*.035),ringPoint((i+1)/segments*Math.PI*2,width,height,t,j*.035),j?.004:.009,i%17===0);
   }
   for(let i=0;i<(low?4:7);i++){const a=t*.37+i*Math.PI*2/7;lightning(ringPoint(a,width,height,t),ringPoint(a+.15+.19*hash(i,Math.floor(t*8)),width,height,t,.03),i+7,t,.24,.007);}
   for(let i=0;i<(low?2:4);i++)lightning(podTips[i%2],ringPoint((i%2?1:-1)*(.45+(i>>1)*1.3),width,height,t),i+50,t,.52,.011);
   if(age>.6&&age<1.8&&closingAge===null)lightning(new T.Vector3(0,.18,.06),new T.Vector3(0,2.72+2.5*height,.05),99,t,.18,.015);
  }
  cores.count=halos.count=used;cores.instanceMatrix.needsUpdate=halos.instanceMatrix.needsUpdate=true;
  if(used){cores.instanceColor.needsUpdate=halos.instanceColor.needsUpdate=true;}
  for(let i=0;i<flares.length;i++){ringPoint(i*Math.PI/6+t*.1,width,height,t,0,flares[i].position);flares[i].visible=active;const size=(.25+hash(i,Math.floor(t*15))*.26)*(charge+flash*.6);flares[i].scale.set(size,size,1);}
  for(let i=0;i<particles;i++){
   const age=(t+hash(i)*2.8)%1.6,a=hash(i+24)*Math.PI*2,start=ringPoint(a,width,height,t,0,particleOrigin);
   particlePositions[i*3]=start.x+Math.sin(a)*age*.7+(hash(i+40)-.5)*age;
   particlePositions[i*3+1]=start.y+hash(i+70)*age*1.4-age*age*1.1;
   particlePositions[i*3+2]=.1+hash(i+130)*age*2;
  }
  particleGeo.attributes.position.needsUpdate=true;motes.visible=active;particleMat.opacity=charge*.7;
  return group.visible;
 }
 function dispose(){if(disposed)return;disposed=true;group.removeFromParent();const geometries=new Set(),materials=new Set(),textures=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);if(m.map)textures.add(m.map);}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();}
 update(0,{age:-1});
 return{group,update,dispose,lightState:{cold,hot},get arcCount(){return used;}};
}
// Active portals retain their energy for the whole wave, then finish closing after removal.
export function createElectricPortalSet(T,parent,options={}){
 const portals=new Map(),slots=[],poolSize=options.poolSize||0,pooled=poolSize>0;
 const shared=pooled?[new T.PointLight(0x43e9ff,0,13,2),new T.PointLight(0xff1e75,0,12,2)]:[];
 if(pooled)parent.add(...shared);
 function makeSlot(){const slot={effect:createElectricPortal(T,{...options,lights:!pooled}),inUse:false};parent.add(slot.effect.group);slots.push(slot);return slot;}
 for(let i=0;i<poolSize;i++)makeSlot();
 function release(p){
  if(p.slot){p.slot.inUse=false;p.effect.update(0,{age:-1});}
  else p.effect.dispose();
 }
 function lightFrame(){
  const p=[...portals.values()].reverse().find(p=>p.effect.group.visible);
  for(const [i,light] of shared.entries()){
   if(!p){light.intensity=0;continue;}
   const local=i?p.effect.lightState.hot:p.effect.lightState.cold;
   p.effect.group.updateWorldMatrix(true,false);light.position.copy(local.position);p.effect.group.localToWorld(light.position);light.intensity=local.intensity;
  }
 }
 return{portals,
  // Called under the level's loading overlay: no extrusion or shader compilation on arrival.
  async prepare(renderer,camera){
   if(!pooled)return;
   const culling=[];
   try{for(const slot of slots){slot.effect.update(0,{age:4});slot.effect.group.traverse(o=>{if(o.isMesh||o.isSprite||o.isPoints){culling.push([o,o.frustumCulled]);o.frustumCulled=false;}});}
    if(renderer.compileAsync&&!renderer.isWebGLRenderer)await renderer.compileAsync(parent,camera);
    else renderer.compile?.(parent,camera);
    // Upload the buffers and textures while the loading overlay is still visible.
    if(renderer.renderAsync)await renderer.renderAsync(parent,camera);else renderer.render?.(parent,camera);
   }finally{for(const [o,value] of culling)o.frustumCulled=value;for(const slot of slots)if(!slot.inUse)slot.effect.update(0,{age:-1});lightFrame();}
  },
  sync(sites=[],time=0,frameTime=time){
   const present=new Set();
   for(const [index,site] of sites.entries()){
    const id=site.id??index;present.add(id);let p=portals.get(id);
    if(!p){
     const slot=pooled?(slots.find(s=>!s.inUse)||makeSlot()):null;if(slot)slot.inUse=true;
     p={effect:slot?slot.effect:createElectricPortal(T,options),slot,openedAt:site.openedAt??time,closingAt:null};
     if(!slot)parent.add(p.effect.group);portals.set(id,p);
    }
    p.closingAt=null;p.effect.group.position.set(site.x,site.y||0,site.z);p.effect.group.rotation.y=site.yaw||0;
    p.effect.update(frameTime,{age:time-p.openedAt});
   }
   for(const [id,p] of portals)if(!present.has(id)){
    p.closingAt??=frameTime;p.effect.update(frameTime,{age:time-p.openedAt,closingAge:frameTime-p.closingAt});
    if(frameTime-p.closingAt>=PORTAL_CLOSE_SECONDS){release(p);portals.delete(id);}
   }
   lightFrame();
  },
  reset(){for(const p of portals.values())release(p);portals.clear();lightFrame();},
  dispose(){this.reset();for(const s of slots)s.effect.dispose();slots.length=0;for(const l of shared)l.removeFromParent();}
 };
}
