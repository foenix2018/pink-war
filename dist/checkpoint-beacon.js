// Shared world-space checkpoint: machined tripod, rotating split halo and scanned crystal.
// Native TSL on WebGPU; the same geometry remains available in compatible mode.
export function checkpointPlacement(cp,game){
 const y=cp.elevation??cp.y??0;
 for(const [dx,dz]of [[1.6,0],[-1.6,0],[0,1.6],[0,-1.6],[2,2],[-2,2],[2,-2],[-2,-2],[0,0]]){
  const x=cp.x+dx,z=cp.z+dz;
  if(Math.abs((game.surfaceHeight?.(x,z,game.time,y+.3)??y)-y)>.3)continue;
  if((game.obstacles||[]).some(o=>!o.walkableSurface&&(o.y||0)<y+2&&(o.y||0)+o.height>y+.12&&Math.abs(x-o.x)<o.hx+.48&&Math.abs(z-o.z)<o.hz+.48))continue;
  return{x,y,z};
 }
 return null;
}
export function createCheckpointBeacon(T,{scene,renderer}={}){
 const root=new T.Group();root.name='Point de contrôle / balise AEGIS';root.visible=false;scene.add(root);
 const owned=new Set(),geos=new Set(),mat=p=>{const m=new T.MeshStandardMaterial(p);owned.add(m);return m;};
 const steel=mat({color:0x66798b,metalness:.78,roughness:.36}),dark=mat({color:0x142534,metalness:.62,roughness:.65});
 const glow=new T.MeshBasicMaterial({color:0x47bdff,toneMapped:false});owned.add(glow);
 let clock=null,tint=null,holo;
 if(renderer?.backend?.isWebGPUBackend&&T.TSL){
  const S=T.TSL;clock=S.uniform(0);tint=S.uniform(new T.Color(0x47bdff));
  holo=new T.MeshBasicNodeMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,blending:T.AdditiveBlending});
  const scan=S.sin(S.positionLocal.y.mul(54).sub(clock.mul(4))).mul(.5).add(.5).pow(12);
  const rim=S.float(1).sub(S.abs(S.normalWorld.dot(S.cameraPosition.sub(S.positionWorld).normalize()))).pow(2);
  holo.colorNode=tint.mul(S.float(.8).add(scan.mul(1.6)).add(rim));holo.opacityNode=S.float(.12).add(rim.mul(.45)).add(scan.mul(.3));
 }else holo=new T.MeshBasicMaterial({color:0x47bdff,transparent:true,opacity:.34,wireframe:false,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
 owned.add(holo);
 const add=(geo,m,x=0,y=0,z=0,parent=root)=>{geos.add(geo);const o=new T.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
 add(new T.CylinderGeometry(.42,.49,.09,48),dark,0,.045);
 add(new T.CylinderGeometry(.33,.38,.035,48),steel,0,.108);
 for(let i=0;i<3;i++){
  const a=i*Math.PI*2/3,foot=add(new T.BoxGeometry(.16,.12,.4),steel,Math.sin(a)*.29,.12,Math.cos(a)*.29);foot.rotation.y=a;
  const fin=add(new T.CylinderGeometry(.025,.07,.64,5),dark,Math.sin(a)*.34,.45,Math.cos(a)*.34);fin.rotation.z=Math.sin(a)*-.14;fin.rotation.x=Math.cos(a)*.14;
  add(new T.SphereGeometry(.04,8,6),glow,Math.sin(a)*.34,.79,Math.cos(a)*.34);
 }
 const halo=new T.Group();halo.position.y=1.05;root.add(halo);
 for(let i=0;i<3;i++){const arc=add(new T.TorusGeometry(.47,.014,6,28,Math.PI*.47),glow,0,0,0,halo);arc.rotation.set(Math.PI/2,0,i*Math.PI*2/3);}
 const crystal=add(new T.OctahedronGeometry(.25,0),holo,0,1.13);crystal.scale.y=1.8;
 const edges=add(new T.OctahedronGeometry(.255,0),glow,0,1.13);edges.scale.y=1.8;edges.material=new T.MeshBasicMaterial({color:0x47bdff,wireframe:true,toneMapped:false});owned.add(edges.material);
 let current='',at=0;
 return{root,update(game,dt){
  const cp=game?.checkpointPosition;if(!cp||!['playing','paused'].includes(game.state)){root.visible=false;return;}
  const key=[cp.id,cp.x,cp.z,cp.elevation,game.characterId].join(':');
  if(key!==current){const p=checkpointPlacement(cp,game);if(!p){root.visible=false;return;}root.position.set(p.x,p.y,p.z);current=key;at=game.time;root.userData.checkpoint={...cp};}
  root.visible=true;const t=game.time||0,color=game.characterId==='lylu'?0x47bdff:0xff4da6;
  glow.color.setHex(color);edges.material.color.setHex(color);if(tint)tint.value.setHex(color);else holo.color.setHex(color);if(clock)clock.value=t;
  crystal.rotation.y=edges.rotation.y=t*.5;halo.rotation.y=-t*.4;const pulse=1+Math.max(0,1-(t-at)/2)*Math.sin((t-at)*8)*.08;root.scale.setScalar(pulse);
 },dispose(){root.removeFromParent();for(const g of geos)g.dispose();for(const m of owned)m.dispose();}};
}
