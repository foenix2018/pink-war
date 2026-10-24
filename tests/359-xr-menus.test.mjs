import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.min.js';
import {ArenaGame} from '../dist/game-logic.js';
import {createMissionXR} from '../dist/mission-xr.js';
import {VRController,VR_DEFAULTS} from '../dist/vr.js';

function fixture(t,skillsInput=()=>false){
 const saved=new Map(['document','navigator','isSecureContext'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 t.after(()=>{for(const [k,d]of saved)if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];});
 const context=new Proxy({measureText:s=>({width:s.length*15})},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({getContext:()=>context}),body:{classList:{add(){},remove(){}}}}});
 const callbacks=new Map(),session={inputSources:[],visibilityState:'visible',addEventListener:(type,fn)=>callbacks.set(type,fn),end:async()=>callbacks.get('end')?.()};
 let requests=0;Object.defineProperty(globalThis,'navigator',{configurable:true,value:{xr:{requestSession:()=>{requests++;return Promise.resolve(session);}}}});Object.defineProperty(globalThis,'isSecureContext',{configurable:true,value:true});
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),game=new ArenaGame([]);scene.add(camera);game.player.x=0;game.player.z=22;game.player.elevation=0;
 let paused=true,homes=0,exits=0,loop=null;const rays=[new T.Group(),new T.Group()];
 const renderer={isWebGLRenderer:true,setAnimationLoop:fn=>{loop=fn;},xr:{enabled:false,getController:i=>rays[i],setReferenceSpaceType(){},setFramebufferScaleFactor(){},setFoveation(){},setSession:async()=>{},getReferenceSpace:()=>({}),updateCamera:()=>{camera.position.set(0,1.65,0);camera.updateMatrixWorld(true);}}};
 const makeGun=()=>{const gun=new T.Group(),flash=new T.Group();gun.add(flash);gun.userData={flash,support:new T.Group(),setVariant(){},setCombatState(){},setFlash(){}};return gun;};
 const w={T,scene,camera,renderer,game,createGun:makeGun,createHand:()=>new T.Group(),obstacles:[],accent:'#80baff'};
 const xr=createMissionXR({getWorld:()=>w,onFrame(){},getYaw:()=>0,onPause:()=>{paused=true;},onResume:()=>{paused=false;},isPaused:()=>paused,onHome:()=>{homes++;},onExit:()=>{exits++;},skillsInput});
 const button=()=>({pressed:false,value:0}),left={handedness:'left',targetRaySpace:{hand:'left'},gripSpace:{hand:'left'},gamepad:{axes:[0,0,0,0],buttons:Array.from({length:6},button)}},right={...left,handedness:'right',targetRaySpace:{hand:'right'},gripSpace:{hand:'right'},gamepad:{axes:[0,0,0,0],buttons:Array.from({length:6},button)}};session.inputSources=[left,right];
 let rightQ=new T.Quaternion();const frame={getPose:space=>({transform:{matrix:new T.Matrix4().compose(new T.Vector3(space.hand==='right'?.2:-.2,1.2,-.45),space.hand==='right'?rightQ:new T.Quaternion(),new T.Vector3(1,1,1)).elements}})};
 const press=(source,index,yes)=>{source.gamepad.buttons[index]={pressed:yes,value:Number(yes)};};
 function pointAt(row){const mesh=scene.getObjectByName('Fracture / menu pause immersif'),target=mesh.localToWorld(new T.Vector3(0,(.5-(268+122*row)/720)*.8015625,0));target.z-=game.player.z;rightQ=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,-1),target.sub(new T.Vector3(.2,1.2,-.45)).normalize());}
 return{xr,w,session,left,right,frame,press,get requests(){return requests;},get paused(){return paused;},get homes(){return homes;},get exits(){return exits;},get loop(){return loop;},pointAtHome:()=>pointAt(1),pointAtResume:()=>pointAt(0)};
}

