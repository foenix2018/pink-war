import * as T from './vendor/three.webgpu.min.js';

/**
 * Cape et tabard tissés, attachés au squelette natif de Pink War.
 * Coordonnées exprimées dans le repère d'origine du soldat (~2 m avant échelle).
 */
export function addCapeToOriginalSoldier(model, profile, {front=false}={}) {
  const columns=24, rows=40;
  const vertices=(columns+1)*(rows+1);
  const positions=new Float32Array(vertices*3);
  const uv=new Float32Array(vertices*2), indices=[];

  for(let j=0;j<=rows;j++) {
    for(let i=0;i<=columns;i++) {
      const n=j*(columns+1)+i;
      uv[n*2]=i/columns;
      uv[n*2+1]=1-j/rows;
      if(j<rows&&i<columns) {
        const below=n+columns+1;
        indices.push(n, below, n+1, n+1, below, below+1);
      }
    }
  }

  // Woven black fabric, authored locally; the neon piping is real geometry.
  const size=128, pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4;
    const diagonal=((x+y)%12<2)||((x-y+size)%12<2);
    const thread=(x%3===0||y%3===0)?3:0;
    const c=diagonal?30:15+thread;
    pixels.set([c,c,c+2,255],i);
  }
  const texture=new T.DataTexture(pixels,size,size);
  texture.wrapS=texture.wrapT=T.RepeatWrapping;
  texture.repeat.set(3,9);texture.needsUpdate=true;
  texture.colorSpace=T.SRGBColorSpace;
  texture.anisotropy=4;texture.generateMipmaps=true;
  texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;
  const pipingHex=profile.masculine?0x62b8ff:0xff1688;

  const geometry=new T.BufferGeometry();
  const vertexAttribute=new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage);
  geometry.setAttribute('position',vertexAttribute);
  geometry.setAttribute('uv',new T.BufferAttribute(uv,2));
  geometry.setIndex(indices);

  const fabric=new T.MeshStandardMaterial({
    map:texture,color:0x949498,side:T.DoubleSide,roughness:.98,metalness:0,
    emissive:0x000000,emissiveIntensity:0
  });
  const cloth=new T.Mesh(geometry,fabric);
  cloth.name=(front?'Shadow / tabard frontal tissé, bordure ':'Shadow / cape dorsale tissée, bordure ')+(profile.masculine?'bleue':'rose');
  cloth.castShadow=true;
  cloth.receiveShadow=true;
  cloth.frustumCulled=false;

  // Bordures en vraies lignes 3D : restent lisibles lorsque la cape est vue de profil.
  const borderMaterial=new T.LineBasicMaterial({
    color:pipingHex,transparent:false,depthTest:true,toneMapped:false,linewidth:1
  });
  function border(count, name) {
    const data=new Float32Array(count*3);
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.BufferAttribute(data,3).setUsage(T.DynamicDrawUsage));
    const line=new T.Line(g,borderMaterial);
    line.name=name;
    line.frustumCulled=false;
    cloth.add(line);
    return {data,geometry:g};
  }
  const leftEdge=border(rows+1,'Liseré '+(profile.masculine?'bleu':'rose')+' gauche');
  const rightEdge=border(rows+1,'Liseré '+(profile.masculine?'bleu':'rose')+' droit');
  const lowerEdge=border(columns+1,'Ourlet '+(profile.masculine?'bleu':'rose'));
  const ribbonMaterial=new T.MeshBasicMaterial({color:pipingHex,side:T.DoubleSide,toneMapped:false});
  const ribbons=[rows+1,rows+1,columns+1].map(count=>{
    const g=new T.BufferGeometry(),a=new Float32Array(count*6),indices=[];
    for(let i=0;i<count-1;i++){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
    g.setAttribute('position',new T.BufferAttribute(a,3).setUsage(T.DynamicDrawUsage));g.setIndex(indices);
    const mesh=new T.Mesh(g,ribbonMaterial);mesh.frustumCulled=false;cloth.add(mesh);return {g,a};
  });

  const direction=front?-1:1,topHeight=front?1.32:1.48,length=front?.84:1.13;
  // Cross-sections of the fitted cuirass, waist and belt in the rig's bind
  // frame. The cloth wraps around them instead of hanging on a distant plane.
  const sections=[
    [.95,.184,.127],[1.06,.182,.130],[1.17,.148,.108],
    [1.27,.168,.118],[1.32,.184,.130],[1.39,.211,.140],[1.48,.220,.141]
  ];
  function surface(y,x){
    let a=sections[0],b=a;
    for(let i=1;i<sections.length;i++){
      b=sections[i];if(y<=b[0])break;a=b;
    }
    const t=a===b?0:T.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1);
    const width=T.MathUtils.lerp(a[1],b[1],t),depth=T.MathUtils.lerp(a[2],b[2],t);
    return direction*(depth*Math.sqrt(Math.max(.12,1-(x/width)**2))+.004);
  }
  // The top seam is buried under the lower/front and scapular/back plates.
  const anchor=new T.Group();
  anchor.name=front?'Tabard / fixation sous le sternum':'Cape / fixation sous les plaques dorsales';
  const bodyIndex=model.actor.bones.indexOf(model.body);
  const bindInverse=new T.Matrix4().fromArray(model.actor.data.bones[bodyIndex].inverse);
  const frame=bindInverse.clone().multiply(new T.Matrix4().makeTranslation(0,topHeight,surface(topHeight,0)));
  frame.decompose(anchor.position,anchor.quaternion,anchor.scale);
  model.body.add(anchor);
  anchor.add(cloth);
  cloth.position.set(0,0,0);
  cloth.rotation.set(0,0,0);

  const hip=model.actor.bone('Hips'),hipIndex=model.actor.bones.indexOf(hip);
  const hipBindInverse=new T.Matrix4().fromArray(model.actor.data.bones[hipIndex].inverse);
  const inverseRoot=new T.Matrix4(),bodySkin=new T.Matrix4(),hipSkin=new T.Matrix4(),toAnchor=new T.Matrix4();
  const point=new T.Vector3(),upperPoint=new T.Vector3(),lowerPoint=new T.Vector3();
  // Four inexpensive capsules keep the free fabric outside the moving legs.
  // No raycasts, triangle traversal or per-vertex allocations in the XR loop.
  const capsules=[];
  for(const side of ['Left','Right'])for(const [a,b,r] of [
    ['UpLeg','Leg',front?.172:.132],['Leg','Foot',front?.133:.096]
  ]){
    capsules.push({a:model.actor.bone(side+a),b:model.actor.bone(side+b),r,
      start:new T.Vector3(),end:new T.Vector3()});
  }
  function avoidLegs(p){
    for(const {start:a,end:b,r} of capsules){
      const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
      const t=den<1e-10?0:T.MathUtils.clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/den,0,1);
      const x=a.x+dx*t,y=a.y+dy*t,z=T.MathUtils.lerp(a.z,b.z,t);
      const d2=(p.x-x)**2+(p.y-y)**2;
      if(d2<r*r){
        const boundary=z+direction*(Math.sqrt(r*r-d2)+.005);
        p.z=direction>0?Math.max(p.z,boundary):Math.min(p.z,boundary);
      }
    }
  }

  // Animations continues amorties (mouvement d'ensemble + vague se propageant
  // le long du tissu). Le haut reste parfaitement fixe sous le bloc dorsal.
  const sway=new Float32Array(rows+1);
  const swayVelocity=new Float32Array(rows+1);
  const billow=new Float32Array(rows+1);
  const billowVelocity=new Float32Array(rows+1);
  let previousTime=null, activitySmooth=.12;
  function update(time,motion='idle',wind=.6,{symmetric=false,velocity=0,lateral=0,turn=0}={}) {
    const dt=previousTime==null?.016:Math.max(0,Math.min(.04,time-previousTime));
    previousTime=time;
    const targetActivity=
      motion==='run'||motion==='runFire'?1:
      motion==='walk'||motion==='walkFire'||motion==='crouchWalk'?.52:
      motion==='jump'?.76:.12;
    // Pas de rupture de vitesse lors des changements marche/course/repos.
    activitySmooth+=(targetActivity-activitySmooth)*(1-Math.exp(-dt*3.1));
    const strength=Math.max(0,Math.min(1,wind))*activitySmooth;
    for(let j=1;j<=rows;j++) {
      const v=j/rows,lag=Math.pow(v,1.50);
      // Ondulation retardée depuis l'attache : l'ourlet garde son inertie.
      const targetSway=lag*(
        (.011+.072*strength)*Math.sin(time*(1.0+activitySmooth)-v*3.0) +
        .010*Math.sin(time*.52-v*1.4)-Math.max(-.08,Math.min(.08,lateral*.012+turn*.035)));
      const targetBillow=lag*(
        .012+.065*strength+Math.max(-.008,Math.min(.09,velocity*.012)) +
        (.008+.045*strength)*Math.sin(time*(1.22+activitySmooth*.65)-v*3.6));
      // Ressort amorti avec transmission vers les rangées inférieures.
      const spring=19-5*v, damping=7.6-2.7*v, transfer=9;
      const lateralForce=(targetSway-sway[j])*spring-swayVelocity[j]*damping+
        (sway[j-1]-sway[j])*transfer;
      const depth=(targetBillow-billow[j])*spring-billowVelocity[j]*damping+
        (billow[j-1]-billow[j])*transfer;
      swayVelocity[j]+=lateralForce*dt;
      billowVelocity[j]+=depth*dt;
      sway[j]+=swayVelocity[j]*dt;
      billow[j]+=billowVelocity[j]*dt;
    }
    sway[0]=0;billow[0]=0;swayVelocity[0]=0;billowVelocity[0]=0;

    model.root.updateMatrixWorld(true);
    inverseRoot.copy(model.root.matrixWorld).invert();
    bodySkin.multiplyMatrices(inverseRoot,model.body.matrixWorld).multiply(bindInverse);
    hipSkin.multiplyMatrices(inverseRoot,hip.matrixWorld).multiply(hipBindInverse);
    toAnchor.copy(anchor.matrixWorld).invert().multiply(model.root.matrixWorld);
    for(const c of capsules){
      c.start.setFromMatrixPosition(c.a.matrixWorld).applyMatrix4(inverseRoot);
      c.end.setFromMatrixPosition(c.b.matrixWorld).applyMatrix4(inverseRoot);
    }
    if(symmetric)for(let i=0;i<2;i++)for(const end of ['start','end']){
      const a=capsules[i][end],b=capsules[i+2][end];
      const x=(Math.abs(a.x)+Math.abs(b.x))*.5,y=(a.y+b.y)*.5,z=(a.z+b.z)*.5;
      a.set(-x,y,z);b.set(x,y,z);
    }

    for(let j=0;j<=rows;j++) {
      const v=j/rows,lag=Math.pow(v,1.4);
      const y=topHeight-length*v;
      const release=T.MathUtils.smoothstep(1.22-y,0,.30);
      const width=front?(.265+.060*v):(.340+.240*Math.pow(v,1.25));
      for(let i=0;i<=columns;i++) {
        const u=i/columns,edge=2*u-1,n=(j*(columns+1)+i)*3;
        // Deux plis verticaux amples, sans vibrations rapides.
        const fold=(symmetric?.0025*Math.sin(v*Math.PI)*Math.cos(edge*Math.PI*2):
          Math.sin(u*Math.PI*3.2+v*1.8-time*.72)*(.0035+.005*strength)*lag)*release;
        const x=edge*width*.5;
        const z=surface(Math.max(.95,y),x);
        point.set(x,y,z);
        if(y>=1.06){
          // Share the bend between chest and pelvis. A crouch must not make
          // the whole metre of cape rotate as a rigid extension of the chest.
          const chestWeight=T.MathUtils.smoothstep(y,1.06,front?1.32:1.39);
          upperPoint.copy(point).applyMatrix4(bodySkin);
          lowerPoint.copy(point).applyMatrix4(hipSkin);
          point.copy(lowerPoint).lerp(upperPoint,chestWeight);
        }else{
          point.set(x,1.06,surface(1.06,x)).applyMatrix4(hipSkin);
          point.y+=y-1.06;
          point.z+=z-surface(1.06,x);
        }
        if(!symmetric){
          point.x+=(sway[j]+fold)*release;
          point.y+=.008*lag*Math.sin(time*1.05-v*2.9+edge*1.1)*(strength+.10)*release;
        }
        point.z+=direction*(billow[j]+fold*.45)*release;
        if(y<1.06)avoidLegs(point);
        point.y=Math.max(.055,point.y);
        point.applyMatrix4(toAnchor).toArray(positions,n);
      }
    }
    geometry.attributes.position.needsUpdate=true;
    geometry.computeVertexNormals();
    // Les liserés 3D suivent précisément la géométrie déformée.
    for(let j=0;j<=rows;j++){
      const a=j*(columns+1)*3,b=(j*(columns+1)+columns)*3;
      leftEdge.data.set(positions.subarray(a,a+3),j*3);
      rightEdge.data.set(positions.subarray(b,b+3),j*3);
    }
    for(let i=0;i<=columns;i++){
      const a=(rows*(columns+1)+i)*3;
      lowerEdge.data.set(positions.subarray(a,a+3),i*3);
    }
    const strips=[leftEdge,rightEdge,lowerEdge];
    for(let k=0;k<strips.length;k++){
      const strip=strips[k],{g,a}=ribbons[k];
      strip.geometry.attributes.position.needsUpdate=true;
      for(let i=0;i<strip.data.length/3;i++){
        const p=i*3,n=i*6;
        for(let side=0;side<2;side++){
          a[n+side*3]=strip.data[p]+(k<2?(side-.5)*.005:0);
          a[n+side*3+1]=strip.data[p+1]+(k===2?(side-.5)*.005:0);
          a[n+side*3+2]=strip.data[p+2]+(front?-.001:.001);
        }
      }
      g.attributes.position.needsUpdate=true;
    }
  }
  update(0,'idle',.60);

  return {
    anchor,update,
    dispose(){
      for(const strip of [leftEdge,rightEdge,lowerEdge])strip.geometry.dispose();
      for(const {g} of ribbons)g.dispose();ribbonMaterial.dispose();
      anchor.removeFromParent();
      borderMaterial.dispose(); geometry.dispose();fabric.dispose();texture.dispose();
    }
  };
}
