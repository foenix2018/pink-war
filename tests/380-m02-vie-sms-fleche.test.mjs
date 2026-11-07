import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {arrowGuidance,nextInteraction,levelArrow} from '../dist/objective-arrow.js';
import {createEnclaveLife} from '../dist/m02-enclave-life.js';
import {ROOMS} from '../dist/m02-extension-layout.js';
const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');

test('the objective guide is a small arrow and a distance, and points where the objective is',()=>{
  const player={x:0,z:0};
  assert.equal(arrowGuidance(player,{x:0,z:-10},0).route,'10 m');assert.ok(Math.abs(arrowGuidance(player,{x:0,z:-10},0).bearing)<1e-9,'straight ahead');
  assert.ok(arrowGuidance(player,{x:10,z:0},0).bearing>80,'to the right the arrow turns clockwise');
  assert.ok(arrowGuidance(player,{x:-10,z:0},0).bearing<-80,'to the left, anticlockwise');
  assert.ok(Math.abs(arrowGuidance(player,{x:10,z:0},-Math.PI/2).bearing)<1e-6,'turning to face it brings the arrow to the top');
  assert.equal(arrowGuidance(player,{x:3,z:4},0).route,'5 m');assert.equal(arrowGuidance(null,{x:1,z:1},0),null);
  const list=[{id:'a',x:0,z:-4,label:'A'},{id:'doc',x:0,z:-2,label:'journal',log:true},{id:'b',x:9,z:0,label:'B'}],done=['a'];
  const mission={done,available:id=>id!=='c'};
  assert.equal(nextInteraction(list,mission).id,'b','optional readings and finished steps never lead');
  assert.equal(levelArrow(list,mission,player,0).route,'9 m');assert.equal(levelArrow(list,{done:['a','b'],available:()=>true},player,0),null,'nothing left: no arrow');
  const hud=read('combat-hud.js'),css=read('combat-hud.css');
  assert.match(hud,/const shown=!!info&&!!info\.route/);assert.match(css,/\.pw-hud-guide \.pw-guide-title[^}]*display:none!important/);
  for(const page of ['niveau3.js','niveau4.js','niveau6.js','ligne9.js','vesper-combat.js','game.js'])assert.match(read(page),/objective-arrow\.js/,page);
});

test('the stick and the buttons release when the screen is untouched: a lost pointerup never locks the stick',()=>{
  const s=read('level2-input.js');
  assert.match(s,/touchend',countFingers/);assert.match(s,/touchcancel',countFingers/);assert.match(s,/'blur','pagehide','orientationchange'/);
  assert.match(s,/A new finger on the stick always takes over/);assert.doesNotMatch(s,/if\(pointer!==null\)return;e\.preventDefault\(\);pointer=e\.pointerId/);
  assert.match(s,/releasers\.add\(forceEndLook\)/);assert.match(s,/state\.fire=false;onFire\?\.\(false\)/);
  const g=read('game.js');assert.match(g,/function freeTouchControls\(\)/);assert.match(g,/touchend', 'touchcancel'/);assert.doesNotMatch(g,/state\.id !== null \|\| \(e\.pointerType === 'mouse'/);
});

test('the dialogue banner arrives like a text message: small, high on the left, sliding in and out',()=>{
  const css=read('hologram-comms.css'),js=read('hologram-comms.js');
  assert.match(css,/\.pw-comms\[data-expanded='false'\]\{\s*left:max\(10px,env\(safe-area-inset-left\)\);right:auto;bottom:auto;\s*top:calc\(max\(16px,env\(safe-area-inset-top\)\) \+ 76px\)/);
  assert.match(css,/@keyframes pw-sms-in\{0%\{transform:translateX\(-115%\)/);assert.match(css,/@keyframes pw-sms-out/);assert.match(css,/prefers-reduced-motion/);
  assert.match(css,/width:min\(312px,calc\(100vw - 24px\)\)/,'much smaller than the old 500 px frame');
  assert.match(js,/pw-comms-enter/);assert.match(js,/dataset\.leaving='true'/);assert.match(js,/setTimeout\(\(\)=>\{leaving=false/);
});

test('the enclave is lived in: lamps, light pools, survivors and props, all inside the rooms and without colliders',()=>{
  const parent=new T.Group(),life=createEnclaveLife(T,parent);life.build();const st=life.stats();
  assert.ok(st.lamps>=60,'strings of bulbs over the market: '+st.lamps);assert.ok(st.pools>=8,'warm light pools');
  assert.equal(st.sleepers,5);assert.equal(st.sitters,4);assert.ok(st.props>=70,'clutter, benches, curtains, trays: '+st.props);
  const box=new T.Box3().setFromObject(life.root),marche=ROOMS.find(r=>r.id==='marche'),tour=ROOMS.find(r=>r.id==='quai');
  assert.ok(box.min.x>=-41&&box.max.x<=47&&box.min.z>=-97&&box.max.z<=99&&box.max.y<=9,'nothing outside the built rooms');
  assert.ok(marche&&tour);
  life.update(1,.016,{enclave:false});life.update(2,.016,{enclave:true});
  const art=read('m02-extension-art.js');assert.match(art,/createEnclaveLife\(T,root,\{low\}\)/);assert.match(art,/life\.build\(\)/);assert.match(art,/life\.update\(t,dt,power\)/);
  assert.match(read('m02-enclave-life.js'),/never changes gameplay or the navigation grid/);
});
