// Pink Wars — ARES X9. Géométrie procédurale transposée du visualiseur WebGPU validé.
// Conversion X longitudinal → -Z (repère des armes), pivot à la poignée, échelle métrique.
// Les pièces statiques sont fusionnées par matériau pour préserver les FPS.
import * as THREE from './vendor/three.webgpu.min.js';
import {bevelBox,merge} from './geo.js';
const P={ black:0x0b1015, midnight:0x121920, graphite:0x242b31, dark:0x1c242b, grey:0x434b52, titanium:0x737d81, pale:0xa0aaa9, gold:0x9a794d, copper:0xc79a64,glass:0x071a2c, blue:0x43bcf7 };
const material=(color,metalness=.7,roughness=.36,extras={})=>new THREE.MeshStandardMaterial({color,metalness,roughness,...extras});
const mat={dark:material(P.dark,.79,.35),black:material(P.black,.55,.5),graphite:material(P.graphite,.85,.3),body:material(P.grey,.82,.31),titan:material(P.titanium,.91,.27),lightmetal:material(P.pale,.89,.26),rubber:material(0x161c1e,.04,.91),carbon:material(0x222b31,.22,.82),gold:material(P.gold,.9,.28),copper:material(P.copper,.85,.28),gunmetal:material(0x313a3d,.91,.27),glass:material(P.glass,.24,.09,{emissive:0x071b2b,emissiveIntensity:.27}),inner:material(0x03070b,.12,.6),amber:new THREE.MeshStandardMaterial({color:0xf1b875,emissive:0xfca958,emissiveIntensity:2.6,metalness:.15,roughness:.22}),blue:new THREE.MeshBasicMaterial({color:0x3bc5ff,transparent:true,opacity:.92}),glassrim:material(0x31658e,.9,.17,{emissive:0x003351,emissiveIntensity:.5})};


