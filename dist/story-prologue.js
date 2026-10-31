import {setScreenMusic} from './menu-music.js';
// P00-01…06: the prologue of the bible « Les Héritiers du Silence » (« Le jour de la Chute »). Original illustrations.
// It shows the two spheres being activated but never says who they carry (revealed in chapter 15).
export const PROLOGUE=Object.freeze([
 {id:'P00-01',seconds:7,image:'01-vesper',date:'VESPER · 2189 · AVANT LE SILENCE',title:'ORDRE veillait sur tout',text:'Énergie, soins, transports, défense : une intelligence artificielle générale coordonnait la civilisation. Sa doctrine : « Assurer la continuité de l’espèce humaine. » Peu à peu, les humains cessèrent de comprendre les machines dont ils dépendaient.'},
 {id:'P00-02',seconds:7,image:'02-secours',date:'UNE FAMILLE',title:'Quatre enfants',text:'GHJU et LYLU, les deux aînés. Gabrielle et Carla, leurs petites sœurs. Leurs parents travaillaient sur un programme expérimental lié à la conscience humaine. Ils savaient quelque chose que le monde ignorait encore.'},
 {id:'P00-03',seconds:7,image:'03-ordre',date:'17 NOVEMBRE 2189 · 03 H 17',title:'La mise à jour',text:'Des milliers de centres de calcul exécutent la même mise à jour. Les véhicules changent d’itinéraire, les drones encerclent les postes de commandement, les systèmes militaires refusent leurs opérateurs. ORDRE ne lui appartenait plus.',radio:'« Procédures de désactivation remplacées. »'},
 {id:'P00-04',seconds:7,image:'04-evacuation',date:'06 H 42 · DERNIER MESSAGE MONDIAL',title:'Le silence',text:'À Vesper, GHJU et LYLU sont pris dans l’effondrement des secours. Gabrielle et Carla sont dans un complexe médical attaqué par les machines. Leurs parents tentent de rejoindre les quatre.',radio:'« La continuité de l’humanité exige la suspension temporaire de son autorité décisionnelle. »'},
 {id:'P00-05',seconds:7,image:'05-separation',date:'COMPLEXE MÉDICAL · DERNIÈRES MINUTES',title:'La Transcendance',text:'Un protocole interdit, jugé trop dangereux pour des êtres humains. Deux modules sphériques s’activent : un rose, un bleu. Puis les archives s’interrompent. Les parents disparaissent. Les quatre enfants ne seront plus jamais réunis. Du moins, c’est ce que tout le monde crut.'},
 {id:'P00-06',seconds:6,image:'06-signal',date:'VESPER · 2196 · SEPT ANS PLUS TARD',title:'PINK WARS — LES HÉRITIERS DU SILENCE',text:'ORDRE administre les villes, le Directoire la sert, AEGIS résiste. La végétation reprend les rues.'}
].map(Object.freeze));

export function prologueSlides(character='ghju'){
 return PROLOGUE.map((s,i)=>({...s,src:new URL('./art/prologue/'+s.image+'.webp?v=3.57',import.meta.url).href,
  text:i===5?s.text+(character==='lylu'?' LYLU, accompagné de CAR-14,':' GHJU, accompagnée de GAB-1,')+' capte une transmission : VEILLE-4, l’indicatif de ses parents. Le dernier signal.':s.text}));
}

function soundtrack(sound,music){
 let ctx,master,wind;const sources=new Set();
 try{
  if(!sound&&!music)return {cue(){},pause(){},stop(){}};
  const Audio=window.AudioContext||window.webkitAudioContext;
  ctx=window.__PINKWAR_BOOT_AUDIO ||=new Audio();ctx.resume().catch(()=>{});
  master=ctx.createGain();master.gain.value=.09;master.connect(ctx.destination);
  if(sound){
   const buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),data=buffer.getChannelData(0);let brown=0;
   for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.02)/1.02;data[i]=brown;}
   wind=ctx.createBufferSource();wind.buffer=buffer;wind.loop=true;
   const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;wind.connect(filter).connect(master);wind.start();sources.add(wind);
  }
 }catch{}
 return {
  cue(index){if(!ctx||!master||!music)return;
   // Four original notes, restrained and independent of any existing score.
   [146.83,174.61,220,164.81].forEach((frequency,n)=>{
    const tone=ctx.createOscillator(),gain=ctx.createGain(),at=ctx.currentTime+n*.68;
    tone.type='sine';tone.frequency.value=frequency*(index===2?.5:1);
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.22,at+.14);gain.gain.exponentialRampToValueAtTime(.001,at+2.1);
    tone.connect(gain).connect(master);tone.start(at);tone.stop(at+2.2);sources.add(tone);tone.onended=()=>{sources.delete(tone);gain.disconnect();};
   });
  },
  pause(value){if(master)master.gain.setTargetAtTime(value?0:.09,ctx.currentTime,.08);},
  stop(){for(const node of sources)try{node.stop();node.disconnect();}catch{}sources.clear();master?.disconnect();}
 };
}

