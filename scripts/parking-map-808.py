# Draws the "Where to park for The 808" diagram for No. 18 (Andy, 2026-10-13) from an
# OpenStreetMap extract (api.openstreetmap.org/api/0.6/map?bbox=-83.9135,35.9535,-83.8935,35.9640)
# saved as map.osm beside it, with the venue's own green/rust parking annotations. Output:
# park_map_full.png (2400x1600) -> public/assets/diagrams/the-808-parking.png at 1400 wide.
import math, xml.etree.ElementTree as ET
from PIL import Image, ImageDraw, ImageFont
FONTS='/Users/andyroberts/Projects/sokno_ear_web/scripts/fonts/'
SE=lambda s: ImageFont.truetype(FONTS+'SpecialElite-Regular.ttf', s)
PT=lambda s: ImageFont.truetype(FONTS+'PTSerif-Bold.ttf', s)
INK=(23,21,18); CREAM=(243,232,210); PLATE=(250,244,230); TEAL=(127,174,163); RUST=(169,74,52)
GREEN=(61,122,70); GREEN_FILL=(120,176,112); FADED=(120,112,100); ROAD=(236,224,200)
W,H=2400,1600
LON0,LON1=-83.9178,-83.8958; LAT1=35.9656
k=W/(LON1-LON0); cosl=math.cos(math.radians(35.959))
def P(lat,lon): return ((lon-LON0)*k, (LAT1-lat)*k/cosl)
px_per_m = k/(111320*cosl)
r=ET.parse('map.osm').getroot()
nodes={n.get('id'):(float(n.get('lat')),float(n.get('lon'))) for n in r.findall('node')}
def tags(e): return {t.get('k'):t.get('v') for t in e.findall('tag')}
ways=[(tags(w),[nodes[nd.get('ref')] for nd in w.findall('nd') if nd.get('ref') in nodes], w.get('id')) for w in r.findall('way')]
poly=lambda pts:[P(a,b) for a,b in pts]

img=Image.new('RGB',(W,H),CREAM)
noise=Image.effect_noise((W,H),18).convert('L'); grain=Image.new('RGB',(W,H),(232,220,196))
img=Image.composite(img,grain,noise.point(lambda v: 255 if v>118 else 200)); d=ImageDraw.Draw(img)

# ---------- base map ----------
for t,pts,_ in ways:
    if t.get('waterway')=='river' and t.get('name')=='Tennessee River':
        pp=poly(pts); d.line(pp,fill=INK,width=170,joint='curve'); d.line(pp,fill=TEAL,width=156,joint='curve')
        for i in range(len(pp)-1):
            (x1,y1),(x2,y2)=pp[i],pp[i+1]
            if not(-300<x1<W+300 and -300<y1<H+300): continue
            L=math.hypot(x2-x1,y2-y1); n=int(L/26)
            for j in range(n):
                tt=j/max(n,1); x=x1+(x2-x1)*tt; y=y1+(y2-y1)*tt; nx,ny=-(y2-y1)/L,(x2-x1)/L
                for off in (-60,-36,-12,12,36,60): d.line([(x+nx*off,y+ny*off),(x+nx*(off+12)+6,y+ny*(off+12))],fill=(96,140,130),width=2)
W_BY={'motorway':34,'motorway_link':22,'primary':26,'secondary':24,'tertiary':20,'residential':12,'unclassified':10}
for t,pts,_ in ways:
    if t.get('highway') in W_BY: d.line(poly(pts),fill=INK,width=W_BY[t['highway']]+6,joint='curve')
for t,pts,_ in ways:
    h=t.get('highway')
    if h in W_BY:
        pp=poly(pts); d.line(pp,fill=CREAM if h.startswith('motorway') else ROAD,width=W_BY[h],joint='curve')
        if h.startswith('motorway'): d.line(pp,fill=INK,width=3,joint='curve')
