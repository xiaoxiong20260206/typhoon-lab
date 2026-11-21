import {simulate,DEFAULT_ENV,SCENARIOS} from './model.js?v=92ed7ac2270e';
import {summaryName} from './rules.js?v=92ed7ac2270e';
import {makeLandTest} from './geo.js?v=92ed7ac2270e';
import {localizeNames} from './names.js?v=92ed7ac2270e';
import {PacificMap} from './map.js?v=92ed7ac2270e';
import {$,updatePanels,renderNames,toast} from './panels.js?v=92ed7ac2270e';
import {bindForge} from './forge.js?v=92ed7ac2270e';
import {bindStormLibrary} from './library.js?v=92ed7ac2270e';
import {StormSound} from './sound.js?v=92ed7ac2270e';
import {initShell} from './shell.js?v=92ed7ac2270e';
import {loadSession,saveSession,storageAvailable} from './history.js?v=92ed7ac2270e';
import {cleanCustomName,isCustomNameTaken,nextCustomName} from './naming.js?v=92ed7ac2270e';

const savedSession=loadSession();
let storageReady=storageAvailable();
const assetVersion=new URL(import.meta.url).searchParams.get('v')||'';
if(assetVersion)$('buildTag').title=`资源缓存版本 ${assetVersion}`;
const state={scenario:['recurve','landfall','ocean'].includes(savedSession?.scenario)?savedSession.scenario:'recurve',env:{...DEFAULT_ENV,...savedSession?.env},seeds:[],history:savedSession?.history||[],activeHistory:new Set(savedSession?.activeHistory||[]),activeOfficial:new Set(savedSession?.activeOfficial||[]),visibleStorms:savedSession?.visibleStorms==null?null:new Set(savedSession.visibleStorms),hour:savedSession?.hour??48,selected:1,playing:false,speed:4};
let map,run,names,officialStorms=[],isLand,forge,library,last=0,animationTime=0,lastPaint=0;
let theater=null,shell;const sound=new StormSound();
const endHour=()=>run.frames.length-1;
function applySeeds(){
  const preset=SCENARIOS[state.scenario];
  state.seeds=[{sourceId:'base',lon:preset.lon,lat:preset.lat},
    ...state.history.filter(entry=>state.activeHistory.has(entry.id)).map(entry=>({...entry.seed,sourceId:entry.id})),
    ...officialStorms.filter(storm=>state.activeOfficial.has(storm.id)).map(storm=>({sourceId:'official:'+storm.id,kind:'official',official:storm}))];
  if(state.visibleStorms){
    const keys=new Set(state.seeds.map(seed=>seed.sourceId));
    for(const key of state.visibleStorms)if(!keys.has(key))state.visibleStorms.delete(key);
    if(!state.visibleStorms.size&&keys.size)state.visibleStorms.add(state.seeds[0].sourceId);
  }
}
function persist(quiet=false){
  const saved=saveSession({version:1,scenario:state.scenario,env:state.env,hour:Math.floor(state.hour),history:state.history,activeHistory:[...state.activeHistory],activeOfficial:[...state.activeOfficial],visibleStorms:state.visibleStorms===null?null:[...state.visibleStorms]});
  storageReady=saved;
  if(!saved&&!quiet)toast('当前浏览器无法自动保存历史创建，模拟仍可继续使用。');
  return saved;
}
let persistTimer=0;
function schedulePersist(){clearTimeout(persistTimer);persistTimer=setTimeout(()=>persist(true),250);}
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
async function init(){
  shell=initShell({select:selectStorm});
  const get=async path=>{const request=assetVersion?`${path}?v=${encodeURIComponent(assetVersion)}`:path,response=await fetch(request);if(!response.ok)throw Error(`${path} 加载失败：${response.status}`);return response.json();};
  const [land,nameData,officialData,translations]=await Promise.all([get('assets/land.json'),get('assets/names.json'),get('assets/official-storms.json'),get('assets/official-name-translations.json')]);
  if(nameData.names.length!==140||!land.polygons.length||officialData?.version!==1||!Array.isArray(officialData.storms)||officialData.count!==officialData.storms.length||translations?.version!==1||translations.count!==Object.keys(translations.names).length)throw Error('本地数据不完整');
  names=localizeNames(nameData);isLand=makeLandTest(land.polygons);
  officialStorms=officialData.storms.map(storm=>({...storm,nameZh:translations.names[storm.name]||storm.name}));
  const officialIds=new Set(officialStorms.map(storm=>storm.id));
  for(const id of state.activeOfficial)if(!officialIds.has(id))state.activeOfficial.delete(id);
  map=new PacificMap($('mapCanvas'),land.polygons,isLand);
  map.onCreate=(lon,lat)=>{if(forge?.picking){setCreating(false);forge.locate(lon,lat);}else createAt(lon,lat);};map.onSelect=selectStorm;
  applySeeds();
  rebuild();bind();
  if(new URLSearchParams(location.search).get('view')!=='2d')await initTheater(land.polygons);
  else set3D(false);
  window.addEventListener('beforeunload',()=>{sound.disable();persist(true);});
  $('loadState').hidden=true;
  requestAnimationFrame(tick);
  // Read-only diagnostics for reproducible local verification, no simulation mutations exposed.
  Object.defineProperty(window,'typhoonLab',{value:{get state(){return structuredClone(state);},get frame(){return structuredClone(run.frames[Math.floor(state.hour)]);},get events(){return structuredClone(run.events);},get names(){return names.map(n=>({...n}));},get map(){return {width:map.width,height:map.height,zoom:map.zoom,layers:{...map.layers},visibleStorms:map.frame?.storms.length??0};},project3D(lon,lat){return theater?.screen(lon,lat);},get theater(){return theater?.diagnostics||{active:false};},get sound(){return sound.diagnostics;}}});
}
async function initTheater(polygons=map.polygons){
  try{const {StormTheater}=await import('./theater.js?v=92ed7ac2270e');theater=new StormTheater($('sceneCanvas'),map,polygons,message=>{set3D(false);$('renderToggle').disabled=true;toast(message);});map.onDraw=()=>theater.sync();set3D(true);}
  catch(error){console.warn('3D unavailable:',error.message);set3D(false);$('renderToggle').disabled=true;$('renderToggle').textContent='二维 · 3D 不可用';toast('当前设备无法启用 3D，二维模拟器仍可完整使用。');}
}
function set3D(active){
  map.render3D=active;
  theater?.setActive(active);$('sceneCanvas').hidden=!active;$('sceneLabels').hidden=!active;
  $('mapStage').classList.toggle('three-active',active);$('mapCanvas').tabIndex=active?-1:0;
  $('renderToggle').textContent=active?'3D / 切换二维':'开启 3D';$('renderToggle').setAttribute('aria-pressed',String(active));
  $('quality').disabled=!active;document.querySelectorAll('[data-view]').forEach(b=>b.disabled=!active);refresh();
  $('cameraSelect').disabled=!active;
}
function rebuild(){
  run=simulate({scenario:state.scenario,env:state.env,seeds:state.seeds,names,isLand});
  state.hour=Math.min(state.hour,endHour());
  map.run=run;map.weather.rain.clear();refresh();
}
function refresh(){
  const hour=Math.floor(state.hour),fullFrame=run.frames[hour];
  let visibleSet=state.visibleStorms||new Set(fullFrame.storms.map(storm=>storm.sourceId));
  let visible=fullFrame.storms.filter(storm=>visibleSet.has(storm.sourceId));
  if(!visible.length&&fullFrame.storms.length){
    if(!state.visibleStorms)visibleSet=new Set();
    visibleSet.add(fullFrame.storms[0].sourceId);visible=[fullFrame.storms[0]];
  }
  if(!visible.some(s=>s.id===state.selected))state.selected=visible[0]?.id??1;
  map.frame=visible.length===fullFrame.storms.length?fullFrame:{...fullFrame,storms:visible};map.selected=state.selected;
  updatePanels(run,hour,state.selected,selectStorm);
  shell?.update(map.frame,state.selected);
  const count=fullFrame.storms.filter(s=>s.name&&!s.custom&&!s.official).length;
  $('nextName').textContent=`下一名：${names[count%names.length].cn} · 第 ${Math.floor(count/names.length)+1} 轮`;
  $('undoButton').hidden=!state.history.some(entry=>state.activeHistory.has(entry.id));
  const selected=map.frame.storms.find(s=>s.id===state.selected);
  $('cinemaReadout').textContent=`${summaryName(selected)} · ${selected.wind.toFixed(1)} m/s · ${selected.pressure} hPa`;
  $('theaterCaption').querySelector('strong').textContent=selected.status==='dissipated'?'风暴终将归于平静。':selected.status==='extratropical'?'在北方，成为另一种风暴。':'走近风暴的中心。';
  map.draw();updatePlayback();
  updateLibrary();
}
function stormForHistory(historyId,frame=run.frames[Math.floor(state.hour)]){
  const index=state.seeds.findIndex(seed=>seed.sourceId===historyId);
  return index>=0?frame.storms.find(storm=>storm.id===index+1)||null:null;
}
function updateLibrary(){
  if(!library)return;
  const fullFrame=run.frames[Math.floor(state.hour)];
  library.update({
    storms:fullFrame.storms,
    visibleIds:new Set(map.frame.storms.map(storm=>storm.sourceId)),
    selectedId:state.selected,
    history:state.history,
    activeHistory:state.activeHistory,
    officialStorms,
    activeOfficial:state.activeOfficial,
    storageReady
  });
}
function selectStorm(id){
  const storm=run.frames[Math.floor(state.hour)].storms.find(item=>item.id===id);
  if(!storm)return;
  if(state.visibleStorms)state.visibleStorms.add(storm.sourceId);
  state.selected=id;sound.cue();refresh();
}
function selectedSourceId(){
  return run.frames[Math.floor(state.hour)].storms.find(storm=>storm.id===state.selected)?.sourceId||null;
}
function restoreSelectedSource(sourceId){
  const index=state.seeds.findIndex(seed=>seed.sourceId===sourceId);
  state.selected=index>=0?index+1:1;
}
function toggleHistory(id,active){
  const sourceId=selectedSourceId();
  if(active)state.activeHistory.add(id);else state.activeHistory.delete(id);
  if(state.visibleStorms){if(active)state.visibleStorms.add(id);else state.visibleStorms.delete(id);}
  applySeeds();restoreSelectedSource(sourceId);state.playing=false;rebuild();persist();
  const entry=state.history.find(item=>item.id===id);
  toast(active?`已加入演示：+${entry.seed.bornAt}h 创建的系统。${map.frame.storms.length>1?'多个系统会同时演化。':''}`:'已移出演示，历史创建仍保留在本浏览器。');
  return true;
}
function toggleOfficial(id,active){
  const storm=officialStorms.find(item=>item.id===id),sourceId=selectedSourceId();
  if(!storm)return false;
  if(active)state.activeOfficial.add(id);else state.activeOfficial.delete(id);
  if(state.visibleStorms){if(active)state.visibleStorms.add('official:'+id);else state.visibleStorms.delete('official:'+id);}
  applySeeds();restoreSelectedSource(sourceId);state.playing=false;rebuild();persist();
  toast(active?'已加入官方台风「'+(storm.nameZh||storm.name)+' / '+storm.name+'」：按 '+storm.season+' 年 IBTrACS 历史最佳路径重放。':'已移出官方台风；官方资料仍保留在台风库。');
  return true;
}
function renameHistory(id,value){
  const entry=state.history.find(item=>item.id===id),name=cleanCustomName(value);
  if(!entry)return {ok:false,error:'这个台风已经不在历史中。'};
  if(!name)return {ok:false,error:'名称不能为空，请填写 1–20 个字符。'};
  if(isCustomNameTaken(name,state.history,id))return {ok:false,error:'这个名称已经被另一个自建台风使用。'};
  const previous=cleanCustomName(entry.seed.customName);
  if(previous===name)return {ok:true,name};
  const sourceId=selectedSourceId();
  entry.seed.customName=name;applySeeds();restoreSelectedSource(sourceId);
  if(state.activeHistory.has(id)){state.playing=false;rebuild();}else refresh();
  persist();toast(`名称已改为「${name}」，并自动保存。`);
  return {ok:true,name};
}
function deleteHistory(id){
  const index=state.history.findIndex(item=>item.id===id);
  if(index<0)return false;
  const sourceId=selectedSourceId(),[entry]=state.history.splice(index,1);
  state.activeHistory.delete(id);state.visibleStorms?.delete(id);applySeeds();restoreSelectedSource(sourceId);
  state.playing=false;rebuild();persist();
  toast(`已删除自建台风「${cleanCustomName(entry.seed.customName)||'未命名'}」。历史记录已同步移除。`);
  return true;
}
function showAllStorms(){
  const frame=run.frames[Math.floor(state.hour)];
  state.visibleStorms=new Set(frame.storms.map(storm=>storm.sourceId));refresh();persist();
}
function showCurrentStorm(){
  const frame=run.frames[Math.floor(state.hour)],storm=frame.storms.find(item=>item.id===state.selected);
  if(!storm)return;
  state.visibleStorms=new Set([storm.sourceId]);refresh();persist();
}
function toggleStormVisibility(sourceId,visible){
  const frame=run.frames[Math.floor(state.hour)];
  if(!state.visibleStorms)state.visibleStorms=new Set(frame.storms.map(storm=>storm.sourceId));
  if(!visible&&state.visibleStorms.size<=1){toast('地图至少保留一个展示系统；可切换当前系统后再隐藏它。');refresh();return false;}
  if(visible)state.visibleStorms.add(sourceId);else state.visibleStorms.delete(sourceId);
  if(!visible&&!state.visibleStorms.has(frame.storms.find(storm=>storm.id===state.selected)?.sourceId)){
    const next=frame.storms.find(storm=>state.visibleStorms.has(storm.sourceId));
    if(next)state.selected=next.id;
  }
  refresh();persist();return true;
}
function updatePlayback(){
  const timeline=$('timeline'),span=Math.max(1,endHour());
  timeline.style.setProperty('--timeline-progress',`${Math.min(100,Math.max(0,state.hour/span*100))}%`);
  $('playButton').textContent=state.playing?'Ⅱ':'▶';
  $('playButton').setAttribute('aria-label',state.playing?'暂停模拟':'播放模拟');
  $('mapStatus').textContent=state.playing?'正在演化':state.hour===0?'等待生成':'暂停 · 可自由探索';
  sound.update(run.frames[Math.floor(state.hour)].storms.find(s=>s.id===state.selected),theater?.active?theater.mode:'overview',state.playing);
}
function togglePlay(){
  if(state.hour>=endHour()){state.hour=0;refresh();}
  state.playing=!state.playing;updatePlayback();
}
function setCreating(active){
  if(!active&&forge)forge.picking=false;
  map.creating=active;$('mapCanvas').classList.toggle('creating',active);$('createButton').classList.toggle('active',active);
  $('mapStage').classList.toggle('creating',active);
  $('createButton').textContent=active?'取消生成 · 点击地图落点':'＋ 在海面生成扰动';
  $('mapHint').textContent=active?'请点击 5°N—28°N 的西北太平洋海面':'点击系统查看 · 滚轮缩放 · 拖动调整视角';
}
function createAt(lon,lat,options={}){
  const wind=options.wind??9,size=options.size??state.env.size;
  let customName=options.nameMode==='auto'?'':cleanCustomName(options.customName);
  if(![lon,lat,wind,size].every(Number.isFinite)||lon<110||lon>165||lat<5||lat>28||wind<1||wind>75||size<.6||size>2){toast('请填写有效的海洋位置、风速与环流规模。');return false;}
  if(isLand(lon,lat)){toast('系统需要在海面生成，请选择海洋位置。');return false;}
  if(options.nameMode!=='auto'){
    customName=customName||nextCustomName(state.history);
    if(isCustomNameTaken(customName,state.history)){toast('这个名称已经属于另一个自建台风，请换一个名称。');return false;}
  }
  state.hour=Math.floor(state.hour);
  const seed={lon,lat,wind,size,scenario:options.scenario||state.scenario,bornAt:state.hour,customName:customName||undefined};
  const entry={id:`h${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`,seed,createdAt:Date.now()};
  state.history.push(entry);state.activeHistory.add(entry.id);if(state.visibleStorms)state.visibleStorms.add(entry.id);applySeeds();
  state.selected=state.seeds.length;state.playing=false;setCreating(false);rebuild();
  const s=map.frame.storms.find(s=>s.id===state.selected);
  const saved=persist();
  toast(`已在 +${state.hour}h 创建系统 #${s.id}：${s.name?.cn||`${s.invest} · 未命名`}。${saved?'已自动保存。':'本浏览器暂不能自动保存。'}${state.seeds.length>24?'系统较多，绘制可能变慢。':''}`);
  return true;
}
function bind(){
  library=bindStormLibrary({
    onVisibility:toggleStormVisibility,
    onSelect:selectStorm,
    onHistory:toggleHistory,
    onOfficial:toggleOfficial,
    onRename:renameHistory,
    onDelete:deleteHistory,
    onShowAll:showAllStorms,
    onShowCurrent:showCurrentStorm,
    onCreate:()=>$('forgeButton').click(),
    getStorm:id=>stormForHistory(id)
  });
  document.addEventListener('lab:panel-open',refresh);
  forge=bindForge({create:createAt,onOpen:()=>{state.playing=false;setCreating(false);updatePlayback();return {scenario:state.scenario,env:state.env,hour:state.hour,history:state.history,nextName:nextCustomName(state.history)};},onPick:()=>{setCreating(true);if(theater?.active)theater.setMode('overview');$(theater?.active?'sceneCanvas':'mapCanvas').focus();}});
  $('renderToggle').addEventListener('click',async()=>{if(!theater)await initTheater();else set3D(!theater.active);});
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{theater?.setMode(button.dataset.view);document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});sound.cue();updatePlayback();}));
  $('cinemaButton').addEventListener('click',()=>{const active=document.body.classList.toggle('cinema');$('cinemaButton').textContent=active?'退出影院':'影院模式';$('cinemaButton').setAttribute('aria-pressed',String(active));$('cinemaReadout').hidden=!active;document.dispatchEvent(new Event('lab:cinema-change'));});
  $('soundButton').addEventListener('click',async()=>{try{if(sound.enabled)sound.disable();else await sound.enable();$('soundButton').textContent=sound.enabled?'声音已开启':'开启声音';$('soundButton').setAttribute('aria-pressed',String(sound.enabled));updatePlayback();}catch(error){toast(`声音未开启：${error.message}`);}});
  $('volume').addEventListener('input',e=>sound.setVolume(Number(e.target.value)/100));
  $('quality').addEventListener('change',e=>theater?.setQuality(e.target.value));
  $('playButton').addEventListener('click',togglePlay);
  $('resetButton').addEventListener('click',()=>{state.hour=0;state.playing=false;animationTime=0;refresh();toast('已回到扰动生成时刻，命名与演化顺序保持不变。');});
  $('speed').addEventListener('change',e=>state.speed=Number(e.target.value));
  $('timeline').addEventListener('input',e=>{state.hour=Number(e.target.value);state.playing=false;refresh();schedulePersist();});
  for(const key of ['sst','shear','size','cold']){
    const input=$(key),units={sst:'°C',shear:'m/s',size:'倍',cold:'%'};
    input.addEventListener('input',()=>{state.env[key]=Number(input.value);$(`${key}Value`).innerHTML=`${input.value} <em>${units[key]}</em>`;});
    input.addEventListener('change',()=>{rebuild();toast('环境已更新：重新计算同一实验，当前回放时刻已保留。');});
  }
  document.querySelectorAll('[data-scenario]').forEach(button=>button.addEventListener('click',()=>{
    state.scenario=button.dataset.scenario;state.activeHistory.clear();state.activeOfficial.clear();applySeeds();state.selected=1;state.hour=0;state.playing=false;setCreating(false);
    document.querySelectorAll('[data-scenario]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
    rebuild();persist(true);toast('已开启「'+SCENARIOS[state.scenario].title+'」实验；历史创建与官方资料保留，可重新勾选加入。');
  }));
  document.querySelectorAll('[data-layer]').forEach(button=>button.addEventListener('click',()=>{
    const layer=button.dataset.layer;map.layers[layer]=!map.layers[layer];button.classList.toggle('active',map.layers[layer]);button.setAttribute('aria-pressed',String(map.layers[layer]));
    $('rainLegend').hidden=!map.layers.rain;map.draw();
  }));
  $('zoomIn').addEventListener('click',()=>theater?.active?theater.zoom(.8):map.setZoom(map.zoom*1.25));$('zoomOut').addEventListener('click',()=>theater?.active?theater.zoom(1.25):map.setZoom(map.zoom/1.25));$('fitMap').addEventListener('click',()=>theater?.active?$('mapStage').querySelector('[data-view="overview"]').click():map.fit());
  $('createButton').addEventListener('click',()=>{setCreating(!map.creating);if(map.creating){state.playing=false;if(theater?.active)theater.setMode('overview');updatePlayback();toast('点击暖海生成；键盘操作可聚焦地图并按 Enter 使用默认海洋落点。');}});
  $('undoButton').addEventListener('click',()=>{
    if(!state.history.some(entry=>state.activeHistory.has(entry.id)))return;
    const index=state.history.findLastIndex(entry=>state.activeHistory.has(entry.id));
    if(index<0)return;
    const [entry]=state.history.splice(index,1);state.activeHistory.delete(entry.id);state.visibleStorms?.delete(entry.id);applySeeds();
    state.selected=Math.min(state.selected,state.seeds.length);rebuild();persist();toast('已撤销最后创建的系统，并同步更新本浏览器历史。');
  });
  $('stormLibraryButton').addEventListener('click',e=>library.open('current',e.currentTarget));
  $('historyButton').addEventListener('click',e=>library.open('history',e.currentTarget));
  $('namesButton').addEventListener('click',()=>{const used=run.frames[Math.floor(state.hour)].storms.filter(s=>s.name&&!s.custom&&!s.official).map(s=>s.name.en);renderNames(names,used);$('namesDialog').showModal();});
  $('closeNames').addEventListener('click',()=>$('namesDialog').close());
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      setCreating(false);
      if(document.body.classList.contains('cinema'))$('cinemaButton').click();
    }
    if(['INPUT','SELECT','TEXTAREA','BUTTON','A'].includes(document.activeElement?.tagName)||$('namesDialog').open||$('forgeDialog').open||$('stormLibraryDialog').open)return;
    if(e.code==='Space'){e.preventDefault();togglePlay();}
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();state.playing=false;state.hour=Math.max(0,Math.min(endHour(),Math.floor(state.hour)+(e.key==='ArrowLeft'?-1:1)));refresh();}
  });
  document.addEventListener('visibilitychange',()=>{last=0;sound.visibility(document.hidden).catch(()=>{});});
}
function tick(now){
  requestAnimationFrame(tick);
  if(document.hidden){last=now;return;}
  const dt=last?Math.min((now-last)/1000,.1):0;last=now;
  if(state.playing){
    const previous=Math.floor(state.hour);state.hour=Math.min(endHour(),state.hour+dt*state.speed);
    if(!reduced)animationTime+=dt;
    if(state.hour>=endHour())state.playing=false;
    if(Math.floor(state.hour)!==previous){const s=run.frames[Math.floor(state.hour)].storms.find(s=>s.id===state.selected),old=run.frames[previous].storms.find(s=>s.id===state.selected);if(s?.name&&!old?.name)sound.cue('named');else if(s?.status!==old?.status)sound.cue('stage');refresh();}
  }
  if(state.playing&&now-lastPaint>33){map.time=animationTime;map.draw();lastPaint=now;}
  theater?.update(dt,state.playing,reduced);
}
init().catch(error=>{
  console.error(error);$('loadState').classList.add('error');$('loadState').replaceChildren();
  const text=document.createElement('p');text.textContent=`无法准备模拟器：${error.message}。请通过 npm start 的本地地址打开。`;
  const retry=document.createElement('button');retry.textContent='重新加载';retry.onclick=()=>location.reload();$('loadState').append(text,retry);
});
