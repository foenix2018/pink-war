// M12 — La nuit d'ORDRE. Metres. AEGIS refuge: 10 sectors, 12 actions.
export const LEVEL_ID='m12-la-nuit-d-ordre',PLAN={chapter:12,title:'La nuit d’ORDRE'};
export const START={x:-103,z:76,y:4,yaw:Math.PI};
export const ROUTE=[[-103,4,76],[-103,4,54],[-93,4,43],[-74,4,39],[-62,4,26],[-75,4,16],[-91,4,16],[-102,4,16],[-108,4,4],[-108,7,-6],[-108,10,-13],[-99,10,-23],[-84,10,-25],[-71,10,-25],[-61,5,-31],[-51,0,-36],[-38,0,-36],[-27,0,-36],[-18,4,-49],[-18,9,-64],[-5,14,-70],[0,16,-62],[5,16,-54],[5,16,-40],[23,16,-40],[42,16,-40],[56,16,-39],[61,16,-36],[66,14,-32],[79,12,-27],[89,12,-27],[89,12,-16],[89,10,-10],[89,6,7],[79,4,21],[79,4,34],[95,4,42],[115,4,49],[128,4,49]];
export const FLOORS=[
 ['entree',-103,57,4,24,44,'01 · Entrée du refuge'],
 ['civils',-76,32,4,54,31,'02 · Zone civile'],
 ['generateurs',-91,10,4,36,20,'03 · Générateurs'],
 ['breche',-93,-25,10,44,24,'04 · Brèche Est'],
 ['noyau',-40,-36,0,32,22,'05 · Noyau de contrôle'],
 ['resonance',5,-44,16,36,36,'06 · Dôme de Résonance'],
 ['assaut',42,-40,16,38,32,'07 · Cour de défense'],
 ['relais',85,-28,12,27,24,'08 · Relais ORDRE'],
 ['civils-extraction',93,30,4,50,32,'09 · Embarquement'],
 ['evacuation',118,49,4,33,25,'10 · Évacuation finale']
].map(([id,x,z,height,w,d,label])=>({id,x,z,height,w,d,label,x1:x-w/2,x2:x+w/2,z1:z-d/2,z2:z+d/2}));
export const AREAS=FLOORS;export const areaAt=(x,z)=>AREAS.find(a=>x>=a.x1&&x<=a.x2&&z>=a.z1&&z<=a.z2)?.id||'passerelle';
export const BUILDINGS=[[-112,53,4,5,14,8],[-87,29,4,9,7,6],[-66,43,4,10,7,5],[-55,34,4,6,9,7],[-98,4,4,6,7,6],[-78,-32,10,10,9,9],[-104,-32,10,8,8,8],[-35,-44,0,8,4,6],[33,-51,16,10,7,5],[52,-50,16,9,7,7],[95,-35,12,6,5,7],[70,30,4,6,8,6],[102,25,4,7,6,6],[121,41,4,8,6,5]];
export const TOWERS=[[-113,69,4,8],[-94,70,4,8],[-101,30,4,7],[-111,-25,10,8],[-74,-18,10,7],[24,-58,16,9],[55,-52,16,9],[96,-21,12,8],[105,39,4,6],[129,42,4,7]];
export const COVER=[[-96,37,4],[-79,45,4],[-59,35,4],[-84,4,4],[-101,0,4],[-97,-31,10],[-86,-19,10],[-75,-31,10],[-48,-40,0],[-30,-43,0],[15,-51,16],[23,-32,16],[35,-32,16],[48,-48,16],[54,-32,16],[80,-34,12],[96,-30,12],[83,25,4],[97,32,4],[110,55,4],[123,55,4]];
export const GENERATORS=[[-102,8],[-91,8],[-75,8]];export const DOORS=[],OPEN_FOR={};
const box=(kind,x,z,y,w,d,height)=>({kind,x,z,y,hx:w/2,hz:d/2,height,navPad:.45});
export const buildCollisions=()=>[...BUILDINGS.map(([x,z,y,w,d,h])=>box('building',x,z,y,w,d,h)),...TOWERS.map(([x,z,y,h])=>box('tower',x,z,y,2.6,2.6,h)),...COVER.map(([x,z,y])=>box('cover',x,z,y,2.4,.65,1.12)),...GENERATORS.map(([x,z])=>box('generator',x,z,4,3.5,3.5,4.1)),box('relay',87,-35,12,5,4,7),box('aegis-vtol',111,35,4,5,9,3)];
export function walkSurfaces(x,z){
 const out=FLOORS.filter(f=>x>=f.x1&&x<=f.x2&&z>=f.z1&&z<=f.z2).map(f=>({id:f.id,height:f.height}));
 for(let i=0;i<ROUTE.length-1;i++){const [a,y,b]=ROUTE[i],[c,h,d]=ROUTE[i+1],dx=c-a,dz=d-b,l=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((x-a)*dx+(z-b)*dz)/l));if(Math.hypot(x-a-t*dx,z-b-t*dz)<=3.2)out.push({id:'route-'+i,height:y+(h-y)*t});}return out;
}
export function createTraversal(){const height=(x,z,t=0,max=Infinity)=>walkSurfaces(x,z).reduce((a,s)=>s.height<=max+.011?Math.max(a,s.height):a,-65);return{routes:[],lifts:[],bounds:{min:-170,max:170},surfaces:walkSurfaces,height,routeForSurface:()=>null,maxMoveStep:.055,navigation:{edge:-169,size:170,surface:height}};}
const defs=[
 ['access',-103,54,4,'Rejoindre le refuge AEGIS','Accès d’urgence.'],
 ['civils',-74,39,4,'Sécuriser la zone civile','Protéger les survivants et l’infirmerie.'],
 ['gen-a',-75,16,4,'Rétablir le générateur A','Réactiver le premier circuit de défense.'],
 ['gen-b',-91,16,4,'Rétablir le générateur B','Réalimenter le deuxième circuit.'],
 ['gen-c',-102,16,4,'Rétablir le générateur C','Rétablir les défenses AEGIS.'],
 ['breche',-84,-25,10,'Contenir la brèche Est','Repousser les vagues d’ORDRE.'],
 ['noyau',-38,-36,0,'Accéder au noyau de contrôle','Descendre jusqu’au cœur des systèmes.'],
 ['resonance',5,-40,16,'Séquence de Résonance','GAB-1 et CAR-14 : synchronisation.'],
 ['assaut',42,-40,16,'Résister à l’assaut majeur','Briser l’encerclement des unités lourdes.'],
 ['relais',89,-27,12,'Neutraliser le relais ORDRE','Couper la coordination ennemie.'],
 ['extraction',79,34,4,'Extraction des civils','Regrouper les survivants auprès d’AEGIS.'],
 ['evacuation',128,49,4,'Évacuation finale','Départ du refuge.']
];
export const INTERACTIONS=defs.map(([id,x,z,y,label,hint],i)=>({id,x,z,y,label,hint,radius:2.8,number:i+1}));
export const STAGES=[...INTERACTIONS.map((p,i)=>({...p,checkpoint:i?{...INTERACTIONS[i-1],yaw:0}:START})),{id:'fin',label:'AEGIS a évacué les survivants',hint:'Retour à la planque.',checkpoint:INTERACTIONS.at(-1)}];
export const HOLDS={'gen-a':5,'gen-b':5,'gen-c':6,breche:12,noyau:6,resonance:9,assaut:15,relais:8,extraction:10,evacuation:10};
export const SUPPLIES=[{kind:'heal',x:-100,z:52,y:4},{kind:'cell',x:-79,z:35,y:4},{kind:'heal',x:-93,z:13,y:4},{kind:'cell',x:-82,z:-25,y:10},{kind:'heal',x:-45,z:-36,y:0},{kind:'cell',x:10,z:-42,y:16},{kind:'heal',x:39,z:-44,y:16},{kind:'cell',x:86,z:-26,y:12},{kind:'heal',x:82,z:34,y:4}];
const u=(form,x,z)=>({form,x,z});
export const ENCOUNTERS={access:[u('stalker',-100,50),u('probe',-99,55)],civils:[u('stalker',-69,35),u('synth',-78,33),u('probe',-73,44)],'gen-a':[u('synth',-76,13),u('probe',-79,17)],'gen-b':[u('stalker',-87,11),u('seer',-94,17)],'gen-c':[u('stalker',-97,12),u('probe',-103,19)],breche:[u('synth',-92,-23),u('stalker',-88,-26),u('bulwark',-79,-25),u('probe',-89,-21)],noyau:[u('stalker',-42,-33),u('synth',-32,-34)],resonance:[u('stalker',9,-36),u('probe',-1,-37)],assaut:[u('bulwark',36,-40),u('brute',48,-41),u('stalker',43,-35),u('seer',50,-36),u('probe',39,-37)],relais:[u('synth',85,-24),u('seer',91,-26),u('probe',83,-28)],extraction:[u('stalker',83,38),u('synth',91,31),u('probe',86,34)],evacuation:[u('bulwark',119,47),u('stalker',124,51),u('probe',127,46)]};
export const WALKTHROUGH=ROUTE.map(([x,y,z])=>({x,y,z}));
export function guideTarget(stage,p){const it=INTERACTIONS[stage];if(!it)return null;let nearest=0,best=Infinity;for(let i=0;i<ROUTE.length;i++){const [x,y,z]=ROUTE[i],d=Math.hypot(x-p.x,z-p.z,(y-p.elevation)*2);if(d<best){best=d;nearest=i;}}let target=0,dist=Infinity;for(let i=0;i<ROUTE.length;i++){const [x,y,z]=ROUTE[i],d=Math.hypot(x-it.x,z-it.z,(y-it.y)*2);if(d<dist){dist=d;target=i;}}if(Math.abs(target-nearest)<=1&&Math.abs(p.elevation-it.y)<.5)return it;const [x,y,z]=ROUTE[nearest+Math.sign(target-nearest)];return{x,y,z};}
