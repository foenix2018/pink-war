// Exact RLH V750 procedural civilian body profiles and original external detailing.
// Ported into Pink Wars as a static offline asset; no runtime fetch or RLH global.
// The original RLH vehicle was already an unpowered decoration.
// Source: foenix2018/RLH js/modules/vehicles/civil-car-v750.js
const FACTORIES=new WeakMap();
export const RLH_CIVIL_SOURCE_VERSION=750;
export function createRLHCivilCarSource(THREE,options={}){
 let factory=FACTORIES.get(THREE);
 if(!factory){
  const window={THREE};
/* RED LINE HEAT V750 — VOITURES CIVILES PARTAGÉES (décor)
   Les parkings du monde VR utilisaient des boîtes (caisse + vitre + 4 cylindres). Ce module
   produit une voiture de décor crédible et légère, réutilisable partout :
     - silhouette extrudée et lissée (berline, citadine, break, utilitaire), vitrage en retrait ;
     - montants noirs, bas de caisse, boucliers, calandre, passages de roue ;
     - pneus profilés + jantes, rétroviseurs, poignées, plaques, optiques avant/arrière ;
   La longueur est sur l'axe X local (avant = -X), la largeur sur Z, comme la voiture des Ormes.
   Matériaux Lambert partagés (une couleur de carrosserie = un matériau) : léger pour Quest. */
(function(){
'use strict';
const T=window.THREE;if(!T)return;
const TYPES={
  berline:{L:4.45,W:1.80,prof:[[-2.22,.30],[-2.20,.66],[-1.62,.76],[-0.92,.80],[-0.18,1.36],[0.95,1.39],[1.52,0.97],[2.12,0.88],[2.22,0.40],[2.10,0.30]],
    glass:[[-0.16,1.30],[0.90,1.33],[1.44,0.95],[-0.86,0.88]]},
  citadine:{L:3.85,W:1.72,prof:[[-1.92,.30],[-1.89,.66],[-1.34,.78],[-0.74,.84],[-0.12,1.38],[0.92,1.41],[1.48,1.22],[1.66,0.80],[1.68,0.36],[1.56,0.30]],
    glass:[[-0.10,1.31],[0.88,1.34],[1.38,1.16],[-0.68,0.92]]},
  break:{L:4.70,W:1.84,prof:[[-2.35,.30],[-2.32,.66],[-1.72,.76],[-1.00,.80],[-0.28,1.38],[1.55,1.42],[2.20,1.28],[2.34,0.80],[2.36,0.38],[2.24,0.30]],
    glass:[[-0.26,1.32],[1.50,1.36],[2.10,1.22],[-0.94,0.88]]},
  utilitaire:{L:5.10,W:1.98,prof:[[-2.55,.32],[-2.52,.72],[-1.98,.86],[-1.55,.94],[-1.02,1.86],[2.30,1.92],[2.55,1.74],[2.56,0.40],[2.42,0.32]],
    glass:[[-1.00,1.80],[-0.25,1.84],[-0.27,1.06],[-1.46,0.98]]}
};
const COLORS=[0x22262b,0x8d9298,0x9c2a22,0x1f4a68,0xd9d5cd,0x3a5540,0x6c5b46,0x2f3138,0xb0b5ba,0x54331f,0x1c2b3a,0xa8a29a];
const mats=new Map();
function mat(key,color,opts){if(!mats.has(key)){const m=new T.MeshLambertMaterial(Object.assign({color},opts||{}));m.name='RLH_CAR_V750_'+key;mats.set(key,m);}return mats.get(key);}
const geo=new Map();
function boxG(w,h,d){const k='b'+w+'/'+h+'/'+d;if(!geo.has(k))geo.set(k,new T.BoxGeometry(w,h,d));return geo.get(k);}
function smooth(pts,n){for(let k=0;k<n;k++){const o=[];for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];o.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]);}pts=o;}return pts;}
function extrude(type,which,width,bevel){
  const k='x'+type+which+width;if(geo.has(k))return geo.get(k);
  const t=TYPES[type],pts=smooth(t[which],2),s=new T.Shape();s.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)s.lineTo(pts[i][0],pts[i][1]);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:width-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:3,steps:1});
  g.translate(0,0,-(width-2*bevel)/2);g.computeVertexNormals();geo.set(k,g);return g;
}
let tireG=null,rimG=null,archG=null;
function wheelGeos(){
  if(!tireG){tireG=new T.LatheGeometry([[.20,-.105],[.30,-.105],[.335,-.07],[.345,0],[.335,.07],[.30,.105],[.20,.105]].map(p=>new T.Vector2(p[0],p[1])),18);tireG.rotateX(Math.PI/2);}
  if(!rimG){rimG=new T.CylinderGeometry(.205,.205,.22,14);rimG.rotateX(Math.PI/2);}
  if(!archG)archG=new T.TorusGeometry(.39,.03,6,16,Math.PI);
}
function add(g,geom,m,x,y,z){const o=new T.Mesh(geom,m);o.position.set(x,y,z);g.add(o);return o;}

