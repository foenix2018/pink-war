// Bake downloaded Mixamo FBX motions onto the canonical Pink Wars skeleton.
// Usage: node tools/build-mixamo-player.mjs /path/to/FBXs [/path/to/RLH/js/vendor]
// Source FBXs stay outside the game. Only retargeted game animation tracks ship.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {rlhFirefighterData} from '../dist/rlh-firefighter.js';

const directory=process.argv[2],vendor=process.argv[3]||'/workspace/RLH/js/vendor';
if(!directory)throw Error('Provide the directory containing the source FBX files');
const THREE={...T,LoaderUtils:{...T.LoaderUtils,decodeText:b=>new TextDecoder().decode(b)}};
const context={THREE,console,window:{URL},TextDecoder,Uint8Array,ArrayBuffer,atob};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(vendor,'fflate.min.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(vendor,'FBXLoader.js'),'utf8'),context);

const original=rlhFirefighterData(),turn=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI),unturn=turn.clone().invert();
const aliases=['Hips','Spine','Spine1','Spine2','Neck','Head'];
for(const side of ['Left','Right'])for(const name of ['Shoulder','Arm','ForeArm','Hand','UpLeg','Leg','Foot','ToeBase'])aliases.push(side+name);
const children={Hips:'Spine',Spine:'Spine1',Spine1:'Spine2',Spine2:'Neck',Neck:'Head',Head:'HeadTop_End'};
for(const side of ['Left','Right'])Object.assign(children,{[side+'Shoulder']:side+'Arm',[side+'Arm']:side+'ForeArm',[side+'ForeArm']:side+'Hand',[side+'Hand']:side+'HandIndex1',[side+'UpLeg']:side+'Leg',[side+'Leg']:side+'Foot',[side+'Foot']:side+'ToeBase',[side+'ToeBase']:side+'Toe_End'});
const canon=name=>name.replace(/^mixamorig:?/,'');
const target=new Map(original.bones.map(b=>[canon(b.name),b]));
const targetRest=new Map(original.bones.map(b=>[canon(b.name),new T.Matrix4().fromArray(b.inverse).invert()]));
const configs=[
 ['walk','walking.fbx'],['walkRifle','rifle-walking.fbx'],['run','running.fbx'],
 ['walkLeft','rifle-strafe_right.fbx'],['walkRight','rifle-strafe_right.fbx',false,true],['walkBack','walking backwards.fbx'],
 ['runLeft','left strafe.fbx'],['runRight','right strafe.fbx'],['runBack','running backwards.fbx'],
 ['crouchIdle','Crouch Idle.fbx'],['crouchWalk','Sneaking Forward.fbx'],['crouchLeft','Crouched Sneaking Left.fbx'],['crouchRight','Crouched Sneaking Right.fbx'],['crouchBack','Sneaking Forward.fbx',true]
];
const pack={author:'Adobe Mixamo',license:'Adobe Mixamo terms — royalty-free use in games',source:'https://www.mixamo.com/',clips:[]};
const provenance={author:pack.author,license:pack.license,terms:'https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html',mirrors:[
 {repository:'webaverse/app',revision:'561630539fe2055c117309c3d24c2cfc4d6763d5',directory:'public/animations'},
 {repository:'akhilm2223/valor',revision:'45587d200be528829420dccffcba24c1170452f4',directory:'public/animations'}
],clips:[]};
for(const [name,file,reverse=false,mirrored=false] of configs){
 const bytes=fs.readFileSync(path.join(directory,file)),root=new THREE.FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const clip=root.animations[0],source=new Map();root.traverse(b=>{if(b.isBone)source.set(canon(b.name),b);});root.updateMatrixWorld(true);
 const swap=key=>key.startsWith('Left')?'Right'+key.slice(4):key.startsWith('Right')?'Left'+key.slice(5):key;
 const sourceKey=key=>mirrored?swap(key):key;
 function worldP(key){const p=source.get(sourceKey(key)).getWorldPosition(new T.Vector3());if(mirrored)p.x=-p.x;return p;}
 function worldQ(key){const q=source.get(sourceKey(key)).getWorldQuaternion(new T.Quaternion());if(mirrored)q.set(q.x,-q.y,-q.z,q.w);return q;}
 const rest=new Map([...source.keys()].map(key=>[key,{p:worldP(key),q:worldQ(key)}]));
 const maps=aliases.filter(key=>target.has(key)&&source.has(key)).map(key=>{
  const matrix=targetRest.get(key),q=new T.Quaternion().setFromRotationMatrix(matrix),child=children[key];
  // Align corresponding anatomical axes in T pose, retaining each bone's
  // intrinsic roll. The canonical bind was fitted to dressed characters; it
  // must not be mistaken for the source's straight-arm T pose.
  if(key!=='Hips'&&targetRest.has(child)&&rest.has(child)){
   const from=new T.Vector3().setFromMatrixPosition(targetRest.get(child)).sub(new T.Vector3().setFromMatrixPosition(matrix)).normalize();
   const to=rest.get(child).p.clone().sub(rest.get(key).p).applyQuaternion(turn).normalize();
   q.premultiply(new T.Quaternion().setFromUnitVectors(from,to));
  }
  return {key,target:target.get(key),rest:rest.get(key).q.clone().invert(),basis:q,rotations:[]};
 });
 const readers=clip.tracks.map(t=>{const [bone,key]=t.name.split('.');return {bone:source.get(canon(bone)),key,read:t.createInterpolant()};}).filter(t=>t.bone);
 const duration=clip.duration,frames=Math.ceil(duration*60),times=Array.from({length:frames+1},(_,i)=>duration*i/frames);
 function pose(t){for(const t0 of readers)t0.bone[t0.key].fromArray(t0.read.evaluate(t));root.updateMatrixWorld(true);}
 pose(reverse?duration:0);const start=worldP('Hips');
 pose(reverse?0:duration);const end=worldP('Hips');
 const sourceLeg=source.get('LeftLeg').position.length()+source.get('LeftFoot').position.length();
 const scale=(new T.Vector3().fromArray(target.get('LeftLeg').p).length()+new T.Vector3().fromArray(target.get('LeftFoot').p).length())/sourceLeg;
 const travel=end.clone().sub(start);travel.y=0;const mappedTravel=travel.clone().applyQuaternion(turn),stride=travel.length()*scale;
 const axis=travel.length()>.01?travel.clone().normalize():new T.Vector3(0,0,1),positions=[],left=[],heights=[];
 for(let frame=0;frame<=frames;frame++){
  const t=times[frame];pose(reverse?duration-t:t);
  const desired=new Map(maps.map(m=>[m.key,turn.clone().multiply(worldQ(m.key)).multiply(m.rest).multiply(unturn).multiply(m.basis).normalize()]));
  for(const m of maps){
   const parent=original.bones[m.target.parent],parentKey=parent&&canon(parent.name),q=(desired.get(parentKey)||new T.Quaternion()).clone().invert().multiply(desired.get(m.key)).normalize();
   if(m.rotations.length&&q.dot(new T.Quaternion().fromArray(m.rotations,m.rotations.length-4))<0)q.set(-q.x,-q.y,-q.z,-q.w);
   m.rotations.push(...q.toArray().map(v=>+v.toFixed(7)));
  }
  const p=worldP('Hips'),linear=start.clone().lerp(end,frame/frames),offset=new T.Vector3(p.x-linear.x,p.y-rest.get('Hips').p.y,p.z-linear.z).multiplyScalar(scale).applyQuaternion(turn);
  positions.push(...new T.Vector3().fromArray(target.get('Hips').p).add(offset).toArray().map(v=>+v.toFixed(7)));
  const foot=worldP('LeftFoot');left.push(foot.clone().sub(linear).dot(axis));heights.push(foot.y);
 }
 const moving=!name.endsWith('Idle'),max=Math.max(...heights),min=Math.min(...heights),peaks=[];
 if(moving)for(let i=1;i<frames;i++)if(heights[i]>(min+(max-min)*.6)&&heights[i]>=heights[i-1]&&heights[i]>heights[i+1]&&(!peaks.length||i-peaks.at(-1)>frames*.16))peaks.push(i);
 // Some Mixamo sneaking takes contain two complete strides, unlike the walk
 // and run loops. Count full cycles so their foot phases can share a clock.
 if(peaks.length>1&&frames-peaks.at(-1)+peaks[0]<frames*.16)peaks.pop();
 const cycles=name.startsWith('crouch')&&moving?Math.max(1,peaks.length):1;
 const search=Math.max(1,Math.floor(frames/cycles));let strike=0;for(let i=1;i<search;i++)if(left[i]>left[strike])strike=i;
 const metadata={name,file,reverse,mirrored,duration,moving,crouched:name.startsWith('crouch'),cycles,stride,stridePerCycle:stride/cycles,speed:stride/duration,offset:strike/frames,sourceDirection:mappedTravel.normalize().toArray().map(v=>+v.toFixed(5))};
 const tracks=maps.map(m=>({name:m.target.name+'.quaternion',type:'quaternion',times,values:m.rotations}));tracks.push({name:target.get('Hips').name+'.position',type:'vector',times,values:positions});
 const mirror=file.startsWith('rifle-')?provenance.mirrors[1]:provenance.mirrors[0],sourceFile=file.startsWith('rifle-')?file.slice(6):file;
 pack.clips.push({...metadata,tracks});provenance.clips.push({...metadata,repository:mirror.repository,revision:mirror.revision,path:mirror.directory+'/'+sourceFile,gitBlobSha:crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex'),sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
 console.log(JSON.stringify(metadata));
}
const zip=zlib.gzipSync(JSON.stringify(pack),{level:9});
fs.writeFileSync(new URL('../dist/mixamo-player-data.js',import.meta.url),'// Baked game animation tracks. Adobe Mixamo terms; see assets/motion/mixamo-sources.json.\nexport const MIXAMO_PLAYER_GZIP='+JSON.stringify(zip.toString('base64'))+';\n');
fs.writeFileSync(new URL('../dist/assets/motion/mixamo-sources.json',import.meta.url),JSON.stringify(provenance,null,2)+'\n');
console.log('Baked bytes',zip.length);
