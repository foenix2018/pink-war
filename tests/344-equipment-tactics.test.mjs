import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {parseKenneyGLB,MK4_WEAPON_ASSETS,setKenneyAccent} from '../dist/kenney-blasters.js';
import {createCharacterKit} from '../dist/soldier.js';
import {CHARACTERS} from '../dist/characters.js';
import {flatSightPose,magnifiedFov} from '../dist/optics.js';
import {tacticalOrder,chooseTacticalCover} from '../dist/tactical-enemies.js';
import {ArenaGame,segmentBox} from '../dist/game-logic.js';
import {RoomGame} from '../dist/room-game.js';
import {CampaignLevel1} from '../dist/campaign-level1.js';
const load=i=>{const b=readFileSync(new URL('../dist/assets/pink-war/'+MK4_WEAPON_ASSETS[i],import.meta.url));return parseKenneyGLB(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));};

test('both installed scopes have a truly open sightline and align with the flat-screen eye at exact 2x/4x zoom',()=>{
 for(const i of [1,2]){
  const model=load(i),cfg=model.userData.optic,pose=flatSightPose(cfg);model.position.set(pose.x,pose.y,pose.z);model.updateMatrixWorld(true);
  const lens=model.localToWorld(new T.Vector3(0,cfg.y,cfg.z));assert.ok(Math.abs(lens.x)+Math.abs(lens.y)<1e-7);assert.ok(lens.z<-.1&&lens.z>-.2);
  const hits=new T.Raycaster(new T.Vector3(),new T.Vector3(0,0,-1),.001,2).intersectObject(model,true);
  assert.equal(hits.length,0,'the optical axis is not blocked by caps, hoods, rail or receiver');
  const camera=new T.PerspectiveCamera(magnifiedFov(72,cfg.magnification),1,.01,100);camera.updateMatrixWorld();camera.updateProjectionMatrix();
  const pixel=new T.Vector3(1,0,-10).project(camera).x,base=new T.PerspectiveCamera(72,1,.01,100);base.updateMatrixWorld();
  assert.ok(Math.abs(pixel/new T.Vector3(1,0,-10).project(base).x-cfg.magnification)<1e-7);
 }
});
test('pearlescent shells follow each hero while the approved glove material remains unchanged',()=>{
 const kit=createCharacterKit(new T.Texture()),glove=kit.gloves.plate,rough=glove.roughness;
 for(const hero of CHARACTERS){
  kit.setPalette(hero.armor);setKenneyAccent(hero.armor.rose);
  assert.equal(kit.gloves.plate,glove);assert.equal(glove.color.getHex(),hero.armor.rose);assert.equal(glove.roughness,rough);
  const m=kit.armorMaterials.pearl;assert.notEqual(m,kit.materials.pearl);assert.ok(m.metalness>.7&&m.clearcoat>.8&&m.iridescence>0);
  assert.equal(m.emissive.getHex(),0);assert.equal(hero.id==='lylu',m.color.b>m.color.r);
  const colors=[];load(1).traverse(o=>{if(o.material?.name==='PW_MK4_ceramic'){assert.ok(o.material.isMeshPhysicalMaterial&&o.material.iridescence>0);colors.push(o.material.color.getHex());}});assert.ok(colors.length);
 }
});
const wall={x:0,z:12,hx:3,hz:.3,y:0,height:2.8};
const make=()=>({id:8,form:'synth',x:3.8,z:15,elevation:0,radius:.65,awareness:'engaged',ranged:true});
const threat={x:0,y:1.25,z:0};
test('adaptive cover is hidden by a real wall, has an unobstructed peek, and is not shared by nearby allies',()=>{
 const e=make(),c=chooseTacticalCover(e,threat,[wall],[],segmentBox);assert.ok(c);
 assert.notEqual(segmentBox({...c.hidden,y:1.6},threat,wall),null);assert.equal(segmentBox({...c.peek,y:1.6},threat,wall),null);
 const ally={...e,id:9,tactics:{cover:c}},other=chooseTacticalCover(e,threat,[wall],[ally],segmentBox);assert.ok(!other||Math.hypot(other.hidden.x-c.hidden.x,other.hidden.z-c.hidden.z)>=2.2);
 assert.equal(chooseTacticalCover(e,threat,[{...wall,height:1}],[],segmentBox),null,'a low obstruction cannot conceal a standing robot');
});
test('synthetic moves into cover, waits, peeks for two shots and returns; hidden memories never grant fire',()=>{
 const e=make(),args={time:0,threat,seen:true,obstacles:[wall],allies:[],segmentBox};
 let o=tacticalOrder(e,args);assert.equal(o.state,'relocate');assert.equal(o.canFire,false);
 Object.assign(e,o.point);o=tacticalOrder(e,{...args,time:.1,seen:false});assert.equal(o.state,'cover');
 o=tacticalOrder(e,{...args,time:3,seen:false});assert.equal(o.state,'peek');assert.equal(o.canFire,false);
 Object.assign(e,o.point);o=tacticalOrder(e,{...args,time:3.1});assert.equal(o.canFire,true);
 e.tactics.shots=2;o=tacticalOrder(e,{...args,time:3.3});assert.equal(o.state,'return');assert.equal(o.canFire,false);
 e.awareness='patrol';assert.equal(tacticalOrder(e,{...args,time:4}),null);assert.equal(e.tactics.cover,null);
});
test('the live campaign introduces N-08 and the arena unlocks it without removing existing wave limits',()=>{
 const c=new CampaignLevel1([],()=>.5);assert.ok(c.enemies.some(e=>e.form==='synth'&&e.ranged));assert.equal(c.enemies.length,8);
 const g=new ArenaGame([wall],()=>.5);g.wave=3;g.spawned=1;g.spawnEnemy();assert.equal(g.enemies.at(-1).form,'synth');assert.equal(g.enemies.at(-1).ranged,true);
});

