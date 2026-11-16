const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const code=f=>fs.readFileSync(path.join(root,'dist/game',f),'utf8');
for(const f of ['aerin-game-webgl.js','aerin-game-webgpu.js','aerin-game.js']){
 const src=code(f);
 assert.match(src,/function nearestThreat\(\)/);
 assert.match(src,/function applyOffensiveGuard\(dt\)/);
 assert.match(src,/mixer\.update\(s?dt\);applyOffensiveGuard\(s?dt\);/); // V11 : pas de temps du gel d’impact
 assert.match(src,/!state\.action/);
 assert.match(src,/!state\.paused/);
 assert.match(src,/guardBones\[name\]/);
}
const portable=fs.readFileSync(path.resolve(root,'../index.html'),'utf8');
assert.match(portable,/AERIN_EMBEDDED_GLB/);
assert.match(portable,/function applyOffensiveGuard\(dt\)/);
assert.match(portable,/new T\.GLTFLoader\(\)\.load\(window\.AERIN_EMBEDDED_GLB/);
console.log('OK AERIN V09: garde automatique avec cible proche, fondu, version WebGPU et autonome');
