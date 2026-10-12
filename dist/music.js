// Pink War — original, locally synthesized underscore. No downloads, media elements,
// timers or extra AudioContexts: the game supplies its gesture-unlocked context.
export const MUSIC_CREDIT=Object.freeze({
  title:'Les villes silencieuses',author:'Pink War',license:'Composition originale',source:'local'
});
export const MUSIC_SECTIONS=Object.freeze({
  exploration:Object.freeze({pad:.033,pulse:0,bell:.018,cutoff:950,pulseEvery:0}),
  tension:Object.freeze({pad:.03,pulse:.032,bell:.013,cutoff:1150,pulseEvery:2}),
  combat:Object.freeze({pad:.025,pulse:.048,bell:0,cutoff:1350,pulseEvery:1}),
  interlude:Object.freeze({pad:.034,pulse:0,bell:.024,cutoff:850,pulseEvery:0})
});
const BEAT=60/66,BAR=8,LOOK_AHEAD=.16;
// A restrained D-minor/add9 progression, with an open fourth at the end of the phrase.
const CHORDS=[[50,57,64],[46,53,60],[48,55,62],[43,50,57]];
const hz=note=>440*2**((note-69)/12);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number(x)||0));
export function musicSectionFor({threat=0,intermission=false}={}){
  if(intermission)return 'interlude';
  return threat>=.55?'combat':threat>=.15?'tension':'exploration';
}
export function createMusicBed(initialContext=null){
  let ctx=null,master=null,enabled=true,active=false,disposed=false,audible=false;
  let section='exploration',requested='exploration',nextBeat=0,beat=0,phrases=0,scheduled=0;
  const voices=new Set();
  function stopVoices(){
    for(const voice of [...voices]){
      try{voice.source.stop();}catch{}
      for(const node of voice.nodes)node.disconnect();
    }
    voices.clear();
  }
  function mute(){
    if(master&&audible){
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0,ctx.currentTime,.055);
    }
    audible=false;nextBeat=0;beat=0;
  }
  function ready(){return !disposed&&enabled&&active&&ctx?.state==='running';}
  function attach(context){
    if(disposed||!context?.createOscillator)return false;
    if(ctx===context)return true;
    stopVoices();master?.disconnect();master=null;ctx=context;audible=false;nextBeat=0;beat=0;
    return true;
  }
  function graph(){
    if(!master){master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);}
    if(!audible){master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setTargetAtTime(.62,ctx.currentTime,.8);audible=true;}
  }
  function voice(note,time,length,level,type='sine',pan=0,attack=.3,cutoff=950){
    if(voices.size>=30)return;
    const source=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();
    source.type=type;source.frequency.value=hz(note);filter.type='lowpass';filter.frequency.value=cutoff;filter.Q.value=.45;
    gain.gain.setValueAtTime(.00001,time);gain.gain.linearRampToValueAtTime(level,time+attack);
    gain.gain.setValueAtTime(level*.78,time+Math.max(attack,length*.48));
    gain.gain.exponentialRampToValueAtTime(.00001,time+length);
    source.connect(filter);filter.connect(gain);
    const nodes=[source,filter,gain],panner=ctx.createStereoPanner?.();
    if(panner){panner.pan.value=pan;gain.connect(panner);panner.connect(master);nodes.push(panner);}else gain.connect(master);
    const entry={source,nodes};voices.add(entry);scheduled++;
    source.onended=()=>{voices.delete(entry);for(const node of nodes)node.disconnect();};
    source.start(time);source.stop(time+length+.02);
  }
  function schedule(time){
    const within=beat%BAR;
    if(within===0){section=requested;phrases++;}
    const profile=MUSIC_SECTIONS[section],chord=CHORDS[Math.floor(beat/BAR)%CHORDS.length];
    if(within===0){
      for(let i=0;i<chord.length;i++)voice(chord[i],time+i*.05,BEAT*7.8,profile.pad*(i===0?1:.63),'triangle',(i-1)*.3,1.25,profile.cutoff);
      voice(chord[0]-12,time,BEAT*7.5,profile.pad*.45,'sine',0,1.6,300);
    }
    if(profile.pulseEvery&&within%profile.pulseEvery===0){
      voice(chord[0]-12,time,.30,profile.pulse,'sine',0,.025,260);
      if(section==='combat'&&within%2===1)voice(chord[1],time+BEAT*.5,.17,profile.pulse*.13,'triangle',.2,.01,1100);
    }
    // Space between notes leaves wind, footsteps and the weapon transient intelligible.
    if(profile.bell&&(within===2||within===6))voice(chord[within===2?2:1]+12,time,BEAT*2.3,profile.bell,'sine',within===2?-.3:.3,.035,2400);
    beat++;
  }
  function pump(){
    if(!ready()){mute();return;}
    graph();
    const now=ctx.currentTime;
    // A background tab/resume starts a new phrase; never schedule a backlog of notes.
    if(!nextBeat||nextBeat<now-.2){nextBeat=now+.025;beat=Math.ceil(beat/BAR)*BAR;}
    let budget=3;
    while(nextBeat<now+LOOK_AHEAD&&budget-->0){schedule(nextBeat);nextBeat+=BEAT;}
  }
  if(initialContext)attach(initialContext);
  return {
    setContext:attach,
    start(context){if(context)attach(context);active=true;pump();return ready();},
    update(_dt,options={}){
      if(disposed)return;
      if('active' in options)active=!!options.active;
      requested=musicSectionFor(options);pump();
    },
    pause(){active=false;mute();stopVoices();},
    setEnabled(value){enabled=!!value;if(!enabled){mute();stopVoices();}},
    dispose(){if(disposed)return;active=false;mute();stopVoices();master?.disconnect();master=null;ctx=null;disposed=true;},
    get enabled(){return enabled;},get failed(){return false;},get playing(){return ready()&&audible;},
    get source(){return 'local:les-villes-silencieuses';},
    get section(){return section;},
    get stats(){return {section,requested,voices:voices.size,phrases,scheduled,bpm:66};}
  };
}
