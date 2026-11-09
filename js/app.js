import {simulate,DEFAULT_ENV,SCENARIOS} from './model.js';
import {makeLandTest} from './geo.js';
import {localizeNames} from './names.js';
import {PacificMap} from './map.js';
import {$,updatePanels,renderNames,toast} from './panels.js';
import {bindForge} from './forge.js';
import {StormSound} from './sound.js';
import {initShell} from './shell.js';

const state={scenario:'recurve',env:{...DEFAULT_ENV},seeds:[{lon:143,lat:16}],hour:48,selected:1,playing:false,speed:4};
let map,run,names,isLand,forge,last=0,animationTime=0,lastPaint=0;
let theater=null,shell;const sound=new StormSound();
const endHour=()=>run.frames.length-1;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
async function init(){
  shell=initShell({select:selectStorm});
  const get=async path=>{const response=await fetch(path);if(!response.ok)throw Error(`${path} 加载失败：${response.status}`);return response.json();};
  const [land,nameData]=await Promise.all([get('assets/land.json'),get('assets/names.json')]);
  if(nameData.names.length!==140||!land.polygons.length)throw Error('本地数据不完整');
  names=localizeNames(nameData);isLand=makeLandTest(land.polygons);
  map=new PacificMap($('mapCanvas'),land.polygons,isLand);
  map.onCreate=(lon,lat)=>{if(forge?.picking){setCreating(false);forge.locate(lon,lat);}else createAt(lon,lat);};map.onSelect=selectStorm;
  rebuild();bind();
  if(new URLSearchParams(location.search).get('view')!=='2d')await initTheater(land.polygons);
  else set3D(false);
  window.addEventListener('beforeunload',()=>sound.disable());
  $('loadState').hidden=true;
  requestAnimationFrame(tick);
  // Read-only diagnostics for reproducible local verification, no simulation mutations exposed.
  Object.defineProperty(window,'typhoonLab',{value:{get state(){return structuredClone(state);},get frame(){return structuredClone(run.frames[Math.floor(state.hour)]);},get events(){return structuredClone(run.events);},get names(){return names.map(n=>({...n}));},get map(){return {width:map.width,height:map.height,zoom:map.zoom,layers:{...map.layers}};},project3D(lon,lat){return theater?.screen(lon,lat);},get theater(){return theater?.diagnostics||{active:false};},get sound(){return sound.diagnostics;}}});
}
async function initTheater(polygons=map.polygons){
  try{const {StormTheater}=await import('./theater.js');theater=new StormTheater($('sceneCanvas'),map,polygons,message=>{set3D(false);$('renderToggle').disabled=true;toast(message);});map.onDraw=()=>theater.sync();set3D(true);}
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
  const hour=Math.floor(state.hour);
  if(!run.frames[hour].storms.some(s=>s.id===state.selected))state.selected=run.frames[hour].storms[0].id;
  map.frame=run.frames[hour];map.selected=state.selected;
  updatePanels(run,hour,state.selected,selectStorm);
  shell?.update(map.frame,state.selected);
  const count=map.frame.storms.filter(s=>s.name).length;
  $('nextName').textContent=`下一名：${names[count%names.length].cn} · 第 ${Math.floor(count/names.length)+1} 轮`;
  $('undoButton').hidden=state.seeds.length<2;
  const selected=map.frame.storms.find(s=>s.id===state.selected);
  $('cinemaReadout').textContent=`${selected.name?.cn||'未命名'} · ${selected.wind.toFixed(1)} m/s · ${selected.pressure} hPa`;
  $('theaterCaption').querySelector('strong').textContent=selected.status==='dissipated'?'风暴终将归于平静。':selected.status==='extratropical'?'在北方，成为另一种风暴。':'走近风暴的中心。';
  map.draw();updatePlayback();
}
function selectStorm(id){state.selected=id;sound.cue();refresh();}
function updatePlayback(){
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
  if(![lon,lat,wind,size].every(Number.isFinite)||lon<110||lon>165||lat<5||lat>28||wind<1||wind>75||size<.6||size>2){toast('请填写有效的海洋位置、风速与环流规模。');return false;}
  if(isLand(lon,lat)){toast('系统需要在海面生成，请选择海洋位置。');return false;}
  state.hour=Math.floor(state.hour);
  state.seeds.push({lon,lat,wind,size,scenario:options.scenario||state.scenario,bornAt:state.hour});
  state.selected=state.seeds.length;state.playing=false;setCreating(false);rebuild();
  const s=map.frame.storms.find(s=>s.id===state.selected);
  toast(`已在 +${state.hour}h 创建系统 #${s.id}：${s.name?.cn||`${s.invest} · 未命名`}。${state.seeds.length>24?'系统较多，绘制可能变慢。':'此前历史已保留。'}`);
  return true;
}
function bind(){
  document.addEventListener('lab:panel-open',refresh);
  forge=bindForge({create:createAt,onOpen:()=>{state.playing=false;setCreating(false);updatePlayback();return state;},onPick:()=>{setCreating(true);if(theater?.active)theater.setMode('overview');$(theater?.active?'sceneCanvas':'mapCanvas').focus();}});
  $('renderToggle').addEventListener('click',async()=>{if(!theater)await initTheater();else set3D(!theater.active);});
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{theater?.setMode(button.dataset.view);document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});sound.cue();updatePlayback();}));
  $('cinemaButton').addEventListener('click',()=>{const active=document.body.classList.toggle('cinema');$('cinemaButton').textContent=active?'退出影院':'影院模式';$('cinemaButton').setAttribute('aria-pressed',String(active));$('cinemaReadout').hidden=!active;document.dispatchEvent(new Event('lab:cinema-change'));});
  $('soundButton').addEventListener('click',async()=>{try{if(sound.enabled)sound.disable();else await sound.enable();$('soundButton').textContent=sound.enabled?'声音已开启':'开启声音';$('soundButton').setAttribute('aria-pressed',String(sound.enabled));updatePlayback();}catch(error){toast(`声音未开启：${error.message}`);}});
  $('volume').addEventListener('input',e=>sound.setVolume(Number(e.target.value)/100));
  $('quality').addEventListener('change',e=>theater?.setQuality(e.target.value));
  $('playButton').addEventListener('click',togglePlay);
  $('resetButton').addEventListener('click',()=>{state.hour=0;state.playing=false;animationTime=0;refresh();toast('已回到扰动生成时刻，命名与演化顺序保持不变。');});
  $('speed').addEventListener('change',e=>state.speed=Number(e.target.value));
  $('timeline').addEventListener('input',e=>{state.hour=Number(e.target.value);state.playing=false;refresh();});
  for(const key of ['sst','shear','size','cold']){
    const input=$(key),units={sst:'°C',shear:'m/s',size:'倍',cold:'%'};
    input.addEventListener('input',()=>{state.env[key]=Number(input.value);$(`${key}Value`).innerHTML=`${input.value} <em>${units[key]}</em>`;});
    input.addEventListener('change',()=>{rebuild();toast('环境已更新：重新计算同一实验，当前回放时刻已保留。');});
  }
  document.querySelectorAll('[data-scenario]').forEach(button=>button.addEventListener('click',()=>{
    state.scenario=button.dataset.scenario;const p=SCENARIOS[state.scenario];
    state.seeds=[{lon:p.lon,lat:p.lat}];state.selected=1;state.hour=0;state.playing=false;setCreating(false);
    document.querySelectorAll('[data-scenario]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
    rebuild();toast(`已开启「${p.title}」实验，点击播放观察完整生命周期。`);
  }));
  document.querySelectorAll('[data-layer]').forEach(button=>button.addEventListener('click',()=>{
    const layer=button.dataset.layer;map.layers[layer]=!map.layers[layer];button.classList.toggle('active',map.layers[layer]);button.setAttribute('aria-pressed',String(map.layers[layer]));
    $('rainLegend').hidden=!map.layers.rain;map.draw();
  }));
  $('zoomIn').addEventListener('click',()=>theater?.active?theater.zoom(.8):map.setZoom(map.zoom*1.25));$('zoomOut').addEventListener('click',()=>theater?.active?theater.zoom(1.25):map.setZoom(map.zoom/1.25));$('fitMap').addEventListener('click',()=>theater?.active?$('mapStage').querySelector('[data-view="overview"]').click():map.fit());
  $('createButton').addEventListener('click',()=>{setCreating(!map.creating);if(map.creating){state.playing=false;if(theater?.active)theater.setMode('overview');updatePlayback();toast('点击暖海生成；键盘操作可聚焦地图并按 Enter 使用默认海洋落点。');}});
  $('undoButton').addEventListener('click',()=>{if(state.seeds.length<2)return;state.seeds.pop();state.selected=Math.min(state.selected,state.seeds.length);rebuild();toast('已撤销最后创建的系统。');});
  $('namesButton').addEventListener('click',()=>{const used=run.frames[Math.floor(state.hour)].storms.filter(s=>s.name).map(s=>s.name.en);renderNames(names,used);$('namesDialog').showModal();});
  $('closeNames').addEventListener('click',()=>$('namesDialog').close());
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){setCreating(false);if(document.body.classList.contains('cinema'))$('cinemaButton').click();}
    if(['INPUT','SELECT','TEXTAREA','BUTTON','A'].includes(document.activeElement?.tagName)||$('namesDialog').open||$('forgeDialog').open)return;
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
