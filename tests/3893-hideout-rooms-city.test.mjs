import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {ArenaGame} from '../dist/game-logic.js';
import {parsePWM} from '../dist/blender-models.js';
import {createHideoutNavigation} from '../dist/hideout-navigation.js';
import {createHideoutDoorState} from '../dist/hideout-doors.js';
import {windowFrustum} from '../dist/hideout-city.js';
const read=name=>readFileSync(new URL('../dist/assets/hideout/'+name,import.meta.url));
const layout=JSON.parse(read('layout.json'));
const atHeight=(b,y)=>(b.y||0)<=y&&(b.y||0)+b.height>=y;

test('every room has a continuous perimeter at human eye height, except intentional open portals',()=>{
 assert.equal(layout.rooms.length,layout.gymRevision?9:8);assert.equal(layout.doors.length,layout.openPlanRevision?4:layout.gymRevision?10:11);
 const doors=createHideoutDoorState(layout),boxes=[...layout.colliders,...doors.colliders];
 const blocked=(x,z)=>boxes.some(b=>atHeight(b,1.65)&&Math.abs(b.x-x)<=b.hx+.005&&Math.abs(b.z-z)<=b.hz+.005)||(layout.portals||[]).some(p=>p.axis==='x'?Math.abs(x-p.x)<.01&&Math.abs(z-p.z)<=p.width/2+.01:Math.abs(z-p.z)<.01&&Math.abs(x-p.x)<=p.width/2+.01);
 for(const room of layout.rooms){const[x1,z1,x2,z2]=room.bounds;for(let t=0;t<=1;t+=.013){assert.ok(blocked(x1+(x2-x1)*t,z1),room.name+' north');assert.ok(blocked(x1+(x2-x1)*t,z2),room.name+' south');assert.ok(blocked(x1,z1+(z2-z1)*t),room.name+' west');assert.ok(blocked(x2,z1+(z2-z1)*t),room.name+' east');}}
 const materials=JSON.parse(read('materials.json'));assert.equal(materials['Verre dépoli des portes'].alpha,1);assert.ok(materials['Verre dépoli des portes'].frost);
});
test('a closed door blocks the real player; it opens on approach and closes after leaving',()=>{
 const doors=createHideoutDoorState(layout),flat={height:()=>0,surfaces:()=>[],routes:[],lifts:[]},g=new ArenaGame([...layout.colliders,...doors.colliders],()=>.5,flat);
 g.inHideout=true;g.nextWave=Infinity;g.toSpawn=0;Object.assign(g.player,{x:0,z:4.6});
 if(layout.openPlanRevision){
  // The salon portal is now deliberately open. Test the same door behavior at the dormitory.
  const d=doors.states.find(d=>d.id==='dortoir');Object.assign(g.player,{x:-3.15,z:d.z});
  for(let i=0;i<120;i++)g.step(1/60,{x:-1,z:0});assert.ok(g.player.x>d.x+.50,'closed dormitory leaf is solid');
  for(let i=0;i<120;i++){doors.update(1/60,g.player,{moving:true});g.step(1/60,{x:-1,z:0});}
  assert.ok(g.player.x<d.x-.55,'the player crosses the dormitory door');
  Object.assign(g.player,{x:0,z:4.8});for(let i=0;i<240;i++)doors.update(1/60,g.player,{moving:false});assert.equal(d.open,0);return;
 }
 for(let i=0;i<120;i++)g.step(1/60,{x:0,z:-1});assert.ok(g.player.z>3.2+.5,'closed leaf is solid');
 for(let i=0;i<180;i++){doors.update(1/60,g.player,{moving:true});g.step(1/60,{x:0,z:-1});}
 assert.ok(g.player.z<2.5,'the real player enters the salon');
 Object.assign(g.player,{x:0,z:4.8});for(let i=0;i<240;i++)doors.update(1/60,g.player,{moving:false});assert.equal(doors.states.find(d=>d.id==='salon').open,0);
});
test('door safety does not close on a person standing in the doorway',()=>{
 const doors=createHideoutDoorState(layout),d=doors.states.find(d=>d.id==='dortoir'),player={x:d.x,z:d.z};for(let i=0;i<600;i++)doors.update(1/60,player,{moving:false});assert.equal(d.open,1);assert.ok(d.leaves.every(b=>Math.abs(b.z-d.z)>d.width/2));
});
test('all stations remain reachable through moving doors using the real capsule',()=>{
 const nav=createHideoutNavigation(layout),flat={height:()=>0,surfaces:()=>[],routes:[],lifts:[]};
 for(const target of layout.stations){
  const doors=createHideoutDoorState(layout),g=new ArenaGame([...layout.colliders,...doors.colliders],()=>.5,flat);g.inHideout=true;g.grappleEnabled=false;g.nextWave=Infinity;g.toSpawn=0;g.configureWeaponAccess({mode:'campaign',level:3});g.nano.placed=true;Object.assign(g.player,{x:0,z:4.6});
  const path=nav.path(g.player,target);assert.ok(path?.length,target.id+' has a route');let frames=0;
  while(path.length&&frames++<6000){const p=path[0],dx=p.x-g.player.x,dz=p.z-g.player.z,d=Math.hypot(dx,dz);if(d<.18){path.shift();continue;}const yaw=-Math.atan2(dx,-dz);doors.update(1/60,g.player,{moving:true});g.step(1/60,{x:0,z:-Math.min(1,d/.4),yaw,moveYaw:yaw});}
  assert.ok(!path.length,target.id+' not blocked at '+JSON.stringify(g.player));assert.ok(nav.inRoom(g.player,target.room),target.id+' is reached inside its room');assert.ok(Math.hypot(g.player.x-target.x,g.player.z-target.z)<.4);
 }
});
test('a nearby station cannot be used through a partition or closed door',()=>{
 const nav=createHideoutNavigation(layout),rest=layout.stations.find(s=>s.id==='rest');assert.ok(Math.hypot(-3.65-rest.x,-6.35-rest.z)<3);assert.equal(nav.inRoom({x:-3.65,z:-6.35},rest.room),false);assert.ok(nav.inRoom(rest,rest.room));
});
test('off-axis projection keeps the glass edges fixed and changes depth parallax with the actual eye',()=>{
 const project=(point,eye)=>{const f=windowFrustum(eye),x=(point.x-eye.x)*f.near/(eye.z-point.z);return(x-f.left)/(f.right-f.left);};
 for(const eye of [{x:0,y:1.65,z:-6},{x:2,y:1.8,z:-10}]){assert.ok(Math.abs(project({x:-10.8,z:-11.57},eye))<1e-6);assert.ok(Math.abs(project({x:10.8,z:-11.57},eye)-1)<1e-6);}
 const a={x:0,y:1.65,z:-7},b={...a,x:1};const near=project({x:0,z:-25},b)-project({x:0,z:-25},a),far=project({x:0,z:-100},b)-project({x:0,z:-100},a);assert.ok(Math.abs(near-far)>.005);
});
test('Vesper is a separate metric 3D environment with near and distant buildings',()=>{
 const raw=gunzipSync(read('city.pwm.gz')),city=parsePWM(T,raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));assert.ok(city.triangles>10000);assert.ok(city.max[2]<-11.4);assert.ok(city.min[2]<-140);assert.ok(city.max[1]>40);assert.ok(city.primitives.length<=12);for(const p of city.primitives)p.geometry.dispose();
});
