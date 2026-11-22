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
  if(customName)await page.$eval('#forgeCustomName',(input,value)=>input.value=value,customName);
  await page.select('#forgePreset','20');
  await page.$eval('#forgeLon',(input,value)=>input.value=String(value),lon);
  await page.$eval('#forgeLat',(input,value)=>input.value=String(value),lat);
  await page.click('#forgeSubmit');
  await page.waitForFunction(()=>!document.getElementById('forgeDialog').open);
}

try{
  let page=await openPage(true);
  await page.goto(new URL('guide.html',siteUrl).href,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{localStorage.removeItem('typhoon-lab-session-v1');localStorage.removeItem('typhoon-lab-session-v1-backup');localStorage.removeItem('typhoon-lab-session-v1-archive')});
  await page.goto(siteUrl.href,{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>!!window.typhoonLab);

  await createStorm(page,{lon:145,lat:15});
  await createStorm(page,{lon:155,lat:18,customName:'海棠'});
  await page.click('#stormLibraryButton');
  await page.$eval('#libraryCurrentList input[type=checkbox]',input=>{input.click();input.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.click('#libraryOfficialTab');
  await page.$eval('#libraryOfficialSearch',input=>{input.value='轩岚诺';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.click('#libraryOfficialList .library-check input');
  await page.waitForFunction(()=>window.typhoonLab.state.activeOfficial.size===1&&window.typhoonLab.frame.storms.length===4);
  await page.click('#libraryHistoryTab');
  await page.$eval('#libraryHistoryList .library-name-input',input=>{input.value='实验一号';input.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.click('#closeStormLibrary');
  check('two creations and one official storm are active before close',await page.evaluate(()=>window.typhoonLab.state.history.length===2&&window.typhoonLab.state.activeHistory.size===2&&window.typhoonLab.state.activeOfficial.size===1&&window.typhoonLab.frame.storms.length===4));
  check('edited and custom names plus map visibility are saved before close',await page.evaluate(()=>window.typhoonLab.state.history.some(entry=>entry.seed.customName==='实验一号')&&window.typhoonLab.frame.storms.some(s=>s.name?.cn==='海棠'&&s.custom)&&window.typhoonLab.state.visibleStorms.size===2&&window.typhoonLab.map.visibleStorms===2));
  check('two history selections are visible before close',await page.evaluate(()=>document.getElementById('historyButtonCount').textContent==='2/2'));
  check('session is written to localStorage before close',await page.evaluate(()=>{const data=JSON.parse(localStorage.getItem('typhoon-lab-session-v1'));return data.history.length===2&&data.activeHistory.length===2&&data.activeOfficial.length===1;}));
  check('the mirror and archive keep the same complete session',await page.evaluate(()=>localStorage.getItem('typhoon-lab-session-v1-backup')===localStorage.getItem('typhoon-lab-session-v1')&&localStorage.getItem('typhoon-lab-session-v1-archive')===localStorage.getItem('typhoon-lab-session-v1')));
  await page.click('#historyButton');
  check('unified history entry opens both saved selections directly',await page.evaluate(()=>document.getElementById('stormLibraryDialog').open&&document.getElementById('libraryHistoryTab').getAttribute('aria-selected')==='true'&&document.querySelectorAll('#libraryHistoryList input:checked').length===2));
  await page.click('#closeStormLibrary');

  await browser.close();
  browser=null;

  page=await openPage(false);
  await page.click('#historyButton');check('history survives a full browser restart',await page.evaluate(()=>window.typhoonLab.state.history.length===2&&document.querySelectorAll('#libraryHistoryList .library-history-row').length===2));
  check('edited and custom names survive a full browser restart',await page.evaluate(()=>window.typhoonLab.frame.storms.some(s=>s.name?.cn==='海棠'&&s.custom)&&window.typhoonLab.state.history.some(entry=>entry.seed.customName==='实验一号')));
  check('multi-system selection survives a full browser restart',await page.evaluate(()=>window.typhoonLab.state.activeHistory.size===2&&window.typhoonLab.state.activeOfficial.size===1&&window.typhoonLab.frame.storms.length===4));
  check('official selection survives a full browser restart',await page.evaluate(()=>window.typhoonLab.frame.storms.some(storm=>storm.name?.en==='HINNAMNOR'&&storm.name?.cn==='轩岚诺'&&storm.official?.season===2022)));
  await page.click('#libraryCurrentTab');check('map visibility choice survives a full browser restart',await page.evaluate(()=>window.typhoonLab.state.visibleStorms.size===2&&window.typhoonLab.map.visibleStorms===2&&[...document.querySelectorAll('#libraryCurrentList input[type=checkbox]')].filter(i=>i.checked).length===2));
  check('restored history selections remain checked in the UI',await page.evaluate(()=>document.getElementById('historyButtonCount').textContent==='2/2'));
  await page.click('#libraryHistoryTab');const deleted=await page.$('#libraryHistoryList .library-delete-button');await deleted.click();await deleted.click();
  await page.waitForFunction(()=>window.typhoonLab.state.history.length===1);check('an individual deletion is written before closing',await page.evaluate(()=>window.typhoonLab.state.history.length===1&&window.typhoonLab.state.activeHistory.size===1&&window.typhoonLab.state.activeOfficial.size===1));
  await browser.close();browser=null;
  page=await openPage(false);
  check('an individual deletion survives a full browser restart',await page.evaluate(()=>window.typhoonLab.state.history.length===1&&window.typhoonLab.frame.storms.length===3&&window.typhoonLab.state.activeOfficial.size===1&&document.getElementById('historyButtonCount').textContent==='1/1'));
  console.log(JSON.stringify({passed:checks.length,userDataDir,url:siteUrl.href}));
}catch(error){
  console.error(error);
  process.exitCode=1;
}finally{
  if(browser)await browser.close().catch(()=>{});
  await rm(userDataDir,{recursive:true,force:true});
}
