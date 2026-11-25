import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {configureUnit} from '../dist/ligne9-mission.js';
import {enemyDurability,enemyScale,enemyVolley,enemySightPoint,rangedMuzzle} from '../dist/enemy-combat.js';
import {traceEnemyHit} from '../dist/game-logic.js';
import * as M06 from '../dist/m06-layout.js';
import * as M07 from '../dist/m07-layout.js';
import * as M08 from '../dist/m08-layout.js';
import * as M10 from '../dist/m10-layout.js';
test('SE04 distinct, durable and tracked',()=>{
 const e=configureUnit({}, {form:'se04',x:1,z:2},8);
 assert.equal(e.form,'se04');assert.equal(e.hp,1200);assert.equal(e.maxHp,1200);assert.equal(e.ranged,true);assert.equal(e.speed,1.35);assert.equal(enemyDurability(9,'se04',true),1200);assert.equal(enemyScale('se04',true),1);assert.equal(enemyVolley(7,'se04').count,4);assert.ok(enemySightPoint(e).y>3.5);assert.ok(rangedMuzzle(e).y>2.5);
 const pod=traceEnemyHit({x:e.x-1.1,y:3.96,z:-3},{x:e.x-1.1,y:3.96,z:5},e);
 assert.equal(pod.zone,'weakpoint');assert.equal(pod.multiplier,2.8);
 const rear=traceEnemyHit({x:e.x,y:3.15,z:6},{x:e.x,y:3.15,z:2},e);
 assert.equal(rear.zone,'weakpoint');
});
test('SE04 appears in selected open encounters and gallery without removing SE03',()=>{
 for(const m of [M06,M07,M08])assert.ok(Object.values(m.ENCOUNTERS).flatMap(x=>x.units).some(u=>u.form==='se04'));
 assert.ok(M10.ENCOUNTERS.esplanade.some(u=>u.form==='se04'));
 const html=readFileSync(new URL('../dist/galerie.html',import.meta.url),'utf8');
 assert.ok(html.includes('"SE-04"'));assert.ok(html.includes('"SE-03"'));
 const path=new URL('../dist/assets/enemies/se04-sentinel-v3.glb',import.meta.url);
 if(existsSync(path)){const b=readFileSync(path),g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());assert.equal(g.animations.length,7);assert.ok(g.nodes.some(n=>n.name==='SE-04_SENTINEL'));}
});
