# Draws the "Where to park for The 808" diagram for No. 18 (Andy, 2026-10-13) from an
# OpenStreetMap extract (api.openstreetmap.org/api/0.6/map?bbox=-83.9135,35.9535,-83.8935,35.9640)
# saved as map.osm beside it, with the venue's own green/rust parking annotations. Output:
# park_map_full.png (2400x1600) -> public/assets/diagrams/the-808-parking.png at 1400 wide.
import math, random, xml.etree.ElementTree as ET
from PIL import Image, ImageDraw, ImageFont, ImageFilter
FONTS='/Users/andyroberts/Projects/sokno_ear_web/scripts/fonts/'
SE=lambda s: ImageFont.truetype(FONTS+'SpecialElite-Regular.ttf', s)
PT=lambda s: ImageFont.truetype(FONTS+'PTSerif-Bold.ttf', s)
INK=(23,21,18); CREAM=(243,232,210); TEAL=(127,174,163); RUST=(169,74,52); GREEN=(61,122,70); GREEN_FILL=(120,176,112); FADED=(120,112,100)
W,H=2400,1600
LON0,LON1=-83.9178,-83.8958; LAT1=35.9656
k=W/(LON1-LON0); cosl=math.cos(math.radians(35.959))
def P(lat,lon): return ((lon-LON0)*k, (LAT1-lat)*k*(1/cosl)*cosl*1.0/cosl*cosl) 
# simpler equirect with aspect correction:
def P(lat,lon): return ((lon-LON0)*k, (LAT1-lat)*k/cosl)
r=ET.parse('map.osm').getroot()
nodes={n.get('id'):(float(n.get('lat')),float(n.get('lon'))) for n in r.findall('node')}
def tags(e): return {t.get('k'):t.get('v') for t in e.findall('tag')}
ways=[(tags(w),[nodes[nd.get('ref')] for nd in w.findall('nd') if nd.get('ref') in nodes], w.get('id')) for w in r.findall('way')]

img=Image.new('RGB',(W,H),CREAM); d=ImageDraw.Draw(img)
# paper grain
noise=Image.effect_noise((W,H),18).convert('L')
grain=Image.new('RGB',(W,H),(232,220,196)); img=Image.composite(img,grain,noise.point(lambda v: 255 if v>118 else 200)); d=ImageDraw.Draw(img)

def poly(pts): return [P(a,b) for a,b in pts]
# river: thick band + hatched edges
for t,pts,_ in ways:
    if t.get('waterway')=='river' and t.get('name')=='Tennessee River':
        pp=poly(pts)
        d.line(pp,fill=INK,width=170,joint='curve'); d.line(pp,fill=TEAL,width=156,joint='curve')
        # hatch lines inside the band for engraving feel
        for i in range(len(pp)-1):
            (x1,y1),(x2,y2)=pp[i],pp[i+1]
            if not(-300<x1<W+300 and -300<y1<H+300): continue
            L=math.hypot(x2-x1,y2-y1); n=int(L/26)
            for j in range(n):
                tt=j/max(n,1); x=x1+(x2-x1)*tt; y=y1+(y2-y1)*tt
                nx,ny=-(y2-y1)/L,(x2-x1)/L
                for off in (-60,-36,-12,12,36,60):
                    d.line([(x+nx*off,y+ny*off),(x+nx*(off+12)+6,y+ny*(off+12))],fill=(96,140,130),width=2)
# roads
W_BY={'motorway':34,'motorway_link':22,'primary':26,'secondary':24,'tertiary':20,'residential':12,'unclassified':10}
for t,pts,_ in ways:
    h=t.get('highway')
    if h in W_BY:
        pp=poly(pts); w=W_BY[h]
        d.line(pp,fill=INK,width=w+6,joint='curve')
for t,pts,_ in ways:
    h=t.get('highway')
    if h in W_BY:
        pp=poly(pts); w=W_BY[h]
        d.line(pp,fill=CREAM if h in('motorway','motorway_link') else (236,224,200),width=w,joint='curve')
        if h in ('motorway','motorway_link'):
            d.line(pp,fill=INK,width=3,joint='curve')
