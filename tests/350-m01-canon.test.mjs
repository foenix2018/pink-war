import test from 'node:test';
import assert from 'node:assert/strict';
import {CampaignLevel1,LEVEL1} from '../dist/campaign-level1.js';
import {LEVEL1_MAP} from '../dist/level1-layout.js';
import {missionJournal} from '../dist/m01-narrative.js';
import {chapterStory} from '../dist/story-chapters.js';
import {readM01Checkpoint,writeM01Checkpoint,restoreM01Checkpoint} from '../dist/m01-checkpoint.js';
import {liftHeightAt} from '../dist/world-layout.js';
import {readFileSync,existsSync} from 'node:fs';
import {inflateRawSync} from 'node:zlib';

const storage=()=>{const data=new Map();return{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};};
function safe(stage='investigation',hero='ghju'){
 const g=new CampaignLevel1([],()=>.5,hero);g.enemies=[];g.toSpawn=0;g.openingSpawned=8;g.kills=16;g.setStage(stage);return g;
}
test('M01 starts calmly with GHJU dual R9; discovery guides to an actual collectible',()=>{
 const g=new CampaignLevel1([],()=>.5);
 assert.equal(g.enemies.length,0);assert.deepEqual([...g.ownedWeapons],[7,8,0]);assert.equal(g.selectWeapon(2),false);
 g.offerWeapon(1);const offer=g.weaponOffers[0],guide=g.objectiveTarget();
 assert.equal(guide.kind,'weapon');assert.equal(guide.x,offer.x);assert.equal(guide.z,offer.z);
 Object.assign(g.player,{x:offer.x,z:offer.z,elevation:offer.elevation});assert.equal(g.collectWeapon(),true);
 assert.equal(g.weaponIndex,1);assert.equal(g.selectWeapon(2),false);assert.equal(g.objectiveTarget().id,'isolate-convoy');
});
test('both archives follow the VEILLE-4 signal of the parents, the fall and Archives végétales, each hero with its sphere',()=>{
 for(const [hero,ai]of [['ghju','GAB-1'],['lylu','CAR-14']]){
  const first=missionJournal('archive',hero),second=missionJournal('investigation',hero);
  assert.match(first.lines.join('\n'),/VEILLE-4/);assert.match(first.lines.join('\n'),new RegExp(ai));
  assert.match(second.lines.join('\n'),/2189/);assert.match(second.lines.join('\n'),/Archives végétales/);
  const ending=chapterStory(1,hero);assert.match(ending.text,/Archives végétales/);assert.match(ending.text,/Bas-Niveaux/);
 }
 assert.equal(missionJournal('power'),null);assert.equal(missionJournal('sabotage'),null);
});
test('checkpoint refuses ongoing fights, falling and riding the lift; storage failures do not interrupt play',()=>{
 const store=storage(),g=safe();
 g.enemies=[{id:1}];assert.equal(writeM01Checkpoint(g,store),false);g.enemies=[];
 g.toSpawn=1;assert.equal(writeM01Checkpoint(g,store),false);g.toSpawn=0;
 g.player.grounded=false;assert.equal(writeM01Checkpoint(g,store),false);g.player.grounded=true;
 g.player.onLift='l1-lift';assert.equal(writeM01Checkpoint(g,store),false);g.player.onLift=null;
 assert.equal(writeM01Checkpoint(g,{setItem(){throw Error('unavailable');}}),false);
 assert.equal(writeM01Checkpoint(g,store),true);assert.equal(readM01Checkpoint('ghju',store).stage,'investigation');
 assert.equal(readM01Checkpoint('lylu',store),null);
});
test('resuming after either cleared encounter restores the pending weapon and never duplicates the opening patrol',()=>{
 for(const stage of ['investigation','sabotage','exit']){
  const source=safe(stage),store=storage();if(stage!=='investigation'){source.ownedWeapons.add(1);source.investigationRead=true;}
  if(stage==='exit'){source.ownedWeapons.add(2);source.sabotaged=true;}
  source.ammo[0]=7;source.player.hp=63;assert.equal(writeM01Checkpoint(source,store),true);
  const g=new CampaignLevel1([],()=>.5);assert.equal(restoreM01Checkpoint(g,readM01Checkpoint('ghju',store)),true);
  g.step(.02,{});assert.equal(g.stage,stage);assert.equal(g.enemies.length,0);assert.equal(g.player.hp,63);assert.equal(g.ammo[0],7);
  if(stage==='investigation')assert.equal(g.weaponOffers[0].index,1);
  if(stage==='sabotage')assert.equal(g.weaponOffers[0].index,2);
  if(stage==='exit')assert.equal(g.sabotaged,true);
 }
});
test('the canonical service lift continuously carries the player to 4.8 metres',()=>{
 const g=safe(),lift=LEVEL1_MAP.lifts[0];g.time=3.9;Object.assign(g.player,{x:lift.x,z:lift.z,elevation:0,grounded:true,onLift:lift.id});
 let previous=0;for(let i=0;i<150;i++){
  g.step(.05,{});const h=g.player.elevation;assert.ok(Math.abs(h-previous)<.07,'no teleport-sized step');previous=h;
  assert.ok(Math.abs(h-liftHeightAt(lift,g.time))<.002);
 }
 assert.ok(Math.abs(g.player.elevation-LEVEL1.exit.y)<.002);assert.equal(LEVEL1.exit.y,4.8);
});
test('the two CC0 props have finite metre-scale geometry, unit normals, intact indices and locally available PBR images',()=>{
 const path=new URL('../dist/assets/cc0/',import.meta.url),pkg=JSON.parse(readFileSync(new URL('m01-salvage.json',path)));
 assert.equal(pkg.models.length,2);
 for(const model of pkg.models){
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];let triangles=0;
  for(const batch of model.batches){
   const v=inflateRawSync(Buffer.from(batch.vertices,'base64')),ix=inflateRawSync(Buffer.from(batch.indices,'base64'));
   assert.equal(v.length%32,0);assert.equal(ix.length%12,0);
   for(let i=0;i<v.length;i+=32){
    for(let k=0;k<8;k++)assert.ok(Number.isFinite(v.readFloatLE(i+k*4)));
    for(let k=0;k<3;k++){const p=v.readFloatLE(i+k*4);min[k]=Math.min(min[k],p);max[k]=Math.max(max[k],p);}
    assert.ok(Math.abs(Math.hypot(v.readFloatLE(i+12),v.readFloatLE(i+16),v.readFloatLE(i+20))-1)<1e-5);
   }
   for(let i=0;i<ix.length;i+=4)assert.ok(ix.readUInt32LE(i)<v.length/32);
   triangles+=ix.length/12;
   for(const file of Object.values(batch.maps))assert.ok(existsSync(new URL(file,path)));
  }
  for(let k=0;k<3;k++)assert.ok(Math.abs(max[k]-min[k]-model.size[k])<1e-5);
  assert.ok(Math.abs(min[1])<1e-5);assert.ok(triangles<15000);assert.equal(model.license,'CC0-1.0');
 }
});
