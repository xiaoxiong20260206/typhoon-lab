import {$} from './panels.js';
import {describe,beaufort} from './rules.js';

export function bindForge({create,onOpen,onPick}){
  const dialog=$('forgeDialog'),form=$('forgeForm');
  const api={picking:false,locate(lon,lat){
    api.picking=false;$('forgeLon').value=lon.toFixed(2);$('forgeLat').value=lat.toFixed(2);dialog.showModal();
  }};
  const preview=()=>{
    const wind=Number($('forgeWind').value);
    const category=describe({wind,status:'tropical'});
    const presets={INVEST:'9',TD:'14',TS:'20',STS:'28',TY:'35',STY:'45',SuperTY:'60'};
    $('forgePreset').value=presets[category.code];
    $('forgePreview').textContent=Number.isFinite(wind)&&wind>=1&&wind<=75
      ?`${category.name} · ${beaufort(wind)}级 · ${wind} m/s。${wind>=17.2?'创建时按表正式命名。':'未命名，增强到热带风暴时才领取名字。'}`
      :'请输入 1—75 m/s 的初始风速。';
  };
  $('forgeButton').addEventListener('click',()=>{
    const state=onOpen();api.picking=false;
    $('forgeScenario').value=state.scenario;$('forgeSize').value=state.env.size;
    $('forgeTime').textContent=`在 +${Math.floor(state.hour)}h 加入新系统。此前历史不变，此后的演化重新计算。`;
    $('forgeError').textContent='';preview();dialog.showModal();
  });
  $('closeForge').addEventListener('click',()=>dialog.close());
  $('forgeWind').addEventListener('input',preview);
  $('forgePreset').addEventListener('change',e=>{$('forgeWind').value=e.target.value;preview();});
  $('forgePick').addEventListener('click',()=>{api.picking=true;dialog.close();onPick();});
  form.addEventListener('submit',e=>{
    e.preventDefault();
    if(!form.reportValidity())return;
    const lon=Number($('forgeLon').value),lat=Number($('forgeLat').value);
    if(create(lon,lat,{wind:Number($('forgeWind').value),size:Number($('forgeSize').value),scenario:$('forgeScenario').value})){
      dialog.close();api.picking=false;
    }else $('forgeError').textContent='无法创建：请检查数值范围，并将出生点放在海面上。';
  });
  return api;
}
