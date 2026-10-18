import * as T from './vendor/three.webgpu.min.js';

/**
 * Cape d'essayage Pink War : le soldat AÉGIS, ses bones et ses matériaux
 * sont chargés depuis le jeu d'origine. Seule la cape est nouvelle.
 * Coordonnées exprimées dans le repère d'origine du soldat (~2 m avant échelle).
 */
export function addCapeToOriginalSoldier(model, profile) {
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

  // Tissu noir mat sans logo. Liseré rose GHJU, bleu LYLU, y compris l'ourlet.
  const sheet=document.createElement('canvas');
  sheet.width=512; sheet.height=1024;
  const ctx=sheet.getContext('2d');
  const black=ctx.createLinearGradient(0,0,512,1024);
  black.addColorStop(0,'#16171b');
  black.addColorStop(.45,'#0c0c0f');
  black.addColorStop(1,'#17171b');
  ctx.fillStyle=black; ctx.fillRect(0,0,512,1024);
  const piping=profile.masculine?'#62b8ff':'#f24797';
  const pipingHex=profile.masculine?0x62b8ff:0xf24797;
  ctx.fillStyle=piping;
  ctx.fillRect(0,0,9,1024);
  ctx.fillRect(503,0,9,1024);
  ctx.fillRect(0,1015,512,9);
  const texture=new T.CanvasTexture(sheet);
  texture.colorSpace=T.SRGBColorSpace;
  texture.anisotropy=4;

  const geometry=new T.BufferGeometry();
  const vertexAttribute=new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage);
  geometry.setAttribute('position',vertexAttribute);
  geometry.setAttribute('uv',new T.BufferAttribute(uv,2));
  geometry.setIndex(indices);

  const fabric=new T.MeshStandardMaterial({
    map:texture,side:T.DoubleSide,roughness:.98,metalness:0,
    emissive:0x141419,emissiveIntensity:.22
  });
  const cloth=new T.Mesh(geometry,fabric);
  cloth.name='AÉGIS / Cape rectangulaire noire, bordure '+(profile.masculine?'bleue':'rose');
  cloth.castShadow=true;
  cloth.receiveShadow=true;
  cloth.frustumCulled=false;

  // Bordures en vraies lignes 3D : restent lisibles lorsque la cape est vue de profil.
  const borderMaterial=new T.LineBasicMaterial({
    color:pipingHex,transparent:false,depthTest:true,toneMapped:false
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

  // Le point de fixation d'origine V4 est relevé derrière les épaules :
  // y=1.535, z=.166, caché par la protection dorsale (y 1.30–1.55).
  // En allongeant le tissu, le bas reste au même niveau qu'avant.
  // La cape est désormais aussi étroite que le boîtier (34 cm).

  //
  // Les coordonnées AÉGIS sont celles du modèle racine, et non les coordonnées
  // locales de l'os animé. Convertir explicitement position et orientation
  // avant de créer la filiation évite le déport causé par l'orientation du bone.
  model.root.updateMatrixWorld(true);
  const anchor=new T.Group();
  anchor.name='Fixation sous module dorsal, repère Spine2';
  const desiredPoint=model.root.localToWorld(new T.Vector3(0,1.535,.166));
  const rootQuaternion=model.root.getWorldQuaternion(new T.Quaternion());
  const bodyQuaternion=model.body.getWorldQuaternion(new T.Quaternion());
  anchor.position.copy(model.body.worldToLocal(desiredPoint));
  anchor.quaternion.copy(bodyQuaternion.invert().multiply(rootQuaternion));
  model.body.add(anchor);
  anchor.add(cloth);
  cloth.position.set(0,0,0);
  cloth.rotation.set(0,0,0);


  // Animations continues amorties (mouvement d'ensemble + vague se propageant
  // le long du tissu). Le haut reste parfaitement fixe sous le bloc dorsal.
  const sway=new Float32Array(rows+1);
  const swayVelocity=new Float32Array(rows+1);
  const billow=new Float32Array(rows+1);
  const billowVelocity=new Float32Array(rows+1);
  let previousTime=null, activitySmooth=.12;
  function update(time,motion='idle',wind=.6) {
    const dt=previousTime==null?.016:Math.max(.001,Math.min(.04,time-previousTime));
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
        .010*Math.sin(time*.52-v*1.4));
      const targetBillow=lag*(
        .012+.065*strength +
        (.008+.045*strength)*Math.sin(time*(1.22+activitySmooth*.65)-v*3.6));
      // Ressort amorti avec transmission vers les rangées inférieures.
      const spring=19-5*v, damping=7.6-2.7*v, transfer=9;
      const lateral=(targetSway-sway[j])*spring-swayVelocity[j]*damping+
        (sway[j-1]-sway[j])*transfer;
      const depth=(targetBillow-billow[j])*spring-billowVelocity[j]*damping+
        (billow[j-1]-billow[j])*transfer;
      swayVelocity[j]+=lateral*dt;
      billowVelocity[j]+=depth*dt;
      sway[j]+=swayVelocity[j]*dt;
      billow[j]+=billowVelocity[j]*dt;
    }
    sway[0]=0;billow[0]=0;swayVelocity[0]=0;billowVelocity[0]=0;

    for(let j=0;j<=rows;j++) {
      const v=j/rows,lag=Math.pow(v,1.4);
      // RECTANGLE : largeur de ~34 cm du haut jusqu'à l'ourlet,
      // avec seulement une rondeur microscopique au milieu.
      const width=.338+.003*Math.sin(Math.PI*v);
      for(let i=0;i<=columns;i++) {
        const u=i/columns,edge=2*u-1,n=(j*(columns+1)+i)*3;
        // Deux plis verticaux amples, sans vibrations rapides.
        const fold=Math.sin(u*Math.PI*3.2+v*1.8-time*.72)
          *(.0035+.005*strength)*lag;
        // Les coutures verticales suivent la même largeur : effet rectangulaire.
        positions[n]=edge*width*.5+sway[j]+fold;
        positions[n+1]=-1.035*v
          +.008*lag*Math.sin(time*1.05-v*2.9+edge*1.1)*(strength+.10);
        // Douce courbure pour donner du volume dans les vues de profil.
        positions[n+2]=.025*v+.035*(1-edge*edge)*lag+billow[j]+fold*.45;
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
    for(const strip of [leftEdge,rightEdge,lowerEdge])
      strip.geometry.attributes.position.needsUpdate=true;
  }
  update(0,'idle',.60);

  return {
    anchor,update,
    dispose(){
      for(const strip of [leftEdge,rightEdge,lowerEdge])strip.geometry.dispose();
      borderMaterial.dispose(); geometry.dispose();fabric.dispose();texture.dispose();
    }
  };
}
