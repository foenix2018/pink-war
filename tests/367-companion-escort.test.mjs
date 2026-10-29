import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {ArenaGame} from '../dist/game-logic.js';
import {ShootingRangeGame} from '../dist/shooting-range.js';
import {createAICompanion} from '../dist/ai-companions.js';
import {companionAvailable,companionHover,COMPANION_SHOT,fireCompanionShot} from '../dist/companion-escort.js';
import {createCompanionTorch,companionIllumination} from '../dist/companion-torch.js';
const game=()=>{const g=new ArenaGame([]);g.player.x=g.player.z=0;g.nextWave=Infinity;g.toSpawn=0;g.enemies=[];return g;};
const enemy=(x=0,z=-10)=>({id:900,x,z,elevation:0,aimHeight:1.25,hp:1000,form:'synth',tier:1,phase:0,radius:.6,speed:0,attackTimer:Infinity,awareness:'engaged',grounded:true,verticalSpeed:0,lastKnownX:0,lastKnownZ:0,lastKnownHeight:0,homeX:x,homeZ:z,patrolTimer:2});
function fixture(id){const scene=new T.Scene(),camera=new T.PerspectiveCamera(64,1,.05,100);camera.position.set(0,1.65,0);camera.updateMatrixWorld(true);return {scene,camera,g:game(),actor:createAICompanion(T,scene,id)};}
for(const [id,name]of [['ghju','Gaby'],['lylu','Cara']]){
 test(name+': hovers above and behind the actual hero independently of the camera, while following floors and turns',()=>{
  const a=fixture(id),b=fixture(id);b.camera.position.set(7,3,6);b.camera.lookAt(0,1.5,0);b.camera.updateMatrixWorld(true);
  for(let i=0;i<180;i++){
   for(const f of [a,b]){Object.assign(f.g.player,{x:i/120,z:-i/50,elevation:2.4,yaw:i*.004});f.actor.update(1/60,{game:f.g,camera:f.camera,assistance:false});}
   assert.ok(a.actor.root.position.distanceTo(b.actor.root.position)<1e-8,'orbit is attached to the hero, not the camera');
  }
  const s=a.actor.snapshot(),p=a.g.player,h=companionHover(p,3,id==='ghju'),dx=s.position[0]-p.x,dz=s.position[2]-p.z,behind=dx*Math.sin(p.yaw)+dz*Math.cos(p.yaw);
  assert.ok(behind>.45&&behind<1);assert.ok(s.position[1]>h.head.y+.3&&s.position[1]<h.head.y+.6);a.actor.dispose();b.actor.dispose();
 });
 test(name+': protection requires living hero health strictly below 50%, never stamina or ammunition',()=>{
  for(const hp of [100,50,49,0]){
   const f=fixture(id),e=enemy();f.g.enemies=[e];f.g.player.hp=hp;f.g.stamina=0;
   const ammo=f.g.ammo.slice();for(let i=0;i<35;i++)f.actor.update(1/60,{game:f.g,camera:f.camera});
   assert.equal(f.actor.snapshot().assists,hp===49?1:0);assert.equal(e.hp,1000,'damage waits for physical flight');assert.deepEqual(f.g.ammo,ammo);assert.equal(f.g.player.hp,hp);
   const events=f.g.drainEvents();assert.equal(events.some(e=>e.type==='shot'),false,'no player recoil/haptic shot event');
   if(hp===49){assert.equal(f.g.bullets[0].companion,true);assert.ok(f.actor.snapshot().energy<100);}
   f.actor.dispose();
  }
 });
 test(name+': real projectile starts at the optic, hits in the real simulation and is attributed to its companion',()=>{
  const f=fixture(id),e=enemy();f.g.enemies=[e];f.g.player.hp=40;for(let i=0;i<35&&!f.g.bullets.length;i++)f.actor.update(1/60,{game:f.g,camera:f.camera});
  const bullet=f.g.bullets[0];assert.ok(bullet);assert.equal(bullet.companionName,name);assert.equal(bullet.damage,COMPANION_SHOT[name].damage);
  const origin=new T.Vector3(bullet.originX,bullet.originY,bullet.originZ),pupil=f.actor.root.localToWorld(new T.Vector3(0,0,.151));assert.ok(origin.distanceTo(pupil)<1e-6);
  for(let i=0;i<30&&e.hp===1000;i++)f.g.step(1/60,{});assert.ok(e.hp<1000);assert.ok(f.g.drainEvents().some(e=>e.type==='hit'&&e.playerSource===false));f.actor.dispose();
 });
 test(name+': no shots through cover or at unengaged threats, and cooldown/energy bound sustained protection',()=>{
  const f=fixture(id),e=enemy();f.g.enemies=[e];f.g.player.hp=40;
  f.g.replaceObstacles([{x:0,z:-4,hx:5,hz:.2,y:0,height:5}]);for(let i=0;i<60;i++)f.actor.update(1/60,{game:f.g,camera:f.camera});assert.equal(f.actor.snapshot().assists,0);
  f.g.replaceObstacles([]);e.awareness='patrol';for(let i=0;i<60;i++)f.actor.update(1/60,{game:f.g,camera:f.camera});assert.equal(f.actor.snapshot().assists,0);
  e.awareness='engaged';for(let i=0;i<600;i++)f.actor.update(1/60,{game:f.g,camera:f.camera});const shots=f.actor.snapshot().assists;
  assert.ok(shots>=5&&shots<=Math.min(Math.ceil(10/COMPANION_SHOT[name].interval),Math.floor(140/COMPANION_SHOT[name].cost)));assert.ok(f.actor.snapshot().energy>=0);
  f.g.player.hp=50;for(let i=0;i<100;i++)f.actor.update(1/60,{game:f.g,camera:f.camera});assert.equal(f.actor.snapshot().assists,shots);f.actor.dispose();
 });
}
test('escort availability starts at mission 1, in the arena and in the training range',()=>{
 for(const mode of ['campaign','arena','training','lab'])assert.equal(companionAvailable({mission:1,mode}),true);
 const scene=new T.Scene(),a=createAICompanion(T,scene,'ghju'),g=new ShootingRangeGame([]);assert.equal(g.mode,'training');a.update(.05,{game:g});assert.equal(a.root.visible,true);assert.equal(a.snapshot().assists,0);assert.equal(g.trainingHits,0);a.dispose();
});
test('a new wall after launch intercepts the real projectile before the target',()=>{
 const g=game(),e=enemy();g.enemies=[e];g.player.hp=40;assert.equal(fireCompanionShot(g,'Cara',{x:0,y:1.8,z:0},e,0x57baff),true);
 g.replaceObstacles([{x:0,z:-3,hx:5,hz:.2,y:0,height:5}]);for(let i=0;i<25;i++)g.step(1/60,{});assert.equal(e.hp,1000);assert.equal(g.bullets.length,0);assert.ok(g.drainEvents().some(e=>e.type==='impact'&&!e.enemy));
});
test('pause freezes orbit, shell motion, energy, cooldown, torch and automatic fire; hiding switches the light off',()=>{
 const f=fixture('lylu');f.g.player.hp=40;f.g.enemies=[enemy()];for(let i=0;i<40;i++)f.actor.update(1/60,{game:f.g,camera:f.camera});
 f.g.state='paused';const before=f.actor.snapshot(),pose=f.actor.root.quaternion.toArray(),bullets=f.g.bullets.length;
 for(let i=0;i<100;i++)f.actor.update(.05,{game:f.g,camera:f.camera});assert.deepEqual(f.actor.snapshot(),before);assert.deepEqual(f.actor.root.quaternion.toArray(),pose);assert.equal(f.g.bullets.length,bullets);
 f.actor.update(.05,{game:f.g,camera:f.camera,active:false});assert.equal(f.actor.snapshot().torch.power,0);assert.equal(f.actor.root.visible,false);f.actor.dispose();
});
test('hover respects rear walls and a low ceiling without entering collision geometry',()=>{
 const f=fixture('ghju');f.g.replaceObstacles([{x:0,z:.65,hx:2,hz:.10,y:0,height:3},{x:0,z:0,hx:4,hz:4,y:2.15,height:.2}]);
 for(let i=0;i<90;i++)f.actor.update(1/60,{game:f.g,camera:f.camera,assistance:false});const p=f.actor.root.position;
 assert.ok(p.z<.35&&p.y<1.98);assert.ok(Math.hypot(p.x-f.g.player.x,p.z-f.g.player.z)<1);f.actor.dispose();
});
test('torch detects actual ambient light, ceilings and local fixtures, while ignoring its own light',()=>{
 const scene=new T.Scene(),ambient=new T.HemisphereLight(0xffffff,0x222222,1),sun=new T.DirectionalLight(0xffffff,2);sun.position.set(0,10,0);scene.add(ambient,sun,sun.target);
 const at={x:0,y:1.65,z:0},roof={x:0,z:0,hx:6,hz:6,y:2.8,height:.2};assert.ok(companionIllumination(T,scene,at,[])>.3);assert.ok(companionIllumination(T,scene,at,[roof])<.2);
 const local=new T.PointLight(0xffffff,25,6,2);local.position.set(0,2.2,0);scene.add(local);assert.ok(companionIllumination(T,scene,at,[roof])>.3);local.userData.companionLight=true;assert.ok(companionIllumination(T,scene,at,[roof])<.2);
});
test('automatic torch fades on in the dark, clips its range at walls and switches off in daylight',()=>{
 const scene=new T.Scene(),torch=createCompanionTorch(T,scene),g=game();g.replaceObstacles([{x:0,z:-4,hx:5,hz:.1,y:0,height:5}]);
 const options={game:g,origin:new T.Vector3(0,2,0),head:{x:0,y:1.65,z:0},forward:{x:0,y:0,z:-1}};
 for(let i=0;i<60;i++)torch.update(1/60,options);assert.equal(torch.snapshot().on,true);assert.ok(torch.snapshot().power>.98);assert.ok(torch.light.intensity>80&&torch.light.distance<4.3);assert.equal(torch.light.isSpotLight,true);
 scene.add(new T.HemisphereLight(0xffffff,0xffffff,2));g.replaceObstacles([]);for(let i=0;i<90;i++)torch.update(1/60,options);assert.equal(torch.snapshot().on,false);assert.ok(torch.light.intensity<.05);torch.dispose();assert.equal(scene.children.some(o=>o===torch.light||o===torch.target),false);
});
test('tracked headset movement carries the companion above the real head while leaving the flat-screen body anchor intact',()=>{
 const f=fixture('lylu');f.camera.position.set(2,1.8,-1);f.camera.updateMatrixWorld(true);for(let i=0;i<60;i++)f.actor.update(1/60,{game:f.g,camera:f.camera,tracked:true});
 const p=f.actor.root.position;assert.ok(p.x>2.2&&p.x<2.6);assert.ok(p.y>2.15&&p.y<2.35);assert.ok(p.z>-.6&&p.z<-.2);f.actor.dispose();
});
