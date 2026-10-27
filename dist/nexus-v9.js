// NEXUS V9 V2 — fusil mitraillette tactique de Pink Wars.
// Reprise complète de la géométrie du visualiseur NEXUS V9 V2.
// Convention : canon vers -Z, Y haut, origine sur main de tir.
// Les maillages opaques sont fusionnés par matériau pour préserver les FPS.
// La vitre, le réticule et la visserie instanciée restent individualisés.
import * as THREE from './vendor/three.webgpu.min.js';
import {bevelBox,merge} from './geo.js';

let prototype=null;
function constructPrototype(){
  const root=new THREE.Group();
// MATÉRIAUX : variations métalliques très légères et traces d'usinage.
function wearTexture(){
 // Tests et rendu serveur n'ont pas de DOM : matériau sans relief de secours.
 // Dans le navigateur, le même CanvasTexture d'origine est conservé.
 if(typeof document==='undefined')return null;
 const c=document.createElement('canvas');c.width=c.height=256;
 const ctx=c.getContext('2d');ctx.fillStyle='#b1b1b1';ctx.fillRect(0,0,256,256);
 let seed=10391;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 for(let i=0;i<4400;i++){let v=150+Math.floor(random()*76);ctx.fillStyle=`rgba(${v},${v},${v},${.04+random()*.13})`;ctx.fillRect(random()*256,random()*256,random()*3+.3,.5+random()*.8)}
 for(let i=0;i<170;i++){ctx.strokeStyle=`rgba(230,230,230,${.025+random()*.09})`;ctx.lineWidth=.3;ctx.beginPath();let y=random()*256;ctx.moveTo(random()*256,y);ctx.lineTo(random()*256,y+(random()-.5)*4);ctx.stroke()}
 const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(2,2);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=2;return tex;
}
const grunge=wearTexture();
const mat={
  chassis:new THREE.MeshStandardMaterial({color:0x343f4c,metalness:.78,roughness:.39,bumpMap:grunge,bumpScale:.008}),
  steel:new THREE.MeshStandardMaterial({color:0x687481,metalness:.92,roughness:.31,bumpMap:grunge,bumpScale:.003}),
  armor:new THREE.MeshStandardMaterial({color:0x262e39,metalness:.83,roughness:.37,bumpMap:grunge,bumpScale:.005}),
  alloy:new THREE.MeshStandardMaterial({color:0x455361,metalness:.8,roughness:.31,bumpMap:grunge,bumpScale:.006}),
  frame:new THREE.MeshStandardMaterial({color:0x171d24,metalness:.61,roughness:.45}),
  polymer:new THREE.MeshStandardMaterial({color:0x171a20,metalness:.18,roughness:.76}),
  rubber:new THREE.MeshStandardMaterial({color:0x11151b,metalness:.04,roughness:.93,bumpMap:grunge,bumpScale:.02}),
  inset:new THREE.MeshStandardMaterial({color:0x070c12,metalness:.16,roughness:.82}),
  screw:new THREE.MeshStandardMaterial({color:0x8290a0,metalness:.93,roughness:.27}),
  cyan:new THREE.MeshStandardMaterial({color:0x70ddff,emissive:0x2ab9fc,emissiveIntensity:2.1,metalness:.05,roughness:.2}),
  cyanDim:new THREE.MeshStandardMaterial({color:0x17435b,emissive:0x075a8a,emissiveIntensity:.7,metalness:.55,roughness:.27}),
  amber:new THREE.MeshStandardMaterial({color:0xe2ad78,emissive:0x9e6431,emissiveIntensity:.8,metalness:.35,roughness:.35}),
  glass:new THREE.MeshBasicMaterial({color:0x7bdfff,transparent:true,opacity:.07,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}),
  reticle:new THREE.MeshBasicMaterial({color:0x51dcff,side:THREE.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false,transparent:true,opacity:1})
};

function roundedBox(parent,name,pos,size,material,r=.02,rotation){
 const [w,h,d]=size;
 const geo=bevelBox(w,h,d,Math.max(.001,Math.min(r,w*.24,h*.24,d*.24)),1);
 const o=new THREE.Mesh(geo,material);o.name=name;o.position.set(...pos);if(rotation)o.rotation.set(...rotation);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
function box(parent,name,pos,size,material){const o=new THREE.Mesh(new THREE.BoxGeometry(...size),material);o.name=name;o.position.set(...pos);parent.add(o);return o}
function outlinePanel(parent,name,coords,z,depth,material,bevel=.008){
 const path=new THREE.Shape();path.moveTo(...coords[0]);coords.slice(1).forEach(p=>path.lineTo(...p));path.closePath();
 const geom=new THREE.ExtrudeGeometry(path,{depth,steps:1,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:Math.min(bevel,depth*.4),bevelSegments:2,curveSegments:5});
 const mesh=new THREE.Mesh(geom,material);mesh.name=name;mesh.position.z=z;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function segment(parent,name,a,b,width,depth,material){const aV=new THREE.Vector3(...a),bV=new THREE.Vector3(...b);const delta=bV.clone().sub(aV);const length=delta.length();const m=roundedBox(parent,name,[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2],[length,width,depth],material,.015);m.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),delta.normalize());return m}
function cylinderX(parent,name,x,y,z,r,len,material,segments=24){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,segments),material);m.name=name;m.rotation.z=Math.PI/2;m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m}
function torusX(parent,name,x,y,z,R,r,material){const m=new THREE.Mesh(new THREE.TorusGeometry(R,r,7,28),material);m.rotation.y=Math.PI/2;m.position.set(x,y,z);parent.add(m);return m}
function circleFacingSide(parent,x,y,z,r,material){const m=new THREE.Mesh(new THREE.CircleGeometry(r,16),material);m.position.set(x,y,z);parent.add(m);return m}
const visibleLeds=[];function led(parent,name,pos,size,rotation){const m=roundedBox(parent,name,pos,size,mat.cyan,Math.min(...size)*.22,rotation);visibleLeds.push(m);return m}
// Visserie instanciée : tous les rivets sont dessinés en un seul appel graphique.
const screws=[];
function screw(x,y,z,r=.017){screws.push([x,y,z,r])}
function addScrews(){const geo=new THREE.CylinderGeometry(1,1,.33,10);geo.rotateX(Math.PI/2);const mesh=new THREE.InstancedMesh(geo,mat.screw,screws.length);const dummy=new THREE.Object3D();screws.forEach(([x,y,z,r],i)=>{dummy.position.set(x,y,z);dummy.scale.set(r,r,r);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;root.add(mesh)}

// 1. Corps compact, profil en couches, épaisseur réaliste.
const chassis=new THREE.Group();root.add(chassis);chassis.name='Châssis et boîtier';
outlinePanel(chassis,'Coque centrale',[[-.62,.41],[.87,.40],[1.20,.27],[1.24,-.20],[1.04,-.39],[-.63,-.38],[-.75,-.12]],-.205,.41,mat.armor,.025);
outlinePanel(chassis,'Capot supérieur',[[-.84,.46],[.99,.45],[1.16,.35],[1.13,.24],[-.79,.26]],-.182,.364,mat.alloy,.018);
for(const s of [-1,1]){
 const z=s*.224;
 outlinePanel(chassis,'Panneau latéral porteur',[[-.5,.29],[.91,.31],[1.02,.19],[.98,-.16],[.83,-.28],[-.47,-.24]],z-.013,.025,mat.chassis,.011);
 outlinePanel(chassis,'Flanc CNC',[[.00,.17],[.95,.16],[.87,-.085],[.74,-.18],[-.02,-.18],[-.15,-.075]],z+s*.012,.009,mat.armor,.003);
 outlinePanel(chassis,'Panneau sombre inscription',[[.06,.125],[.77,.11],[.86,.028],[.68,-.085],[.04,-.085],[-.04,.04]],z+s*.027,.004,mat.frame,.002);
 for(let j=0;j<4;j++)screw(-.4+j*.43,.29,z+s*.029,.013);
 for(let j=0;j<3;j++)screw(.1+j*.32,-.27,z+s*.026,.012);
}
// Panneau d'éjection horizontal sur le dessus du boîtier.
roundedBox(chassis,'Lèvre éjection',[.31,.365,0],[1.12,.09,.26],mat.frame,.017);
roundedBox(chassis,'Ouverture de culasse',[.37,.403,.155],[.73,.055,.012],mat.inset,.011);
roundedBox(chassis,'Tige de culasse',[.28,.41,.17],[.40,.024,.019],mat.steel,.006);
cylinderX(chassis,'Molette de culasse',.64,.414,.18,.043,.050,mat.steel);

// 2. Garde-main : deux flancs profilés, fraisés, ajourés et sans volumes flottants.
const fore=new THREE.Group();root.add(fore);fore.name='Garde-main perforé';
outlinePanel(fore,'Châssis intérieur du garde-main',[[-1.84,.39],[-.50,.4],[-.42,.25],[-.43,-.26],[-.6,-.36],[-1.86,-.31]],-.179,.358,mat.frame,.026);
for(const side of [-1,1]){
 const z=side*.198;
 outlinePanel(fore,'Tôle latérale supérieure',[[-1.84,.43],[-.51,.43],[-.47,.32],[-.6,.14],[-1.84,.15]],z-.014,.028,mat.chassis,.017);
 outlinePanel(fore,'Jupe latérale inférieure',[[-1.84,.12],[-.53,.12],[-.43,-.26],[-.63,-.37],[-1.83,-.30]],z-.016,.033,mat.alloy,.012);
 // Fentes oblongues : cadre fraisée + insert noir légèrement en retrait.
 for(let i=0;i<5;i++){
   const x=-1.65+i*.23;
   roundedBox(fore,'Bord usiné fente haute',[x,.305,z+side*.037],[.174,.061,.015],mat.steel,.024);
   roundedBox(fore,'Ouverture haute',[x,.305,z+side*.046],[.157,.043,.013],mat.inset,.021);
 }
 for(let i=0;i<4;i++){
   const x=-1.65+i*.282;
   roundedBox(fore,'Bord usiné fenêtre basse',[x,-.015,z+side*.041],[.23,.104,.018],mat.chassis,.039);
   roundedBox(fore,'Ouverture fenêtre basse',[x,-.015,z+side*.052],[.192,.074,.017],mat.inset,.032);
 }
 const seam=roundedBox(fore,'Nervure longitudinale',[-1.2,.16,z+side*.028],[1.08,.021,.016],mat.steel,.007);
 for(let k=0;k<7;k++)screw(-1.80+k*.20,.127,z+side*.049,.010);
 for(let k=0;k<4;k++)screw(-1.79+k*.40,-.276,z+side*.048,.012);
}
// Arête avant amincie (évite l'apparence d'une boîte simple).
outlinePanel(fore,'Capot avant renforcé',[[-1.88,.36],[-1.77,.43],[-1.76,-.26],[-1.87,-.29]],-.21,.42,mat.armor,.014);
// Rail supérieur et ses dents, rails sous garde-main.
roundedBox(fore,'Long rail supérieur',[-.98,.457,0],[1.85,.055,.22],mat.frame,.012);
for(let i=0;i<21;i++)roundedBox(fore,'Dent de rail',[-1.85+i*.079,.495,0],[.045,.022,.225],mat.steel,.003);
roundedBox(fore,'Rail bas intégral',[-1.18,-.381,0],[1.00,.075,.225],mat.frame,.009);
for(let i=0;i<11;i++)roundedBox(fore,'Denture sous garde-main',[-1.62+i*.085,-.430,0],[.052,.029,.24],mat.chassis,.003);
// Garde-main de préhension ergonomique (pas une poignée rectangulaire rajoutée).
const foreGrip=new THREE.Group();fore.add(foreGrip);foreGrip.name='Zone de prise main avant';
outlinePanel(foreGrip,'Garde-main inférieur',[[-1.65,-.25],[-.8,-.24],[-.77,-.34],[-.93,-.42],[-1.50,-.42],[-1.65,-.35]],-.132,.264,mat.polymer,.015);
for(let i=0;i<8;i++){
 const x=-1.51+i*.082;
 roundedBox(foreGrip,'Strie de préhension',[x,-.397,.141],[.035,.025,.015],mat.rubber,.006);
}

// 3. Canon court avec bagues, frein de bouche ajouré en acier sombre.
const muzzle=new THREE.Group();root.add(muzzle);muzzle.name='Canon et bouche';
cylinderX(muzzle,'Gaine longue',-1.79,.085,0,.107,.40,mat.steel);
cylinderX(muzzle,'Tube interne',-2.045,.085,0,.068,.28,mat.frame);
for(const x of [-1.93,-1.99,-2.05])torusX(muzzle,'Épaulement annulaire',x,.085,0,.086,.011,mat.armor);
cylinderX(muzzle,'Compensateur',-2.23,.085,0,.116,.34,mat.chassis,32);
torusX(muzzle,'Bague métal',-2.39,.085,0,.108,.02,mat.steel);
cylinderX(muzzle,'Orifice noir',-2.405,.085,0,.051,.017,mat.inset,32);
for(let i=0;i<8;i++){
 const a=i*Math.PI/4;
 const slit=roundedBox(muzzle,'Lumière frein de bouche',[-2.23,.085+Math.sin(a)*.115,Math.cos(a)*.115],[.16,.027,.012],mat.inset,.009);
 slit.rotation.x=a;
}

// 4. Chargeur long : puits haut précis et corps trapézoïdal, devant la détente.
const magwell=new THREE.Group();root.add(magwell);magwell.name='Magasin et chargeur';
outlinePanel(magwell,'Corps puits chargeur',[[-.53,-.22],[-.24,-.22],[-.17,-.43],[-.26,-.61],[-.54,-.55]],-.16,.32,mat.chassis,.014);
outlinePanel(magwell,'Chargeur',[[-.51,-.52],[-.23,-.51],[-.15,-1.78],[-.22,-1.90],[-.43,-1.87],[-.48,-1.69]],-.134,.268,mat.polymer,.012);
outlinePanel(magwell,'Renfort chargeur',[[-.45,-.60],[-.31,-.59],[-.25,-1.69],[-.32,-1.78],[-.4,-1.73]],.133,.014,mat.armor,.005);
for(let j=0;j<12;j++)roundedBox(magwell,'Joint longitudinal',[-.17-(j%2)*.03,-.71-j*.078,.141],[.012,.037,.013],mat.frame,.004);
outlinePanel(magwell,'Talon chargeur',[[-.46,-1.76],[-.18,-1.79],[-.12,-1.96],[-.19,-2.02],[-.47,-1.99]],-.169,.338,mat.chassis,.014);
led(magwell,'Témoin de chargeur',[-.385,-1.42,.151],[.025,.35,.014]);
// Indicateurs blancs minimalistes sur le chargeur.
roundedBox(magwell,'Pictogramme bas',[-.345,-1.79,.157],[.035,.028,.004],mat.steel,.002);

// 5. Poignée pistolet complexe : silhouette anatomique, bossage paume et zones texturées.
const grip=new THREE.Group();root.add(grip);grip.name='Poignée ergonomique remaniée';
const gripCoords=[[.65,-.26],[.94,-.25],[1.10,-.47],[1.16,-.64],[1.21,-1.20],[1.30,-1.35],[1.21,-1.47],[.94,-1.44],[.79,-1.28],[.72,-.99],[.70,-.78],[.65,-.52]];
outlinePanel(grip,'Noyau de poignée',gripCoords,-.159,.318,mat.polymer,.021);
const frontContours=[[.69,-.51],[.71,-.75],[.74,-1.04],[.81,-1.24],[.88,-1.31]];
for(let side of [-1,1]){
 let z=side*.165;
 outlinePanel(grip,'Panneau caoutchouc ergonomique',[[.77,-.52],[.98,-.47],[1.09,-.70],[1.15,-1.23],[1.06,-1.34],[.90,-1.29],[.78,-1.06]],z-.011,.021,mat.rubber,.011);
 outlinePanel(grip,'Contour métallique de poignée',[[.75,-.49],[.95,-.46],[.98,-.51],[.77,-.57]],z-.019,.023,mat.alloy,.004);
 for(let i=0;i<9;i++){
   const y=-.67-i*.071, x=.915+i*.020;
   roundedBox(grip,'Morsure striée de poignée',[x,y,z+side*.018],[.115,.008,.006],mat.armor,.003);
 }
 screw(.87,-.62,z+side*.031,.013);screw(1.11,-1.29,z+side*.031,.013);
}
// Dos de poignée bombé, prise antidérapante et culot métallique.
segment(grip,'Arête arrière de paume',[1.07,-.51,0],[1.22,-1.28,0],.10,.285,mat.armor);
outlinePanel(grip,'Talonnette biseautée',[[.89,-1.30],[1.29,-1.32],[1.31,-1.46],[1.14,-1.52],[.93,-1.48]],-.19,.38,mat.steel,.014);
for(let i=0;i<3;i++){
 const y=-.74-i*.17;
 roundedBox(grip,'Crête des doigts',[.71+(i*.017),y,0],[.06,.075,.28],mat.polymer,.026);
}
// Pontet ouvert et vraie détente dans le vide de garde.
const guardCur=new THREE.CatmullRomCurve3([
 new THREE.Vector3(.52,-.33,.0),new THREE.Vector3(.46,-.45,0),new THREE.Vector3(.52,-.64,0),new THREE.Vector3(.73,-.66,0),new THREE.Vector3(.83,-.49,0)
]);
const guard=new THREE.Mesh(new THREE.TubeGeometry(guardCur,28,.023,9,false),mat.armor);guard.name='Pontet ouvert';grip.add(guard);
segment(grip,'Détente courbée',[.70,-.37,0],[.72,-.52,0],.026,.065,mat.steel);

// 6. Crosse ajourée (vraies ouvertures, deux longerons, talon amorti).
const stock=new THREE.Group();root.add(stock);stock.name='Crosse télescopique ajourée';
roundedBox(stock,'Interface charnière',[1.18,.13,0],[.21,.41,.33],mat.armor,.026);
cylinderX(stock,'Charnière avant',1.27,.15,0,.17,.10,mat.steel);
for(let s of [-1,1]){
 const z=s*.133;
 segment(stock,'Longeron de crosse haut',[1.29,.29,z],[2.34,.22,z],.13,.080,mat.steel);
 segment(stock,'Bras diagonal évidé',[1.38,-.22,z],[2.27,-.61,z],.088,.08,mat.chassis);
 segment(stock,'Contrefiche renfort',[1.68,.25,z],[1.48,-.32,z],.045,.05,mat.frame);
 segment(stock,'Montant distal',[2.28,.23,z],[2.27,-.59,z],.09,.07,mat.armor);
 segment(stock,'Barre haute secondaire',[1.50,.04,z],[2.23,.03,z],.045,.056,mat.frame);
 screw(1.55,.19,z+s*.052,.024);screw(2.24,-.30,z+s*.052,.022);
}
roundedBox(stock,'Appuie-joue',[1.83,.29,0],[.76,.095,.26],mat.polymer,.028);
roundedBox(stock,'Plaque de couche',[2.40,-.20,0],[.16,1.02,.36],mat.armor,.042);
roundedBox(stock,'Amortisseur caoutchouc',[2.49,-.20,0],[.095,.94,.39],mat.rubber,.032);
led(stock,'Led de crosse',[2.54,-.25,.201],[.025,.27,.013]);
led(stock,'LED mécanisme de crosse',[1.28,.13,.196],[.033,.18,.017]);

// 7. Rails sous canon, insert usiné, poussoir sélecteur et indicateurs.
const details=new THREE.Group();root.add(details);details.name='Mécanismes détaillés';
for(let i=0;i<7;i++)roundedBox(details,'Lame rail latéral',[-1.56+i*.14,-.26,.27],[.08,.14,.045],mat.frame,.012);
for(let i=0;i<7;i++)roundedBox(details,'Vis rail inférieur',[-1.56+i*.14,-.345,.265],[.055,.06,.021],mat.chassis,.01);
for(let x of [-1.80,-.52,.96]){
 for(const z of [-.26,.26])screw(x,.07,z,.028);
}
// Molette latérale de réglage mécanique.
const knurled=new THREE.Mesh(new THREE.CylinderGeometry(.095,.095,.079,28),mat.steel);knurled.rotation.x=Math.PI/2;knurled.position.set(-.38,.05,.287);details.add(knurled);
for(let i=0;i<15;i++){const a=i*Math.PI*2/15;roundedBox(details,'Molettage',[-.38+Math.cos(a)*.088,.05+Math.sin(a)*.088,.335],[.012,.016,.008],mat.frame,.003)}
roundedBox(details,'Sélecteur',[.79,-.30,.252],[.15,.055,.045],mat.steel,.018);
circleFacingSide(details,.79,-.30,.277,.012,mat.amber);
// Éléments cyan et batteries sur le châssis.
led(details,'LED sur garde-main',[-1.83,-.09,.263],[.035,.24,.018]);
led(details,'LED sous garde-main',[-1.15,-.25,.266],[.27,.022,.016]);
led(details,'Diode culasse',[.94,-.13,.258],[.024,.15,.014]);
roundedBox(details,'Rail LED support',[-1.15,-.25,.251],[.30,.049,.018],mat.armor,.009);
led(details,'LED rapporteur sous canon',[-1.15,-.25,.274],[.24,.016,.013]);

// 8. Viseur holographique réel, fenêtre transmissive traversante + réticule flottant.
const optics=new THREE.Group();root.add(optics);optics.name='Viseur reflex traversant';
// L'axe de tir est X. La vitre est dans le plan YZ.
const sight=new THREE.Group();sight.position.set(-.01,.64,0);optics.add(sight);
roundedBox(sight,'Embase reflex',[.00,-.07,0],[.45,.18,.45],mat.armor,.025);
for(let z of [-.16,.16])roundedBox(sight,'Fixation optique',[0,-.18,z],[.20,.08,.07],mat.steel,.008);
// Boîtier en forme de U : montants latéraux et pont supérieur réellement creux.
for(const z of [-.23,.23]){
 segment(sight,'Montant optique',[-.15,.00,z],[-.17,.45,z],.085,.085,mat.armor);
 roundedBox(sight,'Épaulement boîtier',[.08,.12,z],[.37,.32,.080],mat.chassis,.045);
}
roundedBox(sight,'Capot bombé reflex',[-.15,.47,0],[.30,.082,.55],mat.chassis,.033);
roundedBox(sight,'Pied inférieur refuge',[-.16,.015,0],[.31,.075,.55],mat.steel,.020);
for(const side of [-1,1]){
 roundedBox(sight,'Contour fenêtre optique',[-.178,.20,side*.236],[.045,.34,.033],mat.steel,.010);
}
// Vitrage véritablement transparent et sans capot opaque à l'arrière.
const pane=new THREE.Mesh(new THREE.PlaneGeometry(.39,.37),mat.glass);pane.name='Verre transparent';pane.rotation.y=Math.PI/2;pane.position.set(-.172,.255,0);sight.add(pane);
const sightLine=new THREE.Group();sightLine.position.set(-.208,.258,0);sightLine.rotation.y=Math.PI/2;sight.add(sightLine);
const ring=new THREE.Mesh(new THREE.RingGeometry(.043,.050,40),mat.reticle);sightLine.add(ring);
const dot=new THREE.Mesh(new THREE.CircleGeometry(.012,22),mat.reticle);sightLine.add(dot);
const cross=new THREE.BufferGeometry().setFromPoints([
 new THREE.Vector3(-.090,0,0),new THREE.Vector3(-.061,0,0),new THREE.Vector3(.061,0,0),new THREE.Vector3(.09,0,0),
 new THREE.Vector3(0,-.078,0),new THREE.Vector3(0,-.059,0),new THREE.Vector3(0,.059,0),new THREE.Vector3(0,.078,0)
]);sightLine.add(new THREE.LineSegments(cross,new THREE.LineBasicMaterial({color:0x64dfff,depthTest:false,depthWrite:false,toneMapped:false})));
cylinderX(sight,'Barillet réglage gauche',.17,.11,-.29,.054,.08,mat.steel);
cylinderX(sight,'Barillet réglage droit',.17,.11,.29,.054,.08,mat.steel);
for(let i=0;i<5;i++)roundedBox(sight,'Molette picatinny',[.07+i*.062,-.162,0],[.026,.027,.38],mat.steel,.004);
// Repères mécaniques devant et derrière la lunette.
outlinePanel(optics,'Oeillet visée avant',[[-1.67,.54],[-1.63,.66],[-1.55,.71],[-1.52,.58]],-.12,.24,mat.armor,.011);

// 9. Marquages et micro-usure sur les coques (textures avec Canvas, pas de maillage excessif).
function labelTexture(lines){const can=document.createElement('canvas');can.width=1024;can.height=256;const ctx=can.getContext('2d');ctx.clearRect(0,0,1024,256);ctx.fillStyle='#b6c6d2';ctx.font='700 108px sans-serif';ctx.fillText(lines[0],24,128);ctx.font='32px monospace';ctx.fillStyle='#758b9d';ctx.fillText(lines[1],31,190);const t=new THREE.CanvasTexture(can);t.colorSpace=THREE.SRGBColorSpace;return t}
function label(parent,lines,x,y,z,w,h,flip=false){if(typeof document==='undefined')return;const texture=labelTexture(lines);const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,color:0xa7b3bc,side:THREE.DoubleSide}));o.position.set(x,y,z);if(flip)o.rotation.y=Math.PI;parent.add(o)}
label(chassis,['NEXUS','D E F E N S E    /   V9'],.45,-.016,.273,.50,.145);
label(chassis,['NEXUS','D E F E N S E    /   V9'],.45,-.016,-.273,.50,.145,true);
label(magwell,['9×19','SMART CELL · V09'],-.35,-.77,.153,.27,.10);
// Bande gravée, rivets autour du pontet.
for(const [x,y,z] of [[.66,-.33,.25],[.99,-.37,.25],[-.55,-.32,.24],[.73,-.22,.27]])screw(x,y,z,.016);
addScrews();


  root.updateMatrixWorld(true);
  const grouped=new Map();
  const transparent=[];
  const other=[];
  root.traverse(o=>{
    if(o===root)return;
    if(o.isInstancedMesh){const copy=o.clone();copy.geometry=o.geometry.clone();other.push(copy);return;}
    if(o.isMesh){
      const baked=o.geometry.clone();baked.applyMatrix4(o.matrixWorld);
      if(o.material.transparent || o.material.isMeshBasicMaterial){
        const copy=new THREE.Mesh(baked,o.material);copy.name=o.name;
        copy.renderOrder=o.material.depthTest===false?8:0;
        transparent.push(copy);
      }else{
        const key=o.material.uuid;
        if(!grouped.has(key))grouped.set(key,{material:o.material,geometries:[]});
        grouped.get(key).geometries.push(baked);
      }
    }else if(o.isLineSegments){
      const copy=o.clone();copy.geometry=o.geometry.clone();copy.geometry.applyMatrix4(o.matrixWorld);
      copy.renderOrder=9;other.push(copy);
    }
  });
  const result=new THREE.Group();result.name='NEXUS V9 / mitraillette automatique';
  const oriented=new THREE.Group();oriented.rotation.y=-Math.PI/2;oriented.scale.setScalar(.185);result.add(oriented);
  const centered=new THREE.Group();centered.position.set(-.83,.50,0);oriented.add(centered);
  for(const {material,geometries} of grouped.values()){
    const m=new THREE.Mesh(merge(geometries),material);m.castShadow=false;
    m.receiveShadow=false;centered.add(m);
    for(const geo of geometries)geo.dispose();
  }
  for(const o of transparent)centered.add(o);
  for(const o of other)centered.add(o);
  root.traverse(o=>{if((o.isMesh||o.isLineSegments)&&!o.isInstancedMesh)o.geometry.dispose();});
  Object.assign(result.userData,{
    authored:true,authoredOptic:true,integratedEmitter:true,
    muzzle:[0,.108,-.600],modelName:'NEXUS V9',sourceVersion:'NEXUS V9 V2',
    optimizedDrawCalls:grouped.size+transparent.length+other.length,
  });
  return result;
}
export function createNexusV9(){
  prototype ||= constructPrototype();
  return prototype.clone(true);
}
