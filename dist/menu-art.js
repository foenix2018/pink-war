// Menu illustration selected by mission and existing playable character.
// The original level-1 GHJU / LYLU art is never overwritten.
const M02_COVER='art/mission02-cover.svg?v=m02-cover-1';
export function syncMenuArtwork(characterId,mode='campaign',root=document){
  const hero=characterId==='lylu'?'lylu':'ghju';
  const level2=mode==='campaign2';
  for(const image of root.querySelectorAll('img[data-character-art]')){
    const source=level2?M02_COVER:image.dataset[hero+'Src'];
    if(source&&image.getAttribute('src')!==source)image.setAttribute('src',source);
    image.dataset.hero=hero;
    image.dataset.mission=level2?'m02':'m01';
  }
  const description=root.getElementById('loading-description');
  if(description)description.textContent=level2
    ?'Les Bas-Niveaux de Vesper : l’enclave, la galerie marchande, puis les archives HELIX.'
    :mode==='arena'
      ?'Les machines d’ORDRE traversent les portes de transfert. Tenez la position.'
      :mode==='training'
        ?'Vérifiez vos armes avant de retourner dans les rues de Vesper.'
        :'Un terminal hors réseau conserve peut-être la trace de votre '+(hero==='lylu'?'sœur.':'frère.');
  const title=root.getElementById('loading-title');
  if(title)title.textContent=level2?'02 — Sous les Néons':'Le dernier signal';
  const credit=root.querySelector('.lobby-art-credit');
  if(credit)credit.textContent=level2?'VESPER · LES BAS-NIVEAUX · NIVEAU 02':'VESPER · ILLUSTRATION D’AMBIANCE · V.3.47';
}
