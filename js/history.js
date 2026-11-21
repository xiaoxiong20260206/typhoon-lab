const KEY='typhoon-lab-session-v1';

function defaultStorage(){
  try{return globalThis.localStorage;}catch{return null;}
}
const finite=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;
function normalizeSeed(seed){
  if(!seed||typeof seed!=='object')return null;
  const lon=Number(seed.lon),lat=Number(seed.lat),wind=Number(seed.wind??9),size=Number(seed.size??1.2),bornAt=Math.floor(Number(seed.bornAt??0));
  if(!finite(lon,110,165)||!finite(lat,5,28)||!finite(wind,1,75)||!finite(size,.6,2)||!finite(bornAt,0,2000))return null;
  return {lon,lat,wind,size,bornAt,scenario:['recurve','landfall','ocean'].includes(seed.scenario)?seed.scenario:undefined};
}
function normalizeHistory(value){
  if(!Array.isArray(value))return [];
  const seen=new Set(),entries=[];
  for(const item of value.slice(0,500)){
    const seed=normalizeSeed(item?.seed);
    if(!item?.id||typeof item.id!=='string'||seen.has(item.id)||!seed)continue;
    seen.add(item.id);entries.push({id:item.id,seed,createdAt:finite(Number(item.createdAt),0,4102444800000)?Number(item.createdAt):0});
  }
  return entries;
}
function normalizeEnv(value){
  const source=value&&typeof value==='object'?value:{},env={sst:29.5,shear:9,cold:65,size:1.2};
  for(const key of Object.keys(env)){const n=Number(source[key]);if(finite(n,0,100))env[key]=n;}
  env.sst=Math.min(32,Math.max(24,env.sst));env.shear=Math.min(30,Math.max(0,env.shear));
  env.cold=Math.min(100,Math.max(0,env.cold));env.size=Math.min(2,Math.max(.6,env.size));
  return env;
}
export function loadSession(storage=defaultStorage()){
  if(!storage)return null;
  let raw;
  try{raw=storage.getItem(KEY);}catch{return null;}
  if(!raw)return null;
  try{
    const data=JSON.parse(raw),history=normalizeHistory(data?.history);
    const scenario=['recurve','landfall','ocean'].includes(data?.scenario)?data.scenario:'recurve';
    const active=new Set((Array.isArray(data?.activeHistory)?data.activeHistory:[]).filter(id=>history.some(entry=>entry.id===id)));
    return {version:1,scenario,env:normalizeEnv(data?.env),history,activeHistory:[...active],hour:finite(Number(data?.hour),0,2500)?Number(data.hour):48};
  }catch{return null;}
}
export function saveSession(session,storage=defaultStorage()){
  if(!storage)return false;
  try{storage.setItem(KEY,JSON.stringify(session));return true;}catch{return false;}
}