for t,pts,_ in ways:
    if t.get('name') in ('SoKno Rail Trail','Suttree Landing River Walk Greenway','Neyland Greenway'):
        pp=poly(pts)
        for i in range(len(pp)-1):
            (x1,y1),(x2,y2)=pp[i],pp[i+1]; L=math.hypot(x2-x1,y2-y1); n=max(int(L/18),1)
            for j in range(0,n,2):
                a=j/n; b=min((j+1)/n,1)
                d.line([(x1+(x2-x1)*a,y1+(y2-y1)*a),(x1+(x2-x1)*b,y1+(y2-y1)*b)],fill=FADED,width=5)

def text_along(text, p1, p2, font, fill=INK, offset=0):
    (x1,y1),(x2,y2)=p1,p2
    ang=math.degrees(math.atan2(-(y2-y1),x2-x1))
    if ang>90: ang-=180
    if ang<-90: ang+=180
    bb=d.textbbox((0,0),text,font=font); tw,th=bb[2]-bb[0],bb[3]-bb[1]
    tmp=Image.new('RGBA',(tw+40,th+40),(0,0,0,0)); ImageDraw.Draw(tmp).text((20-bb[0],20-bb[1]),text,font=font,fill=fill)
    rot=tmp.rotate(ang,expand=True,resample=Image.BICUBIC)
    cx,cy=(x1+x2)/2,(y1+y2)/2
    nx,ny=-(y2-y1),(x2-x1); L=math.hypot(nx,ny) or 1; nx,ny=nx/L,ny/L
    if ny>0: nx,ny=-nx,-ny
    cx+=nx*offset; cy+=ny*offset
    img.paste(rot,(int(cx-rot.width/2),int(cy-rot.height/2)),rot)

def seg_of(name, lat, lon, wid=None):
    best=None
    for t,pts,i in ways:
        if t.get('name')!=name or 'highway' not in t: continue
        if wid and i!=wid: continue
        for a in range(len(pts)-1):
            m=((pts[a][0]+pts[a+1][0])/2,(pts[a][1]+pts[a+1][1])/2)
            dd=(m[0]-lat)**2+((m[1]-lon)*cosl)**2
            if best is None or dd<best[0]: best=(dd,P(*pts[a]),P(*pts[a+1]))
    return best[1],best[2]
labels=[('Sevier Ave',35.9565,-83.9120,'Sevier Avenue Southeast',40),('Sevier Ave',35.9590,-83.9048,'Sevier Avenue Southeast',40),
 ('Island Home Ave',35.9605,-83.8985,'Island Home Avenue',40),('James White Pkwy',35.9627,-83.9035,'James White Parkway',40),
 ('Langford Ave',35.9603,-83.9058,'Langford Avenue Southeast',40),('Phillips Ave',35.9611,-83.9020,'Phillips Avenue Southeast',40),
 ('Davenport Rd',35.9565,-83.9065,'Davenport Road',40),('Barber St',35.9580,-83.9070,'Barber Street',38),('E Blount Ave',35.9575,-83.9120,'East Blount Avenue',38),
 ('Waterfront Dr',35.9612,-83.9068,'Waterfront Drive',38),('Atchley St',35.9560,-83.9095,'Atchley Street',38),('McCormick St',35.9598,-83.9028,'McCormick Street',36),('Dixie St',35.9585,-83.9043,'Dixie Street Southeast',36)]
for text,lat,lon,name,sz in labels:
    try:
        a,b=seg_of(name,lat,lon)
    except Exception as e:
        print('no seg',name); continue
    # extend the segment direction using neighbours for a stable angle
    text_along(text,a,b,SE(sz),fill=INK,offset=0 if name in('James White Parkway',) else 34)
# river label
text_along('Tennessee River',P(35.9627,-83.9005),P(35.9618,-83.8975),PT(50),fill=(40,70,64))

# ---- annotations ----
def star(c,rad,fill):
    x,y=c; pts=[]
    for i in range(10):
        a=-math.pi/2+i*math.pi/5; rr=rad if i%2==0 else rad*0.45
        pts.append((x+rr*math.cos(a),y+rr*math.sin(a)))
    d.polygon(pts,fill=fill,outline=INK)
def green_poly(pts, label=None, lpos=None, font=PT(40)):
    pp=poly(pts); d.polygon(pp,fill=GREEN_FILL,outline=INK)
    # hatch
    xs=[p[0] for p in pp]; ys=[p[1] for p in pp]
    d.polygon(pp,fill=GREEN_FILL,outline=GREEN)
    d.line(pp+[pp[0]],fill=GREEN,width=6)
