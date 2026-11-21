import test from 'node:test';
import assert from 'node:assert/strict';
import {BACKUP_KEY,loadSession,saveSession,storageAvailable,SESSION_KEY} from '../js/history.js';

function storage(){
  const map=new Map();
  return {getItem:key=>map.get(key)??null,setItem(key,value){map.set(key,value)},removeItem:key=>map.delete(key)};
}

test('saved history survives reload and ignores inactive ids',()=>{
  const store=storage();
  const history=[{id:'a',createdAt:1,seed:{lon:145,lat:15,wind:18,size:1.2,bornAt:20,customName:'  海棠  '}},{id:'bad',createdAt:2,seed:{lon:999,lat:15,wind:18,size:1.2,bornAt:20}}];
  assert.equal(saveSession({version:1,scenario:'ocean',env:{sst:30,shear:4,cold:20,size:1.4},hour:88,history,activeHistory:['a','bad'],activeOfficial:['2022268N25154',7,'2022268N25154'],visibleStorms:['a','missing',7]},store),true);
  const loaded=loadSession(store);
  assert.equal(loaded.scenario,'ocean');
  assert.equal(loaded.env.sst,30);
  assert.equal(loaded.hour,88);
  assert.equal(loaded.history.length,1);
  assert.deepEqual(loaded.activeHistory,['a']);
  assert.deepEqual(loaded.activeOfficial,['2022268N25154']);
  assert.equal(loaded.history[0].seed.customName,'海棠');
  assert.deepEqual(loaded.visibleStorms,['a','missing']);
  assert.equal(store.getItem(BACKUP_KEY),store.getItem(SESSION_KEY));
});

test('the automatic mirror restores a missing or malformed primary record',()=>{
  const store=storage();
  const session={version:1,scenario:'landfall',env:{sst:27,shear:8,cold:40,size:1.1},hour:36,history:[{id:'legacy',createdAt:1,seed:{lon:140,lat:16,wind:28,size:1.1,bornAt:12}}],activeHistory:['legacy'],activeOfficial:[],visibleStorms:['base','legacy']};
  assert.equal(saveSession(session,store),true);
  assert.ok(store.getItem(BACKUP_KEY));
  store.removeItem(SESSION_KEY);
  assert.equal(loadSession(store).history[0].id,'legacy');
  store.setItem(SESSION_KEY,'{bad');
  assert.equal(loadSession(store).history[0].id,'legacy');
  assert.equal(store.getItem(SESSION_KEY),store.getItem(BACKUP_KEY));
  store.setItem(SESSION_KEY,'{bad');store.setItem(BACKUP_KEY,'{bad');
  assert.equal(loadSession(store),null);
});

test('older session fields migrate without dropping saved creations',()=>{
  const store=storage();
  store.setItem(SESSION_KEY,JSON.stringify({version:1,scenario:'ocean',env:{sst:30,shear:5,cold:10,size:1.4},hour:30,history:[{id:'old-a',createdAt:1,seed:{lon:142,lat:16,wind:24,size:1.4,bornAt:12,customName:'旧版一号'}},{id:'old-b',createdAt:2,seed:{lon:151,lat:20,wind:40,size:1.3,bornAt:18}}],activeHistory:['old-a','old-b']}));
  const loaded=loadSession(store);
  assert.equal(loaded.history.length,2);
  assert.deepEqual(loaded.activeHistory,['old-a','old-b']);
  assert.deepEqual(loaded.activeOfficial,[]);
  assert.equal(loaded.visibleStorms,null);
  assert.equal(loaded.history[0].seed.customName,'旧版一号');
});

test('the mirror follows deletions instead of resurrecting removed storms',()=>{
  const store=storage();
  const first={version:1,history:[{id:'a',seed:{lon:145,lat:15,wind:18,size:1.2,bornAt:20}},{id:'b',seed:{lon:150,lat:18,wind:22,size:1.2,bornAt:24}}],activeHistory:['a','b']};
  saveSession(first,store);
  saveSession({...first,history:[first.history[0]],activeHistory:['a']},store);
  store.removeItem(SESSION_KEY);
  assert.deepEqual(loadSession(store).history.map(entry=>entry.id),['a']);
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

test('storage availability distinguishes writable and blocked browsers',()=>{
  assert.equal(storageAvailable(storage()),true);
  assert.equal(storageAvailable({setItem(){throw Error('blocked')},removeItem(){}}),false);
  assert.equal(storageAvailable(null),false);
});