function create(o){
  o=o||{};const type=TYPES[o.type]?o.type:'berline',t=TYPES[type];
  const color=o.color!=null?o.color:COLORS[Math.floor((o.seed!=null?o.seed:Math.random()*999)%COLORS.length)];
  const g=new T.Group();g.name='VOITURE_CIVILE_V750_'+type;
  const paint=mat('paint'+color.toString(16),color),glass=mat('glass',0x1d2a31),black=mat('black',0x111315),dark=mat('dark',0x26292c),
        chrome=mat('chrome',0xb9bec2),plate=mat('plate',0xf2f2ec),head=mat('head',0xf5f1df,{emissive:0x2a2618}),tail=mat('tail',0x8e1414,{emissive:0x220404}),amber=mat('amber',0xd98a1f);
  const body=new T.Mesh(extrude(type,'prof',t.W,.06),paint);body.castShadow=true;g.add(body);
  g.add(new T.Mesh(extrude(type,'glass',t.W+.014,.02),glass));
  const L=t.L,W=t.W,hw=W/2;
  /* bas de caisse, boucliers, calandre */
  add(g,boxG(L*.94,.24,W*.985),dark,0,.30,0);
  add(g,boxG(.2,.3,W),dark,-L/2+.07,.52,0);add(g,boxG(.2,.3,W),dark,L/2-.07,.52,0);
  add(g,boxG(.04,.13,W*.5),black,-L/2-.02,.72,0);
  /* optiques et plaques */
  for(const s of [-1,1]){add(g,boxG(.08,.11,.32),head,-L/2+.02,.80,s*(hw-.26));add(g,boxG(.06,.12,.3),tail,L/2-.02,.84,s*(hw-.24));add(g,boxG(.05,.04,.08),amber,-L/2+.04,.58,s*(hw-.12));}
  add(g,boxG(.02,.11,.52),plate,-L/2-.035,.5,0);add(g,boxG(.02,.11,.52),plate,L/2+.035,.62,0);
  /* montants, poignées, rétroviseurs */
  for(const s of [-1,1]){
    add(g,boxG(.05,.46,.02),black,L*.04,1.1,s*(hw+.005));
    add(g,boxG(L*.55,.025,.02),black,L*.1,.86,s*(hw+.006));
    add(g,boxG(.12,.03,.03),chrome,-L*.02,.86,s*(hw+.01));add(g,boxG(.12,.03,.03),chrome,L*.2,.86,s*(hw+.01));
    add(g,boxG(.13,.08,.06),dark,-L*.13,1.15,s*(hw+.13));
  }
  /* roues */
  wheelGeos();const wb=L*.31;
  for(const wx of [-wb,wb])for(const s of [-1,1]){
    add(g,tireG,black,wx,.345,s*(hw-.13));add(g,rimG,chrome,wx,.345,s*(hw-.12));
    const a=new T.Mesh(archG,dark);a.position.set(wx,.36,s*(hw+.01));g.add(a);
  }
  if(type==='break'||type==='utilitaire')for(const s of [-1,1])add(g,boxG(L*.45,.03,.04),chrome,L*.15,(type==='utilitaire'?1.95:1.45),s*(hw-.15));
  return g;
}
window.RLHCivilCarV750={version:750,TYPES:Object.keys(TYPES),COLORS,create};
})();

  factory=window.RLHCivilCarV750;
  FACTORIES.set(THREE,factory);
 }
 return factory.create(options);
}
