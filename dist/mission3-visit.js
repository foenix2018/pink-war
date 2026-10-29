// Mission 03 / Le Convoi des Absents
// A distinct campaign route through the detailed Vesper visitor map.
// Reuses the existing geometry/renderer, not character files, rigs or animations.
// Does not touch the collision hulls of the reference district.
export const M03_STEPS=Object.freeze([
 Object.freeze({action:'m03-medical',x:-26,y:0,z:15,r:3.5,title:'Relever le dossier du convoi',objective:'Fouiller les archives de l’annexe médicale',message:'ANCIEN REGISTRE / 2196 — Le convoi HELIX a soustrait des identités aux listes civiles. Une copie du manifeste a été transférée à l’atelier technique.'}),
 Object.freeze({action:'m03-workshop',x:22,y:0,z:20,r:3.8,title:'Extraire le manifeste HELIX',objective:'Récupérer le manifeste dans l’atelier',message:'HELIX / MANIFESTE INTERCEPTÉ — Une signature familiale figure parmi les personnes transférées. Le relais A3 contient les dernières coordonnées du convoi.'}),
 Object.freeze({action:'m03-archive',x:-17.5,y:5,z:-29.5,r:3.5,title:'Croiser les coordonnées au relais A3',objective:'Atteindre les Archives A3 en hauteur',message:'RELAIS A3 / DÉCRYPTAGE — Le dernier trajet mène au périmètre fracturé. Le réseau ORDRE utilise le portail pour masquer la destination du convoi.'}),
 Object.freeze({action:'m03-portal',x:0,y:0,z:-98,r:7,title:'Neutraliser la balise de poursuite',objective:'Interrompre le relais ORDRE au périmètre PINK',message:'LIAISON ORDRE INTERROMPUE — Les données du convoi sont sauvegardées hors réseau. Une piste mène désormais vers l’Anneau logistique.'})
]);
const css=`
body.chapter3 #game #objectivePanel{display:block;top:max(61px,calc(env(safe-area-inset-top) + 48px));width:min(340px,calc(100vw - 78px));background:#071a29d9;border-left-color:#e8bd89}
body.chapter3 #game #objectivePanel .eyebrow{color:#ffd09a}
body.chapter3 #game #controlsPanel .tourPanel,body.chapter3 #toggleMode{display:none!important}
body.chapter3 #game #quickObjective{border-color:#d6a06b;background:#392717db}
body.chapter3 #intro .introCard{border-color:#d1a0748a;box-shadow:0 25px 95px #000a}
body.chapter3 #intro .subtitle{color:#ffcc98}
.pw-m03-final{position:fixed;inset:0;z-index:100;display:grid;place-items:center;background:#030c17ed;backdrop-filter:blur(13px);padding:18px;font:14px/1.55 system-ui,sans-serif}
.pw-m03-final-card{width:min(780px,100%);max-height:95dvh;overflow:auto;border:1px solid #b2a186b0;background:linear-gradient(145deg,#1c2d3d,#091521 76%);box-shadow:0 30px 100px #000e;padding:clamp(18px,4vw,38px);color:#e6f1f8}
.pw-m03-final h2{font-size:clamp(25px,5vw,42px);line-height:1.15;margin:8px 0 15px}
.pw-m03-final .meta{font:800 11px monospace;letter-spacing:.22em;color:#f3c78c}
.pw-m03-final .evidence{background:#122537;border-left:3px solid #edbf7e;padding:16px 20px;margin:20px 0;color:#cce0ea}
.pw-m03-final .actions{display:flex;gap:12px;flex-wrap:wrap}
.pw-m03-final button{padding:13px 18px;min-height:44px;flex:1;background:#225568;color:white;border:1px solid #91d3df;font-weight:850;border-radius:8px;cursor:pointer}
.pw-m03-final button.secondary{background:#172331;border-color:#698296}
`;
function addNode(parent,tag,cls,value){
 const el=document.createElement(tag);if(cls)el.className=cls;if(value!=null)el.textContent=value;parent.appendChild(el);return el;
}
export function createMission3Visit({mesh,interactions,characterId='ghju',onFinish=()=>{},document:doc=globalThis.document}={}){
 const steps=M03_STEPS.map(o=>({...o,done:false}));interactions.splice(0,interactions.length,...steps);
 let index=0,finished=false;
 // The decor pass is overlaid on existing scene geometry. No new colliders.
 const add=(x,y,z,w,h,d,c,m)=>mesh.box(x,y,z,w,h,d,c,m);
 const line=(a,b,w,c,m)=>mesh.line(a,b,w,c,m);
 function decorate(){
  for(const [idx,p] of steps.entries()){
   // Maintenance identification box at each objective, with fastener and two emissive insets.
   const dx=idx===2?.7:1.25,boxX=p.x+dx,boxZ=p.z+(idx===2?-.5:1.4);
   add(boxX,p.y+1.0,boxZ,1.1,1.45,.68,'graphite',1);
   add(boxX,p.y+1.76,boxZ,1.19,.14,.74,'steel',1);
   add(boxX,p.y+1.26,boxZ+.356,.92,.42,.045,'black',1);
   for(let i=0;i<3;i++)add(boxX-.28+i*.28,p.y+1.29,boxZ+.393,.12,.09,.029,i===idx%3?'amber':'blue',i===idx%3?7:6);
   for(const side of [-1,1])add(boxX+side*.42,p.y+.62,boxZ+.38,.062,.15,.034,'rust',1);
   // Broken painted pavement guides are decoration, not collision or navigation.
   for(let i=0;i<4;i++)add(boxX+(i-1.5)*.34,p.y+.035,boxZ-.95,.21,.015,.045,'amber',7);
  }
  // Physical convoy remains: damaged roadside trailers, warning strips, slatted grilles.
  for(let i=0;i<4;i++){
   const x=-5.7+i*3.0,z=-71-(i%2)*5.2;
   add(x,.61,z,1.6,1.12,2.15,'steel',1);
   add(x,1.20,z,1.67,.13,2.25,'graphite',1);
   for(let k=0;k<4;k++)add(x-.65+k*.43,.54,z+1.12,.14,.72,.08,i%2?'rust':'black',1);
   for(const dz of [-.83,.83])add(x,.15,z+dz,1.8,.10,.09,'black',1);
   line([x-.64,.79,z+1.14],[x+.64,.79,z+1.14],.05,'amber',7);
  }
  // A suspended district marker at the approach to the transit perimeter.
  add(0,6.70,-61,6,.23,.31,'graphite',1);
  for(const x of [-2.6,2.6])line([x,4.3,-61],[x,6.6,-61],.13,'steel',1);
  add(0,6.43,-60.8,4.75,.17,.13,'amber',7);
 }
 function configure(){
  doc.body.classList.add('chapter3');
  const st=doc.createElement('style');st.id='pw-m03-theme';st.textContent=css;doc.head.appendChild(st);
  doc.title='PINK WARS — M03 · Le Convoi des Absents';
  const desc=doc.querySelector('meta[name="description"]');if(desc)desc.content='PINK WARS — Mission 03, Le Convoi des Absents. Recherche du manifeste HELIX dans les secteurs détaillés de Vesper.';
  const heading=doc.querySelector('#intro .introMeta');if(heading)heading.textContent='PINK WARS / LA FRACTURE · MISSION 03';
  const subtitle=doc.querySelector('#intro .subtitle');if(subtitle)subtitle.textContent='LE CONVOI DES ABSENTS';
  const lead=doc.querySelector('#intro .lead');if(lead)lead.textContent='Les informations saisies à HELIX ramènent vers les anciens secteurs de Vesper. Fouille l’annexe médicale, récupère le manifeste dans l’atelier, déchiffre le relais A3 et neutralise la liaison ORDRE.';
  const features=doc.querySelector('#intro .featureRow');
  if(features){features.replaceChildren(...['ANNEXE MÉDICALE','ATELIER TECHNIQUE','ARCHIVES A3','CONVOI HELIX','LYLU + CARA','WEBGPU / WEBGL2'].map(text=>{const tag=doc.createElement('div');tag.className='feature';tag.textContent=text;return tag;}));}
  const notice=doc.querySelector('#intro .notice');if(notice)notice.textContent='Nouveau parcours dans les décors détaillés de Vesper. Quatre objectifs dans un ordre précis, de l’annexe médicale jusqu’au périmètre fracturé. Ce chapitre est une première version exploratoire jouable.';
  const button=doc.querySelector('#start');if(button)button.textContent='DÉMARRER LA MISSION 03 →';
  const eyebrow=doc.querySelector('#objectivePanel .eyebrow');if(eyebrow)eyebrow.firstChild.textContent='MISSION 03 ';
  const help=doc.querySelector('#help h2');if(help)help.textContent='Mission 03 · Le Convoi des Absents';
  const stamp=doc.querySelector('#game .smallcap');if(stamp)stamp.textContent='VESPER / LE CONVOI DES ABSENTS / SECTEUR 03';
  const lab=doc.querySelector('#game .logo span');if(lab)lab.textContent='/ MISSION 03';
  const guide=doc.querySelector('#help .helpGrid');if(guide){const p=doc.createElement('p');p.textContent='Explore les quatre points de la carte dans l’ordre. Approche-toi des consoles et appuie sur F, ou sur UTIL. sur tactile, pour récupérer les preuves. Les déplacements et les commandes de combat sont ceux du visualiseur 3D.';guide.appendChild(p)}
 }
 function complete(){
  if(finished)return;
  finished=true;onFinish();
  try{const current=Number(localStorage.getItem('pink-wars-last-cleared'))||0;localStorage.setItem('pink-wars-last-cleared',String(Math.max(current,3)));}catch{}
  const modal=addNode(doc.body,'div','pw-m03-final');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Mission 03 terminée');
  const card=addNode(modal,'section','pw-m03-final-card');
  addNode(card,'div','meta','MISSION 03 / VESPER · FIN DE PARCOURS');
  addNode(card,'h2','', 'Le convoi ne s’est pas volatilisé.');
  const sibling=characterId==='lylu'?'GHJU':'LYLU';
  addNode(card,'p','', 'Quatre archives hors réseau confirment que HELIX a transporté des survivants et des données au-delà du périmètre de Vesper. Une nouvelle trace de '+sibling+' apparaît dans les derniers manifestes.');
  const choice=(()=>{try{return localStorage.getItem('pink-wars-m02-choice')}catch{return null}})();
  addNode(card,'p','evidence',choice==='proof'?'Les preuves saisies au niveau 2 recoupent les manifestes du convoi. La destination reste l’Anneau logistique.':choice==='escort'?'Les civils évacués ont fourni les informations manquantes pour retrouver le convoi. La piste mène à l’Anneau logistique.':'Coordonnées recoupées : Anneau logistique. Destination présumée. Identité encore à confirmer.');
  addNode(card,'p','', 'La suite de la campagne reste à construire. Tu peux revenir au menu ou recommencer cette mission exploratoire.');
  const actions=addNode(card,'div','actions');
  const replay=addNode(actions,'button','secondary','RECOMMENCER LA MISSION');
  replay.onclick=()=>location.reload();
  const home=addNode(actions,'button','','RETOUR À LA CAMPAGNE →');
  home.onclick=()=>location.assign('./index.html?mode=campaign3');
 }
 function interact(p){
  if(finished||!p)return {accepted:false,finished};
  if(p.done)return {accepted:false,message:'Cette preuve a déjà été sauvegardée.',finished};
  if(p.action!==steps[index]?.action)return {accepted:false,message:'Relève d’abord la preuve précédente : '+steps[index].objective+'.',finished};
  p.done=true;index++;
  const ended=index===steps.length;
  if(ended)complete();
  return {accepted:true,message:p.message,finished:ended};
 }
 return {steps,decorate,configure,interact,objective:()=>finished?'Mission accomplie — le manifeste est sécurisé':steps[index]?.objective||'Mission terminée',progress:()=>index,total:steps.length,get finished(){return finished}};
}
