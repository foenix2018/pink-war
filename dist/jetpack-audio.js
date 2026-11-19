// Mini-jetpack sound. Plays the user's licensed gas-burst file when it is supplied (assets/sfx/jetpack-epidemic.mp3); no
// third-party audio is redistributed with the game. Without it the exhaust is synthesised locally: a filtered noise roar over
// a low rumble, brighter as the thrusters spool up, with a stuttering sputter when the last fifth of the fuel is burning,
// so the player hears the two seconds running out.
const LOW_FUEL=.2;
export function createJetpackAudio(getContext){
  let clip=null,loading=false,active=false,node=null,noisy=null;
  async function load(){
    if(loading)return;loading=true;
    try{
      const response=await fetch('./assets/sfx/jetpack-epidemic.mp3',{cache:'force-cache'});
      if(!response.ok)return;
      const ctx=getContext();if(ctx)clip=await ctx.decodeAudioData(await response.arrayBuffer());
    }catch{/* No licensed file provided yet; synthesize exhaust in the meantime. */}
  }
  function noise(ctx){
    if(noisy&&noisy.sampleRate===ctx.sampleRate)return noisy;
    const n=Math.floor(ctx.sampleRate*.5),b=ctx.createBuffer(1,n,ctx.sampleRate),samples=b.getChannelData(0);
    let seed=0x1da50421,low=0;for(let i=0;i<n;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const w=(seed/2147483648);low+=(w-low)*.18;samples[i]=(w*.5+low*.9)*.65;}
    // Make the loop seamless: cross-fade the last 2 % into the start.
    const f=Math.floor(n*.02);for(let i=0;i<f;i++){const t=i/f;samples[n-f+i]=samples[n-f+i]*(1-t)+samples[i]*t;}
    noisy=b;return b;
  }
  function stop(){
    if(!node)return;
    const {source,gain,rumble,ctx}=node,t=ctx.currentTime||0;
    try{gain.gain.cancelScheduledValues(t);gain.gain.setTargetAtTime(0,t,.05);source.stop(t+.25);rumble?.stop(t+.25);}catch{}
    node=null;
  }
  function start(ctx){
    const source=ctx.createBufferSource();source.buffer=clip||noise(ctx);source.loop=true;
    const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=clip?4800:900;filter.Q.value=.7;
    const gain=ctx.createGain();gain.gain.setValueAtTime(0,ctx.currentTime);
    source.connect(filter).connect(gain).connect(ctx.destination);source.start();
    let rumble=null;
    if(!clip){ // a low engine body under the roar
      rumble=ctx.createOscillator();rumble.type='sawtooth';rumble.frequency.value=58;
      const low=ctx.createBiquadFilter();low.type='lowpass';low.frequency.value=140;
      const level=ctx.createGain();level.gain.value=.5;rumble.connect(low).connect(level).connect(gain);rumble.start();
    }
    node={source,gain,filter,rumble,ctx,startedAt:ctx.currentTime};
  }
  // wanted: thrusters firing; fuel: 1 → 0, from the game (defaults to full).
  function update(wanted,fuel=1){
    const ctx=getContext();if(!wanted||!ctx||ctx.state!=='running'){active=false;stop();return;}
    if(!active||!node){active=true;load();start(ctx);}
    const t=ctx.currentTime,age=t-node.startedAt;
    const spool=Math.min(1,age/.18);                                   // brightens over the first 0.18 s
    const low=fuel<LOW_FUEL,flutter=low?(Math.sin(t*2*Math.PI*(14+(1-fuel/LOW_FUEL)*10))>-.15?1:.18):1;  // sputter: faster and deeper as the fuel dies
    const base=clip?.22:.07;
    node.filter.frequency.setTargetAtTime((clip?4800:900+1500*spool)*(low?.7:1),t,.05);
    node.gain.gain.setTargetAtTime(base*flutter*(.55+.45*spool),t,.02);
    if(node.rumble)node.rumble.frequency.setTargetAtTime(58+spool*14-(low?10:0),t,.08);
  }
  return {update,stop,dispose:stop};
}
