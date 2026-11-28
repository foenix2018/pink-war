// M13 — metres, shared geometry / physics data. Prototype outside campaign.
export const LEVEL_ID='m13-bio-lab',PLAN={chapter:13,title:'Les vies sous contrôle'};
export const Y=8,START={x:-100,z:79,y:Y,yaw:0};
const floor=(id,x,z,w,d,label,roof)=>({id,x,z,w,d,height:Y,x1:x-w/2,x2:x+w/2,z1:z-d/2,z2:z+d/2,label,roof});
export const FLOORS=[
 floor('access',-100,64,32,40,'01 · Infiltration'),
 floor('bio',40,35,54,38,'02 · BIO-LAB'),
 floor('archives',-40,12,50,34,'03 · Archives PINK'),
 floor('stase',-79,-34,42,40,'04 · Salle de stase'),
 floor('verite',-5,-44,54,48,'05 · Vérité'),
 floor('noyau',70,-50,46,44,'06 · Noyau de contrôle'),
 floor('evacuation',128,-50,42,36,'07 · Évacuation')
];
export const ROUTE=[[-100,Y,79],[-100,Y,51],[40,Y,51],[40,Y,12],[-40,Y,12],[-79,Y,12],[-79,Y,-34],[-5,Y,-34],[-5,Y,-44],[70,Y,-44],[70,Y,-50],[128,Y,-50]];
export const BRIDGES=ROUTE.slice(1).map(([x,y,z],i)=>{const [a,,b]=ROUTE[i];return floor('bridge-'+i,(a+x)/2,(b+z)/2,Math.abs(a-x)+7,Math.abs(b-z)+7,'Passerelle');});
export const AREAS=FLOORS;export const DECKS=[...FLOORS,...BRIDGES];
export const inside=(x,z)=>DECKS.some(f=>x>=f.x1&&x<=f.x2&&z>=f.z1&&z<=f.z2);
export const areaAt=(x,z)=>AREAS.find(f=>x>=f.x1&&x<=f.x2&&z>=f.z1&&z<=f.z2)?.id||'passerelle';
// exact union boundary: all rectangles have integer/half-integer edges; merge adjacent spans.
export function perimeter(){const xs=[...new Set(DECKS.flatMap(f=>[f.x1,f.x2]))].sort((a,b)=>a-b),zs=[...new Set(DECKS.flatMap(f=>[f.z1,f.z2]))].sort((a,b)=>a-b),r=[];
 for(const x of xs){let start=null;for(let i=0;i<zs.length;i++){const z=zs[i],next=zs[i+1],edge=next!==undefined&&(inside(x-.05,(z+next)/2)!==inside(x+.05,(z+next)/2));if(edge&&start===null)start=z;if(!edge&&start!==null){r.push([x,start,x,z]);start=null;}}}
 for(const z of zs){let start=null;for(let i=0;i<xs.length;i++){const x=xs[i],next=xs[i+1],edge=next!==undefined&&(inside((x+next)/2,z-.05)!==inside((x+next)/2,z+.05));if(edge&&start===null)start=x;if(!edge&&start!==null){r.push([start,z,x,z]);start=null;}}}return r;}
