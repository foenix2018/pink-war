"""Convert the approved V4 workshop blend into a weighted, expression-capable hideout asset."""
import bpy, sys, math, json
from mathutils import Vector
from pathlib import Path
from math import exp
src=next(Path("workshop-artifact").rglob("LYLU_civil_V4.blend"))
bpy.ops.wm.open_mainfile(filepath=str(src))
scene=bpy.context.scene
# Preserve the original V4 silhouette and materials, strip studio/reference only.
for o in list(scene.objects):
    if o.type not in {"MESH","CURVE"} or o.hide_render or o.name.startswith("Studio"):
        bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.object.select_all(action="DESELECT")
facial=[];clothes=[]
for o in list(scene.objects):
    if o.type not in {"MESH","CURVE"}:continue
    o.hide_set(False);o.select_set(True);bpy.context.view_layer.objects.active=o
    if o.type=="CURVE":bpy.ops.object.convert(target="MESH");o=bpy.context.object
    # Hair and clothes retain authored shapes, with lower tessellation for mobile.
    for m in list(o.modifiers):
        if m.type=="SUBSURF":m.levels=min(m.levels,1 if ("face neck" in o.name or "jersey" in o.name.lower()) else 0)
        try:bpy.ops.object.modifier_apply(modifier=m.name)
        except RuntimeError:pass
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    o.select_set(False)
    if "recessed anatomically shaped eye" in o.name:
        g=o.vertex_groups.new(name="FACIAL_EYE");g.add(list(range(len(o.data.vertices))),1,"REPLACE");facial.append(o)
    elif "eyebrow" in o.name.lower():
        g=o.vertex_groups.new(name="FACIAL_BROW");g.add(list(range(len(o.data.vertices))),1,"REPLACE");facial.append(o)
    elif "face neck arms" in o.name:facial.append(o)
    else:clothes.append(o)
def join(objects,name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
    o=bpy.context.object;o.name=name;return o
face=join(facial,"LYLU_FaceAndSkin");body=join(clothes,"LYLU_CivilClothing")
# Keep facial morph topology untouched. One shared skinned clothing mesh reduces object overhead.
# Rig fitted to the actual A-pose, in Blender metres, front -Y.
bones={
 "Pelvis":((0,0,1.00),(0,0,1.12),None),
 "Spine":((0,0,1.12),(0,-.015,1.31),"Pelvis"),
 "Chest":((0,-.015,1.31),(0,-.018,1.49),"Spine"),
 "Neck":((0,-.018,1.49),(0,-.025,1.60),"Chest"),
 "Head":((0,-.025,1.60),(0,-.025,1.78),"Neck"),
}
for side,sgn in (("L",1),("R",-1)):
    def p(x,y,z):return(sgn*x,y,z)
    sh=p(.205,-.025,1.465);el=p(.337,-.026,1.28);wr=p(.493,-.205,1.105);ha=p(.555,-.31,1.035)
    hi=p(.118,-.025,.982);kn=p(.185,-.020,.535);an=p(.200,-.015,.14);toe=p(.202,-.17,.045)
    bones["UpperArm_"+side]=(sh,el,"Chest");bones["ForeArm_"+side]=(el,wr,"UpperArm_"+side);bones["Hand_"+side]=(wr,ha,"ForeArm_"+side)
    bones["Thigh_"+side]=(hi,kn,"Pelvis");bones["Shin_"+side]=(kn,an,"Thigh_"+side);bones["Foot_"+side]=(an,toe,"Shin_"+side)
arm=bpy.data.armatures.new("LYLU_CivilSkeleton");rig=bpy.data.objects.new("LYLU_CivilRig",arm);scene.collection.objects.link(rig)
bpy.ops.object.select_all(action="DESELECT");rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode="EDIT")
for name,(h,t,parent) in bones.items():
    b=arm.edit_bones.new(name);b.head=h;b.tail=t
    if parent:b.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode="OBJECT")
def smooth(a,b,v):
    q=max(0,min(1,(v-a)/(b-a)));return q*q*(3-2*q)
