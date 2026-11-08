// Dedicated in-world control, beside the equipment panel at the anatomical left wrist.
// Hover and the entire selecting trigger press belong to the button, never to the gun.
export function createXRShieldButton(T,scene,{getGame,onToggle=()=>getGame()?.toggleProjectedShield(),haptic=()=>{}}={}){
 const canvas=document.createElement('canvas');canvas.width=384;canvas.height=448;
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const mesh=new T.Mesh(new T.PlaneGeometry(.075,.0875),new T.MeshBasicMaterial({map:texture,transparent:true,side:T.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false}));
 mesh.name='Bouclier / bouton dédié au poignet gauche';mesh.visible=false;mesh.renderOrder=155;mesh.frustumCulled=false;scene.add(mesh);
 const localRay=new T.Ray(),plane=new T.Plane(new T.Vector3(0,0,1),0),inverse=new T.Matrix4(),contact=new T.Vector3(),worldContact=new T.Vector3(),origin=new T.Vector3(),direction=new T.Vector3(),right=new T.Vector3(),q=new T.Quaternion();let pressed=true,latched=false,signature='';
 function paint(game,hover){const colour=game.characterId==='lylu'?'#79bbff':'#ff80b2',charge=Math.ceil(game.player.shield||0),deployed=!!game.player.shieldDeployed,key=[colour,charge,deployed,hover].join('|');if(key===signature)return;signature=key;const c=canvas.getContext('2d');c.clearRect(0,0,384,448);c.fillStyle=deployed?'#263e54':'#101c29';c.beginPath();c.roundRect(5,5,374,438,55);c.fill();c.strokeStyle=charge>0?colour:'#6c7d8e';c.lineWidth=hover?12:6;c.stroke();c.beginPath();c.moveTo(192,55);c.lineTo(291,91);c.lineTo(291,190);c.bezierCurveTo(291,244,239,280,192,300);c.bezierCurveTo(145,280,93,244,93,190);c.lineTo(93,91);c.closePath();c.stroke();c.fillStyle=colour;c.textAlign='center';c.font='bold 57px sans-serif';c.fillText(String(charge),192,211);c.font='bold 29px sans-serif';c.fillText('BOUCLIER',192,351);c.font='22px sans-serif';c.fillStyle='#eff7ff';c.fillText(charge<=0?'RECHARGE':deployed?'REPLIER':'ACTIVER',192,396);texture.needsUpdate=true;}
 return{mesh,update({active=false,left=null,ray=null,camera=null,trigger=false}={}){
  const game=getGame?.();mesh.visible=!!(active&&game?.projectedShieldsEnabled&&game.state==='playing'&&game.player.hp>0&&left&&ray&&camera);
  if(!mesh.visible){pressed=!!trigger;latched=false;return false;}
  left.updateWorldMatrix(true,false);left.getWorldPosition(mesh.position);camera.getWorldQuaternion(mesh.quaternion);right.set(1,0,0).applyQuaternion(mesh.quaternion);mesh.position.addScaledVector(right,.115);direction.set(0,0,-1).applyQuaternion(mesh.quaternion);mesh.position.addScaledVector(direction,.08);mesh.position.y+=.12;mesh.updateMatrixWorld(true);
  ray.updateWorldMatrix(true,false);ray.getWorldPosition(origin);ray.getWorldQuaternion(q);direction.set(0,0,-1).applyQuaternion(q);inverse.copy(mesh.matrixWorld).invert();localRay.set(origin,direction).applyMatrix4(inverse);
  const point=localRay.intersectPlane(plane,contact),distance=point?origin.distanceTo(worldContact.copy(contact).applyMatrix4(mesh.matrixWorld)):Infinity,hit=!!point&&distance>=.02&&distance<=2&&Math.abs(point.x)<=.0375&&Math.abs(point.y)<=.04375,edge=trigger&&!pressed;pressed=!!trigger;if(!trigger)latched=false;
  if(hit&&edge){latched=true;if(game.state==='playing'&&game.player.shield>0&&onToggle())haptic();}
  paint(game,hit);return hit||latched;
 },dispose(){mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();texture.dispose();}};
}
