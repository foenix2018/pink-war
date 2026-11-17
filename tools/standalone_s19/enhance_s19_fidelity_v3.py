"""SONDE S-19 V3: silhouette-first hard-surface reconstruction.
Actual Pink Wars S-19 glTF is imported unchanged as a hidden, inspectable reference.
New full drone is engineered around the source footprint and user-provided S-19 poster,
not created from a flat image; output Blender + GLB + rigged fan animation.
No changes to Pink Wars game files.
"""
import bpy, math, json
from mathutils import Vector
from pathlib import Path

ROOT=Path('exports/sonde-s19').resolve()
SRC=ROOT/'SONDE-S19-SOURCE.glb'
OUT=ROOT/'v3-fidelity'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SRC))

source_objects=list(bpy.context.scene.objects)
source_rigs=[o for o in source_objects if o.type=='ARMATURE']
if not source_rigs:raise RuntimeError('Source S19 rig not imported')
src_col=bpy.data.collections.new('00 | ORIGINAL GAME SOURCE - hidden reference')
bpy.context.scene.collection.children.link(src_col)
for o in source_objects:
    for c in list(o.users_collection):c.objects.unlink(o)
    src_col.objects.link(o)
    o.hide_render=True
    if o.type=='MESH':o.hide_set(True)

design=bpy.data.collections.new('01 | S19 V3 EXACT-SILHOUETTE REDESIGN')
bpy.context.scene.collection.children.link(design)
studio=bpy.data.collections.new('02 | STUDIO - excluded from GLB')
bpy.context.scene.collection.children.link(studio)
objects=[]
def link(o,collection=design,track=True):
    for coll in list(o.users_collection):coll.objects.unlink(o)
    collection.objects.link(o)
    if track:objects.append(o)
    return o

def mat(name,col,met=.0,rough=.5,glow=0,scratches=False):
    c=tuple(((col>>s)&255)/255 for s in (16,8,0))
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*c,1)
    p.inputs['Metallic'].default_value=met
    p.inputs['Roughness'].default_value=rough
    p.inputs['Coat Weight'].default_value=.22 if met>.4 else .04
    if glow:
        p.inputs['Emission Color'].default_value=(*c,1)
        p.inputs['Emission Strength'].default_value=glow
    if scratches:
        n=m.node_tree.nodes.new('ShaderNodeTexNoise')
        n.inputs['Scale'].default_value=165
        n.inputs['Detail'].default_value=3.5
        b=m.node_tree.nodes.new('ShaderNodeBump')
        b.inputs['Strength'].default_value=.16
        b.inputs['Distance'].default_value=.0005
        m.node_tree.links.new(n.outputs['Fac'],b.inputs['Height'])
        m.node_tree.links.new(b.outputs['Normal'],p.inputs['Normal'])
    return m

base=mat('S19 | main cast graphite',0x22232A,.88,.39,scratches=True)
plate=mat('S19 | dark weathered gunmetal plates',0x323139,.86,.43,scratches=True)
edge=mat('S19 | chipped titanium bevels',0x55505C,.91,.34,scratches=True)
inset=mat('S19 | carbon black vents',0x101016,.4,.52)
motor=mat('S19 | alloy servo steel',0x57565F,.90,.33)
blade=mat('S19 | black scimitar turbine blades',0x17171E,.86,.23)
disc=mat('S19 | high-speed black turbine ceramic disc',0x080810,.84,.17)
hot=mat('S19 | red external tracking LEDs',0xFF1239,.09,.16,11)
deep=mat('S19 | warm crimson iris',0xEC003D,.18,.12,7)
core=mat('S19 | core emissive ruby',0xFF2454,.06,.13,6.5)
rubber=mat('S19 | ribbed flexible cable',0x131118,.05,.73)
mark=mat('S19 | bone-grey stencilled fleet ID',0xAEA4AB,.44,.64)
dark_red=mat('S19 | black glass optical lens',0x380512,.42,.13,.9)

