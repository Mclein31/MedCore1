#!/usr/bin/env python3
"""Reproducible local speech, original deterministic score, effects, SRT and mix.
Run --prepare, run returned say commands, then run --render. Requires numpy and ffmpeg.
"""
import csv,json,re,sys,subprocess,wave, pathlib,shlex
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'production/audio'; OUT.mkdir(exist_ok=True,parents=True)
FF='/private/tmp/medcore-film-deps/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1'
SR=48000; DUR=290

def secs(x):
 m,s=map(int,x.split(':'));return m*60+s

def phrases(t):
 parts=re.split(r'(?<=[.!?])\s+|(?<=,)\s+',t)
 result=[]
 for p in parts:
  words=p.split()
  while len(words)>12:
   cut=next((i for i in range(min(12,len(words)-1),5,-1) if words[i] in ['and','or','for','with','into','the','to']),11)
   result.append(' '.join(words[:cut]));words=words[cut:]
  if words:result.append(' '.join(words))
 return result

def prepare():
 rows=list(csv.DictReader((ROOT/'MEDCORE_PRODUCT_VIDEO_NARRATION_CUES.csv').open()))
 data=[];commands=[]
 for r in rows:
  t=r['narration']
  if r['start']=='02:02':t='Cora offers English, Taglish, Tagalog, and Ilokano language options. The important question stays simple: what do I owe, and why?'
  if r['start']=='03:06':t='Documents keep the statement of account close at hand. Discharge passes require the recorded clearances.'
  p=phrases(t)
  item={'start':secs(r['start']),'end':secs(r['end']),'text':t,'phrases':[]}
  for text in p:
   idx=sum(len(i['phrases']) for i in data)+len(item['phrases'])
   name=f'phrase-{idx:03d}.aiff'
   speech=text.replace('MedCore','Med Core').replace('HMO','H M O').replace('QR Ph','Q R P H').replace('DTI’s','D T I’s').replace('NCR','N C R').replace('ClaimReady','Claim Ready')
   item['phrases'].append({'text':text,'file':name,'rate_wpm':140})
   commands.append('say -v Samantha -r 140 -o '+shlex.quote(str(OUT/name))+' '+shlex.quote(speech))
  data.append(item)
 (OUT/'narration-plan.json').write_text(json.dumps(data,indent=2))
 (OUT/'synthesis-commands.json').write_text(json.dumps(commands,indent=2))
 (OUT/'narration-final.txt').write_text('\n\n'.join(x['text'] for x in data if x['text']))
 print(json.dumps(commands))

def decode(path):
 b=subprocess.check_output([FF,'-v','error','-i',str(path),'-f','f32le','-ar',str(SR),'-ac','1','-'])
 a=np.frombuffer(b,dtype='<f4').copy(); active=np.where(abs(a)>.003)[0]
 if len(active):a=a[max(0,active[0]-int(.07*SR)):min(len(a),active[-1]+int(.12*SR))]
 return a

def wav(name,a):
 with wave.open(str(OUT/name),'wb') as f:
  f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((np.clip(a,-.999,.999)*32767).astype('<i2').tobytes())

def stamp(t):
 v=int(round(t*1000));return f'{v//3600000:02}:{v//60000%60:02}:{v//1000%60:02},{v%1000:03}'

