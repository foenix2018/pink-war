import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {ArenaGame} from '../dist/game-logic.js';
import {JETPACK_RULES,jetpackFuel} from '../dist/locomotion.js';
import {createJetpackFX,JETPACK_MOUNT,JETPACK_NOZZLES,JETPACK_GAUGE} from '../dist/jetpack-fx.js';
import {createJetpackAudio} from '../dist/jetpack-audio.js';
import {parsePWM} from '../dist/blender-models.js';
import {RIFLE_MOUNT} from '../dist/hero-gear.js';

const sandbox=id=>{const g=new ArenaGame([]);g.reset(id);g.nextWave=999;g.toSpawn=0;g.enemies=[];return g;};
const tick=(g,dt,held=false)=>g.step(dt,{jump:held});

for(const id of ['ghju','lylu'])for(const hz of [30,60,120])
test(`${id} ${hz}Hz: holding the second press hovers for two seconds, no longer`,()=>{
 const g=sandbox(id),dt=1/hz;
 for(let i=0;i<Math.round(.28*hz);i++)tick(g,dt,i===0);
 tick(g,dt,true);assert.equal(g.player.jetpackActive,true);
 let elapsed=0,lastActive=0;
 for(let i=0;i<Math.round(3.5*hz);i++){tick(g,dt,true);elapsed+=dt;if(g.player.jetpackActive)lastActive=elapsed;}
 assert.ok(lastActive>=1.9&&lastActive<=2.1,`thrusters ran ${lastActive.toFixed(2)} s`);
 assert.equal(g.player.grounded,true,'back on the floor once the fuel is gone');
});
test('the fuel gauge reads full on the ground, drains linearly in the air and is spent once released',()=>{
 const g=sandbox('ghju'),dt=1/60;assert.equal(jetpackFuel(g.player),0,'not armed on the ground');
 for(let i=0;i<17;i++)tick(g,dt,i===0);tick(g,dt,true);
 assert.ok(jetpackFuel(g.player)>.95,'full at ignition');
 for(let i=0;i<60;i++)tick(g,dt,true);
 assert.ok(Math.abs(jetpackFuel(g.player)-.5)<.05,'half after a second: '+jetpackFuel(g.player));
 tick(g,dt,false);assert.equal(jetpackFuel(g.player),0,'released: spent, it does not recharge in the air');
});

