import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PROLOGUE,prologueSlides} from '../dist/story-prologue.js';
import {BRIEFINGS,briefingFor} from '../dist/mission-briefing.js';
import * as M01 from '../dist/m01-extension-story.js';
import * as M02 from '../dist/m02-extension-story.js';
import * as M03 from '../dist/m03-story.js';
import * as M04 from '../dist/m04-story.js';
import * as M05 from '../dist/ligne9-story.js';

const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');
const bible=readFileSync(new URL('../docs/pink-wars/BIBLE_NARRATIVE_V2_HERITIERS_DU_SILENCE.md',import.meta.url),'utf8');
const dump=story=>JSON.stringify(story.SCRIPT)+JSON.stringify(Object.keys(story.LOGS).flatMap(k=>{const l=story.LOGS[k];return typeof l==='function'?[l('ghju'),l('lylu')]:[l];}))+JSON.stringify(story.ENDING||{});
const stories=[M01,M02,M03,M04,M05];

test('the bible « Les Héritiers du Silence » is the reference in the repository and the old one is marked replaced',()=>{
  for(const part of ['PINK WARS — LES HÉRITIERS DU SILENCE','17 novembre 2189','03 h 17','06 h 42','CONVERGENCE','Chapitre 20 — La dernière veille','LES DEUX PIXELS'])assert.ok(bible.includes(part),part);
  assert.match(readFileSync(new URL('../docs/pink-wars/BIBLE_NARRATIVE_V1.md',import.meta.url),'utf8'),/^> \*\*REMPLACÉE/);
});

test('the companions are GAB-1 (pink, GHJU) and CAR-14 (blue, LYLU) wherever the player reads a name',()=>{
  for(const story of stories){assert.equal(story.SPEAKERS.gaby.name,'GAB-1');assert.equal(story.SPEAKERS.cara.name,'CAR-14');}
  for(const page of ['galerie.html','compagnons.html','niveau3.html','niveau4.html','ligne9.html'])assert.doesNotMatch(read(page),/\bGABY\b|\bCARA\b/,page);
  assert.match(read('companion-menu.js'),/LABEL=\{Gaby:'GAB-1',Cara:'CAR-14'\}/);
});

test('the Chute is the update of 17 November 2189 at 03 h 17 and the message of 06 h 42, the same night in every chapter',()=>{
  assert.match(PROLOGUE[2].date,/17 NOVEMBRE 2189 · 03 H 17/);
  assert.match(PROLOGUE[3].radio,/La continuité de l’humanité exige la suspension temporaire de son autorité décisionnelle/);
  const all=stories.map(dump).join(' ');
  assert.doesNotMatch(all,/14\/03\/2189|14 mars 2189|\b22 h 47\b/,'no trace of the old date');
  assert.match(M01.logFor('main-courante').lines.join(' '),/03 h 17[\s\S]*06 h 42/);
});

test('ORDRE is the artificial intelligence; the Directoire is its human police; AEGIS, the Épars and HELIX keep their places',()=>{
  assert.equal(M02.SPEAKERS.helix.name,'DIRECTOIRE · DIFFUSION');assert.equal(M02.SPEAKERS.agent.name,'AGENT DU DIRECTOIRE');
  assert.equal(M03.SPEAKERS.voss.name,'MARA VOSS · AEGIS');assert.match(M05.SPEAKERS.nira.name,/NIRA SOLEN · ÉPARS/);
  assert.match(M02.logFor('kessler').title,/HELIX — A\. KESSLER/);
  assert.doesNotMatch(dump(M02)+dump(M03),/HELIX Security|HELIX SECURITY/);
});

