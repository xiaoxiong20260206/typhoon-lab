import {$} from './panels.js?v=3f01d7f9280e';
import {describe,beaufort} from './rules.js?v=3f01d7f9280e';
import {cleanCustomName,isCustomNameTaken,MAX_CUSTOM_NAME_LENGTH} from './naming.js?v=3f01d7f9280e';

export function bindForge({create,onOpen,onPick}){
  const dialog=$('forgeDialog'),form=$('forgeForm');
  const api={picking:false,locate(lon,lat){
    api.picking=false;$('forgeLon').value=lon.toFixed(2);$('forgeLat').value=lat.toFixed(2);dialog.showModal();
  }};
  let nextDefaultName='',currentState=null;
  const syncNameMode=()=>{
    const custom=$('forgeNameMode').value==='custom',label=$('forgeCustomNameLabel'),input=$('forgeCustomName');
    label.hidden=!custom;input.required=false;input.setAttribute('aria-invalid','false');
    if(!custom){input.value='';$('forgeNameHint').textContent='按固定命名表领取；名称只在达到热带风暴且尚未命名时分配。';}
    else $('forgeNameHint').textContent=`已为你准备默认名称，可直接修改；留空会再次自动生成。最多 ${MAX_CUSTOM_NAME_LENGTH} 个字符，不占用官方 140 名命名表。`;
  };
  const preview=()=>{
    const wind=Number($('forgeWind').value);
    const category=describe({wind,status:'tropical'});
    const presets={INVEST:'9',TD:'14',TS:'20',STS:'28',TY:'35',STY:'45',SuperTY:'60'};
    const custom=$('forgeNameMode').value==='custom',customName=cleanCustomName($('forgeCustomName').value);
    $('forgePreset').value=presets[category.code];
    $('forgePreview').textContent=Number.isFinite(wind)&&wind>=1&&wind<=75
      ?custom
        ?`${category.name} · ${beaufort(wind)}级 · ${wind} m/s。${customName?`名称「${customName}」将立即生效。`:`将自动使用「${nextDefaultName}」。`}`
        :`${category.name} · ${beaufort(wind)}级 · ${wind} m/s。${wind>=17.2?'创建时按固定表命名。':'未命名，增强到热带风暴时才领取名字。'}`
      :'请输入 1—75 m/s 的初始风速。';
  };
  $('forgeButton').addEventListener('click',()=>{
    const state=onOpen();currentState=state;api.picking=false;
    $('forgeScenario').value=state.scenario;$('forgeSize').value=state.env.size;nextDefaultName=state.nextName||'';
    $('forgeNameMode').value='custom';$('forgeCustomName').value=nextDefaultName;
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
    const nameMode=$('forgeNameMode').value;
    const customName=nameMode==='custom'?cleanCustomName($('forgeCustomName').value):'';
    if(nameMode==='custom'&&customName&&isCustomNameTaken(customName,currentState?.history)){
      $('forgeCustomName').setAttribute('aria-invalid','true');$('forgeError').textContent='这个名称已经属于另一个自建台风，请换一个名称。';$('forgeCustomName').focus();return;
    }
    if(create(lon,lat,{wind:Number($('forgeWind').value),size:Number($('forgeSize').value),scenario:$('forgeScenario').value,nameMode,customName})){
      dialog.close();api.picking=false;
    }else $('forgeError').textContent='无法创建：请检查数值范围，并将出生点放在海面上。';
  });
  return api;
}
