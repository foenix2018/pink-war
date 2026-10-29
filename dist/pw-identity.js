// Identity system for every visible Pink Wars screen. Original SVG lives in art/.
(()=>{'use strict';
 const rootURL=new URL('.',document.currentScript?.src||location.href);
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('pw-identity.css?v=1',rootURL).href;document.head.append(css);
 const logo=new URL('art/pink-wars-wordmark.svg?v=1',rootURL).href;
 if(location.pathname.endsWith('/niveau3.html')||new URLSearchParams(location.search).get('chapter')==='3')document.documentElement.classList.add('pw-m03-page');
 function largeLogo(node,kind){
  if(!node||node.dataset.pwLogoApplied)return;
  node.dataset.pwLogoApplied='1';
  const img=document.createElement('img');img.src=logo;img.alt='PINK WARS';img.className=kind==='header'?'pw-header-wordmark':'pw-major-wordmark';img.decoding='async';img.loading='eager';
  if(kind==='header'){const spans=Array.from(node.children).filter(c=>c.tagName==='SPAN');if(spans.length){spans.at(-1).replaceWith(img);}else node.append(img);}
  else node.replaceChildren(img);
 }
 function mark(node){
  if(!node||node.nodeType!==1||node.closest('.pw-brand-type')||node.closest('script,style,noscript,code,pre,svg'))return;
  if(node.matches('a.brand')){largeLogo(node,'header');return;}
  if(node.matches('#lobby .intro>h1,#intro .introCard>h1')){largeLogo(node,'major');return;}
  const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT,{acceptNode(t){
   return t.parentElement?.closest('script,style,noscript,code,pre,svg,.pw-brand-type')||!(/PINK\s+WARS/i.test(t.textContent))?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;
  }});
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const t of nodes){
   const m=/PINK\s+WARS/i.exec(t.nodeValue);if(!m)continue;
   const fragment=document.createDocumentFragment();
   const before=t.nodeValue.slice(0,m.index),after=t.nodeValue.slice(m.index+m[0].length);
   if(before)fragment.append(document.createTextNode(before));
   const span=document.createElement('span');span.className='pw-brand-type';span.setAttribute('aria-label','PINK WARS');
   const pink=document.createElement('span');pink.className='pw-brand-pink';pink.textContent='PINK';
   const silver=document.createElement('span');silver.className='pw-brand-silver';silver.textContent='WARS';
   span.append(pink,document.createTextNode(' '),silver);fragment.append(span);
   if(after)fragment.append(document.createTextNode(after));
   t.replaceWith(fragment);
  }
 }
 function apply(node){
  if(!node||node.nodeType!==1)return;
  if(node.matches('a.brand,#lobby .intro>h1,#intro .introCard>h1'))mark(node);
  node.querySelectorAll?.('a.brand,#lobby .intro>h1,#intro .introCard>h1').forEach(mark);
  // Only textual UI; never traverse WebGPU canvas or the entire world state.
  const targets='h1,h2,h3,header,.logo,.introMeta,.kicker,.eyebrow,.smallcap,.pw-load-brand,.pp-meta,.pp-brand,.loading-copy,.loading-brand,.helpCard>div,.mission-kicker,.pw-story-meta,.pw-story-shell,.pw-story-card';
  if(node.matches(targets))mark(node);
  node.querySelectorAll?.(targets).forEach(mark);
  // Normalize and style every other visible occurrence, including modal and future overlays.
  // Text nodes in canvas, scripts, code and existing wordmarks remain untouched.
  mark(node);
 }
 function boot(){
  apply(document.body);
  const observer=new MutationObserver(entries=>{
   for(const e of entries)for(const item of e.addedNodes){if(item.nodeType===1)apply(item);else if(item.nodeType===3&&item.parentElement?.matches('.logo,.pw-load-brand,.introMeta,.kicker,.eyebrow,.pp-brand,h1,h2'))mark(item.parentElement);}
  });
  observer.observe(document.body,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