export const RAILS=perimeter();
const solid=(id,x,z,w,d,h,material='dark')=>({id,x,z,y:Y,w,d,h,material});
// Three enclosed labs; the 8m front door is a physical opening, not a painted door.
export const ROOMS=[{id:'bio',x:40,z:34,w:44,d:30,h:9},{id:'archives',x:-40,z:12,w:40,d:26,h:8},{id:'stase',x:-79,z:-34,w:34,d:32,h:10}];
export const WALLS=ROOMS.flatMap(r=>{const side=(r.w-8)/2;return [solid(r.id+'-west',r.x-r.w/2,r.z,.55,r.d,r.h),solid(r.id+'-east',r.x+r.w/2,r.z,.55,r.d,r.h),solid(r.id+'-north',r.x,r.z-r.d/2,r.w,.55,r.h),solid(r.id+'-south-l',r.x-(8+side)/2,r.z+r.d/2,side,.55,r.h),solid(r.id+'-south-r',r.x+(8+side)/2,r.z+r.d/2,side,.55,r.h)];});
export const TANKS=[...[-13,-6,6,13].map((dx,i)=>solid('bio-pod-'+i,40+dx,25,2.6,2.6,4.8,'pod')),...[-12,-6,0,6,12].map((dx,i)=>solid('stase-pod-'+i,-79+dx,-43,2.7,2.7,5.5,'pod'))];
export const RACKS=[-54,-47,-33,-26].flatMap((x,i)=>[-4,3].map((dz,j)=>solid('rack-'+i+'-'+j,x,12+dz,2.1,3,3.8,'rack')));
export const MACHINES=[solid('core',70,-57,7,7,13,'core'),solid('truth',-5,-51,12,12,12,'truth'),solid('aircraft',135,-56,11,9,3,'aircraft'),...[-16,16].map((dx,i)=>solid('gate-'+i,-100+dx,54,2.8,5,10,'tower'))];
export const COVER=[solid('crate-1',-108,68,3,2,1.5,'crate'),solid('crate-2',22,48,3,2,1.5,'crate'),solid('crate-3',-58,23,3,2,1.5,'crate'),solid('crate-4',-94,-17,3,2,1.5,'crate'),solid('crate-5',50,-39,3,2,1.5,'crate'),solid('crate-6',116,-38,3,2,1.5,'crate')];
export const SOLIDS=[...WALLS,...TANKS,...RACKS,...MACHINES,...COVER];
export const buildCollisions=()=>[...SOLIDS.map(s=>({kind:s.id,x:s.x,z:s.z,y:s.y,hx:s.w/2,hz:s.d/2,height:s.h,navPad:.35})),...RAILS.map(([x,z,a,b])=>({kind:'rail',x:(x+a)/2,z:(z+b)/2,y:Y,hx:Math.max(.12,Math.abs(x-a)/2),hz:Math.max(.12,Math.abs(z-b)/2),height:1.3,navPad:.12}))];
export function walkSurfaces(x,z){return inside(x,z)?[{id:areaAt(x,z),height:Y}]:[];}
export function createTraversal(){const height=(x,z,t=0,max=Infinity)=>inside(x,z)&&Y<=max+.011?Y:-65;return{routes:[],lifts:[],bounds:{min:-175,max:175},surfaces:walkSurfaces,height,routeForSurface:()=>null,maxMoveStep:.055,navigation:{edge:-174,size:175,surface:height}};}
const defs=[
 ['access',-100,58,'Infiltrer le complexe ORDRE','Franchir le poste de contrôle.'],
 ['bio',40,39,'Accéder au BIO-LAB','Inspecter les cuves de recherche PINK.'],
 ['archives',-40,17,'Collecter les données PINK','Extraire les traces du transfert.'],
 ['stase',-79,-27,'Libérer les sujets humains','Déverrouiller les cellules de stase.'],
 ['verite',-5,-42,'Découvrir la vérité sur GAB-1 et CAR-14','Analyser les deux consciences.'],
 ['noyau',70,-46,'Neutraliser le noyau de contrôle','Désactiver le programme PINK.'],
 ['evacuation',128,-46,'Évacuer le complexe','Rejoindre la plateforme d’extraction.']
];
export const INTERACTIONS=defs.map(([id,x,z,label,hint],i)=>({id,x,z,y:Y,label,hint,radius:3.2,number:i+1}));
export const STAGES=[...INTERACTIONS.map((p,i)=>({...p,checkpoint:i?{...INTERACTIONS[i-1],yaw:0}:START})),{id:'fin',label:'Complexe évacué',hint:'Fin de la préversion.',checkpoint:INTERACTIONS.at(-1)}];
export const HOLDS={bio:5,archives:8,stase:8,verite:10,noyau:15,evacuation:6};
export const SUPPLIES=INTERACTIONS.map((p,i)=>({kind:i%2?'cell':'heal',x:p.x+3.5,z:p.z+1,y:Y}));
const u=(form,x,z)=>({form,x,z});
export const ENCOUNTERS={access:[u('stalker',-106,59),u('probe',-94,60)],bio:[u('stalker',35,41),u('synth',45,42)],archives:[u('stalker',-44,20),u('probe',-36,20)],stase:[u('synth',-85,-24),u('stalker',-73,-24)],verite:[u('probe',-12,-35)],noyau:[u('bulwark',64,-42),u('stalker',76,-42),u('probe',72,-35)],evacuation:[u('stalker',122,-42),u('probe',131,-39)]};
export const WALKTHROUGH=ROUTE.map(([x,y,z])=>({x,y,z}));
export function guideTarget(stage,p){const it=INTERACTIONS[stage];if(!it)return null;const paths=[[[ -100,58]],[[ -100,51],[40,51],[40,39]],[[40,12],[-40,12],[-40,17]],[[-40,12],[-79,12],[-79,-27]],[[-79,-34],[-5,-34],[-5,-42]],[[-5,-44],[70,-44],[70,-46]],[[70,-50],[128,-50],[128,-46]]];const nodes=[stage?INTERACTIONS[stage-1]:START,...paths[stage].map(([x,z])=>({x,z,y:Y}))];let nearest=0,best=Infinity;nodes.forEach((n,i)=>{const d=Math.hypot(p.x-n.x,p.z-n.z);if(d<best){best=d;nearest=i;}});return nodes[Math.min(nearest+1,nodes.length-1)];}
