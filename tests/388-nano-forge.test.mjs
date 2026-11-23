import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ArenaGame,WEAPONS,segmentBox} from '../dist/game-logic.js';
import {configureNanoForge,discoverNanoBlueprint,dropNanoSalvage,nanoYield,nanoRecipes,updateNanoForge,readNanoProfile,NANO_STORAGE_PREFIX,normaliseNanoProfile,applyNanoLoadout,nanoSnapshot} from '../dist/nano-forge.js';
import {rechargeShield} from '../dist/armor-combat.js';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createNanoForgeFX} from '../dist/nano-forge-fx.js';
const flat={height:()=>0,surfaces:()=>[],routes:[],lifts:[]};
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),m};};
function fixture({hero='ghju',level=3,mode='campaign',store=storage(),boxes=[]}={}){
 const g=new ArenaGame(boxes,()=>.5,flat,hero);g.configureWeaponAccess({mode,level});g.nano=null;configureNanoForge(g,{storage:store});Object.assign(g.player,{x:0,z:0,elevation:0});g.nextWave=Infinity;g.toSpawn=0;g.nano.placed=true;return g;
}
const fund=(g,value=1000)=>{g.nano.profile.balance=value;};
const plan=(g,...ids)=>{for(const id of ids)assert.equal(discoverNanoBlueprint(g,id),true);};
test('nanite yield scales with enemy tier, mass, elite status and bounded recovery bonus',()=>{
 assert.equal(nanoYield({form:'scuttler',tier:1}),7);
 const light=nanoYield({form:'synth',tier:2}),heavy=nanoYield({form:'brute',tier:2});assert.ok(heavy>light);
 assert.ok(nanoYield({form:'synth',tier:8})>light);assert.ok(nanoYield({form:'brute',tier:8,elite:true})>nanoYield({form:'brute',tier:8}));
 assert.equal(nanoYield({form:'synth',tier:2},{bonus:.3}),Math.round(light*1.3));
});
test('a real kill leaves salvage on the corpse; it does not credit the wallet at distance or on a duplicate hit',()=>{
 const g=fixture(),e={id:2,x:4,z:0,elevation:0,hp:1,maxHp:1,tier:3,form:'synth',aimHeight:1.4};g.enemies.push(e);
 g.damageEnemy(e,10,{x:4,y:1,z:0});assert.equal(g.nano.drops.length,1);assert.equal(g.nano.profile.balance,0);
 g.damageEnemy(e,10,{x:4,y:1,z:0});assert.equal(g.nano.drops.length,1);
 g.player.x=4;updateNanoForge(g,segmentBox);assert.equal(g.nano.drops.length,0);assert.equal(g.nano.profile.balance,15);
 updateNanoForge(g,segmentBox);assert.equal(g.nano.profile.balance,15);
});
test('debris cannot be collected through walls or across floors',()=>{
 const g=fixture({boxes:[{x:.5,z:0,hx:.1,hz:3,height:3}]});dropNanoSalvage(g,{x:1,z:0,tier:1});updateNanoForge(g,segmentBox);assert.equal(g.nano.profile.balance,0);
 g.obstacles=[];g.nano.drops[0].y=3;updateNanoForge(g,segmentBox);assert.equal(g.nano.profile.balance,0);
 g.player.elevation=3;updateNanoForge(g,segmentBox);assert.ok(g.nano.profile.balance>0);
});
test('plans require exploration, correct chapter and one acquisition, then persist to the same hero only',()=>{
 const store=storage(),g=fixture({store,level:1});g.nano.plans=[{id:'matrice',blueprints:['matrice'],x:4,y:0,z:0}];updateNanoForge(g,segmentBox);assert.deepEqual(g.nano.profile.discovered,[]);
 g.player.x=4;updateNanoForge(g,segmentBox);assert.deepEqual(g.nano.profile.discovered,['matrice']);assert.equal(discoverNanoBlueprint(g,'matrice'),false);assert.equal(discoverNanoBlueprint(g,'iem'),false);
 assert.deepEqual(readNanoProfile('ghju',store).discovered,['matrice']);assert.deepEqual(readNanoProfile('lylu',store).discovered,[]);
});
test('manufacturing requires the plan and full price, deducts once and adds an actual selectable weapon',()=>{
 const g=fixture();fund(g,300);assert.equal(g.fabricateNano('create:ares'),false);assert.equal(g.nano.profile.balance,300);
 plan(g,'ares');assert.equal(g.fabricateNano('create:ares'),true);assert.equal(g.nano.profile.balance,120);assert.ok(g.ownedWeapons.has(2));assert.ok(g.selectWeapon(2));
 assert.equal(g.fabricateNano('create:ares'),false);assert.equal(g.nano.profile.balance,120);
 g.ownedWeapons.delete(2);applyNanoLoadout(g);assert.ok(g.ownedWeapons.has(2),'checkpoint inventory cannot erase a persistent creation');
});
test('insufficient nanites, pause, death and failed persistence leave purchases unapplied',()=>{
 const store=storage(),g=fixture({store});plan(g,'matrice');fund(g,59);assert.equal(g.fabricateNano('impact'),false);
 fund(g,100);g.state='paused';assert.equal(g.fabricateNano('impact'),false);g.state='playing';g.player.hp=0;assert.equal(g.fabricateNano('impact'),false);g.player.hp=100;
 store.setItem=()=>{throw Error('quota');};assert.equal(g.fabricateNano('impact'),false);assert.equal(g.nano.profile.balance,100);assert.equal(g.nano.profile.upgrades['impact:7'],undefined);assert.equal(g.weapon.damage,24);
});
test('weapon modifications affect real shots and reloads, are per weapon and bounded to three ranks',()=>{
 const g=fixture();fund(g,2000);plan(g,'matrice');for(let i=0;i<3;i++)assert.equal(g.fabricateNano('impact'),true);
 assert.equal(g.fabricateNano('impact'),false);assert.equal(g.weapon.damage,WEAPONS[7].damage*1.3);assert.equal(WEAPONS[7].damage,24);
 g.shoot({x:0,y:1.3,z:0},{x:0,y:0,z:-1});assert.equal(g.bullets[0].damage,24*1.3);
 assert.equal(g.fabricateNano('reload'),true);g.ammo[7]=0;assert.ok(g.reload());assert.equal(g.reloadRemaining,WEAPONS[7].reload*.92);
 g.selectWeapon(8);assert.equal(g.weapon.damage,43);assert.equal(g.weapon.reload,1.95);
});
test('precision is a purchased, freely switchable configuration with real dispersion and damage tradeoff',()=>{
 const g=fixture();fund(g);plan(g,'stabilisateur');g.selectWeapon(8);
 assert.equal(g.setNanoConfiguration('precision'),false);assert.ok(g.fabricateNano('precision'));const balance=g.nano.profile.balance;
 assert.ok(g.setNanoConfiguration('precision'));assert.equal(g.weapon.spread,WEAPONS[8].spread*.6);assert.equal(g.weapon.damage,WEAPONS[8].damage*.95);
 assert.ok(g.setNanoConfiguration('impact'));assert.equal(g.weapon.spread,WEAPONS[8].spread);assert.equal(g.nano.profile.balance,balance);
});
test('equipment changes affect actual shield capacity, regeneration, armour and grapple speed without stacking on reload',()=>{
 const g=fixture({level:9});fund(g,10000);g.inHideout=true;for(const stage of [2,3,4]){plan(g,'tenue-'+stage);assert.ok(g.fabricateNano('suit:'+stage));}g.inHideout=false;fund(g,5000);plan(g,'capaciteur','recycleur','blindage','treuil');g.enableArmorShield();
 assert.ok(g.fabricateNano('shield'));assert.equal(g.shieldCapacity,110);assert.equal(g.player.shield,100,'upgrade adds capacity, not a free refill');
 applyNanoLoadout(g);assert.equal(g.shieldCapacity,110);g.enableArmorShield();assert.equal(g.shieldCapacity,110);
 assert.ok(g.fabricateNano('regen'));g.player.shield=0;g.time=10;g.lastDamage=0;rechargeShield(g,.1);assert.equal(g.player.shield,32*1.15*.1);
 assert.ok(g.fabricateNano('armor'));g.player.shield=0;g.damage(20);assert.equal(g.player.hp,84.8);
 assert.ok(g.fabricateNano('grapple'));assert.equal(g.nanoStats.grappleSpeed,1.1);
});
test('balance, plans, crafted weapons, modifications and configurations survive a chapter change and checkpoint replay',()=>{
 const store=storage(),g=fixture({store});fund(g,1000);plan(g,'matrice','ares','stabilisateur');g.fabricateNano('create:ares');g.fabricateNano('impact');g.fabricateNano('precision');g.setNanoConfiguration('precision');
 const next=fixture({store,level:4});assert.equal(next.nano.profile.balance,g.nano.profile.balance);assert.ok(next.ownedWeapons.has(2));assert.equal(next.weapon.damage,24*1.1*.95);assert.equal(next.nano.profile.configurations[7],'precision');
});
test('arena and range have an isolated workshop budget and cannot overwrite the campaign',()=>{
 const store=storage(),g=fixture({store});fund(g,400);plan(g,'matrice');g.fabricateNano('impact');const before=store.getItem(NANO_STORAGE_PREFIX+'ghju');
 for(const mode of ['arena','training']){const trial=fixture({store,mode});assert.equal(trial.nano.profile.balance,1500);assert.ok(trial.fabricateNano('impact'));assert.equal(store.getItem(NANO_STORAGE_PREFIX+'ghju'),before);}
});
test('IEM chapter 10 restriction survives forged old data, and enhanced IEM still deals minor damage',()=>{
 const store=storage();store.setItem(NANO_STORAGE_PREFIX+'ghju',JSON.stringify({version:1,balance:1000,discovered:['iem','matrice'],crafted:[9],upgrades:{'impact:9':3}}));
 const g=fixture({store,level:3});assert.ok(!g.ownedWeapons.has(9));assert.equal(g.selectWeapon(9),false);
 const high=fixture({store,level:10});assert.ok(high.selectWeapon(9));assert.equal(high.weapon.damage,8*1.3);
});
test('expired salvage, bounded debris and snapshots never leak live mutable profile objects',()=>{
 const g=fixture();for(let i=0;i<90;i++)dropNanoSalvage(g,{x:20,z:20,tier:1});assert.equal(g.nano.drops.length,64);g.time=181;updateNanoForge(g,segmentBox);assert.equal(g.nano.drops.length,0);
 const s=g.snapshot();s.nano.discovered.push('matrice');assert.equal(g.nano.profile.discovered.length,0);
});
test('malformed or obsolete storage cannot create NaN currency, overpowered ranks or unknown blueprints',()=>{
 const p=normaliseNanoProfile({version:1,balance:-7,totalCollected:Infinity,discovered:['matrice','bad'],upgrades:{'impact:7':500,'armor':3}});assert.equal(p.balance,0);assert.deepEqual(p.discovered,['matrice']);assert.equal(p.upgrades['impact:7'],3);assert.equal(p.upgrades.armor,undefined);
 const store=storage();store.setItem(NANO_STORAGE_PREFIX+'ghju','bad');assert.equal(readNanoProfile('ghju',store).balance,0);
});
test('all combat chapter schematics are on real walkable ground, outside solid walls and below roofs',async()=>{
 const {createLevel1Obstacles,level1Traversal}=await import('../dist/level1-layout.js');
 const worlds=[{level:1,boxes:createLevel1Obstacles(),traversal:level1Traversal}];
 const M3=await import('../dist/m03-sector.js'),meta=JSON.parse(readFileSync(new URL('../dist/assets/m03/vesper-sector.json',import.meta.url),'utf8')),L3=await import('../dist/m03-layout.js');worlds.push({level:3,boxes:M3.sectorObstacles(meta,[...L3.extraObstacles(),...L3.CHECKPOINT_POSTS]),traversal:M3.sectorTraversal(meta)});
 const M2=await import('../dist/m02-extension-layout.js');worlds.push({level:2,boxes:M2.extensionObstacles(),traversal:flat});
 for(const [level,name]of [[4,'m04'],[5,'ligne9'],[6,'m06'],[8,'couronne']]){const L=await import('../dist/'+name+'-layout.js');worlds.push({level,boxes:L.buildCollisions(),traversal:L.createTraversal()});}
 for(const {level,boxes,traversal}of worlds){const g=new ArenaGame(boxes,()=>.5,traversal);g.configureWeaponAccess({mode:'campaign',level});g.nano=null;configureNanoForge(g,{storage:storage()});Object.assign(g.player,{x:95,z:95});updateNanoForge(g,segmentBox);
  assert.ok(g.nano.plans.length>0,'chapter '+level+' has accessible plans');for(const plan of g.nano.plans){assert.ok(!boxes.some(b=>!b.noCollision&&!b.trigger&&Math.abs(plan.x-b.x)<b.hx+.4&&Math.abs(plan.z-b.z)<b.hz+.4&&plan.y+.03<(b.y||0)+b.height&&plan.y+1.5>(b.y||0)),'plan '+plan.id+' chapter '+level+' clears solids');}
 }
});
test('3D debris, nanite assembly and plan supports remain bounded and dispose without a renderer',()=>{
 const scene=new T.Scene(),g=fixture(),fx=createNanoForgeFX(T,{scene});g.nano.plans=[{id:'one',name:'Plan',x:4,y:0,z:0}];dropNanoSalvage(g,{x:4,z:0,tier:1});fx.handle({type:'nano-crafted',name:'Test',companion:'Gaby'});fx.update(g,.016);
 assert.equal(fx.stats().plans,1);assert.equal(fx.stats().shards,3);assert.equal(fx.stats().nanites,64);assert.ok(fx.stats().maxDraws<=8);g.nano.plans=[];fx.update(g,.016);assert.equal(fx.stats().plans,0);fx.dispose();assert.equal(scene.children.length,0);
});

test('mission loading can read progression before the simulation is created',()=>{assert.equal(nanoSnapshot(undefined),null);assert.equal(nanoSnapshot(null),null);});
