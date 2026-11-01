// Pink Wars – tactical holographic transcripts, based on the approved visual reference.
// DOM-only overlay: no added renderer, no frame-by-frame canvas uploads, and no dialogue rewrite.
import {paintCompanionPortrait} from './companion-portrait.js';

const STYLESHEET='hologram-comms.css?v=1';
const kindOf=line=>{
 const key=String(line?.who||line?.speaker?.name||'').toLowerCase();
 if(key==='gaby'||key.includes('gab-1'))return 'gab';
 if(key==='cara'||key.includes('car-14'))return 'car';
 if(key==='ghju')return 'ghju';
 if(key==='lylu')return 'lylu';
 return 'radio';
};
const names={gab:'GAB-1',car:'CAR-14',ghju:'GHJU',lylu:'LYLU'};
export const commsIdentity=kindOf;
export function createHologramComms({doc=document,expanded=false,maxMessages=4}={}){
 const root=doc.createElement('section');root.className='pw-comms';
 root.hidden=true;root.dataset.expanded=String(expanded);root.setAttribute('aria-label','Transmission holographique');
 root.setAttribute('role','region');
 root.innerHTML='<header class="pw-comms-header"><span class="pw-comms-brand">PINK WARS</span><span class="pw-comms-mark" aria-hidden="true">▰▰▰</span><span class="pw-comms-rule"></span><span class="pw-comms-status">◈ CANAL SÉCURISÉ</span><button class="pw-comms-toggle" type="button" aria-expanded="false" aria-label="Afficher les échanges précédents">▣</button></header><div class="pw-comms-transcript" aria-live="off"></div><footer class="pw-comms-footer"><span></span><b>▪　<span>■</span>　▪</b><span></span></footer>';
 const list=root.querySelector('.pw-comms-transcript'),toggle=root.querySelector('.pw-comms-toggle');
 let clock=0,hidden=false,disposed=false;const history=[];
 const styleExists=doc.querySelector('link[data-pw-hologram-comms]');
 if(!styleExists){const link=doc.createElement('link');link.rel='stylesheet';link.href='./'+STYLESHEET;link.dataset.pwHologramComms='';doc.head.append(link);}
 doc.body.append(root);
 function setExpanded(value){
  root.dataset.expanded=String(!!value);
  toggle.setAttribute('aria-expanded',String(!!value));
  toggle.setAttribute('aria-label',value?'Réduire la transmission':'Afficher les échanges précédents');
 }
 toggle.onclick=()=>setExpanded(root.dataset.expanded!=='true');
 function avatar(person){
  const frame=doc.createElement('div');frame.className='pw-comms-avatar';
  if(person==='gab'||person==='car'){
   const canvas=doc.createElement('canvas');canvas.width=128;canvas.height=128;canvas.setAttribute('aria-hidden','true');
   const ctx=canvas.getContext('2d');if(ctx)paintCompanionPortrait(ctx,person==='car'?'lylu':'ghju',128);
   frame.append(canvas);
  }else if(person==='ghju'||person==='lylu'){
   const image=doc.createElement('img');image.alt='';
   image.loading='lazy';image.src=person==='ghju'?'./art/updates/3664/game-ghju.webp':'./art/updates/3664/game-lylu.webp';
   frame.append(image);
  }else{
   const symbol=doc.createElement('span');symbol.textContent='◈';frame.append(symbol);
  }
  return frame;
 }
 function card(line){
  const person=kindOf(line),article=doc.createElement('article');article.className='pw-comms-entry';article.dataset.person=person;
  const who=doc.createElement('div');who.className='pw-comms-name pw-comms-cut';
  who.textContent=names[person]||line?.speaker?.name||String(line?.who||'RADIO').toUpperCase();
  const stack=doc.createElement('div');stack.className='pw-comms-content';
  const stripes=doc.createElement('span');stripes.className='pw-comms-stripes';stripes.textContent='▰▰▰';stripes.setAttribute('aria-hidden','true');
  const tag=doc.createElement('div');tag.className='pw-comms-meta';tag.append(who,stripes);
  const bubble=doc.createElement('div');bubble.className='pw-comms-bubble';
  const words=doc.createElement('span');words.className='pw-comms-words pw-comms-cut';words.textContent=String(line.text||'');
  bubble.append(words);stack.append(tag,bubble);article.append(avatar(person),stack);
  return article;
 }
 function push(line){
  if(disposed||!line)return;
  history.push({who:line.who,speaker:line.speaker,text:String(line.text||'')});
  if(history.length>Math.max(2,maxMessages))history.shift();
  const elem=card(line);list.append(elem);
  while(list.children.length>Math.max(2,maxMessages))list.firstElementChild.remove();
  root.hidden=false;clock=0;hidden=false;
  if(root.dataset.expanded==='true')list.scrollTop=list.scrollHeight;
 }
 function update(dt,{xr=false,hidden:forceHidden=false}={}){
  if(disposed)return;
  if(!forceHidden&&!xr&&dt>0)clock+=Math.min(.1,dt);
  hidden=!!xr||!!forceHidden||clock>7;
  root.hidden=hidden||history.length===0;
 }
 function clear(){history.length=0;list.replaceChildren();clock=0;root.hidden=true;}
 function dispose(){if(disposed)return;disposed=true;clear();root.remove();}
 setExpanded(expanded);
 return {root,push,update,clear,dispose,setExpanded,get count(){return history.length;},get expanded(){return root.dataset.expanded==='true';}};
}
