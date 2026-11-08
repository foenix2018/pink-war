// The four original street objectives, shared by gameplay, checkpoints and route verification.
export const M02_STREET_OBJECTIVES=Object.freeze([
 {x:0,z:53,y:0,label:'LOCALISER LES CIVILS',description:'Rejoins le poste de soins clandestin à l’entrée de la ruelle.'},
 {x:-8,z:14,y:0,label:'LIBÉRER LA GALERIE',description:'Repousse la patrouille, puis consulte le terminal HELIX.'},
 {x:0,z:-18,y:12,label:'REJOINDRE LES PASSERELLES',description:'Monte par le véritable escalier à droite jusqu’à +12 m.'},
 {x:-5,z:-57,y:0,label:'OUVRIR LA TOUR DE TRANSIT',description:'Descends à gauche et déverrouille l’évacuation.'}
]);
export const M02_STREET_CHECKPOINTS=Object.freeze([
 {x:0,z:76,elevation:0,yaw:0}, {x:0,z:50,elevation:0,yaw:0},
 {x:0,z:20,elevation:0,yaw:0}, {x:0,z:-18,elevation:12,yaw:Math.PI/2}
]);
export function createM02Street(game,{onStage=()=>{},onNotice=()=>{},onEpilogue=()=>{},deploy=()=>{}}={}){
 let stage=0,patrolCleared=false;
 const change=(value,reason='progress')=>{stage=value;onStage(stage,reason);};
 return{get stage(){return stage;},get snapshot(){return{stage,patrolCleared};},
  start(state={}){patrolCleared=!!state.patrolCleared;change(Number.isInteger(state.stage)?Math.max(0,Math.min(3,state.stage)):0,'restore');if(stage===1&&!patrolCleared)deploy();},
  update(){if(stage===1&&!patrolCleared&&game.enemies.length===0){patrolCleared=true;onStage(stage,'safe');}},
  interact(){const o=M02_STREET_OBJECTIVES[stage],p=game.player;if(!o||game.state!=='playing')return false;
   if(Math.hypot(p.x-o.x,p.z-o.z)>3.3||Math.abs(p.elevation-o.y)>1.8){onNotice(o.description+' Approche du repère indiqué.');return false;}
   if(stage===0){patrolCleared=false;change(1);deploy();onNotice('ENCLAVE REPÉRÉE — NEUTRALISER LA PATROUILLE');}
   else if(stage===1){if(game.enemies.length){onNotice('TERMINAL VERROUILLÉ : MENACES ACTIVES');return false;}patrolCleared=true;game.grantCharges(1);change(2);onNotice('ARCHIVES HELIX SAISIES — REJOINDRE LE PONT +12 M');}
   else if(stage===2){game.grantCharges(1);change(3);onNotice('ACCÈS TRANSIT DÉVERROUILLÉ — DESCENDRE');}
   else{change(4);onEpilogue();onNotice('TOUR DE TRANSIT — CONTRÔLE DU DIRECTOIRE');}
   return true;
  }
 };
}
