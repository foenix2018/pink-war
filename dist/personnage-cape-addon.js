import * as T from './vendor/three.webgpu.min.js';
// Cape de démonstration, ajoutée au rig EXISTANT sans changer le personnage.
export function addCapeToOriginalSoldier(model,profile){
  const cols=22,rows=26;
  const sheet=document.createElement('canvas');sheet.width=512;sheet.height=1024;
  // Tissu noir mat avec un simple liseré rose sur les deux côtés et l'ourlet.
  // Aucun grand motif rose : le modèle AÉGIS d'origine reste inchangé.
  const c=sheet.getContext('2d');
  const black=c.createLinearGradient(0,0,512,1024);
  black.addColorStop(0,'#0c0c10');
  black.addColorStop(.5,'#17171c');
  black.addColorStop(1,'#08090d');
  c.fillStyle=black;c.fillRect(0,0,512,1024);
  const piping='#fa3f92';
  c.fillStyle=piping;
  c.fillRect(0,0,11,1024);
  c.fillRect(501,0,11,1024);
  c.fillRect(0,1012,512,12);
  const tex=new T.CanvasTexture(sheet);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;
  const arr=new Float32Array((cols+1)*(rows+1)*3),uv=new Float32Array((cols+1)*(rows+1)*2),ids=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
    const p=j*(cols+1)+i;uv[p*2]=i/cols;uv[p*2+1]=1-j/rows;
    if(j<rows&&i<cols){const n=p+cols+1;ids.push(p,n,p+1,p+1,n,n+1);}
  }
  const geom=new T.BufferGeometry();
  geom.setAttribute('position',new T.BufferAttribute(arr,3).setUsage(T.DynamicDrawUsage));
  geom.setAttribute('uv',new T.BufferAttribute(uv,2));geom.setIndex(ids);
  const mat=new T.MeshPhysicalMaterial({map:tex,side:T.DoubleSide,roughness:.93,metalness:0,clearcoat:.04});
  const mesh=new T.Mesh(geom,mat);mesh.name='Cape textile, test Pink Wars';mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
  // Module dorsal AÉGIS réel : bloc rigide sur Spine2, centré en x=0,
  // y=1.413 (bas à ~1.297), z=0.162 (face externe ~0.185–0.205).
  // Le bord supérieur de la cape est ENGAGÉ 2 cm sous ce bloc, pas suspendu
  // plus loin derrière (ancien z=0.292 à l'origine de l'écart à l'écran).
  const anchor=new T.Group();
  anchor.name='Cape fixée sous bloc dorsal AÉGIS';
  model.root.add(anchor);
  anchor.position.set(0,1.316,.197);
  model.root.updateMatrixWorld(true);
  // Préserver la pose monde en attachant à Spine2 : l'animation du torse
  // déplace aussi la cape, sans rotation/déport flottant indépendant.
  model.body.attach(anchor);
  anchor.add(mesh);
  function update(t,motion,wind){
    const motionPower=['run','runFire'].includes(motion)?1:['walk','walkFire','crouchWalk'].includes(motion)?.52:.12;
    const power=motionPower*wind;
    for(let y=0;y<=rows;y++){
      const v=y/rows,w=.235+.365*Math.pow(v,.90);
      for(let x=0;x<=cols;x++){
        const u=x/cols,i=(y*(cols+1)+x)*3;
        const ripple=Math.sin(t*(1.8+3*power)-v*7+u*9);
        arr[i]=(u-.5)*w+v*v*power*.027*Math.sin(t*2.3-v*4)+v*.003*ripple;
        arr[i+1]=-.89*v+.006*v*power*Math.sin(t*3+u*5);
        arr[i+2]=.002+.035*v*v+v*v*power*.040*(1+.25*ripple);
      }
    }
    geom.attributes.position.needsUpdate=true;geom.computeVertexNormals();
  }
  update(0,'idle',.6);
  return {anchor,update};
}
