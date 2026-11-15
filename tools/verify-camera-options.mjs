const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.PINK_WARS_BASE_URL||'http://127.0.0.1:4173',out=process.env.AUDIT_OUTPUT||'/tmp/pink-wars-camera-options';mkdirSync(out,{recursive:true});
const source=readFileSync(new URL('../dist/niveau3.js',import.meta.url),'utf8'),start=source.indexOf('function changeView('),setter=source.slice(start,source.indexOf('\nfunction ',start+1));
const wiring=source.match(/\n view:(\{getView:[^\n]+\}),\n/)[1];
const html=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fracture.css"><style>body{margin:0;background:#10212b;color:white}h1{padding:25px;font:24px system-ui}</style><h1>PINK WARS</h1><script type="module">
import {createPauseMenu} from '/fracture-menu.js';import {mountCombatHud} from '/combat-hud.js';import {normalizeView,savePreferredView} from '/view-options.js';
let view='third',playerRig={},xr={active:false},paused=false,renderView=view;const actions=[];
function notice(){}function snapCamera(){renderView=view;}${setter}
const menu=createPauseMenu({view:${wiring},onPause(){paused=true;},onResume(){paused=false;}});
const hud=mountCombatHud({onAction:kind=>actions.push(kind)});hud.setContext('Ouvrir le portail');
window.qa={menu,hud,actions,state:()=>({view,renderView,paused,preference:localStorage.getItem('pink-war-view')}),missingRig(){view='third';playerRig=null;},ready(){playerRig={};},vr(value){xr.active=value;}};
</script>`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const results=[];
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:960,height:650},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(String(e));console.error(String(e));});
  await page.route('**/qa-options',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto(base+'/qa-options');await page.waitForFunction(()=>window.qa);
  const press=locator=>mobile?locator.tap():locator.click();
  await page.evaluate(()=>qa.menu.show());await press(page.locator('[data-pause-action="settings"]'));
  const control=page.locator('[data-view-control] button');await press(control);assert.equal((await page.evaluate(()=>qa.state())).view,'fps');
  await press(control);assert.equal((await page.evaluate(()=>qa.state())).view,'third');
  await page.screenshot({path:out+'/'+(mobile?'iphone':'desktop')+'-options.png'});
  await press(control);await press(page.locator('.fracture-settings-back'));await press(page.locator('[data-pause-action="resume"]'));
  assert.deepEqual(await page.evaluate(()=>qa.state()),{view:'fps',renderView:'fps',paused:false,preference:'fps'});
  await page.evaluate(()=>{qa.missingRig();qa.menu.show();});await press(page.locator('[data-pause-action="settings"]'));assert.equal(await control.isDisabled(),false);
  await press(control);assert.equal((await page.evaluate(()=>qa.state())).view,'fps');assert.equal(await control.isDisabled(),true);
  await page.evaluate(()=>qa.ready());await page.waitForFunction(()=>!document.querySelector('[data-view-control] button').disabled);
  await page.evaluate(()=>qa.vr(true));await page.waitForFunction(()=>document.querySelector('[data-view-control] button').disabled);
  await page.evaluate(()=>{qa.vr(false);qa.menu.hide();});
  const action=page.locator('.pw-hud-context'),icon=await action.locator('svg').innerHTML();
  for(const label of ['Ouvrir le portail','Réarmer le circuit','Prendre la recharge']){
   await page.evaluate(label=>qa.hud.setContext(label),label);assert.equal(await action.getAttribute('aria-label'),label);assert.equal(await action.locator('svg').innerHTML(),icon);await press(action);
  }
  assert.deepEqual(await page.evaluate(()=>qa.actions),['interact','interact','interact']);
  await page.screenshot({path:out+'/'+(mobile?'iphone':'desktop')+'-action.png'});assert.deepEqual(errors,[]);
  await page.addStyleTag({url:base+'/m07-hud.css'});
  await page.evaluate(async()=>{qa.hud.dispose();document.body.classList.add('m07-playing');const {createM07Hud}=await import('/m07-hud.js');window.m07Actions=0;const hud=createM07Hud({onInteract:()=>window.m07Actions++});hud.update({canInteract:true});});
  const forestAction=page.locator('.m07-action');assert.equal(await forestAction.locator('svg').innerHTML(),icon);await press(forestAction);assert.equal(await page.evaluate(()=>window.m07Actions),1);
  results.push({mobile,state:await page.evaluate(()=>qa.state()),actions:await page.evaluate(()=>qa.actions),m07Actions:1,errors});await context.close();
 }
 writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
