import json,struct,pathlib,math,numpy as np
from scipy.spatial.transform import Rotation as R,Slerp
from scipy.spatial import cKDTree
P=pathlib.Path
b=P('dist/assets/heroes/lylu-civil-v4.glb').read_bytes()
n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);data=bytearray(b[28+n:])
types={5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'};sizes={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def arr(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']]
 return np.frombuffer(data,dtype=types[a['componentType']],count=a['count']*sizes[a['type']],offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,sizes[a['type']])
def smooth(a,b,x):
 t=np.clip((x-a)/(b-a),0,1);return t*t*(3-2*t)
nodes=g['nodes'];joints=g['skins'][0]['joints'];names={nodes[i]['name']:i for i in joints}
assert [nodes[i]['name'] for i in joints]==['Pelvis','Spine','Chest','Neck','Head','UpperArm_L','ForeArm_L','Hand_L','UpperArm_R','ForeArm_R','Hand_R','Thigh_L','Shin_L','Foot_L','Thigh_R','Shin_R','Foot_R']
for m in g['meshes']:
 for q in m['primitives']:
  at=q['attributes'];p=arr(at['POSITION']);x,y,z=p.T;ax=abs(x);mat=q['material'];w=np.zeros((len(p),17))
  if mat in [4,5,6,12,13,14,15,16,17]:w[:,4]=1
  else:
   low=y<1.005;pelvis=smooth(.78,.985,y);knee=smooth(.43,.62,y);foot=1-smooth(.105,.205,y)
   if mat in [2,8,9]:foot[:]=1
   side=smooth(-.10,.10,x)
   for k,s in [(11,side),(14,1-side)]:
    w[:,k]=low*(1-pelvis)*(1-foot)*knee*s;w[:,k+1]=low*(1-pelvis)*(1-foot)*(1-knee)*s;w[:,k+2]=low*(1-pelvis)*foot*s
   w[:,0]=low*pelvis
   high=~low;spine=smooth(1.08,1.22,y);chest=smooth(1.25,1.40,y);neck=smooth(1.47,1.56,y);head=smooth(1.56,1.63,y)
   w[:,0]+=high*(1-spine);w[:,1]+=high*spine*(1-chest);w[:,2]+=high*spine*chest*(1-neck);w[:,3]+=high*spine*chest*neck*(1-head);w[:,4]+=high*spine*chest*neck*head
   arm=smooth(.225,.32,ax)*smooth(.94,1.05,y)*(1-smooth(1.49,1.57,y));arm=np.where((ax>.33)&(y>.94),1,arm)
   if mat not in [0,11]:arm[:]=0
   w*=1-arm[:,None];elbow=smooth(.29,.40,ax);wrist=smooth(.465,.525,ax)
   for k,mask in [(5,x>=0),(8,x<0)]:
    w[:,k]+=arm*mask*(1-elbow);w[:,k+1]+=arm*mask*elbow*(1-wrist);w[:,k+2]+=arm*mask*elbow*wrist
   if mat==11:
    inset=(1-smooth(.19,.285,ax))*smooth(1.005,1.10,y)*(1-smooth(1.43,1.52,y))
    p[:,0]*=1-.35*inset;p[:,2]=.02+(p[:,2]-.02)*(1-.42*inset)
    waist=(1-smooth(.18,.27,ax))*(1-smooth(1.06,1.15,y));p[:,0]*=1-.75*waist;p[:,2]=.02+(p[:,2]-.02)*(1-.82*waist);p[:,1]+=waist*np.maximum(0,1.075-y)
  inds=np.argsort(-w,axis=1)[:,:4];v=np.take_along_axis(w,inds,axis=1);v/=np.maximum(v.sum(1,keepdims=True),1e-8)
  assert np.allclose(v.sum(1),1,atol=1e-5)
  arr(at['JOINTS_0'])[:]=inds;arr(at['WEIGHTS_0'])[:]=v
  if mat==0:
   alpha=smooth(1.035,1.105,y)*(1-smooth(1.38,1.46,y))*(1-smooth(.135,.21,ax))*smooth(.05,.10,z)
   ix=np.where(alpha>1e-4)[0];allix=np.where((y>1.015)&(y<1.49)&(z>.04))[0]
   if len(ix):
    tree=cKDTree(p[allix,:2].copy());dd,nn=tree.query(p[ix,:2],k=min(90,len(allix)));ww=np.exp(-.5*(dd/.022)**2);zz=(ww*p[allix[nn],2]).sum(1)/ww.sum(1);p[ix,2]=p[ix,2]*(1-alpha[ix])+zz*alpha[ix]
    target=.154-2.05*x[ix]**2;p[ix,2]=p[ix,2]*(1-alpha[ix])+target*alpha[ix]
    old=arr(at['NORMAL']);new=np.column_stack([4.1*x,np.zeros(len(x)),np.ones(len(x))]);new/=np.linalg.norm(new,axis=1,keepdims=True);blend=alpha[:,None];old[:]=old*(1-blend)+new*blend;old[:]/=np.maximum(np.linalg.norm(old,axis=1,keepdims=True),1e-10)
  a=g['accessors'][at['POSITION']];a['min']=p.min(0).tolist();a['max']=p.max(0).tolist()
