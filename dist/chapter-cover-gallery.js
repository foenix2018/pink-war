// Pink Wars — lazy chapter-cover previews in Histoire; no changes to playable/locked status.
const installChapterCovers=()=>{
  const menu=document.getElementById('story-chapters');if(!menu)return;
  const buttons=[...menu.querySelectorAll('button')];
  const items=[];
  for(const button of buttons){
    const match=/^\s*(\d{1,2})\s*[—–-]/.exec(button.textContent||'');
    const n=match&&Number(match[1]);if(!n||n>20)continue;
    const src='./art/chapters/chapter-'+String(n).padStart(2,'0')+'.webp?v=20261031';
    button.dataset.pwCover=String(n);
    items.push({button,src});
  }
  const paint=({button,src})=>{
    if(button.dataset.pwCoverLoaded)return;
    button.style.setProperty('--pw-chapter-cover','url("'+src+'")');
    button.dataset.pwCoverLoaded='1';
  };
  if(!('IntersectionObserver' in window)){items.forEach(paint);return;}
  const observer=new IntersectionObserver(entries=>{
    for(const item of entries)if(item.isIntersecting){
      const found=items.find(x=>x.button===item.target);
      if(found)paint(found);
      observer.unobserve(item.target);
    }
  },{root:menu,rootMargin:'180px 0px'});
  items.forEach(({button})=>observer.observe(button));
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installChapterCovers,{once:true});
else installChapterCovers();
