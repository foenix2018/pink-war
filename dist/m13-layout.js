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
const inRect=(f,x,z)=>x>=f.x1&&x<=f.x2&&z>=f.z1&&z<=f.z2;
export const baseInside=(x,z)=>DECKS.some(f=>inRect(f,x,z));
export const ANNEXES=[
 {...floor('security',-148,64,32,28,'01B · Poste de surveillance'),height:14},
 {...floor('research',100,35,26,34,'02B · Unité de transfert'),height:3},
 {...floor('stase-west',-138,-34,32,34,'04B · Quartier de quarantaine'),height:14},
 {...floor('reactor-north',70,-108,34,28,'06B · Régulation haute tension'),height:20}
];
export const RAMPS=[
 {id:'r-security',x1:-132,x2:-116,z1:60,z2:68,axis:'x',from:-116,to:-132,y0:8,y1:14},
 {id:'r-research',x1:67,x2:87,z1:31,z2:39,axis:'x',from:67,to:87,y0:8,y1:3},
 {id:'r-stase',x1:-122,x2:-100,z1:-38,z2:-30,axis:'x',from:-100,to:-122,y0:8,y1:14},
 {id:'r-reactor',x1:66,x2:74,z1:-94,z2:-72,axis:'z',from:-72,to:-94,y0:8,y1:20}
];
export const rampHeight=(r,x,z)=>r.y0+(r.y1-r.y0)*(((r.axis==='x'?x:z)-r.from)/(r.to-r.from));
export const inside=(x,z)=>baseInside(x,z)||ANNEXES.some(f=>inRect(f,x,z))||RAMPS.some(r=>inRect(r,x,z));
export const areaAt=(x,z)=>AREAS.find(f=>x>=f.x1&&x<=f.x2&&z>=f.z1&&z<=f.z2)?.id||'passerelle';
// exact union boundary: all rectangles have integer/half-integer edges; merge adjacent spans.
export function perimeter(){const xs=[...new Set(DECKS.flatMap(f=>[f.x1,f.x2]))].sort((a,b)=>a-b),zs=[...new Set(DECKS.flatMap(f=>[f.z1,f.z2]))].sort((a,b)=>a-b),r=[];
 for(const x of xs){let start=null;for(let i=0;i<zs.length;i++){const z=zs[i],next=zs[i+1],edge=next!==undefined&&(baseInside(x-.05,(z+next)/2)!==baseInside(x+.05,(z+next)/2));if(edge&&start===null)start=z;if(!edge&&start!==null){r.push([x,start,x,z]);start=null;}}}
 for(const z of zs){let start=null;for(let i=0;i<xs.length;i++){const x=xs[i],next=xs[i+1],edge=next!==undefined&&(baseInside((x+next)/2,z-.05)!==baseInside((x+next)/2,z+.05));if(edge&&start===null)start=x;if(!edge&&start!==null){r.push([start,z,x,z]);start=null;}}}return r;}
// Remove each access opening from the original guardrail and add sloped rails and terrace rails.
const cuts=[[-116,60,-116,68],[67,31,67,39],[-100,-38,-100,-30],[66,-72,74,-72]];
function splitRail(a,c){const [x,z,b,d]=a,[u,v,w,t]=c,vert=x===b;if(vert?(x!==u||u!==w):(z!==v||v!==t))return[a];const lo=vert?z:x,hi=vert?d:b,cl=vert?v:u,ch=vert?t:w;if(ch<=lo||cl>=hi)return[a];const mk=(p,q)=>vert?[x,p,x,q]:[p,z,q,z];return [lo<cl?mk(lo,cl):null,ch<hi?mk(ch,hi):null].filter(Boolean);}
export const RAILS=cuts.reduce((a,c)=>a.flatMap(r=>splitRail(r,c)),perimeter());
export const UPPER_RAILS=ANNEXES.flatMap((f,i)=>{const r=RAMPS[i],all=[[f.x1,f.z1,f.x2,f.z1],[f.x1,f.z2,f.x2,f.z2],[f.x1,f.z1,f.x1,f.z2],[f.x2,f.z1,f.x2,f.z2]],opening=r.axis==='x'?[r.to,r.z1,r.to,r.z2]:[r.x1,r.to,r.x2,r.to];return all.flatMap(a=>splitRail(a,opening)).map(([x,z,b,d])=>({x,z,b,d,y0:f.height,y1:f.height}));});
export const SLOPE_RAILS=RAMPS.flatMap(r=>r.axis==='x'?[r.z1,r.z2].map(z=>({x:r.from,z,b:r.to,d:z,y0:r.y0,y1:r.y1})):[r.x1,r.x2].map(x=>({x,z:r.from,b:x,d:r.to,y0:r.y0,y1:r.y1})));

