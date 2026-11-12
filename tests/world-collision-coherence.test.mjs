import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import{ArenaGame,moveInArena,segmentBox,clipMuzzleOrigin}from'../dist/game-logic.js';
import{sectorObstacles,sectorTraversal}from'../dist/m03-sector.js';import*as L from'../dist/m03-layout.js';
import{LEVEL1_MAP}from'../dist/level1-layout.js';import{M02_BOUNDARY}from'../dist/m02-physical-layout.js';
import{checkpointPlacement}from'../dist/checkpoint-beacon.js';
const meta=JSON.parse(fs.readFileSync(new URL('../dist/assets/m03/vesper-sector.json',import.meta.url)));
const maps=[['M01',LEVEL1_MAP.obstacles],['M02',M02_BOUNDARY],['M03',sectorObstacles(meta)]];
for(const[name,obstacles]of maps)test(`${name}: visible solid walls stop player, enemy and both projectile directions`,()=>{
 const walls=obstacles.filter(o=>!o.walkableSurface&&!o.stairBody&&(o.y||0)<.1&&o.height>2&&Math.max(o.hx,o.hz)>1.5&&Math.min(o.hx,o.hz)<.75);
 assert.ok(walls.length>0);
 for(const wall of walls){
  const axis=wall.hx<wall.hz?'x':'z',half=axis==='x'?wall.hx:wall.hz;
  const dir=wall[axis]-half-2 < -98? -1:1;
  const start={x:wall.x,z:wall.z,elevation:0};start[axis]-=dir*(half+2);
  for(const radius of [.55,.86,1.05]){const actor={...start};moveInArena(actor,axis==='x'?dir*(half*2+5):0,axis==='z'?dir*(half*2+5):0,radius,[wall]);assert.ok(dir>0?actor[axis]<=wall[axis]-half-radius+.0001:actor[axis]>=wall[axis]+half+radius-.0001);}
  const a={x:start.x,y:1.25,z:start.z},b={...a,[axis]:wall[axis]+dir*(half+2)};assert.notEqual(segmentBox(a,b,wall),null);assert.notEqual(segmentBox(b,a,wall),null);
 }
 // Real ballistics, including a barrel that extends through a wall.
 const wall={x:0,z:0,hx:.08,hz:6,y:0,height:4,surface:'concrete'},g=new ArenaGame([wall],()=>.5,{routes:[],lifts:[],height:()=>0,surfaces:()=>[]});g.nextWave=Infinity;g.toSpawn=0;Object.assign(g.player,{x:-.7,z:0,elevation:0});
 const muzzle=clipMuzzleOrigin(g.player,{x:.8,y:1.3,z:0},g.obstacles);assert.ok(muzzle.x<-.08);
 assert.ok(g.shoot({x:.8,y:1.3,z:0},{x:1,y:0,z:0}));g.step(.05,{});assert.equal(g.bullets.length,0,'friendly shot hits the near wall face');assert.ok(g.drainEvents().some(e=>e.type==='impact'&&e.surface==='concrete'));
 const hp=g.player.hp;g.bullets.push({id:900,x:2,y:1.25,z:0,vx:-100,vy:0,vz:0,life:2,damage:40,hostile:true,splash:0});g.step(.05,{});assert.equal(g.player.hp,hp,'enemy shot stops before the player');assert.equal(g.bullets.length,0);
});
test('M03 hulls include raised walls, stair sides and slabs from the visible bake',()=>{
 assert.ok(meta.physicalSolids.length>500);assert.ok(meta.physicalFloors.length>20);
 const w=sectorObstacles(meta);for(const kind of ['paroi géométrique','corps escalier','dalle'])assert.ok(w.some(o=>o.kind===kind),kind);
 const stair=w.find(o=>o.stairBody&&o.height>2),point={x:stair.x+stair.hx+2,z:stair.z,elevation:0};moveInArena(point,-5,0,.55,[stair]);assert.ok(point.x>=stair.x+stair.hx+.55);
 const slab=w.find(o=>o.walkableSurface&&o.y>3);assert.notEqual(segmentBox({x:slab.x,y:slab.y+3,z:slab.z},{x:slab.x,y:slab.y-1,z:slab.z},slab),null);
});
test('M03: complete ambulance envelope fits the service road after the street furniture is moved',()=>{
 const w=sectorObstacles(meta,L.extraObstacles({open:['barriere','remorque']}));
 for(let i=1;i<L.VAN_PATH.length;i++){
  const a=L.VAN_PATH[i-1],b=L.VAN_PATH[i],distance=Math.hypot(b.x-a.x,b.z-a.z),angle=Math.atan2(b.x-a.x,b.z-a.z),c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));
  const hx=c*L.VAN.halfWidth+s*L.VAN.halfLength,hz=c*L.VAN.halfLength+s*L.VAN.halfWidth;
  for(let t=0;t<=distance;t+=.2){const x=a.x+(b.x-a.x)*t/distance,z=a.z+(b.z-a.z)*t/distance;assert.ok(!w.some(o=>!o.walkableSurface&&(o.y||0)<L.VAN.height&&(o.y||0)+o.height>.3&&Math.abs(x-o.x)<hx+o.hx&&Math.abs(z-o.z)<hz+o.hz),`segment ${i} at ${x},${z}`);}
 }
 const uplink=L.INTERACTIONS.find(i=>i.id==='balise');assert.ok(Math.hypot(uplink.x,uplink.z+34)<9);
});
test('checkpoint beacons stand on the checkpoint floor and keep spawn space clear',()=>{
 const traversal=sectorTraversal(meta),game={time:0,obstacles:sectorObstacles(meta,L.extraObstacles()),surfaceHeight:(x,z,t,max)=>traversal.height(x,z,t,max)};
 for(const stage of L.STAGES){const p=checkpointPlacement(stage.checkpoint,game);assert.ok(p,stage.id);assert.ok(Math.abs(p.y-(stage.checkpoint.elevation||0))<.01);assert.ok(Math.hypot(p.x-stage.checkpoint.x,p.z-stage.checkpoint.z)>.8);}
});

