import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {chapterStory} from '../dist/story-chapters.js';

const file=name=>readFileSync(new URL('../dist/'+name,import.meta.url),'utf8');

test('M01 ending advances the canonical sibling mystery into Bas-Niveaux',()=>{
 const ghju=chapterStory(1,'ghju');
 const lylu=chapterStory(1,'lylu');
 assert.match(ghju.text,/LYLU/);assert.match(lylu.text,/GHJU/);
 assert.match(ghju.text,/Bas-Niveaux/);
 assert.match(ghju.next,/SOUS LES NÉONS/);
});

test('M02 ending preserves both story choices and the next freight clue',()=>{
 for(const character of ['ghju','lylu']){
  for(const choice of ['escort','proof']){
   const narrative=chapterStory(2,character,choice);
   assert.match(narrative.text,/HELIX/);
   assert.match(narrative.text,/Anneau logistique/);
   assert.match(narrative.next,/CONVOI DES ABSENTS/);
  }
 }
 assert.notEqual(chapterStory(2,'ghju','escort').text,chapterStory(2,'ghju','proof').text);
});

test('M01 and M02 each include a drawable narrative image',()=>{
 for(const n of ['01','02']){
  const path=new URL('../dist/art/story-chapter-'+n+'.svg',import.meta.url);
  assert.ok(existsSync(path),String(path));
  const svg=readFileSync(path,'utf8');
  assert.match(svg,/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg,/viewBox="0 0 1600 900"/);
  assert.match(svg,/<\/svg>/);
 }
});

test('M02 is linked into the normal mission selection and M01 finale',()=>{
 const home=file('index.html'),entry=file('entry.js'),game=file('game.js'),level=file('level2-test.js');
 assert.match(home,/data-mode="campaign2"/);
 assert.match(entry,/mode==='campaign2'/);
 assert.match(entry,/level2-test\.html/);
 assert.match(game,/attachCampaignStory/);
 assert.match(level,/showChapter2Finale/);
 assert.match(level,/createDistrictArchitecture/);
 assert.match(level,/from '\.\/game-logic\.js'/);
});

test('M02 upgraded architecture retains direct simulation colliders',()=>{
 const art=file('level2-architecture.js');
 assert.match(art,/residentialTower/);
 assert.match(art,/occupiedMarket/);
 assert.match(art,/collisions\.push/);
 assert.match(art,/balcony/);
 assert.match(art,/neonMonorail/);
});
