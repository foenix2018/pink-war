# Pink Wars — GHJU et LYLU, unité Shadow : équipement et matières faits dans Blender.
#
#   python tools/blender/heroes_assets.py        (ONLY=nom pour n'en refaire qu'une partie)
#
# Repère : celui du squelette Mixamo en pose de référence (mètres, y en haut, face vers -z, droite du héros +x),
# relevé sur le rig du jeu (hanches 1,03 m, épaules 1,49 m, tête 1,63 m).
# Produit, dans dist/assets/heroes/ :
#   mantle.pwm / mantle_ao.jpg     capuche-écharpe drapée par une vraie simulation de tissu Blender sur le buste,
#                                  les épaulières et le casque (anneau intérieur épinglé au cou), bord déchiré ;
#   belt.pwm / belt_ao.jpg         ceinture tactique : sangle, boucle, six poches à rabat et pression, attaches ;
#   rifle.pwm / rifle_ao.jpg       fusil porté dans le dos (axe +x = canon, +y = dessus), lunette, chargeur, crosse ;
#   plates_{diff,nor,rough}.jpg    texture répétable de plaques segmentées rivetées, calculée depuis un modèle très
#                                  détaillé (relief et occlusion) : 24 cm de côté ;
#   cloak_ghju.png, cloak_lylu.png tissu de cape déchiré (ourlet effiloché, trous, bande rose ou bleue), canal alpha ;
#   fabric.png, fabric_nor.jpg     même tissu sans bande, pour la capuche et le pan avant ; relief de trame.
import bpy, bmesh, math, os, sys, random
import numpy as np
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from m04_assets import Asset, finish, G, TAU, build  # noqa: E402

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../dist/assets/heroes'))
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- fabric textures (numpy, periodic noise)
def periodic_noise(w, h, cells_x, cells_y, rng):
    g = rng.random((cells_y, cells_x)).astype(np.float32)
    ys, xs = np.linspace(0, cells_y, h, endpoint=False), np.linspace(0, cells_x, w, endpoint=False)
    y0, x0 = np.floor(ys).astype(int), np.floor(xs).astype(int); fy, fx = ys - y0, xs - x0
    fy, fx = fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx)
    a = g[y0 % cells_y][:, x0 % cells_x]; b = g[y0 % cells_y][:, (x0 + 1) % cells_x]
    c = g[(y0 + 1) % cells_y][:, x0 % cells_x]; d = g[(y0 + 1) % cells_y][:, (x0 + 1) % cells_x]
    top = a + (b - a) * fx[None, :]; bot = c + (d - c) * fx[None, :]
    return top + (bot - top) * fy[:, None]

def fbm(w, h, base, octaves, rng, aspect=1.0):
    out = np.zeros((h, w), np.float32); amp, tot = 1.0, 0.0
    for o in range(octaves):
        cx = max(1, int(base * 2 ** o)); cy = max(1, int(base * aspect * 2 ** o))
        out += amp * periodic_noise(w, h, cx, cy, rng); tot += amp; amp *= .5
    return out / tot

