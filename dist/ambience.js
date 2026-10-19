// Ruins reclaimed by vegetation: quiet wind, working power systems, distant metal fatigue.
// All sounds are synthesized locally. A caller supplies a gesture-unlocked AudioContext;
// this module never constructs/resumes one, and never touches the independent music track.
const buffers=new WeakMap();
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
function noiseBuffer(ctx){
  if(buffers.has(ctx))return buffers.get(ctx);
  const length=Math.ceil(ctx.sampleRate*4),buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);
  let seed=47913,brown=0;
  for(let i=0;i<length;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const white=seed/2147483648-1;brown=(brown+white*.025)/1.025;
    data[i]=brown*2.7+white*.11;
  }
  // Equal endpoints avoid a hard click where the persistent wind loop wraps.
  const seam=Math.min(2048,Math.floor(length/8));
  for(let i=0;i<seam;i++){const blend=(i+1)/seam;data[length-seam+i]=data[length-seam+i]*(1-blend)+data[0]*blend;}
  buffers.set(ctx,buffer);return buffer;
}
function target(param,value,time,smooth=.14){
  if(param.setTargetAtTime)param.setTargetAtTime(value,time,smooth);
  else {param.cancelScheduledValues(time);param.setValueAtTime(value,time);}
}
function envelope(param,time,level,duration){
  param.setValueAtTime(.0001,time);param.linearRampToValueAtTime(level,time+.009);
  param.exponentialRampToValueAtTime(.0001,time+duration);
}

