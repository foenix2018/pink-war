import test from 'node:test';
import assert from 'node:assert/strict';
import {ArenaGame} from '../dist/game-logic.js';
import {createFireBuffer} from '../dist/fire-input.js';
const origin={x:0,y:1.6,z:0},direction={x:0,y:0,z:-1};
function advance(game,input,seconds){
 for(let i=0;i<Math.ceil(seconds*100);i++){
  game.step(.01,{});const before=game.ammo[game.weaponIndex],blade=game.bladeSlashAt;
  game.trigger(input.requested(false,game.weapon,game.time),.01,origin,direction);
  if(game.ammo[game.weaponIndex]<before||game.bladeSlashAt!==blade)input.consume();
 }
}
test('A short press during BLOOM or LANCE equip produces exactly one shot after the delay',()=>{
 for(const index of [1,2]){
  const game=new ArenaGame([]);game.nextWave=Infinity;game.ownedWeapons.add(index);game.selectWeapon(index);
  const capacity=game.weapon.capacity,input=createFireBuffer();input.press(game.time);
  advance(game,input,.2);assert.equal(game.ammo[index],capacity);
  advance(game,input,1);assert.equal(game.ammo[index],capacity-1);
  advance(game,input,1);assert.equal(game.ammo[index],capacity-1,'one tap cannot become automatic fire');
 }
});
test('The buffer does not charge a weapon or fire unexpectedly after a reload',()=>{
 const game=new ArenaGame([]);game.nextWave=Infinity;game.ownedWeapons.add(3);game.selectWeapon(3);
 const input=createFireBuffer();input.press(game.time);advance(game,input,1.4);
 assert.equal(game.ammo[3],game.weapon.capacity);assert.equal(game.charge,0);
 game.selectWeapon(0);game.ammo[0]=8;game.reload();input.press(game.time);advance(game,input,1.6);
 assert.equal(game.ammo[0],12);input.press(game.time);input.reset();advance(game,input,.5);
 assert.equal(game.ammo[0],12,'focus/pause cancellation discards buffered shots');
});
