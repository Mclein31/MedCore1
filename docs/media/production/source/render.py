"""Reproducible MedCore film compositor. Python 3 + Pillow; FFmpeg 7 with libx264/libass.
Run from any directory: python render.py --prepare; --render; --assemble.
FFMPEG env overrides the local discovered encoder. Original UI pixels stay intact.
"""
from pathlib import Path
import argparse, json, os, subprocess, shutil, concurrent.futures, re
from PIL import Image, ImageDraw, ImageFont, ImageOps
ROOT=Path(__file__).resolve().parents[1]
MEDIA=ROOT.parent
ASSETS=MEDIA/'assets'
GRAPHICS=ROOT/'graphics'
SHOTS=ROOT/'renders'
W,H=1920,1080
BG='#F5F6F8'; NAVY='#0F2A4A'; INK='#0F172A'; TEAL='#11806D'; MUTED='#475569'; LINE='#E2E8F0'
FONT=os.environ.get('MEDCORE_FONT','/System/Library/Fonts/Avenir Next.ttc')
FFMPEG=os.environ.get('FFMPEG') or shutil.which('ffmpeg') or '/private/tmp/medcore-film-deps/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1'

def font(n,bold=False):
    # Avenir Next gives the editorial cards a warmer, more confident weight.
    # TTC faces: 0 Bold, 7 Regular. Keep bold upright (not the adjacent italic face).
    return ImageFont.truetype(FONT,n,index=0 if bold else 7)
def canvas(color=(0,0,0,0),size=(W,H)):
    return Image.new('RGBA',size,color)
def text(im,xy,s,size=40,color=INK,bold=False,width=None,spacing=12):
    d=ImageDraw.Draw(im); x,y=xy
    lines=[]
    for para in s.split('\n'):
        if not width: lines.append(para); continue
        words=para.split(); line=''
        for word in words:
            candidate=(line+' '+word).strip()
            if d.textlength(candidate,font=font(size,bold))>width and line:
                lines.append(line);line=word
            else:line=candidate
        lines.append(line)
    for line in lines:
        cursor=x
        for part in re.split(r'([→₱≈])',line):
            chosen=font(size,bold)
            d.text((cursor,y),part,font=chosen,fill=color)
            cursor+=d.textlength(part,font=chosen)
        y+=size+spacing
    return y

def card(im,box,fill='white',radius=24,outline=LINE):
    ImageDraw.Draw(im).rounded_rectangle(box,radius,fill=fill,outline=outline,width=2)
