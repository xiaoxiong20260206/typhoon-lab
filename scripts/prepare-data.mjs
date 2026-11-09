import { mkdir, writeFile } from 'node:fs/promises';

// Build-time source ingestion only; the simulator never fetches remote data.
const nameURL='https://www.jma.go.jp/jma/jma-eng/jma-center/rsmc-hp-pub-eg/tyname.html';
const landURL='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson';
const read=async url=>{const r=await fetch(url);if(!r.ok)throw Error(`${r.status}: ${url}`);return r;};
const html=await (await read(nameURL)).text();
const table=html.match(/<table[\s\S]*?<\/table>/i)?.[0];
const rows=[...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map(row=>[...row[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1].replace(/<[^>]*>/g,'').trim())).filter(r=>r.length===6);
if(rows.length!==28)throw Error('Expected 28 rows, 5 name columns');
const names=Array.from({length:5},(_,col)=>rows.map(row=>({en:row[col+1],contributor:row[0]}))).flat();
if(names.length!==140||names[0].en!=='Damrey')throw Error('Naming table validation failed');
await mkdir('assets',{recursive:true});
await writeFile('assets/names.json',JSON.stringify({version:'JMA 2026',source:nameURL,names},null,2));

function clip(ring,axis,bound,greater){
  const out=[];let a=ring.at(-1);let ai=greater?a[axis]>=bound:a[axis]<=bound;
  for(const b of ring){const bi=greater?b[axis]>=bound:b[axis]<=bound;
    if(ai!==bi){const t=(bound-a[axis])/(b[axis]-a[axis]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
    if(bi)out.push(b);a=b;ai=bi;
  }return out;
}
const raw=await (await read(landURL)).json();
const polygons=[];
for(const f of raw.features){
  for(const poly of (f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates)){
    const clipped=[];
    for(let ring of poly){
      if(!ring.some(p=>p[0]>=98&&p[0]<=177&&p[1]>=-2&&p[1]<=57))continue;
      for(const [axis,bound,greater] of [[0,98,true],[0,177,false],[1,-2,true],[1,57,false]]){
        if(ring.length)ring=clip(ring,axis,bound,greater);
      }
      if(ring.length>2)clipped.push(ring.map(p=>p.map(v=>Math.round(v*10000)/10000)));
    }
    if(clipped.length)polygons.push(clipped);
  }
}
await writeFile('assets/land.json',JSON.stringify({source:landURL,license:'Natural Earth — public domain',polygons}));
console.log(`Saved ${names.length} fixed names and ${polygons.length} regional land polygons.`);
