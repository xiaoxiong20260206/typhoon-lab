import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSession,saveSession} from '../js/history.js';

function storage(){
  const map=new Map();
  return {getItem:key=>map.get(key)??null,setItem(key,value){map.set(key,value)},removeItem:key=>map.delete(key)};
}

test('saved history survives reload and ignores inactive ids',()=>{
  const store=storage();
  const history=[{id:'a',createdAt:1,seed:{lon:145,lat:15,wind:18,size:1.2,bornAt:20}},{id:'bad',createdAt:2,seed:{lon:999,lat:15,wind:18,size:1.2,bornAt:20}}];
  assert.equal(saveSession({version:1,scenario:'ocean',env:{sst:30,shear:4,cold:20,size:1.4},hour:88,history,activeHistory:['a','bad']},store),true);
  const loaded=loadSession(store);
  assert.equal(loaded.scenario,'ocean');
  assert.equal(loaded.env.sst,30);
  assert.equal(loaded.hour,88);
  assert.equal(loaded.history.length,1);
  assert.deepEqual(loaded.activeHistory,['a']);
});

test('malformed or unavailable storage degrades safely',()=>{
  const store=storage();
  store.setItem('typhoon-lab-session-v1','{bad');
  assert.equal(loadSession(store),null);
  assert.equal(loadSession(null),null);
  assert.equal(saveSession({history:[]},null),false);
});

test('storage quota failures do not throw',()=>{
  const store={getItem(){return '{}'},setItem(){throw Error('quota')}};
  assert.equal(saveSession({version:1},store),false);
});