def mesh(name,coords,faces,material,bevel=0):
    data=bpy.data.meshes.new(name+' mesh')
    data.from_pydata(coords,[],faces);data.update()
    ob=bpy.data.objects.new(name,data);link(ob)
    ob.data.materials.append(material)
    if bevel:
        b=ob.modifiers.new('CNC machined bevel','BEVEL')
        b.width=bevel;b.segments=2;b.limit_method='ANGLE';b.angle_limit=.5
        wn=ob.modifiers.new('Custom normals','WEIGHTED_NORMAL')
    return ob

def xyz_cube(name,at,dims,m,bevel=.003,rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=at)
    ob=bpy.context.object;ob.name=name;ob.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if rot:ob.rotation_euler=rot
    ob.data.materials.append(m)
    if bevel:
        mod=ob.modifiers.new('Machined radius','BEVEL');mod.width=bevel;mod.segments=2
        ob.modifiers.new('Corner normals','WEIGHTED_NORMAL')
    return link(ob)

def uv_sphere(name,at,radii,m,sides=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=sides,ring_count=12,location=at)
    ob=bpy.context.object;ob.name=name;ob.scale=radii;ob.data.materials.append(m)
    for f in ob.data.polygons:f.use_smooth=True
    return link(ob)

def cylinder(name,at,r,depth,m,sides=16,rot=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides,radius=r,depth=depth,location=at)
    ob=bpy.context.object;ob.name=name;ob.data.materials.append(m)
    if rot:ob.rotation_euler=rot
    for f in ob.data.polygons:f.use_smooth=(sides>16)
    return link(ob)

def beam(name,p1,p2,r,m,sides=12):
    a,b=Vector(p1),Vector(p2);d=b-a
    ob=cylinder(name,(a+b)*.5,r,d.length,m,sides)
    ob.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    return ob

def tubing(name,points,r,m):
    cr=bpy.data.curves.new(name,'CURVE');cr.dimensions='3D'
    cr.resolution_u=8;cr.bevel_depth=r;cr.bevel_resolution=2
    spl=cr.splines.new('BEZIER');spl.bezier_points.add(len(points)-1)
    for b,p in zip(spl.bezier_points,points):
        b.co=p;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
    ob=bpy.data.objects.new(name,cr);link(ob)
    ob.data.materials.append(m);return ob

def prismatic(name,top,lowz,m,bevel=.006):
    n=len(top);verts=list(top)+[(x,y,lowz) for x,y,z in top]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,verts,faces,m,bevel)

def quad_strip(name,pts,m,width=.006):
    # Chain of thin red line segments, visible from above.
    return tubing(name,pts,width,m)

def raised_text(label,name,at,size,m,rot=(0,0,0)):
    cu=bpy.data.curves.new(name,'FONT');cu.body=label;cu.size=size
    cu.align_x='CENTER';cu.align_y='CENTER'
    cu.extrude=.00065;cu.bevel_depth=.0003
    ob=bpy.data.objects.new(name,cu);link(ob)
    ob.location=at;ob.rotation_euler=rot;ob.data.materials.append(m)
    return ob

def ring_mesh(name,cx,cy,ro,ri,top,bottom,m,segments=48):
    # Very important: structural duct with straight vertical walls, NOT torus tubing.
    # Eight-section machined radial profile, 48 angular sectors.
    outline=[(ro-.015,top+.005),(ro,top-.017),(ro,bottom+.025),
             (ro-.018,bottom),(ri+.015,bottom),(ri,bottom+.018),
             (ri,top-.018),(ri+.018,top+.005)]
    vert=[(cx+math.cos(2*math.pi*j/segments)*r,
           cy+math.sin(2*math.pi*j/segments)*r,z)
          for j in range(segments) for r,z in outline]
    faces=[]
    for j in range(segments):
        k=(j+1)%segments
        for p in range(8):
            faces.append((j*8+p,k*8+p,k*8+(p+1)%8,j*8+(p+1)%8))
    ob=mesh(name,vert,faces,m)
    return ob

