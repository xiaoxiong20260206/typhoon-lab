import {execFileSync} from 'node:child_process';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';

/*
 * 只替换站点运行文件，保留仓库里的源码、测试、脚本与文档。
 * 运行文件：index.html、guide.html、favicon.svg、assets/、js/、styles/、.nojekyll
 * 其余路径（scripts/、tests/、docs/、package.json、README.md、AGENTS.md、CHANGELOG.md 等）原样保留。
 */
const root=resolve(import.meta.dirname,'..');
const repo='xiaoxiong20260206/typhoon-lab';
const api=(path,method='GET',payload)=>JSON.parse(execFileSync('gh',[
  'api',`repos/${repo}/${path}`,'--method',method,...(payload?['--input','-']:[])
],{input:payload?JSON.stringify(payload):undefined,encoding:'utf8',maxBuffer:10*1024*1024}));
const isRuntime=path=>path==='.nojekyll'||['index.html','guide.html','favicon.svg'].includes(path)
  ||['assets','js','styles'].some(p=>path===p||path.startsWith(`${p}/`));

execFileSync('npm',['test'],{cwd:root,stdio:'inherit'});
const directory=execFileSync(process.execPath,['scripts/build-site.mjs'],{cwd:root,encoding:'utf8'}).trim();

const built=[];
async function collect(dir,prefix=''){
  for(const entry of await readdir(dir,{withFileTypes:true})){
    const path=prefix+entry.name;
    if(entry.isDirectory())await collect(join(dir,entry.name),`${path}/`);
    else if(isRuntime(path))built.push({path,mode:'100644',type:'blob',content:await readFile(join(dir,entry.name),'utf8')});
    else throw Error(`Unexpected build output: ${path}`);
  }
}
await collect(directory);
if(!built.some(entry=>entry.path==='index.html'))throw Error('Build output is missing index.html');
// 构建目录不含 .nojekyll，固定补入，避免 Pages 走 Jekyll 处理
if(!built.some(entry=>entry.path==='.nojekyll'))built.push({path:'.nojekyll',mode:'100644',type:'blob',content:''});

const head=api('git/ref/heads/main').object.sha;
const previous=api(`git/commits/${head}`);
const oldTree=api(`git/trees/${previous.tree.sha}?recursive=1`);
if(oldTree.truncated)throw Error('Remote tree listing is truncated; refusing to publish.');

// 保留的源码/文档条目复用已有 blob 与 tree，不重新上传内容
const preserved=oldTree.tree
  .filter(entry=>!isRuntime(entry.path))
  .map(({path,mode,type,sha})=>({path,mode,type,sha}));

const next=api('git/trees','POST',{tree:[...preserved,...built]});
let commit=head;
if(next.sha!==previous.tree.sha){
  commit=api('git/commits','POST',{
    message:'Publish verified Typhoon Lab website',
    tree:next.sha,
    parents:[head]
  }).sha;
  api('git/refs/heads/main','PATCH',{sha:commit,force:false});
  console.log(`Published commit ${commit}`);
}else{
  console.log('No runtime changes; repository already up to date.');
}
await writeFile(join(root,'.publish','latest.json'),JSON.stringify({
  repo,
  commit,
  directory,
  url:'https://xiaoxiong20260206.github.io/typhoon-lab/'
},null,2));
console.log(`https://xiaoxiong20260206.github.io/typhoon-lab/\nWait for Pages deployment, then verify the live site.`);
