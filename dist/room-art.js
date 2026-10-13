import * as T from './vendor/three.webgpu.min.js';
import { Assembly, limb, armorPanel, matrix } from './geo.js';
import { createRuinedCity, paintRuinSky } from './world-art.js';
import { createMoon } from './moon.js';

// Real scan silhouettes, original city materials and meshes. No replacement
// cuboid house, no visual structure in the walking lanes that the scan did not report.
export function createRoomArchitecture(scene,hero,ruin){
  const world=new T.Group();world.name='AT HOME — laboratoire IA dans la mégapole';scene.add(world);world.visible=false;
  const city=createRuinedCity(world,[],[],hero.palette.rose,'minimal');
  // Original city ground remains cosmetic beyond the house. Only detected
  // real floors are ever used for navigation, spawning or room collisions.
  const skyCanvas=document.createElement('canvas');skyCanvas.width=1024;skyCanvas.height=512;
  paintRuinSky(skyCanvas.getContext('2d'),1024,512,hero.masculine);
  const skyMap=new T.CanvasTexture(skyCanvas);skyMap.colorSpace=T.SRGBColorSpace;
  const sky=new T.Mesh(new T.SphereGeometry(430,32,16),new T.MeshBasicMaterial({map:skyMap,side:T.BackSide,depthWrite:false,fog:false}));sky.name='Ciel de Pink War';world.add(sky);
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;
  const gc=glowCanvas.getContext('2d'),grad=gc.createRadialGradient(64,64,0,64,64,64);grad.addColorStop(0,'white');grad.addColorStop(1,'rgba(255,255,255,0)');gc.fillStyle=grad;gc.fillRect(0,0,128,128);
  const glowMap=new T.CanvasTexture(glowCanvas),moon=createMoon(world,glowMap);
  const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=256;const c=labelCanvas.getContext('2d');
  c.fillStyle='#19252b';c.fillRect(0,0,512,256);c.strokeStyle='#a5b9be';c.lineWidth=5;c.strokeRect(8,8,496,240);
  c.fillStyle=hero.accent;c.font='bold 48px monospace';c.fillText('LAB / IA',36,72);c.fillStyle='#dce8e9';c.font='25px monospace';c.fillText('ARCHIVES SOUS TENSION',36,128);c.fillStyle='#b4a76e';c.font='20px monospace';c.fillText('APRÈS LA CHUTE',36,198);
  const labelMap=new T.CanvasTexture(labelCanvas);labelMap.colorSpace=T.SRGBColorSpace;
  const labelMat=new T.MeshBasicMaterial({map:labelMap,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-4});
  const dark=new T.MeshStandardMaterial({color:0x17232b,roughness:.67,metalness:.5,map:ruin.metalMap});
  const lamp=new T.PointLight(0xc5e0e9,7,9,2);lamp.castShadow=false;scene.add(lamp);lamp.visible=false;
  const leafMat=city.materials.foliage;let detailed=0,bounds=null,enabled=false,full=true;
  const panels=new Set(),records=new Set();
  const dustGeo=new T.BufferGeometry(),dustArray=new Float32Array(96*3);
  for(let i=0;i<96;i++){dustArray[i*3]=Math.sin(i*12.7)*.5;dustArray[i*3+1]=(i%31)/31;dustArray[i*3+2]=Math.cos(i*7.9)*.5;}
  dustGeo.setAttribute('position',new T.BufferAttribute(dustArray,3));const dust=new T.Points(dustGeo,new T.PointsMaterial({color:0xc6d7de,size:.012,transparent:true,opacity:.25,depthWrite:false}));scene.add(dust);dust.visible=false;
  function setAppearance(){for(const [mat,opacity] of [[ruin.concrete,.29],[ruin.metal,.35],[ruin.road,.21]]){mat.transparent=!full;mat.opacity=full?1:opacity;mat.depthWrite=full;mat.needsUpdate=true;}world.visible=enabled&&full&&!!bounds;dust.visible=lamp.visible=enabled&&!!bounds;for(const record of records)if(record.decor)record.decor.visible=enabled;}
  function disposeDecor(record){
    if(!record?.decor)return;record.decor.traverse(o=>{if(o.isMesh&&o.geometry)o.geometry.dispose();});record.decor.removeFromParent();
    if(record.decor.userData.detailed)detailed--;panels.delete(record.decor);record.decor=null;records.delete(record);
  }
  function project(record,viewer={x:0,y:1.65,z:0}){
    if(!record?.collider?.geometry)return;disposeDecor(record);
    const geometry=record.collider.geometry.clone();geometry.computeVertexNormals();geometry.computeBoundingBox();
    const positions=geometry.attributes.position,normals=geometry.attributes.normal,uv=new Float32Array(positions.count*2);
    for(let i=0;i<positions.count;i++){
      const n=[Math.abs(normals.getX(i)),Math.abs(normals.getY(i)),Math.abs(normals.getZ(i))],axis=n.indexOf(Math.max(...n));
      const p=[positions.getX(i),positions.getY(i),positions.getZ(i)],axes=axis===0?[2,1]:axis===1?[0,2]:[0,1];uv[i*2]=p[axes[0]]*.55;uv[i*2+1]=p[axes[1]]*.55;
    }
    geometry.setAttribute('uv',new T.BufferAttribute(uv,2));
    const group=new T.Group();group.name='Laboratoire IA — '+record.kind;
    const panel=new T.Mesh(geometry,record.isFloor?ruin.road:record.kind==='object'||record.kind==='mesh'?ruin.metal:ruin.concrete);panel.renderOrder=2;group.add(panel);
    record.collider.add(group);record.decor=group;records.add(record);panels.add(group);group.visible=enabled;
    if(record.kind!=='wall'||detailed>=8)return;
    const box=geometry.boundingBox,normal=new T.Vector3(normals.getX(0),normals.getY(0),normals.getZ(0)),axis=[Math.abs(normal.x),Math.abs(normal.y),Math.abs(normal.z)].indexOf(Math.max(Math.abs(normal.x),Math.abs(normal.y),Math.abs(normal.z)));
    const axes=axis===0?[2,1]:axis===1?[0,2]:[0,1],min=box.min.toArray(),max=box.max.toArray(),width=max[axes[0]]-min[axes[0]],height=max[axes[1]]-min[axes[1]];
    if(width<.7||height<.7)return;
    group.userData.detailed=true;detailed++;
    const center=box.getCenter(new T.Vector3()).toArray(),a=new Assembly(),localViewer=record.collider.worldToLocal(new T.Vector3(viewer.x,viewer.y,viewer.z)),facing=localViewer.toArray()[axis]>=center[axis]?1:-1;
    function point(u,v,depth=.012){const p=[...center];p[axes[0]]=u;p[axes[1]]=v;p[axis]+=depth*facing;return p;}
    const x=min[axes[0]]+width*.08,z=min[axes[1]]+height*.08;
    // Curved conduits follow the true wall, with shallow fittings rather than new obstacles.
    for(const offset of [0,.075])a.add(limb(point(x+offset,z),point(x+offset,z+height*.7),.014,.014,8),ruin.metal);
    for(let i=0;i<4;i++)a.add(limb(point(x-.035,z+i*height*.19),point(x+.11,z+i*height*.19),.012,.012,6),dark);
    const patch=armorPanel([[-.25,-.25],[.25,-.25],[.29,.12],[.14,.27],[-.2,.27],[-.29,.1]],.005,.012);
    const planeRotation=axis===1?[-facing*Math.PI/2,0,0]:axis===0?[0,facing*Math.PI/2,0]:[0,facing<0?Math.PI:0,0];
    a.add(patch,ruin.metal,matrix(point(x+Math.min(width*.43,.9),z+Math.min(height*.44,.9),.018),planeRotation));
    for(let i=0;i<3;i++)a.add(limb(point(x+.3,z+.15+i*.1,.025),point(x+.42,z+.15+i*.1,.025),.012,.012,6),ruin.glow);
    const label=new T.Mesh(new T.PlaneGeometry(.53,.26),labelMat);label.position.fromArray(point(x+Math.min(width*.43,.9),z+Math.min(height*.44,.9),.045));label.rotation.set(...planeRotation);label.renderOrder=4;group.add(label);
    // The original city foliage is reused sparsely along wall edges, never across the floor.
    for(let i=0;i<5;i++){const rotation=[...planeRotation];rotation[2]+=Math.sin(i*3)*.3;a.add(new T.PlaneGeometry(.13,.21),leafMat,matrix(point(max[axes[0]]-.10-.045*Math.sin(i),max[axes[1]]-.2-i*.20,.015),rotation));}
    a.mount(group);
  }
  return {world,city,sky,moon,
    project,disposeDecor,
    setEnabled(value,immersive=full){enabled=!!value;full=!!immersive;setAppearance();},
    setRoom(next){bounds=next;if(next){world.position.set((next.minX+next.maxX)/2,next.floorY,(next.minZ+next.maxZ)/2);lamp.position.copy(world.position).add(new T.Vector3(0,1.85,0));dust.position.copy(world.position);dust.scale.set(Math.max(1,next.maxX-next.minX),2.4,Math.max(1,next.maxZ-next.minZ));}setAppearance();},
    update(time,camera){if(!enabled||!bounds)return;city.update(time);moon.update(camera);moon.group.position.sub(world.position);dust.rotation.y=Math.sin(time*.03)*.02;dust.position.y=bounds.floorY+Math.sin(time*.2)*.035;},
    stats(){return {surfaces:records.size,detailedWalls:detailed,immersive:full,worldVisible:world.visible,city:city.stats,theme:'laboratoire IA',bounds};},
    dispose(){for(const r of [...records])disposeDecor(r);world.removeFromParent();lamp.removeFromParent();dust.removeFromParent();dust.geometry.dispose();dust.material.dispose();labelMap.dispose();labelMat.dispose();dark.dispose();skyMap.dispose();glowMap.dispose();world.traverse(o=>{if(o.isMesh||o.isPoints){o.geometry?.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m?.dispose());}});}
  };
}
