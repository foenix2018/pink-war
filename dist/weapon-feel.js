const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const FIRING_FEEL=Object.freeze({
  r9:{kick:.052,pitch:.145,yaw:.015,returnSpeed:25,flash:.045,heat:.20},
  bloom:{kick:.029,pitch:.072,yaw:.011,returnSpeed:32,flash:.032,heat:.12},
  lance:{kick:.102,pitch:.185,yaw:.006,returnSpeed:13,flash:.06,heat:.34},
  thorn:{kick:.111,pitch:.205,yaw:.008,returnSpeed:17,flash:.06,heat:.42},
  nova:{kick:.137,pitch:.27,yaw:.023,returnSpeed:12,flash:.10,heat:.55},
  m12:{kick:.126,pitch:.25,yaw:.012,returnSpeed:16,flash:.065,heat:.36}
});
const profile=id=>FIRING_FEEL[id==='duor9'?'r9':id]||FIRING_FEEL.r9;

// One pose contract for all modes. A shoulder absorbs part of the barrel rise
// in ADS; the axial impulse remains visible. Scoped camera displacement scales
// with optical magnification, so a sniper does not throw its image off-screen.
// Tracked pose never touches the head, controller ray, or controller anchor.
export function recoilPose(id,state={}, {aiming=0,tracked=false,dual=false,magnification=1}={}){
  const ads=clamp(Number(aiming)||0,0,1),k=dual||id==='aurora'?0:state.kick||0;
  const p=dual||id==='aurora'?0:state.pitch||0,y=dual||id==='aurora'?0:state.yaw||0;
  const mount=tracked?.46:1,raise=1-ads*.62,side=1-ads*.45;
  return {x:y*.11*side*mount,y:-k*.14*mount,z:k*(1-ads*.24)*mount,
    pitch:p*raise*mount,yaw:y*side*mount,roll:(-y*.45+p*.035)*(1-ads*.65)*mount,
    cameraPitch:tracked||id==='aurora'?0:(state.pitch||0)*.28/(1+ads*(Math.max(1,magnification)-1)),
    cameraYaw:tracked||id==='aurora'?0:(state.yaw||0)*.075/(1+ads*(Math.max(1,magnification)-1))};
}

// Each DUO carrier includes its glove and muzzle. Its own shot timestamp drives
// this same spring, so a left-hand shot cannot jerk the right-hand pistol.
export function dualRecoilPose(age,options={}){
  if(!Number.isFinite(age)||age<0||age>1.5)return recoilPose('r9',{},options);
  const p=profile('r9'),t=age,w=p.returnSpeed;
  const response=(.26+2.11*w*t)*Math.exp(-w*t);
  return recoilPose('r9',{kick:p.kick*response,pitch:p.pitch*response,yaw:p.yaw*response},options);
}
// Analytic damped springs give the same kick/settling at 30, 72, 90 or 120 Hz.
// They affect the held model; never the position of the tracked headset.
export function createWeaponFeel(){
  const axes={kick:{x:0,v:0},pitch:{x:0,v:0},yaw:{x:0,v:0}};
  const state={kick:0,pitch:0,yaw:0,heat:0,flash:0,impulse:0};
  let weapon='r9',sequence=0;
  function reset(){for(const axis of Object.values(axes)){axis.x=0;axis.v=0;}Object.assign(state,{kick:0,pitch:0,yaw:0,heat:0,flash:0,impulse:0});sequence=0;}
  function fire(id,power=1,braced=false){
    if(id==='aurora')return state;
    weapon=id==='duor9'?'r9':FIRING_FEEL[id]?id:'r9';const p=profile(weapon);
    const strength=clamp(Number(power)||1,.25,1)*(braced?.82:1)*(1+state.heat*.12);sequence++;
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
      const limit=key==='kick'?.18:key==='pitch'?.38:.085;
      if(Math.abs(a.x)>limit){a.x=Math.sign(a.x)*limit;if(a.v*a.x>0)a.v=0;}
      if(Math.abs(a.x)<1e-6&&Math.abs(a.v)<1e-5){a.x=0;a.v=0;}state[key]=a.x;
    }
    state.heat=Math.max(0,state.heat-dt*.42);state.flash=Math.max(0,state.flash-dt);state.impulse*=Math.exp(-dt*32);
    return state;
  }
  return {state,fire,update,reset};
}
