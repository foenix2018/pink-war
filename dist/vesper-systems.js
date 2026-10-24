import {Assembly,bevelBox,matrix} from './geo.js';

// Physical salvage installations, echoing the loading art: old amber computers,
// insulated looms, damaged copper and cold ORDRE equipment among the ruins.
export function createVesperSystems(T,parent,maps,{quality='auto',terminalMaterials=null}={}){
  const root=new T.Group();root.name='VESPER / circuits survivants';parent.add(root);
  const materials=[],textures=[],geometries=[],screens=[],lamps=[],colliders=[];let powered=false,disabled=false,disposed=false;
  const ownM=m=>(materials.push(m),m),ownG=g=>(geometries.push(g),g);
  const rubber=ownM(new T.MeshStandardMaterial({color:0x10191e,roughness:.86,map:maps.dark.map}));
  const copper=ownM(new T.MeshStandardMaterial({color:0x9c6242,metalness:.85,roughness:.4}));
  const pale=ownM(new T.MeshBasicMaterial({color:0x96ddd6,toneMapped:false}));
  const amber=ownM(new T.MeshBasicMaterial({color:0xffbd6c,toneMapped:false}));
  const staticParts=new Assembly();let cables=0;
  const caseMetal=terminalMaterials?.paint||maps.steel;
  const part=(g,m,p,r=[0,0,0])=>{staticParts.add(g,m,matrix(p,r));};
  const box=(m,size,p,r=[0,0,0])=>part(bevelBox(...size,Math.min(...size)*.17,1),m,p,r);
  function cable(points,r=.035,mat=rubber){
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'centripetal');
    staticParts.add(new T.TubeGeometry(curve,quality==='low'?18:28,r,6,false),mat);cables++;
  }
  // Each terminal gains a slanted keyboard, data rack, connectors and an
  // independent diagnostic screen; the original readable story text stays clear.
  const stations=[[0,0,54.45],[-21,0,19.45],[5,0,-8.55],[18,4.8,-44.55]];
  function diagnostic(x,y,z,index){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
    const c=canvas.getContext('2d');c.fillStyle='#081719';c.fillRect(0,0,512,256);
    c.strokeStyle='#9d743e';c.lineWidth=2;c.strokeRect(8,8,496,240);
    c.fillStyle='#edb76b';c.font='18px monospace';c.fillText(index===2?'ORDRE / LIAISON':'SECOURS 07 / MÉMOIRE',22,35);
    c.font='12px monospace';c.fillText('CIRCUIT LOCAL · ARCHIVES',22,57);
    for(let k=0;k<13;k++){const h=30+(k*31%80);c.fillStyle=k%3?'#d49b54':'#ffe2a1';c.fillRect(24+k*13,210-h,7,h);}
    c.strokeStyle='#e0ac64';for(const r of [24,49,72]){c.beginPath();c.arc(363,143,r,0,Math.PI*2);c.stroke();}
    for(let j=0;j<4;j++){c.beginPath();c.moveTo(285,143+j*6);c.lineTo(438,143+j*6);c.stroke();}
    c.fillStyle='#98c9bd';c.fillText(index===2?'ORDRE CONNECTÉ':'HORS RÉSEAU',300,235);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;textures.push(texture);
    const mat=ownM(new T.MeshBasicMaterial({map:texture,toneMapped:false}));
    const screen=new T.Mesh(ownG(new T.PlaneGeometry(.9,.48)),mat);screen.position.set(x+1.75,y+1.38,z+.18);root.add(screen);
    box(caseMetal,[1,.58,.30],[x+1.75,y+1.38,z]);
    // Inset rubber seal, side vents and a bolted bezel around the actual glass.
    for(const side of [-1,1]){
      box(rubber,[.035,.50,.025],[x+1.75+side*.46,y+1.38,z+.16]);
      box(caseMetal,[.07,.54,.055],[x+1.75+side*.48,y+1.38,z+.145]);
      for(let j=0;j<7;j++)box(rubber,[.045,.008,.015],[x+1.75+side*.5,y+1.23+j*.04,z+.06]);
    }
    box(maps.dark,[.6,.08,.46],[x+1.75,y+1.02,z+.12]);
    box(maps.steel,[.09,.36,.11],[x+1.75,y+1.14,z-.01]);
    const sweep=new T.Mesh(ownG(new T.PlaneGeometry(.84,.006)),pale);sweep.position.set(x+1.75,y+1.38,z+.182);root.add(sweep);
    screens.push({screen,sweep,y:y+1.38,hostile:index===2});
  }
  stations.forEach(([x,y,z],index)=>{
    diagnostic(x,y,z,index);
    colliders.push({x:x-1.9,z:z-.07,hx:.34,hz:.24,y,height:1.3,surface:'metal',campaign:true},{x:x+1.75,z,hx:.5,hz:.15,y:y+1.09,height:.58,surface:'metal',campaign:true});
    box(caseMetal,[.68,1.30,.48],[x-1.9,y+.65,z-.07]);
    for(let j=0;j<6;j++){
      box(rubber,[.56,.12,.07],[x-1.9,y+.18+j*.18,z+.19]);
      box(j%3?pale:amber,[.025,.018,.01],[x-2.09,y+.18+j*.18,z+.23]);
    }
    for(let j=0;j<2;j++)for(let k=0;k<12;k++)box(maps.dark,[.045,.025,.035],[x-.56+k*.095,y+1.065+j*.016,z+.13+j*.10],[.12,0,0]);
    for(let k=0;k<3;k++){
      const dz=k*.075;
      cable([[x-1.9,y+.5,z+.25],[x-1.8,y+.08,z+.5+dz],[x-.8,y+.055,z+.75+dz],[x+.4,y+.06,z+.6+dz],[x+.6,y+.6,z+.12]],.024+k*.004);
      box(maps.steel,[.1,.08,.12],[x+.6,y+.6,z+.12]);
    }
    // Hanging loops are attached to the cabinet rather than suspended in space.
    cable([[x-2.05,y+1.3,z-.1],[x-2.15,y+2.0,z-.25],[x-1.4,y+2.25,z-.3],[x-.7,y+1.9,z-.25],[x-.65,y+1.08,z-.1]],.025);
    const status=new T.Mesh(ownG(new T.SphereGeometry(.022,8,6)),amber);status.position.set(x-1.9,y+1.22,z+.23);root.add(status);lamps.push({mesh:status,index});
  });
  // Broken overhead conduit in the arrival laboratory. Ends are anchored to
  // the east column; loose conductors droop under gravity, away from the door.
  for(let k=0;k<5;k++){
    const z=64.5+k*.13;
    cable([[6.8,4.6,z],[6.6,4.6,z],[6.1,3.8,z],[5.9,3.0,z],[6.25,2.6,z]],.035);
    cable([[6.25,2.6,z],[6.35,2.48,z],[6.5,2.5,z]],.014,copper);
  }
  cable([[-6,1.8,61.4],[-7,1.8,61.4],[-7,.08,61.4],[-5,.06,60.7],[-2,.06,59.7],[0,.08,54.1],[0,.7,54.1]],.047);
  staticParts.build(root);
  for(const item of staticParts.items)item.geometry.dispose();staticParts.items=[];
  for(const mesh of root.children)if(mesh.isMesh&&!geometries.includes(mesh.geometry)){geometries.push(mesh.geometry);mesh.castShadow=quality!=='low';mesh.receiveShadow=true;}
  const spillMat=ownM(new T.MeshBasicMaterial({color:0xf4b16a,transparent:true,opacity:.045,depthWrite:false,side:T.DoubleSide,toneMapped:false}));
  for(const [x,y,z] of stations){const spill=new T.Mesh(ownG(new T.CircleGeometry(1,24)),spillMat);spill.rotation.x=-Math.PI/2;spill.scale.set(1.8,.9,1);spill.position.set(x,y+.018,z+.7);root.add(spill);}
  // One bounded line buffer, no new particle objects or canvases per frame.
  const positions=new Float32Array(12*6),arcG=ownG(new T.BufferGeometry());arcG.setAttribute('position',new T.BufferAttribute(positions,3));
  const arc=new T.LineSegments(arcG,ownM(new T.LineBasicMaterial({color:0xbee8ff,transparent:true,opacity:.8,toneMapped:false})));arc.frustumCulled=false;root.add(arc);arc.visible=false;
  const lights=[];if(quality!=='low')for(const i of [0,1]){const [x,y,z]=stations[i],light=new T.PointLight(0xffb46a,0,4,2);light.position.set(x+1.75,y+1.4,z+.5);root.add(light);lights.push(light);}
  let tick=-1;
  function update(game,time){
    if(!root.visible)return;powered=game?.campaign?.stage!=='power';disabled=!!game?.campaign?.sabotaged;
    for(const light of lights)light.intensity=powered?1.8:0;
    for(const [i,s] of screens.entries()){
      const on=powered&&!(s.hostile&&disabled);s.screen.material.color.setScalar(on?1:.10);s.sweep.visible=on;
      s.sweep.position.y=s.y-.20+((time*.12+i*.21)%1)*.4;
    }
    for(const lamp of lamps)lamp.mesh.visible=powered&&!(lamp.index===2&&disabled)&&Math.sin(time*1.2+lamp.index)>.1;
    const step=Math.floor(time*16),pulse=powered&&time%4.7<.16;arc.visible=pulse;
    if(pulse&&step!==tick){tick=step;for(let i=0;i<12;i++){
      const t=i/12,t1=(i+1)/12,jitter=j=>Math.sin(step*11.7+j*29.4)*.035;
      positions.set([6.5+t*.20,2.5-t*.21+jitter(i),64.5+t*.13,6.5+t1*.20,2.5-t1*.21+jitter(i+1),64.5+t1*.13],i*6);
    }arcG.attributes.position.needsUpdate=true;}
  }
  function dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const g of new Set(geometries))g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();}
  return {root,update,dispose,colliders,stats:()=>({revision:'3.44',cables,diagnosticScreens:screens.length,powered,surveillanceDisabled:disabled,electricArcs:arc.visible?1:0,staticBatches:staticParts.meshes.length})};
}
