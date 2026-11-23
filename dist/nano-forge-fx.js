// Shared WebGPU/WebGL geometry: bounded instanced debris and nanites, no extra lights.
export function createNanoForgeFX(T,{scene,camera,getWeapon=()=>null,workshopAvailable=true}={}){
 const root=new T.Group();root.name='Nanofabrication · plans et récupération';scene.add(root);
 const steel=new T.MeshStandardMaterial({color:0x384953,metalness:.72,roughness:.45});
 const edge=new T.MeshStandardMaterial({color:0x81959f,metalness:.8,roughness:.31});
 const glow=new T.MeshBasicMaterial({color:0x8df4d4,toneMapped:false});
 const shardGeometry=new T.OctahedronGeometry(1,0),particleGeometry=new T.IcosahedronGeometry(1,0);
 const shards=new T.InstancedMesh(shardGeometry,steel,192),cores=new T.InstancedMesh(particleGeometry,glow,64),swarm=new T.InstancedMesh(particleGeometry,glow,96);
 for(const mesh of [shards,cores,swarm]){mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;root.add(mesh);}
 const baseGeometry=new T.CylinderGeometry(.23,.28,.07,12),stemGeometry=new T.CylinderGeometry(.045,.07,.23,10),caseGeometry=new T.CylinderGeometry(.36,.36,.055,6).rotateX(Math.PI/2),screenGeometry=new T.PlaneGeometry(.4,.46),ringGeometry=new T.TorusGeometry(.09,.008,5,20);
 const plans=new Map(),bursts=[],dummy=new T.Object3D(),center=new T.Vector3();let lastMessageUntil=0,collectValue=0,craftUntil=-100,craftSuit=false;
 const doc=globalThis.document,notice=doc?.createElement('aside');
 if(notice){notice.className='pw-nano-notice';notice.hidden=true;notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');notice.innerHTML='<strong></strong><small></small><button type="button">Atelier nano →</button>';notice.querySelector('button').onpointerdown=e=>e.stopPropagation();notice.querySelector('button').onclick=e=>{e.stopPropagation();doc.dispatchEvent(new CustomEvent('pw-open-nanoforge'));notice.hidden=true;};doc.body.append(notice);}
 function message(title,detail='',duration=5){if(!notice)return;notice.querySelector('strong').textContent=title;notice.querySelector('small').textContent=detail;notice.hidden=!!doc.querySelector('.pw-gear-open');lastMessageUntil=performance.now()+duration*1000;}
 function tablet(plan){
  const group=new T.Group();group.name=plan.name;group.position.set(plan.x,plan.y,plan.z);group.add(new T.Mesh(baseGeometry,steel));group.children[0].position.y=.045;
  const stem=new T.Mesh(stemGeometry,edge);stem.position.y=.18;group.add(stem);
  const panel=new T.Group();panel.position.y=.43;panel.rotation.x=-.55;group.add(panel);
  const body=new T.Mesh(caseGeometry,steel);body.scale.set(.85,1,1);panel.add(body);
  const ring=new T.Mesh(ringGeometry,glow);ring.position.set(0,-.21,.032);panel.add(ring);
  let texture=null;if(doc){const canvas=doc.createElement('canvas');canvas.width=256;canvas.height=320;const c=canvas.getContext('2d');
   c.fillStyle='#0a273c';c.fillRect(0,0,256,320);c.strokeStyle='#52bbc9';c.lineWidth=1;
   for(let i=16;i<256;i+=24){c.beginPath();c.moveTo(i,0);c.lineTo(i,320);c.stroke();}for(let i=8;i<320;i+=24){c.beginPath();c.moveTo(0,i);c.lineTo(256,i);c.stroke();}
   c.strokeStyle='#c2fff0';c.lineWidth=3;c.strokeRect(12,12,232,296);c.beginPath();c.moveTo(40,165);c.lineTo(76,117);c.lineTo(170,117);c.lineTo(216,155);c.lineTo(154,194);c.lineTo(78,194);c.closePath();c.stroke();
   for(const [x,y] of [[76,117],[170,117],[154,194],[78,194]]){c.beginPath();c.arc(x,y,10,0,Math.PI*2);c.stroke();}
   c.font='bold 23px sans-serif';c.fillStyle='#dafff6';c.textAlign='center';c.fillText('PLAN NANO',128,55);c.font='16px sans-serif';c.fillText('SCHÉMA RÉCUPÉRABLE',128,265);
   texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;}
  const material=new T.MeshBasicMaterial({map:texture,color:0xb6fff0,toneMapped:false,side:T.DoubleSide}),screen=new T.Mesh(screenGeometry,material);screen.position.z=.032;panel.add(screen);group.userData.dispose=()=>{material.dispose();texture?.dispose();};root.add(group);plans.set(plan.id,group);return group;
 }
 function instance(mesh,index,x,y,z,sx,sy,sz,angle=0){dummy.position.set(x,y,z);dummy.rotation.set(angle,.7*angle,.3*angle);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);}
 return{
  handle(e){
   if(e.type==='nano-plan'){message(e.companion+' · '+e.name,e.story+(workshopAvailable?' · Portrait du compagnon → Atelier nano.':' · Plan conservé pour le prochain chapitre de combat.'),8);if(notice)notice.querySelector('button').hidden=!workshopAvailable;}
   else if(e.type==='nano-collected'){if(performance.now()>lastMessageUntil)collectValue=0;collectValue+=e.value;message('+'+collectValue+' nanoparticules','Réserve : '+e.balance+' NP · récupérées sur les débris.',3);if(bursts.length>=4)bursts.shift();bursts.push({x:e.x,y:e.y,z:e.z,until:0,age:0});}
   else if(e.type==='nano-crafted'){craftUntil=1.8;craftSuit=!!e.suitStage;message(e.companion+' · '+e.name,'Les nanoparticules réassemblent ton équipement.',5);}
   else if(e.type==='nano-error')message('Fabrication suspendue',e.message,7);
  },
  update(game,dt){
   const n=game?.nano;root.visible=!!n&&['playing','paused'].includes(game.state);if(notice&&(!root.visible||performance.now()>lastMessageUntil||doc.querySelector('.pw-gear-open')))notice.hidden=true;if(!root.visible)return;
   const active=game.state==='playing';dt=active?dt:0;
   const ids=new Set(n.plans.map(p=>p.id));for(const [id,g]of plans)if(!ids.has(id)){g.userData.dispose();g.removeFromParent();plans.delete(id);}
   for(const plan of n.plans){const g=plans.get(plan.id)||tablet(plan);g.visible=Math.hypot(plan.x-game.player.x,plan.z-game.player.z)<55;}
   shards.count=n.drops.length*3;cores.count=n.drops.length;
   for(let i=0;i<n.drops.length;i++){const d=n.drops[i];for(let j=0;j<3;j++){const a=d.id*2.4+j*2.1;instance(shards,i*3+j,d.x+Math.sin(a)*.16,d.y+.08+j*.025,d.z+Math.cos(a)*.16,.07,.035,.11,a);}const pulse=.045+.012*Math.sin(game.time*4+i);instance(cores,i,d.x,d.y+.2,d.z,pulse,pulse,pulse);}
   shards.instanceMatrix.needsUpdate=true;cores.instanceMatrix.needsUpdate=true;
   const at=craftSuit?null:getWeapon();if(at?.getWorldPosition)at.getWorldPosition(center);else center.set(game.player.x,(game.player.elevation||0)+1.1,game.player.z);
   craftUntil-=dt;swarm.count=0;
   if(craftUntil>0)for(let i=0;i<64;i++){const u=i/64,a=i*2.399+game.time*4.2,r=(craftSuit?.34:.18)+.1*Math.sin(a*1.3),s=.004+.006*Math.sin(Math.PI*Math.min(1,craftUntil/1.8));instance(swarm,swarm.count++,center.x+Math.cos(a)*r,center.y+(u-.5)*(craftSuit?1.5:.48),center.z+Math.sin(a)*r,s,s,s);}
   for(let i=bursts.length-1;i>=0;i--){const b=bursts[i];b.age+=dt;if(b.age>.65){bursts.splice(i,1);continue;}const u=b.age/.65;for(let j=0;j<8;j++){const a=j*.785+u*5,s=.01*(1-u)+.002;instance(swarm,swarm.count++,b.x*(1-u)+game.player.x*u+Math.cos(a)*.18*(1-u),b.y*(1-u)+((game.player.elevation||0)+1.1)*u,b.z*(1-u)+game.player.z*u+Math.sin(a)*.18*(1-u),s,s,s);}}
   swarm.instanceMatrix.needsUpdate=true;
  },
  stats(){return{plans:plans.size,shards:shards.count,nanites:swarm.count,maxDraws:3+plans.size*5};},
  dispose(){for(const g of plans.values())g.userData.dispose();plans.clear();root.removeFromParent();notice?.remove();for(const r of [steel,edge,glow,shardGeometry,particleGeometry,baseGeometry,stemGeometry,caseGeometry,screenGeometry,ringGeometry])r.dispose();}
 };
}
