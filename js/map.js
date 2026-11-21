import {BOUNDS,PLACES} from './geo.js?v=49c5a791b041';
import {clamp,describe,weatherAt} from './rules.js?v=49c5a791b041';
import {WeatherRenderer} from './weather.js?v=49c5a791b041';

export class PacificMap{
  constructor(canvas,polygons,isLand){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.polygons=polygons;this.isLand=isLand;
    this.base=document.createElement('canvas');this.weather=new WeatherRenderer();
    this.spanLon=BOUNDS.east-BOUNDS.west;this.spanLat=BOUNDS.north-BOUNDS.south;
    this.cos=.84;this.zoom=1;this.pan={x:0,y:0};this.creating=false;
    this.layers={clouds:true,rings:true,rain:false,wind:false,track:true};
    this.frame=null;this.run=null;this.time=0;this.selected=1;
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
    this.bind();
  }
  project(lon,lat){return [this.ox+(lon-BOUNDS.west)*this.scale*this.cos,this.oy+(BOUNDS.north-lat)*this.scale];}
  unproject(x,y){return [BOUNDS.west+(x-this.ox)/(this.scale*this.cos),BOUNDS.north-(y-this.oy)/this.scale];}
  resize(){
    this.width=this.canvas.clientWidth;this.height=this.canvas.clientHeight;
    this.dpr=Math.min(devicePixelRatio||1,2);
    for(const c of [this.canvas,this.base]){c.width=this.width*this.dpr;c.height=this.height*this.dpr;}
    this.transform();
  }
  transform(){
    this.scale=Math.min(this.width/(this.spanLon*this.cos),this.height/this.spanLat)*this.zoom*1.055;
    const w=this.spanLon*this.scale*this.cos,h=this.spanLat*this.scale;
    this.pan.x=clamp(this.pan.x,-Math.max(0,(w-this.width)/2),Math.max(0,(w-this.width)/2));
    this.pan.y=clamp(this.pan.y,-Math.max(0,(h-this.height)/2),Math.max(0,(h-this.height)/2));
    this.ox=(this.width-w)/2+this.pan.x;this.oy=(this.height-h)/2+this.pan.y;
    this.drawBase();this.draw();
    const el=document.getElementById('mapScale');el.textContent='500 km';el.style.width=`${500/111.2*this.scale}px`;
  }
  setZoom(value){this.zoom=clamp(value,1,3);this.transform();}
  fit(){this.zoom=1;this.pan={x:0,y:0};this.transform();}
  geography(ctx){
    ctx.beginPath();
    for(const rings of this.polygons)for(const ring of rings){
      ring.forEach(([lon,lat],i)=>{const p=this.project(lon,lat);i?ctx.lineTo(...p):ctx.moveTo(...p);});ctx.closePath();
    }
  }
  drawBase(){
    const ctx=this.base.getContext('2d');ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    ctx.fillStyle='#072032';ctx.fillRect(0,0,this.width,this.height);
    const g=ctx.createRadialGradient(this.width*.54,this.height*.42,0,this.width*.52,this.height*.55,this.width*.92);
    g.addColorStop(0,'#12658f');g.addColorStop(.62,'#0a456e');g.addColorStop(1,'#062b4b');ctx.fillStyle=g;ctx.fillRect(0,0,this.width,this.height);
    ctx.save();this.clipRegion(ctx);
    ctx.strokeStyle='#96caed24';ctx.lineWidth=.5;ctx.font='9px "Avenir Next",sans-serif';ctx.fillStyle='#8fb8c9';
    for(let lon=Math.ceil(BOUNDS.west/5)*5;lon<=BOUNDS.east;lon+=5){const a=this.project(lon,BOUNDS.south),b=this.project(lon,BOUNDS.north);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();if(lon%10===0)ctx.fillText(`${lon}°E`,a[0]+4,this.height-89);}
    for(let lat=Math.ceil(BOUNDS.south/5)*5;lat<=BOUNDS.north;lat+=5){const a=this.project(BOUNDS.west,lat),b=this.project(BOUNDS.east,lat);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();if(lat%10===0)ctx.fillText(`${lat}°N`,this.width-35,a[1]-5);}
    this.geography(ctx);ctx.fillStyle='#3f8c55';ctx.fill('evenodd');ctx.strokeStyle='#c7edcf';ctx.lineWidth=1.05;ctx.stroke();
    ctx.save();this.geography(ctx);ctx.clip('evenodd');
    // Tonal land texture is illustrative, not an elevation dataset.
    for(let i=0;i<1000;i++){
      const lon=BOUNDS.west-2+(Math.sin(i*127.1)*.5+.5)*(this.spanLon+4),lat=BOUNDS.south-2+(Math.sin(i*311.7)*.5+.5)*(this.spanLat+4);
      const [x,y]=this.project(lon,lat);ctx.fillStyle=i%3?'#7dbd7414':'#0b3a2418';
      ctx.beginPath();ctx.ellipse(x,y,8+i%20,3+i%10,-.6,0,Math.PI*2);ctx.fill();
    }ctx.restore();
    const seaLabels=[['孟加拉湾',89,15],['南 海',114,13],['菲 律 宾 海',134,18],['西 北 太 平 洋',160,28],['东 海',125,28],['黄 海',123,34],['日 本 海',135,40],['珊 瑚 海',157,-16]];
    ctx.textAlign='center';ctx.fillStyle='#c9e7ef85';ctx.font='12px "PingFang SC",sans-serif';
    for(const [name,lon,lat] of seaLabels){ctx.fillText(name,...this.project(lon,lat));}
    const landLabels=[['中 国',104,34],['日本',138,37],['菲律宾',123,11],['越南',106,17],['泰国',101,16],['马来西亚',102,4],['印度尼西亚',113,-3],['澳大利亚',135,-16],['朝鲜半岛',127,39],['俄罗斯',145,53]];
    ctx.fillStyle='#e7f6ea';ctx.font='11px "PingFang SC",sans-serif';for(const [name,lon,lat] of landLabels)ctx.fillText(name,...this.project(lon,lat));
    ctx.textAlign='left';
    for(const [name,lon,lat,tier] of PLACES){
      if(tier>0&&this.width<900)continue;
      const [x,y]=this.project(lon,lat);ctx.fillStyle='#dff5e0';ctx.beginPath();ctx.arc(x,y,1.7,0,Math.PI*2);ctx.fill();
      ctx.font=`${tier?8:9}px "PingFang SC",sans-serif`;ctx.fillStyle=tier?'#cce6d0':'#f1fff2';ctx.fillText(name,x+5,y-3);
    }
    ctx.restore();
  }
  clipRegion(ctx){const [x,y]=this.project(BOUNDS.west,BOUNDS.north);ctx.beginPath();ctx.roundRect(x,y,this.spanLon*this.scale*this.cos,this.spanLat*this.scale,18);ctx.clip();}
  drawCold(ctx){
    const lat=40-this.run.env.cold*.075,p=this.project(BOUNDS.west,lat),right=this.project(BOUNDS.east,lat);
    const g=ctx.createLinearGradient(0,Math.max(0,p[1]-130),0,p[1]+45);g.addColorStop(0,'#8897b00f');g.addColorStop(1,'#8897b000');
    ctx.fillStyle=g;ctx.fillRect(0,0,this.width,p[1]+45);ctx.strokeStyle='#b7b7d03a';ctx.setLineDash([5,7]);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.bezierCurveTo(this.width*.3,p[1]-18,this.width*.7,p[1]+22,right[0],p[1]);ctx.stroke();ctx.setLineDash([]);
    ctx.font='10px "PingFang SC",sans-serif';ctx.fillStyle='#aeb8c19e';ctx.fillText('北部冷空气作用区',this.width*.58,p[1]-12);
  }
  draw(){
    if(this.render3D){this.onDraw?.();return;}
    if(!this.width||!this.height||!this.base.width||!this.base.height||!this.frame)return;
    const ctx=this.ctx;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.clearRect(0,0,this.width,this.height);ctx.drawImage(this.base,0,0,this.width,this.height);
    ctx.save();this.clipRegion(ctx);
    if(this.run.env.cold>0)this.drawCold(ctx);
    if(this.layers.track)this.drawTracks(ctx);
    for(const s of this.frame.storms)this.weather.draw(ctx,this,s,this.time,this.layers,s.id===this.selected);
    for(const s of this.frame.storms)this.weather.marker(ctx,this,s,s.id===this.selected);
    ctx.restore();
    this.onDraw?.();
  }
  drawTracks(ctx){
    for(const s of this.frame.storms){
      ctx.lineWidth=s.id===this.selected?1.8:1;ctx.globalAlpha=s.id===this.selected?.95:.5;
      for(let h=s.bornAt+1;h<=this.frame.hour;h++){
        const prev=this.run.frames[h-1].storms.find(t=>t.id===s.id),cur=this.run.frames[h].storms.find(t=>t.id===s.id);
        if(cur.status==='dissipated')continue;
        ctx.strokeStyle=describe(cur).color;ctx.beginPath();ctx.moveTo(...this.project(prev.lon,prev.lat));ctx.lineTo(...this.project(cur.lon,cur.lat));ctx.stroke();
        if(h%12===0){const p=this.project(cur.lon,cur.lat);ctx.fillStyle=describe(cur).color;ctx.beginPath();ctx.arc(...p,2,0,Math.PI*2);ctx.fill();}
      }
      const start=this.run.frames[s.bornAt].storms.find(t=>t.id===s.id),p=this.project(start.lon,start.lat);ctx.strokeStyle='#9daea0';ctx.beginPath();ctx.arc(...p,3.5,0,Math.PI*2);ctx.stroke();
    }ctx.globalAlpha=1;
  }
  bind(){
    let down=null,moved=false;
    this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.setZoom(this.zoom*(e.deltaY>0?.91:1.1));},{passive:false});
    this.canvas.addEventListener('pointerdown',e=>{down={x:e.offsetX,y:e.offsetY,pan:{...this.pan}};moved=false;this.canvas.setPointerCapture(e.pointerId);});
    this.canvas.addEventListener('pointermove',e=>{
      const [lon,lat]=this.unproject(e.offsetX,e.offsetY);
      document.getElementById('cursorCoord').textContent=`${lon.toFixed(1)}°E / ${lat.toFixed(1)}°N`;
      if(down&&!this.creating){const dx=e.offsetX-down.x,dy=e.offsetY-down.y;if(Math.hypot(dx,dy)>4)moved=true;this.pan={x:down.pan.x+dx,y:down.pan.y+dy};this.transform();}
    });
    this.canvas.addEventListener('pointerup',e=>{
      if(!moved){const [lon,lat]=this.unproject(e.offsetX,e.offsetY);this.click(lon,lat,e.offsetX,e.offsetY);}down=null;
    });
    this.canvas.addEventListener('pointercancel',()=>{down=null;});
    this.canvas.addEventListener('keydown',e=>{if(e.key==='Enter'&&this.creating){e.preventDefault();this.onCreate?.(140+(this.frame.storms.length%8)*3,12+Math.floor(this.frame.storms.length/8)%12);}});
  }
  click(lon,lat,x,y){
    if(this.creating){this.onCreate?.(lon,lat);return;}
    const hit=this.frame.storms.find(s=>{const p=this.project(s.lon,s.lat);return Math.hypot(p[0]-x,p[1]-y)<28;});
    if(hit){this.onSelect?.(hit.id);return;}
    if(lon<100||lon>175||lat<0||lat>55)return;
    const land=this.isLand(lon,lat),effects=this.frame.storms.map(s=>weatherAt(s,lon,lat));
    const wind=Math.max(...effects.map(e=>e.wind)),rain=effects.reduce((n,e)=>n+e.rain,0);
    const probe=document.getElementById('mapProbe');probe.hidden=false;
    probe.textContent=`${land?'陆地':'海面'} · ${lat.toFixed(1)}°N / ${lon.toFixed(1)}°E`;
    const detail=document.createElement('small');detail.textContent=`风速 ${wind.toFixed(1)} m/s · 降雨 ${rain.toFixed(1)} mm/h（估算）`;probe.append(detail);
    clearTimeout(this.probeTimer);this.probeTimer=setTimeout(()=>probe.hidden=true,5500);
  }
}
