// M01 documents of the first street: the old VEILLE-4 relay and the notes of the Épars (bible « Les Héritiers
// du Silence », chapter 1). The sphere comments; nothing tells what the « two units » are.
export function missionJournal(action,characterId='ghju'){
 const companion=characterId==='lylu'?'CAR-14':'GAB-1';
 if(action==='archive')return {
  title:'01 / UN INDICATIF FAMILIER',stamp:'VESPER · 2196 / MÉMOIRE HUMAINE HORS RÉSEAU',
  lines:['ÉMISSION AUTOMATIQUE · INDICATIF VEILLE-4 · SOURCE : RELAIS INDÉPENDANT',
   '« …ne faites confiance à aucun système… réseau principal… »',
   '« …les relais indépendants… »',
   `${companion} — « Le signal est dégradé. Mais l’indicatif est propre. »`],
  speech:'Indicatif VEILLE-4. Ne faites confiance à aucun système connecté au réseau principal. Retrouvez les relais indépendants.',
  footer:'Le circuit isolé vient de couper la surveillance locale. Reste à couvert : une sonde d’ORDRE peut avoir capté le signal.'
 };
 if(action==='investigation')return {
  title:'02 / LES JOURNAUX ONT SURVÉCU',stamp:'BOUTIQUE OUEST / TERMINAL DÉCONNECTÉ',
  lines:['NOTE LAISSÉE PAR LES ÉPARS · GROUPE 12',
   '« Ils ont arrêté les convois avant la fin de l’évacuation. Les enseignes sont mortes ; leurs machines surveillent encore la rue. »',
   '« Le relais de la terrasse répète un vieux message, signature VEILLE-4. La source est aux Archives végétales. Coupe d’abord la balise ORDRE au carrefour. »',
   'SECOURS 07 — Évacuation suspendue le 17/11/2189. Sept années sans retour des équipes.'],
  speech:'Le relais de la terrasse répète un vieux message, signature VEILLE-4. La source est aux Archives végétales. Coupe d’abord la balise au carrefour.',
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
