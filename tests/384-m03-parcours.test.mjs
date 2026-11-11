import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ArenaGame} from '../dist/game-logic.js';
import {sectorObstacles,sectorTraversal} from '../dist/m03-sector.js';
import {createM03Mission} from '../dist/m03-mission.js';
import {createM03Guidance,m03Target} from '../dist/m03-guidance.js';
const meta=JSON.parse(readFileSync(new URL('../dist/assets/m03/vesper-sector.json',import.meta.url),'utf8'));

// The whole chapter on foot: real collisions, the stairway to the A3 deck, both escorts, the four holds. The player only
// walks where the arrow points (to the farthest point of the path in plain sight) and uses what the stage asks for.
// Machines near the player are put down: the fights are covered by their own tests.
function playthrough(character){
 const traversal=sectorTraversal(meta),base=sectorObstacles(meta);let collisions=base,finished=false,lost=null;
 const game=new ArenaGame(collisions,Math.random,traversal,character);game.reset(character);
 const mission=createM03Mission({game,characterId:character,base,hooks:{setObstacles:l=>{collisions=l;},finish:()=>{finished=true;},lost:w=>{lost=w||'lost';}}});
 mission.start();game.state='playing';
 const guide=createM03Guidance({traversal}),seen=[];let stall=0,detour=0;
 const tick=input=>{game.step(1/60,input);game.drainEvents?.();mission.update(1/60);};
 for(let n=0;n<20000&&!finished&&!lost;n++){
  if(seen.at(-1)!==mission.stageId)seen.push(mission.stageId);
  game.invulnerable=1e9;game.player.hp=100;
  for(const e of [...game.enemies])if(Math.hypot(e.x-game.player.x,e.z-game.player.z)<45)game.damageEnemy(e,1e6,{x:e.x,y:1,z:e.z},'torso',1,game.player);
  if(mission.hold){for(let i=0;i<60;i++)tick({});continue;}
  const target=m03Target(mission,game),it=mission.nearInteraction();
  if(it&&target&&it.id===target.id){mission.interact();continue;}
  if(!target){for(let i=0;i<60;i++)tick({});continue;}
  const sx=game.player.x,sz=game.player.z;
  for(let i=0;i<30;i++){
   const w=guide.waypoint(game.player,target,collisions)||target,dx=w.x-game.player.x,dz=w.z-game.player.z;
   if((target.id==='van'&&Math.hypot(target.x-game.player.x,target.z-game.player.z)<3)||Math.hypot(dx,dz)<.25){tick({});continue;}
   const yaw=Math.atan2(-dx,-dz)+detour;tick({x:0,z:-1,yaw,moveYaw:yaw,sprint:true});
  }
  const moved=Math.hypot(game.player.x-sx,game.player.z-sz),waiting=target.id==='van'&&(mission.van.moving||Math.hypot(target.x-game.player.x,target.z-game.player.z)<4);
  if(moved<.15&&!waiting){stall++;detour=(stall%2?1:-1)*Math.ceil(stall/2)*.4;assert.ok(stall<10,'stuck at '+mission.stageId+' '+JSON.stringify(game.player));}else{stall=0;detour=0;}
 }
 return {finished,lost,seen,time:game.time};
}
for(const character of ['ghju','lylu'])test(`chapter 03 can be played end to end on foot by following the arrow (${character})`,()=>{
 const r=playthrough(character);
 assert.equal(r.lost,null);assert.equal(r.finished,true,'reached: '+r.seen.join(' → '));
 assert.deepEqual(r.seen,['arrivee','alimentation','dossier','kit','atelier','verin','escorte','a3','balise','barriere','escorte2','echangeur','gare','arrimage','regulation']);
 assert.ok(r.time<600,'about four minutes of play without fights: '+r.time.toFixed(0)+' s');
});
test('the arrow leads to the readings the story waits for and to the ambulance during escorts',()=>{
 const g={player:{x:0,z:0},enemies:[]};
 assert.equal(m03Target({stageId:'dossier',done:[]},g).id,'dossier');assert.equal(m03Target({stageId:'a3',done:[]},g).id,'relais');
 assert.equal(m03Target({stageId:'regulation',done:[]},g).id,'regulation');
 assert.equal(m03Target({stageId:'escorte',van:{x:-4,z:30,yaw:0}},g).id,'van');
 const page=readFileSync(new URL('../dist/niveau3.js',import.meta.url),'utf8');assert.match(page,/createM03Guidance\(\{traversal\}\)/);assert.match(page,/m03Target\(mission,game\)/);
});
