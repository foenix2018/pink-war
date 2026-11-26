import {SPEAKERS as SHARED} from './m04-story.js';
const speakers={...SHARED,gaby:{name:'GAB-1',color:'#ff79b6'},cara:{name:'CAR-14',color:'#79caff'},ghju:{name:'GHJU',color:'#ff79b6'},lylu:{name:'LYLU',color:'#79caff'},voss:{name:'AEGIS · VOSS',color:'#e7f2dc'},civil:{name:'CIVIL DE VESPER',color:'#f3e0c3'}};
export const LOGS={};
const script={
 intro:[['voss','ORDRE encercle le refuge. Les voies d’évacuation sont coupées. GHJU, LYLU, rejoignez l’infirmerie.']],
 access:[['ghju','On est là. Où sont les survivants ?'],['voss','Au refuge civil. Les défenses sont hors tension.']],
 civils:[['civil','Il y a encore des familles dans les abris.'],['lylu','Restez ensemble. On va rétablir les générateurs.']],
 'gen-a':[['gaby','Premier circuit rétabli.']], 'gen-b':[['cara','Deuxième circuit. Encore un.']], 'gen-c':[['voss','Défenses AEGIS réalimentées. La brèche Est reste ouverte.']],
 breche:[['lylu','Ils envoient de nouvelles unités.'],['voss','Tenez la position. Il faut accéder au noyau de contrôle.']],
 noyau:[['gaby','Il existe une liaison que je ne comprends pas.'],['cara','Je la ressens aussi.']],
 resonance:[['gaby','CAR-14 ?'],['cara','GAB-1… je suis là.'],['voss','Deux signatures énergétiques se synchronisent. Protégez les civils !']],
 assaut:[['lylu','Nos armes sont plus puissantes !'],['ghju','Le bouclier tient. Il nous protège tous.']],
 relais:[['voss','Coupez leur coordination. AEGIS prépare l’extraction.']],
 extraction:[['civil','Les familles sont regroupées. Merci.']],
 evacuation:[['voss','Dernier départ. Tout le monde à bord !']],
 fin:[['gaby','Je me souviens… d’une petite chambre.'],['cara','Et d’une voix qui me chantait quelque chose quand je ne trouvais pas le sommeil.'],['ghju','Cette chanson… nos parents la chantaient à Gabrielle et Carla.'],['lylu','Comment est-ce que vous pouvez vous en souvenir ?']]
};
export const linesFor=id=>(script[id]||[]).map(([who,text])=>({who,text,speaker:speakers[who]}));
export const lineSeconds=text=>Math.max(3.5,text.length/17);export const logFor=()=>null;
export const ENDING={title:'La nuit d’ORDRE',text:{ghju:'Le refuge est évacué. GAB-1 et CAR-14 ont protégé les survivants par leur première Résonance complète. GAB-1 évoque une petite chambre. CAR-14 se souvient d’une voix chantant pour elle avant le sommeil. GHJU reconnaît la chanson de leurs parents, autrefois chantée à Gabrielle et Carla.',lylu:'AEGIS a évacué les survivants. GAB-1 évoque une petite chambre. CAR-14 se souvient d’une voix chantant pour elle avant le sommeil. GHJU reconnaît la chanson que leurs parents chantaient à Gabrielle et Carla. LYLU ne peut plus ignorer leur lien avec sa famille.'},next:'Retour à la planque'};
