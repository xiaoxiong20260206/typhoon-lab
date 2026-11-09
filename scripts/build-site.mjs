import {cp,mkdir,mkdtemp,rename,readdir,lstat} from 'node:fs/promises';
import {resolve,join} from 'node:path';

// Build into a new directory; never package developer notes, tests, or credentials.
const root=resolve(import.meta.dirname,'..');
const out=await mkdtemp(join(root,'.site-build-'));
for(const entry of ['index.html','guide.html','favicon.svg','js','styles','assets']){
  const source=join(root,entry);
  async function check(path){
    const info=await lstat(path);
    if(info.isSymbolicLink())throw Error(`Refusing symlink: ${path}`);
    if(info.isDirectory())for(const child of await readdir(path))await check(join(path,child));
  }
  await check(source);await cp(source,join(out,entry),{recursive:true});
}
await mkdir(join(root,'.publish'),{recursive:true});
const destination=join(root,'.publish',`site-${Date.now()}`);
await rename(out,destination);
console.log(destination);
