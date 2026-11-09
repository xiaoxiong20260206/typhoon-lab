import {describe,beaufort} from './rules.js';

// Reuse the original controls: one ID, one handler and one simulation frame.
export function initShell({select}){
  if(new URLSearchParams(location.search).get('layout')==='classic')return {update(){},close(){}};
  const $=id=>document.getElementById(id),drawer=$('workspaceDrawer'),body=$('drawerBody');
  document.body.classList.add('immersive');
  const experiment=document.querySelector('.experiment-panel'),observation=document.querySelector('.observation-panel'),display=document.createElement('section');
  display.className='display-settings';
  for(const [title,selectors] of [['地图与图层',['.layer-toolbar']],['画质与声音',['.sound-controls']],['视图',['.view-toolbar','.map-navigation','#cinemaButton']],['资料',['#namesButton']]]){
    const section=document.createElement('section'),h=document.createElement('h3');h.textContent=title;section.append(h);
    for(const selector of selectors)section.append(document.querySelector(selector));display.append(section);
  }
  body.append(experiment,observation,display);
  const panels={experiment,observation,display},triggers={experiment:$('experimentButton'),observation:$('detailsButton'),display:$('displayButton')};
  Object.values(panels).forEach(p=>p.hidden=true);
  let opener=null;
  function close(){if(drawer.open)drawer.close();}
  function open(key){
    Object.entries(panels).forEach(([k,p])=>p.hidden=k!==key);
    drawer.dataset.panel=key;$('drawerTitle').textContent={experiment:'实验与系统',observation:'详细观测',display:'显示设置'}[key];
    Object.entries(triggers).forEach(([k,b])=>b.setAttribute('aria-expanded',String(k===key)));
    opener=triggers[key];drawer.showModal();document.dispatchEvent(new Event('lab:panel-open'));$('drawerClose').focus();
  }
  Object.entries(triggers).forEach(([key,button])=>button.addEventListener('click',()=>open(key)));
  $('drawerClose').addEventListener('click',close);
  drawer.addEventListener('click',e=>{if(e.target===drawer){const r=drawer.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
  drawer.addEventListener('close',()=>{Object.values(triggers).forEach(b=>b.setAttribute('aria-expanded','false'));opener?.focus();});
  // Close before another native dialog or map action is opened.
  for(const id of ['createButton','namesButton','cinemaButton'])$(id).addEventListener('click',close);
  $('namesDialog').addEventListener('close',()=>$('displayButton').focus());
  const actions=$('sceneActions');actions.prepend($('forgeButton'));actions.append($('soundButton'));
  const cinemaHome=$('cinemaButton').parentElement;
  document.addEventListener('lab:cinema-change',()=>{(document.body.classList.contains('cinema')?actions:cinemaHome).append($('cinemaButton'));});
  $('forgeButton').textContent='＋ 创造台风';
  const advanced=document.createElement('details'),summary=document.createElement('summary'),grid=document.createElement('div');
  advanced.className='forge-advanced';summary.textContent='位置与强度 · 进阶设置';grid.className='forge-grid';advanced.append(summary,grid);
  for(const id of ['forgeWind','forgeLon','forgeLat','forgeSize'])grid.append($(id).closest('label'));
  $('forgeForm').insertBefore(advanced,$('forgePreview'));
  $('forgePick').addEventListener('click',()=>advanced.open=true);
  $('cameraSelect').addEventListener('change',e=>document.querySelector(`[data-view="${e.target.value}"]`).click());
  $('stormSwitcher').addEventListener('change',e=>select(Number(e.target.value)));
  let listSignature='';
  return {close,update(frame,selected){
    const s=frame.storms.find(s=>s.id===selected)||frame.storms[0],c=describe(s);
    $('summaryCategory').textContent=`${c.name} / ${s.number||s.invest}${s.retired?' · 已停编':''}`;
    $('summaryCategory').style.color=c.color;$('summaryName').textContent=s.name?.cn||'未命名';
    $('summaryNumbers').textContent=`${s.status==='dissipated'?'—':beaufort(s.wind)} 级　${s.wind.toFixed(1)} m/s　${s.pressure} hPa`;
    $('summaryStatus').textContent=s.status==='dissipated'?'已消散 · 可回放它的一生':s.onLand?'中心在陆地 · 正在减弱':s.retired?'温带气旋 · 风雨仍在持续':'西北太平洋 · 海上活动';
    const signature=frame.storms.map(s=>`${s.id}:${s.name?.cn||s.number||s.invest}`).join('|');
    if(signature!==listSignature){$('stormSwitcher').replaceChildren(...frame.storms.map(s=>new Option(`${s.name?.cn||s.number||s.invest}${s.name?'':' · 未命名'}`,s.id)));listSignature=signature;}
    $('stormSwitcher').value=selected;
  }};
}
