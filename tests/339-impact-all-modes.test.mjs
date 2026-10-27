import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.core.min.js';
import {createLaserFX,IMPACT_GLOW} from '../dist/laser-fx.js';

test('Histoire, Survie, Entrainement use the shared impact visuals for hit events',()=>{
 const game=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
 const scene=readFileSync(new URL('../dist/scene.js',import.meta.url),'utf8');
 const training=readFileSync(new URL('../dist/shooting-range.js',import.meta.url),'utf8');
 assert.match(game,/if \(event\.type === 'impact'\) \{\s*world\.impact\?\.\(event\)/);
 assert.match(game,/if\(event\.type==='training-hit'\)\{[\s\S]*?world\.impact\?\.\(\{\.\.\.event,noDecal:true\}\)/);
 assert.match(game,/world\.impact\(\{\.\.\.event,enemy:event\.type==='blade-hit'\}\)/);
 assert.match(scene,/laserFX=createLaserFX\(T,scene,palette\)/);
 assert.match(scene,/impact:event=>\{combatFX\.impact\(event\);laserFX\.impact\(event\);\}/);
 assert.match(training,/this\.event\('training-hit',\{id:target\.id/);
 assert.match(training,/weapon:pending\.weapon,power:pending\.power/);
});

test('AT HOME uses the SAME contact lighting for laser shots and blade impacts',()=>{
 const src=readFileSync(new URL('../dist/at-home.js',import.meta.url),'utf8');
 assert.match(src,/createLaserFX\(THREE,scene,hero\.palette\)/);
 assert.match(src,/if\(event\.type==='impact'\)\{laser\.impact\(event\)/);
 assert.match(src,/if\(event\.type==='blade-hit'\|\|event\.type==='blade-parry'\)\{laser\.impact\(\{\.\.\.event,weapon:'aurora'/);
 assert.match(src,/laser\.update\(game\.bullets,dt\)/);
});

test('shared marks handle walls, floor, robot armor and different blasters with one GPU pool',()=>{
 const scene=new T.Scene(),fx=createLaserFX(T,scene,{rose:0xff39aa});
 const spot=scene.getObjectByName('Laser / point d impact lumineux coloré sur surface');
 for(const [i,weapon] of ['r9','bloom','lance','thorn','nova','aurora'].entries()){
   fx.impact({x:i*2,y:1.2,z:-5,weapon,power:1,
     surface:i%2?'robot':'metal',normal:i%2?{x:0,y:0,z:1}:{x:1,y:0,z:0}});
 }
 fx.update([],.016);
 assert.equal(spot.count,6);
 assert.ok(IMPACT_GLOW.nova>IMPACT_GLOW.thorn&&IMPACT_GLOW.thorn>IMPACT_GLOW.lance);
 for(let i=0;i<7;i++)fx.update([],.08);
 assert.equal(fx.stats().impactGlows,0);
 fx.dispose();
});
