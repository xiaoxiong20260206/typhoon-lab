import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {simulate} from '../js/model.js';
import {localizeNames} from '../js/names.js';

const catalog=JSON.parse(await readFile(new URL('../assets/official-storms.json',import.meta.url),'utf8'));
const translations=JSON.parse(await readFile(new URL('../assets/official-name-translations.json',import.meta.url),'utf8'));

test('official IBTrACS catalog is complete, unique, and stays in the WNP domain',()=>{
  assert.equal(catalog.version,1);
  assert.equal(catalog.count,catalog.storms.length);
  assert.equal(catalog.storms.length,1979);
  const ids=new Set();
  for(const storm of catalog.storms){
    assert.match(storm.id,/^[0-9A-Z-]+$/);
    assert.ok(storm.name&&storm.season>=1945&&storm.season<=2026);
    assert.match(storm.source?.agency||'',/^(CMA|IBTrACS)$/);
    assert.ok(storm.points.length>=2);
    ids.add(storm.id);
    for(const point of storm.points){
      assert.ok(point[0]>=0&&point[0]<=6200);
      assert.ok(point[1]>=1000&&point[1]<=1800);
      assert.ok(point[2]>=0&&point[2]<=600);
      assert.ok(point[3]>0&&point[3]<=1100);
      assert.ok(point[4]===0||(point[4]>=850&&point[4]<=1080));
      assert.ok(point[5]>=0&&point[5]<=5);
    }
  }
  assert.equal(ids.size,catalog.storms.length);
});

test('official storms carry bilingual names without changing IBTrACS records',()=>{
  assert.equal(translations.version,1);
  assert.equal(translations.count,Object.keys(translations.names).length);
  for(const storm of catalog.storms){
    const zh=storm.nameZh||translations.names[storm.name];
    assert.ok(zh,'official storm should have a Chinese name');
    assert.match(zh,/[㐀-鿿]/);
  }
  assert.equal(translations.names.HINNAMNOR,'轩岚诺');

});

test('CMA official-site records override IBTrACS where available',()=>{
  const cmaStorms=catalog.storms.filter(storm=>storm.source?.agency==='CMA');
  assert.equal(cmaStorms.length,614);
  assert.ok(cmaStorms.every(storm=>storm.season>=2000));
  assert.ok(cmaStorms.every(storm=>storm.source?.name==='中央气象台 · 台风网'));
  assert.ok(cmaStorms.every(storm=>/^https:\/\/typhoon\.nmc\.cn\/web\.html\?tid=\d+$/.test(storm.source?.url||'')));
  const dolphin=catalog.storms.find(storm=>storm.name==='DOLPHIN'&&storm.season===2020);
  assert.equal(dolphin.source.agency,'CMA');
  assert.equal(dolphin.start,'2020-09-20T00:00:00Z');
  assert.deepEqual(dolphin.points[0],[0,1342,235,130,1002,1]);
  assert.ok(dolphin.source.url.includes('typhoon.nmc.cn'));
  assert.ok(catalog.storms.filter(storm=>storm.season>=2000).every(storm=>['CMA','IBTrACS'].includes(storm.source?.agency)));
});

test('official storms replay their historical track without consuming the naming list',()=>{
  const hinnamnor=catalog.storms.find(storm=>storm.name==='HINNAMNOR'&&storm.season===2022);
  assert.ok(hinnamnor,'Hinnamnor should be present in the official catalog');
  const bilingualHinnamnor={...hinnamnor,nameZh:translations.names[hinnamnor.name]};
  const names=localizeNames({names:[{cn:'达维',en:'Damrey'},{cn:'海葵',en:'Haikui'}]});
  const run=simulate({
    scenario:'recurve',
    names,
    seeds:[{sourceId:'base',lon:143,lat:16},{sourceId:'official:'+hinnamnor.id,kind:'official',official:bilingualHinnamnor}],
    isLand:()=>false
  });
  const official=run.frames[0].storms.find(storm=>storm.sourceId==='official:'+hinnamnor.id);
  assert.equal(official.name.en,'HINNAMNOR');
  assert.equal(official.name.cn,'轩岚诺');
  assert.equal(official.custom,false);
  assert.equal(official.official.season,2022);
  assert.ok(official.lon>=100&&official.lon<=180&&official.lat>=0&&official.lat<=60);
  const namedHour=run.frames.findIndex(frame=>frame.storms.some(storm=>storm.sourceId==='base'&&storm.name?.en==='Damrey'));
  assert.ok(namedHour>0,'the simulated base storm still receives the first naming-list entry');
  const pointHour=hinnamnor.points.find(point=>point[0]===600);
  if(pointHour){
    const replay=run.frames[60].storms.find(storm=>storm.sourceId==='official:'+hinnamnor.id);
    assert.equal(Math.round(replay.lon*10),pointHour[1]);
    assert.equal(Math.round(replay.lat*10),pointHour[2]);
    assert.equal(Math.round(replay.wind*10),pointHour[3]);
  }
  const finalPoint=hinnamnor.points.at(-1),finalHour=Math.floor(finalPoint[0]/10);
  const finalStorm=run.frames[Math.min(finalHour,run.frames.length-1)].storms.find(storm=>storm.sourceId==='official:'+hinnamnor.id);
  assert.ok(['tropical','extratropical','dissipated'].includes(finalStorm.status));
});

test('official storms are not recalculated by experiment environment parameters',()=>{
  const hinnamnor=catalog.storms.find(storm=>storm.name==='HINNAMNOR'&&storm.season===2022);
  const bilingualHinnamnor={...hinnamnor,nameZh:translations.names[hinnamnor.name]};
  const seeds=[{sourceId:'base',lon:143,lat:16},{sourceId:'official:'+hinnamnor.id,kind:'official',official:bilingualHinnamnor}];
  const calm=simulate({scenario:'recurve',env:{sst:30,shear:2,cold:0,size:1},names:[],seeds,isLand:()=>false});
  const harsh=simulate({scenario:'recurve',env:{sst:24,shear:30,cold:90,size:2},names:[],seeds,isLand:()=>false});
  for(let hour=0;hour<Math.min(calm.frames.length,harsh.frames.length);hour+=6){
    const a=calm.frames[hour].storms.find(storm=>storm.sourceId==='official:'+hinnamnor.id);
    const b=harsh.frames[hour].storms.find(storm=>storm.sourceId==='official:'+hinnamnor.id);
    assert.equal(a.lon,b.lon);
    assert.equal(a.lat,b.lat);
    assert.equal(a.wind,b.wind);
    assert.equal(a.pressure,b.pressure);
  }
});
