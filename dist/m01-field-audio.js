// Original, short field cues. No sample download and no background music voice.
const buffers=new WeakMap();
export function playFieldCue(context,kind,{source={},listener={},yaw=0}={}){
 if(!context||context.state!=='running'||!['isolate','breach'].includes(kind))return false;
 const dx=(source.x||0)-(listener.x||0),dz=(source.z||0)-(listener.z||0),distance=Math.hypot(dx,dz),now=context.currentTime;
 const bus=context.createGain();bus.gain.value=(kind==='breach'?.075:.11)/(1+distance*.07);
 let panner=null,voices=0;
 if(context.createStereoPanner){panner=context.createStereoPanner();panner.pan.value=Math.max(-.85,Math.min(.85,(dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(1,distance)));bus.connect(panner);panner.connect(context.destination);}else bus.connect(context.destination);
 const ended=(node,gain)=>()=>{node.disconnect();gain.disconnect();if(--voices===0){bus.disconnect();panner?.disconnect();}};
 function tone(delay,start,end,duration,type='triangle'){
  const node=context.createOscillator(),gain=context.createGain(),time=now+delay;voices++;node.type=type;node.frequency.setValueAtTime(start,time);node.frequency.exponentialRampToValueAtTime(end,time+duration);gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(.55,time+.012);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);node.connect(gain);gain.connect(bus);node.onended=ended(node,gain);node.start(time);node.stop(time+duration+.015);
 }
 if(kind==='isolate'){tone(0,140,45,.12,'square');tone(.055,64,38,.17);}
 else{tone(0,430,335,.23);tone(.36,430,335,.23);tone(.72,335,245,.28);}
 if(!buffers.has(context)){const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*.28),context.sampleRate),data=buffer.getChannelData(0);let seed=2196;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/4294967296*2-1)*Math.exp(-i/data.length*7);}buffers.set(context,buffer);}
 const noise=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();voices++;noise.buffer=buffers.get(context);filter.type='lowpass';filter.frequency.value=kind==='breach'?470:1300;gain.gain.value=kind==='breach'?.32:.75;noise.connect(filter);filter.connect(gain);gain.connect(bus);noise.onended=()=>{filter.disconnect();ended(noise,gain)();};noise.start(now);noise.stop(now+.29);return true;
}