def render():
 n=SR*DUR;voice=np.zeros(n,dtype=np.float32);music=np.zeros((n,2),dtype=np.float32);fx=np.zeros((n,2),dtype=np.float32)
 data=json.loads((OUT/'narration-plan.json').read_text());caps=[];rng=np.random.default_rng(2718)
 for cue in data:
  arr=[decode(OUT/p['file']) for p in cue['phrases']]
  if not arr:continue
  gap=.12; total=sum(len(a)/SR for a in arr)+gap*(len(arr)-1)
  available=cue['end']-cue['start']-.3; factor=max(1,total/available)
  cue['time_compression']=factor;cue['effective_rate_wpm']=140*factor
  at=cue['start']+.12
  for p,a in zip(cue['phrases'],arr):
   if factor>1:
    proc=subprocess.run([FF,'-v','error','-f','f32le','-ar',str(SR),'-ac','1','-i','-','-af',f'atempo={factor:.7f}','-f','f32le','-'],input=a.astype('<f4').tobytes(),stdout=subprocess.PIPE,check=True)
    a=np.frombuffer(proc.stdout,dtype='<f4')
   begin=int(at*SR);voice[begin:begin+len(a)]+=a
   p.update(start=at,end=at+len(a)/SR);caps.append(p);at+=len(a)/SR+gap/factor
 peak=max(abs(voice));voice*=.72/peak
 # Original C major / A minor / F / G soft-key progression. 96 BPM.
 beat=60/96;bar=4*beat
 chords=[[48,52,55,59],[45,48,52,55],[41,45,48,52],[43,47,50,55]]
 def note(dest,at,midi,duration,gain,pan=0,kind='key'):
  count=min(int(duration*SR),n-int(at*SR))
  if count<=0:return
  t=np.arange(count)/SR;freq=440*2**((midi-69)/12)
  env=(1-np.exp(-t/.018))*np.exp(-t/(duration/3))*np.minimum(1,(duration-t)/.12)
  if kind=='bass':env=(1-np.exp(-t/.035))*np.exp(-t/.55)
  signal=(np.sin(2*np.pi*freq*t)+.16*np.sin(2*np.pi*freq*2*t)+.045*np.sin(2*np.pi*freq*3*t))*env*gain
  i=int(at*SR);dest[i:i+count,0]+=signal*np.sqrt((1-pan)/2);dest[i:i+count,1]+=signal*np.sqrt((1+pan)/2)
 for b in range(116):
  at=b*bar;c=chords[b%4]
  if 52<=at<54 or at>=284:continue
  story=12<=at<54;dense=74<=at<234
  for k,m in enumerate(c):note(music,at+.035*k,m+12,3,.018 if story else .024,(k-1.5)*.23)
  if not story:
   note(music,at,c[0]-12,1.7,.022,0,'bass')
   for k in range(4):note(music,at+k*beat+.31,c[(k+b)%4]+24,.75,.009,(-1)**k*.35)
  if dense:
   for k in [0,2]:note(music,at+k*beat,31,.16,.015,0,'bass')
   for k in range(4):
    i=int((at+k*beat+.31)*SR);size=int(.045*SR);noise=rng.normal(0,.0019,size)*np.exp(-np.arange(size)/(SR*.009));music[i:i+size,0]+=noise;music[i:i+size,1]+=noise
 for k,m in enumerate([48,55,60,64,67]):note(music,284+k*.045,m,5.8,.024,(k-2)*.18)
 # Selective quiet editorial paper, alignment, and interface clicks.
 effect_events=[]
 for at in [1.1,2.4,18.2,26.2,43.2,54.3,74.5,85.5,96.5,107.5,117.4,134.5,145.5,158.3,177.2,187.0,198.0,209.0,222.0,254.2,264.2]:
  i=int(at*SR);size=int(.065*SR);a=rng.normal(0,1,size);a=np.convolve(a,np.ones(7)/7,mode='same')*.011*np.exp(-np.arange(size)/(SR*.013));fx[i:i+size]+=a[:,None];effect_events.append({'seconds':at,'type':'soft editorial tick/paper'})
 for at in [54.15,161.0,281.8]:
  note(fx,at,76,.5,.013,-.1);note(fx,at+.16,79,.7,.010,.1);effect_events.append({'seconds':at,'type':'warm alignment / simulated result / close'})
 # Smooth speech sidechain, with quiet music approximately 20dB below speech.
 active=(abs(voice)>.002).astype(np.float32)
 block=2400;env=np.array([max(active[i:i+block]) for i in range(0,n,block)])
 env=np.convolve(env,np.ones(9)/9,mode='same');duck=np.interp(np.arange(n),np.arange(len(env))*block,env).astype(np.float32)
 music*= (1-.50*duck[:,None]);fx*= (1-.25*duck[:,None])
 # Both score and effects leave an intentionally almost silent 52-54s breath.
 for a in [music,fx]:
  a[52*SR:54*SR]*=.015
  a[:SR]*=np.linspace(0,1,SR)[:,None]
  a[-SR:]*=np.linspace(1,0,SR)[:,None]
 stereo=np.repeat(voice[:,None],2,axis=1)
 wav('narration.wav',stereo);wav('music.wav',music);wav('effects.wav',fx);wav('mix-premaster.wav',stereo+music+fx)
 srt=[]
 for i,p in enumerate(caps,1):
  words=p['text'].split();lines=['']
  for w in words:
   if len(lines[-1])+len(w)+1>43 and len(lines)<2:lines.append(w)
   else:lines[-1]+=(' ' if lines[-1] else '')+w
  srt.append(f"{i}\n{stamp(p['start'])} --> {stamp(p['end'])}\n"+'\n'.join(lines)+'\n')
 (ROOT/'production/captions.srt').write_text('\n'.join(srt))
 (OUT/'narration-timing.json').write_text(json.dumps(data,indent=2));(OUT/'effects-cues.json').write_text(json.dumps(effect_events,indent=2))
 subprocess.run([FF,'-y','-v','info','-i',str(OUT/'mix-premaster.wav'),'-af','loudnorm=I=-16:TP=-1:LRA=9:print_format=json','-ar','48000','-ac','2',str(OUT/'mix.wav')],stderr=open(OUT/'loudness-render.log','w'),check=True)
 print('Completed stems, mix, captions. Maximum time compression',max(r.get('time_compression',1) for r in data))
if __name__=='__main__':
 if '--prepare' in sys.argv:prepare()
 elif '--render' in sys.argv:render()
