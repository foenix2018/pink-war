// Physical training props in the same scene as the animated LYLU rig.
export function createFitnessProps(T,scene,materials){
 const root=new T.Group();root.name='Gym / appareils interactifs';scene.add(root);
 const steel=materials.get('Métal brossé'),rubber=materials.get('Cuir et joints'),black=materials.get('Cadres anthracite'),pink=materials.get('Tissu rose');
 const add=(parent,g,m,x=0,y=0,z=0)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;};
 const group=()=>{const o=new T.Group();root.add(o);return o;};
 const cylinder=(p,r,h,m,x=0,y=0,z=0,n=24)=>{const o=add(p,new T.CylinderGeometry(r,r,h,n),m,x,y,z);o.rotation.z=Math.PI/2;return o;};
 const bar=group();bar.name='Barre olympique mobile';cylinder(bar,.014,2.20,steel);
 for(const s of [-1,1]){cylinder(bar,.025,.45,steel,s*.875);for(let i=0;i<3;i++){cylinder(bar,i===2?.18:.225,.055,rubber,s*(.79+i*.065));cylinder(bar,.045,.012,steel,s*(.82+i*.065));}cylinder(bar,.038,.035,steel,s*1.035);}
 const dumbbells=[];for(let j=0;j<2;j++){const g=group();g.name='Haltère mobile';cylinder(g,.016,.27,steel);for(const s of [-1,1]){cylinder(g,.092,.09,black,s*.10,0,0,6);cylinder(g,.033,.012,pink,s*.151,0,0,8);}dumbbells.push(g);}
 const seat=group();seat.name='Siège coulissant rameur';add(seat,new T.BoxGeometry(.31,.085,.31),rubber);add(seat,new T.BoxGeometry(.20,.055,.16),steel,0,-.055,0);
 const handle=group();handle.name='Poignée rameur';cylinder(handle,.017,.38,steel);for(const s of [-1,1])cylinder(handle,.026,.115,rubber,s*.123);
 const cable=add(root,new T.CylinderGeometry(.006,.006,1,8),black);const axis=new T.Vector3(1,0,0),up=new T.Vector3(0,1,0),fixed=new T.Vector3(8.12,.62,10.14);
 function span(obj,a,b){obj.position.copy(a).add(b).multiplyScalar(.5);const d=b.clone().sub(a);if(d.lengthSq()>.000001)obj.quaternion.setFromUnitVectors(axis,d.normalize());}
 function update(id,pose){bar.position.set(8.75,1.40,5.48);bar.quaternion.identity();seat.position.set(6.80,.385,10.14);handle.position.set(7.70,.65,10.14);handle.rotation.set(0,Math.PI/2,0);for(const d of dumbbells)d.visible=id==='dumbbells'&&!!pose;
  if(id&&pose){const {left,right,pelvis}=pose;if(id==='squat')span(bar,left,right);if(id==='dumbbells'){for(const [i,p] of [left,right].entries()){dumbbells[i].position.copy(p);dumbbells[i].position.y-=.025;dumbbells[i].rotation.set(0,Math.PI/2,0);}}if(id==='rower'){span(handle,left,right);seat.position.x=Math.max(6.22,Math.min(7.65,pelvis.x));}}
  const a=handle.position,b=fixed,d=b.clone().sub(a);cable.position.copy(a).add(b).multiplyScalar(.5);cable.scale.y=Math.max(.001,d.length());cable.quaternion.setFromUnitVectors(up,d.normalize());
 }
 update(null,null);return{update,snapshot:()=>({bar:bar.position.toArray(),seat:seat.position.toArray(),handle:handle.position.toArray(),dumbbells:dumbbells.filter(d=>d.visible).length})};
}
