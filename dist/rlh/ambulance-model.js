import {createMaterials,bevelBox,chevronTexture} from './ambulance-surfaces.js';
export function createAmbulance({THREE}) {
const {white,trim,dark,glass,cabGlass,rubber,metal,blue,yellow,red,floor,orange,upholstery,mattress,whiteLens,blueLens,redLens,amberLens,mirror}=createMaterials(THREE);
function box(parent,w,h,d,x,y,z,m){const a=new THREE.Mesh(bevelBox(THREE,w,h,d),m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;parent.add(a);return a}function cyl(parent,r,h,x,y,z,m){const a=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,32),m);a.rotation.x=Math.PI/2;a.position.set(x,y,z);a.castShadow=true;parent.add(a);return a}function label(parent,text,x,y,z,rot=0,size=1,color='#06749b'){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.font='bold 78px Arial';ctx.textAlign='center';ctx.fillText(text,256,92);const t=new THREE.CanvasTexture(c);if(THREE.SRGBColorSpace)t.colorSpace=THREE.SRGBColorSpace;else t.encoding=THREE.sRGBEncoding;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(size,size/4),new THREE.MeshStandardMaterial({map:t,transparent:true,alphaTest:.1,roughness:.4,depthWrite:false}));mesh.position.set(x,y,z);mesh.rotation.y=rot;parent.add(mesh)}
function rounded(parent,w,h,r,x,y,z,m){const shape=new THREE.Shape();let a=-w/2,b=-h/2;shape.moveTo(a+r,b);shape.lineTo(a+w-r,b);shape.quadraticCurveTo(a+w,b,a+w,b+r);shape.lineTo(a+w,b+h-r);shape.quadraticCurveTo(a+w,b+h,a+w-r,b+h);shape.lineTo(a+r,b+h);shape.quadraticCurveTo(a,b+h,a,b+h-r);shape.lineTo(a,b+r);shape.quadraticCurveTo(a,b,a+r,b);const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape,8),m);mesh.material.side=THREE.DoubleSide;mesh.position.set(x,y,z);parent.add(mesh);return mesh}
function star(parent,x,y,z,scale){for(let i=0;i<3;i++){const a=box(parent,scale*.17,scale,.01,x,y,z,blue);a.rotation.z=i*Math.PI/3;}}
const rig=new THREE.Group();rig.name='AMBULANCE_RIG';const car=new THREE.Group();car.name='AMBULANCE_BODY';rig.add(car);
// chassis and open patient compartment
box(car,5.8,.28,1.45,0,.75,0,dark);box(car,3.45,.12,2.12,-1.06,1.03,0,floor);box(car,3.5,.12,2.18,-1.05,3.25,0,white);box(car,.12,2.15,2.18,.68,2.16,0,white);
// walls leave an opening for the side door on the visible side
box(car,3.5,2.15,.1,-1.05,2.16,-1.04,white);box(car,1.85,2.15,.1,-1.88,2.16,1.04,white);box(car,.54,2.15,.1,.43,2.16,1.04,white);box(car,1.05,.32,.1,-.31,3.09,1.04,white);
// Reflective markings and rounded, sealed side windows.
for(const z of [-1.102,1.102]){const out=Math.sign(z);box(car,1.84,.43,.012,-1.88,1.66,z,yellow);box(car,1.84,.035,.015,-1.88,1.42,z,blue);box(car,1.84,.035,.015,-1.88,1.90,z,blue);rounded(car,1.21,.77,.12,-1.86,2.64,z+out*.008,dark);rounded(car,1.10,.66,.09,-1.86,2.64,z+out*.014,glass);label(car,'AMBULANCE',-1.86,1.67,z+out*.02,z<0?Math.PI:0,1.40,'#0065a0');}
// Interior bed and cabinet
box(car,2.25,.18,.62,-1.1,1.42,-.08,white);box(car,1.75,.12,.55,-1.15,1.55,-.08,mattress);for(const x of [-1.8,-.4]){box(car,.07,.4,.07,x,1.2,-.3,metal);box(car,.07,.4,.07,x,1.2,.14,metal)}box(car,2.55,.55,.42,-1.15,1.38,-.77,trim);box(car,.7,1.45,.34,-2.35,2.05,-.78,white);
// Cab body: shaped bonnet and windscreen rather than a rectangular block.
function profile(parent,points,depth,z,m,bevel=.04){const sh=new THREE.Shape();sh.moveTo(...points[0]);for(const p of points.slice(1))sh.lineTo(...p);sh.closePath();const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:16}),m);mesh.position.z=z-depth/2;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}
profile(car,[[2.05,1.05],[2.88,1.05],[2.94,1.35],[2.85,1.65],[2.70,1.75],[2.30,1.78],[2.08,1.67]],1.93,0,white,.055);
profile(car,[[.78,2.39],[.82,2.48],[1.02,2.55],[1.85,2.55],[2.03,2.46],[1.94,2.39]],1.94,0,white,.045);
box(car,.16,1.12,1.96,.79,1.87,0,white);box(car,1.35,.18,1.88,1.46,1.09,0,white);
// Broad sloped windscreen and slim pillars.
const wind=box(car,.055,.78,1.75,2.25,2.11,0,cabGlass);wind.rotation.z=.49;
for(const z of [-.91,.91]){let pillar=box(car,.085,.83,.095,2.25,2.11,z,white);pillar.rotation.z=.49;}
box(car,.07,.33,1.40,2.91,1.27,0,dark);
// Bumper and rounded front fascia.
box(car,.18,.21,1.89,2.91,1.00,0,trim);box(car,.12,.12,1.70,3.00,.91,0,dark);
for(const z of [-.69,.69]){let light=box(car,.075,.24,.39,2.91,1.58,z,trim);light.rotation.z=-.18;let lens=box(car,.082,.15,.30,2.95,1.61,z,white);lens.rotation.z=-.18;}
// Four independent rollers and front steering pivots, like the VLTT visual rig.
const wheels=[];
for(const x of [-1.9,1.85])for(const z of [-1.08,1.08]){
 const sign=Math.sign(z),front=x>0,steer=new THREE.Group(),roll=new THREE.Group();
 steer.name=front?'ROUE_AVANT_DIRECTION':'ROUE_ARRIERE';steer.position.set(x,.53,z);steer.add(roll);rig.add(steer);
 cyl(roll,.43,.27,0,0,0,rubber);const shoulder=new THREE.Mesh(new THREE.TorusGeometry(.365,.105,14,48),rubber);shoulder.position.z=sign*.13;roll.add(shoulder);
 cyl(roll,.286,.282,0,0,0,trim);cyl(roll,.235,.29,0,0,0,metal);cyl(roll,.105,.30,0,0,0,trim);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;cyl(roll,.023,.31,Math.cos(a)*.17,Math.sin(a)*.17,0,dark);}
 const tread=new THREE.InstancedMesh(new THREE.BoxGeometry(.022,.009,.20),rubber,48),pose=new THREE.Object3D();
 for(let i=0;i<48;i++){const a=i*Math.PI/24;pose.position.set(Math.cos(a)*.466,Math.sin(a)*.466,0);pose.rotation.z=a-Math.PI/2;pose.updateMatrix();tread.setMatrixAt(i,pose.matrix);}
 tread.instanceMatrix.needsUpdate=true;roll.add(tread);wheels.push({steer,roll,front,x,z});
}
// Real wheel openings: skirt cut-outs, curved inner tubs and moulded outer lips.
const wheelArches=[];
for(const x of [-1.9,1.85])for(const sign of [-1,1]){
 const front=x>0,z=sign*(front?1.00:1.035),left=front?.72:-2.81,right=front?2.96:.70;
 const radius=.59,bottom=.63,a=Math.asin((bottom-.53)/radius),shape=new THREE.Shape();
 shape.moveTo(left,bottom);shape.lineTo(x-Math.cos(a)*radius,bottom);shape.absarc(x,.53,radius,Math.PI-a,a,true);
 shape.lineTo(right,bottom);shape.lineTo(right,1.18);shape.lineTo(left,1.18);shape.closePath();
 const skirt=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2,curveSegments:24}),white);
 skirt.position.z=z-.035;skirt.castShadow=skirt.receiveShadow=true;car.add(skirt);
 const lipShape=new THREE.Shape();lipShape.absarc(0,0,.655,0,Math.PI,false);lipShape.lineTo(-.565,0);lipShape.absarc(0,0,.565,Math.PI,0,true);lipShape.closePath();
 const lip=new THREE.Mesh(new THREE.ExtrudeGeometry(lipShape,{depth:.07,bevelEnabled:true,bevelSize:.009,bevelThickness:.009,bevelSegments:2,curveSegments:24}),front?white:dark);
 lip.position.set(x,.53,sign>0?1.18:-1.25);lip.castShadow=lip.receiveShadow=true;car.add(lip);
 const vertices=[],indices=[];
 for(let i=0;i<=32;i++){const t=i*Math.PI/32;for(const e of [0,1])vertices.push(x+Math.cos(t)*.57,.53+Math.sin(t)*.57,sign*(.82+e*.39));if(i<32){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
 const tubGeometry=new THREE.BufferGeometry();tubGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));tubGeometry.setIndex(indices);tubGeometry.computeVertexNormals();
 const tub=new THREE.Mesh(tubGeometry,dark);tub.receiveShadow=true;car.add(tub);wheelArches.push({skirt,lip,tub});
}
// hinged doors: pivots and all decorations live in the same group
const doors={};function hinge(name,x,z){let g=new THREE.Group();g.position.set(x,0,z);g.userData.doorId=name;car.add(g);doors[name]=g;return g}
const chevrons=chevronTexture(THREE);
const reflective=new THREE.MeshPhysicalMaterial({map:chevrons,roughness:.3,clearcoat:.7,clearcoatRoughness:.2,side:THREE.DoubleSide});
for(const [name,z,sign] of [['rearL',-1.04,1],['rearR',1.04,-1]]){
 const g=hinge(name,-2.81,z);
 box(g,.09,2.05,1.02,0,2.14,sign*.51,white);
 const seal=rounded(g,.66,.76,.10,0,2.65,0,dark);seal.rotation.y=-Math.PI/2;seal.position.set(-.049,2.65,sign*.51);
 const window=rounded(g,.57,.67,.075,0,2.65,0,glass);window.rotation.y=-Math.PI/2;window.position.set(-.053,2.65,sign*.51);
 const innerSeal=seal.clone(),innerGlass=window.clone();innerSeal.position.x=.049;innerGlass.position.x=.053;g.add(innerSeal,innerGlass);
 const vinyl=new THREE.Mesh(new THREE.PlaneGeometry(1.0,.58),reflective);vinyl.rotation.y=-Math.PI/2;vinyl.position.set(-.055,1.64,sign*.51);g.add(vinyl);
 box(g,.08,.17,.065,-.07,2.08,sign*.86,dark);
}
let s=hinge('side',.19,1.1);box(s,1.03,1.84,.09,-.515,2.0,0,white);rounded(s,.78,.72,.10,-.52,2.57,.053,dark);rounded(s,.68,.62,.08,-.52,2.57,.058,glass);rounded(s,.78,.72,.10,-.52,2.57,-.049,dark);rounded(s,.68,.62,.08,-.52,2.57,-.053,glass);box(s,1.01,.43,.006,-.515,1.67,.050,yellow);box(s,1.01,.035,.006,-.515,1.41,.051,blue);box(s,.035,.16,.045,-.83,1.98,.071,dark);
for(const [name,z] of [['frontL',-1.0],['frontR',1.0]]){
 let g=hinge(name,2.13,z);const outward=z>0?1:-1;
 profile(g,[[-1.28,1.20],[-.20,1.20],[0,1.28],[0,1.72],[-.32,1.83],[-1.28,1.83]],.075,0,white,.025);
 profile(g,[[-1.23,1.84],[.04,1.84],[-.16,2.39],[-1.23,2.39]],.025,0,cabGlass,.018);
 box(g,.075,.58,.075,-1.24,2.10,0,white);let edge=box(g,.07,.61,.075,-.05,2.10,0,white);edge.rotation.z=.36;
 box(g,.15,.055,.03,-1.03,1.73,outward*.06,dark);box(g,.10,.08,.31,.05,2.01,outward*.16,dark);box(g,.23,.29,.15,.08,2.04,outward*.28,dark);box(g,.20,.25,.012,.08,2.04,outward*.363,mirror);
 box(g,.9,.20,.012,-.70,1.40,outward*.05,yellow);box(g,.9,.035,.016,-.70,1.29,outward*.06,blue);
}
// Interior cabin, dashboard and seats, visible through the open front doors.
box(car,.35,.35,1.8,1.96,1.77,0,dark);
for(const z of [-.48,.48]) { box(car,.62,.16,.56,1.27,1.54,z,upholstery);const back=box(car,.15,.62,.56,1.02,1.89,z,upholstery);back.rotation.z=-.12;box(car,.16,.19,.34,.98,2.29,z,upholstery); }
const steering=new THREE.Mesh(new THREE.TorusGeometry(.19,.025,8,24),rubber);steering.position.set(1.82,1.98,-.5);steering.rotation.y=Math.PI/2;car.add(steering);box(steering,.28,.025,.025,0,0,0,dark);box(steering,.025,.15,.025,0,-.075,0,dark);
// Cell framing, roof edge, seals and rails.
for(const z of [-1.1,1.1]) {box(car,3.52,.06,.055,-1.05,3.18,z,trim);box(car,3.52,.08,.06,-1.05,1.06,z,trim);for(const x of [-2.76,.67])box(car,.075,2.17,.06,x,2.17,z,trim);}
// Realistic mouldings and lamps around the rear opening.
for(const z of [-1.06,1.06]) {
 box(car,.12,2.05,.13,-2.82,2.14,z,white);
 const post=new THREE.Mesh(new THREE.PlaneGeometry(.12,1.82),reflective);post.rotation.y=-Math.PI/2;post.position.set(-2.89,2.20,z);car.add(post);
 box(car,.075,.32,.23,-2.89,1.16,z,dark);box(car,.025,.13,.18,-2.94,1.21,z,redLens);box(car,.025,.085,.18,-2.94,1.08,z,amberLens);
}
for(const g of [doors.rearL,doors.rearR]) {for(const y of [1.37,2.87])box(g,.16,.16,.09,.01,y,0,metal);box(g,.08,.05,.9,-.06,1.17,g===doors.rearL?.5:-.5,trim);}
// Side glazing seals, door steps, rear step and side marker lamps.
for(const z of [-1.12,1.12]) {for(const x of [-2.2,.38])box(car,.15,.08,.04,x,1.17,z,amberLens);box(car,1.1,.08,.18,-.3,.91,z,metal);}
box(car,.42,.09,1.75,-3.05,.73,0,trim);for(let i=0;i<9;i++)box(car,.32,.012,.025,-3.05,.785,-.72+i*.18,dark);
// Medical interior: stretcher mattress, pillow, rails, storage and oxygen cylinder.
box(car,.4,.08,.49,-1.85,1.66,-.08,white);for(const z of [-.4,.24]) {box(car,1.8,.035,.035,-1.12,1.73,z,metal);for(const x of [-1.85,-.4])box(car,.03,.2,.03,x,1.63,z,metal);}
for(const x of [-1.9,-1.15,-.4]) {box(car,.65,.42,.025,x,1.39,-.54,white);box(car,.15,.025,.03,x,1.52,-.52,dark);}
const oxygen=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.68,16),new THREE.MeshStandardMaterial({color:0xe9f4e8,roughness:.4}));oxygen.position.set(.38,1.56,-.72);car.add(oxygen);box(car,.08,.08,.08,.38,1.95,-.72,metal);
box(car,.55,.38,.36,.25,1.5,.72,blue);box(car,.3,.06,.03,.25,1.57,.92,white);box(car,.06,.25,.03,.25,1.57,.92,white);
// Grille, number plate, wheel arches and wipers.
for(let i=0;i<4;i++)box(car,.03,.023,1.25,2.97,1.14+i*.07,0,metal);
box(car,.035,.14,.40,3.02,1.02,0,white);label(car,'RLH',3.045,1.02,0,Math.PI/2,.3,'#253c44');
for(const z of [-.43,.43]) {const w=box(car,.035,.025,.71,2.32,1.81,z,dark);w.rotation.x=.12;}