for t,pts,_ in ways:
    if t.get('name') in ('SoKno Rail Trail','Suttree Landing River Walk Greenway','Neyland Greenway'):
        pp=poly(pts)
        for i in range(len(pp)-1):
            (x1,y1),(x2,y2)=pp[i],pp[i+1]; L=math.hypot(x2-x1,y2-y1); n=max(int(L/18),1)
            for j in range(0,n,2):
                a=j/n; b=min((j+1)/n,1); d.line([(x1+(x2-x1)*a,y1+(y2-y1)*a),(x1+(x2-x1)*b,y1+(y2-y1)*b)],fill=FADED,width=5)

def text_along(text,p1,p2,font,fill=INK,offset=0):
    (x1,y1),(x2,y2)=p1,p2; ang=math.degrees(math.atan2(-(y2-y1),x2-x1))
    if ang>90: ang-=180
    if ang<-90: ang+=180
    bb=d.textbbox((0,0),text,font=font); tw,th=bb[2]-bb[0],bb[3]-bb[1]
    tmp=Image.new('RGBA',(tw+40,th+40),(0,0,0,0)); ImageDraw.Draw(tmp).text((20-bb[0],20-bb[1]),text,font=font,fill=fill)
    rot=tmp.rotate(ang,expand=True,resample=Image.BICUBIC); cx,cy=(x1+x2)/2,(y1+y2)/2
    nx,ny=-(y2-y1),(x2-x1); L=math.hypot(nx,ny) or 1; nx,ny=nx/L,ny/L
    if ny>0: nx,ny=-nx,-ny
    img.paste(rot,(int(cx+nx*offset-rot.width/2),int(cy+ny*offset-rot.height/2)),rot)
def seg_of(name,lat,lon):
    best=None
    for t,pts,i in ways:
        if t.get('name')!=name or 'highway' not in t: continue
        for a in range(len(pts)-1):
            m=((pts[a][0]+pts[a+1][0])/2,(pts[a][1]+pts[a+1][1])/2); dd=(m[0]-lat)**2+((m[1]-lon)*cosl)**2
            if best is None or dd<best[0]: best=(dd,P(*pts[a]),P(*pts[a+1]))
    return best[1],best[2]
for text,lat,lon,name,sz in [('Sevier Ave',35.9565,-83.9120,'Sevier Avenue Southeast',40),('Sevier Ave',35.9590,-83.9048,'Sevier Avenue Southeast',40),
 ('Island Home Ave',35.96035,-83.9032,'Island Home Avenue',40),('James White Pkwy',35.9627,-83.9035,'James White Parkway',40),
 ('Langford Ave',35.9603,-83.9058,'Langford Avenue Southeast',40),('Phillips Ave',35.9611,-83.9020,'Phillips Avenue Southeast',40),
 ('Davenport Rd',35.9565,-83.9065,'Davenport Road',40),('Barber St',35.9580,-83.9070,'Barber Street',38),('E Blount Ave',35.9575,-83.9120,'East Blount Avenue',38),
 ('Waterfront Dr',35.9612,-83.9068,'Waterfront Drive',38),('Atchley St',35.9560,-83.9095,'Atchley Street',38),('McCormick St',35.9598,-83.9028,'McCormick Street',36),('Dixie St',35.9585,-83.9043,'Dixie Street Southeast',36)]:
    a,b=seg_of(name,lat,lon); text_along(text,a,b,SE(sz),offset=0 if name=='James White Parkway' else 34)
text_along('Tennessee River',P(35.9627,-83.9005),P(35.9618,-83.8975),PT(50),fill=(40,70,64))

# ---------- helpers ----------
def star(c,rad,fill,outline=INK):
    x,y=c; pts=[(x+(rad if i%2==0 else rad*0.45)*math.cos(-math.pi/2+i*math.pi/5), y+(rad if i%2==0 else rad*0.45)*math.sin(-math.pi/2+i*math.pi/5)) for i in range(10)]
    d.polygon(pts,fill=fill,outline=outline)
