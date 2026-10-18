import * as T from './vendor/three.webgpu.min.js';

// Subtract the swept lens opening from the shell and its armour plates.
// Interpolate every vertex attribute at a cut, so the opening has clean edges
// rather than deleting whole triangles and leaving jagged black intrusions.
export function cutHelmetWindow(source,contour,rearZ){
  const input=source.index?source.toNonIndexed():source;
  const names=Object.keys(input.attributes),output=Object.fromEntries(names.map(name=>[name,[]]));
  const vertex=i=>Object.fromEntries(names.map(name=>{
    const attribute=input.attributes[name];
    return [name,Array.from(attribute.array.subarray(i*attribute.itemSize,(i+1)*attribute.itemSize))];
  }));
  const interpolate=(a,b,t)=>Object.fromEntries(names.map(name=>[name,a[name].map((value,i)=>value+(b[name][i]-value)*t)]));
  const strips=[];
  for(let i=1;i<contour.length;i++){
    const a=contour[i-1],b=contour[i],width=b.x-a.x;
    const lowSlope=(b.bottom-a.bottom)/width,highSlope=(b.top-a.top)/width;
    strips.push({left:a.x,right:b.x,bottom:Math.min(a.bottom,b.bottom),top:Math.max(a.top,b.top),planes:[
      [1,0,0,-a.x],[-1,0,0,b.x],
      [-lowSlope,1,0,lowSlope*a.x-a.bottom],
      [highSlope,-1,0,a.top-highSlope*a.x],[0,0,-1,rearZ]
    ]});
  }
  function split(polygon,plane){
    const inside=[],outside=[];
    const distance=v=>plane[0]*v.position[0]+plane[1]*v.position[1]+plane[2]*v.position[2]+plane[3];
    for(let i=0;i<polygon.length;i++){
      const a=polygon[(i+polygon.length-1)%polygon.length],b=polygon[i],da=distance(a),db=distance(b);
      if((da>=0)!==(db>=0)){
        const point=interpolate(a,b,da/(da-db));inside.push(point);outside.push(point);
      }
      (db>=0?inside:outside).push(b);
    }
    return {inside,outside};
  }
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
  function emit(polygon){
    for(let i=1;i<polygon.length-1;i++){
      const face=[polygon[0],polygon[i],polygon[i+1]];
      a.fromArray(face[0].position);b.fromArray(face[1].position).sub(a);c.fromArray(face[2].position).sub(a);
      if(b.cross(c).lengthSq()<1e-22)continue;
      for(const v of face)for(const name of names)output[name].push(...v[name]);
    }
  }
  for(let i=0;i<input.attributes.position.count;i+=3){
    const triangle=[vertex(i),vertex(i+1),vertex(i+2)];
    const minX=Math.min(...triangle.map(v=>v.position[0])),maxX=Math.max(...triangle.map(v=>v.position[0]));
    const minY=Math.min(...triangle.map(v=>v.position[1])),maxY=Math.max(...triangle.map(v=>v.position[1]));
    const minZ=Math.min(...triangle.map(v=>v.position[2]));
    let fragments=[triangle];
    for(const strip of strips){
      if(minZ>rearZ||minX>=strip.right||maxX<=strip.left||minY>=strip.top||maxY<=strip.bottom)continue;
      const retained=[];
      for(const fragment of fragments){
        let remaining=fragment;
        for(const plane of strip.planes){
          const halves=split(remaining,plane);
          if(halves.outside.length>=3)retained.push(halves.outside);
          remaining=halves.inside;if(remaining.length<3)break;
        }
      }
      fragments=retained;if(!fragments.length)break;
    }
    for(const fragment of fragments)emit(fragment);
  }
  const geometry=new T.BufferGeometry();
  for(const name of names){
    const attribute=input.attributes[name];
    geometry.setAttribute(name,new T.BufferAttribute(new attribute.array.constructor(output[name]),attribute.itemSize,attribute.normalized));
  }
  geometry.normalizeNormals();if(input!==source)input.dispose();return geometry;
}
