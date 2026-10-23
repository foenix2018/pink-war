const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const FIRING_FEEL=Object.freeze({
  r9:{kick:.042,pitch:.10,yaw:.018,returnSpeed:25,flash:.045,heat:.20},
  bloom:{kick:.023,pitch:.057,yaw:.012,returnSpeed:29,flash:.032,heat:.12},
  lance:{kick:.095,pitch:.145,yaw:.007,returnSpeed:20,flash:.06,heat:.34},
  thorn:{kick:.096,pitch:.18,yaw:.008,returnSpeed:19,flash:.06,heat:.42},
  nova:{kick:.115,pitch:.215,yaw:.026,returnSpeed:16,flash:.10,heat:.55},
  m12:{kick:.108,pitch:.18,yaw:.012,returnSpeed:18,flash:.065,heat:.36}
});
// Analytic damped springs give the same kick/settling at 30, 72, 90 or 120 Hz.
// They affect the held model; never the position of the tracked headset.
export function createWeaponFeel(){
  const axes={kick:{x:0,v:0},pitch:{x:0,v:0},yaw:{x:0,v:0}};
  const state={kick:0,pitch:0,yaw:0,heat:0,flash:0,impulse:0};
  let weapon='r9',sequence=0;
  function reset(){for(const axis of Object.values(axes)){axis.x=0;axis.v=0;}Object.assign(state,{kick:0,pitch:0,yaw:0,heat:0,flash:0,impulse:0});sequence=0;}
  function fire(id,power=1,braced=false){
    weapon=FIRING_FEEL[id]?id:'r9';const p=FIRING_FEEL[weapon];
    const strength=clamp(Number(power)||1,.25,1)*(braced?.82:1);sequence++;
    for(const key of ['kick','pitch','yaw']){
      const value=p[key]*strength*(key==='yaw'?(sequence%2?1:-.7):1),axis=axes[key];
      axis.x+=value*.26;axis.v+=value*p.returnSpeed*1.85;
      axis.x=clamp(axis.x,key==='yaw'?-.08:0,key==='kick'?.16:key==='pitch'?.34:.08);
      axis.v=clamp(axis.v,-8,8);state[key]=axis.x;
    }
    state.heat=clamp(state.heat+p.heat*strength,0,1);state.flash=p.flash;state.impulse=1;
    return state;
  }
  function update(dt){
    dt=clamp(Number(dt)||0,0,.1);const w=FIRING_FEEL[weapon].returnSpeed,decay=Math.exp(-w*dt);
    for(const key of ['kick','pitch','yaw']){
      const a=axes[key],j=a.v+w*a.x;
      a.x=(a.x+j*dt)*decay;a.v=(a.v-w*j*dt)*decay;
      if(Math.abs(a.x)<1e-6&&Math.abs(a.v)<1e-5){a.x=0;a.v=0;}state[key]=a.x;
    }
    state.heat=Math.max(0,state.heat-dt*.42);state.flash=Math.max(0,state.flash-dt);state.impulse*=Math.exp(-dt*32);
    return state;
  }
  return {state,fire,update,reset};
}
