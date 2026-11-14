import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createCharacterKit,createSoldier} from '../dist/soldier.js';
import {CHARACTERS} from '../dist/characters.js';
import {buildGun} from '../dist/weapons.js';
import {installShadowUnit} from '../dist/shadow-unit-game.js';
import {PLAYER_SPEEDS} from '../dist/locomotion.js';
import {ArenaGame} from '../dist/game-logic.js';

function hero(profile){
 const kit=createCharacterKit(new T.Texture()),mats=Object.fromEntries(['dark','steel','armor','armorLight','rose','pale','violet','cyan'].map(n=>[n,new T.MeshStandardMaterial()]));
 const m=createSoldier(kit,()=>buildGun({mats,gloves:kit.gloves,sleeve:false,makeFlash:p=>{const f=new T.Object3D();p.add(f);return f;}}),profile);
 installShadowUnit(m,profile);m.root.scale.setScalar(m.heightScale);return m;
}
const side=PLAYER_SPEEDS.walk*PLAYER_SPEEDS.side;
const directions=[{x:0,z:-PLAYER_SPEEDS.walk},{x:side,z:0},{x:-side,z:0},{x:0,z:PLAYER_SPEEDS.walk*PLAYER_SPEEDS.back},{x:side/Math.SQRT2,z:-PLAYER_SPEEDS.walk/Math.SQRT2}];
for(const profile of CHARACTERS)for(const fps of [30,60,120])test(`${profile.id}/${fps} Hz: walking in every direction retains real boot support, balanced steps and a stable pelvis`,()=>{
 const m=hero(profile),dt=1/fps,point=new T.Vector3();m.root.position.set(12,2.4,-19);
 const boots=['Left','Right'].map(side=>m.shadowUnit.armour.bindings.find(b=>b.source.parent.name==='Shadow / segmented boot '+side).source);
 let time=0;
 function step(v){m.root.position.x+=v.x*dt;m.root.position.z+=v.z*dt;m.animate(time+=dt,true,0,0,0,dt,{velocity:v,ground:()=>2.4});m.root.updateMatrixWorld(true);}
 for(const v of directions){
  for(let i=0;i<fps;i++)step(v);
  const count=Math.round(3/m.locomotion.gait.frequency*fps),support=[0,0],previous=[null,null],hip=[[],[]],pelvis=[];let pairs=0,maxSlip=0,double=0;
  for(let i=0;i<count;i++){
   step(v);assert.ok(m.locomotion.planted.some(Boolean),'walking must never have two unsupported feet');double+=Number(m.locomotion.planted.every(Boolean));
   const y=m.root.worldToLocal(m.jointPositions().pelvis).y;pelvis.push(y);
   for(let f=0;f<2;f++){
    if(!m.locomotion.planted[f]){previous[f]=null;continue;}
    support[f]++;hip[f].push(y);point.fromBufferAttribute(boots[f].geometry.attributes.position,0).applyMatrix4(boots[f].matrixWorld);
    if(previous[f]){maxSlip=Math.max(maxSlip,point.distanceTo(previous[f]));pairs++;}previous[f]=point.clone();
   }
  }
  assert.ok(pairs>count*.4,'support must last across frames');
  // At 30 Hz a short double-support window can fall between two samples.
  const expectedDouble=2*m.locomotion.gait.duty-1,quantisation=2*m.locomotion.gait.frequency/fps;
  assert.ok(expectedDouble>0&&double>=count*Math.max(0,expectedDouble-quantisation),'walking includes double support within the sampling resolution');
  assert.ok(maxSlip<.003,`rendered support foot slides: ${maxSlip}`);
  assert.ok(Math.abs(support[0]-support[1])/count<.02+m.locomotion.gait.frequency/fps,`left and right share support evenly within one sampling frame per cycle: ${JSON.stringify({v,support,count,frequency:m.locomotion.gait.frequency})}`);
  assert.ok(Math.max(...pelvis)-Math.min(...pelvis)<.035,'no repeated knee-driven pelvis collapse');
  const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
  assert.ok(Math.abs(mean(hip[0])-mean(hip[1]))<.012,'one leg must not compress the body more than the other');
 }
 m.dispose();
});

test('pure strafing uses a deliberate sideways pace even while sprint is held; view yaw only rotates that travel',()=>{
 function speed(sprint,yaw){const g=new ArenaGame([],()=>.5,{routes:[],lifts:[],height:()=>0,surfaces:()=>[]});g.nextWave=Infinity;g.toSpawn=0;for(let i=0;i<240;i++)g.step(1/60,{x:1,sprint,yaw});return Math.hypot(g.playerVelocity.x,g.playerVelocity.z);}
 assert.ok(Math.abs(speed(false,0)-side)<.001);assert.ok(Math.abs(speed(true,0)-PLAYER_SPEEDS.strafeMax)<.001);
 assert.ok(Math.abs(speed(true,Math.PI*.5)-speed(true,0))<.001);assert.ok(PLAYER_SPEEDS.strafeMax<PLAYER_SPEEDS.sprint*.5);
});
