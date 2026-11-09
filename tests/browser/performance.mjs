import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_MODULE||'puppeteer');
const browser=await puppeteer.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
try{
  const page=await browser.newPage();await page.setViewport({width:1440,height:960});
  await page.goto(process.env.SITE_URL||'http://127.0.0.1:8770/',{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>window.typhoonLab?.theater.frameCount>0);
  const controls=await page.evaluate(()=>[...document.querySelectorAll('button,select,input')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&r.bottom>0&&r.top<innerHeight&&getComputedStyle(e).visibility!=='hidden';}).length);
  for(let i=0;i<7;i++)await page.evaluate(i=>{document.getElementById('forgeButton').click();const preset=document.getElementById('forgePreset');preset.value=i===6?'60':'20';preset.dispatchEvent(new Event('change'));document.getElementById('forgeLon').value=140+i*3;document.getElementById('forgeLat').value=12+i;document.getElementById('forgeForm').requestSubmit();},i);
  await page.evaluate(()=>document.querySelector('[data-view="overview"]').click());
  await page.evaluate(()=>new Promise(resolve=>{let n=0;function f(){if(++n===100)resolve();else requestAnimationFrame(f);}f();}));
  const scene=await page.evaluate(()=>window.typhoonLab.theater);
  if(process.env.BENCH_LABEL!=='before'){assert.ok(controls<=14,'default control budget');assert.equal(scene.systems,8);assert.ok(scene.triangles<100000,'8-system geometry budget');}
  await page.click('#playButton');
  const timings=await page.evaluate(()=>new Promise(resolve=>{const a=[];let prev;function f(t){if(prev)a.push(t-prev);prev=t;if(a.length===120)resolve(a);else requestAnimationFrame(f);}requestAnimationFrame(f);}));
  await page.click('#playButton');timings.sort((a,b)=>a-b);
  const result={url:page.url(),controls,scene,medianFrameMs:timings[60],p95FrameMs:timings[114],note:'同一桌面临时 Chrome / 1440×960 / 8系统 / 全域 / 自动画质；帧间隔受刷新率与机器负载影响，不是跨设备性能承诺。'};
  await mkdir('Output',{recursive:true});await writeFile(`Output/${process.env.BENCH_LABEL||'after'}-performance.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
