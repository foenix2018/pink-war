import {createWorldShadows} from './world-shadows.js';
// W01 / Les Secours de Vesper. Original environment art, separate from the
// authoritative traversal/collision layout and from the locked Shadow Unit rigs.
// Replaces selected legacy skins; never stacks a fourth car onto the old three.
export const VESPER_LIGHT=Object.freeze({exposure:.84,skyIntensity:.32,ambient:.62,sun:1.4,fogNear:52,fogFar:265});

export function replacementTriangles(source,replace=false){
  const ranges=replace?(source.artRanges||[]).slice().sort((a,b)=>a.start-b.start):[];
  let cursor=0;
  return (index,material)=>{
    while(cursor<ranges.length&&index>=ranges[cursor].end)cursor++;
    return replace&&(material===4||(cursor<ranges.length&&index>=ranges[cursor].start));
  };
}

// One shadow direction for the sky, projected mobile shadows and desktop sun.
export const VESPER_SUN=Object.freeze({x:-58,y:94,z:34});
export const CLINIC_FRONT=Object.freeze([[11.5,24,3],[33.5,52.5,5]]);
export function vesperArtColliders(source){
  const isOldWall=b=>Math.abs(b.x1+12.55)<.01&&Math.abs(b.x2+11.45)<.01&&Math.abs(b.y2-8.5)<.01&&
    CLINIC_FRONT.some(([a,z])=>Math.abs(b.z1-a)<.01&&Math.abs(b.z2-z)<.01);
  if(!source.some(isOldWall))return source.slice();
  const result=source.filter(b=>!isOldWall(b));
  const box=(x,y,z,w,h,d)=>result.push({x1:x-w/2,x2:x+w/2,y1:y-h/2,y2:y+h/2,z1:z-d/2,z2:z+d/2,label:'maçonnerie annexe / ouverture réelle'});
  for(const [start,end,cells] of CLINIC_FRONT){
    const span=(end-start)/cells;
    for(let i=0;i<=cells;i++)box(-12,4.25,start+i*span,1.1,8.5,.42);
    for(let i=0;i<cells;i++){
      const z=start+(i+.5)*span;
      for(const [y,h] of [[.91,1.82],[5.1,1.2],[8.02,.96]])box(-12,y,z,1.1,h,span-.35);
      for(const [y,h] of [[3.15,2.5],[6.62,1.6]])box(-11.43,y,z,.16,h,.08);
    }
  }
  return result;
}
export function projectedHull(box){
  const points=[],height=Math.min(34,Math.max(0,box.y2)),dx=-VESPER_SUN.x/VESPER_SUN.y*height,dz=-VESPER_SUN.z/VESPER_SUN.y*height;
  for(const x of [box.x1,box.x2])for(const z of [box.z1,box.z2]){points.push([x,z],[x+dx,z+dz]);}
  points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const half=p=>{const out=[];for(const q of p){while(out.length>1&&cross(out.at(-2),out.at(-1),q)<=0)out.pop();out.push(q);}return out;};
  return half(points).slice(0,-1).concat(half(points.slice().reverse()).slice(0,-1));
}