g['materials'][11]['pbrMetallicRoughness']['baseColorFactor']=[.58,.32,.22,1];g['materials'][11]['pbrMetallicRoughness']['roughnessFactor']=.72
# The exact animation source exported from the armored controller, including runtime actions.
native=json.loads(P('native-source/motion-source.json').read_text());runtime=json.loads(P('runtime-source/runtime-source.json').read_text())
bones=native['bones'];assert bones==runtime['bones'];clips=native['clips']+runtime['clips'];assert len(clips)==30
srcnames={b['name'].replace('mixamorig','').replace(':',''):i for i,b in enumerate(bones)}
parents={c:i for i,x in enumerate(nodes) for c in x.get('children',[])}
C=R.from_rotvec([0,math.pi,0]).as_matrix()
def mat(p,q):
 m=np.eye(4);m[:3,:3]=R.from_quat(q).as_matrix();m[:3,3]=p;return m
sl=[mat(b['p'],b['q']) for b in bones];tl={i:mat(x.get('translation',[0,0,0]),x.get('rotation',[0,0,0,1])) for i,x in enumerate(nodes)}
def world(loc,parent,count):
 w={}
 def get(i):
  if i not in w:w[i]=get(parent[i])@loc[i] if i in parent else loc[i]
  return w[i]
 for i in range(count):get(i)
 return w
sp={i:b['parent'] for i,b in enumerate(bones) if b['parent']>=0}
sw0=world(sl,sp,len(bones));tw0=world(tl,parents,len(nodes));inv={i:np.linalg.inv(tw0[i]) for i in joints}
mp={'Pelvis':'Hips','Spine':'Spine','Chest':'Spine2','Neck':'Neck','Head':'Head'};children={}
for side,s in [('L','Left'),('R','Right')]:
 for a,k in [('UpperArm','Arm'),('ForeArm','ForeArm'),('Hand','Hand'),('Thigh','UpLeg'),('Shin','Leg'),('Foot','Foot')]:mp[a+'_'+side]=s+k
 for a,ch in [('UpperArm','ForeArm'),('ForeArm','Hand'),('Thigh','Shin'),('Shin','Foot')]:children[a+'_'+side]=ch+'_'+side
def align(a,b):
 a=a/np.linalg.norm(a);b=b/np.linalg.norm(b);v=np.cross(a,b);s=np.linalg.norm(v);c=np.clip(np.dot(a,b),-1,1)
 if s>1e-8:return R.from_rotvec(v/s*math.atan2(s,c)).as_matrix()
 if c<0:
  t=np.cross(a,[1,0,0] if abs(a[0])<.9 else [0,1,0]);return R.from_rotvec(t/np.linalg.norm(t)*math.pi).as_matrix()
 return np.eye(3)
def sample(c,times):
 l=[np.repeat(m[None],len(times),axis=0) for m in sl]
 for tr in c['tracks']:
  name,prop=tr['name'].rsplit('.',1);i=srcnames.get(name.replace('mixamorig','').replace(':',''))
  if i is None:continue
  tt=np.asarray(tr['times'],float);v=np.asarray(tr['values'],float).reshape(len(tt),-1);inds=np.r_[True,np.diff(tt)>1e-9];tt=tt[inds];v=v[inds]
  if prop=='quaternion':l[i][:,:3,:3]=R.from_quat(np.repeat(v,len(times),axis=0)).as_matrix() if len(tt)==1 else Slerp(tt,R.from_quat(v))(np.clip(times,tt[0],tt[-1])).as_matrix()
  elif prop=='position':l[i][:,:3,3]=np.stack([np.interp(times,tt,v[:,k]) for k in range(3)],axis=1)
 return l
