import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {S19_V3_ROTORS,S19_V3_ASSET,probeS19V3State,installProbeS19V3}
  from '../dist/probe-s19-v3.js';

test('S-19 V3 replaces only probe visuals and retains tactical drone state',()=>{
 assert.deepEqual(S19_V3_ROTORS,['LEFT_REAR','LEFT_FRONT','RIGHT_REAR','RIGHT_FRONT']);
 const state=probeS19V3State(2,{
  rotorDestroyed:[false,true,false,false],chargeProgress:.95,lastShotAt:2,
  aimPitch:.22,limpUntil:0},2);
 assert.equal(state.rotors.length,4);
 assert.equal(state.rotors[1].broken,true);
 assert.equal(state.rotors[1].scale,.015);
 assert.equal(state.eyePitch,.22);
 assert.equal(state.charge,.95);
 assert.equal(state.shot,true);
 assert.equal(typeof installProbeS19V3,'function');
 assert.equal(S19_V3_ASSET.endsWith('/assets/enemies/sonde-s19-v3-game.glb'),true);
});

test('S-19 Blender production GLB is local, animated and draw-call constrained',()=>{
 const p=new URL('../dist/assets/enemies/sonde-s19-v3-game.glb',import.meta.url);
 assert(existsSync(p), 'Optimized Blender asset has not been committed');
 const b=readFileSync(p);
 assert.equal(b.toString('ascii',0,4),'glTF');
 const len=b.readUInt32LE(12);
 const doc=JSON.parse(b.subarray(20,20+len).toString('utf8'));
 assert(doc.meshes.length<=36, 'Unoptimized mesh count may overload Quest 3/iPhone');
 assert(doc.animations?.length, 'Blender rotor animation lost');
 const names=new Set(doc.nodes.map(n=>n.name));
 for(const rotor of S19_V3_ROTORS)assert(names.has('FAN_'+rotor));
 const materials=new Set((doc.materials||[]).map(m=>m.name||''));
 assert([...materials].some(name=>/red|ruby|crimson|emissive/i.test(name)));
});

test('S-19 original flight code still drives new visual and retains safe fallback',()=>{
 const source=readFileSync(new URL('../dist/enemies.js',import.meta.url),'utf8');
 assert(source.includes('installProbeS19V3(root,pelvis)'));
 assert(source.includes('root.userData.s19V3?.animate(time,flight,simulationTime)'));
 assert(source.includes('probeFlightState(flight)'));
 assert(source.includes('flight.rotorDestroyed'));
 assert(source.includes('kit.probeHead'));
});
