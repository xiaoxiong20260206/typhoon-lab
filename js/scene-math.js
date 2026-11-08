import {clamp} from './rules.js';
export function surfacePoint(lon,lat,height=0){
  const x=(lon-137.5)*.84,z=27.5-lat;
  return {x,y:-.0025*(x*x+z*z)+height,z};
}
export function geographicPoint(x,z){return {lon:x/.84+137.5,lat:27.5-z};}
export function cloudProfile(s){
  return {strength:clamp(s.wind/65,0,1),eye:s.wind>=32.7&&s.status==='tropical',extra:s.status==='extratropical',opacity:s.status==='dissipated'?clamp(s.cloudOpacity??0,0,1)*.45:1};
}
export function soundMix(s,view='overview'){
  if(!s||s.status==='dissipated')return {wind:0,rain:0,bass:0};
  const proximity=view==='eye'?.7:view==='follow'?1:.42;
  const strength=clamp(s.wind/65,0,1);
  return {wind:(.025+strength*.12)*proximity,rain:strength*.075*proximity,bass:strength*.018*proximity};
}