test('Acte I and II follow the bible chapter by chapter',()=>{
  // 1 — the parents' call sign and the recorded message; the sphere stays silent.
  const c1=M01.linesFor('copieOk','ghju');assert.equal(c1[0].text,'Si vous recevez ceci, ne faites confiance à aucun système connecté au réseau principal. Retrouvez les relais indépendants. Et surtout… ne perdez pas les deux unités.');
  assert.ok(c1.some(l=>l.who==='gaby'&&l.text==='…'));assert.match(M01.linesFor('intro','ghju').map(l=>l.text).join(' '),/VEILLE-4[\s\S]*parents/);
  // 2 — the Directoire, the decryption module, ORDRE's wanted notice for two autonomous systems.
  assert.match(M02.logFor('manifeste','lylu').lines.join(' '),/deux systèmes autonomes[\s\S]*GAB-1[\s\S]*CAR-14/);
  assert.match(M02.linesFor('coffre','lylu').map(l=>l.text).join(' '),/modules de décryptage/);
  // 3 — AEGIS frees the prisoners; a glimpse of the other colour on the falling interchange.
  assert.match(M03.ENDING.title,/Le Convoi des Oubliés/);assert.match(M03.linesFor('treuilOk','lylu').map(l=>l.text).join(' '),/Shadow Unit[\s\S]*roses/);
  // 4 — Mara Voss, the PINK protocol, « Signature incompatible ».
  assert.match(M04.ENDING.title,/Le Protocole Interdit/);
  assert.match(M04.logFor('journal-reacteur','ghju').lines.join(' '),/aucune intelligence artificielle ne puisse supprimer entièrement l’autorité humaine/);
  assert.ok(M04.linesFor('journal','ghju').some(l=>l.text==='SIGNATURE INCOMPATIBLE · ARCHITECTURE NON AUTORISÉE · PROCÉDURE DE RÉCUPÉRATION PRIORITAIRE'));
  // 5 — military components made months before the Chute, from civilian industry.
  assert.match(M05.ENDING.text.lylu,/des mois avant la Chute[\s\S]*usines des humains/);assert.match(M05.ENDING.next,/Le Cœur d’Acier/);
  for(const [n,title] of [[1,'Le Dernier Signal'],[2,'Les Profondeurs'],[3,'Le Convoi des Oubliés'],[4,'Le Protocole Interdit'],[5,'La Ligne Noyée']])assert.equal(BRIEFINGS[n].title,title);
});

test('the identity of the spheres stays secret until chapter 15, in the levels and the public texts',()=>{
  const levels=stories.map(dump).join(' ');
  const public_=[read('index.html'),read('galerie.html'),read('compagnons.html'),JSON.stringify(PROLOGUE),JSON.stringify([1,2,3,4,5].map(n=>briefingFor(n,'ghju')))].join(' ');
  for(const text of [levels,public_]){
    assert.doesNotMatch(text,/Gabrielle.{0,80}(GAB-1|sphère|module)|(GAB-1|CAR-14).{0,80}(Gabrielle|Carla)|empreinte neuronale|sont (leurs|tes|ses) sœurs/,'no link between the sisters and the spheres');
    assert.doesNotMatch(text,/est mort|est morte/);
  }
  assert.match(prologueSlides('ghju')[1].text,/Gabrielle et Carla/,'the sisters exist from the prologue');
});

test('the menu tells the twenty chapters in five acts; only the built ones are playable',()=>{
  const html=read('index.html'),section=html.slice(html.indexOf('<section id="story-chapters"'),html.indexOf('</section>',html.indexOf('<section id="story-chapters"')));
  for(const act of ['ACTE I — LES CENDRES DE VESPER','ACTE II — LES ORIGINES DU SOULÈVEMENT','ACTE III — LA GUERRE DES SURVIVANTS','ACTE IV — LES ENFANTS DE LA TRANSCENDANCE','ACTE V — LE DERNIER ORDRE'])assert.ok(section.includes(act),act);
  for(let n=1;n<=20;n++)assert.match(section,new RegExp('>'+String(n).padStart(2,'0')+' — '),`chapter ${n}`);
  assert.equal((section.match(/data-chapter="(campaign|campaign2|campaign3|campaign4|ligne9)"/g)||[]).length,5);
  assert.equal((section.match(/disabled aria-disabled="true"/g)||[]).length,15);
  assert.match(html,/<title>PINK WARS — LES HÉRITIERS DU SILENCE<\/title>/);assert.doesNotMatch(html,/LA FRACTURE|tenues de pompier/);
});
