import {createVesperSurfaces} from './vesper-surfaces.js';
import {createPhotoResponse,createWorldRadiance} from './world-material-response.js';

export function createM11Materials(T,scene,{low=false}={}){
 const loader=new T.TextureLoader(),photo=createPhotoResponse(T,{low,loader}),maps=new Map();
 const materials={},finish=createVesperSurfaces(T,{low});
 function scanned(name,color,roughness,metalness,source,tile){
  if(!maps.has(source)){
   const tex=loader.load(source);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;
   tex.anisotropy=low?2:6;maps.set(source,tex);
  }
  const material=new T.MeshStandardMaterial({name:'M11 · '+name,color,roughness,metalness,map:maps.get(source)});
  material.userData.tile=tile;
  materials[name]=photo.bind(material,source);
 }
 function solid(name,color,roughness=.74,metalness=.1,options={}){
  materials[name]=new T.MeshStandardMaterial({name:'M11 · '+name,color,roughness,metalness,...options});
 }
 const cc=name=>'./assets/cc0/'+name+'_diff_512.jpg';
 const scan=name=>'./assets/ligne9/l9-'+name+'_diff_512.jpg';
 scanned('concrete',0xb4ad9e,.97,.015,scan('concrete_wall_006'),3.2);
 scanned('brick',0x9b7760,.96,.02,scan('concrete_wall_006'),2.5);
 scanned('rock',0x797678,1,0,scan('concrete_wall_006'),5.4);
 scanned('wetRock',0x545955,.77,.04,scan('concrete_wall_006'),3.2);
 scanned('road',0x8b8982,.95,.015,cc('asphalt_03'),4.2);
 scanned('deck',0xa9aaa2,.85,.24,scan('metal_plate'),2.2);
 scanned('steel',0x8e9798,.67,.54,scan('metal_plate'),1.9);
 scanned('paint',0x7f8983,.77,.39,cc('rusty_painted_metal'),2.0);
 scanned('gate',0x94948e,.78,.50,scan('rusted_shutter'),2.0);
 solid('dark',0x252c2f,.68,.43);
 solid('edge',0x616d6a,.55,.68);
 solid('gold',0x9b7953,.64,.46);
 solid('rubber',0x222524,.89,.04);
 solid('rust',0x694f43,.9,.25);
 solid('white',0xc2bfb0,.60,.33);
 solid('cloth',0xbeb5a1,.99,0,{side:T.DoubleSide,forceSinglePass:true});
 solid('clothShadow',0x9d9787,.98,0,{side:T.DoubleSide,forceSinglePass:true});
 for(const name of ['cloth','clothShadow']){finish.apply(materials[name],'fabric');materials[name].userData.tile=.28;}
 solid('paintRed',0x8f4134,.79,.19);
 solid('glass',0x506d76,.22,.53);
 solid('warmglass',0x666151,.45,.22,{emissive:0xda9553,emissiveIntensity:.16});
 solid('coldglass',0x36515c,.26,.42,{emissive:0x3f6576,emissiveIntensity:.14});
 solid('leaf',0x535f39,.96,0);
 solid('redleaf',0x79553d,.94,0);
 solid('olive',0x454d35,.92,0);
 for(const name of ['leaf','redleaf'])materials[name].side=T.DoubleSide;
 solid('line',0xb5a084,.92,.02);
 for(const [name,color] of [['red',0xe66e53],['warm',0xffd6a0],['blue',0x72bfc9],['green',0x78d6a1],['pink',0xf652a1]])
  materials[name]=new T.MeshBasicMaterial({name:'M11 · '+name,color,toneMapped:false});
 const light=createWorldRadiance(T,{cool:0x9ca4d2,warm:0xf4a1ba,low});
 scene.environment=light;scene.environmentIntensity=.64;
 return {materials,ready:photo.ready,stats:photo.stats,dispose(){photo.dispose();finish.dispose();for(const map of maps.values())map.dispose();
  if(scene.environment===light)scene.environment=null;light.dispose();for(const m of Object.values(materials))m.dispose();}};
}
