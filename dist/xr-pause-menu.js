// Actual selectable menu in an immersive framebuffer; HTML dialogs are not visible there.
export function createXRPauseMenu(T,scene,{accent='#f28ab1',onResume=()=>{},onHome=()=>{},onExit=()=>{}}={}){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=720;const c=canvas.getContext('2d');
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const mesh=new T.Mesh(new T.PlaneGeometry(1.14,.8015625),new T.MeshBasicMaterial({map:texture,transparent:true,side:T.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false}));
 mesh.name='Fracture / menu pause immersif';mesh.renderOrder=200;mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);
 const geometry=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]);const beam=new T.Line(geometry,new T.LineBasicMaterial({color:accent,depthTest:false,transparent:true,opacity:.8}));beam.renderOrder=201;beam.frustumCulled=false;beam.visible=false;scene.add(beam);
 const raycaster=new T.Raycaster(),origin=new T.Vector3(),direction=new T.Vector3(),q=new T.Quaternion();let shown=false,pressed=true,hover=-1;
 const rows=[['REPRENDRE',onResume],['RETOUR À L’ACCUEIL',onHome],['QUITTER LA VR',onExit]];
 function paint(){c.clearRect(0,0,1024,720);c.fillStyle='#101c2a';c.beginPath();c.roundRect(2,2,1020,716,50);c.fill();c.strokeStyle='#71899c';c.lineWidth=2;c.stroke();c.textAlign='center';c.fillStyle=accent;c.font='600 22px sans-serif';c.fillText('PINK WARS / LA FRACTURE',512,77);c.fillStyle='#f2f2ed';c.font='500 58px sans-serif';c.fillText('En pause.',512,156);
  rows.forEach(([label],i)=>{c.fillStyle=i===hover?accent:'#243343';c.beginPath();c.roundRect(130,220+i*122,764,96,48);c.fill();c.fillStyle=i===hover?'#101c2a':'#f1f2ee';c.font='600 29px sans-serif';c.fillText(label,512,280+i*122);});c.fillStyle='#bac6ce';c.font='22px sans-serif';c.fillText('Pointer avec la main droite · gâchette pour choisir',512,656);texture.needsUpdate=true;}
 paint();
 return{mesh,update({active,camera,ray,trigger=false}){
  mesh.visible=!!active;beam.visible=false;
  if(!active){shown=false;pressed=!!trigger;return false;}
  if(!shown){shown=true;pressed=true;hover=-1;paint();}
  camera.getWorldPosition(mesh.position);camera.getWorldQuaternion(mesh.quaternion);direction.set(0,0,-1).applyQuaternion(mesh.quaternion);mesh.position.addScaledVector(direction,1.65);mesh.position.y-=.04;mesh.updateMatrixWorld(true);
  let hit=null;if(ray){ray.updateWorldMatrix(true,false);ray.getWorldPosition(origin);ray.getWorldQuaternion(q);direction.set(0,0,-1).applyQuaternion(q);raycaster.set(origin,direction);raycaster.near=.02;raycaster.far=5;hit=raycaster.intersectObject(mesh)[0];}
  let next=-1;if(hit){const x=hit.uv.x*1024,y=(1-hit.uv.y)*720;if(x>=130&&x<=894)next=rows.findIndex((_,i)=>y>=220+i*122&&y<=316+i*122);const a=geometry.attributes.position;a.setXYZ(0,origin.x,origin.y,origin.z);a.setXYZ(1,hit.point.x,hit.point.y,hit.point.z);a.needsUpdate=true;beam.visible=true;}
  if(next!==hover){hover=next;paint();}const down=trigger&&!pressed;pressed=!!trigger;if(down&&next>=0)rows[next][1]();return true;
 },dispose(){mesh.removeFromParent();beam.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();texture.dispose();geometry.dispose();beam.material.dispose();}};
}

export function createXRJournal(T,scene,entry,onClose){
 const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=1200;const c=canvas.getContext('2d');
 c.fillStyle='#101c29';c.beginPath();c.roundRect(0,0,1536,1200,50);c.fill();c.fillStyle='#ef91b4';c.font='600 27px sans-serif';c.fillText(entry.stamp,70,78,1390);c.fillStyle='white';c.font='600 39px sans-serif';c.fillText(entry.title,70,144,1390);
 c.font='31px sans-serif';c.fillStyle='#dae1e6';let y=218;
 for(const paragraph of [...entry.lines,entry.footer]){let line='';for(const word of paragraph.split(/\s+/)){if(c.measureText(line+word).width>1360){c.fillText(line,70,y);y+=43;line='';}line+=word+' ';}c.fillText(line,70,y);y+=65;}
 c.fillStyle='#ef91b4';c.beginPath();c.roundRect(240,1060,1056,90,45);c.fill();c.fillStyle='#101c29';c.textAlign='center';c.font='600 31px sans-serif';c.fillText('FERMER L’ARCHIVE / REPRENDRE',768,1117);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const mesh=new T.Mesh(new T.PlaneGeometry(1.38,1.078125),new T.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,side:T.DoubleSide}));mesh.frustumCulled=false;mesh.renderOrder=210;scene.add(mesh);let pressed=true;
 const point=new T.Vector3(),direction=new T.Vector3(),q=new T.Quaternion(),caster=new T.Raycaster();
 return{update(camera,ray,trigger){camera.getWorldPosition(mesh.position);camera.getWorldQuaternion(mesh.quaternion);mesh.position.addScaledVector(direction.set(0,0,-1).applyQuaternion(mesh.quaternion),1.7);mesh.updateMatrixWorld(true);let hit=null;if(ray){ray.getWorldPosition(point);ray.getWorldQuaternion(q);caster.set(point,direction.set(0,0,-1).applyQuaternion(q));hit=caster.intersectObject(mesh)[0];}const click=trigger&&!pressed;pressed=!!trigger;if(click&&hit&&hit.uv.x>.156&&hit.uv.x<.844&&hit.uv.y<.117)onClose();},dispose(){mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();texture.dispose();}};
}
