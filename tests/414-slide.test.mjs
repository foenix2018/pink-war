import test from 'node:test';
import assert from 'node:assert/strict';
import {canSlide,startSlide,slideVelocity,endSlide,SLIDE_RULES} from '../dist/locomotion.js';
import {ArenaGame} from '../dist/game-logic.js';

const run=(game,seconds,input)=>{for(let i=0;i<seconds*60;i++)game.step(1/60,input);};
test('crouch while sprinting starts a slide along the run direction',()=>{
  const g=new ArenaGame();g.start?.();
  const fwd={x:0,z:-1,yaw:0,sprint:true};
  run(g,1.2,fwd);
  const before={...g.planarVelocity};
  assert.ok(Math.hypot(before.x,before.z)>=SLIDE_RULES.minSpeed);
  const z0=g.player.z;
  g.step(1/60,{...fwd,crouchToggle:true});
  assert.equal(g.player.sliding,true);assert.equal(g.player.crouched,true);
  const speed=Math.hypot(g.planarVelocity.x,g.planarVelocity.z);
  assert.ok(speed>Math.hypot(before.x,before.z)*1.1,'burst of speed');
  run(g,.4,{...fwd,sprint:false});          // direction locked even without stick
  assert.ok(Math.abs(g.player.z-z0)>1.2);
  run(g,.6,{...fwd,sprint:false});
  assert.ok(Math.abs(g.player.z-z0)>2.2,'about three metres in all');
  assert.equal(g.player.sliding,false);assert.equal(g.player.crouched,false);
});
test('walking or standing still: crouch just toggles; cooldown blocks chaining',()=>{
  const g=new ArenaGame();g.start?.();
  g.step(1/60,{crouchToggle:true});assert.equal(g.player.crouched,true);assert.equal(g.player.sliding,false);
  g.step(1/60,{crouchToggle:true});assert.equal(g.player.crouched,false);
  const p={grounded:true,crouched:false,slideCooldown:1};
  assert.equal(canSlide(p,{x:5,z:0},true),false);
  assert.equal(canSlide({grounded:true,crouched:false},{x:1,z:0},true),false);
  assert.equal(canSlide({grounded:false,crouched:false},{x:5,z:0},true),false);
});
test('slide velocity decays and ends',()=>{
  const p={grounded:true,crouched:false};startSlide(p,{x:0,z:-5});
  const a=slideVelocity(p,.1),b=slideVelocity(p,.5);
  assert.ok(Math.hypot(a.x,a.z)>Math.hypot(b.x,b.z));
  assert.equal(slideVelocity(p,.5),null);assert.equal(p.crouched,false);assert.ok(p.slideCooldown>0);
});
