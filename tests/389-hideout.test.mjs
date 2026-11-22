import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {ArenaGame,WEAPONS} from '../dist/game-logic.js';
import {parsePWM} from '../dist/blender-models.js';
import {installRenderBudget} from '../dist/render-budget.js';
import {createHideoutNavigation} from '../dist/hideout-navigation.js';
import {HIDEOUT_KEY,readHideoutProfile,saveHideoutProfile,recordHideoutArrival,nextHideoutChapter,historyForHero,prepareHideoutDeparture,applyHideoutPreparation,chapterURL,hideoutURL} from '../dist/hideout-state.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url));
const layout=JSON.parse(read('dist/assets/hideout/layout.json'));
const storage=()=>{const data=new Map();return{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),data};};
const flat={height:()=>0,surfaces:()=>[],routes:[],lifts:[]};
function fixture(level=3,hero='ghju',boxes=[]){const g=new ArenaGame(boxes,()=>.5,flat,hero);g.configureWeaponAccess({mode:'campaign',level});g.enableArmorShield();g.nextWave=Infinity;g.toSpawn=0;g.nano.placed=true;return g;}

test('the editable Blender file and exported mesh contain a furnished room with nine real stations',()=>{
 const blend=read('assets/hideout/PinkWars_Planque.blend');assert.ok(blend.byteLength>100000);const gz=read('dist/assets/hideout/planque.pwm.gz'),raw=gunzipSync(gz),b=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),room=parsePWM(T,b);
 assert.ok(room.triangles>100000&&room.triangles<500000);assert.ok(room.primitives.length<=30);assert.ok(gz.byteLength<5e6);assert.equal(layout.stations.length,9);assert.ok(layout.colliders.length>=40);assert.ok(room.primitives.some(p=>p.material==='Néon rose'));assert.ok(room.primitives.some(p=>p.material==='Néon bleu'));assert.ok(room.primitives.some(p=>p.material==='Panorama Vesper'));
 for(const p of room.primitives){assert.ok(p.geometry.boundingSphere.radius>0);assert.ok([...p.geometry.attributes.position.array].every(Number.isFinite));p.geometry.dispose();}
});
test('all rooms are reachable on the same metric collision layout and navigation segments clear the furniture',()=>{
 const nav=createHideoutNavigation(layout);
 for(const target of layout.stations){assert.ok(nav.free(target.x,target.z),target.id+' is not inside a bed or table');const path=nav.path({x:0,z:4.6},target);assert.ok(path?.length,target.id+' is reachable');let from={x:0,z:4.6};for(const p of path){assert.ok(nav.clear(from,p),target.id+' path clears the full body');from=p;}assert.ok(Math.hypot(from.x-target.x,from.z-target.z)<.5);}
});
test('the actual ArenaGame capsule can follow every station path without teleporting or crossing walls',()=>{
 const nav=createHideoutNavigation(layout);
 for(const target of layout.stations){const g=fixture(3,'ghju',layout.colliders);g.inHideout=true;g.grappleEnabled=false;Object.assign(g.player,{x:0,z:4.6});let path=nav.path(g.player,target),frames=0;
  while(path.length&&frames++<6000){const p=path[0],dx=p.x-g.player.x,dz=p.z-g.player.z,d=Math.hypot(dx,dz);if(d<.18){path.shift();continue;}const yaw=-Math.atan2(dx,-dz);g.step(1/60,{x:0,z:-Math.min(1,d/.4),yaw,moveYaw:yaw});
   for(const b of layout.colliders)if((b.y||0)<1.8&&(b.y||0)+b.height>.05)assert.ok(!(Math.abs(g.player.x-b.x)<b.hx+.54&&Math.abs(g.player.z-b.z)<b.hz+.54),target.id+' crossed '+b.kind);
  }
  assert.ok(!path.length,target.id+' was reached, position '+JSON.stringify({x:g.player.x,z:g.player.z,path:path.length}));assert.ok(Math.hypot(g.player.x-target.x,g.player.z-target.z)<.4);assert.equal(g.player.elevation,0);
 }
});
test('the house perimeter and furniture block manual movement; no route leads beyond the floor',()=>{
 const nav=createHideoutNavigation(layout);assert.equal(nav.free(50,0),false);assert.equal(nav.free(0,20),false);assert.equal(nav.free(-6.4,-8.5),false);assert.equal(nav.free(7.35,-1.1),false);
 const g=fixture(3,'ghju',layout.colliders);g.inHideout=true;Object.assign(g.player,{x:0,z:4.6});for(let i=0;i<400;i++)g.step(1/60,{x:1,z:0});assert.ok(g.player.x<10.4);assert.equal(g.player.elevation,0);
});
test('completed chapters, current equipment and health reach the refuge and the correct following chapter',()=>{
 const store=storage(),g=fixture(6);g.ownedWeapons.add(2);g.weaponIndex=2;g.player.hp=37;g.player.shield=12;
 const p=recordHideoutArrival({level:6,characterId:'ghju',game:g,completed:true,storage:store});assert.deepEqual(p.completed,[6]);assert.equal(nextHideoutChapter(p),7);assert.equal(p.health,37);assert.equal(p.shield,12);assert.equal(p.selectedWeapon,2);assert.ok(p.owned.includes(2));
 const seven=recordHideoutArrival({level:7,characterId:'ghju',completed:true,storage:store});assert.equal(nextHideoutChapter(seven),8);
 const eight=recordHideoutArrival({level:8,characterId:'ghju',completed:true,storage:store});assert.equal(nextHideoutChapter(eight),9);
 const nine=recordHideoutArrival({level:9,characterId:'ghju',completed:true,storage:store});assert.equal(nextHideoutChapter(nine),10);const end=recordHideoutArrival({level:10,characterId:'ghju',completed:true,storage:store});assert.equal(nextHideoutChapter(end),null);assert.equal(nextHideoutChapter(readHideoutProfile('lylu',store)),1);
});
test('history records only completed events and preserves the actual chapter two decision',()=>{
 const store=storage();recordHideoutArrival({level:2,completed:true,choice:'proof',storage:store});const past=historyForHero(readHideoutProfile('ghju',store));assert.deepEqual(past.map(e=>e.level),[2]);assert.match(past[0].text,/archives HELIX ont été protégées/);assert.ok(!past.some(e=>e.level===3));
 recordHideoutArrival({level:5,completed:false,storage:store});assert.deepEqual(historyForHero(readHideoutProfile('ghju',store)).map(e=>e.level),[2]);
});
test('legacy campaign progress can be read without revealing future chapters',()=>{
 const store=storage();store.setItem('pink-wars-last-cleared','3');const p=readHideoutProfile('ghju',store);assert.deepEqual(p.completed,[1,2,3]);assert.equal(nextHideoutChapter(p),4);
 store.setItem(HIDEOUT_KEY+'ghju','invalid');assert.deepEqual(readHideoutProfile('ghju',store).completed,[],'corrupt data fails closed');
});
test('weapon, wardrobe, regenerated health and replenished charges are applied after checkpoint initialization',()=>{
 const store=storage(),hub=fixture(4);hub.inHideout=true;hub.ownedWeapons.add(2);hub.weaponIndex=2;hub.player.hp=100;hub.charges=4;
 const p=readHideoutProfile('ghju',store);p.completed=[1,2,3];p.rested=true;p.recharged=true;saveHideoutProfile('ghju',p,store);
 assert.ok(prepareHideoutDeparture(hub,{level:4,armorLevel:3,storage:store,now:123}));
 const mission=fixture(4);mission.player.hp=22;mission.player.shield=0;mission.ammo.fill(0);mission.charges=0;assert.ok(applyHideoutPreparation(mission,{storage:store}));
 assert.equal(mission.weaponIndex,2);assert.ok(mission.ownedWeapons.has(2));assert.equal(mission.player.hp,100);assert.equal(mission.player.shield,60);assert.equal(mission.charges,4);assert.equal(mission.hideoutArmorLevel,3);assert.equal(mission.ammo[2],WEAPONS[2].capacity);assert.equal(readHideoutProfile('ghju',store).pendingLevel,null);
 assert.equal(applyHideoutPreparation(mission,{storage:store}),false);assert.equal(mission.drainEvents().filter(e=>e.type==='hideout-prepared').length,1);
});
test('rest restores health and shield without granting ammunition; recharge does not heal',()=>{
 const store=storage(),hub=fixture();hub.inHideout=true;const p=readHideoutProfile('ghju',store);p.rested=true;saveHideoutProfile('ghju',p,store);prepareHideoutDeparture(hub,{level:3,storage:store,now:12});const m=fixture();m.player.hp=20;m.player.shield=0;m.ammo.fill(1);applyHideoutPreparation(m,{storage:store});assert.equal(m.player.hp,100);assert.equal(m.player.shield,60);assert.equal(m.ammo[0],1);
 const q=readHideoutProfile('ghju',store);q.rested=false;q.recharged=true;saveHideoutProfile('ghju',q,store);prepareHideoutDeparture(hub,{level:3,storage:store,now:13});const n=fixture();n.player.hp=20;n.player.shield=0;applyHideoutPreparation(n,{storage:store});assert.equal(n.player.hp,20);assert.equal(n.player.shield,60);
});
test('preparation never consumes in the refuge, wrong chapter, arena, or another hero profile',()=>{
 const store=storage(),hub=fixture();hub.inHideout=true;prepareHideoutDeparture(hub,{level:3,storage:store,now:123});assert.equal(applyHideoutPreparation(hub,{storage:store}),false);
 const other=fixture(3,'lylu');assert.equal(applyHideoutPreparation(other,{storage:store}),false);assert.equal(readHideoutProfile('ghju',store).pendingLevel,3);
 const early=fixture(1);assert.equal(applyHideoutPreparation(early,{storage:store}),false);assert.equal(readHideoutProfile('ghju',store).pendingLevel,3);
 const arena=fixture();arena.configureWeaponAccess({mode:'arena'});assert.equal(applyHideoutPreparation(arena,{storage:store}),false);
});
test('future IEM, opposite-hero dual pistols and invalid slots cannot bypass campaign equipment gates',()=>{
 const store=storage();store.setItem(HIDEOUT_KEY+'lylu',JSON.stringify({version:1,pendingLevel:3,preparedAt:123,owned:[2,7,9,999],selectedWeapon:9,armorLevel:3}));const g=fixture(3,'lylu');assert.ok(applyHideoutPreparation(g,{storage:store}));assert.equal(g.ownedWeapons.has(7),false);assert.equal(g.ownedWeapons.has(9),false);assert.notEqual(g.weaponIndex,9);assert.ok(g.ownedWeapons.has(2));
});
test('failed save keeps the player in the refuge and never redirects to an arbitrary URL',()=>{
 const bad={getItem:()=>null,setItem:()=>{throw Error('quota');}},g=fixture();assert.equal(prepareHideoutDeparture(g,{level:3,storage:bad}),false);assert.equal(chapterURL(99),null);assert.equal(chapterURL('https://other.example'),null);assert.match(hideoutURL({characterId:'lylu',renderer:'webgl',level:3}),/^\.\/planque.html\?character=lylu/);assert.match(chapterURL(4,{characterId:'ghju'}),/^\.\/niveau4.html\?/);
});
test('per-hero storage cannot overwrite plans or nanoparticle balances',()=>{
 const store=storage();store.setItem('pink-wars-nanoforge-v1-ghju','saved nano data');const g=fixture();prepareHideoutDeparture(g,{level:3,storage:store,now:123});assert.equal(store.getItem('pink-wars-nanoforge-v1-ghju'),'saved nano data');assert.equal(store.getItem(HIDEOUT_KEY+'lylu'),null);
});
test('the refuge overview receives adaptive resolution, while unconfigured offscreen orthographic views stay unchanged',()=>{
 let now=0,ratio=1;const renderer={render(){},setPixelRatio(v){ratio=v;},getPixelRatio:()=>1,getRenderTarget:()=>null,getScissorTest:()=>false,domElement:{ownerDocument:{hidden:false}},shadowMap:{enabled:false}};
 installRenderBudget(renderer,{adaptive:true,orthographicBudget:true},()=>now);for(let i=0;i<32;i++){now+=100;renderer.render({isScene:true},{isOrthographicCamera:true});}assert.ok(ratio<1);assert.ok(renderer.frameBudget.stats().degraded);
 let otherRatio=1;const other={...renderer,frameBudget:null,render(){},setPixelRatio(v){otherRatio=v;},getPixelRatio:()=>1};installRenderBudget(other,{adaptive:true},()=>now);for(let i=0;i<32;i++){now+=100;other.render({isScene:true},{isOrthographicCamera:true});}assert.equal(otherRatio,1);
});
