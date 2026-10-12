import * as T from './vendor/three.webgpu.min.js';
import { bevelBox, merge } from './geo.js';

// The city is built from a small set of instanced, weathered surfaces. Its neutral
// materials remain legible in both character palettes and in the two Quest views.
function randomSource(seed = 4107) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}
function texture(size, paint, repeat = 1) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  paint(canvas.getContext('2d'), size, randomSource());
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping; map.repeat.set(repeat, repeat); map.anisotropy = 4;
  return map;
}
function weatherTexture(kind) {
  return texture(512, (c, n, rand) => {
    const base = kind === 'road' ? [75,80,79] : kind === 'metal' ? [117,119,117] : [157,159,156];
    const pixels = c.createImageData(n,n);
    for (let y=0;y<n;y++) for (let x=0;x<n;x++) {
      const index=(y*n+x)*4, grain=(rand()-.5)*37;
      const mottling=Math.sin(x*.033+Math.sin(y*.047))*7+Math.sin(y*.027+x*.012)*6;
      for(let k=0;k<3;k++)pixels.data[index+k]=base[k]+grain+mottling;
      pixels.data[index+3]=255;
    }
    c.putImageData(pixels,0,0);
    for(let i=0;i<60;i++) {
      const x=rand()*n,y=rand()*n,r=12+rand()*110;
      const g=c.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,kind==='metal'?'rgba(70,35,17,.26)':'rgba(33,41,33,.12)');g.addColorStop(1,'rgba(25,30,22,0)');
      c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
    }
    // Hairline fractures, branch cracks and runoff are visible at hand distance.
    for(let i=0;i<(kind==='road'?22:12);i++) {
      let x=rand()*n,y=rand()*n;c.beginPath();c.moveTo(x,y);
      for(let j=0;j<10;j++){x+=(rand()-.55)*37;y+=8+rand()*13;c.lineTo(x,y);}
      c.strokeStyle=kind==='metal'?'rgba(79,42,21,.26)':'rgba(28,32,29,.48)';c.lineWidth=rand()*1.4+.5;c.stroke();
    }
    if(kind!=='road')for(let i=0;i<24;i++) {
      const x=rand()*n,y=rand()*n;
      const g=c.createLinearGradient(x,y,x,y+140);g.addColorStop(0,'rgba(38,42,33,.19)');g.addColorStop(1,'rgba(38,42,33,0)');
      c.fillStyle=g;c.fillRect(x,y,1+rand()*7,70+rand()*140);
    }
    for(let i=0;i<450;i++){c.fillStyle=rand()>.6?'rgba(220,221,197,.19)':'rgba(20,26,23,.18)';c.fillRect(rand()*n,rand()*n,rand()*2+.5,rand()*2+.5);}
  });
}

// Overcast dawn, smoke banks and filtered sunlight replace the uniform neon sky.
export function paintRuinSky(c,w,h,blue=false) {
  const g=c.createLinearGradient(0,0,0,h);
  const colors=blue?['#071526','#12243a','#263d58','#53728c','#30445b','#15283d']:['#130e22','#272238','#493a55','#7e6478','#423951','#1b2236'];
  [0,.29,.44,.54,.7,1].forEach((stop,i)=>g.addColorStop(stop,colors[i]));c.fillStyle=g;c.fillRect(0,0,w,h);
  const rand=randomSource(85);
  // Broken, overlapping cloud shelves leave a warm opening above the horizon.
  // These are baked into the existing sky map, with no additional VR render pass.
  for(let bank=0;bank<7;bank++) {
    const cx=(bank/7+.035)*w,cy=h*(.21+rand()*.18),span=w*(.06+rand()*.06);
    for(let puff=0;puff<13;puff++) {
      const x=cx+(rand()-.5)*span*2,y=cy+(rand()-.5)*h*.042,rx=span*(.25+rand()*.42),ry=h*(.008+rand()*.022);
      for(const wrap of [-w,0,w]) {
        const cloud=c.createRadialGradient(x+wrap,y,rx*.15,x+wrap,y,rx);
        cloud.addColorStop(0,puff%3?'rgba(42,53,61,.11)':'rgba(227,224,203,.13)');cloud.addColorStop(1,'rgba(85,100,105,0)');
        c.save();c.translate(x+wrap,y);c.scale(1,ry/rx);c.translate(-x-wrap,-y);c.fillStyle=cloud;c.fillRect(x+wrap-rx,y-rx,rx*2,rx*2);c.restore();
      }
    }
  }
  for(let layer=0;layer<3;layer++)for(let i=0;i<18;i++) {
    const x=rand()*w,y=h*(.13+rand()*.37),rx=w*(.055+rand()*.115),ry=h*(.021+rand()*.032);
    const grad=c.createRadialGradient(x,y,0,x,y,rx);
    grad.addColorStop(0,layer===0?'rgba(43,54,62,.12)':'rgba(216,217,206,.075)');grad.addColorStop(1,'rgba(150,154,146,0)');
    c.save();c.translate(x,y);c.scale(1,ry/rx);c.translate(-x,-y);c.fillStyle=grad;c.fillRect(x-rx,y-rx,rx*2,rx*2);c.restore();
  }
  const sun=c.createRadialGradient(w*.26,h*.46,0,w*.26,h*.46,w*.105);
  sun.addColorStop(0,'rgba(147,184,218,.18)');sun.addColorStop(.12,'rgba(120,152,197,.09)');sun.addColorStop(1,'rgba(95,128,164,0)');
  c.fillStyle=sun;c.fillRect(0,0,w,h);
  // Wind draws distant industrial smoke into thin, uneven strata.
  for(let i=0;i<9;i++) {
    const x=(.08+i*.109)*w,y=h*(.45+rand()*.025),length=w*(.04+rand()*.075);
    const smoke=c.createLinearGradient(x,y,x+length,y-h*.018);smoke.addColorStop(0,'rgba(66,71,68,0)');smoke.addColorStop(.35,'rgba(66,71,68,.12)');smoke.addColorStop(1,'rgba(66,71,68,0)');
    c.fillStyle=smoke;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+length*.2,y-h*.017,x+length*.55,y-h*.008,x+length,y-h*.026);c.lineTo(x+length,y-h*.008);c.bezierCurveTo(x+length*.5,y,x+length*.25,y+h*.006,x,y+h*.004);c.closePath();c.fill();
  }
}

