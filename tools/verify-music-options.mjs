import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.PINK_WARS_BASE_URL||'http://127.0.0.1:4176';
const out=process.env.AUDIT_OUTPUT||'/tmp/pink-wars-music-options';mkdirSync(out,{recursive:true});
const fixture=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fracture.css"><style>body{background:#142230;color:white;font:16px system-ui}button{padding:18px;margin:12px}</style><button id="start">Jouer</button><button id="shot">Tirer</button><script type="module">
import {createPauseMenu} from '/fracture-menu.js';import {setScreenMusic,screenMusicSnapshot} from '/menu-music.js';
window.qa={snapshot:screenMusicSnapshot,menu:createPauseMenu({onPause:()=>setScreenMusic('paused'),onResume:()=>setScreenMusic('gameplay',2)})};
document.querySelector('#start').onclick=()=>setScreenMusic('gameplay',2);
</script>`;
const forest=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/m07-hud.css"><body class="m07-playing"><script type="module">import {createM07Hud} from '/m07-hud.js';createM07Hud();</script>`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const results=[];
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:960,height:650},isMobile:mobile,hasTouch:mobile});
  await context.addInitScript(()=>{if(!localStorage.getItem('rosee-settings'))localStorage.setItem('rosee-settings',JSON.stringify({sound:true,quality:'low',sensitivity:1.4}));});
  await context.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
  await context.route('https://fonts.gstatic.com/**',r=>r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/qa-music',r=>r.fulfill({contentType:'text/html',body:fixture}));
  await page.route('**/qa-music-7',r=>r.fulfill({contentType:'text/html',body:forest}));
  const press=locator=>mobile?locator.tap():locator.click();
  await page.goto(base+'/qa-music');await page.waitForFunction(()=>window.qa);
  await press(page.locator('#start'));await page.waitForFunction(()=>qa.snapshot().playing);
  assert.match(await page.evaluate(()=>qa.snapshot().source),/locked-corridor/);
  const pause=()=>press(page.locator('[data-session="pause"]'));
  const options=()=>press(page.locator('[data-pause-action="settings"]'));
  const resume=async()=>{await press(page.locator('.fracture-settings-back'));await press(page.locator('[data-pause-action="resume"]'));};
  await pause();await options();const checkbox=page.getByRole('checkbox',{name:'Musique du jeu'});
  assert.equal(await checkbox.isChecked(),true);await press(checkbox);assert.equal(await checkbox.isChecked(),false);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('rosee-settings'))),{sound:true,quality:'low',sensitivity:1.4,music:false});
  await page.screenshot({path:out+'/'+(mobile?'iphone':'desktop')+'-options.png'});
  await resume();assert.equal(await page.evaluate(()=>qa.snapshot().playing),false);await press(page.locator('#shot'));assert.equal(await page.evaluate(()=>qa.snapshot().playing),false);
  await pause();await options();await press(checkbox);assert.equal(await page.evaluate(()=>qa.snapshot().playing),false,'pause remains silent after enabling music');
  await resume();await page.waitForFunction(()=>qa.snapshot().playing);
  await pause();await options();await press(checkbox);await page.reload();await page.waitForFunction(()=>window.qa);
  assert.equal(await page.evaluate(()=>qa.snapshot().enabled),false);await press(page.locator('#start'));assert.equal(await page.evaluate(()=>qa.snapshot().playing),false);
  await page.goto(base+'/qa-music-7');await press(page.locator('.m07-pause'));const forestCheckbox=page.getByRole('checkbox',{name:'Musique du jeu'});assert.equal(await forestCheckbox.isChecked(),false);await press(forestCheckbox);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('rosee-settings')).music),true);
  await page.goto(base+'/');await press(page.locator('#pw-glass-settings'));const lobby=page.locator('#music-setting');assert.equal(await lobby.isChecked(),true);await press(lobby);
  assert.equal(await page.evaluate(async()=>{const m=await import('/menu-music.js');return m.screenMusicSnapshot().playing;}),false);
  await page.reload();await press(page.locator('#pw-glass-settings'));assert.equal(await lobby.isChecked(),false);
  assert.deepEqual(errors,[]);results.push({mobile,gameplayToggle:true,pauseSilent:true,persisted:true,forest:true,lobby:true,errors});await context.close();
 }
 writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
