import {cleanCustomName} from './naming.js?v=f105babb07bd';

export const SESSION_KEY='typhoon-lab-session-v1';
export const BACKUP_KEY=`${SESSION_KEY}-backup`;

function defaultStorage(){
  try{return globalThis.localStorage;}catch{return null;}
}
const finite=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;
function normalizeSeed(seed){
  if(!seed||typeof seed!=='object')return null;
  const lon=Number(seed.lon),lat=Number(seed.lat),wind=Number(seed.wind??9),size=Number(seed.size??1.2),bornAt=Math.floor(Number(seed.bornAt??0));
  if(!finite(lon,110,165)||!finite(lat,5,28)||!finite(wind,1,75)||!finite(size,.6,2)||!finite(bornAt,0,2000))return null;
  const customName=cleanCustomName(seed.customName);
  return {lon,lat,wind,size,bornAt,scenario:['recurve','landfall','ocean'].includes(seed.scenario)?seed.scenario:undefined,customName:customName||undefined};
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
function parseSession(raw){
  if(!raw)return null;
  try{
    const data=JSON.parse(raw);
    if(!data||typeof data!=='object'||Array.isArray(data)||!['history','scenario','hour'].some(key=>key in data))return null;
    const history=normalizeHistory(data.history);
    const scenario=['recurve','landfall','ocean'].includes(data?.scenario)?data.scenario:'recurve';
    const active=new Set((Array.isArray(data?.activeHistory)?data.activeHistory:[]).filter(id=>history.some(entry=>entry.id===id)));
    const activeOfficial=[...new Set((Array.isArray(data?.activeOfficial)?data.activeOfficial:[]).filter(value=>typeof value==='string'))].slice(0,500);
    const visibleStorms=data?.visibleStorms===null?null:Array.isArray(data?.visibleStorms)
      ?[...new Set(data.visibleStorms.filter(value=>typeof value==='string'))].slice(0,500):null;
    return {version:1,scenario,env:normalizeEnv(data?.env),history,activeHistory:[...active],activeOfficial,visibleStorms,hour:finite(Number(data?.hour),0,2500)?Number(data.hour):48};
  }catch{return null;}
}
export function loadSession(storage=defaultStorage()){
  if(!storage)return null;
  const keys=[SESSION_KEY,BACKUP_KEY];
  for(const [index,key] of keys.entries()){
    let raw;
    try{raw=storage.getItem(key);}catch{return null;}
    const session=parseSession(raw);
    if(session){
      if(index&&raw)try{storage.setItem(SESSION_KEY,raw);}catch{}
      return session;
    }
  }
  return null;
}
export function saveSession(session,storage=defaultStorage()){
  if(!storage)return false;
  let raw;
  try{raw=JSON.stringify(session);}catch{return false;}
  let saved=false;
  for(const key of [SESSION_KEY,BACKUP_KEY]){
    try{storage.setItem(key,raw);saved=true;}catch{}
  }
  return saved;
}
export function storageAvailable(storage=defaultStorage()){
  if(!storage)return false;
  const probe=`${SESSION_KEY}-probe`;
  try{storage.setItem(probe,'1');storage.removeItem(probe);return true;}catch{return false;}
}