def fan_plate(name,cx,cy,r1,r2,start,stop,low,top,m):
    # Cladding is built as a separate curved annular segment with chamfer.
    n=5;v=[]
    for z in [top,low]:
        for r in [r2,r1]:
            for k in range(n+1):
                a=start+(stop-start)*k/n
                v.append((cx+math.cos(a)*r,cy+math.sin(a)*r,z))
    length=n+1;faces=[]
    for k in range(n):
        faces.extend([
         (k,k+1,length+k+1,length+k),
         (2*length+k,3*length+k,3*length+k+1,2*length+k+1),
         (length+k,length+k+1,3*length+k+1,3*length+k),
         (k,2*length+k,2*length+k+1,k+1)
        ])
    faces.extend([(0,length,3*length,2*length),
                  (n,2*length+n,3*length+n,length+n)])
    return mesh(name,v,faces,m,.003)

def arc(name,cx,cy,r,z,a1,a2,m,thick=.005):
    pts=[(cx+r*math.cos(a1+(a2-a1)*i/20),
          cy+r*math.sin(a1+(a2-a1)*i/20),z)
         for i in range(21)]
    return tubing(name,pts,thick,m)

# --------------------------------------------------------------------
# Compact angular exoskeleton — custom machined wedge, with nose lower than spine.
# Six cross-sections: no spherical shell, no broad floating roof lid.
cross=[
 (-.485,.205,.37,.765),
 (-.355,.285,.375,.855),
 (-.195,.355,.38,.905),
 ( .120,.365,.36,.897),
 ( .342,.338,.35,.830),
 ( .565,.235,.375,.760)]
verts=[]
for y,w,zlo,zhi in cross:
  verts.extend([
    (-w*.72,y,zhi),(-w,y,zhi-.064),
    (-w,y,zlo+.080),(-w*.74,y,zlo),
    (w*.74,y,zlo),(w,y,zlo+.080),
    (w,y,zhi-.064),(w*.72,y,zhi)])
faces=[tuple(range(7,-1,-1))]
for section in range(len(cross)-1):
  a,b=section*8,(section+1)*8
  for k in range(8):faces.append((a+k,a+(k+1)%8,b+(k+1)%8,b+k))
faces.append(tuple(range((len(cross)-1)*8,len(cross)*8)))
mesh('S19 | NEW compact hexagonal airborne fuselage',verts,faces,base,.011)
# segmented top armor, dramatic low battered silhouette
prismatic('FRONTAL CANOPY / gothic V composite',
 [(-.30,.13,.929),(-.185,.42,.844),(0,.492,.82),(.19,.42,.845),(.305,.13,.928)],
 .798,plate,.004)
for sign in (-1,1):
    prismatic('S19 | staggered dorsal half '+str(sign),
       [(sign*.035,-.375,.882),(sign*.19,-.374,.893),
        (sign*.31,-.24,.929),(sign*.32,.078,.93),
        (sign*.185,.23,.908),(sign*.036,.16,.918)],.861,edge if sign==1 else plate,.005)
    prismatic('S19 | angular side baffle '+str(sign),
       [(sign*.331,-.310,.85),(sign*.396,-.22,.76),
        (sign*.389,.18,.737),(sign*.321,.41,.790)],
       .665,plate,.005)
    prismatic('S19 | nose cheek '+str(sign),
       [(sign*.17,.35,.843),(sign*.304,.395,.793),
        (sign*.287,.527,.725),(sign*.13,.548,.765)],.695,plate,.004)
    for y in (-.25,-.07,.15,.35):
        uv_sphere('hull hammered titanium rivet',(sign*.343,y,.885-.04*abs(y)),(.008,.008,.007),motor,12)
    for k in range(3):
        xyz_cube('roof panel seam '+str(sign),
                 (sign*(.15+k*.049),-.28+k*.12,.930-k*.004),
                 (.011,.057,.007),inset,.002,(0,0,sign*.10))
    # straight sensor vent bars at the face, left and right of optical iris
    xyz_cube('red front hazard slit '+str(sign),
       (sign*.280,.511,.702),(.102,.015,.023),hot,.003)
    xyz_cube('indented bumper wedge '+str(sign),
       (sign*.313,.521,.670),(.123,.060,.042),base,.005,(0,0,sign*.12))
    for k in range(3):
        xyz_cube('servo louvre '+str(sign),
                 (sign*.383,-.18+k*.10,.723),(.012,.045,.036),
                 inset,.002)

