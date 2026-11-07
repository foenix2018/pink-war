import {Assembly,bevelBox,matrix} from './geo.js';
export const SWITCH_VARIANTS=Object.freeze(['breaker','rotary','access','touch']);
export function switchVariant(id=''){
 if(/disj|tableau|demarreur|alimentation|power/.test(id))return 'breaker';
 if(/porte|lecteur|scanner|deverrou|grille|ecluse/.test(id))return 'access';
 if(/pompe|stab|relais/.test(id))return 'rotary';
 return 'touch';
}
// Fits the old cabinet envelope. Geometry only: interaction IDs, ray targets,
// collision arrays and mission progression continue to belong to their callers.
export function createModernSwitch(T,parent,{x=0,y=0,z=0,scale=1,variant='breaker',id=null,label='CIRCUIT',onLabel='VALIDÉ',offLabel='EN ATTENTE',materials={},batch=null,low=false}={}){
 if(!SWITCH_VARIANTS.includes(variant))throw new Error('Unknown switch variant: '+variant);
 const root=new T.Group();root.name='Commande / '+variant;root.userData.switchVariant=variant;root.userData.controlId=id;root.position.set(x,y,z);root.scale.setScalar(scale);parent.add(root);
 const owned=[],textures=[],a=new Assembly();let disposed=false,lastState='',active=false,available=true;
 const own=m=>(owned.push(m),m),standard=(color,metalness=.6,roughness=.4)=>own(new T.MeshStandardMaterial({color,metalness,roughness}));
 const metal=materials.metal||materials.steel||standard(0x738698),paint=materials.paint||standard(0x243442,.55,.36),dark=materials.dark||standard(0x0b1420,.3,.55);
 const accent=standard(variant==='breaker'?0xd5ab42:variant==='access'?0x406a83:0x537184,.7,.35);
 const status=own(new T.MeshBasicMaterial({color:0xffbf5e,toneMapped:false}));
 const box=(s,p,m=paint,r=[0,0,0])=>{const g=bevelBox(...s,Math.min(.035,Math.min(...s)*.23),1);a.add(g,m,matrix(p,r));g.dispose();};
 const cyl=(r,h,p,m=metal,n=low?12:20)=>{const g=new T.CylinderGeometry(r,r,h,n).rotateX(Math.PI/2);a.add(g,m,matrix(p));g.dispose();};
 const ring=(r,t,p,m=metal,arc=Math.PI*2,rotation=0)=>{const g=new T.TorusGeometry(r,t,5,low?20:32,arc).rotateZ(rotation);a.add(g,m,matrix(p));g.dispose();};
 const width=variant==='access'?.42:variant==='touch'?.80:.72,height=variant==='access'?1.12:variant==='touch'?.83:1.12;
 box([width,height,.095],[0,0,0],metal);box([width-.035,height-.035,.11],[0,0,.045]);box([width-.11,height-.13,.035],[0,0,.115],dark);
 for(const side of [-1,1]){box([.024,height*.62,.025],[side*(width/2-.045),-.02,.12],accent);for(const yy of [-height*.42,height*.42])cyl(.018,.012,[side*(width/2-.044),yy,.109],metal,6);}
 for(let i=0;i<4;i++)box([.12,.012,.018],[(i-1.5)*.135,-height/2+.07,.145],dark);
 const pivot=new T.Group();pivot.name='Commande mobile';pivot.position.set(0,-.12,.18);root.add(pivot);
 const dynamic=new Assembly();
 if(variant==='breaker'){
  for(const side of [-1,1]){box([.06,.44,.13],[side*.225,-.13,.18],accent);box([.065,.065,.21],[side*.225,.09,.15],metal);}
  cyl(.10,.045,[0,-.10,.17],metal);
  dynamic.box(metal,[.24,.12,.06],[0,0,0]);
  for(const side of [-1,1])dynamic.limb(metal,[side*.08,0,0],[side*.08,-.20,.10],.026,.026,false);
  dynamic.box(dark,[.32,.09,.10],[0,-.21,.10],[],.025,false);dynamic.box(accent,[.21,.025,.015],[0,-.21,.161],[],.006,false);
 }else if(variant==='rotary'){
  ring(.235,.022,[0,-.13,.154],metal);ring(.19,.012,[0,-.13,.17],accent,Math.PI*1.5,Math.PI*.75);
  for(let i=0;i<9;i++){const ang=Math.PI*.75+i*Math.PI*1.5/8;cyl(.009,.012,[Math.cos(ang)*.265,-.13+Math.sin(ang)*.265,.16],metal,6);}
  const g=new T.CylinderGeometry(.145,.16,.105,low?12:24).rotateX(Math.PI/2);dynamic.add(g,dark);g.dispose();
  dynamic.box(metal,[.052,.22,.047],[0,0,.075],[],.012,false);dynamic.box(accent,[.025,.07,.012],[0,.075,.102],[],.003,false);
 }else if(variant==='access'){
  ring(.105,.014,[0,-.12,.155],metal);ring(.075,.009,[0,-.12,.164],accent,Math.PI*1.45,.4);
  box([.20,.045,.035],[0,-.34,.16],metal);box([.135,.012,.012],[0,-.34,.182],dark);
  for(let i=0;i<3;i++)ring(.029+i*.019,.003,[0,-.12,.17],metal,Math.PI*1.5,.35);
 }else{
  box([.61,.37,.025],[0,-.015,.15],metal);
  box([.56,.32,.018],[0,-.015,.17],dark);
  ring(.07,.009,[.23,-.28,.16],metal);cyl(.049,.015,[.23,-.28,.17],accent);
  for(let i=0;i<3;i++)box([.08,.013,.012],[-.20+i*.11,-.28,.16],metal);
 }
 // Merge static hardware with the containing cabinet if it already has a batch.
 if(batch){root.updateMatrix();for(const p of a.items)batch.add(p.geometry,p.material,root.matrix);}
 else a.build(root);
 for(const p of a.items)p.geometry.dispose();a.items.length=0;
 if(dynamic.items.length)dynamic.build(pivot);
 for(const p of dynamic.items)p.geometry.dispose();dynamic.items.length=0;
 const light=new T.Mesh(new T.TorusGeometry(variant==='access'?.117:.034,.006,5,low?20:32),status);light.position.set(variant==='access'?0:width/2-.13,variant==='access'?-.12:-height/2+.14,.177);root.add(light);
 const screenW=width-.18,screenH=variant==='touch'?.27:.18,screenY=variant==='touch'?-.015:height/2-.21;
 let context=null,texture=null;
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=192;context=canvas.getContext('2d');texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;textures.push(texture);
 }
 const screenMaterial=own(new T.MeshBasicMaterial({map:texture,color:texture?0xffffff:0x28627a,toneMapped:false}));
 const screen=new T.Mesh(new T.PlaneGeometry(screenW,screenH),screenMaterial);screen.position.set(0,screenY,.186);root.add(screen);
 function draw(state){if(!context||state===lastState)return;lastState=state;const c=context;c.fillStyle='#07131e';c.fillRect(0,0,512,192);const color=active?'#76ffca':available?'#ffd080':'#7f99ad';c.fillStyle=color;c.fillRect(15,16,4,160);c.font='600 27px sans-serif';c.fillText(label.toUpperCase().slice(0,28),35,45,450);c.font='700 34px sans-serif';c.fillText(active?onLabel:available?offLabel:'VERROUILLÉ',35,102,450);c.font='18px monospace';c.fillText(active?'●  ACTION CONFIRMÉE':available?'○  COMMANDE DISPONIBLE':'—  ACCÈS EN ATTENTE',35,148,450);for(let i=0;i<8;i++){c.fillStyle=i<(active?8:available?4:1)?color:'#203444';c.fillRect(35+i*54,167,42,6);}texture.needsUpdate=true;}
 function setState(value,{available:enabled=true,dt=1/60}={}){
  active=!!value;available=!!enabled;status.color.setHex(active?0x65ffd0:available?0xffbc66:0x30485b);draw(active+':'+available);
  const alpha=1-Math.exp(-Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0))*16);
  if(variant==='breaker')pivot.rotation.x+=((active?-1.1:-.12)-pivot.rotation.x)*alpha;
  if(variant==='rotary')pivot.rotation.z+=((active?-Math.PI*.65:Math.PI*.65)-pivot.rotation.z)*alpha;
  root.userData.controlState=active?'done':available?'ready':'locked';
 }
 setState(false);
 return {root,pivot,variant,setState,dispose(){if(disposed)return;disposed=true;root.removeFromParent();const geos=new Set();root.traverse(o=>{if(o.geometry)geos.add(o.geometry);});geos.forEach(g=>g.dispose());owned.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