export function createVesperAtmosphere(T,scene,renderer,profile,{extraLights=[]}={}){
  renderer.toneMappingExposure=VESPER_LIGHT.exposure;
  scene.fog=new T.Fog(0x747b79,VESPER_LIGHT.fogNear,VESPER_LIGHT.fogFar);
  scene.background=new T.Color(0x8e9694);
  const ambient=new T.HemisphereLight(0xc2cdcf,0x34332c,VESPER_LIGHT.ambient);scene.add(ambient);
  const sun=new T.DirectionalLight(0xffe3bb,VESPER_LIGHT.sun);scene.add(sun,sun.target);
  sun.castShadow=profile.shadows;sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.025;
  sun.shadow.bias=-.00012;sun.shadow.radius=2.4;
  Object.assign(sun.shadow.camera,{left:-50,right:50,top:64,bottom:-64,near:4,far:235});
  let reflection=null;
  const sky=new T.TextureLoader().load('./assets/cc0/vesper-morning-sky.webp',texture=>{
    texture.mapping=T.EquirectangularReflectionMapping;texture.colorSpace=T.SRGBColorSpace;
    scene.background=texture;scene.backgroundBlurriness=.025;scene.backgroundIntensity=.68;
    // Background resolution must not dictate the reflection convolution cost.
    // Downsample the same photograph before PMREM: 32px faces on mobile,
    // 64px desktop, instead of a 256px cube generated from the full panorama.
    const canvas=document.createElement('canvas');canvas.width=profile.phone?128:256;canvas.height=canvas.width/2;
    canvas.getContext('2d').drawImage(texture.image,0,0,canvas.width,canvas.height);
    reflection=new T.CanvasTexture(canvas);reflection.mapping=T.EquirectangularReflectionMapping;reflection.colorSpace=T.SRGBColorSpace;
    scene.environment=reflection;scene.environmentIntensity=VESPER_LIGHT.skyIntensity;
    scene.backgroundRotation.y=scene.environmentRotation.y=-.55;
  });
  const worldShadows=createWorldShadows(T,{scene,renderer,light:sun,profile,direction:VESPER_SUN,extraLights});
  function update(time,camera,{shadows=true,day=.43,focus=camera.position,entities=[],heightAt}={}){
    sun.intensity=1.12+Math.max(0,Math.min(1,day))*.55;
    ambient.intensity=.51+Math.max(0,Math.min(1,day))*.26;
    worldShadows.update(time,focus,{enabled:shadows,entities,heightAt});
  }
  return {sun,ambient,update,shadows:worldShadows,dispose(){worldShadows.dispose();sky.dispose();reflection?.dispose();sun.shadow.dispose();}};
}

