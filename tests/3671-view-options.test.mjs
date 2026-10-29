import test from 'node:test';
import assert from 'node:assert/strict';
import {readPreferredView,savePreferredView,VIEW_STORAGE_KEY,normalizeView} from '../dist/view-options.js';
import {thirdPersonPosition} from '../dist/third-person-camera.js';
import {segmentBox} from '../dist/game-logic.js';

test('one view preference persists across the menu and missions without changing other game settings',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),data=new Map([['rosee-settings','{"sound":false}']]);
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)}});
 try{assert.equal(readPreferredView(),'fps');savePreferredView('third');assert.equal(readPreferredView(),'third');assert.equal(data.get(VIEW_STORAGE_KEY),'third');assert.equal(data.get('rosee-settings'),'{"sound":false}');savePreferredView('fps');assert.equal(readPreferredView(),'fps');data.set(VIEW_STORAGE_KEY,'free');assert.equal(readPreferredView(),'fps');assert.equal(normalizeView(null),'fps');}
 finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
});
test('blocked browser storage cannot prevent loading or switching camera mode',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('Storage blocked');}});
 try{assert.equal(readPreferredView(),'fps');assert.doesNotThrow(()=>savePreferredView('third'));assert.equal(normalizeView('third'),'third');}
 finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
});
test('third-person camera follows hero heading, crouch and elevated floors in world metres',()=>{
 const p={x:11,z:-23,elevation:4.8,crouched:false},a=thirdPersonPosition(p,0,0,[],1.71),b=thirdPersonPosition({...p,crouched:true},Math.PI/2,0,[],1.71);
 assert.ok(Math.abs(a.x-11.65)<1e-8&&Math.abs(a.z+17.9)<1e-8&&Math.abs(a.y-6.31)<1e-8);
 assert.ok(Math.abs(b.x-16.1)<1e-8&&Math.abs(b.z+23.65)<1e-8&&Math.abs(b.y-5.86)<1e-8);
});
test('camera is pulled in front of rear walls and stays above actual elevated floor slabs',()=>{
 const p={x:0,z:0,elevation:0},wall={x:0,z:2,hx:3,hz:.2,y:0,height:4},at=thirdPersonPosition(p,0,0,[wall]);
 assert.ok(at.z<1.8&&at.z>.3);assert.equal(segmentBox({x:0,y:1.41,z:0},at,wall),null);
 const deck={x:0,z:0,hx:10,hz:10,y:4.6,height:.2,walkableSurface:true},onDeck=thirdPersonPosition({...p,elevation:4.8},0,.8,[deck]);
 assert.ok(onDeck.y>4.8,'a walkable floor is still a real camera obstruction');
});
