import * as T from './vendor/three.webgpu.min.js';

const reflection=new T.Matrix4().makeScale(-1,1,1);

// A reflection reverses triangle winding as well as the X coordinates. Preserve
// the normals and texture coordinates so both plates shade correctly in motion.
export function reflectedGeometry(source){
  const geometry=source.index?source.toNonIndexed():source.clone();
  geometry.scale(-1,1,1);
  for(const attribute of Object.values(geometry.attributes)){
    const {array,itemSize}=attribute;
    for(let i=0;i<attribute.count;i+=3)for(let c=0;c<itemSize;c++){
      const a=(i+1)*itemSize+c,b=(i+2)*itemSize+c,tmp=array[a];
      array[a]=array[b];array[b]=tmp;
    }
    attribute.needsUpdate=true;
  }
  return geometry;
}

// Cut central assemblies along their actual centre plane, then reflect the
// retained half. Crossing triangles are clipped, never dropped or stretched.
export function symmetricGeometry(source){
  const input=source.index?source.toNonIndexed():source;
  const names=Object.keys(input.attributes),data=Object.fromEntries(names.map(n=>[n,[]]));
  const vertex=i=>Object.fromEntries(names.map(name=>{
    const a=input.attributes[name];return [name,Array.from(a.array.subarray(i*a.itemSize,(i+1)*a.itemSize))];
  }));
  const intersection=(a,b)=>{
    const t=a.position[0]/(a.position[0]-b.position[0]);
    const v=Object.fromEntries(names.map(name=>[name,a[name].map((n,i)=>n+(b[name][i]-n)*t)]));
    v.position[0]=0;return v;
  };
  function emit(vertices,mirror=false){
    for(const v of mirror?[vertices[0],vertices[2],vertices[1]]:vertices){
      for(const name of names){
        const values=v[name].slice();
        if(mirror&&(name==='position'||name==='normal'||name==='tangent'))values[0]*=-1;
        if(mirror&&name==='tangent'&&values.length===4)values[3]*=-1;
        data[name].push(...values);
      }
    }
  }
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
  for(let i=0;i<input.attributes.position.count;i+=3){
    const triangle=[vertex(i),vertex(i+1),vertex(i+2)],polygon=[];
    for(let j=0;j<3;j++){
      const current=triangle[j],previous=triangle[(j+2)%3];
      const inside=current.position[0]>=0,wasInside=previous.position[0]>=0;
      if(inside!==wasInside)polygon.push(intersection(previous,current));
      if(inside)polygon.push(current);
    }
    for(let j=1;j<polygon.length-1;j++){
      const face=[polygon[0],polygon[j],polygon[j+1]];
      a.fromArray(face[0].position);b.fromArray(face[1].position).sub(a);c.fromArray(face[2].position).sub(a);
      if(b.cross(c).lengthSq()<1e-22)continue;
      emit(face);
      if(face.some(v=>Math.abs(v.position[0])>1e-9))emit(face,true);
    }
  }
  const geometry=new T.BufferGeometry();
  for(const name of names){
    const attribute=input.attributes[name];
    geometry.setAttribute(name,new T.BufferAttribute(new attribute.array.constructor(data[name]),attribute.itemSize,attribute.normalized));
  }
  geometry.normalizeNormals();
  if(input!==source)input.dispose();
  return geometry;
}

// Reflect in character space, irrespective of either bone's native orientation.
// Two reflections yield a proper group rotation; its mesh is reflected once.
export function mirrorAttachmentFrame(source,target,root){
  source.updateWorldMatrix(true,false);target.parent.updateWorldMatrix(true,false);
  root.updateWorldMatrix(true,false);
  const matrix=target.parent.matrixWorld.clone().invert().multiply(root.matrixWorld)
    .multiply(reflection).multiply(root.matrixWorld.clone().invert())
    .multiply(source.matrixWorld).multiply(reflection);
  matrix.decompose(target.position,target.quaternion,target.scale);
  target.updateMatrixWorld(true);
}
