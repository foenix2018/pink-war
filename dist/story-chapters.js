// Pink Wars - narrative illustrations at the conclusion of each completed
// campaign mission. Images and texts are kept separate from the physics engine.
const ART={1:'./art/story-chapter-01.svg',2:'./art/story-chapter-02.svg'};
const STYLE_ID='pink-war-chapter-narrative-styles';
function styles(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');style.id=STYLE_ID;style.textContent="\n.pw-story-image{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;border:1px solid #699eb5b0;background:#071120}\n.pw-story-card{margin:14px 0 17px;border:1px solid #658d9b66;background:#07121b;color:#e1f2f4}\n.pw-story-meta{font:800 11px system-ui,sans-serif;letter-spacing:.20em;color:#78dfe7;padding:13px 15px 0}\n.pw-story-caption{padding:4px 15px 14px;color:#cbdfe5;line-height:1.48;font-size:14px}\n.pw-story-caption strong{display:block;color:#f2ffff;font-size:16px;margin-bottom:5px}\n#end-dialog:has(.pw-story-card){max-height:89dvh;overflow-y:auto;max-width:min(860px,96vw)}\n.pw-story-next{width:100%;padding:14px 20px;border:1px solid #68d8ec;background:#12313e;color:#deffff;font:900 13px system-ui,sans-serif;letter-spacing:.13em;cursor:pointer}\n.pw-story-next:hover{background:#176173}\n.pw-story-modal{position:fixed;z-index:120;inset:0;display:flex;justify-content:center;align-items:center;overflow-y:auto;background:rgba(2,8,17,.94);backdrop-filter:blur(15px);padding:15px;color:#d9e9eb;font-family:system-ui,sans-serif}\n.pw-story-modal .pw-story-shell{width:min(930px,98%);max-height:96dvh;overflow-y:auto;border:1px solid #67aac0aa;background:#0a1420;box-shadow:0 0 85px #070d1b;color:#d9e9eb;padding:20px}\n.pw-story-modal h2{font-size:clamp(25px,4.3vw,43px);line-height:1.12;margin:7px 0 14px;letter-spacing:-.04em}\n.pw-story-modal .pw-story-choice{display:flex;flex-wrap:wrap;gap:12px}\n.pw-story-modal button{padding:14px 18px;flex:1;min-width:200px;background:#153441;color:#ecffff;border:1px solid #64d5de;font:800 13px system-ui,sans-serif;cursor:pointer}\n.pw-story-modal button:hover{background:#216678}\n.pw-story-modal button.amber{background:#3d3027;border-color:#e9b176}\n.pw-story-modal button.secondary{background:#14202c;border-color:#506878;color:#cbd9dc}\n.pw-story-modal .choice-feedback{color:#f7c68d;line-height:1.5;margin:14px 0}\n.pw-story-modal p{line-height:1.5}\n@media(max-width:600px){.pw-story-modal .pw-story-shell{padding:10px}.pw-story-meta{font-size:10px}}\n";
 document.head.appendChild(style);
}
const store=(key,value)=>{try{localStorage.setItem(key,String(value));}catch{}};
function art(n){return ART[n]||ART[2];}
export function chapterStory(level,characterId='ghju',choice='escort'){
 const ia=String(characterId).toLowerCase()==='lylu'?'CAR-14':'GAB-1';
 if(level===1)return {
   heading:'La voix de VEILLE-4',
   text:'Le terminal hors réseau des Archives végétales a rendu un message enregistré la nuit de la Chute, sous l’indicatif de tes parents, VEILLE-4 : « Ne faites confiance à aucun système connecté au réseau principal. Retrouvez les relais indépendants. Et surtout… ne perdez pas les deux unités. » La suite est chiffrée. '+ia+' est restée silencieuse plusieurs secondes. Le Directoire garde des modules de décryptage aux Bas-Niveaux.',
   next:'02 — LES PROFONDEURS',
   eyebrow:'FIN DE MISSION · LE DERNIER SIGNAL'
 };
 if(level===2)return {
   heading:choice==='proof'?'Les archives de la mise à jour':'Ceux qui réparaient les machines',
   text:choice==='proof'
    ?'Les caisses HELIX contiennent des supports de 2189 sur la mise à jour du 17 novembre. Le module de décryptage est dans ta combinaison. Et ORDRE recherche deux systèmes autonomes, GAB-1 et CAR-14. Le convoi 02 est déjà parti vers l’Anneau logistique avec d’autres prisonniers du Directoire.'
    :'Les prisonniers du convoi 03 sont libres. Ils parlent du convoi 02, parti vers l’Anneau logistique avec d’autres prisonniers du Directoire. Le module de décryptage est dans ta combinaison, et ORDRE recherche deux systèmes autonomes, GAB-1 et CAR-14.',
   next:'03 — LE CONVOI DES OUBLIÉS',
   eyebrow:'FIN DE MISSION · LES PROFONDEURS'
 };
 return {heading:'Un nouveau fragment de vérité',
   text:'Une nouvelle transmission confirme que Vesper cache encore les traces de la Chute. La recherche continue.',
   eyebrow:'FIN DE MISSION · '+String(level).padStart(2,'0'),next:'CONTINUER'};
}
export function attachCampaignStory(dialog,{level=1,characterId='ghju'}={}){
 if(!dialog)return;
 styles();dialog.querySelector('.pw-story-card')?.remove();dialog.querySelector('.pw-story-next')?.remove();
 const story=chapterStory(level,characterId);
 let old=0;try{old=Number(localStorage.getItem('pink-wars-last-cleared'))||0;}catch{}
 store('pink-wars-last-cleared',Math.max(level,old));
 const card=document.createElement('section');card.className='pw-story-card';
 const eyebrow=document.createElement('div');eyebrow.className='pw-story-meta';eyebrow.textContent=story.eyebrow;
 const image=document.createElement('img');image.className='pw-story-image';
 image.src=art(level);image.alt=level===1?'Illustration du relais abandonné et du signal VEILLE-4 retrouvé à Vesper':
 'Illustration des Bas-Niveaux tenus par le Directoire et des archives cachées par HELIX';
 const desc=document.createElement('div');desc.className='pw-story-caption';
 const h=document.createElement('strong');h.textContent=story.heading;
 desc.append(h,document.createTextNode(story.text));card.append(eyebrow,image,desc);
 const score=dialog.querySelector('.end-stats');if(score)dialog.insertBefore(card,score);else dialog.appendChild(card);
 if(level===1){
  const next=document.createElement('button');next.className='pw-story-next';
  next.textContent='CONTINUER L’HISTOIRE → '+story.next;
  next.addEventListener('click',()=>location.assign('./level2-test.html?character='+encodeURIComponent(characterId)+'&source=campaign'));
  const retry=dialog.querySelector('#retry-button');if(retry)dialog.insertBefore(next,retry);else dialog.append(next);
 }
}
export function showChapter2Finale({characterId='ghju',onReplay}={}){
 styles();document.getElementById('pink-story-final')?.remove();
 store('pink-wars-last-cleared',2);
 const modal=document.createElement('div');modal.id='pink-story-final';modal.className='pw-story-modal';modal.setAttribute('role','dialog');
 modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Épilogue des Profondeurs');
 const shell=document.createElement('section');shell.className='pw-story-shell';
 const meta=document.createElement('div');meta.className='pw-story-meta';meta.textContent='PINK WARS / M02 · FIN DE MISSION';
 const header=document.createElement('h2');header.textContent='Les profondeurs ne gardent pas que des machines.';
 const image=document.createElement('img');image.src=art(2);image.className='pw-story-image';
 image.alt='Illustration de la tour de transit du Directoire et des archives HELIX';
 const intro=document.createElement('p');
 intro.textContent='Le convoi 03 est bloqué à quai. D’un côté, quatorze prisonniers du Directoire. De l’autre, les caisses d’archives HELIX sur la mise à jour du 17 novembre. Tu ne peux pas tout ramener.';
 const feedback=document.createElement('div');feedback.className='choice-feedback';feedback.setAttribute('aria-live','polite');
 feedback.textContent='Choisis ce que tu protèges : les prisonniers ou les archives.';
 const actions=document.createElement('div');actions.className='pw-story-choice';
 const escort=document.createElement('button');escort.textContent='LIBÉRER LES PRISONNIERS';
 const proof=document.createElement('button');proof.className='amber';proof.textContent='RÉCUPÉRER LES ARCHIVES HELIX';
 const continueButton=document.createElement('button');continueButton.textContent='CONTINUER → CHAPITRE 03 · LE CONVOI DES OUBLIÉS';
 continueButton.hidden=true;
 const replay=document.createElement('button');replay.className='secondary';replay.textContent='REJOUER LE NIVEAU 2';
 const decide=choice=>{
   store('pink-wars-m02-choice',choice);
   const story=chapterStory(2,characterId,choice);
   header.textContent=story.heading;feedback.textContent=story.text;
   escort.hidden=true;proof.hidden=true;continueButton.hidden=false;
 };
 escort.addEventListener('click',()=>decide('escort'));
 proof.addEventListener('click',()=>decide('proof'));
 continueButton.addEventListener('click',()=>location.assign('./niveau3.html?chapter=3&character='+encodeURIComponent(characterId)+'&source=campaign'));
 replay.addEventListener('click',()=>{modal.remove();onReplay?.();});
 actions.append(escort,proof,continueButton,replay);
 shell.append(meta,header,image,intro,feedback,actions);modal.append(shell);document.body.appendChild(modal);
 return modal;
}
