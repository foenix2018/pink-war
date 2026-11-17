"""SONDE S-19 reference-driven Blender redesign, no Pink Wars integration.

Source: real 'probe' enemy as exported from dist/enemies.js.
Reference: user-supplied SONDE S-19 specification artwork.
Coordinates are Blender Z-up after glTF import (gamefront -Z -> Blender +Y).
"""
import bpy, math, json
from mathutils import Vector
from pathlib import Path

ROOT=Path("exports/sonde-s19").resolve()
OUT=ROOT/"final"
OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/"SONDE-S19-SOURCE.glb"
if not SOURCE.exists(): raise FileNotFoundError(SOURCE)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
source_objects=list(bpy.context.scene.objects)
rigs=[o for o in source_objects if o.type=="ARMATURE"]
if not rigs: raise RuntimeError("Actual probe armature missing from glTF source")

# Add to a dedicated named collection, leaving the original skinned model intact.
col=bpy.data.collections.new("S-19 | REFERENCE V2 HARD SURFACE")
bpy.context.scene.collection.children.link(col)
studio_col=bpy.data.collections.new("STUDIO | Not exported")
bpy.context.scene.collection.children.link(studio_col)
made=[]
def put(o,where=col,export=True):
    for c in list(o.users_collection):c.objects.unlink(o)
    where.objects.link(o)
    if export: made.append(o)
    return o

def material(name,hexcolor,metallic=.0,roughness=.5,emission=0):
    c=tuple(((hexcolor>>shift)&255)/255 for shift in (16,8,0))
    m=bpy.data.materials.new(name);m.diffuse_color=(*c,1.0);m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=="BSDF_PRINCIPLED")
    p.inputs["Base Color"].default_value=(*c,1)
    p.inputs["Metallic"].default_value=metallic
    p.inputs["Roughness"].default_value=roughness
    if emission:
        p.inputs["Emission Color"].default_value=(*c,1)
        p.inputs["Emission Strength"].default_value=emission
    if name.startswith("Chipped"):
        n=m.node_tree.nodes.new("ShaderNodeTexNoise")
        n.inputs["Scale"].default_value=210
        n.inputs["Detail"].default_value=2
        bump=m.node_tree.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value=.13
        bump.inputs["Distance"].default_value=.0003
        m.node_tree.links.new(n.outputs["Fac"],bump.inputs["Height"])
        m.node_tree.links.new(bump.outputs["Normal"],p.inputs["Normal"])
    return m

graphite=material("Chipped graphite | reinforced housing",0x282A31,.78,.39)
armor=material("Chipped titanium | slate shell",0x393B44,.83,.36)
armor2=material("Weathered edge | dark titan",0x303138,.9,.33)
dark=material("Ceramic black | intake",0x0B0B12,.44,.37)
turbine=material("Brushed steel | blade",0x50515B,.88,.30)
stainless=material("Bright nickel | rivets",0x95969C,.86,.26)
red=material("NEON S-19 | red signal",0xFF0D30,.12,.23,7)
red2=material("NEON S-19 | magenta optical",0xFF2852,.05,.16,13)
lens=material("Optical core | deep ruby glass",0x59001F,.42,.07,1.1)
ink=material("Stencilled S19 | light titanium",0xE4DEE2,.18,.76)
cable_mat=material("Black rubber | hydraulic loom",0x121218,.03,.78)

# Original probe is graphite/blue. The poster requires scarlet warning/optical channels.
original_materials=[]
for mat in list(bpy.data.materials):
    if mat in {graphite,armor,armor2,dark,turbine,stainless,red,red2,lens,ink,cable_mat}: continue
    if not mat.use_nodes: continue
    # Stock enemy uses cyan unlit shader for optics; explicitly replace the full node
    # graph so that all emitted/reflected cyan becomes scarlet, not merely the base tint.
    if mat.name in {"Material_4", "ORDRE independent optics"}:
        mat.node_tree.nodes.clear()
        out=mat.node_tree.nodes.new("ShaderNodeOutputMaterial")
        p=mat.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
        p.inputs["Base Color"].default_value=(.96,.012,.057,1)
        p.inputs["Emission Color"].default_value=(1.0,.008,.046,1)
        p.inputs["Emission Strength"].default_value=4.5
        p.inputs["Metallic"].default_value=.18
        p.inputs["Roughness"].default_value=.2
        mat.node_tree.links.new(p.outputs["BSDF"],out.inputs["Surface"])
        mat.name="SOURCE CYAN CORRECTED / S-19 RED WARNING"
        original_materials.append(mat.name)
        continue
    p=next((n for n in mat.node_tree.nodes if n.type=="BSDF_PRINCIPLED"),None)
    if p is None:continue
    c=p.inputs["Base Color"].default_value
    if c[2]>c[0]*1.20 and c[2]>c[1]*1.02 and c[2]>.2:
        p.inputs["Base Color"].default_value=(.95,.026,.14,1)
        p.inputs["Emission Color"].default_value=(1,.025,.11,1)
        p.inputs["Emission Strength"].default_value=4
        mat.name="RECOLORED | original S-19 cyan -> danger red"
    else:
        p.inputs["Metallic"].default_value=max(p.inputs["Metallic"].default_value,.46)
        p.inputs["Roughness"].default_value=min(.65,max(.25,p.inputs["Roughness"].default_value))
    original_materials.append(mat.name)

