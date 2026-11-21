import {nanoRecipes,nanoCompanion,NANO_BLUEPRINTS} from './nano-forge.js';
export function createNanoForgePanel({parent,getGame,onRefresh=()=>{}}){
 const doc=parent.ownerDocument;
 if(!doc.querySelector('[data-nano-style]')){const link=doc.createElement('link');link.rel='stylesheet';link.href=new URL('./nano-forge.css',import.meta.url).href;link.dataset.nanoStyle='';doc.head.append(link);}
 const root=doc.createElement('section');root.className='pw-nano-forge';root.setAttribute('aria-label','Atelier de manipulation des nanoparticules');
 root.innerHTML='<div class="pw-nano-heading"><span>MANIPULATION NANOMÉTRIQUE</span><strong></strong><b></b></div><p class="pw-nano-guide"></p><label class="pw-nano-weapon">Arme à modifier<select aria-label="Arme à modifier dans l’atelier"></select></label><div class="pw-nano-config" hidden><span>Configuration</span><button type="button" data-nano-config="impact">Impact</button><button type="button" data-nano-config="precision">Précision</button></div><p class="pw-nano-save" role="status"></p><div class="pw-nano-recipes"></div>';
 parent.append(root);let signature='';
 const select=root.querySelector('select'),list=root.querySelector('.pw-nano-recipes');
 select.onchange=()=>{getGame()?.selectWeapon(Number(select.value));signature='';refresh();onRefresh();};
 for(const b of root.querySelectorAll('[data-nano-config]'))b.onclick=()=>{getGame()?.setNanoConfiguration(b.dataset.nanoConfig);signature='';refresh();onRefresh();};
 function refresh(){
  const g=getGame(),n=g?.nano;if(!n){root.hidden=true;return;}root.hidden=false;
  const key=JSON.stringify([n.profile.revision,n.saveOK,g.weaponIndex,[...g.ownedWeapons],g.state,g.player.hp>0]);if(key===signature)return;signature=key;
  root.querySelector('.pw-nano-heading strong').textContent=nanoCompanion(n.hero)+' → '+n.hero.toUpperCase();
  root.querySelector('.pw-nano-heading b').textContent=n.profile.balance.toLocaleString('fr-FR')+' NP';
  root.querySelector('.pw-nano-guide').textContent=n.campaign?'Plans découverts : '+n.profile.discovered.length+' / '+NANO_BLUEPRINTS.length+'. Approche les débris des ennemis pour récolter les nanites. Les plans lumineux se récupèrent en s’en approchant.':'ATELIER D’ESSAI · 1 500 NP au début de la session. Aucun effet sur la sauvegarde du scénario.';
  const options=[...g.ownedWeapons].filter(i=>g.isWeaponAvailable(i)&&g.nanoWeaponAllowed(i)).sort((a,b)=>a-b);select.replaceChildren(...options.map(i=>{const o=doc.createElement('option');o.value=i;o.textContent=g.nanoWeapons[i].name;return o;}));select.value=String(g.weaponIndex);
  const configuration=root.querySelector('.pw-nano-config');configuration.hidden=!n.profile.upgrades['precision:'+g.weaponIndex];
  for(const b of configuration.querySelectorAll('button'))b.setAttribute('aria-pressed',String((n.profile.configurations[g.weaponIndex]||'impact')===b.dataset.nanoConfig));
  root.querySelector('.pw-nano-save').textContent=n.saveOK?(n.campaign?'Plans, créations et nanoparticules sauvegardés pour cette héroïne.':'Ressources d’essai · session en cours.'):'Sauvegarde indisponible : garde cet onglet ouvert. Les fabrications payantes sont suspendues.';
  list.replaceChildren();
  for(const r of nanoRecipes(g)){
   const card=doc.createElement('article');card.className='pw-nano-recipe';card.dataset.known=String(r.known);card.dataset.recipe=r.id;
   const name=doc.createElement('strong');name.textContent=r.name;
   const detail=doc.createElement('p');detail.textContent=r.detail;
   const plan=doc.createElement('small'),bp=NANO_BLUEPRINTS.find(b=>b.id===r.blueprint);plan.textContent=r.known?'PLAN ACQUIS · '+(r.max>1?'RANG '+r.rank+' / '+r.max:bp.name):'PLAN À TROUVER · NIVEAU '+r.level+' · '+bp.source;
   const action=doc.createElement('button');action.type='button';action.dataset.nanoRecipe=r.id;action.disabled=!r.enabled;action.textContent=r.rank>=r.max?(r.id.startsWith('create:')?'ACQUIS':'TERMINÉ'):r.known?'ASSEMBLER · '+r.cost+' NP':'PLAN REQUIS';action.setAttribute('aria-label',r.name+' · '+(r.reason||r.cost+' nanoparticules'));
   action.onclick=()=>{g.fabricateNano(r.id);signature='';refresh();onRefresh();};
   card.append(plan,name,detail,action);if(r.reason){const hint=doc.createElement('small');hint.textContent=r.reason;card.append(hint);}list.append(card);
  }
 }
 return{root,refresh,dispose(){root.remove();}};
}
