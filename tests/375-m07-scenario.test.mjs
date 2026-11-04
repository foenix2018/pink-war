import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as M07 from '../dist/m07-story.js';
import {ArenaGame} from '../dist/game-logic.js';

const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');
const bible=readFileSync(new URL('../docs/pink-wars/BIBLE_NARRATIVE_V2_HERITIERS_DU_SILENCE.md',import.meta.url),'utf8');
const all=c=>JSON.stringify(Object.keys(M07.SCRIPT).flatMap(id=>M07.linesFor(id,c)))+JSON.stringify(Object.keys(M07.LOGS).map(k=>M07.logFor(k,c)))+M07.ENDING.text[c];

test('chapter 07 lasts at least 30 minutes for each hero, with a pace slower than the engine’s run',()=>{
  // The engine runs at about 7 m/s; the budget walks at 3.5 m/s (a forest explored under cover).
  const g=new ArenaGame([],()=>.5);g.reset('ghju');g.nextWave=Infinity;g.toSpawn=0;const x=g.player.x,z=g.player.z;
  for(let i=0;i<60;i++){g.step(1/60,{x:0,z:-1,yaw:0,moveYaw:0});g.enemies.length=0;}
  assert.ok(Math.hypot(g.player.x-x,g.player.z-z)>=3.5,'the budget never walks faster than the hero');
  for(const c of ['ghju','lylu'])assert.ok(M07.estimatedMinutes(c)>=30,`${c}: ${M07.estimatedMinutes(c).toFixed(1)} min`);
  assert.ok(M07.SEGMENTS.every(s=>M07.segmentSeconds(s)<=8*60),'no segment drags on more than eight minutes');
  for(const s of M07.SEGMENTS){for(const id of s.lines)assert.ok(M07.SCRIPT[id],`${s.id}: line ${id}`);for(const id of s.logs)assert.ok(M07.LOGS[id],`${s.id}: log ${id}`);}
  assert.deepEqual(new Set(M07.SEGMENTS.flatMap(s=>s.lines)),new Set(Object.keys(M07.SCRIPT)),'every scene is placed in the run');
  assert.deepEqual(new Set(M07.SEGMENTS.flatMap(s=>s.logs)),new Set(Object.keys(M07.LOGS)),'every document is placed in the run');
});

test('the forest, the cave, the waterfall, the old ruins and the river are all in the run',()=>{
  const zones=M07.SEGMENTS.map(s=>s.title+' '+s.zone).join(' ');
  for(const place of [/[Ss]ous-bois/,/[Cc]ours d’eau|rivière/,/[Rr]uines/,/[Cc]ascade/,/[Gg]rotte/])assert.match(zones,place);
});

test('it is chapter 7 of the bible: the old medical centre, the parents’ file, TRANSCENDANCE, GAB-1’s pain and her line',()=>{
  assert.match(bible,/### Chapitre 7 — Mémoires locales/);
  const quote='Je ne sais pas… Mais je crois que je suis déjà venue ici.';assert.ok(bible.includes(quote));
  assert.ok(M07.linesFor('protection','ghju').some(l=>l.who==='gaby'&&l.text===quote),'GAB-1 says the line of the bible');
  assert.match(M07.logFor('dossier').lines.join(' '),/transfert de structures cognitives humaines vers des supports artificiels/);
  assert.match(all('ghju'),/TRANSCENDANCE/);assert.match(M07.logFor('dossier').lines[0],/noms des parents/);
  assert.match(M07.linesFor('protection','ghju').map(l=>l.text).join(' '),/MODE PROTECTION[\s\S]*mal/);
  assert.match(M07.ENDING.next,/08 — Les Ordres de JANUS/);assert.match(bible,/### Chapitre 8 — Les ordres de JANUS/);
});

test('the heroes stay apart (they meet in chapter 9), GHJU arrives first, each hero speaks only with its own sphere',()=>{
  for(const id of Object.keys(M07.SCRIPT)){
    const g=M07.linesFor(id,'ghju'),l=M07.linesFor(id,'lylu');assert.ok(g.length&&l.length,id);
    assert.ok(!g.some(x=>['lylu','cara'].includes(x.who)),`${id} GHJU`);assert.ok(!l.some(x=>['ghju','gaby'].includes(x.who)),`${id} LYLU`);
    assert.ok([...g,...l].every(x=>x.speaker?.name),`${id} speakers`);
  }
  assert.match(M07.linesFor('lisiere','lylu').map(l=>l.text).join(' '),/hier\. Des marques roses/,'LYLU arrives one day after GHJU');
  assert.match(bible,/GHJU s’y rend la première/);
});

test('the secret of the spheres holds until chapter 15; the parents stay a mystery; HELIX does not know yet',()=>{
  for(const c of ['ghju','lylu']){
    const text=all(c);
    assert.doesNotMatch(text,/Gabrielle|Carla|sphéri|empreinte neuronale|tes sœurs|leurs sœurs/,'no name nor sphere link');
    assert.doesNotMatch(text,/(parents|papa|maman)[^.]{0,40}(sont morts|est mort|sont vivants|retrouvés)/,'the parents’ fate is not solved');
    assert.doesNotMatch(text,/Kessler[^.]{0,80}(sphère|GAB-1|CAR-14)/,'Kessler learns about the spheres in chapter 10');
    assert.doesNotMatch(text,/CONVERGENCE|Résonance/,'named later');
  }
  assert.doesNotMatch(M07.logFor('dossier').lines.join(' ')+M07.logFor('dossier').footer,/sur (les|deux) enfants|pédiatrique/,'the file does not say on whom');
});

test('continuity with chapters 01, 04 and 05, the bible’s enemies and the companion skills of mission 7',()=>{
  const m01=read('m01-extension-story.js');assert.match(m01,/VEILLE-4/);assert.match(m01,/Tilleuls/);assert.match(m01,/05 H 58/,'the message of chapter 01');
  assert.match(M07.logFor('relais-grotte').lines.join(' '),/05 h 51/,'six minutes before the chapter 01 recording');
  assert.match(M07.logFor('journal').footer,/03 h 40/);assert.match(m01,/03 h 40 — Coupure[\s\S]*Tilleuls ne répond plus/);
  assert.match(read('m04-story.js'),/PROCÉDURE DE RÉCUPÉRATION PRIORITAIRE/);assert.match(M07.linesFor('recuperation','ghju')[0].text,/PROCÉDURE DE RÉCUPÉRATION/);
  assert.match(read('ligne9-story.js'),/Pour Tomas/,'Tomas of the Ligne 9 market note');
  assert.match(read('companion-menu.js'),/Compétences avancées à la mission 7/);assert.ok(M07.SCRIPT.liaison,'the advanced skills open here');
  assert.match(bible,/une unité expérimentale N-08 coordonne les autres machines et adapte leurs tactiques/);assert.match(all('ghju'),/SY-05/);
  for(const date of ['17 novembre 2189','17/11/2189'])assert.ok(all('ghju').includes(date),date);
});
