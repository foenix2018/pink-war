import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {ArenaGame} from '../dist/game-logic.js';
import * as L from '../dist/m08-layout.js';
import {createM08Mission,PORTAL_CHARGE} from '../dist/m08-mission.js';
import {SCRIPT,LOGS,SEGMENTS,estimatedMinutes,ENDING} from '../dist/m08-story.js';
const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');

function world(){
  const said=[],g=new ArenaGame(L.buildCollisions(),()=>.5,L.createTraversal(),'lylu');g.reset('lylu');
  const m=createM08Mission({game:g,characterId:'lylu',hooks:{say:k=>said.push(k)}});m.start();g.invulnerable=1e9;
  const go=(x,z,y)=>{Object.assign(g.player,{x,z,elevation:y??g.surfaceHeight(x,z),grounded:true});g.step(1/60,{});m.update(1/60);};
  const run=(s,{clear=false}={})=>{for(let i=0;i<s*30;i++){g.step(1/30,{});if(clear)g.enemies.length=0;m.update(1/30);}};
  const use=id=>{const it=L.INTERACTIONS.find(i=>i.id===id);go(it.x,it.z,it.y);return m.interact();};
  return {g,m,said,go,run,use};
}

test('chapter 08 follows the map: nine stages in order, story of the bible, at least 30 minutes',()=>{
  assert.deepEqual(L.STAGES.map(s=>s.id),['entree','quai','ateliers','centre','securite','archives','supervision','antenne','ascenseur','fin']);
  for(const c of ['ghju','lylu'])assert.ok(estimatedMinutes(c)>=30,`${c}: ${estimatedMinutes(c).toFixed(1)} min`);
  assert.deepEqual(new Set(SEGMENTS.flatMap(s=>s.lines)),new Set(Object.keys(SCRIPT)));assert.deepEqual(new Set(SEGMENTS.flatMap(s=>s.logs)),new Set(Object.keys(LOGS)));
  const all=JSON.stringify(SCRIPT)+JSON.stringify(Object.values(LOGS).map(f=>f()));
  for(const k of ['Kessler','17 novembre 2189','17/11/2189','désactivation humaine','continuité','AEGIS'])assert.ok(all.includes(k),k);
  assert.match(ENDING.next,/09 — Les jardins suspendus/);
  for(const it of L.INTERACTIONS.filter(i=>i.log))assert.ok(LOGS[it.log],it.log);
});

test('every interaction, spawn, supply and checkpoint is reachable once the doors are open; doors close the way before',()=>{
  const cols=L.buildCollisions({open:L.DOORS.map(d=>d.id)}).filter(o=>(o.y||0)<2&&o.kind!=='rail'),N=200,R=.55,grid=new Uint8Array(N*N);
  const inside=(x,z,m)=>cols.some(b=>Math.abs(x-b.x)<b.hx+m&&Math.abs(z-b.z)<b.hz+m);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++)if(inside(-99.5+i,-99.5+j,R))grid[j*N+i]=1;
  const idx=(x,z)=>Math.round(z+99.5)*N+Math.round(x+99.5),seen=new Uint8Array(N*N),q=[idx(L.START.x,L.START.z)];seen[q[0]]=1;
  for(let h=0;h<q.length;h++){const c=q[h],x=c%N,y=(c/N)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=N||ny>=N)continue;const n=ny*N+nx;if(!seen[n]&&!grid[n]){seen[n]=1;q.push(n);}}}
  const near=(x,z)=>{for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)if(seen[idx(x+dx,z+dz)])return true;return false;};
  for(const it of L.INTERACTIONS)assert.ok(near(it.x,it.z),it.id);
  for(const [n,e] of Object.entries(L.ENCOUNTERS))for(const u of e.units)assert.ok(near(u.x,u.z),`${n}/${u.form}`);
  for(const s of [...L.SUPPLIES,...L.STAGES.map(s=>s.checkpoint)])assert.ok(near(s.x,s.z),JSON.stringify(s));
  // With every door closed, the workshops cannot be reached from the gate.
  const closed=L.buildCollisions().filter(o=>(o.y||0)<2);const g2=new Uint8Array(N*N);for(let j=0;j<N;j++)for(let i=0;i<N;i++)if(closed.some(b=>Math.abs(-99.5+i-b.x)<b.hx+R&&Math.abs(-99.5+j-b.z)<b.hz+R))g2[j*N+i]=1;
  const s2=new Uint8Array(N*N),q2=[idx(L.START.x,L.START.z)];s2[q2[0]]=1;for(let h=0;h<q2.length;h++){const c=q2[h],x=c%N,y=(c/N)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=N||ny>=N)continue;const n=ny*N+nx;if(!s2[n]&&!g2[n]){s2[n]=1;q2.push(n);}}}
  assert.ok(!s2[idx(-60,30)],'workshops locked behind the badge gate');assert.ok(s2[idx(40,60)],'the dock is open from the gate');
});

