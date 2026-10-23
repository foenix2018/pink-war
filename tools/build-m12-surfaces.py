"""Original UV-projected dark grey/violet coating and subtle paint roughness."""
from PIL import Image,ImageDraw,ImageFilter
from pathlib import Path
import random,math
out=Path(__file__).resolve().parents[1]/'dist/assets/pink-war';out.mkdir(exist_ok=True,parents=True)
w,h=1024,512;rng=random.Random(352)
image=Image.new('RGB',(w,h));rough=Image.new('L',(w,h));pixels=image.load();rp=rough.load()
for y in range(h):
 for x in range(w):
  n=rng.uniform(-3,3);g=1+.004*math.sin(y*.77)+n*.004
  pixels[x,y]=(int(54*g),int(57*g),int(61*g));rp[x,y]=int(192+rng.uniform(-12,12))
def pt(p):
 x,y=p;U=((x-430)*.00105+.34)/1.04;V=((310-y)*.00105+.1)/.32
 return (round(U*w),round((1-V)*h))
d=ImageDraw.Draw(image)
for poly in [[(610,180),(665,177),(681,188),(660,212),(674,225),(662,255),(637,274),(587,243)],[(879,154),(968,153),(957,174),(929,193),(908,207),(890,236),(839,237),(849,211)],[(853,228),(916,229),(903,249),(878,283),(822,282),(835,263)]]:
 d.polygon([pt(p) for p in poly],fill=(115,48,91))
# Fine finish variation, small abrasions, and isolated machining scratches.
pixels=image.load()
for y in range(h):
 for x in range(w):
  r,g,b=pixels[x,y];n=rng.uniform(-2,2);pixels[x,y]=(int(max(0,r+n)),int(max(0,g+n)),int(max(0,b+n)))
d=ImageDraw.Draw(image)
for _ in range(140):
 x=rng.randrange(w);y=rng.randrange(h);size=rng.choice([1,1,1,2]);c=(100,104,108) if rng.random()<.7 else (27,29,32)
 d.line((x,y,x+rng.randrange(1,5),y+size),fill=c,width=1)
image.save(out/'m12-camouflage.webp',quality=94,method=6);rough.resize((512,256),Image.Resampling.BOX).convert('RGB').save(out/'m12-roughness.webp',quality=88,method=6)
print('M12 surfaces',image.size)
