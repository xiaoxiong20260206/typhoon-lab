import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {simulate} from '../js/model.js';
import {localizeNames} from '../js/names.js';
import {cleanCustomName,isCustomNameTaken,MAX_CUSTOM_NAME_LENGTH,nextCustomName} from '../js/naming.js';

const names=localizeNames(JSON.parse(await readFile(new URL('../assets/names.json',import.meta.url))));

test('custom creation names are immediate and do not consume the official table',()=>{
  const run=simulate({names,hours:1,seeds:[{lon:145,lat:15,wind:9,customName:'  海棠  '},{lon:155,lat:18,wind:17.2}]});
  const [custom,official]=run.frames[0].storms;
  assert.deepEqual(custom.name,{cn:'海棠',en:'海棠'});
  assert.equal(custom.custom,true);
  assert.equal(custom.namedAt,0);
  assert.equal(official.name.en,'Damrey');
  assert.equal(official.custom,false);
  assert.ok(run.events.some(event=>event.id===custom.id&&event.text.includes('不占用官方命名表')));
});

test('custom names are cleaned, bounded, and never alter the fixed list',()=>{
  const before=names.map(name=>name.en);
  assert.equal(cleanCustomName('  海  棠\n'),'海 棠');
  assert.equal(cleanCustomName('\u0000  风暴  '),'风暴');
  assert.equal(Array.from(cleanCustomName('风'.repeat(MAX_CUSTOM_NAME_LENGTH+5))).length,MAX_CUSTOM_NAME_LENGTH);
  simulate({names,hours:1,seeds:[{lon:145,lat:15,wind:20,customName:'海棠'}]});
  assert.deepEqual(names.map(name=>name.en),before);
});

test('new experiments receive distinct editable default names',()=>{
  const history=[{id:'a',seed:{customName:'实验台风 01'}},{id:'b',seed:{customName:'海燕'}},{id:'c',seed:{customName:'实验台风 03'}}];
  assert.equal(nextCustomName(history),'实验台风 02');
  assert.equal(nextCustomName([]),'实验台风 01');
  assert.equal(isCustomNameTaken('海燕',history),true);
  assert.equal(isCustomNameTaken('海燕',history,'b'),false);
  assert.equal(isCustomNameTaken('新名字',history),false);
});
