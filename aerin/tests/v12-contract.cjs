// Aerin V12 — contrat statique : style, bibliothèque d'aventure, deux moteurs identiques, HTML autonome.
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..'),rd=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=rd('dist/index.html'),gl=rd('dist/game/aerin-game-webgl.js'),gpu=rd('dist/game/aerin-game-webgpu.js'),adv=rd('dist/game/aerin-motion-adventure-v12.js'),style=rd('dist/game/aerin-style-v12.js'),gal=rd('dist/atelier-v12.html');
const order=['aerin-style-v12.js','aerin-body-v13.js','aerin-motion-v11.js','aerin-motion-adventure-v12.js','aerin-knight-v11.js'].map(f=>html.indexOf(f));
assert.ok(order.every(i=>i>0)&&order.join()===[...order].sort((a,b)=>a-b).join(),'ordre des modules');
for(const id of ['crouch-button','act-button','lock-button','hp-fill'])assert.ok(html.includes('id="'+id+'"'),id);
for(const src of [gl,gpu]){for(const k of ['AerinStyleV12.stripTracks','AerinStyleV12.proportions','AerinStyleV12.celShade','function interact(','function toggleCrouch(','K_Death','K_Victory',"function interact("])assert.ok(src.includes(k),k);}
const pick=(s,n)=>{const i=s.indexOf('function '+n+'(');return s.slice(i,s.indexOf('\nfunction ',i+10));};
for(const n of ['interact','toggleCrouch','beginAction','updatePlayer','postPose'])assert.equal(pick(gl,n),pick(gpu,n),n);
const names=[...adv.matchAll(/def\('(K_\w+)'/g)].map(m=>m[1]);
for(const c of ['K_Crouch','K_Sneak','K_LedgeHang','K_ClimbUp','K_ClimbWall','K_Ladder','K_SwimTread','K_Swim','K_PickUp','K_CarryWalk','K_Throw','K_Push','K_Pull','K_OpenChest','K_ItemGet','K_OpenDoor','K_Lever','K_Talk','K_Wave','K_Sit','K_Death','K_GetUp','K_Victory'])assert.ok(names.includes(c),c);
assert.ok(names.length>=33,'aventure : '+names.length);
assert.match(style,/skinning=true/);assert.match(style,/BackSide/);assert.match(gal,/aerinGallery/);
const portable=fs.readFileSync(path.resolve(root,'../index.html'),'utf8');
for(const k of ['data-inline="aerin-style-v12"','data-inline="aerin-body-v13"','data-inline="aerin-motion-adventure-v12"','id="crouch-button"','function interact(','atelier-v12.html'])assert.ok(portable.includes(k),'autonome : '+k);
console.log('OK AERIN V12 :',names.length,'mouvements d’aventure, style, deux moteurs identiques, HTML autonome');