# actual stencils lie on the dorsal plates, not above them on a floating cube
raised_text('S-19','TOP / S-19 original designation',
            (-.132,-.080,.949),.141,mark,(0,0,math.pi*.5))
raised_text('O R D R E','TOP / surveillance authority',
            (.200,-.061,.951),.047,mark,(0,0,math.pi*.5))
# stylized triangular military authority emblem
tri=[(.165,.227,.943),(.284,.227,.943),(.225,.109,.943)]
mesh('ORDRE / front signal triangle',tri,[(0,1,2)],mark)
tri2=[(.202,.190,.947),(.247,.190,.947),(.225,.153,.947)]
mesh('ORDRE / central negative triangle',tri2,[(0,1,2)],base)
raised_text('019','Serial no 019 rear',(.018,-.36,.917),.049,mark)
# gimbal and camera, front oriented +Y
cylinder('IRIS 01 / armoured gimbal collar',(0,.525,.55),.250,.095,plate,12,
         (math.pi/2,0,0))
cylinder('IRIS 02 / graphite outer cutout',(0,.579,.55),.220,.042,inset,12,
         (math.pi/2,0,0))
cylinder('IRIS 03 / titanium rotating retention',(0,.610,.55),.188,.021,edge,16,
         (math.pi/2,0,0))
cylinder('IRIS 04 / deep black optical diaphragm',(0,.632,.55),.156,.017,dark_red,24,
         (math.pi/2,0,0))
cylinder('IRIS 05 / glowing ruby tracking annulus',(0,.646,.55),.126,.006,hot,32,
         (math.pi/2,0,0))
cylinder('IRIS 06 / central carbon isolation',(0,.654,.55),.106,.009,inset,36,
         (math.pi/2,0,0))
cylinder('IRIS 07 / ruby emission eye',(0,.665,.55),.070,.018,deep,32,
         (math.pi/2,0,0))
uv_sphere('IRIS 08 / photonic central pupil',(0,.681,.55),(.027,.015,.027),core,32)
for i in range(12):
    theta=i*math.tau/12
    x=.203*math.cos(theta);z=.55+.203*math.sin(theta)
    uv_sphere('IRIS 09 / eye perimeter fastener',(x,.632,z),
        (.008,.004,.008),motor,12)
for i in range(8):
    a=i*math.tau/8
    beam('IRIS 10 / radial scanning leaf',
         (.084*math.cos(a),.671,.55+.084*math.sin(a)),
         (.116*math.cos(a),.663,.55+.116*math.sin(a)),
         .004,edge,8)
# armoured underslung fore-camera/gun and surface cabling
xyz_cube('Undercarriage armored bridge',(0,.16,.35),(.34,.40,.055),base,.01)
beam('Underslung optic linkage',(0,.41,.42),(0,.49,.23),.047,motor,14)
uv_sphere('Bottom sensor armored turret',(0,.480,.247),(.097,.107,.074),plate,20)
cylinder('Bottom sensor red emitter',(0,.547,.247),.044,.015,hot,20,
         (math.pi/2,0,0))
uv_sphere('Bottom sensor central targeting pixel',(0,.561,.247),(.017,.012,.017),core,16)
for sign in (-1,1):
    beam('Shock-damped lower sling',(sign*.15,-.13,.35),
         (sign*.22,.12,.405),.021,motor)
    tubing('Lower primary electrical harness',
           [(sign*.13,.38,.37),(sign*.27,.27,.39),(sign*.28,.04,.40),
            (sign*.33,-.11,.46)],.010,rubber)

# Active stabilizers visible below rear corners and radio mast
for s in (-1,1):
    beam('Rear ventral fin arm',(s*.24,-.27,.38),(s*.41,-.42,.20),.024,base)
    prismatic('Rear delta stabilizer '+str(s),
        [(s*.32,-.40,.47),(s*.46,-.51,.385),
         (s*.44,-.48,.26),(s*.34,-.38,.30)],.24,plate,.004)
    quad_strip('Rear fin red light',
        [(s*.438,-.48,.355),(s*.416,-.457,.316)],
        hot,.006)
