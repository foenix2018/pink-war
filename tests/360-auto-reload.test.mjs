import test from 'node:test';
import assert from 'node:assert/strict';
import {ArenaGame,WEAPONS} from '../dist/game-logic.js';
import {CampaignLevel1} from '../dist/campaign-level1.js';
import {RoomGame} from '../dist/room-game.js';

const origin={x:0,y:1.5,z:0},direction={x:0,y:0,z:-1};
function prepare(g){g.enemies=[];g.toSpawn=0;g.nextWave=-1;g.invulnerable=1e6;g.drainEvents();return g;}

for(const hero of ['ghju','lylu'])for(const mode of ['arena','campaign','home'])test(`${hero} ${mode}: the last cell reloads automatically after trigger release`,()=>{
 const room={hasFloor:()=>true,floorAt:()=>0,freeArea:()=>12,trace:()=>null};
 const g=mode==='campaign'?new CampaignLevel1([],()=>.5,hero):mode==='home'?new RoomGame(room,()=>.5,hero):new ArenaGame([],()=>.5,null,hero);
 if(mode==='home')g.start({x:0,y:1.6,z:0});prepare(g);
 g.ammo[g.weaponIndex]=1;if(g.weapon.dual)g.dual.ammo={left:0,right:1};
 assert.equal(g.shoot(origin,direction,1,g.weapon.dual?'right':null),true);assert.equal(g.ammo[g.weaponIndex],0);
 g.triggerHeld=false;g.step(.016);assert.ok(g.reloadRemaining>0);assert.equal(g.drainEvents().filter(e=>e.type==='reload').length,1);
 g.step(.016);assert.equal(g.drainEvents().filter(e=>e.type==='reload').length,0,'a reload starts once');
 const remaining=g.reloadRemaining;if(mode==='home')g.stop();else g.state='paused';g.step(.05);assert.equal(g.reloadRemaining,remaining,'the reload freezes with the game');
 if(mode==='home')g.running=true;else g.state='playing';for(let i=0;i<Math.ceil(g.weapon.reload/.05)+2;i++)g.step(.05);
 assert.equal(g.ammo[g.weaponIndex],g.weapon.capacity);if(g.weapon.dual)assert.deepEqual(g.dual.ammo,{left:12,right:12});
 assert.equal(g.drainEvents().filter(e=>e.type==='reloaded').length,1);
});

test('one empty GHJU pistol starts the shared reload without firing the other one',()=>{
 const g=prepare(new ArenaGame([],()=>.5,null,'ghju'));g.dual.ammo={left:12,right:1};g.ammo[7]=13;
 assert.equal(g.shoot(origin,direction,1,'right'),true);assert.equal(g.ammo[7],12);g.step(.016);assert.ok(g.reloadRemaining>0);
 assert.equal(g.shoot(origin,direction,1,'left'),false);assert.equal(g.ammo[7],12);
 for(let i=0;i<50;i++)g.step(.05);assert.deepEqual(g.dual.ammo,{left:12,right:12});
});

test('automatic reload covers acquired firearms and excludes the saber',()=>{
 const g=prepare(new ArenaGame([],()=>.5));for(let i=0;i<WEAPONS.length;i++){
  g.ownedWeapons.add(i);g.selectWeapon(i);g.ammo[i]=0;if(g.weapon.dual)g.dual.ammo={left:0,right:0};
  g.step(.016);assert.equal(g.reloadRemaining>0,!g.weapon.melee,g.weapon.id);g.reloadRemaining=0;
 }
});
