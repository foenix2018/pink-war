import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {terrainHeight,groundHeight,riverX,waterY,zoneAt,scatter,HALF,CLIFF_Z,POOL} from '../dist/foret.js';
import {SEGMENTS,SCRIPT,LOGS,ENDING} from '../dist/m07-story.js';

test('the valley of the forest prototype: river below the banks, a waterfall drop, a cave under the plateau',()=>{
  for(let z=-55;z<=95;z+=5){const x=riverX(z);assert.ok(waterY(z)>terrainHeight(x,z),`water over the bed at z=${z}`);assert.ok(terrainHeight(x+12,z)>waterY(z),`banks above the water at z=${z}`);}
  const drop=waterY(CLIFF_Z-8)-waterY(POOL.z);assert.ok(drop>15&&drop<22,`waterfall ${drop.toFixed(1)} m`);
  assert.equal(zoneAt(riverX(-62)+12.5,-80),'La grotte');assert.ok(terrainHeight(riverX(-62)+12.5,-80)-groundHeight(riverX(-62)+12.5,-80)>12,'rock above the tunnel');
  for(let x=-HALF+5;x<HALF-5;x+=10)for(let z=-HALF+5;z<HALF-5;z+=10)assert.ok(Number.isFinite(terrainHeight(x,z)));
});

test('every place of the chapter 07 run exists in the prototype',()=>{
  const zones=new Set();for(let x=-95;x<=95;x+=2)for(let z=-95;z<=95;z+=2)zones.add(zoneAt(x,z));
  for(const z of ['La lisière','Sous le couvert','Le gué','Le moulin et l’aqueduc','Derrière la cascade','La grotte'])assert.ok(zones.has(z),z);
  for(const s of SEGMENTS.filter(s=>s.id!=='centre'&&s.id!=='recuperation'&&s.id!=='sortie'))assert.ok([...zones].includes(s.title)||s.id==='sous-bois'||s.id==='lisiere',s.title);
});

test('vegetation stays off the river, the path and the ford; budgets are bounded for phones and headsets',()=>{
  const w=scatter(42);
  assert.ok(w.trees.length>=2000&&w.trees.length<=2600,`trees ${w.trees.length}`);assert.ok(w.ferns.length<=6000&&w.grass.length<=12000);
  for(const t of w.trees)assert.ok(Math.abs(t.x-riverX(t.z))>=8,'no tree in the river');
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
  assert.match(read('entry.js'),/'foret','breach'\]\.includes\(requestedMode\)/);assert.match(read('entry.js'),/openLigne9\('\.\/foret\.html'\)/);
  assert.match(read('game.js'),/selectedMode==='foret'\)\{const page=new URL\('\.\/foret\.html'/);
  assert.match(read('foret.html'),/index\.html\?mode=foret/);
});
