import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {CHINESE_NAMES} from '../js/names.js';

const root=resolve(import.meta.dirname,'..');
const catalogPath=resolve(root,'assets/official-storms.json');
const outputPath=resolve(root,'assets/official-name-translations.json');

const catalog=JSON.parse(await readFile(catalogPath,'utf8'));
const targets=new Set(catalog.storms.map(storm=>storm.name.toUpperCase()));
const translations=new Map();

const addTranslation=(en,zh)=>{
  const key=String(en).toUpperCase();
  if(!targets.has(key)||typeof zh!=='string'||!/[㐀-鿿]/.test(zh))return;
  if(!translations.has(key))translations.set(key,zh);
};

const opencc=await fetch('https://raw.githubusercontent.com/BYVoid/OpenCC/master/data/dictionary/TSCharacters.txt');
if(!opencc.ok)throw new Error(`OpenCC dictionary request failed: ${opencc.status}`);
const simplifyMap=new Map();
for(const line of (await opencc.text()).split('\n')){
  const [traditional,simplified]=line.trim().split('\t');
  if(traditional&&simplified)simplifyMap.set(traditional,simplified.split(' ')[0]);
}
const toSimplified=text=>[...text].map(char=>simplifyMap.get(char)||char).join('');

for(const [en,zh] of Object.entries(CHINESE_NAMES))addTranslation(en,toSimplified(zh));

const hkww=await fetch('https://www.hkww.org/weather/tcname.php');
if(!hkww.ok)throw new Error(`HKWW request failed: ${hkww.status}`);
const hkHtml=new TextDecoder('big5').decode(await hkww.arrayBuffer());
for(const match of hkHtml.matchAll(/<b[^>]*>([A-Za-z][A-Za-z'\- ]*[A-Za-z])\s+([㐀-鿿][㐀-鿿·]{1,9})\s*<\/b>/g)){
  addTranslation(match[1],toSimplified(match[2]));
}

const years=Array.from({length:82},(_,index)=>1945+index);
const candidates=new Map();
for(let batch=0;batch<2;batch++){
  const titles=years.slice(batch*41,(batch+1)*41).map(year=>year+'年太平洋颱風季');
  const query=new URLSearchParams({
    action:'query',format:'json',redirects:'1',prop:'revisions',
    rvprop:'content',rvslots:'main',titles:titles.join('|')
  });
  const response=await fetch('https://zh.wikipedia.org/w/api.php?'+query.toString(),{
    headers:{'User-Agent':'typhoon-lab-research/1.0'}
  });
  if(!response.ok)throw new Error(`Wikipedia request failed: ${response.status}`);
  const data=await response.json();
  for(const page of Object.values(data.query.pages)){
    if(!page.revisions)continue;
    const text=page.revisions[0].slots.main['*'];
    for(const line of text.split('\n')){
      const trimmed=line.trim();
      if(!trimmed.startsWith('===')||!trimmed.endsWith('===')||!trimmed.includes('('))continue;
      const content=trimmed.replace(/^=+\s*/,'').replace(/\s*=+$/,'');
      const open=content.lastIndexOf('('),close=content.lastIndexOf(')');
      if(open<0||close<=open)continue;
      const en=content.slice(open+1,close).trim().toUpperCase();
      let zh=content.slice(0,open).trim();
      for(const prefix of ['超強颱風','強烈颱風','強烈熱帶風暴','熱帶風暴','熱帶低氣壓','颱風']){
        if(zh.startsWith(prefix)){zh=zh.slice(prefix.length).trim();break;}
      }
      if(!targets.has(en)||!/[㐀-鿿]/.test(zh))continue;
      if(!candidates.has(en))candidates.set(en,new Map());
      candidates.get(en).set(zh,(candidates.get(en).get(zh)||0)+1);
    }
  }
}
for(const [en,variants] of candidates){
  if(!translations.has(en)){
    const best=[...variants].sort((a,b)=>b[1]-a[1])[0][0];
    addTranslation(en,toSimplified(best));
  }
}

const manual={
  CHARLOTT:'夏洛特',BEATRICE:'碧翠丝',BERNIDA:'贝妮达',DONNA:'唐娜',EILEEN:'艾琳',ELNORA:'艾诺拉',
  FLORA:'芙罗拉',GWEN:'格温',HANNAH:'汉娜',HELENA:'海伦娜',IRENE:'艾琳',JOYCE:'乔伊斯',KATHLEEN:'凯瑟琳',
  LAURA:'劳拉',NANETTE:'纳内特',ROSALIND:'罗莎琳德',DOLORES:'多洛蕾丝',HAZEL:'海泽尔','LUCRETIA:NANCY':'卢克丽霞／南茜',
  'JEANNE:JEANNIE':'珍妮',WILMA:'威尔玛',LUCILLE:'露西尔',OMAR:'奥马尔',OSCAR:'奥斯卡','ABEL:BETH':'亚伯／贝丝',
  BETH:'贝丝',CARLO:'卡洛',DALE:'戴尔',ERNIE:'厄尼',FERN:'弗恩',GREG:'格雷格',HERB:'赫伯',JOY:'乔伊',KIRK:'柯克',
  LISA:'丽莎',MARTY:'马蒂',NIKI:'妮基',PIPER:'派珀',TOM:'汤姆',WILLIE:'威利',ZANE:'赞恩',AMBER:'琥珀',
  CASS:'卡斯',FRITZ:'弗里茨',HANK:'汉克',ISA:'伊萨',IVAN:'伊凡',JIMMY:'吉米',KEITH:'基思',MORT:'莫特',
  NESTOR:'内斯托',ROSIE:'罗茜',SCOTT:'斯科特',TINA:'蒂娜',VICTOR:'维克托',YULE:'尤尔',ZITA:'琪塔',MEGI:'鲇鱼',SANBA:'三巴'
};
for(const [en,zh] of Object.entries(manual))addTranslation(en,zh);

for(const en of targets){
  if(!translations.has(en)){
    const primary=en.split(':')[0];
    if(translations.has(primary))translations.set(en,translations.get(primary));
  }
}

const missing=[...targets].filter(en=>!translations.has(en));
if(missing.length)throw new Error('Missing official Chinese names: '+missing.join(', '));

const output={
  version:1,
  count:translations.size,
  source:[
    {name:'JMA Northwest Pacific tropical cyclone naming list',url:'https://www.jma.go.jp/jma/jma-eng/jma-center/rsmc-hp-pub-eg/tyname.html'},
    {name:'HKWW TC Names (NW Pacific)',url:'https://www.hkww.org/weather/tcname.php'},
    {name:'Chinese Wikipedia Pacific typhoon season pages',url:'https://zh.wikipedia.org/wiki/1945年太平洋颱風季'},
    {name:'OpenCC TSCharacters dictionary (Apache-2.0)',url:'https://github.com/BYVoid/OpenCC'}
  ],
  names:Object.fromEntries([...translations].sort((a,b)=>a[0].localeCompare(b[0])))
};

await writeFile(outputPath,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({output:outputPath,names:translations.size,storms:catalog.storms.length},null,2));
