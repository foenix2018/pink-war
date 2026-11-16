// Aerin V11 — contrat statique : modules chargés partout, logique identique dans les deux moteurs.
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..'),rd=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=rd('dist/index.html'),gl=rd('dist/game/aerin-game-webgl.js'),gpu=rd('dist/game/aerin-game-webgpu.js'),motion=rd('dist/game/aerin-motion-v11.js'),knight=rd('dist/game/aerin-knight-v11.js');
assert.match(html,/aerin-motion-v11\.js/);assert.match(html,/aerin-knight-v11\.js/);assert.match(html,/(aerin-v11|hud-v13)\.css/);assert.match(html,/id="lock-button"/);
for(const src of [gl,gpu]){
 for(const fn of ['function strafeMove(','function updateStrafeWeights(','function toggleLock(','function impact(','function updateCharge(','function postPose(','function finishPlayer('])assert.ok(src.includes(fn),fn);
 assert.match(src,/AerinMotionV11\.build\(T,actor/);assert.match(src,/AerinKnightV11\.dress\(T,actor/);
 assert.match(src,/state\.hitStop>0\?dt\*\.07:dt/);assert.match(src,/a\.clip=a\.legacy/); // repli sur les clips GLB si le module manque
}
// Même logique de jeu : seules les lignes de rendu diffèrent (comparaison des fonctions V11).
const pick=(s,name)=>{const i=s.indexOf('function '+name+'(');return s.slice(i,s.indexOf('\nfunction ',i+10));};
for(const n of ['strafeMove','updateStrafeWeights','toggleLock','impact','updateCharge','postPose','beginAction','updatePlayer'])assert.equal(pick(gl,n),pick(gpu,n),n);
for(const c of ['K_Guard','K_StrafeL','K_StrafeR','K_GuardFwd','K_GuardBack','K_Slash1','K_Slash2','K_Slash3','K_Slash4','K_Spin','K_Charge','K_JumpSlash','K_HopL','K_HopR','K_Backflip','K_ShieldBash','K_Run','K_Stagger'])assert.ok(motion.includes("def('"+c+"'"),c);
assert.match(knight,/updateWorldMatrix\(true,false\);actor\.updateMatrixWorld\(true\)/); // mesures après placement du joueur
const portable=fs.readFileSync(path.resolve(root,'../index.html'),'utf8');
for(const k of ['data-inline="aerin-motion-v11"','data-inline="aerin-knight-v11"','id="lock-button"','AERIN_EMBEDDED_GLB','function postPose('])assert.ok(portable.includes(k),'autonome : '+k);
console.log('OK AERIN V11 : modules, deux moteurs identiques, 18 mouvements, HTML autonome');
