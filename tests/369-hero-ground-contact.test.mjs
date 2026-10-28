import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createCharacterKit,createSoldier} from '../dist/soldier.js';
import {buildGun} from '../dist/weapons.js';
import {CHARACTERS} from '../dist/characters.js';
import {installShadowUnit} from '../dist/shadow-unit-game.js';
import {ArenaGame} from '../dist/game-logic.js';
function hero(profile){const k=createCharacterKit(new T.Texture()),mats=Object.fromEntries(['dark','steel','armor','armorLight','rose','pale','violet','cyan'].map(n=>[n,new T.MeshStandardMaterial()]));const m=createSoldier(k,()=>buildGun({mats,gloves:k.gloves,sleeve:false,makeFlash:p=>{const f=new T.Object3D();p.add(f);return f;}}),profile);installShadowUnit(m,profile);m.root.scale.setScalar(m.heightScale);return m;}
function vertices(m){return ['Left','Right'].map(side=>{const bindings=m.shadowUnit.armour.bindings.filter(b=>b.source.parent.name==='Shadow / segmented boot '+side),b=bindings[0];return{mesh:b.source,index:0,all:bindings.flatMap(b=>Array.from({length:b.source.geometry.attributes.position.count},(_,index)=>({mesh:b.source,index})))};});}
function vertex(b,index=b.index){return new T.Vector3().fromBufferAttribute(b.mesh.geometry.attributes.position,index).applyMatrix4(b.mesh.matrixWorld);}
function animate(m,v,dt,ground=()=>0){m.__time=(m.__time||0)+dt;m.animate(m.__time,Math.hypot(v.x,v.z)>.025,0,0,1,dt,{velocity:v,ground,aim:true});m.root.updateMatrixWorld(true);}
for(const profile of CHARACTERS)for(const fps of [30,60,120])test(`${profile.id}: actual boot vertices stay fixed during forward support at walking, running and sprint speeds / ${fps} Hz`,()=>{
 const m=hero(profile),boots=vertices(m),dt=1/fps;
 for(const speed of [1.6,7,10]){
  const v={x:0,z:-speed};for(let i=0;i<fps;i++){m.root.position.z-=speed*dt;animate(m,v,dt);}
  const previous=[null,null];let pairs=0,contacts=0,maxSlip=0;
  for(let i=0;i<fps*2;i++){
   m.root.position.z-=speed*dt;animate(m,v,dt);
   for(let foot=0;foot<2;foot++){
    const p=vertex(boots[foot]);
    if(m.locomotion.planted[foot]){
     contacts++;if(previous[foot]){pairs++;maxSlip=Math.max(maxSlip,Math.hypot(p.x-previous[foot].x,p.z-previous[foot].z));}
     const floor=Math.min(...boots[foot].all.map(b=>vertex(b).y));assert.ok(floor>-.002&&floor<.009,'the rendered sole touches the real contact plane');previous[foot]=p;
    }else previous[foot]=null;
   }
  }
  assert.ok(contacts>fps*.3&&pairs>fps*.08,'real support persists across several frames and strides');assert.ok(maxSlip<.002,`actual sole drift at ${speed} m/s: ${maxSlip}`);
 }m.dispose();
});
function follow(m,g,dt,input={}){g.step(dt,input);m.root.position.set(g.player.x,g.player.elevation,g.player.z);m.root.rotation.y=g.player.yaw;animate(m,g.playerVelocity,dt,(x,z,y)=>g.footGroundHeight(x,z,y));}
for(const profile of CHARACTERS)test(profile.id+': the feet use the actual rising ramp and retain their world contact as the body climbs',()=>{
 const m=hero(profile),g=new ArenaGame([]),boots=vertices(m);g.nextWave=999;g.toSpawn=0;Object.assign(g.player,{x:-48,z:60,elevation:g.surfaceHeight(-48,60),grounded:true});
 const previous=[null,null];let pairs=0,maxSlip=0,maxDepth=0;
 for(let i=0;i<160;i++){
  follow(m,g,1/60,{z:-.7});assert.equal(g.player.grounded,true);
  if(i<40)continue;
  for(let f=0;f<2;f++)if(m.locomotion.planted[f]){const p=vertex(boots[f]);if(previous[f]){pairs++;maxSlip=Math.max(maxSlip,p.distanceTo(previous[f]));}previous[f]=p;for(const b of boots[f].all){const v=vertex(b),height=g.footGroundHeight(v.x,v.z,g.player.elevation);maxDepth=Math.max(maxDepth,height-v.y);}}else previous[f]=null;
 }
 assert.ok(g.player.elevation>3);assert.ok(pairs>10);assert.ok(maxSlip<.004,`ramp contact drift: ${maxSlip}`);assert.ok(maxDepth<.004,`sole below the actual incline: ${maxDepth}`);m.dispose();
});
test('moving lift carries the actual soles without initiating horizontal steps',()=>{
 const m=hero(CHARACTERS[1]),g=new ArenaGame([]),boots=vertices(m);g.nextWave=999;g.toSpawn=0;g.time=5;Object.assign(g.player,{x:-59,z:39,elevation:g.surfaceHeight(-59,39),grounded:true});
 let min=Infinity,max=-Infinity;for(let i=0;i<240;i++){follow(m,g,1/60);if(i>20){for(const b of boots){const y=Math.min(...b.all.map(v=>vertex(v).y))-g.player.elevation;min=Math.min(min,y);max=Math.max(max,y);}assert.equal(m.locomotion.gait.frequency,0);}}
 assert.ok(g.player.elevation>0);assert.ok(min>-.002&&max<.009,`${min} / ${max}`);m.dispose();
});
test('blocked forward input stops the distance clock, while a rotated pavement is shared by physics and foot queries',()=>{
 const m=hero(CHARACTERS[1]),wall={x:0,z:18,hx:2,hz:.3,height:3},g=new ArenaGame([wall]);g.nextWave=999;g.toSpawn=0;m.root.position.set(g.player.x,0,g.player.z);animate(m,{x:0,z:0},1/60);
 let travelled=0;for(let i=0;i<100;i++){const old=g.player.z;follow(m,g,1/60,{z:-1});travelled+=Math.abs(g.player.z-old);}
 const phase=m.locomotion.gait.phase,distance=m.locomotion.gait.distance;for(let i=0;i<30;i++)follow(m,g,1/60,{z:-1});assert.equal(m.nativeMotion,'rifle');assert.equal(m.locomotion.gait.phase,phase);assert.equal(m.locomotion.gait.distance,distance);assert.ok(Math.abs(distance-travelled)<1e-6);
 const pavement={x:4,z:4,hx:1,hz:3,y:-.025,height:.10,walkableSurface:true,groundSurface:true,surfaceYaw:.25};g.replaceObstacles([pavement]);Object.assign(g.player,{x:4,z:4,elevation:0,grounded:true});follow(m,g,1/60);assert.ok(Math.abs(g.player.elevation-.075)<1e-9);assert.equal(g.footGroundHeight(4,4),g.player.elevation);assert.equal(g.groundHeight(6,4),0);m.dispose();
});
test('turning at rest repositions one foot at a time instead of twisting both planted legs',()=>{
 const m=hero(CHARACTERS[1]);for(let i=0;i<30;i++)animate(m,{x:0,z:0},1/60);let lifted=0;
 for(let i=0;i<240;i++){m.root.rotation.y=i/120*.8;animate(m,{x:0,z:0},1/120);const j=m.jointPositions(),l=m.root.worldToLocal(j.leftAnkle),r=m.root.worldToLocal(j.rightAnkle);assert.ok(r.x-l.x>.13);assert.ok(m.locomotion.planted.some(Boolean));lifted+=Number(!m.locomotion.planted.every(Boolean));}
 assert.ok(lifted>30);m.dispose();
});

test('a foot over a ledge is not reported as planted on an unreachable lower floor',()=>{
 const m=hero(CHARACTERS[1]);m.root.position.y=2.4;
 for(let i=0;i<40;i++)animate(m,{x:0,z:0},1/60,x=>x>=0?2.4:0);
 assert.equal(m.locomotion.planted[0],false);assert.equal(m.locomotion.planted[1],true);assert.ok(m.hips.position.y>.80);m.dispose();
});
