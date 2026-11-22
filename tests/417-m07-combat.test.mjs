import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ArenaGame} from '../dist/game-logic.js';
import * as L from '../dist/m07-layout.js';
import {createM07Mission,PORTAL_CHARGE} from '../dist/m07-mission.js';
import {SCRIPT,LOGS} from '../dist/m07-story.js';
import {terrainHeight,CLIFF_Z,CHAMBER} from '../dist/foret.js';
const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');

function world(){
  const said=[],g=new ArenaGame(L.buildCollisions(),()=>.5,L.createTraversal(),'ghju');g.reset('ghju');
  const m=createM07Mission({game:g,hooks:{say:k=>said.push(k)}});m.start();g.invulnerable=1e9;
  const go=(x,z)=>{Object.assign(g.player,{x,z,elevation:g.surfaceHeight(x,z),grounded:true});g.step(1/60,{});m.update(1/60);};
  const run=(s,{clear=false}={})=>{for(let i=0;i<s*30;i++){g.step(1/30,{});if(clear)g.enemies.length=0;m.update(1/30);}};
  const use=id=>{const it=L.INTERACTIONS.find(i=>i.id===id);go(it.x,it.z);return m.interact();};
  return {g,m,said,go,run,use};
}

test('chapter 07 is played with the shared engine on the forest relief: ground, wading, cave floor, cliff wall',()=>{
  const t=L.createTraversal();
  assert.ok(Math.abs(t.height(-60,20)-terrainHeight(-60,20))<1e-9,'the undergrowth is the terrain');
  assert.ok(t.height(CHAMBER.x,CHAMBER.z)<terrainHeight(CHAMBER.x,CHAMBER.z)-10,'the cave floor is under the plateau');
  const cliff=L.buildCollisions().filter(o=>o.kind==='cliff');assert.ok(cliff.length>40&&cliff.every(o=>Math.abs(o.z-(CLIFF_Z-3))<.01));
  const g=new ArenaGame(L.buildCollisions(),()=>.5,L.createTraversal(),'ghju');g.reset('ghju');Object.assign(g.player,{x:-40,z:-60,elevation:g.surfaceHeight(-40,-60),grounded:true});
  for(let i=0;i<240;i++)g.step(1/60,{x:0,z:-1,yaw:0,moveYaw:0});
  assert.ok(g.player.z>CLIFF_Z-1,'the northern cliff cannot be walked up');
});

test('every interaction, spawn, supply and checkpoint is reachable from the AEGIS gate',()=>{
  const cols=L.buildCollisions(),N=200,R=.55,grid=new Uint8Array(N*N);
  const inside=(x,z,m)=>cols.some(b=>{const dx=x-b.x,dz=z-b.z,c=Math.cos(b.yaw||0),s=Math.sin(b.yaw||0);return Math.abs(dx*c-dz*s)<b.hx+m&&Math.abs(dx*s+dz*c)<b.hz+m;});
  for(let j=0;j<N;j++)for(let i=0;i<N;i++)if(inside(-99.5+i,-99.5+j,R))grid[j*N+i]=1;
  const idx=(x,z)=>Math.round(z+99.5)*N+Math.round(x+99.5),seen=new Uint8Array(N*N),q=[idx(L.START.x,L.START.z)];seen[q[0]]=1;
  for(let h=0;h<q.length;h++){const c=q[h],x=c%N,y=(c/N)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=N||ny>=N)continue;const n=ny*N+nx;if(!seen[n]&&!grid[n]){seen[n]=1;q.push(n);}}}
  const near=(x,z)=>{for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)if(seen[idx(x+dx,z+dz)])return true;return false;};
  for(const it of L.INTERACTIONS)assert.ok(near(it.x,it.z),it.id);
  for(const [n,e] of Object.entries(L.ENCOUNTERS))for(const u of e.units){assert.ok(near(u.x,u.z),`${n}/${u.form}`);assert.ok(!inside(u.x,u.z,.85),`${n}/${u.form} inside a collider`);}
  for(const s of [...L.SUPPLIES,...L.STAGES.map(s=>s.checkpoint),L.EXIT])assert.ok(near(s.x,s.z),JSON.stringify(s));
});

test('the whole chapter runs: undergrowth, ford held 30 s, mill valve, cave turbine 45 s, centre documents, court 90 s, SY-05, exfiltration',()=>{
  const {g,m,said,go,run,use}=world();
  go(-82,70);assert.equal(m.stageId,'sousbois');assert.equal(m.groups().sousbois.deployed,6);g.enemies.length=0;
  go(-36,6);assert.equal(m.stageId,'gue');g.enemies.length=0;m.update();
  assert.ok(use('treuil'));assert.equal(m.hold.name,'treuil');run(4+PORTAL_CHARGE+.2);assert.equal(m.groups().gue1.deployed,3);run(L.HOLDS.treuil,{clear:true});assert.equal(m.stageId,'ruines');
  go(4,-20);assert.equal(m.groups().ruines.deployed,8);g.enemies.length=0;run(PORTAL_CHARGE+.5);g.enemies.length=0;m.update();
  assert.ok(use('vanne'));assert.equal(m.stageId,'cascade');g.enemies.length=0;
  go(27,-66);go(30,-78);assert.equal(m.stageId,'grotte');g.enemies.length=0;m.update();
  assert.ok(use('turbine'));run(L.HOLDS.turbine+1,{clear:true});assert.equal(m.stageId,'centre');g.enemies.length=0;
  use('doc-journal');assert.equal(m.stageId,'centre');use('doc-dossier');assert.equal(m.stageId,'cour');
  assert.ok(use('liaison'));run(L.HOLDS.liaison-2,{clear:true});assert.ok(!m.n08);run(3);assert.ok(m.n08,'the SY-05 lands once the link is up');
  const n=g.enemies.find(e=>e.n08);n.hp=1;run(ADAPT());assert.ok(m.n08.adaptations>=1,'it learns the player position');
  g.enemies=g.enemies.filter(e=>!e.n08);m.update();assert.equal(m.stageId,'sortie');g.enemies.length=0;
  go(L.EXIT.x,L.EXIT.z);assert.ok(m.completed);
  for(const k of said)assert.ok(SCRIPT[k],`line ${k}`);
  for(const k of ['lisiere','sousBois','gue','treuil','ruines','vanneOk','cascade','grotte','turbine','turbineOk','centre','dossier','protection','recuperation','liaison','n08','n08Ok','fin'])assert.ok(said.includes(k),k);
  function ADAPT(){return 10;}
});

test('documents are those of the chapter; the page uses the shared engine and every hero ability',()=>{
  for(const it of L.INTERACTIONS.filter(i=>i.log))assert.ok(LOGS[it.log],it.log);
  const page=read('niveau7.js');
  for(const part of ['ArenaGame','createPinkWarsInput','createPinkWarsTouch','mountCombatHud','createArmorFeedback','heroFlightFlags','createHeroCapabilityAudio','createMissionXR','installPinkWarsSoldier','createM07Art','createM07Mission'])assert.ok(page.includes(part),part);
  const html=read('foret.html');assert.match(html,/niveau7\.js/);assert.match(html,/foret-exploration\.html/);
  assert.match(read('foret-exploration.html'),/foret\.js/);assert.match(read('m07-art.js'),/buildForestWorld/);
});
