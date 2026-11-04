import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {softCube,softEnough,splitPieces} from '../dist/soft-pieces.js';

const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');

test('the soft piece is a unit cube with rounded edges and smooth unit normals',()=>{
  const g=softCube(T),p=g.attributes.position,n=g.attributes.normal;let max=0,edge=0;
  for(let i=0;i<p.count;i++){max=Math.max(max,Math.abs(p.getX(i)),Math.abs(p.getY(i)),Math.abs(p.getZ(i)));assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<1e-5);
    if(Math.abs(n.getX(i))>.2&&Math.abs(n.getY(i))>.2)edge++;}
  assert.ok(Math.abs(max-.5)<1e-6,'fits the unit cube');assert.ok(edge>0,'normals bend round the edges');assert.equal(softCube(T),g,'shared');
});

test('only thick pieces are rounded: rails, strips and LEDs stay plain',()=>{
  assert.equal(softEnough(1.2,.7,1),true);assert.equal(softEnough(40,.06,.06),false);assert.equal(softEnough(.05,1,.05),false);assert.equal(softEnough(8,.3,.3),false);
  const {soft,plain}=splitPieces([[0,0,0,1,1,1],[0,0,0,30,.1,.1]]);assert.equal(soft.length,1);assert.equal(plain.length,1);
});

test('every dressing that used raw cubes now rounds its thick pieces; chapter 06 and the forest use real shapes',()=>{
  for(const f of ['m01-extension-art.js','m02-extension-art.js','ligne9-art.js','m04-art.js','m06-art.js','couronne-art.js','m03-art.js','foret.js'])assert.match(read(f),/soft-pieces\.js/,f);
  const m06=read('m06-art.js');for(const part of ['dressLine','weldingArm','quadrupedLeg','farmDrone','aegisTruck',"createFunctionalProp(T, 'railcar'"])assert.ok(m06.includes(part),part);
  assert.match(read('niveau6.js'),/art\.dressLine\?\.\(enemyFactory/,'the Brutes on the chain are the real Brute model');
  const forest=read('foret.js');for(const part of ['function bentTrunk','function leafMass','geometry.index'])assert.ok(forest.includes(part),part);
});
