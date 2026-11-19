import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {ArenaGame} from '../dist/game-logic.js';
import {createJetpackFX} from '../dist/jetpack-fx.js';
import {JETPACK_RULES} from '../dist/locomotion.js';

function sandbox(id){
  const g=new ArenaGame([]);g.reset(id);g.nextWave=999;g.toSpawn=0;g.enemies=[];return g;
}
function tick(g,dt,held=false){g.step(dt,{jump:held});}
for(const id of ['ghju','lylu'])for(const hz of [30,60,120]){
  test(`${id} ${hz}Hz: second press plus hold suspends and then lands`,()=>{
    const g=sandbox(id),dt=1/hz;
    for(let i=0;i<Math.round(.28*hz);i++)tick(g,dt,i===0);
    assert.equal(g.player.airJumps,0);
    tick(g,dt,true); // new edge in midair
    assert.equal(g.player.airJumps,1);
    assert.equal(g.player.jetpackActive,true);
    let y0=0,y1=0;
    for(let i=0;i<Math.round(.65*hz);i++){tick(g,dt,true);if(i===Math.round(.35*hz))y0=g.player.elevation;}
    y1=g.player.elevation;
    assert.equal(g.player.grounded,false,'must still be airborne during sustained second press');
    assert.ok(Math.abs(y1-y0)<.20,`hover drift should be small: ${y1-y0}`);
    assert.ok(g.player.jetpackActive);
    for(let i=0;i<Math.round(3*hz);i++)tick(g,dt,true);
    assert.equal(g.player.jetpackActive,false,'fuel time must be capped');
    assert.equal(g.player.grounded,true,'released by gravity after fuel exhaustion');
    assert.equal(g.player.elevation,0,'no penetration through floor');
    assert.equal(g.drainEvents().filter(e=>e.type==='jump').length,2,'held button cannot autojump after landing');
  });
}
test('releasing a double-jump hover immediately restores downward gravity and prevents restarting it',()=>{
 const g=sandbox('ghju'),dt=1/60;
 for(let i=0;i<18;i++)tick(g,dt,i===0);
 tick(g,dt,true);for(let i=0;i<24;i++)tick(g,dt,true);
 const before=g.player.verticalSpeed;tick(g,dt,false);
 assert.equal(g.player.jetpackActive,false);
 assert.equal(g.player.jetpackArmed,false);
 assert.ok(g.player.verticalSpeed<before-.20,'release restores full gravity');
 tick(g,dt,true);assert.equal(g.player.airJumps,1);
 assert.equal(g.player.jetpackActive,false,'third press cannot recharge');
});
test('jump normally without a second press never activates the back thrusters',()=>{
 const g=sandbox('lylu'),dt=1/120;
 for(let i=0;i<240;i++){tick(g,dt,true);assert.equal(g.player.jetpackActive,false);}
 assert.equal(g.player.grounded,true);
 assert.equal(g.drainEvents().filter(e=>e.type==='jump').length,1);
});
test('jetpack smoke stays lightweight, attaches to the chest, and clears on release',()=>{
 const root=new T.Group(),chest=new T.Bone();root.add(chest);
 const fx=createJetpackFX(root,chest,{masculine:false,models:false});
 assert.equal(fx.root.parent,chest);
 for(let i=0;i<12;i++)fx.update(1/60,true);
 const smoke=fx.root.getObjectByName('Jetpack / smoke particles');
 assert.equal(smoke.count,56);
 for(let i=0;i<80;i++)fx.update(1/60,false);
 assert.equal(smoke.count,0);
 fx.dispose();assert.equal(fx.root.parent,null);
});
test('fuel use remains limited even if the player holds forever',()=>{
 assert.ok(JETPACK_RULES.maxDuration<=2,'two seconds at most');
});
