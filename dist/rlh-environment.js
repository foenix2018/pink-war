// Adapted from user-owned foenix2018/RLH at 99698f7:
// vr-streetscape-v748 asphaltTexture, legacy-09 maintenance hangar,
// vehicle-fire-fx-v299 noise/finite particle pools. See docs/pink-wars/ADAPTATIONS_RLH_363_6.md.
import {Assembly,bevelBox,matrix,merge} from './geo.js';
const rng=seed=>()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);
export function rlhAsphaltTexture(T){
 const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d'),r=rng(7),w=512,h=512;
 g.fillStyle='#3a3f43';g.fillRect(0,0,w,h);
 for(let i=0;i<18000;i++){const v=90+(r()*110|0);g.fillStyle=`rgba(${v},${v},${v},.16)`;g.fillRect(r()*w,r()*h,1+r()*2,1+r()*2);}
 for(let i=0;i<5;i++){g.strokeStyle='rgba(16,16,18,.5)';g.lineWidth=1+r()*1.6;g.beginPath();let x=r()*w;g.moveTo(x,0);for(let y=0;y<h;y+=24){x+=(r()-.5)*18;g.lineTo(x,y);}g.stroke();}
 g.fillStyle='rgba(30,32,35,.35)';for(let i=0;i<3;i++)g.fillRect(r()*w,r()*h,80+r()*140,36+r()*80);
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;
}
function vapourTexture(T){
 const size=64,r=rng(299),layers=[4,8,16,32].map(n=>({n,a:Float32Array.from({length:n*n},r)})),data=new Uint8Array(size*size*4);
 const sample=(l,u,v)=>{const x=u*l.n,y=v*l.n,ix=Math.floor(x),iy=Math.floor(y);let a=x-ix,b=y-iy;a=a*a*(3-2*a);b=b*b*(3-2*b);const at=(i,j)=>l.a[(j%l.n)*l.n+i%l.n];return (at(ix,iy)*(1-a)+at(ix+1,iy)*a)*(1-b)+(at(ix,iy+1)*(1-a)+at(ix+1,iy+1)*a)*b;};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=x/size,v=y/size,k=(y*size+x)*4;let n=0,weight=.5;for(const l of layers){n+=sample(l,u,v)*weight;weight*=.5;}const fade=Math.max(0,1-Math.hypot(u-.5,v-.5)*2);data[k]=data[k+1]=data[k+2]=255;data[k+3]=Math.round(255*fade*fade*n);}
 const t=new T.DataTexture(data,size,size,T.RGBAFormat);t.magFilter=t.minFilter=T.LinearFilter;t.needsUpdate=true;return t;
}
export function createRlhEnvironment(T,parent,maps,{performance=false,textured=true,equipment=null}={}){
 const root=new T.Group();root.name='VESPER / adaptations RLH';parent.add(root);const a=new Assembly(),textures=[],owned=[],colliders=[];
 const metal=equipment?.paint||new T.MeshStandardMaterial({color:0x889595,roughness:.78,metalness:.18,map:maps.steel?.map});if(!equipment?.paint)owned.push(metal);
 const paint=new T.MeshStandardMaterial({color:0xb5aa7d,roughness:.94,metalness:0});owned.push(paint);
 const asphalt=new T.MeshStandardMaterial({color:0xb2b5b5,roughness:.94,metalness:0,polygonOffset:true,polygonOffsetFactor:-3});owned.push(asphalt);
 if(textured&&typeof document!=='undefined'){asphalt.map=rlhAsphaltTexture(T);textures.push(asphalt.map);}
 const box=(s,p,m=metal)=>a.add(bevelBox(...s,.008,1),m,matrix(p));
 // RLH's repaired road grain is localised to resurfaced areas. The photo PBR
 // asphalt remains underneath, so the whole district does not repeat one tile.
 const patches=[[-42,88,5.4,3.2],[-25,84,3.5,2.7],[-4,77,4,3],[1,35,3.1,6],[17,9,4.3,2.8],[18,-12,3.8,4.5]];
 for(const [x,z,w,d]of patches){a.add(new T.PlaneGeometry(w,d),asphalt,matrix([x,.043,z],[-Math.PI/2,0,0]),false);}
 // Worn loading-bay markings, inspired by RLH's industrial access routes.
 const r=rng(749);for(const x of [-34.6,-25.4])for(let z=75.8;z<80.4;z+=.45){if(r()<.22)continue;box([.09,.008,.31],[x,.055,z],paint);}
 // I sections: real flanges/webs rather than solid rectangular roof beams.
 function beam(x,y,z,length){
  for(const yy of [-.15,.15])box([length,.045,.20],[x,y+yy,z]);box([length,.27,.035],[x,y,z]);
  colliders.push({x,z,y:y-.173,hx:length/2,hz:.1,height:.346,surface:'metal',campaign:true,rlhBeam:true});
  for(const end of [-1,1]){box([.05,.34,.25],[x+end*(length/2-.08),y,z]);for(const yy of [-.1,.1])a.ball(metal,[x+end*(length/2-.12),y+yy,z+.13],[.021,.021,.012]);}
 }
 for(const z of [76,80])beam(-30,3.0,z,10);
 // Narrow braces attach to the real canopy posts and leave its centre open.
 for(const x of [-35,-25])for(const z of [76,80])a.limb(metal,[x,2.7,z],[x+(x===-35?.36:-.36),3.12,z],.024,.024);
 for(const x of [-35,-25])for(const z of [76,80])box([.16,.07,.16],[x,3.16,z]);
 // Exhaust attached to the service canopy, away from both traversable routes.
 a.limb(metal,[-34.5,.05,79.4],[-34.5,.86,79.4],.10,.10);a.limb(metal,[-34.5,.82,79.4],[-34.28,.82,79.4],.095,.095);
 colliders.push({x:-34.4,z:79.4,y:0,hx:.22,hz:.1,height:.93,surface:'metal',campaign:true});
 a.mount(root);a.setLevel(1);for(const m of a.meshes){m.castShadow=!performance&&m.material!==asphalt;m.receiveShadow=true;}
 const noise=vapourTexture(T);textures.push(noise);const mist=new T.MeshBasicMaterial({map:noise,transparent:true,opacity:.19,depthWrite:false,color:0xaebdbb,side:T.DoubleSide,toneMapped:true});owned.push(mist);
 const p1=new T.PlaneGeometry(1,1),p2=new T.PlaneGeometry(1,1).rotateY(Math.PI/2),g=merge([p1,p2]);p1.dispose();p2.dispose();
 const count=performance?8:16,steam=new T.InstancedMesh(g,mist,count);steam.frustumCulled=false;steam.name='Vapeur / installation active';root.add(steam);const dummy=new T.Object3D();
 function update(game){steam.visible=!!game.powerAlarm;if(!steam.visible)return;const t=game.time||0;for(let i=0;i<count;i++){const f=((t*.22+i/count)%1+1)%1;dummy.position.set(-34.28+f*.42+Math.sin(i*2.7)*f*.14,.87+f*1.1,79.4+Math.cos(i*1.4)*f*.13);dummy.rotation.y=i*2.3;dummy.scale.setScalar(Math.sin(f*Math.PI)*(.12+f*.45));dummy.updateMatrix();steam.setMatrixAt(i,dummy.matrix);}steam.instanceMatrix.needsUpdate=true;}
 update({powerAlarm:false});
 const stats=()=>({revision:'3.63.6',roadRepairs:patches.length,profiledBeams:2,steamParticles:count,steamActive:steam.visible,draws:a.meshes.length+1,colliders:colliders.length,triangles:a.meshes.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3,0)+count*4});
 return {root,colliders,update,stats,dispose(){root.removeFromParent();root.traverse(o=>o.geometry?.dispose());for(const m of owned)m.dispose();for(const t of textures)t.dispose();}};
}
