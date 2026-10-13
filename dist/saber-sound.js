// Original Pink War synthesis: no recording from a film or franchise.
export function createSaberSound(ctx){
  if(!ctx)return {update(){},impact(){},ignite(){},dispose(){}};
  const bus=ctx.createGain();bus.gain.value=1;bus.connect(ctx.destination);
  const voices=new Set();let hum=null,equipped=false,ignited=false,enabled=true,lastWhoosh=-99,previousSpeed=0;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function remember(source,nodes){let done=false;const entry={source,clean:()=>{if(done)return;done=true;voices.delete(entry);for(const node of nodes)node.disconnect();}};voices.add(entry);source.onended=entry.clean;}
  function stopVoices(){for(const entry of [...voices]){try{entry.source.stop();}catch{}entry.clean();}}
  function tone(start,end,seconds,volume,type='sawtooth'){
    const now=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();
    osc.type=type;osc.frequency.setValueAtTime(start,now);osc.frequency.exponentialRampToValueAtTime(end,now+seconds);
    filter.type='lowpass';filter.frequency.value=1800;
    gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(volume,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+seconds);
    osc.connect(filter);filter.connect(gain);gain.connect(bus);osc.start(now);osc.stop(now+seconds+.01);remember(osc,[osc,filter,gain]);
  }
  const noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.3),ctx.sampleRate),data=noise.getChannelData(0);let seed=7717;
  for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/2147483648-1)*(1-i/data.length);}
  function air(speed=1,seconds=.18){
    const now=ctx.currentTime,source=ctx.createBufferSource(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();source.buffer=noise;
    filter.type='bandpass';filter.Q.value=1.8;filter.frequency.setValueAtTime(900+speed*190,now);filter.frequency.exponentialRampToValueAtTime(190,now+seconds);
    gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(.028+speed*.007,now+.016);gain.gain.exponentialRampToValueAtTime(.0001,now+seconds);
    source.connect(filter);filter.connect(gain);gain.connect(bus);source.start(now);source.stop(now+seconds+.01);remember(source,[source,filter,gain]);
  }
  function ignite(){if(!enabled||ctx.state!=='running')return;air(3,.27);tone(620,82,.32,.08);tone(1700,240,.17,.025,'triangle');}
  function stopHum(){if(!hum)return;for(const source of hum.sources)try{source.stop();}catch{}for(const node of hum.nodes)node.disconnect();hum=null;}
  function startHum(){
    if(hum||ctx.state!=='running')return;
    const gain=ctx.createGain(),filter=ctx.createBiquadFilter(),a=ctx.createOscillator(),b=ctx.createOscillator();
    gain.gain.value=.019;filter.type='lowpass';filter.frequency.value=510;a.type='sawtooth';a.frequency.value=81;b.type='triangle';b.frequency.value=163;
    a.connect(filter);b.connect(filter);filter.connect(gain);gain.connect(bus);a.start();b.start();hum={sources:[a,b],nodes:[a,b,filter,gain],a,b,gain,filter};
  }
  function update({active=false,equipped:drawn=active,sound=true,speed=0,swing=false}={}){
    enabled=!!sound;bus.gain.value=active&&enabled?1:0;
    if(drawn&&!equipped)ignited=false;
    if(!drawn&&equipped&&enabled&&active&&ctx.state==='running')tone(82,520,.20,.035);
    equipped=!!drawn;const next=!!active&&equipped&&enabled&&ctx.state==='running';
    if(!active||!enabled)stopVoices();
    if(!next){stopHum();previousSpeed=0;return;}
    if(!ignited){ignite();ignited=true;}
    startHum();const movement=clamp(speed,0,9),now=ctx.currentTime;
    if(hum){hum.a.frequency.value=81+movement*3.4;hum.b.frequency.value=163+movement*5.5;hum.filter.frequency.value=510+movement*100;hum.gain.gain.value=.019+movement*.002;}
    if((swing||movement>1.1&&previousSpeed<=1.1)&&now-lastWhoosh>.20){lastWhoosh=now;air(movement||3,.17);tone(200+movement*55,75,.14,.03,'triangle');}
    previousSpeed=movement;
  }
  function impact(){if(enabled&&ctx.state==='running'){air(4,.11);tone(780,150,.10,.055,'square');}}
  function dispose(){stopHum();stopVoices();bus.disconnect();}
  return {update,impact,ignite,dispose,get humming(){return !!hum;}};
}
