import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

/*
 * Prefer the China Meteorological Administration's public best-track records
 * for named WNP storms from 2000 onward. Older records remain IBTrACS because
 * the public NMC archive starts in 2000. The source file for each storm makes
 * this distinction visible in the app; no data is silently relabelled.
 */
const root=resolve(import.meta.dirname,'..');
const catalogPath=process.argv[2]||resolve(root,'assets/official-storms.json');
const outputPath=process.argv[3]||catalogPath;
const baseUrl='https://typhoon.nmc.cn/weatherservice/typhoon/jsons';
const firstYear=2000,lastYear=2026;

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const parseJsonp=text=>JSON.parse(text.replace(/^[^(]+\(/,'').replace(/\)\s*$/,''));
async function request(path,attempts=4){
  let lastError;
  for(let attempt=0;attempt<attempts;attempt++){
    try{
      const response=await fetch(`${baseUrl}/${path}?t=${Date.now()}`);
      if(!response.ok)throw Error(`HTTP ${response.status}`);
      return parseJsonp(await response.text());
    }catch(error){lastError=error;await delay(180*(attempt+1));}
  }
  throw lastError;
}
async function mapLimit(items,limit,worker){
  const results=new Array(items.length);let cursor=0;
  const runners=Array.from({length:Math.min(limit,items.length)},async()=>{
    while(cursor<items.length){const index=cursor++;results[index]=await worker(items[index],index);}
  });
  await Promise.all(runners);return results;
}
const normalized=name=>String(name||'').toUpperCase().replace(/[^A-Z]/g,'');
const nature=status=>({TS:0,NR:1,DS:2,MX:3,ET:4,SS:5}[status]??1);

const catalog=JSON.parse(await readFile(catalogPath,'utf8'));
const listYears=Array.from({length:lastYear-firstYear+1},(_,index)=>firstYear+index);
const lists=await mapLimit(listYears,5,async year=>{
  const data=await request(`list_${year}`);
  return data.typhoonList.filter(item=>item[1]&&item[1]!=='nameless'&&item[2]).map(item=>({id:item[0],name:item[1],nameZh:item[2],number:item[3],season:year}));
});
const entries=lists.flat();
const records=await mapLimit(entries,10,async entry=>{
  const data=await request(`view_${entry.id}`),rows=data?.typhoon?.[8];
  if(!Array.isArray(rows)||!rows.length)return null;
  const points=rows.map(row=>{
    const time=Date.parse(`${row[1].slice(0,4)}-${row[1].slice(4,6)}-${row[1].slice(6,8)}T${row[1].slice(8,10)}:00:00Z`);
    return {time,lon:Number(row[4]),lat:Number(row[5]),pressure:Number(row[6]),wind:Number(row[7]),nature:nature(row[3])};
  }).filter(point=>Number.isFinite(point.time)&&Number.isFinite(point.lon)&&Number.isFinite(point.lat)&&Number.isFinite(point.wind));
  if(points.length<2||points.some(point=>point.lon<100||point.lon>180||point.lat<0||point.lat>60))return null;
  points.sort((a,b)=>a.time-b.time);
  const first=points[0],number=String(entry.number||'').replace(/^0+/,'');
  return {
    cmaId:String(entry.id),name:entry.name.toUpperCase(),nameZh:entry.nameZh,season:entry.season,
    number:number?`${number}号`:'',start:new Date(first.time).toISOString().slice(0,19)+'Z',
    points:points.map(point=>[Math.round((point.time-first.time)/3600000*10),Math.round(point.lon*10),Math.round(point.lat*10),Math.round(point.wind*10),Math.round(point.pressure),point.nature]),
    agency:'CMA',source:{name:'中央气象台 · 台风网',agency:'CMA',url:`https://typhoon.nmc.cn/web.html?tid=${entry.id}`,retrievedAt:'2026-11-21'}
  };
});
const cma=records.filter(Boolean);
const bySeasonName=new Map(cma.map(record=>[`${record.season}:${normalized(record.name)}`,record]));
const matched=new Set();let replaced=0,added=0;
for(const storm of catalog.storms){
  const key=`${storm.season}:${normalized(storm.name)}`,record=bySeasonName.get(key);
  if(record){
    storm.name=record.name;storm.nameZh=record.nameZh;storm.number=record.number;storm.start=record.start;storm.points=record.points;
    storm.agency='CMA';storm.source=record.source;storm.cmaId=record.cmaId;matched.add(key);replaced++;
  }else if(!storm.source){
    storm.agency='IBTrACS';storm.source={name:'NOAA NCEI IBTrACS',agency:'IBTrACS',dataset:'v04r01',url:'https://doi.org/10.25921/82ty-9e16'};
  }
}
for(const record of cma){
  const key=`${record.season}:${normalized(record.name)}`;
  if(matched.has(key))continue;
  catalog.storms.push({id:`CMA-${record.cmaId}`,...record});added++;
}
catalog.storms.sort((a,b)=>a.season-b.season||a.name.localeCompare(b.name));
catalog.count=catalog.storms.length;
catalog.sources=[
  {name:'中央气象台 · 台风网',agency:'CMA',url:'https://typhoon.nmc.cn/web.html',coverage:'2000–2026 named storms'},
  {name:'NOAA NCEI IBTrACS v04r01',agency:'IBTrACS',url:'https://doi.org/10.25921/82ty-9e16',coverage:'1945–2026 archival best tracks'}
];
catalog.preferredSource='CMA where an official 2000–2026 record is available; IBTrACS otherwise';
await writeFile(outputPath,JSON.stringify(catalog));
console.log(JSON.stringify({output:outputPath,count:catalog.count,cmaRecords:cma.length,replaced,added,points:catalog.storms.reduce((sum,storm)=>sum+storm.points.length,0)},null,2));
