// GAB-1 / Gaby — optical hologram + emotional binary communication.
// Independent of character geometry: the authentic four-petal shell and its
// optical pupil remain untouched and the hologram is invisible outside speech.
// No generated meshes per frame; facial texture uploads are capped at 30 Hz.
export const GAB1_MOODS=Object.freeze({
 danger:Object.freeze({label:'DANGER',color:'#ff768d',notes:[0,0,7,3,7,10],base:770,duration:1.18}),
 soin:Object.freeze({label:'SOINS',color:'#ffafe0',notes:[0,4,7,9,7,4],base:420,duration:1.42}),
 joie:Object.freeze({label:'JOIE',color:'#ff8bcb',notes:[0,4,7,12,9,7],base:560,duration:1.22}),
 inquiet:Object.freeze({label:'INQUIÉTUDE',color:'#ff99c9',notes:[0,3,1,5,3,0],base:540,duration:1.34}),
 message:Object.freeze({label:'MESSAGE',color:'#ff8acb',notes:[0,3,7,4,9,7],base:510,duration:1.42})
});
export const gabMoodForEvent=(event={})=>{
 if(event.type==='danger'||event.kind==='danger'||event.kind==='threat')return 'danger';
 if(event.kind==='mend'||event.kind==='ward'||event.type==='heal')return 'soin';
 if(event.kind==='phase'||event.kind==='amplify'||event.type==='victory')return 'joie';
 if(event.type==='worry'||event.kind==='low-energy')return 'inquiet';
 return 'message';
};
const noop=()=>{};
export function createGabCommunication(T,root){
 let elapsed=0,open=0,remaining=0,mood='message',speaking=false,drawAt=0,voiceNodes=[],disposed=false;
 let canvas=null,ctx=null,texture=null,holo=null,beam=null,halo=null,group=null;
 let owned=[];
 const canRender=typeof document!=='undefined'&&typeof document.createElement==='function';
 if(canRender){
  canvas=document.createElement('canvas');canvas.width=512;canvas.height=384;ctx=canvas.getContext('2d');
  if(ctx){
   texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
   const positions=[],uv=[],indices=[],nx=22,ny=16;
   for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){
    const u=x/nx,v=y/ny,px=(u-.5)*.268,py=(v-.5)*.198;
    positions.push(px,py,Math.sqrt(Math.max(.001,.170**2-px*px-py*py))+.004);uv.push(u,v);
   }
   for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const a=y*(nx+1)+x,b=a+1,c=a+nx+1,d=c+1;indices.push(a,b,d,a,d,c);
   }
   const geometry=new T.BufferGeometry();
   geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
   geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
   const mat=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide,transparent:true,opacity:0,depthWrite:false,toneMapped:false});
   holo=new T.Mesh(geometry,mat);holo.name='GAB-1 / expression holographique temporaire';holo.renderOrder=8;
   group=new T.Group();group.name='GAB-1 / optique vers projection';group.position.z=.147;group.visible=false;group.scale.setScalar(.001);group.add(holo);root.add(group);
   const beamMat=new T.MeshBasicMaterial({color:0xff86d2,transparent:true,opacity:0,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
   beam=new T.Mesh(new T.CylinderGeometry(.113,.004,.14,20,1,true),beamMat);beam.rotation.x=Math.PI/2;beam.position.z=.21;beam.renderOrder=6;beam.visible=false;root.add(beam);
   const haloMat=new T.MeshBasicMaterial({color:0xffa8e8,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
   halo=new T.Mesh(new T.TorusGeometry(.048,.0027,4,24),haloMat);halo.position.z=.156;halo.renderOrder=7;halo.visible=false;root.add(halo);
   owned=[geometry,mat,texture,beam.geometry,beamMat,halo.geometry,haloMat];
  }
 }
 const round=(x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);};
 const line=(points,width,color)=>{ctx.beginPath();ctx.moveTo(...points[0]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);ctx.lineWidth=width;ctx.strokeStyle=color;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();};
 function face(){
  if(!ctx||!texture)return;
  const c=ctx;c.clearRect(0,0,512,384);c.save();c.scale(.5,.5);
  const col=GAB1_MOODS[mood].color,amp=speaking?.45+.55*Math.abs(Math.sin(elapsed*23)):0;
  c.shadowColor=col;c.shadowBlur=18;c.strokeStyle=col;c.lineWidth=14;
  round(50,44,924,680,230);c.stroke();
  const bg=c.createLinearGradient(150,50,860,620);bg.addColorStop(0,'#172236');bg.addColorStop(.36,'#070a16');bg.addColorStop(1,'#02030a');
  round(69,64,885,640,205);c.fillStyle=bg;c.fill();
  c.shadowBlur=32;c.strokeStyle=col;c.fillStyle=col;
  const left=340,right=680,y=355;
  if(mood==='danger'){
   line([[left-69,y+15],[left-25,y-18],[left+20,y-21],[left+67,y+16]],24,col);
   line([[right-67,y+16],[right-20,y-21],[right+25,y-18],[right+69,y+15]],24,col);
   line([[259,188],[410,232]],17,col);line([[614,232],[765,188]],17,col);
  }else if(mood==='joie'){
   for(const x of [left,right])line([[x-67,y+22],[x-37,y-20],[x,y-35],[x+40,y-15],[x+67,y+21]],23,col);
  }else if(mood==='soin'){
   for(const x of [left,right]){line([[x-55,y+6],[x-25,y-21],[x+5,y-24],[x+55,y+8]],20,col);}
  }else{
   for(const x of [left,right]){
    c.beginPath();round(x-26,y-58,52,113,25);c.fill();
   }
   if(mood==='inquiet'){line([[265,209],[348,176],[409,209]],12,col);line([[615,209],[680,176],[747,209]],12,col);}
  }
  c.strokeStyle=col;c.fillStyle=col;c.shadowBlur=22;
  const mid=512,my=529;
  if(speaking){c.beginPath();c.ellipse(mid,my,27+amp*12,12+amp*35,0,0,Math.PI*2);c.stroke();}
  else if(mood==='danger'){line([[mid-47,my+12],[mid+47,my+12]],15,col);}
  else if(mood==='soin'||mood==='joie'){c.beginPath();c.moveTo(mid-55,my-18);c.quadraticCurveTo(mid,my+44,mid+55,my-18);c.stroke();}
  else{c.beginPath();c.moveTo(mid-43,my+14);c.quadraticCurveTo(mid,my-14,mid+43,my+14);c.stroke();}
  if(mood==='danger'){
   c.font='bold 31px monospace';c.textAlign='center';c.fillText('!  !',512,645);
  }else if(speaking){
   c.font='20px monospace';c.globalAlpha=.5;c.fillText('0101 1010 0011',512,648);
  }
  c.restore();texture.needsUpdate=true;
 }
 function silence(){
  for(const [osc,g] of voiceNodes){try{osc.stop();}catch{}try{osc.disconnect();g.disconnect();}catch{}}
  voiceNodes.length=0;
 }
 function playBeeps(audio,which){
  if(!audio||audio.state!=='running')return;
  const cfg=GAB1_MOODS[which],notes=cfg.notes,step=cfg.duration/notes.length;
  try{
   let t=audio.currentTime+.035;
   for(let i=0;i<notes.length;i++){
    const osc=audio.createOscillator(),env=audio.createGain(),frequency=cfg.base*Math.pow(2,notes[i]/12);
    osc.type=which==='danger'?'square':'sine';
    osc.frequency.setValueAtTime(frequency,t);
    osc.frequency.exponentialRampToValueAtTime(frequency*(which==='danger'?1.13:.93),t+step*.64);
    env.gain.setValueAtTime(.0001,t);
    env.gain.linearRampToValueAtTime(which==='danger'?.025:.018,t+.008);
    env.gain.exponentialRampToValueAtTime(.0001,t+step*.77);
    osc.connect(env);env.connect(audio.destination);osc.start(t);osc.stop(t+step*.81);
    voiceNodes.push([osc,env]);osc.onended=()=>{osc.disconnect();env.disconnect();const idx=voiceNodes.findIndex(x=>x[0]===osc);if(idx>=0)voiceNodes.splice(idx,1);};
    t+=step;
   }
  }catch{silence();}
 }
 function say(next='message',{audio=null,sound=true}={}){
  if(disposed)return false;
  mood=GAB1_MOODS[next]?next:'message';elapsed=0;remaining=GAB1_MOODS[mood].duration;
  speaking=true;drawAt=0;silence();if(sound)playBeeps(audio,mood);return true;
 }
 function stop(){remaining=0;speaking=false;silence();}
 function update(dt){
  if(disposed||!(dt>0))return;
  dt=Math.min(dt,.05);elapsed+=dt;
  if(speaking){remaining=Math.max(0,remaining-dt);if(remaining===0)speaking=false;}
  const goal=speaking?1:0;open+=(goal-open)*(1-Math.exp(-dt*(goal?11:8)));
  if(Math.abs(goal-open)<.003)open=goal;
  if(group){group.visible=open>.004;if(group.visible){
   const p=open*open*(3-2*open);group.position.z=.147-.025*p;group.scale.setScalar(Math.max(.001,p));
   holo.material.opacity=Math.min(1,open*3);
  }}
  if(beam){beam.visible=open>.004;beam.material.opacity=.06*open+.15*Math.sin(Math.PI*open);beam.scale.set(.24+.76*open,.24+.76*open,.28+.72*open);}
  if(halo){halo.visible=open>.004;halo.material.opacity=Math.min(.85,open*1.8);halo.scale.setScalar(1+.07*Math.sin(elapsed*18));}
  if(group?.visible&&elapsed>=drawAt){face();drawAt=elapsed+1/30;}
 }
 function reset(){stop();open=0;elapsed=0;if(group)group.visible=false;if(beam)beam.visible=false;if(halo)halo.visible=false;}
 function dispose(){if(disposed)return;disposed=true;stop();group?.removeFromParent();beam?.removeFromParent();halo?.removeFromParent();for(const obj of owned)obj.dispose();}
 const snapshot=()=>({mood,speaking,projection:open,visible:!!group?.visible,hasScreen:!!group,remaining});
 return {say,stop,reset,update,dispose,snapshot};
}
