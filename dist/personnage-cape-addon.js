import * as T from './vendor/three.webgpu.min.js';
// Cape de démonstration, ajoutée au rig EXISTANT sans changer le personnage.
export function addCapeToOriginalSoldier(model,profile){
  const cols=22,rows=26;
  const sheet=document.createElement('canvas');sheet.width=512;sheet.height=1024;
  const c=sheet.getContext('2d'),isBlue=profile.masculine;
  const tint=isBlue?'#3972bd':'#d24b91',highlight=isBlue?'#d8ecff':'#ffe2ef';
  const gradient=c.createLinearGradient(0,0,490,1024);
  gradient.addColorStop(0,isBlue?'#87bbf4':'#f9a3ca');gradient.addColorStop(.42,tint);gradient.addColorStop(1,isBlue?'#102843':'#541b40');
  c.fillStyle=gradient;c.fillRect(0,0,512,1024);
  c.fillStyle=highlight;c.globalAlpha=.94;c.fillRect(12,0,14,1024);c.fillRect(487,0,14,1024);
  c.beginPath();c.moveTo(18,864);c.lineTo(490,723);c.lineTo(490,750);c.lineTo(18,904);c.closePath();c.fill();
  c.globalAlpha=.25;c.beginPath();c.moveTo(75,0);c.lineTo(148,0);c.lineTo(460,1024);c.lineTo(410,1024);c.closePath();c.fill();
  c.globalAlpha=1;c.save();c.translate(256,530);
  c.strokeStyle=highlight;c.lineWidth=11;c.beginPath();c.arc(0,0,101,0,Math.PI*2);c.stroke();
  c.fillStyle=highlight;c.beginPath();c.moveTo(-73,8);c.lineTo(-63,-49);c.lineTo(-20,-18);c.lineTo(0,-68);c.lineTo(20,-18);c.lineTo(63,-49);c.lineTo(73,8);c.closePath();c.fill();
  c.font='bold 51px system-ui,sans-serif';c.textAlign='center';c.fillText(profile.name,0,166);c.restore();
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
  // AEGIS v3 : le module dorsal est derrière Spine2 aux coordonnées z ~ 0.16–0.25.
  // Fixation à z=0.292 : derrière le bloc; l'os Spine2 est animé par le jeu.
  const anchor=new T.Group();anchor.name='Fixation derrière bloc dorsal';
  model.root.add(anchor);anchor.position.set(0,1.515,.292);
  model.root.updateMatrixWorld(true);model.body.attach(anchor);anchor.add(mesh);
  function update(t,motion,wind){
    const motionPower=['run','runFire'].includes(motion)?1:['walk','walkFire','crouchWalk'].includes(motion)?.52:.12;
    const power=motionPower*wind;
    for(let y=0;y<=rows;y++){
      const v=y/rows,w=.255+.39*Math.pow(v,.85);
      for(let x=0;x<=cols;x++){
        const u=x/cols,i=(y*(cols+1)+x)*3;
        const ripple=Math.sin(t*(1.8+3*power)-v*7+u*9);
        arr[i]=(u-.5)*w+v*v*power*.056*Math.sin(t*2.3-v*4)+v*.006*ripple;
        arr[i+1]=-.94*v+.008*v*power*Math.sin(t*3+u*5);
        arr[i+2]=.010+.08*v*v+.017*(1-Math.cos(v*Math.PI))+v*v*(.018+power*.10)*(1+.35*ripple);
      }
    }
    geom.attributes.position.needsUpdate=true;geom.computeVertexNormals();
  }
  update(0,'idle',.6);
  return {anchor,update};
}
