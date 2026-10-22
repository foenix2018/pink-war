// PINK WARS / M02 "SOUS LES NÉONS" — isolated vertical-slice test.
// Simulation, collisions, jump, stamina/health, weapons and hostiles are
// imported unchanged from the production game. The cyberpunk world is new.
import * as T from './vendor/three.webgpu.min.js';
import {WebGLRenderer} from './vendor/three.module.min.js';
import {ArenaGame,WEAPONS,clamp} from './game-logic.js';
import {DesktopGamepadInput,desktopAxis} from './desktop-input.js';
import {createCompatibleRenderer,graphicsProfile,renderPixelRatio} from './renderer-policy.js';
import {createEnemyFactory} from './enemies.js';
import {buildGun} from './weapons.js';
import {createCharacterKit} from './soldier.js';

const $=id=>document.getElementById(id);
const main=$('game'),shade=$('shade'),startButton=$('start'),status=$('status');
const quality=$('quality'),hud=$('hud');
const low=()=>quality.value==='low';
const rng=(()=>{let s=220102;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};})();
let canvas=main,renderer,scene,camera,game,weapon,clock=0,running=false,started=false,last=0,fpsTime=0,frames=0;
let yaw=0,pitch=0,weaponKick=0,stage=0,reported=-1;
let noticeUntil=0,signal=0, rain,enemyFactory,root;
const keys=new Set(),input=new DesktopGamepadInput(),enemyMeshes=new Map(),shotMeshes=new Map();
const collisions=[],floors=[],beacons=[],lightSources=[],decals=[];
const field={minX:-42,maxX:42,minZ:-81,maxZ:79};
const objectives=[
 {x:0,z:53,y:0,label:'LOCALISER LES CIVILS',description:'Rejoins le poste de soins clandestin à l’entrée de la ruelle.'},
 {x:-8,z:14,y:0,label:'LIBÉRER LA GALERIE',description:'Repousse la patrouille, puis consulte le terminal HELIX.'},
 {x:0,z:-18,y:12,label:'REJOINDRE LES PASSERELLES',description:'Monte par le véritable escalier à droite jusqu’à +12 m.'},
 {x:-5,z:-57,y:0,label:'OUVRIR LA TOUR DE TRANSIT',description:'Descends à gauche et déverrouille l’évacuation.'}
];
function mat(hex,rough=.8,metal=.1){return new T.MeshStandardMaterial({color:hex,roughness:rough,metalness:metal});}
function glow(hex){return new T.MeshBasicMaterial({color:hex,toneMapped:false});}
const materials={
 asphalt:mat(0x111d26,.33,.34),road:mat(0x26323b,.52,.26),concrete:mat(0x2e3743,.9,.04),
 dark:mat(0x121a25,.58,.62),iron:mat(0x3b4752,.45,.76),wall:mat(0x344350,.78,.21),
 plaster:mat(0x63727b,.88,.08),rust:mat(0x514138,.84,.58),glass:mat(0x213e4a,.16,.56),
 black:mat(0x071019,.69,.32),warning:mat(0x94754d,.66,.32),
 cyan:glow(0x3acddd),amber:glow(0xf6aa58),red:glow(0xe34e5b),
 rose:glow(0xff4fa1),blue:glow(0x4ba8ff),white:glow(0xc2e5eb)
};
const cube=new T.BoxGeometry(1,1,1), plane=new T.PlaneGeometry(1,1);
function solid(x,y,z,w,h,d,m,collide=true,shadow=true){
 const o=new T.Mesh(cube,m);o.position.set(x,y,z);o.scale.set(w,h,d);o.receiveShadow=shadow;o.castShadow=shadow&&!low();root.add(o);
 if(collide)collisions.push({x,z,hx:w/2,hz:d/2,y:y-h/2,height:h,surface:m===materials.iron?'metal':'concrete'});
 return o;
}
function beam(a,b,r=.04,m=materials.iron,radial=6){
 const p=new T.Vector3(...a),q=new T.Vector3(...b),d=new T.Vector3().subVectors(q,p);
 const o=new T.Mesh(new T.CylinderGeometry(r,r,d.length(),radial),m);
 o.position.copy(p).add(q).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());root.add(o);return o;
}
function plate(x,y,z,w,h,m,rotate=0){const o=new T.Mesh(plane,m);o.position.set(x,y,z);o.scale.set(w,h,1);o.rotation.y=rotate;root.add(o);return o;}
function walkway(x,z,w,d,height,id='deck'){
 floors.push({x,z,hx:w/2,hz:d/2,height,id});
 collisions.push({x,z,hx:w/2,hz:d/2,y:height-.13,height:.13,walkableSurface:true,surface:'metal'});
}
const traversal={
 routes:[],lifts:[],
 surfaces(x,z){return floors.filter(s=>Math.abs(x-s.x)<=s.hx&&Math.abs(z-s.z)<=s.hz).map(s=>({id:s.id,height:s.height}));},
 height(x,z,time=0,max=Infinity){let h=0;for(const s of floors)if(s.height<=max+.01&&Math.abs(x-s.x)<=s.hx&&Math.abs(z-s.z)<=s.hz)h=Math.max(h,s.height);return h;},
 routeForSurface(){return null;}
};
function canvasTexture(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');paint(ctx,w,h);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;}
function sign(text,x,y,z,width,color,side=1){
 const tex=canvasTexture(512,160,(c,w,h)=>{
  c.fillStyle='#07131b';c.fillRect(0,0,w,h);c.strokeStyle=color;c.lineWidth=9;c.strokeRect(5,5,w-10,h-10);
  c.fillStyle=color;c.shadowColor=color;c.shadowBlur=18;c.textAlign='center';c.textBaseline='middle';
  c.font='900 '+(text.length>11?43:58)+'px system-ui';c.fillText(text,w/2,h/2,w-32);
 });
 const mesh=new T.Mesh(new T.PlaneGeometry(width,width*160/512),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide,toneMapped:false}));
 mesh.position.set(x,y,z);mesh.rotation.y=side*Math.PI/2;root.add(mesh);
 solid(x,y,z,width*.025,width*.31,.15,materials.iron,false,false);
}
function mark(x,y,z,hex=0x66dbe8){
 const group=new T.Group();group.position.set(x,y,z);
 group.add(new T.Mesh(new T.CylinderGeometry(.58,.7,.12,24),materials.iron));
 const halo=new T.Mesh(new T.TorusGeometry(.7,.027,6,32),glow(hex));halo.rotation.x=-Math.PI/2;halo.position.y=.18;group.add(halo);
 const rod=new T.Mesh(new T.CylinderGeometry(.05,.05,1.4,8),materials.black);rod.position.y=.75;group.add(rod);
 const dot=new T.Mesh(new T.IcosahedronGeometry(.19,1),glow(hex));dot.position.y=1.6;group.add(dot);root.add(group);
 beacons.push({group,halo,dot});
}
function pipesAlongFacade(x,z,len,height){
 for(let j=0;j<2;j++){const xx=x+(x>0?-.11:.11),zz=z-len/2+.9+j*1.15;
  beam([xx,1,zz],[xx,height-1,zz],.09,j?materials.rust:materials.iron,7);
  for(let y=5;y<height-2;y+=6)beam([xx,y,zz],[xx-(x>0?1:-1),y,zz],.07,materials.iron);
 }
 for(let j=0;j<2;j++)beam([x,2.2+j*3.4,z-len/2+.4],[x,2.2+j*3.4,z+len/2-.4],.07,materials.iron);
}
function shopInterior(side,z){
 // A genuinely enterable market bay: three walls, not a solid fake façade.
 const ix=side*21,w=13,d=16,inside=side*13.2;
 solid(ix,6.3,z-side*.3,w,12.6,d,materials.dark,false);
 solid(side*28.2,4.1,z,1.1,8.2,d,materials.wall,true);
 solid(ix,4.4,z-d/2,.8,8.8,w,materials.iron,false);
 solid(ix,4.4,z+d/2,.8,8.8,w,materials.iron,false);
 for(const depth of [-6.2,6.2])solid(ix,4.1,z+depth,w,8.2,.46,materials.wall,true);
 solid(inside,4,z-5,.45,8,4.6,materials.wall,true);
 solid(inside,4,z+5,.45,8,4.6,materials.wall,true);
 solid(inside,7.25,z,.35,1.5,5.4,materials.wall,true);
 for(let a=0;a<4;a++){
  const bx=side*(18+a%2*4),bz=z-4+Math.floor(a/2)*8;
  solid(bx,.9,bz,2.1,1.8,.9,materials.iron,true);
  for(let k=0;k<3;k++)solid(bx,1.1+k*.19,bz,1.75,.08,.75,materials.warning,false);
 }
 solid(side*23,1.15,z+3,2.8,2.3,1,materials.wall,true);
 plate(side*22.4,2.25,z+3,1.4,.8,materials.cyan,side*Math.PI/2);
 sign(side<0?'HELIX DATA':'MARKET',side*12.7,5.6,z-6,3.6,side<0?'#42f0f6':'#ffb875',side);
}
function tower(side,z,idx){
 const xx=side*(23+(idx%2)*3),height=24+(idx*7%28),w=18+(idx%3)*3,d=17;
 // Façade with slight setbacks, recessed bays and three-dimensional mullions.
 solid(xx,height/2,z,w,height,d,idx%3===0?materials.plaster:materials.wall,true);
 solid(xx,height*.72,z,w+.3,.45,d+.4,materials.iron,false);
 const front=xx-side*w/2,night=idx%3===0;
 for(let y=4;y<height-2;y+=3.15){
  solid(front-side*.15,y,z,w*.02,.10,d-.8,materials.dark,false);
  for(let j=-3;j<=3;j++){
   const zz=z+j*2.1;if(Math.abs(zz-z)>d/2-.8)continue;
   const lit=rng()>(night?.56:.72);
   solid(front-side*.18,y+.6,zz,.08,1.2,1.28,lit?(rng()>.65?materials.cyan:materials.amber):materials.glass,false,false);
   solid(front-side*.25,y+.6,zz+.72,.12,1.7,.09,materials.iron,false);
  }
 }
 for(let j=0;j<3;j++)solid(front-side*.4,2.4,z-d*.33+j*d*.33,.8,3.5,1.3,materials.iron,false);
 for(let y=9;y<height-3;y+=9){
  solid(front-side*1, y, z,2.4,.23,d-1,materials.iron,false);
  for(let i=0;i<5;i++)beam([front-side*2.1,y+.1,z-d/2+.8+i*(d-1.6)/4],
     [front-side*2.1,y+1.25,z-d/2+.8+i*(d-1.6)/4],.06,materials.iron);
 }
 pipesAlongFacade(front-side*.45,z,d,height);
 for(let i=0;i<3;i++)solid(xx+(i-1)*3,height+.7,z+(i%2)*2,2.4,1.4,3.2,materials.iron,false);
}
function street(){
 solid(0,-.16,0,22,.3,158,materials.asphalt,false);
 // Inset pavement, drainage and regularly spaced utility grates.
 for(const side of [-1,1]){
  solid(side*10,0,0,2.7,.12,158,materials.concrete,false);
  solid(side*8.55,.11,0,.2,.24,158,materials.iron,false);
  for(let z=-73;z<=71;z+=9){
   solid(side*8.9,.14,z,.72,.045,1.4,materials.black,false);
   for(let k=0;k<4;k++)solid(side*8.9,.18,z-.48+k*.32,.65,.025,.05,materials.iron,false);
  }
 }
 for(let z=-70;z<70;z+=6){
  solid(0,.013,z,.10,.014,2.5,materials.warning,false,false);
  if(z%18===-16||z%18===2)solid(0,.013,z,17,.015,.07,materials.iron,false,false);
 }
 for(let i=0;i<42;i++){
  const x=(rng()-.5)*14,z=(rng()-.5)*145,w=.6+rng()*2.5,d=.3+rng()*1.8;
  const o=new T.Mesh(new T.CircleGeometry(1,22),new T.MeshStandardMaterial({color:i%3?0x1d414d:0x4d382e,metalness:.7,roughness:.16,transparent:true,opacity:.47,depthWrite:false}));
  o.rotation.x=-Math.PI/2;o.position.set(x,.018,z);o.scale.set(w,d,1);root.add(o);decals.push(o);
 }
 // Screen-space shimmer avoided: thin ground strips fake neon reflection at low GPU cost.
 for(let i=0;i<24;i++){
  const x=(rng()-.5)*14,z=-66+i*5.5,w=.8+rng()*2;
  solid(x,.022,z,w,.009,.06,i%3?materials.cyan:materials.amber,false,false);
 }
}
function blockBuildings(){
 for(let i=0;i<7;i++)for(const side of [-1,1]){
  const z=65-i*22;
  if((i===2&&side===-1)||(i===3&&side===1)){shopInterior(side,z);continue;}
  tower(side,z,i+(side>0?4:0));
 }
 // Distant volumetric skyline for dense city silhouette.
 for(let i=0;i<80;i++){
  const x=(rng()-.5)*145,z=(rng()-.5)*185;
  if(Math.abs(x)<35&&z>-80&&z<80)continue;
  const h=22+rng()*65,w=5+rng()*9;
  solid(x,h/2-.3,z,w,h,w,materials.black,false,false);
  if(rng()>.48)solid(x,h-.4,z,w*.6,.2,w*.6,i%2?materials.cyan:materials.amber,false,false);
 }
 // Telephone booths, wiring, carts, ducts, vending, awnings, scattered props.
 for(let z=60;z>-68;z-=17){
  const side=z%2?1:-1,x=side*8.8;
  solid(x,1.1,z,1.15,2.2,.9,materials.iron,true);
  solid(x-side*.1,1.6,z,.1,.55,.7,z%3?materials.cyan:materials.amber,false);
  solid(x,2.25,z,1.4,.15,1.15,materials.black,false);
  solid(-x,1.2,z+4,2.2,2.4,.75,materials.rust,true);
  for(let j=0;j<5;j++)solid(-x,.5+j*.26,z+4,1.6,.11,.4,materials.iron,false);
  const poleX=side*8.2;
  beam([poleX,0,z+7],[poleX,7.7,z+7],.1,materials.iron);
  beam([poleX,7.6,z+7],[poleX-side*2.7,7.6,z+7],.09,materials.iron);
  const fixture=new T.Mesh(new T.SphereGeometry(.22,8,6),z%3?materials.amber:materials.cyan);
  fixture.position.set(poleX-side*2.7,7.6,z+7);root.add(fixture);
 }
 for(let i=0;i<18;i++){
  const z=70-i*8.1,y=9+(i%4)*2,x0=-14,x1=14;
  beam([x0,y,z],[x1,y-1,z+2],.035,materials.black,5);
  if(i%3===0)beam([x0,y+1.2,z+.4],[x1,y+1,z+2],.05,materials.iron,5);
 }
 for(let i=0;i<12;i++){
  const z=60-i*12,side=i%2?1:-1;
  sign(['NEO MART','CLINIQUE','ARCHIVES','TRANSIT','24 / 7','FOOD','HELIX'][i%7],side*13,4.5+i%3*2,z,3.1,
   side>0?'#67eaf1':'#ffa75c',side);
 }
 // Environmental storytelling.
 for(let i=0;i<14;i++){
  const x=(i%2?1:-1)*(6.5+rng()*1.8),z=70-i*10;
  solid(x,.3,z,1.1,.6,.9,materials.rust,true);
  solid(x+.24,.72,z-.2,.65,.23,.6,materials.black,false);
 }
}
function stairsAndSkybridges(){
 const eastX=10.6,westX=-10.6,upN=72,step=.335,rise=12/upN;
 for(let i=0;i<upN;i++){
  const z=16.1-(i+.5)*step,h=(i+1)*rise;
  solid(eastX,h/2,z,2.55,h,step+.012,materials.iron,false);
  solid(eastX,h+.012,z,2.55,.028,step,materials.warning,false);
  walkway(eastX,z,2.55,step+.06,h,'east-stair-'+i);
  if(i%6===0)for(const side of [-1,1])beam([eastX+side*1.23,h+.02,z],[eastX+side*1.23,h+1.10,z],.045,materials.iron);
 }
 solid(eastX,11.87,-12.5,2.9,.26,12,materials.iron,false);
 walkway(eastX,-12.5,2.9,12,12,'upper-east');
 solid(0,11.85,-18,22,.3,3.05,materials.iron,false);
 walkway(0,-18,22,3.05,12,'crossbridge');
 for(let side of [-1,1]){
  const x=side*1.38;
  for(let i=-5;i<=5;i++){beam([i*2,12.1,-18+x],[i*2,13.3,-18+x],.06,materials.iron);}
  beam([-10.4,13.2,-18+x],[10.4,13.2,-18+x],.07,materials.iron);
  collisions.push({x:0,z:-18+x,hx:11,hz:.1,y:12,height:1.25,surface:'metal'});
 }
 for(let i=0;i<upN;i++){
  const z=-19.7-(i+.5)*step,h=12-(i+1)*rise;
  if(h<=0)continue;
  solid(westX,h/2,z,2.55,h,step+.012,materials.iron,false);
  solid(westX,h+.012,z,2.55,.03,step,materials.warning,false);
  walkway(westX,z,2.55,step+.07,h,'west-stair-'+i);
 }
 // Optional level +25 m to make the planned three vertical layers tangible.
 const roofX=-6.7,roofRise=13/72;
 for(let i=0;i<72;i++){
  const z=-19.8-(i+.5)*.36,h=12+(i+1)*roofRise;
  solid(roofX,(12+h)/2,z,2.4,h-12,.37,materials.iron,false);
  solid(roofX,h+.01,z,2.4,.03,.36,materials.iron,false);
  walkway(roofX,z,2.4,.40,h,'roof-stair-'+i);
 }
 solid(-9,24.85,-51,15,.30,13.5,materials.iron,false);
 walkway(-9,-51,15,13.5,25,'roof');
 for(let z=-57;z<-44;z+=2){
  beam([-16.25,25,z],[-16.25,26.2,z],.06,materials.iron);
 }
 beam([-16.25,26.2,-57],[-16.25,26.2,-44],.08,materials.iron);
 // Architectural braces and hanging lighting beneath the crossbridge.
 for(const side of [-1,1])beam([side*8,2,-18],[side*8,11.6,-18],.21,materials.iron,8);
 for(let i=-4;i<=4;i++)beam([i*2.2,11.5,-18],[i*2.2,12,-18],.06,materials.black);
}
function props(){
 // First enclave: believable aid station, shutters, mattresses, radio, kit.
 solid(-3,1,55,3.7,2,1.2,materials.iron,true);
 solid(-2.1,2.1,55,1.3,.5,.85,materials.dark,false);
 solid(-2,2.42,55,.9,.08,.42,materials.cyan,false);
 for(let i=0;i<3;i++){
  solid(-5+i*1.3,.22,58,1.1,.44,2.0,materials.plaster,false);
  solid(-5+i*1.3,.42,58,.8,.05,1.7,materials.warning,false);
 }
 sign('SECOURS',-12.8,4.2,53,3.2,'#66ffda',-1);
 // Market checkout + HELIX terminal.
 solid(-8,1.0,14,2.2,2,1.1,materials.black,true);
 solid(-8,2.05,13.7,1.7,.94,.25,materials.cyan,false);
 solid(-8,2.3,14,1.3,.08,.18,materials.iron,false);
 for(let i=0;i<9;i++){const z=29-i*2.2;solid((i%2?1:-1)*7,.5,z,1.2,1,1.15,materials.rust,true);}
 // Transit hall/end: large functional portal and automatic barrier.
 for(const side of [-1,1]){
  solid(side*4.1,4.2,-63,1.25,8.4,.8,materials.iron,true);
  beam([side*4.15,3.9,-62.5],[side*4.15,7.7,-62.5],.12,materials.cyan);
 }
 solid(0,8,-63,9,.65,1.3,materials.iron,false);
 sign('TRANSIT',-13,8.4,-61,4.3,'#86e4f1',-1);
 const door=solid(0,3.7,-63,.38,7.2,8,materials.black,false);door.visible=false;
 const terminal=solid(-5,1.1,-57,2.2,2.2,1.2,materials.iron,true);
 solid(-5,2.35,-56.6,1.9,1.1,.18,materials.cyan,false);
 for(const o of objectives)mark(o.x,o.y+.28,o.z,o.y>0?0xffc16c:0x6addf1);
}
function weather(){
 const count=low()?300:950,arr=new Float32Array(count*6);
 for(let i=0;i<count;i++){
  const x=(rng()-.5)*78,y=rng()*28,z=(rng()-.5)*165;
  arr.set([x,y,z,x-.08,y-.48,z-.07],i*6);
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(arr,3));
 rain=new T.LineSegments(geo,new T.LineBasicMaterial({color:0x7cbdd6,transparent:true,opacity:low()?.19:.27,depthWrite:false}));
 root.add(rain);
}
function createEnvironment(){
 scene.background=new T.Color(0x06111d);scene.fog=new T.FogExp2(0x091b2b,low()?.008:.010);
 root=new T.Group();root.name='M02 / W02 LES BAS-NIVEAUX';scene.add(root);
 const ambient=new T.HemisphereLight(0x739cbd,0x0b1018,2.0);scene.add(ambient);
 const moon=new T.DirectionalLight(0x86abc9,2.0);moon.position.set(-18,44,21);scene.add(moon);
 moon.castShadow=!low();moon.shadow.mapSize.set(low()?512:1024,low()?512:1024);
 Object.assign(moon.shadow.camera,{left:-48,right:48,top:48,bottom:-48,near:.1,far:125});
 for(let z=53;z>-57;z-=19){
  const x=(Math.round(z)%2===0?1:-1)*8.4;
  const lamp=new T.PointLight(z%3===0?0xe69b5a:0x5bd6ec,low()?1.1:1.8,18,2);
  lamp.position.set(x,6.5,z);scene.add(lamp);lightSources.push(lamp);
 }
 street();blockBuildings();stairsAndSkybridges();props();weather();
}
function enemyMaterials(){
 return {monster:materials.wall,monsterFace:materials.black,cyan:materials.cyan,rose:materials.rose,violet:materials.blue,pale:materials.white};
}
function setupPlayer(){
 game=new ArenaGame(collisions,Math.random,traversal);game.reset();
 Object.assign(game.player,{x:0,z:72,elevation:0,yaw:0,hp:100,grounded:true});
 game.wave=2;game.nextWave=Infinity;game.toSpawn=0;game.spawnTimer=Infinity;
 game.ownedWeapons=new Set([0,1,2]);game.ammo=WEAPONS.map(w=>w.capacity);
 const icon=canvasTexture(128,64,(c,w,h)=>{c.fillStyle='#160e28';c.fillRect(0,0,w,h);c.fillStyle='#ff80b9';c.font='900 22px sans-serif';c.fillText('GHJU',28,40);});
 const kit=createCharacterKit(icon);
 const pm={...materials,armor:kit.materials?.rose||materials.wall,armorLight:kit.materials?.pearl||materials.plaster,steel:materials.iron,rose:materials.rose,pale:materials.white};
 weapon=buildGun({mats:pm,gloves:kit.gloves,makeFlash:()=>{const o=new T.Mesh(new T.SphereGeometry(.07,8,6),materials.rose);o.visible=false;return o;}});
 camera.add(weapon);weapon.position.set(.23,-.30,-.59);weapon.rotation.set(-.07,-.045,-.09);
 weapon.userData.setVariant(0);
 enemyFactory=createEnemyFactory(enemyMaterials());
}
function createEnemies(){
 game.toSpawn=5;game.spawned=0;
 const sites=[{x:-1,z:22},{x:1,z:7},{x:0,z:-3},{x:2,z:-25},{x:-1,z:-34}];
 for(let i=0;i<5;i++){
  const p=sites[i];game.activePortals=[{id:100+i,x:p.x,z:p.z,yaw:0,openedAt:game.time}];
  game.spawnEnemy();const enemy=game.enemies.at(-1);
  if(enemy){
   enemy.awareness='search';enemy.alertedUntil=game.time+9;
   enemy.lastKnownX=game.player.x;enemy.lastKnownZ=game.player.z;
  }
 }
 game.activePortals=[];game.toSpawn=0;game.spawnTimer=Infinity;
 signal=5;notice('PATROUILLE HOSTILE DÉTECTÉE');
}
function notice(message){
 $('notice').textContent=message;$('notice').style.display='block';noticeUntil=clock+3.6;
}
function interact(){
 if(!running||game.state!=='playing')return;
 const o=objectives[stage];if(!o)return;
 const range=Math.hypot(game.player.x-o.x,game.player.z-o.z);
 if(range>3.3||Math.abs(game.player.elevation-o.y)>1.8)return;
 if(stage===0){stage=1;createEnemies();notice('ENCLAVE REPÉRÉE — NEUTRALISER LA PATROUILLE');}
 else if(stage===1){
  if(game.enemies.length>0){notice('TERMINAL VERROUILLÉ : MENACES ACTIVES');return;}
  stage=2;notice('ARCHIVES HELIX SAISIES — REJOINDRE LE PONT +12 M');
 }
 else if(stage===2){stage=3;notice('ACCÈS TRANSIT DÉVERROUILLÉ — DESCENDRE');}
 else if(stage===3){running=false;shade.style.display='grid';$('start').textContent='RECOMMENCER LE TEST →';
  $('status').textContent='M02 / objectif accompli · '+game.kills+' hostiles neutralisés · '+Math.floor(game.time)+' s';
  document.exitPointerLock?.();}
}
function snapCamera(){
 const p=game.player;camera.position.set(p.x,p.elevation+(p.crouched?1.0:1.68),p.z);
 camera.rotation.set(pitch,yaw,0,'YXZ');
}
function updateEnemies(dt){
 const live=new Set();
 for(const e of game.enemies){
  live.add(e.id);let model=enemyMeshes.get(e.id);
  if(!model){model=enemyFactory.create(e.elite,e.ranged,e.form);enemyMeshes.set(e.id,model);scene.add(model);}
  model.position.set(e.x,e.elevation,e.z);model.rotation.y=e.yaw||0;
  model.userData.animate?.(clock,e.phase,true,e,game.time);
 }
 for(const [id,o] of enemyMeshes)if(!live.has(id)){scene.remove(o);enemyMeshes.delete(id);}
 const active=new Set();
 for(const b of game.bullets){
  active.add(b.id);let mesh=shotMeshes.get(b.id);
  if(!mesh){mesh=new T.Mesh(new T.SphereGeometry(b.hostile?.07:.09,6,4),b.hostile?materials.red:materials.cyan);shotMeshes.set(b.id,mesh);scene.add(mesh);}
  mesh.position.set(b.x,b.y,b.z);
 }
 for(const [id,o] of shotMeshes)if(!active.has(id)){scene.remove(o);shotMeshes.delete(id);}
}
function gamepadInput(){
 const pad=input.select(navigator.getGamepads?.()||[],{focused:!document.hidden});if(!pad)return {};
 const a=pad.axes;const b=pad.buttons,down=i=>b[i]?.pressed||b[i]?.value>.5;
 yaw-=desktopAxis(a[2])*.055;pitch=clamp(pitch-desktopAxis(a[3])*.033,-1.25,1.18);
 return {x:desktopAxis(a[0]),z:desktopAxis(a[1]),jump:down(0),fire:down(7),sprint:down(10),reload:down(2),interact:down(11),crouch:down(1)};
}
let lastGamepadInteract=false,lastGamepadReload=false,lastGamepadCrouch=false,heldFire=false,keyCrouchQueued=false;
function gameTick(dt){
 const pad=gamepadInput();
 const x=(keys.has('KeyD')?1:0)-(keys.has('KeyA')||keys.has('KeyQ')?1:0)+(pad.x||0);
 const z=(keys.has('KeyS')?1:0)-(keys.has('KeyW')||keys.has('KeyZ')?1:0)+(pad.z||0);
 const jump=keys.has('Space')||pad.jump,sprint=keys.has('ShiftLeft')||keys.has('ShiftRight')||pad.sprint;
 const crouch=pad.crouch&&!lastGamepadCrouch;lastGamepadCrouch=!!pad.crouch;
 const interaction=pad.interact&&!lastGamepadInteract;lastGamepadInteract=!!pad.interact;
 const reload=pad.reload&&!lastGamepadReload;lastGamepadReload=!!pad.reload;
 if(reload)game.reload();if(interaction)interact();
 game.nextWave=Infinity;game.toSpawn=0;
 game.step(dt,{x,z,yaw,moveYaw:yaw,sprint,jump,crouchToggle:!!crouch||keyCrouchQueued});keyCrouchQueued=false;
 snapCamera();
 const direction=new T.Vector3();camera.getWorldDirection(direction);
 const aim={origin:{x:camera.position.x,y:camera.position.y-.12,z:camera.position.z},
  direction:{x:direction.x,y:direction.y,z:direction.z}};
 const firing=heldFire||!!pad.fire;
 game.trigger(firing,dt,aim.origin,aim.direction);
 if(game.weapon.melee)game.trigger(false,dt,aim.origin,aim.direction);
 updateEnemies(dt);
 const events=game.drainEvents();
 for(const e of events){
  if(e.type==='shot'){weaponKick=Math.min(.25,weaponKick+.085);}
  if(e.type==='damage'){$('damage').style.boxShadow='inset 0 0 105px #c52c5e77';}
  if(e.type==='kill'){notice('CIBLE NEUTRALISÉE');}
  if(e.type==='over'){running=false;shade.style.display='grid';$('start').textContent='RECOMMENCER LE TEST →';$('status').textContent='Intervention interrompue — santé épuisée';document.exitPointerLock?.();}
 }
 if(game.player.hp>0)$('damage').style.boxShadow='inset 0 0 '+(100-game.player.hp)*1.2+'px #c52c5e44';
 weaponKick=Math.max(0,weaponKick-dt*.7);weapon.position.z=-.59+weaponKick;
 weapon.userData.setCombatState?.({ammo:game.ammo[game.weaponIndex],capacity:game.weapon.capacity,time:game.time,
  charge:game.charge,reloading:game.reloadRemaining>0,reloadProgress:game.weapon.reload?1-game.reloadRemaining/game.weapon.reload:0});
 if(weapon.userData.index!==game.weaponIndex)weapon.userData.setVariant(game.weaponIndex);
 if(rain)rain.position.y=-(game.time*9%18);
 for(const b of beacons){b.halo.rotation.z+=dt*.4;b.dot.position.y=1.6+Math.sin(game.time*2)*.13;}
 updateHUD();
}
function updateHUD(){
 const o=objectives[stage]||objectives[3];
 $('objective').textContent=(stage+1)+'/4 · '+o.label;
 $('hint').textContent=o.description;
 $('hp').textContent=Math.ceil(game.player.hp);
 $('weapon').firstChild.nodeValue=game.weapon.name+' ';
 $('ammo').textContent=game.weapon.melee?'LAME':game.ammo[game.weaponIndex]+' / '+game.weapon.capacity;
 $('position').textContent='X '+game.player.x.toFixed(1)+' / Z '+game.player.z.toFixed(1)+' / ALT '+game.player.elevation.toFixed(1)+' m';
 const near=Math.hypot(game.player.x-o.x,game.player.z-o.z)<3.3&&Math.abs(game.player.elevation-o.y)<1.8;
 $('prompt').style.display=near?'block':'none';$('prompt').textContent='E / MANETTE : '+o.label;
 if(clock>noticeUntil)$('notice').style.display='none';
}
function animation(t){
 requestAnimationFrame(animation);
 const dt=Math.min(.040,Math.max(0,(t-last)/1000));last=t;
 if(!renderer||!scene)return;
 clock+=dt;
 if(running)gameTick(dt);
 if(scene&&camera)renderer.renderAsync?.(scene,camera)??renderer.render(scene,camera);
 frames++;fpsTime+=dt;if(fpsTime>.5){$('fps').textContent=Math.round(frames/fpsTime);frames=0;fpsTime=0;}
}
function resize(){
 if(!renderer)return;const width=innerWidth,height=innerHeight;
 camera.aspect=width/height;camera.updateProjectionMatrix();
 const profile=graphicsProfile({userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,gpu:navigator.gpu},low()?'low':'auto');
 renderer.setPixelRatio(renderPixelRatio(profile,devicePixelRatio,width,height));renderer.setSize(width,height,false);
}
async function boot(){
 status.textContent='Préparation du secteur et du moteur existant…';startButton.disabled=true;
 try{
  const environment={userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,gpu:navigator.gpu};
  const profile=graphicsProfile(environment,low()?'low':'auto');
  const prepared=await createCompatibleRenderer({canvas,WebGPU:T.WebGPURenderer,WebGL:WebGLRenderer,profile});
  canvas=prepared.canvas;renderer=prepared.renderer;
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.shadowMap.enabled=!low();renderer.shadowMap.type=T.PCFSoftShadowMap;
  scene=new T.Scene();camera=new T.PerspectiveCamera(67,innerWidth/innerHeight,.08,320);
  scene.add(camera);createEnvironment();setupPlayer();resize();
  $('renderer').textContent=renderer.isWebGLRenderer?'WebGL / repli':'WebGPU';
  if(prepared.initialFailure)console.warn('M02: WebGPU unavailable:',prepared.initialFailure);
  hud.hidden=false;started=true;requestAnimationFrame(animation);
  resume();
 }catch(error){
  console.error(error);status.textContent='Impossible de lancer : '+(error?.message||error);
  startButton.textContent='RÉESSAYER';startButton.disabled=false;
 }
}
function resume(){
 running=true;shade.style.display='none';startButton.disabled=false;
 if(game){game.reset();game.wave=2;game.ownedWeapons=new Set([0,1,2]);game.ammo=WEAPONS.map(w=>w.capacity);}
 if(game){game.player.x=0;game.player.z=72;game.player.elevation=0;game.player.hp=100;game.state='playing';
  game.enemies=[];game.bullets=[];game.time=0;game.kills=0;game.nextWave=Infinity;game.toSpawn=0;}
 for(const o of enemyMeshes.values())scene.remove(o);enemyMeshes.clear();
 for(const o of shotMeshes.values())scene.remove(o);shotMeshes.clear();
 yaw=0;pitch=0;stage=0;heldFire=false;keyCrouchQueued=false;keys.clear();
 canvas.requestPointerLock?.().catch?.(()=>{});
}
startButton.addEventListener('click',()=>started?resume():boot());
quality.addEventListener('change',()=>{if(!started)return;renderer.shadowMap.enabled=!low();resize();});
window.addEventListener('resize',resize);
window.addEventListener('keydown',e=>{
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 keys.add(e.code);if(!running)return;
 if(e.repeat)return;
 if(e.code==='KeyE')interact();
 if(e.code==='KeyR')game.reload();
 if(e.code==='KeyC')keyCrouchQueued=true;
 if(/^Digit[123]$/.test(e.code))game.selectWeapon(Number(e.code.slice(-1))-1);
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();heldFire=false;});
document.addEventListener('mousemove',e=>{
 if(document.pointerLockElement!==canvas||!running)return;
 yaw-=e.movementX*.0020;pitch=clamp(pitch-e.movementY*.002,-1.2,1.2);
});
window.addEventListener('mousedown',e=>{if(!running||(e.target!==canvas&&document.pointerLockElement!==canvas))return;if(e.button===0)heldFire=true;if(document.pointerLockElement!==canvas)canvas.requestPointerLock?.().catch?.(()=>{});});
window.addEventListener('mouseup',e=>{if(e.button===0)heldFire=false;});
document.addEventListener('visibilitychange',()=>{if(document.hidden){heldFire=false;keys.clear();}});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement)heldFire=false;});
