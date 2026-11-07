import {createSupplyPickup} from './power-props.js';
import {bevelBox} from './geo.js';
// M01 service caches: the interaction icon is a physical field-medical kit or
// high-voltage energy cartridge, never an anonymous glowing octahedron.
// Shared geos for mobile performance; collision/pickup authority unchanged.
export function createM01SupplyCache(T,{heal=false,M,accent=0xff6fb4,webgpu=false,low=false}={}){
 const root=new T.Group();root.name='M01 / '+(heal?'trousse de secours':'cellule énergie')+' identifiable';
 const metal=M.paintedMetal||M.steel,steel=M.steel||metal,dark=M.dark||M.black;
 const sign=new T.MeshBasicMaterial({color:heal?accent:0x78e9ff,toneMapped:false});
 const shell=(m,s,p,round=.008)=>{
  const g=bevelBox(...s,Math.min(.016,Math.min(...s)*.2),1),mesh=new T.Mesh(g,m);mesh.position.set(...p);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
 };
 // Physically lifted hard case with recessed locks, hinge and carrying handle.
 shell(dark,[.61,.07,.41],[0,.07,0]);
 shell(metal,[.58,.20,.39],[0,.205,0]);
 shell(dark,[.56,.043,.40],[0,.31,0]);
 for(const side of [-1,1]){
  shell(steel,[.085,.035,.052],[side*.17,.316,.19]);
  shell(dark,[.038,.056,.030],[side*.17,.27,.214]);
 }
 shell(steel,[.18,.025,.035],[0,.35,.02]);
 for(const side of [-1,1])shell(steel,[.028,.055,.035],[side*.08,.37,.02]);
 // Readable treatment/charge capsule on a suspended tray.
 const asset=createSupplyPickup(T,{kind:heal?'heal':'cell',webgpu,accent,low,dock:false});
 const token=asset.token;token.position.y=.75;root.add(token);root.userData.pulse=asset.root.userData.pulse;
 // Identifying case badge. The object is also readable without animated glow.
 const front=sign.clone(),label=new T.Mesh(new T.PlaneGeometry(.16,.09),front);
 label.position.set(0,.19,.199);root.add(label);
 root.userData.dispose=()=>{
  const geo=new Set();for(const o of root.children)if(o.isMesh&&o.geometry)geo.add(o.geometry);
  for(const g of geo)g.dispose();
  sign.dispose();front.dispose();
 };
 return {root,token};
}
