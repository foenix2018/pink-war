// Plays the user's licensed three-second Epidemic Sound gas-burst file when supplied.
// No third-party audio is redistributed. Without the file, local filtered noise is used.
export function createJetpackAudio(getContext){
  let clip=null,loading=false,active=false,source=null,gain=null,noisy=null;
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
    const n=Math.floor(ctx.sampleRate*.35),b=ctx.createBuffer(1,n,ctx.sampleRate),samples=b.getChannelData(0);
    let seed=0x1da50421;for(let i=0;i<n;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;samples[i]=(seed/2147483648)*.65;}
    noisy=b;return b;
  }
  function stop(){
    if(!source)return;
    const ctx=source.context||getContext(),t=ctx?.currentTime||0;
    try{gain?.gain.setTargetAtTime(0,t,.045);source.stop(t+.22);}catch{}
    source=null;gain=null;
  }
  function update(wanted){
    const ctx=getContext();if(!wanted||!ctx||ctx.state!=='running'){active=false;stop();return;}
    if(active&&source)return;active=true;load();
    const s=ctx.createBufferSource();s.context=ctx;s.buffer=clip||noise(ctx);s.loop=true;
    const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=clip?4800:1650;
    const volume=ctx.createGain();volume.gain.setValueAtTime(0,ctx.currentTime);
    volume.gain.setTargetAtTime(clip?.22:.065,ctx.currentTime,.04);
    s.connect(filter).connect(volume).connect(ctx.destination);s.start();source=s;gain=volume;
  }
  return {update,stop,dispose:stop};
}
