import * as T from './vendor/three.webgpu.min.js';
import { createRuinedCity, paintRuinSky } from './world-art.js';
import { createMoon } from './moon.js';

// Real scan silhouettes, original city materials and meshes. No replacement
// cuboid house, no visual structure in the walking lanes that the scan did not report.
export function createRoomArchitecture(scene,hero,ruin){
  const world=new T.Group();world.name='AT HOME — laboratoire IA dans la mégapole';scene.add(world);world.visible=false;
  const obstacles=[];const city=createRuinedCity(world,obstacles,[],hero.palette.rose,'minimal',{perimeter:false});
  // The house floor anchors the world. The open field is virtual enemy space;
  // walking and pickups remain on the real floor reported by the headset.
  const skyCanvas=document.createElement('canvas');skyCanvas.width=1024;skyCanvas.height=512;
  paintRuinSky(skyCanvas.getContext('2d'),1024,512,hero.masculine);
  const skyMap=new T.CanvasTexture(skyCanvas);skyMap.colorSpace=T.SRGBColorSpace;
  const sky=new T.Mesh(new T.SphereGeometry(430,32,16),new T.MeshBasicMaterial({map:skyMap,side:T.BackSide,depthWrite:false,fog:false}));sky.name='Ciel de Pink War';world.add(sky);
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;
  const gc=glowCanvas.getContext('2d'),grad=gc.createRadialGradient(64,64,0,64,64,64);grad.addColorStop(0,'white');grad.addColorStop(1,'rgba(255,255,255,0)');gc.fillStyle=grad;gc.fillRect(0,0,128,128);
  const glowMap=new T.CanvasTexture(glowCanvas),moon=createMoon(world,glowMap);
  const lamp=new T.PointLight(0xc5e0e9,7,9,2);lamp.castShadow=false;scene.add(lamp);lamp.visible=false;
  let bounds=null,enabled=false,full=true;
  const panels=new Set(),records=new Set();
  const dustGeo=new T.BufferGeometry(),dustArray=new Float32Array(96*3);
  for(let i=0;i<96;i++){dustArray[i*3]=Math.sin(i*12.7)*.5;dustArray[i*3+1]=(i%31)/31;dustArray[i*3+2]=Math.cos(i*7.9)*.5;}
  dustGeo.setAttribute('position',new T.BufferAttribute(dustArray,3));const dust=new T.Points(dustGeo,new T.PointsMaterial({color:0xc6d7de,size:.012,transparent:true,opacity:.25,depthWrite:false}));scene.add(dust);dust.visible=false;
  function setAppearance(){for(const [mat,opacity] of [[ruin.concrete,.29],[ruin.metal,.35],[ruin.road,.21]]){mat.transparent=!full;mat.opacity=full?1:opacity;mat.depthWrite=full;mat.needsUpdate=true;}world.visible=enabled&&full&&!!bounds;dust.visible=lamp.visible=enabled&&!!bounds;for(const record of records)if(record.decor)record.decor.visible=enabled&&(record.isFloor||record.isCover);}
  function disposeDecor(record){
    if(!record?.decor)return;record.decor.traverse(o=>{if(o.isMesh&&o.geometry)o.geometry.dispose();});record.decor.removeFromParent();
    panels.delete(record.decor);record.decor=null;records.delete(record);
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
    record.collider.add(group);record.decor=group;records.add(record);panels.add(group);group.visible=enabled&&(record.isFloor||record.isCover);
  }
  return {world,city,sky,moon,obstacles,
    project,disposeDecor,
    setEnabled(value,immersive=full){enabled=!!value;full=!!immersive;setAppearance();},
    resetRoom(){bounds=null;enabled=false;setAppearance();},
    setRoom(next){if(!next)return;if(!bounds){world.position.set((next.minX+next.maxX)/2,next.floorY,(next.minZ+next.maxZ)/2);lamp.position.copy(world.position).add(new T.Vector3(0,1.85,0));dust.position.copy(world.position);}bounds=next;dust.scale.set(Math.max(1,next.maxX-next.minX),2.4,Math.max(1,next.maxZ-next.minZ));setAppearance();},
    update(time,camera){if(!enabled||!bounds)return;city.update(time);moon.update(camera);moon.group.position.sub(world.position);dust.rotation.y=Math.sin(time*.03)*.02;dust.position.y=world.position.y+Math.sin(time*.2)*.035;},
    stats(){return {surfaces:records.size,detailedWalls:0,openAir:true,immersive:full,worldVisible:world.visible,city:city.stats,theme:'laboratoire IA',bounds};},
    dispose(){for(const r of [...records])disposeDecor(r);world.removeFromParent();lamp.removeFromParent();dust.removeFromParent();dust.geometry.dispose();dust.material.dispose();skyMap.dispose();glowMap.dispose();world.traverse(o=>{if(o.isMesh||o.isPoints){o.geometry?.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m?.dispose());}});}
  };
}
