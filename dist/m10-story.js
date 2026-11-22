import {SPEAKERS as SHARED} from './m04-story.js';
const SPEAKERS={...SHARED,kessler:{name:'ADRIAN KESSLER · HELIX',color:'#ffbc80'},chercheuse:{name:'SCIENTIFIQUE HELIX',color:'#8cdddf'}};
export const LOGS={};
const script={
 intro:[['voss','Le siège HELIX domine encore Vesper. Les Jardins nous ont ouvert une liaison privée. Entrez par le quai et trouvez les laboratoires.']],
 access:[['gaby','Le sas est ouvert. La surveillance extérieure reste connectée au Directoire.']],
 esplanade:[['cara','Leurs capteurs sont isolés. Le hall commande les accès de recherche.']],
 security:[['voss','Le laboratoire est au niveau supérieur, à l’ouest. Des chercheurs sont encore à l’intérieur.']],
 laboratoires:[['chercheuse','Vous n’êtes pas du Directoire. Nous sommes retenus ici. Le bureau de Kessler reçoit encore nos transmissions.'],['gaby','Leur canal de sécurité est coupé. Les chercheurs peuvent se mettre à l’abri.']],
 kessler:[['kessler','J’ai cherché à empêcher la Chute. Nous avions besoin d’un réseau plus rapide, capable d’unifier les systèmes mondiaux.'],['cara','Les validations de supervision sont conservées dans vos archives. Nous allons les lire.']],
 archives:[['cara','Les signatures sont authentiques. HELIX a transféré l’autorité à ORDRE ; la supervision humaine avait été traitée comme un obstacle.']],
 capture:[['kessler','Ces deux sphères… Elles viennent de notre ancien laboratoire. Sécurité, capturez-les. Toutes les sorties sous confinement.'],['gaby','Il reconnaît nos architectures. Garde les archives hors réseau. Le pupitre de sûreté peut ouvrir le quai est.']],
 confinement:[['voss','AEGIS arrive sur le quai est. Coupez le confinement et gardez les deux unités avec vous.']],
 extraction:[['voss','Navette en approche. Tenez le quai, les archives restent avec vous.']],
 fin:[['lylu','Kessler savait ce qu’il autorisait. On rapporte les preuves. Ensemble.']]
};
export const linesFor=(id,hero='ghju')=>(script[id]||[]).map(([who,text])=>{if(who==='gaby'&&hero==='lylu')who='cara';else if(who==='cara'&&hero==='ghju')who='gaby';return{who,text,speaker:SPEAKERS[who]||{name:who.toUpperCase(),color:'#ffd3e4'}};});
export const lineSeconds=text=>Math.max(3.5,text.length/17);
export const logFor=()=>null;
export const ENDING={title:'La Couronne HELIX',text:{ghju:'Les chercheurs sont à l’abri et les archives HELIX sont hors réseau. Kessler a reconnu les deux sphères et tenté de les faire capturer. GHJU et LYLU ont échappé au confinement grâce à AEGIS. Les preuves reviennent à la planque.',lylu:'Les autorisations de HELIX sont sauvegardées. Kessler a reconnu GAB-1 et CAR-14, puis lancé ses unités pour les capturer. LYLU et GHJU quittent la Couronne avec les archives et leurs deux sphères.'},next:'Retour à la planque'};
