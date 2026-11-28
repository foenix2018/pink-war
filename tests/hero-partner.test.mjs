import test from 'node:test';
import assert from 'node:assert/strict';
import { ArenaGame } from '../dist/game-logic.js';
import { createHeroPartner } from '../dist/hero-partner.js';
import { partnerGround } from '../dist/hero-partner-navigation.js';
import * as Helix from '../dist/m10-layout.js';
import * as Gardens from '../dist/m09-layout.js';
import {linesFor} from '../dist/m09-story.js';

function world(obstacles=[], edge=165) {
  const traversal = {
    bounds: {min: -edge, max: edge}, lifts: [], routes: [],
    height: (x, z, time, max=Infinity) => max >= 0 && Math.abs(x) <= edge && Math.abs(z) <= edge ? 0 : -65,
    surfaces: () => [{id:'slab',height:0}],
  };
  const game = new ArenaGame(obstacles, () => .5, traversal);
  game.nextWave = Infinity;
  return game;
}

const sim = 1/30;
const tick = (partner, game, seconds, speaker, stage=0) => {
  for (let i=0; i<seconds/sim; i++) {
    game.time += sim;
    partner.step(game,stage,sim,speaker);
  }
};

test('chapter 9 reveals the other hero at the reunion and passes the real dialogue identities on',()=>{
  const game=new ArenaGame(Gardens.buildCollisions(),()=>.5,Gardens.createTraversal());
  const stage=Gardens.STAGE_INDEX.meeting;
  const partner=createHeroPartner({id:'lylu',meeting:{stage,x:2.5,z:-22,y:34}});
  Object.assign(game.player,{x:0,z:-20,elevation:34});
  assert.equal(partner.sync(game,stage-1),null);
  const waiting=partner.sync(game,stage);
  assert.equal(waiting.mode,'meeting');
  tick(partner,game,.4,'lylu',stage);
  assert.equal(waiting.dialogue,'speaking');
  assert.equal(waiting.shots,0);
  tick(partner,game,.4,'ghju',stage);
  assert.equal(waiting.dialogue,'listening');
  assert.equal(partner.sync(game,stage+1),waiting);
  assert.deepEqual(linesFor('meeting','ghju').map(l=>l.who),['ghju','lylu','cara','gaby']);
});

test('an ally uses the actual HELIX route through doors and reaches the elevated extraction',()=>{
  const open=['access','security','laboratoires','archives','evacuation'];
  const game=new ArenaGame(Helix.buildCollisions({open}),()=>.5,Helix.createTraversal());
  Object.assign(game.player,{...Helix.START,elevation:0,grounded:true});
  game.nextWave=Infinity;
  const partner=createHeroPartner({id:'lylu'});
  const first=partner.sync(game,0);
  const holds=[];
  let climbed=false;
  for(const target of Helix.WALKTHROUGH){
    let frames=0;
    while(Math.hypot(game.player.x-target.x,game.player.z-target.z)>.20&&frames++<1800){
      const dx=target.x-game.player.x,dz=target.z-game.player.z,d=Math.hypot(dx,dz),yaw=Math.atan2(-dx,-dz);
      game.step(sim,{z:-Math.min(1,d/.35),yaw,moveYaw:yaw});
      const p=partner.step(game,0,sim);
      assert.ok(p&&partnerGround(game,p.x,p.z,p.elevation),'ally is grounded and does not occupy cover');
      if(p.elevation>5.8)climbed=true;
    }
    assert.ok(frames<1800);
    holds.push(Math.hypot(partner.state.x-game.player.x,partner.state.z-game.player.z));
  }
  tick(partner,game,3.8);
  assert.ok(climbed);
  assert.equal(partner.state,first,'the ordinary route does not rely on teleporting the ally');
  assert.equal(partner.state.elevation,12);
  assert.ok(Math.hypot(partner.state.x-56,partner.state.z+60)<6,JSON.stringify(holds));
  game.reset('ghju');
  Object.assign(game.player,{x:55,z:-55,elevation:12});
  assert.notEqual(partner.sync(game,7),first);
  assert.equal(partner.state.elevation,12);
});

test('an ally holds fire across solid cover and spends ammunition when its lane opens',()=>{
  const wall={x:1.2,y:0,z:-2.4,hx:12,hz:.15,height:4};
  const game=world([wall]);
  Object.assign(game.player,{x:0,z:0,elevation:0,yaw:0});
  const enemy={id:91,x:3.4,z:-9,elevation:0,hp:100};
  game.enemies=[enemy];
  const p=createHeroPartner({id:'lylu'});
  tick(p,game,1.6);
  assert.equal(p.state.shots,0);
  game.replaceObstacles([]);
  tick(p,game,1.6);
  const shots=game.bullets.filter(b=>b.partner==='lylu');
  assert.ok(shots.length>=2);
  assert.ok(shots.every(b=>!b.hostile&&b.companion&&b.damage>0));
  assert.equal(p.state.ammo,15-shots.length);
});

test('real projectiles hit a robot beyond the old arena boundary and respect a wall there',()=>{
  for(const obstacle of [false,true]){
    const game=world(obstacle?[{x:112,z:-8,y:0,hx:3,hz:.18,height:3}]:[]);
    Object.assign(game.player,{x:107,z:0,elevation:0});
    game.wave=11;game.spawned=0;game.toSpawn=1;game.activePortals=[{id:52,x:112,z:-13,yaw:0,openedAt:0}];game.spawnEnemy();
    const robot=game.enemies[0];
    Object.assign(robot,{x:112,z:-13,elevation:0,stunnedUntil:100,aimHeight:1.27,form:'stalker'});
    const previous=robot.hp;
    game.bullets.push({id:100,partner:'lylu',companion:true,x:112,y:1.27,z:-2,vx:0,vy:0,vz:-80,hostile:false,weapon:'vortex',damage:11,life:1,originX:112,originZ:-2});
    for(let i=0;i<12;i++)game.step(sim,{});
    assert.equal(robot.hp<previous,!obstacle);
    if(!obstacle)assert.ok(game.drainEvents().some(e=>e.type==='hit'&&!e.playerSource));
  }
});
