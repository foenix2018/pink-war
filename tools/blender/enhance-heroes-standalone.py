"""Preserve original Pink Wars GHJU/LYLU rig and geometry; refine PBR in Blender.
Standalone exports only; never modifies the game.
Usage: blender -b --python tools/blender/enhance-heroes-standalone.py
"""
import bpy, json, re, math
from pathlib import Path
from mathutils import Vector

ROOT=Path('exports/heroes').resolve()
FINAL=ROOT/'final'
FINAL.mkdir(parents=True,exist_ok=True)

def input_socket(node,*names):
    for key in names:
        if key in node.inputs:return node.inputs[key]
    return None

def improve(mat, hero):
    if not mat.use_nodes:return None
    p=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
    if not p:return None
    base=input_socket(p,'Base Color')
    rgb=base.default_value[:3] if base else (.2,.2,.2)
    name=mat.name.lower()
    saturation=max(rgb)-min(rgb)
    if 'visor' in name or 'glass' in name or 'visière' in name:role='visor'
    elif any(x in name for x in ['fabric','cloth','cape','suit','tissu']):role='fabric'
    elif any(x in name for x in ['glow','light','led','néon','liseré']):role='light'
    elif max(rgb)<.10:role='dark'
    elif saturation>.25:role='accent'
    elif min(rgb)>.35:role='steel'
    else:role='graphite'
    presets={
     'visor':(.32,.09,.90,.05),'fabric':(.01,.83,.02,.33),
     'light':(.02,.37,.12,.22),'dark':(.31,.51,.18,.25),
     'accent':(.42,.26,.56,.15),'steel':(.78,.29,.46,.17),
     'graphite':(.67,.35,.35,.23)}
    met,rough,coat,coatrough=presets[role]
    for names,val in [
     (('Metallic',),met),(('Roughness',),rough),
     (('Coat Weight','Clearcoat'),coat),
     (('Coat Roughness','Clearcoat Roughness'),coatrough),
     (('Sheen Weight','Sheen'),.24 if role=='fabric' else 0)]:
        s=input_socket(p,*names)
        if s is not None:s.default_value=val
    if role=='visor':
        s=input_socket(p,'IOR')
        if s is not None:s.default_value=1.47
    if role in {'graphite','dark','steel'}:
        nodes=mat.node_tree.nodes
        tex=nodes.new('ShaderNodeTexNoise');tex.name='PW | Fine machined grain'
        tex.inputs['Scale'].default_value=230.0
        tex.inputs['Detail'].default_value=2.
        bump=nodes.new('ShaderNodeBump');bump.name='PW | Micro-normal'
        bump.inputs['Strength'].default_value=.065
        bump.inputs['Distance'].default_value=.00018
        mat.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height'])
        normal=input_socket(p,'Normal')
        if normal is not None and not normal.is_linked:
            mat.node_tree.links.new(bump.outputs['Normal'],normal)
    mat['pink_wars_role']=role;mat['pink_wars_character']=hero
    return role

def polish_geometry(objects):
    stats={'meshes':0,'vertices':0,'triangles':0,'skinned':0,'bevels':0}
    for o in objects:
        if o.type!='MESH':continue
        stats['meshes']+=1
        stats['vertices']+=len(o.data.vertices)
        stats['triangles']+=sum(max(0,len(p.vertices)-2) for p in o.data.polygons)
        if o.vertex_groups or any(m.type=='ARMATURE' for m in o.modifiers):
            stats['skinned']+=1
            continue
        name=o.name.lower()
        if any(x in name for x in ['visor','cape','cloth','glass','fabric','led','light','liseré']):continue
        if 12<len(o.data.polygons)<18000 and any(x in name for x in ['armor','armour','shadow','helmet','casque','plate']):
            bevel=o.modifiers.new('PW | Beveled armor edge','BEVEL')
            bevel.width=.0009;bevel.segments=2;bevel.limit_method='ANGLE'
            bevel.angle_limit=math.radians(32)
            o.modifiers.new('PW | Weighted normals','WEIGHTED_NORMAL')
            stats['bevels']+=1
    return stats

