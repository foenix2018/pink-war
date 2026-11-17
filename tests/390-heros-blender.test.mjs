import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {parsePWM} from '../dist/blender-models.js';
import {HERO_GEAR_FILES,plateUV,PLATE_TILE} from '../dist/hero-gear.js';

const url=f=>new URL('../dist/assets/heroes/'+f,import.meta.url);
const load=f=>{const b=readFileSync(url(f));return parsePWM(T,b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));};
test('Shadow Unit gear from Blender: cowl, belt and slung rifle exist with baked occlusion',()=>{
 for(const f of HERO_GEAR_FILES){assert.ok(existsSync(url(f+'.pwm'))&&existsSync(url(f+'_ao.jpg')),f);const m=load(f+'.pwm');assert.ok(m.triangles>1500&&m.triangles<40000,f+' '+m.triangles);}
 for(const f of ['cloak_ghju.png','cloak_lylu.png','fabric.png','fabric_nor.jpg','plates_diff.jpg','plates_nor.jpg','plates_rough.jpg'])assert.ok(existsSync(url(f)),f);
});
test('the cowl was draped on the shoulders (cloth simulation), around the neck and above the chest plates',()=>{
 const m=load('mantle.pwm');
 assert.ok(m.max[1]<1.7&&m.min[1]>1.3,'between the collar and the upper chest: '+m.min[1]+'…'+m.max[1]);
 assert.ok(m.max[0]>.15&&m.min[0]<-.15,'over both shoulders');
 assert.ok(m.primitives[0].geometry.attributes.uv,'authored fabric UV (torn edge on the rim)');
});
test('the belt rides on the hips and the rifle is a full-length long gun',()=>{
 const b=load('belt.pwm');assert.ok(b.min[1]>.9&&b.max[1]<1.1);assert.ok(b.max[0]-b.min[0]>.4);
 const r=load('rifle.pwm');assert.ok(r.max[0]-r.min[0]>.95&&r.max[0]-r.min[0]<1.2,'about one metre long');
});
test('riveted plates keep their real 24 cm size on the armour (metric box projection)',()=>{
 const g=new T.BoxGeometry(.48,.24,.12);plateUV(g);const uv=g.attributes.uv;let maxU=0;for(let i=0;i<uv.count;i++)maxU=Math.max(maxU,Math.abs(uv.getX(i)));
 assert.ok(Math.abs(maxU-.24/PLATE_TILE)<1e-6);
 const src=readFileSync(new URL('../dist/shadow-unit-game.js',import.meta.url),'utf8');assert.match(src,/attachHeroGear\(model,profile,\{cape,tabard,armour\}\)/);
});
