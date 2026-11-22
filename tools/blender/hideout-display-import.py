"""Append the captured canonical game equipment to the editable refuge .blend.
Run after hideout.py and tools/build-hideout-showcase.mjs. Runtime uses separate
room / catalogue batches; this file keeps the downloadable Blender scene whole.
"""
import bpy, pathlib, json, gzip, struct, base64, tempfile, hashlib, shutil
import numpy as np

ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'dist/assets/hideout';SOURCE=ROOT/'assets/hideout/PinkWars_Planque.blend'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
old=bpy.data.collections.get('Équipement officiel Pink Wars')
if old:
 for obj in list(old.objects):bpy.data.objects.remove(obj,do_unlink=True)
 bpy.data.collections.remove(old)
 bpy.data.orphans_purge(do_local_ids=True,do_linked_ids=True,do_recursive=True)
collection=bpy.data.collections.new('Équipement officiel Pink Wars');bpy.context.scene.collection.children.link(collection)
data=gzip.decompress((OUT/'showcase.pwm.gz').read_bytes());size=struct.unpack_from('<I',data,4)[0];meta=json.loads(data[8:8+size]);offset=8+size
native=json.loads((OUT/'showcase-materials.json').read_text());images={i['uuid']:i for i in native['images']};textures={t['uuid']:t for t in native['textures']}
minv=np.array(meta['min']);span=np.array(meta['max'])-minv;temporary=tempfile.TemporaryDirectory(prefix='pink-wars-source-');cache={}

def image_for(texture_uuid,color=False):
 texture=textures[texture_uuid];im=images[texture['image']];url=im['url'];key=(im['uuid'],color)
 if key in cache:return cache[key]
 if isinstance(url,str)and url.startswith('data:'):
  raw=base64.b64decode(url.split(',',1)[1]);path=pathlib.Path(temporary.name)/(hashlib.sha256(raw).hexdigest()+'.png');path.write_bytes(raw)
 elif isinstance(url,str):path=ROOT/'dist'/url.removeprefix('./')
 else:raise RuntimeError('Image du catalogue non convertie : '+im['uuid'])
 image=bpy.data.images.load(str(path),check_existing=False);image.name='Catalogue / '+path.name;image.colorspace_settings.name='sRGB'if color else'Non-Color';image.pack();cache[key]=image;return image

def linear_hex(value):
 rgb=[((value>>shift)&255)/255 for shift in [16,8,0]]
 return tuple(v/12.92 if v<=.04045 else((v+.055)/1.055)**2.4 for v in rgb)

materials={}
for description in native['materials']:
 mat=bpy.data.materials.new('Équipement / '+description['name']);mat.use_nodes=True;nodes=mat.node_tree.nodes;links=mat.node_tree.links;p=nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=description.get('roughness',.4);p.inputs['Metallic'].default_value=description.get('metalness',0)
 color=nodes.new('ShaderNodeVertexColor');color.layer_name='Couleurs originales'
 links.new(color.outputs['Color'],p.inputs['Base Color'])
 alpha=description.get('opacity',1);p.inputs['Alpha'].default_value=alpha
 if description.get('transparent')or description.get('alphaTest',0)>0:mat.surface_render_method='DITHERED'
 texnodes={}
 for kind in ['map','normalMap','roughnessMap','metalnessMap','aoMap','alphaMap','emissiveMap']:
  if kind not in description:continue
  definition=textures[description[kind]];tex=nodes.new('ShaderNodeTexImage');tex.image=image_for(description[kind],color=kind in ['map','emissiveMap']);texnodes[kind]=tex
  uv=nodes.new('ShaderNodeUVMap');uv.uv_map='Lightmap'if definition.get('channel')==1 else'UVMap';mapping=nodes.new('ShaderNodeMapping');repeat=definition.get('repeat',[1,1]);origin=definition.get('offset',[0,0]);flipped=not definition.get('flipY',True)
  mapping.inputs['Scale'].default_value=(repeat[0],-repeat[1]if flipped else repeat[1],1);mapping.inputs['Location'].default_value=(origin[0],1-origin[1]if flipped else origin[1],0);mapping.inputs['Rotation'].default_value[2]=definition.get('rotation',0);links.new(uv.outputs['UV'],mapping.inputs['Vector']);links.new(mapping.outputs['Vector'],tex.inputs['Vector'])
 if 'map'in texnodes:
  multiply=nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1;links.new(color.outputs['Color'],multiply.inputs[1]);links.new(texnodes['map'].outputs['Color'],multiply.inputs[2]);links.new(multiply.outputs[0],p.inputs['Base Color'])
  if description.get('alphaTest',0)>0 or description.get('transparent'):links.new(texnodes['map'].outputs['Alpha'],p.inputs['Alpha'])
 if 'normalMap'in texnodes:
  normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=max(description.get('normalScale',[1,1]));links.new(texnodes['normalMap'].outputs['Color'],normal.inputs['Color']);links.new(normal.outputs[0],p.inputs['Normal'])
 for kind,channel,input_name in [('roughnessMap','Green','Roughness'),('metalnessMap','Blue','Metallic')]:
  if kind not in texnodes:continue
  separate=nodes.new('ShaderNodeSeparateColor');links.new(texnodes[kind].outputs['Color'],separate.inputs[0]);multiply=nodes.new('ShaderNodeMath');multiply.operation='MULTIPLY';multiply.inputs[1].default_value=description.get('roughness'if kind=='roughnessMap'else'metalness',1);links.new(separate.outputs[channel],multiply.inputs[0]);links.new(multiply.outputs[0],p.inputs[input_name])
 if description['type']=='MeshBasicMaterial':
  emission=nodes.new('ShaderNodeEmission');links.new(p.inputs['Base Color'].links[0].from_socket,emission.inputs[0]);surface=emission.outputs[0]
  if description.get('transparent')or description.get('alphaTest',0)>0:
   mix=nodes.new('ShaderNodeMixShader');transparent=nodes.new('ShaderNodeBsdfTransparent');links.new(transparent.outputs[0],mix.inputs[1]);links.new(surface,mix.inputs[2]);mix.inputs[0].default_value=alpha
   if 'map'in texnodes:
    multiply=nodes.new('ShaderNodeMath');multiply.operation='MULTIPLY';multiply.inputs[1].default_value=alpha;links.new(texnodes['map'].outputs['Alpha'],multiply.inputs[0]);links.new(multiply.outputs[0],mix.inputs[0])
   surface=mix.outputs[0]
  links.new(surface,nodes.get('Material Output').inputs['Surface'])
 else:
  emissive=linear_hex(description.get('emissive',0));p.inputs['Emission Color'].default_value=(*emissive,1);p.inputs['Emission Strength'].default_value=description.get('emissiveIntensity',1)
  if 'emissiveMap'in texnodes:links.new(texnodes['emissiveMap'].outputs['Color'],p.inputs['Emission Color'])
 materials[description['uuid']]=mat

