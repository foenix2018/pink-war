import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../dist/'+p,import.meta.url),'utf8');

test('Le menu du niveau 1 dirige vers la V7 et le mode original reste accessible',()=>{
  const src=read('entry.js');
  assert.match(src,/mode==='campaign'\s*&&\s*intent==='play'/);
  assert.match(src,/vesper-level1-v7\.html/);
  assert.match(src,/URLSearchParams\(location\.search\)\.has\('classic'\)/);
  assert.match(src,/if\(mode==='campaign2'\)/);
});
test('La moitié droite tactile est réservée à la caméra sur le moteur Pink Wars',()=>{
  const src=read('game.js');
  assert.match(src,/e\.pointerType!=='mouse'\s*&&\s*e\.clientX\s*<\s*window\.innerWidth\*\.5/);
  assert.match(src,/canvas\.addEventListener\('pointermove'/);
});
test('La disposition tactique commune place viser au centre, sauter au-dessus, tirer à droite',()=>{
  const html=read('index.html'),css=read('mobile-controls-v7.css');
  assert.match(html,/mobile-controls-v7\.css/);
  assert.match(css,/#look-stick\s*\{\s*display:\s*none/);
  assert.match(css,/#aim-button/);assert.match(css,/#jump-button/);assert.match(css,/#fire-button/);
  assert.match(css,/left:\s*50%/);assert.match(css,/right:\s*max\(12px/);
});
test('Le décor V7 embarqué comporte des boutons tactiles et le retour au menu',()=>{
  const v7=read('vesper-level1-v7.html');
  assert.match(v7,/btnAimMobile/);
  assert.match(v7,/btnFireMobile/);
  assert.match(v7,/innerWidth\*\.5/);
  assert.match(v7,/Retour au menu Pink Wars/);
  assert.match(v7,/WebGPU/);
});
