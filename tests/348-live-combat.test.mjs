import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {ArenaGame} from '../dist/game-logic.js';
import {createAICompanion} from '../dist/ai-companions.js';
import {buildVesperGeometry} from '../dist/vesper-combat.js';

test('V7 renderer adaptation preserves every reference vertex and triangle',()=>{
 const vertices=new Float32Array([2,0,-3,0,1,0,.3,.3,.3,0,0,0, 3,0,-3,0,1,0,.3,.3,.3,1,0,0, 2,0,-4,0,1,0,.3,.3,.3,0,1,0]);
 const source={data:()=>({vertices,indices:new Uint32Array([0,1,2])})};
 const {geometry,triangles}=buildVesperGeometry(source);
 assert.equal(triangles,1);
 const position=geometry.getAttribute('position');
 assert.deepEqual([position.getX(0),position.getY(0),position.getZ(0)],[2,0,-3]);
 assert.deepEqual(Array.from(geometry.index.array),[0,1,2]);
 geometry.dispose();
});

test('Gaby spends energy, observes her cooldown and never resurrects',()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera();camera.position.set(0,1.65,0);camera.updateMatrixWorld(true);
 const game=new ArenaGame([]);game.reset();game.nextWave=Infinity;game.player.hp=40;
 const companion=createAICompanion(T,scene,'ghju');
 companion.update(.02,{game,camera});assert.equal(game.player.hp,58);assert.equal(companion.snapshot().assists,1);
 for(let i=0;i<20;i++)companion.update(.05,{game,camera});
 assert.equal(game.player.hp,58);assert.ok(companion.snapshot().energy<100);
 game.player.hp=0;for(let i=0;i<300;i++)companion.update(.05,{game,camera});
 assert.equal(game.player.hp,0);companion.dispose();
});

test('Cara cannot shoot an engaged enemy through cover and has bounded support',()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera();camera.position.set(0,1.65,0);camera.updateMatrixWorld(true);
 const game=new ArenaGame([{x:0,z:-2,hx:3,hz:.3,y:0,height:4}]);game.reset();game.nextWave=Infinity;
 game.player.z=0;
 const enemy={id:22,x:0,z:-5,elevation:0,aimHeight:1.3,hp:100,tier:1,awareness:'engaged'};game.enemies.push(enemy);
 const companion=createAICompanion(T,scene,'lylu');companion.update(.02,{game,camera});assert.equal(enemy.hp,100);
 game.replaceObstacles([]);companion.update(.02,{game,camera});assert.equal(enemy.hp,82);
 for(let i=0;i<10;i++)companion.update(.05,{game,camera});assert.equal(enemy.hp,82);
 assert.equal(companion.snapshot().assists,1);companion.dispose();
});
