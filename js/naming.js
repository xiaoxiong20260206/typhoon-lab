export const MAX_CUSTOM_NAME_LENGTH=20;

// Custom labels belong to one user-created experiment. They never enter or
// consume entries from the fixed JMA naming table.
export function cleanCustomName(value){
  if(typeof value!=='string')return '';
  return Array.from(value.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g,'').replace(/\s+/g,' ').trim())
    .slice(0,MAX_CUSTOM_NAME_LENGTH).join('');
}
