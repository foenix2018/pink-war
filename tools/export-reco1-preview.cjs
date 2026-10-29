// Bake the approved standalone RECO1 V10 into shared, rigid-weighted skin batches.
// Usage: node tools/export-reco1-preview.cjs /path/to/PINK_WARS_RECO1_V10_VISEE.html
const fs=require('fs'),path=require('path'),zlib=require('zlib'),crypto=require('crypto');const {chromium}=require('playwright');
(async()=>{
 const input=process.argv[2];if(!input)throw new Error('Pass the approved RECO1 V10 HTML.');
 let html=fs.readFileSync(input,'utf8');const previewSha256=crypto.createHash('sha256').update(html).digest('hex');
 html=html.replace('return {actor,bones,skeleton,mixer,actions,weights,helper,update,diagnostics,bore,setAimTarget,isAimReady:', 'return {bindings,bodyBind,torsoBind,headBind,footBindings,armBindings,soleCorners,gun,actor,bones,skeleton,mixer,actions,weights,helper,update,diagnostics,bore,setAimTarget,isAimReady:');
 html=html.replace('states,selectView,motionRLH,shooting,','mats,states,selectView,motionRLH,shooting,');
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 let data;
 try{
  const page=await browser.newPage({viewport:{width:640,height:640}});await page.context().setOffline(true);
  await page.route('http://127.0.0.1:8123/export.html',r=>r.fulfill({body:html,contentType:'text/html'}));await page.goto('http://127.0.0.1:8123/export.html');await page.waitForFunction(()=>!!window.RECO1,{},{timeout:90000});
  data=await page.evaluate(()=>{
   const R=RECO1,M=R.motionRLH;R.states.paused=true;R.states.motion='idle';R.states.aim=true;
   for(let i=0;i<100;i++)M.update(1/60,i/60,0);R.root.updateMatrixWorld(true);
   const bindings=M.bindings.map(v=>({native:v.b.name,offset:v.offset.toArray(),orientation:v.orientation.toArray(),scale:v.scale.toArray(),followShoulder:v.followShoulder?.name,bindMatrix:v.o.matrixWorld.toArray()}));
   const index=v=>M.bindings.indexOf(v),gunIndex=bindings.length;
   const roles={body:index(M.bodyBind),torso:index(M.torsoBind),head:index(M.headBind),feet:M.footBindings.map(index),hands:M.armBindings.map(index),gun:gunIndex};
   bindings.push({native:null,scale:M.gun.scale.toArray(),bindMatrix:M.gun.matrixWorld.toArray()});
   const groupMap=new Map(M.bindings.map((v,i)=>[v.o,i]));groupMap.set(M.gun,gunIndex);
   const materials=[],textures=[],materialIds=new Map(),textureIds=new Map(),parts=new Map(),keys=new Map(Object.entries(R.mats).map(([k,v])=>[v,k]));
   function texture(t){if(!t)return null;if(textureIds.has(t))return textureIds.get(t);const canvas=t.image,c=canvas.getContext('2d'),pixels=c.getImageData(0,0,canvas.width,canvas.height).data;
    const id=textures.length;textureIds.set(t,id);textures.push({width:canvas.width,height:canvas.height,data:Array.from(pixels),colorSpace:t.colorSpace,wrapS:t.wrapS,wrapT:t.wrapT,repeat:t.repeat.toArray()});return id;}
   function material(m){if(materialIds.has(m))return materialIds.get(m);const id=materials.length;materialIds.set(m,id);
    materials.push({key:keys.get(m)||'decal-'+id,basic:!!m.isMeshBasicMaterial,color:m.color.toArray(),emissive:m.emissive?.toArray(),emissiveIntensity:m.emissiveIntensity,metalness:m.metalness,roughness:m.roughness,transparent:m.transparent,opacity:m.opacity,depthWrite:m.depthWrite,side:m.side,polygonOffset:m.polygonOffset,polygonOffsetFactor:m.polygonOffsetFactor,bumpScale:m.bumpScale,map:texture(m.map),roughnessMap:texture(m.roughnessMap),bumpMap:texture(m.bumpMap),emissiveMap:texture(m.emissiveMap)});return id;}
   R.root.traverse(o=>{
    if(!o.isMesh||o.material.opacity===0)return;let v=o,b;
    while(v&&v!==R.root){if(groupMap.has(v)){b=groupMap.get(v);break;}v=v.parent;}if(b===undefined)throw new Error('Unbound mesh '+o.id);
    const mid=material(o.material);if(!parts.has(mid))parts.set(mid,{material:mid,position:[],normal:[],uv:[],bone:[],index:[],vertices:new Map()});const part=parts.get(mid);
    const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,ids=g.index;
    for(let k=0;k<(ids?.count??p.count);k++){
     const i=ids?ids.getX(k):k,point=[p.getX(i),p.getY(i),p.getZ(i)],normal=[n.getX(i),n.getY(i),n.getZ(i)],tex=uv?[uv.getX(i),uv.getY(i)]:[0,0];
     const key=[b,...point.map(x=>Math.round(x*1e5)),...normal.map(x=>Math.round(x*1e4)),...tex.map(x=>Math.round(x*1e5))].join(',');let vertex=part.vertices.get(key);
     if(vertex===undefined){vertex=part.bone.length;part.vertices.set(key,vertex);part.position.push(...point);part.normal.push(...normal);part.uv.push(...tex);part.bone.push(b);}part.index.push(vertex);
    }g.dispose();
   });
   return {source:'User-approved PINK_WARS_RECO1_V10_VISEE.html; original RLH 41-bone Mixamo clips',revision:'RECO1 V10 / Pink Wars 3.65',motion:JSON.parse(document.getElementById('rlh-data').textContent),bindings,roles,soleCorners:M.soleCorners.map(a=>a.map(p=>p.toArray())),groundBias:M.diagnostics().groundBias,materials,textures,parts:[...parts.values()].map(({vertices,...p})=>p)};
  });
 }finally{await browser.close();}
 const enc=(a,Type)=>Buffer.from(new Type(a).buffer).toString('base64'),triangles=data.parts.reduce((n,p)=>n+p.index.length/3,0);
 for(const p of data.parts){p.position=enc(p.position,Float32Array);p.normal=enc(p.normal,Float32Array);p.uv=enc(p.uv,Float32Array);p.bone=enc(p.bone,Uint16Array);p.index=enc(p.index,Uint32Array);}
 for(const t of data.textures)t.data=enc(t.data,Uint8Array);
 const json=JSON.stringify(data),gzip=zlib.gzipSync(json,{level:9});
 fs.writeFileSync(path.join(__dirname,'../dist/reco1-data.js'),'// Generated by tools/export-reco1-preview.cjs from the user-approved RECO1 V10.\nexport const RECO1_GZIP='+JSON.stringify(gzip.toString('base64'))+';\n');
 fs.writeFileSync(path.join(__dirname,'../assets/reco1/manifest.json'),JSON.stringify({source:data.source,revision:data.revision,previewSha256,nativeBones:data.motion.bones.length,visualBones:data.bindings.length,batches:data.parts.length,triangles,bytes:gzip.length,materials:data.materials.map(m=>m.key)},null,2));
 console.log(JSON.stringify({nativeBones:data.motion.bones.length,visualBones:data.bindings.length,batches:data.parts.length,gzipBytes:gzip.length,materials:data.materials.map(m=>m.key)}));
})().catch(e=>{console.error(e);process.exit(1)});
