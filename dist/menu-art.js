// Shared by the lightweight welcome screen and the running game's menu.
export function syncMenuArtwork(characterId,mode='campaign',root=document){
  const hero=characterId==='lylu'?'lylu':'ghju';
  for(const image of root.querySelectorAll('img[data-character-art]')){
    const source=image.dataset[hero+'Src'];
    if(source&&image.getAttribute('src')!==source)image.setAttribute('src',source);
    image.dataset.hero=hero;
  }
  const description=root.getElementById('loading-description');
  if(description)description.textContent=mode==='arena'
    ?'Les machines d’ORDRE traversent les portes de transfert. Tenez la position.'
    :mode==='training'
      ?'Vérifiez vos armes avant de retourner dans les rues de Vesper.'
      :'Un terminal hors réseau conserve peut-être la trace de votre '+(hero==='lylu'?'sœur.':'frère.');
}