def fabric_textures():
    from PIL import Image
    W, H = 1024, 1332  # 1.0 m × 1.3 m of cloth; v = 0 at the hem (bottom row of the image)
    rng = np.random.default_rng(1983)
    y = np.linspace(1.3, 0, H, endpoint=False)[:, None]  # metres above the hem
    x = np.linspace(0, 1.0, W, endpoint=False)[None, :]
    weave = ((np.add.outer(np.arange(H), np.arange(W)) % 6) < 2).astype(np.float32) * .5 + ((np.arange(W)[None, :] % 3) == 0) * .25
    mott = fbm(W, H, 6, 5, rng, 1.3); dirt = fbm(W, H, 3, 4, rng, 1.3)
    # Torn hem: long strips hanging, a ragged fringe, holes thickening toward the hem.
    strips = np.clip(fbm(W, 1, 22, 3, rng)[0] * 1.6 - .55, 0, 1) ** 1.5
    fringe = fbm(W, 1, 90, 2, rng)[0]
    hem = .015 + .30 * strips + .06 * fringe + .05 * fbm(W, 1, 7, 2, rng)[0]
    alpha = (y > hem[None, :]).astype(np.float32)
    holes = fbm(W, H, 9, 4, rng, 1.3)
    near = np.clip(1 - y / .55, 0, 1)
    alpha *= (holes < .70 - .28 * near ** 1.2 + .25 * (1 - near)).astype(np.float32)
    # Frayed edges: darker, worn threads next to every tear.
    from PIL import ImageFilter
    a_img = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))
    edge = 1 - np.asarray(a_img, np.float32) / 255
    base = 30 + 16 * mott + 10 * weave - 9 * dirt * (1 - y / 1.3)
    base = base * (1 - .35 * np.clip(edge * 2, 0, 1)) + 8 * np.clip(1 - y / .4, 0, 1) * mott
    def save(name, stripe):
        rgb = np.stack([base, base, base * 1.06], -1)
        if stripe is not None:
            band = ((x > .30) & (x < .40)).astype(np.float32) * (1 - .25 * (np.abs(x - .35) > .045))
            c = np.array(stripe, np.float32)[None, None, :]
            tint = (c * (.55 + .45 * mott[..., None]) * (1 - .4 * dirt[..., None])) * (1 - .45 * np.clip(edge * 2, 0, 1))[..., None]
            rgb = rgb * (1 - band[..., None]) + tint * band[..., None]
        img = np.concatenate([np.clip(rgb, 0, 255), alpha[..., None] * 255], -1).astype(np.uint8)
        Image.fromarray(img, 'RGBA').save(os.path.join(OUT, name + '.png'), optimize=True)
    save('cloak_ghju', (150, 34, 92)); save('cloak_lylu', (48, 92, 170)); save('fabric', None)
    # Weave and crumple relief → tangent-space normal map.
    height = weave * .6 + fbm(W, H, 14, 4, rng, 1.3) * 2.2
    gx = np.roll(height, -1, 1) - np.roll(height, 1, 1); gy = np.roll(height, -1, 0) - np.roll(height, 1, 0)
    n = np.stack([-gx * .5, gy * .5, np.ones_like(gx)], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True)
    Image.fromarray(((n * .5 + .5) * 255).astype(np.uint8)).resize((512, 666)).save(os.path.join(OUT, 'fabric_nor.jpg'), quality=86)
    print('fabric textures')

