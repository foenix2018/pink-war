import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {ArenaGame} from '../dist/game-logic.js';
import {GRAPPLE,traceGrapple,sweepGrapplePlayer} from '../dist/grapple-logic.js';
import {createGrappleLauncher} from '../dist/grapple-model.js';

const flat={height:()=>0,surfaces:()=>[],routes:[],lifts:[]};
const wall=(z=-12,height=12)=>({x:0,z,hx:6,hz:.5,height,kind:'wall'});
const fixture=(boxes=[wall()])=>{const g=new ArenaGame(boxes,()=>.5,flat);Object.assign(g.player,{x:0,z:0});g.nextWave=Infinity;g.toSpawn=0;g.invulnerable=1e9;return g;};
const run=(g,seconds,dt=.01,input={})=>{for(let t=0;t<seconds-1e-8;t+=dt)g.step(Math.min(dt,seconds-t),input);};
const high={direction:{x:0,y:.6,z:-1}};

test('the hook reaches 20 m exactly, cannot reach beyond it, and the nearest solid surface blocks the ray',()=>{
 const origin={x:0,y:1.45,z:0},d={x:0,y:0,z:-1};
 assert.equal(traceGrapple(origin,d,[wall(-20.5)]).distance,20);assert.equal(traceGrapple(origin,d,[wall(-20.51)]),null);
 const ceiling={x:0,z:-4,hx:4,hz:4,y:2,height:.2,walkableSurface:true};const hit=traceGrapple(origin,{x:0,y:1,z:-1},[wall(),ceiling]);assert.equal(hit.box,ceiling);assert.equal(hit.attachable,false);
 const fence={...wall(-3),noGrapple:true};assert.equal(traceGrapple(origin,d,[wall(),fence]).attachable,false);
});

test('a miss does not move the player, and an airborne enemy is never an anchor',()=>{
 const g=fixture([]);g.enemies=[{x:0,z:-10,hp:100}];assert.equal(g.toggleGrapple(),false);assert.equal(g.grapple.phase,'idle');assert.equal(g.player.z,0);assert.match(g.grapple.lastError,/20 m/);
});

test('casting is visible before reeling; a high wall pulls the player to a stable exterior hold',()=>{
 const g=fixture();assert.equal(g.toggleGrapple(high),true);const anchor={...g.grapple.anchor};assert.equal(g.grapple.phase,'flying');run(g,.1);assert.equal(g.player.z,0);
 run(g,1.6);assert.equal(g.grapple.phase,'hold');assert.ok(g.player.elevation>6.5);assert.ok(g.player.z>=-11.5+GRAPPLE.radius);const p={x:g.player.x,y:g.player.elevation,z:g.player.z};run(g,2);assert.deepEqual({x:g.player.x,y:g.player.elevation,z:g.player.z},p);assert.deepEqual(g.grapple.anchor,anchor);
});

test('jump releases the cable into a short flight, then normal gravity lands the player; held jump cannot repeat the boost',()=>{
 const g=fixture();g.toggleGrapple(high);run(g,1.7);const y=g.player.elevation,z=g.player.z;g.step(.01,{jump:true});assert.equal(g.grapple.phase,'glide');assert.ok(g.player.verticalSpeed>7);
 run(g,.5,.01,{jump:true});assert.ok(g.player.elevation>y+2);assert.ok(g.player.z>z+2);
 run(g,4,.01,{jump:true});assert.equal(g.grapple.phase,'idle');assert.equal(g.player.elevation,0);assert.equal(g.player.grounded,true);assert.equal(g.drainEvents().filter(e=>e.type==='grapple-boost').length,1);
});

test('pressing jump while the projectile is flying cancels the cable and keeps the normal jump',()=>{
 const g=fixture();g.toggleGrapple(high);g.step(.01,{jump:true});assert.equal(g.grapple.phase,'idle');assert.ok(g.player.verticalSpeed>6);assert.ok(g.player.elevation>0);
});

test('high-speed pull and flight cannot cross a wall or a ceiling',()=>{
 const floor={x:0,z:0,hx:20,hz:20,y:-.2,height:.2,walkableSurface:true},ceiling={x:0,z:-5,hx:5,hz:5,y:3,height:.3,walkableSurface:true};
 const g=fixture([wall(),floor,ceiling]);const hit=sweepGrapplePlayer(g,{x:0,y:8,z:-12});assert.equal(hit.blocked,true);assert.ok(g.player.elevation+GRAPPLE.bodyHeight<=3);
 Object.assign(g.player,{x:0,z:0,elevation:1});const h=sweepGrapplePlayer(g,{x:0,y:0,z:-25});assert.equal(h.blocked,true);assert.ok(g.player.z>-11.5+GRAPPLE.radius);
});

test('a newly closed door or a moving/removed anchor safely cancels the pull',()=>{
 for(const change of ['door','remove','move']){const w=wall(),g=fixture([w]);g.toggleGrapple(high);run(g,.3);
  if(change==='door')g.obstacles.push({...wall(-5),height:15});else if(change==='remove')g.obstacles=[];else w.y=1;
  g.step(.01,{});assert.equal(g.grapple.phase,'idle',change);assert.ok(g.player.z>-5);}
});

