import bpy, math, random, os, json, urllib.request, pathlib
from mathutils import Vector
from math import sin, cos, pi, exp
random.seed(89)
OUT=pathlib.Path("lylu_output"); OUT.mkdir(exist_ok=True)
BASE="https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/"
def fetch(path):
    p=OUT/pathlib.Path(path).name
    if not p.exists(): urllib.request.urlretrieve(BASE+path,p)
    return p.read_text()
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
V=[]; UV=[]; F=[]; group=""
for line in fetch("3dobjs/base.obj").splitlines():
    s=line.split()
    if not s: continue
    if s[0]=="v": V.append(Vector(tuple(map(float,s[1:4]))))
    elif s[0]=="vt": UV.append(tuple(map(float,s[1:3])))
    elif s[0]=="g": group=" ".join(s[1:])
    elif s[0]=="f":
        ids=[x.split("/") for x in s[1:]]
        F.append((group,tuple(int(x[0])-1 for x in ids),tuple(int(x[1])-1 if len(x)>1 and x[1] else 0 for x in ids)))
for name,w in [("caucasian-male-young",.75),("asian-male-young",.25),("universal-male-young-averagemuscle-averageweight",.36),("universal-male-young-maxmuscle-averageweight",.64)]:
    for line in fetch("targets/macrodetails/"+name+".target").splitlines():
        s=line.split()
        if len(s)==4 and s[0].isdigit(): V[int(s[0])]+=w*Vector(tuple(map(float,s[1:])))