function damagedBlock(seed) {
  const geometry=new T.BoxGeometry(1,1,1,3,3,3);const p=geometry.attributes.position;
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const noise=Math.sin(x*43+y*17+z*61+seed*7)*.5+.5;
    const wear=.015+noise*.025;
    p.setXYZ(i,x*(1-wear),y>.45?y-noise*.045:y,z*(1-wear));
  }
  geometry.computeVertexNormals();return geometry;
}

export function createRuinedCity(scene, obstacles, coverWalls, accent=0xff80b2, quality='medium') {
  const group=new T.Group();group.name='Ruined megacity — reclaimed districts';scene.add(group);
  const rand=randomSource(4107), concreteMap=weatherTexture('concrete'), metalMap=weatherTexture('metal'), roadMap=weatherTexture('road');
  const std=(color,roughness=.9,metalness=.04,map=concreteMap)=>new T.MeshStandardMaterial({color,roughness,metalness,map,bumpMap:map,bumpScale:map===metalMap?.018:.047});
  const m={concrete:std(0xb0b5b5),chalk:std(0xc3c7c5),char:std(0x5f6668),road:std(0xa2aaa7,.96,.025,roadMap),
    steel:std(0x727d7a,.7,.58,metalMap),rust:std(0x917055,.94,.25,metalMap),black:std(0x252e2c,.92,.15,metalMap),
    dirt:std(0x615d46,1,0,roadMap),bark:std(0x555548,1,0,concreteMap),leaf:std(0x4c6244,.95,0,null),leafLight:std(0x6b7950,.97,0,null),
    deadLeaf:std(0x8c8763,1,0,null),yellow:std(0xb0a26a,.86,.15,metalMap),accent:new T.MeshBasicMaterial({color:accent,toneMapped:false}),
    glass:new T.MeshStandardMaterial({color:0x233638,roughness:.4,metalness:.6}),lamp:new T.MeshBasicMaterial({color:0xf4d5a2,toneMapped:false})};
  // Real CC0 Poly Haven PBR material sets, opt-in per rendering quality. The original
  // generated maps remain usable immediately and whenever CDN access is unavailable.
  // WebGL and WebGPU share material objects; no extra draw calls are introduced.
  const pbrStatus={loaded:0,failed:0,requested:0,source:'Poly Haven · CC0'};
  const textureLoader=new T.TextureLoader();
  textureLoader.setCrossOrigin('anonymous');
  const maxAnisotropy=quality==='high'?4:2;
  function loadPbr(asset,kind,materials,repeat=1){
    const base='https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/'+asset+'/'+asset+'_';
    const destinations=materials.filter(Boolean);
    for(const [suffix,property] of [['diff','map'],['nor_dx','normalMap'],['rough','roughnessMap']]){
      pbrStatus.requested++;
      textureLoader.load(base+suffix+'_1k.jpg',tex=>{
        tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(repeat,repeat);tex.anisotropy=maxAnisotropy;
        if(property==='map')tex.colorSpace=T.SRGBColorSpace;
        for(const mat of destinations){
          // A normal map supersedes procedural bump; simultaneous bump distorts silhouettes.
          if(property==='normalMap'){mat.bumpMap=null;mat.bumpScale=0;mat.normalScale=new T.Vector2(.52,.52);}
          mat[property]=tex;mat.needsUpdate=true;
        }
        pbrStatus.loaded++;
      },undefined,()=>{pbrStatus.failed++;});
    }
  }
  // 1K source imagery is shared across whole batches and stays independent of the
  // number of concrete, street or metal instances.
  if(quality!=='minimal'){
    loadPbr('asphalt_03','road',[m.road,m.dirt,m.wet],18);
    loadPbr('concrete_floor','concrete',[m.concrete,m.chalk,m.char,m.bark],3);
    loadPbr('broken_brick_wall','brick',[m.brick=m.concrete.clone()],3);
    loadPbr('rusty_metal_sheet','metal',[m.rust,m.steel,m.black,m.yellow],3);
  }
  m.leaf.flatShading=true;m.leafLight.flatShading=true;
  // Cutout foliage has individual leaf silhouettes instead of solid green polyhedra.
  // Three crossed cards remain readable from both headset eyes with a fixed small budget.
  const foliageMap=texture(512,(c,n,r)=>{
    c.clearRect(0,0,n,n);
    for(let i=0;i<100;i++){
      const angle=r()*Math.PI*2,reach=Math.sqrt(r())*205,x=n/2+Math.cos(angle)*reach,y=n/2+Math.sin(angle)*reach*.9;
      c.strokeStyle='rgba(76,84,53,.85)';c.lineWidth=1.3;c.beginPath();c.moveTo(n/2,n/2+160);c.quadraticCurveTo(n/2,y,x,y);c.stroke();
      const len=12+r()*25,w=5+r()*11;c.save();c.translate(x,y);c.rotate(angle+r()*1.4);
      c.beginPath();c.moveTo(0,-len);c.bezierCurveTo(w,-len*.6,w*.9,len*.36,0,len*.7);c.bezierCurveTo(-w,len*.36,-w,-len*.6,0,-len);c.closePath();
      const shade=c.createLinearGradient(-w,0,w,0);shade.addColorStop(0,`rgb(${63+r()*22},${84+r()*25},${44+r()*18})`);shade.addColorStop(.55,`rgb(${100+r()*25},${127+r()*21},${70+r()*24})`);shade.addColorStop(1,'#55663c');c.fillStyle=shade;c.fill();
      c.strokeStyle='rgba(169,178,114,.4)';c.lineWidth=.7;c.beginPath();c.moveTo(0,-len*.8);c.lineTo(0,len*.62);c.stroke();c.restore();
    }
  });
  m.foliage=new T.MeshStandardMaterial({map:foliageMap,roughness:.94,metalness:0,alphaTest:.42,side:T.DoubleSide});
  m.foliageLight=m.foliage.clone();m.foliageLight.color.setHex(0xbac9aa);

  const scarMap=texture(512,(c,n,r)=>{
    c.clearRect(0,0,n,n);
    const paths=[];
    // A subsided asphalt fissure, with broken aggregate at the lip rather than a painted line.
    for(let branch=0;branch<7;branch++) {
      let x=branch?220+r()*90:235,y=branch?80+r()*260:32;const path=[[x,y]],steps=branch?4:15;
      for(let j=0;j<steps;j++){x+=(r()-.5)*43+(branch%2?12:-8);y+=14+r()*19;path.push([x,y]);}
      paths.push(path);
    }
    for(const [lineWidth,color,offset] of [[13,'rgba(80,70,49,.35)',0],[6,'rgba(137,133,108,.6)',2],[3,'rgba(25,29,27,.92)',0]]) {
      c.strokeStyle=color;c.lineWidth=lineWidth;c.lineJoin='round';
      for(const path of paths){c.beginPath();path.forEach(([x,y],i)=>i?c.lineTo(x+offset,y+offset):c.moveTo(x+offset,y+offset));c.stroke();}
    }
    for(const path of paths)for(const [x,y] of path)for(let i=0;i<5;i++){
      const xx=x+(r()-.5)*25,yy=y+(r()-.5)*19;c.fillStyle=r()>.45?'rgba(144,144,119,.55)':'rgba(32,38,30,.7)';c.fillRect(xx,yy,1+r()*4,1+r()*3);
    }
  });
  m.scar=new T.MeshStandardMaterial({map:scarMap,alphaTest:.16,roughness:1,metalness:0,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  // Damp asphalt stays close to the surrounding road's albedo. A very dark,
  // metallic polygon looked like a hole or a painted rectangle at street level.
  m.wet=std(0x96a092,.78,.025,roadMap);
  // The shared road texture spans 200 m on the ground but only a few metres on
  // a puddle; keep its bump amplitude small so its grain does not become ridges.
  m.wet.bumpScale=.001;

  roadMap.repeat.set(18,18);
  const geometry={block:damagedBlock(1),broken:damagedBlock(4),slab:damagedBlock(9),box:new T.BoxGeometry(1,1,1),
    rounded:bevelBox(1,1,1,.06,1),cylinder:new T.CylinderGeometry(1,1,1,12),taper:new T.CylinderGeometry(.68,1,1,10),
    sphere:new T.SphereGeometry(1,12,7),stone:new T.IcosahedronGeometry(1,0),leaves:new T.IcosahedronGeometry(1,1),
    ring:new T.TorusGeometry(1,.07,5,20),decal:new T.PlaneGeometry(1,1),puddle:new T.CircleGeometry(1,24)};
  const puddlePositions=geometry.puddle.attributes.position;
  for(let i=1;i<puddlePositions.count;i++) {
    const angle=Math.atan2(puddlePositions.getY(i),puddlePositions.getX(i));
    const edge=.82+Math.sin(angle*3+.4)*.09+Math.sin(angle*7)*.045;
    puddlePositions.setXY(i,puddlePositions.getX(i)*edge,puddlePositions.getY(i)*edge);
  }
  geometry.puddle.computeBoundingSphere();
  const foliageCards=Array.from({length:3},(_,i)=>new T.PlaneGeometry(2,2).rotateY(i*Math.PI/3));
  geometry.leaves.dispose();geometry.leaves=merge(foliageCards);for(const card of foliageCards)card.dispose();
  const batches=new Map(),custom=new Map();
  const add=(shape,mat,position,scale=[1,1,1],rotation=[0,0,0])=>{
    const key=`${shape}/${mat.uuid}`;if(!batches.has(key))batches.set(key,{geometry:geometry[shape],mat,items:[]});
    const quat=rotation.isQuaternion?rotation:new T.Quaternion().setFromEuler(new T.Euler(...rotation));
    batches.get(key).items.push(new T.Matrix4().compose(new T.Vector3(...position),quat,new T.Vector3(...scale)));
  };
  const cube=(mat,pos,scale,rot=[0,0,0],shape='block')=>add(shape,mat,pos,scale,rot);
  const rod=(mat,a,b,r=.07,r2=r)=>{const start=new T.Vector3(...a),end=new T.Vector3(...b),d=end.clone().sub(start);add(r===r2?'cylinder':'taper',mat,start.add(end).multiplyScalar(.5).toArray(),[r,d.length(),r],new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));};
  const cable=(points,r=.055,mat=m.black)=>{
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    if(!custom.has(mat))custom.set(mat,[]);custom.get(mat).push(new T.TubeGeometry(curve,18,r,5,false));
  };
  const solid=(x,z,w,h,d,extra={})=>obstacles.push({x,z,hx:w/2,hz:d/2,height:h,surface:'concrete',...extra});
  // Distant terrain continues behind the arena wall so the skyline is grounded.
  const hinterland=new T.Mesh(new T.PlaneGeometry(620,620),m.dirt);hinterland.rotation.x=-Math.PI/2;hinterland.position.y=-.08;hinterland.receiveShadow=true;group.add(hinterland);
  const ground=new T.Mesh(new T.PlaneGeometry(200,200),m.road);ground.rotation.x=-Math.PI/2;ground.position.y=-.045;ground.receiveShadow=true;group.add(ground);
  // Worn civic road: seams, aggregate and irregular pavement; no luminous grid.
  for(let z=-94;z<=94;z+=6) {
    if(rand()>.16)cube(m.chalk,[0,.006,z],[.13,.009,1.75],[0,0,0],'box');
    for(const x of [-8.8,8.8])cube(m.concrete,[x,.025,z],[2.05,.10,5.7],[0,(rand()-.5)*.026,0],'slab');
  }
  for(const x of [-7.55,7.55])cube(m.chalk,[x,.007,0],[.07,.012,190],[0,0,0],'box');
  // Crack seams and patches indicate the street's previous function.
  for(let i=0;i<48;i++) {
    const x=(rand()-.5)*178,z=(rand()-.5)*178;
    add('stone',m.dirt,[x,-.033,z],[1+rand()*3,.05,1+rand()*5],[0,rand()*6.28,0]);
  }
  // Human-scale street furniture grounds the larger ruins. Everything here is
  // flush with the road or within the existing 10 cm pavement, so routes stay open.
  for(let z=-86;z<91;z+=19)for(const side of [-1,1]) {
    const x=side*7.3;
    cube(m.black,[x,-.018,z],[.52,.04,.95],[0,0,0],'box');
    for(let j=0;j<7;j++)cube(m.steel,[x,.011,z-.4+j*.13],[.47,.035,.035],[0,0,0],'box');
    cube(m.concrete,[side*7.79,.065,z],[.22,.12,1.38],[0,0,0],'slab');
  }
  for(let i=0;i<(quality==='low'?31:52);i++) {
    const x=(rand()-.5)*178,z=(rand()-.5)*179;
    add('decal',m.scar,[x,-.024,z],[1.4+rand()*3,2.2+rand()*5,1],[-Math.PI/2,0,rand()*Math.PI*2]);
  }
  for(const [x,z,sx,sz] of [[3,12,1.6,3.4],[-4,-8,2.5,1.5],[-5,39,1.4,3],[-21,14,1.7,1.2],[46,-18,2.3,1.1],[-54,54,2.3,1.8]]) {
    add('puddle',m.wet,[x,-.028,z],[sx,sz,1],[-Math.PI/2,0,rand()*6.28]);
    add('decal',m.scar,[x+.6,-.01,z+.3],[sx*2,sz*2,1],[-Math.PI/2,0,rand()*6.28]);
  }
  function ivy(x,y,z,width,height,face=0) {
    for(let j=0;j<Math.ceil(width*1.3);j++) {
      const xx=x+(rand()-.5)*width,top=y+rand()*.8,bottom=Math.max(.1,top-height*(.4+rand()*.6));
      rod(m.bark,[xx,top,z],[xx+Math.sin(j)*.28,bottom,z+.1],.035);
      for(let yy=bottom;yy<top;yy+=.47+rand()*.5)add('leaves',j%3?m.foliage:m.foliageLight,[xx+Math.sin(yy*3)*.2,yy,z],[.28+rand()*.23,.37+rand()*.4,.13+rand()*.1],[0,face,rand()*.8]);
    }
  }
  const structures=[[-31,-21,12,15,12],[29,-32,9,24,10],[-25,24,8,9,8],[38,17,12,17,10],[-52,-56,17,30,12],[52,-61,13,35,14],[-66,28,17,22,13],[66,52,13,18,16],[12,66,10,10,9],[-25,65,10,15,12],[0,-73,16,23,10]];
  structures.forEach(([x,z,w,h,d],index)=>{
    solid(x,z,w,h,d);
    // A recessed, closed interior behind structural floors avoids deceptive open doorways.
    cube(m.char,[x,h*.43,z],[w*.86,h*.86,d*.86],[0,0,0],index%2?'broken':'block');
    const floors=Math.floor(h/3.65);
    for(let i=0;i<=floors;i++) {
      const y=.35+i*3.65,fractured=i>=floors-1;
      cube(i===floors?m.chalk:m.concrete,[x+(fractured?((index%3)-1)*w*.11:0),y,z],[w*(fractured?.68:1),.33,d*(i===floors?.71:1)],[fractured?.025*((index%3)-1):0,0,fractured?.035*((index%2)*2-1):0]);
      for(const side of [-1,1]) {
        for(let xx=-w/2+.45;xx<w/2;xx+=w/3){const columnHeight=i<floors?3.65:.65+Math.abs(Math.sin(xx*2+index))*1.15;cube(m.concrete,[x+xx,y+columnHeight/2,z+side*(d/2-.31)],[.48,columnHeight,.65]);}
        if(i<floors)for(let k=0;k<3;k++) {
          const xx=x-w*.34+k*w*.33;
          if((i+k+index)%4!==0)cube((i+k)%4===0?m.rust:m.glass,[xx,y+1.6,z+side*(d*.46)],[w*.25,2.16,.06],[0,0,0],'box');
          if((i+k+index)%3===0)cube(m.concrete,[xx,y+.58,z+side*(d*.49)],[w*.28,.93,.18]);
          // Recessed mullions, broken shutters and deep sills restore a readable
          // building scale at street level without opening false passages.
          if(i<3) {
            cube(m.black,[xx,y+1.52,z+side*d*.475],[.055,2.26,.08],[0,0,0],'box');
            cube(m.concrete,[xx,y+.52,z+side*d*.473],[w*.28,.09,.27],[0,0,0],'slab');
            if((i+k+index)%5===0)for(let slat=0;slat<4;slat++)cube(m.steel,[xx,y+1.14+slat*.24,z+side*d*.48],[w*.23,.065,.14],[.12,0,slat===3?.05:0],'box');
          }
        }
      }
      for(const side of [-1,1]){const panelHeight=i<floors?3.65:1.1;cube(m.char,[x+side*(w*.46),y+panelHeight/2,z],[.45,panelHeight,d*.9]);}
    }
    // Lost roof sections, snapped uprights, exposed rebar and collapsed slab edges.
    for(let k=0;k<3;k++) {
      const xx=x-w*.33+k*w*.31,hh=1+(index+k)%3;
      cube(k%2?m.char:m.concrete,[xx,h-hh*.5,z-d*.38],[w*.25,hh,d*.16],[0,0,(k-1)*.025]);
      for(let j=0;j<3;j++)rod(m.rust,[xx+(j-1)*.4,h-.9,z-d*.42],[xx+(j-1)*.48+.15,h+.25+rand()*.5,z-d*.42],.032);
    }
    cube(m.chalk,[x+w*.14,h*.82,z+d*.31],[w*.47,.26,d*.30],[.15,.07,-.12]);
    if(x<0)ivy(x,h*.65,z+d*.502,w*.84,h*.65);
    if(index%3===1){const roof=.515+floors*3.65;add('cylinder',m.steel,[x,roof+1.3,z],[w*.12,2.6,w*.12]);rod(m.rust,[x,roof+2.5,z],[x+.3,roof+6.7,z],.07);}
    // Wall-mounted conduits expose the surviving electrical systems.
    rod(m.steel,[x+w*.43,.5,z+d*.51],[x+w*.43,h*.75,z+d*.51],.12);
    if(index%2===0)cube(m.accent,[x+w*.43,h*.67,z+d*.54],[.1,.6,.065],[0,0,0],'box');
    // Ducts and maintenance access occupy the building footprint. Their curves
    // and small fittings break the repeated slab/column silhouette.
    const ductX=x-w*.34,ductZ=z+d*.475,ductY=3.1+(index%3)*.5;
    cube(m.steel,[ductX,ductY,ductZ],[1.45,.87,.38],[0,0,0],'rounded');
    for(let slat=0;slat<6;slat++)cube(m.black,[ductX,ductY-.29+slat*.116,z+d*.497],[1.2,.035,.025],[0,0,0],'box');
    cable([[ductX+.72,ductY,ductZ],[ductX+1.25,ductY,ductZ],[ductX+1.5,ductY+.3,ductZ],[ductX+1.5,Math.min(h*.75,ductY+4),ductZ]],.115,m.steel);
    for(let level=1;level<=3;level++)cube(m.rust,[x+w*.43,level*h*.18,z+d*.508],[.37,.06,.21],[0,0,0],'box');
    if(index%3===2) {
      const roof=.515+floors*3.65;
      add('sphere',m.steel,[x-w*.16,roof+.85,z],[1.4,.24,1.4],[.32,0,.18]);
      rod(m.black,[x-w*.16,roof,z],[x-w*.16+.32,roof+1.55,z+.4],.075);
      cube(m.black,[x+w*.16,roof+.2,z-d*.17],[1.8,.35,1.5],[0,0,0],'rounded');
    }
  });
  // Cover uses exactly the combat footprint; chips remain inside the collision face.
  for(const wall of coverWalls) {
    const {x,z,hx,hz,height:h}=wall;solid(x,z,hx*2,h,hz*2,{cover:true});
    cube(m.brick||m.concrete,[x,h/2,z],[hx*2,h,hz*2]);
    const horizontal=hx>hz,length=horizontal?hx*2:hz*2;
    for(let i=0;i<length;i+=1.1) {
      const p=horizontal?[x-hx+.55+i,h-.09,z]:[x,h-.09,z-hz+.55+i];
      add('stone',m.chalk,p,[horizontal?.38:.22,.17,horizontal?.22:.38],[.2,i*.13,.2]);
    }
    for(const side of [-1,1]) {
      const p=horizontal?[x,h*.55,z+side*(hz+.009)]:[x+side*(hx+.009),h*.55,z];
      cube(m.char,p,horizontal?[length*.7,.11,.016]:[.016,.11,length*.7],[0,0,0],'box');
    }
    // Small identification light, not a continuous neon stripe.
    cube(m.accent,horizontal?[x-hx+.32,h*.67,z+hz+.023]:[x+hx+.023,h*.67,z-hz+.32],horizontal?[.14,.14,.016]:[.016,.14,.14],[0,0,0],'box');
  }
  // Bent, sanded crash barriers retain the useful low cover from the previous map.
  for(const [x,z,w,h,d] of [[-13,-7,4,1.8,3],[15,7,4,2,3],[31,-11,4,1.7,3],[-17,41,4,1.7,3],[20,35,4,2,3],[-35,2,4,2.4,3],[48,-12,4,1.7,3],[-18,35,3.3,1,1.25],[17,44,3.5,1,1.25],[-36,48,3.4,1,1.3],[35,-45,3.8,1,1.2]]) {
    solid(x,z,w,h,d);cube(m.concrete,[x,h*.46,z],[w,h*.92,d]);
    cube(m.rust,[x,h*.9,z],[w*.91,.16,d*.9],[0,.015,.015],'rounded');
  }
  // East: cylindrical condensers, pressure vessels and a still-powered service yard.
  for(const [x,z,w,h,d] of [[53,1,7.3,3,3.2],[70,1,7.3,3,3.2],[53,19,7.3,3,3.2],[70,19,7.3,3,3.2],[-62,-2,7.3,3,3.2],[-62,11,7.3,3,3.2],[-46,0,7.3,3,3.2],[-46,15,7.3,3,3.2]]) {
    solid(x,z,w,h,d,{surface:'metal'});cube(m.char,[x,.31,z],[w,.6,d]);
    // Horizontal tanks break up the former rectangular freight silhouettes.
    add('cylinder',x>0?m.steel:m.rust,[x,1.7,z],[1.24,w*.88,1.24],[0,0,Math.PI/2]);
    for(const side of [-1,1]) {
      add('sphere',x>0?m.steel:m.rust,[x+side*w*.44,1.7,z],[.34,1.24,1.24]);
      add('ring',m.black,[x+side*w*.29,1.7,z],[1.27,1.27,1.27],[0,Math.PI/2,0]);
      cube(m.char,[x+side*w*.29,.62,z],[.35,1.1,d*.92]);
    }
    rod(m.rust,[x,2.9,z],[x,3,z],.25);
    if(x<0)ivy(x,2.85,z+1.28,w*.6,2.7);
  }
  for(const [x,z] of [[-26,-51],[-26,-61],[40,55],[55,55],[-75,64]]) {
    solid(x,z,5.2,2.35,2.8,{surface:'metal'});cube(m.char,[x,.34,z],[5.2,.65,2.8]);
    for(let i=-1;i<=1;i++) {
      add('cylinder',m.steel,[x+i*1.47,1.35,z],[.57,1.8,.57]);
      add('sphere',m.steel,[x+i*1.47,2.13,z],[.57,.2,.57]);
      for(let y=.8;y<2;y+=.23)add('ring',m.black,[x+i*1.47,y,z],[.60,.60,.60],[Math.PI/2,0,0]);
    }
    cube(m.accent,[x,1.4,z+1.12],[.55,.08,.04],[0,0,0],'box');
  }
  // Service pipes and sagging cables connect installations above head height.
  for(const z of [-77,77])for(let x=-82;x<=78;x+=20) {
    rod(m.rust,[x,0,z],[x,5.5,z],.12);rod(m.rust,[x-1.2,5.25,z],[x+1.2,5.25,z],.1);
    if(x<78)for(const offset of [-.4,.4])cable([[x,5.2,z+offset],[x+10,4.4,z+offset],[x+20,5.2,z+offset]],.045);
  }
  cable([[-31,12,-15],[-15,8,-8],[6,8,-13],[29,15,-27]],.075);
  cable([[38,13,12],[45,7,5],[53,3.1,1]],.10,m.rust);
  cable([[-25,7,28],[-38,4,30],[-56,12,34]],.055);
  // West: mature volunteer trees and undergrowth reclaim the archive courtyards.
  function tree(x,z,height,index) {
    solid(x,z,.9,height,.9,{surface:'wood'});
    const lean=(rand()-.5)*1.1;
    rod(m.bark,[x,0,z],[x+lean,height*.67,z+.2],.38,.23);
    for(let j=0;j<5;j++) {
      const angle=j*2.4+index,reach=height*(.20+rand()*.15),tip=[x+lean+Math.sin(angle)*reach,height*(.64+rand()*.25),z+Math.cos(angle)*reach];
      rod(m.bark,[x+lean*.6,height*.44,z+.1],tip,.105,.06);
      for(let k=0;k<4;k++)add('leaves',(k+j)%3?m.foliage:m.foliageLight,[tip[0]+(rand()-.5)*2,tip[1]+rand(),tip[2]+(rand()-.5)*2],[1.1+rand(),.65+rand()*.6,1.1+rand()],[rand()*.4,rand()*6,rand()*.5]);
    }
  }
  [[-40,27,8],[-39,50,10],[-64,49,8],[-72,42,11],[-79,25,8],[-43,-40,9],[-68,-67,10],[-18,54,7],[81,-35,7],[79,47,8]].forEach((p,i)=>tree(...p,i));
  const grassGeometry=new T.BufferGeometry();
  grassGeometry.setAttribute('position',new T.Float32BufferAttribute([-.1,0,0,.07,0,0,.18,.7,0,0,0,-.1,0,0,.1,.05,.56,.02,-.05,0,-.05,.04,0,.1,-.12,.45,.07],3));
  grassGeometry.computeVertexNormals();geometry.grass=grassGeometry;
  m.leaf.side=T.DoubleSide;m.deadLeaf.side=T.DoubleSide;
  for(let i=0;i<(quality==='low'?450:950);i++) {
    // Keep central combat lanes clear; vegetation is densest around the ruins.
    const x=(rand()>.24?-1:1)*(18+rand()*73),z=(rand()-.5)*183;
    if(x>0&&rand()>.25)continue;
    const scale=.4+rand()*.9;add('grass',i%5===0?m.deadLeaf:m.leaf,[x,.025,z],[scale,scale,scale],[0,rand()*6.28,0]);
  }
  // Rubble is shallow and non-blocking; large wrecks use their own collision volume.
  for(let i=0;i<360;i++) {
    const host=structures[i%structures.length],angle=rand()*Math.PI*2;
    const x=host[0]+Math.cos(angle)*(host[2]*.6+rand()*3),z=host[1]+Math.sin(angle)*(host[4]*.6+rand()*3),size=.06+rand()*.29;
    add('stone',i%4?m.concrete:m.rust,[x,size*.26,z],[size,.15+size*.3,size*.7],[rand(),rand()*6,rand()]);
    if(i%7===0&&x<0)add('leaves',m.foliage,[x,.16,z],[.23+rand()*.16,.19+rand()*.14,.23+rand()*.14],[0,rand()*6.28,.2]);
  }
  for(const [x,z,index] of [[-38,58,0],[76,37,1],[-72,-30,2]]) {
    solid(x,z,4.3,1.45,2.2,{surface:'metal'});
    cube(m.black,[x,.37,z],[3.8,.37,1.82],[0,0,0],'rounded');
    cube(index===1?m.char:m.rust,[x,.66,z],[4.1,.39,1.96],[0,0,-.026],'rounded');
    // Separate bonnet, cabin, pillars and bumpers make a damaged vehicle read as
    // a vehicle rather than two stacked blocks. All parts stay inside its collider.
    cube(m.rust,[x+1.28,.87,z],[1.37,.13,1.83],[0,.012,index===2?.085:-.025],'rounded');
    cube(m.black,[x-.40,1.03,z],[1.42,.39,1.5],[0,0,0],'rounded');
    cube(m.char,[x-.43,1.38,z],[1.48,.1,1.70],[0,0,-.035],'rounded');
    cube(m.glass,[x+.49,1.10,z],[.035,.52,1.53],[0,0,.57],'box');
    cube(m.glass,[x-1.32,1.05,z],[.03,.41,1.56],[0,0,-.62],'box');
    for(const side of [-1,1]) {
      cube(m.glass,[x-.4,1.13,z+side*.839],[1.5,.31,.02],[0,0,-.035],'box');
      for(const xx of [-1.09,-.40,.26])cube(m.rust,[x+xx,1.12,z+side*.85],[.065,.44,.06],[0,0,xx>.1?.35:0],'box');
      cube(m.black,[x-.43,.74,z+side*.985],[.026,.34,.013],[0,0,0],'box');
      for(const xx of [-.77,.08])cube(m.steel,[x+xx,.875,z+side*.993],[.16,.035,.03],[0,0,0],'box');
      for(const xx of [-1.4,1.3]) {
        add('cylinder',m.black,[x+xx,.4,z+side*1.005],[.39,.15,.39],[Math.PI/2,0,0]);
        add('cylinder',m.steel,[x+xx,.4,z+side*1.086],[.22,.014,.22],[Math.PI/2,0,0]);
        add('cylinder',m.black,[x+xx,.4,z+side*1.097],[.095,.009,.095],[Math.PI/2,0,0]);
      }
      cube(m.chalk,[x+1.98,.70,z+side*.69],[.1,.12,.36],[0,0,0],'rounded');
      cube(m.rust,[x-1.98,.71,z+side*.66],[.08,.14,.36],[0,0,0],'rounded');
    }
    for(const side of [-1,1])cube(m.black,[x+side*2.04,.48,z],[.13,.18,1.86],[0,0,0],'rounded');
    for(let slat=0;slat<5;slat++)cube(m.black,[x+2.078,.68,z-.36+slat*.18],[.025,.12,.065],[0,0,0],'box');
    ivy(x,1.4,z+1.02,3.2,1.4);
  }
  // A breached retaining wall encloses the play space; the city continues beyond it.
  for(let i=-90;i<=90;i+=10)for(const side of [-1,1]) {
    cube(m.concrete,[side*99.5,1.1,i],[1,2.2,10]);cube(m.concrete,[i,1.1,side*99.5],[10,2.2,1]);
    rod(m.rust,[side*99,2,i],[side*99,3.3+rand(),i],.055);rod(m.rust,[i,2,side*99],[i,3.3+rand(),side*99],.055);
  }
  for(let i=0;i<35;i++) {
    const angle=i/35*Math.PI*2,radius=130+i%4*11,h=16+(i*17%49),x=Math.cos(angle)*radius,z=Math.sin(angle)*radius,w=9+i%4*3;
    cube(m.char,[x,h*.47,z],[w,h*.94,10],[0,angle*.1,0],i%2?'block':'broken');
    for(let y=5;y<h;y+=5)cube(m.concrete,[x,y,z],[w+.5,.3,10.5],[0,angle*.1,0]);
    if(i%3===0)rod(m.black,[x,h*.94-.2,z],[x+1,h+11,z],.12);
    if(i%4===0)add('cylinder',m.char,[x+w*.6,h*.35,z],[w*.36,h*.7,w*.36]);
  }
  // Diegetic wayfinding identifies the districts without adding a combat HUD.
  function sign(text,sub,x,y,z,yaw=0) {
    const map=texture(512,c=>{
      c.fillStyle='#273a37';c.fillRect(0,0,512,512);c.strokeStyle='#a3aaa0';c.lineWidth=8;c.strokeRect(16,116,480,266);
      c.fillStyle='#c8d0bd';c.textAlign='left';c.font='bold 48px sans-serif';c.fillText(text,40,224);
      c.fillStyle='#91a88f';c.font='24px monospace';c.fillText(sub,42,274);c.fillStyle='#cebd8a';c.fillRect(42,307,110,7);
      const rand=randomSource(25);for(let i=0;i<420;i++){c.fillStyle='rgba(29,34,26,.18)';c.fillRect(rand()*512,rand()*512,rand()*19,1+rand()*4);}
    });
    const signMat=new T.MeshStandardMaterial({map,roughness:.93,metalness:.12});const sign=new T.Mesh(new T.PlaneGeometry(4,4),signMat);sign.position.set(x,y,z);sign.rotation.y=yaw;group.add(sign);
  }
  sign('ARCHIVES','OUEST / ACCÈS 04',-31,5.9,-14.91);
  sign('SECTEUR 07','RELAIS / RÉSEAU ACTIF',0,6,-67.91);
  sign('MAINTENANCE','EST / ÉNERGIE',38,5.6,22.09);
  // Shared pools limit the static city to a few dozen material/geometry draws.
  let instances=0;
  for(const {geometry,mat,items} of batches.values()) {
    const mesh=new T.InstancedMesh(geometry,mat,items.length);items.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
    mesh.castShadow=!mat.isMeshBasicMaterial&&geometry!==grassGeometry&&mat!==m.scar&&mat!==m.wet;mesh.receiveShadow=!mat.isMeshBasicMaterial;mesh.computeBoundingSphere();group.add(mesh);instances+=items.length;
  }
  for(const [mat,list] of custom){const mesh=new T.Mesh(merge(list),mat);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);for(const part of list)part.dispose();}
  // Sparse, slow-moving dust makes light and distance readable with one draw call.
  const dustGeometry=new T.BufferGeometry(),positions=new Float32Array(160*3);
  for(let i=0;i<160;i++){positions[i*3]=(rand()-.5)*180;positions[i*3+1]=.7+rand()*15;positions[i*3+2]=(rand()-.5)*180;}
  dustGeometry.setAttribute('position',new T.BufferAttribute(positions,3));
  const dust=new T.Points(dustGeometry,new T.PointsMaterial({color:0xd7c7a5,size:.026,opacity:.37,transparent:true,depthWrite:false}));group.add(dust);
  group.userData.instances=instances;group.userData.districts=['Brèche centrale','Archives envahies','Maintenance','Relais'];
  return {group,materials:m,pbrStatus,update(time){dust.position.x=Math.sin(time*.025)*2.5;dust.position.y=Math.sin(time*.06)*.25;},setAccent(color){m.accent.color.setHex(color);}};
}