export function createAmbience(ctx,{installations=[],footsteps=null}={}){
  let enabled=true,active=false,disposed=false,graph=null,audible=false,elapsed=0,nextCreak=13;
  let lastPosition=null,stride=0,foot=0,steps=0,creaks=0,lastParameterUpdate=-1,gustStrength=0;
  const voices=new Set(),persistent=[];
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  let seed=14281;
  const ready=()=>!disposed&&enabled&&active&&ctx?.state==='running';
  function connectPan(source,pan){
    if(!ctx.createStereoPanner){source.connect(graph.master);return null;}
    const panner=ctx.createStereoPanner();panner.pan.value=clamp(pan,-.7,.7);
    source.connect(panner);panner.connect(graph.master);return panner;
  }
  function remember(source,nodes){
    const entry={source,nodes};voices.add(entry);
    source.onended=()=>{voices.delete(entry);for(const node of nodes)node.disconnect();};
    return entry;
  }
  function startGraph(){
    if(graph||!ready())return;
    const master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
    const noise=ctx.createBufferSource(),wind=ctx.createBiquadFilter(),windGain=ctx.createGain();
    noise.buffer=noiseBuffer(ctx);noise.loop=true;wind.type='lowpass';wind.frequency.value=620;wind.Q.value=.35;
    windGain.gain.value=.035;noise.connect(wind);wind.connect(windGain);
    const windPan=ctx.createStereoPanner?.(),machinePan=ctx.createStereoPanner?.();
    windGain.connect(windPan||master);windPan?.connect(master);
    const howl=ctx.createBiquadFilter(),howlGain=ctx.createGain();
    howl.type='bandpass';howl.frequency.value=340;howl.Q.value=2.2;howlGain.gain.value=.006;
    noise.connect(howl);howl.connect(howlGain);howlGain.connect(windPan||master);
    const high=ctx.createBiquadFilter(),leaves=ctx.createGain();
    high.type='bandpass';high.frequency.value=2400;high.Q.value=.6;leaves.gain.value=.017;
    noise.connect(high);high.connect(leaves);leaves.connect(master);
    const drone=ctx.createOscillator(),droneGain=ctx.createGain();
    drone.type='sine';drone.frequency.value=57;droneGain.gain.value=.002;
    drone.connect(droneGain);droneGain.connect(machinePan||master);machinePan?.connect(master);
    const lift=ctx.createOscillator(),liftGain=ctx.createGain();
    lift.type='sine';lift.frequency.value=93;liftGain.gain.value=0;
    lift.connect(liftGain);liftGain.connect(master);
    graph={master,wind,windGain,windPan,machinePan,howl,howlGain,leaves,drone,droneGain,lift,liftGain,
      nodes:[master,noise,wind,windGain,high,leaves,howl,howlGain,drone,droneGain,lift,liftGain,...[windPan,machinePan].filter(Boolean)]};
    persistent.push(noise,drone,lift);noise.start();drone.start();lift.start();
    target(master.gain,.85,ctx.currentTime,.45);audible=true;
  }
  function mute(){
    if(graph&&audible)target(graph.master.gain,0,ctx.currentTime,.025);
    audible=false;
    lastPosition=null;stride=0;
  }
  function footstep(metal,speed,crouched,surface){
    if(!ready()||voices.size>7)return;
    if(footsteps?.play(surface|| (metal?'metal':'concrete'),{destination:graph.master,speed,crouched,foot})){foot++;steps++;return;}
    const t=ctx.currentTime,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    source.buffer=noiseBuffer(ctx);filter.type='lowpass';filter.frequency.value=metal?2800:950;filter.Q.value=.65;
    const duration=metal?.16:.115,volume=(crouched?.018:.027)*clamp(speed/5,.65,1.35);
    envelope(gain.gain,t,volume,duration);source.connect(filter);filter.connect(gain);
    const pan=connectPan(gain,(foot++%2?1:-1)*.19);
    remember(source,[source,filter,gain,...(pan?[pan]:[])]);
    source.start(t,.3+random()*2);source.stop(t+duration+.01);
    // A quiet boot sole body, with a longer metallic ring on catwalks.
    const osc=ctx.createOscillator(),body=ctx.createGain();osc.type='sine';
    osc.frequency.setValueAtTime(metal?245:128,t);osc.frequency.exponentialRampToValueAtTime(metal?176:66,t+duration);
    envelope(body.gain,t,volume*.55,duration*(metal?1.35:.8));osc.connect(body);body.connect(graph.master);
    remember(osc,[osc,body]);osc.start(t);osc.stop(t+duration*1.4);steps++;
  }
  function creak(){
    if(!ready()||voices.size>5)return;
    const t=ctx.currentTime,duration=1.1+random()*.9,osc=ctx.createOscillator(),gain=ctx.createGain();
    const hz=180+random()*130;osc.type='triangle';osc.frequency.setValueAtTime(hz,t);
    osc.frequency.exponentialRampToValueAtTime(hz*.72,t+duration);
    gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(.004,t+.28);
    gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(gain);const pan=connectPan(gain,(random()*2-1)*.6);
    remember(osc,[osc,gain,...(pan?[pan]:[])]);osc.start(t);osc.stop(t+duration+.01);creaks++;
  }
  function update(dt,{active:nextActive=false,position=null,moving=false,elevation=0,onLift=false,grounded=true,crouched=false,yaw=0,shelter=0,probes=[],surface=null}={}){
    if(disposed)return;
    const wasReady=ready();active=!!nextActive;
    if(!ready()){if(wasReady||graph)mute();return;}
    startGraph();if(!audible){target(graph.master.gain,.85,ctx.currentTime,.35);audible=true;}
    dt=clamp(finite(dt),0,.1);elapsed+=dt;
    // Control-rate updates (10 Hz) avoid creating automation events every XR frame.
    if(elapsed-lastParameterUpdate>=.1){
      lastParameterUpdate=elapsed;
      const gust=clamp(.46+.28*Math.sin(elapsed*.19)+.19*Math.sin(elapsed*.53+1.1)+.12*Math.sin(elapsed*1.07),0,1);
      gustStrength=gust;const exposure=1-clamp(finite(shelter),0,1)*.74;
      const height=clamp(finite(elevation)/14,0,1),t=ctx.currentTime;
      target(graph.windGain.gain,(.021+gust*.037+height*.015)*exposure,t,.7);
      if(graph.windPan)target(graph.windPan.pan,Math.sin(-.65-finite(yaw))*.45,t,.35);
      target(graph.howlGain.gain,(.002+gust*gust*.013+height*.003)*exposure,t,.8);
      target(graph.howl.frequency,270+gust*190,t,1.1);
      target(graph.wind.frequency,430+gust*540,t,.6);
      target(graph.leaves.gain,(1-height*.8)*(.011+gust*.013)*exposure,t,.5);
      let machinery=.12,sourceBearing=0;
      if(position)for(const source of installations){
        const distance=Math.hypot(finite(position.x)-source.x,finite(position.z)-source.z);
        const proximity=clamp(1-distance/35,0,1);
        if(proximity>machinery){machinery=proximity;sourceBearing=Math.atan2(source.x-finite(position.x),-(source.z-finite(position.z)));}
      }
      let nearbyProbe=0;
      if(position)for(const probe of probes){
        if(probe.form!=='probe')continue;
        const distance=Math.hypot(probe.x-finite(position.x),probe.z-finite(position.z),(probe.elevation||0)+.55-finite(elevation)-1.25);
        const proximity=clamp(1-distance/26,0,1);
        if(proximity>nearbyProbe){nearbyProbe=proximity;sourceBearing=Math.atan2(probe.x-finite(position.x),-(probe.z-finite(position.z)));}
      }
      target(graph.droneGain.gain,.001+machinery*.007+nearbyProbe*.018,t,.3);
      if(graph.machinePan)target(graph.machinePan.pan,Math.sin(sourceBearing-finite(yaw))*.65,t,.25);
      target(graph.drone.frequency,57+nearbyProbe*125+Math.sin(elapsed*.4)*.3,t,.4);
      target(graph.liftGain.gain,onLift?.022:0,t,.12);
      target(graph.lift.frequency,onLift?104+Math.sin(elapsed*1.3)*3:78,t,.16);
    }
    if(position){
      const x=finite(position.x),z=finite(position.z);
      if(lastPosition&&moving&&grounded&&!onLift&&dt>0){
        const distance=Math.hypot(x-lastPosition.x,z-lastPosition.z);
        // Ignore teleports and keep the first footfall from sounding while pushing a wall.
        if(distance<Math.max(1.5,dt*16)){
          stride+=distance;
          const stepDistance=crouched?.95:1.55;
          if(stride>=stepDistance){stride%=stepDistance;footstep(surface?surface==='metal':elevation>1.2,distance/dt,crouched,surface);}
        }else stride=0;
      }else stride=0;
      lastPosition={x,z};
    }else {lastPosition=null;stride=0;}
    if(elapsed>=nextCreak){creak();nextCreak=elapsed+15+random()*14;}
  }
  return {
    update,
    setEnabled(value){enabled=!!value;if(!enabled)mute();else if(ready()&&graph&&!audible){target(graph.master.gain,.85,ctx.currentTime,.35);audible=true;}},
    pause(){active=false;mute();},
    dispose(){
      if(disposed)return;disposed=true;active=false;
      for(const source of persistent)try{source.stop();}catch{}
      for(const entry of voices){try{entry.source.stop();}catch{}for(const node of entry.nodes)node.disconnect();}
      voices.clear();if(graph)for(const node of graph.nodes)node.disconnect();graph=null;
    },
    get enabled(){return enabled;},
    get playing(){return ready()&&!!graph;},
    get stats(){return {steps,creaks,voices:voices.size,persistentSources:graph?persistent.length:0,gustStrength};}
  };
}
