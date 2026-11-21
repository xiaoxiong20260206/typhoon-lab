import {createRequire} from 'node:module';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const puppeteer=require(process.env.PUPPETEER_MODULE||'puppeteer');
const siteUrl=new URL(process.env.SITE_URL||'http://127.0.0.1:8770/');
siteUrl.searchParams.set('view','2d');
const userDataDir=await mkdtemp(join(tmpdir(),'typhoon-lab-legacy-'));
const launchOptions={headless:true,userDataDir,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})};
const checks=[];
let browser;

function check(name,condition){
  assert.ok(condition,name);
  checks.push(name);
  console.log('PASS',name);
}
async function launchBrowser(){
  browser=await puppeteer.launch(launchOptions);
  return browser.newPage();
}
async function openApp(){
  const page=await launchBrowser();
  await page.setViewport({width:1280,height:800});
  await page.goto(siteUrl.href,{waitUntil:'networkidle0',timeout:30000});
  await page.waitForFunction(()=>!!window.typhoonLab,{timeout:15000});
  return page;
}
async function openOrigin(){
  const page=await launchBrowser();
  await page.goto(new URL('guide.html',siteUrl).href,{waitUntil:'domcontentloaded'});
  return page;
}
async function closeBrowser(){
  await browser.close();browser=null;
}

const legacy={
  version:1,
  scenario:'ocean',
  env:{sst:30,shear:5,cold:10,size:1.4},
  hour:30,
  history:[
    {id:'legacy-a',createdAt:1700000000000,seed:{lon:142,lat:16,wind:24,size:1.4,bornAt:12,customName:'旧版一号'}},
    {id:'legacy-b',createdAt:1700000001000,seed:{lon:151,lat:20,wind:40,size:1.3,bornAt:18}}
  ],
  activeHistory:['legacy-a','legacy-b'],
  visibleStorms:['base','legacy-a']
};

try{
  let page=await openOrigin();
  await page.evaluate(value=>{localStorage.removeItem('typhoon-lab-session-v1');localStorage.removeItem('typhoon-lab-session-v1-backup');localStorage.setItem('typhoon-lab-session-v1',JSON.stringify(value))},legacy);
  await page.goto(siteUrl.href,{waitUntil:'networkidle0',timeout:30000});
  await page.waitForFunction(()=>!!window.typhoonLab,{timeout:15000});
  check('older saved creations load in the new version',await page.evaluate(()=>window.typhoonLab.state.history.length===2&&window.typhoonLab.state.history.some(entry=>entry.id==='legacy-a'&&entry.seed.customName==='旧版一号')&&window.typhoonLab.state.history.some(entry=>entry.id==='legacy-b')));
  check('older active, visible, scenario, environment and hour choices load',await page.evaluate(()=>window.typhoonLab.state.activeHistory.size===2&&window.typhoonLab.state.visibleStorms.size===2&&window.typhoonLab.state.scenario==='ocean'&&window.typhoonLab.state.env.sst===30&&window.typhoonLab.state.hour===30));
  check('older data has no phantom official selection',await page.evaluate(()=>window.typhoonLab.state.activeOfficial.size===0&&window.typhoonLab.frame.storms.length===3));

  await page.click('#forgeButton');
  await page.select('#forgePreset','20');
  await page.$eval('#forgeLon',input=>input.value='146');
  await page.$eval('#forgeLat',input=>input.value='14');
  await page.click('#forgeSubmit');
  await page.waitForFunction(()=>!document.getElementById('forgeDialog').open);
  check('a new version creation keeps every older creation',await page.evaluate(()=>window.typhoonLab.state.history.length===3&&window.typhoonLab.state.history.filter(entry=>entry.id.startsWith('legacy-')).length===2));
  check('the version upgrade writes a complete mirror',await page.evaluate(()=>{const primary=JSON.parse(localStorage.getItem('typhoon-lab-session-v1')),backup=JSON.parse(localStorage.getItem('typhoon-lab-session-v1-backup'));return primary.history.length===3&&backup.history.length===3&&backup.activeHistory.length===3&&JSON.stringify(primary)===JSON.stringify(backup)}));
  await closeBrowser();

  page=await openOrigin();
  await page.evaluate(()=>localStorage.setItem('typhoon-lab-session-v1','{damaged'));
  await closeBrowser();
  page=await openApp();
  check('a damaged primary is restored from the automatic mirror after a full restart',await page.evaluate(()=>window.typhoonLab.state.history.length===3&&window.typhoonLab.state.history.some(entry=>entry.seed.customName==='旧版一号')));
  check('the mirror restored all active demonstrations',await page.evaluate(()=>window.typhoonLab.state.activeHistory.size===3&&window.typhoonLab.frame.storms.length===4));
  await closeBrowser();

  page=await openApp();
  check('the reopened primary and mirror still contain all creations',await page.evaluate(()=>window.typhoonLab.state.history.length===3&&JSON.parse(localStorage.getItem('typhoon-lab-session-v1')).history.length===3&&JSON.parse(localStorage.getItem('typhoon-lab-session-v1-backup')).history.length===3));
  console.log(JSON.stringify({passed:checks.length,userDataDir,url:siteUrl.href}));
}catch(error){
  console.error(error);
  process.exitCode=1;
}finally{
  if(browser)await browser.close().catch(()=>{});
  await rm(userDataDir,{recursive:true,force:true});
}
