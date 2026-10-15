import test from 'node:test';
import assert from 'node:assert/strict';
import { ShootingRangeGame,trainingStage,trainingSpeed,targetPosition,traceTrainingTarget } from '../dist/shooting-range.js';
import { createShootingRangeArt } from '../dist/shooting-range-art.js';
import * as T from '../dist/vendor/three.core.min.js';

test('training progression includes close, long, lateral, depth and accelerating mixed drills',()=>{
 assert.deepEqual([0,22,44,70,92,200].map(t=>trainingStage(t).id),
   ['near','far','lateral','depth','mixed','mixed']);
 assert.equal(trainingStage(20).number,2);
 assert.ok(trainingSpeed(100)>trainingSpeed(15));
 assert.ok(trainingSpeed(300)<=4);
});

test('moving side targets traverse X and depth targets traverse Z',()=>{
 const base={x:2,y:1.5,z:-20,born:0,speed:2,phase:0,range:2.5};
 const side=targetPosition({...base,kind:'lateral'},1);
 const deep=targetPosition({...base,kind:'depth'},1);
 assert.notEqual(side.x,2);assert.equal(side.z,-20);
 assert.equal(deep.x,2);assert.notEqual(deep.z,-20);
});
test('a shot requires a true ray hit of the moving ring, not screen-space aim assistance',()=>{
 const target={id:1,x:0,y:1.6,z:-20,born:0,kind:'fixed-far',speed:1,range:0,phase:0,radius:.8};
 const origin={x:0,y:1.6,z:22};
 const hit=traceTrainingTarget(origin,{x:0,y:0,z:-1},target,1);
 assert.ok(hit?.bullseye);assert.equal(hit.points,150);
 assert.equal(traceTrainingTarget(origin,{x:1,y:0,z:-1},target,1),null);
 assert.equal(traceTrainingTarget(origin,{x:0,y:0,z:1},target,1),null);
});

test('training mode fires current Pink War guns, tracks score, and has no enemy waves',()=>{
 const game=new ShootingRangeGame([] ,()=>.5);
 assert.equal(game.mode,'training');assert.equal(game.ownedWeapons.size,5);
 assert.equal(game.enemies.length,0);
 game.step(.2,{});
 assert.equal(game.targets.length,1);
 const target=game.targets[0],pos=targetPosition(target,game.time);
 const origin={x:0,y:1.6,z:22};
 const direction={x:pos.x,y:pos.y-1.6,z:pos.z-22};
 game.shoot(origin,direction);
 assert.equal(game.trainingHits,1);assert.equal(game.trainingShots,1);
 assert.ok(game.score>=150);assert.equal(game.trainingAccuracy,100);
 game.cooldown=0;game.shoot(origin,{x:0,y:0,z:1});
 assert.equal(game.trainingShots,2);assert.equal(game.trainingAccuracy,50);
 for(let i=0;i<110;i++)game.step(.04,{});
 assert.equal(game.enemies.length,0);
 assert.equal(game.wave,0);
 assert.ok(game.targets.length>0);
});

test('stand meshes expose separate scene and barriers and remain invisible in other modes',()=>{
 const scene=new T.Scene(),art=createShootingRangeArt(T,scene);
 assert.equal(art.root.visible,false);
 assert.ok(art.obstacles.length>=3);
 const sample={time:1,targets:[{id:10,kind:'fixed-near',born:0,speed:1,x:0,y:1.5,z:7,range:0,phase:0,radius:.8}]};
 art.update(sample);assert.equal(art.targetCount,1);
 art.update({time:2,targets:[]});assert.equal(art.targetCount,0);
 art.dispose();assert.equal(scene.children.includes(art.root),false);
});