def paste_fit(im,path,box,cover=False):
    img=Image.open(path).convert('RGBA'); x,y,w,h=box
    img=ImageOps.fit(img,(w,h),method=Image.Resampling.LANCZOS,centering=(.5,.35)) if cover else ImageOps.contain(img,(w,h),Image.Resampling.LANCZOS)
    im.alpha_composite(img,(x+(w-img.width)//2,y+(h-img.height)//2))
def save(im,name):
    p=GRAPHICS/(name+'.png');im.save(p);return str(p.relative_to(ROOT))
def base(name,chapter='',dark=False):
    im=canvas(NAVY if dark else BG);d=ImageDraw.Draw(im)
    d.ellipse((1220,-370,2190,600),outline='#18385E' if dark else '#E5ECEC',width=2)
    d.ellipse((1280,-310,2130,540),outline='#18385E' if dark else '#E5ECEC',width=2)
    text(im,(74,40),'MEDCORE',24,'white' if dark else NAVY,True)
    if chapter:text(im,(320,42),chapter.upper(),20,'#A7C9C7' if dark else TEAL,True)
    d.line((74,83,1846,83),fill='#244159' if dark else LINE,width=1)
    return im

def layer(name,im,x=0,y=0,delay=0,move=24):
    return dict(path=save(im,name),x=x,y=y,delay=delay,move=move)
shots=[]
def shot(name,start,end,kind,**kw):
    row=dict(name=name,start=start,end=end,duration=end-start,kind=kind,**kw);shots.append(row);return row

def prepare():
    GRAPHICS.mkdir(exist_ok=True);SHOTS.mkdir(exist_ok=True)
    # Hook: a question becomes a visible product pair, then an explicitly qualified target.
    im=base('hook','Clear the way for care',True)
    text(im,(130,235),'The care is done.',86,'white',True)
    text(im,(130,350),'Why is the bill\nstill unclear?',86,'#BFE7DC',True)
    d=ImageDraw.Draw(im);d.arc((1290,250,1650,610),-90,170,fill='#A9D7CA',width=12)
    d.line((1470,430,1470,305),fill='white',width=9);d.line((1470,430,1540,480),fill='white',width=9)
    text(im,(1350,670),'A clearer next step.',32,'white')
    shot('01-hook',0,3,'graphic',base=save(im,'01-hook'),layers=[])
    im=base('intro','Clear the way for care')
    text(im,(100,220),'Meet\nMedCore.',96,NAVY,True)
    text(im,(105,470),'Financial clarity\nfor families.',40,MUTED)
    paste_fit(im,ASSETS/'logos/MedCore_Text_logo.png',(100,735,470,130))
    li=canvas();paste_fit(li,ASSETS/'ui/dashboard/03-encounters-ledgers.png',(620,140,1160,680));paste_fit(li,ASSETS/'ui/mobile/07-home.png',(1450,280,300,690))
    shot('02-product-reveal',3,7,'graphic',base=save(im,'02-base'),layers=[layer('02-pair',li,move=40)])
    im=base('target','The ambition',True);text(im,(150,235),'8 hours',108,'#93A4B7',True);text(im,(735,245),'→',100,'#9BCDBE');text(im,(960,235),'Under 45',108,'white',True);text(im,(969,375),'minutes',64,'white')
    text(im,(150,570),'A discharge target.',46,'#BFE7DC',True);text(im,(150,655),'A clearer path through hospital finances.',34,'white')
    text(im,(150,900),'Target from founder storyboard • Not a measured pilot outcome',24,'#BDCCD8')
    shot('03-target',7,12,'graphic',base=save(im,'03-target'),layers=[])
    # Story: generated poses, deterministic figures/coverage cards, no synthesized official documents.
    storybeats=[('04-waiting',12,18,'waiting.png','We experienced\nthe problem.','',False),('05-coverage',18,26,'waiting.png','Coverage existed.','PhilHealth • 39 years\nPrivate HMO',False),('06-bill',26,31,'question.png','Quoted bill','₱36,500',True),('07-question',31,37,'question.png','Initially quoted personal share','₱8,300',True),('08-review',37,43,'review.png','After review','₱1,300',True),('09-meaning',43,52,'review.png','Coverage existed.','The explanation was missing.',True)]
    for name,start,end,img,title,sub,top in storybeats:
        im=canvas('#FFF9ED');paste_fit(im,ROOT/'characters'/img,(0,0,W,H),True)
        overlay=canvas()
        if top:
            card(overlay,(82,75,1250,280),fill=(255,253,247,246),outline='#EAE9E1')
            text(overlay,(114,96),title,34,MUTED)
            text(overlay,(112,151),sub,65 if sub.startswith('₱') else 47,NAVY,True)
        else:
            text(overlay,(92,200),title,66,NAVY,True,width=630)
            if sub:
                card(overlay,(90,430,620,600),fill='#FFFFFF')
                text(overlay,(120,460),sub,34,TEAL,True)
        card(overlay,(72,943,787,996),fill='#FFFDF7',radius=12,outline='#EAE9E1')
        text(overlay,(90,954),'Illustrated founder-reported experience',24,MUTED)
        shot(name,start,end,'illustration',base=save(im,name+'-base'),layers=[layer(name+'-title',overlay,delay=.15,move=18)])
    im=base('breath');text(im,(160,350),'What if the explanation\nwas part of the experience?',74,NAVY,True)
    shot('10-breath',52,54,'graphic',base=save(im,'10-breath'),layers=[])
    # Solution organizes cards into the genuine ledger.
    im=base('solution','One explainable ledger')
    paste_fit(im,ASSETS/'ui/dashboard/03-encounters-ledgers.png',(115,195,1690,780))
    layers=[]
    for i,label in enumerate(['Hospital charges','PhilHealth benefits','Approved HMO']):
        l=canvas();x=260+i*485;card(l,(x,110,x+440,180),fill='white');text(l,(x+25,128),label,29,TEAL,True);layers.append(layer('11-chip-'+str(i),l,delay=i*.25,move=24))
    shot('11-organize',54,61,'graphic',base=save(im,'11-ledger'),layers=layers)
    im=base('order','Financial coordination')
    text(im,(110,145),'Know how the balance is reached.',60,NAVY,True)
    vals=['Gross charges','Eligible adjustments','PhilHealth','Approved HMO','Patient responsibility']
    layers=[]
    for i,label in enumerate(vals):
        l=canvas();x=112+i*348;card(l,(x,340,x+320,570),fill='white');text(l,(x+26,370),f'0{i+1}',26,TEAL,True);text(l,(x+26,436),label,31,NAVY,True,width=275);layers.append(layer('12-step-'+str(i),l,delay=i*.28,move=32))
    text(im,(115,760),'Eligible benefits and recorded approvals determine the remaining share.',32,MUTED)
    shot('12-order',61,67,'graphic',base=save(im,'12-base'),layers=layers)
    im=base('pillars','The product journey',True);text(im,(120,230),'One clearer picture.',88,'white',True)
    labels=['GUIDE','VERIFY','REWARD','REPORT','IMPROVE'];layers=[]
    for i,s in enumerate(labels):
        l=canvas();x=110+i*350;card(l,(x,490,x+320,635),fill='#18385E',outline='#315371');text(l,(x+35,530),s,33,'#C3E4DA',True);layers.append(layer('13-pillar'+str(i),l,delay=i*.14,move=28))
    shot('13-pillars',67,71,'graphic',base=save(im,'13-base'),layers=layers)
    im=base('patient','The patient’s phone');text(im,(150,305),'A bill you can\nfollow.',84,NAVY,True);text(im,(154,565),'A separate synthetic patient example.',30,MUTED)
    li=canvas();paste_fit(li,ASSETS/'ui/mobile/08-bill.png',(1140,105,380,875))
    shot('14-mobile-intro',71,74,'graphic',base=save(im,'14-base'),layers=[layer('14-mobile',li,move=24)])
    # Exact app recordings. Footage produced by capture.mjs, never by image generation.
    demos=[
      ('guide',74,85,'GUIDE','Explain costs early.','Choose a procedure.\nReview the estimate.','desktop'),
      ('verify',85,96,'VERIFY','Coverage in one worklist.','Review recorded authorization\nand payer information.','desktop'),
      ('ledger',96,107,'VERIFY','See how it adds up.','Charges → recorded benefits → patient share.','desktop'),
      ('mobile-bill',107,117,'PATIENT CLARITY','What remains\nto pay?','An itemized bill,\nclose at hand.','mobile'),
      ('coverage',117,122,'PATIENT CLARITY','See what is\nrecorded.','PhilHealth + HMO\ncoverage details.','mobile'),
      ('cora',122,134,'CORA','Ask in your\nlanguage.','English · Taglish\nTagalog · Ilokano','mobile'),
      ('payment-methods',134,145,'REWARD','Choose your\nnext step.','Review the amount.\nChoose a method.','mobile'),
      ('qr-review',145,156,'REWARD','Review before\nconfirming.','One clear payment path.','mobile'),
      ('receipt',156,167,'REWARD','A recorded\nresult.','A receipt you can revisit.','mobile'),
      ('history',167,176,'REWARD','Keep track of\nwhat changed.','Recorded payment history.','mobile'),
      ('arrangement',176,186,'ALTERNATIVE','A supported\narrangement.','Preview a 0% schedule\nfor eligible accounts.','mobile'),
      ('documents',186,197,'DOCUMENTS','Your records.\nIn one place.','Statement of account\nand recorded documents.','mobile'),
      ('clearance',197,208,'CLEARANCE','See what needs attention.','Follow the recorded stages and blockers.','desktop'),
      ('claims',208,221,'CLAIMREADY','Review before submission.','Electronic statement of account · Pre-flight checklist','desktop'),
      ('analytics',221,234,'REPORT / IMPROVE','Make bottlenecks visible.','Explore the actual prototype’s analytics.','desktop')]
    for name,start,end,ch,title,sub,mode in demos:
        im=base(name,ch);ls=[]
        if mode=='mobile':
            text(im,(155,270),title,78,NAVY,True,width=740)
            text(im,(158,500),sub,36,MUTED,width=700)
            box=[1120,100,390,900]
            card(im,(1109,89,1521,1011),radius=26,fill='white')
        else:
            text(im,(92,104),title,37,NAVY,True)
            text(im,(98,984),sub,24,MUTED)
            box=[256,170,1408,792] # ratio adapts below without stretching.
        if name=='analytics':
            l=canvas();card(l,(1110,700,1825,936),fill='#FFFFFF');text(l,(1140,723),'ILLUSTRATIVE IMPACT TARGETS',23,TEAL,True);text(l,(1140,766),'DAR 75d → 21.4d   /   POS +40%',28,NAVY,True);text(l,(1140,812),'RTH 20% → <2% (illustrative 1.2%)',26,NAVY);ls=[layer('analytics-targets',l,delay=7,move=18)]
        shot('demo-'+name,start,end,'recording',base=save(im,'demo-'+name),footage='footage/'+name+'.mp4',box=box,layers=ls)
    im=base('users','Who it is for');text(im,(105,160),'Clarity for every side.',72,NAVY,True)
    for i,(t,b) in enumerate([('Patients & families','Understand the bill'),('Billing & claims teams','Coordinate the next step'),('Hospital leaders','See the financial picture')]):
        x=105+i*580;card(im,(x,335,x+545,640));text(im,(x+28,375),t,34,NAVY,True,width=480);text(im,(x+28,505),b,30,MUTED,width=480)
    text(im,(110,795),'Initial focus: NCR · Calabarzon · Cebu · Cagayan Valley',34,TEAL,True)
    shot('30-users',234,239,'graphic',base=save(im,'30-users'),layers=[])
    im=base('market','Founder / storyboard estimates');text(im,(110,160),'The intended market.',72,NAVY,True)
    for i,(a,b,c) in enumerate([('TAM','₱4.564B','1,260 hospitals'),('SAM','₱2.738B','454 hospitals'),('SOM','≈ ₱1.35B','Founder model')]):
        x=110+i*580;card(im,(x,320,x+545,735));text(im,(x+32,355),a,28,TEAL,True);text(im,(x+32,452),b,66,NAVY,True);text(im,(x+32,585),c,31,MUTED)
    text(im,(114,860),'Founder/storyboard estimates • Methodology to validate',28,MUTED)
    shot('31-market',239,247,'graphic',base=save(im,'31-market'),layers=[])
    im=base('ecosystem','Works alongside existing systems');text(im,(110,160),'A focused coordination layer.',65,NAVY,True)
    card(im,(110,330,1810,510));text(im,(150,360),'EXISTING HOSPITAL SYSTEMS',25,MUTED,True);text(im,(150,420),'BizBox   /   Comlogik   /   Medsys',43,NAVY,True)
    card(im,(110,550,1810,780),fill='#E7F4F0');text(im,(150,578),'MEDCORE',29,TEAL,True);text(im,(150,644),'Billing transparency + payer coordination + patient experience',37,NAVY,True)
    text(im,(115,860),'Coordination context: HMO portals / liaison workflows',28,MUTED)
    shot('32-ecosystem',247,254,'graphic',base=save(im,'32-ecosystem'),layers=[])
    people=json.loads((ASSETS/'team/manifest.json').read_text())
    for j,ids in enumerate([[0,1,2],[3,5,4]]):
        im=base('team','The people behind MedCore');text(im,(110,150),'Built with purpose.' if j==0 else 'Guided by experience.',62,NAVY,True);ls=[]
        for i,k in enumerate(ids):
            p=people[k];l=canvas();x=110+i*580;card(l,(x,285,x+540,942))
            paste_fit(l,ASSETS/'team'/p['file'],(x+116,320,308,335),cover=True)
            y=text(l,(x+30,693),p['name'],30,NAVY,True,width=480,spacing=7)
            text(l,(x+30,y+25),p['role'],25,MUTED,width=480,spacing=7)
            ls.append(layer(f'team-{j}-{i}',l,delay=i*.15,move=25))
        shot('33-team' if j==0 else '34-team',254+j*10,264+j*10,'portraits',base=save(im,'team-base'+str(j)),layers=ls)
    im=base('award','Founder-reported recognition',True);text(im,(135,210),'Best Pitch.',102,'white',True);text(im,(140,395),'DTI Youth Entrepreneurship Program',40,'#C4DFD9');text(im,(140,475),'Be Your Own Boss',57,'white',True);text(im,(143,590),'Pitch Perfect',32,'#C4DFD9');text(im,(140,885),'Recognition reported in the supplied storyboard',24,'#B8C7D4')
    shot('35-award',274,279,'graphic',base=save(im,'35-award'),layers=[])
    im=base('pilot','The next step');text(im,(135,220),'Cagayan Valley.',96,NAVY,True);text(im,(140,365),'A proposed pilot.',63,TEAL,True);text(im,(145,565),'Measure discharge time, billing clarity,\nand claim readiness.',41,MUTED);text(im,(145,845),'Pilot-ready prototype • Proposed pilot, not a deployed rollout',27,MUTED)
    shot('36-pilot',279,284,'graphic',base=save(im,'36-pilot'),layers=[])
    im=base('end','');paste_fit(im,ASSETS/'logos/MedCore_Text_logo.png',(620,205,680,190));text(im,(425,465),'Clear the Way for Care.',81,NAVY,True);text(im,(760,645),'Explore the prototype',33,TEAL,True);text(im,(676,720),'med-core1.vercel.app',44,NAVY)
    shot('37-end',284,290,'graphic',base=save(im,'37-end'),layers=[])
    assert shots[0]['start']==0 and shots[-1]['end']==290
    assert all(a['end']==b['start'] for a,b in zip(shots,shots[1:]))
    (ROOT/'timeline.json').write_text(json.dumps(dict(width=W,height=H,fps=30,duration=290,shots=shots),indent=2))
    print(f'Prepared {len(shots)} shots / 8700 frames',flush=True)

def render_shot(s,force=False):
    out=SHOTS/(s['name']+'.mp4')
    if out.exists() and not force:return str(out)
    cmd=[FFMPEG,'-hide_banner','-loglevel','error','-y','-loop','1','-framerate','30','-i',str(ROOT/s['base'])]
    filters=['[0:v]format=yuv420p,setsar=1[b0]'];cur='b0';idx=1
    if 'footage' in s:
        p=ROOT/s['footage']
        if not p.exists():return 'MISSING '+str(p)
        cmd+=['-i',str(p)]
        x,y,w,h=s['box']
        filters.append(f'[{idx}:v]fps=30,scale={w}:{h}:force_original_aspect_ratio=decrease:flags=lanczos,setsar=1,tpad=stop_mode=clone:stop_duration=1[v{idx}]')
        filters.append(f'[{cur}][v{idx}]overlay=x={x}+({w}-overlay_w)/2:y={y}+({h}-overlay_h)/2:shortest=0[b{idx}]');cur=f'b{idx}';idx+=1
    for l in s.get('layers',[]):
        cmd+=['-loop','1','-framerate','30','-i',str(ROOT/l['path'])]
        delay=l['delay'];move=l['move']
        filters.append(f'[{idx}:v]format=rgba,fade=t=in:st={delay}:d=0.28:alpha=1[v{idx}]')
        filters.append(f"[{cur}][v{idx}]overlay=x={l['x']}:y='{l['y']}+{move}*exp(-9*max(0,t-{delay}))':enable='gte(t,{delay})'[b{idx}]")
        cur=f'b{idx}';idx+=1
    filters.append(f'[{cur}]format=yuv420p[out]')
    cmd+=['-filter_complex_threads','1','-filter_complex',';'.join(filters),'-map','[out]','-t',str(s['duration']),'-r','30','-an','-c:v','libx264','-preset','fast','-crf','18','-threads','2','-movflags','+faststart',str(out)]
    subprocess.run(cmd,check=True)
    print('Rendered '+s['name'],flush=True)
    return str(out)

def render(mode='all',force=False):
    timeline=json.loads((ROOT/'timeline.json').read_text()); selected=[s for s in timeline['shots'] if mode=='all' or (s['kind']=='recording')==(mode=='demos')]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for result in pool.map(lambda s:render_shot(s,force),selected):
            if result.startswith('MISSING'):print(result)

def assemble():
    timeline=json.loads((ROOT/'timeline.json').read_text());paths=[SHOTS/(s['name']+'.mp4') for s in timeline['shots']]
    assert all(p.exists() for p in paths),'Missing rendered shots'
    listing=ROOT/'source/concat.txt';listing.write_text('\n'.join("file '"+str(p)+"'" for p in paths))
    output=ROOT/'exports/MedCore_Clear_the_Way_for_Care_04m50s.mp4'
    subprocess.run([FFMPEG,'-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(listing),'-i',str(ROOT/'audio/mix.wav'),'-i',str(ROOT/'captions.srt'),'-map','0:v','-map','1:a','-map','2:s','-c:v','copy','-c:a','aac','-b:a','256k','-ar','48000','-ac','2','-c:s','mov_text','-metadata:s:s:0','language=eng','-t','290','-movflags','+faststart',str(output)],check=True)
    print(output)

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--prepare',action='store_true');ap.add_argument('--render',choices=['all','graphics','demos']);ap.add_argument('--assemble',action='store_true');ap.add_argument('--force',action='store_true');args=ap.parse_args()
    if args.prepare:prepare()
    if args.render:render(args.render,args.force)
    if args.assemble:assemble()