# ---------------------------------------------------------------- riveted segmented plates (high poly → bake)
def plates():
    bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
    S = .24; rnd = random.Random(7); bm = bmesh.new()
    def plate(x0, y0, w, h, t):
        for dx in (-S, 0, S):
            for dy in (-S, 0, S):
                cx, cy = x0 + w / 2 + dx, y0 + h / 2 + dy
                if cx + w / 2 < -.01 or cx - w / 2 > S + .01 or cy + h / 2 < -.01 or cy - h / 2 > S + .01: continue
                bmesh.ops.create_cube(bm, size=1, matrix=Matrix.Translation((cx, cy, t / 2)) @ Matrix.Diagonal((w, h, t, 1)))
                for rx in (-1, 1):
                    for ry in (-1, 1):
                        bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=.0024, matrix=Matrix.Translation((cx + rx * (w / 2 - .007), cy + ry * (h / 2 - .007), t)) @ Matrix.Diagonal((1, 1, .6, 1)))
    gap, y = .0035, 0.0
    for row_h in (.056, .064, .052, .068):
        x0 = rnd.random() * .05; x = x0
        while x < x0 + S - .02:  # the row closes exactly on itself across the tile border
            w = rnd.choice((.046, .058, .072, .088)); w = x0 + S - x if x0 + S - x - w < .04 else w
            t = rnd.choice((.0045, .0055, .0065)); plate(x + gap / 2, y + gap / 2, w - gap, row_h - gap, t); x += w
        y += row_h
    me = bpy.data.meshes.new('plates_hi'); bm.to_mesh(me); bm.free(); hi = bpy.data.objects.new('hi', me); sc.collection.objects.link(hi)
    bev = hi.modifiers.new('b', 'BEVEL'); bev.width = .0012; bev.segments = 3; bev.limit_method = 'ANGLE'
    bpy.ops.mesh.primitive_plane_add(size=S, location=(S / 2, S / 2, 0)); lo = bpy.context.active_object
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 32
    world = bpy.data.worlds.new('w'); sc.world = world; world.light_settings.distance = .02
    res = 1024; out = {}
    for kind in ('NORMAL', 'AO'):
        img = bpy.data.images.new('bake_' + kind, res, res, alpha=False, float_buffer=True)
        mat = bpy.data.materials.new('bake'); mat.use_nodes = True; node = mat.node_tree.nodes.new('ShaderNodeTexImage'); node.image = img
        mat.node_tree.nodes.active = node; lo.data.materials.clear(); lo.data.materials.append(mat)
        bpy.ops.object.select_all(action='DESELECT'); hi.select_set(True); lo.select_set(True); bpy.context.view_layer.objects.active = lo
        sc.render.bake.use_selected_to_active = True; sc.render.bake.cage_extrusion = .02; sc.render.bake.margin = 0
        bpy.ops.object.bake(type=kind)
        out[kind] = np.array(img.pixels[:], np.float32).reshape(res, res, 4)[::-1, :, :3]
    from PIL import Image
    nor, ao = out['NORMAL'], out['AO'][..., 0]
    tilt = np.clip((1 - (nor[..., 2] * 2 - 1)) * 6, 0, 1)  # bevels and rivet flanks
    diff = np.clip(.80 * (.35 + .65 * ao) + .22 * tilt, 0, 1)
    rough = np.clip(.42 + .38 * (1 - ao) - .18 * tilt, 0, 1)
    Image.fromarray((nor * 255).astype(np.uint8)).save(os.path.join(OUT, 'plates_nor.jpg'), quality=90)
    Image.fromarray((np.stack([diff] * 3, -1) * 255).astype(np.uint8)).save(os.path.join(OUT, 'plates_diff.jpg'), quality=86)
    Image.fromarray((rough * 255).astype(np.uint8)).resize((512, 512)).save(os.path.join(OUT, 'plates_rough.jpg'), quality=86)
    print('plates baked')