def box(tx,ty,lines,color,font_title=PT(42),font_body=SE(32)):
    bb=[d.textbbox((0,0),l,font=(font_title if i==0 else font_body)) for i,l in enumerate(lines)]
    tw=max(b[2]-b[0] for b in bb)+44; th=sum(b[3]-b[1]+14 for b in bb)+30
    d.rounded_rectangle([tx,ty,tx+tw,ty+th],radius=14,fill=PLATE,outline=color,width=6)
    cy=ty+14
    for i,l in enumerate(lines):
        f=font_title if i==0 else font_body; b=d.textbbox((0,0),l,font=f)
        d.text((tx+22-b[0],cy-b[1]),l,font=f,fill=(color if i==0 else INK)); cy+=b[3]-b[1]+14
    return (tx,ty,tx+tw,ty+th)
def leader(p,rect,color):
    # line from the point to the nearest edge-midpoint of the box, drawn under the box
    x,y=p; x0,y0,x1,y1=rect
    cands=[((x0+x1)/2,y0),((x0+x1)/2,y1),(x0,(y0+y1)/2),(x1,(y0+y1)/2)]
    q=min(cands,key=lambda c:(c[0]-x)**2+(c[1]-y)**2)
    d.line([p,q],fill=color,width=6); d.ellipse([x-11,y-11,x+11,y+11],fill=color,outline=INK,width=3)
def callout(p,lines,tx,ty,color):
    rect=box(tx,ty,lines,color); leader(p,rect,color); box(tx,ty,lines,color)  # box twice so it sits over the leader
def nomark(p):
    x,y=p; d.ellipse([x-26,y-26,x+26,y+26],fill=PLATE,outline=RUST,width=7)
    d.line([(x-15,y-15),(x+15,y+15)],fill=RUST,width=8); d.line([(x-15,y+15),(x+15,y-15)],fill=RUST,width=8)
def green_stroke(name,lat_a,lon_a,lat_b,lon_b,side=1):
    def proj(pts,target):
        best=None
        for q in range(len(pts)-1):
            (ax,ay),(bx,by)=P(*pts[q]),P(*pts[q+1]); tx,ty=P(*target); dx,dy=bx-ax,by-ay; L2=dx*dx+dy*dy or 1
            t=max(0,min(1,((tx-ax)*dx+(ty-ay)*dy)/L2)); px,py=ax+dx*t,ay+dy*t; dd=(px-tx)**2+(py-ty)**2
            if best is None or dd<best[0]: best=(dd,q,t,(px,py))
        return best
    cands=[]
    for t,pts,i in ways:
        if t.get('name')!=name or 'highway' not in t or len(pts)<2: continue
        a=proj(pts,(lat_a,lon_a)); b=proj(pts,(lat_b,lon_b)); cands.append((a[0]+b[0],pts,a,b))
    _,pts,a,b=min(cands,key=lambda c:c[0]); (qa,ta,pa),(qb,tb,pb)=a[1:],b[1:]
    if (qa,ta)>(qb,tb): (qa,ta,pa),(qb,tb,pb)=(qb,tb,pb),(qa,ta,pa)
    pp=[pa]+[P(*pts[q]) for q in range(qa+1,qb+1)]+[pb]; out=[]
    for q in range(len(pp)):
        (x1,y1)=pp[max(q-1,0)]; (x2,y2)=pp[min(q+1,len(pp)-1)]; nx,ny=-(y2-y1),(x2-x1); L=math.hypot(nx,ny) or 1
        out.append((pp[q][0]+side*22*nx/L,pp[q][1]+side*22*ny/L))
    d.line(out,fill=GREEN,width=16,joint='curve')
    for q in range(len(out)-1):
        (x1,y1),(x2,y2)=out[q],out[q+1]; L=math.hypot(x2-x1,y2-y1); n=max(int(L/30),1)
        for j in range(1,n,2):
            aa=j/n; bb=min((j+0.5)/n,1); d.line([(x1+(x2-x1)*aa,y1+(y2-y1)*aa),(x1+(x2-x1)*bb,y1+(y2-y1)*bb)],fill=CREAM,width=6)
    return out