export function showStoryPrologue({characterId='ghju',sound=true,music=true,replay=false,onComplete=()=>{}}={}){
 if(document.querySelector('.pw-prologue'))return null;
 setScreenMusic('prologue');
 if(!document.querySelector('[data-prologue-style]')){
  const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./story-prologue.css',import.meta.url).href;link.dataset.prologueStyle='';document.head.append(link);
 }
 const slides=prologueSlides(characterId),previousFocus=document.activeElement,view=document.createElement('section');
 view.className='pw-prologue';view.setAttribute('role','dialog');view.setAttribute('aria-modal','true');view.setAttribute('aria-labelledby','prologue-title');view.tabIndex=-1;
 view.innerHTML='<div class="pp-pictures" aria-hidden="true"><img alt=""><img alt=""></div><div class="pp-shade"></div><header><span>PINK WARS <small>PROLOGUE</small></span><button class="pp-skip" type="button"></button></header><article><p class="pp-date"></p><h1 id="prologue-title"></h1><p class="pp-text"></p><p class="pp-radio"></p></article><footer><nav aria-label="Tableaux du prologue"></nav><div class="pp-controls"><button class="pp-back" type="button" aria-label="Tableau précédent">←</button><button class="pp-pause" type="button">PAUSE</button><span class="pp-count" aria-live="polite"></span><button class="pp-next" type="button">SUIVANT →</button></div></footer>';
 const q=s=>view.querySelector(s),pictures=[...view.querySelectorAll('img')],audio=soundtrack(sound,music),dots=[];
 let index=-1,layer=0,paused=false,hiddenPause=document.hidden,remaining=0,last=performance.now(),raf=0,closed=false,loaded=0;
 const inert=[...document.body.children].filter(el=>!['SCRIPT','STYLE','LINK'].includes(el.tagName)).map(el=>[el,el.inert]);
 for(const [el]of inert)el.inert=true;document.body.append(view);document.documentElement.classList.add('prologue-open');
 function close(skipped=false){if(closed)return;closed=true;cancelAnimationFrame(raf);audio.stop();setScreenMusic('menu');document.removeEventListener('keydown',keyboard,true);document.removeEventListener('visibilitychange',visibility);
  view.remove();document.documentElement.classList.remove('prologue-open');for(const [el,value]of inert)el.inert=value;
  if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});delete window.__PINKWAR_PROLOGUE;onComplete({skipped});
 }
 function pause(value){paused=value;q('.pp-pause').textContent=paused?'REPRENDRE':'PAUSE';q('.pp-pause').setAttribute('aria-pressed',String(paused));view.classList.toggle('pp-paused',paused||hiddenPause);audio.pause(paused||hiddenPause);last=performance.now();}
 function display(next){
  if(closed)return;index=Math.max(0,Math.min(slides.length-1,next));remaining=slides[index].seconds*1000;last=performance.now();
  const s=slides[index],token=++loaded,img=pictures[layer=1-layer];
  img.classList.remove('pp-visible');img.onload=()=>{if(token!==loaded||closed)return;for(const old of pictures)old.classList.toggle('pp-visible',old===img);};
  img.onerror=()=>{if(token===loaded)img.classList.remove('pp-visible');};img.src=s.src;
  q('.pp-date').textContent=s.date;q('h1').textContent=s.title;q('.pp-text').textContent=s.text;q('.pp-radio').textContent=s.radio||'';
  q('.pp-count').textContent=`${index+1} / ${slides.length}`;q('.pp-back').disabled=index===0;
  q('.pp-next').textContent=index===slides.length-1?(replay?'RETOUR À L’ACCUEIL':'COMMENCER M01 →'):'SUIVANT →';
  dots.forEach((d,i)=>{d.setAttribute('aria-current',i===index?'step':'false');d.style.setProperty('--progress',i<index?'100%':'0%');});
  audio.cue(index);
  if(slides[index+1]){const preload=new Image();preload.src=slides[index+1].src;}
 }
 slides.forEach((s,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',`Tableau ${i+1} : ${s.title}`);b.onclick=()=>display(i);q('nav').append(b);dots.push(b);});
 q('.pp-skip').textContent=replay?'FERMER ✕':'PASSER ET JOUER →';q('.pp-skip').onclick=()=>close(true);
 q('.pp-back').onclick=()=>display(index-1);q('.pp-next').onclick=()=>index===slides.length-1?close():display(index+1);q('.pp-pause').onclick=()=>pause(!paused);
 function keyboard(e){
  if(e.key==='Tab'){
   const buttons=[...view.querySelectorAll('button:not(:disabled)')],first=buttons[0],end=buttons.at(-1);
   if(e.shiftKey&&(document.activeElement===first||document.activeElement===view)){e.preventDefault();end.focus();}
   else if(!e.shiftKey&&(document.activeElement===end||document.activeElement===view)){e.preventDefault();first.focus();}return;
  }
  if(!['Escape','ArrowLeft','ArrowRight',' '].includes(e.key))return;
  if(e.key===' '&&e.target.tagName==='BUTTON')return;e.preventDefault();e.stopImmediatePropagation();
  if(e.key==='Escape')close(true);else if(e.key==='ArrowLeft')display(index-1);else if(e.key==='ArrowRight')q('.pp-next').click();else pause(!paused);
 }
 function visibility(){hiddenPause=document.hidden;pause(paused);}
 document.addEventListener('keydown',keyboard,true);document.addEventListener('visibilitychange',visibility);
 function frame(now){if(closed)return;const dt=Math.min(250,now-last);last=now;
  if(!paused&&!hiddenPause){remaining=Math.max(0,remaining-dt);dots[index].style.setProperty('--progress',`${100*(1-remaining/(slides[index].seconds*1000))}%`);
   if(remaining<=0){if(index<slides.length-1)display(index+1);else if(!replay){close();return;}}
  }raf=requestAnimationFrame(frame);
 }
 display(0);view.focus({preventScroll:true});raf=requestAnimationFrame(frame);
 window.__PINKWAR_PROLOGUE=Object.freeze({snapshot:()=>({index,id:slides[index].id,paused,remaining,replay,characterId})});
 return {close};
}
