import {segmentBox} from './game-logic.js';
// Authored limits of the enclave, street and transit dock. These are real facade volumes.
export const M02_BOUNDS=Object.freeze({minX:-48,maxX:48,minZ:-98.8,maxZ:98.8});
export const M02_BOUNDARY=Object.freeze([
 {id:'ouest',x:-48,z:0,hx:.5,hz:99.3,y:0,height:32},
 {id:'est-sud',x:48,z:-96.65,hx:.5,hz:2.65,y:0,height:32},
 {id:'est-nord',x:48,z:6.65,hx:.5,hz:92.65,y:0,height:32},
 {id:'linteau-convoi',x:48,z:-90,hx:.5,hz:4,y:8,height:24},
 {id:'sas-convoi',x:58,z:-90,hx:.5,hz:4.5,y:0,height:12},
 {id:'sas-sud',x:53,z:-94.5,hx:5.5,hz:.5,y:0,height:12},
 {id:'sas-nord',x:53,z:-85.5,hx:5.5,hz:.5,y:0,height:12},
 {id:'enclave',x:0,z:98.8,hx:47.5,hz:.5,y:0,height:32},
 {id:'logistique',x:0,z:-98.8,hx:47.5,hz:.5,y:0,height:32}
].map(b=>Object.freeze({...b,kind:'m02-boundary',surface:'concrete'})));
export function stairBody(x,z,width,depth,top,base=0){return top>base?{x,z,hx:width/2,hz:depth/2,y:base,height:top-base,surface:'metal',kind:'stair-body',stairBody:true}:null;}
export function beyondDistrict(x,z,padding=0){return x<M02_BOUNDS.minX-padding||x>M02_BOUNDS.maxX+padding||z<M02_BOUNDS.minZ-padding||z>M02_BOUNDS.maxZ+padding;}
export function createM02Boundary(T,root,{materials,solid,sign}){
 const nodes=[],facade=materials.concrete.clone();
 const texture=new T.TextureLoader().load(new URL('./assets/ligne9/l9-concrete_wall_006_diff_512.jpg',import.meta.url).href);
 texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;facade.map=texture;facade.roughness=.92;

 for(const b of M02_BOUNDARY){
  const wall=solid(b.x,b.y+b.height/2,b.z,b.hx*2,b.height,b.hz*2,facade,true);
  wall.geometry=new T.BoxGeometry(b.hx*2,b.height,b.hz*2);wall.scale.set(1,1,1);
  const p=wall.geometry.attributes.position,n=wall.geometry.attributes.normal,uv=wall.geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))/4,(Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))/4);
  wall.name='M02 / façade de limite '+b.id;nodes.push(wall);
  if(b.id.startsWith('sas')||b.id==='linteau-convoi')continue;
  const side=b.hz>b.hx,length=side?b.hz*2:b.hx*2;
  for(let along=-length/2+4;along<length/2;along+=8){
   const x=side?b.x+(b.x<0?.6:-.6):b.x+along,z=side?b.z+along:b.z+(b.z<0?.6:-.6);
   solid(x,16,z,side?.35:1.1,32,side?1.1:.35,materials.iron,false);
   for(const y of [7,15,23])solid(x+(side?(b.x<0?.2:-.2):0),y,z+(side?0:(b.z<0?.2:-.2)),side?.12:5.8,.65,side?5.8:.12,materials.dark,false);
  }
  solid(b.x,4,b.z,side?1.1:b.hx*2,.28,side?b.hz*2:1.1,materials.rust,false);
 }
 sign('SAS DE FRET · ANNEAU LOGISTIQUE',57.4,5.4,-90,6,'#b9d3da',1);
 solid(53,-.06,-90,11,.12,8,materials.concrete,false);
 solid(53,8.15,-90,11,.3,8,materials.iron,true);
 for(const [text,x,z,yaw] of [['ENCLAVE DES ÉPARS · RÉSEAU DE SERVICE',0,98.2,Math.PI],['DIRECTOIRE · TOUR DE TRANSIT · FRET CONTRÔLÉ',0,-98.2,0]]){
  const label=sign(text,x,6,z,14,'#b9d3da');label.rotation.y=yaw;
 }
 return{nodes,bounds:M02_BOUNDS};
}

// A long rifle or XR controller must not create a projectile on the far side of cover.
export function muzzleBeforeCover(player,muzzle,obstacles){
 const eye={x:player.x,y:(player.elevation||0)+(player.crouched?.8:1.4),z:player.z};
 const length=Math.hypot(muzzle.x-eye.x,muzzle.y-eye.y,muzzle.z-eye.z);
 let nearest=1;for(const box of obstacles){const hit=segmentBox(eye,muzzle,box);if(hit!==null)nearest=Math.min(nearest,Math.max(0,hit-.025/Math.max(.025,length)));}
 return nearest===1?muzzle:{x:eye.x+(muzzle.x-eye.x)*nearest,y:eye.y+(muzzle.y-eye.y)*nearest,z:eye.z+(muzzle.z-eye.z)*nearest};
}
