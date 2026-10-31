// Menu illustration selected by mission and existing playable character.
// The original level-1 GHJU / LYLU art is never overwritten.
const M02_COVER='art/mission02-cover.webp?v=3.74.0';
const M03_COVER='art/mission03-cover.svg?v=1';
export function syncMenuArtwork(characterId,mode='campaign',root=document){
  const hero=characterId==='lylu'?'lylu':'ghju';
  const level2=mode==='campaign2',level3=mode==='campaign3';
  for(const image of root.querySelectorAll('img[data-character-art]')){
    const source=level3?M03_COVER:level2?M02_COVER:image.dataset[hero+'Src'];
    if(source&&image.getAttribute('src')!==source)image.setAttribute('src',source);
    image.dataset.hero=hero;
    image.dataset.mission=level2?'m02':level3?'m03':'m01';
  }
  const description=root.getElementById('loading-description');
  if(description)description.textContent=level3?'Le convoi des oubliés : annexe médicale, atelier, relais A3, pylône de surveillance.':level2
    ?'Les Bas-Niveaux de Vesper, tenus par le Directoire : l’enclave, la galerie marchande, puis la tour de transit.'
    :mode==='arena'
      ?'Les machines d’ORDRE traversent les portes de transfert. Tenez la position.'
      :mode==='training'
        ?'Vérifiez vos armes avant de retourner dans les rues de Vesper.'
        :'Une transmission porte VEILLE-4, l’indicatif de vos parents avant la Chute.';
  const title=root.getElementById('loading-title');
  if(title)title.textContent=level3?'03 — Le Convoi des Oubliés':level2?'02 — Les Profondeurs':'01 — Le Dernier Signal';
  const credit=root.querySelector('.lobby-art-credit');
  if(credit)credit.textContent=level3?'VESPER · LES ANCIENNES ARCHIVES · MISSION 03':level2?'VESPER · LES BAS-NIVEAUX · NIVEAU 02':'VESPER · ILLUSTRATION D’AMBIANCE · V.3.47';
}
