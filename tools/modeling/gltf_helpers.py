import json,struct, numpy as np
from scipy.spatial.transform import Rotation
COMP={5120:np.int8,5121:np.uint8,5122:np.int16,5123:np.uint16,5125:np.uint32,5126:np.float32}
SHAPES={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
class GLTF:
 def __init__(self,path):
  with open(path,'rb') as f:
   assert f.read(4)==b'glTF';f.read(8)
   length,code=struct.unpack('<II',f.read(8));self.d=json.loads(f.read(length));length,code=struct.unpack('<II',f.read(8));self.buf=f.read(length)
  self.parents=[None]*len(self.d['nodes']);
  for i,n in enumerate(self.d['nodes']):
   for c in n.get('children',[]):self.parents[c]=i
  self.local=[]
  for n in self.d['nodes']:
   if 'matrix' in n:self.local.append(np.array(n['matrix'],dtype=float).reshape(4,4,order='F'))
   else:
    m=np.eye(4);m[:3,:3]=Rotation.from_quat(n.get('rotation',[0,0,0,1])).as_matrix()*np.array(n.get('scale',[1,1,1]));m[:3,3]=n.get('translation',[0,0,0]);self.local.append(m)
  self.world=[None]*len(self.local)
  def W(i):
   if self.world[i] is None:self.world[i]=self.local[i] if self.parents[i] is None else W(self.parents[i])@self.local[i]
   return self.world[i]
  for i in range(len(self.local)):W(i)
  self.jointmats={}
  for i,s in enumerate(self.d.get('skins',[])):
   binds=self.accessor(s['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
   self.jointmats[i]=np.stack([self.world[j]@b for j,b in zip(s['joints'],binds)])
 def accessor(self,i):
  a=self.d['accessors'][i];view=self.d['bufferViews'][a['bufferView']];n=SHAPES[a['type']];dt=np.dtype(COMP[a['componentType']]).newbyteorder('<');stride=view.get('byteStride',n*dt.itemsize);offs=view.get('byteOffset',0)+a.get('byteOffset',0)
  return np.ndarray((a['count'],n),dtype=dt,buffer=self.buf,offset=offs,strides=(stride,dt.itemsize)).copy()
 def geometry(self,nodeidx,p):
  n=self.d['nodes'][nodeidx];attr=p['attributes'];v=self.accessor(attr['POSITION']).astype(np.float64)
  vh=np.column_stack([v,np.ones(len(v))])
  if 'skin' in n and 'JOINTS_0' in attr and 'WEIGHTS_0' in attr:
   joints=self.accessor(attr['JOINTS_0']).astype(int);weights=self.accessor(attr['WEIGHTS_0']).astype(float)
   mats=self.jointmats[n['skin']]
   result=np.zeros((len(v),3),float)
   for k in range(4):
    result+=weights[:,[k]]*np.einsum('nij,nj->ni',mats[joints[:,k]],vh)[:,:3]
   v=result
  else:v=(vh@self.world[nodeidx].T)[:,:3]
  if 'indices' in p:faces=self.accessor(p['indices']).ravel().reshape(-1,3)
  else:faces=np.arange(len(v)).reshape(-1,3)
  return v.astype(np.float32), faces.astype(np.int64)
