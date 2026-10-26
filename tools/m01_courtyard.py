"""M01 lot 1: metre-based cour/annex extension. Physics and Blender share these parts."""
def extend_layout(layout):
    obstacles=layout['obstacles']
    obstacles[:]=[b for b in obstacles if not b.get('fence') and not (abs(b['x']+10)<.01 and abs(b['z']-60)<.01 and b['hx']==.275 and b['hz']==10)]
    parts=[]
    def part(id,x,y,z,w,h,d,mat='concrete',cover=False,terminal=None):
        p=dict(id=id,x=x,y=y,z=z,w=w,h=h,d=d,mat=mat);parts.append(p)
        b=dict(x=x,z=z,y=y-h/2,hx=w/2,hz=d/2,height=h,surface='metal' if mat in ['steel','rust','dark'] else 'concrete',campaign=True,courtyardPart=id)
        if cover:b['cover']=True;p['cover']=True
        if terminal:b['campaignTerminal']=terminal
        obstacles.append(b)
    # West annexe wall: a real six-metre service entrance and lintel.
    part('annex-west-south',-10,2.7,66.15,.55,5.4,7.7)
    part('annex-west-north',-10,2.7,52.85,.55,5.4,5.7)
    part('annex-service-lintel',-10,4.15,59,.55,2.5,6.3)
    # A roofed connector joins the old triage wing to the existing laboratory.
    for z in [55.5,62.5]:part('connector-side',-12.5,1.55,z,5,.0+3.1,.32,'brick')
    part('connector-roof',-12.5,3.53,59,5.8,.14,7.7)
    # Two rooms, both traversable; the middle screen forces a meaningful choice of angle.
    part('triage-partition',-23.5,1.45,59,.38,2.9,10,'plaster')
    part('triage-north-desk',-28,.55,49.5,3.3,1.1,1.2,'steel',True)
    part('triage-south-cabinet',-29,1.1,68.8,2.4,2.2,.85,'rust',True)
    part('triage-back-desk',-18,.65,66.8,3.3,1.3,1.05,'steel',True)
    # Convoi: staggered cover gives a frontal route, a fallback and free sight lines.
    for id,x,z,w,h,d,mat in [
      ('convoy-west-cover',-39,85,4,1.5,1,'concrete'),
      ('convoy-mid-cover',-25,88,3.6,1.55,1,'concrete'),
      ('convoy-east-cover',-9,80,4,1.55,1,'concrete'),
      ('convoy-crates',-34,78,1.8,1.9,2,'rust'),
      ('service-cover',-47,68,1.4,1.55,4,'concrete'),
      ('annex-door-cover',-5,74,2.2,1.4,1.2,'steel'),
      ('courtyard-shooter-cover',3.8,80.5,2.4,1.55,.7,'concrete')]:part(id,x,h/2,z,w,h,d,mat,True)
    # Concrete foundations and physically supported roof at the abandoned triage point.
    for x in [-35,-25]:
      for z in [76,80]:part('triage-canopy-post',x,1.6,z,.16,3.2,.16,'rust')
    part('triage-canopy-roof',-30,3.25,78,10.8,.12,4.8,'steel')
    controls=[dict(id='isolate-convoy',x=-28,z=82,y=0,label='ISOLER LE DÉPART DU CONVOI'),dict(id='isolate-service',x=-42,z=61,y=0,label='ISOLER LE DÉPART TECHNIQUE')]
    for c in controls:
      part(c['id'],c['x'],.86,c['z']-.48,1.1,1.72,.48,'steel',False,c['id'])
    # These are original coherent vehicle meshes, not piles of floating boxes.
    for c in [dict(x=-20,z=82,w=2.8,d=6,h=1.7,yaw=1.57079632679,kind='rescue',paint='car-cream'),dict(x=-42,z=72,w=2.1,d=4.8,h=1.45,yaw=0,kind='sedan',paint='rust')]:
      index=len(layout['cars']);layout['cars'].append(c)
      obstacles.append(dict(x=c['x'],z=c['z'],hx=(c['d'] if c['yaw'] else c['w'])/2,hz=(c['w'] if c['yaw'] else c['d'])/2,y=0,height=c['h'],surface='metal',cover=True,vehicle=index,campaign=True))
    bounds=dict(minX=-62,maxX=58,minZ=-62,maxZ=98);layout['bounds']=bounds
    for x in [bounds['minX'],bounds['maxX']]:obstacles.append(dict(x=x,z=18,hx=.07,hz=80,y=0,height=1.05,surface='metal',fence=True,campaign=True))
    for z in [bounds['minZ'],bounds['maxZ']]:obstacles.append(dict(x=-2,z=z,hx=60,hz=.07,y=0,height=1.05,surface='metal',fence=True,campaign=True))
    layout['courtyardParts']=parts
    layout['courtyard']=dict(revision='3.63.4',start=dict(x=-50,z=91,y=0),controls=controls,
      approaches=[dict(id='convoy',name='Cour du convoi',points=[[-50,91],[-42,91],[-28,90],[-28,83],[-12,86],[0,77],[0,65],[-6,63]]),
                  dict(id='service',name='Aile technique',points=[[-50,91],[-54,84],[-54,66],[-42,63],[-35,59],[-28,59],[-28,51],[-19,51],[-18,59],[-3.5,59],[-3.5,63],[-6,63]])],
      opening=[dict(x=-49,z=59,form='probe',role='observer',facing=2.5),dict(x=-10,z=82,form='stalker',role='anchor',ranged=True,facing=2.2),dict(x=-22,z=77,form='seer',role='anchor',facing=2.0),dict(x=-49,z=42,form='scuttler',role='screen',facing=2.8),dict(x=-27,z=53,form='synth',role='anchor',facing=3.14),dict(x=-5,z=66,form='stalker',role='anchor',ranged=True,facing=3.14),dict(x=3,z=52,form='stalker',role='screen',facing=3.14),dict(x=4,z=42,form='probe',role='observer',facing=3.14)],
      portals=[[-40,79],[6,85]],powerReinforcements=4)
    # Keep every northern reference point. Only extend the first route into the court.
    layout['route']=[[-50,91,0],[-42,91,0],[-28,90,0],[-28,83,0],[-12,86,0],[0,77,0],[0,72,0]]+layout['route'][1:]