ratio=tw0[names['Pelvis']][1,3]/max(.1,sw0[srcnames['Hips']][1,3]);soles=[]
for m in g['meshes']:
 for pr in m['primitives']:
  a=pr['attributes'];v=arr(a['POSITION']);sel=v[:,1]<.095
  if sel.any():soles.append((v[sel].copy(),arr(a['JOINTS_0'])[sel].copy(),arr(a['WEIGHTS_0'])[sel].copy()))
def floor(w):
 mm=np.array([w[i]@inv[i] for i in joints]);ys=[]
 for p,j,wg in soles:
  ms=np.sum(mm[j]*wg[:,:,None,None],axis=1);ys.append(np.min(np.einsum('ni,ni->n',ms[:,1,:3],p)+ms[:,1,3]))
 return min(ys) if ys else 0
def accessor(v,typ):
 v=np.ascontiguousarray(v,dtype='<f4');off=len(data);data.extend(v.tobytes());bv=len(g['bufferViews']);g['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':v.nbytes});a={'bufferView':bv,'componentType':5126,'count':len(v),'type':typ}
 if typ=='SCALAR':a.update(min=[float(v.min())],max=[float(v.max())])
 ix=len(g['accessors']);g['accessors'].append(a);return ix
g['animations']=[];manifest=[]
for clip in clips:
 name=clip['name'];duration=clip['duration'];ts=np.linspace(0,duration,max(2,math.ceil(duration*30)+1));src=sample(clip,ts);out=[];floors=[]
 for k,t in enumerate(ts):
  sw=world([x[k] for x in src],sp,len(bones));ls={i:m.copy() for i,m in tl.items()};pel=names['Pelvis'];delta=C@(sw[srcnames['Hips']][:3,3]-sw0[srcnames['Hips']][:3,3]);ls[pel][:3,3]+=delta*ratio
  for axis in (0,2):ls[pel][axis,3]=tl[pel][axis,3]+np.clip(delta[axis]*ratio,-.2,.2)
  for tn in mp:
   i=names[tn];s=srcnames[mp[tn]];parent=world(ls,parents,len(nodes))[parents[i]][:3,:3];desired=C@sw[s][:3,:3]@sw0[s][:3,:3].T@C.T@tw0[i][:3,:3]
   if tn in children:
    ch=children[tn];tc=names[ch];sc=srcnames[mp[ch]];direction=C@(sw[sc][:3,3]-sw[s][:3,3]);desired=align(desired@tl[tc][:3,3],direction)@desired
   ls[i][:3,:3]=parent.T@desired
  floors.append(floor(world(ls,parents,len(nodes))));out.append(ls)
 ground=float(np.percentile(floors,5))
 for k,ls in enumerate(out):
  correction=floors[k] if clip.get('runtime') and name not in ('jump','doubleJump','wallJump','jetpack') else ground
  ls[names['Pelvis']][1,3]-=correction
 times=accessor(ts,'SCALAR');samplers=[];channels=[]
 def add(node,path,vals,typ):
  vals=np.asarray(vals);assert np.isfinite(vals).all();a=accessor(vals,typ);si=len(samplers);samplers.append({'input':times,'output':a,'interpolation':'LINEAR'});channels.append({'sampler':si,'target':{'node':node,'path':path}})
 for i in joints:
  q=R.from_matrix(np.array([ls[i][:3,:3] for ls in out])).as_quat()
  for k in range(1,len(q)):
   if np.dot(q[k],q[k-1])<0:q[k]*=-1
  assert np.max(np.abs(np.linalg.norm(q,axis=1)-1))<1e-5
  add(i,'rotation',q,'VEC4')
 add(names['Pelvis'],'translation',[ls[names['Pelvis']][:3,3] for ls in out],'VEC3')
 g['animations'].append({'name':name,'samplers':samplers,'channels':channels});manifest.append({'name':name,'duration':duration,'frames':len(ts),'channels':len(channels)})
 print(name,len(ts),flush=True)
g['buffers'][0]['byteLength']=len(data);js=json.dumps(g,separators=(',',':')).encode();js+=b' '*(-len(js)%4);data+=b'\0'*(-len(data)%4)
p=P('dist/assets/heroes/lylu-civil-v5.glb');p.write_bytes(struct.pack('<4sII',b'glTF',2,12+8+len(js)+8+len(data))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(data),b'BIN\0')+data)
P('lylu-v5-check').mkdir(exist_ok=True);P('lylu-v5-check/manifest.json').write_text(json.dumps(manifest,indent=2));print(p,p.stat().st_size)
