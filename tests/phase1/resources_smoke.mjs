import {fileURLToPath as __f2p} from 'node:url';const __ROOT=process.env.SITE||__f2p(new URL('../../',import.meta.url));const __OUT=process.env.RV_OUT||__f2p(new URL('../out/',import.meta.url));
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const BASE=process.env.BASE||'http://127.0.0.1:8805/';
const SHOTS=process.env.SHOTS||__OUT+'shots/phase1/';
const port=9382;const chrome=spawn('google-chrome',['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port='+port,'--user-data-dir=/tmp/cdp-phase1res-'+Date.now(),'about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(let i=0;i<50;i++){try{await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();break}catch{await sleep(200)}}
const page=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t=>t.type==='page');
const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let id=0;const pend=new Map();let errors=[],net=[];
ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);return}
 if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description?.split('\n')[0]||m.params.exceptionDetails.text);
 else if(m.method==='Runtime.consoleAPICalled'&&(m.params.type==='error'||m.params.type==='warning'))errors.push('console.'+m.params.type+': '+m.params.args.map(a=>a.value??a.description).join(' '));
 else if(m.method==='Network.responseReceived'){const r=m.params.response;if(r.status>=400)net.push(r.status+' '+r.url)}};
const send=(method,params={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params}))});
const ev=async e=>{const r=(await send('Runtime.evaluate',{expression:e,returnByValue:true})).result;if(r.exceptionDetails)return {__err:r.exceptionDetails.exception?.description};return r.result.value};
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
const checks=[];const ok=(n,p,info)=>checks.push({name:n,pass:!!p,info:info??null});
errors=[];net=[];
await send('Page.navigate',{url:BASE+'resources.html'});await sleep(3000);
const r=await ev(`({h1:document.querySelector('h1')?.textContent,groups:[...document.querySelectorAll('h2,h3,.res-group,section h2')].map(e=>e.textContent.trim()),
  ervo:[...document.querySelectorAll('a[href]')].filter(a=>(a.getAttribute('href')||'').includes('ervo-group')).map(a=>({href:a.getAttribute('href'),text:a.textContent.trim(),target:a.target,rel:a.rel})),
  uncrewed:[...document.querySelectorAll('h2,h3,legend,button,.accordion-button')].map(e=>e.textContent.trim()).filter(t=>/uncrewed/i.test(t)),
  bodyHas:['Uncrewed platforms: vehicle programmes and catalogs','Uncrewed platforms: gliders, data and community','Uncrewed platforms: ROVs, imagery, open-source tools and sensor data','Uncrewed platforms: operations, permissions and rules'].map(s=>document.body.innerText.includes(s)),
  checked:document.getElementById('res-checked')?.textContent,draft:document.body.innerText})`);
ok('resources.html loads, no console/network errors',errors.length===0&&net.length===0,{errors,net});
ok('four uncrewed groups are shown',r.bodyHas&&r.bodyHas.every(Boolean),{uncrewed:r.uncrewed,bodyHas:r.bodyHas,groups:r.groups});
ok('ERVO link is https://www.ervo-group.eu/np4/home',r.ervo.some(a=>a.href==='https://www.ervo-group.eu/np4/home'&&a.target==='_blank'&&/noopener/.test(a.rel)&&!/noreferrer/.test(a.rel)),r.ervo);
const lr=await fetch(BASE+'data/link_retry.json');
const body=await lr.json();ok('data/link_retry.json is reachable (200 JSON)',lr.ok&&(lr.headers.get('content-type')||'').includes('json')&&(body.links||body.entries),{status:lr.status,keys:Object.keys(body)});
const shot=async(name)=>{const s=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(SHOTS+name,Buffer.from(s.result.data,'base64'))};
await shot('merged_resources_desktop.png');
console.log(JSON.stringify({checks},null,1));
const fails=checks.filter(c=>!c.pass);
console.log('RESOURCES SMOKE: '+(checks.length-fails.length)+'/'+checks.length+(fails.length?' FAILED: '+fails.map(f=>f.name).join(' | '):' passed'));
ws.close();chrome.kill();process.exit(fails.length?1:0);
