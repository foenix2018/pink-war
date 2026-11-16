// Aerin V13 — contrat statique : corps, rangement, vrai saut, HUD à icônes, deux moteurs identiques.
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..'),rd=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=rd('dist/index.html'),gl=rd('dist/game/aerin-game-webgl.js'),gpu=rd('dist/game/aerin-game-webgpu.js'),body=rd('dist/game/aerin-body-v13.js'),kn=rd('dist/game/aerin-knight-v11.js'),adv=rd('dist/game/aerin-motion-adventure-v12.js'),css=rd('dist/game/hud-v13.css');
assert.match(body,/KEEP_HEAD/);assert.match(body,/new T\.Skeleton\(list\)/);assert.match(body,/Aerin_Corps_Calotte/);
assert.match(kn,/function makeStowed\(/);assert.match(kn,/Aerin_Knight_Fourreau/);assert.match(kn,/Aerin_Knight_Ecu_Dos/);
for(const c of ['K_Sheathe','K_Unsheathe','K_JumpStart','K_JumpAir','K_RunJump','K_Land'])assert.ok(adv.includes("def('"+c+"'"),c);
for(const src of [gl,gpu]){for(const k of ['function startRealJump(','function updateAir(','AerinBodyV13.build','knight.makeStowed','rollEntrySpeed',"function updateAir(",'#hp-fill'])assert.ok(src.includes(k),k);}
const pick=(s,n)=>{const i=s.indexOf('function '+n+'(');return s.slice(i,s.indexOf('\nfunction ',i+10));};
for(const n of ['startRealJump','updateAir','beginAction','updatePlayer','animateLocomotion'])assert.equal(pick(gl,n),pick(gpu,n),n);
const icons=[...html.matchAll(/<symbol id="gi-[a-z]+"/g)].length;assert.ok(icons>=17,'icônes '+icons);
assert.match(html,/game-icons\.net/);assert.doesNotMatch(html,/pink-hud\.css|aerin-v11\.css/);
for(const id of ['attack-button','block-button','jump-button','roll-button','dodge-button','lock-button','gear-button','crouch-button','act-button','move-stick','look-stick','sprint-button','hit-count','block-count','action-state','toast','renderer-status','view-label'])assert.ok(html.includes('id="'+id+'"'),id);
assert.match(css,/\.h13-actions/);
const portable=fs.readFileSync(path.resolve(root,'../index.html'),'utf8');
for(const k of ['data-inline="aerin-body-v13"','hud-v13.css','function startRealJump(','AERIN_EMBEDDED_GLB','AERIN_DIRECT_LAUNCH'])assert.ok(portable.includes(k),'autonome : '+k);
assert.doesNotMatch(portable,/<script src=|<link rel="stylesheet"/,'autonome sans ressource externe');
console.log('OK AERIN V13 : corps, rangement, vrai saut, HUD',icons,'icônes, deux moteurs identiques, HTML autonome');
