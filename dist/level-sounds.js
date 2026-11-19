// Ambience beds for the story chapters: layered, local to the player's area, and replaceable layer by layer.
//
// Every sound is a SLOT. A slot is synthesised here (filtered noise, humming oscillators, short events) so the game always
// has its atmosphere with no download; if a file named after the slot exists in dist/assets/sfx/ (for instance one the
// owner downloaded from a sound library under their own licence — see assets/sfx/README.md), it is loaded at start-up and
// replaces the synthesised version of that slot. A missing file is simply skipped: no error, no request retried.
//
// The module never creates or resumes an AudioContext (the page hands over the unlocked one) and never touches the music.
// update(dt, {active, area, indoor, breach}) is called every frame; layers fade with the area, events fire at random gaps.
export const SOUND_SLOTS=Object.freeze({
  // loops (beds)
  'rain-loop':'pluie battante sur la ville, en extérieur (30-60 s, bouclable)',
  'rain-roof-loop':'pluie entendue de l’intérieur, sur une toiture métallique (30-60 s, bouclable)',
  'wind-loop':'vent de ville, bas et large (30-60 s, bouclable)',
  'city-hum-loop':'rumeur lointaine d’une métropole la nuit, circulation et ventilations (30-60 s, bouclable)',
  'electric-hum-loop':'bourdonnement électrique 50 Hz : transformateurs, câbles haute tension (20-40 s, bouclable)',
  'reactor-drone-loop':'grondement grave d’un réacteur, avec battement lent (30-60 s, bouclable)',
  'server-fans-loop':'salle de serveurs : ventilateurs et climatisation (20-40 s, bouclable)',
  'hangar-air-loop':'grand hangar vide : air, écho de tôle, grondement lointain (30-60 s, bouclable)',
  'factory-machinery-loop':'chaîne de montage lente : convoyeur, vérins, rythme régulier (20-40 s, bouclable)',
  // events (one-shots)
  'thunder-distant':'tonnerre lointain, 3 à 6 s',
  'siren-distant':'sirène d’alerte de la ville au loin, 4 à 8 s',
  'drone-flyby':'drone qui passe en hauteur, de gauche à droite, 3 à 5 s',
  'metal-creak':'grincement de structure métallique qui travaille, 1 à 3 s',
  'electric-arc':'arc électrique et crépitement, 0,3 à 1 s',
  'welding-crackle':'soudure, gerbe d’étincelles, 0,5 à 1,5 s',
  'server-blip':'deux bips de terminal, 0,3 s'
});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// How loud each bed is in each area, per chapter (0 = silent). Anything not listed falls back to "outdoors".
const OUTDOOR={rain:1,rainRoof:0,wind:1,city:1,electric:.15,reactor:.12,fans:0,hangar:0,machinery:.1};
const ROOMS={
  3:{
    'usine':{rain:0,rainRoof:.8,wind:.1,city:.15,electric:.25,reactor:0,fans:0,hangar:.5,machinery:1},
    'depot':{rain:0,rainRoof:.9,wind:.1,city:.2,electric:.15,reactor:0,fans:0,hangar:.6,machinery:.35},
    'annexe':{rain:.05,rainRoof:.8,wind:.1,city:.2,electric:.2,reactor:0,fans:0,hangar:.2,machinery:.1},
    'atelier':{rain:.05,rainRoof:.8,wind:.1,city:.2,electric:.25,reactor:0,fans:.2,hangar:.2,machinery:.3},
    'gare':{rain:.8,rainRoof:.3,wind:1.3,city:.8,electric:.3,reactor:0,fans:0,hangar:0,machinery:.2}
  },
  4:{
    'sas':{rain:0,rainRoof:.3,wind:0,city:.1,electric:.5,reactor:.25,fans:.2,hangar:0,machinery:0},
    'quai':{rain:.6,rainRoof:.5,wind:.6,city:.4,electric:.4,reactor:.2,fans:0,hangar:0,machinery:0},
    'cour':{rain:1,rainRoof:0,wind:.7,city:.3,electric:1,reactor:.55,fans:0,hangar:0,machinery:.05},
    'hangar':{rain:0,rainRoof:.7,wind:.1,city:.1,electric:.3,reactor:.15,fans:0,hangar:1,machinery:.1},
    'atelier':{rain:0,rainRoof:.4,wind:0,city:.05,electric:.5,reactor:.15,fans:1,hangar:0,machinery:0},
    'relais-est':{rain:0,rainRoof:.3,wind:0,city:0,electric:1,reactor:.2,fans:.6,hangar:0,machinery:0},
    'maintenance':{rain:0,rainRoof:.5,wind:0,city:.05,electric:.7,reactor:.4,fans:.2,hangar:.2,machinery:0},
    'anneau':{rain:.2,rainRoof:.5,wind:.3,city:.1,electric:.8,reactor:1,fans:0,hangar:.3,machinery:0},
    'portique':{rain:.1,rainRoof:.4,wind:.5,city:.1,electric:.7,reactor:1,fans:0,hangar:.1,machinery:0}
  }
};
// Events: which slot, the gap in seconds between two of them, and where they can happen.
const EVENTS={
  3:[
    {slot:'thunder-distant',gap:[28,70],where:a=>a.outdoor,level:.55},
    {slot:'siren-distant',gap:[30,60],where:a=>a.outdoor,level:.35},
    {slot:'drone-flyby',gap:[35,75],where:a=>a.outdoor,level:.4},
    {slot:'metal-creak',gap:[14,34],where:a=>!a.outdoor||a.id==='gare',level:.45},
    {slot:'welding-crackle',gap:[4,11],where:a=>a.id==='usine',level:.5},
    {slot:'electric-arc',gap:[9,22],where:a=>a.id==='usine'||a.id==='gare',level:.4}
  ],
  4:[
    {slot:'thunder-distant',gap:[35,80],where:a=>a.outdoor,level:.5},
    {slot:'drone-flyby',gap:[28,60],where:a=>a.outdoor||a.id==='hangar',level:.45},
    {slot:'metal-creak',gap:[12,30],where:a=>a.id==='hangar'||a.id==='anneau'||a.id==='portique',level:.5},
    {slot:'electric-arc',gap:[5,15],where:a=>['cour','relais-est','anneau','maintenance'].includes(a.id),level:.5},
    {slot:'server-blip',gap:[9,22],where:a=>a.id==='atelier'||a.id==='relais-est',level:.35}
  ]
};
const BED_SLOTS={rain:'rain-loop',rainRoof:'rain-roof-loop',wind:'wind-loop',city:'city-hum-loop',electric:'electric-hum-loop',reactor:'reactor-drone-loop',fans:'server-fans-loop',hangar:'hangar-air-loop',machinery:'factory-machinery-loop'};
const BED_LEVEL={rain:.2,rainRoof:.12,wind:.07,city:.07,electric:.035,reactor:.13,fans:.07,hangar:.07,machinery:.1};

