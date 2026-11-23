"""Material-batched metric PWM1 export, shared by authored scenery generators."""
import bpy,struct,gzip,pathlib
from pwm_depth_cleanup import clean, pack

def export_pwm(objects,path,materials,source,*,emissive_double_sided=False):
 path=pathlib.Path(path);OUT=path.parent;filename=path.name;META=materials
 deps=bpy.context.evaluated_depsgraph_get();prims={};bounds_min=[1e9]*3;bounds_max=[-1e9]*3
 for obj in objects:
  if obj.type not in ['MESH','FONT']:continue
  evaluated=obj.evaluated_get(deps);me=evaluated.to_mesh();me.calc_loop_triangles();ma=obj.matrix_world;normal_ma=ma.to_3x3().inverted().transposed()
  for tri in me.loop_triangles:
   mat=me.materials[tri.material_index].name if me.materials else'stone';key=mat+'|'+obj.name if META[mat]['alpha']<1 else mat;arr=prims.setdefault(key,[])
   for li in tri.loops:
    loop=me.loops[li];v=ma@me.vertices[loop.vertex_index].co;n=normal_ma@me.corner_normals[li].vector;n.normalize();p=(v.x,v.z,-v.y);nn=(n.x,n.z,-n.y);uv=tuple(me.uv_layers.active.data[li].uv)if me.uv_layers.active else (p[0],p[1]);arr.append((p,nn,uv))
    for k in range(3):bounds_min[k]=min(bounds_min[k],p[k]);bounds_max[k]=max(bounds_max[k],p[k])
  evaluated.to_mesh_clear()
 chunks=[];offset=0;descriptions=[]
 def append(data):
  nonlocal offset
  padding=(-offset)%4
  if padding:chunks.append(bytes(padding));offset+=padding
  at=offset;chunks.append(data);offset+=len(data);return at
 for key,vertices in prims.items():
  mat=key.split('|')[0]
  unique={};values=[];indices=[]
  for p,n,uv in vertices:
   key=tuple(round(x,5)for x in (*p,*n,*uv))
   if key not in unique:unique[key]=len(values);values.append((p,n,uv))
   indices.append(unique[key])
  positions=bytearray();normals=bytearray();uv0=bytearray();uv1=bytes(len(values)*4)
  for p,n,uv in values:
   positions+=struct.pack('<hhh',*[max(-32767,min(32767,round((p[k]-bounds_min[k])/max(1e-6,bounds_max[k]-bounds_min[k])*65534-32767)))for k in range(3)])
   normals+=struct.pack('<bbbb',*[max(-127,min(127,round(c*127)))for c in n],0);uv0+=struct.pack('<ff',uv[0],1-uv[1])
  desc={'material':mat,'vertices':len(values),'indices':len(indices),'index32':len(values)>65535}
  desc['position']=append(positions);desc['normal']=append(normals);desc['uv1']=append(uv1);desc['uv0']=append(uv0);desc['index']=append(struct.pack('<'+('I'if desc['index32']else'H')*len(indices),*indices));descriptions.append(desc)
 meta={'min':bounds_min,'max':bounds_max,'primitives':descriptions,'materials':META,'source':source,'units':'metres'}
 payload=bytearray(b''.join(chunks))
 cleanup=clean(meta,payload,emissive_double_sided=emissive_double_sided)
 raw=pack(meta,payload)
 (OUT/filename).write_bytes(gzip.compress(raw,compresslevel=9,mtime=0))
 return {'source':'Blender 4.3 · original editable scene','triangles':sum(p['indices']//3 for p in descriptions),'batches':len(descriptions),'vertices':sum(p['vertices']for p in descriptions),'pwmBytes':len(raw),'downloadBytes':(OUT/filename).stat().st_size,**cleanup}
