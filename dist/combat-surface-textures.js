// Shared local CC0 surfaces. One request per image, views shared by repeat.
// Normal maps are omitted on phone/Quest; material fallbacks survive load errors.
const SURFACES={
 concrete:{diff:'vesper-concrete',data:'concrete_floor',normal:.28},
 asphalt:{diff:'vesper-asphalt',data:'asphalt_03',normal:.24},
 steel:{diff:'vesper-steel',data:'rusty_painted_metal',normal:.13},
 paint:{diff:'rusty_painted_metal',data:'rusty_painted_metal',normal:.22},
 crate:{diff:'vesper-paint',data:'rusty_painted_metal',normal:.18},
 corrugated:{diff:'corrugated_iron',data:'corrugated_iron',normal:.3}
};
export function metricSurfaceUV(geometry,metres=2){
 const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
 if(!uv||!p||!n)return geometry;
 for(let i=0;i<uv.count;i++){
  const x=Math.abs(n.getX(i)),y=Math.abs(n.getY(i)),z=Math.abs(n.getZ(i));
  uv.setXY(i,(x>=y&&x>=z?p.getZ(i):p.getX(i))/metres,(y>=x&&y>=z?p.getZ(i):p.getY(i))/metres);
 }
 uv.needsUpdate=true;return geometry;
}
export function createCombatSurfaceTextures(T,{low=false,detailed=false}={}){
 const bindings=[],requests=new Map(),views=new Map(),owned=new Set(),jobs=[];
 let enabled=false,disposed=false,loaded=0,failed=0,ready=Promise.resolve();
 function image(url){
  if(!requests.has(url))requests.set(url,new Promise(resolve=>{
   new T.TextureLoader().load(url,texture=>{
    if(disposed){texture.dispose();resolve(null);return;}
    owned.add(texture);loaded++;resolve(texture);
   },undefined,()=>{failed++;resolve(null);});
  }));
  return requests.get(url);
 }
 function apply(binding){
  const {material,style,repeat}=binding,preset=SURFACES[style];
  const channels=[['diff','map'],['rough','roughnessMap'],...(low?[]:[['normal','normalMap']])];
  for(const [channel,slot] of channels){
   const scanned=detailed&&['concrete','asphalt'].includes(style),resolution=scanned&&!low?'1k':'512';
   const url=`./assets/cc0/${channel==='diff'&&!scanned?preset.diff:preset.data}_${channel}_${resolution}.jpg`;
   jobs.push(image(url).then(source=>{
    if(!source||disposed)return;
    const key=url+':'+repeat.join(',');
    if(!views.has(key)){
     const texture=source.clone();texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(...repeat);
     texture.colorSpace=channel==='diff'?T.SRGBColorSpace:T.NoColorSpace;texture.anisotropy=low?2:4;texture.needsUpdate=true;
     views.set(key,texture);owned.add(texture);
    }
    material[slot]=views.get(key);
    if(channel==='diff')material.bumpMap=null;
    if(channel==='normal')material.normalScale.set(preset.normal*(detailed?1.65:1),preset.normal*(detailed?1.65:1));
    material.needsUpdate=true;
   }));
  }
 }
 function bind(material,style,repeat=[1,1]){
  if(disposed||!material)return;
  if(!SURFACES[style])throw new Error('Unknown combat surface: '+style);
  if(bindings.some(b=>b.material===material))return;
  const binding={material,style,repeat:[...repeat]};bindings.push(binding);material.userData.combatSurface=style;
  if(enabled){apply(binding);ready=Promise.all(jobs);}
 }
 function enable(){
  if(enabled||disposed||typeof document==='undefined')return ready;
  enabled=true;for(const b of bindings)apply(b);ready=Promise.all(jobs);return ready;
 }
 function dispose(){if(disposed)return;disposed=true;for(const t of owned)t.dispose();owned.clear();views.clear();bindings.length=0;}
 return {bind,enable,dispose,get ready(){return ready;},stats:()=>({enabled,loaded,failed,images:requests.size,views:views.size,materials:bindings.length,normalMaps:!low,resolution:detailed&&!low?1024:512})};
}
