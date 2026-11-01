import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {commsIdentity} from '../dist/hologram-comms.js';
const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
test('speaker identities map to the right companion or hero',()=>{
 assert.equal(commsIdentity({who:'gaby'}),'gab');
 assert.equal(commsIdentity({who:'cara'}),'car');
 assert.equal(commsIdentity({who:'ghju'}),'ghju');
 assert.equal(commsIdentity({who:'lylu'}),'lylu');
 assert.equal(commsIdentity({who:'radio'}),'radio');
});
test('holographic window offers original story text, bounded history and safe text nodes',()=>{
 const s=read('hologram-comms.js'),css=read('hologram-comms.css');
 assert.match(s,/words\.textContent=String\(line\.text\|\|''\)/);
 assert.match(s,/if\(history\.length>Math\.max\(2,maxMessages\)\)history\.shift\(\)/);
 assert.match(s,/toggle\.onclick=/);
 assert.match(s,/paintCompanionPortrait/);
 assert.match(css,/Bruno Ace SC/);
 assert.match(css,/repeating-linear-gradient\(180deg/);
 assert.match(css,/\.pw-comms-entry\[data-person='car'\]/);
});
test('campaign missions 02 through 05 use the same exchange overlay and retain VR panels',()=>{
 for(const f of ['story-subtitles.js','niveau3.js','niveau4.js','ligne9.js']){
  const s=read(f);assert.match(s,/import \{createHologramComms\} from '\.\/hologram-comms\.js'/);
  assert.match(s,/comms\.push\(line\)/);
  assert.match(s,/comms\.update\(dt,/);
  assert.match(s,/subtitlePlane|plane\.visible/);
 }
});
test('global lettering has a non-stencil fallback for long-form French and preserves LED counters',()=>{
 const css=read('pink-type.css');
 assert.match(css,/--pw-title-font/);assert.match(css,/--pw-copy-font/);
 assert.doesNotMatch(css,/\.pw-led-digit/);
 for(const f of ['fracture.css','story-prologue.css','mission-briefing.css'])assert.match(read(f),/@import url\('\.\/pink-type\.css\?v=1'\);/);
});
test('standalone dialogue trial features GHJU/GAB-1 and LYLU/CAR-14',()=>{
 const html=read('dialogue-essai.html');assert.match(html,/TROIS SIGNATURES EN APPROCHE/);
 assert.match(html,/CAR-14/);assert.match(html,/REJOUER/);
});
