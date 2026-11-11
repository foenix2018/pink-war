import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cinematicPlan} from '../dist/end-cinematic.js';
import {linesFor} from '../dist/m02-extension-story.js';
const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');

test('the end scene films the hero and her sphere face to face, in three shots that never sit inside her',()=>{
 const hero={x:26,z:-89,y:0,yaw:-Math.PI/2},total=30;
 for(let t=0;t<=total;t+=.5){
  const {cam,look,sphere}=cinematicPlan(hero,t,total);
  for(const v of [cam.x,cam.y,cam.z,look.x,look.y,look.z,sphere.x,sphere.y,sphere.z])assert.ok(Number.isFinite(v));
  assert.ok(Math.hypot(cam.x-hero.x,cam.z-hero.z)>.8,'camera outside the body at t='+t);
  assert.ok(Math.hypot(sphere.x-hero.x,sphere.z-hero.z)>.9&&Math.hypot(sphere.x-hero.x,sphere.z-hero.z)<1.4,'sphere in front of her');
  assert.ok(sphere.y>1.5&&sphere.y<1.8,'sphere at face height');
 }
 // Facing: yaw -π/2 looks toward +x, the sphere hovers on that side.
 assert.ok(cinematicPlan(hero,1,total).sphere.x>hero.x);
 const shots=new Set([2,15,28].map(t=>JSON.stringify(cinematicPlan(hero,t,total).cam)));assert.equal(shots.size,3);
});

test('the M02 ending is an exchange between the hero and her sphere (GAB-1 / CAR-14), never revealing who they are',()=>{
 for(const [c,sphere,hero] of [['ghju','gaby','ghju'],['lylu','cara','lylu']]){
  const lines=linesFor('fin',c);assert.ok(lines.length>=5);
  assert.deepEqual([...new Set(lines.map(l=>l.who))].sort(),[hero,sphere].sort());
  for(const l of lines){assert.ok(l.speaker?.name);assert.doesNotMatch(l.text,/Gabrielle|Carla|sœur/i);}
 }
 const page=read('level2-test.js');
 assert.match(page,/playEndCinematic\(/);assert.match(page,/lines:m02Lines\('fin',characterId\)/);
 assert.match(page,/firstPerson:\[weapon\]/,'only the first-person weapon is hidden, not every camera child');
 assert.match(page,/if\(wasXr\|\|!scene\)\{showFinale\(\);return;\}/,'the headset goes straight to the end panel');
 const cine=read('end-cinematic.js');assert.match(cine,/Passer/);assert.match(cine,/t > total \+ 12/);
});

test('the scene is staged away from a truck parked against the player, in plain sight of where she stood',async()=>{
 const {stageSpot}=await import('../dist/end-cinematic.js');
 // A truck 1 m to the east of the player, 6 m long: every camera ray crossing it is cut there.
 const truck={x1:27,x2:30,z1:-92,z2:-86};
 const cut=(a,b)=>{let t0=0,t1=1;for(const[p,d,lo,hi]of[[a.x,b.x-a.x,truck.x1,truck.x2],[a.z,b.z-a.z,truck.z1,truck.z2]]){if(Math.abs(d)<1e-9){if(p<lo||p>hi)return 1;continue;}let u=(lo-p)/d,v=(hi-p)/d;if(u>v)[u,v]=[v,u];t0=Math.max(t0,u);t1=Math.min(t1,v);if(t0>t1)return 1;}return t0;};
 const start={x:26,z:-89,y:0,yaw:-Math.PI/2},spot=stageSpot(start,cut,30);
 assert.ok(Math.hypot(spot.x-start.x,spot.z-start.z)<=4.6);
 assert.equal(cut({x:start.x,y:1.2,z:start.z},{x:spot.x,y:1.2,z:spot.z}),1,'reachable without crossing the truck');
 const {cinematicPlan}=await import('../dist/end-cinematic.js');let clear=0;
 for(let t=0;t<=30;t+=3){const {cam,look}=cinematicPlan(spot,t,30);clear+=cut(look,cam);}
 assert.ok(clear/11>.9,'camera rays stay clear of the truck: '+(clear/11).toFixed(2));
});

test('chapter 03 ends with the same in-engine scene once the regulation register is closed',async()=>{
 const {linesFor}=await import('../dist/m03-story.js');
 for(const [c,sphere] of [['ghju','gaby'],['lylu','cara']]){const lines=linesFor('fin',c);assert.ok(lines.length>=5);assert.ok(lines.some(l=>l.who===sphere)&&lines.some(l=>l.who===c));for(const l of lines)assert.doesNotMatch(l.text,/Gabrielle|Carla/);}
 const page=read('niveau3.js');
 assert.match(page,/playEndCinematic\(\{T,camera,hero:playerRig\?\.model\|\|null,sphere:companion/);assert.match(page,/if\(reading\)\{setTimeout\(stage,300\);return;\}/);
 assert.match(page,/firstPerson:\[weapon\]/);assert.match(page,/updateSubtitles\(running\|\|endCine\?dt:0\)/);
});