def green_stroke(name, lat_a, lon_a, lat_b, lon_b, side=1):
    # thick green dashed stroke along the named way between two points, projected onto the line
    def proj(pts, target):
        best=None
        for q in range(len(pts)-1):
            (ax,ay),(bx,by)=P(*pts[q]),P(*pts[q+1]); tx,ty=P(*target)
            dx,dy=bx-ax,by-ay; L2=dx*dx+dy*dy or 1
            t=max(0,min(1,((tx-ax)*dx+(ty-ay)*dy)/L2)); px,py=ax+dx*t,ay+dy*t
            dd=(px-tx)**2+(py-ty)**2
            if best is None or dd<best[0]: best=(dd,q,t,(px,py))
        return best
    cands=[]
    for t,pts,i in ways:
        if t.get('name')!=name or 'highway' not in t or len(pts)<2: continue
        a=proj(pts,(lat_a,lon_a)); b=proj(pts,(lat_b,lon_b))
        cands.append((a[0]+b[0],pts,a,b))
    if not cands: return None
    _,pts,a,b=min(cands,key=lambda c:c[0])
    (qa,ta,pa),(qb,tb,pb)=a[1:],b[1:]
    if (qa,ta)>(qb,tb): (qa,ta,pa),(qb,tb,pb)=(qb,tb,pb),(qa,ta,pa)
    pp=[pa]+[P(*pts[q]) for q in range(qa+1,qb+1)]+[pb]
    out=[]
    for q in range(len(pp)):
        (x1,y1)=pp[max(q-1,0)]; (x2,y2)=pp[min(q+1,len(pp)-1)]
        nx,ny=-(y2-y1),(x2-x1); L=math.hypot(nx,ny) or 1
        out.append((pp[q][0]+side*22*nx/L,pp[q][1]+side*22*ny/L))
    d.line(out,fill=GREEN,width=16,joint='curve')
    for q in range(len(out)-1):
        (x1,y1),(x2,y2)=out[q],out[q+1]; L=math.hypot(x2-x1,y2-y1); n=max(int(L/30),1)
        for j in range(1,n,2):
            aa=j/n; bb=min((j+0.5)/n,1)
            d.line([(x1+(x2-x1)*aa,y1+(y2-y1)*aa),(x1+(x2-x1)*bb,y1+(y2-y1)*bb)],fill=CREAM,width=6)
    return out
def callout(x,y,lines,anchor,font_title=PT(42),font_body=SE(32),color=GREEN,tx=None,ty=None):
    # box with pointer
    bb=[d.textbbox((0,0),l,font=(font_title if i==0 else font_body)) for i,l in enumerate(lines)]
    tw=max(b[2]-b[0] for b in bb)+44; th=sum(b[3]-b[1]+14 for b in bb)+30
    bx,by=(tx if tx is not None else x+anchor[0]),(ty if ty is not None else y+anchor[1])
    d.line([(x,y),(bx+tw/2,by+th/2)],fill=color,width=6)
    d.rounded_rectangle([bx,by,bx+tw,by+th],radius=14,fill=(250,244,230),outline=color,width=6)
    cy=by+14
    for i,l in enumerate(lines):
        f=font_title if i==0 else font_body; b=d.textbbox((0,0),l,font=f)
        d.text((bx+22-b[0],cy-b[1]),l,font=f,fill=(color if i==0 else INK)); cy+=b[3]-b[1]+14
    d.ellipse([x-12,y-12,x+12,y+12],fill=color,outline=INK,width=3)

# green: underpass lot (OSM outline)
for t,pts,i in ways:
    if i=='686757700': green_poly(pts); lot_c=P(35.96142,-83.90283)
