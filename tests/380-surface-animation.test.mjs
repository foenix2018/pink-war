import test from 'node:test';import assert from 'node:assert/strict';import {existsSync,readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {surfaceSet,metricGround,createPhotoResponse,createWorldRadiance,fillWorldRadiance} from '../dist/world-material-response.js';
import {describeEnemyImpact,createImpactMotion,createFootPlant} from '../dist/enemy-body-response.js';
import {createEnemyFactory} from '../dist/enemies.js';import {rangedMuzzle} from '../dist/enemy-combat.js';
test('every scan completed by the industrial maps has matching local colour, relief and roughness assets',()=>{
 for(const name of ['m04-art.js','m06-art.js']){const code=readFileSync(new URL('../dist/'+name,import.meta.url),'utf8');for(const [,kind,asset]of code.matchAll(/(CC|L9)\('([^']+)'\)/g)){
  const url='./assets/'+(kind==='CC'?'cc0/':'ligne9/l9-')+asset+'_diff_512.jpg',set=surfaceSet(url);assert.ok(set,url);for(const path of Object.values(set))assert.ok(existsSync(new URL('../dist/'+path.slice(2),import.meta.url)),path);
 }}assert.equal(surfaceSet('./art/hero-logo.png'),null);
});
test('matching PBR channels retain identical metric transforms and data textures stay out of sRGB',async()=>{
 const requests=[],loader={load(url,done){requests.push(url);done(new T.Texture());}},photo=createPhotoResponse(T,{loader}),m=new T.MeshStandardMaterial({map:new T.Texture()});m.map.repeat.set(3,4);m.map.offset.set(.2,.3);m.map.rotation=.4;
 photo.bind(m,'./assets/cc0/vesper-asphalt_diff_512.jpg');await photo.ready;assert.equal(requests.length,3);assert.equal(photo.stats().failed,0);
 for(const t of [m.map,m.normalMap,m.roughnessMap]){assert.deepEqual(t.repeat.toArray(),[3,4]);assert.deepEqual(t.offset.toArray(),[.2,.3]);assert.equal(t.rotation,.4);}assert.equal(m.map.colorSpace,T.SRGBColorSpace);assert.equal(m.normalMap.colorSpace,T.NoColorSpace);assert.equal(m.roughnessMap.colorSpace,T.NoColorSpace);photo.dispose();
});
test('ground UVs use metres without multiplying the repeat of materials shared by decks',()=>{
 const g=metricGround(T,220,220,4),uv=g.attributes.uv;assert.equal(Math.max(...Array.from({length:uv.count},(_,i)=>uv.getX(i))),55);
 for(const name of ['m04-art.js','m06-art.js']){const code=readFileSync(new URL('../dist/'+name,import.meta.url),'utf8');assert.ok(code.includes('metricGround(T,220,220,M.asphalt.userData.tile)'));assert.ok(!code.includes('repeat?.set(30, 30)'));}g.dispose();
});
test('indirect radiance is finite HDR, preserves an existing environment and disposes only its own probe',()=>{
 const ldr=createWorldRadiance(T,{low:true});assert.equal(ldr.type,T.UnsignedByteType);assert.ok(ldr.image.data instanceof Uint8Array);ldr.dispose();const t=createWorldRadiance(T);assert.equal(t.image.width,64);assert.ok([...t.image.data].every(Number.isFinite));assert.ok([...t.image.data].some(v=>T.DataUtils.fromHalfFloat(v)>1));const scene=new T.Scene(),root=new T.Group();scene.add(root);const own=fillWorldRadiance(T,root,{});assert.ok(own&&scene.environment===own.texture);assert.equal(fillWorldRadiance(T,root,{}),null);own.dispose();assert.equal(scene.environment,null);t.dispose();
});
test('a planted foot holds world position during translation and a gradual turn, and releases on lift or teleport',()=>{
 const foot=createFootPlant(),first=foot.update(.2,-.15,{frame:{x:0,z:0,yaw:0},moving:true});assert.ok(first.planted);
 const frame={x:.08,z:-.04,yaw:.09},p=foot.update(.2,-.15,{frame,moving:true});const x=frame.x+p.x*Math.cos(frame.yaw)+p.z*Math.sin(frame.yaw),z=frame.z-p.x*Math.sin(frame.yaw)+p.z*Math.cos(frame.yaw);assert.ok(Math.abs(x-.2)<1e-8&&Math.abs(z+.15)<1e-8);
 assert.equal(foot.update(.2,-.15,{frame,moving:true,lift:.1}).planted,false);assert.ok(Math.abs(foot.update(.2,-.15,{frame:{x:20,z:20,yaw:1},moving:true}).x-.2)<1e-8);
});
test('hit response follows impact direction and damage, and a heavy chassis absorbs more of the impulse',()=>{
 const enemy={x:0,z:0,yaw:0,hp:200,maxHp:250};const left=describeEnemyImpact(enemy,{x:-.25,z:0},{x:-10,z:0},50),right=describeEnemyImpact(enemy,{x:.25,z:0},{x:10,z:0},50);assert.ok(left.roll<0&&right.roll>0);assert.ok(left.yaw<0&&right.yaw>0);
 const heavy=describeEnemyImpact({...enemy,form:'brute'},{x:-.25,z:0},{x:-10,z:0},50);assert.ok(Math.abs(heavy.roll)<Math.abs(left.roll));assert.equal(describeEnemyImpact(enemy,{}, {x:0,z:0},0),null);
});
test('impact recovery is frame independent, accumulates bounded bursts and ignores an old hit after a time jump',()=>{
 const sample=hz=>{const m=createImpactMotion();for(let i=0;i<hz/2;i++)m.update(1/hz,(i+1)/hz,{id:1,time:0,pitch:.12,yaw:-.08,roll:.1});return {...m.state};};const a=sample(30),b=sample(120);for(const k of Object.keys(a))assert.ok(Math.abs(a[k]-b[k])<1e-8);
 const m=createImpactMotion();for(let i=0;i<100;i++)m.update(1/60,i/60,{id:i,time:i/60,pitch:.3,yaw:.3,roll:-.3});for(const v of Object.values(m.state))assert.ok(Math.abs(v)<=.22);m.update(.016,20,{id:1,time:0,pitch:.2});assert.equal(m.state.pitch,0);
});
test('native infantry and heavy weapon bores remain authoritative while their torso reacts to an impact',()=>{
 const mats=Object.fromEntries(['monster','monsterElite','monsterFace','cyan','rose','violet','pale'].map(k=>[k,new T.MeshStandardMaterial()]));
 for(const form of ['seer','bulwark']){const actor=createEnemyFactory(mats).create(false,true,form),e={id:1,form,x:0,z:0,elevation:0,yaw:0,ranged:true,awareness:'engaged',aimPitch:.15,aimYaw:0,hitImpulse:{id:1,time:1,pitch:.12,yaw:.04,roll:.1}};
  actor.userData.animate(.9,0,false,e,.9);actor.userData.animate(1.05,0,false,e,1.05);actor.updateMatrixWorld(true);const bore=actor.userData.muzzle(),physical=rangedMuzzle(e);assert.ok(bore.origin.distanceTo(new T.Vector3(physical.x,physical.y,physical.z))<1e-5,form);actor.removeFromParent();actor.userData.dispose?.();
 }
});

test('the actual retargeted chasers and Brute keep support feet fixed in the world while walking',()=>{
 const mats=Object.fromEntries(['monster','monsterElite','monsterFace','cyan','rose','violet','pale'].map(k=>[k,new T.MeshStandardMaterial()]));
 for(const form of ['stalker','brute','spectre']){const actor=createEnemyFactory(mats).create(false,false,form),feet=actor.userData.skeleton.bones.filter(b=>b.name.endsWith('ankle'));let fixed=0,contacts=0,last=[];
  for(let i=0;i<90;i++){const t=i/60;actor.position.z=-t*1.7;actor.userData.animate(t,0,true,{grounded:true,motionZ:-1.7,yaw:0,awareness:'engaged'},t);actor.updateMatrixWorld(true);const points=feet.map(f=>f.getWorldPosition(new T.Vector3()));if(actor.userData.footContacts)contacts++;for(let j=0;j<points.length;j++)if(last[j]&&i>10&&Math.hypot(points[j].x-last[j].x,points[j].z-last[j].z)<.0001)fixed++;last=points;}
  assert.ok(fixed>40&&contacts>50,`${form}: fixed ${fixed}, contact ${contacts}`);
 }
});

test('the new desktop sun refreshes at its budget during normal travel and updates immediately after teleporting',async()=>{
 const {createWorldShadows}=await import('../dist/world-shadows.js'),scene=new T.Scene(),light=new T.DirectionalLight(),renderer={shadowMap:{}};scene.add(light);
 const shadows=createWorldShadows(T,{scene,renderer,light,profile:{artQuality:'low',shadowMoveThreshold:2}});
 for(let i=0;i<=60;i++)shadows.update(i/60,{x:i/60*7,z:0});assert.ok(shadows.stats().updates<=8);const old=shadows.stats().updates;shadows.update(1.01,{x:40,z:0});assert.equal(shadows.stats().updates,old+1);shadows.dispose();
});