def cube(name,loc,size,mat,bevel=.008,rot=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object;o.name=name;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.rotation_euler=rot;o.data.materials.append(mat)
    if bevel:
        m=o.modifiers.new("CNC chamfer 2-pass","BEVEL");m.width=bevel;m.segments=2
        m.affect="EDGES"
        o.modifiers.new("Weighted surface normals","WEIGHTED_NORMAL")
    return put(o)

def sphere(name,loc,radii,mat,segments=20,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1,location=loc)
    o=bpy.context.object;o.name=name;o.scale=radii;o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    return put(o)

def torus(name,loc,rad,tube,mat,segments=56):
    bpy.ops.mesh.primitive_torus_add(major_segments=segments,minor_segments=8,location=loc,rotation=(0,0,0),
                                     major_radius=rad,minor_radius=tube)
    o=bpy.context.object;o.name=name;o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    return put(o)

def rod(name,a,b,r,mat,vertices=12):
    d=Vector(b)-Vector(a);middle=(Vector(a)+Vector(b))*.5
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=d.length,location=middle)
    o=bpy.context.object;o.name=name;o.rotation_euler=d.to_track_quat("Z","Y").to_euler();o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    return put(o)

def shell(name,points,mat,depth=.014,bevel=.004):
    mesh=bpy.data.meshes.new(name+" geometry")
    mesh.from_pydata(points,[],[list(range(len(points)))])
    mesh.update()
    o=bpy.data.objects.new(name,mesh);col.objects.link(o);made.append(o)
    o.data.materials.append(mat)
    s=o.modifiers.new("Machined shell thickness","SOLIDIFY");s.thickness=depth;s.offset=0
    if bevel:
        b=o.modifiers.new("Safety bevel","BEVEL");b.width=bevel;b.segments=2
    o.modifiers.new("Vertex normals","WEIGHTED_NORMAL")
    return o

def curve(name,pts,r,mat):
    data=bpy.data.curves.new(name,"CURVE");data.dimensions="3D"
    data.bevel_depth=r;data.bevel_resolution=2
    s=data.splines.new("POLY");s.points.add(len(pts)-1)
    for p,point in zip(s.points,pts):p.co=(*point,1)
    o=bpy.data.objects.new(name,data);col.objects.link(o);made.append(o)
    o.data.materials.append(mat)
    return o

def arc(name,center,r,start,end,height,mat,thick=.007):
    x,y=center
    pts=[(x+math.cos(start+(end-start)*i/48)*r,
          y+math.sin(start+(end-start)*i/48)*r,height) for i in range(49)]
    return curve(name,pts,thick,mat)

def marking(text,name,loc,size,mat,rotation=(0,0,0)):
    data=bpy.data.curves.new(name,"FONT");data.body=text;data.size=size
    data.extrude=.0007;data.align_x="CENTER"
    o=bpy.data.objects.new(name,data);col.objects.link(o);made.append(o)
    o.location=loc;o.rotation_euler=rotation;o.data.materials.append(mat)
    return o

# Hull: original skinned châssis kept, with fitted angular panels layered on top.
shell("S-19 / outer roof pentagon",
 [(-.27,-.36,.951),(.16,-.43,.956),(.33,-.12,.938),(.28,.23,.892),(.09,.39,.872),(-.24,.34,.897),(-.34,.02,.93)],armor,.026)
