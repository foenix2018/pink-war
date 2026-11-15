// Retire complete visitor-map props, including their invisible hulls. The
// architectural shell, authored beds/benches and all mission coordinates survive.
const cache=new WeakMap();
const inside=(a,b,p=.035)=>a.x1>=b.x1-p&&a.x2<=b.x2+p&&a.y1>=b.y1-p&&a.y2<=b.y2+p&&a.z1>=b.z1-p&&a.z2<=b.z2+p;
export const M03_ROOM_RESETS=Object.freeze([
 {id:'annexe',x1:-44.45,x2:-13.25,z1:12.2,z2:51.7,ceiling:7.65},
 {id:'atelier',x1:18.95,x2:41.62,z1:18.1,z2:40.8,ceiling:6.65}
].map(Object.freeze));
export const MEDICAL_PARTITIONS=Object.freeze([
 {x:-34,z:31,width:15,height:4.5,depth:.3},
 {x:-19,z:31,width:4,height:4.5,depth:.3}
].map(Object.freeze));
const roomOf=b=>M03_ROOM_RESETS.find(r=>{
 const x=(b.x1+b.x2)/2,z=(b.z1+b.z2)/2,y=(b.y1+b.y2)/2;
 return x>r.x1&&x<r.x2&&z>r.z1&&z<r.z2&&y>.006&&y<r.ceiling;
});
const column=b=>b.y1<.15&&b.y2>7.5&&Math.max(b.x2-b.x1,b.z2-b.z1)<.95&&Math.min(b.x2-b.x1,b.z2-b.z1)>.4;
const partition=b=>MEDICAL_PARTITIONS.some(p=>inside(b,{x1:p.x-p.width/2,x2:p.x+p.width/2,y1:0,y2:p.height,z1:p.z-p.depth/2,z2:p.z+p.depth/2},.05));
const rack=b=>Math.abs((b.x1+b.x2)/2-41.5)<.1&&b.z1>20&&b.z2<38&&b.y2>5&&b.y2<5.6;

export function createM03Cleanup(meta){
 if(cache.has(meta))return cache.get(meta);
 const fieldKits=meta.colliders.filter(c=>{
  const a=c.x2-c.x1,b=c.z2-c.z1,h=c.y2-c.y1;
  return Math.abs(Math.min(a,b)-.58)<.015&&Math.abs(Math.max(a,b)-.62)<.015&&h>1.3&&h<6.2;
 });
 const dummies=meta.colliders.filter(c=>Math.abs(c.x2-c.x1-1)<.02&&Math.abs(c.z2-c.z1-.75)<.02&&Math.abs(c.y2-c.y1-2.7)<.03);
 const sculptures=meta.colliders.filter(c=>c.label==='géométrie'&&[
  [-32.93,34.484],[-55.3,-22.86],[42.287,-47.338],[-26.604,-58.973],
  [-38.258,-21.4025],[54.056,-89.9295],[-53.905,16.2695],
  [32.336,-44.884],[27.5255,.533],[-51.233,28.2615]
 ].some(([x,z])=>Math.hypot((c.x1+c.x2)/2-x,(c.z1+c.z2)/2-z)<.05));
 const wrecks=meta.colliders.filter(c=>c.label==='épave');
 const signs=Array.from({length:7},(_,j)=>{const x=j%2===0?16.65:-16.65,z=55-j*13.5;return{x1:x-.34,x2:x+.34,y1:2.05,y2:5.16,z1:z-.70,z2:z+.70};});
 const volumes=[...signs,...fieldKits.map(c=>({x1:c.x1-.65,x2:c.x2+.65,y1:0,y2:c.y2+.8,z1:c.z1-.65,z2:c.z2+.65})),
  ...dummies.map(c=>({x1:c.x1-.7,x2:c.x2+.7,y1:0,y2:3.65,z1:c.z1-.55,z2:c.z2+.55})),
  ...sculptures.map(c=>({...c,y1:0})),...wrecks.map(c=>({...c,x1:c.x1-.6,x2:c.x2+.6,y1:.065,y2:3.8,z1:c.z1-.6,z2:c.z2+.6}))];
 const cells=new Map(),empty=[];
 for(const v of volumes)for(let x=Math.floor(v.x1/8);x<=Math.floor(v.x2/8);x++)for(let z=Math.floor(v.z1/8);z<=Math.floor(v.z2/8);z++){
  const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(v);
 }
 const owns=b=>{const list=cells.get(Math.floor((b.x1+b.x2)/16)+','+Math.floor((b.z1+b.z2)/16))||empty;for(const v of list)if(inside(b,v))return true;return false;};
 const onStair=b=>meta.stairs.some(s=>b.x1>=s.x1-.12&&b.x2<=s.x2+.12&&b.z1>=s.zEnd-.3&&b.z2<=s.zStart+.3&&b.y2<=s.height+.25);
 const looseGround=b=>{
  const x=Math.abs((b.x1+b.x2)/2),z=(b.z1+b.z2)/2;
  return (b.mat===0||b.mat===undefined)&&x>=12.6&&x<=22.1&&z>-89&&z<55&&b.y1>=-.05&&b.y2>.12&&b.y2<1.8&&Math.max(b.x2-b.x1,b.z2-b.z1)<2&&!onStair(b);
 };
 const retiredFace=b=>{
  const w=b.x2-b.x1,h=b.y2-b.y1,d=b.z2-b.z1;
  if(Math.max(w*h,w*d,h*d)>60&&!partition(b))return false;
  return !!roomOf(b)||owns(b)||looseGround(b);
 };
 function retiredSolid(c){
  if(c.source==='page'||c.stairBody||column(c)||partition(c)||rack(c))return false;
  return !!roomOf(c)||owns(c)||looseGround(c);
 }
 const result={retiredFace,retiredSolid,retiredFloor:f=>retiredSolid({x1:f.x1,x2:f.x2,z1:f.z1,z2:f.z2,y1:f.height,y2:f.height}),
  stats:()=>({fieldKits:fieldKits.length,dummies:dummies.length,sculptures:sculptures.length,unsupportedSigns:signs.length,rebuiltWrecks:wrecks.length,resetRooms:M03_ROOM_RESETS.map(r=>r.id)})};
 cache.set(meta,result);return result;
}