groups=sorted(set(f[0] for f in F));print("SOURCE GROUPS",groups)
body=[f for f in F if f[0]=="body" or f[0].startswith("body ")]
if not body: body=[f for f in F if not any(k in f[0].lower() for k in ("helper","joint","eye","teeth","tongue","lash","brow","skirt","tights","hair"))]
assert len(body)>2000, (groups,len(body))
used=set(i for _,ids,_ in body for i in ids)
low=min(V[i].y for i in used); high=max(V[i].y for i in used); scale=1.8/(high-low)
P=[Vector((v.x*scale,-v.z*scale,(v.y-low)*scale)) for v in V]
# More natural shoulders and long athletic silhouette, keep the original detailed face and hand topology.
def mat(name,c,rough=.7,metal=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
    p=m.node_tree.nodes.get("Principled BSDF");p.inputs["Base Color"].default_value=(*c,1);p.inputs["Roughness"].default_value=rough;p.inputs["Metallic"].default_value=metal
    return m
skin=mat("Skin / warm neutral",(.38,.205,.135),.53)
skin.node_tree.nodes.get("Principled BSDF").inputs["Subsurface Weight"].default_value=.085
white=mat("White jersey cotton",(.68,.69,.72),.86)
black=mat("Anthracite technical fleece",(.017,.020,.026),.86)
rib=mat("Ribbed charcoal",(.012,.015,.021),.91)
blue=mat("LYLU cobalt textile",(.018,.095,.55),.61)
shoe=mat("Sneaker off-white mesh",(.68,.7,.72),.69)
sole=mat("Moulded rubber",(.44,.47,.51),.84)
dark=mat("Outsole graphite",(.025,.03,.04),.8)
hair=mat("Ink black hair",(.012,.012,.019),.38)
hair2=mat("Indigo black hair",(.022,.029,.055),.4)
hairBlue=mat("Cobalt hair accents",(.014,.055,.32),.42)
silver=mat("Brushed silver",(.39,.44,.52),.31,.8)
lip=mat("Lips",(.28,.095,.075),.57)
brow=mat("Brows",(.026,.016,.018),.78)
iris=mat("Blue iris",(.028,.14,.35),.37)
pupil=mat("Pupil",(.004,.004,.005),.24)
sclera=mat("Sclera",(.8,.76,.72),.32)
for m in (white,black,rib,shoe):
    n=m.node_tree.nodes; l=m.node_tree.links; tex=n.new("ShaderNodeTexNoise");tex.inputs["Scale"].default_value=240;tex.inputs["Detail"].default_value=2
    bump=n.new("ShaderNodeBump");bump.inputs["Strength"].default_value=.16;bump.inputs["Distance"].default_value=.0007
    l.new(tex.outputs["Fac"],bump.inputs["Height"]);l.new(bump.outputs["Normal"],n.get("Principled BSDF").inputs["Normal"])
def mesh(name,vs,faces,material,sub=0):
    me=bpy.data.meshes.new(name);me.from_pydata(vs,[],faces);me.update()
    o=bpy.data.objects.new(name,me);scene.collection.objects.link(o);me.materials.append(material)
    for f in me.polygons:f.use_smooth=True
    if sub: m=o.modifiers.new("Smooth fitted surface","SUBSURF");m.levels=sub;m.render_levels=sub
    return o
def objpart(name,fs,material,offset=0,fold=0,sub=1):
    idx=sorted(set(i for _,ids,_ in fs for i in ids)); remap={v:i for i,v in enumerate(idx)}
    o=mesh(name,[P[i] for i in idx],[tuple(remap[i] for i in ids) for _,ids,_ in fs],material,0)
    layer=o.data.uv_layers.new(name="Original UV")
    for poly,(_,_,uvs) in zip(o.data.polygons,fs):
        for loop,u in zip(poly.loop_indices,uvs):
            if UV:layer.data[loop].uv=UV[u]
    for v in o.data.vertices:
        p=v.co.copy(); x,y,z=p
        f=(sin(z*49+x*19+y*13)*.38+sin(z*82-x*22)*.19)*(exp(-((z-.49)/.13)**2)+.75*exp(-((z-.20)/.09)**2)) + .18*sin(z*22+x*32+y*15)
        v.co+=v.normal*(offset+fold*f)
    if name.startswith("Tapered"):
        sm=o.modifiers.new("Relax fleece over anatomy","SMOOTH");sm.factor=.65;sm.iterations=5
    if sub: mod=o.modifiers.new("Subdivided tailoring","SUBSURF");mod.levels=sub;mod.render_levels=sub
    return o
def avg(ids): return sum((P[i] for i in ids),Vector())/len(ids)
# The original neutral mesh is used for an anatomically continuous body, not primitives.
# Garments are fitted shells cut from its topology, with sculpted fabric folds and separate seams.
def region(p):
    x,y,z=p; ax=abs(x)
    if z<.135:return "shoes"
    if z<1.025 and (ax<.29 or z<.87):return "pants"
    if 1.00<=z<1.515 and ax<.275+(max(0,z-1.33)*.75):return "shirt"
    return "skin"
buckets={k:[] for k in ("skin","shirt","pants","shoes")}
for f in body:buckets[region(avg(f[1]))].append(f)
assert all(len(fs)>100 for fs in buckets.values()),{k:len(v) for k,v in buckets.items()}
# Full underlying body is kept as editable hidden reference, not exported.
ref=objpart("Anatomical reference (hidden)",body,skin,sub=0);ref.hide_render=True;ref.hide_set(True)
skinObj=objpart("LYLU face neck arms hands",buckets["skin"],skin,sub=1)
# Continuous tailored torso with a separate sewn sleeve on each side.
def ringmesh(name,rings,material,N=64,sub=1):
    vs=[p for ring in rings for p in ring];fs=[]
    for j in range(len(rings)-1):
        for i in range(N):fs.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
    o=mesh(name,vs,fs,material,sub)
    uv=o.data.uv_layers.new(name="Garment UV")
    for poly in o.data.polygons:
        for loop in poly.loop_indices:
            k=o.data.loops[loop].vertex_index;uv.data[loop].uv=((k%N)/N,(k//N)/(len(rings)-1))
    return o
N=64
profiles=[(1.015,.191,.133,-.027),(1.034,.192,.131,-.027),(1.075,.187,.129,-.027),(1.12,.184,.127,-.026),(1.17,.185,.130,-.026),(1.22,.193,.133,-.024),(1.27,.206,.133,-.024),(1.32,.218,.132,-.024),(1.37,.227,.128,-.024),(1.42,.227,.118,-.022),(1.46,.213,.102,-.02),(1.49,.178,.082,-.02),(1.515,.118,.064,-.017),(1.535,.073,.050,-.019),(1.543,.072,.049,-.019)]
rings=[]
for z,rx,ry,cy in profiles:
    ring=[]
    for i in range(N):
        a=2*pi*i/N
        fade=exp(-((z-1.095)/.115)**2)
        wrinkle=fade*(.006*sin(86*z+3*cos(a)+.8*sin(3*a))+.004*sin(5*a+22*z))+.002*sin(6*a+19*z)
        dz=(.008*sin(3*a+.8)+.004*cos(5*a))*exp(-((z-1.03)/.08)**2)
        if z>1.515: dz-=.017*max(0,-sin(a))
        ring.append(((rx+wrinkle)*cos(a),cy+(ry+wrinkle)*sin(a),z+dz))
    rings.append(ring)
shirt=ringmesh("Jersey / continuous draped torso",rings,white)
# Sleeves follow the actual A-pose shoulder to elbow direction.
sleeveRings=[]
for side in (-1,1):
    direction=Vector((side*.69,0,-.724));u=Vector((0,1,0));v=direction.cross(u).normalized()
    rings2=[]
    for j,(x,z,rad,dep) in enumerate([(.173,1.454,.087,.092),(.205,1.437,.089,.088),(.234,1.41,.086,.082),(.267,1.375,.079,.075),(.298,1.343,.070,.068),(.305,1.336,.070,.068)]):
        center=Vector((side*x,-.020,z));ring=[]
        for i in range(N):
            a=2*pi*i/N;f=.0025*sin(4*a+j*1.05)+.0015*cos(7*a-j)
            ring.append(center+u*(dep+f)*cos(a)+v*(rad+f)*sin(a))
        rings2.append(ring)
    sleeve=ringmesh("Jersey / sleeve "+str(side),rings2,white)
    sleeveRings.append(rings2[-1])
shirtRings=rings
pants=objpart("Tapered jogger / draped fleece",buckets["pants"],black,.030,.015,2)
shoes=objpart("Sneaker upper / fitted anatomical last",buckets["shoes"],shoe,.017,.002,2)
# Model hems from garment boundary edges (the shell's actual cut lines).
def tube(name,pts,r,material,cyclic=False):
    c=bpy.data.curves.new(name,"CURVE");c.dimensions="3D";c.resolution_u=10;c.bevel_depth=r;c.bevel_resolution=3
    s=c.splines.new("POLY");s.points.add(len(pts)-1)
    for p,v in zip(s.points,pts):p.co=(*v,1)
    s.use_cyclic_u=cyclic
    o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);c.materials.append(material);return o
def boundary(obj,material,r):
    counts={}
    for p in obj.data.polygons:
        for edge in p.edge_keys:counts[edge]=counts.get(edge,0)+1
    edges=[e for e,n in counts.items() if n==1]
    adj={}
    for a,b in edges:adj.setdefault(a,[]).append(b);adj.setdefault(b,[]).append(a)
    visited=set()
    for a in adj:
        if a in visited:continue
        cur=a;path=[]
        while cur not in visited:
            visited.add(cur);path.append(obj.data.vertices[cur].co.copy())
            nxt=[x for x in adj[cur] if x not in visited]
            if not nxt:break
            cur=nxt[0]
        if len(path)>3:tube(obj.name+" / sewn hem",path,r,material,True)
tube("Jersey / collar stitching",shirtRings[-1],.0032,white,True)
tube("Jersey / bottom seam",shirtRings[0],.0025,white,True)
for ring in sleeveRings:tube("Jersey / sleeve hem",ring,.0025,white,True)
# Ribbed ankle cuffs: actual jogger and sneaker bounds, no floating seams.
for side in (-1,1):
    pts=[p for p in P if p.x*side>.08 and .13<p.z<.17 and abs(p.x)<.32]
    cx=(min(p.x for p in pts)+max(p.x for p in pts))/2;cy=(min(p.y for p in pts)+max(p.y for p in pts))/2
    rr=[[(cx+.050*cos(2*pi*i/N),cy+.056*sin(2*pi*i/N),z) for i in range(N)] for z in (.126,.132,.158,.165)]
    ringmesh("Jogger ribbed ankle cuff",rr,rib)
def ell(name,c,s,m):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=c)
    o=bpy.context.object;o.name=name;o.scale=s;o.data.materials.append(m)
    for p in o.data.polygons:p.use_smooth=True
    return o
def box(name,c,s,m,bev=.004):
    bpy.ops.mesh.primitive_cube_add(size=1,location=c);o=bpy.context.object;o.name=name;o.dimensions=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
    mod=o.modifiers.new("Rounded edge","BEVEL");mod.width=bev;mod.segments=3;o.modifiers.new("Weighted normals","WEIGHTED_NORMAL");return o
# Eyes: use actual helper eye centers where provided.
for side in (-1,1):
    candidates=[(g,ids,uv) for g,ids,uv in F if "eye" in g.lower() and "lash" not in g.lower() and "brow" not in g.lower()]
    pts=[P[i] for _,ids,_ in candidates for i in ids if P[i].x*side>0 and P[i].z>1.54]
    if pts:
        cx=(min(p.x for p in pts)+max(p.x for p in pts))/2; cy=(min(p.y for p in pts)+max(p.y for p in pts))/2; cz=(min(p.z for p in pts)+max(p.z for p in pts))/2
    else:cx,cy,cz=side*.031,-.056,1.69
    eye=ell("Eye", (cx,cy+.0027,cz),(.0108,.0108,.0108),sclera)
    ell("Iris",(cx,cy-.0075,cz),(.0047,.0015,.0047),iris);ell("Pupil",(cx,cy-.009,cz),(.0023,.001,.0023),pupil)
    # Strong tapered brows drawn just above the actual eye centers.
    bpy.context.view_layer.update()
    ob=skinObj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    browpts=[]
    for i in range(15):
        x=cx+side*(-.015+.0022*i);z=cz+.014+.004*sin(pi*i/14)
        hit,p,_,_=ob.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
        if hit:browpts.append((x,p.y-.0015,z))
    if len(browpts)>2:tube("Eyebrow",browpts,.0017,brow)
# Hair scalp: fit to actual head bounds.
head=[P[i] for i in used if P[i].z>1.66 and abs(P[i].x)<.14]
hx=max(abs(p.x) for p in head); hy=(max(p.y for p in head)+min(p.y for p in head))/2
hz=max(p.z for p in head); depth=(max(p.y for p in head)-min(p.y for p in head))/2
# Irregular scalp with visible temples, cut above the eyebrows.
vs=[]; faces=[];N=64;R=18
for j in range(R+1):
    for i in range(N):
        a=2*pi*i/N; limit=1.75-.38*max(0,-sin(a))+.23*max(0,sin(a))
        t=.012+limit*j/R
        vs.append((hx*1.02*sin(t)*cos(a),hy+depth*1.05*sin(t)*sin(a),hz-.066+.076*cos(t)))
for j in range(R):
    for i in range(N):faces.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
mesh("Sculpted swept scalp",vs,faces,hair,1)
def lock(name,points,width,thickness,material):
    vs=[];faces=[];N=10
    for j,p in enumerate(points):
        p=Vector(p); t=j/(len(points)-1); d=Vector(points[min(j+1,len(points)-1)])-Vector(points[max(0,j-1)])
        d.normalize(); a=d.cross(Vector((0,0,1)))
        if a.length<.001:a=d.cross(Vector((0,1,0)))
        a.normalize();b=d.cross(a).normalized()
        taper=max(.018,(1-t)**.65)*(.55+.6*sin(pi*t))
        for i in range(N):v=p+taper*(a*width*cos(2*pi*i/N)+b*thickness*sin(2*pi*i/N));vs.append(v)
    for j in range(len(points)-1):
        for i in range(N):faces.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
    faces.extend([tuple(range(N-1,-1,-1)),tuple(range((len(points)-1)*N,len(points)*N))])
    return mesh(name,vs,faces,material,1)
# Layered sculpted locks arranged around the scalp, with a side-swept fringe.
for j in range(86):
    a=2*pi*j/86+random.uniform(-.055,.055)
    t0=random.uniform(.16,.85);t1=random.uniform(1.12,1.83)
    front=sin(a)<-.32
    if front:t1=random.uniform(1.36,1.73)
    sweep=random.uniform(.28,.77)
    pts=[]
    for k in range(17):
        t=k/16; theta=t0+(t1-t0)*t; az=a+sweep*t
        lift=.013+.013*sin(pi*t)+random.uniform(-.001,.001)
        px=(hx+lift)*sin(theta)*cos(az)
        py=hy+(depth+lift)*sin(theta)*sin(az)
        pz=hz-.066+(.085+lift)*cos(theta)+.025*t**4
        if front:pz-=.014*t**3
        pts.append((px,py,pz))
    lock("Layered swept lock %02d"%j,pts,random.uniform(.008,.016),random.uniform(.004,.008),hairBlue if j in (50,53,57,62,68) else hair2 if j%4==0 else hair)
# Secondary hair strands add a realistic directional sheen without loose floating spikes.
for j in range(14):
    x=-.058+j*.008;pts=[]
    for k in range(16):
        t=k/15;pts.append((x+.048*t,hy-.047-.047*sin(t*pi/2),hz+.024-.092*t+.012*sin(pi*t)))
    lock("Swept forehead fringe %02d"%j,pts,.010,.004,hairBlue if j in (3,7) else hair)
# Surface-conforming graphic inserts and pocket seams. Raycast in from the side.
bpy.context.view_layer.update()
def surface_at(obj,origin,direction,offset=.0018):
    hit,p,n,i=obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).ray_cast(Vector(origin),Vector(direction))
    return p+n*offset if hit else None
