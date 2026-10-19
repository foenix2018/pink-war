// Equipment has a role, a footprint and a home in a specific sector.
export const BREACH_DRESSING = Object.freeze([
 {id:'inspection',type:'console',zone:'arrival',x:-11,z:73,w:3.2,d:1.4,h:1.05},
 {id:'arrival-sensor',type:'sensor',zone:'arrival',x:11,z:77,w:1.4,d:1.4,h:3.8},
 {id:'transfer-pod',type:'pod',zone:'arrival',x:19,z:81,w:5.8,d:6,h:3.4},
 {id:'cargo-control',type:'console',zone:'hangar',x:-23,z:57,w:3,d:1.5,h:1.05},
 {id:'drone-bench',type:'bench',zone:'hangar',x:-22,z:49,w:3,d:2,h:1.1},
 {id:'battery-bank',type:'batteries',zone:'hangar',x:23,z:48,w:3.4,d:4,h:2.9},
 {id:'tool-cart',type:'tools',zone:'hangar',x:-22,z:53,w:1.5,d:1,h:.9},
 {id:'maintenance-log',type:'console',zone:'passages',x:-23,z:25,w:3.2,d:1.4,h:1.05},
 {id:'server-bank',type:'servers',zone:'passages',x:-23,z:17,w:3.2,d:4,h:2.8},
 {id:'service-reel',type:'reel',zone:'passages',x:-23,z:8,w:2.6,d:2.6,h:1.5},
 {id:'relay-radiator',type:'radiator',zone:'courtyard',x:-24,z:-14,w:2,d:3.4,h:3.8},
 {id:'relay-radiator-2',type:'radiator',zone:'courtyard',x:24,z:-4,w:2,d:3.4,h:3.8},
 {id:'comms',type:'antenna',zone:'courtyard',x:-23,z:-24,w:2,d:2,h:6},
 {id:'reactor-monitor',type:'console',zone:'reactor',x:-20,z:-34,w:4,d:1.5,h:1.05},
 {id:'reactor-control',type:'holo-console',zone:'reactor',x:-20,z:-48,w:4,d:2.2,h:1.05},
 {id:'coolant-storage',type:'tank',zone:'reactor',x:21,z:-38,w:2.8,d:2.8,h:4},
 {id:'transformer',type:'batteries',zone:'reactor',x:23,z:-49,w:3.2,d:4,h:3.5},
 {id:'evac-log',type:'console',zone:'extraction',x:-23,z:-75,w:3,d:1.5,h:1.05},
 {id:'evac-supplies',type:'supplies',zone:'extraction',x:21,z:-85,w:3.2,d:2.5,h:1.9}
]);
export const BREACH_LOGS = Object.freeze([
 {id:'inspection',x:-11,z:74.6,y:0,title:'SAS / IDENTIFICATION',text:'ORDRE détourne notre énergie vers ses portails. Basculer les deux relais en dérivation avant de rejoindre le cœur.'},
 {id:'maintenance-log',x:-23,z:26.6,y:0,title:'MAINTENANCE / DERNIER RAPPORT',text:'Trois stabilisateurs alimentent le blindage du gardien. Leurs modules violets peuvent être neutralisés par les tirs.'},
 {id:'reactor-monitor',x:-20,z:-32.4,y:0,title:'CONTRÔLE / CONFINEMENT',text:'Chaque stabilisateur coupé affaiblit le gardien. Le sas d’extraction se trouve derrière le réacteur.'},
 {id:'evac-log',x:-23,z:-73.4,y:0,title:'ÉVACUATION / CANAL LOCAL',text:'Dernier indicatif évacué : {sibling}. La liaison de sortie restera disponible après la surcharge. Suivre le balisage vert au sol.'}
]);
export const BREACH_INSTALLATIONS=Object.freeze([{x:0,z:-48},...BREACH_DRESSING.filter(p=>['batteries','servers','tank','radiator'].includes(p.type)).map(p=>({x:p.x,z:p.z}))]);
export function breachShelter(p){if(p.z>36&&p.z<63)return .8;if(p.x<-19&&p.z>7&&p.z<32)return .85;if(p.x>-18&&p.x<-8&&p.z>2&&p.z<32)return .95;if(p.z<-28&&p.z>-72)return .45;return .1;}