d.ellipse([lot_c[0]-70,lot_c[1]-70,lot_c[0]+70,lot_c[1]+70],outline=GREEN,width=8)
callout(lot_c[0],lot_c[1]-70,['Public lot under the James White Pkwy','gravel · off Island Home Ave · the overflow for shows','about a ten-minute walk to The 808'],(0,0),tx=lot_c[0]-420,ty=lot_c[1]-470)
# green: HoneyBee free lot — around the Honeybee building
hb=P(35.95737,-83.90896)
d.rounded_rectangle([hb[0]-80,hb[1]-52,hb[0]+80,hb[1]+52],radius=12,fill=GREEN_FILL,outline=GREEN,width=6)
d.text((hb[0]-62,hb[1]-22),'HoneyBee',font=PT(34),fill=(250,244,230))
callout(hb[0]+80,hb[1]+30,['HoneyBee free lot','the green box: across Sevier Ave from the venue'],(0,0),tx=1250,ty=1330)
# green: street parking strokes
s1=green_stroke('Sevier Avenue Southeast',35.9571,-83.9101,35.9580,-83.9078,side=-1); s1b=green_stroke('Sevier Avenue Southeast',35.95655,-83.9118,35.95711,-83.91007,side=-1)
s2=green_stroke('Langford Avenue Southeast',35.9597,-83.90765,35.96086,-83.904,side=1)
s3=green_stroke('Phillips Avenue Southeast',35.9588,-83.90845,35.96086,-83.904,side=-1)
s4=green_stroke('Phillips Avenue Southeast',35.96086,-83.904,35.96119,-83.90004,side=-1)
lp=P(35.9603,-83.9058); callout(lp[0],lp[1],['Street parking','Langford Ave and Phillips Ave,','the blocks north of the venue'],(0,0),tx=lp[0]-700,ty=lp[1]-250)
sp=P(35.95700,-83.9105); callout(sp[0],sp[1]-40,['Street parking','along Sevier Ave west of the venue'],(0,0),tx=70,ty=1370)
# venue
v=P(35.95782,-83.90724); star(v,46,RUST)
d.text((v[0]+60,v[1]-40),'THE 808',font=PT(60),fill=RUST,stroke_width=3,stroke_fill=CREAM)
d.text((v[0]+62,v[1]+24),'808 Sevier Ave',font=SE(34),fill=INK)
# rust: Borderland lot next door (802 Sevier), and across from Trailhead
def nomark(x,y,lines,anchor):
    d.ellipse([x-26,y-26,x+26,y+26],fill=(250,244,230),outline=RUST,width=7)
    d.line([(x-15,y-15),(x+15,y+15)],fill=RUST,width=8); d.line([(x-15,y+15),(x+15,y-15)],fill=RUST,width=8)
    callout(x,y,lines,anchor,color=RUST,tx=(x-200 if 'Trailhead' in lines[0] else 1250),ty=(y+190 if 'Trailhead' in lines[0] else 1180))
b=P(35.95792,-83.90773); nomark(b[0],b[1],['Not here: Borderland Tees lot','next door to the venue · it tows'],(0,0))
th=P(35.96052,-83.90005); star(th,28,TEAL); d.text((th[0]+36,th[1]-18),'Trailhead Beer Market',font=PT(36),fill=INK,stroke_width=3,stroke_fill=CREAM)
nm=P(35.96085,-83.90010); nomark(nm[0],nm[1],['Not across from Trailhead','the lot across Island Home Ave'],(0,0),)
pr=P(35.96035,-83.89673); star(pr,24,TEAL); d.text((pr[0]-140,pr[1]+30),'Printshop',font=PT(34),fill=INK,stroke_width=3,stroke_fill=CREAM)
al=P(35.95935,-83.90355); star(al,24,TEAL); d.text((al[0]-120,al[1]+34),'Alliance Brewing',font=PT(34),fill=INK,stroke_width=3,stroke_fill=CREAM)
# title plate
d.rounded_rectangle([40,40,1010,230],radius=18,fill=(250,244,230),outline=INK,width=6)
d.text((70,58),'WHERE TO PARK FOR THE 808',font=PT(64),fill=INK)
d.text((72,140),'Green: park here · Rust: not here · from the venue\'s own map',font=SE(34),fill=FADED)
# north arrow + scale
d.line([(W-120,180),(W-120,70)],fill=INK,width=6); d.polygon([(W-120,50),(W-140,95),(W-100,95)],fill=INK); d.text((W-138,190),'N',font=PT(40),fill=INK)
m200=200/ (111320*0.00001*cosl) * 0.00001 * k / cosl  # placeholder, recomputed below
px_per_m = k/ (111320*cosl)
d.line([(W-420,H-80),(W-420+px_per_m*300,H-80)],fill=INK,width=8); d.text((W-420,H-130),'300 m',font=SE(34),fill=INK)
d.text((60,H-70),'Streets from OpenStreetMap · parking from The 808 (@808knox), Oct 8, 2026',font=SE(30),fill=FADED)
img.save('park_map_full.png'); img.resize((1200,800),Image.LANCZOS).save('park_map_preview.png'); print('rendered')
