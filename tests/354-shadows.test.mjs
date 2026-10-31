import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {contactShadowPose,createContactShadows} from '../dist/contact-shadows.js';
import {shadowBudget} from '../dist/world-shadows.js';
import {graphicsProfile} from '../dist/renderer-policy.js';

test('current world shadows retain bounded mobile and compatibility budgets',()=>{
 const mobile=graphicsProfile({userAgent:'iPhone'},'auto'),desktop=graphicsProfile({},'auto');
 assert.equal(mobile.shadows,true);assert.ok(shadowBudget(mobile).size**2<=shadowBudget(desktop).size**2/4);
 assert.ok(shadowBudget(mobile).span<shadowBudget(desktop).span);
 assert.equal(graphicsProfile({userAgent:'iPhone'},'low').shadows,true);
 assert.equal(graphicsProfile({rendererHint:'webgl'}).shadows,true);
});
test('actor contact follows the supporting deck and excludes an overhead roof',()=>{
 let limit;const surface=(x,z,t,max)=>{limit=max;return max>=4?4:0;};
 const deck=contactShadowPose({x:15,z:8,elevation:4},surface);
 assert.equal(deck.y,4.022);assert.equal(deck.visible,true);assert.ok(limit<5);
 const jumping=contactShadowPose({x:15,z:8,elevation:5},surface);
 assert.ok(jumping.scale>deck.scale);assert.ok(jumping.strength<deck.strength);
 assert.equal(contactShadowPose({x:15,z:8,elevation:7},surface).visible,false);
 assert.equal(contactShadowPose({x:0,z:0},()=>NaN).visible,false);
});
test('soft contacts are one bounded instanced draw and release owned resources',()=>{
 const scene=new T.Scene(),shadows=createContactShadows(T,scene,2),rgba=shadows.texture.image.data;
 assert.equal(rgba[3],0);assert.ok(rgba[(32*64+32)*4+3]>140);
 shadows.update([{x:1,z:2,y:4.022,w:2,d:3},{x:4,z:5,visible:false},{x:6,z:7},{x:8,z:9}]);
 assert.equal(shadows.mesh.count,2);assert.equal(shadows.mesh.castShadow,false);
 assert.equal(shadows.mesh.material.depthWrite,false);
 const matrix=new T.Matrix4();shadows.mesh.getMatrixAt(0,matrix);assert.ok(Math.abs(matrix.elements[13]-4.022)<.001);
 shadows.clear();assert.equal(shadows.mesh.count,0);
 let disposed=0;for(const o of [shadows.mesh.geometry,shadows.mesh.material,shadows.texture])o.addEventListener('dispose',()=>disposed++);
 shadows.dispose();assert.equal(disposed,3);assert.equal(scene.children.length,0);
});