test('the tether cannot bypass a low ceiling after an otherwise clear ray',()=>{
 const w=wall(),g=fixture([w,{x:0,z:0,hx:4,hz:1,y:2.1,height:.3,walkableSurface:true}]);
 // An anchor is visible ahead, but the player's head cannot travel through the low overhang.
 assert.equal(g.toggleGrapple({direction:{x:0,y:.3,z:-1}}),true);run(g,1);assert.equal(g.grapple.phase,'idle');assert.ok(g.player.elevation+GRAPPLE.bodyHeight<=2.11);
});

test('releasing a hold permits falling; reset clears all grapple motion and pause accepts no activation',()=>{
 const g=fixture();g.toggleGrapple(high);run(g,1.7);const y=g.player.elevation;assert.equal(g.toggleGrapple(),true);run(g,.4);assert.ok(g.player.elevation<y);g.reset();assert.equal(g.grapple.phase,'idle');assert.equal(g.grapple.anchor,null);g.state='paused';assert.equal(g.toggleGrapple(high),false);
});

test('checkpoint relocation and death cannot retain a cable connected to the previous position',()=>{
 const g=fixture();g.toggleGrapple(high);run(g,1.7);g.player.x=30;g.step(.01,{});assert.equal(g.grapple.phase,'idle');assert.equal(g.player.x,30);
 const dead=fixture();dead.toggleGrapple(high);run(dead,1.7);dead.invulnerable=0;dead.player.hp=1;dead.damage(20);assert.equal(dead.state,'over');assert.equal(dead.grapple.phase,'idle');assert.equal(dead.grapple.anchor,null);
});

test('a successful grapple interrupts sliding and jetpack thrust without refunding fuel; a miss preserves thrust',()=>{
 const slide=fixture();slide.planarVelocity.z=-4;slide.step(.01,{z:-1,sprint:true,crouchToggle:true});assert.equal(slide.player.sliding,true);assert.equal(slide.toggleGrapple(),true);assert.equal(slide.player.sliding,false);assert.equal(slide.player.crouched,false);
 const g=fixture();Object.assign(g.player,{grounded:false,elevation:5,airJumps:1,jetpackArmed:true,jetpackActive:true,jetpackElapsed:.7});
 assert.equal(g.toggleGrapple({direction:{x:0,y:1,z:0}}),false);assert.equal(g.player.jetpackActive,true);
 run(g,.3);g.player.jetpackArmed=g.player.jetpackActive=true;g.player.jetpackElapsed=.7;
 assert.equal(g.toggleGrapple({direction:{x:0,y:.2,z:-1}}),true);assert.equal(g.player.jetpackArmed,false);assert.equal(g.player.jetpackActive,false);assert.equal(g.player.jetpackElapsed,.7);
});

test('30 Hz, 60 Hz and 120 Hz reeling reach the same hold without changing normal locomotion',()=>{
 const positions=[];for(const fps of [30,60,120]){const g=fixture();g.toggleGrapple(high);run(g,2,1/fps);positions.push(g.player);assert.equal(g.grapple.phase,'hold');}
 for(const p of positions)assert.ok(Math.hypot(p.z-positions[0].z,p.elevation-positions[0].elevation)<.04);
 const ordinary=fixture([]);run(ordinary,1,.01,{z:-1});assert.ok(ordinary.player.z<-1.8&&ordinary.player.z>-2.3);assert.equal(ordinary.grapple.phase,'idle');
});

test('the left arm switches cleanly between grapple and shield; GHJU keeps firing the right pistol',()=>{
 const g=fixture();g.enableProjectedShields();g.toggleProjectedShield();assert.equal(g.player.shieldDeployed,true);g.toggleGrapple(high);assert.equal(g.player.shieldDeployed,false);
 g.cooldown=0;const before={...g.dual.ammo};assert.equal(g.shoot({x:0,y:1,z:0},{x:0,y:0,z:-1},1,'left'),false);assert.equal(g.shoot({x:0,y:1,z:0},{x:0,y:0,z:-1},1,'right'),true);assert.equal(g.dual.ammo.left,before.left);assert.equal(g.dual.ammo.right,before.right-1);
 g.toggleProjectedShield();assert.equal(g.grapple.phase,'idle');assert.equal(g.player.shieldDeployed,true);
});

test('the detailed wrist winch uses a bounded set of meshes with a real retractable three-prong anchor',()=>{
 const device=createGrappleLauncher(T),box=new T.Box3().setFromObject(device.root),size=box.getSize(new T.Vector3());assert.ok(size.z>.25&&size.z<.5);assert.ok(size.x<.3);assert.ok(device.stats().draws<=6);assert.ok(device.stats().triangles<20000);assert.ok(device.root.getObjectByName('Ancre / trois griffes rétractables').visible);device.setActive(true);assert.equal(device.root.getObjectByName('Ancre / trois griffes rétractables').visible,false);device.dispose();
});
