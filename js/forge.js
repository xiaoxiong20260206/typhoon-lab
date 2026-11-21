import {$} from './panels.js?v=d79f98f758ed';
import {describe,beaufort} from './rules.js?v=d79f98f758ed';
import {cleanCustomName,MAX_CUSTOM_NAME_LENGTH} from './naming.js?v=d79f98f758ed';

export function bindForge({create,onOpen,onPick}){
  const dialog=$('forgeDialog'),form=$('forgeForm');
  const api={picking:false,locate(lon,lat){
    api.picking=false;$('forgeLon').value=lon.toFixed(2);$('forgeLat').value=lat.toFixed(2);dialog.showModal();
  }};
  const syncNameMode=()=>{
    const custom=$('forgeNameMode').value==='custom',label=$('forgeCustomNameLabel'),input=$('forgeCustomName');
    label.hidden=!custom;input.required=custom;input.setAttribute('aria-invalid','false');
    if(!custom){input.value='';$('forgeNameHint').textContent='按固定命名表领取；名称只在达到热带风暴且尚未命名时分配。';}
    else $('forgeNameHint').textContent=`填写 1–${MAX_CUSTOM_NAME_LENGTH} 个字符。自定义名称立即显示，且不占用官方 140 名命名表。`;
  };
  const preview=()=>{
    const wind=Number($('forgeWind').value);
    const category=describe({wind,status:'tropical'});
    const presets={INVEST:'9',TD:'14',TS:'20',STS:'28',TY:'35',STY:'45',SuperTY:'60'};
    const custom=$('forgeNameMode').value==='custom',customName=cleanCustomName($('forgeCustomName').value);
    $('forgePreset').value=presets[category.code];
    $('forgePreview').textContent=Number.isFinite(wind)&&wind>=1&&wind<=75
      ?custom
        ?`${category.name} · ${beaufort(wind)}级 · ${wind} m/s。${customName?`自定义名称「${customName}」将立即生效。`:'请填写自定义名称。'}`
        :`${category.name} · ${beaufort(wind)}级 · ${wind} m/s。${wind>=17.2?'创建时按固定表命名。':'未命名，增强到热带风暴时才领取名字。'}`
      :'请输入 1—75 m/s 的初始风速。';
  };
  $('forgeButton').addEventListener('click',()=>{
    const state=onOpen();api.picking=false;
    $('forgeScenario').value=state.scenario;$('forgeSize').value=state.env.size;
    $('forgeNameMode').value='auto';$('forgeCustomName').value='';
    $('forgeTime').textContent=`在 +${Math.floor(state.hour)}h 加入新系统。此前历史不变，此后的演化重新计算。`;
    $('forgeError').textContent='';syncNameMode();preview();dialog.showModal();
  });
  $('closeForge').addEventListener('click',()=>dialog.close());
  $('forgeWind').addEventListener('input',preview);
  $('forgeCustomName').addEventListener('input',e=>{e.target.setAttribute('aria-invalid','false');preview();});
  $('forgeNameMode').addEventListener('change',()=>{syncNameMode();$('forgeError').textContent='';preview();if($('forgeNameMode').value==='custom')$('forgeCustomName').focus();});
  $('forgePreset').addEventListener('change',e=>{$('forgeWind').value=e.target.value;preview();});
  $('forgePick').addEventListener('click',()=>{api.picking=true;dialog.close();onPick();});
  form.addEventListener('submit',e=>{
    e.preventDefault();
    if(!form.reportValidity())return;
    const lon=Number($('forgeLon').value),lat=Number($('forgeLat').value);
    const customName=$('forgeNameMode').value==='custom'?cleanCustomName($('forgeCustomName').value):'';
    if($('forgeNameMode').value==='custom'&&!customName){
      $('forgeCustomName').setAttribute('aria-invalid','true');$('forgeError').textContent=`请填写 1–${MAX_CUSTOM_NAME_LENGTH} 个字符的自定义名称，或改回官方自动命名。`;$('forgeCustomName').focus();return;
    }
    if(create(lon,lat,{wind:Number($('forgeWind').value),size:Number($('forgeSize').value),scenario:$('forgeScenario').value,customName})){
      dialog.close();api.picking=false;
    }else $('forgeError').textContent='无法创建：请检查数值范围，并将出生点放在海面上。';
  });
  return api;
}
