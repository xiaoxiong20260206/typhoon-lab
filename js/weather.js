import {clamp,weatherAt,radiusAt,windRings,describe} from './rules.js';

const TAU=Math.PI*2;
function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function puff(ctx,x,y,r,opacity){
  const g=ctx.createRadialGradient(x-r*.15,y-r*.2,0,x,y,r);
  g.addColorStop(0,`rgba(242,244,232,${opacity})`);
  g.addColorStop(.35,`rgba(217,228,221,${opacity*.82})`);
  g.addColorStop(.72,`rgba(165,189,188,${opacity*.4})`);
  g.addColorStop(1,'rgba(150,180,180,0)');
  ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
function cloudSprite(bucket,extra){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
  const ctx=canvas.getContext('2d'),rng=random(724+bucket),strength=bucket/6;
  ctx.translate(256,256);
  if(extra){
    for(let i=0;i<1000;i++){
      const t=rng(),a=t*5.6+0.1,r=25+t*155;
      const x=Math.cos(a)*r*1.15+(rng()-.5)*38,y=Math.sin(a)*r*.75+(rng()-.5)*30;
      puff(ctx,x,y,8+rng()*18,.08+rng()*.24);
    }
    for(let i=0;i<180;i++){const t=i/180;puff(ctx,30+t*145,30+t*180,12+rng()*15,.14);}
    return canvas;
  }
  // Disorganized convection at low intensity; unequal, broken spiral rainbands later.
  if(bucket<2){
    for(let i=0;i<580;i++){
      const cluster=i%5,a=cluster*1.42+.4,r=35+(cluster%3)*35;
      const x=Math.cos(a)*r+(rng()-.5)*115,y=Math.sin(a)*r+(rng()-.5)*90;
      puff(ctx,x,y,8+rng()*26,.07+rng()*.12);
    }return canvas;
  }
  for(let arm=0;arm<3;arm++)for(let i=0;i<490;i++){
    const t=rng(),r=24+t*(175-arm*21),a=arm*2.25+Math.log(1+t*5)*(2.3+strength*.4);
    const spread=26+Math.sin(t*8+arm)*12+(1-strength)*25;
    const x=Math.cos(a)*r+(rng()-.5)*spread,y=Math.sin(a)*r+(rng()-.5)*spread;
    const opacity=(.10+rng()*.16)*(1-t*.65)*(0.75+strength*.45);
    puff(ctx,x,y,(9+rng()*19)*(1.1-strength*.15),opacity);
  }
  for(let i=0;i<280;i++){
    const a=rng()*TAU,r=45+rng()*85;
    puff(ctx,Math.cos(a)*r,Math.sin(a)*r,16+rng()*20,.04+rng()*.045);
  }
  if(bucket>=3){
    for(let i=0;i<780;i++){
      const a=rng()*TAU,r=13+Math.pow(rng(),.6)*(70-strength*20);
      puff(ctx,Math.cos(a)*r,Math.sin(a)*r,5+rng()*13,.12+rng()*.18);
    }
  }
  if(bucket>=4){
    const radius=9+strength*5;
    ctx.globalCompositeOperation='destination-out';
    const g=ctx.createRadialGradient(0,0,2,0,0,radius);
    g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(.7,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.fillRect(-radius,-radius,radius*2,radius*2);
    ctx.globalCompositeOperation='source-over';
    ctx.strokeStyle='rgba(235,235,216,.32)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,radius+.5,.2,4.3);ctx.stroke();
  }
  return canvas;
}
function rainSprite(s){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(128,128),extent=950*s.size;
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const dx=(x/127-.5)*extent*2,dy=(.5-y/127)*extent*2;
    const rain=weatherAt(s,s.lon+dx/(111.2*Math.cos(s.lat*Math.PI/180)),s.lat+dy/111.2).rain;
    if(rain<.3)continue;
    const p=(y*128+x)*4;
    const c=rain>25?[226,123,91]:rain>12?[232,180,106]:rain>4?[164,195,126]:[103,173,155];
    pixels.data[p]=c[0];pixels.data[p+1]=c[1];pixels.data[p+2]=c[2];pixels.data[p+3]=Math.round(clamp(rain/6,0,.65)*255);
  }
  ctx.putImageData(pixels,0,0);return canvas;
}
export class WeatherRenderer{
  constructor(){this.clouds=new Map();this.rain=new Map();}
  draw(ctx,map,s,time,layers,selected){
    if(s.status==='dissipated'&&s.cloudOpacity<=0)return;
    const [x,y]=map.project(s.lon,s.lat),ex=s.status==='extratropical';
    const pxKm=map.scale/111.2,cos=Math.cos(s.lat*Math.PI/180);
    const bucket=clamp(Math.floor(s.wind/9),0,6),key=`${bucket}-${ex}`;
    const radius=850*s.size;
    if(layers.clouds){
      if(!this.clouds.has(key))this.clouds.set(key,cloudSprite(bucket,ex));
      ctx.save();ctx.translate(x,y);ctx.scale(map.cos/cos,1);
      ctx.rotate(ex?-.15:-time*(.008+s.wind*.0003));
      ctx.globalAlpha=(s.cloudOpacity??1)*(s.status==='dissipated'?.45:1);
      const size=radius*pxKm*2;
      ctx.drawImage(this.clouds.get(key),-size/2,-size/2,size,size);ctx.restore();
    }
    if(layers.rain&&s.status!=='dissipated'){
      const rainKey=`${s.id}-${s.age}-${s.wind}-${s.size}`;
      if(!this.rain.has(rainKey)){if(this.rain.size>12)this.rain.clear();this.rain.set(rainKey,rainSprite(s));}
      const w=950*s.size*pxKm*2*map.cos/cos,h=950*s.size*pxKm*2;
      ctx.drawImage(this.rain.get(rainKey),x-w/2,y-h/2,w,h);
    }
    if(layers.wind&&s.status!=='dissipated')this.drawWind(ctx,map,s,time);
    if(layers.rings&&s.status!=='dissipated'){
      for(const level of windRings(s)){
        const color={7:'#bace9a',10:'#e9bb70',12:'#ef947b'}[level];
        ctx.beginPath();
        for(let i=0;i<=96;i++){
          const a=i/96*TAU,r=radiusAt(s,level,a);
          const point=map.project(s.lon+Math.cos(a)*r/(111.2*cos),s.lat+Math.sin(a)*r/111.2);
          i?ctx.lineTo(...point):ctx.moveTo(...point);
        }
        ctx.fillStyle={7:'#bace9a08',10:'#e9bb7009',12:'#ef947b10'}[level];ctx.fill();
        ctx.strokeStyle=color;ctx.lineWidth=selected?1.1:.7;ctx.setLineDash(level===7?[4,4]:[]);ctx.stroke();ctx.setLineDash([]);
        if(selected){const r=radiusAt(s,level,-.45),p=map.project(s.lon+Math.cos(-.45)*r/(111.2*cos),s.lat+Math.sin(-.45)*r/111.2);ctx.font='10px "Avenir Next",sans-serif';ctx.fillStyle=color;ctx.fillText(`${level}`,p[0]+4,p[1]+3);}
      }
    }
    if(ex)this.drawFront(ctx,map,s);
  }
  drawWind(ctx,map,s,time){
    const rng=random(s.id*31),k=map.scale/111.2;
    const [x,y]=map.project(s.lon,s.lat);
    ctx.save();ctx.translate(x,y);ctx.scale(map.cos/Math.cos(s.lat*Math.PI/180),1);
    for(let i=0;i<95;i++){
      const r=(65+rng()*550)*s.size*k,a=rng()*TAU-time*(.03+.002*s.wind)/(1+r/60);
      ctx.beginPath();ctx.arc(0,0,r,a,a+.06+rng()*.1);ctx.strokeStyle=`rgba(217,228,206,${.14+rng()*.35})`;ctx.lineWidth=.7;ctx.stroke();
    }ctx.restore();
  }
  drawFront(ctx,map,s){
    const [x,y]=map.project(s.lon,s.lat),k=map.scale*.75*s.size;
    ctx.save();ctx.translate(x,y);ctx.strokeStyle='#9cafd0';ctx.lineWidth=1.3;ctx.setLineDash([4,3]);
    ctx.beginPath();ctx.moveTo(-k*2,-k*1.2);ctx.quadraticCurveTo(k,-k,k*4,k*4.4);ctx.stroke();ctx.setLineDash([]);
    for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(k*i,k*i*.9);ctx.lineTo(k*i-5,k*i*.9+7);ctx.lineTo(k*i+5,k*i*.9+4);ctx.closePath();ctx.fillStyle='#9cafd0';ctx.fill();}
    ctx.restore();
  }
  marker(ctx,map,s,selected){
    const [x,y]=map.project(s.lon,s.lat),c=describe(s),name=s.name?.cn||s.number||s.invest;
    ctx.save();ctx.strokeStyle=c.color;ctx.lineWidth=1.4;
    if(selected){ctx.beginPath();ctx.arc(x,y,13,0,TAU);ctx.stroke();}
    ctx.fillStyle='#102329';ctx.beginPath();ctx.arc(x,y,5,0,TAU);ctx.fill();ctx.stroke();
    ctx.fillStyle=c.color;ctx.beginPath();ctx.arc(x,y,1.7,0,TAU);ctx.fill();
    ctx.font='500 12px "PingFang SC",sans-serif';
    const label=`${name} · ${c.name}`,w=ctx.measureText(label).width;
    const lx=clamp(x+19,8,map.width-w-19),ly=clamp(y-18,18,map.height-35);
    ctx.fillStyle='#12262deb';ctx.beginPath();ctx.roundRect(lx-7,ly-16,w+14,25,4);ctx.fill();
    ctx.fillStyle=c.color;ctx.fillText(label,lx,ly+1);ctx.restore();
  }
}
