import * as T from './vendor/three.webgpu.min.js';
import {bevelBox,merge,matrix} from './geo.js';

// Navigation can plan through a doorway. The real player still meets these
// moving, solid leaves until their geometry has physically cleared the passage.
export function createHideoutDoorState(layout){
 const states=layout.doors.map(d=>({...d,open:0,hold:0,previousSide:null})),colliders=[];
 for(const d of states){d.leaves=[-1,1].map(side=>{const b={kind:'Porte dépolie · '+d.name,x:d.x,z:d.z,hx:d.axis==='x'?.07:d.width/4,hz:d.axis==='x'?d.width/4:.07,y:0,height:2.6,noCollision:false,side};colliders.push(b);return b;});}
 function update(dt,player,{moving=false}={}){
  dt=Math.max(0,Math.min(.125,dt));
  for(const d of states){
   const normal=d.axis==='x'?Math.abs(player.x-d.x):Math.abs(player.z-d.z),along=d.axis==='x'?Math.abs(player.z-d.z):Math.abs(player.x-d.x);
   const occupied=normal<.95&&along<d.width/2+.55;
   if(occupied||moving&&normal<2.25&&along<d.width/2+.45)d.hold=1.1;
   else d.hold=Math.max(0,d.hold-dt);
   const target=d.hold>0?1:0;d.open=Math.max(0,Math.min(1,d.open+Math.sign(target-d.open)*dt*(target?2.7:1.45)));
   const travel=d.open*d.open*(3-2*d.open)*(d.width/2+.07);
   for(const b of d.leaves){b.x=d.x+(d.axis==='z'?b.side*(d.width/4+travel):0);b.z=d.z+(d.axis==='x'?b.side*(d.width/4+travel):0);}
  }
 }
 update(0,{x:0,z:9});
 return{states,colliders,update,snapshot:()=>states.map(d=>({id:d.id,name:d.name,open:d.open,hold:d.hold})),open(id){const d=states.find(d=>d.id===id);if(d)d.hold=3;}};
}

export function createHideoutDoors(layout,materials){
 const state=createHideoutDoorState(layout),root=new T.Group();root.name='Portes coulissantes en verre dépoli';
 const box=(size,position)=>bevelBox(...size,.012,2).applyMatrix4(matrix(position));
 // A one-metre-wide leaf; instances scale to each doorway. Four shared draws
 // cover all leaves, rather than one draw for every rail, seal and glazing.
 const glass=bevelBox(.91,2.38,.042,.022,3),frame=merge([
  box([.045,2.52,.075],[-.4875,0,0]),box([.045,2.52,.075],[.4875,0,0]),
  box([.93,.065,.075],[0,1.23,0]),box([.93,.065,.075],[0,-1.23,0])
 ]),seal=merge([box([.018,2.4,.056],[-.46,0,0]),box([.018,2.4,.056],[.46,0,0])]),light=merge([-1,1].map(side=>new T.CylinderGeometry(.004,.004,.42,10).applyMatrix4(matrix([side*.445,.68,.047]))));
 const lightMaterial=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false}),tint=new T.Color(),closedTint=new T.Color(0xff4e9d),openTint=new T.Color(0x63d7ff);
 const count=state.states.length*2,parts=[
  [glass,materials.get('Verre dépoli des portes')],
  [frame,materials.get('Métal brossé')],
  [seal,materials.get('Cuir et joints')],
  [light,lightMaterial]
 ].map(([geometry,material])=>{const mesh=new T.InstancedMesh(geometry,material,count);mesh.frustumCulled=false;mesh.castShadow=!material.isMeshBasicMaterial;mesh.receiveShadow=true;root.add(mesh);return mesh;});
 const handleFrame=merge([box([.10,.023,.025],[0,.098,0]),box([.10,.023,.025],[0,-.098,0]),box([.018,.17,.025],[-.041,0,0]),box([.018,.17,.025],[.041,0,0])]);
 const handles=[[handleFrame,materials.get('Métal brossé')],[box([.066,.17,.012],[0,0,0]),materials.get('Cuir et joints')]].map(([g,m])=>{const mesh=new T.InstancedMesh(g,m,count*2);mesh.frustumCulled=false;root.add(mesh);return mesh;});
 const transform=new T.Object3D();
 function sync(){let i=0;for(const d of state.states)for(const leaf of d.leaves){transform.position.set(leaf.x,1.29,leaf.z);transform.rotation.y=d.axis==='x'?Math.PI/2:0;transform.scale.set(d.width/2,1,1);transform.updateMatrix();for(const mesh of parts)mesh.setMatrixAt(i,transform.matrix);parts[3].setColorAt(i,tint.copy(closedTint).lerp(openTint,d.open));
   for(const [faceIndex,face]of [-1,1].entries())for(let j=0;j<handles.length;j++){const along=-leaf.side*d.width*.175,depth=face*(j===0?.060:.050);transform.position.set(leaf.x+(d.axis==='x'?depth:along),1.16,leaf.z+(d.axis==='x'?along:depth));transform.scale.set(1,1,1);transform.updateMatrix();handles[j].setMatrixAt(i*2+faceIndex,transform.matrix);}i++;}
  for(const mesh of [...parts,...handles])mesh.instanceMatrix.needsUpdate=true;parts[3].instanceColor.needsUpdate=true;}
 const signsCanvas=document.createElement('canvas');signsCanvas.width=2048;signsCanvas.height=512;const context=signsCanvas.getContext('2d'),signs=[];
 state.states.forEach((d,i)=>{const col=i%4,row=Math.floor(i/4);context.fillStyle='#0b1723';context.fillRect(col*512,row*128,512,128);context.fillStyle='#a5e7ed';context.textAlign='center';context.textBaseline='middle';context.font='600 '+(d.name.length>17?32:40)+'px sans-serif';context.fillText(d.name.toUpperCase(),col*512+256,row*128+64,488);
  for(const side of [-1,1]){const g=new T.PlaneGeometry(d.width+.30,.22),uv=g.attributes.uv;for(let j=0;j<uv.count;j++)uv.setXY(j,(col+uv.getX(j))/4,(3-row+uv.getY(j))/4);const rotation=d.axis==='x'?side*Math.PI/2:side<0?Math.PI:0;g.applyMatrix4(matrix([d.x+(d.axis==='x'?side*.205:0),2.73,d.z+(d.axis==='z'?side*.205:0)],[0,rotation,0]));signs.push(g);}
 });
 const signsTexture=new T.CanvasTexture(signsCanvas);signsTexture.colorSpace=T.SRGBColorSpace;const signsMaterial=new T.MeshBasicMaterial({map:signsTexture,toneMapped:false}),signsMesh=new T.Mesh(merge(signs),signsMaterial);signsMesh.name='Signalétique des pièces';root.add(signsMesh);for(const g of signs)g.dispose();
 sync();
 return{...state,root,update(dt,player,options){state.update(dt,player,options);sync();},dispose(){root.removeFromParent();for(const mesh of [...parts,...handles]){mesh.dispose();mesh.geometry.dispose();}lightMaterial.dispose();signsMesh.geometry.dispose();signsMaterial.dispose();signsTexture.dispose();}};
}
