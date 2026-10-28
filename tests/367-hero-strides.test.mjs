import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createCharacterKit,createSoldier} from '../dist/soldier.js';
import {CHARACTERS} from '../dist/characters.js';
import {buildGun} from '../dist/weapons.js';
import {installShadowUnit,applyShadowMaterials} from '../dist/shadow-unit-game.js';
const directions=[{x:0,z:-3.2},{x:3.2,z:0},{x:0,z:3.2},{x:-3.2,z:0}];
function hero(profile){const k=createCharacterKit(new T.Texture());applyShadowMaterials(k,profile);const mats=Object.fromEntries(['dark','steel','armor','armorLight','rose','pale','violet','cyan'].map(n=>[n,new T.MeshStandardMaterial()]));const m=createSoldier(k,()=>buildGun({mats,gloves:k.gloves,sleeve:false,makeFlash:p=>{const f=new T.Object3D();p.add(f);return f;}}),profile);installShadowUnit(m,profile);return m;}
function step(m,v,dt,inPlace=false,flight={}){if(!inPlace){m.root.position.x+=v.x*dt;m.root.position.z+=v.z*dt;}m.animate((m.__time=(m.__time||0)+dt),Math.hypot(v.x,v.z)>.01,0,0,1,dt,{aim:true,velocity:v,inPlace,...flight});}
for(const profile of CHARACTERS)for(const fps of [30,60,120])test(`${profile.id}: continuous forward/back/side steps at ${fps} fps, with no crossing or inverted knees`,()=>{
 const m=hero(profile),dt=1/fps;m.root.scale.setScalar(m.heightScale);m.root.position.set(11,4.8,-23);
 for(const v of directions){let previous=null,previousDelta=null;for(let frame=0;frame<fps*2;frame++){
  step(m,v,dt);const j=m.jointPositions(),at=name=>m.root.worldToLocal(j[name].clone()),left=at('leftAnkle'),right=at('rightAnkle');
  assert.ok(right.x-left.x>.13,'boots must not cross, including changes of direction');
  for(const side of ['left','right']){const hip=at(side+'Hip'),knee=at(side+'Knee'),ankle=at(side+'Ankle');assert.ok(knee.z<hip.clone().lerp(ankle,.5).z+.015,'knees continue to bend forward');}
  if(frame>fps*.5&&previous){const delta=left.clone().sub(previous);assert.ok(delta.length()/dt<4.5,'no single-frame ankle teleport');if(previousDelta)assert.ok(delta.clone().sub(previousDelta).length()/(dt*dt)<130,'foot release remains smooth');previousDelta=delta;}previous=left;
 }}m.dispose();
});
for(const profile of CHARACTERS)test(profile.id+': the stationary workshop and real translation produce the same local skeleton',()=>{
 const a=hero(profile),b=hero(profile);a.root.scale.setScalar(a.heightScale);b.root.scale.setScalar(b.heightScale);a.root.position.set(12,4.8,-20);b.root.position.set(0,4.8,0);
 for(const v of directions)for(let i=0;i<90;i++){step(a,v,1/60);step(b,v,1/60,true);const A=a.jointPositions(),B=b.jointPositions();for(const joint of ['pelvis','leftKnee','rightKnee','leftAnkle','rightAnkle'])assert.ok(a.root.worldToLocal(A[joint]).distanceTo(b.root.worldToLocal(B[joint]))<1e-5,joint+' must not use the world origin as its contact frame');}
 a.dispose();b.dispose();
});
test('rendered toe and heel clear the real ground through forward, back, side and crouched poses',()=>{
 const m=hero(CHARACTERS[1]);m.root.scale.setScalar(m.heightScale);m.root.position.set(7,2.4,-12);const soles=[];
 for(const b of m.shadowUnit.armour.bindings.filter(b=>b.source.parent.name.includes('segmented boot'))){const p=b.source.geometry.attributes.position;let min=Infinity;for(let i=0;i<p.count;i++)min=Math.min(min,p.getY(i));for(let i=0;i<p.count;i++)if(p.getY(i)<min+.001)soles.push({source:b.source,index:i});}
 assert.ok(soles.length>30);const p=new T.Vector3();
 for(const crouched of [false,true])for(const v of directions)for(let i=0;i<80;i++){step(m,v,1/60,false,{crouched});m.root.updateMatrixWorld(true);if(i>15)for(const s of soles){p.fromBufferAttribute(s.source.geometry.attributes.position,s.index).applyMatrix4(s.source.matrixWorld);assert.ok(p.y>m.root.position.y-.002,`boot depth ${p.y-m.root.position.y}: ${s.source.parent.name}, frame ${i}, direction ${JSON.stringify(v)}`);}}
 m.dispose();
});
