import {isNeonStrip} from './level-neons.js';

// Recover independent axis-aligned luminous bars from baked geometry. Joining
// shared corners prevents converting each face of a box into a separate tube.
// Complex shapes, lettering, broad panels and energy effects are left intact.
export function findBakedNeonRuns(faces) {
 const owners=new Map(),parents=faces.map((_,i)=>i);
 function find(i){while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;}
 const key=p=>p.map(v=>Math.round(v*10000)).join(',');
 faces.forEach((face,i)=>{for(const p of face){const k=key(p);if(owners.has(k))parents[find(i)]=find(owners.get(k));else owners.set(k,i);}});
 const groups=new Map();faces.forEach((face,i)=>{const k=find(i);if(!groups.has(k))groups.set(k,{indices:[],points:new Map()});const g=groups.get(k);g.indices.push(i);for(const p of face)g.points.set(key(p),p);});
 const runs=[];
 for(const g of groups.values()){
  const points=[...g.points.values()];if(points.length>8||points.length<4)continue;
  const min=[0,1,2].map(a=>Math.min(...points.map(p=>p[a]))),max=[0,1,2].map(a=>Math.max(...points.map(p=>p[a])));
  if(points.some(p=>p.some((v,a)=>Math.abs(v-min[a])>1e-4&&Math.abs(v-max[a])>1e-4)))continue;
  const size=max.map((v,a)=>Math.max(.022,v-min[a]));if(!isNeonStrip(size))continue;
  runs.push({indices:g.indices,size,position:max.map((v,a)=>(v+min[a])/2)});
 }
 return runs;
}

export function replaceBakedNeonMesh(mesh,neons){
 const g=mesh.geometry,p=g.attributes.position,index=g.index?.array||Array.from({length:p.count},(_,i)=>i),faces=[];
 for(let i=0;i<index.length;i+=3)faces.push([0,1,2].map(k=>{const j=index[i+k];return [p.getX(j),p.getY(j),p.getZ(j)];}));
 const removed=new Set();for(const run of findBakedNeonRuns(faces))if(neons.box(mesh.material,run.size,run.position,[0,0,0],mesh.parent))for(const i of run.indices)removed.add(i);
 if(removed.size){g.setIndex(Array.from(index).filter((_,i)=>!removed.has(Math.floor(i/3))));g.computeBoundingSphere();}
 return removed.size;
}
