import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(import.meta.dirname,'..'),port=Number(process.env.PORT||8770);
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.md':'text/plain; charset=utf-8'};
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+sep)||pathname.split('/').some(s=>s.startsWith('.'))){res.writeHead(403);res.end('Forbidden');return;}
    if(!(await stat(file)).isFile())throw Error('Not found');
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(await readFile(file));
  }catch{res.writeHead(404);res.end('Not found');}
});
server.on('error',e=>{console.error(`Cannot start local preview: ${e.message}`);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Typhoon Lab ready: http://127.0.0.1:${port}`));
