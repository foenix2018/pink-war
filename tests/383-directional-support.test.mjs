import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createCharacterKit,createSoldier} from '../dist/soldier.js';
import {CHARACTERS} from '../dist/characters.js';
import {buildGun} from '../dist/weapons.js';
import {installShadowUnit} from '../dist/shadow-unit-game.js';
import {PLAYER_SPEEDS} from '../dist/locomotion.js';
import {ArenaGame} from '../dist/game-logic.js';
function hero(profile){const kit=createCharacterKit(new T.Texture()),mats=Object.fromEntries(['dark','steel','armor','armorLight','rose','pale','violet','cyan'].map(n=>[n,new T.MeshStandardMaterial()]));const m=createSoldier(kit,()=>buildGun({mats,gloves:kit.gloves,sleeve:false,makeFlash:p=>{const f=new T.Object3D();p.add(f);return f;}}),profile);installShadowUnit(m,profile);m.root.scale.setScalar(m.heightScale);return m;}
const side=PLAYER_SPEEDS.walk*PLAYER_SPEEDS.side;
for(const profile of CHARACTERS)for(const fps of [30,60,120])test(`${profile.id}/${fps} Hz: recorded directional walks keep the rendered boots above the floor at the correct cadence`,()=>{
 const m=hero(profile),dt=1/fps,point=new T.Vector3();m.root.position.set(12,2.4,-19);let time=0;
 const boots=m.shadowUnit.armour.bindings.filter(b=>b.source.parent.name.includes('segmented boot')).map(b=>b.source);
 for(const v of [{x:0,z:-PLAYER_SPEEDS.walk},{x:side,z:0},{x:-side,z:0},{x:0,z:PLAYER_SPEEDS.walk*PLAYER_SPEEDS.back},{x:side/Math.SQRT2,z:-PLAYER_SPEEDS.walk/Math.SQRT2}]){
  for(let i=0;i<fps*1.5;i++){
   m.root.position.x+=v.x*dt;m.root.position.z+=v.z*dt;m.animate(time+=dt,true,0,0,0,dt,{velocity:v,ground:()=>2.4});m.root.updateMatrixWorld(true);
   if(i<fps*.3)continue;
   let floor=Infinity;for(const boot of boots){const p=boot.geometry.attributes.position;for(let j=0;j<p.count;j++)floor=Math.min(floor,point.fromBufferAttribute(p,j).applyMatrix4(boot.matrixWorld).y-2.4);}
   assert.ok(floor>-.003&&floor<.01,`actual rendered boot contact: ${floor}`);assert.ok(m.locomotion.planted.some(Boolean));
   assert.equal(m.locomotion.legYaw,0);assert.equal(m.locomotion.gait.source,'Adobe Mixamo');
   assert.ok(Math.abs(m.locomotion.gait.frequency*m.locomotion.gait.stride*m.heightScale-Math.hypot(v.x,v.z))<.000001,'cadence uses the imported stride and actual world speed');
  }
 }
 m.dispose();
});
test('pure strafing retains its existing controlled pace even when sprint is held and the view is rotated',()=>{
 function speed(sprint,yaw){const g=new ArenaGame([],()=>.5,{routes:[],lifts:[],height:()=>0,surfaces:()=>[]});g.nextWave=Infinity;g.toSpawn=0;for(let i=0;i<240;i++)g.step(1/60,{x:1,sprint,yaw});return Math.hypot(g.playerVelocity.x,g.playerVelocity.z);}
 assert.ok(Math.abs(speed(false,0)-side)<.001);assert.ok(Math.abs(speed(true,0)-PLAYER_SPEEDS.strafeMax)<.001);assert.ok(Math.abs(speed(true,Math.PI*.5)-speed(true,0))<.001);
});
