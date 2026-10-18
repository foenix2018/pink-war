import * as T from './vendor/three.webgpu.min.js';

/**
 * Cape d'essayage Pink War : le soldat AÉGIS, ses bones et ses matériaux
 * sont chargés depuis le jeu d'origine. Seule la cape est nouvelle.
 * Coordonnées exprimées dans le repère d'origine du soldat (~2 m avant échelle).
 */
export function addCapeToOriginalSoldier(model, profile) {
  const columns=24, rows=32;
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

  // Noir mat sans logo ni dessin. Uniquement deux liserés roses et l'ourlet.
  const sheet=document.createElement('canvas');
  sheet.width=512; sheet.height=1024;
  const ctx=sheet.getContext('2d');
  const black=ctx.createLinearGradient(0,0,512,1024);
  black.addColorStop(0,'#16171b');
  black.addColorStop(.45,'#0c0c0f');
  black.addColorStop(1,'#17171b');
  ctx.fillStyle=black; ctx.fillRect(0,0,512,1024);
  ctx.fillStyle='#f24797';
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
  cloth.name='AÉGIS / Cape noire et liseré rose';
  cloth.castShadow=true;
  cloth.receiveShadow=true;
  cloth.frustumCulled=false;

  // Bordures en vraies lignes 3D : restent lisibles lorsque la cape est vue de profil.
  const borderMaterial=new T.LineBasicMaterial({
    color:0xff4596,transparent:false,depthTest:true,toneMapped:false
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
  const leftEdge=border(rows+1,'Liseré rose gauche');
  const rightEdge=border(rows+1,'Liseré rose droit');
  const lowerEdge=border(columns+1,'Ourlet rose');

  // Le bloc dorsal du modèle AÉGIS V3 est sur Spine2, centré environ en
  // x=0, y=1.413, z=.162 et sa partie basse est à y~1.297.
  // La couture supérieure est juste SOUS le bloc, avec un léger recouvrement,
  // dans l'axe du dos plutôt que dans le vide à l'arrière.
  //
  // Les coordonnées AÉGIS sont celles du modèle racine, et non les coordonnées
  // locales de l'os animé. Convertir explicitement position et orientation
  // avant de créer la filiation évite le déport causé par l'orientation du bone.
  model.root.updateMatrixWorld(true);
  const anchor=new T.Group();
  anchor.name='Fixation sous module dorsal, repère Spine2';
  const desiredPoint=model.root.localToWorld(new T.Vector3(0,1.282,.150));
  const rootQuaternion=model.root.getWorldQuaternion(new T.Quaternion());
  const bodyQuaternion=model.body.getWorldQuaternion(new T.Quaternion());
  anchor.position.copy(model.body.worldToLocal(desiredPoint));
  anchor.quaternion.copy(bodyQuaternion.invert().multiply(rootQuaternion));
  model.body.add(anchor);
  anchor.add(cloth);
  cloth.position.set(0,0,0);
  cloth.rotation.set(0,0,0);

  // Suivi amorti des plis : oscillation lente en haut, inertie croissante
  // vers l'ourlet et onde plus rapide lors de la course.
  const sway=new Float32Array(rows+1);
  const swayVelocity=new Float32Array(rows+1);
  const billow=new Float32Array(rows+1);
  const billowVelocity=new Float32Array(rows+1);
  let previousTime=null;
  function update(time, motion='idle', wind=.6) {
    const dt=previousTime==null?.016:Math.max(.001,Math.min(.04,time-previousTime));
    previousTime=time;
    const active=motion==='run'||motion==='runFire'?1:
      motion==='walk'||motion==='walkFire'||motion==='crouchWalk'?.50:
      motion==='jump'?.78:.12;
    const strength=Math.max(0,Math.min(1,wind))*active;

    for(let j=1;j<=rows;j++) {
      const v=j/rows;
      const lag=v*v;
      const targetSway=
        Math.sin(time*(1.35+active*1.3)-v*2.7)*(.006+.045*strength)*lag;
      const targetBillow=
        Math.sin(time*(1.85+active*1.4)-v*3.6)*(.004+.045*strength)*lag;
      const spring=22-9*v, damping=8-2*v;
      const continuity=6;
      const ax=(targetSway-sway[j])*spring-swayVelocity[j]*damping+
        (sway[j-1]-sway[j])*continuity;
      const az=(targetBillow-billow[j])*spring-billowVelocity[j]*damping+
        (billow[j-1]-billow[j])*continuity;
      swayVelocity[j]+=ax*dt;
      billowVelocity[j]+=az*dt;
      sway[j]+=swayVelocity[j]*dt;
      billow[j]+=billowVelocity[j]*dt;
    }
    // Bord supérieur entièrement fixé (aucune ondulation qui le détache).
    sway[0]=billow[0]=swayVelocity[0]=billowVelocity[0]=0;

    for(let j=0;j<=rows;j++) {
      const v=j/rows;
      const spread=.137+.42*Math.pow(v,.87);
      const lag=Math.pow(v,1.35);
      for(let i=0;i<=columns;i++) {
        const u=i/columns;
        const edge=2*u-1;
        const n=(j*(columns+1)+i)*3;
        const folds=(Math.sin(u*Math.PI*5.5+v*3.0-time*(1.05+active))*.008 +
          Math.sin(u*Math.PI*3.2-v*4.3+time*.8)*.004)*lag*(.25+strength);

        // Évasement du tissu en bas, sous l'armure, sans traverser le bassin.
        positions[n]=edge*spread*.5+sway[j]+folds;
        positions[n+1]=-.785*v+.017*(edge*edge)*lag+
          Math.sin(time*2.05-v*4.6+edge*2.3)*.004*strength*lag;
        // Courbure transversale pour éviter une feuille plane invisible de profil.
        // Les bords viennent près du dos, le centre forme un volume textile.
        positions[n+2]=
          -.022*edge*edge*lag+.052*(1-edge*edge)*lag+
          .014*v+billow[j]+folds*.8;
      }
    }

    geometry.attributes.position.needsUpdate=true;
    geometry.computeVertexNormals();
    for(let j=0;j<=rows;j++){
      const a=(j*(columns+1))*3;
      const b=(j*(columns+1)+columns)*3;
      leftEdge.data.set(positions.subarray(a,a+3),j*3);
      rightEdge.data.set(positions.subarray(b,b+3),j*3);
    }
    for(let i=0;i<=columns;i++){
      const a=(rows*(columns+1)+i)*3;
      lowerEdge.data.set(positions.subarray(a,a+3),i*3);
    }
    for(const strip of [leftEdge,rightEdge,lowerEdge])strip.geometry.attributes.position.needsUpdate=true;
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
