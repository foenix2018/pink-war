import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright'),out=process.env.AUDIT_OUTPUT||'/tmp/pink-jump-audit',base=process.env.PINK_WARS_BASE_URL||'http://127.0.0.1:4176';mkdirSync(out,{recursive:true});
const cases=[
 {id:'1',path:'vesper-level1-v7.html',api:'__PINK_VESPER',manual:true},
 {id:'2',path:'level2-test.html',api:'__PINK_M02'},
 {id:'3',path:'niveau3.html',api:'__PINK_M03'},
 {id:'4',path:'niveau4.html',api:'__PINK_M04'},
 {id:'5',path:'ligne9.html',api:'__PINK_LIGNE9'},
 {id:'6',path:'niveau6.html',api:'__PINK_M06'},
 {id:'7',path:'foret.html',api:'__PINK_M07'},
 {id:'8',path:'niveau8.html',api:'__PINK_M08'},
 {id:'9',path:'niveau9.html',api:'__PINK_M09'},
 {id:'10',path:'niveau10.html',api:'__PINK_M10'},
 {id:'arena',path:'index.html',api:'__PINKWAR',mode:'arena'},
 {id:'training',path:'index.html',api:'__PINKWAR',mode:'training'}
],only=process.env.JUMP_AUDIT_LEVELS?.split(',');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const previous=out+'/universal-jump-browser.json',results=process.env.JUMP_AUDIT_RESUME==='1'&&existsSync(previous)?JSON.parse(readFileSync(previous)):[];
try{for(const entry of cases.filter(c=>(!only||only.includes(c.id))&&!results.some(r=>r.id===c.id))){
 const context=await browser.newContext({viewport:{width:900,height:650}});await context.addInitScript(()=>localStorage.setItem('rosee-settings',JSON.stringify({quality:'low',sound:false,music:false,view:'fps'})));await context.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',entry.id,e.message);});
 const query=new URLSearchParams({autostart:'1',prologue:'done',quality:entry.manual?'performance':'low',renderer:'webgl',debug:'1',character:'ghju',resume:'0',v:'3.91.0'});if(entry.mode)query.set('mode',entry.mode);
 console.log('BOOT',entry.id);await page.goto(base+'/'+entry.path+'?'+query,{waitUntil:'domcontentloaded'});
 if(entry.manual){await page.waitForFunction(()=>document.getElementById('start')&&!document.getElementById('start').disabled,null,{timeout:240000,polling:100});if(await page.locator('#start').isVisible())await page.locator('#start').click({timeout:60000});}
 if(entry.mode){await page.locator('#play-button').click({timeout:60000});}
 await page.evaluate(name=>{window.__JUMP_AUDIT_READ=()=>{const api=window[name];if(!api)return null;let g;const raw=api.debug?.game;try{g=typeof raw==='function'?raw():raw;}catch{}const s=api.snapshot?.();const p=g?.player||s?.player;if(!p)return null;return{player:{grounded:p.grounded,airJumps:p.airJumps,elevation:p.elevation,verticalSpeed:p.verticalSpeed},time:g?.time??s.time,running:s.running??(g?g.state==='playing':s.phase==='playing'),state:g?.state||s.state};};},entry.api);
 await page.waitForFunction(()=>{const s=__JUMP_AUDIT_READ();return s?.running&&s.player.grounded&&s.time>.2;},null,{timeout:240000,polling:100});
 const before=await page.evaluate(()=>__JUMP_AUDIT_READ());console.log('READY',entry.id,JSON.stringify(before));
 await page.keyboard.down('Space');await page.waitForFunction(()=>!__JUMP_AUDIT_READ().player.grounded,null,{timeout:60000,polling:50});const first=await page.evaluate(()=>__JUMP_AUDIT_READ());assert.equal(first.player.airJumps,0);console.log('FIRST JUMP',entry.id,JSON.stringify(first));
 await page.evaluate(()=>{document.dispatchEvent(new KeyboardEvent('keyup',{code:'Space',bubbles:true}));document.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',bubbles:true}));});
 await page.waitForFunction(()=>__JUMP_AUDIT_READ().player.airJumps===1,null,{timeout:60000,polling:50});const second=await page.evaluate(()=>__JUMP_AUDIT_READ());await page.keyboard.up('Space');assert.ok(second.player.elevation>before.player.elevation);assert.deepEqual(errors,[]);results.push({id:entry.id,path:entry.path,before,first,second,errors});writeFileSync(out+'/universal-jump-browser.json',JSON.stringify(results,null,2));console.log('DOUBLE JUMP VERIFIED',entry.id,JSON.stringify(second));await context.close();
 }}finally{await browser.close();}
console.log(JSON.stringify({verified:results.map(r=>r.id),errors:results.flatMap(r=>r.errors)}));