# ---------- where the parkway crosses Island Home Ave ----------
def segs(name,kinds):
    out=[]
    for t,pts,_ in ways:
        if t.get('name')==name and t.get('highway') in kinds:
            pp=poly(pts); out+= [(pp[i],pp[i+1]) for i in range(len(pp)-1)]
    return out
def intersect(s1,s2):
    (x1,y1),(x2,y2)=s1; (x3,y3),(x4,y4)=s2; den=(x1-x2)*(y3-y4)-(y1-y2)*(x3-x4)
    if abs(den)<1e-9: return None
    t=((x1-x3)*(y3-y4)-(y1-y3)*(x3-x4))/den; u=-((x1-x2)*(y1-y3)-(y1-y2)*(x1-x3))/den
    return (x1+t*(x2-x1),y1+t*(y2-y1),s1) if 0<=t<=1 and 0<=u<=1 else None
hits=[]
for a in segs('James White Parkway',('motorway',)):
    for b in segs('Island Home Avenue',('tertiary','residential','secondary')):
        h=intersect(a,b)
        if h: hits.append(h)
cx=sum(h[0] for h in hits)/len(hits); cy=sum(h[1] for h in hits)/len(hits)
(ax,ay),(bx,by)=hits[0][2]; ang=math.atan2(by-ay,bx-ax); ux,uy=math.cos(ang),math.sin(ang); vx,vy=-uy,ux
Lh,Wh=px_per_m*45,px_per_m*48   # a lot ~90 m along the bridge, ~95 m wide, straddling the road
lot=[(cx+ux*Lh+vx*Wh,cy+uy*Lh+vy*Wh),(cx-ux*Lh+vx*Wh,cy-uy*Lh+vy*Wh),(cx-ux*Lh-vx*Wh,cy-uy*Lh-vy*Wh),(cx+ux*Lh-vx*Wh,cy+uy*Lh-vy*Wh)]
d.polygon(lot,fill=GREEN_FILL,outline=GREEN); d.line(lot+[lot[0]],fill=GREEN,width=6)
print('underpass lot at px',round(cx),round(cy),'hits',len(hits))

# ---------- the other lots ----------
# Suttree Landing's city lot (OSM outline): public, but not on the venue's map, so ink not green
for t,pts,i in ways:
    if i=='686757700':
        pp=poly(pts); d.polygon(pp,fill=(226,214,190),outline=INK); d.line(pp+[pp[0]],fill=INK,width=4); sc=P(35.96142,-83.90283)
d.text((sc[0]-110,sc[1]-150),'Suttree Landing city lot',font=PT(32),fill=INK,stroke_width=3,stroke_fill=CREAM); d.text((sc[0]-110,sc[1]-112),'(public, but not on the venue map)',font=SE(26),fill=FADED,stroke_width=3,stroke_fill=CREAM)
# HoneyBee's lot: behind the building, the side away from Sevier Ave (Andy, 2026-10-13)
hbb=P(35.95737,-83.90896)                      # the coffee shop
hb=(hbb[0]+px_per_m*30, hbb[1]+px_per_m*34)     # ~45 m behind it
d.rounded_rectangle([hb[0]-70,hb[1]-50,hb[0]+70,hb[1]+50],radius=12,fill=GREEN_FILL,outline=GREEN,width=6)
d.rounded_rectangle([hbb[0]-34,hbb[1]-24,hbb[0]+34,hbb[1]+24],radius=6,fill=ROAD,outline=INK,width=3)
d.text((hbb[0]-290,hbb[1]+40),'HoneyBee Coffee',font=PT(30),fill=INK,stroke_width=3,stroke_fill=CREAM)
# street parking
green_stroke('Sevier Avenue Southeast',35.9571,-83.9101,35.9580,-83.9078,side=-1); green_stroke('Sevier Avenue Southeast',35.95655,-83.9118,35.95711,-83.91007,side=-1)
green_stroke('Langford Avenue Southeast',35.9597,-83.90765,35.96086,-83.904,side=1)
green_stroke('Phillips Avenue Southeast',35.9588,-83.90845,35.96086,-83.904,side=-1); green_stroke('Phillips Avenue Southeast',35.96086,-83.904,35.96119,-83.90004,side=-1)

