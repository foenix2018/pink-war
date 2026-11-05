// Dedicated fortified survival arena. All dimensions in metres; front wall at -Z.
// Static architecture is merged by material. Searchlight illumination is pooled.
import {Assembly,matrix,bevelBox} from './geo.js';
import {ARENA_TURRETS} from './arena-defense.js';
import {createArenaTurretArt} from './arena-turret-art.js';
export const FORTRESS_HALF=99.1,FORTRESS_HEIGHT=14;
export const FORTRESS_WALLS=Object.freeze([
 {x:0,z:-100.5,hx:102,hz:1.4},{x:0,z:100.5,hx:102,hz:1.4},
 {x:-100.5,z:0,hx:1.4,hz:102},{x:100.5,z:0,hx:1.4,hz:102}
].map(w=>Object.freeze({...w,height:FORTRESS_HEIGHT,perimeter:true,surface:'concrete',kind:'fortress-wall'})));
export function paintFortressSky(c,w,h){
 const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#100d19');g.addColorStop(.40,'#211625');g.addColorStop(.53,'#553048');g.addColorStop(.68,'#251824');g.addColorStop(1,'#0d0d17');c.fillStyle=g;c.fillRect(0,0,w,h);
 let seed=193;const r=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 for(let i=0;i<90;i++){const x=r()*w,y=h*(.2+r()*.34),rx=w*(.025+r()*.08),ry=h*(.007+r()*.025);c.save();c.translate(x,y);c.scale(1,ry/rx);const cloud=c.createRadialGradient(0,0,0,0,0,rx);cloud.addColorStop(0,i%3?'rgba(102,47,78,.15)':'rgba(10,10,22,.20)');cloud.addColorStop(1,'rgba(30,14,32,0)');c.fillStyle=cloud;c.fillRect(-rx,-rx,rx*2,rx*2);c.restore();}
}
export function createFortifiedArena(T,scene,obstacles,coverWalls,{quality='low',environment=null}={}){
 const low=quality==='low',root=new T.Group();root.name='ARÈNE / enceinte fortifiée';scene.add(root);
 let seed=71019;const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const owned=[],maps=[],a=new Assembly(),beams=[],beacons=[],spots=[],panels=[],stat={map:'fortified-arena',perimeterHeight:14,perimeterKind:'armoured-wall',perimeterWalls:4,towers:0,searchlights:0,meshes:0,triangles:0};
 const std=(name,color,roughness=.75,metalness=.1)=>{const m=new T.MeshStandardMaterial({name,color,roughness,metalness});owned.push(m);return m;};
 const M={concrete:std('béton graphite',0x98939b,.86),steel:std('acier patiné',0x737b85,.45,.75),black:std('joints',0x151a22,.7,.35),rust:std('acier oxydé',0x4c3136,.9,.4),yellow:std('signalétique ivoire',0xb8ada3,.85),leaf:std('feuillage',0x33463b),road:std('asphalte humide',0x92909b,.55,.12),paint:std('panneaux blindés',0x3c424e,.6,.65),wet:std('flaques',0x10111a,.16,.30),cloth:std('bannières',0x722443,.92)};
 M.cloth.side=T.DoubleSide;
 if(environment)for(const m of [M.steel,M.paint,M.wet]){m.envMap=environment;m.envMapIntensity=m===M.wet?.18:.48;}
 const arenaFill=new T.AmbientLight(0xb594aa,1.45);root.add(arenaFill);
 const pink=new T.MeshBasicMaterial({name:'balises magenta',color:0xff247e,toneMapped:false}),white=new T.MeshBasicMaterial({name:'projecteurs',color:0xc7e6ff,toneMapped:false});owned.push(pink,white);M.accent=pink;
 const canvas=(w,h,paint)=>{if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;maps.push(map);return map;};
 const load=(name,m,tile)=>{if(typeof document==='undefined')return;const t=new T.TextureLoader().load('./assets/cc0/'+name+'_diff_512.jpg');t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=low?2:4;m.map=t;m.bumpMap=t;m.bumpScale=.025;m.userData.tile=tile;maps.push(t);};
 load('vesper-concrete',M.concrete,3);load('vesper-steel',M.steel,2);load('rusty_painted_metal',M.paint,2);load('vesper-asphalt',M.road,4);
 let frame=new T.Matrix4();
 const add=(g,m,p=[0,0,0],r=[0,0,0])=>{a.add(g,m,frame.clone().multiply(matrix(p,r)),!low&&!m.transparent);g.dispose();};
 const box=(m,s,p,r=[0,0,0],soft=false)=>{const g=soft?bevelBox(...s,.06,1):new T.BoxGeometry(...s);const uv=g.attributes.uv,pos=g.attributes.position,n=g.attributes.normal,t=m.userData.tile||2;
 for(let i=0;i<uv.count;i++){const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i));uv.setXY(i,(ax>.6?pos.getZ(i):pos.getX(i))/t,(ay>.6?pos.getZ(i):pos.getY(i))/t);}add(g,m,p,r);};
 const rod=(m,p,q,r=.04)=>{const u=new T.Vector3(...p),v=new T.Vector3(...q),d=v.clone().sub(u),g=new T.CylinderGeometry(r,r,d.length(),low?6:8);const rot=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());const transform=new T.Matrix4().compose(u.add(v).multiplyScalar(.5),rot,new T.Vector3(1,1,1));a.add(g,m,frame.clone().multiply(transform),!low);g.dispose();};
 const labelMap=canvas(512,512,(c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle='#c6b8b7';c.textBaseline='middle';for(let row=0;row<4;row++){c.font='bold 78px monospace';c.fillText(['A-03','G-01','SECTEUR 07','ORDRE'][row],15,row*128+48);c.font='19px monospace';c.fillText('CONFINEMENT / VESPER',18,row*128+102);}});
 const labelMat=std('marquages',0xffffff,.88);labelMat.map=labelMap;labelMat.transparent=true;labelMat.alphaTest=.1;
 const label=(i,p,w=3,h=1.2)=>{if(!labelMap)return;const g=new T.PlaneGeometry(w,h),uv=g.attributes.uv;for(let k=0;k<uv.count;k++)uv.setY(k,(3-i+uv.getY(k))/4);add(g,labelMat,p);};
 const bannerMap=canvas(256,512,(c,w,h)=>{c.fillStyle='#76213e';c.fillRect(0,0,w,h);c.fillStyle='#d25480';c.beginPath();c.moveTo(36,110);c.lineTo(220,110);c.lineTo(128,230);c.closePath();c.fill();c.fillStyle='#76213e';c.beginPath();c.moveTo(75,130);c.lineTo(182,130);c.lineTo(128,192);c.closePath();c.fill();c.fillStyle='#d25480';c.fillRect(119,175,18,62);c.font='bold 25px monospace';c.fillText('ORDRE',85,290);c.font='12px monospace';c.fillText('VESPER / 07',79,325);});M.cloth.map=bannerMap;
 const haloMap=canvas(128,128,(c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(255,80,164,.65)');g.addColorStop(.2,'rgba(255,40,120,.25)');g.addColorStop(1,'rgba(255,20,100,0)');c.fillStyle=g;c.fillRect(0,0,w,h);});
 const haloMat=new T.SpriteMaterial({map:haloMap,color:0xff5fa8,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:.55});owned.push(haloMat);
 const halo=(p,scale)=>{if(!haloMap)return;const m=new T.Sprite(haloMat);m.position.copy(new T.Vector3(...p).applyMatrix4(frame));m.scale.set(...scale);root.add(m);};
 const sides=[[0,-100.5,0],[100.5,0,-Math.PI/2],[0,100.5,Math.PI],[-100.5,0,Math.PI/2]];
 const beamMat=new T.MeshBasicMaterial({color:0xbad8ff,transparent:true,opacity:.075,fog:false,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});owned.push(beamMat);
 const beamAlpha=canvas(128,128,(c,w,h)=>{const g=c.createLinearGradient(0,0,w,0);g.addColorStop(0,'black');g.addColorStop(.4,'#777');g.addColorStop(.6,'#777');g.addColorStop(1,'black');c.fillStyle=g;c.fillRect(0,0,w,h);});if(beamAlpha){beamAlpha.colorSpace=T.NoColorSpace;beamMat.alphaMap=beamAlpha;}
 const cone=new T.ConeGeometry(1,1,low?14:24,1,true).translate(0,-.5,0);
 for(const [si,[sx,sz,yaw]] of sides.entries()){
  frame=matrix([sx,0,sz],[0,yaw,0]);
  // Continuous collision-backed wall. Panel joints and buttresses add depth.
  box(M.concrete,[204,12,2.8],[0,6,0]);box(M.black,[204,.5,3.2],[0,.4,.05]);
  box(M.steel,[204,.45,3.3],[0,12,.2]);box(M.paint,[204,1.6,.5],[0,12.8,1.45]);
  for(let u=-96;u<=96;u+=12){
   box(M.black,[.10,11,.05],[u,6,1.42]);box(M.paint,[11.6,.18,.08],[u+6,9.2,1.46]);
   box(M.steel,[.48,10.4,.5],[u,6,1.6]);box(M.concrete,[1.1,5.8,2.4],[u,3,2.2],[.22,0,0]);
   for(const yy of [3.7,5,6.3])rod(M.black,[u+.4,yy,1.5],[u+11.5,yy,1.5],.055);
   for(const k of [-.25,.25])box(M.steel,[.045,1.0,.05],[u+k,13.5,1.8]);
   box(M.steel,[12,.06,.06],[u+6,14,1.8]);box(M.steel,[12,.04,.04],[u+6,13.55,1.8]);
   if(u%24===0){box(M.black,[.8,4,.28],[u+1.1,7,1.6]);box(pink,[.14,3.3,.08],[u+1.1,7,1.79]);halo([u+1.1,7,1.9],[4,8,1]);label(0,[u+5.5,4,1.46]);}
   if(!low)for(const yy of [2,10])for(const uu of [u+.5,u+11.5])add(new T.CylinderGeometry(.06,.06,.04,6),M.steel,[uu,yy,1.47],[Math.PI/2,0,0]);
  }
  // Recessed maintenance bays, louvres, exposed conduits and armoured transformer cabinets.
  for(const u of [-66,-18,18,66]){
   box(M.black,[4.4,2.1,.14],[u,8,1.49]);
   for(let k=0;k<9;k++)box(M.steel,[4.1,.1,.28],[u,7.12+k*.22,1.63],[.28,0,0]);
   rod(M.rust,[u-2.8,.8,1.8],[u-2.8,10.5,1.8],.12);
   rod(M.steel,[u-2.8,10.5,1.8],[u+2.7,10.5,1.8],.12);
   for(const yy of [2,5,9])box(M.steel,[.42,.18,.34],[u-2.8,yy,1.8]);
  }
  for(const u of [-72,72]){
   const pos=new T.Vector3(u,0,5.5).applyMatrix4(frame);
   obstacles.push({x:pos.x,z:pos.z,hx:2.2,hz:2.2,height:2.7,kind:'fortress-generator',surface:'metal'});
   box(M.black,[4.4,.30,3.8],[u,.15,5.5],[],true);
   box(M.paint,[3.7,2.4,2.8],[u,1.5,5.5],[],true);
   for(let k=0;k<7;k++)box(M.steel,[2.6,.08,.15],[u,.7+k*.25,6.94]);
   box(M.black,[.42,1.9,.10],[u-1.5,1.5,6.94]);box(pink,[.13,1.6,.04],[u-1.5,1.5,7.01]);
   for(const du of [-1.2,1.2])rod(M.steel,[u+du,2.7,5],[u+du,3.3,5],.12);
  }
  // Sealed service gate, visually inset, physically as tall as the wall.
  box(M.black,[20,10.6,.5],[0,5.3,1.6]);
  for(const side of [-1,1]){
   box(M.paint,[9.3,8.9,.32],[side*4.8,4.8,1.95],[],true);
   box(M.steel,[.4,9.4,.45],[side*9.6,5,2.1]);box(M.black,[.06,8,.08],[side*.1,4.5,2.13]);
   box(pink,[4.4,.11,.06],[side*4.8,10.1,2]);
   box(pink,[.09,2,.06],[side*9.2,6.4,2.15]);
   for(let k=0;k<7;k++)box(k%2?M.black:M.yellow,[.45,1.15,.04],[side*(1.2+k*1.15),.85,2.14],[0,0,-.45]);
   for(const yy of [3.3,7.4])box(M.steel,[8.7,.1,.04],[side*4.8,yy,2.15]);
  }label(1,[4.7,5,2.15],3.7,1.6);label(2,[0,11.1,1.75],7,1.3);
  for(const u of [-48,48]){rod(M.steel,[u-2.4,11.7,2],[u+2.4,11.7,2],.07);
   const g=new T.PlaneGeometry(4.4,6.2,6,10),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)*3+p.getY(i))*.1);g.computeVertexNormals();
   const mesh=new T.Mesh(g,M.cloth);mesh.position.set(u,8.5,1.9);mesh.applyMatrix4(frame);root.add(mesh);panels.push(mesh);}
  for(const u of [-78,-26,26,78]){
   const wp=new T.Vector3(u,0,0).applyMatrix4(frame);
   const along=Math.abs(Math.cos(yaw))>.5;
   obstacles.push({x:wp.x,z:wp.z,hx:along?3.5:4.4,hz:along?4.4:3.5,height:19,surface:'concrete',kind:'defence-tower'});
   box(M.concrete,[5.2,15.3,5.2],[u,7.65,0],[],true);box(M.paint,[7.5,.6,7.8],[u,15.3,.4],[],true);
   box(M.black,[7,2.1,6.7],[u,16.65,.4]);box(pink,[6.6,1.3,.03],[u,16.65,3.78]);halo([u,16.65,3.9],[10,5,1]);box(pink,[6.8,.045,.04],[u,17.15,3.79]);
   for(const du of [-2.7,-1.35,0,1.35,2.7]){box(M.steel,[.11,2.0,.14],[u+du,16.6,3.8]);}
   box(M.steel,[8,.35,8],[u,17.9,.4],[],true);
   for(const du of [-3.6,3.6]){rod(M.steel,[u+du,18.1,-3],[u+du,19.1,-3]);rod(M.steel,[u+du,18.1,3.9],[u+du,19.1,3.9]);}
   for(const zz of [-3,3.9])rod(M.steel,[u-3.6,19.1,zz],[u+3.6,19.1,zz]);
   rod(M.black,[u,18,0],[u,22.5,0],.08);rod(M.steel,[u+.9,18,.2],[u+.9,21,.2],.035);
   const beacon=new T.Mesh(new T.SphereGeometry(.16,8,6),pink);beacon.position.set(u,22.5,0);beacon.applyMatrix4(frame);root.add(beacon);beacons.push(beacon);
   box(M.black,[1.3,.7,1],[u,17.8,4.3]);box(white,[.9,.35,.04],[u,17.7,4.84]);
   const origin=new T.Vector3(u,17.7,4.9).applyMatrix4(frame),mesh=new T.Mesh(cone,beamMat);root.add(mesh);
   beams.push({origin,mesh,side:si,u,phase:si*2+u*.07});stat.towers++;
  }
  for(const u of [-78,-48,-24,0,24,48,78])halo([u,1.3,5],[26,9,1]);
 }
 frame.identity();obstacles.push(...FORTRESS_WALLS.map(w=>({...w})));
 // Accessible sentry platforms share their exact positions with combat hitboxes.
 for(const t of ARENA_TURRETS){
  obstacles.push({x:t.x,z:t.z,hx:1.85,hz:1.85,height:.72,surface:'metal',kind:'sentry-base'});
  add(new T.CylinderGeometry(2.5,2.65,.16,low?16:24),M.black,[t.x,.08,t.z]);
  add(new T.TorusGeometry(2.6,.045,4,32),M.yellow,[t.x,.17,t.z],[Math.PI/2,0,0]);
  for(let i=0;i<8;i++){const angle=i*Math.PI/4;box(M.yellow,[.17,.015,.65],[t.x+Math.sin(angle)*2.15,.18,t.z+Math.cos(angle)*2.15],[0,angle,0]);}
 }
 // Physical cover stays in the same positions used by arena navigation.
 for(const o of coverWalls){obstacles.push({...o,surface:'concrete',cover:true});const w=o.hx*2,d=o.hz*2,h=o.height;
  box(M.concrete,[w,h,d],[o.x,h/2,o.z],[],true);box(M.steel,[w*.94,.10,d*.9],[o.x,h-.04,o.z]);
  for(const s of [-1,1]){box(M.black,[w*.80,.12,.04],[o.x,h*.62,o.z+s*(o.hz+.025)]);box(pink,[.35,.07,.04],[o.x-w*.30,h*.64,o.z+s*(o.hz+.05)]);}
 }
 // Low transport cases and thick barriers leave the central lanes unobstructed.
 for(const [x,z] of [[-35,-42],[37,-53],[-48,35],[46,53],[-65,-8],[62,16]]){
  obstacles.push({x,z,hx:3.2,hz:1.2,height:1.2,surface:'concrete',cover:true});box(M.concrete,[6.4,1.2,2.4],[x,.6,z],[],true);
  for(const s of [-1,1]){box(M.black,[.3,1.05,.08],[x+s*2.5,.6,z+1.22]);box(pink,[.5,.08,.05],[x+s*2.4,.9,z+1.27]);}
 }
 const floor=new T.Mesh(new T.PlaneGeometry(220,220),M.road);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;
 if(M.road.map)M.road.map.repeat.set(55,55);root.add(floor);
 // Distant industrial skyline is beyond the walls, never another combat obstacle.
 for(let i=0;i<52;i++){const side=i%4,j=Math.floor(i/4),u=-160+j*27,dep=140+(i%3)*18,h=22+(i*17%32),x=side<2?(side===0?-dep:dep):u,z=side<2?u:(side===2?-dep:dep);
  box(M.black,[10+(i%3)*4,h,13],[x,h/2,z]);box(M.paint,[6,h*.1,8],[x,h,z]);rod(M.black,[x,h,z],[x,h+9,z],.12);
  for(let k=0;k<4;k++)box(k%2?pink:white,[.12,3,.04],[x-3+k*2,h*.65,z+6.55]);}
 // Worn service lane and inset drains around the courtyard.
 for(const v of [-84,84])for(let u=-80;u<84;u+=8){
  box(M.yellow,[3.4,.012,.10],[u,.018,v]);box(M.yellow,[.10,.012,3.4],[v,.018,u]);
 }
 for(const v of [-92,92])for(let u=-80;u<=80;u+=20){
  box(M.black,[3,.018,.6],[u,.022,v]);
  for(let k=0;k<10;k++)box(M.steel,[.06,.02,.55],[u-1.35+k*.3,.034,v]);
 }
 const pools=[];for(let i=0;i<38;i++){const x=(rnd()-.5)*186,z=(rnd()-.5)*186,rx=1.3+rnd()*4,rz=1+rnd()*5;
  const g=new T.CircleGeometry(1,low?20:32),p=g.attributes.position;for(let k=1;k<p.count;k++){const f=.75+rnd()*.3;p.setXY(k,p.getX(k)*f,p.getY(k)*f);}g.computeVertexNormals();
  const pool=new T.Mesh(g,M.wet);pool.rotation.x=-Math.PI/2;pool.position.set(x,.012,z);pool.scale.set(rx,rz,1);root.add(pool);pools.push([x,z,rx,rz]);}
 const shine=canvas(128,256,(c,w,h)=>{c.clearRect(0,0,w,h);for(let i=0;i<170;i++){c.fillStyle=`rgba(255,45,138,${.04+rnd()*.24})`;const yy=rnd()*h;c.fillRect(w*.5+(rnd()-.5)*45,yy,5+rnd()*40,1+rnd()*2);}});
 if(shine){const m=new T.MeshBasicMaterial({map:shine,transparent:true,opacity:.6,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});owned.push(m);
  for(const [x,z,rx,rz] of pools){const refl=new T.Mesh(new T.PlaneGeometry(rx*1.4,rz*1.8),m);refl.rotation.x=-Math.PI/2;refl.position.set(x,.016,z);root.add(refl);}}
 const hazeMap=canvas(128,128,(c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(200,120,170,.35)');g.addColorStop(1,'rgba(80,20,50,0)');c.fillStyle=g;c.fillRect(0,0,w,h);});
 const haze=[];if(hazeMap)for(let i=0;i<(low?6:10);i++){const m=new T.SpriteMaterial({map:hazeMap,color:0xbb5b8e,transparent:true,opacity:.55,depthWrite:false});owned.push(m);const mesh=new T.Sprite(m);mesh.position.set((rnd()-.5)*170,2.5,(rnd()-.5)*170);mesh.scale.set(90,18,1);root.add(mesh);haze.push({mesh,x:mesh.position.x});}
 const rainGeo=new T.BufferGeometry(),n=low?500:1500,rainPos=new Float32Array(n*3);for(let i=0;i<n;i++){rainPos[i*3]=(rnd()-.5)*195;rainPos[i*3+1]=rnd()*24;rainPos[i*3+2]=(rnd()-.5)*195;}
 rainGeo.setAttribute('position',new T.BufferAttribute(rainPos,3));const rainMat=new T.PointsMaterial({color:0x93a1b9,size:.035,transparent:true,opacity:.34,depthWrite:false});owned.push(rainMat);root.add(new T.Points(rainGeo,rainMat));
 for(let i=0;i<(low?2:3);i++){const light=new T.SpotLight(0xc6ddff,75,105,.24,.7,1.4);light.castShadow=false;root.add(light,light.target);spots.push(light);}
 const floods=[];for(let i=0;i<2;i++){const l=new T.PointLight(0xff227b,180,90,1.35);l.position.set(i?50:-50,7,-76);root.add(l);floods.push(l);}
 const turretArt=createArenaTurretArt(T,root,M,{low});
 a.build(root);for(const item of a.items)item.geometry.dispose();a.items.length=0;
 root.traverse(o=>{if(o.isMesh){stat.meshes++;const g=o.geometry;stat.triangles+=(g.index?.count||g.attributes.position.count)/3;o.castShadow=!low&&!o.material.transparent&&!o.material.isMeshBasicMaterial;o.receiveShadow=true;}});
 stat.defenceTurrets=ARENA_TURRETS.length;stat.searchlights=beams.length;stat.dynamicLights=spots.length+floods.length;
 let previous=0;const down=new T.Vector3(0,-1,0),dir=new T.Vector3(),target=new T.Vector3();
 const update=(t,eye={x:0,z:0})=>{if(!root.visible)return;const dt=Math.max(0,Math.min(.08,t-previous));previous=t;
  for(const b of beams){const sweep=Math.sin(t*.16+b.phase)*30;target.set(b.origin.x*.45+sweep,0,b.origin.z*.45+Math.cos(t*.13+b.phase)*12);dir.copy(target).sub(b.origin);const length=dir.length();b.mesh.position.copy(b.origin);b.mesh.quaternion.setFromUnitVectors(down,dir.normalize());b.mesh.scale.set(length*.13,length,length*.13);if(!b.target)b.target=new T.Vector3();b.target.copy(target);}
  const nearest=[...beams].sort((a,b)=>(a.origin.x-eye.x)**2+(a.origin.z-eye.z)**2-((b.origin.x-eye.x)**2+(b.origin.z-eye.z)**2));
  spots.forEach((l,i)=>{const b=nearest[i];l.position.copy(b.origin);l.target.position.copy(b.target);});
  for(let i=0;i<beacons.length;i++)beacons[i].scale.setScalar(1+Math.max(0,Math.sin(t*3+i))*.35);
  for(let i=0;i<haze.length;i++)haze[i].mesh.position.x=haze[i].x+Math.sin(t*.08+i)*3;
  for(let i=0;i<n;i++){rainPos[i*3+1]-=dt*(10+(i%4));if(rainPos[i*3+1]<0)rainPos[i*3+1]+=24;}rainGeo.attributes.position.needsUpdate=true;
 };
 update(0);return {group:root,materials:M,stats:stat,update,sync:turretArt.sync,reset:turretArt.reset,enablePbr(){},setAccent(){},fence:null};
}
