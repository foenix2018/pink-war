import {syncTrackedHands} from './xr-hands.js';
import {segmentBox} from './game-logic.js';
import {createXRPauseMenu,createXRJournal} from './xr-pause-menu.js';
import {createMagnifiedSight} from './magnified-sight.js';
import {hapticPlan,buzz} from './haptics.js';

export async function immersiveRendererPreferred(){
 let timer;try{return !!(globalThis.isSecureContext&&navigator.xr&&await Promise.race([navigator.xr.isSessionSupported('immersive-vr'),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),1500);})]));}catch{return false;}finally{clearTimeout(timer);}
}
// Screen missions keep their actual world, simulation, inventory and progress in XR.
export function createMissionXR({getWorld,onFrame,onPause,onResume,onHome,onExit=()=>{},isPaused=()=>false,getYaw=()=>0,setYaw=()=>{},skillsInput=()=>false}){
 let session=null,rig=null,busy=false,blocked=true,previous=new Map(),entries=[],menu=null,scope=null,yaw=0,controls=null,hud=null,reading=null,closeReading=null,opticalEye=null;
 const down=b=>!!b?.pressed||(b?.value||0)>.15;
 const api={get active(){return !!session;},get yaw(){return yaw;},get controls(){return controls;},get entries(){return entries;},
  async enter(){
   if(session){await api.exit();return;}if(busy)return;
   const w=getWorld();if(!w?.game||!w.renderer)throw Error('Le secteur est encore en préparation.');
   if(!globalThis.isSecureContext||!navigator.xr)throw Error('Ouvrez ce lien HTTPS dans Meta Quest Browser pour utiliser la VR.');
   if(!w.renderer.isWebGLRenderer)throw Error('Le casque a été branché après le lancement. Relancez la mission depuis l’accueil avec le bouton VR.');
   // requestSession is invoked synchronously inside the user's click.
   const pending=navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor'],optionalFeatures:['bounded-floor']});busy=true;
   let opened;try{
    opened=await pending;session=opened;const {T,scene,camera,renderer}=w;yaw=getYaw();rig=new T.Group();scene.add(rig);rig.add(camera);camera.clearViewOffset();camera.position.set(0,0,0);camera.rotation.set(0,0,0);renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');renderer.xr.setFramebufferScaleFactor?.(.9);renderer.xr.setFoveation?.(.65);
    entries=[0,1].map(index=>{const ray=renderer.xr.getController(index),anchor=new T.Group(),mount=new T.Group();anchor.matrixAutoUpdate=false;anchor.visible=false;rig.add(ray,anchor);anchor.add(mount);mount.position.set(0,-.012,.018);const gun=w.createGun(),bare=w.createHand();gun.userData.showSupport=false;if(gun.userData.support)gun.userData.support.visible=false;mount.add(gun,bare);return{ray,anchor,mount,gun,bare,source:null,tracked:false};});
    menu=createXRPauseMenu(T,scene,{accent:w.accent,onResume:()=>{blocked=true;onResume();},onHome:()=>void api.home(),onExit:()=>void api.exit()});
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=112;const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const plane=new T.Mesh(new T.PlaneGeometry(.42,.091875),new T.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));plane.position.set(0,-.27,-1.05);plane.renderOrder=100;plane.frustumCulled=false;camera.add(plane);hud={canvas,texture,plane,key:''};
    opened.addEventListener('end',finish,{once:true});opened.addEventListener('visibilitychange',()=>{if(opened.visibilityState!=='visible'){blocked=true;onPause();}});
    document.body.classList.add('xr-mode');await renderer.xr.setSession(opened);renderer.setAnimationLoop(onFrame);blocked=true;previous.clear();onResume();api.syncPose();
   }catch(error){if(opened)await opened.end().catch(()=>{});if(session)finish();throw error;}finally{busy=false;}
  },
  syncPose(){if(!session)return;const w=getWorld(),p=w.game.player;rig.position.set(p.x,p.elevation||0,p.z);rig.rotation.y=yaw;rig.updateMatrixWorld(true);w.renderer.xr.updateCamera(w.camera);if(w.weapon)w.weapon.visible=false;if(w.soldier)w.soldier.visible=false;},
  input(frame,dt){
   const w=getWorld(),T=w.T;syncTrackedHands(entries,session,frame,w.renderer.xr.getReferenceSpace());api.syncPose();
   const left=entries.find(e=>e.source?.handedness==='left'),right=entries.find(e=>e.source?.handedness==='right');const lp=left?.source?.gamepad,rp=right?.source?.gamepad;
   const edge=(name,value)=>{const hit=value&&!previous.get(name);previous.set(name,value);return hit;};
   const pause=edge('pause',down(lp?.buttons[4]));if(pause){blocked=true;if(reading)api.closeJournal();else isPaused()?onResume():onPause();}
   const trigger=down(rp?.buttons[0]),leftTrigger=down(lp?.buttons[0]);
   if(!trigger&&!leftTrigger)blocked=false;
   if(!right?.tracked||session.visibilityState&&session.visibilityState!=='visible'){blocked=true;if(!isPaused())onPause();}
   const reload=edge('reload',down(rp?.buttons[5])),next=edge('next',down(lp?.buttons[5])),jump=edge('jump',down(rp?.buttons[4])),interact=edge('interact',down(lp?.buttons[3]));
   if(reading){menu.update({active:false});reading.update(w.camera,right?.ray,trigger);blocked=true;return controls={x:0,z:0,fire:false,leftFire:false,jump:false,aim:false,sprint:false};}
   const consumed=menu.update({active:isPaused(),camera:w.camera,ray:right?.ray,trigger});
   if(consumed){blocked=true;controls={x:0,z:0,fire:false,leftFire:false,jump:false,aim:false,sprint:false};return controls;}
   const skillsConsumed=!isPaused()&&skillsInput({T,scene:w.scene,camera:w.camera,left:left?.anchor,right:right?.ray,trigger:trigger&&!blocked,enabled:!!right?.tracked});
   if(consumed||skillsConsumed){blocked=true;controls={x:0,z:0,fire:false,leftFire:false,jump:false,aim:false,sprint:false};return controls;}
   if(isPaused()){blocked=true;return controls={x:0,z:0,fire:false,leftFire:false,jump:false,aim:false,sprint:false};}
   if(reload){w.game.reload();blocked=true;}if(next){w.game.cycleWeapon();blocked=true;}
   const axis=v=>Math.abs(v||0)>.16?v:0;yaw-=axis(rp?.axes?.[2]||0)*1.8*dt;setYaw(yaw);api.syncPose();
   const forward=new T.Vector3();w.camera.getWorldDirection(forward);const moveYaw=Math.atan2(-forward.x,-forward.z);
   return controls={x:axis(lp?.axes?.[2]),z:axis(lp?.axes?.[3]),moveYaw,yaw,jump,interact,fire:trigger&&!blocked,leftFire:leftTrigger&&!blocked,aim:down(rp?.buttons[1]),sprint:down(lp?.buttons[1])};
  },
  aim(hand='right'){
   const w=getWorld(),T=w.T,e=entries.find(e=>e.source?.handedness===hand),source=e?.ray||w.camera,origin=new T.Vector3(),direction=new T.Vector3(),q=new T.Quaternion();source.updateWorldMatrix(true,false);source.getWorldPosition(origin);source.getWorldQuaternion(q);direction.set(0,0,-1).applyQuaternion(q);
   const muzzle=e?.gun.userData.flashFor?.('right')||e?.gun.userData.flash;if(muzzle){muzzle.updateWorldMatrix(true,false);muzzle.getWorldPosition(origin);}
   const head=w.camera.getWorldPosition(new T.Vector3());let near=1;for(const box of w.obstacles||[]){const hit=segmentBox(head,origin,box);if(hit!==null)near=Math.min(near,hit);}if(near<1)origin.lerpVectors(head,origin,Math.max(0,near-.02));return{origin,direction};
  },
  gun(hand='right'){return entries.find(e=>e.source?.handedness===hand)?.gun;},
  showJournal(entry,close){const w=getWorld();reading?.dispose();closeReading=close;reading=createXRJournal(w.T,w.scene,entry,()=>api.closeJournal());blocked=true;},
  closeJournal(){reading?.dispose();reading=null;const close=closeReading;closeReading=null;close?.();blocked=true;},
  update(dt,feel={},flash=0){
   if(!session)return;const w=getWorld(),g=w.game;api.syncPose();
   for(const e of entries){const hand=e.source?.handedness,main=hand==='right',armed=main||g.weapon.dual;const grip=e.source?.gamepad?.buttons?.[1]?.value||0,trigger=e.source?.gamepad?.buttons?.[0]?.value||0;const gun=e.gun,reload=g.reloadRemaining?1-g.reloadRemaining/g.weapon.reload:0;
    gun.visible=e.tracked&&armed;e.bare.visible=e.tracked&&!armed;e.bare.scale.x=(hand==='left'?-1:1)*Math.abs(e.bare.scale.x);gun.scale.x=hand==='left'?-1:1;
    if(gun.userData.index!==g.weaponIndex)gun.userData.setVariant?.(g.weaponIndex);
    gun.userData.setCombatState?.({time:g.time,ammo:g.ammo[g.weaponIndex],capacity:g.weapon.capacity,dualState:g.weapon.dual?{...g.dual,shotAt:{right:g.dual.shotAt[hand],left:-Infinity}}:g.dual,reloading:g.reloadRemaining>0,reloadProgress:reload,charge:g.charge,heat:feel.heat||0,kick:feel.kick||0,bladeHeld:!blocked&&trigger>.15});
    gun.rotation.set((g.weapon.dual?0:feel.pitch||0)+reload*Math.PI/2-(g.weapon.melee?.55:0),g.weapon.dual?0:feel.yaw||0,0);gun.position.set(0,-(feel.kick||0)*.13,.024+(feel.kick||0));
    if(gun.userData.palm)gun.position.sub(gun.userData.palm.clone().applyEuler(gun.rotation)).add(new w.T.Vector3(.015,-.014,0));
    gun.userData.hand?.userData.animate?.({grip:.96,trigger,reload:0},dt,hand==='left'?-1:1);e.bare.userData.animate?.({grip,trigger,reload:0},dt,hand==='left'?-1:1);gun.userData.setFlash?.(!isPaused()&&flash>0,g.time);gun.userData.setSight?.(!!controls?.aim&&!g.reloadRemaining,w.camera);
   }
   if(hud){const key=Math.ceil(g.player.hp)+'|'+g.ammo[g.weaponIndex]+'|'+g.weapon.melee;hud.plane.visible=!isPaused();if(hud.key!==key){hud.key=key;const c=hud.canvas.getContext('2d');c.clearRect(0,0,512,112);c.fillStyle='#101c29e8';c.beginPath();c.roundRect(0,0,512,112,22);c.fill();c.fillStyle='#becbd4';c.font='16px sans-serif';c.fillText('SANTÉ',22,28);c.fillText('MUNITIONS',280,28);c.fillStyle='white';c.font='bold 45px sans-serif';c.fillText(String(Math.ceil(g.player.hp)),22,83);c.fillText(g.weapon.melee?'∞':String(g.ammo[g.weaponIndex]),280,83);hud.texture.needsUpdate=true;}}
  },
  renderScope(){const w=getWorld(),gun=api.gun();if(controls?.aim&&!isPaused()&&gun?.userData.optics?.[w.game.weaponIndex]){scope ||=createMagnifiedSight(256);const source=w.renderer.xr.getCamera(w.camera).cameras?.[1];const eye=opticalEye ||=new w.T.PerspectiveCamera();eye.matrixAutoUpdate=false;if(source){eye.matrix.copy(source.matrixWorld);eye.matrixWorld.copy(source.matrixWorld);eye.matrixWorldInverse.copy(source.matrixWorld).invert();eye.projectionMatrix.copy(source.projectionMatrix);eye.projectionMatrixInverse.copy(source.projectionMatrixInverse);}scope.render({renderer:w.renderer,scene:w.scene,gun,eyeCamera:source?eye:w.camera,active:true,hide:[rig,hud?.plane,menu?.mesh]});}else scope?.release();},
  haptic(type,arg,hand='right'){try{if(JSON.parse(localStorage.getItem('pink-war-vr')||'{}').haptics===false)return;}catch{}const pulse=hapticPlan(type,arg).main;if(pulse)buzz(entries.find(e=>e.source?.handedness===hand)?.source?.gamepad,pulse);},
  async exit(){await session?.end();},async home(){await api.exit();onHome();}
 };
 function finish(){if(!session)return;const w=getWorld();session=null;w.renderer.setAnimationLoop(null);w.scene.add(w.camera);reading?.dispose();reading=null;menu?.dispose();menu=null;scope?.dispose();scope=null;if(hud){hud.plane.removeFromParent();hud.plane.geometry.dispose();hud.plane.material.dispose();hud.texture.dispose();hud=null;}
  for(const e of entries){e.gun.userData.disposeDynamic?.();e.bare.userData.dispose?.();e.ray.removeFromParent();}entries=[];rig?.removeFromParent();rig=null;w.renderer.xr.enabled=false;document.body.classList.remove('xr-mode');setYaw(yaw);onPause();onExit();
 }
 return api;
}
