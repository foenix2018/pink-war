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
// Diegetic art direction: signs communicate the history of each faction and
// the function of each place, instead of duplicating the HUD in the world.
export function worldSignFamily(title='',sector=''){
 const normalize=v=>String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
 const t=normalize(title),scope=normalize(sector);
 const classify=v=>{
  if(/ORDRE|HELIX|DIRECTOIRE|JANUS|CONFINEMENT|ARENE/.test(v))return 'occupation';
  if(/AEGIS|SECOURS|DISPENSAIRE|CLINIQUE|SOINS|MEDICAL|INFIRMERIE/.test(v))return 'medical';
  if(/BIOTECH|BOTANI|VEGETA|SERRE|JARDIN|FORET|TILLEUL|SOURCE/.test(v))return 'botanical';
  if(/RESISTANCE|ENCLAVE|MARCHE|EPARS|REFUGE|HORS RESEAU/.test(v))return 'resistance';
  if(/ATELIER|TECHNIQUE|POMPE|VANNE|ALIMENTATION|MAINTENANCE|GROUPE|SECURITE|FONDERIE|COULEE|CHAINE LOURDE|ARMURERIE/.test(v))return 'industrial';
  if(/LIGNE 9|METRO|QUAI|STATION|ASCENSEUR|RESEAU DE VESPER|HALLES/.test(v))return 'transit';
  return null;
 };
 return classify(t)||classify(scope)||'civic';
}
const SIGN_PALETTES={
 occupation:['#2b3031','#ece8df','#a43237','#5d6261'],
 transit:['#25424d','#eee9db','#b5a374','#65716e'],
 industrial:['#bc9f54','#272925','#40372c','#7c6944'],
 resistance:['#c1b093','#302d27','#914e3a','#80735e'],
 medical:['#e2dfd2','#31534e','#a44642','#9ca9a1'],
 botanical:['#c4ccb6','#354d3c','#677f54','#88937b'],
 civic:['#d9d2bf','#2d403d','#984a3b','#8a877b']
};
export function paintPhysicalSign(ctx,W,H,{title,subtitle='',sector='',family=worldSignFamily(title,sector)}){
 const [base,ink,accent]=SIGN_PALETTES[family]||SIGN_PALETTES.civic;
 let seed=Array.from(String(title)).reduce((n,c)=>Math.imul(n^c.charCodeAt(0),16777619),2166136261)>>>0;
 const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const pad=Math.min(H*.10,W*.08),left=family==='occupation'?Math.min(H*.40,W*.29):pad+Math.min(H*.05,W*.04),maxW=Math.max(1,W-left-pad);
 ctx.clearRect(0,0,W,H);ctx.fillStyle=base;ctx.fillRect(0,0,W,H);
 if(family==='occupation'){
  ctx.fillStyle=accent;ctx.fillRect(0,0,H*.30,H);
  ctx.strokeStyle=ink;ctx.lineWidth=Math.max(1,H*.016);
  ctx.beginPath();ctx.arc(H*.15,H*.24,H*.085,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(H*.10,H*.24);ctx.lineTo(H*.20,H*.24);ctx.stroke();
 }else if(family==='industrial'){
  ctx.fillStyle=ink;for(let x=0;x<W;x+=H*.19){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+H*.08,0);ctx.lineTo(x+H*.15,H*.07);ctx.lineTo(x+H*.07,H*.07);ctx.fill();}
 }else{
  ctx.strokeStyle=accent;ctx.lineWidth=Math.max(1,H*.018);ctx.strokeRect(pad*.48,pad*.48,W-pad*.96,H-pad*.96);
 }
 ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle=ink;
 ctx.font='900 '+Math.max(12,Math.round(H*.30))+'px '+(family==='resistance'?'Georgia,serif':'Arial,sans-serif');
 ctx.fillText(String(title),left,H*.34,maxW);
 ctx.font='700 '+Math.max(10,Math.round(H*.16))+'px Arial,sans-serif';ctx.fillText(String(subtitle),left,H*.60,maxW);
 ctx.font='600 '+Math.max(9,Math.round(H*.10))+'px monospace';ctx.fillText(String(sector),left,H*.79,maxW);
 if(family!=='resistance')for(const x of [pad*.42,W-pad*.42])for(const y of [pad*.42,H-pad*.42]){
  ctx.fillStyle='#777266';ctx.beginPath();ctx.arc(x,y,Math.max(2,H*.015),0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#37362f';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-2,y+1);ctx.lineTo(x+2,y-1);ctx.stroke();
 }
 for(let i=0;i<W*H/430;i++){
  const x=rnd()*W,y=rnd()*H,edge=Math.min(x,y,W-x,H-y)<pad*.65;
  ctx.fillStyle=edge?'rgba(53,40,25,.22)':'rgba(53,40,25,.045)';ctx.fillRect(x,y,1+rnd()*4,1+rnd()*2);
 }
}
export function createMapInfoPanel(T,{
 title='INFORMATIONS',subtitle='',sector='VESPER / SECTEUR',
 width=3.4,height=1.1,accent=PALETTE.pink,low=false,textureCache=null,style='auto'
}={}){
 const w=Math.max(.3,width),h=Math.max(.12,height),group=new T.Group();
 const digital=style==='digital'||(style==='auto'&&/^(OBJECTIF|MISSION|NAVIGATION)(\s|$)/i.test(title));
 const family=worldSignFamily(title,sector);
 group.name='PINK WARS / '+(digital?'Liquid Glass':family+' / plaque physique')+' / '+String(title);
 const own=[],disposeList=[],add=(geo,mat,z)=>{
  const m=new T.Mesh(geo,mat);m.position.z=z;group.add(m);
  disposeList.push(geo);if(!own.includes(mat))own.push(mat);return m;
 };
 const baseMat=new T.MeshStandardMaterial({color:digital?0x111a2c:0x77746b,metalness:digital ? .70 : .30,roughness:digital ? .24 : .83});
 add(new T.BoxGeometry(w+(digital? .11:.018),h+(digital? .11:.018),digital? .09:.032),baseMat,digital?-.056:-.018);
 if(digital){const glassMat=new T.MeshPhysicalMaterial({color:0x1b2848,metalness:.22,roughness:.16,clearcoat:1,clearcoatRoughness:.12,transparent:true,opacity:.65,depthWrite:true,side:T.DoubleSide});
 add(new T.PlaneGeometry(w,h),glassMat,.005);}
 const W=digital?(low?512:1024):(low?384:768),H=Math.max(120,Math.min(low?512:768,Math.round(W*h/w)));
 const current={title,subtitle,sector};
 const key=textureCache?JSON.stringify([W,H,title,subtitle,sector,accent,digital,family]):null;
 let entry=key?textureCache.get(key):null;
 let texture=entry?.texture;
 let context=null;
 if(entry){entry.refs++;}
 else {
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  context=canvas.getContext('2d');
  (digital?renderPanel:paintPhysicalSign)(context,W,H,{...current,accent,family,compact:h<.45});
  texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=low?2:4;texture.generateMipmaps=true;
  if(key){entry={texture,refs:1};textureCache.set(key,entry);}
 }
 const redraw=()=>{
  if(!context)return false; // cached arena/décor text is intentionally immutable
  (digital?renderPanel:paintPhysicalSign)(context,W,H,{...current,accent,family,compact:h<.45});return true;
 };
 const frontMat=digital?new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false}):new T.MeshStandardMaterial({map:texture,roughness:.78,metalness:.08,side:T.DoubleSide});
 add(new T.PlaneGeometry(w,h),frontMat,digital? .022:.001).receiveShadow=!digital;
 // Real 3D neon rails, deliberately no lights to keep the Quest 3 draw budget bounded.
 if(digital){const pinkMat=new T.MeshBasicMaterial({color:0xff42aa,toneMapped:false});
 const cyanMat=new T.MeshBasicMaterial({color:0x58dfff,toneMapped:false});
 const edge=Math.min(.027,Math.max(.007,h*.025)),front=.039;
 add(new T.BoxGeometry(w+.08,edge,.018),pinkMat,front).position.y=h*.5+.035;
 add(new T.BoxGeometry(w+.08,edge,.018),pinkMat,front).position.y=-h*.5-.035;
 const left=add(new T.BoxGeometry(edge,h+.09,.018),pinkMat,front);left.position.x=-w*.5-.035;
 const right=add(new T.BoxGeometry(edge,h+.09,.018),cyanMat,front);right.position.x=w*.5+.035;}
 group.userData.isWorldInfoPanel=true;group.userData.artFamily=digital?'digital':family;
 // Dynamic text redraw for mission objectives, without re-creating meshes or GPU textures.
 group.userData.setContent=({title:nextTitle,subtitle:nextSubtitle,sector:nextSector}={})=>{
  if(nextTitle!==undefined)current.title=String(nextTitle);
  if(nextSubtitle!==undefined)current.subtitle=String(nextSubtitle);
  if(nextSector!==undefined)current.sector=String(nextSector);
  if(redraw())texture.needsUpdate=true;
 };
 // Independent brightness control preserves the original power / progression cues.
 group.userData.setBrightness=value=>{
  const intensity=Math.max(.12,Math.min(1,Number(value)||.12));
  frontMat.color.setScalar(intensity);
 };
 group.userData.panelMaterial=frontMat;
 group.userData.dispose=()=>{
  if(entry){if(--entry.refs===0){texture.dispose();textureCache.delete(key);}}
  else texture.dispose();
  for(const g of disposeList)g.dispose();for(const m of own)m.dispose();
 };
 return group;
}
