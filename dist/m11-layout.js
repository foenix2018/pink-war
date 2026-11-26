// Vesper West — V2 FPS metric layout, coordinates from the prototype.
export const LEVEL_ID='m11-la-traversee',PLAN={chapter:11,title:'La Traversée'};
export const START={x:-88,z:60,y:2,yaw:0};
export const ROUTE=[[-88,2,60],[-88,2,43],[-69,8,35],[-68,8,24],[-68,8,6],[-60,12,3.2],[-51,12,-12],[-39,12,-17],[-35,18,-25],[-39,25,-28],[-33,25,-40],[-18,25,-43],[0,25,-43],[25,25,-43],[50,25,-43],[75,25,-43],[103,25,-43],[111,27,-48],[104,32,-55],[109,32,-63],[109,32,-65]];
export const FLOORS=[
 ['helix',-89,53,2,48,36,'Sortie HELIX'],['civils',-72,17,8,44,35,'Zone civile'],['controle',-56,-12,12,38,29,'Poste de contrôle ORDRE'],['acces',-35,-40,25,24,22,'Accès au barrage'],['barrage',41,-45,25,128,23,'Barrage ORDRE'],['aegis',109,-70,32,28,28,'Extraction AEGIS']
].map(([id,x,z,height,w,d,label])=>({id,x,z,height,w,d,label,x1:x-w/2,x2:x+w/2,z1:z-d/2,z2:z+d/2}));
export const AREAS=FLOORS;
export const areaAt=(x,z)=>AREAS.find(a=>x>=a.x1&&x<=a.x2&&z>=a.z1&&z<=a.z2)?.id||'passerelle';
export const BUILDINGS=[[-104,53,2,15,24,13],[-78,67,2,12,9,5],[-87,12,8,10,9,7],[-81,1,8,10,7,5],[-54,20,8,10,10,5],[-52,8,8,6,7,8],[-91,29,8,8,4,4],[-64,-14,12,12,13,9],[-44,-24,12,9,5,6],[-43,-43,25,8,9,5],[50,-50,25,9,8,4]];
export const TOWERS=[[-110,62,2,10],[-68,62,2,10],[-72,-21,12,12],[-40,-3,12,10],[-48,-50,25,9],[70,-53,25,5],[92,-53,25,5]];
export const COVER=[[66,-51,25],[74,-38,25],[86,-50,25],[93,-38,25],[-82,48,2],[-95,42,2],[-74,19,8],[-61,24,8],[-46,-7,12],[-29,-38,25],[117,-64,32]];
export const RELAYS=[-8,11,30];
export const DOORS=[],OPEN_FOR={};
const box=(kind,x,z,y,w,d,height)=>({kind,x,z,y,hx:w/2,hz:d/2,height,navPad:.45});
export const buildCollisions=()=>[...BUILDINGS.map(([x,z,y,w,d,h])=>box('building',x,z,y,w,d,h)),...TOWERS.map(([x,z,y,h])=>box('tower',x,z,y,3.7,3.7,h)),...COVER.map(([x,z,y])=>box('cover',x,z,y,2.6,.8,1.1)),...RELAYS.map(x=>box('relay',x,-51,25,6,6,7)),box('aegis-vtol',109,-71,32,4,7,3)];
export function walkSurfaces(x,z){
 const out=FLOORS.filter(f=>x>=f.x1&&x<=f.x2&&z>=f.z1&&z<=f.z2).map(f=>({id:f.id,height:f.height}));
 for(let i=0;i<ROUTE.length-1;i++){const [a,y,b]=ROUTE[i],[c,h,d]=ROUTE[i+1],dx=c-a,dz=d-b,l=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((x-a)*dx+(z-b)*dz)/l));if(Math.hypot(x-a-t*dx,z-b-t*dz)<=2.9)out.push({id:'route-'+i,height:y+(h-y)*t});}
 return out;
}
export function createTraversal(){const height=(x,z,t=0,max=Infinity)=>walkSurfaces(x,z).reduce((a,s)=>s.height<=max+.011?Math.max(a,s.height):a,-65);return{routes:[],lifts:[],bounds:{min:-165,max:165},surfaces:walkSurfaces,height,routeForSurface:()=>null,maxMoveStep:.055,navigation:{edge:-164,size:165,surface:height}};}
const defs=[
 ['access',-88,45,2,'Quitter HELIX','Rejoins le point de regroupement AEGIS.'],
 ['civils',-68,17,8,'Sécuriser la zone civile','Repousse les patrouilles et ouvre le corridor d’évacuation.'],
 ['surveillance',-53,-10,12,'Neutraliser la surveillance','Atteins le terminal ORDRE.'],
 ['barrage',-27,-41,25,'Rejoindre la plateforme haute','Suis les rampes balisées.'],
 ['relais-a',-8,-43,25,'Désactiver le relais A','Neutralise les unités, puis utilise la console.'],
 ['relais-b',11,-43,25,'Désactiver le relais B','Poursuis sur la crête.'],
 ['relais-c',30,-43,25,'Désactiver le relais C','Dernier relais avant les vannes.'],
 ['vannes',50,-43,25,'Ouvrir les vannes','Rétablis le passage du convoi.'],
 ['contre-attaque',81,-43,25,'Repousser la contre-attaque','Protège le corridor face aux unités lourdes.'],
 ['extraction',109,-64,32,'Rejoindre AEGIS','Suis la dernière rampe vers la navette.']
];
export const INTERACTIONS=defs.map(([id,x,z,y,label,hint],i)=>({id,x,z,y,label,hint,radius:2.5,number:i+1}));
export const STAGES=[...INTERACTIONS.map((p,i)=>({...p,checkpoint:i?{...INTERACTIONS[i-1],yaw:0}:START})),{id:'fin',label:'Le corridor de Vesper est libéré',hint:'Retour à la planque.',checkpoint:INTERACTIONS.at(-1)}];
export const HOLDS={'relais-a':8,'relais-b':8,'relais-c':8,vannes:15,'contre-attaque':18,extraction:12};
export const SUPPLIES=[{kind:'heal',x:-91,z:49,y:2},{kind:'cell',x:-65,z:23,y:8},{kind:'heal',x:-52,z:-8,y:12},{kind:'cell',x:-31,z:-43,y:25},{kind:'heal',x:18,z:-46,y:25},{kind:'cell',x:54,z:-41,y:25},{kind:'heal',x:96,z:-43,y:25}];
const u=(form,x,z)=>({form,x,z});
export const ENCOUNTERS={access:[u('stalker',-91,40),u('probe',-84,45)],civils:[u('stalker',-70,11),u('synth',-64,12),u('probe',-68,8)],surveillance:[u('seer',-48,-11),u('stalker',-53,-18),u('probe',-55,-5)],barrage:[u('stalker',-32,-44),u('synth',-22,-43)],'relais-a':[u('synth',-3,-40),u('probe',0,-43)],'relais-b':[u('stalker',15,-40),u('seer',19,-43)],'relais-c':[u('bulwark',35,-43),u('probe',37,-40)],vannes:[u('stalker',55,-40),u('synth',57,-43)],'contre-attaque':[u('bulwark',85,-43),u('brute',91,-43),u('probe',90,-40),u('stalker',77,-41)],extraction:[u('stalker',112,-60),u('probe',105,-61)]};
export const WALKTHROUGH=ROUTE.map(([x,y,z])=>({x,y,z}));
export function guideTarget(stage,p){const it=INTERACTIONS[stage];if(!it)return null;let nearest=0,best=Infinity;for(let i=0;i<ROUTE.length;i++){const [x,y,z]=ROUTE[i],d=Math.hypot(x-p.x,z-p.z,(y-p.elevation)*2);if(d<best){best=d;nearest=i;}}let target=0,dist=Infinity;for(let i=0;i<ROUTE.length;i++){const [x,y,z]=ROUTE[i],d=Math.hypot(x-it.x,z-it.z,(y-it.y)*2);if(d<dist){dist=d;target=i;}}if(Math.abs(target-nearest)<=1&&Math.abs(p.elevation-it.y)<.5)return it;const [x,y,z]=ROUTE[nearest+Math.sign(target-nearest)];return{x,y,z};}