const solid=(id,x,z,w,d,h,material='dark')=>({id,x,z,y:Y,w,d,h,material});
// Three enclosed labs; the 8m front door is a physical opening, not a painted door.
export const ROOMS=[{id:'bio',x:40,z:34,w:44,d:30,h:9},{id:'archives',x:-40,z:12,w:40,d:26,h:8},{id:'stase',x:-79,z:-34,w:34,d:32,h:10}];
export const WALLS=ROOMS.flatMap(r=>{const a=(r.w-8)/2,b=(r.d-8)/2;return [-1,1].flatMap(k=>[-1,1].flatMap(j=>[solid(r.id+'-ew-'+k+'-'+j,r.x+k*r.w/2,r.z+j*(8+b)/2,.55,b,r.h),solid(r.id+'-ns-'+k+'-'+j,r.x+j*(8+a)/2,r.z+k*r.d/2,a,.55,r.h)]));});
export const TANKS=[...[-13,-6,6,13].map((dx,i)=>solid('bio-pod-'+i,40+dx,25,2.6,2.6,4.8,'pod')),...[-12,-6,0,6,12].map((dx,i)=>solid('stase-pod-'+i,-79+dx,-43,2.7,2.7,5.5,'pod'))];
export const RACKS=[-54,-47,-33,-26].flatMap((x,i)=>[-4,3].map((dz,j)=>solid('rack-'+i+'-'+j,x,12+dz,2.1,3,3.8,'rack')));
export const MACHINES=[solid('core',70,-57,7,7,13,'core'),solid('truth',-5,-51,12,12,12,'truth'),solid('aircraft',135,-56,11,9,3,'aircraft'),...[-16,16].map((dx,i)=>solid('gate-'+i,-100+dx,54,2.8,5,10,'tower'))];
export const COVER=[solid('crate-1',-108,68,3,2,1.5,'crate'),solid('crate-2',22,48,3,2,1.5,'crate'),solid('crate-3',-58,23,3,2,1.5,'crate'),solid('crate-4',-94,-17,3,2,1.5,'crate'),solid('crate-5',50,-39,3,2,1.5,'crate'),solid('crate-6',116,-38,3,2,1.5,'crate')];
// Additional playable architecture and machinery. One authoritative footprint per object.
export const DETAIL_PROPS=[
 solid('security-desk',-109,61,3.0,1.4,1.25,'desk'),
 solid('bio-console',29,39,2.4,1.2,1.25,'desk'),solid('bio-console-east',51,39,2.4,1.2,1.25,'desk'),
 solid('bio-pump',53,29,2.0,2.0,2.7,'pump'),solid('bio-pump-west',27,29,2.0,2.0,2.7,'pump'),
 solid('archive-console',-46,22,2.7,1.4,1.25,'desk'),solid('archive-ups',-56,18,2.5,1.6,2.4,'cabinet'),
 solid('stase-console',-90,-30,2.4,1.2,1.25,'desk'),solid('stase-console-east',-68,-30,2.4,1.2,1.25,'desk'),
 solid('truth-console',-13,-44,2.4,1.2,1.25,'desk'),solid('truth-transformer',13,-58,4,3,3.3,'pump'),
 solid('core-console',79,-49,2.5,1.2,1.25,'desk'),solid('core-transformer',83,-61,4,3,3.3,'pump'),
 solid('evac-cabinet',112,-56,2.0,2.0,2.3,'cabinet'),solid('evac-console',117,-44,2.4,1.2,1.25,'desk')
];
const annexSolid=(id,x,z,y,w,d,h,material)=>({id,x,z,y,w,d,h,material});
export const ANNEX_PROPS=ANNEXES.flatMap(f=>[-1,1].flatMap(q=>[
 annexSolid(f.id+'-cab-'+q,f.x+q*9,f.z-5,f.height,4,2.8,3.6,'cabinet'),
 annexSolid(f.id+'-machine-'+q,f.x+q*8,f.z+7,f.height,3.8,3.5,3.1,'pump')
]));
export const SOLIDS=[...WALLS,...TANKS,...RACKS,...MACHINES,...COVER,...DETAIL_PROPS,...ANNEX_PROPS];
export const buildCollisions=()=>[...SOLIDS.map(s=>({kind:s.id,x:s.x,z:s.z,y:s.y,hx:s.w/2,hz:s.d/2,height:s.h,navPad:.35})),...RAILS.map(([x,z,a,b])=>({kind:'rail',x:(x+a)/2,z:(z+b)/2,y:Y,hx:Math.max(.12,Math.abs(x-a)/2),hz:Math.max(.12,Math.abs(z-b)/2),height:1.3,navPad:.12})),...UPPER_RAILS.map(r=>({kind:'rail-upper',x:(r.x+r.b)/2,z:(r.z+r.d)/2,y:r.y0,hx:Math.max(.12,Math.abs(r.x-r.b)/2),hz:Math.max(.12,Math.abs(r.z-r.d)/2),height:1.3,navPad:.12})),...SLOPE_RAILS.flatMap(r=>{const n=Math.ceil(Math.hypot(r.b-r.x,r.d-r.z)/1.5);return Array.from({length:n},(_,i)=>{const t=(i+.5)/n,y=r.y0+(r.y1-r.y0)*t;return {kind:'rail-slope',x:r.x+(r.b-r.x)*t,z:r.z+(r.d-r.z)*t,y:y-.35,hx:Math.max(.13,Math.abs(r.b-r.x)/n/2),hz:Math.max(.13,Math.abs(r.d-r.z)/n/2),height:1.8,navPad:.12};});})];
export function walkSurfaces(x,z){const out=baseInside(x,z)?[{id:areaAt(x,z),height:Y}]:[];for(const f of ANNEXES)if(inRect(f,x,z))out.push({id:f.id,height:f.height});for(const r of RAMPS)if(inRect(r,x,z))out.push({id:r.id,height:rampHeight(r,x,z)});return out;}
export function createTraversal(){const height=(x,z,t=0,max=Infinity)=>walkSurfaces(x,z).reduce((a,f)=>f.height<=max+.011?Math.max(a,f.height):a,-65);return{routes:[],lifts:[],bounds:{min:-175,max:175},surfaces:walkSurfaces,height,routeForSurface:()=>null,maxMoveStep:.055,navigation:{edge:-174,size:175,surface:height}};}
const defs=[
 ['access',-100,58,'Franchir le contrôle ORDRE','Éliminer la patrouille.'],
 ['security',-148,64,'Détourner la surveillance','Monter au poste de contrôle.'],
 ['security-data',-156,64,'Extraire les codes d’accès','Copier les autorisations BIO-LAB.'],
 ['bridge',-18,51,'Traverser le viaduc','Se mettre à couvert pendant la progression.'],
 ['bio',40,39,'Accéder au BIO-LAB','Sécuriser la salle de recherche.'],
 ['bio-scan',40,28,'Identifier les cuves PINK','Analyser les échantillons.'],
 ['research',100,35,'Inspecter l’unité de transfert','Descendre vers les installations B1.'],
 ['research-data',108,35,'Extraire le protocole neural','Déchiffrer les signatures.'],
 ['archives',-40,17,'Accéder aux archives PINK','Repérer les données originales.'],
 ['archive-backup',-40,5,'Copier le serveur de secours','Préserver les preuves.'],
 ['archive-exit',-40,20,'Déverrouiller la sortie des archives','Interrompre le verrouillage.'],
 ['stase',-79,-27,'Accéder à la salle de stase','Repérer les sujets humains.'],
 ['stase-power',-79,-38,'Isoler les conduites de stase','Maintenir les fonctions vitales.'],
 ['quarantine',-138,-34,'Ouvrir la quarantaine','Rejoindre l’annexe en hauteur.'],
 ['quarantine-data',-146,-34,'Libérer les sujets humains','Neutraliser le contrôle local.'],
 ['verite',-5,-42,'Découvrir la vérité sur GAB-1 et CAR-14','Écouter le transfert de mémoire.'],
 ['truth-data',3,-39,'Sauvegarder les consciences','Protéger les preuves de la famille.'],
 ['noyau',70,-46,'Atteindre le noyau de contrôle','Sécuriser le réacteur.'],
 ['regulation',70,-108,'Couper les régulateurs','Monter vers la haute tension.'],
 ['regulation-b',79,-108,'Désynchroniser le programme PINK','Neutraliser le circuit secondaire.'],
 ['shutdown',70,-46,'Neutraliser le noyau','Résister aux dernières unités ORDRE.'],
 ['evacuation',128,-46,'Évacuer le complexe','Sécuriser le point d’extraction.']
];
export const INTERACTIONS=defs.map(([id,x,z,label,hint],i)=>({id,x,z,y:createTraversal().height(x,z),label,hint,radius:3.2,number:i+1}));
export const STAGES=[...INTERACTIONS.map((p,i)=>({...p,checkpoint:i?{...INTERACTIONS[i-1],yaw:0}:START})),{id:'fin',label:'Complexe évacué',hint:'Fin de la préversion.',checkpoint:INTERACTIONS.at(-1)}];
export const HOLDS={security:18,'security-data':12,bio:12,'bio-scan':20,research:15,'research-data':22,archives:12,'archive-backup':25,'archive-exit':10,stase:12,'stase-power':20,quarantine:15,'quarantine-data':25,verite:28,'truth-data':15,noyau:12,regulation:20,'regulation-b':18,shutdown:35,evacuation:25};
export const SUPPLIES=INTERACTIONS.filter((_,i)=>i%2===0).map((p,i)=>({kind:i%2?'cell':'heal',x:p.x,z:p.z+2,y:p.y}));
const u=(form,x,z)=>({form,x,z});
export const ENCOUNTERS={access:[u('stalker',-106,59),u('probe',-94,60),u('synth',-99,70)],security:[u('stalker',-152,67),u('synth',-145,60),u('probe',-148,68)],'security-data':[u('probe',-150,60)],bridge:[u('stalker',-25,50),u('synth',-12,50),u('probe',-8,52)],bio:[u('stalker',35,41),u('synth',45,42),u('probe',40,44)],'bio-scan':[u('probe',36,31)],research:[u('stalker',95,35),u('synth',105,35),u('probe',100,30)],'research-data':[u('seer',100,39)],archives:[u('stalker',-44,20),u('probe',-36,20),u('synth',-40,24)],'archive-backup':[u('seer',-40,1),u('probe',-37,5)],'archive-exit':[u('stalker',-36,24)],stase:[u('synth',-85,-24),u('stalker',-73,-24),u('probe',-79,-20)],'stase-power':[u('probe',-76,-36)],quarantine:[u('synth',-143,-34),u('stalker',-133,-34),u('probe',-138,-30)],'quarantine-data':[u('seer',-138,-38)],verite:[], 'truth-data':[u('probe',-12,-35),u('stalker',6,-35)],noyau:[u('bulwark',64,-42),u('stalker',76,-42),u('probe',72,-35)],regulation:[u('synth',65,-108),u('seer',75,-108),u('probe',70,-104)],'regulation-b':[u('bulwark',70,-112)],shutdown:[u('brute',63,-43),u('bulwark',77,-43),u('probe',72,-35)],evacuation:[u('stalker',122,-42),u('probe',131,-39),u('synth',128,-37)]};
export const REINFORCEMENTS={security:[u('probe',-143,63),u('synth',-153,65)],research:[u('stalker',95,38),u('probe',104,33)],'archive-backup':[u('stalker',-40,1),u('probe',-36,4)],quarantine:[u('synth',-133,-31),u('probe',-142,-37)],regulation:[u('stalker',65,-105),u('probe',74,-111)],shutdown:[u('brute',63,-43),u('seer',77,-43),u('probe',72,-35)],evacuation:[u('stalker',122,-42),u('probe',131,-39)]};
export const WALKTHROUGH=ROUTE.map(([x,y,z])=>({x,y,z}));
// Guidance waypoints follow connected corridors, including all altitude changes.
const routes=[
 [[-100,58]], [[-100,64],[-116,64],[-132,64],[-148,64]], [[-156,64]], [[-132,64],[-116,64],[-100,64],[-100,51],[-18,51]], [[40,51],[40,39]], [[40,28]], [[40,34],[62,34],[67,35],[87,35],[100,35]], [[108,35]], [[87,35],[67,35],[62,34],[40,34],[40,12],[-40,12],[-40,17]], [[-40,5]], [[-40,20]], [[-40,12],[-79,12],[-79,-27]], [[-79,-38]], [[-79,-34],[-100,-34],[-122,-34],[-138,-34]], [[-146,-34]], [[-122,-34],[-100,-34],[-79,-34],[-5,-34],[-5,-42]], [[-5,-36],[3,-36],[3,-39]], [[3,-36],[-5,-36],[-5,-44],[70,-44],[70,-46]], [[70,-50],[60,-50],[60,-66],[70,-68],[70,-72],[70,-94],[70,-108]], [[79,-108]], [[70,-108],[70,-94],[70,-72],[70,-68],[60,-66],[60,-50],[70,-46]], [[70,-50],[128,-50],[128,-46]]
];
export const GUIDES=routes.map((r,i)=>[i?INTERACTIONS[i-1]:START,...r.map(([x,z])=>({x,z,y:createTraversal().height(x,z)}))]);
export function guideTarget(stage,p){const nodes=GUIDES[stage];if(!nodes)return null;let nearest=0,best=Infinity;nodes.forEach((n,i)=>{const d=Math.hypot(p.x-n.x,p.z-n.z,(p.elevation-n.y)*2);if(d<best){best=d;nearest=i;}});return nodes[Math.min(nearest+1,nodes.length-1)];}
export const DURATION_TARGET_MIN=30;
