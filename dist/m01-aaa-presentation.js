// Vesper-specific presentation: no camera hijack, no simulation or collision edits.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createM01Motion(){
 let phase=0,weight=0,lastTime=null,side=0;
 return {reset(){phase=weight=side=0;lastTime=null;},update({time=0,dt=0,velocity={},aim=0,sprint=false,grounded=true,yaw=0}={}){
  // syncCamera is invoked several times in one simulation tick. Advance once.
  const step=lastTime===null?0:clamp(time-lastTime,0,.05);lastTime=time;
  const speed=Math.hypot(velocity.x||0,velocity.z||0);
  phase+=speed*step*2.2;const k=1-Math.exp(-step*12);
  weight+=(Number(grounded)*Math.min(1,speed/5)-weight)*k;
  side+=(clamp(((velocity.x||0)*Math.cos(yaw)-(velocity.z||0)*Math.sin(yaw))/5,-1,1)-side)*k;
  const fade=(1-clamp(aim,0,1))**2,amp=weight*fade;
  return {x:Math.sin(phase)*.008*amp,y:-Math.abs(Math.cos(phase))*.009*amp,z:0,pitch:-.015*amp*Number(sprint),roll:side*.018*fade};
 }};
}
export function createM01Alert(){
 let active=false,last=-Infinity;
 return {update(time,enemies=[]){if(enemies.some(e=>e.hp>0&&e.awareness==='engaged'))last=time;
 const next=time-last<4,changed=next!==active;active=next;return {active,changed};},snapshot:()=>({active})};
}
export function createM01Presentation(doc){
 const root=doc.createElement('div');root.className='pw-m01-aaa';root.setAttribute('aria-hidden','true');
 root.innerHTML='<div class="m01-chapter"><small>PINK WARS / VESPER</small><strong></strong><span></span></div><div class="m01-alert">◈ CONTACT ORDRE</div>';
 const css=doc.createElement('style');css.textContent=`
 .pw-m01-aaa{position:fixed;inset:0;z-index:4;pointer-events:none;font-family:system-ui,sans-serif;color:#e6edf4}
 .m01-chapter{position:absolute;top:22%;left:50%;width:min(480px,76vw);transform:translateX(-50%);display:grid;gap:4px;text-align:center;text-shadow:0 2px 10px #000;opacity:0}
 .m01-chapter.show{animation:m01Chapter 3.8s ease both}
 .m01-chapter small{font-size:10px;letter-spacing:.32em;color:#ffb2d4}.m01-chapter strong{font-size:clamp(16px,3vw,26px);letter-spacing:.08em}.m01-chapter span{font-size:12px}
 @keyframes m01Chapter{0%,100%{opacity:0}12%,78%{opacity:1}}
 .m01-alert{position:absolute;top:max(68px,calc(env(safe-area-inset-top) + 58px));left:50%;transform:translateX(-50%);font-size:10px;letter-spacing:.14em;color:#ff9e92;text-shadow:0 1px 5px #000;opacity:0;transition:opacity .25s}
 .m01-alert.live{opacity:1}
 @media(pointer:coarse){#touchControls #touchButtons button{touch-action:none;-webkit-tap-highlight-color:transparent}#touchControls #touchButtons button:active{filter:brightness(1.35)}#touchControls #touchButtons #btnFireMobile{box-shadow:inset 0 0 0 2px #fff2}#touchControls #touchButtons #btnAimMobile[aria-pressed=true]{box-shadow:0 0 0 2px #ffa1c7}#game #quickSettings,#game #quickObjective{backdrop-filter:none}}
 @media(prefers-reduced-motion:reduce){.m01-chapter.show{animation:m01Chapter 3s linear both}.m01-alert{transition:none}}
 `;doc.head.append(css);doc.body.append(root);
 const title=root.querySelector('.m01-chapter'),mark=root.querySelector('.m01-alert');let lastTitle='',threat=false;
 return {chapter(name,subtitle=''){lastTitle=String(name||'');title.querySelector('strong').textContent=lastTitle;title.querySelector('span').textContent=String(subtitle||'');title.classList.remove('show');void title.offsetWidth;title.classList.add('show');},
 threat(active){if(threat===!!active)return;threat=!!active;mark.classList.toggle('live',threat);},
 clear(){title.classList.remove('show');mark.classList.remove('live');threat=false;},snapshot:()=>({lastTitle,threat})};
}
// Original synthesized cues, short and bounded; no additional network/audio assets.
const nextCue=new WeakMap();
export function playM01Cue(context,kind){
 if(context?.state!=='running')return false;
 const now=context.currentTime,last=nextCue.get(context)||0;if(now<last)return false;nextCue.set(context,now+.65);
 const bus=context.createGain();bus.gain.value=.075;bus.connect(context.destination);
 const notes=kind==='alert'?[220,165]:[196,294,392];let active=notes.length;
 notes.forEach((hz,i)=>{const o=context.createOscillator(),g=context.createGain(),at=now+i*.12;o.type='sine';o.frequency.setValueAtTime(hz,at);g.gain.setValueAtTime(.001,at);g.gain.exponentialRampToValueAtTime(.65,at+.025);g.gain.exponentialRampToValueAtTime(.001,at+.24);o.connect(g);g.connect(bus);o.onended=()=>{o.disconnect();g.disconnect();if(!--active)bus.disconnect();};o.start(at);o.stop(at+.25);});return true;
}
