import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {weaponGlyph} from '../dist/combat-hud.js';
import {WEAPONS} from '../dist/game-logic.js';
const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');

test('every weapon of the arsenal has a silhouette for the readout and the equipment list',()=>{
  for(let i=0;i<WEAPONS.length;i++)assert.match(weaponGlyph(i),/<svg class="pw-hud-glyph" viewBox="0 0 48 16"[^>]*><path d="M[^"]+"\/><\/svg>/,WEAPONS[i].name);
  assert.notEqual(weaponGlyph(8),weaponGlyph(0),'the VORTEX is not drawn as the VX-9');
});

test('the equipment panel has the Armes / Grenades / Options tabs and keeps the real commands',()=>{
  const hud=read('combat-hud.js');
  for(const tab of ['armes','grenades','options'])assert.match(hud,new RegExp(`data-gear-tab="${tab}"`));
  assert.match(hud,/data-gear-pane="grenades"[^]*pw-hud-gear-grenade/);assert.match(hud,/touche B/,'the grenade key is the real one (KeyB)');
  assert.match(hud,/pw-hud-gear-check/);assert.match(hud,/game\.selectWeapon\(index\)/);assert.match(hud,/command\('charge'\)/);
});

test('the concept layout is for mouse screens only: touch keeps the companion at mid-height',()=>{
  const css=read('combat-hud.css'),desk=css.slice(css.indexOf('@media (pointer:fine) and (min-width:900px)'));
  assert.match(desk,/\.pw-hud-companion\{top:var\(--pw-top\)!important/);assert.match(css,/\.pw-hud \.pw-hud-companion\{top:35%/);
  assert.match(css,/\.pw-hud::before\{[^}]*pointer-events:none/,'the grade never catches a click');
});

test('Shadow Unit finish: white VORTEX, pink sight, white vambrace, a light that follows the camera',()=>{
  assert.match(read('vortex-ar7.js'),/olive=C\(0xe4e6ea\)/);assert.match(read('rlh-gloves.js'),/ceramique:standard\(\{color:0xe6e8ec/);assert.match(read('rlh-gloves.js'),/brassard_ceramique/);
  const w=read('weapons.js');assert.match(w,/export function attachViewmodelLight/);assert.match(w,/camera\.add\(keyLight,fillLight,rimLight\)/,'key, soft fill on the shooting arm, pink rim');
  for(const page of ['niveau3.js','niveau4.js','niveau6.js','ligne9.js','couronne-helix.js','level2-test.js'])assert.match(read(page),/attachViewmodelLight\(camera/,page);
});

test('the FPS forearms are thicker than the wrist, carry straps and a ceramic vambrace that follows their sections',async()=>{
  const T=await import('../dist/vendor/three.webgpu.min.js'),{createCharacterKit}=await import('../dist/soldier.js'),{createGlove}=await import('../dist/hands.js');
  const kit=createCharacterKit(new T.Texture());
  const glove=createGlove(kit.gloves,{arm:true}),short=createGlove(kit.gloves,{sleeve:false});
  const names=new Set();glove.userData.rlh.traverse(o=>{if(o.name)names.add(o.name);});
  const box=new T.Box3().setFromObject(glove.userData.rlh),size=box.getSize(new T.Vector3());
  assert.ok(size.x>.20||size.y>.20||size.z>.20,'a full-length forearm');
  const arm=read('rlh-gloves.js');
  assert.match(arm,/const MANCHETTE_ARM=MANCHETTE\.map\(grow\)/);assert.match(arm,/armGrowth=y=>/);
  assert.match(arm,/sangle_avant_bras/);assert.match(arm,/boucle_avant_bras/);assert.match(arm,/brassard_ceramique_interne/);
  assert.ok(short.userData.rlh,'the wrist-only glove (VR, tracked hands) is unchanged');
});
test('the objective guide and the companions\' support fire hold their target instead of swinging between enemies',async()=>{
  const {createTargetLock}=await import('../dist/target-lock.js'),{createObjectiveSmoother}=await import('../dist/objective-guidance.js');
  const a={id:'a',d:10},b={id:'b',d:9},c={id:'c',d:5},dist=e=>e.d,lock=createTargetLock({ratio:.72,hold:.7});
  assert.equal(lock.pick([a,b],dist,0),b,'first pick: the nearest');
  a.d=8.5;assert.equal(lock.pick([a,b],dist,.1),b,'two distances crossing do not make it swing');
  a.d=6;assert.equal(lock.pick([a,b],dist,.2),b,'clearly closer, but not for long enough yet');
  assert.equal(lock.pick([a,b],dist,1.0),a,'clearly closer for a while: it changes hands once');
  assert.equal(lock.pick([b,c],dist,1.1),c,'its target fell: the nearest takes over at once');
  const s=createObjectiveSmoother({rate:9,grace:.9}),hint=(offset,over={})=>({offset,behind:false,turn:0,elevation:0,distance:10,arrived:false,label:'x',kind:'enemy',...over});
  assert.equal(s.update(hint(.2),0).offset,.2);
  const eased=s.update(hint(1),.016).offset;assert.ok(eased>.2&&eased<.5,'the marker glides to its new bearing');
  assert.ok(s.update(null,.3),'a one-frame loss of the route does not blink the guide out');
  assert.equal(s.update(null,1.6),null,'it does disappear when the route is really gone');
  const g=createObjectiveSmoother();g.update(hint(0),0);for(let t=0;t<10;t++)g.update(hint(0,{behind:t%2===0}),.016*t+.016);
  assert.equal(g.update(hint(0,{behind:true}),.2).behind,false,'a flag flickering every frame does not flip the arrows');
});
test('Gaby and Cara keep pointing at the same attacker until it falls or another one is clearly closer',async()=>{
  const {companionThreat}=await import('../dist/companion-escort.js');
  const e=(id,x,z)=>({id,x,z,elevation:0,aimHeight:1.2,hp:100,awareness:'engaged'});
  const a=e(1,3,-8),b=e(2,-3,-9),game={time:0,player:{x:0,z:0},obstacles:[],enemies:[a,b]},origin={x:0,y:1.6,z:0};
  assert.equal(companionThreat(game,origin).id,1);
  game.time=.2;b.z=-7.6;assert.equal(companionThreat(game,origin).id,1,'a slightly closer one does not take the aim');
  game.time=.3;a.hp=0;assert.equal(companionThreat(game,origin).id,2,'the target fell: the other one');
});
