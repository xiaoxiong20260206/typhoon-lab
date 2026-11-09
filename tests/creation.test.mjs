import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {simulate} from '../js/model.js';
import {localizeNames} from '../js/names.js';
const names=localizeNames(JSON.parse(await readFile(new URL('../assets/names.json',import.meta.url))));

test('a later seed is not present, aged or named before birth',()=>{
  const run=simulate({names,seeds:[{lon:145,lat:15},{lon:155,lat:18,bornAt:70}],hours:85});
  assert.equal(run.frames[69].storms.length,1);
  const born=run.frames[70].storms.find(s=>s.id===2);
  assert.equal(born.age,0);assert.equal(born.name,null);assert.equal(born.wind,9);
});
test('a failed unnamed embryo does not consume Damrey',()=>{
  const run=simulate({names,seeds:[{lon:112,lat:20,wind:6},{lon:155,lat:15,bornAt:60,wind:17.2}],isLand:lon=>lon<120,hours:65});
  const first=run.frames[59].storms[0];assert.equal(first.status,'dissipated');assert.equal(first.name,null);
  assert.equal(run.frames[60].storms.find(s=>s.id===2).name.en,'Damrey');
  assert.equal(run.events.filter(e=>e.text.includes('正式命名')).length,1);
});
test('previously named dissipated system keeps historical name, next name advances',()=>{
  const run=simulate({names,seeds:[{lon:112,lat:20,wind:17.2},{lon:155,lat:15,bornAt:80,wind:17.2}],isLand:lon=>lon<120,hours:81});
  assert.equal(run.frames[80].storms[0].name.en,'Damrey');assert.equal(run.frames[80].storms[1].name.en,'Tianma');
});
test('appending a future creation leaves the complete earlier history unchanged',()=>{
  const seeds=[{lon:143,lat:16}],original=simulate({seeds,names,hours:70});
  const added=simulate({seeds:[...seeds,{lon:155,lat:18,bornAt:60}],names,hours:70});
  assert.deepEqual(added.frames.slice(0,60),original.frames.slice(0,60));
});
test('five and more systems receive different subsequent names',()=>{
  const run=simulate({names,seeds:Array.from({length:8},(_,i)=>({lon:140+i,lat:15,wind:18})),hours:1});
  assert.equal(run.frames[0].storms.length,8);
  assert.deepEqual(run.frames[0].storms.map(s=>s.name.en),names.slice(0,8).map(n=>n.en));
});
test('the full 140-name list repeats from Damrey in the next cycle',()=>{
  const run=simulate({names,seeds:Array.from({length:142},()=>({lon:150,lat:15,wind:18})),hours:1});
  assert.equal(run.frames[0].storms[139].name.en,names[139].en);
  assert.equal(run.frames[0].storms[140].name.en,'Damrey');assert.equal(run.frames[0].storms[141].name.en,'Tianma');
});
test('later generations use their own ages and extend the experiment horizon',()=>{
  const run=simulate({names,seeds:[{lon:150,lat:15,bornAt:300,wind:9}]});
  assert.ok(run.frames.length>=589);
  assert.equal(run.frames[300].storms[0].age,0);
  assert.ok(run.frames[320].storms[0].wind>9);
});
test('names follow birth and threshold chronology, not seed array positions',()=>{
  const run=simulate({names,hours:71,seeds:[{lon:150,lat:15,bornAt:70,wind:20},{lon:155,lat:15,bornAt:20,wind:20}]});
  assert.equal(run.frames[20].storms[0].id,2);
  assert.equal(run.frames[20].storms[0].name.en,'Damrey');
  assert.equal(run.frames[70].storms.find(s=>s.id===1).name.en,'Tianma');
});
