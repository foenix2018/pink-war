import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {buildCivilMotion} from '../dist/lylu-civil-motion.js';

// Load the exact shipped civilian rig and recorded animation tracks,
// without a renderer or textures. The GLB uses float animation accessors.
function loadRig(){
 const buf=readFileSync(new URL('../dist/assets/heroes/lylu-civil-v5.glb',import.meta.url));
 const jsonLength=buf.readUInt32LE(12),g=JSON.parse(buf.subarray(20,20+jsonLength).toString());
 const bin=20+jsonLength+8,root=new T.Group(),joints=new Set(g.skins[0].joints);
 const nodes=g.nodes.map((n,i)=>{
  const o=joints.has(i)?new T.Bone():new T.Object3D();o.name=n.name||'';
  if(n.matrix){o.matrix.fromArray(n.matrix);o.matrix.decompose(o.position,o.quaternion,o.scale);}
  else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);}return o;
 });
 const parent=new Set();g.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>{nodes[i].add(nodes[c]);parent.add(c);}));
 nodes.forEach((o,i)=>{if(!parent.has(i))root.add(o);});root.updateMatrixWorld(true);
 const bones=new Map([...joints].map(i=>[nodes[i].name,{bone:nodes[i]}]));
 const read=i=>{const a=g.accessors[i],b=g.bufferViews[a.bufferView],n={SCALAR:1,VEC3:3,VEC4:4}[a.type];assert.equal(a.componentType,5126);const out=[];for(let k=0;k<a.count;k++)for(let j=0;j<n;j++)out.push(buf.readFloatLE(bin+(b.byteOffset||0)+(a.byteOffset||0)+k*(b.byteStride||n*4)+j*4));return out;};
 const originals=g.animations.map(a=>new T.AnimationClip(a.name,-1,a.channels.map(c=>{
  const s=a.samplers[c.sampler],name=nodes[c.target.node].name,rot=c.target.path==='rotation';return new (rot?T.QuaternionKeyframeTrack:T.VectorKeyframeTrack)(name+(rot?'.quaternion':'.position'),read(s.input),read(s.output));
 })));
 return {root,bones,originals};
}
test('civil LYLU arms follow the actual opposite leg, with relaxed shoulders and forward elbows',()=>{
 const {root,bones,originals}=loadRig(),clips=buildCivilMotion(T,root,bones,originals);
 const pos=n=>bones.get(n).bone.getWorldPosition(new T.Vector3()),dir=(a,b)=>pos(b).sub(pos(a)).normalize();
 for(const mode of ['idle','walk','run','walkBack','runBack','walkLeft','walkRight','runLeft','runRight','crouchIdle','crouchWalk']){
  const clip=clips.find(c=>c.name==='civil_'+mode);assert.ok(clip,mode);
  const src=originals.find(c=>c.name===mode);
  if(!/^(walk|run)(Left|Right)$/.test(mode))for(const tr of src.tracks.filter(t=>/^(Pelvis|Thigh|Shin|Foot)/.test(t.name))){
   const actual=clip.tracks.find(t=>t.name===tr.name);assert.deepEqual(actual.values,tr.values,'recorded leg/pelvis data unchanged');
  }
  const mixer=new T.AnimationMixer(root),action=mixer.clipAction(clip).play();
  let opposite=0,count=0;
  for(let i=0;i<40;i++){
   mixer.setTime(i*clip.duration/40);root.updateMatrixWorld(true);
   const phase=dir('Thigh_L','Shin_L').z-dir('Thigh_R','Shin_R').z;
   const l=dir('UpperArm_L','ForeArm_L'),r=dir('UpperArm_R','ForeArm_R');
   for(const [side,s,upper] of [[1,'L',l],[-1,'R',r]]){
    const lower=dir('ForeArm_'+s,'Hand_'+s);
    assert.ok(upper.y<-.70&&side*upper.x>=.04&&side*upper.x<.27,mode+' shoulder alignment');
    assert.ok(lower.z>upper.z+.025,mode+' elbow must flex forward');
   }
   if(/^(walk|run)(Back)?$/.test(mode)&&Math.abs(phase)>.13){count++;if((l.z-r.z)*phase<0)opposite++;}
   if(/^(walk|run)(Left|Right)$/.test(mode))assert.ok(Math.abs(l.z-r.z)<.025,mode+' no exaggerated arm swing on side steps');
  }
  if(/^(walk|run)(Back)?$/.test(mode)){assert.ok(count>3,mode+' leg stride');assert.ok(opposite/count>.95,mode+' contralateral synchronization');}
  mixer.stopAllAction();mixer.uncacheRoot(root);
 }
});
