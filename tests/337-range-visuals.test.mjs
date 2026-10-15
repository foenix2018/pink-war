import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ShootingRangeGame } from '../dist/shooting-range.js';

const file=name=>readFileSync(new URL('../dist/'+name,import.meta.url),'utf8');

test('la sélection de perspective et des armes est absente de l’accueil',()=>{
  const html=file('index.html');
  assert.doesNotMatch(html,/class="view-choice"/);
  assert.doesNotMatch(html,/id="training-weapon-choice"/);
  assert.doesNotMatch(html,/data-training-weapon/);
  assert.match(html,/id="range-weapon-selector"/);
  assert.match(html,/id="training-hud"/);
  for(let i=0;i<5;i++)assert.match(html,new RegExp('data-range-weapon="'+i+'"'));
});

test('chargement FPS par défaut, sans manipuler les contrôles supprimés',()=>{
  const entry=file('entry.js'),game=file('game.js');
  assert.match(entry,/view='fps'/);
  assert.doesNotMatch(entry,/training-weapon-choice|data-training-weapon|data-view/);
  assert.match(game,/boot\?\.view==='third'\?'third':'fps'/);
  assert.match(game,/game\?\.mode!=='training'/);
  assert.match(game,/\[data-range-weapon\]/);
  assert.doesNotMatch(game,/training-weapon-choice|data-training-weapon/);
});

test('les cinq armes de tir sont équipables pendant l’entraînement',()=>{
  const sim=new ShootingRangeGame();
  assert.equal(sim.mode,'training');
  for(let i=0;i<5;i++)assert.equal(sim.ownedWeapons.has(i),true);
  assert.equal(sim.ownedWeapons.has(5),false);
  assert.equal(sim.selectWeapon(4),true);
  assert.equal(sim.weaponIndex,4);
  assert.equal(sim.selectWeapon(2),true);
  assert.equal(sim.weaponIndex,2);
});

test('matériaux du stand texturés et adaptés aux appareils mobiles',()=>{
  const art=file('shooting-range-art.js'),css=file('training.css');
  assert.match(art,/new T.CanvasTexture\(canvas\)/);
  assert.match(art,/tex\.wrapS=tex\.wrapT=T.RepeatWrapping/);
  assert.match(art,/bumpMap:map/);
  assert.match(art,/textures\.forEach\(t=>t\.dispose\(\)\)/);
  assert.match(css,/\.range-weapon-selector\{[^}]*pointer-events:auto/);
  assert.match(css,/\.range-weapon-buttons button\[aria-pressed="true"\]/);
  assert.doesNotMatch(css,/\.training-weapon-choice/);
});
