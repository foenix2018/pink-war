export function audioMock(){
  const nodes=[],scheduled=new Map(),calls={starts:0,stops:0,buffers:0,oscillators:0};
  const param=(value=0)=>({value,automation:[],
    cancelScheduledValues(time){this.automation=this.automation.filter(a=>a.time<time);},
    setValueAtTime(value,time){this.value=value;this.automation.push({value,time});},
    linearRampToValueAtTime(value,time){this.value=value;this.automation.push({value,time});},
    exponentialRampToValueAtTime(value,time){this.value=value;this.automation.push({value,time});},
    setTargetAtTime(value,time){this.value=value;this.automation.push({value,time});}});
  const node=kind=>{const n={kind,connections:[],disconnected:false,
    connect(to){this.connections.push(to);},disconnect(){this.disconnected=true;},
    start(){calls.starts++;},stop(time=ctx.currentTime){calls.stops++;scheduled.set(this,time);}};nodes.push(n);return n;};
  const ctx={state:'running',currentTime:0,sampleRate:8000,destination:{},
    createGain(){return Object.assign(node('gain'),{gain:param()});},
    createOscillator(){calls.oscillators++;return Object.assign(node('oscillator'),{frequency:param()});},
    createBufferSource(){return Object.assign(node('buffer'),{playbackRate:param(1)});},
    createBuffer(_channels,length){calls.buffers++;return {getChannelData:()=>new Float32Array(length)};},
    createBiquadFilter(){return Object.assign(node('filter'),{frequency:param(),Q:param()});},
    createStereoPanner(){return Object.assign(node('pan'),{pan:param()});},
    createDelay(){return Object.assign(node('delay'),{delayTime:param()});},
    createDynamicsCompressor(){return Object.assign(node('compressor'),{threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()});},
    tick(dt){this.currentTime+=dt;for(const [source,time] of [...scheduled])if(time<=this.currentTime){scheduled.delete(source);source.onended?.();}}
  };
  return {ctx,nodes,calls};
}
