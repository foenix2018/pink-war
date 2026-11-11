import test from 'node:test';import assert from 'node:assert/strict';
import {ArenaGame} from '../dist/game-logic.js';import {createM02Extension} from '../dist/m02-extension.js';import {scenarioWaypoint,scenarioGuidance} from '../dist/m02-guidance.js';
function at(stage,opened=[]){const game=new ArenaGame([],()=>.5),doors={};const ext=createM02Extension(game,{hooks:{setDoor:(id,open)=>doors[id]=open}});assert.ok(ext.restoreCheckpoint({version:1,characterId:'ghju',stage,restore:[],opened,done:[],reads:[]}));return{game,ext,doors};}
test('resuming inside or beyond the vault restores its physical and visual unlock even with legacy door flags',()=>{
 for(const stage of ['x-manifeste','x-quai']){const{game,ext,doors}=at(stage);assert.ok(ext.opened.includes('coffre'));assert.equal(doors.coffre,true);assert.ok(!game.obstacles.some(o=>o.door==='coffre'));}
 const locked=at('x-coffre');assert.ok(locked.game.obstacles.some(o=>o.door==='coffre'));assert.equal(locked.doors.coffre,false);
});
test('the required crank takes precedence over the optional nearby poster',()=>{
 const{game,ext}=at('x-grille');Object.assign(game.player,{x:3.1,z:81.6,elevation:0});assert.equal(ext.interaction().id,'manivelle');assert.equal(ext.target().id,'manivelle');assert.ok(ext.interact());assert.match(ext.guidance().instruction,/automatiquement/);assert.match(ext.doorStatus('grille').reason,/encore/);
 game.time=25.01;ext.update();assert.ok(ext.doorStatus('grille').unlocked);
});
test('the badge reader opens the vault and keeps other future locks intact',()=>{
 const{game,ext,doors}=at('x-coffre',['grille','tour']);Object.assign(game.player,{x:-12.4,z:-85.2,elevation:0});assert.equal(ext.interaction().id,'lecteur');assert.ok(ext.interact());assert.equal(doors.coffre,true);assert.ok(!game.obstacles.some(o=>o.door==='coffre'));assert.ok(game.obstacles.some(o=>o.door==='convoi'));assert.equal(ext.target().id,'manifeste');
});
test('the route leaves the lift through its door and enters the clinic through the corridor',()=>{
 assert.deepEqual(scenarioWaypoint({x:43,z:92,elevation:0},{x:22,z:84},['monte-charge']),{x:41.3,z:92,y:0,label:'PASSER PAR Monte-charge'});
 let p=scenarioWaypoint({x:36,z:92,elevation:0},{x:22,z:84},['monte-charge']);assert.equal(p.x,20);assert.equal(p.z,91.3);
 p=scenarioWaypoint({x:20.9,z:90,elevation:0},{x:22,z:84},['monte-charge']);assert.deepEqual([p.x,p.z],[22,84]);
 p=scenarioWaypoint({x:20.9,z:90,elevation:0},{x:31,z:87.4},['monte-charge']);assert.ok(p.z>90.5,'a player on the clinic threshold steps into the corridor before heading for the radio door');
 assert.equal(scenarioWaypoint({x:0,z:-88},{x:-18.6,z:-86.4},[]),null);
});
test('the route uses the authored stairs rather than pointing at an unreachable raised terminal',()=>{
 {const down=scenarioWaypoint({x:-10.5,z:-17.3,elevation:12},{x:-5,z:-57,y:0});assert.ok(down.z<-19&&down.y<12,'no dead zone at the head of the west stairs: '+JSON.stringify(down));}
 const target={x:0,z:-18,y:12};let p=scenarioWaypoint({x:0,z:24,elevation:0},target);assert.equal(p.x,10.6);assert.equal(p.y,0);
 p=scenarioWaypoint({x:10.6,z:14,elevation:1},target);assert.equal(p.x,10.6);assert.ok(p.y>1);
 p=scenarioWaypoint({x:10.6,z:-10,elevation:12},target);assert.deepEqual([p.x,p.z],[10.6,-18]);
 const hint=scenarioGuidance({x:40,z:92},{x:22,z:84,label:'REGISTRE'},{opened:['monte-charge'],yaw:0,instruction:'Lire le registre'});assert.ok(Number.isFinite(hint.bearing));assert.match(hint.route,/Suivre le passage/);
});
test('dock guidance targets its actual blocking team instead of a closer unrelated patrol',()=>{
 const{game,ext}=at('x-quai');ext.restoreCheckpoint({version:1,characterId:'ghju',stage:'x-quai',restore:['renfort'],opened:[],done:[],reads:[]});const ids=game.enemies.map(e=>e.id);game.enemies.push({id:99999,x:game.player.x,z:game.player.z,extension:'old-patrol'});const target=ext.guidance().target;assert.ok(ids.includes(Number(target.id.replace('enemy-',''))));assert.match(ext.guidance().instruction,/verrouillée/);assert.equal(ext.doorStatus('convoi').unlocked,false);
});
test('an optional poster remains readable when deliberately approached before the crank',()=>{
 const{game,ext}=at('x-grille');Object.assign(game.player,{x:2.6,z:81.4,elevation:0});assert.equal(ext.interaction().id,'doc-avis');assert.ok(ext.interact());assert.equal(ext.takeJournal().id,'avis-helix');assert.equal(ext.hold,null);assert.equal(ext.target().id,'manivelle');
});
test('a legacy arrival checkpoint cannot trap the player inside the service lift',()=>{
 const{game,ext,doors}=at('x-arrivee');assert.ok(ext.opened.includes('monte-charge'));assert.equal(doors['monte-charge'],true);assert.ok(!game.obstacles.some(o=>o.door==='monte-charge'));assert.ok(game.obstacles.some(o=>o.door==='grille'));assert.ok(game.obstacles.some(o=>o.door==='coffre'));
 const point=scenarioWaypoint(game.player,ext.target(),ext.opened);assert.ok(point);assert.equal(point.x,41.3);
});
test('dock guidance walks around the container instead of pointing into it',()=>{
 const target={x:43,z:-84.6,y:0};let p=scenarioWaypoint({x:33.1,z:-84.6,elevation:0},target,['quai']);
 assert.equal(p.label,'CONTOURNER LE CONTENEUR');assert.ok(p.z<-87.8);
 assert.deepEqual(scenarioWaypoint({x:35,z:-89.3,elevation:0},target,['quai']),{...target});
});
