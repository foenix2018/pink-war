// Aerin V15 — contrat statique : cheveux mi-longs animés, chargés partout, même logique dans les deux moteurs.
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..'),rd=f=>fs.readFileSync(path.join(root,f),'utf8');
const hair=rd('dist/game/aerin-hair-v15.js'),html=rd('dist/index.html'),gl=rd('dist/game/aerin-game-webgl.js'),gpu=rd('dist/game/aerin-game-webgpu.js');
assert.ok(html.indexOf('aerin-body-v13.js')<html.indexOf('aerin-hair-v15.js')&&html.indexOf('aerin-hair-v15.js')<html.indexOf('aerin-motion-v11.js'),'ordre de chargement');
for(const k of ['function step(','function collide(','Pow','LOCKS','restWorld'])assert.ok(hair.includes(k.replace('Pow','Math.pow')),k);
for(const src of [gl,gpu])for(const k of ['AerinHairV15.build','hairV15.update(dt)','hairV15?.reset()',"version:'V15'"])assert.ok(src.includes(k),k);
const portable=fs.readFileSync(path.resolve(root,'../index.html'),'utf8');assert.ok(portable.includes('data-inline="aerin-hair-v15"'),'autonome');
assert.match(rd('dist/atelier-v12.html'),/AerinHairV15/);
console.log('OK AERIN V15 : cheveux mi-longs animés, deux moteurs, galerie, HTML autonome');
