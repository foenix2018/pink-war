// W02 - Bas-Niveaux de Vesper. Modular district hard-surface art v2.
// Decorative geometry deliberately does not change pathing. Collider hulls are
// placed independently of detail: no false floors, no blockage from signage.
import {createDistrictSignage} from './level2-signage.js';
import {createDistrictUtilities} from './district-utility-details.js';
import {createHardSurfaceFurniture} from './realistic-furniture.js';
export function createDistrictArchitecture({T,root,materials,solid,beam,sign,collisions,low,rng}){
  const C=materials,signs=createDistrictSignage(T,{performance:low}),utilities=createDistrictUtilities(T,{low,materials:C});
  const stats={buildings:0,recessedWindows:0,brokenWindows:0,masonryBays:0};
  const ringGeo=new T.TorusGeometry(1,.07,6,32);
  const prism=(x,y,z,w,h,d,mat,top=1)=>{
    const mesh=new T.Mesh(new T.CylinderGeometry(top,1,h,8,1,false,Math.PI/8),mat);
    mesh.scale.set(w*.48,1,d*.48);mesh.position.set(x,y+h/2,z);
    mesh.castShadow=!low;mesh.receiveShadow=true;root.add(mesh);
    return mesh;
  };
  const cyl=(x,y,z,r,h,mat,seg=12)=>{
    const obj=new T.Mesh(new T.CylinderGeometry(r,r,h,seg),mat);
    obj.position.set(x,y,z);root.add(obj);return obj;
  };
  const thin=(x,y,z,w,h,d,m)=>solid(x,y,z,w,h,d,m,false,false);
  const glassBlue=C.glass,stainless=C.iron,signage=C.cyan,black=C.black;
  const darkTrim=new T.MeshStandardMaterial({color:0x111b27,roughness:.54,metalness:.62});
  const ceramic=new T.MeshStandardMaterial({color:0x536478,roughness:.44,metalness:.3});
  const pastel=new T.MeshStandardMaterial({color:0x2d5065,roughness:.58,metalness:.35});
  const brushed=new T.MeshStandardMaterial({color:0x283544,roughness:.41,metalness:.77});
  const glass=new T.MeshPhysicalMaterial({color:0x173847,metalness:.13,roughness:.13,transparent:true,opacity:.75,depthWrite:true});
  const copper=new T.MeshStandardMaterial({color:0x765c49,roughness:.55,metalness:.7});
  const runoff=new T.MeshBasicMaterial({color:0x101b27,transparent:true,opacity:.19,depthWrite:false});
  const oxidation=new T.MeshStandardMaterial({color:0x63524c,roughness:.89,metalness:.25});
  const dirty=new T.MeshStandardMaterial({color:0x41545b,metalness:.12,roughness:.92});
  const warm=new T.MeshBasicMaterial({color:0xffc38b,toneMapped:false});
  const furniture=createHardSurfaceFurniture(T,root,{low,M:{steel:stainless,paintedMetal:ceramic,dark:black,woodDark:brushed,wood:pastel,fabric:dirty,paper:ceramic,cyan:C.cyan,glass:C.glass}});
  const violet=new T.MeshBasicMaterial({color:0xa567ef,toneMapped:false});
  const red=new T.MeshBasicMaterial({color:0xdd5e52,toneMapped:false});
  const lit=[signage,C.amber,C.blue,warm,violet];
  function panel(x,y,z,sx,sy,m=ceramic,side=1){
    thin(x,y,z,.10,sx,sy,m);
    thin(x-side*.08,y+sx*.45,z,.16,.08,sy,m===ceramic?darkTrim:brushed);
  }
  function archRail(ax,bx,y,z,mat=stainless){
    for(let x=ax;x<=bx+.01;x+=2.1)beam([x,y,z],[x,y+1.16,z],.048,mat,8);
    beam([ax,y+1.12,z],[bx,y+1.12,z],.066,mat,8);
  }
  function balcony(x,y,z,span,side,glowing=false){
    const front=x-side*1.2;
    thin(front,y,z,2.7,.17,span,brushed);
    thin(front-side*.15,y-.26,z,2.6,.39,span,stainless);
    const count=Math.max(2,Math.floor(span/2.1));
    for(let j=0;j<=count;j++){
      const zz=z-span/2+j*span/count;
      beam([front-side*1.12,y,zz],[front-side*1.12,y+1.18,zz],.047,stainless,8);
    }
    beam([front-side*1.12,y+1.13,z-span/2],[front-side*1.12,y+1.13,z+span/2],.055,stainless,8);
    if(glowing)thin(front-side*1.08,y-.09,z,.11,.035,span,C.cyan);
  }
  function advertisement(text,x,y,z,w,h,side=1){
    const mesh=signs.create(text,{width:Math.min(w,1.4),height:Math.min(h,2.0),poster:true});
    mesh.rotation.y=-side*Math.PI/2;mesh.position.set(x,Math.min(y,2.5),z);root.add(mesh);return mesh;
  }
  const masonry=new T.MeshStandardMaterial({color:0x83756b,roughness:.95,metalness:0});
  const metricBoxes=new Map();
  function fabric(x,y,z,w,h,d,material=masonry){
    const brick=material===masonry,key=[w,h,d,brick].join(':');let geometry=metricBoxes.get(key);
    if(!geometry){geometry=new T.BoxGeometry(w,h,d);const p=geometry.attributes?.position,n=geometry.attributes?.normal,uv=geometry.attributes?.uv;
      if(p&&n&&uv){for(let i=0;i<p.count;i++){const side=Math.abs(n.getX(i))>.5,top=Math.abs(n.getY(i))>.5;uv.setXY(i,(side?p.getZ(i):p.getX(i))/(brick?2:8),(top?p.getZ(i):p.getY(i))/(brick?2:16));}uv.needsUpdate=true;}metricBoxes.set(key,geometry);}
    const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=!low;mesh.receiveShadow=true;mesh.userData.staticBox=true;root.add(mesh);return mesh;
  }
  function facadeFin(x,y,z,h,side,accent){
    thin(x,y,z,.22,h,.18,brushed);
    thin(x-side*.13,y,z,.08,h*.76,.08,accent);
  }
  function roofSet(x,z,y,w,d){
    thin(x,y,z,w*.79,.32,d*.85,brushed);
    for(let i=0;i<4;i++){
      const sx=x+(i%2?1:-1)*w*.17,sz=z+(i>1?1:-1)*d*.22;
      cyl(sx,y+.65,sz,.58,1.2,stainless);
      cyl(sx,y+1.3,sz,.65,.20,brushed);
      beam([sx,y+1.4,sz],[sx,y+3.4,sz],.035,copper,8);
    }
    thin(x,y+.6,z-2,3.6,1.2,1.7,stainless);
    for(let k=0;k<8;k++)thin(x-1.55+k*.43,y+1.35,z-2,.12,.1,1.76,brushed);
  }
  function techWrap(x,z,side,h,d){
    const front=x-side*.20;
    for(let y=6;y<h-3;y+=6.6) {
      const ly=(((y/6.6)|0)%3===0)?C.amber:C.cyan;
      thin(front-side*.06,y,z,.12,.055,d*.77,ly);
      if(y<h-8)balcony(front,y+.55,z,d*.80,side,y%2>0);
    }
    for(const nz of [-d*.36,d*.36]){
      beam([front-side*.38,1.6,z+nz],[front-side*.38,h-2,z+nz],.095,copper,10);
      for(let k=0;k<5;k++){const yy=4+k*(h-7)/5;beam([front-side*.38,yy,z+nz],[front-side*1.25,yy,z+nz],.047,stainless,7);}
    }
  }
  function residentialTower(side,z,idx){
    const x=side*(23+(idx%2)*3),height=24+(idx*7%28),w=18+(idx%3)*3,d=17;
    collisions.push({x,z,hx:w/2,hz:d/2,y:0,height:height+1,surface:'concrete'});
    const front=x-side*w/2,storeys=Math.floor(height/3.2),bays=6,pitch=2.55;
    stats.buildings++;
    // Real rectangular floor plates, masonry piers and recessed glazing share
    // the same facade plane as the collision envelope. Nothing floats in front.
    fabric(x,height*.5,z+8.26,w,height,.48,dirty);fabric(x,height*.5,z-8.26,w,height,.48,dirty);
    fabric(x+side*(w/2-.22),height*.5,z,.44,height,d,ceramic);
    for(let floor=0;floor<storeys;floor++){
      const base=floor*3.2,material=(idx%3===0||floor===0)?masonry:dirty;
      fabric(x,base+.13,z,w,.26,d,ceramic);
      fabric(front+side*.13,base+.58,z,.34,.9,d,material);
      fabric(front+side*.13,base+3.04,z,.34,.30,d,ceramic);
      for(const edge of [-7.94,7.94])fabric(front+side*.12,base+1.94,z+edge,.36,2.1,1.12,material);
      for(let bay=0;bay<bays;bay++){
        const zz=z+(bay-(bays-1)/2)*pitch,wy=base+1.94,damaged=(idx*11+floor*7+bay*3)%13<3;
        fabric(front+side*.12,wy,zz-1.18,.36,2.1,.26,material);stats.masonryBays++;
        if(floor===0&&bay===4){fabric(front+side*.13,wy,zz,.34,2.1,2.25,material);continue;}
        fabric(front+side*.30,wy,zz,.08,1.82,2.03,black);
        // Glazing and steel frame sit inside a real opening, not on a solid prism.
        const glowOn=!damaged&&(idx+floor*3+bay)%17===0;
        const pane=glowOn?warm:glassBlue;
        if(!damaged){const window=fabric(front+side*.22,wy,zz,.025,1.62,1.83,pane);window.userData.facadeWindow={front,side};}
        else{fabric(front+side*.22,wy+.53,zz-.62,.025,.55,.45,glassBlue);stats.brokenWindows++;}
        for(const offset of [-.94,.94])fabric(front+side*.03,wy,zz+offset,.15,1.92,.065,brushed);
        for(const offset of [-.87,.87])fabric(front+side*.03,wy+offset,zz,.17,.07,1.95,brushed);
        fabric(front-side*.10,wy-.96,zz,.42,.10,2.14,ceramic);stats.recessedWindows++;
        if(!damaged&&bay%3===1)fabric(front+side*.06,wy,zz,.12,1.73,.045,brushed);
      }
      // Balconies remain outside the playable stair envelope (x = ±10.6 m).
      if(floor>0&&floor%3===1){const bx=front-side*.54,bz=z+(idx%2?3.4:-3.4);
        fabric(bx,base+.22,bz,1.42,.19,4.6,brushed);
        for(const dz of [-2.18,0,2.18])beam([bx-side*.64,base+.30,bz+dz],[bx-side*.64,base+1.37,bz+dz],.035,stainless,6);
        beam([bx-side*.64,base+1.37,bz-2.2],[bx-side*.64,base+1.37,bz+2.2],.043,stainless,7);
      }
    }
    // Damaged parapet, services and supported rooftop plant finish the silhouette.
    const roof=storeys*3.2;fabric(x,roof+.14,z,w,.28,d,ceramic);
    for(let j=0;j<8;j++)if((j+idx)%5!==0)fabric(front,roof+.64,z-7+j*2,.5,.8,1.6,materialForRoof(idx));
    roofSet(x,z,roof+.27,w,d);
    for(const zz of [z-6.7,z+6.7]){beam([front-side*.18,.5,zz],[front-side*.18,roof-.3,zz],.055,copper,8);}
    for(let n=0;n<7;n++)thin(front-side*.07,1.8+n*2.9,z+(n%3-1)*4.5,.025,2.3,.34,runoff);
    advertisement(idx%3===0?'HELIX':idx%3===1?'ÉVACUATION':'AVIS DE RECHERCHE',front-side*.075,1.94,z+3.825,1.05,1.55,side);
    sign(['CLINIQUE 07','TRANSIT','ARCHIVES','ATELIER','ALIMENTATION','RELAIS'][idx%6],front-side*.21,4.05,z-3.5,2.7,'#b9b7ab',side);
  }
  function materialForRoof(idx){return idx%2?dirty:ceramic;}
  function occupiedMarket(side,z){
    // Tented passage with *no* facade wall across the doorway.
    const x=side*21,w=13,d=16,front=side*12.2,back=side*27;
    thin(side*19.8,-.06,z,15.4,.12,d,C.concrete);
    thin(x,8.7,z,w,.38,d,brushed);
    thin(x,9.1,z,w-.4,.08,d-.4,C.iron);
    solid(back,4.1,z,.9,8.2,d,dirty,true);
    for(const zz of [z-d/2+.55,z+d/2-.55]){
      solid(side*20.5,3.9,zz,w-.5,7.8,.55,dirty,true);
      thin(side*20.5,7.6,zz,w-.5,.22,.76,brushed);
    }
    // Shutters open through a 5 m entrance, closed in side units.
    for(const zz of [z-5.4,z+5.4]){
      for(let yy=.6;yy<4.3;yy+=.30)thin(front,yy,zz,.23,.16,3.1,brushed);
    }
    beam([front,7.8,z-7.5],[front,7.8,z+7.5],.12,copper);
    for(let k=0;k<3;k++){
      const zz=z-5+k*5.1;
      // Real counter with open rear, recessed fronts, structural feet and drawers.
      // Its unchanged 3m x 1.5m footprint does not close the market entrance.
      furniture.dress({kind:'reception',x:side*19,z:zz,hx:1.50,hz:.75,height:1.06});
      thin(side*17.4,2.4,zz,.12,1.2,2.2,dirty);
      for(let j=0;j<3;j++)thin(side*(18.6+j*.55),1.17,zz, .24,.2,.65,k%2?C.warning:C.rust);
      thin(side*22,3.5,zz,1.8,.13,3.2,brushed);
      for(let j=0;j<3;j++)thin(side*(21+j*.8),3,zz-.1,.1,1.7,.1,copper);
    }
    // Folded translucent tarpaulins: organic angular profiles among metalwork.
    for(let k=0;k<3;k++){
      const cloth=new T.Mesh(new T.PlaneGeometry(4.6,3.8,3,2),
        new T.MeshStandardMaterial({color:k%2?0x436173:0x645143,roughness:.91,metalness:0,side:T.DoubleSide,transparent:true,opacity:.84}));
      cloth.position.set(side*17.8,7.5,z-5+k*5);
      cloth.rotation.set(-Math.PI/2+.2,side*.10,Math.sin(k*.7)*.11);root.add(cloth);
      beam([side*15,7.4,z-6+k*5],[side*23,7.8,z-6+k*5],.04,copper);
    }
    for(const dz of [-7.4,-3.2])beam([front,.1,z+dz],[front,8.7,z+dz],.065,stainless,8);
    thin(front+side*.1,6.5,z-5.3,.24,1.4,4.0,brushed);
    sign('MARCHE 07',front-side*.06,6.5,z-5.3,3.8,'#f5b466',side);
    sign('RESEAU',side*26.45,5,z+4,2.9,'#60d5e6',side);
    for(let i=0;i<4;i++){
      const xx=side*(15.0+i*2.5),zz=z+5.2;
      thin(xx,.4,zz,1.55,.8,.66,copper);
      thin(xx,.84,zz,1.68,.09,.76,C.warning);
    }
  }
  function hydrant(x,z){utilities.hydrant(x,z);}
  function generator(x,z,side){
    utilities.generator(x,z,side);
    collisions.push({x,z,hx:.76,hz:.39,y:0,height:1.4,surface:'metal'});
  }
  function neonMonorail(){
    // A continuous non-blocking transit spine above the street.
    for(let z=65;z>-68;z-=12){
      for(const side of [-1,1]){
        const x=side*12.8;
        beam([x,10.5,z],[x,21,z],.22,C.iron,10);
        beam([x,20,z],[side*8.7,21.4,z],.13,C.iron,10);
      }
    }
    for(let z=65;z>-68;z-=12){
      thin(0,20.8,z,18.2,.42,.73,brushed);
      thin(0,20.55,z,17.8,.07,.3,darkTrim);
    }
    for(let side of [-1,1])beam([side*8.8,20.8,67],[side*8.8,20.8,-68],.24,stainless,10);
  }
  function coolingUnit(x,z){
    utilities.cooler(x,z);
  }
  function narrativeClutter(){
    // Enclave / LD07 medical dormitory: stretchers, canisters, transformer,
    // captured broadcasts and emergency glow.
    for(let i=0;i<3;i++){
      const zz=56+i*2.1;
      furniture.stretcher(-7,zz,{width:1.14,length:1.70});
    }
    generator(7,48,1);
    for(let z=48;z>28;z-=7){
      hydrant(-8.5,z+1);
      coolingUnit(7.8,z-1);
    }
    for(const z of [18,7,-14,-31,-49]){
      generator(8,z,1);
      const pole=8.2;
      beam([pole,2,z+1],[pole,6.8,z+1],.09,copper);
      // Service inspection luminaire: actual visor, housing, grille and emissive lens.
      // No floating neon octahedron pretending to be a street fixture.
      thin(pole,6.78,z+1,.93,.15,.63,brushed);
      thin(pole,6.67,z+1,.74,.11,.48,C.black);
      thin(pole,6.61,z+1,.60,.032,.36,z%2?C.amber:C.cyan);
      for(const side of [-1,1])thin(pole+side*.37,6.70,z+1,.055,.20,.56,C.iron);
    }
    // Duct clusters, stacked service boxes and low-lying local vapour.
    for(let z=38;z>-64;z-=13){
      const side=z%2?1:-1;
      for(let j=0;j<2;j++){
        thin(side*(7.5+j*.7),.85,z+j*1.5,1.05,1.7,1.5,j?copper:stainless);
        thin(side*(7.5+j*.7),1.75,z+j*1.5,1.08,.12,1.64,brushed);
      }
      const texture=document.createElement('canvas');texture.width=texture.height=128;
      const c=texture.getContext('2d'),gr=c.createRadialGradient(64,64,4,64,64,62);
      gr.addColorStop(0,'rgba(190,225,222,.23)');gr.addColorStop(.6,'rgba(116,181,187,.09)');gr.addColorStop(1,'rgba(95,130,142,0)');
      c.fillStyle=gr;c.fillRect(0,0,128,128);
      const fog=new T.Mesh(new T.PlaneGeometry(5.5,3.5),new T.MeshBasicMaterial({
        map:new T.CanvasTexture(texture),transparent:true,opacity:.35,depthWrite:false,side:T.DoubleSide
      }));
      fog.position.set(side*6.8,1.5,z-1);fog.rotation.y=side*Math.PI*.4;root.add(fog);
    }
    // Transit checkpoint gate gets an elliptical double-skin rather than cuboid.
    const torus=new T.Mesh(new T.TorusGeometry(5.25,.21,10,50,Math.PI),C.cyan);
    torus.rotation.z=Math.PI/2;torus.position.set(0,6,-62.5);root.add(torus);
    for(let i=0;i<7;i++){
      const z=-48-i*2;
      thin(-7,5.3,z,.2,.12,1.5,C.amber);
      beam([-7,0,z],[-7,10.3,z],.09,C.iron);
    }
  }
  return {residentialTower,occupiedMarket,stats,signs,pbrTargets:{ceramic,brushed,dirty,copper,darkTrim,pastel,masonry},decorate(){
    neonMonorail();narrativeClutter();
    const furnished=furniture.finish();stats.furnitureCount=furnished.objects;
    stats.furnitureBatches=furnished.batches;stats.furnitureTriangles=furnished.triangles;
    const result=utilities.build(root);stats.utilityHydrants=result.hydrants;
    stats.utilityGenerators=result.generators;stats.utilityCoolingUnits=result.coolers;stats.utilityBatches=result.batches;stats.utilityTriangles=result.triangles;
  }};
}
