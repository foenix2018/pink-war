import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createLevelSounds,bedLevels,SOUND_SLOTS} from '../dist/level-sounds.js';

// A Web Audio stand-in that counts what is built and records gains.
function fakeContext(){
 const made={sources:0,oscillators:0,gains:[],started:0};
 const param=()=>({value:0,setTargetAtTime(v){this.value=v;},setValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},cancelScheduledValues(){}});
 const node=(extra={})=>{const n={connect(x){return x;},disconnect(){n.disconnected=true;},start(){made.started++;},stop(){n.stopped=true;},gain:param(),frequency:param(),pan:param(),Q:{value:0},playbackRate:{value:1},type:'',loop:false,buffer:null,...extra};return n;};
 const ctx={state:'running',currentTime:0,sampleRate:8000,destination:node(),
  createBuffer:(c,n)=>({sampleRate:8000,length:n,getChannelData:()=>new Float32Array(n)}),
  createBufferSource:()=>{made.sources++;return node();},createOscillator:()=>{made.oscillators++;return node();},
  createBiquadFilter:()=>node(),createStereoPanner:()=>node(),decodeAudioData:async b=>({decoded:true,length:b.byteLength}),
  createGain:()=>{const g=node();made.gains.push(g);return g;}};
 return {ctx,made};
}
const run=(sounds,seconds,state,step=.25)=>{for(let t=0;t<seconds;t+=step)sounds.update(step,state);};

test('beds follow the area: rain outdoors, rain on the roof indoors, reactor near the breach, fans in the servers, machinery in the plant',()=>{
 const out=bedLevels(4,'cour',false),inside=bedLevels(4,'hangar',true);
 assert.ok(out.rain>0&&out.rainRoof===0,'rain in the open court');assert.ok(inside.rain===0&&inside.rainRoof>0&&inside.hangar>0,'roof rain and hangar air in the hangar');
 assert.ok(bedLevels(4,'anneau',false).reactor>bedLevels(4,'quai',false).reactor,'the reactor is loudest around the column');
 assert.ok(bedLevels(4,'atelier',true).fans===1&&bedLevels(4,'cour',false).fans===0,'server fans only in the workshop');
 assert.ok(bedLevels(3,'usine',true).machinery===1&&bedLevels(3,'gare',false).machinery<.5,'machinery in the plant');
 const unknown=bedLevels(3,'rue-quelconque',true);assert.ok(unknown.rainRoof>0&&unknown.rain===0,'an unlisted room still has roof rain');
});
test('the module builds only the audible layers, releases the faded ones and goes quiet when inactive',()=>{
 const {ctx,made}=fakeContext(),s=createLevelSounds(ctx,{chapter:4,fetchImpl:async()=>({ok:false})});
 run(s,2,{active:true,area:'cour',indoor:false,breach:1});
 const outdoors=s.stats().beds;assert.ok(outdoors.includes('rain')&&outdoors.includes('electric')&&outdoors.includes('reactor'),'court: '+outdoors);
 assert.ok(!outdoors.includes('fans')&&!outdoors.includes('hangar'),'no fans or hangar air in the court');
 run(s,12,{active:true,area:'atelier',indoor:true,breach:1});
 const inside=s.stats().beds;assert.ok(inside.includes('fans')&&inside.includes('rainRoof')&&!inside.includes('rain'),'workshop: '+inside);
 assert.ok(made.sources+made.oscillators>6,'real nodes were built');
 // The violet column put out: the reactor drone goes quiet and is released.
 run(s,12,{active:true,area:'anneau',indoor:false,breach:0});assert.ok(!s.stats().beds.includes('reactor'),'reactor silent once the breach is gone');
 run(s,10,{active:false});assert.deepEqual(s.stats().beds,[],'everything released when the game is not running');
 s.dispose();
});
test('events fire at random gaps in the places that want them, and not elsewhere',()=>{
 const {ctx,made}=fakeContext(),s=createLevelSounds(ctx,{chapter:3,fetchImpl:async()=>({ok:false}),seed:7});
 run(s,2,{active:true,area:'usine',indoor:true});const before=made.started;
 run(s,60,{active:true,area:'usine',indoor:true});
 assert.ok(made.started-before>8,'the plant crackles and creaks: '+(made.started-before));
 const quiet=fakeContext(),q=createLevelSounds(quiet.ctx,{chapter:4,fetchImpl:async()=>({ok:false}),seed:7});
 run(q,2,{active:true,area:'sas',indoor:true});const b=quiet.made.started;run(q,60,{active:true,area:'sas',indoor:true});
 assert.ok(quiet.made.started-b<=2,'the inspection lock has no events');
 s.dispose();q.dispose();
});
test('a file dropped in assets/sfx replaces the synthesised slot; a missing one is ignored',async()=>{
 const {ctx}=fakeContext(),wanted=new Set(),fetchImpl=async url=>{wanted.add(url);const name=url.split('/').pop();
  return name==='rain-loop.mp3'?{ok:true,headers:{get:()=>'audio/mpeg'},arrayBuffer:async()=>new ArrayBuffer(64)}:{ok:false};};
 const s=createLevelSounds(ctx,{chapter:3,fetchImpl});
 s.update(.25,{active:true,area:null,indoor:false});await new Promise(r=>setTimeout(r,20));
 assert.ok(wanted.size===Object.keys(SOUND_SLOTS).length,'one request per slot, once');
 assert.deepEqual(s.stats().files,['rain-loop'],'only the file that exists is used');
 run(s,3,{active:true,area:null,indoor:false});s.dispose();
});
test('the sfx folder documents every slot and the licence caution; the levels use the module, not the old bed',()=>{
 const readme=readFileSync(new URL('../dist/assets/sfx/README.md',import.meta.url),'utf8');
 for(const name of Object.keys(SOUND_SLOTS))assert.ok(readme.includes('`'+name+'.mp3`'),name);
 assert.match(readme,/redistribution/i);assert.ok(Object.keys(SOUND_SLOTS).length>=14);
 for(const f of ['niveau3.js','niveau4.js']){const src=readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');assert.match(src,/createLevelSounds\(audioCtx/);assert.doesNotMatch(src,/function createCityBed/);}
 assert.match(readFileSync(new URL('../dist/niveau4.js',import.meta.url),'utf8'),/breach:breachLevel/);
});