export function bedLevels(chapter,area,indoor){
  const rooms=ROOMS[chapter]||{},room=rooms[area];
  if(room)return {...room};
  const out={...OUTDOOR};if(indoor){out.rain=0;out.rainRoof=.8;out.wind*=.1;out.city*=.3;}
  return out;
}

export function createLevelSounds(ctx,{chapter=3,fetchImpl=globalThis.fetch,base='./assets/sfx/',seed=20261119}={}){
  const events=EVENTS[chapter]||[];
  let rng=seed>>>0;const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
  const between=([a,b])=>a+(b-a)*random();
  const files=new Map(),pending=new Set();let disposed=false,started=false,elapsed=0;
  const beds={},nextAt=events.map(e=>between(e.gap)*.6),voices=new Set();
  let master=null,noiseBuffer=null;

  // Optional files, one request per slot at the first update; any failure leaves the synthesised slot in place.
  async function loadSlots(){
    if(!fetchImpl||!ctx?.decodeAudioData)return;
    await Promise.all(Object.keys(SOUND_SLOTS).map(async name=>{
      if(pending.has(name))return;pending.add(name);
      try{const r=await fetchImpl(base+name+'.mp3',{cache:'force-cache'});if(!r.ok||!/audio|octet/i.test(r.headers?.get?.('content-type')||'audio'))return;
        const buffer=await ctx.decodeAudioData(await r.arrayBuffer());if(buffer&&!disposed)files.set(name,buffer);}catch{/* no file: synthesised */}
    }));
  }
  function noise(){
    if(noiseBuffer)return noiseBuffer;
    const n=Math.ceil(ctx.sampleRate*4),b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);let s=91821,low=0;
    for(let i=0;i<n;i++){s=(Math.imul(s,1664525)+1013904223)>>>0;const w=s/2147483648-1;low+=(w-low)*.22;d[i]=w*.6+low*.5;}
    const seam=Math.min(2048,n>>3);for(let i=0;i<seam;i++){const t=(i+1)/seam;d[n-seam+i]=d[n-seam+i]*(1-t)+d[i]*t;}
    return noiseBuffer=b;
  }
  const noiseSource=()=>{const s=ctx.createBufferSource();s.buffer=noise();s.loop=true;s.loopStart=random()*2;return s;};
  const filter=(type,f,q=.7)=>{const n=ctx.createBiquadFilter();n.type=type;n.frequency.value=f;n.Q.value=q;return n;};
  const osc=(type,f)=>{const o=ctx.createOscillator();o.type=type;o.frequency.value=f;return o;};
  const chain=(...nodes)=>{for(let i=0;i<nodes.length-1;i++)nodes[i].connect(nodes[i+1]);return nodes.at(-1);};

  // Synthesised beds: each returns {out, stop()}; out is a gain the caller drives.
  const SYNTH={
    rain(){const n=noiseSource(),hp=filter('highpass',1400),lp=filter('lowpass',8500),out=ctx.createGain();n.connect(hp);chain(hp,lp,out);n.start();return {out,sources:[n]};},
    rainRoof(){const n=noiseSource(),bp=filter('bandpass',900,.5),lp=filter('lowpass',3200),out=ctx.createGain();n.connect(bp);chain(bp,lp,out);n.start();
      const tick=noiseSource(),th=filter('highpass',4500),tg=ctx.createGain();tg.gain.value=.25;tick.connect(th);chain(th,tg,out);tick.start();return {out,sources:[n,tick]};},
    wind(){const n=noiseSource(),lp=filter('lowpass',420,.4),out=ctx.createGain(),lfo=osc('sine',.09),depth=ctx.createGain();depth.gain.value=180;lfo.connect(depth);depth.connect(lp.frequency);n.connect(lp);chain(lp,out);n.start();lfo.start();return {out,sources:[n,lfo]};},
    city(){const n=noiseSource(),lp=filter('lowpass',170,.5),out=ctx.createGain(),o=osc('sine',46);const og=ctx.createGain();og.gain.value=.4;n.connect(lp);chain(lp,out);o.connect(og);og.connect(out);n.start();o.start();return {out,sources:[n,o]};},
    electric(){const out=ctx.createGain(),lp=filter('lowpass',700,.6),sources=[];
      for(const [f,g] of [[50,1],[100,.7],[150,.5],[250,.25]]){const o=osc(f<150?'sine':'sawtooth',f),gg=ctx.createGain();gg.gain.value=g;o.connect(gg);gg.connect(lp);o.start();sources.push(o);}
      lp.connect(out);return {out,sources};},
    reactor(){const out=ctx.createGain(),lp=filter('lowpass',220,.5),sources=[];
      for(const [f,g] of [[38,1],[40.3,.9],[76,.35],[113,.18]]){const o=osc('sine',f),gg=ctx.createGain();gg.gain.value=g;o.connect(gg);gg.connect(lp);o.start();sources.push(o);}
      const n=noiseSource(),nl=filter('lowpass',160),ng=ctx.createGain();ng.gain.value=.35;n.connect(nl);chain(nl,ng,lp);n.start();sources.push(n);lp.connect(out);return {out,sources};},
    fans(){const n=noiseSource(),bp=filter('bandpass',650,1.1),out=ctx.createGain(),o=osc('sine',118),og=ctx.createGain();og.gain.value=.25;n.connect(bp);chain(bp,out);o.connect(og);og.connect(out);n.start();o.start();return {out,sources:[n,o]};},
    hangar(){const n=noiseSource(),lp=filter('lowpass',260,.4),out=ctx.createGain(),o=osc('sine',55),og=ctx.createGain();og.gain.value=.5;n.connect(lp);chain(lp,out);o.connect(og);og.connect(out);n.start();o.start();return {out,sources:[n,o]};},
    machinery(){const out=ctx.createGain(),o=osc('sine',62),am=ctx.createGain(),lfo=osc('sine',1.7),depth=ctx.createGain();am.gain.value=.5;depth.gain.value=.5;lfo.connect(depth);depth.connect(am.gain);o.connect(am);am.connect(out);
      const n=noiseSource(),bp=filter('bandpass',1100,2),ng=ctx.createGain(),lfo2=osc('square',1.7),d2=ctx.createGain();ng.gain.value=.12;d2.gain.value=.12;lfo2.connect(d2);d2.connect(ng.gain);n.connect(bp);chain(bp,ng,out);
      o.start();lfo.start();n.start();lfo2.start();return {out,sources:[o,lfo,n,lfo2]};}
  };
  function startBeds(){
    master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
    for(const key of Object.keys(BED_SLOTS)){
      const slot=BED_SLOTS[key],bed={key,slot,level:0,node:null};beds[key]=bed;
    }
  }
  // A bed is built only while it is audible, and released once it has faded out.
  function ensureBed(bed){
    if(bed.node)return;
    const file=files.get(bed.slot);let node;
    if(file){const s=ctx.createBufferSource();s.buffer=file;s.loop=true;const out=ctx.createGain();s.connect(out);s.start();node={out,sources:[s],file:true};}
    else node=SYNTH[bed.key]();
    node.out.gain.value=0;node.out.connect(master);bed.node=node;
  }
  function releaseBed(bed){
    if(!bed.node)return;const {out,sources}=bed.node;
    try{out.disconnect();}catch{}for(const s of sources){try{s.stop();}catch{}}bed.node=null;
  }

  // One-shot events: the file when there is one, otherwise a short synthesised burst.
  function pan(p){if(!ctx.createStereoPanner)return null;const n=ctx.createStereoPanner();n.pan.value=clamp(p,-.8,.8);return n;}
  function env(g,t,peak,attack,hold,release){g.setValueAtTime(.0001,t);g.exponentialRampToValueAtTime(peak,t+attack);g.setValueAtTime(peak,t+attack+hold);g.exponentialRampToValueAtTime(.0001,t+attack+hold+release);}
  function burst(out,t,{f=2500,len=.06,level=.5,type='highpass'}={}){const n=noiseSource(),fl=filter(type,f),g=ctx.createGain();env(g.gain,t,level,.004,len*.3,len);n.connect(fl);chain(fl,g,out);n.start(t);n.stop(t+len+.1);return n;}
  const EVENT_SYNTH={
    'thunder-distant'(out,t,level){const n=noiseSource(),lp=filter('lowpass',150,.5),g=ctx.createGain();env(g.gain,t,level,.9,1.4,3.2);n.connect(lp);chain(lp,g,out);n.start(t);n.stop(t+6);return 6;},
    'siren-distant'(out,t,level){const o=osc('sine',620),g=ctx.createGain(),lp=filter('lowpass',1400);for(let k=0;k<4;k++){o.frequency.setValueAtTime(620,t+k*1.2);o.frequency.linearRampToValueAtTime(880,t+k*1.2+.6);o.frequency.linearRampToValueAtTime(620,t+k*1.2+1.2);}
      env(g.gain,t,level*.5,.6,3.4,1.2);o.connect(lp);chain(lp,g,out);o.start(t);o.stop(t+5.4);return 5.4;},
    'drone-flyby'(out,t,level){const n=noiseSource(),bp=filter('bandpass',500,2.5),g=ctx.createGain(),p=pan(-.8);bp.frequency.setValueAtTime(500,t);bp.frequency.linearRampToValueAtTime(1700,t+1.6);bp.frequency.linearRampToValueAtTime(600,t+3.6);
      env(g.gain,t,level*.6,1.4,.6,1.6);if(p){p.pan.setValueAtTime(-.8,t);p.pan.linearRampToValueAtTime(.8,t+3.6);}n.connect(bp);chain(bp,g);(p?g.connect(p)&&p.connect(out):g.connect(out));n.start(t);n.stop(t+4);
      const h=osc('sawtooth',180),hg=ctx.createGain();h.frequency.setValueAtTime(170,t);h.frequency.linearRampToValueAtTime(230,t+1.6);h.frequency.linearRampToValueAtTime(175,t+3.6);env(hg.gain,t,level*.05,1.4,.6,1.6);h.connect(hg);hg.connect(p||out);h.start(t);h.stop(t+4);return 4;},
    'metal-creak'(out,t,level){const o=osc('sawtooth',210),g=ctx.createGain(),bp=filter('bandpass',420,6);o.frequency.setValueAtTime(210,t);o.frequency.exponentialRampToValueAtTime(130,t+1.7);env(g.gain,t,level*.12,.2,.8,.9);o.connect(bp);chain(bp,g,out);o.start(t);o.stop(t+2.1);return 2.1;},
    'electric-arc'(out,t,level){for(let k=0;k<4;k++)burst(out,t+k*(.05+random()*.07),{f:2200+random()*2500,len:.04+random()*.08,level:level*(.5+random()*.5)});return .8;},
    'welding-crackle'(out,t,level){for(let k=0;k<14;k++)burst(out,t+random()*1.1,{f:3000+random()*3500,len:.012+random()*.03,level:level*(.3+random()*.7)});return 1.3;},
    'server-blip'(out,t,level){for(let k=0;k<2;k++){const o=osc('sine',k?1480:1180),g=ctx.createGain();env(g.gain,t+k*.13,level*.18,.004,.05,.06);o.connect(g);g.connect(out);o.start(t+k*.13);o.stop(t+k*.13+.16);}return .4;}
  };
  function playEvent(slot,level){
    if(!ctx||ctx.state!=='running')return;
    const t=ctx.currentTime+.02,file=files.get(slot);
    if(file){const s=ctx.createBufferSource();s.buffer=file;s.playbackRate.value=.94+random()*.12;const g=ctx.createGain();g.gain.value=level*.5;const p=pan(random()*1.4-.7);s.connect(g);(p?(g.connect(p),p.connect(master)):g.connect(master));s.start(t);voices.add(s);s.onended=()=>voices.delete(s);return;}
    const g=ctx.createGain();g.gain.value=1;g.connect(master);const len=EVENT_SYNTH[slot]?.(g,t,level);
    if(len)setTimeout?.(()=>{try{g.disconnect();}catch{}},(len+.5)*1000);
  }

  function update(dt,{active=true,area=null,indoor=false,breach=1}={}){
    if(disposed||!ctx||ctx.state!=='running')return;
    if(!started){started=true;startBeds();void loadSlots();}
    const t=ctx.currentTime;
    master.gain.setTargetAtTime(active?.8:0,t,active?.5:.25);
    const levels=bedLevels(chapter,area,indoor);
    if(chapter===4)levels.reactor*=clamp(breach,0,1); // the violet column goes quiet when it is put out
    for(const key of Object.keys(beds)){
      const bed=beds[key],target=(active?levels[key]||0:0)*BED_LEVEL[key]*(files.has(bed.slot)?1.6:1);
      if(target>.0008)ensureBed(bed);
      if(bed.node)bed.node.out.gain.setTargetAtTime(target,t,.9);
      bed.level=target;
      if(!bed.node)continue;
      if(target<=.0008&&(bed.idle=(bed.idle||0)+dt)>4){releaseBed(bed);bed.idle=0;}else if(target>.0008)bed.idle=0;
    }
    if(!active)return;
    elapsed+=dt;
    const where={id:area,outdoor:!indoor&&(!ROOMS[chapter]?.[area]||area==='gare'||area==='quai'||area==='cour')};
    events.forEach((e,i)=>{nextAt[i]-=dt;if(nextAt[i]>0)return;nextAt[i]=between(e.gap);if(e.where(where))playEvent(e.slot,e.level);});
  }
  return {update,stats:()=>({beds:Object.values(beds).filter(b=>b.node).map(b=>b.key),files:[...files.keys()],voices:voices.size}),
    dispose(){disposed=true;for(const b of Object.values(beds))releaseBed(b);for(const v of voices){try{v.stop();}catch{}}try{master?.disconnect();}catch{}}};
}