def studio(hero):
    camera_data=bpy.data.cameras.new('Studio camera')
    cam=bpy.data.objects.new('PW Preview camera',camera_data)
    bpy.context.collection.objects.link(cam)
    cam.location=(3.35,-5.7,2.55)
    look=Vector((0,0,1.0))-cam.location
    cam.rotation_euler=look.to_track_quat('-Z','Y').to_euler()
    camera_data.type='ORTHO';camera_data.ortho_scale=3.4
    bpy.context.scene.camera=cam
    for label,xyz,color,energy,size in [
     ('Key',(-3,-4,5.2),(1.,.92,.96),750,3.4),
     ('Fill',(3.5,1.5,3.0),(.60,.73,1.),500,3),
     ('Rim',(-2,3.3,3.8), (1.,.35,.60) if hero=='GHJU' else (.26,.64,1.),650,2.0)]:
        data=bpy.data.lights.new('PW '+label,'AREA')
        data.energy=energy;data.color=color;data.shape='DISK';data.size=size
        obj=bpy.data.objects.new('PW '+label,data)
        bpy.context.collection.objects.link(obj)
        obj.location=xyz
        obj.rotation_euler=(Vector((0,0,1.0))-obj.location).to_track_quat('-Z','Y').to_euler()
    scene=bpy.context.scene
    scene.render.resolution_x=900;scene.render.resolution_y=1080
    scene.render.resolution_percentage=100
    scene.render.film_transparent=False
    try:scene.render.engine='BLENDER_EEVEE_NEXT'
    except Exception:scene.render.engine='BLENDER_EEVEE'
    scene.world=bpy.data.worlds.new('PW Midnight')
    scene.world.color=(.055,.07,.10)
    return scene

def snapshot(objects):
    bbox=[]
    for o in objects:
        if o.type=='MESH':
            bbox.extend([o.matrix_world@Vector(corner) for corner in o.bound_box])
    if not bbox:return None
    return {'min':[float(min(v[i] for v in bbox)) for i in range(3)],
            'max':[float(max(v[i] for v in bbox)) for i in range(3)]}

def one(hero):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source=ROOT/(hero+'-SOURCE.glb')
    if not source.is_file():raise FileNotFoundError(str(source))
    bpy.ops.import_scene.gltf(filepath=str(source))
    objects=[o for o in bpy.context.scene.objects if o.type in {'MESH','EMPTY','ARMATURE'}]
    rigs=[o for o in objects if o.type=='ARMATURE']
    if not rigs:raise RuntimeError('No rig in source '+hero)
    bpy.context.view_layer.update()
    before=snapshot(objects)
    roles={}
    for m in bpy.data.materials:
        role=improve(m,hero)
        if role:roles[role]=roles.get(role,0)+1
    mesh=polish_geometry(objects)
    scene=studio(hero)
    scene['PINK_WARS_CHARACTER']=hero
    scene['PINK_WARS_SOURCE']='foenix2018/pink-war / Shadow VII'
    scene['PINK_WARS_WORKFLOW']='standalone Blender refinements, never deployed to game'
    blend=FINAL/(hero+'-ENHANCED.blend')
    glb=FINAL/(hero+'-ENHANCED.glb')
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=rigs[0]
    bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',
         use_selection=True,export_animations=True,export_skins=True,
         export_normals=True,export_yup=True,export_lights=False,export_cameras=False)
    if not glb.exists() or glb.stat().st_size<1024:raise RuntimeError('GLB failed '+hero)
    # Keep studio scene in the .blend; headless EGL preview rendering is handled separately.
    return {'hero':hero,'source_bytes':source.stat().st_size,'output_bytes':glb.stat().st_size,
       'rigs':len(rigs),'bones':sum(len(o.data.bones) for o in rigs),
       'actions':[a.name for a in bpy.data.actions],
       'bounds':before,'materials':roles,'geometry':mesh}

def main():
    results=[one(hero) for hero in ['GHJU','LYLU']]
    (FINAL/'enhancement-report.json').write_text(json.dumps(results,indent=2,ensure_ascii=False))
    print('EXPORTS COMPLETE '+str(FINAL))
if __name__=='__main__':main()