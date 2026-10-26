"""Option A, lot 2: traversable repair workshop and loading yard, shared art/physics."""
def extend_workshop(layout):
    parts=layout['courtyardParts'];obs=layout['obstacles']
    def part(id,x,y,z,w,h,d,mat='brick',cover=False):
        parts.append(dict(id=id,x=x,y=y,z=z,w=w,h=h,d=d,mat=mat,cover=cover))
        obs.append(dict(x=x,z=z,y=y-h/2,hx=w/2,hz=d/2,height=h,surface='metal' if mat in ['steel','rust','dark'] else 'concrete',campaign=True,courtyardPart=id,cover=cover))
    # Single-storey repair wing, grounded walls and supported partial roof.
    # South entrance x=-62; north exit x=-45. The second route uses the eastern yard.
    for x,w in [(-67,4),(-48,20)]:part('workshop-south-wall',x,1.85,39,w,3.7,.35)
    for x,w in [(-58,22),(-39,2)]:part('workshop-north-wall',x,1.85,11,w,3.7,.35)
    part('workshop-west-sill',-69,.70,25,.35,1.4,28)
    part('workshop-west-lintel',-69,3.45,25,.35,.5,28)
    for z in [12,20,28,38]:part('workshop-west-pier',-69,2.3,z,.35,1.8,2)
    for z,d in [(16,10),(35,8)]:part('workshop-east-wall',-38,1.85,z,.35,3.7,d)
    # Two bays connected through wide openings, never a dead-end fetch corridor.
    part('workshop-partition',-54,1.35,29,.30,2.7,12,'plaster')
    part('workshop-screen',-47,1.35,21,10,2.7,.30,'plaster')
    for x in [-66,-40]:
        for z in [14,36]:part('workshop-column',x,1.85,z,.26,3.7,.26,'steel')
    part('workshop-roof-west',-62,3.78,25,14,.16,28,'concrete')
    part('workshop-roof-north',-46,3.78,15,16,.16,8,'concrete')
    # Cover is human-scale and follows the visible surfaces.
    for id,x,z,w,d,h,mat in [
      ('workshop-lathe',-62,26,3.2,1.3,1.2,'steel'),
      ('workshop-bench',-44,16,4,1,1.12,'rust'),
      ('workshop-rack',-51,34,1.6,3,1.8,'steel'),
      ('yard-cover-south',-35.4,31,1.2,4,1.35,'concrete'),
      ('yard-cover-north',-42,6,4,1,1.35,'concrete'),
      ('yard-wall-west',-64,6,5,1.2,1.45,'concrete')]:part(id,x,h/2,z,w,h,d,mat,True)
    control=dict(id='workshop',x=-63,z=16,y=0,label='RÉTABLIR LA LIAISON LOCALE')
    part('workshop-electrical-cabinet',-63,1,15.45,1.5,2,.6,'steel')
    obs[-1]['campaignTerminal']='workshop'
    # Broaden only the west side for this progressive delivery. Keep all canonical poles.
    obs[:]=[b for b in obs if not b.get('fence')]
    bounds=dict(minX=-78,maxX=58,minZ=-62,maxZ=98);layout['bounds']=bounds
    for x in [bounds['minX'],bounds['maxX']]:obs.append(dict(x=x,z=18,hx=.07,hz=80,y=0,height=1.05,surface='metal',fence=True,campaign=True))
    for z in [bounds['minZ'],bounds['maxZ']]:obs.append(dict(x=-10,z=z,hx=68,hz=.07,y=0,height=1.05,surface='metal',fence=True,campaign=True))
    layout['workshop']=dict(revision='3.63.9',control=control,
      portals=[[-74,27],[-60,5],[-42,44]],
      approaches=[dict(id='repair',name='Atelier des réparateurs',points=[[0,47],[-12,46],[-36,43],[-62,43],[-62,34],[-58,34],[-58,20],[-63,20],[-63,17.5]]),
       dict(id='yard',name='Cour de livraison',points=[[0,47],[-12,46],[-35,43],[-34,36],[-34,28],[-41,28],[-50,25],[-53,25],[-53,19],[-58,19],[-63,17.5]])],
      toJournal=[[-63,17.5],[-58,19],[-53,19],[-53,25],[-50,28],[-41,28],[-34,28],[-34,20],[-28,20],[-21,21.5]],
      coverPoints=[[-66,31],[-58,24],[-44,29],[-35,17]])
