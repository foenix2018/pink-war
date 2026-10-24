// W02: a recently fought-over street. Damage is readable, the three routes stay open.
export function createWarZone(T,parent,materials,collisions,{performance=false,seed=2196}={}){
 const root=new T.Group();root.name='W02 / traces de guerre';parent.add(root);let state=seed>>>0;
 const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const stats={wrecks:0,rubble:performance?96:220,smoke:performance?5:10,wallDamage:8,blastSites:3,additionalLights:1};
 const textures=[],geometries=[],ownMaterials=[],events=[];
 const geo=g=>(geometries.push(g),g),mat=m=>(ownMaterials.push(m),m);
 function canvas(size,draw){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;textures.push(t);return t;}
 const smokeMap=canvas(128,(c,s)=>{const g=c.createRadialGradient(s*.5,s*.5,1,s*.5,s*.5,s*.49);g.addColorStop(0,'rgba(220,216,205,.58)');g.addColorStop(.25,'rgba(166,164,156,.42)');g.addColorStop(.7,'rgba(104,107,105,.12)');g.addColorStop(1,'rgba(80,85,83,0)');c.fillStyle=g;c.fillRect(0,0,s,s);});
 const scarMap=canvas(256,(c,s)=>{c.clearRect(0,0,s,s);const g=c.createRadialGradient(128,128,5,128,128,126);g.addColorStop(0,'rgba(12,13,12,.85)');g.addColorStop(.35,'rgba(23,24,22,.68)');g.addColorStop(.76,'rgba(47,42,34,.25)');g.addColorStop(1,'rgba(49,43,36,0)');c.fillStyle=g;c.fillRect(0,0,s,s);for(let i=0;i<35;i++){const a=rand()*6.28,r=20+rand()*85;c.strokeStyle='rgba(12,14,13,.28)';c.lineWidth=1+rand()*3;c.beginPath();c.moveTo(128+Math.sin(a)*r,128+Math.cos(a)*r);c.lineTo(128+Math.sin(a)*(r+20),128+Math.cos(a)*(r+20));c.stroke();}});
 const scar=mat(new T.MeshBasicMaterial({map:scarMap,transparent:true,opacity:.8,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1})),sheet=geo(new T.PlaneGeometry(1,1));
 for(const [x,z,w,d] of [[-5.7,38,5.8,8.3],[5.6,-1,5.4,7.2],[-6,-35,4,5],[4.8,27,3.8,4.3]]){const m=new T.Mesh(sheet,scar);m.rotation.x=-Math.PI/2;m.position.set(x,.027,z);m.scale.set(w,d,1);root.add(m);}
 const wallScar=mat(new T.MeshStandardMaterial({map:scarMap,color:0x5a5044,roughness:1,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
 // Centimetres in front of the actual M02 facade planes, never suspended in air.
 for(const [x,z,side]of [[-13.94,61,-1],[12.44,68,1],[-15.44,40,-1],[13.94,46,1]]){
  const scorch=new T.Mesh(sheet,wallScar);scorch.rotation.y=-side*Math.PI/2;scorch.position.set(x,.57,z);scorch.scale.set(3.5,.84,1);root.add(scorch);
  const hit=new T.Mesh(sheet,wallScar);hit.rotation.y=scorch.rotation.y;hit.position.set(x,.79,z+1.8);hit.scale.set(.65,.25,1);root.add(hit);
 }
 const dark=mat(new T.MeshStandardMaterial({color:0x151919,roughness:.95,metalness:.08}));
 const glass=mat(new T.MeshStandardMaterial({color:0x142126,roughness:.46,metalness:.15}));
 const rusty=materials.rust,iron=materials.iron;
 function wreck(x,z,turn){
  const car=new T.Group();car.name='Vesper / véhicule civil incendié';car.position.set(x,0,z);car.rotation.y=turn;root.add(car);
  // One bevelled closed shell, with recognisable bonnet, cabin and boot proportions.
  const shape=new T.Shape();shape.moveTo(-2.1,.38);shape.lineTo(-2.0,.77);shape.lineTo(-.95,.88);shape.lineTo(-.48,1.43);shape.lineTo(.85,1.45);shape.lineTo(1.34,.93);shape.lineTo(2.02,.80);shape.lineTo(2.13,.40);shape.closePath();
  const body=geo(new T.ExtrudeGeometry(shape,{depth:1.68,bevelEnabled:true,bevelThickness:.06,bevelSize:.07,bevelSegments:2,steps:1}));body.translate(0,0,-.84);body.rotateY(Math.PI/2);
  const bp=body.attributes.position,bn=body.attributes.normal,bu=body.attributes.uv;
  for(let i=0;i<bp.count;i++){const side=Math.abs(bn.getX(i))>.5;bu.setXY(i,(side?bp.getZ(i):bp.getX(i))*.20,bp.getY(i)*.30);}bu.needsUpdate=true;
  const shell=new T.Mesh(body,rusty);shell.castShadow=!performance;shell.receiveShadow=true;car.add(shell);
  const tire=geo(new T.CylinderGeometry(.365,.365,.22,performance?12:20)),rim=geo(new T.CylinderGeometry(.22,.22,.24,12));
  for(const side of [-1,1])for(const zz of [-1.37,1.36]){const wheel=new T.Mesh(tire,dark);wheel.rotation.z=Math.PI/2;wheel.position.set(side*.86,.36,zz);car.add(wheel);const hub=new T.Mesh(rim,iron);hub.rotation.z=Math.PI/2;hub.position.set(side*.89,.36,zz);car.add(hub);}
  for(const side of [-1,1]){const pane=new T.Mesh(geo(new T.PlaneGeometry(1.38,.45)),glass);pane.rotation.y=side*Math.PI/2;pane.position.set(side*.895,1.17,-.14);car.add(pane);const door=new T.Mesh(geo(new T.BoxGeometry(.035,.035,.19)),iron);door.position.set(side*.91,.82,.31);car.add(door);}
  const windscreen=new T.Mesh(geo(new T.PlaneGeometry(1.46,.67)),dark);windscreen.rotation.x=-.64;windscreen.position.set(0,1.13,.89);car.add(windscreen);
  for(const side of [-1,1]){const headlight=new T.Mesh(geo(new T.BoxGeometry(.38,.18,.07)),glass);headlight.position.set(side*.54,.66,-2.09);car.add(headlight);}
  const cos=Math.abs(Math.cos(turn)),sin=Math.abs(Math.sin(turn));collisions.push({x,z,hx:.99*cos+2.2*sin,hz:2.2*cos+.99*sin,y:0,height:1.55,surface:'metal',story:'wreck'});stats.wrecks++;
 }
 wreck(-5.7,38,-.18);wreck(5.6,-1,.14);
 const chunks=new T.InstancedMesh(geo(new T.DodecahedronGeometry(1,0)),materials.concrete,stats.rubble);chunks.name='W02 / gravats groupés';chunks.castShadow=!performance;chunks.receiveShadow=true;
 const matrix=new T.Matrix4(),q=new T.Quaternion(),position=new T.Vector3(),scale=new T.Vector3();
 for(let i=0;i<stats.rubble;i++){const side=i%2?1:-1,z=65-rand()*135,x=side*(7.0+rand()*1.0),r=.07+rand()*.18;q.setFromEuler(new T.Euler(rand(),rand()*6.28,rand()));matrix.compose(position.set(x,r*.55,z),q,scale.set(r*1.7,r*.65,r));chunks.setMatrixAt(i,matrix);}chunks.instanceMatrix.needsUpdate=true;root.add(chunks);
 // Buckled electrical runs and exposed rebar stay at the edges of the route.
 const cableMat=mat(new T.MeshStandardMaterial({color:0x242522,roughness:.88,metalness:.2}));
 for(const [x,z]of [[-8.1,35],[8.1,-29],[-8.0,-49]]){const path=new T.CatmullRomCurve3([new T.Vector3(x,6,z),new T.Vector3(x-.25,3.1,z+.9),new T.Vector3(x+.2,.25,z+2.8),new T.Vector3(x-1,.12,z+4.2)]);root.add(new T.Mesh(geo(new T.TubeGeometry(path,18,.033,5,false)),cableMat));}
 const smokeMaterial=mat(new T.SpriteMaterial({map:smokeMap,color:0x72756f,transparent:true,opacity:.21,depthWrite:false,fog:true})),smoke=[];
 for(let i=0;i<stats.smoke;i++){const site=i%2?{x:5.6,z:-1}:{x:-5.7,z:38};const sprite=new T.Sprite(smokeMaterial);root.add(sprite);smoke.push({sprite,site,offset:i/stats.smoke*9,phase:rand()*6});}
 const farSmokeMaterial=mat(new T.SpriteMaterial({map:smokeMap,color:0x414b4d,transparent:true,opacity:.30,depthWrite:false,fog:true}));
 for(const [x,z] of [[-39,-60],[42,-19],[-45,38]])for(let i=0;i<(performance?2:4);i++){const s=new T.Sprite(farSmokeMaterial);s.position.set(x+i*.5,12+i*5,z);s.scale.set(10+i*3,16+i*3,1);root.add(s);}
 const blast=new T.PointLight(0xe3b485,0,28,2);blast.castShadow=false;root.add(blast);
 const flashMat=mat(new T.SpriteMaterial({map:smokeMap,color:0xffc387,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending})),flash=new T.Sprite(flashMat);flash.scale.set(4,5,1);root.add(flash);
 const sites=[{x:-38,y:11,z:-58},{x:39,y:15,z:-32},{x:-42,y:9,z:26}];let previous=0,next=9,blastAt=-99,current=0;
 return{root,stats,update(time,{active=true}={}){
  if(time<previous){next=9;blastAt=-99;events.length=0;}previous=time;
  for(const s of smoke){const age=(time*.55+s.offset)%8,drift=Math.sin(time*.16+s.phase);s.sprite.position.set(s.site.x+age*.14+drift*.12,.6+age*.64,s.site.z+age*.10);s.sprite.scale.set(1.1+age*.42,1.2+age*.45,1);s.sprite.material.rotation=Math.sin(time*.1)*.13;}
  if(active&&time>=next){current=(current+1)%sites.length;blastAt=time;next=time+12+current*3;blast.position.set(sites[current].x,sites[current].y,sites[current].z);flash.position.copy(blast.position);events.push({type:'distant-blast',...sites[current]});}
  const age=time-blastAt,envelope=active?Math.max(0,1-age/.24):0;blast.intensity=envelope*38;flashMat.opacity=envelope*.28;
 },drainEvents(){return events.splice(0);},dispose(){root.removeFromParent();for(const g of geometries)g.dispose();for(const m of ownMaterials)m.dispose();for(const t of textures)t.dispose();}};
}