# ---------- venues ----------
v=P(35.95782,-83.90724); star(v,48,INK,outline=CREAM); star(v,30,CREAM,outline=INK)
d.text((v[0]+62,v[1]-44),'THE 808',font=PT(62),fill=INK,stroke_width=4,stroke_fill=CREAM); d.text((v[0]+64,v[1]+26),'808 Sevier Ave',font=SE(34),fill=INK,stroke_width=3,stroke_fill=CREAM)
for name,lat,lon,dx,dy in [('Trailhead',35.96052,-83.90005,26,16),('Printshop',35.96035,-83.89673,-90,30),('Alliance Brewing',35.95935,-83.90355,-130,32)]:
    p=P(lat,lon); d.ellipse([p[0]-16,p[1]-16,p[0]+16,p[1]+16],fill=INK,outline=CREAM,width=3)
    d.text((p[0]+dx,p[1]+dy),name,font=PT(34),fill=INK,stroke_width=4,stroke_fill=CREAM)

# ---------- no-park marks ----------
bl=P(35.95775,-83.90800); nomark(bl)                    # the Borderland Tees lot, next door
tr=P(35.96052,-83.90005); nx=P(35.96018,-83.90000); nomark(nx)   # across Island Home Ave from Trailhead, the river side

# ---------- callouts: each leader runs clear of the others ----------
callout((cx,cy-Wh*0.6),['Public lot under the James White Pkwy','gravel · where the parkway crosses Island Home Ave','the overflow for shows · about a fifteen-minute walk'],tx=1180,ty=60,color=GREEN)
callout(nx,['Not across from Trailhead','the river side of Island Home Ave'],tx=1690,ty=880,color=RUST)
lp=P(35.9603,-83.9058); callout(lp,['Street parking','Langford Ave and Phillips Ave,','the blocks north of the venue'],tx=lp[0]-700,ty=lp[1]-250,color=GREEN)
sp=P(35.95700,-83.9105); callout((sp[0],sp[1]-40),['Street parking','along Sevier Ave west of the venue'],tx=70,ty=1370,color=GREEN)
callout(bl,['Not here: Borderland Tees lot','next door to the venue · it tows'],tx=1420,ty=1190,color=RUST)
callout((hb[0],hb[1]+50),['HoneyBee free lot','behind the coffee shop, across Sevier Ave'],tx=760,ty=1370,color=GREEN)

# ---------- plate, arrow, scale ----------
t1='WHERE TO PARK FOR THE 808'; t2="Green: park here · Rust: not here · from the venue's own map"
b1=d.textbbox((0,0),t1,font=PT(64)); b2=d.textbbox((0,0),t2,font=SE(34)); pw=max(b1[2],b2[2])+70
d.rounded_rectangle([40,40,40+pw,230],radius=18,fill=PLATE,outline=INK,width=6)
d.text((70,58),t1,font=PT(64),fill=INK); d.text((72,140),t2,font=SE(34),fill=FADED)
d.line([(W-120,180),(W-120,70)],fill=INK,width=6); d.polygon([(W-120,50),(W-140,95),(W-100,95)],fill=INK); d.text((W-138,190),'N',font=PT(40),fill=INK)
d.line([(W-420,H-80),(W-420+px_per_m*300,H-80)],fill=INK,width=8); d.text((W-420,H-130),'300 m',font=SE(34),fill=INK)
d.text((60,H-60),'Streets from OpenStreetMap · parking from The 808 (@808knox), Oct 8, 2026',font=SE(28),fill=FADED)
img.save('park_map_full.png'); img.resize((1200,800),Image.LANCZOS).save('park_map_preview.png'); print('rendered')
