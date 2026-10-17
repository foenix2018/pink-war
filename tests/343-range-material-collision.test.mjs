import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.core.min.js';
import {moveInArena} from '../dist/game-logic.js';
import {createShootingRangeArt} from '../dist/shooting-range-art.js';
import {ShootingRangeGame,targetPosition} from '../dist/shooting-range.js';

test('solid collision bodies exactly track new partitions, benches, back wall and shooting safety line',()=>{
 const scene=new T.Scene(),art=createShootingRangeArt(T,scene);
 assert.equal(art.root.visible,false);
 const names=['Séparateur entre deux postes','Tablette de préparation','Mur latéral','Fond stand','Mur arrêt-tirs','GARDE-CORPS DE SÉCURITÉ / TRAVERSE TAILLE'];
 for(const name of names)assert.ok(art.root.children.some(mesh=>mesh.name===name),'visual '+name);
 const boxAt=(x,z)=>art.obstacles.find(b=>Math.abs(b.x-x)<.02&&Math.abs(b.z-z)<.02);
 assert.ok(boxAt(2.3,21.3),'separators have collider');
 assert.ok(boxAt(0,26),'bench has collider');
 assert.ok(boxAt(0,36),'back wall has collider');
 const probe={x:0,z:21.3,elevation:0,crouched:false};
 moveInArena(probe,4,0,.55,art.obstacles);
 assert.ok(probe.x<1.8,'cannot walk through side partition');
 const desk={x:0,z:24,elevation:0,crouched:false};
 moveInArena(desk,0,3,.55,art.obstacles);
 assert.ok(desk.z<25.1,'cannot walk through prepared ammunition desk');
 const back={x:0,z:33,elevation:0,crouched:false};
 moveInArena(back,0,7,.55,art.obstacles);
 assert.ok(back.z<35.4,'cannot walk through the backstop exit wall');
 const wall={x:11,z:27,elevation:0,crouched:false};
 moveInArena(wall,5,0,.55,art.obstacles);
 assert.ok(wall.x<13,'cannot pass out through side walls');
 const front=new ShootingRangeGame(art.obstacles,()=>.5);
 front.player.z=20.3;
 for(let i=0;i<20;i++)front.step(.05,{x:0,z:-1,moveYaw:0,yaw:0,sprint:true});
 assert.ok(front.player.z>=19.8,'sprint cannot cross the active firing line');
 art.dispose();
});

test('untouched targets stay up, fold ONLY after a hit and remain visible for the fall animation',()=>{
 const sim=new ShootingRangeGame([],()=>.5);
 sim.step(.05);sim.step(.2);
 assert.equal(sim.targets.length,1);
 const target=sim.targets[0];
 for(let i=0;i<185;i++)sim.step(.05,{});
 assert.ok(sim.targets.includes(target),'target still visible after more than 9 seconds');
 assert.equal(target.hit,false);
 const scene=new T.Scene(),art=createShootingRangeArt(T,scene);
 art.update(sim);
 const group=art.root.children.find(x=>x.name==='Cible escamotable '+target.id);
 assert.ok(group);assert.equal(group.children[0].rotation.x,0);
 const pos=targetPosition(target,sim.time);
 sim.shoot({x:0,y:1.6,z:22},{x:pos.x,y:pos.y-1.6,z:pos.z-22});
 assert.equal(target.hit,false,'target must remain upright while laser travels');
 assert.equal(sim.pendingHits.length,1);
 sim.step(.05);art.update(sim);
 assert.equal(group.children[0].rotation.x,0,'target still upright before bullet contact');
 for(let i=0;i<4;i++)sim.step(.05);
 assert.ok(target.hit);assert.ok(sim.targets.includes(target));
 sim.step(.14);art.update(sim);
 assert.ok(group.children[0].rotation.x<-.05,'plate falls down visibly only after impact');
 assert.ok(sim.targets.includes(target),'plate is still visible during fall animation');
 for(let i=0;i<12;i++)sim.step(.05);
 assert.ok(!sim.targets.includes(target),'plate fully retires after impact animation');
 art.dispose();
});

test('difficulty switches automatically but does not retract targets during a stage',()=>{
 const sim=new ShootingRangeGame([],()=>.5);
 for(let i=0;i<360;i++)sim.step(.05,{});
 assert.equal(sim.trainingLevel.number,1);
 assert.ok(sim.targets.length===1);
 for(let i=0;i<55;i++)sim.step(.05,{});
 assert.equal(sim.trainingLevel.number,2);
 assert.equal(sim.targets.length,1,'old targets retired only on announced drill transition');
 assert.equal(sim.targets[0].kind,'fixed-far');
});


test('a distant target waits for the actual finite-speed laser impact before reacting',()=>{
 const game=new ShootingRangeGame([],()=>.5);
 game.time=20.1;game.step(.05,{});
 const target=game.targets[0];
 assert.equal(target.kind,'fixed-far');
 const pos=targetPosition(target,game.time),origin={x:0,y:1.6,z:22};
 const fired=game.shoot(origin,{x:pos.x,y:pos.y-1.6,z:pos.z-22});
 assert.equal(fired,true);
 assert.equal(game.trainingHits,0);
 assert.ok(game.pendingHits[0].due-game.time>.3,'projectile must cross 40-60 m before touching');
 for(let i=0;i<5;i++)game.step(.05,{});
 assert.equal(game.trainingHits,0,'distant plate still standing before laser arrival');
 for(let i=0;i<10;i++)game.step(.05,{});
 assert.equal(game.trainingHits,1);
 assert.equal(target.hit,true);
});
