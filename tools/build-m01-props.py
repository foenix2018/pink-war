"""Compile two CC0 Poly Haven props to the game's local static mesh format.
Usage: python3 tools/build-m01-props.py /path/to/operation-steel-tide
Only the listed meshes/images are reused. No other game's scene or code is copied.
"""
from pathlib import Path
import sys, subprocess, json, struct, io, hashlib, base64, zlib
import numpy as np
from PIL import Image

repo=Path(sys.argv[1]); revision='d6a33b932e00fb9016dea407eca3f909aeaf2dcb'
root=Path(__file__).resolve().parents[1]; out=root/'dist/assets/cc0'; records=[]
def read(path):
    data=subprocess.check_output(['git','-C',str(repo),'show',f'{revision}:{path}'])
    records.append({'path':path,'sha256':hashlib.sha256(data).hexdigest()})
    return data
def pack(a):
    c=zlib.compressobj(9,zlib.DEFLATED,-15)
    return base64.b64encode(c.compress(a.tobytes())+c.flush()).decode()
models=[]
surface_files={}
for channel,source in [('diff','BaseColor'),('normal','Normal'),('orm','ORM')]:
    data=read(f'assets/models/quaternius_downtown_city/T_RedBrick_{source}.png')
    file=f'm01-brick-{channel}_512.jpg';Image.open(io.BytesIO(data)).convert('RGB').resize((512,512),Image.Resampling.LANCZOS).save(out/file,quality=90)
    surface_files[channel]=file
read('assets/models/quaternius_downtown_city/QUATERNIUS_LICENSE.txt')
for name,path,source,author in [
 ('crate','assets/models/old_military_crate/old_military_crate.gltf','old_military_crate','Jack Mava'),
 ('bin','assets/models/polyhaven_residential_street/metal_trash_can/metal_trash_can_rust.glb','metal_trash_can','GurJas Studios')]:
    parent=Path(path).parent; raw=read(path)
    if path.endswith('.glb'):
        n=struct.unpack_from('<I',raw,12)[0]; j=json.loads(raw[20:20+n]); start=20+n
        size=struct.unpack_from('<I',raw,start)[0]; binary=raw[start+8:start+8+size]
    else:
        j=json.loads(raw); binary=read(str(parent/j['buffers'][0]['uri']))
    def accessor(index):
        a=j['accessors'][index];v=j['bufferViews'][a['bufferView']]
        types={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'};dtype=np.dtype(types[a['componentType']]);n={'VEC3':3,'VEC2':2,'SCALAR':1}[a['type']]
        offset=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',n*dtype.itemsize)
        return np.ndarray((a['count'],n),dtype=dtype,buffer=binary,offset=offset,strides=(stride,dtype.itemsize)).copy()
    batches={}
    for node in j['nodes']:
        if 'mesh' not in node or name=='crate' and not node.get('name','').endswith('_a'):continue
        q=node.get('rotation',[0,0,0,1]);x,y,z,w=q
        r=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],
                    [2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],
                    [2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
        for p in j['meshes'][node['mesh']]['primitives']:
            assert p.get('mode',4)==4 and 'TEXCOORD_0' in p['attributes']
            v=accessor(p['attributes']['POSITION']).astype(float);n=accessor(p['attributes']['NORMAL']).astype(float);uv=accessor(p['attributes']['TEXCOORD_0'])
            scale=np.array(node.get('scale',[1,1,1]));v=(v*scale)@r.T+node.get('translation',[0,0,0]);n=(n/scale)@r.T;n/=np.linalg.norm(n,axis=1)[:,None]
            vertices=np.concatenate([v,n,uv],axis=1);ix=accessor(p['indices']).reshape(-1).astype('<u4')
            batches.setdefault(p.get('material',0),[]).append([vertices,ix])
    allv=np.concatenate([p[0][:,:3] for ps in batches.values() for p in ps]);minimum=allv.min(axis=0);maximum=allv.max(axis=0);origin=(maximum+minimum)/2;origin[1]=minimum[1]
    result={'id':name,'source':f'https://polyhaven.com/a/{source}','author':author,'license':'CC0-1.0','size':(maximum-minimum).tolist(),'batches':[]}
    for material,parts in batches.items():
        verts=[];indices=[];count=0
        for v,ix in parts:v[:,:3]-=origin;verts.append(v);indices.append(ix+count);count+=len(v)
        v=np.concatenate(verts).astype('<f4');ix=np.concatenate(indices).astype('<u4');m=j['materials'][material];pr=m['pbrMetallicRoughness'];images={}
        for channel,index in [('diff',pr['baseColorTexture']['index']),('normal',m['normalTexture']['index']),('arm',pr['metallicRoughnessTexture']['index'])]:
            im=j['images'][j['textures'][index]['source']]
            if 'uri' in im:data=read(str(parent/im['uri']))
            else:
                view=j['bufferViews'][im['bufferView']];off=view.get('byteOffset',0);data=binary[off:off+view['byteLength']]
            file=f'm01-{name}-{material}-{channel}_512.jpg';Image.open(io.BytesIO(data)).convert('RGB').resize((512,512),Image.Resampling.LANCZOS).save(out/file,quality=88)
            images[channel]=file
        result['batches'].append({'vertices':pack(v),'indices':pack(ix),'triangles':len(ix)//3,'maps':images})
    models.append(result)
(out/'m01-salvage.json').write_text(json.dumps({'models':models},separators=(',',':')))
manifest={'license':'CC0-1.0','mirror':'https://github.com/AetherRadar/operation-steel-tide','revision':revision,'sourceFiles':records,
 'brickSurface':{'author':'Quaternius','source':'https://quaternius.com/packs/downtowncitymegakit.html','license':'CC0-1.0','files':surface_files,'note':'Authored PBR surface, not a photo scan. Maps resized to 512px; 2m tiling at runtime.'},
 'conversion':'Rigid nodes baked, one closed crate variant, rusted bin variant, original UVs; photos reduced to 512px. No gameplay code or level reused.',
 'models':[{k:v for k,v in m.items() if k!='batches'}|{'triangles':sum(b['triangles'] for b in m['batches'])} for m in models]}
(root/'assets/level1/cc0-props-sources.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest['models']))
