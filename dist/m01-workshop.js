import {Assembly,bevelBox,matrix} from './geo.js';
import {createCircuitSwitch} from './circuit-switch.js';

// Repair-shop fittings share the map's physical cabinets, benches and walls.
// All materials are borrowed; the module owns only its labels and geometry.
export function createWorkshopArt(T,parent,maps,{quality='auto',labels=true,equipment=maps}={}){
 const root=new T.Group();root.name='M01 / atelier et cour de livraison';parent.add(root);
 const a=new Assembly(),owned=[],textures=[];
 const box=(m,size,p,r=[0,0,0],b=.018)=>a.add(bevelBox(...size,b,1),m,matrix(p,r));
 const rod=(m,p,q,r=.02)=>a.limb(m,p,q,r,r);
 function sign(x,y,z,w,lines){
  box(maps.dark,[w,.72,.08],[x,y,z]);if(!labels)return;
  const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d');
  ctx.fillStyle='#303b37';ctx.fillRect(0,0,768,192);ctx.strokeStyle='#9d8f6e';ctx.lineWidth=4;ctx.strokeRect(8,8,752,176);ctx.fillStyle='#dacbb0';ctx.font='600 30px system-ui';lines.forEach((line,i)=>ctx.fillText(line,28,60+i*62,710));
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;textures.push(t);const m=new T.MeshBasicMaterial({map:t,toneMapped:false});owned.push(m);a.add(new T.PlaneGeometry(w-.05,.67),m,matrix([x,y,z+.044]),false);
 }
 sign(-62,3.25,39.20,5,['ATELIER / RÉPARATIONS CIVILES','BOUTIQUE PAR LA COUR  →']);
 sign(-47,2.95,21.20,4.5,['RÉSEAU MUNICIPAL DÉCONNECTÉ','LIAISON LOCALE  ←']);
 sign(-63,2.6,15.45,3.8,['ALIMENTATION DE LA BOUTIQUE','CIRCUIT LOCAL · PAS DE RÉSEAU']);
 sign(-44,3.18,11.20,3.8,['LIVRAISONS / SORTIE NORD','ÉVACUATION SUSPENDUE']);
 // A manual lathe: connected rail, spindle, motor, tool carriage and handwheels.
 box(maps.rust,[3.24,.13,1.34],[-62,1.25,26]);
 for(const z of [25.65,26.35])rod(maps.steel,[-63.35,1.43,z],[-60.65,1.43,z],.055);
 box(maps.steel,[.65,.63,.94],[-63.1,1.58,26]);box(maps.dark,[.48,.25,.78],[-61.75,1.49,26]);
 rod(maps.steel,[-62.85,1.68,26],[-61.3,1.68,26],.11);
 for(const x of [-62.9,-61.7]){
  a.add(new T.TorusGeometry(.17,.026,6,16),maps.steel,matrix([x,1.48,26.74]));
  rod(maps.steel,[x-.15,1.48,26.74],[x+.15,1.48,26.74],.017);
 }
 // Repair bench, clamped robot component, labeled drawer fronts.
 box(maps.steel,[4.06,.10,1.06],[-44,1.17,16]);
 for(const x of [-45.3,-44.4,-43.5]){box(maps.dark,[.75,.27,.035],[x,.75,16.52]);rod(maps.steel,[x-.18,.78,16.56],[x+.18,.78,16.56],.017);}
 box(maps.dark,[.78,.12,.50],[-44,1.3,16]);rod(maps.steel,[-44.3,1.44,16],[-43.8,1.55,16],.12);
 for(const x of [-44.4,-43.6])box(maps.rust,[.1,.34,.38],[x,1.35,16]);
 // Rack edge profiles, bolted shelf lips, replacement service parts.
 for(const x of [-51.79,-50.21])for(const z of [32.49,35.51])rod(maps.rust,[x,.05,z],[x,1.95,z],.035);
 for(const y of [.13,.91,1.84])box(maps.rust,[1.65,.06,3.07],[-51,y,34]);
 for(const z of [33,34,35]){box(maps.dark,[.8,.24,.55],[-51,1.99,z]);rod(maps.steel,[-51.3,2.12,z],[-50.7,2.12,z],.07);}
 // Roof edge steel, wall conduits and broken glazing stay against their solids.
 for(const z of [11,39])box(maps.rust,[31,.17,.18],[-53.5,3.63,z]);
 for(const x of [-66,-40])box(maps.steel,[.18,.24,22],[x,3.60,25]);
 for(const x of [-66.4,-59.5,-53]){
  rod(maps.rust,[x,.2,11.25],[x,3.3,11.25],.033);
  box(maps.dark,[1.1,.7,.08],[x,2.8,11.25]);
  for(const dx of [-.35,0,.35])box(maps.steel,[.028,.62,.04],[x+dx,2.8,11.31]);
 }
 const cable=[[-63.5,.15,15.38],[-63.8,.05,14.4],[-64,.05,11.4],[-64,3.3,11.4],[-49,3.3,11.4],[-39,3.3,11.4]].map(p=>new T.Vector3(...p));
 a.add(new T.TubeGeometry(new T.CatmullRomCurve3(cable),32,.028,6,false),maps.dark);
 const control=createCircuitSwitch(T,root,{x:-63,y:.78,z:15.78,materials:equipment,batch:a});
 a.mount(root);a.setLevel(1);root.traverse(o=>{if(o.isMesh){o.castShadow=quality!=='low'&&!o.material.isMeshBasicMaterial;o.receiveShadow=true;}});
 let powered=false;
 return {root,update(game){powered=!!game.workshopReleased;control.setState(powered);},stats(){let triangles=0,draws=0;root.traverse(o=>{if(o.isMesh){draws++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});return {revision:'3.63.9',approaches:2,localSwitch:1,powered,triangles,draws};},dispose(){control.dispose();root.removeFromParent();root.traverse(o=>o.geometry?.dispose());owned.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
