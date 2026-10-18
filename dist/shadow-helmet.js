import * as T from './vendor/three.webgpu.min.js';
import {bevelBox} from './geo.js';
import {cutHelmetWindow} from './shadow-helmet-window.js';

// Helmet surfaces are authored in the same root-aligned bind frame as the
// soldier. The caller applies the common exact sagittal reflection afterwards.
export function buildShadowHelmet(helmet,{part,shape,block,path,materials,disposables}){
  const {dark,graphite,black,steel,glass,light,dim}=materials;
  const shellMaterial=dark.clone();
  shellMaterial.name='Shadow / continuous helmet shell';
  shellMaterial.flatShading=false;shellMaterial.roughness=.52;shellMaterial.metalness=.48;
  shellMaterial.userData.studioReflection=.28;
  const crownMaterial=graphite.clone();
  crownMaterial.name='Shadow / curved crown plates';crownMaterial.flatShading=false;
  crownMaterial.color.setHex(0x30323a);crownMaterial.roughness=.47;
  const jawMaterial=graphite.clone();
  jawMaterial.name='Shadow / integrated jaw';jawMaterial.color.setHex(0x25272f);
  const panelMaterial=jawMaterial.clone();panelMaterial.flatShading=false;
  panelMaterial.name='Shadow / segmented helmet panels';
  const cheekMaterial=panelMaterial.clone();cheekMaterial.name='Shadow / continuous cheek armour';
  cheekMaterial.color.setHex(0x30323a);cheekMaterial.metalness=.58;cheekMaterial.roughness=.43;
  const sideJawMaterial=cheekMaterial.clone();sideJawMaterial.name='Shadow / diagonal jaw plates';
  sideJawMaterial.color.setHex(0x383a42);sideJawMaterial.metalness=.50;sideJawMaterial.roughness=.50;
  const templeMaterial=panelMaterial.clone();templeMaterial.name='Shadow / temple bridge';
  const chinMaterial=panelMaterial.clone();chinMaterial.name='Shadow / sculpted chin bridge';
  disposables.push(shellMaterial,crownMaterial,jawMaterial,panelMaterial,cheekMaterial,sideJawMaterial,templeMaterial,chinMaterial);
  const finish=graphite.map?.clone();
  if(finish){
    finish.generateMipmaps=true;finish.minFilter=T.LinearMipmapLinearFilter;finish.magFilter=T.LinearFilter;finish.needsUpdate=true;
    for(const material of [shellMaterial,crownMaterial,jawMaterial,panelMaterial,cheekMaterial,sideJawMaterial,templeMaterial,chinMaterial])material.map=material.bumpMap=finish;
    disposables.push(finish);
  }

  // Side silhouette, authored independently from the frontal width:
  // [authoring height, half width, front Z, rear Z]. The supplied side photo
  // has a low swept crown with a shallow arch, not a tall truncated dome.
  const rings=[
    [-.205,.060,-.055,.075],[-.178,.091,-.080,.120],[-.140,.117,-.104,.153],
    [-.100,.142,-.130,.162],[-.055,.157,-.150,.162],[-.010,.160,-.152,.162],
    [.040,.159,-.150,.168],[.080,.153,-.128,.162],[.125,.126,-.105,.133],
    [.160,.085,-.085,.110],[.170,.055,-.075,.095]
  ];
  const crownHeight=y=>y<=.040?y:.040+(y-.040)*.80;
  function section(y){
    for(let i=1;i<rings.length;i++)if(y<=rings[i][0]){
      const a=rings[i-1],b=rings[i],t=T.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1);
      return a.map((v,j)=>j===0?y:v+(b[j]-v)*t);
    }
    return rings.at(-1);
  }
  // Cross-sections stay left/right symmetric; the independently authored
  // front and rear contours avoid turning the side silhouette into an oval.
  function surface(angle,y,offset=0){
    const [,w,front,rear]=section(y),d=(rear-front)/2,z=(front+rear)/2;
    let s=Math.sin(angle),c=Math.cos(angle);
    // Keep the front/rear centre seams exactly on X=0, including the roof.
    if(Math.abs(s)<1e-12)s=0;
    if(Math.abs(c)<1e-12)c=0;
    const power=4.2-.6*T.MathUtils.clamp((-y-.020)/.16,0,1);
    const k=(Math.abs(s)**power+Math.abs(c)**power)**(-1/power);
    const rearWeight=Math.min(1,Math.max(0,1-c))**.7;
    const napeLift=.060*rearWeight*T.MathUtils.clamp((-.055-y)/.150,0,1);
    return new T.Vector3(w*s*k+offset*s,crownHeight(y)+napeLift,z-d*c*k-offset*c);
  }
  function grid(rows,columns,point,flip=false,skipCell=null){
    const positions=[],uv=[],indices=[];
    for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
      positions.push(...point(i/(columns-1),j/(rows-1)).toArray());
      uv.push(i/(columns-1),j/(rows-1));
      if(j&&i){
        if(skipCell?.((i-.5)/(columns-1),(j-.5)/(rows-1)))continue;
        const n=j*columns+i,a=n-columns;
        if(flip)indices.push(a-1,a,n-1,a,n,n-1);
        else indices.push(a-1,n-1,a,a,n-1,n);
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
    return g;
  }
  function armourField(columns,rows,point,flip=false){
    // Each armour field shares normals within a quadrilateral, retaining a
    // clear crease at the next field rather than smoothing the entire face.
    const positions=[],uv=[],indices=[];
    for(let j=1;j<rows.length;j++)for(let i=1;i<columns.length;i++){
      const coordinates=[[columns[i-1],rows[j-1]],[columns[i],rows[j-1]],
        [columns[i-1],rows[j]],[columns[i],rows[j]]],n=positions.length/3;
      for(const [u,v] of coordinates){positions.push(...point(u,v).toArray());uv.push(u,v);}
      if(flip)indices.push(n,n+1,n+2,n+1,n+3,n+2);
      else indices.push(n,n+2,n+1,n+1,n+2,n+3);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  // Keep the profile's plate breaks while closing the crown with a low arch.
  const shell=grid(rings.length,65,(u,v)=>surface(u*Math.PI*2,rings[Math.round(v*(rings.length-1))][0]));
  part(helmet,shell,shellMaterial);
  const top=rings.at(-1),capCentre=new T.Vector3(0,crownHeight(top[0]),(top[2]+top[3])/2);
  part(helmet,grid(9,65,(u,v)=>{
    const p=surface(u*Math.PI*2,top[0]).lerp(capCentre,v);
    p.y+=.016*(1-(1-v)**2);return p;
  }),shellMaterial);

  function panel(start,end,bottom,top,material=crownMaterial,offset=.004){
    if(end<start)[start,end]=[end,start];
    const g=grid(13,15,(u,v)=>{
      const bevel=T.MathUtils.clamp(Math.min(u,1-u,v,1-v)/.09,0,1);
      return surface(start+(end-start)*u,bottom+(top-bottom)*v,offset+.005*bevel);
    },false,(u,v)=>{
      const angle=start+(end-start)*u,y=bottom+(top-bottom)*v;
      const a=Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)));
      return y>.088&&y<.143&&a>.44&&a<.73;
    });
    return part(helmet,g,material);
  }
  function plate(corners,material=panelMaterial,offset=.014){
    const center=corners.reduce((p,v)=>[p[0]+v[0]/corners.length,p[1]+v[1]/corners.length],[0,0]);
    const positions=[],uv=[],indices=[],around=corners.length*8,rows=9;
    for(let row=0;row<rows;row++)for(let i=0;i<around;i++){
      const edge=Math.floor(i/8),t=(i%8)/8,a=corners[edge],b=corners[(edge+1)%corners.length];
      const fraction=1-row/rows,angle=center[0]+(a[0]+(b[0]-a[0])*t-center[0])*fraction;
      const y=center[1]+(a[1]+(b[1]-a[1])*t-center[1])*fraction;
      positions.push(...surface(angle,y,offset+(row? .0015:0)).toArray());uv.push(angle/Math.PI,y*3);
      if(row){const n=row*around+i,next=row*around+(i+1)%around;
        indices.push(n-around,n,next-around,next-around,n,next);
      }
    }
    const middle=positions.length/3;positions.push(...surface(center[0],center[1],offset+.0015).toArray());uv.push(center[0]/Math.PI,center[1]*3);
    for(let i=0;i<around;i++)indices.push((rows-1)*around+i,middle,(rows-1)*around+(i+1)%around);
    // Use the contour orientation, not a bevel normal, to face every plate out.
    const area=corners.reduce((sum,a,i)=>{const b=corners[(i+1)%corners.length];return sum+a[0]*b[1]-b[0]*a[1];},0);
    if(area<0){
      for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
    return part(helmet,g,material);
  }
  function channel(points,width=.005,material=light){
    function strip(w,offset,mat){
      const vertices=[],indices=[];
      for(let i=0;i<points.length;i++){
        const p=new T.Vector3(...points[i]),before=new T.Vector3(...points[Math.max(0,i-1)]),after=new T.Vector3(...points[Math.min(points.length-1,i+1)]);
        const direction=after.sub(before).normalize(),normal=new T.Vector3(p.x,Math.max(0,p.y)*.5,p.z-.014).normalize();
        const across=direction.cross(normal).normalize().multiplyScalar(w/2);
        p.addScaledVector(normal,offset);
        vertices.push(...p.clone().add(across).toArray(),...p.clone().sub(across).toArray());
        if(i){const n=i*2;indices.push(n-2,n,n-1,n-1,n,n+1);}
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();part(helmet,g,mat);
    }
    strip(width*1.8,-.0015,black);strip(width,0,material);
  }
  function surfaceNormal(angle,y){
    return surface(angle,y+.001).sub(surface(angle,y-.001))
      .cross(surface(angle+.001,y).sub(surface(angle-.001,y))).normalize();
  }
  function surfaceChannel(corners,width,material=light,offset=.015){
    const points=[];
    for(let i=1;i<corners.length;i++){
      const a=corners[i-1],b=corners[i];
      // Follow the shell between each hard corner rather than cutting a chord
      // through it. Keep a shared vertex at the bend for a crisp LED channel.
      for(let step=i===1?0:1;step<=12;step++){
        const t=step/12;
        points.push(surface(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,offset).toArray());
      }
    }
    channel(points,width,material);
  }
  const ventMaterial=jawMaterial.clone();ventMaterial.name='Shadow / vent honeycomb';ventMaterial.color.setHex(0x3d3e45);
  const intakeMaterial=jawMaterial.clone();intakeMaterial.name='Shadow / intake carrier';intakeMaterial.color.setHex(0x35363f);
  const intakeLight=light.clone();intakeLight.name='Shadow / twin intake strips';
  const rearLight=light.clone();rearLight.name='Shadow / rear service light';
  disposables.push(ventMaterial,intakeMaterial,intakeLight,rearLight);
  // Three front crown fields and separate rear fields. Their gaps expose the
  // continuous black shell, so seams cannot turn into disconnected floating plates.
  plate([[-.40,.044],[-.47,.092],[-.31,.154],[-.16,.170],
    [.16,.170],[.31,.154],[.47,.092],[.40,.044],[.17,.034],[-.17,.034]],crownMaterial,.006);
  for(const sign of [-1,1]){
    panel(sign*.43,sign*1.12,.025,.145);
    panel(sign*1.17,sign*1.58,-.002,.122,jawMaterial,.005);
    panel(Math.PI+sign*.43,Math.PI+sign*1.05,-.012,.139);
  }
  panel(Math.PI-.39,Math.PI+.39,.020,.160);
  // Separate occipital and lower side plates break up the flexible dark shell.
  // Their angular perimeters remain visible in profile around the ear housing.
  for(const sign of [-1,1]){
    const side=points=>points.map(([a,y])=>[sign*a,y]);
    plate(side([[1.12,.082],[1.42,.119],[1.83,.112],[2.03,.077],[1.97,.042],[1.46,.039]]));
    plate(side([[2.10,.070],[2.61,.075],[2.73,.034],[2.62,-.020],[2.13,-.029],[1.98,.006]]));
    plate(side([[2.10,-.046],[2.66,-.050],[2.71,-.116],[2.40,-.151],[2.04,-.120],[1.97,-.078]]));
    plate(side([[1.13,-.061],[1.51,-.056],[1.89,-.074],[1.94,-.126],[1.61,-.166],[1.20,-.143]]));
    plate(side([[1.14,-.155],[2.04,-.147],[2.15,-.172],[1.83,-.197],[1.43,-.190]]));
  }
  // A narrow, recessed crown indicator follows the forehead's slope.
  const crownPoint=surface(0,.127,.007);
  part(helmet,bevelBox(.086,.026,.010,.003),black,crownPoint.toArray(),[.64,0,0]);
  part(helmet,bevelBox(.068,.008,.004,.001),light,
    [0,crownPoint.y+.003,crownPoint.z-.008],[.64,0,0]);

  // Temple seams are projected onto the actual dome, including the rear view.
  for(const sign of [-1,1]){
    surfaceChannel([[1.70,.150],[1.15,.145],[.98,.095],[.63,.043]]
      .map(([a,y])=>[sign*a,y]),.0065);
    surfaceChannel([[.66,.123],[.84,.092],[.84,.036]]
      .map(([a,y])=>[Math.PI+sign*a,y]),.0045);
    for(const [a,y] of [[.93,.092],[1.24,.058]]){
      const p=surface(sign*a,y,.009);
      part(helmet,new T.SphereGeometry(.004,8,6),black,p.toArray());
    }
    // Recessed hex fasteners on plate edges, with a dark socket at each centre.
    for(const [a,y] of [[1.39,.096],[1.91,.071],[2.19,.049],[2.58,-.066],[1.86,-.107],[1.28,-.128]]){
      const point=surface(sign*a,y,.021),normal=surfaceNormal(sign*a,y);
      const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),normal);
      const washer=new T.RingGeometry(.0016,.0034,6);washer.applyQuaternion(q);
      part(helmet,washer,steel,point.toArray());
      const socket=new T.CircleGeometry(.0016,6);socket.applyQuaternion(q);
      part(helmet,socket,black,point.clone().addScaledVector(normal,.0001).toArray());
    }
    // The concept's short vent marks below the ear and its rear lower accent.
    for(let i=0;i<3;i++)surfaceChannel([[sign*1.54,-.075-i*.012],[sign*1.74,-.081-i*.012]],.0022,dim,.024);
    surfaceChannel([[sign*2.04,-.087],[sign*2.12,-.128]],.008,light,.024);
  }

  for(const sign of [-1,1]){
    for(let row=0;row<5;row++)for(let col=0;col<3;col++){
      const angle=sign*(.48+col*.075+(row%2)*.018),y=.096+row*.0095;
      const point=surface(angle,y,.0025),normal=surfaceNormal(angle,y);
      const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),normal);
      const g=new T.RingGeometry(.0020,.0028,6);g.applyQuaternion(q);
      part(helmet,g,ventMaterial,point.toArray());
    }
  }
  // The side window wraps back almost to the ear, as in the supplied photo.
  // A small extra clearance around the cheekbone avoids shell intersections.
  const eyeX=u=>Math.sin(u*1.42)*.170;
  const eyeZ=u=>.003-Math.cos(u*1.42)*.175-.014*Math.abs(u)-.010*Math.sin(Math.abs(u)*Math.PI);
  const browY=u=>.010+.024*Math.abs(u)**1.8;
  const lowerContour=[[0,-.052],[.20,-.055],[.42,-.084],[.75,-.071],[1,-.036]];
  const lowerY=u=>{
    const x=Math.abs(u);
    for(let i=1;i<lowerContour.length;i++)if(x<=lowerContour[i][0]){
      const a=lowerContour[i-1],b=lowerContour[i],t=(x-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*t;
    }
    return lowerContour.at(-1)[1];
  };
  // The lower visor contour rises at the nose, making two eye cavities within
  // one wrapped surface. This removes the former broad rectangular eye band.
  const visor=grid(7,49,(u,v)=>{
    const x=u*2-1;
    return new T.Vector3(eyeX(x),browY(x)+(lowerY(x)-browY(x))*v,eyeZ(x)-.001*Math.sin(v*Math.PI));
  },true);
  part(helmet,visor,glass);
  // A continuous temple seat joins the visor's side edge to the ear housing.
  // Both its upper and lower boundaries sweep back into the existing shell.
  for(const sign of [-1,1]){
    part(helmet,grid(7,17,(u,v)=>{
      const frontY=-.046+v*.080,backY=-.056+v*.124;
      const front=new T.Vector3(sign*(eyeX(1)+.002),frontY,eyeZ(1)+.001);
      const back=surface(sign*1.53,backY,.010);
      return front.lerp(back,u).add(new T.Vector3(sign*.003*Math.sin(u*Math.PI),0,0));
    },sign<0),templeMaterial);
  }
  // The brow bridges the skull and the glass in depth; its lit edge sits on it.
  part(helmet,grid(4,49,(u,v)=>{
    const x=u*2-1;
    return new T.Vector3(eyeX(x)*1.012,browY(x)+.022*(1-v)+.004,eyeZ(x)+.014*(1-v)-.002);
  },true),jawMaterial);
  const edge=Array.from({length:17},(_,i)=>{
    const u=i/8-1;return [eyeX(u),browY(u)+.003,eyeZ(u)-.004];
  });
  path(helmet,edge,dim,.0013);
  path(helmet,Array.from({length:17},(_,i)=>{
    const u=i/8-1;return [eyeX(u),lowerY(u)-.004,eyeZ(u)-.002];
  }),black,.004);

  // Long recessed intake from the selected concept sheet: dark mesh between
  // two straight luminous strips, with an integrated tapered chin carrier.
  const intakeZ=y=>-.184+Math.max(0,-.080-y)*.24;
  const outer=[[-.030,-.050],[-.057,-.077],[-.045,-.170],[-.027,-.194],
    [.027,-.194],[.045,-.170],[.057,-.077],[.030,-.050]];
  const inner=[[-.011,-.075],[-.023,-.087],[-.019,-.166],[-.012,-.177],
    [.012,-.177],[.019,-.166],[.023,-.087],[.011,-.075]];
  const frameVertices=[],frameIndices=[],steps=[[0,0],[.10,-.003],[.89,-.006],[1,.006]];
  for(const [t,depth] of steps)for(let i=0;i<outer.length;i++){
    const x=outer[i][0]+(inner[i][0]-outer[i][0])*t,y=outer[i][1]+(inner[i][1]-outer[i][1])*t;
    frameVertices.push(x,y,intakeZ(y)+depth);
  }
  for(let row=1;row<steps.length;row++)for(let i=0;i<8;i++){
    const a=(row-1)*8+i,b=(row-1)*8+(i+1)%8,c=row*8+i,d=row*8+(i+1)%8;
    frameIndices.push(a,c,b,b,c,d);
  }
  const carrier=new T.BufferGeometry();carrier.setAttribute('position',new T.Float32BufferAttribute(frameVertices,3));
  carrier.setIndex(frameIndices);const facetedCarrier=carrier.toNonIndexed();facetedCarrier.computeVertexNormals();carrier.dispose();part(helmet,facetedCarrier,intakeMaterial);
  part(helmet,grid(14,3,(u,v)=>{
    const y=-.076-v*.102,width=.023-.008*v;return new T.Vector3((u*2-1)*width,y,intakeZ(y)+.010);
  },true),black);
  for(const sign of [-1,1]){
    channel([[sign*.027,-.086,intakeZ(-.086)-.007],
      [sign*.021,-.166,intakeZ(-.166)-.007]],.0045,intakeLight);
  }
  for(let row=0;row<11;row++)for(let col=-1;col<=1;col++){
    const y=-.088-row*.0073,x=col*.008+(row%2)*.003;
    if(Math.abs(x)>.012)continue;
    part(helmet,new T.RingGeometry(.0022,.0030,6),ventMaterial,[x,y,intakeZ(y)+.008]);
  }
  // A ruled cheek surface follows the actual lower lens contour all the way
  // to the chin, so there are no isolated cheek polygons or exposed seams.
  function lowerCheek(u){return new T.Vector3(.027+.123*u,-.190+.070*u,-.155+.125*u**1.3);}
  function diagonalJaw(){
    // One bevelled side plate runs diagonally from beneath the ear to the
    // respirator. Its vent is cut into the plate, with the mesh recessed in it.
    const outline=[
      [-.054,.010],[-.059,-.028],[-.081,-.100],
      [-.103,-.144],[-.177,-.146],[-.153,-.061],[-.126,.012]
    ].map(([y,z])=>new T.Vector3(.178+.40*z+.35*(y+.060),y,z));
    const centre=outline.reduce((sum,p)=>sum.add(p),new T.Vector3()).multiplyScalar(1/outline.length);
    const normal=new T.Vector3();
    for(let i=0;i<outline.length;i++)normal.add(outline[i].clone().sub(centre).cross(outline[(i+1)%outline.length].clone().sub(centre)));
    if(normal.x<0){outline.reverse();normal.negate();}normal.normalize();
    const positions=[],uv=[],indices=[],count=outline.length;
    for(const [scale,lift] of [[1,0],[.96,.002],[.80,.004]])for(const p of outline){
      const v=p.clone().sub(centre).multiplyScalar(scale).add(centre).addScaledVector(normal,lift);
      positions.push(...v.toArray());uv.push((v.z+.17)/.19,(v.y+.18)/.14);
    }
    for(let row=1;row<3;row++)for(let i=0;i<count;i++){
      const a=(row-1)*count+i,b=(row-1)*count+(i+1)%count,c=row*count+i,d=row*count+(i+1)%count;
      indices.push(a,b,c,b,d,c);
    }
    const middle=positions.length/3;positions.push(...centre.clone().addScaledVector(normal,.004).toArray());uv.push(.5,.5);
    for(let i=0;i<count;i++)indices.push(count*2+i,count*2+(i+1)%count,middle);
    const raw=new T.BufferGeometry();raw.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    raw.setAttribute('uv',new T.Float32BufferAttribute(uv,2));raw.setIndex(indices);
    const flat=raw.toNonIndexed();flat.computeVertexNormals();raw.dispose();
    const proxy=new T.Mesh(flat,sideJawMaterial);
    const plateX=(y,z)=>new T.Raycaster(new T.Vector3(1,y,z),new T.Vector3(-1,0,0)).intersectObject(proxy)[0]?.point.x??.12;
    const vent=[{x:-.127,bottom:-.143,top:-.116},{x:-.083,bottom:-.126,top:-.093}];
    const rotated=flat.clone().rotateY(Math.PI/2),cut=cutHelmetWindow(rotated,vent,-.09);
    cut.rotateY(-Math.PI/2);rotated.dispose();part(helmet,cut,sideJawMaterial);
    const backing=[];
    for(const [z,y] of [[-.127,-.143],[-.083,-.126],[-.127,-.116],[-.083,-.093]])backing.push(plateX(y,z)-.003,y,z);
    const back=new T.BufferGeometry();back.setAttribute('position',new T.Float32BufferAttribute(backing,3));
    back.setIndex([0,2,1,1,2,3]);back.computeVertexNormals();part(helmet,back,black);
    for(let col=0;col<5;col++)for(let row=0;row<4;row++){
      const u=(col+.5)/5,z=-.127+.044*u,y=-.143+.017*u+.004+row*.006+(col%2)*.001;
      part(helmet,new T.RingGeometry(.0020,.0027,6),ventMaterial,[plateX(y,z)-.0015,y,z],[0,Math.PI/2,0]);
    }
    const upper=outline.filter(p=>p.y>-.110&&p.z<-.020).sort((a,b)=>b.z-a.z);
    channel(upper.map(p=>p.clone().addScaledVector(normal,.0045).toArray()),.0025,dim);
    channel([[-.153,-.106],[-.166,-.140]].map(([y,z])=>
      new T.Vector3(.178+.40*z+.35*(y+.060),y,z).addScaledVector(normal,.005).toArray()),.0035);
    flat.dispose();
  }
  function cheek(sign){
    part(helmet,armourField([.15,.20,.42,.65,.82,1],[0,.13,.87,1],(u,v)=>{
      const top=new T.Vector3(eyeX(u),lowerY(u)-.004,eyeZ(u)+.003);
      const bottom=lowerCheek(u);
      const p=top.lerp(bottom,v);
      // A broad raised central face with small bevels at the lens/chin edges.
      p.z-=.004*Math.min(1,v/.13,(1-v)/.13);
      if(u<.34)p.z=Math.max(p.z,intakeZ(p.y)+.014*(.34-u)/.19);
      // Seat the planar outer jaw plate into the softer inner shell.
      p.x-=.016*Math.sin(Math.PI*Math.max(0,(u-.35)/.65))*Math.sin(v*Math.PI);
      p.x*=sign;return p;
    },sign>0),cheekMaterial);
    if(sign>0)diagonalJaw();
  }
  cheek(-1);cheek(1);
  // The chin is one wraparound volume beneath the cheeks and the intake.
  // Its upper seam reuses the cheek's exact lower contour, including the
  // nose transition; the small lower bevel tucks back toward the neck.
  part(helmet,grid(4,41,(u,v)=>{
    const x=u*2-1,side=Math.abs(x),sign=Math.sign(x),top=side>=.15?lowerCheek(side):
      new T.Vector3(0,-.194,intakeZ(-.194)+.003).lerp(lowerCheek(.15),side/.15);
    top.x*=sign;
    const bottom=new T.Vector3(top.x*.96,top.y-.010,top.z+.006);
    return bottom.lerp(top,v).add(new T.Vector3(0,0,-.001*Math.sin(v*Math.PI)));
  }),chinMaterial);
  for(const x of [-.014,0,.014])block(helmet,.006,.004,.004,black,x,-.196,intakeZ(-.196)+.004);

  // The extended side window needs a real opening in the shell and temple
  // plates; placing glass over an intact shell would leave black polygons.
  const samples=new Set(Array.from({length:65},(_,i)=>i/32-1));
  for(const [u] of lowerContour){samples.add(u);samples.add(-u);}
  const windowContour=[...samples].sort((a,b)=>a-b).map(u=>({x:eyeX(u),bottom:lowerY(u)-.0008,top:browY(u)+.0008}));
  const sideSamples=new Set(Array.from({length:33},(_,i)=>.30+i*.70/32));
  for(const [u] of lowerContour)if(u>=.30)sideSamples.add(u);
  const sideContour=[...sideSamples].map(u=>({x:eyeZ(u),bottom:lowerY(u)-.0008,top:browY(u)+.0008})).sort((a,b)=>a.x-b.x);
  const cutMaterials=new Set([shellMaterial,crownMaterial,jawMaterial,panelMaterial,templeMaterial]);
  for(const mesh of helmet.children)if(cutMaterials.has(mesh.material)){
    mesh.updateMatrix();
    const placed=mesh.geometry.clone().applyMatrix4(mesh.matrix);
    const frontCut=cutHelmetWindow(placed,windowContour,-.020);
    // Also clear the side projection: an outer temple can sit beyond the
    // lens's maximum X while still hiding it when seen in profile. The caller
    // reflects the completed positive half to obtain the opposite opening.
    frontCut.rotateY(Math.PI/2);
    const cut=cutHelmetWindow(frontCut,sideContour,-.130);cut.rotateY(-Math.PI/2);frontCut.dispose();
    cut.applyMatrix4(mesh.matrix.clone().invert());placed.dispose();
    const positions=cut.getAttribute('position');
    for(let i=0;i<positions.count;i++)if(Math.abs(positions.getX(i))<1e-9)positions.setX(i,0);
    mesh.geometry=cut;disposables.push(cut);
  }

  // Ear modules sit beside the middle of the side window, bedded into the
  // shell. Their circular face remains visible in profile.
  for(const sign of [-1,1]){
    const x=sign*.159,y=-.012,z=.025;
    part(helmet,new T.CylinderGeometry(.065,.064,.019,8),jawMaterial,[sign*.156,y,z],[0,0,Math.PI/2]);
    part(helmet,new T.CylinderGeometry(.058,.058,.024,32),black,[x,y,z],[0,0,Math.PI/2]);
    part(helmet,new T.CylinderGeometry(.050,.053,.022,32),jawMaterial,
      [sign*.173,y,z],[0,0,Math.PI/2]);
    part(helmet,new T.CylinderGeometry(.037,.037,.006,32),graphite,
      [sign*.187,y,z],[0,0,Math.PI/2]);
    for(let j=0;j<4;j++){
      const points=Array.from({length:9},(_,i)=>{
        const a=j*Math.PI/2+.13+i/8*(Math.PI/2-.26);
        return [sign*.191,y+.044*Math.cos(a),z+.044*Math.sin(a)];
      });
      path(helmet,points,light,.0027);
    }
    const emblem=[[-.021,.014],[.021,.014],[0,-.022]];
    for(let edge=0;edge<3;edge++){
      const a=emblem[edge],b=emblem[(edge+1)%3],mid=[(a[0]+b[0])*.12,(a[1]+b[1])*.12];
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([
        sign*.192,y+a[1],z+a[0],sign*.192,y+b[1],z+b[0],sign*.192,y+mid[1],z+mid[0]
      ],3));g.computeVertexNormals();part(helmet,g,light);
    }
    for(const j of [-1,1])part(helmet,new T.CylinderGeometry(.0035,.0035,.003,8),steel,
      [sign*.192,y+j*.027,z],[0,0,Math.PI/2]);
    panel(sign*1.05,sign*1.48,-.123,-.056,jawMaterial,.007);
  }

  // Segmented occipital bridge, seams, and a low rear service indicator.
  panel(Math.PI-.46,Math.PI+.46,-.136,-.048,jawMaterial,.008);
  path(helmet,Array.from({length:19},(_,i)=>surface(Math.PI-.92+i/18*1.84,-.034,.009).toArray()),black,.0035);
  const rear=surface(Math.PI,-.005,.010);
  part(helmet,bevelBox(.030,.055,.012,.004),black,rear.toArray());
  part(helmet,bevelBox(.010,.038,.004,.002),rearLight,[0,rear.y,rear.z+.009]);
  for(const sign of [-1,1]){
    path(helmet,[[.45,-.060],[.56,-.092],[.48,-.122]]
      .map(([a,y])=>surface(Math.PI+sign*a,y,.010).toArray()),dim,.002);
  }
}
