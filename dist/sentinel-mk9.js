// Pink Wars — Sentinel heavy enemy. Integration adapter, no global side effects.
// Renderer-independent Three.js geometry; gameplay owns collision/damage.
export function createSentinel(THREE, scene, options={}) {
 const root=new THREE.Group();root.name='Sentinel MK IX';scene.add(root);
 const steel=new THREE.MeshStandardMaterial({color:0x858d98,metalness:.82,roughness:.39});
 const dark=new THREE.MeshStandardMaterial({color:0x202831,metalness:.75,roughness:.5});
 const trim=new THREE.MeshStandardMaterial({color:0x434c59,metalness:.8,roughness:.42});
 const glow=new THREE.MeshStandardMaterial({color:0x25baff,emissive:0x087cdd,emissiveIntensity:2});
 const missileMat=new THREE.MeshStandardMaterial({color:0x171c23,metalness:.65,roughness:.55});
 const parts=[];
 function mesh(parent,g,m,x,y,z){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);parts.push(o);return o}
 function box(p,w,h,d,m,x,y,z){return mesh(p,new THREE.BoxGeometry(w,h,d),m,x,y,z)}
 function cyl(p,r1,r2,h,m,x,y,z,rotate=false){const o=mesh(p,new THREE.CylinderGeometry(r1,r2,h,12),m,x,y,z);if(rotate)o.rotation.x=Math.PI/2;return o}
 const torso=new THREE.Group();torso.position.y=2.55;root.add(torso);
 box(torso,1.8,1.45,.95,steel,0,0,0);
 box(torso,1.25,.9,.18,trim,0,.05,-.57);
 const head=new THREE.Group();head.position.y=1.02;torso.add(head);
 box(head,.72,.55,.7,steel,0,0,-.14);mesh(head,new THREE.SphereGeometry(.18,12,8),glow,0,.05,-.53);
 const arms=[],muzzles=[],pods=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*1.25,.42,0);torso.add(arm);arms.push(arm);
  cyl(arm,.43,.43,.42,dark,0,0,0);box(arm,.64,1.15,.72,steel,side*.18,-.62,-.12);
  for(let barrel=0;barrel<2;barrel++){const x=side*.2+(barrel-.5)*.25;cyl(arm,.10,.10,1.25,trim,x,-1.28,-.48,true);
   const tip=new THREE.Object3D();tip.position.set(x,-1.28,-1.12);arm.add(tip);muzzles.push(tip);}
  const pod=new THREE.Group();pod.position.set(side*.82,.96,-.02);torso.add(pod);
  box(pod,.82,.67,1.02,steel,0,0,0);
  for(let row=0;row<2;row++)for(let col=0;col<2;col++){
   const x=(col-.5)*.37,y=(row-.5)*.29;
   cyl(pod,.135,.135,.25,missileMat,x,y,-.57,true);
   const tip=new THREE.Object3D();tip.position.set(x,y,-.72);pod.add(tip);pods.push(tip);
  }
 }
 const legs=[];
 for(const side of [-1,1]){
  const leg=new THREE.Group();leg.position.set(side*.59,1.96,0);root.add(leg);legs.push(leg);
  cyl(leg,.3,.3,.38,dark,0,0,0);
  box(leg,.55,.95,.58,steel,side*.06,-.53,.10);
  cyl(leg,.23,.23,.36,dark,0,-1.02,0);
  box(leg,.45,.78,.52,trim,0,-1.37,-.12);
  const track=box(leg,.76,.38,1.65,dark,0,-1.75,-.27);
  for(let i=0;i<9;i++)box(leg,.8,.1,.13,steel,0,-1.98,-.94+i*.17);
 }
 const state={health:options.health??850,time:0,gunClock:0,missileClock:0,missileIndex:0,dead:false};
 const pos=new THREE.Vector3(),target=new THREE.Vector3(),dir=new THREE.Vector3();
 function update(dt,ctx={}){
  if(state.dead)return;
  dt=Math.max(0,Math.min(dt,.08));state.time+=dt;
  const moving=!!ctx.moving;
  legs.forEach((leg,i)=>{leg.rotation.x=moving?Math.sin(state.time*5+i*Math.PI)*.14:0});
  torso.rotation.z=moving?Math.sin(state.time*5)*.015:0;
  const t=ctx.target;if(!t)return;
  target.set(t.x,t.y??1.5,t.z);
  root.getWorldPosition(pos);dir.subVectors(target,pos);
  const desired=Math.atan2(-dir.x,-dir.z);const delta=Math.atan2(Math.sin(desired-root.rotation.y),Math.cos(desired-root.rotation.y));
  root.rotation.y+=Math.max(-dt*1.5,Math.min(dt*1.5,delta));
  arms.forEach(a=>a.rotation.x=Math.max(-.4,Math.min(.5,-dir.y/Math.max(1,Math.hypot(dir.x,dir.z)))));
  const distance=dir.length();if(ctx.canSee===false||distance>42||distance<3)return;
  state.gunClock-=dt;state.missileClock-=dt;
  if(state.gunClock<=0){state.gunClock=.12;const tip=muzzles[Math.floor(state.time/.12)%muzzles.length];tip.getWorldPosition(pos);
   const direction=target.clone().sub(pos).normalize();
   options.onShot?.({type:'bullet',weapon:'r9',origin:pos.clone(),direction,speed:65,damage:9,hostile:true,muzzle:tip});}
  if(state.missileClock<=0){state.missileClock=5.5;const tip=pods[state.missileIndex++%pods.length];tip.getWorldPosition(pos);
   options.onShot?.({type:'missile',weapon:'nova',origin:pos.clone(),direction:target.clone().sub(pos).normalize(),speed:23,damage:48,splash:2.8,hostile:true,muzzle:tip});}
 }
 function damage(n){state.health-=Math.max(0,n);if(state.health<=0){state.dead=true;options.onDestroyed?.(root.position.clone())}return state.health}
 function dispose(){scene.remove(root);parts.forEach(o=>o.geometry.dispose());[steel,dark,trim,glow,missileMat].forEach(m=>m.dispose())}
 return {root,state,update,damage,dispose,muzzles,pods};
}
