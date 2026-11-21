export const MAX_CUSTOM_NAME_LENGTH=20;

// Custom labels belong to one user-created experiment. They never enter or
// consume entries from the fixed JMA naming table.
export function cleanCustomName(value){
  if(typeof value!=='string')return '';
  return Array.from(value.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g,'').replace(/\s+/g,' ').trim())
    .slice(0,MAX_CUSTOM_NAME_LENGTH).join('');
}

export function nextCustomName(history=[]){
  const used=new Set(history.map(entry=>cleanCustomName(entry?.seed?.customName)).filter(Boolean));
  for(let index=1;index<=9999;index++){
    const name=`实验台风 ${String(index).padStart(2,'0')}`;
    if(!used.has(name))return name;
  }
  return `实验台风 ${Date.now().toString(36).slice(-4)}`;
}

export function isCustomNameTaken(value,history=[],ignoreId=null){
  const name=cleanCustomName(value);
  return !!name&&history.some(entry=>entry.id!==ignoreId&&cleanCustomName(entry?.seed?.customName)===name);
}
