import test from 'node:test';
import assert from 'node:assert/strict';
import {audioMock} from './audio-mock.mjs';

test('menu and loading own the score, gameplay, prologue, mute and page exit stop it',async t=>{
 const old={window:globalThis.window,document:globalThis.document,Audio:globalThis.Audio};
 const events=new Map(),winEvents=new Map(),streams=[],session=new Map();const {ctx}=audioMock();
 ctx.createMediaElementSource=()=>({connect(){},disconnect(){}});
 globalThis.window={sessionStorage:{getItem:k=>session.get(k),setItem:(k,v)=>session.set(k,v)},AudioContext:function(){return ctx},addEventListener:(type,fn)=>winEvents.set(type,fn)};
 globalThis.document={hidden:false,addEventListener:(type,fn)=>{const list=events.get(type)||[];list.push(fn);events.set(type,list);},removeEventListener:(type,fn)=>events.set(type,(events.get(type)||[]).filter(f=>f!==fn))};
 globalThis.Audio=class{constructor(){this.paused=true;this.currentTime=0;streams.push(this)}play(){this.paused=false;return Promise.resolve()}pause(){this.paused=true}removeAttribute(){}load(){}};
 t.after(()=>{Object.assign(globalThis,old)});
 const {setScreenMusic,screenMusicSnapshot}=await import('../dist/menu-music.js?menu-test');
 setScreenMusic('menu',1,true);assert.equal(streams.length,0,'no media before a user gesture');
 events.get('pointerdown').forEach(fn=>fn());await Promise.resolve();assert.equal(screenMusicSnapshot().playing,true);
 setScreenMusic('loading',1);assert.equal(streams.length,1,'loading reuses menu stream');
 setScreenMusic('gameplay');assert.ok(streams.every(m=>m.paused));
 events.get('pointerdown').forEach(fn=>fn());assert.ok(streams.every(m=>m.paused),'shooting cannot restart music');
 setScreenMusic('menu',2);await Promise.resolve();assert.match(screenMusicSnapshot().source,/velvet-siege/);assert.equal(streams.length,1,'changing levels keeps the selected menu score');assert.equal(streams.filter(m=>!m.paused).length,1);
 setScreenMusic('prologue');assert.ok(streams.every(m=>m.paused));
 setScreenMusic('menu',2,false);assert.ok(streams.every(m=>m.paused));
 setScreenMusic('menu',2,true);await Promise.resolve();assert.equal(screenMusicSnapshot().playing,true);
 winEvents.get('pagehide')({persisted:false});assert.ok(streams.every(m=>m.paused));
 const next=await import('../dist/menu-music.js?loading-navigation');next.setScreenMusic('loading',2,true);await Promise.resolve();assert.equal(next.screenMusicSnapshot().playing,true,'same-tab loading reuses prior user audio intent');assert.match(next.screenMusicSnapshot().source,/velvet-siege/);next.setScreenMusic('gameplay');assert.ok(streams.every(m=>m.paused));
});