test('VR requests keep the click activation and preserve the running mission on entry and exit',async t=>{
 const f=fixture(t);f.w.game.ammo[0]=7;f.w.game.time=42;const pending=f.xr.enter();assert.equal(f.requests,1);await pending;
 assert.equal(f.xr.active,true);assert.equal(f.paused,false);assert.equal(typeof f.loop,'function');assert.equal(f.w.game.time,42);assert.equal(f.w.game.ammo[0],7);
 await f.xr.exit();assert.equal(f.xr.active,false);assert.equal(f.exits,1);assert.equal(f.paused,true);assert.equal(f.w.camera.parent,f.w.scene);assert.equal(f.w.game.time,42);
});
test('a held trigger cannot fire on entry; pause consumes movement and can select Return Home in 3D',async t=>{
 const f=fixture(t);f.press(f.right,0,true);await f.xr.enter();assert.equal(f.xr.input(f.frame,.016).fire,false);
 f.press(f.right,0,false);f.xr.input(f.frame,.016);f.press(f.right,0,true);assert.equal(f.xr.input(f.frame,.016).fire,true);
 f.press(f.right,0,false);f.press(f.left,4,true);const c=f.xr.input(f.frame,.016);assert.equal(f.paused,true);assert.equal(c.fire,false);assert.equal(c.x,0);
 f.press(f.left,4,false);f.pointAtHome();f.xr.input(f.frame,.016);f.press(f.right,0,true);f.xr.input(f.frame,.016);await Promise.resolve();await Promise.resolve();
 assert.equal(f.xr.active,false);assert.equal(f.homes,1);assert.equal(f.exits,1);
});
test('a GPU screen renderer never masquerades as an immersive WebGL session',async t=>{
 const f=fixture(t);f.w.renderer.isWebGLRenderer=false;await assert.rejects(f.xr.enter(),/bouton VR/);assert.equal(f.requests,0);assert.equal(f.xr.active,false);
});
test('Resume in the 3D menu keeps the session and cannot activate a skill or shoot until release',async t=>{
 const skills=[];const f=fixture(t,args=>{skills.push(args.trigger);return false;});await f.xr.enter();f.xr.input(f.frame,.016);
 const before={ammo:f.w.game.ammo[7],position:{...f.w.game.player}};
 f.press(f.left,4,true);f.xr.input(f.frame,.016);assert.equal(f.paused,true);
 f.press(f.left,4,false);f.pointAtResume();f.xr.input(f.frame,.016);const calls=skills.length;
 f.press(f.right,0,true);const selected=f.xr.input(f.frame,.016);assert.equal(f.paused,false);assert.equal(f.xr.active,true);assert.equal(selected.fire,false);assert.equal(skills.length,calls,'the selecting frame cannot enter another menu');
 assert.equal(f.xr.input(f.frame,.016).fire,false);assert.equal(skills.at(-1),false,'held resume trigger does not leak into the wrist menu');
 assert.equal(f.w.game.ammo[7],before.ammo);assert.deepEqual(f.w.game.player,before.position);
 f.press(f.right,0,false);f.xr.input(f.frame,.016);f.press(f.right,0,true);assert.equal(f.xr.input(f.frame,.016).fire,true);
 await f.xr.exit();
});
test('the classic story XR menu resumes explicitly and never toggles a playing mission back to pause',t=>{
 const f=fixture(t);f.w.game.player.z=0;f.w.camera.position.set(0,1.65,0);let phase='paused',resumes=0,toggles=0;
 const controllers=[f.left,f.right].map(source=>{const ray=new T.Group(),anchor=new T.Group(),gun=new T.Group(),bare=new T.Group();ray.userData.source=source;anchor.matrixAutoUpdate=false;f.w.scene.add(ray,anchor);return{ray,anchor,gun,bare,source,tracked:true};});
 const state=Object.assign(Object.create(VRController.prototype),{mode:'xr',session:f.session,settings:{...VR_DEFAULTS},controllers,previous:new Map(),triggerBlocked:true,
  hooks:{world:()=>f.w,game:()=>f.w.game,phase:()=>phase,resume:()=>{resumes++;phase='playing';},togglePause:()=>{toggles++;phase=phase==='paused'?'playing':'paused';},pause:()=>{phase='paused';}}});
 state.makePauseBoard();state.input(f.frame);f.pointAtResume();state.input(f.frame);f.press(f.right,0,true);f.press(f.left,4,true);assert.equal(state.input(f.frame).fire,false);
 assert.equal(phase,'playing');assert.equal(resumes,1);assert.equal(toggles,0);assert.equal(state.input(f.frame).fire,false);
 f.press(f.right,0,false);state.input(f.frame);f.press(f.right,0,true);assert.equal(state.input(f.frame).fire,true);
 state.removePauseBoard();
});