mat.scratch=new THREE.MeshBasicMaterial({color:0xaab3ae,transparent:true,opacity:.17,depthWrite:false});
const goldLights=[],blueLights=[],scratches=[];let bipod;
function addObj(parent,geometry,m,x=0,y=0,z=0,rz=0){let o=new THREE.Mesh(geometry,m);o.position.set(x,y,z);o.rotation.z=rz;o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function box(parent,x,y,z,w,h,d,m,r=.025,angle=0){const g=r?bevelBox(Math.max(w,.012),Math.max(h,.012),Math.max(d,.012),Math.min(r,w*.3,h*.3,d*.3),1):new THREE.BoxGeometry(w,h,d);return addObj(parent,g,m,x,y,z,angle);}
function poly(parent,coords,thick,z,m,bevel=.015){let s=new THREE.Shape();coords.forEach((p,i)=>(i?s.lineTo(...p):s.moveTo(...p)));s.closePath();let g=new THREE.ExtrudeGeometry(s,{depth:thick,bevelEnabled:!!bevel,bevelSegments:1,steps:1,bevelThickness:bevel,bevelSize:bevel,curveSegments:1});g.translate(0,0,-thick/2);return addObj(parent,g,m,0,0,z);}
function cylinder(parent,x,y,z,length,r1,r2,m,segments=16){let o=addObj(parent,new THREE.CylinderGeometry(r2??r1,r1,length,segments,1),m,x,y,z,-Math.PI/2);return o;}
function hollowScopeTube(parent,x,y,z,length,r1,r2,m,segments=32){return addObj(parent,new THREE.CylinderGeometry(r2??r1,r1,length,segments,1,true),m,x,y,z,-Math.PI/2);}
function ring(parent,x,y,z,R,r,m,radial=24){let o=addObj(parent,new THREE.TorusGeometry(R,r,7,radial),m,x,y,z);o.rotation.y=Math.PI/2;return o;}
function bolt(parent,x,y,z,r=.055){let o=cylinder(parent,x,y,z,.045,r,r,mat.inner,10);cylinder(parent,x+.028,y,z,.018,r*.62,r*.62,mat.lightmetal,10);return o;}
function beam(parent,a,b,r,m,seg=10){let A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=new THREE.Vector3().subVectors(B,A);let o=addObj(parent,new THREE.CylinderGeometry(r,r,v.length(),seg),m,...A.clone().add(B).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
function strip(parent,x,y,z,w,h,d,m){return box(parent,x,y,z,w,h,d,m,.008)}
function addLED(parent,x,y,z,w=.48,h=.022,d=.012){let p=strip(parent,x,y,z,w,h,d,mat.amber);goldLights.push(p);return p;}
function addScrewStrip(parent,xs,y,z){xs.forEach(x=>bolt(parent,x,y,z,.035))}
function brushed(parent,xmin,xmax,ymin,ymax,z,ct=18){for(let i=0;i<ct;i++){let x=xmin+(xmax-xmin)*((i*.618034)%1),yy=ymin+(ymax-ymin)*((i*.381966)%1);let o=strip(parent,x,yy,z,.05+(i%4)*.05,.003,.002,mat.lightmetal);o.material=mat.scratch;scratches.push(o);}}

function buildRifle(){
 const rifle=new THREE.Group();rifle.name='ARES X9 / design du visualiseur original';
 // Stock — skeleton chassis, fully modeled visible apertures.
 poly(rifle,[[-5.87,2.02],[-5.80,2.76],[-5.55,2.92],[-4.50,2.90],[-3.43,2.66],[-3.36,2.28],[-4.24,2.20],[-4.74,1.94],[-5.65,1.88]],.3,0,mat.body,.035);
 poly(rifle,[[-5.62,2.19],[-5.56,2.66],[-5.34,2.73],[-4.55,2.67],[-4.17,2.49],[-4.60,2.24],[-5.38,2.11]],.33,.0,mat.inner,.025);
 // Create void feeling with cross struts and connecting shafts
 beam(rifle,[-5.55,2.13,.22],[-4.36,2.69,.22],.045,mat.titan);beam(rifle,[-5.59,2.68,.22],[-4.55,2.17,.22],.045,mat.black);
 beam(rifle,[-5.55,2.13,-.22],[-4.36,2.69,-.22],.045,mat.titan);beam(rifle,[-5.59,2.68,-.22],[-4.55,2.17,-.22],.045,mat.black);
 box(rifle,-5.96,2.40,0,.23,.92,.54,mat.rubber,.07);box(rifle,-6.08,2.4,0,.08,.81,.57,mat.black,.035);
 box(rifle,-5.78,2.78,0,.28,.32,.6,mat.graphite,.065);
 box(rifle,-4.95,2.87,0,1.35,.24,.5,mat.rubber,.075);box(rifle,-4.95,2.99,0,.97,.05,.38,mat.carbon,.03);
 for(let z of [-.225,.225]){poly(rifle,[[-5.64,2.08],[-5.43,2.00],[-4.61,2.00],[-4.32,2.22],[-4.56,2.34],[-5.44,2.18]],.06,z,mat.dark,.015);addScrewStrip(rifle,[-5.53,-4.92,-4.42],2.11,z>0?.27:-.27);}
 // Adjustable stock connecting piston
 cylinder(rifle,-3.96,2.58,0,1.05,.105,.105,mat.titan);for(const x of [-4.35,-3.55])cylinder(rifle,x,2.58,0,.10,.15,.15,mat.black);
 cylinder(rifle,-4.20,2.41,.12,.72,.042,.042,mat.copper);
 // Main receiver and grip
 poly(rifle,[[-3.70,2.30],[-3.51,2.76],[-3.15,2.87],[-1.18,2.85],[-.77,2.67],[-.88,2.12],[-2.11,2.09],[-2.41,1.97],[-3.45,2.07]],.68,0,mat.titan,.027);
 poly(rifle,[[-3.6,2.32],[-3.3,2.72],[-2.96,2.77],[-1.36,2.75],[-1.05,2.61],[-1.1,2.30],[-2.10,2.26],[-2.43,2.17],[-3.40,2.22]],.718,0,mat.graphite,.03);
 // Mechanical slab plates, side ejection window
 for(let z of [-.38,.38]){
  poly(rifle,[[-3.48,2.34],[-3.23,2.67],[-2.88,2.67],[-2.8,2.44],[-3.13,2.3]],.062,z,mat.body,.01);
  poly(rifle,[[-2.60,2.53],[-2.36,2.73],[-1.57,2.73],[-1.5,2.60],[-1.82,2.50]],.08,z,mat.dark,.018);
  strip(rifle,-1.9,2.59,z>0?.431:-.431,.75,.074,.007,mat.black);
  strip(rifle,-1.78,2.59,z>0?.439:-.439,.34,.022,.009,mat.titan);
  poly(rifle,[[-2.72,2.23],[-1.30,2.23],[-1.10,2.34],[-1.74,2.38],[-2.54,2.34]],.04,z>0?.424:-.424,mat.body,.012);
  addScrewStrip(rifle,[-3.35,-2.73,-1.27],2.30,z>0?.44:-.44);
  for(let i=0;i<7;i++)strip(rifle,-3.02+i*.13,2.71,z>0?.48:-.48,.024,.06,.008,i%2?mat.gunmetal:mat.titan);
 }
 cylinder(rifle,-3.02,2.80,0,.85,.17,.17,mat.gunmetal,24);cylinder(rifle,-3.30,2.80,0,.12,.21,.21,mat.black);
 // Connector details
 box(rifle,-.90,2.46,0,.35,.51,.78,mat.titan,.04);
 // Magazine shell, tapered and fluted
 poly(rifle,[[-2.63,2.25],[-1.76,2.25],[-1.70,1.44],[-2.58,1.35],[-2.68,1.72]],.55,0,mat.black,.025);
 for(let z of [-.291,.291]){
  poly(rifle,[[-2.52,2.17],[-1.89,2.17],[-1.83,1.53],[-2.43,1.47]],.034,z,mat.body,.025);
  for(let i=0;i<6;i++)strip(rifle,-2.19,1.54+i*.105,z>0?.32:-.32,.47,.027,.011,mat.dark);
  bolt(rifle,-2.5,2.09,z>0?.345:-.345,.031);
 }
 box(rifle,-2.17,1.38,0,.81,.09,.63,mat.gunmetal,.015);
 // Trigger guard and forward mag release, cosmetic
 beam(rifle,[-3.33,2.18,.03],[-3.09,1.99,.03],.028,mat.black);beam(rifle,[-3.09,1.99,.03],[-2.69,1.98,.03],.028,mat.black);beam(rifle,[-2.69,1.98,.03],[-2.59,2.19,.03],.028,mat.black);
 box(rifle,-3.35,1.79,0,.38,.82,.43,mat.rubber,.078,-.2);
 for(let z of [-.245,.245]){box(rifle,-3.35,1.84,z,.40,.76,.028,mat.carbon,.045,-.2);for(let i=0;i<8;i++){let x=-3.44+i%2*.11;let y=1.55+Math.floor(i/2)*.115;strip(rifle,x,y,z>0?.266:-.266,.09,.012,.01,mat.body);}}
 cylinder(rifle,-3.12,2.18,.37,.09,.08,.08,mat.gold);bolt(rifle,-3.12,2.18,.43,.047);
 // Main handguard: upper and lower beams, engineered shell with side cutouts
 cylinder(rifle,1.28,2.58,0,4.9,.235,.235,mat.black,20);
 cylinder(rifle,1.22,2.58,0,4.68,.15,.15,mat.titan,18);
 poly(rifle,[[-.93,2.28],[-.63,2.75],[2.98,2.76],[3.26,2.64],[2.98,2.26],[.33,2.22]],.63,0,mat.dark,.029);
 // Open-looking exposed side handguard with structural vents (overlay dark through-holes)
 for(let z of [-.341,.341]){
  poly(rifle,[[-.62,2.63],[-.45,2.77],[3.09,2.76],[3.12,2.61],[2.93,2.52],[-.56,2.51]],.045,z,mat.titan,.02);
  for(let i=0;i<8;i++){
    let x=-.23+i*.405;
    poly(rifle,[[x-.125,2.67],[x-.055,2.73],[x+.12,2.73],[x+.05,2.65]],.053,z>0?.369:-.369,mat.inner,.006);
  }
  poly(rifle,[[-.76,2.47],[-.55,2.30],[.12,2.29],[.55,2.38],[2.63,2.37],[2.98,2.46]],.045,z>0?.349:-.349,mat.body,.015);
  for(let i=0;i<7;i++){
    let x=.03+i*.43;
    poly(rifle,[[x-.12,2.31],[x-.06,2.37],[x+.15,2.37],[x+.09,2.31]],.055,z>0?.379:-.379,mat.inner,.005);
  }
  addLED(rifle,1.5,2.48,z>0?.391:-.391,1.18,.026,.008);
  strip(rifle,.1,2.48,z>0?.390:-.390,.42,.018,.01,mat.copper);
  addScrewStrip(rifle,[-.67,.43,1.72,2.8],2.57,z>0?.414:-.414);
  brushed(rifle,-.65,2.8,2.38,2.71,z>0?.396:-.396,17);
 }
 for(let i=0;i<19;i++){let x=-.67+i*.194;box(rifle,x,2.85,0,.10,.078,.69,mat.black,.009);box(rifle,x,2.895,0,.075,.015,.64,mat.titan,.005);}
 // Underslung electrical box / battery
 box(rifle,.72,2.15,0,1.55,.23,.50,mat.graphite,.04);for(let i=0;i<7;i++){strip(rifle,.17+i*.17,2.05,.24,.08,.029,.02,mat.black)}
 cylinder(rifle,3.05,2.55,0,.24,.26,.26,mat.gunmetal);ring(rifle,3.19,2.55,0,.226,.034,mat.gold);
 // Long, isolated barrel with flutes and compensator
 cylinder(rifle,4.33,2.56,0,2.68,.157,.157,mat.titan,24);
 cylinder(rifle,4.31,2.56,0,2.65,.131,.131,mat.black,24);
 for(let a=0;a<7;a++){let ang=a*Math.PI*2/7;let yy=2.56+Math.sin(ang)*.148;let zz=Math.cos(ang)*.148;beam(rifle,[3.20,yy,zz],[5.40,yy,zz],.011,mat.lightmetal,5)}
 for(let x of [3.35,4.82,5.33])cylinder(rifle,x,2.56,0,.071,.183,.183,mat.gunmetal);
 for(let x of [3.39,5.35])ring(rifle,x,2.56,0,.16,.020,mat.gold);
 cylinder(rifle,5.69,2.56,0,.42,.215,.215,mat.titan,16);
 cylinder(rifle,6.0,2.56,0,.62,.312,.312,mat.graphite,8);
 cylinder(rifle,6.22,2.56,0,.22,.316,.316,mat.dark,8);
 ring(rifle,6.34,2.56,0,.25,.038,mat.copper,8);
 cylinder(rifle,6.36,2.56,0,.018,.179,.179,mat.inner,24);ring(rifle,6.374,2.56,0,.159,.015,mat.gold);
 for(let z of [-.31,.31])for(let i=0;i<3;i++)strip(rifle,5.87+i*.15,2.56,z,.105,.20,.017,mat.inner);
 for(let i=0;i<4;i++){let y=2.40+(i%2)*.33;strip(rifle,5.91+Math.floor(i/2)*.2,y,.00,.115,.036,.45,mat.black);}
 // Scope mount, tower & rail supports
 box(rifle,-2.13,2.95,0,2.76,.15,.53,mat.black,.018);
 for(let i=0;i<16;i++)box(rifle,-3.47+i*.182,3.025,0,.090,.06,.53,mat.titan,.004);
 for(let x of [-2.95,-1.40]){box(rifle,x,3.19,0,.27,.42,.40,mat.graphite,.024);box(rifle,x,3.36,0,.42,.13,.52,mat.titan,.028);bolt(rifle,x,3.17,.29,.055)}
 // Eye piece tube, engineered multi-diameter scope
 hollowScopeTube(rifle,-2.07,3.63,0,2.92,.235,.275,mat.black,28);
 hollowScopeTube(rifle,-3.46,3.63,0,.46,.312,.31,mat.titan,24);
 hollowScopeTube(rifle,-3.73,3.63,0,.19,.342,.342,mat.graphite,32);
 ring(rifle,-3.86,3.63,0,.283,.033,mat.gold);
 for(let x of [-3.66,-3.53,-3.34,-2.52,-1.81])ring(rifle,x,3.63,0,.243,.02,mat.gold);
 // electronic box on top and eyepiece dials
 box(rifle,-2.32,3.96,0,.53,.23,.37,mat.graphite,.045);
 cylinder(rifle,-2.28,4.13,0,.32,.149,.149,mat.black,16);cylinder(rifle,-2.28,4.30,0,.036,.159,.159,mat.gold,16);
 for(let i=0;i<12;i++){let a=i*2*Math.PI/12;box(rifle,-2.28+Math.cos(a)*.146,4.22,Math.sin(a)*.145,.028,.065,.025,mat.lightmetal,.003)}
 // windage turret on right of scope
 cylinder(rifle,-2.28,3.63,.39,.29,.156,.156,mat.titan,16); // X axial small housing visual
 box(rifle,-2.28,3.65,.39,.40,.37,.16,mat.black,.09);
 box(rifle,-2.25,3.65,.51,.20,.22,.07,mat.gold,.02);
 for(let z of [-.28,.28]){strip(rifle,-3.12,3.77,z,.52,.028,.026,mat.copper);addLED(rifle,-2.52,3.76,z>0?.31:-.31,.15,.020,.008);}
 // Wide front objective
 hollowScopeTube(rifle,-.98,3.63,0,.79,.366,.47,mat.graphite,36);
 hollowScopeTube(rifle,-.73,3.63,0,.27,.468,.468,mat.titan,40);
 hollowScopeTube(rifle,-.56,3.63,0,.17,.50,.50,mat.black,40);
 ring(rifle,-.46,3.63,0,.46,.044,mat.gold,40);
 ring(rifle,-.45,3.63,0,.41,.018,mat.titan,40);
 cylinder(rifle,-.437,3.63,0,.019,.392,.392,mat.glass,48);
 ring(rifle,-.422,3.63,0,.336,.008,mat.glassrim,48);
 // Sapphire nested lens optics, subtle crosshair, custom lines projected on front disc
 cylinder(rifle,-.415,3.63,0,.004,.323,.323,new THREE.MeshBasicMaterial({color:0x0c2a42,transparent:true,opacity:.57}),48);
 ring(rifle,-.409,3.63,0,.24,.0027,mat.blue,48);
 const scopeGlow=new THREE.Group();scopeGlow.name='Réticule numérique';scopeGlow.position.set(-.400,3.63,0);rifle.add(scopeGlow);blueLights.push(scopeGlow);
 let l1=box(scopeGlow,0,0,0,.008,.46,.005,mat.blue,.001),l2=box(scopeGlow,0,0,0,.008,.005,.46,mat.blue,.001);
 for(let a=0;a<4;a++){let t=a*Math.PI/2;let yy=Math.cos(t)*.12,zz=Math.sin(t)*.12;box(scopeGlow,0,yy,zz,.01,.018,.018,mat.blue,.002);}
 // decorative emitter rings around scope
 for(let x of [-.82,-1.06,-1.23])ring(rifle,x,3.63,0,.36,.013,mat.gold);
 // Bipod: articulated and telescopic independent object group
 bipod=new THREE.Group();bipod.name='Bipied repliable';rifle.add(bipod);
 cylinder(bipod,1.65,2.16,0,.4,.27,.27,mat.graphite,16);
 box(bipod,1.67,2.00,0,.41,.36,.50,mat.titan,.06);
 for(let i=0;i<2;i++){
   // widely separated in both depth and length for visible V silhouette
   let z=i===0?.86:-.87, dx=i===0?-.76:.70;
   let a=[1.66,1.93,i===0?.16:-.16], knee=[1.66+dx*.55,1.08,z*.54], foot=[1.66+dx,.10,z];
   beam(bipod,a,knee,.115,mat.black,14);beam(bipod,[...knee.slice(0,2),knee[2]],foot,.083,mat.titan,14);
   beam(bipod,[knee[0],knee[1]+.12,knee[2]],[foot[0]-.04,foot[1]+.19,foot[2]],.051,mat.dark,12);
   let joint=addObj(bipod,new THREE.SphereGeometry(.17,14,10),mat.gunmetal,...a);
   let k=addObj(bipod,new THREE.SphereGeometry(.13,12,10),mat.graphite,...knee);
   box(bipod,foot[0],.096,foot[2],.34,.18,.37,mat.rubber,.04);
   box(bipod,foot[0],.04,foot[2],.42,.065,.42,mat.black,.016);
   beam(bipod,[a[0]-.04,a[1]-.20,a[2]],[knee[0],knee[1]+.08,knee[2]],.035,mat.copper,9);
 }
 // Visible embossed panels and micro-screws, extra mechanical greebling
 for(let z of [-.36,.36]){
   for(let x of [-3.53,-3.25,-2.95,-.54,.29,1.18,2.45]){
     box(rifle,x,2.51,z>0?.46:-.46,.12,.08,.024,mat.black,.01);
   }
 }
 for(let z of [-.36,.36]){addLED(rifle,-3.39,2.56,z>0?.47:-.47,.055,.07,.009);addLED(rifle,-1.22,2.37,z>0?.45:-.45,.36,.027,.007)}
 return rifle;
}

let cached=null;
function createPrototype(){
  const source=buildRifle();
  source.updateMatrixWorld(true);
  const batches=new Map();
  source.traverse(o=>{
    if(!o.isMesh)return;
    const geo=o.geometry.clone();
    geo.applyMatrix4(o.matrixWorld);
    // L'appui-joue d'origine empiétait sur le visage en vue FPS/Quest.
    // Compresser uniquement l'arrière de crosse de 18 %, sans déplacer le canon ni l'optique.
    const xyz=geo.attributes.position;
    for(let v=0;v<xyz.count;v++){
      const x=xyz.getX(v);
      if(x < -3.35)xyz.setX(v,-3.35+(x+3.35)*.82);
    }
    xyz.needsUpdate=true;geo.computeVertexNormals();
    const key=o.material.uuid;
    if(!batches.has(key))batches.set(key,{material:o.material,parts:[]});
    batches.get(key).parts.push(geo);
  });
  const gun=new THREE.Group();gun.name='ARES X9 — fusil de précision numérique';
  const axis=new THREE.Group();axis.rotation.y=Math.PI/2;axis.scale.setScalar(.092);gun.add(axis);
  const palm=new THREE.Group();palm.position.set(3.35,-1.79,0);axis.add(palm);
  let parts=0;
  for(const {material,parts:geos} of batches.values()){
    const fused=new THREE.Mesh(merge(geos),material);
    fused.castShadow=!material.transparent&&!material.isMeshBasicMaterial;
    fused.receiveShadow=false;
    palm.add(fused);parts++;
    for(const part of geos)part.dispose();
  }
  source.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
  Object.assign(gun.userData,{
    authored:true,authoredOptic:true,integratedEmitter:true,
    muzzle:[0,.071,-.895],modelName:'ARES X9',
    optimizedDrawCalls:parts,source:'ARES X9 WebGPU original'
  });
  return gun;
}
export function createAresX9(){
  cached ||= createPrototype();
  return cached.clone(true);
}
