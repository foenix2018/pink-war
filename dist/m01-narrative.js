// M01 dialogue: the other sibling's human recording and an audio-only companion.
// The production book reserves physical spheres and their assistance for M07.
export function missionJournal(action,characterId='ghju'){
 const sibling=characterId==='lylu'?'GHJU':'LYLU',companion=characterId==='lylu'?'Cara':'Gaby';
 if(action==='archive')return {
  title:'01 / UNE SIGNATURE FAMILIÈRE',stamp:'VESPER · 2196 / MÉMOIRE HUMAINE HORS RÉSEAU',
  lines:[`ENREGISTREMENT : ${sibling}`,
   '« Si tu retrouves cette annexe, ne reconnecte rien au réseau. ORDRE écoute les portes, les radios, les relais. »',
   '« Mon itinéraire est dans la boutique de briques, à l’ouest. Retrouve les anciens relais. Je cherche encore un passage. »',
   `${companion} — « Il y a une signature familière. »`],
  speech:`${sibling}. Si tu retrouves cette annexe, ne reconnecte rien au réseau. Mon itinéraire est dans la boutique de briques, à l'ouest. Retrouve les anciens relais.`,
  footer:'Le circuit isolé vient de couper la surveillance locale. Reste à couvert : une sonde d’ORDRE peut avoir capté le signal.'
 };
 if(action==='investigation')return {
  title:'02 / LES JOURNAUX ONT SURVÉCU',stamp:'BOUTIQUE OUEST / TERMINAL DÉCONNECTÉ',
  lines:[`NOTE LAISSÉE PAR ${sibling}`,
   '« Ils ont arrêté les convois avant la fin de l’évacuation. Les enseignes sont mortes ; leurs machines surveillent encore la rue. »',
   '« Les Archives végétales gardent une copie des disparus. Le relais sur la terrasse connaît le chemin. Coupe d’abord la balise ORDRE au carrefour. »',
   'SECOURS 07 — Évacuation suspendue en 2189. Sept années sans retour des équipes.'],
  speech:'Les Archives végétales gardent une copie des disparus. Le relais sur la terrasse connaît le chemin. Coupe d’abord la balise au carrefour.',
  footer:'TERMINAL HORS RÉSEAU — Copie locale intacte. Dernier relais enregistré : terrasse nord.'
 };
 return null;
}

export function showMissionJournal(entry,{sound=true,onClose=()=>{}}={}){
 const dialog=document.createElement('dialog');dialog.id='m01-journal';
 dialog.style.cssText='max-width:min(640px,88vw);max-height:80dvh;overflow:auto;background:#101916;color:#d8d6c8;border:1px solid #8f8265;padding:clamp(18px,4vw,32px);font:16px/1.6 system-ui;box-shadow:0 18px 80px #000b';
 const stamp=document.createElement('small');stamp.textContent=entry.stamp;stamp.style.cssText='color:#bda477;letter-spacing:.08em';
 const heading=document.createElement('h2');heading.textContent=entry.title;heading.style.fontSize='21px';dialog.append(stamp,heading);
 for(const line of entry.lines){const p=document.createElement('p');p.textContent=line;dialog.append(p);}
 const note=document.createElement('p');note.textContent=entry.footer;note.style.cssText='font-size:13px;color:#a2aaa1';dialog.append(note);
 const close=document.createElement('button');close.textContent='FERMER LE JOURNAL / REPRENDRE';
 close.style.cssText='padding:13px;border:1px solid #9e916e;background:#29322c;color:#f1e8cf;cursor:pointer';close.onclick=()=>dialog.close();
 if(sound&&globalThis.speechSynthesis&&globalThis.SpeechSynthesisUtterance){
  const listen=close.cloneNode();listen.textContent='ÉCOUTER L’ARCHIVE';listen.style.marginRight='10px';
  listen.onclick=()=>{speechSynthesis.cancel();const voice=new SpeechSynthesisUtterance(entry.speech);voice.lang='fr-FR';voice.rate=.92;speechSynthesis.speak(voice);};dialog.append(listen);
 }
 dialog.append(close);document.body.append(dialog);
 dialog.addEventListener('close',()=>{globalThis.speechSynthesis?.cancel();dialog.remove();onClose();},{once:true});
 dialog.showModal();close.focus();
}
