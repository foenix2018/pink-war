import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ArenaGame,meleePack,SLOT_RADIUS,RANGED_RETREAT} from '../dist/game-logic.js';

const game=()=>{const g=new ArenaGame([],()=>.5);g.nextWave=999;g.toSpawn=0;g.invulnerable=1e6;g.player.x=g.player.z=0;return g;};
const unit=(id,x,z,extra={})=>({id,form:'stalker',x,z,elevation:0,aimHeight:1.15,hp:1e4,radius:.5,speed:2.2,awareness:'engaged',
  attackTimer:99,stunnedUntil:0,limpUntil:0,ranged:false,yaw:Math.atan2(-x,-z)+Math.PI,phase:0,alertedUntil:1e6,...extra});
const bearing=(g,e)=>Math.atan2(e.x-g.player.x,e.z-g.player.z);
const gap=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));

test('engaged melee units in line share out distinct slots round the player, in their angular order',()=>{
  const player={x:0,z:0,elevation:0},line=[unit(1,0,-3),unit(2,0,-4.5),unit(3,.1,-6)];
  const slots=meleePack(line,player);
  assert.equal(slots.size,3);
  const angles=line.map(e=>{const s=slots.get(e);assert.ok(Math.abs(Math.hypot(s.x,s.z)-SLOT_RADIUS)<1e-9);return Math.atan2(s.x,s.z);});
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert.ok(gap(angles[i],angles[j])>1,'no two units share a side');
  assert.equal(meleePack([unit(1,0,-3)],player).size,0,'a lone unit just charges');
  assert.equal(meleePack([unit(1,0,-3),unit(2,0,-20)],player).size,0,'units far away keep their own route');
  assert.equal(meleePack([unit(1,0,-3),unit(2,1,-3,{ranged:true})],player).size,0,'shooters are not part of the pack');
});

test('a queue of melee units spreads round the player instead of waiting in line',()=>{
  const g=game();g.enemies=[unit(1,0,-5),unit(2,0,-6.5),unit(3,0,-8)];
  for(let i=0;i<200;i++)g.step(.03,{});
  const angles=g.enemies.map(e=>bearing(g,e));
  let widest=0;for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)widest=Math.max(widest,gap(angles[i],angles[j]));
  assert.ok(widest>1.6,`the pack surrounds the player (widest gap ${widest.toFixed(2)} rad)`);
  for(const e of g.enemies)assert.ok(Math.hypot(e.x,e.z)<2.2,`unit ${e.id} reaches striking range`);
});

test('a shooter caught at close range backs off while facing the player',()=>{
  const g=game(),e=unit(5,0,-5,{form:'seer',ranged:true,speed:2});g.enemies=[e];
  for(let i=0;i<60;i++)g.step(.03,{});
  assert.ok(Math.hypot(e.x,e.z)>5.6,`it gains distance (now ${Math.hypot(e.x,e.z).toFixed(2)} m)`);
  assert.ok(gap(e.yaw,Math.atan2(-e.x,-e.z)+Math.PI)<1e-6,'its gun stays on the player');
  const far=game(),idle=unit(6,0,-(RANGED_RETREAT+3),{form:'seer',ranged:true,speed:2});far.enemies=[idle];
  for(let i=0;i<20;i++)far.step(.03,{});
  assert.ok(Math.hypot(idle.x,idle.z)<=RANGED_RETREAT+3+1e-6,'beyond the retreat range it holds or closes in');
});

test('an approaching shooter weaves: its strafe side changes over time',()=>{
  const g=game(),e=unit(7,0,-22,{form:'seer',ranged:true,speed:.8});g.enemies=[e];
  const drift=[];let last=e.x;
  for(let k=0;k<16;k++){for(let i=0;i<17;i++)g.step(.03,{});drift.push(Math.sign(e.x-last));last=e.x;}
  assert.ok(drift.includes(1)&&drift.includes(-1),`moves to both sides (${drift.join(',')})`);
});

test('a hit is time-stamped for the body flinch',()=>{
  const g=game(),e=unit(8,0,-4);g.enemies=[e];g.time=3.2;
  g.damageEnemy(e,5,{x:0,y:1,z:-4},'head');
  assert.equal(e.hitAt,3.2);assert.equal(e.hitZone,'head');
  const scene=readFileSync(new URL('../dist/scene.js',import.meta.url),'utf8');
  assert.ok(scene.includes("m.rotation.order='YXZ'")&&scene.includes('e.hitAt'),'the renderer rocks a hit body back');
});