test('in the full ballistics simulation N-08 completes repeated cover cycles and fires only from its exposed position',()=>{
 const g=new ArenaGame([wall],()=>.5);g.nextWave=-1;g.toSpawn=0;Object.assign(g.player,{x:0,z:0});g.invulnerable=1e6;
 const e={...make(),speed:2.4,hp:1000,elite:false,aimHeight:1.6,hitRadius:.9,attackTimer:0,grounded:true,verticalSpeed:0,lastKnownX:0,lastKnownZ:0,lastKnownHeight:0,alertedUntil:100,yaw:0,patrolAngle:0,patrolTimer:1};g.enemies=[e];const states=new Set();let shots=0;
 for(let i=0;i<900;i++){g.step(1/30,{});states.add(e.tactics?.state);for(const event of g.drainEvents())if(event.type==='enemy-shot'){shots++;assert.equal(e.tactics.state,'peek');assert.equal(segmentBox({x:e.x,y:e.elevation+e.aimHeight,z:e.z},{x:0,y:1.25,z:0},wall),null);}}
 assert.deepEqual([...states].sort(),['cover','peek','relocate','return']);assert.ok(shots>=4,'the robot repeatedly emerges, fires and takes cover again');
});

test('AT HOME outdoor robots use the same cover loop without moving the tracked player',()=>{
 const room={outdoor:true,coverBoxes:()=>[wall],hasFloor:()=>true,floorAt:()=>0,freeArea:()=>36,canStand:p=>!(Math.abs(p.x)<3.65&&Math.abs(p.z-12)<.95),waypoint:(_e,p)=>p,trace:(a,b)=>{const t=segmentBox(a,b,wall);return t===null?null:{t};}};
 const g=new RoomGame(room,()=>.5);g.start({x:0,y:1.65,z:0});g.nextWave=-1;g.toSpawn=0;g.invulnerable=1e6;
 const e={...make(),groundY:0,roomScale:1,speed:2.4,hp:1000,elite:false,aimHeight:1.88,hitRadius:.9,attackTimer:0,grounded:true,verticalSpeed:0,lastKnownX:0,lastKnownZ:0,lastKnownHeight:0,alertedUntil:100,yaw:0,stunnedUntil:0,limpUntil:0};g.enemies=[e];const states=new Set();let shots=0;
 for(let i=0;i<900;i++){g.step(1/30);states.add(e.tactics?.state);shots+=g.drainEvents().filter(e=>e.type==='enemy-shot').length;}
 assert.ok(states.has('cover')&&states.has('peek')&&states.has('return'));assert.ok(shots>=2);assert.deepEqual(g.head,{x:0,y:1.65,z:0});
});
