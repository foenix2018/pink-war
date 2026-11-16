// Aerin V14 — contrat statique : disposition tactile Pink Wars (mêmes cotes que mobile-controls-v7.css).
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..'),css=fs.readFileSync(path.join(root,'dist/game/hud-v13.css'),'utf8');
const rule=sel=>{const i=css.indexOf(sel+"{");assert.ok(i>0,sel);return css.slice(i,css.indexOf('}',i));};
const T='body.touch-layout #game-hud.h13 ';
assert.match(rule(T+'.block'),/left:50%.*bottom:max\(21px/);assert.match(rule(T+'.jump'),/left:50%.*bottom:max\(91px/);
assert.match(rule(T+'.roll'),/calc\(50% - 88px\).*bottom:max\(25px/);assert.match(rule(T+'.crouch'),/calc\(50% - 86px\).*bottom:max\(92px/);
assert.match(rule(T+'#attack-button'),/right:max\(12px.*bottom:max\(22px.*width:78px/);
assert.match(rule(T+'.lock'),/bottom:max\(111px/);assert.match(rule(T+'.dodge'),/right:max\(90px/);assert.match(rule(T+'.gear'),/right:max\(92px.*bottom:max\(111px/);
assert.match(css,/Pink Wars/);
const portable=fs.readFileSync(path.resolve(root,'../index.html'),'utf8');assert.ok(portable.includes("body.touch-layout #game-hud.h13 .block{left:50%"),'autonome');
console.log('OK AERIN V14 : disposition tactile Pink Wars (cotes identiques), HTML autonome');
