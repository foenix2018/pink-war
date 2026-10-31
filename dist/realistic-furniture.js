// PW hard-surface interior furniture: genuine frames, drawers, shutter doors,
// segmented lockers, technical racks and articulated field stretchers.
// Pure visual meshes, batched by PBR material. All authoritative colliders stay put.
import {Assembly,bevelBox,matrix,limb} from './geo.js';
export const FURNITURE_REVISION='PW-FURNITURE-V2-2026-11';
export function createHardSurfaceFurniture(T,root,{M,low=false}={}){
 const a=new Assembly(),stats={revision:FURNITURE_REVISION,objects:0,stretchers:0,panels:0,batches:0,triangles:0};
 const mat={metal:M.steel||M.plate,case:M.paintedMetal||M.steel,black:M.dark||M.black,wood:M.woodDark||M.wood,top:M.wood||M.steel,cloth:M.fabric||M.paper,linen:M.paper||M.white,light:M.cyan||M.amber,glass:M.glass};
 const put=(m,size,pos,rot=[0,0,0],bevel=.008)=>{
  if(size.some(x=>x<=0))throw Error('invalid furniture dimensions: '+size);
  const g=bevel?bevelBox(...size,Math.min(bevel,...size.map(x=>x*.18)),low?1:2):new T.BoxGeometry(...size);
  a.add(g,m,matrix(pos,rot),!low);g.dispose();
 };
 const bar=(m,start,end,r=.016)=>{
  const g=limb(start,end,r,r,low?6:10);a.add(g,m,null,!low);g.dispose();
 };
 const disc=(m,p,r=.035,h=.018,rot=[0,0,0])=>{
  const g=new T.CylinderGeometry(r,r,h,low?8:14);a.add(g,m,matrix(p,rot),!low);g.dispose();
 };
 const legs=o=>{
  for(const sx of [-1,1])for(const sz of [-1,1])put(mat.metal,[.065,o.height-.13,.065],[o.x+sx*(o.hx-.09),o.height*.5,o.z+sz*(o.hz-.09)]);
  for(const y of [.16,o.height-.14])for(const side of [-1,1])
   put(mat.black,[o.hx*2-.16,.027,.034],[o.x,y,o.z+side*(o.hz-.06)],[],.003);
 };
 function counter(o){
  const {x,z,hx,hz,height:h}=o,w=hx*2,face=z+hz-.027;
  legs(o);
  put(mat.black,[w-.16,h*.72,.055],[x,h*.45,face],[],.016);
  const n=Math.max(2,Math.floor(w/1.1));
  for(let i=0;i<n;i++){
   const xx=x-hx+.16+(i+.5)*(w-.32)/n,ww=(w-.37)/n-.035;
   put(mat.wood,[ww,h*.46,.024],[xx,h*.49,face+.033],[],.008);
   put(mat.black,[ww*.67,.016,.025],[xx,h*.35,face+.05],[],.003);stats.panels++;
  }
  const cabinetX=x-hx+.34,bz=z-hz+.30;
  put(mat.wood,[.58,h*.72,Math.min(.40,hz*.55)],[cabinetX,h*.43,bz],[],.018);
  for(let j=0;j<(low?2:3);j++){
   const yy=.24+j*h*.17;
   put(mat.case,[.48,h*.13,.024],[cabinetX,yy,bz+.22],[],.006);
   put(mat.black,[.16,.017,.028],[cabinetX,yy,bz+.24],[],.003);
  }
  put(mat.black,[w,.065,hz*2],[x,h-.028,z],[],.011);
  put(o.kind==='reception'?mat.metal:mat.top,[w-.03,.038,hz*2-.035],[x,h+.025,z],[],.012);
  put(mat.metal,[w-.10,.026,.04],[x,h+.047,z+hz-.06],[],.005);
  if(o.kind==='reception')put(mat.light,[w-.25,.013,.014],[x,h-.10,face+.048],[],0);
  stats.objects++;
 }
 function bench(o){
  legs(o);
  put(mat.black,[o.hx*2-.06,.068,o.hz*2-.06],[o.x,o.height-.05,o.z],[],.013);
  put(o.surface==='wood'?mat.top:mat.metal,[o.hx*2-.09,.046,o.hz*2-.09],[o.x,o.height-.01,o.z],[],.012);
  stats.objects++;
 }
 function locker(o){
  const {x,z,hx,hz,height:h}=o,w=hx*2,d=hz*2,along=w>d,span=along?w:d,cols=o.kind==='lockers'?Math.max(1,Math.round(span/.6)):Math.max(2,Math.round(span/1.1));
  const face=z+hz-.026;
  put(mat.case,[w-.035,h-.07,.040],[x,h/2,z-hz+.045],[],.008);
  for(const side of [-1,1]){
   if(along)put(mat.metal,[.056,h-.06,d-.08],[x+side*(hx-.04),h/2,z],[],.006);
   else put(mat.metal,[w-.08,h-.06,.056],[x,h/2,z+side*(hz-.04)],[],.006);
  }
  for(const y of [.055,h-.065])put(mat.metal,[w-.03,.065,d-.04],[x,y,z],[],.008);
  if(o.kind==='rack'){
   for(let j=0;j<(low?4:7);j++){
    const yy=.26+j*(h-.35)/(low?4:7);
    put(mat.metal,[w-.13,.045,d-.12],[x,yy,z],[],.005);
    const count=Math.max(2,Math.floor(w/.66));
    for(let k=0;k<count;k++){
     const xx=x-hx+(k+.5)*w/count;
     put(mat.black,[Math.max(.09,w/count-.07),.12,.085],[xx,yy+.086,face],[],.004);
     put(mat.light,[.014,.019,.015],[xx-w/count*.28,yy+.10,face+.047],[],0);
    }
   }
  }else{
   for(let k=0;k<cols;k++){
    const u=-span/2+(k+.5)*span/cols,xx=along?x+u:x,zz=along?z:z+u;
    const pw=along?Math.max(.11,span/cols-.035):w-.09;
    put(mat.case,[pw,h-.18,.025],[xx,h*.50,along?face:zz],[],.008);
    if(along){
     const cx=xx+pw*.30;
     put(mat.black,[pw*.56,h*.06,.016],[xx,h*.72,face+.018],[],.002);
     if(!low)for(let j=0;j<3;j++)put(mat.black,[pw*.47,.009,.01],[xx,h*.68-j*.033,face+.026],[],0);
     put(mat.metal,[.023,.13,.027],[cx,h*.49,face+.030],[],.004);
     disc(mat.black,[cx,h*.38,face+.042],.014,.020,[Math.PI/2,0,0]);
    }
    stats.panels++;
   }
  }
  stats.objects++;
 }
 function display(o){
  const {x,z,hx,hz,height:h}=o;
  legs(o);put(mat.wood,[hx*2-.06,.52,hz*2-.06],[x,.29,z],[],.02);
  put(mat.metal,[hx*2-.035,.065,hz*2-.035],[x,.62,z],[],.011);
  const face=z+hz-.038;
  for(const side of [-1,1])put(mat.metal,[.04,h-.76,.04],[x+side*(hx-.06),(h+.64)/2,face],[],.004);
  for(const y of [.67,h-.085])put(mat.metal,[hx*2-.11,.042,.036],[x,y,face],[],.004);
  if(mat.glass)put(mat.glass,[hx*2-.17,h-.82,.012],[x,(h+.65)/2,face-.01],[],0);
  stats.objects++;
 }
 function dress(o){
  if(!o)return false;
  if(['reception','desk','terminal-desk','radio-table','map-table'].includes(o.kind))counter(o);
  else if(o.kind==='bench')bench(o);
  else if(['lockers','cabinet','rack'].includes(o.kind))locker(o);
  else if(o.kind==='display')display(o);
  else return false;
  return true;
 }
 function blanket(x,y,z,w,d){
  const nx=low?3:10,nz=low?5:15,verts=[],uv=[],indices=[];
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
   const u=i/nx,v=j/nz,bump=(.013*Math.sin(v*22+u*6)+.007*Math.sin(u*19))*Math.sin(u*Math.PI)*Math.sin(v*Math.PI);
   verts.push(x+(u-.5)*w,y+bump,z+(v-.5)*d);uv.push(u,v);
  }
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
   const k=j*(nx+1)+i;indices.push(k,k+1,k+nx+1,k+1,k+nx+2,k+nx+1);
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  a.add(geo,mat.cloth,null,!low);geo.dispose();
 }
 function stretcher(x,z,{width=1.14,length=1.70}={}){
  const hx=width/2,hz=length/2,y=.48;
  for(const side of [-1,1]){
   bar(mat.metal,[x+side*(hx-.05),y,z-hz],[x+side*(hx-.05),y,z+hz],.027);
   for(const dz of [-hz+.08,hz-.08]){
    bar(mat.metal,[x+side*(hx-.05),.07,z+dz],[x+side*(hx-.05),y,z+dz],.023);
    disc(mat.black,[x+side*(hx-.05),.08,z+dz],.054,.049,[0,0,Math.PI/2]);
   }
  }
  for(const dz of [-hz+.06,hz-.06])bar(mat.metal,[x-hx,y,z+dz],[x+hx,y,z+dz],.020);
  put(mat.black,[width-.12,.10,length-.13],[x,y+.03,z],[],.017);
  put(mat.cloth,[width-.16,.12,length-.17],[x,y+.11,z],[],.033);
  put(mat.linen,[width*.6,.12,.29],[x,y+.21,z+hz-.22],[],.046);
  if(!low)blanket(x,y+.175,z-hz*.34,width-.21,length*.51);
  for(const zz of [z-hz*.7,z+hz*.23])bar(mat.metal,[x-hx+.02,y+.04,zz],[x-hx+.02,y+.30,zz],.018);
  bar(mat.metal,[x-hx+.02,y+.30,z-hz*.7],[x-hx+.02,y+.30,z+hz*.23],.018);
  stats.stretchers++;stats.objects++;
 }
 function finish(){
  const meshes=a.build(root,{name:'PW / mobilier modélisé : structure et matériaux regroupés'});
  stats.batches=meshes.length;stats.triangles=meshes.reduce((s,m)=>s+m.geometry.attributes.position.count/3,0);
  for(const o of a.items)o.geometry.dispose();a.items.length=0;
  return {...stats};
 }
 return {dress,stretcher,finish,stats};
}
