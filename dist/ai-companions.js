import {segmentBox} from './game-logic.js';
import {createCompanionModel} from './companion-model.js';
import {COMPANION_SHOT,companionNeedsProtection,companionThreat,companionHover,safeCompanionHover,fireCompanionShot} from './companion-escort.js';
import {createCompanionTorch} from './companion-torch.js';

export function createAICompanion(T,scene,characterId='ghju'){
 const defensive=characterId!=='lylu',name=defensive?'Gaby':'Cara',color=defensive?0xff65b1:0x57baff,cfg=COMPANION_SHOT[name];
 const root=new T.Group();root.name=name+' / autonomous phase sphere';root.userData.companionLight=true;scene.add(root);
 const model=createCompanionModel(T,root,defensive),torch=createCompanionTorch(T,scene);
 const flash=new T.PointLight(color,0,2.2,2);root.add(flash);
 const up=new T.Vector3(0,1,0),target=new T.Vector3(),end=new T.Vector3(),muzzle=new T.Vector3(),direction=new T.Vector3(),forward=new T.Vector3(),q=new T.Quaternion(),face=new T.Matrix4();
 let energy=100,cooldown=0,pulse=0,initialized=false,assists=0,state='Follow',disposed=false,age=0;
 function update(dt,{game,camera,active=true,assistance=true,torchEnabled=true,tracked=false}={}){
  if(disposed)return;root.visible=active;
  if(!active){flash.intensity=0;torch.update(0,{active:false});return;}
  dt=Math.min(.05,Math.max(0,dt));if(!dt||game.state!=='playing')return;
  age+=dt;energy=Math.min(100,energy+dt*4);cooldown=Math.max(0,cooldown-dt);pulse=Math.max(0,pulse-dt*2);
  const hover=companionHover(game.player,age,defensive);
  if(tracked&&camera){camera.getWorldPosition(direction);for(const axis of ['x','y','z'])hover.point[axis]+=direction[axis]-hover.head[axis];Object.assign(hover.head,{x:direction.x,y:direction.y,z:direction.z});}
  const safe=safeCompanionHover(hover.head,hover.point,game.obstacles,game.player.yaw||0);
  target.set(safe.x,safe.y,safe.z);
  if(!initialized||root.position.distanceTo(target)>5){root.position.copy(target);initialized=true;}
  else{
   const next=root.position.clone().lerp(target,1-Math.exp(-dt*8));let fraction=1;
   for(const box of game.obstacles){const hit=segmentBox(root.position,next,{...box,hx:box.hx+.16,hz:box.hz+.16,y:(box.y||0)-.16,height:box.height+.32});if(hit!==null)fraction=Math.min(fraction,Math.max(0,hit-.02));}
   root.position.lerp(next,fraction);
   // Reanchor after the player passes a doorway instead of leaving a stuck
   // sphere behind the wall. The new anchor is clear from the player's head.
   if(fraction<.01&&root.position.distanceTo(target)>1.5)root.position.copy(target);
  }
  const yaw=game.player.yaw||0;forward.set(-Math.sin(yaw),0,-Math.cos(yaw));
  if(camera){camera.getWorldDirection(direction);if(tracked){forward.x=direction.x;forward.z=direction.z;}forward.y=T.MathUtils.clamp(direction.y,-.5,.25);}
  const foe=assistance&&companionNeedsProtection(game)?companionThreat(game,root.position):null;
  if(foe)end.set(foe.x,(foe.elevation||0)+(foe.aimHeight||1.25),foe.z);
  else end.set(hover.head.x+forward.x*12,hover.head.y-.15+forward.y*8,hover.head.z+forward.z*12);
  q.setFromRotationMatrix(face.lookAt(end,root.position,up));if(root.parent)q.premultiply(root.parent.getWorldQuaternion(new T.Quaternion()).invert());
  root.quaternion.slerp(q,1-Math.exp(-dt*10));root.updateMatrixWorld(true);
  // The phase pupil is the real emitter; shots travel in the main simulation
  // and never debit ammunition or use the player's recoil/haptic events.
  muzzle.set(0,0,.151);root.localToWorld(muzzle);
  if(foe&&cooldown<=0&&energy>=cfg.cost){
   direction.subVectors(end,muzzle).normalize();const bore=new T.Vector3(0,0,1).applyQuaternion(root.getWorldQuaternion(new T.Quaternion()));
   if(bore.dot(direction)>.985&&fireCompanionShot(game,name,muzzle,foe,color)){
    energy-=cfg.cost;cooldown=cfg.interval;pulse=1;assists++;model.react();
   }
  }
  flash.intensity=pulse*3;state=pulse>.2?'Protect':cooldown>0?'Cooldown':'Follow';
  torch.update(dt,{game,origin:muzzle,head:hover.head,forward,active:game.player.hp>0&&torchEnabled});
  model.update(dt,{pulse});
 }
 return {name,root,update,preview:dt=>model.update(dt),
  react(event){if(event?.name===name&&['companion-assist','companion-phase'].includes(event.type)){pulse=1;model.react();}},
  reset(){energy=100;cooldown=pulse=age=0;initialized=false;assists=0;state='Follow';flash.intensity=0;root.quaternion.identity();model.reset();torch.reset();},
  snapshot:()=>({name,state,visible:root.visible,energy:Math.round(energy),cooldown,assists,position:root.position.toArray(),torch:torch.snapshot(),model:model.stats()}),
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();torch.dispose();model.dispose();}
 };
}
