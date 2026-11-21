import {$} from './panels.js?v=c6e80bca356e';
import {describe} from './rules.js?v=c6e80bca356e';
import {cleanCustomName} from './naming.js?v=c6e80bca356e';

const stormLabel=storm=>storm?.name?.cn||storm?.number||storm?.invest||'未命名';

export function bindStormLibrary(callbacks){
  const dialog=$('stormLibraryDialog'),currentTab=$('libraryCurrentTab'),historyTab=$('libraryHistoryTab');
  const currentPanel=$('libraryCurrentPanel'),historyPanel=$('libraryHistoryPanel');
  const currentList=$('libraryCurrentList'),historyList=$('libraryHistoryList'),search=$('librarySearch');
  let view=null,opener=null,tab='current',currentSignature='',historySignature='';

  function setTab(next,{focus=false}={}){
    tab=next==='history'?'history':'current';
    const isHistory=tab==='history';
    currentTab.setAttribute('aria-selected',String(!isHistory));historyTab.setAttribute('aria-selected',String(isHistory));
    currentTab.tabIndex=isHistory?-1:0;historyTab.tabIndex=isHistory?0:-1;
    currentPanel.hidden=isHistory;historyPanel.hidden=!isHistory;
    if(isHistory)renderHistory(true);else renderCurrent(true);
    if(focus)(isHistory?search:currentTab).focus();
  }

  function addStormIdentity(container,storm,kind){
    const title=document.createElement('span'),meta=document.createElement('small');
    title.className='library-storm-name';title.textContent=stormLabel(storm);
    const kindLabel=document.createElement('i');kindLabel.className=`library-kind ${kind}`;kindLabel.textContent=kind==='mine'?'我的':'实验';
    title.append(kindLabel);
    const category=describe(storm);
    meta.textContent=`${category.name} · ${storm.id===view.selectedId?'当前观测':'点击查看'} · ${storm.number||storm.invest}`;
    container.append(title,meta);
  }

  function renderCurrent(force=false){
    if(!view)return;
    const signature=view.storms.map(storm=>`${storm.sourceId}:${stormLabel(storm)}:${describe(storm).name}:${view.visibleIds.has(storm.sourceId)}`).join('|')+`|${view.selectedId}`;
    if(!force&&signature===currentSignature)return;
    currentSignature=signature;const scroll=currentList.scrollTop;currentList.replaceChildren();
    for(const storm of view.storms){
      const row=document.createElement('article');row.className=`library-storm-row ${storm.id===view.selectedId?'selected':''}`;
      row.setAttribute('role','listitem');
      const label=document.createElement('label');label.className='library-check';
      const input=document.createElement('input');input.type='checkbox';input.checked=view.visibleIds.has(storm.sourceId);input.dataset.sourceId=storm.sourceId;
      input.setAttribute('aria-label',`在地图上展示 ${stormLabel(storm)}`);
      input.addEventListener('change',()=>{if(callbacks.onVisibility(storm.sourceId,input.checked)===false)input.checked=!input.checked;});
      label.append(input,document.createElement('span'));
      const main=document.createElement('button');main.type='button';main.className='library-storm-main';
      addStormIdentity(main,storm,storm.custom?'mine':'experiment');
      main.addEventListener('click',()=>{callbacks.onSelect(storm.id);dialog.close();});
      const status=document.createElement('span');status.className='library-visibility-state';status.textContent=input.checked?'展示中':'已隐藏';
      row.append(label,main,status);currentList.append(row);
    }
    currentList.scrollTop=scroll;
    $('libraryCurrentEmpty').hidden=view.storms.length>0;
  }

  function matchingHistory(){
    if(!view)return[];
    const query=search.value.trim().toLocaleLowerCase();
    if(!query)return view.history;
    return view.history.filter(entry=>{
      const storm=callbacks.getStorm(entry.id),name=cleanCustomName(entry.seed.customName)||stormLabel(storm);
      return `${name} ${stormLabel(storm)} ${storm?.number||''} ${storm?.invest||''} ${entry.id} ${entry.seed.lon.toFixed(1)} ${entry.seed.lat.toFixed(1)}`.toLocaleLowerCase().includes(query);
    });
  }

  function renderHistory(force=false){
    if(!view)return;
    const signature=view.history.map(entry=>`${entry.id}:${cleanCustomName(entry.seed.customName)}:${view.activeHistory.has(entry.id)}:${stormLabel(callbacks.getStorm(entry.id))}`).join('|');
    if(!force&&signature===historySignature)return;
    historySignature=signature;const scroll=historyList.scrollTop;historyList.replaceChildren();
    const entries=matchingHistory();
    $('libraryHistoryEmpty').hidden=entries.length>0;
    $('libraryHistoryEmptyText').textContent=view.history.length?'没有匹配的台风。换个名称、编号或经纬度试试。':'还没有自己创建的台风。创建一个系统后，会保存在这里，并可随时重新加入或还原实验。';
    for(const entry of entries){
      const active=view.activeHistory.has(entry.id),storm=callbacks.getStorm(entry.id),row=document.createElement('article');
      row.className=`library-history-row ${active?'active':''}`;
      row.setAttribute('role','listitem');
      const label=document.createElement('label');label.className='library-check';
      const include=document.createElement('input');include.type='checkbox';include.checked=active;
      include.setAttribute('aria-label',`将 ${cleanCustomName(entry.seed.customName)||'这个系统'} 加入当前实验`);
      include.addEventListener('change',()=>callbacks.onHistory(entry.id,include.checked));
      label.append(include,document.createElement('span'));

      const body=document.createElement('div');body.className='library-history-body';
      const name=document.createElement('input');name.type='text';name.className='library-name-input';name.maxLength=20;name.autocomplete='off';
      name.value=cleanCustomName(entry.seed.customName)||stormLabel(storm)||'';name.placeholder='输入实验名称';name.setAttribute('aria-label','修改台风名称');
      const error=document.createElement('small');error.className='library-name-error';error.hidden=true;
      name.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();name.blur();}});
      name.addEventListener('change',()=>{
        const result=callbacks.onRename(entry.id,name.value);
        if(result?.ok){name.value=result.name;name.removeAttribute('aria-invalid');error.hidden=true;}
        else{name.setAttribute('aria-invalid','true');error.hidden=false;error.textContent=result?.error||'名称没有保存，请重试。';}
      });
      const meta=document.createElement('small');const official=storm&&!storm.custom&&storm.name?` · 官方名 ${storm.name.cn}`:'';
      meta.textContent=`+${entry.seed.bornAt}h · ${entry.seed.lon.toFixed(1)}°E / ${entry.seed.lat.toFixed(1)}°N · ${active?(storm?'已加入实验':'等待出生'):'未加入实验'}${official}`;
      body.append(name,error,meta);

      const actions=document.createElement('div');actions.className='library-history-actions';
      const viewButton=document.createElement('button');viewButton.type='button';viewButton.className='library-view-button';viewButton.textContent='查看';viewButton.disabled=!active||!storm;
      viewButton.addEventListener('click',()=>{if(storm){callbacks.onSelect(storm.id);dialog.close();}});
      const remove=document.createElement('button');remove.type='button';remove.className='library-delete-button';remove.textContent='删除';remove.setAttribute('aria-label',`删除 ${name.value||'这个台风'}`);
      remove.addEventListener('click',()=>{
        if(remove.dataset.confirm!=='true'){
          remove.dataset.confirm='true';remove.textContent='确认删除';
          clearTimeout(remove.resetTimer);remove.resetTimer=setTimeout(()=>{if(remove.isConnected){remove.dataset.confirm='false';remove.textContent='删除';}},3500);
          return;
        }
        callbacks.onDelete(entry.id);
      });
      actions.append(viewButton,remove);row.append(label,body,actions);historyList.append(row);
    }
    historyList.scrollTop=scroll;
  }

  function update(next){
    view=next;
    const shown=next.visibleIds.size,total=next.storms.length;
    $('stormLibraryButtonCount').textContent=`${shown}/${total}`;
    $('historyButtonCount').textContent=`${next.activeHistory.size}/${next.history.length}`;
    $('libraryCurrentCount').textContent=String(total);
    $('libraryHistoryCount').textContent=String(next.history.length);
    $('libraryVisibleSummary').textContent=`地图展示 ${shown} 个，共 ${total} 个`;
    $('libraryHistorySummary').textContent=`${next.history.length} 个已保存，${next.activeHistory.size} 个正在实验中`;
    $('libraryShowAll').disabled=shown===total;
    const current=next.storms.find(storm=>storm.id===next.selectedId);
    $('libraryShowCurrent').disabled=shown===1&&current&&next.visibleIds.has(current.sourceId);
    $('libraryStorageHint').textContent=next.storageReady?'创建、改名和删除都会自动保存在当前浏览器。':'当前浏览器无法持久保存；记录只在本次页面有效。';
    $('libraryStorageHint').classList.toggle('warning',!next.storageReady);
    $('stormLibraryButton').setAttribute('aria-label',`打开台风实验台；地图展示 ${shown} 个，共 ${total} 个台风`);
    $('historyButton').setAttribute('aria-label',`打开我的台风；${next.history.length} 个已保存，${next.activeHistory.size} 个正在实验中`);
    renderCurrent();if(tab==='history')renderHistory();
  }

  function open(nextTab='current',trigger=null){
    opener=trigger;setTab(nextTab);if(view)renderCurrent(true);if(tab==='history')renderHistory(true);
    if(!dialog.open)dialog.showModal();
    requestAnimationFrame(()=>(tab==='history'?search:currentTab).focus());
  }

  currentTab.addEventListener('click',()=>setTab('current'));
  historyTab.addEventListener('click',()=>setTab('history'));
  for(const button of [currentTab,historyTab])button.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();setTab(tab==='history'?'current':'history',{focus:true});
  });
  search.addEventListener('input',()=>renderHistory(true));
  currentTab.closest('[role=tablist]').setAttribute('aria-label','台风分类');
  $('libraryShowAll').addEventListener('click',callbacks.onShowAll);
  $('libraryShowCurrent').addEventListener('click',callbacks.onShowCurrent);
  $('libraryCreateButton').addEventListener('click',()=>{dialog.close();requestAnimationFrame(callbacks.onCreate);});
  $('libraryEmptyCreate').addEventListener('click',()=>{dialog.close();requestAnimationFrame(callbacks.onCreate);});
  $('closeStormLibrary').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{if(opener?.isConnected)opener.focus();opener=null;});
  setTab('current');return {open,update};
}