# ---------------------------------------------------------------- mantle: cloth draped on the shoulders
def mantle():
    bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
    def proxy(kind, c, size, rot=None):
        if kind == 'sphere': bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1, location=G(*c))
        else: bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=1, depth=1, location=G(*c))
        o = bpy.context.active_object; o.scale = (size[0], size[2], size[1])
        if rot: o.rotation_euler = rot
        bpy.ops.object.transform_apply(scale=True, rotation=True); m = o.modifiers.new('c', 'COLLISION'); o.collision.thickness_outer = .006; o.collision.cloth_friction = 8
        return o
    # The game's real armour in bind pose (exported from the rig: tools/blender/ref), minus the helmet, is the
    # collision body: the cowl settles on the actual shoulder plates and cuirass.
    import gzip, tempfile
    tmp = os.path.join(tempfile.gettempdir(), 'shadow_armour_bind.obj')
    with gzip.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ref/shadow_armour_bind.obj.gz')) as src, open(tmp, 'wb') as dst: dst.write(src.read())
    bpy.ops.wm.obj_import(filepath=tmp); body = bpy.context.selected_objects[0]
    bpy.context.view_layer.objects.active = body; bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)  # Y-up → Z-up into the vertices
    bm = bmesh.new(); bm.from_mesh(body.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z > 1.575 or v.co.z < 1.1], context='VERTS'); bm.to_mesh(body.data); bm.free()
    body.modifiers.new('c', 'COLLISION'); body.collision.thickness_outer = .008; body.collision.cloth_friction = 8
    proxies = [body, proxy('cyl', (0, 1.6, .025), (.085, .14, .085))]
    rin, rout, rings, seg = .1, .46, 16, 72
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap'); grid = []
    for j in range(rings + 1):
        row = []
        for i in range(seg):
            a = TAU * i / seg
            # Short in front (a scarf under the chin), full on the shoulders and longest at the back (game +z).
            reach = .5 + .5 * (1 + math.sin(a)) / 2
            r = rin + (rout - rin) * j / rings * reach
            row.append(bm.verts.new(G(math.cos(a) * r, 1.66 - .02 * j / rings, math.sin(a) * r)))
        grid.append(row)
    for j in range(rings):
        for i in range(seg):
            f = bm.faces.new((grid[j][i], grid[j][(i + 1) % seg], grid[j + 1][(i + 1) % seg], grid[j + 1][i]))
            for l, (jj, ii) in zip(f.loops, ((j, i), (j, i + 1), (j + 1, i + 1), (j + 1, i))):
                l[uvl].uv = (ii / seg * 2.4, (rings - jj) / rings * .36)
    me = bpy.data.meshes.new('mantle'); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new('mantle', me); sc.collection.objects.link(ob)
    vg = ob.vertex_groups.new(name='pin'); vg.add(list(range(seg * 2)), 1.0, 'REPLACE')
    cl = ob.modifiers.new('cloth', 'CLOTH'); st = cl.settings
    st.quality = 10; st.mass = .12; st.tension_stiffness = 12; st.compression_stiffness = 12; st.bending_stiffness = .25; st.air_damping = 2
    st.vertex_group_mass = 'pin'; cl.collision_settings.distance_min = .006; cl.collision_settings.use_self_collision = False
    sc.frame_start, sc.frame_end = 1, 90; cl.point_cache.frame_end = 90
    for f in range(1, 91): sc.frame_set(f)
    bpy.context.view_layer.objects.active = ob; bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
    bpy.ops.object.modifier_apply(modifier='cloth')
    # Relax the creases left by the armour's hard edges, then lift the cloth off the plates by a few millimetres.
    sm = ob.modifiers.new('relax', 'SMOOTH'); sm.factor = .6; sm.iterations = 6; bpy.ops.object.modifier_apply(modifier='relax')
    dp = ob.modifiers.new('lift', 'DISPLACE'); dp.strength = .006; bpy.ops.object.modifier_apply(modifier='lift')
    sm = ob.modifiers.new('s', 'SUBSURF'); sm.levels = 1; bpy.ops.object.modifier_apply(modifier='s')
    bpy.ops.object.shade_smooth()
    mat = bpy.data.materials.new('fabric'); me.materials.append(mat)
    for p in proxies: p.hide_render = False
    finish(ob, 'mantle', 1024, 48, OUT, keep_uv0=True, ao_distance=.12, floor=False)

# ---------------------------------------------------------------- tactical belt with pouches (on the hips)
def belt():
    a = Asset('belt'); y0, rx, rz = .995, .197, .142
    def ring(mat, y, h, ax, az, t, seg=64):
        pts = [(math.sin(TAU * i / seg) * ax, y, -math.cos(TAU * i / seg) * az) for i in range(seg)]
        for i in range(seg):
            p, q = pts[i], pts[(i + 1) % seg]; m = ((p[0] + q[0]) / 2, y, (p[2] + q[2]) / 2); L = math.hypot(q[0] - p[0], q[2] - p[2])
            a.box(mat, m, (L + .002, h, t), yaw=-math.atan2(q[2] - p[2], q[0] - p[0]))
    ring('strap', y0, .048, rx, rz, .008)
    for s in (1, -1): ring('strap', y0 + s * .021, .004, rx + .002, rz + .002, .01)
    a.box('gunSteel', (0, y0, -rz - .012), (.075, .055, .014)); a.box('gunDark', (0, y0, -rz - .02), (.045, .03, .008)); a.box('glow', (0, y0 - .016, -rz - .0245), (.03, .004, .002))
    for th, (w, h, d) in ((-52, (.075, .1, .045)), (52, (.075, .1, .045)), (-84, (.06, .13, .05)), (84, (.06, .13, .05)), (-118, (.09, .11, .055)), (118, (.065, .12, .045))):
        t = math.radians(th); nx, nz = math.sin(t), -math.cos(t); px, pz = nx * (rx + .006 + d / 2), nz * (rz + .006 + d / 2)
        cy = y0 - .015; yaw = math.atan2(-nz, nx) - math.pi / 2
        yaw = -t
        a.box('pouch', (px, cy, pz), (w, h, d), yaw=yaw)
        a.box('pouch', (px + nx * .004, cy + h / 2 - .012, pz + nz * .004), (w + .008, .032, d + .008), yaw=yaw)
        a.box('strap', (px + nx * (d / 2 + .005), cy + h / 2 - .045, pz + nz * (d / 2 + .005)), (.018, .05, .004), yaw=yaw)
        a.cyl('gunSteel', (px + nx * (d / 2 + .008), cy + h / 2 - .062, pz + nz * (d / 2 + .008)), .007, .004, seg=10, axis='z', yaw=yaw)
        for e in (-1, 1): a.box('strap', (px + math.cos(t) * e * (w / 2 - .004), cy, pz + math.sin(t) * e * (w / 2 - .004)), (.003, h - .01, d + .002), yaw=yaw)
        a.box('strap', (px - nx * (d / 2 - .002), y0, pz - nz * (d / 2 - .002)), (w * .7, .052, .004), yaw=yaw)
    return a

