// Pink Wars S-03 rotor audio: the actual RLH Rescue 01 V761 sound synthesis,
// adapted from foenix2018/RLH/js/modules/gameplay/drone-fpv-v761.js lines 182-193.
// RLH's four sawtooth oscillators (155 Hz + 3 Hz per motor), 1250 Hz LPF,
// .012 motor gains, throttle-dependent pitch and .12 s smoothing are preserved.
// One nearest-drone voice bank limits CPU cost for Dell tablet / Quest 3.
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const smooth=(param,value,time,tau)=>param.setTargetAtTime(value,time,tau);

export function createRLHDroneAudio(ctx){
  let graph=null,disposed=false,updates=0;
  function start(){
    if(disposed||graph||ctx?.state!=='running')return;
    const bus=ctx.createGain(),panner=ctx.createStereoPanner?.();
    bus.gain.value=0;
    if(panner){bus.connect(panner);panner.connect(ctx.destination);}
    else bus.connect(ctx.destination);
    const motors=[];
    for(let i=0;i<4;i++){
      const oscillator=ctx.createOscillator(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
      oscillator.type='sawtooth';oscillator.frequency.value=155+i*3;
      filter.type='lowpass';filter.frequency.value=1250;
      gain.gain.value=.012;
      oscillator.connect(filter);filter.connect(gain);gain.connect(bus);oscillator.start();
      motors.push({oscillator,filter,gain});
    }
    graph={bus,panner,motors};
  }
  const mute=()=>{if(graph)smooth(graph.bus.gain,0,ctx.currentTime,.06);};
  function update({active=false,listener=null,listenerY=1.25,yaw=0,probes=[],time=0}={}){
    if(disposed)return;
    if(!active||ctx?.state!=='running'||!listener){mute();return;}
    let nearest=null,best=Infinity;
    for(const probe of probes){
      if(probe.form!=='probe'||probe.crashing)continue;
      const d=Math.hypot(probe.x-listener.x,probe.z-listener.z,(probe.elevation||0)+.55-listenerY);
      if(d<best){nearest=probe;best=d;}
    }
    if(!nearest||best>=38){mute();return;}
    start();if(!graph)return;
    const t=ctx.currentTime,thrust=clamp(Math.hypot(nearest.motionX||0,nearest.motionZ||0,nearest.verticalSpeed||0)/12,0,2.4);
    const distanceVolume=clamp(1-best/38,0,1)*.8/(1+best/12);
    // Original RLH motor curve with distance falloff and one-motor failure.
    smooth(graph.bus.gain,distanceVolume,t,.12);
    const bearing=Math.atan2(nearest.x-listener.x,-(nearest.z-listener.z));
    if(graph.panner)smooth(graph.panner.pan,clamp(Math.sin(bearing-yaw)*.7,-.75,.75),t,.15);
    for(let i=0;i<4;i++){
      const motor=graph.motors[i],destroyed=!!nearest.rotorDestroyed?.[i],uneven=nearest.rotorDestroyed?.some(Boolean);
      const wobble=uneven?Math.sin(time*(6+i*.6))*5:0;
      smooth(motor.oscillator.frequency,155+i*3+thrust*65+Math.sin(time*3+i)*2+wobble,t,.09);
      smooth(motor.filter.frequency,1250+thrust*700,t,.1);
      smooth(motor.gain.gain,destroyed?0:.012,t,.12);
    }
    updates++;
  }
  function dispose(){
    if(disposed)return;disposed=true;
    if(!graph)return;
    for(const {oscillator,filter,gain} of graph.motors){try{oscillator.stop();}catch{}oscillator.disconnect();filter.disconnect();gain.disconnect();}
    graph.bus.disconnect();graph.panner?.disconnect();graph=null;
  }
  return {update,mute,dispose,get stats(){return {started:!!graph,motors:graph?.motors.length||0,updates};}};
}
