import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=n=>readFileSync(new URL('../dist/'+n,import.meta.url),'utf8');
test('real fire button is docked outside transformed legacy wrappers without losing firing listeners',()=>{
 const js=source('combat-hud.js'),css=source('combat-hud.css'),game=source('game.js');
 assert.match(js,/function dockEngineFire\(\)/);
 assert.match(js,/root\.append\(button\)/);
 assert.match(js,/dockEngineFire\(\);currentGame=game/);
 assert.match(js,/engineFireHome\.insertBefore\(engineFire/);
 assert.match(css,/\.pw-hud-engine-fire\{/);
 assert.match(css,/left:auto!important;right:var\(--pw-right\)!important;/);
 assert.match(game,/\$\('fire-button'\)\.addEventListener\('pointerdown'/);
});
test('one contextual action button mirrors the companion, retaining existing interact command',()=>{
 const js=source('combat-hud.js'),css=source('combat-hud.css'),game=source('game.js');
 assert.match(js,/data-hud-action="interact" hidden/);
 assert.match(js,/context\.hidden=!label/);
 assert.match(js,/context\.setAttribute\('aria-label',label\|\|'Interagir'\)/);
 assert.match(css,/\.pw-hud \.pw-hud-context span,body\.pw-immersion-hud \.pw-hud \.pw-hud-context kbd\{display:none!important\}/);
 assert.match(css,/\.pw-hud \.pw-hud-companion\{top:35%/);
 assert.match(game,/combatHud\.setContext\(interaction\?\.label/);
 assert.match(game,/game\.collectWeapon\(\)/);
});
test('shooting range target activation is kept, with text hidden only in UI',()=>{
 const range=source('shooting-range.js'),css=source('combat-hud.css');
 assert.match(range,/Déclencher les cibles/);
 assert.match(range,/this\.trainingActive=!this\.trainingActive/);
 assert.match(css,/\.pw-hud \.pw-hud-context span/);
});
