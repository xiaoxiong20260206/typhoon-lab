import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {simulate} from '../js/model.js';
import {localizeNames} from '../js/names.js';

const catalog=JSON.parse(await readFile(new URL('../assets/official-storms.json',import.meta.url),'utf8'));

test('official IBTrACS catalog is complete, unique, and stays in the WNP domain',()=>{
  assert.equal(catalog.version,1);
  assert.equal(catalog.count,catalog.storms.length);
  assert.equal(catalog.storms.length,1965);
  const ids=new Set();
  for(const storm of catalog.storms){
    assert.match(storm.id,/^[0-9A-Z]+$/);
    assert.ok(storm.name&&storm.season>=1945&&storm.season<=2026);
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

test('official storms replay their historical track without consuming the naming list',()=>{
  const hinnamnor=catalog.storms.find(storm=>storm.name==='HINNAMNOR'&&storm.season===2022);
  assert.ok(hinnamnor,'Hinnamnor should be present in the official catalog');
  const names=localizeNames({names:[{cn:'达维',en:'Damrey'},{cn:'海葵',en:'Haikui'}]});
  const run=simulate({
    scenario:'recurve',
    names,
    seeds:[{sourceId:'base',lon:143,lat:16},{sourceId:'official:'+hinnamnor.id,kind:'official',official:hinnamnor}],
    isLand:()=>false
  });
  const official=run.frames[0].storms.find(storm=>storm.sourceId==='official:'+hinnamnor.id);
  assert.equal(official.name.en,'HINNAMNOR');
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
