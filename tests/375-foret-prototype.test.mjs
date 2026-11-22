import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {terrainHeight,groundHeight,riverX,riverInfo,waterY,zoneAt,scatter,HALF,CLIFF_Z,POOL,RIVER,CAVE,CHAMBER,PATH,PATH_EAST,CENTRE,COURT,AQUEDUCTS} from '../dist/foret.js';
import {SEGMENTS,SCRIPT,LOGS,ENDING} from '../dist/m07-story.js';

test('the valley follows the map: river from the waterfall to the east exit, banks above the water, a cave under the plateau',()=>{
  for(let i=4;i<RIVER.length-4;i+=4){const p=RIVER[i];if(Math.abs(p.x)>95||Math.abs(p.z)>95||(p.z>CLIFF_Z-9&&p.z<POOL.z))continue;// the cliff lip and the cave cleft are skipped
    const a=RIVER[i-2],b=RIVER[i+2],tx=b.x-a.x,tz=b.z-a.z,l=Math.hypot(tx,tz);
    assert.ok(waterY(p.z)>terrainHeight(p.x,p.z),`water over the bed at ${p.x.toFixed(0)},${p.z.toFixed(0)}`);
    for(const sgn of [-1,1]){const x=p.x-tz/l*12*sgn,z=p.z+tx/l*12*sgn;if(Math.hypot(x-POOL.x,z-POOL.z)<POOL.r+4)continue;assert.ok(terrainHeight(x,z)>waterY(p.z),`bank above the water near ${p.x.toFixed(0)},${p.z.toFixed(0)}`);}}
  const drop=waterY(CLIFF_Z-8)-waterY(POOL.z);assert.ok(drop>15&&drop<22,`waterfall ${drop.toFixed(1)} m`);
  assert.ok(RIVER.at(-1).x>95,'the river leaves the valley to the east');
  const [cx,cz]=CAVE[2];assert.equal(zoneAt(cx,cz),'La grotte');assert.ok(terrainHeight(cx,cz)-groundHeight(cx,cz)>12,'rock above the tunnel');
  assert.equal(zoneAt(CHAMBER.x,CHAMBER.z),'La grotte');
  for(let x=-HALF+5;x<HALF-5;x+=10)for(let z=-HALF+5;z<HALF-5;z+=10)assert.ok(Number.isFinite(terrainHeight(x,z)));
  // The main route is walkable: no step higher than 30 cm per half metre.
  for(const list of [PATH,PATH_EAST])for(let i=0;i<list.length-1;i++){const [ax,az]=list[i],[bx,bz]=list[i+1],L=Math.hypot(bx-ax,bz-az);for(let k=0;k+.5<L;k+=.5){const t0=k/L,t1=(k+.5)/L;assert.ok(Math.abs(groundHeight(ax+(bx-ax)*t1,az+(bz-az)*t1)-groundHeight(ax+(bx-ax)*t0,az+(bz-az)*t0))<.32);}}
});

test('every place of the chapter 07 map exists, in the order of the run',()=>{
  const zones=new Set();for(let x=-95;x<=95;x+=2)for(let z=-95;z<=95;z+=2)zones.add(zoneAt(x,z));
  for(const s of SEGMENTS)assert.ok(zones.has(s.title)||s.id==='sous-bois'||s.id==='lisiere',s.title);
  for(const z of ['La lisière','Sous le couvert','Le gué','Le moulin et l’aqueduc','Derrière la cascade','La grotte','Le Centre de la Cascade','La récupération','Par l’aqueduc'])assert.ok(zones.has(z),z);
  assert.ok(PATH[0][0]<-80&&PATH[0][1]>90,'entry in the south-west (AEGIS gate)');
  assert.ok(CENTRE.x1>riverInfo(CENTRE.x1,CENTRE.z1).x,'medical centre on the east bank');assert.ok(AQUEDUCTS.length===2);
});

test('vegetation stays off the river, the path and the ford; budgets are bounded for phones and headsets',()=>{
  const w=scatter(42);
  assert.ok(w.trees.length>=2000&&w.trees.length<=2600,`trees ${w.trees.length}`);assert.ok(w.ferns.length<=6000&&w.grass.length<=12000);
  for(const t of w.trees)assert.ok(riverInfo(t.x,t.z).d>=7,'no tree in the river');
  assert.ok(w.rocks.filter(r=>r.step).length>=8,'stepping stones at the ford');
  const code=readFileSync(new URL('../dist/foret.js',import.meta.url),'utf8');
  assert.match(code,/alphaTest/);assert.doesNotMatch(code.replace(/\/\/.*$/gm,''),/transmission|MeshPhysicalMaterial|CubeCamera|Reflector/,'no costly reflections');
  assert.match(code,/frustum\.intersectsSphere/,'vegetation is culled per instance');
});

test('sunset, post-apocalyptic remnants and the chapter 07 scenes from chapter 06 to chapter 08',()=>{
  const code=readFileSync(new URL('../dist/foret.js',import.meta.url),'utf8'),html=readFileSync(new URL('../dist/foret.html',import.meta.url),'utf8');
  for(const part of ['SUN_DIR','function skyline','function remnants','function probes','AEGIS','ORDRE','createStory'])assert.ok(code.includes(part),part);
  const scenes=[...code.matchAll(/\['([a-zA-Z]+)', \(x, z\) =>|\['(lisiere)', \(\) =>/g)].map(m=>m[1]||m[2]);
  for(const id of scenes)assert.ok(SCRIPT[id],`scene ${id} exists in m07-story.js`);
  assert.deepEqual(scenes.slice(0,1),['lisiere']);assert.ok(scenes.includes('turbineOk'));
  for(const id of [...code.matchAll(/\{ id: '([a-z-]+)', x:/g)].map(m=>m[1]))assert.ok(LOGS[id],`document ${id}`);
  assert.match(SCRIPT.lisiere.ghju[0][1],/fonderie/,'the chapter opens on the foundry of chapter 06');assert.match(ENDING.next,/08 — Les Ordres de JANUS/);
  assert.match(html,/chapitre 06/);assert.match(html,/chapitre 08/);assert.match(html,/coucher du soleil/);
});

test('chapter 07 is in the game: menu entry, mode, launch to the forest page and back',()=>{
  const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
  assert.match(read('index.html'),/data-chapter="foret"[^>]*>07 — MÉMOIRES LOCALES/);
  assert.match(read('entry.js'),/'campaign8','campaign9','foret','breach'\]\.includes\(requestedMode\)/);assert.match(read('entry.js'),/openLigne9\('\.\/foret\.html'\)/);
  assert.match(read('game.js'),/selectedMode==='foret'\)\{const page=new URL\('\.\/foret\.html'/);
  assert.match(read('foret.html'),/index\.html\?mode=campaign8/);assert.match(read('foret-exploration.html'),/index\.html\?mode=foret/);
});
