import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {simulate} from '../js/model.js';
import {makeLandTest,pointInRing} from '../js/geo.js';
import {localizeNames} from '../js/names.js';
import {ringRadii,weatherAt,THRESHOLDS,radiusAt,describe} from '../js/rules.js';

const landData=JSON.parse(await readFile(new URL('../assets/land.json',import.meta.url)));
const nameData=JSON.parse(await readFile(new URL('../assets/names.json',import.meta.url)));
const isLand=makeLandTest(landData.polygons),names=localizeNames(nameData);

test('fixed complete official list, column-major order, immutable records',()=>{
  assert.equal(names.length,140);assert.equal(new Set(names.map(n=>n.en)).size,140);
  assert.equal(names[0].en,'Damrey');assert.equal(names[1].en,'Tianma');assert.equal(names[28].en,'Koki');assert.equal(names[139].en,'Saobien');
  assert.ok(Object.isFrozen(names));assert.ok(Object.isFrozen(names[0]));
});
test('shared land geometry classifies mainland, Taiwan, Japan and ocean',()=>{
  assert.equal(isLand(116,40),true);assert.equal(isLand(121.5,25),true);assert.equal(isLand(139.7,35.7),true);assert.equal(isLand(140,18),false);
  assert.equal(pointInRing(1,1,[[0,0],[2,0],[2,2],[0,2]]),true);
});
test('ring isolines match the actual local surface wind field',()=>{
  const s={lon:140,lat:20,wind:40,size:1.3,status:'tropical'};
  for(const level of [7,10,12])for(const a of [0,Math.PI/4,Math.PI/2,Math.PI]){
    const r=radiusAt(s,level,a),lon=s.lon+Math.cos(a)*r/(111.2*Math.cos(s.lat*Math.PI/180)),lat=s.lat+Math.sin(a)*r/111.2;
    assert.ok(Math.abs(weatherAt(s,lon,lat).wind-THRESHOLDS[level])<.05);
  }
});
test('real coastline landfall scenario actually lands and dissipates',()=>{
  const run=simulate({scenario:'landfall',isLand,names});
  const land=run.frames.find(f=>f.storms[0].onLand);assert.ok(land);
  assert.ok(run.frames[land.hour+12].storms[0].wind<land.storms[0].wind);
  assert.equal(run.frames.at(-1).storms[0].status,'dissipated');
});
test('real coastline northern scenario changes cloud type and retires',()=>{
  const run=simulate({scenario:'recurve',isLand,names});
  const ex=run.frames.find(f=>f.storms[0].status==='extratropical');assert.ok(ex);
  assert.ok(ex.storms[0].lat>=30&&ex.storms[0].retired);
  assert.equal(describe(ex.storms[0]).name,'温带气旋');
  assert.ok(run.frames.slice(ex.hour+1).some(f=>f.storms[0].wind>0));
  assert.equal(run.frames.at(-1).storms[0].status,'dissipated');
});
test('deterministic timeline and numbering survive repeated rebuilds',()=>{
  const settings={scenario:'recurve',isLand,names,seeds:[{lon:141,lat:18},{lon:150,lat:16}]};
  assert.deepEqual(simulate(settings),simulate(settings));
});
test('parameter extremes are finite, bounded, rings nested and lifetime finite',()=>{
  for(const sst of [24,32])for(const shear of [0,30])for(const size of [.6,2])for(const cold of [0,100]){
    const run=simulate({env:{sst,shear,size,cold},isLand,names});
    for(const f of run.frames)for(const s of f.storms){
      assert.ok(Number.isFinite(s.wind)&&Number.isFinite(s.pressure));
      assert.ok(s.lon>=102&&s.lon<=172&&s.lat>=3&&s.lat<=53);
      const rings=ringRadii(s);if(rings[12])for(let i=0;i<4;i++)assert.ok(rings[7][i]>=rings[10][i]&&rings[10][i]>=rings[12][i]);
      if(s.name)assert.ok(s.namedAt!==null&&run.frames[s.namedAt].storms[s.id-1].wind>=17.2);
    }
    assert.equal(run.frames.at(-1).storms[0].status,'dissipated');
  }
});
test('dissipation removes wind and rain, leaving only fading residual cloud',()=>{
  const run=simulate({isLand,names}),s=run.frames.at(-1).storms[0];
  assert.deepEqual(weatherAt(s,s.lon,s.lat),{wind:0,rain:0});
  assert.deepEqual(ringRadii(s),{});assert.equal(s.cloudOpacity,0);
});
