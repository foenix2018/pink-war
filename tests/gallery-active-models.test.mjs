import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {WEAPONS} from '../dist/game-logic.js';
import {ROBOT_DURABILITY} from '../dist/enemy-combat.js';

const html=readFileSync(new URL('../dist/galerie.html',import.meta.url),'utf8');
const viewer=readFileSync(new URL('../dist/gallery-3d.js',import.meta.url),'utf8');

test('La galerie ouvre les objets du jeu dans le canvas natif (et non les proxies)',()=>{
 assert.match(html,/id="native-model"/);
 assert.match(viewer,/import\('\.\/soldier\.js'\)/);
 assert.match(viewer,/import\('\.\/shadow-unit-game\.js'\)/);
 assert.match(viewer,/import\('\.\/reco1\.js'\)/);
 assert.match(viewer,/import\('\.\/weapons\.js'\)/);
 assert.match(viewer,/import\('\.\/enemies\.js'\)/);
 assert.match(viewer,/import\('\.\/ai-companions\.js'\)/);
 assert.doesNotMatch(viewer,/const existing=null|placeholder|cube proxy/);
});
test('Chaque arme en service a une fiche et un aperçu 3D',()=>{
 for(const weapon of WEAPONS){
  assert.ok(html.includes('"'+weapon.name+'"'),'Absent de la galerie: '+weapon.name);
  assert.ok(viewer.includes("'"+weapon.name+"'"),'Absent du viewer 3D: '+weapon.name);
 }
 assert.ok(existsSync(new URL('../dist/assets/pink-war/blaster-p-mk4.glb',import.meta.url)),'NOVA MK4 doit être disponible');
});
test('Les personnages et les ennemis actifs sont représentés',()=>{
 for(const name of ['GHJU','LYLU','GABY','CARA','RECO1','ROBOT LOURD'])assert.ok(html.includes('"'+name+'"'));
 for(const form of ['synth','stalker','brute','listener','scuttler','probe','bulwark'])assert.ok(viewer.includes("'"+form+"'"));
 for(const form of ['probe','scuttler','stalker','synth','listener','brute','bulwark'])assert.ok(ROBOT_DURABILITY[form]>0);
});
