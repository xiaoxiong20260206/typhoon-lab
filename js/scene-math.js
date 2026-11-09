import {clamp} from './rules.js';
export function surfacePoint(lon,lat,height=0){
  const x=(lon-137.5)*.84,z=27.5-lat;
  return {x,y:-.0025*(x*x+z*z)+height,z};
}
export function geographicPoint(x,z){return {lon:x/.84+137.5,lat:27.5-z};}
export function cloudDetail(quality,selected,mode,count=1){
  if(quality==='low')return selected?{segments:28,particles:450}:{segments:12,particles:160};
  if(!selected)return {segments:count>12?12:18,particles:count>12?160:260};
  if(mode==='overview')return {segments:32,particles:600};
  return quality==='high'?{segments:64,particles:1500}:{segments:48,particles:1100};
}
export function cloudProfile(s){
  const strength=clamp(s.wind/65,0,1),eye=s.wind>=32.7&&s.status==='tropical';
  return {strength,eye,eyeRadius:eye?.75+strength*.35:0,extra:s.status==='extratropical',opacity:s.status==='dissipated'?clamp(s.cloudOpacity??0,0,1)*.45:1};
}
export function soundMix(s,view='overview'){
  if(!s||s.status==='dissipated')return {wind:0,rain:0,bass:0};
  const proximity=view==='eye'?.7:view==='follow'?1:.42;
  const strength=clamp(s.wind/65,0,1);
  return {wind:(.025+strength*.12)*proximity,rain:strength*.075*proximity,bass:strength*.018*proximity};
}