def mixweights(obj):
    groups={n:obj.vertex_groups.new(name=n) for n in bones}
    seg={n:(Vector(h),Vector(t)) for n,(h,t,_) in bones.items()}
    def closest(p,names):
        vals=[]
        for n in names:
            a,b=seg[n];d=b-a;t=max(0,min(1,(p-a).dot(d)/d.length_squared));dist=(p-a-d*t).length
            vals.append((dist,n))
        vals.sort();w=[(1/(d+.035)**4,n) for d,n in vals[:2]];total=sum(x[0] for x in w);return {n:k/total for k,n in w}
    for v in obj.data.vertices:
        x,y,z=v.co;ax=abs(x);side="L" if x>=0 else "R"
        if z>=1.60:ws={"Head":1}
        elif ax>.285 and z>.94:ws=closest(v.co,["UpperArm_"+side,"ForeArm_"+side,"Hand_"+side])
        elif z>1.31 and ax>.17:
            t=smooth(.17,.285,ax);ws={"Chest":1-t,"UpperArm_"+side:t}
        elif z<.20:ws=closest(v.co,["Shin_"+side,"Foot_"+side]) if z>.115 else {"Foot_"+side:1}
        elif z<.94:ws=closest(v.co,["Thigh_"+side,"Shin_"+side])
        elif z<1.10:
            t=1-smooth(.94,1.10,z);ws={"Pelvis":1-t,"Thigh_"+side:t}
        elif z>1.48:
            t=smooth(1.48,1.60,z);ws={"Neck":1-t,"Head":t}
        elif z>1.28:
            t=smooth(1.28,1.39,z);ws={"Spine":1-t,"Chest":t}
        else:ws={"Spine":1}
        for n,w in ws.items():
            if w>1e-5:groups[n].add([v.index],w,"REPLACE")
    obj.parent=rig;mod=obj.modifiers.new("Civil skinning","ARMATURE");mod.object=rig
for o in (face,body):mixweights(o)
# Separate morphs affect the actual eyelids, brows and lips; the globe closes behind the lid.
def member(v,g):
    idx=face.vertex_groups.get(g)
    return idx is not None and any(x.group==idx.index and x.weight>.5 for x in v.groups)
basis=face.shape_key_add(name="Basis")
for key in ["Blink","Smile","Focus","Surprise"]:
    shape=face.shape_key_add(name=key)
    for v in face.data.vertices:
        x,y,z=v.co
        if z<1.57 or y>-.035:continue
        ax=abs(x);eye=exp(-((ax-.0308)/.019)**4-((z-1.687)/.019)**4)
        browzone=exp(-((ax-.032)/.026)**4-((z-1.710)/.014)**4)
        mouth=exp(-((ax-.022)/.021)**4-((z-1.621)/.017)**4)
        eyeobj=member(v,"FACIAL_EYE");browobj=member(v,"FACIAL_BROW")
        dx=dy=dz=0
        if key=="Blink":
            if eyeobj:dz=-.92*(z-1.687)
            elif not browobj:
                dz=-.82*(z-1.687)*eye;dy=-.0020*eye
        elif key=="Smile" and not (eyeobj or browobj):
            dz=.0055*mouth*(.30+.70*min(1,ax/.027));dx=(1 if x>=0 else -1)*.0025*mouth;dy=-.0018*mouth
        elif key=="Focus":
            if browobj:dz=-.0045*(1-.55*min(1,ax/.052));dx=-(1 if x>=0 else -1)*.0014
            elif not eyeobj:dz=-.004*browzone-.20*(z-1.687)*eye
        elif key=="Surprise":
            if browobj:dz=.007
            elif not eyeobj:
                dz=.006*browzone+.18*(z-1.687)*eye-.004*mouth*max(0,min(1,(1.624-z)/.010))
        shape.data[v.index].co=v.co+Vector((dx,dy,dz))
# Remove unused facial marker groups, retain actual deform weights.
for name in ("FACIAL_EYE","FACIAL_BROW"):
    g=face.vertex_groups.get(name)
    if g:face.vertex_groups.remove(g)
# The whole rig is exported; no external textures or assets.
bpy.ops.object.select_all(action="DESELECT")
for o in (rig,face,body):o.select_set(True)
bpy.context.view_layer.objects.active=rig
out=Path("dist/assets/heroes/lylu-civil-v4.glb");out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out),export_format="GLB",use_selection=True,export_apply=False,export_morph=True,export_skins=True,export_animations=False)
Path("lylu-integration").mkdir(exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath="lylu-integration/LYLU_civil_V4_rigged.blend")
print("LYLU V4 optimized rig export",out.stat().st_size)
