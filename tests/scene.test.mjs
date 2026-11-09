import test from 'node:test';
import assert from 'node:assert/strict';
import {surfacePoint,geographicPoint,cloudProfile,soundMix} from '../js/scene-math.js';
import * as sceneMath from '../js/scene-math.js';
test('cloud detail budget prioritizes selected storms without hiding others',()=>{
  assert.equal(typeof sceneMath.cloudDetail,'function');
  const near=sceneMath.cloudDetail('auto',true,'eye',8),far=sceneMath.cloudDetail('auto',false,'overview',8),low=sceneMath.cloudDetail('low',true,'eye',8);
  assert.ok(near.segments>far.segments&&near.particles>far.particles);
  assert.ok(far.particles>0&&far.segments>=12);
  assert.ok(low.segments<near.segments&&low.particles<near.particles);
  assert.ok((near.segments**2+7*far.segments**2)*4<50000);
});
test('3D geography round trips inside northwest Pacific',()=>{
  for(const [lon,lat] of [[100,0],[175,55],[121,24],[143,16]]){const p=surfacePoint(lon,lat);const restored=geographicPoint(p.x,p.z);assert.ok(Math.abs(restored.lon-lon)<1e-8);assert.ok(Math.abs(restored.lat-lat)<1e-8);assert.ok(Number.isFinite(p.y));}
});
test('visual eye and cloud profile follow intensity and tropical status',()=>{
  assert.equal(cloudProfile({wind:20,status:'tropical'}).eye,false);
  assert.equal(cloudProfile({wind:40,status:'tropical'}).eye,true);
  assert.equal(cloudProfile({wind:40,status:'extratropical'}).eye,false);
  assert.equal(cloudProfile({wind:0,status:'dissipated',cloudOpacity:0}).opacity,0);
});
test('sound mix stays finite and dissipated systems are silent',()=>{
  for(const view of ['overview','follow','eye'])for(const wind of [0,9,17.2,33,75])for(const v of Object.values(soundMix({wind,status:'tropical'},view)))assert.ok(v>=0&&v<.2);
  assert.deepEqual(soundMix({wind:50,status:'dissipated'}),{wind:0,rain:0,bass:0});
  assert.ok(soundMix({wind:40,status:'tropical'},'follow').wind>soundMix({wind:40,status:'tropical'},'overview').wind);
});
