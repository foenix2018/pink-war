import pathlib,struct,json
p=pathlib.Path('dist/assets/heroes/lylu-civil-v4.glb')
x=p.read_bytes(); assert x[:4]==b'glTF'
n=struct.unpack_from('<I',x,12)[0]; d=json.loads(x[20:20+n])
morphs={name for m in d['meshes'] for name in m.get('extras',{}).get('targetNames',[])}
assert {'Blink','Smile','Focus','Surprise'} <= morphs,morphs
assert d.get('skins') and len(d['skins'][0]['joints'])>=17
triangles=sum(d['accessors'][p['indices']]['count']//3 for m in d['meshes'] for p in m['primitives'])
draws=sum(len(m['primitives']) for m in d['meshes'])
assert triangles<230000,(triangles,draws)
assert draws<=30,(triangles,draws)
print('Validated',triangles,'triangles',draws,'draw calls',morphs,len(x),'bytes')
pathlib.Path('lylu-integration/model-stats.json').write_text(json.dumps({'triangles':triangles,'drawCalls':draws,'bytes':len(x),'expressions':sorted(morphs)},indent=2))
