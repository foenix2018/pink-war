"""Run against the saved .blend: no renderer or screenshots substituted for source checks."""
import bpy,json,pathlib,hashlib,os
root=pathlib.Path(__file__).resolve().parents[2];out=pathlib.Path(os.environ.get('AUDIT_OUTPUT','/tmp/pink-m10'));out.mkdir(parents=True,exist_ok=True)
sc=bpy.context.scene;plan=json.loads(sc['plan_m10']);assert sc['chapter']==10 and sc.unit_settings.system=='METRIC';assert len(plan['objectives'])==8 and len(plan['rooms'])==2
assert len(plan['doors'])==4;leaves=[o for o in sc.objects if o.get('runtime_dynamic')];assert len(leaves)==16 and all(o.animation_data for o in leaves)
sc.frame_set(1);closed={o.name:tuple(o.location)for o in leaves};sc.frame_set(30);assert all(tuple(o.location)!=closed[o.name]for o in leaves);sc.frame_set(120);assert all(tuple(o.location)==closed[o.name]for o in leaves)
used={n.image for m in bpy.data.materials if m.use_nodes for n in m.node_tree.nodes if n.type=='TEX_IMAGE'and n.image};assert all(i.packed_file for i in used)
a=(root/'assets/m10/PinkWars_N10_Couronne_HELIX.blend').read_bytes();b=(root/'dist/assets/m10/PinkWars_N10_Couronne_HELIX.blend').read_bytes();assert a==b
stats=json.loads((root/'dist/assets/m10/stats.json').read_text());assert stats['triangles']<180000 and stats['downloadBytes']<2e6
result={'chapter':10,'units':'metres','objectives':8,'rooms':2,'doors':4,'animatedLeafParts':len(leaves),'packedImages':len(used),'scope':sc['scope'],'objects':len(sc.objects),'sourceBytes':len(a),'sourcePublicSHA256':hashlib.sha256(a).hexdigest(),'mesh':stats}
(out/'blender-validation.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
