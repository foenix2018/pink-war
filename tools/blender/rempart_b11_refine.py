"""Pink Wars / REMPART B-11 — non-destructive Blender refinement.
Run: blender -b --python tools/blender/rempart_b11_refine.py -- /path/to/PINK_WARS_REMPART_B11_GEOMETRIE_ORIGINALE.glb
Works on the original exported geometry. Does not reconstruct or replace the game's 41-bone rig.
"""
import bpy, sys, os, math
from mathutils import Vector

args=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
if not args: raise SystemExit("Provide the source GLB path after --")
source=os.path.abspath(args[0])
if not os.path.isfile(source): raise SystemExit("Missing source GLB: "+source)
outdir=os.path.dirname(source)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not meshes: raise RuntimeError("No original mesh objects imported")
# Preserve every native mesh and source-bone group. Avoid remeshing/skinning.
for obj in meshes:
    obj.select_set(False)
    name=obj.name.lower()
    is_signal=any(s in name for s in ('_red_','_eye_','_decal_'))
    # A conservative, non-destructive bevel improves highlights on the source geometry.
    if not is_signal and len(obj.data.polygons)>6:
        bevel=obj.modifiers.new("R11 | machined edge highlights","BEVEL")
        bevel.width=0.0025 if '_metal_' in name else 0.004
        bevel.segments=2
        bevel.limit_method='ANGLE'
        bevel.angle_limit=math.radians(36)
        bevel.loop_slide=True
        normal=obj.modifiers.new("R11 | weighted face normals","WEIGHTED_NORMAL")
        normal.keep_sharp=True
    for mat in obj.data.materials:
        if not mat: continue
        mat.use_nodes=True
        principled=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
        if not principled: continue
        if is_signal:
            principled.inputs['Roughness'].default_value=.24
            continue
        principled.inputs['Metallic'].default_value=.72 if '_plate_' in name else .85
        principled.inputs['Roughness'].default_value=.62 if '_plate_' in name else .42
        # Procedural micro-roughness: no UV or texture file dependency.
        nodes=mat.node_tree.nodes;links=mat.node_tree.links
        noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=165
        noise.inputs['Detail'].default_value=2.0
        ramp=nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].position=.22
        ramp.color_ramp.elements[0].color=(.36,.36,.36,1)
        ramp.color_ramp.elements[1].position=.80
        ramp.color_ramp.elements[1].color=(.75,.75,.75,1)
        links.new(noise.outputs['Fac'],ramp.inputs['Fac'])
        links.new(ramp.outputs['Color'],principled.inputs['Roughness'])
# Set up a studio scene; keep the native model untouched in its own coordinates.
world=bpy.context.scene.world or bpy.data.worlds.new("R11 studio")
bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.025,.035,.055,1)
world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.55
def area(name,loc,power,size,color):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=loc
    direction=Vector((0,1.1,0))-ob.location;ob.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
area("R11 softbox key",(3,-4,5),850,4,(.78,.88,1))
area("R11 red rim",(-3,2,4),1100,3,(1,.16,.20))
area("R11 fill",(1,4,2),500,3,(.65,.76,1))
cam_data=bpy.data.cameras.new("R11 three quarter")
cam=bpy.data.objects.new("R11 three quarter",cam_data);bpy.context.collection.objects.link(cam)
cam.location=(3.7,-5.2,2.8);target=Vector((0,1.15,0))
cam.rotation_euler=(target-Vector(cam.location)).to_track_quat('-Z','Y').to_euler()
cam_data.type='ORTHO';cam_data.ortho_scale=3.4;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48
scene.render.resolution_x=1100;scene.render.resolution_y=1400;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
blend=os.path.join(outdir,"PINK_WARS_REMPART_B11_SOURCE_REFINED.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend)
scene.render.filepath=os.path.join(outdir,"PINK_WARS_REMPART_B11_RENDER.png")
bpy.ops.render.render(write_still=True)
print("Saved",blend,"from",len(meshes),"original mesh objects")
