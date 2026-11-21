import {createRequire} from 'node:module';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const puppeteer=require(process.env.PUPPETEER_MODULE||'puppeteer');
const siteUrl=new URL(process.env.SITE_URL||'http://127.0.0.1:8770/');
siteUrl.searchParams.set('view','2d');
const userDataDir=await mkdtemp(join(tmpdir(),'typhoon-lab-persistence-'));
const launchOptions={
  headless:true,
  userDataDir,
  ...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})
};
const checks=[];
let browser;

function check(name,condition){
  assert.ok(condition,name);
  checks.push(name);
  console.log('PASS',name);
}

async function openPage(run){
  browser=await puppeteer.launch(launchOptions);
  const page=await browser.newPage();
  await page.setViewport({width:1280,height:800});
  await page.goto(siteUrl.href,{waitUntil:'networkidle0',timeout:30000});
  await page.waitForFunction(()=>!!window.typhoonLab,{timeout:15000});
  return page;
}

async function createStorm(page,{lon,lat,customName=''}){
  await page.click('#forgeButton');
  if(customName){await page.select('#forgeNameMode','custom');await page.type('#forgeCustomName',customName);}
  await page.select('#forgePreset','20');
  await page.$eval('#forgeLon',(input,value)=>input.value=String(value),lon);
  await page.$eval('#forgeLat',(input,value)=>input.value=String(value),lat);
  await page.click('#forgeSubmit');
  await page.waitForFunction(()=>!document.getElementById('forgeDialog').open);
}

try{
  let page=await openPage(true);
  await page.goto(new URL('guide.html',siteUrl).href,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>localStorage.removeItem('typhoon-lab-session-v1'));
  await page.goto(siteUrl.href,{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>!!window.typhoonLab);

  await createStorm(page,{lon:145,lat:15});
  await createStorm(page,{lon:155,lat:18,customName:'海棠'});
  await page.click('#visibilitySummary');
  await page.$eval('#visibilityList input',input=>{input.click();input.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.click('#visibilitySummary');
  check('two creations are active before close',await page.evaluate(()=>window.typhoonLab.state.history.length===2&&window.typhoonLab.state.activeHistory.size===2&&window.typhoonLab.frame.storms.length===3));
  check('custom name and one-system map visibility are saved before close',await page.evaluate(()=>window.typhoonLab.frame.storms.some(s=>s.name?.cn==='海棠'&&s.custom)&&window.typhoonLab.state.visibleStorms.size===2&&window.typhoonLab.map.visibleStorms===2));
  check('two selections are visible before close',await page.evaluate(()=>document.querySelectorAll('#historyList input:checked').length===2&&document.getElementById('historyCount').textContent.includes('演示 2')));
  check('session is written to localStorage before close',await page.evaluate(()=>{const data=JSON.parse(localStorage.getItem('typhoon-lab-session-v1'));return data.history.length===2&&data.activeHistory.length===2;}));
  check('visible multi-storm entry points to the saved selection',await page.evaluate(()=>{const button=document.getElementById('historyButton');return !button.hidden&&button.textContent.includes('2/2');}));
  await page.click('#historyButton');
  check('history entry opens the multi-select list directly',await page.evaluate(()=>document.getElementById('workspaceDrawer').open&&document.getElementById('historyDetails').open&&document.querySelectorAll('#historyList input:checked').length===2));
  await page.click('#drawerClose');

  await browser.close();
  browser=null;

  page=await openPage(false);
  check('history survives a full browser restart',await page.evaluate(()=>window.typhoonLab.state.history.length===2&&document.querySelectorAll('#historyList .history-item').length===2));
  check('custom name survives a full browser restart',await page.evaluate(()=>window.typhoonLab.frame.storms.some(s=>s.name?.cn==='海棠'&&s.custom)));
  check('multi-system selection survives a full browser restart',await page.evaluate(()=>window.typhoonLab.state.activeHistory.size===2&&window.typhoonLab.frame.storms.length===3));
  check('map visibility choice survives a full browser restart',await page.evaluate(()=>window.typhoonLab.state.visibleStorms.size===2&&window.typhoonLab.map.visibleStorms===2&&[...document.querySelectorAll('#visibilityList input')].filter(i=>i.checked).length===2));
  check('restored selections remain checked in the UI',await page.evaluate(()=>document.querySelectorAll('#historyList input:checked').length===2&&document.getElementById('historyCount').textContent.includes('演示 2')));
  check('restored history keeps the visible multi-storm entry',await page.evaluate(()=>{const button=document.getElementById('historyButton');return !button.hidden&&button.textContent.includes('2/2');}));
  console.log(JSON.stringify({passed:checks.length,userDataDir,url:siteUrl.href}));
}catch(error){
  console.error(error);
  process.exitCode=1;
}finally{
  if(browser)await browser.close().catch(()=>{});
  await rm(userDataDir,{recursive:true,force:true});
}
