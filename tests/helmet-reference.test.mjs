import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createCharacterKit,createSoldier} from '../dist/soldier.js';
import {buildGun} from '../dist/weapons.js';
import {CHARACTERS} from '../dist/characters.js';
import {attachShadowConcept} from '../dist/personnage-shadow-concept.js';

function withHelmet(profile,check){
  const kit=createCharacterKit(new T.Texture());
  const mats=Object.fromEntries(['dark','steel','armor','armorLight','rose','pale','violet','cyan']
    .map(name=>[name,new T.MeshStandardMaterial()]));
  const soldier=createSoldier(kit,()=>buildGun({mats,gloves:kit.gloves,sleeve:false,
    makeFlash:parent=>{const object=new T.Object3D();parent.add(object);return object;}
  }),profile);
  const armour=attachShadowConcept(soldier,profile);
  try{check(armour.helmet);}finally{armour.dispose();soldier.dispose();}
}

function meshFor(helmet,name){
  const mesh=helmet.children.find(mesh=>mesh.material?.name===name);
  assert.ok(mesh,'generated helmet includes '+name);
  mesh.geometry.computeBoundingBox();
  return mesh;
}

const pointKey=v=>v.map(n=>Math.abs(n)<.0000005?'0':n.toFixed(6)).join(',');
const triangleKey=vertices=>{
  const keys=vertices.map(pointKey);
  return [keys.join(';'),[keys[1],keys[2],keys[0]].join(';'),[keys[2],keys[0],keys[1]].join(';')].sort()[0];
};

function components(geometry){
  const p=geometry.attributes.position,points=new Map(),links=new Map();
  for(let i=0;i<p.count;i+=3){
    const keys=[0,1,2].map(j=>{
      const point=[p.getX(i+j),p.getY(i+j),p.getZ(i+j)],key=pointKey(point);
      points.set(key,point);if(!links.has(key))links.set(key,new Set());return key;
    });
    for(const key of keys)for(const neighbour of keys)links.get(key).add(neighbour);
  }
  const groups=[],visited=new Set();
  for(const key of points.keys()){
    if(visited.has(key))continue;
    const group=[],pending=[key];visited.add(key);
    while(pending.length){
      const current=pending.pop();group.push(new T.Vector3(...points.get(current)));
      for(const neighbour of links.get(current))if(!visited.has(neighbour)){visited.add(neighbour);pending.push(neighbour);}
    }
    groups.push(group);
  }
  return groups;
}

function localHits(mesh,x,y,rear=false){
  const local=new T.Mesh(mesh.geometry,mesh.material);
  return new T.Raycaster(new T.Vector3(x,y,rear?1:-1),new T.Vector3(0,0,rear?-1:1)).intersectObject(local);
}

