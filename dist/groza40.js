// GROZA–40 VESPER: original bullpup hard-surface videogame prop.
// The game frame is grip-centred; +Y is up and the muzzle faces -Z.
import * as T from './vendor/three.webgpu.min.js';
import {Assembly,profile,matrix} from './geo.js';
export const GROZA40_FRAME=Object.freeze({id:'groza40',muzzle:Object.freeze([0,.108,-.425]),support:Object.freeze([0,-.015,-.265]),length:.97});
export const GROZA40_HOLD=Object.freeze({palm:Object.freeze([0,0,0]),support:GROZA40_FRAME.support,rake:-.10});
export const GROZA40_GRENADE_COOLDOWN=30;
export function createGroza40(){
  const root=new T.Group(),a=new Assembly();
  root.name='GROZA–40 VESPER / bullpup + lance-grenades 40 mm';
  const colors={frame:0x242830,armor:0x394047,metal:0x181d23,black:0x0b0e14,
    steel:0x707c82,edge:0x5c636a,carbon:0x2b3036,rubber:0x1d1e23,
    wood:0x693729,woodLight:0x8e5238,woodDark:0x41201b,
    amber:0xff924d,amberLight:0xffbf71,copper:0xbe653f,green:0x5ec29a};
  const mats=Object.fromEntries(Object.entries(colors).map(([k,v])=>[k,new T.MeshStandardMaterial({
    name:'Groza40 '+k,color:v,metalness:/wood|rubber|carbon|black/.test(k)?.12:.75,
    roughness:/wood|rubber/.test(k)?.76:.33,
    ...(k==='amberLight'?{emissive:0xff6e32,emissiveIntensity:.44}:{})
  })]));
  const S=.115,V=.13,p=(x,z,s=0)=>[s*S,(z+.65)*V,-(x-.45)*S];
  const box=(mat,x,z,len,thick,height,side=0)=>a.box(mats[mat],[thick*S,height*V,len*S],p(x,z,side),[0,0,0],.0017);
  const plate=(mat,points,thick=.49,side=0)=>a.add(profile(points.map(([x,z])=>[-(x-.45)*S,(z+.65)*V]),thick*S,.0016),mats[mat],matrix([side*S,0,0]));
  const tube=(mat,x0,x1,z,r)=>a.limb(mats[mat],p(x0,z),p(x1,z),r*S,r*S);
  // Reinforced stock and recessed cheek rest.
  box('rubber',-3.93,0,.18,.67,.86);box('frame',-3.65,0,.56,.58,.84);
  box('armor',-3.05,.05,1.07,.50,.63);box('rubber',-2.85,.35,1.30,.56,.2);
  for(let i=0;i<9;i++)for(const side of [-.33,.33])box('carbon',-4.01,-.31+i*.077,.025,.012,.036,side);
  plate('frame',[[-3.65,-.20],[-3.18,-.20],[-2.95,-.30],[-2.70,-.40],[-3.28,-.43],[-3.54,-.30]],.50);
  // Main bullpup receiver: charger mounted aft of the wood handle.
  plate('frame',[[-3.48,.22],[-3.14,.43],[-2.29,.47],[-1.45,.46],[-1.14,.51],[-.67,.5],[-.48,.57],
    [.41,.56],[.74,.43],[1.65,.40],[1.71,.12],[1.38,-.12],[.97,-.25],[.43,-.24],[.19,-.47],
    [-.24,-.49],[-.52,-.41],[-1.02,-.43],[-1.36,-.51],[-2.95,-.44],[-3.31,-.25]],.55);
  box('metal',-1.08,.47,4.75,.57,.14);
  for(const side of [-1,1]){
    const s=side*.28;
    plate('armor',[[-3.1,.21],[-2.72,.37],[-2.05,.37],[-1.74,.27],[-1.75,.01],[-2.2,-.18],[-2.8,-.21],[-3.12,-.08]],.026,s);
    plate('armor',[[-1.59,.3],[-1.29,.37],[-.31,.37],[-.23,.25],[-.25,-.19],[-1.51,-.18]],.026,s);
    plate('carbon',[[.09,.24],[.44,.33],[1.27,.32],[1.34,-.05],[.59,-.19],[.17,-.18]],.025,s);
    plate('black',[[-.56,.05],[-.12,.05],[-.11,-.08],[-.58,-.08]],.015,s+side*.035);
    box('copper',-.37,-.02,.32,.015,.04,s+side*.05);
    for(let i=0;i<7;i++)box('steel',-1.5+i*.18,.38,.08,.025,.02,s+side*.022);
    for(const x of [-3.1,-1.65,-.25,.93])box('steel',x,.25,.04,.017,.04,s+side*.044);
  }
  plate('metal',[[-1.70,-.34],[-.93,-.34],[-.86,-.53],[-1.65,-.58]],.50);
  plate('black',[[-1.59,-.49],[-.94,-.48],[-.76,-1.43],[-.82,-1.57],[-1.48,-1.69],[-1.59,-1.55],[-1.75,-.65]],.49);
  plate('armor',[[-1.56,-.57],[-1.02,-.56],[-.84,-1.47],[-1.43,-1.58],[-1.65,-.67]],.50);
  plate('metal',[[-1.49,-1.56],[-.83,-1.43],[-.79,-1.53],[-1.49,-1.69]],.53);
  for(const side of [-1,1])for(let i=0;i<8;i++){
    const z=-.70-i*.107,offset=Math.abs(z)-.70;
    plate('edge',[[-1.54+offset*.11,z],[-1.08+offset*.22,z+.012],[-1.07+offset*.22,z-.035],[-1.53+offset*.11,z-.044]],.01,side*.261);
  }
  // Dark-red sculpted grip and finger texture.
  plate('black',[[.12,-.35],[.69,-.34],[.79,-1.28],[.51,-1.42],[.23,-1.33],[.40,-.62]],.45);
  plate('wood',[[.26,-.45],[.60,-.46],[.67,-1.26],[.49,-1.32],[.33,-1.27],[.47,-.66]],.47);
  for(const side of [-1,1]){
    plate('woodLight',[[.37,-.52],[.54,-.52],[.59,-1.22],[.46,-1.27],[.42,-1.24]],.01,side*.244);
    for(let i=0;i<9;i++)box('woodDark',.45+i*.007,-.62-i*.065,.16,.013,.012,side*.26);
  }
  plate('metal',[[-.12,-.4],[.31,-.42],[.36,-.65],[.20,-.73],[-.13,-.72]],.15);
  box('steel',.18,-.56,.04,.08,.17);
  // Signature elevated optic and six luminous amber segments.
  box('black',.47,.65,1.92,.63,.2);box('armor',.44,.96,1.72,.65,.46);
  box('metal',.47,1.21,1.94,.73,.15);box('edge',.47,1.30,1.75,.59,.03);
  for(const side of [-1,1]){
    const s=side*.36;
    plate('metal',[[-.24,.84],[1.14,.84],[1.14,1.08],[-.25,1.08]],.025,s);
    plate('black',[[-.20,.88],[1.0,.88],[1.0,1.079],[-.20,1.079]],.013,s+side*.020);
    plate('amber',[[-.11,.91],[.95,.91],[.95,1.034],[-.11,1.034]],.013,s+side*.042);
    for(let i=0;i<6;i++)box('amberLight',.02+i*.16,.985,.068,.009,.043,s+side*.054);
    for(const x of [-.30,1.18])box('armor',x,1,.17,.09,.43,s+side*.066);
  }
  for(let i=0;i<12;i++)box('steel',-.27+i*.135,1.305,.07,.5,.027);
  // Barrel and front protected sight.
  box('frame',1.83,.16,1.08,.43,.38);box('steel',2.13,.19,1.42,.33,.21);
  tube('metal',2.20,4.06,.18,.112);tube('steel',3.70,3.96,.18,.134);
  tube('metal',3.95,4.15,.18,.15);tube('black',4.148,4.16,.18,.10);
  box('metal',2.37,.38,2.24,.37,.12);
  for(let i=0;i<12;i++)box('steel',1.56+i*.164,.448,.06,.31,.03);
  box('metal',3.61,.50,.18,.36,.18);box('edge',3.61,.61,.16,.15,.07);
  // 40 mm launcher below main barrel, tube, reinforcement and ribbed jacket.
  box('metal',1.58,-.18,1.3,.44,.30);tube('black',1.81,3.95,-.47,.295);
  tube('armor',2,3.54,-.47,.334);
  for(let i=0;i<8;i++){
    const x=2.16+i*.185;tube('steel',x,x+.068,-.47,.358);
    tube('black',x+.071,x+.087,-.47,.341);
  }
  tube('steel',3.52,3.73,-.47,.35);tube('metal',3.72,3.89,-.47,.29);
  tube('black',3.87,3.935,-.47,.21);
  for(const side of [-1,1]){
    plate('armor',[[1.20,-.19],[1.73,-.20],[1.95,-.33],[1.86,-.62],[1.27,-.65],[1.08,-.51]],.047,side*.32);
    for(let i=0;i<7;i++)box('edge',2.2+i*.2,-.46,.03,.02,.17,side*.35);
  }
  box('armor',1.24,-.02,.36,.57,.23);
  for(const side of [-1,1])plate('green',[[1.14,-.035],[1.29,-.035],[1.29,.018],[1.14,.018]],.013,side*.322);
  a.build(root);
  Object.assign(root.userData,{authored:true,asset:'groza40-vesper',frame:GROZA40_FRAME,
    muzzle:[...GROZA40_FRAME.muzzle],optic:{y:.249,z:-.028,radius:.025},integratedEmitter:false});
  return root;
}