def read(dtype,at,count):return np.frombuffer(data,dtype=dtype,count=count,offset=offset+at)
for i,part in enumerate(meta['primitives']):
 n=part['vertices'];p=(read('<i2',part['position'],n*3).reshape(-1,3).astype(np.float32)+32767)/65534*span+minv;p=p[:,[0,2,1]];p[:,1]*=-1
 indices=read('<u4'if part['index32']else'<u2',part['index'],part['indices']).reshape(-1,3)
 mesh=bpy.data.meshes.new('Modèle natif / '+str(i));mesh.from_pydata(p.tolist(),[],indices.tolist());mesh.update()
 normals=read('i1',part['normal'],n*4).reshape(-1,4)[:,:3].astype(np.float32)/127;normals=normals[:,[0,2,1]];normals[:,1]*=-1
 mesh.polygons.foreach_set('use_smooth',[True]*len(mesh.polygons));mesh.normals_split_custom_set_from_vertices(normals.tolist())
 loops=np.array([loop.vertex_index for loop in mesh.loops]);uv=read('<f4',part['uv0'],n*2).reshape(-1,2).copy();uv[:,1]=1-uv[:,1]
 mesh.uv_layers.new(name='UVMap').data.foreach_set('uv',uv[loops].ravel())
 uv1=read('<u2',part['uv1'],n*2).reshape(-1,2).astype(np.float32)/65535;mesh.uv_layers.new(name='Lightmap').data.foreach_set('uv',uv1[loops].ravel())
 rgb=read('<f4',part['color'],n*3).reshape(-1,3);rgba=np.ones((n,4),dtype=np.float32);rgba[:,:3]=rgb;mesh.color_attributes.new(name='Couleurs originales',type='FLOAT_COLOR',domain='POINT').data.foreach_set('color',rgba.ravel())
 obj=bpy.data.objects.new('Équipement et compagnons officiels / '+str(i),mesh);collection.objects.link(obj);mesh.materials.append(materials[part['material']]);obj['provenance']='createWeaponModels / installPinkWarsSoldier / createCompanionModel';obj['triangles']=part['indices']//3
bpy.context.scene['equipment_catalogue']=json.dumps(native['catalogue'],ensure_ascii=False)
# Keep the optional Blender window preview in sync with the latest city render.
panorama_mat=bpy.data.materials.get('Panorama Vesper')
if panorama_mat:
 for node in panorama_mat.node_tree.nodes:
  if node.type=='TEX_IMAGE':node.image=bpy.data.images.load(str(OUT/'panorama.jpg'),check_existing=False);node.image.pack()
bpy.ops.file.pack_all();bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE),compress=True);shutil.copyfile(SOURCE,OUT/'PinkWars_Planque.blend')
print(json.dumps({'canonicalObjects':len(collection.objects),'canonicalTriangles':native['triangles'],'companions':len(native['catalogue']['companions']),'weapons':len(native['catalogue']['weapons']),'outfits':len(native['catalogue']['outfits'])}))
temporary.cleanup()
