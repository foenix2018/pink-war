import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.PINK_WARS_BASE_URL||'http://127.0.0.1:4176',out=process.env.AUDIT_OUTPUT||'/tmp/pink-score';mkdirSync(out,{recursive:true});
const fixture=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#13202c;color:white;font:18px system-ui}button{padding:20px}</style><button id="go">Jouer</button><div id="options"></div><script type="module">
import {setScreenMusic,screenMusicSnapshot,setMusicEnabled} from '/menu-music.js';
import {createMusicControl} from '/music-options.js';import {playLaserShot} from '/laser-sound.js';
let surface='menu',level=1,options={};const game={player:{x:0,z:0},enemies:[]};
function tick(){setScreenMusic(surface,level,undefined,{game,...options});requestAnimationFrame(tick);}tick();
window.qa={snapshot:screenMusicSnapshot,game,set(next,n=level,o={}){surface=next;level=n;options=o;setScreenMusic(surface,level,undefined,{game,...options});},mute:setMusicEnabled,shot(){return playLaserShot(window.__PINKWAR_BOOT_AUDIO,'vortex');}};
document.querySelector('#go').onclick=()=>qa.set('gameplay',1);document.querySelector('#options').append(createMusicControl());
</script>`;
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});const results=[];
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1100,height:720},isMobile:mobile,hasTouch:mobile});
  await context.addInitScript(()=>{
   const AudioElement=window.Audio;window.qaMedia=[];window.Audio=class extends AudioElement{constructor(...args){super(...args);qaMedia.push(this);}};
   const Context=window.AudioContext||window.webkitAudioContext,createGain=Context.prototype.createGain;
   Context.prototype.createGain=function(){
    const gain=createGain.call(this),connect=gain.connect.bind(gain),ctx=this;
    gain.connect=function(target,...rest){if(target===ctx.destination){if(!ctx.qaAnalyser){ctx.qaAnalyser=ctx.createAnalyser();ctx.qaAnalyser.fftSize=2048;ctx.qaAnalyser.connect(ctx.destination);}return connect(ctx.qaAnalyser,...rest);}return connect(target,...rest);};return gain;
   };
  });
  const page=await context.newPage(),errors=[],badRequests=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)badRequests.push([r.status(),r.url()]);});page.on('request',r=>{if(r.url().includes('/assets/music/'))requests.push(r.url());});
  await page.route('**/qa-score',r=>r.fulfill({contentType:'text/html',body:fixture}));await page.goto(base+'/qa-score');await page.waitForFunction(()=>window.qa);assert.equal(await page.evaluate(()=>qaMedia.length),0,'no preloaded music before gesture');
  await(mobile?page.locator('#go').tap():page.locator('#go').click());
  const ready=async()=>page.waitForFunction(()=>{const s=qa.snapshot();return s.playing&&!s.transitioning&&qaMedia.some(m=>!m.paused&&m.readyState>=2&&m.currentTime>.15&&m.src.endsWith(s.source.slice(1)));},null,{timeout:15000});
  await ready();
  const chapters=[];
  for(let level=1;level<=10;level++){
   await page.evaluate(level=>qa.set('gameplay',level),level);await ready();const s=await page.evaluate(()=>({...qa.snapshot(),voices:qaMedia.filter(m=>!m.paused).length,media:qaMedia.map(m=>({preload:m.preload,loop:m.loop,duration:m.duration,position:m.currentTime,src:m.src}))}));
   assert.equal(s.level,level);assert.equal(s.voices,1);assert.ok(s.media.filter(m=>!Number.isNaN(m.duration)).every(m=>m.duration>150&&m.duration<190));assert.ok(s.media.every(m=>m.preload==='none'&&m.loop));assert.ok(s.gain<=.48);chapters.push(s);
  }
  await page.evaluate(()=>qa.set('gameplay',10,{finale:true}));await ready();assert.match(await page.evaluate(()=>qa.snapshot().source),/kinetic-collapse/);
  await page.evaluate(()=>qa.set('gameplay',9,{dialogue:true}));await ready();const dialogue=await page.evaluate(()=>qa.snapshot());assert.equal(dialogue.section,'dialogue');assert.ok(dialogue.gain<.11);
  await page.evaluate(()=>qa.set('gameplay',9));await ready();assert.ok(await page.evaluate(()=>qa.snapshot().gain)>.3);
  await page.evaluate(()=>qa.shot());assert.equal(await page.evaluate(()=>qa.snapshot().ducked),true);await page.waitForFunction(()=>!qa.snapshot().ducked&&qa.snapshot().gain>.3);
  const loop=await page.evaluate(()=>{const m=qaMedia.find(m=>!m.paused);m.currentTime=m.duration-.12;return m.loop;});assert.equal(loop,true);await page.waitForFunction(()=>qaMedia.some(m=>!m.paused&&m.currentTime<2),null,{timeout:4000});
  const checkbox=page.getByRole('checkbox',{name:'Musique du jeu'});await(mobile?checkbox.tap():checkbox.click());await page.waitForFunction(()=>qaMedia.every(m=>m.paused));assert.equal(await page.evaluate(()=>qa.snapshot().enabled),false);
  const sfx=await page.evaluate(async()=>{
   const ctx=window.__PINKWAR_BOOT_AUDIO,buffer=new Float32Array(ctx.qaAnalyser.fftSize);const rms=()=>{ctx.qaAnalyser.getFloatTimeDomainData(buffer);return Math.sqrt(buffer.reduce((v,x)=>v+x*x,0)/buffer.length);};
   await new Promise(r=>setTimeout(r,250));const quiet=rms(),shot=qa.shot();await new Promise(r=>setTimeout(r,30));return {quiet,shot,rms:rms()};
  });assert.ok(sfx.quiet<.00001);assert.equal(sfx.shot,true);assert.ok(sfx.rms>.0001,'muting music leaves an actual weapon signal at the output');
  await page.evaluate(()=>qa.set('gameplay',6));await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>qa.snapshot().playing),false,'chapter changes cannot bypass mute');
  await(mobile?checkbox.tap():checkbox.click());await ready();
  const modes=[];
  for(const mode of ['arena','training','planque']){
   await page.evaluate(mode=>qa.set(mode==='planque'?'menu':'gameplay',1,{mode}),mode);await ready();const s=await page.evaluate(()=>qa.snapshot());assert.match(s.source,mode==='arena'?/kinetic-collapse/:/the-iron-garden/);modes.push({mode,...s});
  }
  await page.evaluate(()=>qa.set('paused'));assert.equal(await page.evaluate(()=>qaMedia.filter(m=>!m.paused).length),0);
  assert.deepEqual(errors,[]);assert.deepEqual(badRequests,[]);assert.equal(await page.evaluate(()=>qaMedia.length),2,'all chapters reuse just the menu and gameplay media elements');
  results.push({mobile,chapters,modes,dialogue,loop,sfx,mediaCount:2,requests:[...new Set(requests)],errors,badRequests});await context.close();
 }
 writeFileSync(out+'/browser-soundtrack.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(r=>({mobile:r.mobile,chapters:r.chapters.length,modes:r.modes.length,loop:r.loop,mediaCount:r.mediaCount,sfx:r.sfx,errors:r.errors}))));
}finally{await browser.close();}