for side in (-1,1):
    for z0,z1 in [(.38,.53),(.69,.84)]:
        band=[]
        for i in range(21):
            t=i/20;z=z0+(z1-z0)*t;y=-.065+.06*t
            width=.012*sin(pi*t)**.45+.001
            for dy in (-width,width):
                p=surface_at(pants,(side*.8,y+dy,z),(-side,0,0))
                if p is not None:band.append(p)
        if len(band)==42:mesh("Cobalt inset bonded to fleece",band,[(i,i+1,i+3,i+2) for i in range(0,40,2)],blue)
    pocket=[]
    for i in range(20):
        t=i/19;p=surface_at(pants,(side*.8,-.058-.011*t,.89-.15*t),(-side,0,0))
        if p is not None:pocket.append(p)
    if len(pocket)>2:tube("Cargo pocket zipper seam",pocket,.0022,rib)
    foot=[P[i] for _,ids,_ in buckets["shoes"] for i in ids if P[i].x*side>0]
    minx,maxx=min(p.x for p in foot),max(p.x for p in foot);miny,maxy=min(p.y for p in foot),max(p.y for p in foot)
    cx=(minx+maxx)/2;cy=(miny+maxy)/2
    rx=(maxx-minx)/2+.014;ry=(maxy-miny)/2+.016
    # Smooth asymmetric sole, tapered toe and heel.
    for material,levels in [(dark,[(.001,.95),(.008,1),(.016,1)]),(sole,[(.015,1),(.025,1.03),(.045,.95),(.054,.87)])]:
        rings3=[]
        for z,f in levels:
            rings3.append([(cx+rx*f*cos(2*pi*i/N)*(1-.12*sin(2*pi*i/N)),cy+ry*f*sin(2*pi*i/N),z+.006*max(0,-sin(2*pi*i/N))**3) for i in range(N)])
        ringmesh("Layered sneaker sole",rings3,material)
    for i in range(6):
        y=miny+.072+i*.015;lace=[]
        for x in (cx-.028,cx-.014,cx,cx+.014,cx+.028):
            p=surface_at(shoes,(x,y,.35),(0,0,-1),.003)
            if p is not None:lace.append(p)
        if len(lace)>2:tube("Lace / surface fitted",lace,.0019,white)
    for j in range(2):
        pts=[]
        for k in range(14):
            t=k/13;p=surface_at(shoes,(cx+side*.3,cy-.035+.085*t,.056+j*.014+.014*sin(pi*t)),(-side,0,0))
            if p is not None:pts.append(p)
        if len(pts)>2:tube("Cobalt sneaker side panel",pts,.0025,blue)