# ---------------------------------------------------------------- rifle carried on the back
def rifle():
    a = Asset('rifle')
    a.box('gunDark', (0, 0, 0), (.34, .085, .056)); a.box('gunSteel', (.02, .05, 0), (.3, .014, .028))
    for k in range(10): a.box('gunDark', (-.11 + k * .026, .06, 0), (.012, .008, .03))
    a.box('gunDark', (.31, .0, 0), (.28, .062, .05))
    for k in range(6):
        for s in (-1, 1): a.box('glow' if k == 2 else 'black', (.21 + k * .04, .005, s * .0255), (.022, .02, .002))
    a.cyl('gunSteel', (.5, -.005, 0), .013, .14, axis='x', seg=14); a.box('gunDark', (.585, -.005, 0), (.05, .03, .03))
    for k in range(3): a.box('black', (.575 + k * .012, .008, 0), (.005, .006, .032))
    a.cyl('gunDark', (.03, .093, 0), .022, .17, axis='x', seg=18); a.cyl('gunDark', (-.06, .093, 0), .027, .04, axis='x', seg=18); a.cyl('gunDark', (.115, .093, 0), .026, .03, axis='x', seg=18)
    a.cyl('lens', (.131, .093, 0), .021, .004, axis='x', seg=18); a.cyl('glow', (-.081, .093, 0), .018, .003, axis='x', seg=18)
    for x in (-.02, .08): a.box('gunSteel', (x, .068, 0), (.02, .02, .03))
    a.box('gunDark', (.06, -.1, 0), (.05, .14, .03), tilt=('Y', .14)); a.box('gunSteel', (.06, -.172, 0), (.056, .012, .034))
    a.box('gunDark', (-.09, -.085, 0), (.034, .1, .03), tilt=('Y', -.3))
    a.torus('gunDark', (-.035, -.045, 0), .028, .005, seg=16, tseg=6, axis='z', arc=math.pi)
    for y in (.02, -.03): a.box('gunDark', (-.31, y, 0), (.28, .016, .02))
    a.box('rubber', (-.46, -.005, 0), (.03, .13, .045)); a.box('gunSteel', (-.19, -.005, 0), (.04, .07, .03))
    for s in (-1, 1): a.box('glow', (-.02, -.005, s * .0285), (.18, .005, .002))
    a.box('label', (.06, .0, .0285), (.05, .02, .001))
    return a

if __name__ == '__main__':
    only = os.environ.get('ONLY')
    if not only or only == 'fabric': fabric_textures()
    if not only or only == 'plates': plates()
    if not only or only == 'mantle': mantle()
    for fn, size in ((belt, 1024), (rifle, 1024)):
        if only and only != fn.__name__: continue
        build(fn(), size, 48, out=OUT)
