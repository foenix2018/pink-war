"""Original seamless PBR textures for the refuge. Python 3 + Pillow + NumPy."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT=Path(__file__).resolve().parents[2]/'dist/assets/hideout'
OUT.mkdir(parents=True,exist_ok=True)
rng=np.random.default_rng(38901);N=512
y,x=np.mgrid[:N,:N]
noise=rng.normal(0,1,(N,N))

def write(name,base,height,rough,strength=2):
    rgb=np.clip(base,0,255).astype('uint8')
    if rgb.ndim==2:rgb=np.repeat(rgb[:,:,None],3,axis=2)
    Image.fromarray(rgb).save(OUT/(name+'-color.jpg'),quality=90)
    dx=(np.roll(height,-1,1)-np.roll(height,1,1))*strength
    dy=(np.roll(height,-1,0)-np.roll(height,1,0))*strength
    normal=np.dstack((-dx,dy,np.ones_like(dx)))
    normal/=np.linalg.norm(normal,axis=2)[:,:,None]
    Image.fromarray(np.clip(normal*127+128,0,255).astype('uint8')).save(OUT/(name+'-normal.jpg'),quality=92)
    rr=np.clip(rough,0,255).astype('uint8')
    Image.fromarray(np.repeat(rr[:,:,None],3,axis=2)).save(OUT/(name+'-rough.jpg'),quality=90)

# One metre of satin steel: fine brushing, subtle abrasion, no repeated rust blobs.
brush=rng.normal(0,1,N)[None,:]+noise*.24
wear=np.zeros((N,N))
for i in range(110):
    px,py=rng.integers(0,N,2);length=int(rng.integers(4,65))
    wear[py,(px+np.arange(length))%N]+=rng.uniform(.12,.5)
h=brush*.035+wear*.2
write('steel',180+brush*2.0+wear*16,h,144+noise*3-wear*35,1)

# Clean graphite deck with physical chequer tread. Panel seams are actual geometry.
u=x%64;v=y%64
dx=(u-32)*.707+(v-32)*.707;dy=(u-32)*.707-(v-32)*.707
tread=np.clip((22-np.abs(dx))/3,0,1)*np.clip((5-np.abs(dy))/2,0,1)
deck=142+noise*1.8+tread*11
write('deck',deck,tread*.32+noise*.007,137+noise*2-tread*13,1.6)

# Woven upholstery with a real crossing warp/weft, without baking any light direction.
warp=(np.sin(x*np.pi/2)+1)*.5;weft=(np.sin(y*np.pi/2)+1)*.5
weave=np.where(((x//4+y//4)%2)==0,warp,weft)
write('fabric',185+weave*18+noise*3,weave*.20+noise*.012,230+weave*12,1.2)

# Glazed ceramic and sealed wall concrete remain distinct from cloth/metal.
cloud=np.asarray(Image.fromarray(np.clip(128+noise*25,0,255).astype('uint8')).filter(ImageFilter.GaussianBlur(9))).astype(float)-128
write('ceramic',225+cloud*.4+noise*.25,noise*.002,76+noise*.7,.5)
write('concrete',177+cloud*2.5+noise*3.0,cloud*.05+noise*.035,218+noise*2,.9)

# Fine etched glass: opaque privacy glazing with a soft, irregular highlight.
frost=noise*.035+np.sin(x*.17)*np.sin(y*.21)*.018
write('frost',229+noise*1.8,frost,208+noise*3,1.4)

# Instrument display, reused by screens with proper local UV coordinates.
im=Image.new('RGB',(1024,640),'#07151e');d=ImageDraw.Draw(im)
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
f=lambda s:ImageFont.truetype(font,s)
for xx in range(24,1024,32):d.line((xx,76,xx,592),fill='#122d39')
for yy in range(76,615,32):d.line((24,yy,1000,yy),fill='#122d39')
d.rectangle((0,0,1023,62),fill='#102d3c');d.text((26,12),'PINK WARS / NANOFORGE',font=f(27),fill='#8de4f3')
d.text((800,24),'EN LIGNE',font=f(16),fill='#f27ead')
# Exploded technical rifle, side view, stock / body / vented shroud / exposed coil.
cyan='#61bacd';white='#b3d1d9';pink='#f06fa4'
d.polygon([(80,260),(218,248),(266,212),(324,212),(308,325),(225,317),(92,328)],outline=cyan,width=3)
d.rounded_rectangle((290,220,650,314),12,outline=white,width=3)
d.rectangle((380,317,433,395),outline=cyan,width=3)
d.polygon([(310,314),(344,314),(335,375),(307,375)],outline=cyan,width=3)
d.rounded_rectangle((660,234,870,298),8,outline=cyan,width=3)
for xx in range(680,850,18):d.line((xx,241,xx,290),fill=pink,width=2)
d.line((875,260,942,260),fill=white,width=7)
for xx in range(335,620,22):d.line((xx,231,xx,247),fill=cyan,width=3)
for p in [(184,285),(455,269),(759,269)]:
    d.ellipse((p[0]-8,p[1]-8,p[0]+8,p[1]+8),outline=pink,width=2)
    d.line((p[0],p[1]-12,p[0]+60,p[1]-105),fill=cyan,width=1)
d.text((40,110),'MATRICE / EQUIPEMENT',font=f(22),fill=white)
d.text((40,455),'INTEGRITE     100 %',font=f(21),fill=cyan)
d.text((40,498),'CELLULE       STABLE',font=f(21),fill=cyan)
for i in range(15):d.rectangle((520+i*29,462,538+i*29,485),fill=cyan if i<12 else '#243f4b')
d.text((520,505),'CALIBRAGE  //  SYNCHRONISE',font=f(17),fill=pink)
d.line((24,570,1000,570),fill=cyan,width=2)
d.text((30,592),'GHJU / LYLU',font=f(18),fill=white)
d.text((650,592),'SYSTEME DE PREPARATION',font=f(16),fill=cyan)
im.save(OUT/'display.jpg',quality=92)
print('PBR refuge : cinq jeux couleur / normale / rugosite et ecran technique originaux')
