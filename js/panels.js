import {beaufort,describe,ringRadii,weatherAt} from './rules.js';
import {PLACES} from './geo.js';

export const $=id=>document.getElementById(id);
export const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const set=(id,value)=>{const el=$(id);if(el.textContent!==String(value))el.textContent=value;};
export function updatePanels(run,hour,selected,onSelect){
  const frame=run.frames[hour],s=frame.storms.find(s=>s.id===selected)||frame.storms[0],cat=describe(s);
  set('stormName',s.name?.cn||'未命名');
  set('stormEnglish',s.name?.en.toUpperCase()||(s.number?'TROPICAL DEPRESSION':'TROPICAL DISTURBANCE'));
  set('stormCategory',cat.name);$('stormCategory').style.color=cat.color;
  set('stormNumber',`${s.number||s.invest}${s.retired?' · 停编':''}`);
  set('windLevel',s.status==='dissipated'?'—':`${beaufort(s.wind)}${beaufort(s.wind)>=18?'+':''}`);
  $('windSpeed').innerHTML=`${s.wind.toFixed(1)}<small>m/s</small>`;
  $('pressure').innerHTML=`${s.pressure}<small>hPa</small>`;
  set('stormLocation',`${s.lat.toFixed(1)}°N / ${s.lon.toFixed(1)}°E`);
  set('surfaceState',s.status==='dissipated'?'已消散':s.onLand?'陆地上':'海上');
  $('retiredNote').hidden=!s.retired;
  set('retiredNote',s.status==='dissipated'?'已停编 · 温带气旋已消散':'已变性 · 台风停编，气旋仍在活动');
  const radii=ringRadii(s);
  $('radii').innerHTML=[7,10,12].map((level,i)=>{
    const r=radii[level];
    return `<div class="radius-row"><span><i class="legend-ring ${['seven','ten','twelve'][i]}"></i>${level}级风圈</span>${r?`<b title="东北、东南、西南、西北：${r.join('、')} km">${Math.min(...r)}–${Math.max(...r)}<small>km</small></b>`:`<span class="absent">${s.status==='dissipated'?'已消失':'未达等级'}</span>`}</div>`;
  }).join('');
  const visibleEvents=run.events.filter(e=>e.id===s.id&&e.hour<=hour);
  $('eventList').innerHTML=visibleEvents.slice(-4).reverse().map(e=>`<li><small>第 ${Math.floor(e.hour/24)+1} 天 · ${String(e.hour%24).padStart(2,'0')}:00</small>${escape(e.text)}</li>`).join('');
  const list=$('systemList'),scroll=list.scrollTop,selectionChanged=list.dataset.selected!==String(selected);list.replaceChildren();
  for(const storm of frame.storms){
    const c=describe(storm),button=document.createElement('button');button.className=`system-item ${storm.id===selected?'active':''}`;button.setAttribute('aria-pressed',String(storm.id===selected));
    button.innerHTML=`<span><i class="system-color" style="background:${c.color}"></i>${escape(storm.name?.cn||`${storm.number||storm.invest} · 未命名`)}</span><small>#${storm.id} · ${c.name}</small>`;
    button.addEventListener('click',()=>onSelect(storm.id));list.append(button);
  }
  list.dataset.selected=selected;list.scrollTop=scroll;
  if(selectionChanged){const active=list.querySelector('.active');if(active)list.scrollTop+=active.getBoundingClientRect().top-list.getBoundingClientRect().top;}
  $('systemListHint').hidden=list.scrollHeight<=list.clientHeight;
  set('systemCount',`${frame.storms.length} 个 · 活动 ${frame.storms.filter(s=>s.status!=='dissipated').length}`);
  $('simTime').innerHTML=`第 ${Math.floor(hour/24)+1} 天 <em>${String(hour%24).padStart(2,'0')}:00</em>`;
  set('timelinePhase',s.status==='dissipated'?'生命周期结束':s.status==='extratropical'?'温带变性 · 已停编':s.onLand?'登陆衰减':cat.name);
  $('timeline').max=run.frames.length-1;$('timeline').value=hour;
  set('chartEnd',`+${run.frames.length-1}h`);
  $('timelineEvents').innerHTML=run.events.filter(e=>e.id===s.id).map(e=>`<i style="left:${e.hour/(run.frames.length-1)*100}%" title="+${e.hour}h：${escape(e.text)}"></i>`).join('');
  updateChart(run,hour,s);updateImpact(s,frame.storms);
}
function updateChart(run,hour,s){
  const x=h=>h/(run.frames.length-1)*260,y=v=>77-v/75*68;
  let path='';
  for(let h=s.bornAt;h<=hour;h++)path+=`${h===s.bornAt?'M':'L'}${x(h).toFixed(1)},${y(run.frames[h].storms.find(t=>t.id===s.id).wind).toFixed(1)} `;
  const fill=`${path}L${x(hour)},80 L${x(s.bornAt)},80Z`,c=describe(s).color;
  $('intensityChart').innerHTML=`<defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${c}" stop-opacity=".18"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs><path d="M0 ${y(32.7)}H260" stroke="#46564d" stroke-dasharray="3 4"/><text x="259" y="${y(32.7)-5}" fill="#849388" font-size="8" text-anchor="end">台风 32.7</text><path d="${fill}" fill="url(#chartFill)"/><path d="${path}" stroke="${c}" stroke-width="1.7" fill="none"/><circle cx="${x(hour)}" cy="${y(s.wind)}" r="2.8" fill="${c}"/><path d="M0 80H260" stroke="#34453d"/>`;
  set('peakLabel',`当前峰值 ${s.peak.toFixed(1)} m/s`);
  $('intensityChart').setAttribute('aria-label',`已回放 ${hour} 小时，风速峰值 ${s.peak.toFixed(1)} 米每秒`);
}
function updateImpact(s,storms){
  if(s.status==='dissipated'){set('impactType','影响结束');set('impactText',s.cause);return;}
  const impacted=PLACES.map(([name,lon,lat])=>({name,...weatherAt(s,lon,lat)})).filter(p=>p.wind>=10.8||p.rain>=2).sort((a,b)=>b.wind-a.wind);
  if(impacted.length){
    set('impactType','海陆均有影响');
    set('impactText',`${impacted.slice(0,3).map(p=>p.name).join('、')}等观测点进入风雨范围。${s.onLand?'中心已登陆，强度逐步下降。':'中心仍在海上，外围风雨已抵达沿岸。'}`);
  }else{
    set('impactType',s.onLand?'登陆影响':'海上风雨');
    set('impactText',s.onLand?'中心已登陆，附近陆地有风雨影响；持续深入陆地将逐渐消散。':'海上风雨持续活动，暂未覆盖沿岸观测点。点击地图任意位置可查看当地风雨。');
  }
  $('impactText').title=`${s.cause}${storms.length>1?' 多系统独立演化，未模拟相互作用。':''}`;
}
export function renderNames(names,used){
  const table=$('nameTable');table.replaceChildren();
  names.forEach((name,i)=>{
    const cell=document.createElement('div');cell.className=`name-cell ${used.includes(name.en)?'used':''}`;
    cell.innerHTML=`<span>${String(i+1).padStart(3,'0')}</span><div>${escape(name.cn)}<small>${escape(name.en)}</small></div>`;table.append(cell);
  });
}
export function toast(message){
  $('toast').textContent=message;$('toast').classList.add('show');
  clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),4000);
}
