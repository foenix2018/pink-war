"""Blender derivatives of the deployed CC0 Kenney blasters.
Keep grips, magazines and their transforms. Bevel the actual chassis, fit
machined cooling jackets to its surfaces, and add concentric emitter sleeves.
Original GLBs are never overwritten. No downloads are needed.
blender --background --python tools/build-blaster-mk3.py
"""
import bpy, math, pathlib, json
from mathutils import Vector
from mathutils.bvhtree import BVHTree
P=pathlib.Path(__file__).resolve().parents[1]
out=P/'dist/assets/pink-war';out.mkdir(parents=True,exist_ok=True)
report=[]
def mat(name,color,metal,rough,glow=0):
 m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True
 n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough
 if glow:n.inputs['Emission Color'].default_value=(*color,1);n.inputs['Emission Strength'].default_value=glow
 return m
def mesh(name,verts,faces,material):
 g=bpy.data.meshes.new(name);g.from_pydata(verts,[],faces);g.materials.append(material);o=bpy.data.objects.new(name,g);bpy.context.collection.objects.link(o);return o
def panel(name,material,pos,w,h,depth,side):
 # Octagonal frontal contour is made in the Y/Z plane; X is panel thickness.
 k=min(w,h)*.22;outline=[(-w/2+k,-h/2),(w/2-k,-h/2),(w/2,-h/2+k),(w/2,h/2-k),(w/2-k,h/2),(-w/2+k,h/2),(-w/2,h/2-k),(-w/2,-h/2+k)]
 verts=[(xx,y,z) for xx in [-depth/2,depth/2] for y,z in outline];faces=[tuple(reversed(range(8))),tuple(range(8,16))]+[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)]
 o=mesh(name,verts,faces,material);o.location=pos
 b=o.modifiers.new('machined corners','BEVEL');b.width=.0014;b.segments=2;o.modifiers.new('weighted normals','WEIGHTED_NORMAL');return o
def annulus(name,material,cx,cy,cz,r,thickness,depth):
 n=24;vs=[]
 for yy in [cy-depth/2,cy+depth/2]:
  for rr in [r,r-thickness]:
   vs.extend((cx+math.cos(i*math.tau/n)*rr,yy,cz+math.sin(i*math.tau/n)*rr) for i in range(n))
 faces=[]
 for i in range(n):
  j=(i+1)%n
  faces.extend([(i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),(i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)])
 o=mesh(name,vs,faces,material)
 for f in o.data.polygons:f.use_smooth=True
 return o
for index,letter in enumerate(['b','g','d','f','p']):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 bpy.ops.import_scene.gltf(filepath=str(P/f'dist/assets/kenney/blaster-{letter}.glb'))
 base=[o for o in bpy.context.scene.objects if o.type=='MESH'];bpy.context.view_layer.update()
 verts=[];faces=[]
 for o in base:
  offset=len(verts);verts.extend(o.matrix_world@v.co for v in o.data.vertices)
  faces.extend(tuple(offset+i for i in f.vertices) for f in o.data.polygons)
  mod=o.modifiers.new('MKIII genuine chassis edge radius','BEVEL');mod.width=.0025;mod.segments=2;mod.limit_method='ANGLE';mod.angle_limit=.45;mod.harden_normals=True
  o.modifiers.new('MKIII surface normals','WEIGHTED_NORMAL')
 tree=BVHTree.FromPolygons(verts,faces)
 lo=Vector(tuple(min(v[k] for v in verts) for k in range(3)));hi=Vector(tuple(max(v[k] for v in verts) for k in range(3)))
 alloy=mat('PW_MK3_alloy',(.20,.26,.30),.88,.30);ceramic=mat('PW_MK3_ceramic',(.43,.48,.49),.48,.46);black=mat('PW_MK3_recess',(.025,.040,.047),.55,.52);energy=mat('PW_MK3_energy',(.19,.65,.73),.45,.27,1.2)
 # +Y is the original GLB's forward direction after Blender's Y-up conversion.
 front=hi.y;tip=[v for v in verts if v.y>front-.018]
 cx=(min(v.x for v in tip)+max(v.x for v in tip))/2;cz=(min(v.z for v in tip)+max(v.z for v in tip))/2
 radius=max(.010,max(abs(v.x-cx) for v in tip));radius=min(.085,radius)
 annulus('MKIII concentric recessed emitter',alloy,cx,front-.010,cz,radius+.0035,.004,.027)
 annulus('MKIII energy lens rim',energy,cx,front+.001,cz,radius-.0015,.0017,.003)
 annulus('MKIII dark emitter aperture',black,cx,front+.0005,cz,radius-.004,.002,.004)
 # Cast onto the imported surface: every side panel has a real substrate.
 anchors=[]
 span=hi.y-lo.y
 for side in [-1,1]:
  for t in ([.39,.58] if index>0 else [.53]):
   yy=lo.y+span*t;zz=hi.z-(hi.z-lo.z)*(.19 if index!=3 else .34)
   hit,normal,face,d=tree.ray_cast(Vector((side*(max(abs(lo.x),abs(hi.x))+.2),yy,zz)),Vector((-side,0,0)),.5)
   if hit is None:continue
   depth=.006;at=hit+Vector((side*depth*.2,0,0));width=min(.14,span*.20);height=min(.050,(hi.z-lo.z)*.18)
   panel('MKIII fitted chamfered heat jacket',ceramic,at,width,height,depth,side);anchors.append(list(hit))
   for k in range(3):
    # Slim inset louvers sit on the jacket, never on top of the grip.
    panel('MKIII recessed exhaust',black,at+Vector((side*.0038,(k-1)*width*.22,0)),width*.10,height*.65,.0015,side)
 # Apply the machining once and merge by material: six bounded render batches.
 bpy.ops.object.select_all(action='DESELECT')
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH':o.select_set(True);bpy.context.view_layer.objects.active=o
 bpy.ops.object.convert(target='MESH')
 bpy.ops.object.join()
 bpy.context.active_object.name='Pink War MKIII / '+['R9','BLOOM','LANCE','THORN','NOVA'][index]
 bpy.context.scene.render.engine='BLENDER_EEVEE_NEXT'
 file=out/f'blaster-{letter}-mk3.glb'
 bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',export_apply=True,export_cameras=False,export_lights=False)
 triangles=0
 deps=bpy.context.evaluated_depsgraph_get()
 for o in bpy.context.scene.objects:
  if o.type!='MESH':continue
  obj=o.evaluated_get(deps);g=obj.to_mesh();g.calc_loop_triangles();triangles+=len(g.loop_triangles);obj.to_mesh_clear()
 report.append(dict(id=['r9','bloom','lance','thorn','nova'][index],file=file.name,triangles=triangles,source='Kenney Blaster Kit 2.1 / CC0',revision='3.40',fittedPanels=len(anchors),anchors=anchors))
 print('MK3',json.dumps(report[-1]),flush=True)
(out/'models.json').write_text(json.dumps(report,indent=2)+'\n')
