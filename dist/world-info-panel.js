// PINK WARS · physical 3D information panel (WebGPU and WebGL fallback).
// No DOM screen overlay: the painted liquid-glass surface is a world-space mesh.
// No extra point lights, network textures or changes to collision/interaction zones.
const FONT='"Oxanium","Bahnschrift","Arial Narrow","Segoe UI",sans-serif';
const PALETTE={pink:'#ff4fac',cyan:'#60e5ff'};
function round(ctx,x,y,w,h,r){
 const z=Math.min(r,w*.5,h*.5);
 ctx.beginPath();ctx.moveTo(x+z,y);ctx.arcTo(x+w,y,x+w,y+h,z);
 ctx.arcTo(x+w,y+h,x,y+h,z);ctx.arcTo(x,y+h,x,y,z);
 ctx.arcTo(x,y,x+w,y,z);ctx.closePath();
}
function renderPanel(ctx,W,H,{title,subtitle,sector,accent,compact}){
 const c=accent||PALETTE.pink, r=Math.max(8,H*.065),x=7,y=7,w=W-14,h=H-14;
 ctx.clearRect(0,0,W,H);
 const bg=ctx.createLinearGradient(0,0,W,H);
 bg.addColorStop(0,'rgba(12,16,35,.60)');
 bg.addColorStop(.46,'rgba(20,27,53,.38)');
 bg.addColorStop(1,'rgba(8,15,34,.64)');
 round(ctx,x,y,w,h,r);ctx.fillStyle=bg;ctx.fill();
 const glass=ctx.createLinearGradient(0,y,0,H);
 glass.addColorStop(0,'rgba(220,237,255,.19)');
 glass.addColorStop(.26,'rgba(220,237,255,.025)');
 glass.addColorStop(1,'rgba(50,79,130,.09)');
 round(ctx,x+4,y+4,w-8,h-8,r*.83);ctx.fillStyle=glass;ctx.fill();
 ctx.save();ctx.lineWidth=Math.max(2,H*.012);ctx.shadowBlur=Math.min(26,H*.10);ctx.shadowColor=c;
 ctx.strokeStyle=c;round(ctx,x+3,y+3,w-6,h-6,r);ctx.stroke();
 ctx.shadowBlur=Math.min(20,H*.06);ctx.shadowColor=PALETTE.cyan;ctx.strokeStyle=PALETTE.cyan;
 ctx.beginPath();ctx.moveTo(W*.77,y+3);ctx.lineTo(W-r*.9,y+3);ctx.arcTo(W-4,y+3,W-4,y+r*.9,r*.7);ctx.lineTo(W-4,H*.52);ctx.stroke();ctx.restore();
 ctx.fillStyle='rgba(255,255,255,.14)';ctx.beginPath();ctx.moveTo(W*.10,H*.055);ctx.lineTo(W*.46,H*.055);ctx.lineTo(W*.30,H*.14);ctx.lineTo(W*.07,H*.14);ctx.fill();
 ctx.textBaseline='middle';ctx.textAlign='left';
 const small=compact||H<220;
 ctx.font='800 '+Math.max(12,Math.round(H*(small?.105:.09)))+'px '+FONT;
 ctx.fillStyle='#b8cbe8';ctx.fillText('PINK WARS  /  TERMINAL D’INFORMATION',W*.073,H*.19,W*.88);
 ctx.fillStyle=PALETTE.cyan;ctx.fillRect(W*.072,H*.30,W*.64,Math.max(2,H*.011));
 ctx.fillStyle=c;ctx.fillRect(W*.75,H*.30,W*.10,Math.max(2,H*.011));
 ctx.textAlign='left';ctx.font='900 '+Math.round(H*(small?.235:.215))+'px '+FONT;
 ctx.shadowBlur=H*.045;ctx.shadowColor=PALETTE.cyan;ctx.fillStyle='#e8f8ff';
 const main=String(title||'INFORMATIONS');
 ctx.fillText(main,W*.07,H*.49,W*.86);ctx.shadowBlur=0;
 const sub=String(subtitle||sector||'VESPER · RÉSEAU DE SECTEURS');
 ctx.font='700 '+Math.max(13,Math.round(H*(small?.14:.115)))+'px '+FONT;
 ctx.fillStyle='#92edff';ctx.fillText(sub,W*.073,H*.71,W*.84);
 ctx.fillStyle='rgba(8,17,37,.55)';round(ctx,W*.07,H*.79,W*.86,H*.13,H*.035);ctx.fill();
 ctx.strokeStyle='rgba(255,104,190,.65)';ctx.lineWidth=Math.max(1,H*.005);
 round(ctx,W*.07,H*.79,W*.86,H*.13,H*.035);ctx.stroke();
 ctx.font='800 '+Math.max(10,Math.round(H*.072))+'px '+FONT;
 ctx.fillStyle='#ff8fd0';ctx.fillText('◈  '+String(sector||'VESPER / INFOS TACTIQUES'),W*.1,H*.855,W*.80);
}
export function createMapInfoPanel(T,{
 title='INFORMATIONS',subtitle='',sector='VESPER / SECTEUR',
 width=3.4,height=1.1,accent=PALETTE.pink,low=false
}={}){
 const w=Math.max(.3,width),h=Math.max(.12,height),group=new T.Group();
 group.name='PINK WARS / panneau d’information Liquid Glass / '+String(title);
 const own=[],disposeList=[],add=(geo,mat,z)=>{
  const m=new T.Mesh(geo,mat);m.position.z=z;group.add(m);
  disposeList.push(geo);if(!own.includes(mat))own.push(mat);return m;
 };
 const baseMat=new T.MeshStandardMaterial({color:0x111a2c,metalness:.70,roughness:.24});
 add(new T.BoxGeometry(w+.11,h+.11,.09),baseMat,-.056);
 const glassMat=new T.MeshPhysicalMaterial({color:0x1b2848,metalness:.22,roughness:.16,clearcoat:1,clearcoatRoughness:.12,transparent:true,opacity:.65,depthWrite:true,side:T.DoubleSide});
 add(new T.PlaneGeometry(w,h),glassMat,.005);
 const W=low?512:1024,H=Math.max(120,Math.min(low?512:768,Math.round(W*h/w)));
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
 renderPanel(canvas.getContext('2d'),W,H,{title,subtitle,sector,accent,compact:h<.45});
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=low?2:4;texture.generateMipmaps=true;
 const frontMat=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false});
 add(new T.PlaneGeometry(w,h),frontMat,.022);
 // Real 3D neon rails, deliberately no lights to keep the Quest 3 draw budget bounded.
 const pinkMat=new T.MeshBasicMaterial({color:0xff42aa,toneMapped:false});
 const cyanMat=new T.MeshBasicMaterial({color:0x58dfff,toneMapped:false});
 const edge=Math.min(.027,Math.max(.007,h*.025)),front=.039;
 add(new T.BoxGeometry(w+.08,edge,.018),pinkMat,front).position.y=h*.5+.035;
 add(new T.BoxGeometry(w+.08,edge,.018),pinkMat,front).position.y=-h*.5-.035;
 const left=add(new T.BoxGeometry(edge,h+.09,.018),pinkMat,front);left.position.x=-w*.5-.035;
 const right=add(new T.BoxGeometry(edge,h+.09,.018),cyanMat,front);right.position.x=w*.5+.035;
 group.userData.isWorldInfoPanel=true;
 group.userData.dispose=()=>{texture.dispose();for(const g of disposeList)g.dispose();for(const m of own)m.dispose();};
 return group;
}
