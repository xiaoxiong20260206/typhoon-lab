import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

/*
 * Build the browser-facing official-storm catalog from the local IBTrACS CSV.
 * The 109 MB source file stays in Output/ and is never packaged for Pages.
 * Only named WNP systems whose complete track remains in the simulator map
 * domain are retained, so a selected official storm cannot cross into the
 * central/eastern Pacific basin.
 */
const root=resolve(import.meta.dirname,'..');
const sourcePath=process.argv[2]||resolve(root,'Output/ibtracs.WP.v04r01.csv');
const outputPath=process.argv[3]||resolve(root,'assets/official-storms.json');

function parseLine(line){
  const values=[];let value='',quoted=false;
  for(const char of line){
    if(char==='"')quoted=!quoted;
    else if(char===','&&!quoted){values.push(value.trim());value='';}
    else value+=char;
  }
  values.push(value.trim());return values;
}

const firstFinite=(...values)=>values.map(Number).find(value=>Number.isFinite(value)&&value>0);
const knotsToMetersPerSecond=knots=>knots*0.514444;
const natureCode={TS:0,NR:1,DS:2,MX:3,ET:4,SS:5};

const text=await readFile(sourcePath,'utf8');
const lines=text.split(/\r?\n/);
const headers=parseLine(lines[0]);
const col=Object.fromEntries(headers.map((name,index)=>[name,index]));
const storms=new Map();

for(let index=2;index<lines.length;index++){
  const line=lines[index];if(!line)continue;
  const row=parseLine(line),sid=row[col.SID],name=row[col.NAME];
  const season=Number(row[col.SEASON]);
  if(!sid||!name||name==='UNNAMED'||!Number.isFinite(season)||season<1945)continue;
  const lon=Number(row[col.LON]),lat=Number(row[col.LAT]);
  const windKnots=firstFinite(row[col.WMO_WIND],row[col.TOKYO_WIND],row[col.CMA_WIND],row[col.USA_WIND]);
  if(!Number.isFinite(lon)||!Number.isFinite(lat)||!Number.isFinite(windKnots))continue;
  let storm=storms.get(sid);
  if(!storm){storm={sid,name,season,number:Number(row[col.NUMBER]),points:[]};storms.set(sid,storm);}
  const time=Date.parse(row[col.ISO_TIME].replace(' ','T')+'Z');
  const pressure=firstFinite(row[col.WMO_PRES],row[col.TOKYO_PRES],row[col.CMA_PRES],row[col.USA_PRES]);
  storm.points.push({time,lon,lat,windKnots,pressure:pressure&&pressure>=850&&pressure<=1080?pressure:0,nature:row[col.NATURE]});
}

const retained=[...storms.values()].filter(storm=>{
  if(storm.points.length<2)return false;
  storm.points.sort((a,b)=>a.time-b.time);
  return storm.points.every(point=>point.lon>=100&&point.lon<=180&&point.lat>=0&&point.lat<=60);
}).map(storm=>{
  const first=storm.points[0];
  return {
    id:storm.sid,
    name:storm.name,
    season:storm.season,
    number:storm.number>0?String(storm.number)+'W':'',
    start:new Date(first.time).toISOString().slice(0,19)+'Z',
    points:storm.points.map(point=>[
      Math.round((point.time-first.time)/3600000*10),
      Math.round(point.lon*10),
      Math.round(point.lat*10),
      Math.round(knotsToMetersPerSecond(point.windKnots)*10),
      Math.round(point.pressure),
      natureCode[point.nature]??1
    ])
  };
}).sort((a,b)=>a.season-b.season||a.name.localeCompare(b.name));

const output={
  version:1,
  count:retained.length,
  source:{
    name:'NOAA NCEI International Best Track Archive for Climate Stewardship (IBTrACS)',
    dataset:'v04r01',
    url:'https://doi.org/10.25921/82ty-9e16',
    downloadedAt:'2026-11-21',
    domain:'Western North Pacific, 1945–2026, named storms with usable intensity'
  },
  coding:{point:['hours since start * 10','longitude * 10','latitude * 10','wind m/s * 10','pressure hPa or 0','nature 0 TS / 1 NR / 2 DS / 3 MX / 4 ET / 5 SS']},
  storms:retained
};

await writeFile(outputPath,JSON.stringify(output));
console.log(JSON.stringify({output:outputPath,storms:retained.length,points:retained.reduce((sum,storm)=>sum+storm.points.length,0),maxHours:Math.max(...retained.map(storm=>storm.points.at(-1)[0]/10))},null,2));