# chest logo follows the actual shirt front using raycasting after modifier evaluation.
def front(x,z,obj):
    deps=bpy.context.evaluated_depsgraph_get(); ob=obj.evaluated_get(deps)
    hit,p,n,i=ob.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
    return p.y-.003 if hit else -.14
for path in [[(.090,1.385),(.125,1.435),(.107,1.389),(.145,1.397)],[(.083,1.377),(.126,1.383)]]:
    tube("LYLU angular chest insignia",[(x,front(x,z,shirt),z) for x,z in path],.004,blue)
# Chain, dog tag, drawstrings.
pts=[(.078*cos(2*pi*i/60),-.025+.115*sin(2*pi*i/60),1.54-.085*max(0,-sin(2*pi*i/60))) for i in range(60)]
tube("Silver necklace",pts,.0018,silver,True)
box("Pendant",(0,front(0,1.44,shirt)-.006,1.44),(.021,.005,.036),silver,.003)
for sign in (-1,1):
    points=[(sign*.016,-.151,1.016),(sign*.019,-.155,.987),(sign*.025,-.152,.960)]
    tube("Drawstring",points,.0022,rib)
    box("Drawstring tip",points[-1],(.004,.004,.012),silver,.001)
# Export editable mesh and a GLB only (no claim that existing Mixamo skin weights are transferred).
# Select visible character only; preserve source reference in blend.
for o in list(scene.objects):
    if o.type=="CURVE" and not o.hide_render:
        bpy.ops.object.select_all(action="DESELECT");o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target="MESH")