export function createVesperArt(T,scene,{collide=[],ranges=[],performance=false}={}){
  const root=new T.Group();root.name='W01 / weathered Vesper art';scene.add(root);
  const bins=new Map(),textures=[],stats={vehicles:0,trees:0,ferns:0,ruinPatches:0,skyline:0,draws:0,triangles:0};
  let seed=94991;
  const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const between=(a,b)=>a+(b-a)*rnd();
  const material=(color,roughness=.85,metalness=.02)=>new T.MeshStandardMaterial({color,roughness,metalness});
  const M={concrete:material(0xa6aaa6),aggregate:material(0xb4b4a9),metal:material(0x7b8181,.64,.66),
    rust:material(0x867660,.86,.25),paint:material(0xffffff,.74,.32),rubber:material(0x171918,.95),
    glass:material(0x172225,.32,.23),wood:material(0x34382c,.96),leaf:material(0x606646,.91),
    dry:material(0x716b4e,.97),cable:material(0x262724,.9),ochre:material(0x987949,.85),red:material(0x77463a,.78)};
  M.leaf.side=M.dry.side=M.glass.side=T.DoubleSide;
  M.glass.transparent=true;M.glass.opacity=.68;M.glass.depthWrite=false;
  const pbrTargets={concrete:[M.concrete],asphalt:[],metal:[M.metal],rust:[M.rust]};
  const paint=new T.TextureLoader().load('./assets/cc0/vesper-paint_diff_512.jpg');
  paint.colorSpace=T.SRGBColorSpace;paint.wrapS=paint.wrapT=T.RepeatWrapping;textures.push(paint);M.paint.map=paint;
  const gravel=new T.TextureLoader().load('./assets/cc0/gravel_embedded_concrete_diff_512.jpg');
  gravel.colorSpace=T.SRGBColorSpace;gravel.wrapS=gravel.wrapT=T.RepeatWrapping;textures.push(gravel);M.aggregate.map=gravel;
  const matrix=new T.Matrix4(),q=new T.Quaternion(),euler=new T.Euler(),pos=new T.Vector3(),scale=new T.Vector3();
  function add(geometry,mat,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){
    const geo=geometry.index?geometry.toNonIndexed():geometry.clone();
    q.setFromEuler(euler.set(rx,ry,rz));matrix.compose(pos.set(x,y,z),q,scale.set(sx,sy,sz));geo.applyMatrix4(matrix);
    if(!bins.has(mat))bins.set(mat,[]);bins.get(mat).push(geo);geometry.dispose();
  }
  function rounded(w,h,d,r=.04){
    r=Math.min(r,w*.23,h*.23,d*.23);const s=new T.Shape(),x=-w/2,y=-h/2;
    s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);
    s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
    s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
    const g=new T.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:2,steps:1,curveSegments:3});
    g.translate(0,0,-d/2+r);return g;
  }
  // Millimetre bevels are meaningful nearby, never on thousands of skyline
  // window frames. A simple far-frame prism avoids an accidental 600k-triangle
  // budget while preserving exactly the same silhouette at this distance.
  const box=(x,y,z,w,h,d,m=M.concrete,r=.03,rot=0)=>add(r<.025?new T.BoxGeometry(w,h,d):rounded(w,h,d,r),m,x,y,z,1,1,1,0,rot);
  function tube(points,r,m=M.metal){add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(3,points.length*3),r,performance?5:7,false),m);}
  function sheet(points,m,uvScale=1){
    const p=[],uv=[];for(let i=1;i<points.length-1;i++)for(const j of [0,i,i+1]){p.push(...points[j]);uv.push(points[j][0]*uvScale,points[j][1]*uvScale);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();add(g,m);
  }
  function leaf(x,y,z,len,width,angle,tilt,m=M.leaf){
    const p=[],uv=[],segments=4;
    for(let i=0;i<segments;i++){
      const pair=t=>{const w=Math.sin(t*Math.PI)*width;return [[-w,len*t,Math.sin(t*Math.PI)*len*.14],[w,len*t,Math.sin(t*Math.PI)*len*.14]];};
      const a=pair(i/segments),b=pair((i+1)/segments);
      for(const [point,u,v] of [[a[0],0,i/segments],[a[1],1,i/segments],[b[1],1,(i+1)/segments],[a[0],0,i/segments],[b[1],1,(i+1)/segments],[b[0],0,(i+1)/segments]]){p.push(...point);uv.push(u,v);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();
    add(g,m,x,y,z,1,1,1,tilt,angle,between(-.25,.25));
  }
  function fern(x,z,size=1){
    for(let frond=0;frond<7;frond++){
      const a=frond*Math.PI*2/7+rnd()*.3,dx=Math.cos(a),dz=Math.sin(a),len=between(.45,.85)*size;
      tube([[x,.02,z],[x+dx*len*.35,len*.65,z+dz*len*.35],[x+dx*len,len*.48,z+dz*len]],.008,M.wood);
      for(let n=1;n<6;n++){
        const t=n/6,cx=x+dx*len*t,cz=z+dz*len*t,yy=len*(.8*t-.32*t*t),l=len*.35*(1-t*.7);
        for(const s of [-1,1])leaf(cx,yy,cz,l,l*.18,a+s*1.15,-.8,M.leaf);
      }
    }
    stats.ferns++;
  }
  function tree(x,z,height){
    const lean=between(-.6,.6),split=height*.57;
    tube([[x,0,z],[x+.15,height*.28,z-.08],[x+lean,split,z+.18],[x+lean*.8,height*.93,z+.35]],.10,M.wood);
    for(let branch=0;branch<6;branch++){
      const a=branch*2.39,length=height*between(.22,.37),y=split+branch*.22,ex=x+lean+Math.cos(a)*length,ez=z+Math.sin(a)*length;
      tube([[x+lean,y,z],[x+Math.cos(a)*length*.55,y+.42,ez*.5+z*.5],[ex,y+.9,ez]],.035,M.wood);
      for(let n=0;n<(performance?25:44);n++){
        const t=rnd(),bx=x+lean+(ex-x-lean)*t+between(-.55,.55),bz=z+(ez-z)*t+between(-.55,.55);
        leaf(bx,y+.7+t*.7+between(-.35,.6),bz,between(.17,.35),between(.045,.085),between(0,6.28),between(-1.4,1.4));
      }
    }
    stats.trees++;
  }
  function vehicle(x,z,emergency){
    // A single coherent body, raked glass, rubber tyres, wheel wells and seams.
    // All parts remain within the existing wreck collision envelope.
    const w=emergency?2.35:1.98,len=emergency?4.96:4.3,m=emergency?M.paint:M.rust;
    const ring=(zz,width,bottom,top)=>{
      const r=.12,pts=[];for(let corner=0;corner<4;corner++)for(let n=0;n<4;n++){
        const a=corner*Math.PI/2+n*Math.PI/6,cx=(corner===0||corner===3?1:-1)*(width/2-r),cy=(corner<2?top-r:bottom+r);
        pts.push([x+cx+Math.cos(a)*r,cy+Math.sin(a)*r,z+zz]);
      }return pts;
    };
    const sections=[[-len*.5,w*.74,.49,.79],[-len*.35,w*.96,.36,1.02],[len*.26,w,.34,1.04],[len*.49,w*.85,.46,.91]];
    // Chamfered hull cross sections, with explicitly outward normals.
    const rings=sections.map(s=>ring(...s));
    for(let i=0;i<rings.length-1;i++)for(let k=0;k<16;k++)sheet([rings[i][k],rings[i][(k+1)%16],rings[i+1][(k+1)%16],rings[i+1][k]],m);
    sheet(rings[0].slice().reverse(),m);sheet(rings.at(-1),m);
    const front=z-len*.24,rear=z+len*.30,roofFront=z-len*.08,roofRear=z+len*.22;
    sheet([[x-w*.44,1.03,front],[x+w*.44,1.03,front],[x+w*.35,1.61,roofFront],[x-w*.35,1.61,roofFront]],M.glass);
    sheet([[x-w*.35,1.61,roofRear],[x+w*.35,1.61,roofRear],[x+w*.43,1.03,rear],[x-w*.43,1.03,rear]],M.glass);
    box(x,1.62,(roofFront+roofRear)/2,w*.73,.09,roofRear-roofFront+.10,m,.035);
    for(const side of [-1,1]){
      const X=x+side*w*.46,roofX=x+side*w*.35;
      sheet([[X,1.02,front],[roofX,1.59,roofFront],[roofX,1.59,roofRear],[X,1.02,rear]],M.glass);
      tube([[X,1.0,front],[roofX,1.61,roofFront],[roofX,1.61,roofRear],[X,1.0,rear]],.037,m);
      tube([[X,.47,z-.08],[X,1.01,z-.08],[roofX,1.60,z+.03]],.024,M.metal);
      box(X,1.01,z+len*.13,.075,.08,.20,M.metal,.018);
      box(X,1.22,front+.18,.22,.15,.29,m,.035);
      for(const dz of [-len*.29,len*.30]){
        add(new T.CylinderGeometry(.46,.46,.24,22),M.rubber,x+side*w*.48,.44,z+dz,1,1,1,0,0,Math.PI/2);
        add(new T.TorusGeometry(.33,.12,7,24),M.rubber,x+side*w*.54,.44,z+dz,1,1,1,0,Math.PI/2);
        add(new T.CylinderGeometry(.23,.23,.025,14),M.metal,x+side*w*.605,.44,z+dz,1,1,1,0,0,Math.PI/2);
        add(new T.TorusGeometry(.45,.04,5,20,Math.PI),m,x+side*w*.495,.44,z+dz,1,1,1,0,Math.PI/2);
        for(let k=0;k<5;k++){const a=k*6.28/5;tube([[x+side*w*.62,.44,z+dz],[x+side*w*.62,.44+Math.cos(a)*.19,z+dz+Math.sin(a)*.19]],.016,M.rust);}
      }
      // Broken, finite cracks instead of luminous windows.
      tube([[roofX,1.51,z+.15],[X,1.19,z+.24],[X,1.09,z+.42]],.004,M.concrete);
      box(x+side*w*.32,.78,z-len*.495,.30,.12,.07,M.ochre,.022);
      box(x+side*w*.32,.80,z+len*.494,.23,.10,.07,M.red,.015);
    }
    box(x,.52,z-len*.5,w*.89,.19,.19,M.metal,.045);
    for(let n=0;n<5;n++)box(x,.70+n*.035,z-len*.505,w*.40,.013,.035,M.cable,.002);
    tube([[x-.55,1.08,front-.01],[x-.12,1.27,front+.12]],.012,M.metal);
    if(emergency){box(x,1.70,z+.11,1.0,.13,.32,M.metal,.025);box(x-.29,1.72,z+.11,.28,.12,.30,M.red,.02);box(x+.29,1.72,z+.11,.28,.12,.30,M.glass,.02);}
    stats.vehicles++;
  }
  // The same three wreck positions as the reference; legacy ranges were removed.
  for(const [x,z,e] of [[7,15,true],[8,-26,false],[-7,-39,true]])vehicle(x,z,e);

  // Medical facade: deep openings, sills, actual panes/shards and solid piers.
  // It shares the original two wall footprints and the 9.5m entrance gap.
  for(const [start,end,cells] of CLINIC_FRONT){
    const span=(end-start)/cells;
    for(let i=0;i<=cells;i++)box(-12,4.25,start+i*span,1.1,8.5,.42,M.concrete,.045);
    for(let i=0;i<cells;i++){
      const z=start+(i+.5)*span;
      for(const [y,h] of [[.91,1.82],[5.1,1.2],[8.02,.96]])box(-12,y,z,1.1,h,span-.35,M.concrete,.04);
      for(const [y,h] of [[3.15,2.5],[6.62,1.6]]){
        const d=span-.62;
        box(-11.33,y-h/2-.06,z,.45,.15,d+.24,M.metal,.018);
        for(const side of [-1,1])box(-11.43,y,z+side*d/2,.16,h+.15,.085,M.metal,.012);
        box(-11.43,y+h/2,z,.16,.08,d,M.metal,.012);
        box(-11.43,y,z,.15,h,.08,M.metal,.01);
        // Some surviving glazing, some genuinely open bays after the collapse.
        if((i+Math.floor(y))%3===0)sheet([[-11.49,y-h/2,z-d/2],[-11.49,y-h/2,z],[-11.49,y+h/2,z],[-11.49,y+h/2,z-d/2]],M.glass);
        else sheet([[-11.49,y+h/2,z-d/2],[-11.49,y+h/2,z-d*.12],[-11.49,y+h*.12,z-d*.27]],M.glass);
      }
    }
  }

  // Partial collapse reveals daylight inside the existing medical footprint.
  // Four edge slabs replace the two opaque full roofs, not the walls or route.
  box(-41,8.65,32,10,1,41,M.concrete,.08);box(-16.5,8.65,32,9,1,41,M.concrete,.08);
  box(-29,8.65,46.5,15,1,12,M.concrete,.08);box(-29,8.65,15.5,15,1,8,M.concrete,.08);
  for(let n=0;n<14;n++){
    const x=-35.6+n*1.06;let z=n%2?19.6:40.4;
    tube([[x,8.4,z],[x+.1,8.8,z+(n%2?.8:-.8)],[x+.2,8.4,z+(n%2?1.7:-1.7)]],.017,M.rust);
  }
  const treeSites=[[-44,6,6.3],[-46,46,7.7],[-38,-15,7.1],[44,39,6.2],[45,-7,7],[-43,-62,9],[48,-80,8],[-60,-88,9],[61,54,8],[-56,57,7],[-38,-103,9],[46,-103,8]];
  for(const p of treeSites)tree(...p);
  // Plant only at broken edges and damp walls, keeping the main street clear.
  const patches=[[-11.1,20],[-11.1,38],[-43,17],[-42,47],[18.7,34],[41,13],[-34,-39],[-34,-19],[23,-33],[-14,-72],[17,-75]];
  for(const [x,z] of patches)for(let k=0;k<(performance?3:5);k++)fern(x+between(-.7,.7),z+between(-2,2),between(.7,1.3));
  for(let i=0;i<(performance?240:460);i++){
    const [bx,bz]=patches[i%patches.length],x=bx+between(-1.3,1.3),z=bz+between(-3,3);
    for(let blade=0;blade<3;blade++)leaf(x,.02,z,between(.17,.56),between(.011,.028),between(0,6.28),between(-.4,.4),i%6===0?M.dry:M.leaf);
  }
  for(const [wallX,top,z0] of [[-11.3,8.2,18],[-11.3,8.2,43],[-44.1,8,27],[19,6.3,40],[-34.5,17,-32]]){
    for(let n=0;n<7;n++){
      const z=z0+n*.27,drop=between(1.1,4.1),endX=wallX+between(-.16,.16);
      tube([[wallX,top,z],[wallX+.1,top-drop*.5,z+.3],[endX,top-drop,z+.17]],.013,M.wood);
      for(let k=0;k<9;k++)leaf(endX+(k%2?.1:-.1),top-drop*k/9,z+.16,between(.12,.23),.06,k%2?1.4:-1.4,.2);
    }
  }

  // Exposed aggregate, broken masonry and dangling services belong to facades.
  for(const [x,y,z,rot] of [[-11.37,3.1,19,Math.PI/2],[-11.37,2.3,44,Math.PI/2],[18.48,2.4,19,-Math.PI/2],[18.48,4.1,37,-Math.PI/2],[-34.6,9.1,-41.6,Math.PI]]){
    const shape=new T.Shape();for(let n=0;n<10;n++){const a=n*6.28/10,r=between(.45,.9);const u=Math.cos(a)*r,v=Math.sin(a)*r*1.4;if(n)shape.lineTo(u,v);else shape.moveTo(u,v);}shape.closePath();
    add(new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:false}),M.aggregate,x,y,z,1,1,1,0,rot);
    stats.ruinPatches++;
  }
  for(let n=0;n<(performance?110:210);n++){
    const side=n%2?1:-1,x=side*between(9.5,12.1),z=between(-89,48),s=between(.06,.29);
    const g=new T.DodecahedronGeometry(1,0),p=g.getAttribute('position');
    for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)*(1+.2*Math.sin(p.getY(i)*13)),p.getY(i),p.getZ(i)*(1+.18*Math.sin(p.getX(i)*7)));g.computeVertexNormals();
    add(g,n%3?M.aggregate:M.rust,x,s*.25-.025,z,s,s*.48,s*1.7,between(-.2,.2),rnd()*6.28);
  }
  for(const [x,z] of [[-11,6],[11,-28],[-12,-52],[13,34]])tube([[x,.04,z],[x-1,.04,z-2],[x+.7,.05,z-3.1],[x-.4,.06,z-5]],.025,M.cable);
  tube([[-26,.06,16],[-26,.06,11.4],[-18,.06,10.8],[-8,.06,10.5]],.022,M.cable);

  // Physical, faded evidence of the evacuation. One shared printed atlas;
  // these signs receive light and shadows and never emit into the whole room.
  const atlas=document.createElement('canvas');atlas.width=512;atlas.height=512;
  const ink=atlas.getContext('2d');ink.fillStyle='#c5bda7';ink.textAlign='center';
  const labels=[['SECOURS VESPER','ANNEXE 03 / EVACUATION 2189'],['RESEAU HORS LIGNE','REARMEMENT MANUEL / A3'],['DERNIER CONVOI','QUAI FERME / PERSONNEL EVACUE'],['ATELIER TECHNIQUE','LIAISON CABLEE VERS A3']];
  labels.forEach(([title,line],i)=>{ink.font='bold 38px monospace';ink.fillText(title,256,i*128+53,480);ink.font='17px monospace';ink.fillText(line,256,i*128+84,480);});
  // Worn ink, not a pristine floating interface.
  for(let n=0;n<2200;n++)ink.clearRect(rnd()*512,rnd()*512,between(1,5),between(.5,2));
  const atlasTexture=new T.CanvasTexture(atlas);atlasTexture.colorSpace=T.SRGBColorSpace;textures.push(atlasTexture);
  const stencilMaterial=new T.MeshStandardMaterial({map:atlasTexture,alphaTest:.35,side:T.DoubleSide,roughness:.98,polygonOffset:true,polygonOffsetFactor:-2});
  function stencil(index,x,y,z,w,h,ry=0,rx=0){
    const g=new T.PlaneGeometry(w,h),uv=g.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setY(i,uv.getY(i)/4+(3-index)/4);
    add(g,stencilMaterial,x,y,z,1,1,1,rx,ry);
  }
  stencil(0,-11.34,5.1,38,4.1,.9,Math.PI/2);
  stencil(0,-26,.05,20,3.7,.85,0,-Math.PI/2);
  stencil(1,-7.28,1.31,10.5,.68,.20,Math.PI/2);
  stencil(2,18.46,2.6,18,3.3,.82,-Math.PI/2);
  stencil(3,25,3.1,15.68,4.0,1.0);

  // Civilian towers: chamfered floor plans, recessed bays, damaged crowns.
  // Distant art stays beyond the playable perimeter and cannot become a wall.
  const towers=[[-89,-134,18,16,66],[89,-142,22,19,82],[-121,-172,27,22,104],[120,-182,22,20,114],[-61,-166,18,17,94],[55,-180,21,18,78],[-29,-198,17,18,109],[19,-219,25,22,98],[-91,-65,22,21,43],[94,-52,24,22,51],[-94,30,24,22,36],[96,36,25,22,38]];
  for(const [x,z,w,d,h] of towers){
    const s=new T.Shape(),c=1.7;const corners=[[-w/2+c,-d/2],[w/2-c,-d/2],[w/2,-d/2+c],[w/2,d/2-c],[w/2-c,d/2],[-w/2+c,d/2],[-w/2,d/2-c],[-w/2,-d/2+c]];
    corners.forEach(([u,v],i)=>i?s.lineTo(u,v):s.moveTo(u,v));s.closePath();
    const brokenTop=h-8.5;
    const g=new T.ExtrudeGeometry(s,{depth:brokenTop,bevelEnabled:false});g.rotateX(-Math.PI/2);add(g,M.concrete,x,0,z);
    for(let floor=1;floor<brokenTop/3.4;floor++){
      const y=floor*3.4;box(x,y,z+d/2+.035,w-2,.13,.38,M.metal,.012);
      for(let col=0;col<Math.floor(w/2.3);col++){
        if((col+floor)%7===0)continue;
        box(x-w*.42+col*2.3,y+1.1,z+d/2+.045,1.32,1.72,.08,M.glass,.015);
      }
    }
    // Two exposed storeys, missing a corner and exterior walls. Their open
    // silhouette tells the fall of the city rather than a pristine grey cube.
    for(let floor=0;floor<3;floor++){
      const y=brokenTop+floor*3.7,slab=new T.Shape();
      [[-w*.48,-d*.48],[w*.46,-d*.48],[w*.46,d*.14],[w*.21,d*.45],[-w*.48,d*.45]].forEach(([u,v],i)=>i?slab.lineTo(u,v):slab.moveTo(u,v));slab.closePath();
      const geo=new T.ExtrudeGeometry(slab,{depth:.28,bevelEnabled:false});geo.rotateX(-Math.PI/2);add(geo,M.concrete,x,y,z);
    }
    for(const [sx,sz] of [[-.43,-.43],[.42,-.43],[-.43,.40],[.17,.40]])box(x+sx*w,brokenTop+4.3,z+sz*d,.36,8.6,.42,M.metal,.018);
    for(let n=0;n<4;n++)tube([[x-w*.35+n*2.1,h-.5,z],[x-w*.35+n*2.1,h+between(.7,3.3),z+.2]],.042,M.metal);
    stats.skyline++;
  }

  // Merge by material: detail does not mean hundreds of additional draw calls.
  for(const [mat,parts] of bins){
    const count=parts.reduce((n,g)=>n+g.attributes.position.count,0),p=new Float32Array(count*3),normal=new Float32Array(count*3),uv=new Float32Array(count*2);let offset=0;
    for(const g of parts){const n=g.attributes.position.count;p.set(g.attributes.position.array,offset*3);normal.set(g.attributes.normal.array,offset*3);if(g.attributes.uv)uv.set(g.attributes.uv.array,offset*2);offset+=n;g.dispose();}
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(p,3));geometry.setAttribute('normal',new T.BufferAttribute(normal,3));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.computeBoundingSphere();
    const mesh=new T.Mesh(geometry,mat);mesh.name='W01 / '+(Object.keys(M).find(k=>M[k]===mat)||'printed traces');mesh.castShadow=!performance&&mat!==stencilMaterial&&mat!==M.glass;mesh.receiveShadow=true;root.add(mesh);stats.triangles+=count/3;stats.draws++;
  }
  // Stable, low contrast contact occlusion on every device. Mobile also gets
  // a baked directional silhouette from the same obstacle footprints and sun.
  const size=1024,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d'),bounds={x:-83,z:-133,w:166,d:229};
  const px=x=>(x-bounds.x)/bounds.w*size,pz=z=>(z-bounds.z)/bounds.d*size;
  function polygon(points,alpha){ctx.fillStyle=`rgba(12,16,16,${alpha})`;ctx.beginPath();points.forEach(([x,z],i)=>i?ctx.lineTo(px(x),pz(z)):ctx.moveTo(px(x),pz(z)));ctx.closePath();ctx.fill();}
  for(const b of collide){
    if(b.y1>.6||b.y2<.35||b.x2-b.x1>55||b.z2-b.z1>60)continue;
    if(performance)polygon(projectedHull(b),.19);
    polygon([[b.x1-.10,b.z1-.10],[b.x2+.10,b.z1-.10],[b.x2+.10,b.z2+.10],[b.x1-.10,b.z2+.10]],.27);
  }
  // Blur the completed atlas once. Filtering every obstacle separately would
  // repeatedly process a full atlas and stall startup on a software/mobile GPU.
  const soft=document.createElement('canvas');soft.width=soft.height=size;
  const softCtx=soft.getContext('2d');softCtx.filter='blur(2px)';softCtx.drawImage(canvas,0,0);
  const texture=new T.CanvasTexture(soft);textures.push(texture);
  const contactMaterial=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,toneMapped:false});
  const contacts=new T.Mesh(new T.PlaneGeometry(bounds.w,bounds.d),contactMaterial);contacts.rotation.x=-Math.PI/2;contacts.position.set(0,.042,-18.5);contacts.renderOrder=1;contacts.name='W01 / contact occlusion';root.add(contacts);stats.draws++;
  return {root,stats,pbrTargets,dispose(){root.removeFromParent();root.traverse(o=>o.geometry?.dispose());for(const m of Object.values(M))m.dispose();stencilMaterial.dispose();contactMaterial.dispose();for(const t of textures)t.dispose();}};
}
