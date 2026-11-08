import {clamp,describe} from './rules.js';
import {DEFAULT_NAMES} from './names.js';

export const DEFAULT_ENV=Object.freeze({sst:29.5,shear:9,cold:65,size:1.2});
export const SCENARIOS=Object.freeze({
  recurve:{title:'北上变性',subtitle:'暖海增强 → 转向北上 → 温带变性',lon:143,lat:16},
  landfall:{title:'西行登陆',subtitle:'西行增强 → 登陆减弱 → 残余消散',lon:137,lat:17},
  ocean:{title:'海上生命周期',subtitle:'远海生成 → 成熟台风 → 海上消散',lon:151,lat:14}
});
function event(events,hour,s,text){events.push({hour,id:s.id,text});}
function identify(s,counters,names,hour,events){
  if(s.wind>=10.8&&!s.number){s.number=`${String(++counters.number).padStart(2,'0')}W`;event(events,hour,s,`升格热带低压，编为 ${s.number}`);}
  if(s.wind>=17.2&&!s.name&&s.status==='tropical'){
    s.name=names[counters.name++%names.length];s.namedAt=hour;
    event(events,hour,s,`达到热带风暴，正式命名「${s.name.cn||s.name.en}」`);
  }
}
function movement(s,scenario,hour){
  let dx,dy;
  if(s.status==='extratropical'){dx=0.20;dy=0.045;}
  else if(scenario==='landfall'){dx=-0.21;dy=0.055+0.015*Math.sin(hour/18);}
  else if(scenario==='ocean'){dx=0.06*Math.sin(hour/24)-0.025;dy=0.10;}
  else{
    const turn=clamp((hour-62)/34,0,1);
    dx=-0.18*(1-turn)+0.14*turn;dy=0.075*(1-turn)+0.235*turn;
  }
  // Gentle inward steering before the hard simulation envelope. Not an actual weather boundary.
  if(s.lon<108)dx+=((108-s.lon)/6)*0.38;
  if(s.lon>166)dx-=((s.lon-166)/6)*0.38;
  if(s.lat>47)dy-=((s.lat-47)/6)*0.28;
  if(s.lat<7)dy+=((7-s.lat)/4)*0.15;
  s.lon=clamp(s.lon+dx,102,172);s.lat=clamp(s.lat+dy,3,53);
}
export function simulate(options={}){
  const scenario=options.scenario||'recurve',preset=SCENARIOS[scenario]||SCENARIOS.recurve;
  const env={...DEFAULT_ENV,...options.env},names=options.names?.length?options.names:DEFAULT_NAMES;
  const seeds=options.seeds||[{lon:preset.lon,lat:preset.lat}];
  const isLand=options.isLand||(()=>false),hours=Math.max(1,Math.floor(options.hours??Math.max(288,...seeds.map(s=>(s.bornAt||0)+288))));
  const counters={number:0,name:0},events=[],frames=[];
  const storms=seeds.map((seed,i)=>({
    id:i+1,invest:`${90+i%10}W`,number:null,name:null,namedAt:null,
    bornAt:Math.max(0,Math.floor(seed.bornAt||0)),scenario:seed.scenario||scenario,
    lon:clamp(seed.lon,102,172),lat:clamp(seed.lat,3,53),wind:seed.wind??9,
    size:seed.size??env.size,pressure:Math.round(1010-0.031*(seed.wind??9)**2-((seed.size??env.size)-1)*4),status:'tropical',retired:false,
    onLand:false,landHours:0,exAt:null,dissipatedAt:null,peak:seed.wind??9,age:0,
    cloudOpacity:1,cause:'暖海上的对流正在组织，尚未达到命名标准。'
  }));
  for(let hour=0;hour<=hours;hour++){
    for(const s of storms){
      if(hour<s.bornAt)continue;
      if(hour===s.bornAt){
        s.onLand=isLand(s.lon,s.lat);
        event(events,hour,s,`系统 #${s.id} 生成，监测编号 ${s.invest}`);identify(s,counters,names,hour,events);continue;
      }
      s.age=hour-s.bornAt;
      if(s.status==='dissipated'){s.cloudOpacity=Math.max(0,1-(hour-s.dissipatedAt)/12);continue;}
      const before=describe(s).name,hadName=!!s.name,hadNumber=!!s.number;
      movement(s,s.scenario,s.age);
      const land=isLand(s.lon,s.lat);
      if(land&&!s.onLand)event(events,hour,s,`中心登陆（${s.lat.toFixed(1)}°N，${s.lon.toFixed(1)}°E），开始受陆地影响`);
      if(!land&&s.onLand)event(events,hour,s,'中心重新入海，重新评估海温与风切变');
      s.onLand=land;s.landHours=land?s.landHours+1:0;
      const coldFront=40-env.cold*0.075;
      if(s.status==='tropical'&&s.lat>=coldFront&&env.cold>=20&&s.wind>=10.8){
        s.status='extratropical';s.retired=true;s.exAt=hour;
        event(events,hour,s,'与北部冷空气结合，变性为温带气旋，台风停编');
      }
      const localSST=env.sst-Math.max(0,s.lat-23)*0.30;
      const potential=clamp(30+(localSST-26)*8-env.shear*0.65,6,72);
      if(land){s.wind-=Math.max(0.45,s.wind*0.045);s.cause='中心位于陆地：水汽供应减弱、地表摩擦增强，风暴正在衰减。';}
      else if(s.status==='extratropical'){
        s.wind-=0.24+Math.max(0,hour-s.exAt-24)*0.013;
        s.cause='已变性并停编：锋面云雨仍在，温带气旋正逐渐减弱。';
      }else{
        const growth=clamp((potential-s.wind)*0.037,-0.72,0.65);
        s.wind+=growth;
        s.cause=growth>=0?'暖海持续提供能量，云系逐渐组织；环流规模与强度独立。':'海温降低或风切变偏强，对流组织受到抑制，强度下降。';
      }
      // Finite educational experiment: gradually dry out the background, not instant removal.
      if(s.age>168){s.wind-=0.20+(s.age-168)*0.016;s.cause='环境逐步干燥、能量供给衰减，系统进入消散阶段。';}
      s.wind=Math.round(clamp(s.wind,0,75)*10)/10;
      s.peak=Math.max(s.peak,s.wind);
      s.pressure=Math.round(1010-0.031*s.wind*s.wind-(s.size-1)*4+Math.sin(s.age/17)*1.8-(s.status==='extratropical'?7:0));
      identify(s,counters,names,hour,events);
      const after=describe(s).name,identityChanged=(!hadName&&s.name)||(!hadNumber&&s.number);
      if(before!==after&&s.status==='tropical'&&!identityChanged)event(events,hour,s,`强度变化：${after}，${s.wind.toFixed(1)} m/s`);
      if(s.wind<5&&s.age>12){
        s.wind=0;s.status='dissipated';s.dissipatedAt=hour;s.pressure=1010;
        s.cause='环流已消散，残余云系逐渐散去。可以回放或开始新实验。';
        event(events,hour,s,'环流消散，风雨影响结束');
      }
    }
    frames.push({hour,storms:structuredClone(storms.filter(s=>s.bornAt<=hour))});
  }
  return {frames,events,env,scenario};
}
