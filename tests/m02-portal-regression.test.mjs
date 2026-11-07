import test from 'node:test';
import assert from 'node:assert/strict';
import {ArenaGame} from '../dist/game-logic.js';
import {createM02Extension,PORTAL_CHARGE} from '../dist/m02-extension.js';
import * as X from '../dist/m02-extension-layout.js';
function hold(stage,id){
 const game=new ArenaGame([],()=>.5);game.nextWave=Infinity;
 const ext=createM02Extension(game);
 assert.ok(ext.restoreCheckpoint({version:1,characterId:'ghju',stage,restore:[],opened:[],done:[],reads:[]}));
 const it=X.INTERACTIONS.find(p=>p.id===id);Object.assign(game.player,{x:it.x,z:it.z,elevation:0});
 assert.ok(ext.interact());return{game,ext};
}
test('M02 gate portal stays open while its reinforcements emerge, until the announced close time',()=>{
 const{game,ext}=hold('x-grille','manivelle');
 game.time=2.01;ext.update();const portal=game.activePortals[0];assert.ok(portal);
 game.time=2.01+PORTAL_CHARGE+.01;ext.update();
 assert.equal(ext.groups().grille1.deployed,2);
 assert.equal(game.activePortals[0]?.id,portal.id,'spawning the units must not remove the visible gate');
 game.time=2.01+PORTAL_CHARGE+2.41;ext.update();assert.equal(game.activePortals.length,0);
 game.time=X.HOLDS.grille+.01;ext.update();assert.ok(ext.opened.includes('grille'));assert.equal(ext.hold,null);
});
test('M02 dock portal persists through its deployment and the dock still unlocks',()=>{
 const{game,ext}=hold('x-quai','commande-quai');
 game.time=3.01;ext.update();const portal=game.activePortals[0];assert.ok(portal);
 game.time=3.01+PORTAL_CHARGE+.01;ext.update();assert.equal(game.activePortals[0]?.id,portal.id);
 game.time=X.HOLDS.quai+.01;ext.update();assert.ok(ext.opened.includes('convoi'));assert.equal(ext.hold,null);
});