test('M03: a machine behind a wall cannot halt or sabotage the ambulance',async()=>{
 const{createM03Mission}=await import('../dist/m03-mission.js');
 const g=new ArenaGame([],()=>.5,{routes:[],lifts:[],height:()=>0,surfaces:()=>[]}),wall={x:-3,z:46,hx:.12,hz:4,y:0,height:4,blocksInteraction:true};
 const m=createM03Mission({game:g,base:[wall]});m.start();
 for(const id of ['ines','alimentation','dossier','kit']){const it=L.INTERACTIONS.find(i=>i.id===id);Object.assign(g.player,{x:it.x,z:it.z,elevation:it.y||0});assert.equal(m.interact()?.id,id);}
 g.enemies=[];m.update(0);const use=id=>{const it=L.INTERACTIONS.find(i=>i.id===id);Object.assign(g.player,{x:it.x,z:it.z,elevation:it.y||0});g.enemies=[];m.update(0);g.enemies=[];assert.equal(m.interact()?.id,id);};use('manifeste');use('verin');
 g.enemies=[{id:999,form:'stalker',x:-1,z:46,elevation:0}];Object.assign(g.player,{x:-8,z:50});const before=m.van;
 m.update(.05);assert.equal(m.van.hp,before.hp);assert.equal(m.van.moving,true);
 g.enemies=[];Object.assign(g.player,{x:m.van.x,z:m.van.z-1});m.update(.05);assert.equal(m.van.moving,false);assert.equal(m.van.waiting,'passage','the ambulance waits instead of crossing the player');
});

test('relocated street furniture carries its horizontal lenses and light sources too',async()=>{
 const{sectorFaceOffset,neonSpots}=await import('../dist/m03-sector.js');
 const src={n:1,pos:new Int16Array([1000,950,-4120,1200,950,-4120,1200,950,-4080,1000,950,-4080]),mat:new Uint8Array([6]),col:new Uint8Array([100,230,255])};
 assert.deepEqual(sectorFaceOffset(src,0,.01),{x:0,z:-7});
 const spot=neonSpots({meta:{scale:.01},world:src},{minArea:.1})[0];assert.ok(Math.abs(spot.z+48)<.001);
});
