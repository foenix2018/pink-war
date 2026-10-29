import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ArenaGame,WEAPONS,starterWeaponIndex,starterWeaponOrder,weaponCycleOrder} from '../dist/game-logic.js';
import {ShootingRangeGame} from '../dist/shooting-range.js';

for(const character of ['ghju','lylu']){
  test(character+' starts with its existing primary and VORTEX in second quick-switch slot',()=>{
    const game=new ArenaGame([],()=>.5,null,character);
    const primary=starterWeaponIndex(character);
    assert.equal(game.weaponIndex,primary);
    assert.deepEqual(starterWeaponOrder(character).slice(0,2),[primary,8]);
    assert.deepEqual(weaponCycleOrder(game.ownedWeapons,character).slice(0,3),[primary,8,0]);
    assert.equal(game.ownedWeapons.has(8),true);
    assert.equal(game.ammo[8],36);
    assert.equal(game.cycleWeapon(),true);
    assert.equal(game.weapon.id,'vortex');
    assert.equal(game.cycleWeapon(-1),true);
    assert.equal(game.weaponIndex,primary);
    game.reset(character);
    assert.equal(game.cycleWeapon(),true);
    assert.equal(game.weaponIndex,8);
    assert.equal(game.reloadRemaining,0);
  });
  test(character+' retains VORTEX as second weapon in the training range and VR selection',()=>{
    const range=new ShootingRangeGame([],()=>.5,starterWeaponIndex(character),character);
    assert.equal(range.weaponIndex,starterWeaponIndex(character));
    assert.equal(range.rangeWeapons.includes(8),true);
    assert.equal(range.cycleWeapon(),true);
    assert.equal(range.weapon.id,'vortex');
  });
}
test('Mission 2 initializes and resets both character loadouts with the same VORTEX secondary',()=>{
  const js=readFileSync(new URL('../dist/level2-test.js',import.meta.url),'utf8');
  assert.equal((js.match(/new Set\(\[\.\.\.starterWeaponOrder\(characterId\),1,2\]\)/g)||[]).length,2);
  assert.equal(WEAPONS[8].capacity,36);
});
