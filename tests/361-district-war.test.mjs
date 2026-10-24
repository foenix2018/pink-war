import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.min.js';
import {ArenaGame,WEAPONS} from '../dist/game-logic.js';
import {CampaignLevel1} from '../dist/campaign-level1.js';
import {RoomGame} from '../dist/room-game.js';
import {ShootingRangeGame} from '../dist/shooting-range.js';
import {createDistrictArchitecture} from '../dist/level2-architecture.js';
import {createDistrictSignage} from '../dist/level2-signage.js';
import {createWarZone} from '../dist/level2-war-zone.js';
import {restoreM01Checkpoint} from '../dist/m01-checkpoint.js';

function canvasDOM(t){
 const original=Object.getOwnPropertyDescriptor(globalThis,'document');
 t.after(()=>original?Object.defineProperty(globalThis,'document',original):delete globalThis.document);
 const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({getContext:()=>ctx})}});
}
test('LYLU cannot acquire, select or cycle dual pistols in any simulation, including a contaminated inventory',()=>{
 const room={hasFloor:()=>true,floorAt:()=>0,freeArea:()=>12,findPoint:()=>({x:1,y:0,z:1})};
 const games=[new ArenaGame([],()=>.5,null,'lylu'),new CampaignLevel1([],()=>.5,'lylu'),new RoomGame(room,()=>.5,'lylu'),new ShootingRangeGame([],()=>.5,7,'lylu')];
 for(const g of games){
  assert.equal(g.characterId,'lylu');assert.equal(g.ownedWeapons.has(7),false);
  g.offerWeapon(7);assert.equal(g.weaponOffers.some(o=>o.index===7),false);
  g.ownedWeapons.add(7);assert.equal(g.selectWeapon(7),false);
  assert.equal(g.unlockedWeapons.some(w=>w.dual),false);
  for(let n=0;n<20;n++){g.cycleWeapon();assert.notEqual(g.weaponIndex,7);}
 }
 const ghju=new ArenaGame([],()=>.5,null,'ghju');assert.equal(ghju.weapon.id,'duor9');assert.equal(WEAPONS.filter(w=>w.dual).length,1);
});
test('a legacy LYLU checkpoint cannot restore a GHJU-only weapon',()=>{
 const g=new CampaignLevel1([],()=>.5,'lylu');
 assert.equal(restoreM01Checkpoint(g,{version:1,characterId:'lylu',stage:'sabotage',owned:[0,1,7],weaponIndex:7,ammo:[12,20,6,8,3,0,8,24],health:82,kills:10}),true);
 assert.equal(g.ownedWeapons.has(7),false);assert.equal(g.weapon.dual,undefined);assert.equal(g.player.hp,82);assert.equal(g.stage,'sabotage');assert.equal(g.kills,10);
});
test('both district facades have physically recessed windows inside the collision plane',t=>{
 canvasDOM(t);
 for(const side of [-1,1]){
  const root=new T.Group(),collisions=[],materials={};
  for(const key of ['iron','glass','black','cyan','amber','blue','plaster','warning','wall','rust','dark'])materials[key]=new T.MeshStandardMaterial();
  const arch=createDistrictArchitecture({T,root,materials,solid:()=>new T.Group(),beam:()=>new T.Group(),sign:()=>{},collisions,low:true,rng:()=>.5});
  arch.residentialTower(side,43,0);root.updateMatrixWorld(true);
  let checked=0;root.traverse(o=>{if(!o.userData.facadeWindow)return;const box=new T.Box3().setFromObject(o),front=o.userData.facadeWindow.front;
   assert.ok(side===1?box.min.x>front:box.max.x<front,'glazing must sit behind the wall, on both sides of the street');checked++;
  });
  assert.ok(checked>20);assert.ok(arch.stats.brokenWindows>0);assert.equal(collisions[0].hx,9);
  assert.equal(arch.signs.stats().mounted,1);
  const notice=root.children.find(o=>o.name.includes('notice imprimée')),centre=notice.getWorldPosition(new T.Vector3()),walls=root.children.filter(o=>o.isMesh&&o.material===arch.pbrTargets.masonry);
  for(const dy of [-.6,.6])for(const dz of [-.45,.45]){
   const ray=new T.Raycaster(centre.clone().add(new T.Vector3(0,dy,dz)),new T.Vector3(side,0,0),0,.2);
   assert.ok(ray.intersectObjects(walls,false).length,'every poster corner needs a masonry backing, not an empty window');
  }
 }
});
test('printed paper and shop signs use physically lit rough surfaces instead of luminous text panels',t=>{
 canvasDOM(t);const signs=createDistrictSignage(T,{performance:true}),paper=signs.create('HELIX',{poster:true}),shop=signs.create('CLINIQUE');
 assert.equal(paper.children[1].material.isMeshStandardMaterial,true);
 assert.equal(paper.children[1].material.emissive.getHex(),0);
 assert.ok(paper.children[1].material.roughness>.9);
 assert.equal(shop.children[1].material.map.image.width,256);
 signs.dispose();
});
for(const low of [true,false])test('war dressing keeps the central route open and distant combat freezes during pause / low='+low,t=>{
 canvasDOM(t);const root=new T.Group(),collisions=[],materials={rust:new T.MeshStandardMaterial(),iron:new T.MeshStandardMaterial(),concrete:new T.MeshStandardMaterial()};
 const war=createWarZone(T,root,materials,collisions,{performance:low});
 assert.equal(collisions.length,2);assert.equal(war.stats.wrecks,2);
 for(const b of collisions)assert.ok(Math.abs(b.x)-b.hx>3,'wrecks must not block the central path or the medical terminal');
 war.update(8);assert.equal(war.drainEvents().length,0);
 war.update(9,{active:false});assert.equal(war.drainEvents().length,0);
 war.update(9,{active:true});const blast=war.drainEvents();assert.equal(blast.length,1);assert.equal(blast[0].type,'distant-blast');assert.ok(Math.abs(blast[0].x)>35);
 war.update(9,{active:true});assert.equal(war.drainEvents().length,0,'same simulation time cannot replay the explosion');
 let lights=0,rubble=0;war.root.traverse(o=>{if(o.isLight)lights++;if(o.isInstancedMesh)rubble+=o.count;});assert.equal(lights,1);assert.equal(rubble,low?96:220);
 war.dispose();assert.equal(root.children.length,0);
});
