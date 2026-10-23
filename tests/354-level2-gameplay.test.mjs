import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPinkWarsInput,PINK_WARS_KEYS} from '../dist/level2-input.js';
import {ArenaGame,WEAPONS} from '../dist/game-logic.js';
const source=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');

test('M02 uses identical keys to the production Pink Wars game',()=>{
 assert.equal(PINK_WARS_KEYS.jump,'KeyJ');
 assert.equal(PINK_WARS_KEYS.fire,'Space');
 assert.equal(PINK_WARS_KEYS.interact,'KeyF');
 assert.equal(PINK_WARS_KEYS.next,'KeyE');
 assert.equal(PINK_WARS_KEYS.view,'KeyV');
 assert.equal(PINK_WARS_KEYS.crouch,'KeyC');
 assert.equal(PINK_WARS_KEYS.reload,'KeyR');
 assert.equal(PINK_WARS_KEYS.pause,'Escape');
});
test('M02 keyboard and gamepad commands normalize like Pink Wars',()=>{
 const c=createPinkWarsInput();
 let out=c.read(.016,new Set(['KeyZ','KeyD','KeyJ','Space','ShiftLeft']),[]);
 assert.equal(out.moveX,1);assert.equal(out.moveZ,-1);
 assert.equal(out.jump,true);assert.equal(out.fire,true);assert.equal(out.sprint,true);
 const buttons=Array.from({length:18},()=>({pressed:false,value:0}));
 const pad={index:0,id:'Standard Gamepad',connected:true,mapping:'standard',axes:[0,0,0,0],buttons};
 c.read(.016,new Set(),[pad]); // Neutral frame arms it.
 pad.axes=[.7,-.65,.48,.55];
 for(const idx of [0,3,6,7,10,11])buttons[idx]={pressed:true,value:1};
 out=c.read(.016,new Set(),[pad]);
 assert.equal(out.jump,true);assert.equal(out.next,true);assert.equal(out.interact,true);
 assert.equal(out.aim,true);assert.equal(out.fire,true);assert.equal(out.sprint,true);
 assert.ok(out.moveX>.65);assert.ok(out.moveZ<-.6);
 assert.ok(out.lookX>.4);assert.ok(out.lookY>.5);
 const held=c.read(.016,new Set(),[pad]);
 assert.equal(held.jump,false,'Button-held jump cannot retrigger every frame');
 assert.equal(held.next,false,'Button-held weapon change cannot repeat every frame');
 c.reset();
});
test('M02 reuses original physics rather than a simplified duplicate',()=>{
 const game=new ArenaGame([],()=>.5);
 game.reset();game.nextWave=Infinity;
 const was=game.player.z;
 game.step(.016,{x:0,z:-1,jump:false,yaw:0,moveYaw:0,sprint:false});
 assert.notEqual(game.player.z,was);
 assert.strictEqual(game.weapon,WEAPONS[7]);
});
test('M02 uses original production weapon/optics/audio, character rig and touch UI',()=>{
 const js=source('level2-test.js'),soldier=source('level2-player.js'),
   html=source('level2-test.html'),input=source('level2-input.js');
 assert.match(js,/createPinkWarsInput/);
 assert.match(js,/createPinkWarsTouch/);
 assert.match(js,/createWeaponFeel/);
 assert.match(js,/aimSensitivity,magnifiedFov,flatSightPose/);
 assert.match(js,/playLaserShot/);
 assert.match(js,/playWeaponAction/);
 assert.match(js,/installPinkWarsSoldier/);
 assert.match(js,/function pauseMission/);
 assert.match(js,/function changeView/);
 assert.match(js,/e\.code==='KeyF'\)interact\(\)/);
 assert.match(js,/e\.code==='KeyE'\)game\.cycleWeapon\(\)/);
 assert.match(js,/e\.code==='KeyJ'/);
 assert.match(html,/m02-touch-controls/); // touch actions use module-generated controls and HTML-scoped CSS
 assert.match(input,/data-m02="jump"/);
 assert.match(input,/data-m02="interact"/);
 assert.match(input,/data-m02="aim"/);
 assert.match(soldier,/createSoldier/);
 assert.match(soldier,/installShadowUnit/);
 assert.match(soldier,/applyShadowMaterials/);
 assert.match(soldier,/characterForId/);
});
