import {SPEAKERS} from './m04-story.js';
export const LOGS={};
const script={
 intro:[['voss','Le complexe Biotech domine le ravin. Les données PINK sont dans les serres. Les relais de surveillance gardent l’accès au cœur JANUS.']],
 access:[['gaby','Le sas accepte notre empreinte. Les Jardins sont encore alimentés.']],
 research:[['cara','Les données PINK sont copiées. Le pavillon de culture contrôle les capteurs des passerelles.']],
 pavilion:[['voss','Surveillance désactivée. Rejoignez la zone haute par la passerelle centrale.']],
 bridge:[['gaby','L’autre signal est tout près. Sur la terrasse, au-dessus de nous.']],
 meeting:[['ghju','LYLU… On a suivi les mêmes traces.'],['lylu','Alors on termine ce chemin ensemble. JANUS est sous le grand dôme.'],['cara','Tu m’as encore retrouvée.'],['gaby','Comme toujours.']],
 core:[['cara','Programme JANUS interrompu. Il reste à isoler son nœud de contrôle et à libérer les Jardins.']],
 control:[['voss','Le canal est ouvert. Tenez la position pendant l’envoi de l’attaque de données.']],
 liberation:[['gaby','Les défenses tombent. Le chemin vers AEGIS est dégagé.']],
 extraction:[['voss','Navette AEGIS en position. Rejoignez la plateforme circulaire. On vous ramène à la planque.']],
 fin:[['lylu','Les Jardins ne sont plus à ORDRE. On garde les données et on rentre.']]
};
export const linesFor=(id,hero='ghju')=>(script[id]||[]).map(([who,text])=>{if(['intro','access','research','pavilion','bridge'].includes(id)){if(who==='gaby'&&hero==='lylu')who='cara';else if(who==='cara'&&hero==='ghju')who='gaby';}return{who,text,speaker:SPEAKERS[who]||{name:who.toUpperCase(),color:who==='lylu'?'#80caff':'#ff84bb'}};});
export const lineSeconds=text=>Math.max(3.5,text.length/17);
export const logFor=()=>null;
export const ENDING={title:'Les Jardins suspendus',text:{ghju:'GHJU et LYLU se sont retrouvés. Les données PINK ont été collectées, JANUS a été interrompu et le nœud d’ORDRE isolé. Les Jardins sont libres. AEGIS ramène les deux héros à la planque.',lylu:'LYLU a rejoint GHJU dans les Jardins. Le programme JANUS est interrompu et les données PINK sont sauvegardées hors réseau. AEGIS assure leur retour à la planque.'},next:'Retour à la planque'};