for(const profile of CHARACTERS){
  test('Shadow helmet '+profile.id+' has mirrored finite surfaces and coherent winding',()=>withHelmet(profile,helmet=>{
    for(const mesh of helmet.children){
      const geometry=mesh.geometry,p=geometry.attributes.position,n=geometry.attributes.normal;
      for(const attribute of Object.values(geometry.attributes))assert.ok(attribute.array.every(Number.isFinite),
        'all generated vertex attributes stay finite');
      assert.equal(geometry.index,null,'the final helmet uses explicit triangles');
      const triangles=[];
      for(let i=0;i<p.count;i+=3)triangles.push([0,1,2].map(j=>[p.getX(i+j),p.getY(i+j),p.getZ(i+j)]));
      const faces=new Set(triangles.map(triangleKey));
      for(let i=0;i<triangles.length;i++){
        const face=triangles[i],reflected=face.map(([x,y,z])=>[-x,y,z]);
        assert.ok(faces.has(triangleKey([reflected[0],reflected[2],reflected[1]])),
          'each triangle has an exactly mirrored counterpart with reversed winding');
        const a=new T.Vector3(...face[0]),b=new T.Vector3(...face[1]).sub(a),c=new T.Vector3(...face[2]).sub(a);
        const normal=b.cross(c),vertexNormals=new T.Vector3();
        assert.ok(normal.lengthSq()>1e-22,'no collapsed triangles remain after centre-plane clipping');
        for(let j=0;j<3;j++)vertexNormals.add(new T.Vector3().fromBufferAttribute(n,i*3+j));
        assert.ok(normal.normalize().dot(vertexNormals.normalize())>.5,
          'triangle winding agrees with its shading normals after reflection');
      }
    }
    for(const name of ['Shadow / continuous helmet shell','Shadow / curved crown plates']){
      const mesh=meshFor(helmet,name),box=mesh.geometry.boundingBox,p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
      const depthCentre=(box.min.z+box.max.z)/2,height=box.max.y-box.min.y;
      for(let i=0;i<p.count;i++){
        const fraction=(p.getY(i)-box.min.y)/height;
        if(fraction<.1||fraction>.9)continue; // Side walls, away from the crown/chin tips.
        const radial=new T.Vector3(p.getX(i),0,p.getZ(i)-depthCentre).normalize();
        assert.ok(radial.dot(new T.Vector3().fromBufferAttribute(n,i))>0,
          name+' faces outward on both front and rear panels');
      }
    }
    // Low segmented panels curve beneath the chin, so their outward normal
    // must include the vertical direction rather than a horizontal radial.
    const shellCentre=meshFor(helmet,'Shadow / continuous helmet shell').geometry.boundingBox.getCenter(new T.Vector3());
    const panels=meshFor(helmet,'Shadow / segmented helmet panels').geometry;
    for(let i=0;i<panels.attributes.position.count;i++){
      const outward=new T.Vector3().fromBufferAttribute(panels.attributes.position,i).sub(shellCentre).normalize();
      const normal=new T.Vector3().fromBufferAttribute(panels.attributes.normal,i);
      assert.ok(normal.dot(outward)>0,'segmented plates and their bevels face away from the actual skull centre');
    }
  }));

  test('Shadow helmet '+profile.id+' has the broad visor and elongated twin-strip intake',()=>withHelmet(profile,helmet=>{
    const shell=meshFor(helmet,'Shadow / continuous helmet shell').geometry.boundingBox;
    const visor=meshFor(helmet,'Shadow dark visor').geometry.boundingBox;
    const intakeMesh=meshFor(helmet,'Shadow / intake carrier'),intake=intakeMesh.geometry.boundingBox;
    const strips=meshFor(helmet,'Shadow / twin intake strips');
    const size=shell.getSize(new T.Vector3()),eyeSize=visor.getSize(new T.Vector3());
    const full=new T.Box3();for(const mesh of helmet.children){mesh.geometry.computeBoundingBox();full.union(mesh.geometry.boundingBox);}
    const eyeCentre=(visor.min.y+visor.max.y)/2;
    const crownToEye=(shell.max.y-eyeCentre)/size.y;
    assert.ok(crownToEye>.43&&crownToEye<.62,'the visor occupies the middle of the concept helmet');
    assert.ok(eyeSize.y>size.y*.22&&eyeSize.y<size.y*.34,'the broad visor has about a quarter of the helmet height');
    const widthRatio=eyeSize.x/full.getSize(new T.Vector3()).x;
    assert.ok(widthRatio>.72&&widthRatio<.92,'the visor spans most of the helmet width, including the ear modules');
    // Look through the lateral eye windows below the brow and outside the
    // respirator: an intact shell or decorative channel must not cover glass.
    const surfaces=helmet.children.map(mesh=>new T.Mesh(mesh.geometry,mesh.material));
    for(const side of [-1,1])for(const x of [.125,.1325,.14]){
      const hits=new T.Raycaster(new T.Vector3(side*x,-.025,-1),new T.Vector3(0,0,1)).intersectObjects(surfaces,false);
      assert.equal(hits[0]?.object.material.name,'Shadow dark visor',
        'the lateral visor remains visible without shell intersections at x='+side*x);
    }
    const intakeHeight=intake.max.y-intake.min.y;
    assert.ok(intakeHeight>size.y*.30&&intakeHeight<size.y*.43,'the intake extends for roughly the lower third of the helmet');
    assert.ok(intake.min.y<shell.min.y+size.y*.08&&intake.min.y>shell.min.y-size.y*.04,
      'the intake terminates at the chin');
    const middleY=(intake.min.y+intake.max.y)/2;
    assert.equal(localHits(intakeMesh,0,middleY).length,0,'the intake carrier has a real central opening');
    for(const sign of [-1,1])assert.ok(localHits(intakeMesh,sign*intake.max.x*.7,middleY).length,
      'solid intake rails surround the central opening');
    const groups=components(strips.geometry);
    assert.equal(groups.length,2,'the intake has exactly two disconnected luminous strips');
    for(const group of groups){
      const box=new T.Box3().setFromPoints(group),stripSize=box.getSize(new T.Vector3());
      assert.ok(box.max.x<0||box.min.x>0,'each strip stays on its own side of the grille');
      assert.ok(stripSize.y>stripSize.x*5&&stripSize.y>size.y*.15,'both strips run vertically along the long intake');
      assert.ok(box.min.y>=intake.min.y&&box.max.y<=intake.max.y,'the intake carrier contains both luminous strips');
    }
    const grille=meshFor(helmet,'Shadow / vent honeycomb').geometry.attributes.position;
    let centralVentVertices=0;
    for(let i=0;i<grille.count;i++)if(Math.abs(grille.getX(i))<intake.max.x*.3&&grille.getY(i)<strips.geometry.boundingBox.max.y&&
      grille.getY(i)>strips.geometry.boundingBox.min.y&&grille.getZ(i)<0)centralVentVertices++;
    assert.ok(centralVentVertices>30,'actual perforation geometry fills the grille between the two strips');
  }));

  test('Shadow helmet '+profile.id+' exposes a centred vertical rear service light',()=>withHelmet(profile,helmet=>{
    const lamp=meshFor(helmet,'Shadow / rear service light'),box=lamp.geometry.boundingBox,size=box.getSize(new T.Vector3());
    const shell=meshFor(helmet,'Shadow / continuous helmet shell');
    assert.ok(size.y>size.x*3,'the service light is vertical');
    assert.ok(Math.abs(box.min.x+box.max.x)<1e-6&&box.min.z>0,'the service light is centred at the rear');
    const y=(box.min.y+box.max.y)/2,lampHits=localHits(lamp,0,y,true),shellHits=localHits(shell,0,y,true);
    assert.ok(lampHits.length&&shellHits.length,'the rear indicator and its underlying shell are real surfaces');
    assert.ok(lampHits[0].distance<shellHits[0].distance,'the rear capsule remains visible above the shell');
  }));

  test('Shadow helmet '+profile.id+' closes the temples, lower cheeks and chin',()=>withHelmet(profile,helmet=>{
    const surfaces=helmet.children.map(mesh=>new T.Mesh(mesh.geometry,mesh.material));
    for(const side of [-1,1]){
      for(const [x,y] of [[.06,-.105],[.06,-.13],[.06,-.16],[.10,-.10],[.10,-.12],[.10,-.14],[.14,-.07],[.14,-.09],[.14,-.105]]){
        const hits=new T.Raycaster(new T.Vector3(side*x,y,-1),new T.Vector3(0,0,1)).intersectObjects(surfaces,false);
        assert.ok(hits.length&&hits[0].point.z<-.03,
          'the diagonal lower face is closed in front of the inner skull at '+[side*x,y]);
      }
      for(const z of [-.120,-.090,-.060,-.045])for(const y of [-.025,0,.015]){
        const hits=new T.Raycaster(new T.Vector3(side,y,z),new T.Vector3(-side,0,0)).intersectObjects(surfaces,false);
        assert.equal(hits[0]?.object.material.name,'Shadow dark visor',
          'the extended side window stays visible without shell or temple intrusions at '+[side,y,z]);
      }
    }
    for(const name of ['Shadow / continuous cheek armour','Shadow / diagonal jaw plates','Shadow / temple bridge']){
      assert.equal(components(meshFor(helmet,name).geometry).length,2,
        name+' consists of one continuous surface per side');
    }
    const chin=meshFor(helmet,'Shadow / sculpted chin bridge');
    assert.equal(components(chin.geometry).length,1,'the chin is connected across the centre plane');
    for(const [x,y] of [[-.015,-.195],[0,-.200],[.015,-.195]])assert.ok(localHits(chin,x,y).length,
      'the chin closes the underside of the respirator');
    const shell=meshFor(helmet,'Shadow / continuous helmet shell');
    const centre=shell.geometry.boundingBox.getCenter(new T.Vector3());
    for(const name of ['Shadow / continuous cheek armour','Shadow / diagonal jaw plates','Shadow / temple bridge','Shadow / sculpted chin bridge']){
      const {position,normal}=meshFor(helmet,name).geometry.attributes;
      for(let i=0;i<position.count;i++){
        const outward=new T.Vector3().fromBufferAttribute(position,i).sub(centre).normalize();
        assert.ok(outward.dot(new T.Vector3().fromBufferAttribute(normal,i))>0,
          name+' faces outward, including its lower bevel');
      }
    }
    const jaw=meshFor(helmet,'Shadow / diagonal jaw plates');
    const ventRay=new T.Raycaster(new T.Vector3(1,-.120,-.105),new T.Vector3(-1,0,0));
    assert.equal(ventRay.intersectObject(new T.Mesh(jaw.geometry,jaw.material)).length,0,
      'the side vent is a real opening in the diagonal plate');
    const rimRay=new T.Raycaster(new T.Vector3(1,-.110,-.065),new T.Vector3(-1,0,0));
    assert.ok(rimRay.intersectObject(new T.Mesh(jaw.geometry,jaw.material)).length,
      'solid armour surrounds the side vent');
  }));

  test('Shadow helmet '+profile.id+' follows the supplied side photo proportions',()=>withHelmet(profile,helmet=>{
    const surfaces=helmet.children.map(mesh=>new T.Mesh(mesh.geometry,mesh.material));
    const roof=[-.065,-.025,.015,.055].map(z=>{
      const hits=new T.Raycaster(new T.Vector3(0,1,z),new T.Vector3(0,-1,0)).intersectObjects(surfaces,false);
      assert.ok(hits.length,'the elongated crown is closed across its full roof at z='+z);
      return hits[0].point.y;
    });
    assert.ok(roof[1]>roof[0]+.003&&roof[2]>roof[3]+.003,
      'the broad crown has a shallow arch instead of the previous flat truncation');
    assert.ok(Math.max(...roof)-Math.min(...roof)<.020,'the crown remains low over its extended roof');
    const full=new T.Box3(),ear=new T.Box3();
    let napeBottom=Infinity;
    for(const mesh of helmet.children){
      mesh.geometry.computeBoundingBox();full.union(mesh.geometry.boundingBox);
      const p=mesh.geometry.attributes.position;
      for(let i=0;i<p.count;i++){
        if(Math.abs(p.getX(i))>.188&&p.getY(i)>-.080&&p.getY(i)<.060)
          ear.expandByPoint(new T.Vector3().fromBufferAttribute(p,i));
        if(p.getZ(i)>.040)napeBottom=Math.min(napeBottom,p.getY(i));
      }
    }
    assert.ok(!ear.isEmpty(),'the ear modules are present on the side silhouette');
    const earCentre=ear.getCenter(new T.Vector3()),rearFraction=(full.max.z-earCentre.z)/(full.max.z-full.min.z);
    assert.ok(rearFraction>.30&&rearFraction<.44,
      'the ear sits toward the compact rear of the helmet instead of the centre of a round shell');
    const visor=meshFor(helmet,'Shadow dark visor').geometry.boundingBox;
    assert.ok(visor.max.z-visor.min.z>.120,'the visor wraps back along the side of the helmet');
    assert.ok(earCentre.z-visor.max.z>.040&&earCentre.z-visor.max.z<.085,
      'the side window stops close to the front of the ear housing');
    assert.ok(Math.abs(earCentre.y-(visor.min.y+visor.max.y)/2)<.025,
      'the ear sits near the centre height of the side window');
    const headHeight=full.max.y-full.min.y,earFraction=(full.max.y-earCentre.y)/headHeight;
    assert.ok(earFraction>.45&&earFraction<.52,'the crown-to-ear proportion follows the supplied side photo');
    assert.ok(napeBottom-full.min.y>.045&&napeBottom-full.min.y<.085,
      'the nape ends distinctly higher than the chin, creating the diagonal lower silhouette');
    const jaw=meshFor(helmet,'Shadow / diagonal jaw plates').geometry.attributes.position;
    let front=Infinity,rear=Infinity;
    for(let i=0;i<jaw.count;i++){
      if(jaw.getZ(i)<-.140)front=Math.min(front,jaw.getY(i));
      if(jaw.getZ(i)>-.020)rear=Math.min(rear,jaw.getY(i));
    }
    assert.ok(front<rear-.030,'the jaw plate slopes down toward the forward respirator');
  }));
}