beam('Retractable rear radio antenna',(.05,-.245,.90),
     (.056,-.286,1.105),.010,motor)
uv_sphere('Radio emitting status cap',(.056,-.286,1.11),
          (.014,.014,.017),hot,12)

# --------------------------------------------------------------------
# QUAD ROTORS: thick angular plate-clad duct, large exposed swept blades.
# These are physically sized relative to the central fuselage in the original art.
rotors=[]
blade_parts={}
for sx in (-1,1):
 for sy in (-1,1):
    cx,cy=sx*.775,sy*.555
    tag=('LEFT' if sx<0 else 'RIGHT')+'_'+('FRONT' if sy>0 else 'REAR')
    rotors.append({'tag':tag,'cx':cx,'cy':cy,'sx':sx,'sy':sy})
    center=(cx,cy,.595)
    # Highly detailed load-bearing X arm; main steel spar plus multiple pistons.
    body=(sx*.284,sy*.226,.650)
    joint=(sx*.496,sy*.398,.623)
    link_end=(sx*.645,sy*.485,.592)
    beam(tag+' ARM / structural tube',body,joint,.063,base,14)
    beam(tag+' ARM / outer connector',joint,link_end,.047,plate,14)
    beam(tag+' ARM / upper braces',(sx*.286,sy*.232,.733),
         (sx*.662,sy*.505,.657),.021,motor)
    beam(tag+' ARM / undercarriage braces',
         (sx*.286,sy*.224,.521),(sx*.655,sy*.501,.53),.025,inset)
    xyz_cube(tag+' ARM / polygonal elbow joint',joint,(.133,.126,.098),edge,.011)
    cylinder(tag+' ARM / elbow pin',(joint[0],joint[1],.692),
        .042,.030,motor,12)
    for z in (.585,.657):
        tubing(tag+' ARM / covered flex loom',
              [(sx*.28,sy*.20,z),
               (sx*.407,sy*.315,z-.026),
               (sx*.53,sy*.427,z-.035),
               (sx*.66,sy*.500,z-.015)],.012,rubber)
    tubing(tag+' ARM / red fiber conductor',
           [(sx*.285,sy*.239,.658),
            (sx*.43,sy*.340,.659),(sx*.62,sy*.485,.615)],
            .005,hot)
    # The duct itself is 0.71 m wide, deep and faceted: not a torus.
    ring_mesh(tag+' / deep faceted armored fan casing',
              cx,cy,.354,.263,.672,.493,base,48)
    ring_mesh(tag+' / machined lower inner sleeve',
              cx,cy,.272,.260,.606,.529,motor,48)
    cylinder(tag+' / enclosed high speed dark rotor disc',(cx,cy,.571),.257,.011,disc,64)
    # 16 separately segmented top ring armour tiles, alternate slightly proud.
    for k in range(16):
        a1=2*math.pi*k/16+.014
        a2=2*math.pi*(k+1)/16-.014
        fan_plate(tag+' / 16 HARD SURFACE ARMOR SCUTE '+str(k),
                  cx,cy,.274,.368,a1,a2,.665,.688 if k%2 else .675,
                  plate if k%3 else edge)
        a=(a1+a2)/2
        uv_sphere(tag+' / exposed rivet '+str(k),
                  (cx+.327*math.cos(a),cy+.327*math.sin(a),.696),
                  (.008,.008,.006),motor,10)
        # dark thin gaps and shadow breaks at each perimeter plate junction
        if k%4==0:
            arc(tag+' / scarlet lower bezel '+str(k),
                cx,cy,.360,.537,a1+.015,a2-.015,hot,.012)
        elif k%4==1:
            arc(tag+' / narrow red status rim '+str(k),
                cx,cy,.354,.540,a1+.045,a2-.045,deep,.006)
    # Realistic optical warning strip in the inner upper rim (reference: red curved diode).
    for q in range(8):
        ang=q*math.tau/8+.035
        arc(tag+' / INNER RUBY STATUS CHANNEL '+str(q),
            cx,cy,.265,.694,ang,ang+.44,hot,.0035)
    # Side breathing slits, beyond the armoured radial facade
    for k in range(8):
        a=2*math.pi*(k+.3)/8
        x,y=cx+.354*math.cos(a),cy+.354*math.sin(a)
        xyz_cube(tag+' / side vent armor',(x,y,.602),
                 (.025,.031,.066),inset,.003,rot=(0,0,a))
    # Four smooth black scimitar blades on a gimballed hub.
    blade_parts[tag]=[]
    for k in range(5):
        angle=k*math.tau/5
        def point(r,t,z):
            theta=angle+t
            return (cx+r*math.cos(theta),cy+r*math.sin(theta),z)
        p=[
            point(.045,-.18,.603),
            point(.125,-.24,.608),
            point(.252,-.21,.600),
            point(.258,.00,.585),
            point(.182,.20,.582),
            point(.078,.15,.598)
        ]
        ob=prismatic(tag+' / swept 5-BLADE TURBINE '+str(k),p,.577,blade,.003)
        blade_parts[tag].append(ob)
        uv_sphere(tag+' / blade mounting pin',
                  point(.072,0,.616),(.009,.009,.006),motor,10)
    uv_sphere(tag+' / concentric turbine core',(cx,cy,.619),
              (.067,.067,.031),inset,24)
    cylinder(tag+' / polished hub lock',(cx,cy,.642),.034,.026,
             motor,18)
    cylinder(tag+' / turbine hub warning rune',(cx,cy,.658),
             .018,.006,inset,18)