for sign in [-1,1]:
    shell("S-19 / angular dorsal cheek %s"%sign,
      [(sign*.19,-.34,.865),(sign*.32,-.18,.84),(sign*.362,.16,.738),
       (sign*.306,.312,.715),(sign*.23,.02,.858)],armor2,.017)
    # External titanium scutes over the original hull — exposed seams and rivets.
    shell("S19 / shoulder facet %s"%sign,
      [(sign*.185,-.27,.967),(sign*.255,-.20,.959),(sign*.263,-.045,.941),
       (sign*.152,.025,.953),(sign*.119,-.15,.969)],armor2,.015,.003)
    for k in range(3):
      cube("S19 / diagonal machined plate %s %s"%(sign,k),
        (sign*(.13+k*.037),-.26+k*.085,.974-k*.007),
        (.045,.066,.012),graphite,.004,(0,0,sign*.17))
    shell("S-19 / fore-quarter armor %s"%sign,
      [(sign*.20,.39,.80),(sign*.37,.31,.744),(sign*.383,.365,.592),
       (sign*.27,.51,.60),(sign*.12,.51,.75)],graphite,.020)
    cube("Upper shoulder louvre", (sign*.288,.075,.865),(.092,.23,.018),dark,.005,(0,0,sign*-.17))
    for k in range(3):
      cube("Cooling fin %s %s"%(sign,k),(sign*(.294+k*.018),-.077+k*.08,.876),(.012,.050,.013),stainless,.003)
    for fronty in [-.235,.205]:
      sphere("Hull blind-rivet", (sign*.29,fronty,.862),(.012,.012,.007),stainless,12,8)
    for z in [.666,.729]:
      rod("Armoured side light trench",(sign*.375,-.17,z),(sign*.369,.23,z-.03),.006,red)

# Black armor collar and front optical aperture, oriented along +Y.
sphere("Recessed mechanical iris gimbal",(0,.54,.575),(.23,.14,.23),dark,28,14)
for idx,(y,rad,tube,mat) in enumerate([
    (.592,.222,.033,armor2),(.624,.197,.015,stainless),
    (.642,.178,.026,graphite),(.661,.146,.008,red),
    (.673,.115,.017,dark),(.684,.090,.008,red2),
    (.693,.066,.014,armor2)]):
    # Torus default plane XY => rotate into XZ, facing the front (+Y).
    o=torus("IRIS / optical concentric ring %02d"%idx,(0,y,.57),rad,tube,mat)
    o.rotation_euler=(math.pi/2,0,0)
sphere("IRIS / ruby sensor lens",(0,.707,.57),(.069,.016,.069),lens,36,16)
sphere("IRIS / hot central pupil",(0,.728,.57),(.027,.013,.027),red2,24,12)
# Angular aperture leaves and radial tracking marks.
for k in range(10):
    ang=math.tau*k/10
    x,z=math.cos(ang),math.sin(ang)
    rod("IRIS / detector aperture radial %02d"%k,
        (x*.103,.696,.57+z*.103),(x*.141,.692,.57+z*.141),.003,stainless,8)
for k in range(8):
    angle=math.tau*k/8
    sphere("IRIS / collar screw",(.214*math.cos(angle),.636,.57+.214*math.sin(angle)),
           (.010,.005,.010),stainless,12,8)
# Side auxiliary searchlight, chin and downward target designator.
for sign in [-1,1]:
    boxx=sign*.27
    cube("Forward ranging module",(boxx,.456,.495),(.105,.089,.074),armor2,.016)
    sphere("Ranging illuminator",(boxx,.506,.498),(.023,.011,.023),red,16,10)
cube("Gimbal suspension yoke",(0,.36,.355),(.28,.23,.06),armor2,.018)
rod("Underbelly lens mount",(0,.25,.45),(0,.25,.26),.047,dark)
sphere("Underslung sensor armored head",(0,.26,.267),(.094,.092,.085),armor)
torus("Underslung scarlet optical ring",(0,.26,.196),.059,.012,red,40)
sphere("Underslung red designation pupil",(0,.26,.184),(.037,.036,.014),red2,20,12)

