import test from 'node:test';
import assert from 'node:assert/strict';
const m = await import('../js/model.js').catch(() => ({}));

test('simulation API exists',()=>assert.equal(typeof m.simulate,'function'));
test('naming only at tropical storm threshold and sequential fixed names',()=>{
  const run=m.simulate?.({seeds:[{lon:140,lat:16},{lon:150,lat:15}],hours:80});
  assert.ok(run);
  for(const frame of run.frames) for(const s of frame.storms) {
    if(!s.namedAt) assert.equal(s.name,null);
    if(s.namedAt===frame.hour) assert.ok(s.wind>=17.2);
  }
  const end=run.frames.at(-1).storms;
  assert.equal(end[0].name.en,'Damrey'); assert.equal(end[1].name.en,'Tianma');
  assert.equal(end[0].number,'01W'); assert.equal(end[1].number,'02W');
});
test('all scenario tracks stay inside west Pacific and eventually dissipate',()=>{
  for(const scenario of ['recurve','landfall','ocean']) {
    const run=m.simulate?.({scenario,hours:288}); assert.ok(run);
    for(const f of run.frames) for(const s of f.storms) {
      assert.ok(s.lon>=102&&s.lon<=172&&s.lat>=3&&s.lat<=53);
    }
    assert.equal(run.frames.at(-1).storms[0].status,'dissipated');
  }
});
test('cold northern cyclone becomes extratropical, retires, then dissipates',()=>{
  const run=m.simulate?.({seeds:[{lon:150,lat:35,wind:35}],env:{cold:90},hours:180});
  assert.ok(run);
  const ex=run.frames.find(f=>f.storms[0].status==='extratropical')?.storms[0];
  assert.ok(ex?.retired && ex.wind>0);
  assert.equal(run.frames.at(-1).storms[0].status,'dissipated');
});
test('continuous land exposure weakens and dissipates a typhoon',()=>{
  const run=m.simulate?.({seeds:[{lon:115,lat:25,wind:45}],isLand:()=>true,hours:120});
  assert.ok(run); assert.ok(run.frames[12].storms[0].wind<45);
  assert.equal(run.frames.at(-1).storms[0].status,'dissipated');
});
test('weakening transitions remain in event history, never return to an unnamed disturbance',()=>{
  const run=m.simulate({seeds:[{lon:115,lat:25,wind:45}],isLand:()=>true,hours:120});
  assert.ok(run.events.some(e=>e.text.includes('强度变化：热带风暴')));
  assert.ok(run.events.some(e=>e.text.includes('强度变化：热带低压')));
  assert.ok(run.events.some(e=>e.text.includes('强度变化：残余低压')));
});
