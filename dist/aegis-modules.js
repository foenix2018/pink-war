import * as T from './vendor/three.webgpu.min.js';
import {limb,ball,bake} from './geo.js';
import {armorLabelGeometry} from './armor-surface.js';
import {profiledPanel} from './armor-profiles.js';

// Small flush fittings need their chamfered outline, not the many subdivisions
// of a rounded cube. The saved triangles go into the actual armour shells.
export function armorFitting([w,h,d]){
 const r=Math.min(w,h)*.17,x=w/2,y=h/2,s=new T.Shape();
 [[-x+r,-y],[x-r,-y],[x,-y+r],[x,y-r],[x-r,y],[-x+r,y],[-x,y-r],[-x,-y+r]].forEach((p,i)=>i?s.lineTo(...p):s.moveTo(...p));s.closePath();
 const g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:false,steps:1,curveSegments:1});g.translate(0,0,-d/2);return g;
}

export function appendAegisModules({add,at,bones,items,width,masculine}){
 let level=1,module='chassis';
 const stage=(n,id,fn)=>{level=n;module=id;fn();};
 const put=(bone,key,g,p=[0,0,0],r=[0,0,0],s=[1,1,1])=>add(bone,key,g,p,r,s,level,module);
 const panel=(bone,key,outline,p,s=[1,1,1],r=[0,0,0])=>put(bone,key,profiledPanel(outline,{depth:.012,bulge:key==='pearl'?.016:.007,round:.18}),p,r,s);
 const fitting=(bone,key,size,p,r=[0,0,0])=>put(bone,key,armorFitting(size),p,r);
 const tube=(bone,key,a,b,r=.006)=>put(bone,key,limb(a,b,r,r,10));
 const joint=(bone,key,p,r)=>put(bone,key,ball([0,0,0],r,[10,6]),p);
 function limbFrame(bone,end,t=.5){
  const a=at(bone),b=at(end),y=a.clone().sub(b).normalize(),z=new T.Vector3(0,0,1);z.addScaledVector(y,-z.dot(y)).normalize();
  return {m:new T.Matrix4().makeBasis(y.clone().cross(z).normalize(),y,z).setPosition(a.lerp(b,t))};
 }
 function limbPanel(bone,end,key,outline,front,s=[1,1,1],t=.5,side=0){
  const {m}=limbFrame(bone,end,t);m.multiply(new T.Matrix4().makeTranslation(side,0,-front)).multiply(new T.Matrix4().makeScale(...s));
  items.push({bone:bones.get(bone),key,geometry:bake(profiledPanel(outline,{depth:.012,bulge:key==='pearl'?.014:.006,round:.18}),m),level,tag:module});
 }
 // A C-section follows the limb, closing at its real front plate. Its four
 // rings taper at both ends; it cannot become a floating cylindrical sleeve.
 function cuff(bone,end,key,t,halfLength,rx,rz){
  const {m}=limbFrame(bone,end,t),p=[],uv=[],ix=[],steps=16,rings=[[-halfLength,.88],[-halfLength+.012,1],[halfLength-.012,.96],[halfLength,.84]];
  for(let row=0;row<rings.length;row++)for(let j=0;j<=steps;j++){
   const angle=.65+j/steps*(Math.PI*2-1.30),[y,s]=rings[row];p.push(Math.sin(angle)*rx*s,y,-Math.cos(angle)*rz*s);uv.push(j/steps,row/3);
   if(row&&j<steps){const a=row*(steps+1)+j,b=a-steps-1;ix.push(b,a,b+1,b+1,a,a+1);}
  }
  // Inner return: a closed double wall with narrow end rims.
  const count=p.length/3;for(let i=0;i<count;i++){p.push(p[i*3]*.90,p[i*3+1],p[i*3+2]*.90);uv.push(uv[i*2],uv[i*2+1]);}
  for(let i=0,n=ix.length;i<n;i+=3)ix.push(ix[i]+count,ix[i+2]+count,ix[i+1]+count);
  for(const row of [0,3])for(let j=0;j<steps;j++){const a=row*(steps+1)+j;const cap=[a,a+1,a+count,a+1,a+count+1,a+count];if(row===3)for(let k=0;k<6;k+=3)[cap[k+1],cap[k+2]]=[cap[k+2],cap[k+1]];ix.push(...cap);}
  for(const j of [0,steps])for(let row=0;row<3;row++){const a=row*(steps+1)+j,b=a+steps+1,cap=[a,b,a+count,b,b+count,a+count];if(j===0)for(let k=0;k<6;k+=3)[cap[k+1],cap[k+2]]=[cap[k+2],cap[k+1]];ix.push(...cap);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();
  items.push({bone:bones.get(bone),key,geometry:bake(g,m),level,tag:module});
 }
 const scale=masculine?1:.96;
 const abdomen=[[-.105,-.022],[.105,-.022],[.118,.012],[.09,.027],[-.09,.027],[-.118,.012]];
 const bicep=[[-.031,-.074],[.032,-.074],[.049,.034],[.031,.076],[-.029,.072],[-.047,.029]];
 const sidePlate=[[-.035,-.100],[.031,-.102],[.047,-.041],[.038,.082],[.005,.105],[-.038,.073]];

 stage(1,'chassis',()=>{
  // The collar is split at the sternum and the nape, clear of the head pivot.
  for(const s of [-1,1]){
   panel('Spine2','pearl',[[-.035,-.023],[.037,-.023],[.043,.012],[.015,.037],[-.030,.027]],[s*.088,1.581,-.074],[1,1,.7],[.2,s*-.48,s*-.10]);
   panel('Spine2','dark',[[-.035,-.014],[.035,-.014],[.043,.016],[-.031,.022]],[s*.086,1.565,-.078],[1.15,1.15,.8],[.2,s*-.48,0]);
   fitting('Spine2','steel',[.021,.009,.005],[s*.091,1.593,-.101],[.2,0,s*-.1]);
  }
  panel('Hips','dark',[[-.108,.050],[.105,.050],[.11,-.016],[.057,-.091],[-.054,-.091],[-.11,-.016]],[0,.969,-.108],[width,1,1]);
  panel('Hips','pearl',[[-.088,.034],[.088,.034],[.089,-.014],[.048,-.071],[-.048,-.071],[-.089,-.014]],[0,.970,-.124],[width,1,.65]);
  panel('Hips','rose',[[-.012,.026],[.012,.026],[.013,-.046],[-.013,-.046]],[0,.972,-.143],[1,1,.3]);
  put('Spine2','pearl',armorLabelGeometry(.078,.022,masculine?'lylu':'ghju'),[0,1.405,-.199]);
  panel('Spine','pearl',abdomen,[0,1.115,-.113],[width,.83,.7]);
 });
 stage(2,'abdomen',()=>{
  for(let j=0;j<3;j++)panel(j===2?'Spine':'Spine1','pearl',abdomen,[0,1.276-j*.050,-.130+j*.008],[width*(1-j*.06),1,.6]);
  for(const s of [-1,1]){
   panel('Spine1','dark',sidePlate,[s*.152*width,1.221,-.089],[.7,.85,.65],[.05,s*-.65,s*-.05]);
   panel('Spine1','rose',sidePlate,[s*.159*width,1.223,-.099],[.34,.73,.4],[.05,s*-.65,s*-.05]);
  }
 });
 stage(3,'limbs',()=>{
  for(const [side,s] of [['Left',-1],['Right',1]]){
   const arm=side+'Arm',fore=side+'ForeArm',foot=side+'Foot',ankle=at(foot);
   limbPanel(arm,fore,'dark',bicep,.064,[1.18,1.05,1],.54);
   limbPanel(arm,fore,'pearl',bicep,.075,[1,1,.65],.54);
   panel(foot,'pearl',[[-.045,-.035],[.045,-.035],[.049,.016],[.026,.041],[-.027,.041],[-.049,.016]],[ankle.x,.106,ankle.z+.061],[1,1,.65],[0,Math.PI,0]);
   fitting(foot,'steel',[.062,.017,.014],[ankle.x,.175,ankle.z-.051],[.15,0,0]);
  }
 });
 stage(4,'bracers',()=>{
  for(const side of ['Left','Right']){
   const fore=side+'ForeArm',hand=side+'Hand';cuff(fore,hand,'pearl',.48,.079,.053,.055);
   limbPanel(fore,hand,'dark',bicep,.078,[.58,.75,.5],.45);
   limbPanel(fore,hand,side==='Left'?'glow':'rose',bicep,.086,[.32,.41,.18],.45);
  }
 });
 stage(5,'cuirass',()=>{
  for(const [side,s] of [['Left',-1],['Right',1]]){
   const leg=side+'UpLeg',knee=side+'Leg',kn=at(knee);
   limbPanel(leg,knee,'pearl',sidePlate,.057,[.95,1.22,.75],.31,s*.092);
   limbPanel(leg,knee,'dark',sidePlate,.071,[.35,1.03,.35],.31,s*.092);
   panel(knee,'steel',[[-.017,-.037],[.018,-.037],[.026,.017],[.008,.040],[-.024,.024]],[kn.x+s*.054,kn.y+.006,kn.z-.055],[1,1,.8],[0,s*-.45,0]);
  }
 });
 stage(6,'core',()=>{
  panel('Spine2','dark',[[-.090,-.14],[.09,-.14],[.112,-.08],[.105,.115],[.064,.14],[-.064,.14],[-.105,.115],[-.112,-.08]],[0,1.405,.173],[width,1,1.5],[0,Math.PI,0]);
  panel('Spine2','pearl',[[-.080,-.123],[.080,-.123],[.092,-.071],[.086,.10],[.051,.12],[-.051,.12],[-.086,.10],[-.092,-.071]],[0,1.405,.205],[width,1,.8],[0,Math.PI,0]);
  for(const s of [-1,1]){
   panel('Spine2','rose',bicep,[s*.059,1.426,.230],[.73,1.08,.3],[0,Math.PI,s*-.07]);
   panel('Spine2','steel',[[-.026,-.014],[.026,-.014],[.033,.014],[-.03,.021]],[s*.078,1.565,-.103],[1,1,.6],[.2,s*-.4,0]);
  }
  put('Spine2','pearl',armorLabelGeometry(.066,.025,'core'),[0,1.465,.231],[0,Math.PI,0]);
  for(let j=0;j<4;j++)fitting('Spine2','dark',[.072,.009,.004],[0,1.34+j*.028,.230]);
 });
 stage(7,'exo',()=>{
  for(const [side,s] of [['Left',-1],['Right',1]]){
   const leg=side+'UpLeg',knee=side+'Leg',foot=side+'Foot',hip=at(leg),kn=at(knee),ankle=at(foot);
   const a=[hip.x+s*.102,hip.y-.095,.035],b=[kn.x+s*.081,kn.y+.085,.035];
   tube(leg,'dark',a,b,.012);tube(leg,'steel',[a[0],a[1]-.02,a[2]-.012],[b[0],b[1]+.03,b[2]-.012],.0055);
   const c=[kn.x+s*.078,kn.y-.09,.035],d=[ankle.x+s*.063,ankle.y+.065,.021];tube(knee,'dark',c,d,.010);tube(knee,'steel',c,[d[0],d[1]+.04,d[2]],.005);
   joint(leg,'steel',a,[.016,.023,.020]);joint(knee,'steel',c,[.017,.022,.019]);
   limbPanel(knee,foot,'pearl',sidePlate,.045,[.55,1.08,.55],.53,s*.051);
  }
 });
 stage(8,'sensors',()=>{
  for(const s of [-1,1]){
   panel('Head','dark',[[-.022,-.034],[.022,-.034],[.027,.026],[.01,.045],[-.022,.035]],[s*.124,1.787,.020],[1,1,1],[0,s*1.30,0]);
   panel('Head','pearl',[[-.017,-.026],[.017,-.026],[.02,.022],[0,.036],[-.017,.028]],[s*.137,1.789,.016],[1,1,.7],[0,s*1.30,0]);
   fitting('Head','glow',[.006,.010,.006],[s*.152,1.798,-.003]);
  }
  panel('Head','steel',[[-.034,-.019],[.034,-.019],[.04,.015],[-.04,.015]],[0,1.788,.146],[1,1,.6],[0,Math.PI,0]);
  panel('Head','dark',[[-.071,-.009],[.071,-.009],[.084,.009],[.065,.017],[-.065,.017],[-.084,.009]],[0,1.813,-.124],[1,1,.45],[.25,0,0]);
 });
 stage(9,'assault',()=>{
  for(const [side,s] of [['Left',-1],['Right',1]]){
   panel(side+'Arm','pearl',[[-.052,-.052],[.049,-.055],[.079,.004],[.059,.050],[.014,.067],[-.051,.050],[-.067,.004]],[s*.237,1.509,-.025],[1.12,1,1],[.04,s*-.75,s*-.15]);
   panel(side+'Arm','rose',[[-.038,-.012],[.039,-.012],[.047,.011],[.03,.026],[-.03,.026]],[s*.255,1.529,-.045],[1,1,.4],[.04,s*-.75,s*-.15]);
   cuff(side+'ForeArm',side+'Hand','dark',.48,.077,.057,.059);
   limbPanel(side+'ForeArm',side+'Hand','rose',bicep,.091,[.23,.85,.22],.45);
  }
 });
 stage(10,'command',()=>{
  for(const s of [-1,1]){
   panel('Spine2','pearl',[[-.027,-.082],[.031,-.077],[.045,.027],[.030,.071],[-.028,.067],[-.043,.014]],[s*.156*width,1.438,-.183],[scale,1,.65],[0,s*.25,s*-.10]);
   panel('Hips','pearl',[[-.042,-.115],[.036,-.11],[.054,.058],[.026,.086],[-.047,.074]],[s*.164,1.002,-.056],[.82,.83,.65],[.04,s*-.65,s*-.10]);
   panel('Spine2','steel',sidePlate,[s*.10,1.393,.209],[.48,.94,.5],[0,Math.PI,s*.1]);
  }
  panel('Hips','pearl',[[-.028,-.014],[.028,-.014],[.037,.023],[0,.012],[-.037,.023]],[0,1.044,-.151],[.38,.38,.25]);
  fitting('Spine2','glow',[.034,.003,.002],[0,1.414,-.197]);
 });
}