# Modular independent rotor bones and glTF-compatible active spin action.
arm_data=bpy.data.armatures.new('S19 V3 | Rig data')
arm=bpy.data.objects.new('S19 V3 | Mechanical control armature',arm_data)
link(arm)
bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True);bpy.context.view_layer.objects.active=arm
bpy.ops.object.mode_set(mode='EDIT')
main=arm.data.edit_bones.new('Body / retained surveillance form')
main.head=(0,0,.35);main.tail=(0,0,.73)
for r in rotors:
    eb=arm.data.edit_bones.new('FAN_'+r['tag'])
    eb.head=(r['cx'],r['cy'],.570)
    eb.tail=(r['cx'],r['cy'],.702)
    eb.parent=main
optic=arm.data.edit_bones.new('IRIS_STABILIZER')
optic.head=(0,.58,.54);optic.tail=(0,.72,.54)
optic.parent=main
bpy.ops.object.mode_set(mode='OBJECT')
# Bake exact world transform of each blade before connecting its pivot to an
# independent armature bone; avoids the detached/inside-out model regressions.
for r in rotors:
    bone_name='FAN_'+r['tag']
    for ob in blade_parts[r['tag']]:
        bpy.context.view_layer.update()
        saved=ob.matrix_world.copy()
        ob.parent=arm;ob.parent_type='BONE';ob.parent_bone=bone_name
        ob.matrix_world=saved
# 20-frame cyclic spin clip, pairwise counter-rotation, playable in glTF viewers.
arm.animation_data_create()
for name in [r['tag'] for r in rotors]:
    pb=arm.pose.bones['FAN_'+name]
    pb.rotation_mode='XYZ'
    direction=1 if ('LEFT' in name)==('FRONT' in name) else -1
    pb.rotation_euler[1]=0
    pb.keyframe_insert(data_path='rotation_euler',frame=1,group='ROTOR_'+name)
    pb.rotation_euler[1]=direction*math.tau
    pb.keyframe_insert(data_path='rotation_euler',frame=21,group='ROTOR_'+name)
if arm.animation_data.action:
    arm.animation_data.action.name='S19 V3 | Quad fan stabilization 24fps'
    for fc in arm.animation_data.action.fcurves:
        for key in fc.keyframe_points:key.interpolation='LINEAR'
    arm.animation_data.action.use_fake_user=True
scene=bpy.context.scene
scene.frame_start=1;scene.frame_end=21;scene.render.fps=24
scene.frame_set(1)
# Fine non-geometrical details, keep dynamic geometry separate from the hull.
for ob in objects:
    if ob.type in {'FONT','CURVE'}:
        bpy.ops.object.select_all(action='DESELECT')
        ob.select_set(True);bpy.context.view_layer.objects.active=ob
        bpy.ops.object.convert(target='MESH')
