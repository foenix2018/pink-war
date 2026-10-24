// Original distant cannon and debris sounds; no borrowed franchise recording.
export function createBattleAudio(ctx){
 const buffer=ctx.createBuffer(1,ctx.sampleRate*1.2,ctx.sampleRate),data=buffer.getChannelData(0);let brown=0;
 for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.03)/1.025;data[i]=brown;}
 const voices=new Set();
 return{event(event,player,yaw=0){if(ctx.state!=='running'||voices.size>=3||event.type!=='distant-blast')return;
  const distance=Math.hypot(event.x-player.x,event.z-player.z),at=ctx.currentTime+Math.min(.3,distance/343),gain=ctx.createGain(),filter=ctx.createBiquadFilter(),source=ctx.createBufferSource(),pan=ctx.createStereoPanner?.();
  filter.type='lowpass';filter.frequency.value=390;source.buffer=buffer;source.connect(filter);filter.connect(gain);gain.connect(pan||ctx.destination);pan?.connect(ctx.destination);if(pan)pan.pan.value=Math.sin(Math.atan2(event.x-player.x,-(event.z-player.z))-yaw)*.7;
  gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(Math.min(.14,6/Math.max(40,distance)),at+.035);gain.gain.exponentialRampToValueAtTime(.0001,at+1.1);
  const voice={source,nodes:[source,filter,gain,...(pan?[pan]:[])]};voices.add(voice);source.onended=()=>{voices.delete(voice);for(const n of voice.nodes)n.disconnect();};source.start(at);source.stop(at+1.15);
 },pause(){for(const v of voices){try{v.source.stop();}catch{}}},get voices(){return voices.size;}};
}
