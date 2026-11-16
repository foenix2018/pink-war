const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'dist/game/aerin-game-webgl.js'), 'utf8');
const gpu = fs.readFileSync(path.join(root, 'dist/game/aerin-game-webgpu.js'), 'utf8');
for (const code of [src, gpu]) {
  assert(code.includes('function prepareUpperAttacks()'), 'upper-body attack layer missing');
  assert(code.includes('function animateLocomotion(dt)'), 'analog locomotion missing');
  assert(code.includes("if(state.action==='attack'){\n   animateLocomotion(dt)"), 'locomotion during attacks missing');
  assert(code.includes('function startJumpStrike()'), 'jump strike missing');
  assert(code.includes("if(state.action==='roll'){state.rollStrikeQueued=true"), 'roll recovery attack missing');
  assert(code.includes('Math.sin(Math.PI*Math.min(1,progress))'), 'roll easing missing');
  assert(/const rollSpeed=(5|Math\.max\(5,)/.test(code), 'roll movement missing'); // V13 : la roulade garde l’élan
  assert(code.includes('applyOffensiveGuard(dt)'), 'automatic defensive posture missing');
  assert(code.includes("else if(kind==='stow')") && code.includes("else if(kind==='draw')"), 'stow/draw missing');
}
const glb = fs.readFileSync(path.join(root, 'dist/assets/aerin.glb'));
assert.equal(glb.toString('ascii', 0, 4), 'glTF');
const jsonLen = glb.readUInt32LE(12), meta = JSON.parse(glb.toString('utf8', 20, 20 + jsonLen));
assert.equal(meta.animations.length, 18);
const roll = meta.animations.find(a => a.name === 'Roll_Forward');
assert(roll, 'Roll_Forward missing');
const ch = roll.channels.find(c => c.target.path === 'rotation' && meta.nodes[c.target.node].name === 'mixamorig:Hips');
assert(ch, 'hip roll rotation missing');
const acc = meta.accessors[roll.samplers[ch.sampler].output], v = meta.bufferViews[acc.bufferView];
const offset = 20 + jsonLen + 8 + (v.byteOffset || 0) + (acc.byteOffset || 0);
const x1 = glb.readFloatLE(offset + 10*4*4);
assert(x1 > -0.65, 'roll appears to use the previously reversed rotation');
console.log('OK AERIN V10: roll direction, 18 clips, attack while moving, airborne attacks, roll recovery, guard and gear');
