// Pink War AURORA. All sounds are original, procedurally generated.
// Extinction is the exact time-reversed PCM of the ignition sound.
export function createSaberSound(ctx){
  if(!ctx)return {update(){},impact(){},ignite(){},dispose(){},get humming(){return false;}};
  const bus=ctx.createGain();bus.gain.value=1;bus.connect(ctx.destination);
  const voices=new Set();let hum=null,drawn=false,ignited=false,enabled=true,lastSwing=-99,lastMovement=0;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function track(src,nodes){
    let done=false;const entry={source:src,clean:()=>{if(done)return;done=true;voices.delete(entry);nodes.forEach(n=>n.disconnect());}};
    voices.add(entry);src.onended=entry.clean;
  }
  function stopVoices(){for(const entry of [...voices]){try{entry.source.stop();}catch{}entry.clean();}}
  // Identical samples in opposite direction: the 'off' sound is not another preset.
  const length=.34,count=Math.ceil(ctx.sampleRate*length);
  const ignition=ctx.createBuffer(1,count,ctx.sampleRate),shutdown=ctx.createBuffer(1,count,ctx.sampleRate);
  const pcm=ignition.getChannelData(0),inverse=shutdown.getChannelData(0);
  let noiseSeed=84125;
  for(let i=0;i<count;i++){
    const t=i/ctx.sampleRate,u=i/count;
    noiseSeed=(Math.imul(noiseSeed,1664525)+1013904223)>>>0;
    const grain=noiseSeed/2147483648-1;
    const frequency=90+760*(1-Math.pow(1-u,2.2));
    const phase=2*Math.PI*(90*t+760*(t-t*t/length+t*t*t/(3*length*length)));
    const env=Math.sin(Math.PI*u)**.72;
    pcm[i]=env*(Math.sin(phase)*.47+Math.sin(phase*2.005)*.2+Math.sin(phase*.5)*.21+grain*.08)*(1+.1*Math.sin(t*160));
  }
  for(let i=0;i<count;i++)inverse[i]=pcm[count-1-i];
  const voltage={on:ignition,off:shutdown};
  function power(on){
    if(!enabled||ctx.state!=='running')return;
    const src=ctx.createBufferSource(),gain=ctx.createGain();src.buffer=voltage[on?'on':'off'];
    gain.gain.value=.13;src.connect(gain).connect(bus);
    src.start();track(src,[src,gain]);
  }
  function tone(from,to,duration,volume,type='sawtooth'){
    if(ctx.state!=='running')return;
    const osc=ctx.createOscillator(),g=ctx.createGain(),filter=ctx.createBiquadFilter(),now=ctx.currentTime;
    osc.type=type;osc.frequency.setValueAtTime(from,now);osc.frequency.exponentialRampToValueAtTime(Math.max(38,to),now+duration);
    filter.type='lowpass';filter.frequency.value=1800;
    g.gain.setValueAtTime(.0001,now);g.gain.linearRampToValueAtTime(volume,now+.007);g.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(filter).connect(g).connect(bus);osc.start();osc.stop(now+duration+.01);track(osc,[osc,filter,g]);
  }
  function stopHum(){
    if(!hum)return;
    for(const src of hum.sources)try{src.stop();}catch{}
    for(const n of hum.nodes)n.disconnect();
    hum=null;
  }
  function startHum(){
    if(hum||ctx.state!=='running')return;
    const a=ctx.createOscillator(),b=ctx.createOscillator(),low=ctx.createBiquadFilter(),gain=ctx.createGain();
    a.type='sawtooth';b.type='triangle';a.frequency.value=81;b.frequency.value=163;
    low.type='lowpass';low.frequency.value=500;gain.gain.value=.018;
    a.connect(low);b.connect(low);low.connect(gain).connect(bus);a.start();b.start();
    hum={sources:[a,b],nodes:[a,b,low,gain],a,b,low,gain};
  }
  function swingSound(speed){
    if(ctx.currentTime-lastSwing<.16||!enabled)return;
    lastSwing=ctx.currentTime;
    // Electrical pitch-bend from the continuously humming coils, not a wind swoosh.
    tone(255+Math.min(9,speed)*34,78,.22,.055,'sawtooth');
    tone(1080,220,.11,.018,'triangle');
  }
  function update({active=false,equipped=false,extended=false,sound=true,speed=0,swing=false}={}){
    enabled=!!sound;
    const audible=!!active&&enabled&&ctx.state==='running';
    bus.gain.value=audible?1:0;
    if(!audible){stopHum();stopVoices();ignited=false;drawn=!!equipped;lastMovement=0;return;}
    const next=!!equipped&&!!extended;
    if(next!==ignited){power(next);ignited=next;}
    drawn=!!equipped;
    if(!next){stopHum();lastMovement=0;return;}
    startHum();
    const movement=clamp(speed,0,12);
    if(hum){
      const phase=ctx.currentTime*15;
      hum.a.frequency.setTargetAtTime(81+movement*5+Math.sin(phase)*movement*.6,ctx.currentTime,.023);
      hum.b.frequency.setTargetAtTime(163+movement*9+Math.sin(phase*1.34)*movement*1.2,ctx.currentTime,.023);
      hum.low.frequency.setTargetAtTime(510+movement*85,ctx.currentTime,.029);
      hum.gain.gain.setTargetAtTime(.017+movement*.0016,ctx.currentTime,.027);
    }
    if(swing||movement>1.2&&lastMovement<=1.2)swingSound(Math.max(3,movement));
    lastMovement=movement;
  }
  function impact(){if(enabled&&ignited&&ctx.state==='running'){tone(1230,170,.14,.074,'square');tone(2520,470,.075,.025,'triangle');tone(155,68,.18,.043,'sawtooth');}}
  function dispose(){stopHum();stopVoices();bus.disconnect();}
  return {update,impact,ignite:()=>power(true),dispose,get humming(){return !!hum;},get bladeActive(){return ignited;},
    get ignitionPCM(){return pcm;},get shutdownPCM(){return inverse;}};
}