# Turbine system: four oversized armoured duct housings, static armored rings,
# real exposed 4-blade rotors and individual stabilizer bosses.
rotor_centers=[]
for sx in [-1,1]:
  for sy in [-1,1]:
    center=(sx*.61,sy*.42,.49)
    rotor_centers.append(center)
    x,y,z=center
    tag=("L" if sx<0 else "R")+("F" if sy>0 else "B")
    # Refit the original load-bearing X arms with sandwich braces and conduits.
    rod(tag+" / main spar",(sx*.245,sy*.16,.69),(sx*.55,sy*.36,.55),.050,armor,16)
    rod(tag+" / carbon tie",(sx*.265,sy*.21,.50),(sx*.59,sy*.40,.49),.020,dark,12)
    rod(tag+" / polished shock rod",(sx*.36,sy*.20,.52),(sx*.55,sy*.32,.51),.011,stainless,12)
    curve(tag+" / power line",[(sx*.25,sy*.12,.58),(sx*.38,sy*.24,.54),(sx*.54,sy*.32,.51),(sx*.61,sy*.42,.47)],.008,cable_mat)
    curve(tag+" / warning cable",[(sx*.26,sy*.12,.64),(sx*.41,sy*.26,.63),(sx*.56,sy*.39,.52)],.004,red)
    cube(tag+" / motor armour pod",(x,y,.451),(.105,.105,.035),armor2,.025)
    # Outer duct and nested intake, keeping the original fan bones in the real imported rig.
    torus(tag+" / primary metal annulus",(x,y,z),.246,.044,armor)
    torus(tag+" / double-layer chamfer",(x,y,z+.021),.231,.018,armor2)
    torus(tag+" / intake bevel lip",(x,y,z+.043),.204,.009,stainless)
    torus(tag+" / lower structural lip",(x,y,z-.038),.224,.017,graphite)
    torus(tag+" / mechanical hub housing",(x,y,z+.026),.062,.024,armor2)
    sphere(tag+" / central hub",(x,y,z+.032),(.044,.044,.025),stainless,24,12)
    # Four turbine vanes, scimitar shaped (existing 3-blade fan remains below).
    for k in range(4):
        theta=k*math.pi/2 + (0 if sx*sy>0 else .19)
        co,si=math.cos(theta),math.sin(theta)
        def xf(u,v):
            return (x+u*co-v*si,y+u*si+v*co,z+.051)
        shell(tag+" / curved rotor blade "+str(k),
            [xf(.051,-.020),xf(.166,-.043),xf(.183,.011),
             xf(.138,.035),xf(.055,.024)],turbine,.007,.002)
    # Red chase lights on perimeter, with gaps like the supplied artwork.
    for j in range(4):
        start=math.pi*j/2+.16
        arc(tag+" / red turbine channel "+str(j),(x,y),.248,start,start+.65,z+.011,red,.008)
    for j in range(12):
        a=math.tau*j/12
        px,py=x+math.cos(a)*.236,y+math.sin(a)*.236
        sphere(tag+" / rim titanium fastener",(px,py,z+.038),(.008,.008,.004),stainless,10,6)
    for j in range(5):
        a=j*math.tau/5
        cube(tag+" / armour petal",(x+math.cos(a)*.254,y+math.sin(a)*.254,z+.011),
             (.092,.063,.042),armor,.011,(0,0,a+.12))
    # Inspectable stabilizer linked to rotor support.
    rod(tag+" / pitch regulator",(sx*.42,sy*.27,.60),
        (sx*.56,sy*.40,.58),.012,stainless)
    sphere(tag+" / pitch regulator pin",(sx*.56,sy*.40,.58),(.025,.025,.025),dark)

# Top sensor mast and topographic stencils on armour, as in dossier.
rod("Rear tactical radio",(.062,-.16,.88),(.062,-.17,1.19),.009,stainless,10)
sphere("Rear radio status",(.062,-.17,1.19),(.013,.013,.013),red)
rod("Secondary aerial",(-.11,-.22,.88),(-.15,-.26,1.08),.006,graphite,10)
marking("S-19","S-19 | top number",(-.105,.10,.973),.133,ink,(0,0,math.pi))
marking("ORDRE","ORDRE | manufactured identifier",(.072,-.17,.972),.058,ink,(0,0,math.pi))
marking("PW / EN-019","PW reference code",(0,-.33,.969),.034,red,(0,0,math.pi))
# Incised armored vent slots and directional red beacons.
for k in range(5):
    cube("Hull overhead vent",( -.25+k*.10,-.32,.901),(.059,.009,.011),dark,.003)
for sign in [-1,1]:
    cube("Front armor slit",(sign*.237,.488,.69),(.11,.013,.016),red,.003)
    for k in range(2):
        rod("Servomechanism undercarriage",(sign*.18,-.15,.35),
            (sign*.23,-.20+k*.07,.48),.009,stainless)

