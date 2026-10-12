// Build once from the RLH dressed model exported by the browser and the original
// RLH Mixamo clips. Runtime files never require an FBX loader or a CDN.
import fs from 'node:fs';
import vm from 'node:vm';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import * as T from '../dist/vendor/three.webgpu.min.js';
const source=process.argv[2]||'/workspace/RLH',input=process.argv[3]||'/tmp/rlh-dressed-object.json';
const json=JSON.parse(fs.readFileSync(input));delete json.images;delete json.textures;
for(const m of json.materials)for(const k of Object.keys(m))if(/map$/i.test(k))delete m[k];
const actor=new T.ObjectLoader().parse(json);actor.updateMatrixWorld(true);
let skin;actor.traverse(o=>{if(!skin&&o.isSkinnedMesh)skin=o;});
const bones=skin.skeleton.bones,box=new T.Box3().setFromObject(actor),height=box.max.y-box.min.y;
const scale=2/height,conversion=new T.Matrix4().makeRotationY(Math.PI).premultiply(new T.Matrix4().makeScale(scale,scale,scale));
conversion.premultiply(new T.Matrix4().makeTranslation(0,-box.min.y*scale,0));
const canonical=bones.map(b=>{
  const p=b.getWorldPosition(new T.Vector3()).applyMatrix4(conversion),q=b.getWorldQuaternion(new T.Quaternion()).premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI));
  return new T.Matrix4().compose(p,q,new T.Vector3(1,1,1));
});
const data={source:'RLH Mixamo + tenue V691 / casque F1 V756 / masque G1 V757',height:2,bones:bones.map((b,i)=>{
  const parent=bones.indexOf(b.parent),local=parent<0?canonical[i].clone():canonical[parent].clone().invert().multiply(canonical[i]),p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();local.decompose(p,q,s);
  return {name:b.name,parent,p:p.toArray(),q:q.toArray(),inverse:canonical[i].clone().invert().toArray()};
}),parts:[],clips:[],sourceFiles:{}};
const groups=new Map(),handBones=new Set(bones.map((b,i)=>/Hand/.test(b.name)?i:-1).filter(i=>i>=0));
function ancestor(o,re){for(let p=o;p;p=p.parent)if(re.test(p.name))return true;return false;}
function role(mesh,v){
  const m=mesh.material,a=mesh.geometry.attributes;
  if(mesh===skin){
    if(a.aRlhMat?.getX(v)>.35)return 'band';
    if(a.aRlhMask?.getY(v)>.35)return 'reflect';
    if(a.aRlhMask?.getZ(v)>.35||a.aRlhMask?.getW(v)>.35)return 'rubber';
    if(a.aRlhMask?.getX(v)>.35)return 'fabric';
    return 'detail';
  }
  if(/^COQUE_F1_V756$|COQUE_F1_TRANCHE|LANGUETTE_F1/.test(mesh.name))return 'helmet';
  if(/ECRAN_F1|VISIERE_BORD|ecranPanoramique/.test(mesh.name))return 'visor';
  if(m.transparent)return null;
  if(/RANGER.*cuir/.test(m.name))return 'leather';
  if(/RANGER.*fil/.test(m.name))return 'stitch';
  if(/RANGER.*semelle|RANGER.*lacets/.test(m.name))return 'rubber';
  if(m.metalness>.5)return 'metal';
  if(m.color.r>.6&&m.color.g>.6&&m.color.b>.6)return 'pearl';
  if(m.color.r>m.color.b*2&&m.color.r>.1)return 'band';
  return 'detail';
}
const p=new T.Vector3(),n=new T.Vector3(),color=new T.Color();let removed=0,sourceMeshes=0;
actor.traverse(mesh=>{
  if(!mesh.isMesh||ancestor(mesh,/VISAGE|HUD|temoin|voyant/i))return;sourceMeshes++;
  const g=mesh.geometry,a=g.attributes,normal=new T.Matrix3().getNormalMatrix(conversion.clone().multiply(mesh.matrixWorld));
  let joint=mesh.parent;while(joint&&!joint.isBone)joint=joint.parent;const rigid=Math.max(0,bones.indexOf(joint));
  const count=g.index?.count||a.position.count;
  for(let t=0;t<count;t+=3){
    const ids=[0,1,2].map(k=>g.index?g.index.getX(t+k):t+k);
    if(mesh===skin&&ids.reduce((sum,i)=>sum+[0,1,2,3].reduce((s,k)=>s+(handBones.has(a.skinIndex.array[i*4+k])?a.skinWeight.array[i*4+k]:0),0),0)/3>.45){removed++;continue;}
    const key=role(mesh,ids[0]);if(!key)continue;
    if(!groups.has(key))groups.set(key,{key,position:[],normal:[],uv:[],color:[],skinIndex:[],skinWeight:[],index:[],weld:new Map()});
    const out=groups.get(key);
    for(const i of ids){
      p.fromBufferAttribute(a.position,i).applyMatrix4(mesh.matrixWorld).applyMatrix4(conversion);n.fromBufferAttribute(a.normal,i).applyMatrix3(normal).normalize();
      const indices=mesh.isSkinnedMesh?Array.from(a.skinIndex.array.slice(i*4,i*4+4)):[rigid,0,0,0],weights=mesh.isSkinnedMesh?Array.from(a.skinWeight.array.slice(i*4,i*4+4)):[1,0,0,0],total=weights.reduce((s,w)=>s+w,0)||1;for(let k=0;k<4;k++)weights[k]/=total;
      const ao=mesh===skin?(a.aRlhAO?.getX(i)||1):1;
      color.setRGB(ao,ao,ao);
      if(key==='detail'){if(mesh===skin&&a.color)color.setRGB(a.color.getX(i)*ao,a.color.getY(i)*ao,a.color.getZ(i)*ao);else color.copy(mesh.material.color);}
      const uv=Math.abs(n.x)>.7?[p.z*10,p.y*10]:Math.abs(n.y)>.7?[p.x*10,p.z*10]:[p.x*10,p.y*10];
      const values=[...p.toArray(),...n.toArray(),...uv,...color.toArray(),...indices,...weights],hash=values.map(v=>Math.round(v*1e6)).join(',');let vertex=out.weld.get(hash);
      if(vertex===undefined){vertex=out.position.length/3;out.weld.set(hash,vertex);out.position.push(...p.toArray());out.normal.push(...n.toArray());out.uv.push(...uv);out.color.push(...color.toArray());out.skinIndex.push(...indices);out.skinWeight.push(...weights);}
      out.index.push(vertex);
    }
  }
});
const encode=(array,Type)=>Buffer.from(new Type(array).buffer).toString('base64');
for(const group of groups.values()){
  const part={key:group.key,vertices:group.position.length/3,triangles:group.index.length/3};
  for(const k of ['position','normal','uv','color','skinWeight'])part[k]=encode(group[k],Float32Array);
  part.skinIndex=encode(group.skinIndex,Uint16Array);part.index=encode(group.index,Uint32Array);data.parts.push(part);
}
const THREE={...T,LoaderUtils:{decodeText:b=>new TextDecoder().decode(b),extractUrlBase:T.LoaderUtils.extractUrlBase}},context={THREE,console,window:{URL},TextDecoder,Uint8Array,ArrayBuffer,atob};vm.createContext(context);
vm.runInContext(fs.readFileSync(source+'/js/vendor/fflate.min.js','utf8'),context);vm.runInContext(fs.readFileSync(source+'/js/vendor/FBXLoader.js','utf8'),context);
const originalScale=actor.scale.x*scale,hip=bones.findIndex(b=>/Hips$/.test(b.name)),hipRest=data.bones[hip].p;
for(const name of ['idle','walk','run','rifle','walkRifle']){
  const files=name==='idle'?fs.readdirSync(source+'/js/chunks').filter(f=>/^pompier-mixamo-idle-part/.test(f)).sort():['pompier-mixamo-'+name+'.js'];
  const texts=files.map(f=>fs.readFileSync(source+'/js/chunks/'+f,'utf8')),b64=texts.map(s=>s.match(/='([^']+)'/)[1]).join(''),bytes=Buffer.from(b64,'base64'),fbx=new THREE.FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  for(let i=0;i<files.length;i++)data.sourceFiles[files[i]]=crypto.createHash('sha256').update(texts[i]).digest('hex');
  const clip=fbx.animations[0],tracks=[];
  for(const track of clip.tracks){
    const target=track.name.split('.')[0],bi=bones.findIndex(b=>b.name===target);if(bi<0)continue;
    const values=Array.from(track.values),position=track.name.endsWith('.position');
    if(position){if(bi!==hip)continue;const first=values[1];for(let k=0;k<values.length;k+=3){values[k]=hipRest[0];values[k+1]=hipRest[1]+(values[k+1]-first)*originalScale;values[k+2]=hipRest[2];}}
    else if(bi===hip){const q=new T.Quaternion(),turn=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI);for(let k=0;k<values.length;k+=4)q.fromArray(values,k).premultiply(turn).toArray(values,k);}
    tracks.push({name:track.name,type:position?'vector':'quaternion',times:encode(track.times,Float32Array),values:encode(values,Float32Array)});
  }
  data.clips.push({name,duration:clip.duration,tracks});
}
for(const f of ['firefighter-gear-v691.js','mask-msa-g1-v757.js'])data.sourceFiles[f]=crypto.createHash('sha256').update(fs.readFileSync(source+'/js/modules/gameplay/'+f)).digest('hex');
data.helmetCenter=new T.Vector3(0,.847,.037).applyMatrix4(actor.matrixWorld).applyMatrix4(conversion).toArray();
data.stats={sourceMeshes,removedHandTriangles:removed,triangles:data.parts.reduce((s,p)=>s+p.triangles,0),batches:data.parts.length};
const zip=zlib.gzipSync(JSON.stringify(data),{level:9}),output=new URL('../dist/rlh-firefighter-data.js',import.meta.url);
fs.writeFileSync(output,'// Original RLH firefighter body, gear and native clips, baked for Pink war.\nexport const RLH_FIREFIGHTER_GZIP="'+zip.toString('base64')+'";\n');
console.log(JSON.stringify({...data.stats,bones:bones.length,clips:data.clips.map(c=>c.name),bytes:zip.length,height,scale,helmetCenter:data.helmetCenter}));
