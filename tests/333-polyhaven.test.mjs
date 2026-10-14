import test from 'node:test';import assert from 'node:assert/strict';import {createPolyHavenLayer,POLYHAVEN_LEVEL1} from '../dist/polyhaven-level1.js';
class Texture{constructor(image){this.image=image;this.repeat={setScalar:value=>this.repeat.value=value};}dispose(){this.disposed=true;}}
const T={Texture,Vector2:class{constructor(x,y){this.x=x;this.y=y}},RepeatWrapping:1,SRGBColorSpace:'srgb'};
const make=()=>Object.fromEntries(['brick','concrete','rust','car-blue','car-cream','road'].map(name=>[name,{map:{local:true},bumpMap:{local:true}}]));
const wait=async layer=>{for(let i=0;i<100&&layer.stats().pending;i++)await new Promise(r=>setTimeout(r,2));assert.equal(layer.stats().pending,false)};
test('selected CC0 sets load once, reuse GPU maps and retain physical tiling',async()=>{
 const mats=make(),urls=[],layer=createPolyHavenLayer(T,mats,{fetchImage:async url=>{urls.push(url);return{width:128,height:128,close(){}};}});layer.start();layer.start();await wait(layer);
 assert.equal(urls.length,12);assert.equal(layer.stats().loaded,12);assert.equal(layer.stats().failed,0);assert.equal(mats.brick.map.repeat.value,1/1.8);assert.equal(mats.rust.map,mats['car-blue'].map);assert.equal(mats.rust.normalMap,mats['car-cream'].normalMap);assert.equal(mats.brick.bumpMap,null);assert.ok(urls.some(u=>u.endsWith('nor_gl_1k.jpg')));layer.dispose();assert.equal(mats.brick.map.disposed,true);
});
test('denied network leaves every embedded map in place, never gates launch',async()=>{
 const mats=make(),saved=mats.brick.map,layer=createPolyHavenLayer(T,mats,{fetchImage:async()=>{throw new Error('blocked fixture')}});layer.start();await wait(layer);assert.equal(layer.stats().failed,12);assert.equal(layer.stats().loaded,0);assert.equal(mats.brick.map,saved);
});
test('nonresponsive images time out and late bitmaps are closed instead of mutating materials',async()=>{
 const mats=make(),saved=mats.road.map;let closed=0;const resolvers=[],layer=createPolyHavenLayer(T,mats,{timeout:5,fetchImage:()=>new Promise(resolve=>resolvers.push(resolve))});layer.start();await wait(layer);assert.equal(layer.stats().failed,12);for(const resolve of resolvers)resolve({width:128,close(){closed++}});await new Promise(r=>setTimeout(r,5));assert.equal(closed,12);assert.equal(mats.road.map,saved);assert.equal(layer.stats().loaded,0);
});
