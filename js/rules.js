export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const INTENSITIES=Object.freeze([
  {min:0,name:'热带扰动',code:'INVEST',color:'#9baba5'},
  {min:10.8,name:'热带低压',code:'TD',color:'#82b0b6'},
  {min:17.2,name:'热带风暴',code:'TS',color:'#88bd89'},
  {min:24.5,name:'强热带风暴',code:'STS',color:'#e1cb77'},
  {min:32.7,name:'台风',code:'TY',color:'#f4a56f'},
  {min:41.5,name:'强台风',code:'STY',color:'#eb7f6f'},
  {min:51,name:'超强台风',code:'SuperTY',color:'#d294b4'}
]);
export const THRESHOLDS=Object.freeze({7:13.9,10:24.5,12:32.7});
const BEAUFORT=[0,0.3,1.6,3.4,5.5,8,10.8,13.9,17.2,20.8,24.5,28.5,32.7,37,41.5,46.2,51,56.1,61.3];
export function beaufort(wind){return BEAUFORT.findLastIndex(v=>wind>=v);}
export function classify(wind){return INTENSITIES.findLast(c=>wind>=c.min)||INTENSITIES[0];}
export function windRings(s){return s.status==='dissipated'?[]:[7,10,12].filter(n=>s.wind>=THRESHOLDS[n]);}
export function asymmetry(angle,s){return 1+0.13*Math.sin(angle+0.8)+0.055*Math.cos(angle*2+(s.lat||0)/20);}
export function eyeRadius(s){return (24+30*(1-clamp(s.wind/65,0,1)))*s.size;}
export function radiusAt(s,level,angle=0){
  if(s.wind<THRESHOLDS[level]||s.status==='dissipated')return 0;
  const r=eyeRadius(s)+220*s.size*Math.pow(Math.log(s.wind/THRESHOLDS[level]),1/1.35);
  return r*asymmetry(angle,s);
}
export function ringRadii(s){return Object.fromEntries(windRings(s).map(level=>[level,[Math.PI/4,-Math.PI/4,-Math.PI*3/4,Math.PI*3/4].map(a=>Math.round(radiusAt(s,level,a)))]));}
export function distance(lon1,lat1,lon2,lat2){
  const x=(lon2-lon1)*111.2*Math.cos((lat1+lat2)*Math.PI/360),y=(lat2-lat1)*111.2;
  return Math.hypot(x,y);
}
export function weatherAt(s,lon,lat){
  if(s.status==='dissipated')return {wind:0,rain:0};
  const dx=(lon-s.lon)*111.2*Math.cos(s.lat*Math.PI/180),dy=(lat-s.lat)*111.2;
  const angle=Math.atan2(dy,dx),r=Math.hypot(dx,dy)/asymmetry(angle,s),rm=eyeRadius(s);
  const wind=r<rm?s.wind*r/rm:s.wind*Math.exp(-Math.pow((r-rm)/(220*s.size),1.35));
  const ex=s.status==='extratropical';
  const rainR=ex?Math.hypot(dx/1.7,dy/0.85):Math.hypot(dx,dy);
  const bands=0.55+0.45*Math.pow(Math.cos(angle*3+rainR/(75*s.size)),2);
  const rain=(s.wind*0.85)*Math.exp(-Math.pow(rainR/(210*s.size),1.7))*bands*(r<rm*0.65&&s.wind>=32.7?0.08:1);
  return {wind:wind<0.25?0:wind,rain:rain<0.1?0:rain};
}
export function describe(s){
  if(s.status==='dissipated')return {name:'已消散',code:'END',color:'#7f8983'};
  if(s.status==='extratropical')return {name:'温带气旋',code:'EX',color:'#b9adcf'};
  if(s.number&&s.wind<10.8)return {name:'残余低压',code:'L',color:'#9baba5'};
  return classify(s.wind);
}