bpy.ops.object.select_all(action="DESELECT")
for o in scene.objects:
    if o.type=="MESH" and not o.hide_render:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/"LYLU_civil_V3.glb"),export_format="GLB",use_selection=True,export_apply=True)
scene.render.engine="CYCLES"
scene.cycles.device="CPU"
scene.cycles.samples=24
scene.cycles.use_denoising=True
scene.render.threads_mode="FIXED"
scene.render.threads=4
scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new("Studio");scene.world.use_nodes=True;scene.world.node_tree.nodes.get("Background").inputs[0].default_value=(.06,.075,.11,1)
floor=mat("Studio slate",(.045,.055,.08),.74);box("Studio ground",(0,0,-.035),(200,200,.06),floor,.0 if False else .001)
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat("-Z","Y").to_euler()
def area(name,pos,power,size,color):
    d=bpy.data.lights.new(name,"AREA");d.energy=power;d.shape="DISK";d.size=size;d.color=color;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=pos;aim(o,(0,0,1))
area("Soft key",(-3,-4,4),500,4,(1,.9,.83));area("Fill",(3,-2,2.5),260,3,(.65,.8,1));area("Blue rim",(0,3,3),500,2,(.25,.45,1))
d=bpy.data.cameras.new("Studio orthographic");d.type="ORTHO";d.ortho_scale=2.13;cam=bpy.data.objects.new("Studio orthographic",d);scene.collection.objects.link(cam);scene.camera=cam
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"LYLU_civil_V3.blend"))
for name,pos in [("front",(0,-5,1.05)),("three_quarter",(2.7,-5,1.13)),("back",(0,5,1.05))]:
    cam.location=pos;aim(cam,(0,0,.91));scene.render.filepath=str(OUT/("LYLU_"+name+".png"));bpy.ops.render.render(write_still=True)
cam.location=(0,-3,1.67);aim(cam,(0,0,1.67));d.ortho_scale=.39
scene.render.filepath=str(OUT/"LYLU_portrait.png");bpy.ops.render.render(write_still=True)
cam.location=(0,-5,1.05);aim(cam,(0,0,.91));d.ortho_scale=2.13
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"LYLU_civil_V3.blend"))
(OUT/"README.txt").write_text("LYLU civil V3 — Blender workshop prototype. MakeHuman anatomical mesh and morph targets (MakeHuman assets CC0); original clothing, hair and accessories created by this script. GLB static, not yet bound to the Pink Wars Mixamo skeleton. Visual fidelity requires review before integration.")
print("LYLU Blender complete")