// Body joins, grab handles, glazing accents and medical identification.
for(const z of [-1.135,1.135]){const sign=Math.sign(z);box(car,.014,1.95,.015,-2.77,2.13,z,trim);box(car,.014,1.95,.015,.66,2.13,z,trim);box(car,3.42,.035,.02,-1.05,1.21,z,metal);box(car,.26,.05,.025,-.64,2.02,z,dark);star(car,.37,2.56,z, .32);}
// Front grille badge and layered headlamp lenses.
const badge=box(car,.035,.22,.22,3.01,1.45,0,metal);badge.rotation.x=Math.PI/4;
for(const z of [-.7,.7]){let lamp=box(car,.025,.12,.22,3.00,1.59,z,whiteLens);lamp.rotation.z=-.18;box(car,.02,.04,.13,3.015,1.55,z,white);}
// Rear grab rails, high visibility markings and lower reflectors.
for(const name of ['rearL','rearR']){const g=doors[name],sgn=name==='rearL'?1:-1;box(g,.025,.40,.025,-.10,1.98,sgn*.85,metal);box(g,.012,.055,.20,-.052,1.27,sgn*.50,redLens);}
// Moulded polycarbonate lenses with recessed LED optics.
box(car,.28,.07,1.45,1.30,2.64,0,dark);
box(car,.30,.12,1.40,1.30,2.73,0,blueLens);
for(const z of [-.53,-.38,.38,.53])box(car,.025,.065,.10,1.46,2.73,z,whiteLens);
for(const z of [-.92,.92]){
 cyl(car,.14,.045,-2.66,3.34,z,dark).rotation.x=0;
 const beacon=new THREE.Mesh(new THREE.CylinderGeometry(.105,.135,.20,24),blueLens);beacon.position.set(-2.66,3.45,z);car.add(beacon);
}
box(car,.22,.18,2.16,-2.94,.87,0,trim);

const open={rearL:false,rearR:false,side:false,frontL:false,frontR:false};
const angles={rearL:-1.65,rearR:1.65,side:1.65,frontL:-1.2,frontR:1.2};
const bed=new THREE.Group();bed.name='CMIA_BRANCARD_ANCRAGE';bed.position.set(-.55,1.62,-.08);car.add(bed);
function update(dt,state={}){
 const f=1-Math.exp(-8*Math.max(0,dt));
 for(const k in doors)doors[k].rotation.y+=((open[k]?angles[k]:0)-doors[k].rotation.y)*f;
 for(const w of wheels){w.steer.rotation.y=w.front?(state.steerAngle||0):0;w.roll.rotation.z=state.wheelSpin||0;}
 steering.rotation.z=-(state.steerAngle||0)*2.4;
}
return {rig,car,doors,open,angles,wheels,wheelArches,steering,bed,update};
}
