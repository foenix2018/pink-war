"""Original tileable surface maps for Vesper. No downloaded art or baked lighting.
Color, height, roughness/metalness and foliage alpha are kept separate.
"""
from pathlib import Path
import numpy as np,json,base64,io
from PIL import Image,ImageDraw,ImageFilter
P=Path(__file__).resolve().parents[1];out=P/'assets/level1/textures';out.mkdir(parents=True,exist_ok=True)
N=512;rng=np.random.default_rng(33307)
def noise(freq):
 grid=rng.random((freq,freq));xy=np.arange(N)*freq/N;lo=np.floor(xy).astype(int)%freq;t=xy-np.floor(xy);t=t*t*(3-2*t)
 a=grid[lo[:,None],lo[None,:]];b=grid[lo[:,None],(lo[None,:]+1)%freq];c=grid[(lo[:,None]+1)%freq,lo[None,:]];d=grid[(lo[:,None]+1)%freq,(lo[None,:]+1)%freq]
 return (a*(1-t[None,:])+b*t[None,:])*(1-t[:,None])+ (c*(1-t[None,:])+d*t[None,:])*t[:,None]
def fbm():return sum(noise(f)*a for f,a in [(3,.38),(7,.25),(15,.18),(35,.12),(80,.07)])
def image(a):return Image.fromarray(np.clip(a,0,255).astype('uint8'))
brick=np.zeros((N,N,3));height=np.full((N,N),130.);mortar=np.zeros((N,N),bool)
for row in range(12):
 y0=round(row*N/12);y1=round((row+1)*N/12);shift=(row%2)*64
 for x0 in range(-128,640,128):
  xa,xb=max(0,x0+shift+3),min(N,x0+shift+125)
  if xa>=xb:continue
  brick[y0:y1,xa:xb]=np.array([117,77,53])+rng.uniform(-16,16,size=3);height[y0+3:y1-3,xa:xb]=190+rng.uniform(-7,7)
 mortar[y0:y0+3]=True
brick[brick.sum(axis=2)==0]=[88,86,74];brick+=(fbm()-.5)[:,:,None]*40+rng.normal(0,2,(N,N,1))
encoded={};stats={}
def save(name,color,h,rough,metal=0):
 color=np.clip(color,0,255);normalH=np.clip(h,0,255);packed=np.zeros((N,N,3));packed[:,:,0]=220;packed[:,:,1]=rough;packed[:,:,2]=metal
 maps={'color':image(color),'height':image(normalH),'surface':image(packed)}
 encoded[name]={}
 for k,im in maps.items():
  f=out/f'{name}-{k}.png';im.save(f,optimize=True);encoded[name][k]='data:image/png;base64,'+base64.b64encode(f.read_bytes()).decode()
 stats[name]={'width':N,'height':N,'maps':list(maps)}
# Layered cracks and runoff, not a flat full-screen grain mask.
for name,base in [('concrete',[162,160,147]),('plaster',[178,170,146]),('road',[59,64,61])]:
 f=fbm();grain=rng.normal(0,2,(N,N));col=np.array(base)[None,None,:]+(f-.5)[:,:,None]*56+grain[:,:,None];h=130+(f-.5)*40
 if name=='plaster':
  mask=f>.63;col[mask]=brick[mask];h[mask]=height[mask]-32
 drips=np.tile(np.maximum(0,noise(24)[0]-.55),(N,1))*np.linspace(0,1,N)[:,None]
 if name!='road':col-=drips[:,:,None]*22
 scars=Image.new('L',(N,N));draw=ImageDraw.Draw(scars)
 for k in range(8 if name!='road' else 16):
  x,y=rng.uniform(0,N,2);points=[(x,y)]
  for j in range(12):x+=rng.uniform(-14,14);y+=rng.uniform(8,22);points.append((x,y))
  draw.line(points,fill=190,width=1 if name!='road' else 2)
 cracks=np.array(scars)/255;col-=cracks[:,:,None]*63;h-=cracks*58
 moss=np.maximum(0,noise(11)-.65)*90;col[:,:,1]+=moss*.22;col[:,:,0]-=moss*.38;col[:,:,2]-=moss*.40
 save(name,col,h,226 if name!='road' else 218)
save('brick',brick,height,230)
# Rust has pits and remains of paint, with separately masked metal reflection.
for name,paint in [('rust',[133,143,140]),('car-blue',[81,100,104]),('car-cream',[164,157,131]),('steel',[133,143,144])]:
 f=fbm();corrosion=np.clip((f-(.50 if name!='steel' else .62))*8,0,1);pit=noise(80)
 rust=np.array([124,69,31])[None,None,:]+(f-.5)[:,:,None]*70+pit[:,:,None]*12
 intact=np.array(paint)[None,None,:]+(noise(30)-.5)[:,:,None]*22
 col=intact*(1-corrosion[:,:,None])+rust*corrosion[:,:,None]
 h=130+corrosion*30+pit*corrosion*30;rough=115+corrosion*110;metal=205*(1-corrosion)+corrosion*34
 save(name,col,h,rough,metal)
# Fine leaf cards: branching silhouettes and transparent gaps replace green blobs.
leaf=Image.new('RGBA',(N,N));c=ImageDraw.Draw(leaf)
c.line([(255,505),(260,65)],fill=(81,91,45,255),width=6)
for j in range(8):
 side=-1 if j%2 else 1;cy=450-(j//2)*105;cx=256+side*90;angle=(-.60 if side>0 else 3.7);length=156;width=43
 direction=np.array([np.cos(angle),np.sin(angle)]);cross=np.array([-direction[1],direction[0]]);center=np.array([cx,cy]);a=center-direction*length/2;b=center+direction*length/2
 polygon=[]
 for sign in [-1,1]:
  for t in np.linspace(0,1,14):
   value=t if sign==-1 else 1-t;point=a+direction*length*value+cross*sign*width*np.sin(np.pi*value)**.85;polygon.append(tuple(point))
 color=(int(rng.uniform(61,79)),int(rng.uniform(92,116)),int(rng.uniform(34,51)),255);c.polygon(polygon,fill=color);c.line([tuple(a),tuple(b)],fill=(105,124,55,255),width=3)
 c.line([(256,cy+42),tuple(a)],fill=(84,96,42,255),width=3)
 for t in [.2,.35,.5,.65,.8]:
  point=a+direction*length*t
  for side2 in [-1,1]:c.line([tuple(point),tuple(point+direction*length*.09+cross*width*np.sin(np.pi*t)*.78*side2)],fill=(80,101,42,255),width=1)
leaf.save(out/'foliage-color.png',optimize=True);encoded['foliage']={'color':'data:image/png;base64,'+base64.b64encode((out/'foliage-color.png').read_bytes()).decode()};stats['foliage']={'width':N,'height':N,'alpha':True,'maps':['color']}
(P/'dist/levels/vesper-01-textures.js').write_text('// Original authored Vesper textures. Embedded for offline and iPhone launches.\nexport const SURFACE_INFO='+json.dumps(stats,separators=(',',':'))+';\nexport const SURFACE_DATA='+json.dumps(encoded,separators=(',',':'))+';\n')
print(json.dumps(stats));print('texture module bytes',(P/'dist/levels/vesper-01-textures.js').stat().st_size)
