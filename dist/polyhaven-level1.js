// CC0 sources checked against the primary asset pages, 2026-10-14.
// They supplement embedded materials; network access never gates the level.
export const POLYHAVEN_LEVEL1=Object.freeze([
 {id:'broken_brick_wall',name:'Broken Brick Wall',width:1.8,uvMetres:1,targets:['brick'],url:'https://polyhaven.com/a/broken_brick_wall'},
 {id:'concrete_moss',name:'Concrete Moss',width:3,uvMetres:4,targets:['concrete'],url:'https://polyhaven.com/a/concrete_moss'},
 {id:'rusty_metal_sheet',name:'Rusty Metal Sheet',width:2,uvMetres:4,targets:['rust','car-blue','car-cream'],url:'https://polyhaven.com/a/rusty_metal_sheet'},
 {id:'worn_asphalt',name:'Worn Asphalt',width:2,uvMetres:4,targets:['road'],url:'https://polyhaven.com/a/worn_asphalt'}
]);
export function createPolyHavenLayer(T,materials,{quality='auto',fetchImage=null,timeout=6000}={}){
 const owned=[],state={source:'Poly Haven / CC0',requested:0,loaded:0,failed:0,pending:false,applied:[],resolution:quality==='low'?512:1024};const controllers=new Set();let started=false,disposed=false;
 const imageRequest=fetchImage|| (async(url,signal)=>{const r=await fetch(url,{mode:'cors',signal});if(!r.ok)throw new Error(`Texture HTTP ${r.status}`);return createImageBitmap(await r.blob(),{imageOrientation:'flipY',premultiplyAlpha:'none',colorSpaceConversion:'none'});});
 async function load(asset){
  const controller=new AbortController(),downloaded=[];controllers.add(controller);let timer;
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Texture timed out'));},timeout);});
  const base=`https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/${asset.id}/${asset.id}_`;
  const specs=[['diff','map'],['nor_gl','normalMap'],['rough','roughnessMap']];state.requested+=specs.length;
  try{
   const bitmaps=await Promise.race([Promise.all(specs.map(async([suffix])=>{const bitmap=await imageRequest(base+suffix+'_1k.jpg',controller.signal);if(controller.signal.aborted){bitmap.close?.();throw new Error('Texture cancelled');}downloaded.push(bitmap);return bitmap;})),deadline]);
   if(disposed){bitmaps.forEach(b=>b.close?.());return;}
   const maps=bitmaps.map((bitmap,index)=>{let img=bitmap;if(bitmap.width>state.resolution){const c=document.createElement('canvas');c.width=c.height=state.resolution;c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);bitmap.close?.();img=c;}const tex=new T.Texture(img);tex.flipY=false;tex.needsUpdate=true;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.setScalar(asset.uvMetres/asset.width);tex.anisotropy=quality==='low'?2:4;if(index===0)tex.colorSpace=T.SRGBColorSpace;owned.push(tex);return tex;});
   for(const target of asset.targets){const m=materials[target];if(!m)continue;m.map=maps[0];m.normalMap=maps[1];m.normalScale=new T.Vector2(.45,.45);m.bumpMap=null;m.bumpScale=0;m.roughnessMap=maps[2];m.needsUpdate=true;}
   state.loaded+=3;state.applied.push(asset.id);
  }catch{state.failed+=3;controller.abort();downloaded.forEach(bitmap=>bitmap.close?.());}
  finally{clearTimeout(timer);controllers.delete(controller);}
 }
 function start(){if(started||disposed)return;started=true;state.pending=true;Promise.all(POLYHAVEN_LEVEL1.map(load)).finally(()=>{state.pending=false;});}
 return{start,stats:()=>({...state,applied:[...state.applied]}),dispose(){disposed=true;for(const c of controllers)c.abort();for(const tex of owned){tex.image?.close?.();tex.dispose();}}};
}
