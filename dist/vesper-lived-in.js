// Traces of everyday life, confined to existing furniture and planting beds.
// All solid dressing has an authored support; floor marks have no collision.
import {Assembly, bevelBox, matrix, limb, loft} from './geo.js';

export function createLivedInDressing(T, parent, {chapter, low = false, materials: M} = {}) {
  const root = new T.Group(); root.name = 'VESPER / traces de vie'; parent.add(root);
  const fixed = new Assembly(), owned = [], textures = [], animated = [], placements = [];
  const stats = {objects:0, marks:0, fans:0, movingCloth:0, waterFeatures:0, batches:0, triangles:0};
  let built = false, disposed = false;
  const tinted = (source, color, name) => { const m = source.clone(); m.color.setHex(color); m.name='VESPER / '+name; owned.push(m); return m; };
  const blue=tinted(M.fabric,0x567c86,'toile bleu délavé'),ochre=tinted(M.paint,0xaa8653,'boîtes ocres'),
    red=tinted(M.paint,0x995449,'rouge passé'),cream=tinted(M.fabric,0xd9d2b9,'linge écru');
  blue.side=cream.side=T.DoubleSide;
  const add=(a,g,m,p=[0,0,0],r=[0,0,0],s=[1,1,1])=>{a.add(g,m,matrix(p,r,s),!low);g.dispose();};
  const box=(a,m,size,p,r=[0,0,0])=>{
    const g=Math.min(...size)>.045?bevelBox(...size,Math.min(.025,Math.min(...size)*.17),1):new T.BoxGeometry(...size);
    const pos=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,tile=m.userData.tile||.45;
    for(let i=0;i<pos.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.65?pos.getZ(i):pos.getX(i))/tile,(Math.abs(n.getY(i))>.65?pos.getZ(i):pos.getY(i))/tile);
    add(a,g,m,p,r);
  };
  const rod=(a,m,from,to,r=.012)=>{const g=limb(from,to,r,r,low?6:8);a.add(g,m,null,!low);g.dispose();};
  const ring=(a,m,r,t,p,rot=[0,0,0])=>add(a,new T.TorusGeometry(r,t,low?4:6,low?12:18),m,p,rot);
  const finish=(a,host)=>{
    a.build(host);
    for(const mesh of a.meshes){mesh.name='VESPER / vécu '+mesh.material.name;mesh.castShadow=!low&&!mesh.material.transparent;mesh.receiveShadow=true;stats.batches++;stats.triangles+=mesh.geometry.attributes.position.count/3;}
    for(const item of a.items)item.geometry.dispose();a.items.length=0;
  };
  // Each local object starts at the top of its support. This also makes it
  // possible to validate placement independently of the merged render meshes.
  function on(o,kind,offset,draw,{yaw=0,top=o.height+(['reception','security-desk'].includes(o.kind)?.05:0)}={}) {
    const a=new Assembly();draw(a);
    const x=o.x+offset[0],z=o.z+offset[1],pose=matrix([x,top,z],[0,yaw,0]);
    for(const item of a.items){fixed.add(item.geometry,item.material,pose,item.shadow);item.geometry.dispose();}
    a.items.length=0;placements.push({kind,support:o.kind,x,y:top,z,supportY:top,supportX:o.x,supportZ:o.z,hx:o.hx,hz:o.hz});stats.objects++;
  }
  function bag(a,mat=blue){
    const body=loft([[.005,.10,.06,0],[.04,.15,.085,0],[.27,.15,.095,0],[.35,.12,.075,-.01],[.38,.05,.035,-.015]],low?10:16);
    const uv=body.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*16,uv.getY(i)*8);
    add(a,body,mat);box(a,mat,[.27,.15,.06],[0,.12,.12]);
    box(a,M.dark,[.30,.018,.012],[0,.21,.155]);
    for(const side of [-1,1]){
      const curve=new T.CatmullRomCurve3([[side*.105,.32,-.075],[side*.145,.21,-.15],[side*.13,.12,-.16],[side*.10,.055,-.085]].map(p=>new T.Vector3(...p)));
      add(a,new T.TubeGeometry(curve,low?8:14,.012,5,false),M.dark);
      box(a,M.steel,[.027,.025,.015],[side*.12,.09,-.13]);box(a,mat,[.04,.13,.10],[side*.16,.10,0]);
    }
    ring(a,M.dark,.052,.012,[0,.39,-.02]);
  }
  function boots(a){
    for(const side of [-1,1]){
      const x=side*.09;box(a,M.dark,[.14,.045,.27],[x,.023,.02]);box(a,M.dark,[.13,.10,.25],[x,.085,.02]);
      add(a,new T.CylinderGeometry(.06,.065,.18,low?8:12,1,true),M.dark,[x,.19,-.045]);ring(a,M.paint,.06,.006,[x,.28,-.045],[Math.PI/2,0,0]);
      for(let k=0;k<3;k++)box(a,M.steel,[.08,.008,.012],[x,.125+k*.03,.027]);
    }
  }
  function bottle(a,mat=M.ceramic){
    add(a,new T.CylinderGeometry(.043,.05,.20,low?8:12),mat,[0,.11,0]);
    add(a,new T.CylinderGeometry(.022,.038,.05,low?8:12),mat,[0,.235,0]);
    add(a,new T.CylinderGeometry(.024,.024,.035,low?8:12),M.dark,[0,.278,0]);
    box(a,M.paper,[.063,.068,.005],[0,.13,.047]);
  }
  function foodTin(a,mat=ochre){
    add(a,new T.CylinderGeometry(.055,.055,.12,low?10:16),mat,[0,.06,0]);
    for(const y of [.009,.116])ring(a,M.steel,.052,.006,[0,y,0],[Math.PI/2,0,0]);
    add(a,new T.CircleGeometry(.049,16),M.steel,[0,.122,0],[-Math.PI/2,0,0]);
    ring(a,M.dark,.014,.004,[.008,.125,0],[Math.PI/2,0,0]);
  }
  function papers(a){
    for(let k=0;k<3;k++)box(a,M.paper,[.24,.003,.18],[k*.012,.003+k*.004,0],[0,.08*k,0]);
    for(let k=0;k<5;k++)box(a,M.dark,[.14-k*.012,.001,.002],[0,.014,-.055+k*.018],[0,.16,0]);
  }
  function fan(o,offset,power){
    const g=new T.Group();g.name='VESPER / ventilateur '+power;g.position.set(o.x+offset[0],o.height,o.z+offset[1]);root.add(g);
    const a=new Assembly();box(a,M.paint,[.22,.025,.18],[0,.016,0]);rod(a,M.steel,[0,.03,0],[0,.28,0],.018);
    add(a,new T.CylinderGeometry(.048,.048,.10,10),M.paint,[0,.30,-.055],[Math.PI/2,0,0]);
    for(const z of [-.015,.055]){ring(a,M.steel,.145,.009,[0,.30,z]);for(let k=0;k<8;k++){const t=k*Math.PI/4;rod(a,M.steel,[0,.30,z],[Math.sin(t)*.14,.30+Math.cos(t)*.14,z],.003);}}
    finish(a,g);
    const rotor=new T.Group();rotor.name='VESPER / pales mobiles';rotor.position.set(0,.30,.02);g.add(rotor);
    const blades=new Assembly();
    for(let k=0;k<3;k++){const t=k*Math.PI*2/3;box(blades,M.paint,[.06,.13,.012],[Math.sin(t)*.065,Math.cos(t)*.065,0],[0,0,-t-.15]);}
    add(blades,new T.CylinderGeometry(.032,.032,.035,10),M.dark,[0,0,0],[Math.PI/2,0,0]);finish(blades,rotor);
    animated.push({kind:'fan',root:rotor,power,speed:0});stats.fans++;stats.objects++;
    placements.push({kind:'fan',support:o.kind,x:g.position.x,y:o.height,z:g.position.z,supportY:o.height,supportX:o.x,supportZ:o.z,hx:o.hx,hz:o.hz});
  }
  function cloth(o){
    const g=new T.Group();g.name='VESPER / étoffe au montant';g.position.set(o.x+o.hx-.07,2.52,o.z+o.hz-.07);root.add(g);
    const geo=new T.PlaneGeometry(.27,.55,low?3:6,6),p=geo.attributes.position,uv=geo.attributes.uv;
    for(let i=0;i<p.count;i++){const y=p.getY(i)-.275;p.setY(i,y);p.setZ(i,Math.sin(p.getX(i)*38)*.012*(-y/.55));uv.setXY(i,uv.getX(i)*6,uv.getY(i)*12);}
    geo.computeVertexNormals();const m=new T.Mesh(geo,blue);g.add(m);stats.triangles+=geo.index.count/3;stats.batches++;
    animated.push({kind:'cloth',root:g,phase:(o.x+o.z)*.3});stats.movingCloth++;
    // Two visible ties fasten it to the existing stall's upright.
    for(const y of [2.48,2.36])ring(fixed,M.dark,.035,.006,[g.position.x,y,g.position.z],[Math.PI/2,0,0]);
  }
  let markMaterial=null;
  function marks(){
    const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d');ctx.clearRect(0,0,256,128);
    ctx.fillStyle='#41372a';ctx.beginPath();ctx.ellipse(58,43,24,35,-.10,0,Math.PI*2);ctx.fill();ctx.fillRect(40,83,35,25);
    ctx.globalCompositeOperation='destination-out';for(let y=22;y<78;y+=9)ctx.fillRect(29,y,56,3);ctx.globalCompositeOperation='source-over';
    ctx.strokeStyle='#68503a';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(195,64,39,37,.15,0,Math.PI*1.92);ctx.stroke();
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;textures.push(map);
    markMaterial=new T.MeshStandardMaterial({name:'VESPER / traces sèches',map,transparent:true,opacity:.23,alphaTest:.015,depthWrite:false,roughness:1,metalness:0,polygonOffset:true,polygonOffsetFactor:-1});owned.push(markMaterial);
  }
  function stamp(x,y,z,{ring=false,yaw=0}={}){
    if(!markMaterial)marks();const g=new T.PlaneGeometry(ring?.18:.15,ring?.18:.30),uv=g.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setX(i,uv.getX(i)*.5+(ring?.5:0));
    add(fixed,g,markMaterial,[x,y,z],[-Math.PI/2,0,yaw]);stats.marks++;
  }
  function waterBasin(o){
    const water=tinted(M.ceramic,0x47635b,'eau du bassin');water.transparent=true;water.opacity=.68;water.roughness=.18;water.metalness=0;water.depthWrite=false;
    const level=.28,px=o.x-o.hx+.08,z=o.z,nozzle=px+.38;
    add(fixed,new T.PlaneGeometry(o.hx*2-.34,o.hz*2-.34),water,[o.x,level,z],[-Math.PI/2,0,0]);
    rod(fixed,M.copper,[px,o.height,z],[px,o.height+.27,z],.022);
    rod(fixed,M.copper,[px,o.height+.27,z],[nozzle,o.height+.27,z],.022);
    rod(fixed,M.copper,[nozzle,o.height+.27,z],[nozzle,o.height+.21,z],.022);
    ring(fixed,red,.065,.012,[px,o.height+.14,z+.045]);
    const rippleMat=new T.MeshBasicMaterial({name:'VESPER / rides de l’eau',color:0xadc5b6,transparent:true,opacity:0,depthWrite:false,toneMapped:false});owned.push(rippleMat);
    const ripple=new T.Mesh(new T.RingGeometry(.04,.048,low?16:24),rippleMat);ripple.rotation.x=-Math.PI/2;ripple.position.set(nozzle,level+.002,z);root.add(ripple);
    const drop=new T.Mesh(new T.SphereGeometry(.008,6,4),water);drop.scale.set(.7,1.7,.7);root.add(drop);
    animated.push({kind:'water',root:ripple,drop,top:o.height+.20,level,x:nozzle,z});stats.waterFeatures++;stats.batches+=2;stats.triangles+=low?80:96;
    placements.push({kind:'bassin et robinet',support:o.kind,x:o.x,y:level,z,supportY:level,supportX:o.x,supportZ:o.z,hx:o.hx,hz:o.hz});stats.objects++;
  }
  function enrich(o){
    if(o.kind==='bench'&&chapter===1){
      const along=o.hx>o.hz;
      on(o,'sac personnel',along?[-o.hx*.35,0]:[0,-o.hz*.35],a=>bag(a),{yaw:along?.15:Math.PI/2});
      on(o,'paire de bottes',along?[o.hx*.42,0]:[0,o.hz*.42],boots,{yaw:along?0:Math.PI/2});
    }
    if(o.kind==='desk'||o.kind==='reception'||o.kind==='security-desk'){
      on(o,'documents décalés',[-o.hx*.62,-o.hz*.28],papers,{yaw:.22});
      on(o,'gourde', [o.hx*.67,-o.hz*.34],a=>bottle(a,o.kind==='security-desk'?M.paint:blue));
      stamp(o.x+o.hx*.48,o.height+(['reception','security-desk'].includes(o.kind)?.05:0)+.004,o.z+o.hz*.35,{ring:true});
      if(o.kind==='desk'&&chapter===2){
        on(o,'plateau de soins',[-o.hx*.55,o.hz*.35],a=>{
          box(a,M.steel,[.32,.012,.21],[0,.01,0]);
          for(let k=0;k<3;k++){add(a,new T.CylinderGeometry(.025,.025,.07,10),cream,[-.09+k*.08,.045,0],[Math.PI/2,0,0]);ring(a,cream,.025,.006,[-.09+k*.08,.045,.038]);}
          rod(a,M.steel,[-.07,.025,.07],[.11,.025,.07],.006);
        });
      }
    }
    if(o.kind==='radio-table'||o.kind==='console')fan(o,[o.hx*.55,0],chapter===1?'caserne':'enclave');
    if(o.kind==='workbench'){
      on(o,'gants de travail',[o.hx*.55,-o.hz*.55],a=>{
        for(const side of [-1,1]){
          box(a,cream,[.09,.026,.12],[side*.07,.02,0]);
          for(let k=0;k<4;k++)add(a,new T.SphereGeometry(1,6,4),cream,[side*.07-.029+k*.019,.019,.075],[0,0,0],[.007,.010,.030]);
          add(a,new T.SphereGeometry(1,6,4),cream,[side*.07+side*.048,.019,.02],[0,side*.55,0],[.012,.011,.030]);
          box(a,blue,[.09,.025,.028],[side*.07,.02,-.065]);
        }
      });
      // Hanging spanners and screwdriver: attached to the existing pegboard.
      for(let k=0;k<3;k++){
        const x=o.x-.65+k*.6,z=o.z+o.hz-.065,y=o.height+.64;
        ring(fixed,M.steel,.037,.01,[x,y-.06,z]);rod(fixed,M.steel,[x,y-.09,z],[x,y-.34,z],.015);
        ring(fixed,M.steel,.043,.009,[x,y-.36,z]);rod(fixed,M.steel,[x,y,z+.02],[x,y-.02,z-.02],.009);
      }
    }
    if(o.kind==='display'&&chapter===1){
      on(o,'herbier sous verre',[0,0],a=>{
        box(a,M.paper,[.86,.006,.84],[0,.003,0]);rod(a,M.bark,[-.2,.012,-.3],[.17,.012,.30],.007);
        for(let k=0;k<7;k++)for(const side of [-1,1]){
          const t=k/7,x=-.2+t*.37,z=-.3+t*.6;
          add(a,new T.SphereGeometry(1,low?6:8,4),k%2?M.leaf:M.leafTip,[x+side*.07,.02,z],[0,side*.65,0],[.10,.008,.033]);
        }
      },{top:.801});
    }
    if(o.kind==='basin'&&chapter===1)waterBasin(o);
    if(o.kind==='bed'&&o.surface==='concrete'&&chapter===1){
      on(o,'semis et godets',[-o.hx*.62,-o.hz*.67],a=>{
        box(a,M.paint,[.45,.025,.29],[0,.014,0]);
        for(let k=0;k<6;k++){const x=(k%3-1)*.14,z=(k>2?1:-1)*.07;add(a,new T.CylinderGeometry(.055,.035,.07,8),ochre,[x,.06,z]);add(a,new T.CircleGeometry(.047,8),M.soil,[x,.096,z],[-Math.PI/2,0,0]);rod(a,M.leaf,[x,.10,z],[x+.015,.17,z],.005);}
      });
      if(o.x<25&&o.z< -85)on(o,'arrosoir',[o.hx*.66,o.hz*.65],a=>{
        add(a,new T.CylinderGeometry(.115,.12,.22,12),M.paint,[0,.115,0]);ring(a,M.steel,.118,.012,[0,.23,0],[Math.PI/2,0,0]);ring(a,M.paint,.13,.018,[0,.15,-.10]);
        rod(a,M.paint,[.08,.09,0],[.28,.25,0],.025);add(a,new T.CylinderGeometry(.045,.025,.035,8),M.steel,[.29,.26,0],[0,0,-.8]);
      });
    }
    if(o.kind==='stall'){
      on(o,'sac au couchage',[o.hx*.60,0],a=>bag(a,Math.abs(o.x)%3?blue:cream),{top:o.height+.20,yaw:-.22});cloth(o);
      on(o,'bouteille au couchage',[o.hx*.78,-o.hz*.5],a=>bottle(a),{top:o.height+.15});
    }
    if(o.kind==='school'){
      on(o,'cahier et crayons',[0,-o.hz*.5],a=>{
        box(a,blue,[.29,.016,.22],[0,.01,0]);box(a,M.paper,[.27,.006,.20],[0,.022,0]);
        for(let k=0;k<4;k++)rod(a,k%2?red:ochre,[-.11+k*.05,.031,-.04],[-.06+k*.05,.031,.08],.004);
      });
    }
    if(o.kind==='kitchen'){
      for(const side of [-1,1])on(o,'conserves', [side*.65,-o.hz*.65],a=>foodTin(a,side<0?red:ochre));
      on(o,'bol et cuillère',[0,-o.hz*.65],a=>{
        const g=new T.LatheGeometry([[0,0],[.025,0],[.09,.02],[.13,.075],[.135,.09],[.126,.09],[.12,.074],[.08,.03],[0,.018]].map(p=>new T.Vector2(...p)),low?12:20);add(a,g,M.ceramic,[0,.008,0]);ring(a,M.ceramic,.132,.008,[0,.098,0],[Math.PI/2,0,0]);
        rod(a,M.steel,[.03,.1,0],[.20,.1,.025],.005);
      });
      on(o,'réserve d’eau',[o.hx*.85,-o.hz*.45],a=>bottle(a,blue));
    }
    if(o.kind==='crates'){
      on(o,'fiche de manutention',[-o.hx*.4,0],papers,{top:o.height-.019,yaw:-.18});
    }
  }
  return {root,
    build(obstacles){
      if(built)return;built=true;for(const o of obstacles)if(o.extension)enrich(o);
      // Dry shoe marks along existing pedestrian routes, flat against the floor.
      for(let k=0;k<(low?6:10);k++){
        const x=chapter===1?-82+(k%2?.13:-.13):35+(k%2?.13:-.13),z=chapter===1?46+k*.48:92-k*.42;
        stamp(x,.010,z,{yaw:k%2?.08:-.08});
      }
      finish(fixed,root);
    },
    update(t,dt,power={}){
      if(disposed||!root.visible)return;const step=Math.max(0,Math.min(.1,dt||0));
      for(const a of animated){
        if(a.kind==='fan'){a.speed+=((power[a.power]?17:0)-a.speed)*(1-Math.exp(-step*3));a.root.rotation.z=(a.root.rotation.z+a.speed*step)%(Math.PI*2);}
        else if(a.kind==='water'){
          const phase=(Math.max(0,t)%2.8)/2.8;a.root.scale.setScalar(1+phase*6);a.root.material.opacity=(1-phase)*.15;
          const fall=(phase+.22)%1;a.drop.visible=fall<.24;a.drop.position.set(a.x,a.top-(a.top-a.level)*Math.min(1,(fall/.24)**2),a.z);
        }else a.root.rotation.x=Math.sin(t*.7+a.phase)*.026;
      }
    },
    stats:()=>({...stats,placements:placements.map(p=>({...p})),fanSpeeds:animated.filter(a=>a.kind==='fan').map(a=>({power:a.power,speed:a.speed}))}),
    dispose(){if(disposed)return;disposed=true;root.removeFromParent();const geos=new Set();root.traverse(o=>{if(o.geometry)geos.add(o.geometry);});for(const g of geos)g.dispose();for(const m of owned)m.dispose();for(const t of textures)t.dispose();}
  };
}