# Preserve original skeleton for future binding; only redesign objects go to GLB.
scene['RECONSTRUCTION']='S19 V3 / FULL SILHOUETTE REDESIGN against user reference image'
scene['SOURCE']='Original Pink Wars probe rig imported and preserved, hidden by default'
scene['FINAL']='Independent drone with four articulated turbines, red optics, 16-section armored ducts'
scene['RELEASE']='Stand-alone only; not integrated to game'

# Orthographic camera carefully matched to poster 3/4 front overhead viewpoint.
def area_light(name,at,color,watts,sz):
    d=bpy.data.lights.new(name,'AREA')
    d.energy=watts;d.color=color;d.size=sz;d.shape='DISK'
    ob=bpy.data.objects.new(name,d);link(ob,studio,False)
    ob.location=at;ob.rotation_euler=(Vector((0,0,.59))-ob.location).to_track_quat('-Z','Y').to_euler()
def camera(name,at,scale):
    d=bpy.data.cameras.new(name);d.type='ORTHO';d.ortho_scale=scale
    ob=bpy.data.objects.new(name,d);link(ob,studio,False)
    ob.location=at;ob.rotation_euler=(Vector((0,0,.59))-ob.location).to_track_quat('-Z','Y').to_euler()
    return ob
area_light('Cool grey top strip',(-3,1.2,4.0),(.86,.88,1),345,4.0)
area_light('Scarlet low fill',(3,-2.3,1.8),(1,.23,.35),70,2.8)
area_light('Rim silver back',(-1.4,-3,3.5),(.84,.84,1),245,3.0)
camera_front=camera('S19 / HERO THREE QUARTER',(-2.6,3.25,2.0),2.8)
camera('S19 / FRONT', (0,3.7,1.17),2.65)
camera('S19 / TOP',(.1,-.02,5),2.62)
camera('S19 / BACK THREE QUARTER',(2.5,-3,2.1),2.85)
scene.camera=camera_front
scene.world=bpy.data.worlds.new('Storm factory / empty background')
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.014,.012,.023,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.6
scene.render.engine='CYCLES'
scene.cycles.samples=30
scene.render.resolution_x=1200;scene.render.resolution_y=950
scene.render.resolution_percentage=100
scene.render.film_transparent=False
scene.view_settings.view_transform='AgX'

blend=OUT/'SONDE-S19-FIDELITY-V3.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True,check_existing=False)
# Standalone GLB: only newly constructed editable anatomy + active new fan rig.
bpy.ops.object.select_all(action='DESELECT')
for ob in objects:
    if ob.name in bpy.data.objects and ob.type in {'MESH','ARMATURE','EMPTY'}:ob.select_set(True)
bpy.context.view_layer.objects.active=arm
glb=OUT/'SONDE-S19-FIDELITY-V3.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,
    export_animations=True,export_skins=True,export_normals=True,export_yup=True,
    export_lights=False,export_cameras=False,export_apply=False)
assert glb.exists() and glb.stat().st_size>100000
with glb.open('rb') as f:assert f.read(4)==b'glTF'
out={
    'original_source':str(SRC),
    'original_skeleton':[{'rig':r.name,'bones':len(r.data.bones)} for r in source_rigs],
    'new_skeleton_bones':len(arm.data.bones),
    'fan_centers':[{'id':r['tag'],'xyz':[r['cx'],r['cy'],.595]} for r in rotors],
    'new_objects':len(objects),
    'articulation':'4 independently animated turbine fan bones, 20 frame linear fan spin, eye gimbal',
    'shape':'angular wedge fuselage, no roof lid, 4 thick 16-panel octagonal ducts, ruby frontal iris',
    'file_blend_bytes':blend.stat().st_size,'file_glb_bytes':glb.stat().st_size,
}
(OUT/'S19_FIDELITY_V3_REPORT.json').write_text(json.dumps(out,indent=2,ensure_ascii=False))
print('S19 V3 READY '+json.dumps(out),flush=True)