function pack(){const root=new T.Group(),bone=new T.Bone();root.add(bone);return {root,fx:createJetpackFX(root,bone,{masculine:false,models:false}),bone};}
test('the pack hangs low on the back, on the lumbar bone, in the rig\'s orientation even if the bone is turned',()=>{
 const root=new T.Group(),bone=new T.Bone();bone.rotation.y=Math.PI;root.add(bone); // the spine chain is turned half a turn
 const fx=createJetpackFX(root,bone,{models:false});root.updateMatrixWorld(true);
 const back=new T.Vector3(0,0,1).applyQuaternion(fx.root.getWorldQuaternion(new T.Quaternion()));
 assert.ok(back.z>.99,'the pack\'s back faces the hero\'s back');
 const at=fx.root.getWorldPosition(new T.Vector3());assert.ok(Math.abs(at.y-JETPACK_MOUNT.y)<1e-6&&at.z>0&&JETPACK_MOUNT.y<1.25,'low on the back');
});
test('two-layer flames per nozzle, soft coloured smoke, and a gauge bar that follows the fuel then flashes red',()=>{
 const {fx}=pack(),flames=[];fx.root.traverse(o=>{if(o.name==='Jetpack / flame')flames.push(o);});
 assert.equal(flames.length,4,'outer and core flame under each of the two nozzles');
 const smoke=fx.root.getObjectByName('Jetpack / smoke particles'),bar=fx.root.getObjectByName('Jetpack / fuel gauge');
 for(let i=0;i<30;i++)fx.update(1/60,true,1);
 assert.equal(smoke.count,56);assert.ok(smoke.instanceColor,'per-instance colour: hot, tinted, grey');assert.ok(bar.scale.x>.9);
 const full=bar.material.color.getHex();
 for(let i=0;i<150;i++)fx.update(1/60,true,.1);
 assert.ok(bar.scale.x<.2,'the bar follows the fuel: '+bar.scale.x);assert.notEqual(bar.material.color.getHex(),full);assert.ok(bar.material.color.r>.9&&bar.material.color.g<.4,'red at the end');
 for(let i=0;i<90;i++)fx.update(1/60,false,0);assert.equal(smoke.count,0,'the smoke clears when the thrusters stop');
 fx.dispose();
});
test('the Blender pack fits its mount: nozzle rings where the flames start, gauge window where the bar is drawn',()=>{
 const b=readFileSync(new URL('../dist/assets/heroes/jetpack.pwm',import.meta.url)),m=parsePWM(T,b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
 assert.ok(existsSync(new URL('../dist/assets/heroes/jetpack_ao.jpg',import.meta.url)));assert.ok(m.triangles>2000&&m.triangles<20000,'triangles '+m.triangles);
 const glow=m.primitives.find(p=>p.material==='glow'),box=new T.Box3().setFromBufferAttribute(glow.geometry.attributes.position),c=box.getCenter(new T.Vector3());
 assert.ok(Math.abs(box.max.x-JETPACK_NOZZLES.x-.036-.004)<.006&&Math.abs(box.min.x+JETPACK_NOZZLES.x+.036+.004)<.006,'both exit rings at ±x '+JSON.stringify([box.min.x,box.max.x]));
 assert.ok(Math.abs(c.y-JETPACK_NOZZLES.y)<.006&&Math.abs(c.z-JETPACK_NOZZLES.z)<.006,'ring height and depth');
 assert.ok(m.max[2]>=JETPACK_GAUGE.z-.002&&m.max[2]<=JETPACK_GAUGE.z+.02,'the back face carries the gauge');
 assert.ok(m.max[0]-m.min[0]<.25&&m.max[1]-m.min[1]<.3,'compact: a mini jetpack');
});
test('without the model file the plain housing stays and nothing throws',async()=>{
 const root=new T.Group(),bone=new T.Bone();root.add(bone);
 const fx=createJetpackFX(root,bone,{models:true,fetchImpl:async()=>({ok:false,status:404})});
 assert.equal(await fx.ready,false);assert.equal(fx.modelReady,false);
 assert.ok(fx.root.getObjectByName('mini jetpack / repli').visible,'the fallback housing is shown');fx.dispose();
});
test('the rifle slung on the back and the jetpack never cross, and the rifle stays clear of the exhaust',()=>{
 // Rifle axis in the rig frame (stock at x = -0.46, muzzle at x = +0.60 in its own frame), 8 cm thick; pack = its housing box.
 const [px,py]=RIFLE_MOUNT.position,c=Math.cos(RIFLE_MOUNT.roll),s=Math.sin(RIFLE_MOUNT.roll);
 const a=new T.Vector2(px-.46*c,py-.46*s),b=new T.Vector2(px+.60*c,py+.60*s);
 // Pack box from the model: housing x ±0.1075, thruster bells down to -0.15 and the cowl plate up to +0.118; margin = rifle half-thickness.
 const housing=new T.Box2(new T.Vector2(JETPACK_MOUNT.x-.1075-.02,JETPACK_MOUNT.y-.15),new T.Vector2(JETPACK_MOUNT.x+.1075+.02,JETPACK_MOUNT.y+.118+.05));
 let hit=false;for(let k=0;k<=200;k++){const t=k/200,p=a.clone().lerp(b,t);if(housing.containsPoint(p)){hit=true;break;}}
 assert.equal(hit,false,'the rifle does not touch the pack');
 // Exhaust columns: two vertical strips at the nozzles, from the exit ring downwards.
 for(const side of [-1,1]){const x=side*JETPACK_NOZZLES.x,top=JETPACK_MOUNT.y+JETPACK_NOZZLES.y;
  for(let k=0;k<=200;k++){const p=a.clone().lerp(b,k/200);assert.ok(!(Math.abs(p.x-x)<.07&&p.y<top&&p.y>top-1.1),'the rifle is not in the exhaust');}}
 assert.ok(b.y<2.1,'the muzzle stays near head height');
});

// A tiny Web Audio stand-in: records what the sputter does to the gain.
function fakeAudio(){
 const param=()=>({v:0,history:[],setValueAtTime(v){this.v=v;},setTargetAtTime(v,t){this.v=v;this.history.push([t,v]);},cancelScheduledValues(){},value:0});
 const node=()=>{const n={connect(x){return x;},start(){},stop(){n.stopped=true;},frequency:param(),gain:param(),Q:{value:0},buffer:null,loop:false,type:''};return n;};
 const ctx={state:'running',currentTime:0,sampleRate:8000,destination:{},createBufferSource:()=>node(),createBiquadFilter:()=>node(),createGain:()=>node(),createOscillator:()=>node(),
  createBuffer:(c,n)=>({sampleRate:8000,getChannelData:()=>new Float32Array(n)}),decodeAudioData:async()=>null};
 return ctx;
}
test('the exhaust sound sputters in the last fifth of the fuel, and stops cleanly',()=>{
 globalThis.fetch=async()=>({ok:false});
 const ctx=fakeAudio(),audio=createJetpackAudio(()=>ctx);
 const gains=[];let last=null;const orig=ctx.createGain;ctx.createGain=()=>{const n=orig();last=last||n;return n;};
 ctx.currentTime=0;audio.update(true,1);
 const levels=(fuel)=>{const out=[];for(let i=0;i<60;i++){ctx.currentTime=1+i/120;audio.update(true,fuel);out.push(last.gain.v);}return out;};
 const steady=levels(.9),sputter=levels(.05);
 const spread=a=>Math.max(...a)-Math.min(...a);
 assert.ok(spread(sputter)>spread(steady)*3,'the level stutters near the end: '+spread(sputter)+' vs '+spread(steady));
 audio.update(false);assert.ok(last.gain.history.at(-1)[1]===0,'faded out when the thrusters stop');
});
