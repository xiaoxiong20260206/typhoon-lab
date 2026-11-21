import {cp,mkdir,mkdtemp,rename,readdir,lstat,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
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

async function collectFiles(directory,prefix=''){
  const files=[];
  for(const entry of (await readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
    const path=prefix+entry.name;
    if(entry.isDirectory())files.push(...await collectFiles(join(directory,entry.name),`${path}/`));
    else files.push(path);
  }
  return files;
}

// Stamp every deployed browser resource with a content-derived version. This
// prevents a freshly cached HTML shell from combining with an older app.js or
// module after a GitHub Pages deployment.
const packageData=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
const hash=createHash('sha256').update(packageData.version);
for(const directory of ['js','styles','assets']){
  for(const path of await collectFiles(join(out,directory))){
    const content=await readFile(join(out,directory,path));
    hash.update(`${directory}/${path}`);
    hash.update(directory==='js'?content.toString('utf8').replace(/(\.js)\?v=[a-f0-9]{12}/g,'$1'):content);
  }
}
const assetVersion=hash.digest('hex').slice(0,12);
const stampUrl=url=>{
  if(!/^(?:styles\/|js\/|assets\/|favicon\.svg)/.test(url))return url;
  const clean=url.replace(/([?&])v=[a-f0-9]{12}/g,'').replace(/[?&]$/,'');
  return `${clean}${clean.includes('?')?'&':'?'}v=${assetVersion}`;
};
for(const html of ['index.html','guide.html']){
  const path=join(out,html),source=await readFile(path,'utf8');
  await writeFile(path,source.replace(/\b(href|src)="([^"]+)"/g,(match,attribute,url)=>`${attribute}="${stampUrl(url)}"`));
}
for(const path of await collectFiles(join(out,'js'))){
  const file=join(out,'js',path),source=await readFile(file,'utf8');
  const stamped=source.replace(/(\bfrom\s*|\bimport\s*\(\s*)(['"])(\.\/[^'"]+?\.js)(?:\?[^'"]*)?\2/g,(match,before,quote,url)=>`${before}${quote}${url}?v=${assetVersion}${quote}`);
  if(stamped!==source)await writeFile(file,stamped);
}
await mkdir(join(root,'.publish'),{recursive:true});
const destination=join(root,'.publish',`site-${Date.now()}`);
await rename(out,destination);
// Keep the source worktree's runnable files identical to the verified build,
// so later source commits cannot overwrite deployed cache-busted resources
// with an unversioned HTML/module graph.
for(const entry of ['index.html','guide.html','favicon.svg','js','styles','assets']){
  await cp(join(destination,entry),join(root,entry),{recursive:true,force:true});
}
console.log(destination);