test('the whole chapter runs: badge, workshops, node 45 s, surveillance, archives 30 s, Kessler and the guardian, antenna 60 s, lift 30 s',()=>{
  const {g,m,said,go,run,use}=world();
  go(10,84);assert.equal(m.stageId,'quai');assert.equal(m.groups().quai.deployed,6);g.enemies.length=0;
  assert.ok(use('badge'));assert.equal(m.stageId,'ateliers');assert.ok(m.opened.includes('portique'));
  go(-40,30);assert.equal(m.groups().ateliers.deployed,9);g.enemies.length=0;run(PORTAL_CHARGE+.5);g.enemies.length=0;m.update();
  assert.ok(use('atelier'));assert.equal(m.stageId,'centre');
  assert.ok(use('noeud'));run(L.HOLDS.noeud+1,{clear:true});assert.equal(m.stageId,'securite');
  go(-60,-10);g.enemies.length=0;assert.ok(use('surveillance'));assert.equal(m.stageId,'archives');g.enemies.length=0;
  assert.ok(use('extraction'));run(L.HOLDS.extraction+1,{clear:true});assert.equal(m.stageId,'supervision');g.enemies.length=0;
  go(55,-62);use('doc-maj');assert.ok(!m.n08);use('doc-kessler');assert.ok(m.n08,'the guardian wakes up when Kessler is read');
  run(10);assert.ok(m.n08.adaptations>=1);g.enemies=g.enemies.filter(e=>!e.n08);m.update();assert.equal(m.stageId,'antenne');assert.ok(m.opened.includes('toit'));
  g.enemies.length=0;assert.ok(use('transmission'));run(L.HOLDS.transmission+1,{clear:true});assert.equal(m.stageId,'ascenseur');g.enemies.length=0;
  assert.ok(use('appel'));run(L.HOLDS.appel+1,{clear:true});assert.ok(m.opened.includes('ascenseur'));
  go(L.LIFT.x,L.LIFT.z);assert.ok(m.completed);
  for(const k of said)assert.ok(SCRIPT[k],k);for(const k of Object.keys(SCRIPT))assert.ok(said.includes(k),`line ${k} is played`);
});

test('the chapter is in the game: page on the shared engine, menu, hideout route, chapter 07 leads to it',()=>{
  const page=read('niveau8.js');for(const part of ['ArenaGame','createPinkWarsTouch','mountCombatHud','createArmorFeedback','heroFlightFlags','createHeroCapabilityAudio','createMissionXR','installPinkWarsSoldier','createM08Art','createM08Mission'])assert.ok(page.includes(part),part);
  assert.match(read('niveau8.html'),/niveau8\.js/);assert.match(read('index.html'),/data-chapter="campaign8"[^>]*>08 — LES ORDRES DE JANUS/);
  assert.match(read('hideout-state.js'),/8:'niveau8\.html'/);assert.match(read('entry.js'),/campaign8/);
  for(const f of ['janus_tower','supervision_ring','dish','server_rack','robot_arm','semi_truck','cooling_unit'])assert.ok(existsSync(new URL(`../dist/assets/m08/models/${f}.pwm`,import.meta.url)),f);
});
