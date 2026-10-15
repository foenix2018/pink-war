import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ArenaGame} from '../dist/game-logic.js';
import {createEnergyBlade,BLADE_LENGTH} from '../dist/energy-blade.js';
import {createSaberSound} from '../dist/saber-sound.js';
import {audioMock} from './audio-mock.mjs';

const origin={x:0,y:1.3,z:0},forward={x:0,y:0,z:-1};
test('AURORA opens while the trigger is held, retracts after release, and is disarmed on switching weapons',()=>{
 const game=new ArenaGame();game.nextWave=999;game.ownedWeapons.add(5);game.selectWeapon(5);game.cooldown=0;
 const blade=createEnergyBlade();
 let time=0;
 const frame=(held,dt=.05)=>{
   game.step(dt);
   game.trigger(held,dt,origin,forward);
   time+=dt;blade.update(time,game.weapon.melee&&game.triggerHeld);
   return blade.extension;
 };
 assert.equal(blade.extension,0,'equipped hilt is initially closed');
 let v=frame(true);assert.equal(game.triggerHeld,true);assert.ok(v>=0&&v<.15);
 for(let n=0;n<6;n++)v=frame(true);
 assert.ok(v>.99,'sustained trigger extends full blade');
 assert.equal(blade.root.visible,true);
 assert.ok(Math.abs(blade.segment().tip.y-blade.segment().base.y-BLADE_LENGTH)<.002);
 v=frame(false);assert.equal(game.triggerHeld,false);assert.ok(v>0&&v<1,'release retracts instead of teleporting');
 for(let n=0;n<5;n++)v=frame(false);
 assert.equal(v,0);assert.equal(blade.root.visible,false);
 frame(true);game.selectWeapon(0);
 assert.equal(game.triggerHeld,false,'switch cancels holding the laser');
 blade.reset();assert.equal(blade.extension,0);
 blade.deployInstant(game.time);assert.equal(blade.extension,1,'outgoing sheath copy starts extended');
 blade.update(game.time+.2,false);assert.ok(blade.extension<1,'sheathing transitions to retraction');
 blade.dispose();
});

test('saber shutdown uses the exact reversed ignition PCM and no hum while not pressed',()=>{
 const {ctx}=audioMock();const s=createSaberSound(ctx);
 const a=s.ignitionPCM,b=s.shutdownPCM;
 assert.ok(a.length>100);assert.equal(a.length,b.length);
 for(let i=0;i<a.length;i++)assert.equal(a[i],b[a.length-i-1]);
 s.update({active:true,equipped:true,extended:false});assert.equal(s.humming,false);
 s.update({active:true,equipped:true,extended:true});assert.equal(s.humming,true);
 s.update({active:true,equipped:true,extended:false});assert.equal(s.humming,false);
 s.dispose();
});

test('headset removes the artificial aiming ray but keeps tracked hilt animations',()=>{
 const source=readFileSync(new URL('../dist/vr.js',import.meta.url),'utf8');
 assert.ok(source.includes('this.makeHUD(); this.removeSight(); this.makePauseBoard()'));
 assert.ok(!source.includes('this.makeHUD(); this.makeSight()'));
 assert.ok(source.includes('grip:Math.max(.92,this.handPose.mainGrip)'));
 assert.ok(source.includes("c.gun.visible=isMain&&(!holster?.visible||holster.position.y<-.56)"));
 const scene=readFileSync(new URL('../dist/scene.js',import.meta.url),'utf8');
 assert.ok(scene.includes('holsterGun=createGun()'));
});
