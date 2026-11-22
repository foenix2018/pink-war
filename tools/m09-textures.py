"""Original botanical atlases and touchscreen artwork; no external image inputs."""
from PIL import Image, ImageDraw, ImageFont
import numpy as np, random, math, pathlib
out=pathlib.Path(__file__).resolve().parents[1]/'dist/assets/m09';out.mkdir(exist_ok=True,parents=True)
rng=random.Random(901)
for kind in ['foliage','flowers']:
 im=Image.new('RGBA',(512,512));d=ImageDraw.Draw(im)
 if kind=='foliage':
  d.line([(100,460),(220,260),(354,60)],fill=(110,128,72,255),width=5)
  for j in range(7):
   t=j/7;cx=130+t*210;cy=420-t*320
   for side in [-1,1]:
    ex=cx+side*(88-20*t);ey=cy-65;dx=ex-cx;dy=ey-cy;ll=math.hypot(dx,dy);nx=-dy/ll;ny=dx/ll
    pts=[(cx,cy),(cx+dx*.34+nx*24,cy+dy*.34+ny*24),(cx+dx*.75+nx*17,cy+dy*.75+ny*17),(ex,ey),(cx+dx*.65-nx*19,cy+dy*.65-ny*19),(cx+dx*.25-nx*19,cy+dy*.25-ny*19)]
    c=(rng.randint(100,155),rng.randint(143,195),rng.randint(65,110),255);d.polygon(pts,fill=c);d.line([(cx,cy),(ex,ey)],fill=(193,210,120,255),width=2)
    for v in [.3,.5,.7]:d.line([(cx+dx*v,cy+dy*v),(cx+dx*(v+.12)+nx*12,cy+dy*(v+.12)+ny*12)],fill=(150,180,96,255),width=1)
 else:
  for i in range(28):
   cx=rng.randint(80,432);cy=rng.randint(80,432);r=rng.randint(10,24);d.line([(256,465),(cx,cy)],fill=(104,77,74,255),width=2)
   for j in range(5):
    a=j*math.tau/5;xx=cx+math.cos(a)*r*.55;yy=cy+math.sin(a)*r*.55
    d.ellipse((xx-r*.56,yy-r*.56,xx+r*.56,yy+r*.56),fill=(255,rng.randint(143,211),rng.randint(185,235),255))
   d.ellipse((cx-3,cy-3,cx+3,cy+3),fill=(248,226,165,255))
 im.save(out/(kind+'.png'),optimize=True)
# Metric bark grain, with matching tangent-space relief and roughness.
n=512;yy,xx=np.mgrid[:n,:n];nr=np.random.default_rng(901);phase=xx*.15+np.sin(yy*.018)*1.7+np.sin(yy*.057+xx*.014)*.6
height=(np.sin(phase)+.38*np.sin(phase*2.9)+nr.normal(0,.12,(n,n)));height=(height-height.min())/(height.max()-height.min());color=np.stack([90+height*88,68+height*61,58+height*48],axis=2).astype('uint8');Image.fromarray(color).save(out/'bark.jpg',quality=91)
dy,dx=np.gradient(height);norm=np.stack([-dx*4,-dy*4,np.ones_like(dx)],axis=2);norm/=np.linalg.norm(norm,axis=2,keepdims=True);Image.fromarray(np.uint8((norm*.5+.5)*255)).save(out/'bark-normal.jpg',quality=90);Image.fromarray(np.uint8(160+height*80)).save(out/'bark-rough.jpg',quality=90)
im=Image.new('RGB',(512,384),'#061722');d=ImageDraw.Draw(im);fp='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';f=lambda s:ImageFont.truetype(fp,s)
for x in range(16,512,24):d.line((x,54,x,355),fill='#102c37')
for y in range(54,355,24):d.line((16,y,495,y),fill='#102c37')
d.rounded_rectangle((8,8,504,376),radius=20,outline='#4dc2cc',width=3);d.text((28,20),'HELIX  /  BIOCONTROL',font=f(23),fill='#c7f4ed');d.line((28,57,480,57),fill='#287989',width=2)
d.ellipse((48,90,240,282),outline='#ff3989',width=4)
for r in [25,52,77]:d.ellipse((144-r,186-r,144+r,186+r),outline='#417f92',width=2)
for a in range(0,360,45):rad=a*math.pi/180;d.line((144+math.cos(rad)*80,186+math.sin(rad)*80,144+math.cos(rad)*93,186+math.sin(rad)*93),fill='#fa69aa',width=3)
for i,s in enumerate(['CAPTEURS  /  ACTIFS','PRESSION   092 kPa','FLUX PINK   87.4%','RESEAU     CONNECTE']):
 y=96+i*44;d.text((276,y),s,font=f(12),fill='#8cdae3');d.rounded_rectangle((276,y+22,474,y+29),radius=3,fill='#153d49');d.rounded_rectangle((276,y+22,350+i*31,y+29),radius=3,fill='#ff308b'if i==2 else'#46bec9')
d.rounded_rectangle((30,305,480,354),radius=10,fill='#173b4b',outline='#f13891',width=2);d.text((137,318),'INITIALISER',font=f(20),fill='#e5eff5');im.save(out/'terminal.png',optimize=True)
