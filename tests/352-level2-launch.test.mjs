import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {syncMenuArtwork} from '../dist/menu-art.js';
import {createDistrictArchitecture} from '../dist/level2-architecture.js';

const text=file=>readFileSync(new URL('../dist/'+file,import.meta.url),'utf8');

test('M02 has own cyberpunk artwork in menu, loading screen, and start page',()=>{
 const cover=text('art/mission02-cover.svg');
 assert.match(cover,/SOUS LES NÉONS/);
 assert.match(cover,/HELIX/);
 const title={textContent:''},description={textContent:''},credit={textContent:''};
 const img=(name)=>({dataset:{ghjuSrc:'art/accueil.webp',lyluSrc:'art/accueil-lylu.webp'},
   attr:{src:'art/accueil.webp'},getAttribute(key){return this.attr[key];},setAttribute(key,value){this.attr[key]=value;}});
 const images=[img('welcome'),img('loading')];
 const root={querySelectorAll:()=>images,getElementById:(id)=>({'loading-title':title,'loading-description':description}[id]),
 querySelector:()=>credit};
 syncMenuArtwork('ghju','campaign2',root);
 assert.ok(images.every(im=>im.attr.src.includes('mission02-cover.svg')));
 assert.match(title.textContent,/Sous les Néons/);
 assert.match(description.textContent,/HELIX/);
 syncMenuArtwork('lylu','campaign2',root);
 assert.ok(images.every(im=>im.attr.src.includes('mission02-cover.svg')));
 syncMenuArtwork('lylu','campaign',root);
 assert.ok(images.every(im=>im.attr.src==='art/accueil-lylu.webp'));
 assert.equal(title.textContent,'Le dernier signal');
 assert.match(text('level2-test.html'),/mission02-cover\.svg/);
});

test('W02 advanced architecture constructs tower, market and transit decor without throwing',()=>{
 class Material{
   constructor(config={}){Object.assign(this,config);}
 }
 class Geometry {constructor(...args){this.args=args;}}
 class Mesh {
   constructor(geometry,material){
     this.geometry=geometry;this.material=material;this.position={set(){}};
     this.scale={set(){},setScalar(){}};this.rotation={set(){}};this.quaternion={setFromUnitVectors(){}};
     this.userData={};this.castShadow=false;this.receiveShadow=false;
   }
 }
 const T={Mesh,MeshStandardMaterial:Material,MeshBasicMaterial:Material,MeshPhysicalMaterial:Material,
   CylinderGeometry:Geometry,TorusGeometry:Geometry,PlaneGeometry:Geometry,
   BoxGeometry:Geometry,OctahedronGeometry:Geometry,CanvasTexture:Geometry,
   DoubleSide:2,SRGBColorSpace:'sRGB'};
 const ctx={fillRect(){},strokeRect(){},fillText(){},stroke(){},moveTo(){},lineTo(){},beginPath(){},
  createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};}};
 const saved=globalThis.document;
 globalThis.document={createElement(){return {width:0,height:0,getContext(){return ctx;}}}};
 try {
   const pieces=[],collisions=[];
   const root={add(o){pieces.push(o);}};
   const mats={iron:new Material(),glass:new Material(),black:new Material(),
      cyan:new Material(),amber:new Material(),blue:new Material(),
      plaster:new Material(),warning:new Material(),wall:new Material(),
      rust:new Material(),dark:new Material()};
   const arch=createDistrictArchitecture({T,root,materials:mats,
    solid:(...args)=>{pieces.push(args);if(args[7]===true)collisions.push(args);return {};},
    beam:(...args)=>{pieces.push(args);return {};},
    sign:(...args)=>{pieces.push(args);return {};},
    collisions,low:false,rng:()=>.7});
   assert.doesNotThrow(()=>arch.residentialTower(1,43,0));
   assert.doesNotThrow(()=>arch.occupiedMarket(-1,20));
   assert.doesNotThrow(()=>arch.decorate());
   assert.ok(collisions.length>1);
   assert.ok(pieces.length>250);
 } finally {
   if(saved===undefined)delete globalThis.document;
   else globalThis.document=saved;
 }
});

test('M02 boot reports its stage and can fall back to WebGL',()=>{
 const js=text('level2-test.js');
 assert.match(js,/bootStep='création de la scène'/);
 assert.match(js,/bootStep='jouabilité'/);
 assert.match(js,/location\.replace\(retry\.href\)/);
 assert.match(js,/createCompatibleRenderer/);
 assert.match(js,/showChapter2Finale/);
 const html=text('level2-test.html');
 assert.match(html,/m02-launch-5/);
});
