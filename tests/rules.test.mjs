import test from 'node:test';
import assert from 'node:assert/strict';
const r = await import('../js/rules.js').catch(() => ({}));

test('rules API exists', () => assert.equal(typeof r.classify, 'function'));
test('Chinese tropical intensity boundaries', () => {
  const samples = [[10,'热带扰动'],[10.8,'热带低压'],[17.1,'热带低压'],[17.2,'热带风暴'],[24.5,'强热带风暴'],[32.7,'台风'],[41.5,'强台风'],[51,'超强台风']];
  for (const [v,name] of samples) assert.equal(r.classify?.(v)?.name, name);
});
test('Beaufort 12 starts at 32.7 m/s', () => {
  assert.equal(r.beaufort?.(33),12); assert.equal(r.beaufort?.(32.6),11);
});
test('wind rings never appear below thresholds', () => {
  for (const [v,keys] of [[13.8,[]],[13.9,[7]],[24.4,[7]],[24.5,[7,10]],[32.6,[7,10]],[32.7,[7,10,12]]]) {
    assert.deepEqual(r.windRings?.({wind:v,size:1,lat:20}), keys.map(level=>({level})).map(x=>x.level));
  }
});
test('larger circulation increases radii independently of strength', () => {
  const a = r.ringRadii?.({wind:40,size:0.7,lat:20});
  const b = r.ringRadii?.({wind:40,size:1.5,lat:20});
  assert.ok(a && b && b[7][0]>a[7][0]);
  assert.ok(a && a[7][0]>=a[10][0] && a[10][0]>=a[12][0]);
});
test('far field has no local wind or rain impact', () => {
  const s={lon:145,lat:18,wind:45,size:1,status:'tropical'};
  const impact=r.weatherAt?.(s,116,23);
  assert.ok(impact && impact.wind<1 && impact.rain<0.1);
});
test('four quadrant order is NE, SE, SW, NW as labeled',()=>{
  const s={wind:40,size:1,lat:20};
  assert.deepEqual(r.ringRadii(s)[7],[Math.PI/4,-Math.PI/4,-3*Math.PI/4,3*Math.PI/4].map(a=>Math.round(r.radiusAt(s,7,a))));
});
