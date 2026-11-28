import {Assembly,bevelBox,matrix} from './geo.js';
import {DATA} from './m09-layout.js';

// The bays in the existing facade share an atlas and display the actual campus plan.
export function createGardenControlDisplays(T,root,{low=false}={}){
 const {x,y,z}=DATA.platforms.find(p=>p.id==='control');
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
 const ctx=canvas.getContext('2d'),map=new T.CanvasTexture(canvas);
 map.colorSpace=T.SRGBColorSpace;map.anisotropy=low?2:4;
 const labels=['SURVEILLANCE','SERRES','JANUS','VERSEMENTS','RELAIS','ORDRE','LIAISON AEGIS'];
 const streams=[
  ['03 / QUAI BAS','04 / PASSERELLE','06 / GRANDE SERRE','08 / JARDINS'],
  ['CULTURE / NORD','POMPE / A1','CIRCULATION','RÉSERVE / 02'],
  ['CŒUR BIOTIQUE','FLUX RACINAIRE','BOUCLE FROIDE','MÉMOIRE'],
  ['SERRES / PINK','FLUX / JANUS','JOURNAL / 07','ARCHIVES / 04'],
  ['QUARTIER HAUT','TOUR JANUS','NŒUD 07','RÉSEAU VESPER'],
  ['BADGES / 72','PORTES / 04','PATROUILLE','PÉRIMÈTRE'],
  ['BALISE / 09','PLATEFORME','PISTE / EST','EXTRACTION'],
 ];
 let phase='';
 function setState(power,isolated){
  const state=isolated?'ISOLÉ':power?'SERVICE':'JANUS ARRÊTÉ';
  if(phase===state)return;
  phase=state;
  ctx.fillStyle='#102027';ctx.fillRect(0,0,1024,256);
  for(const [i,label]of labels.entries()){
   ctx.save();ctx.translate(i*128,0);
   const accent=isolated?'#e8a47b':i===2&&power?'#f098bc':'#86d0de';
   ctx.fillStyle='#142c39';ctx.fillRect(3,3,122,250);
   ctx.fillStyle='#223f50';ctx.fillRect(7,33,114,112);
   ctx.strokeStyle='#385665';ctx.lineWidth=1;
   for(let k=0;k<=9;k++){ctx.beginPath();ctx.moveTo(8+k*12.5,34);ctx.lineTo(8+k*12.5,144);ctx.stroke();}
   for(let k=0;k<=8;k++){ctx.beginPath();ctx.moveTo(8,34+k*13.75);ctx.lineTo(120,34+k*13.75);ctx.stroke();}
   ctx.strokeStyle=accent;ctx.fillStyle=accent;
   if(i===1||i===4||i===6){
    const point=p=>[17+(p.x+112)*.41,44+(p.z+102)*.40];
    const byId=new Map(DATA.platforms.map(p=>[p.id,p]));
    for(const link of DATA.links){
     const a=point(byId.get(link.a)),b=point(byId.get(link.b));
     ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
    }
    const focus=['research','control','extraction'][i===1?0:i===4?1:2];
    for(const p of DATA.platforms){const [px,py]=point(p);const r=p.id===focus?4:1.6;ctx.fillRect(px-r,py-r,r*2,r*2);}
   }else{
    for(let row=0;row<3;row++){
     ctx.beginPath();
     for(let j=0;j<36;j++){
      const px=12+j*2.9,py=55+row*31+Math.sin(j*.96+i+row)*3.7+Math.cos(j*.33+i*2.1)*5.9+Math.sin(j*.41+row)*2;
      if(j)ctx.lineTo(px,py);else ctx.moveTo(px,py);
     }
     ctx.stroke();
    }
   }
   ctx.font='bold 12px sans-serif';ctx.fillText(label,9,24,110);
   ctx.font='10px monospace';
   for(const [k,channel]of streams[i].entries()){
    ctx.fillStyle='#abadb6';ctx.fillText(channel,10,165+k*17,101);
    ctx.fillStyle=accent;ctx.fillRect(112,157+k*17,5,5);
   }
   ctx.fillStyle='#1d3a49';ctx.fillRect(7,228,114,19);
   ctx.fillStyle=accent;ctx.fillText(state,12,241,104);
   ctx.restore();
  }
  map.needsUpdate=true;
 }
 const glass=new T.MeshBasicMaterial({color:0xc1ced3,map});
 const mount=new T.MeshStandardMaterial({color:0x243945,metalness:.54,roughness:.55});
 const frame=new Assembly(),pos=[],uv=[],indices=[];
 const lip=bevelBox(3.54,.12,.22,.04,1),rail=bevelBox(.12,7.86,.18,.033,1);
 for(let i=0;i<labels.length;i++){
  const px=x-14+i*4.5,py=y+8,pz=z+4.985;
  for(const sign of [-1,1]){
   frame.add(lip,mount,matrix([px,py+sign*3.99,pz-.023]),false);
   frame.add(rail,mount,matrix([px+sign*1.71,py,pz-.026]),false);
  }
  const left=(i*128+4)/1024,right=(i*128+124)/1024,a=pos.length/3;
  pos.push(px-1.64,py-3.93,pz,px+1.64,py-3.93,pz,px+1.64,py+3.93,pz,px-1.64,py+3.93,pz);
  uv.push(left,4/256,right,4/256,right,252/256,left,252/256);
  indices.push(a,a+1,a+2,a,a+2,a+3);
 }
 const group=new T.Group();group.name='ORDRE · contrôle du complexe';root.add(group);
 frame.build(group);
 lip.dispose();rail.dispose();for(const item of frame.items)item.geometry.dispose();
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));
 geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 geometry.setIndex(indices);
 geometry.computeVertexNormals();
 group.add(new T.Mesh(geometry,glass));
 setState(true,false);
 return{
  setState,stats:()=>({displays:labels.length}),
  dispose(){
   group.removeFromParent();
   for(const mesh of group.children)mesh.geometry.dispose();
   map.dispose();glass.dispose();mount.dispose();
  },
 };
}