# Export all curves and font objects as meshes to preserve the actual geometry in GLB.
for obj in list(made):
    if obj.type not in {"CURVE","FONT"}:continue
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.object.convert(target="MESH")

scene=bpy.context.scene
scene["PINK_WARS_REFERENCE"]="SONDE S-19.PNG provided by user, source rig from Pink Wars / enemies.js"
scene["PINK_WARS_CHARACTER"]="S-19 / SONDE - quadrotor inspection and interception drone"
scene["PINK_WARS_WORKFLOW"]="STANDALONE, game unchanged; source model kept editable"
scene["PINK_WARS_FEATURES"]="4 original independent fan bones, optics gimbal, armored duct rims, PBR graphite, red iris, designation module"

# Studio set and camera for clean exterior product shots. Do not include in GLB.
def area(name,location,color,power,size):
    ld=bpy.data.lights.new(name,"AREA");ld.energy=power;ld.color=color;ld.shape="DISK";ld.size=size
    ob=bpy.data.objects.new(name,ld);studio_col.objects.link(ob);ob.location=location
    ob.rotation_euler=(Vector((0,0,.58))-ob.location).to_track_quat("-Z","Y").to_euler()
def camera(name,location,scale):
    d=bpy.data.cameras.new(name);ob=bpy.data.objects.new(name,d);studio_col.objects.link(ob)
    ob.location=location;ob.rotation_euler=(Vector((0,0,.59))-ob.location).to_track_quat("-Z","Y").to_euler()
    d.type="ORTHO";d.ortho_scale=scale;return ob
area("Overhead strip softbox",(-2,1,4),(.95,.93,1),430,3)
area("Red side bounce",(2,-2,1.5),(1,.18,.35),310,2.7)
area("Front rim",-Vector((1,3,-2)),(.65,.8,1),200,2.5)
cam_front=camera("S19 Front 3-quarter", (2.45,3.55,1.75),2.48)
camera("S19 Top identification",(.1,.18,5),3.0)
camera("S19 Rear 3-quarter",(-3,-2.4,2.2),3.25)
scene.camera=cam_front
scene.world=bpy.data.worlds.new("S19 Nocturne")
scene.world.use_nodes=True
scene.world.node_tree.nodes.get("Background").inputs["Color"].default_value=(.012,.014,.024,1)
scene.world.node_tree.nodes.get("Background").inputs["Strength"].default_value=.33
scene.render.resolution_x=1200;scene.render.resolution_y=950
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.engine="CYCLES"
scene.cycles.samples=20
scene.render.film_transparent=False
scene.view_settings.view_transform="AgX"

blend=OUT/"SONDE-S19-REFERENCE-V2.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(blend),check_existing=False,compress=True)

# glTF export only artwork; avoid accidentally exporting the studio lights/cameras.
bpy.ops.object.select_all(action="DESELECT")
art=list(source_objects)+list(made)
for ob in art:
    if ob.name in bpy.data.objects and ob.type in {"MESH","EMPTY","ARMATURE"}:ob.select_set(True)
bpy.context.view_layer.objects.active=rigs[0]
glb=OUT/"SONDE-S19-REFERENCE-V2.glb"
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",
    use_selection=True,export_animations=True,export_skins=True,export_normals=True,
    export_yup=True,export_lights=False,export_cameras=False)
if not glb.exists() or glb.stat().st_size < 50000:
    raise RuntimeError("Blender failed to export a valid S19 GLB")
with glb.open("rb") as f:
    if f.read(4)!=b"glTF":raise RuntimeError("glTF binary header invalid")

report={"source":str(SOURCE),"reference":"SONDE S-19.PNG","sources":[o.name for o in source_objects],
        "rigs":[{"name":r.name,"bones":[b.name for b in r.data.bones]} for r in rigs],
        "enhanced_objects":len(made),"original_materials":original_materials,
        "blender_bytes":blend.stat().st_size,"glb_bytes":glb.stat().st_size,
        "features":["4 ducted turbines","4 rotor bones retained","multilayer ruby iris",
         "lower laser/sensor gimbal","red hazard strips","graphite armored shell",
         "actuator braces and cables","ORDRE/S19 stencils","damage detail PBR"]}
(OUT/"S19-VALIDATION.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
print("READY: SONDE S19 V2 "+json.dumps({"blend":str(blend),"glb":str(glb),"bytes":glb.stat().st_size,"objects":len(made)}),flush=True)
