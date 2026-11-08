import {soundMix} from './scene-math.js';

export class StormSound{
  constructor(){this.enabled=false;this.volume=.4;this.eventCount=0;}
  async enable(){
    if(!this.ctx){
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('此浏览器不支持声音');
      this.ctx=new Audio();const c=this.ctx;
      this.master=c.createGain();this.master.gain.value=0;
      this.limiter=c.createDynamicsCompressor();this.limiter.threshold.value=-18;this.limiter.ratio.value=8;
      this.analyser=c.createAnalyser();this.analyser.fftSize=256;
      this.master.connect(this.limiter);this.limiter.connect(this.analyser);this.analyser.connect(c.destination);
      this.channels={};
      for(const [name,type,freq] of [['wind','lowpass',900],['rain','highpass',1600]]){
        const buffer=c.createBuffer(1,c.sampleRate*4,c.sampleRate),data=buffer.getChannelData(0);
        let smooth=0;for(let i=0;i<data.length;i++){const white=Math.random()*2-1;smooth=(smooth+.025*white)/1.025;data[i]=name==='wind'?smooth*4:white*.5;}
        const source=c.createBufferSource();source.buffer=buffer;source.loop=true;
        const filter=c.createBiquadFilter();filter.type=type;filter.frequency.value=freq;
        const gain=c.createGain();gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start();
        this.channels[name]={gain,filter,source};
      }
      const osc=c.createOscillator(),gain=c.createGain();osc.frequency.value=58;gain.gain.value=0;osc.connect(gain);gain.connect(this.master);osc.start();this.channels.bass={gain,source:osc};
    }
    await this.ctx.resume();this.enabled=true;this.applyVolume();
  }
  disable(){this.enabled=false;this.applyVolume();this.ctx?.suspend();}
  setVolume(value){this.volume=Math.max(0,Math.min(1,value));this.applyVolume();}
  applyVolume(){if(this.ctx)this.master.gain.setTargetAtTime(this.enabled?this.volume:0,this.ctx.currentTime,.12);}
  update(storm,view,playing){
    if(!this.ctx)return;
    const mix=soundMix(storm,view),now=this.ctx.currentTime;
    for(const key of ['wind','rain','bass'])this.channels[key].gain.gain.setTargetAtTime(playing&&this.enabled?mix[key]:0,now,.35);
    this.channels.wind.filter.frequency.setTargetAtTime(450+(storm?.wind||0)*22,now,.5);
  }
  cue(kind='select'){
    if(!this.enabled||!this.ctx||document.hidden)return;
    const c=this.ctx,now=c.currentTime;
    if(now-(this.lastCue??-10)<.35)return;this.lastCue=now;this.eventCount++;
    const o=c.createOscillator(),g=c.createGain();o.type='sine';
    o.frequency.setValueAtTime(kind==='named'?440:kind==='stage'?220:660,now);o.frequency.exponentialRampToValueAtTime(kind==='named'?660:330,now+.24);
    g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(.065,now+.015);g.gain.exponentialRampToValueAtTime(.001,now+.32);
    o.connect(g);g.connect(this.master);o.start();o.stop(now+.35);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  async visibility(hidden){if(!this.ctx)return;if(hidden)await this.ctx.suspend();else if(this.enabled)await this.ctx.resume();}
  get diagnostics(){let rms=0;if(this.analyser&&this.ctx.state==='running'){const samples=new Float32Array(256);this.analyser.getFloatTimeDomainData(samples);rms=Math.sqrt(samples.reduce((sum,v)=>sum+v*v,0)/samples.length);}return {enabled:this.enabled,volume:this.volume,state:this.ctx?.state||'uninitialized',eventCount:this.eventCount,rms};}
}
