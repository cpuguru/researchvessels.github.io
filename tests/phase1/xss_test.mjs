import {fileURLToPath as __f2p} from 'node:url';const __ROOT=process.env.SITE||__f2p(new URL('../../',import.meta.url));const __OUT=process.env.RV_OUT||__f2p(new URL('../out/',import.meta.url));
import { spawn } from 'node:child_process';
const BASE=process.env.BASE||'http://127.0.0.1:8806/';
const port=9383;const chrome=spawn('google-chrome',['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port='+port,'--user-data-dir=/tmp/cdp-phase1xss-'+Date.now(),'about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(let i=0;i<50;i++){try{await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();break}catch{await sleep(200)}}
const page=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t=>t.type==='page');
const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let id=0;const pend=new Map();let errors=[];
ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);return}
 if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description?.split('\n')[0]||m.params.exceptionDetails.text);
 if(m.method==='Page.javascriptDialogOpening'){errors.push('DIALOG '+m.params.message);send('Page.handleJavaScriptDialog',{accept:true})}};
const send=(method,params={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params}))});
const ev=async e=>(await send('Runtime.evaluate',{expression:e,returnByValue:true})).result.result.value;
await send('Page.enable');await send('Runtime.enable');
const out={};let pass=true;
const pages=[
 'platform.html?id=evil-plat',
 'platform.html?id=whoi-alvin',
 'platforms.html',
 'platforms.html?q=Evil',
 'platforms.html?inst=evil-inst&group=1',
 'platforms.html?autonomy=%3Cscript%3Ealert(1)%3C/script%3E&class=%3Cimg%20src=x%20onerror=alert(1)%3E',
 'institution.html?id=evil-inst',
 'institution.html?id=__proto__',
 'vessels.html?q=Evil',
 'vessels.html?autonomy=%3Cscript%3E&class=%3Cimg%20src=x%20onerror=alert(1)%3E',
 'vessel.html?id=MV-EVIL',
 'resources.html'
];
for(const pg of pages){
 errors=[];await send('Page.navigate',{url:BASE+pg});await sleep(2500);
 const r=await ev(`({pwn:window.__pwn||null,injected:document.querySelectorAll('main img, main svg, main iframe, main script, main [onerror], main [onload]').length,
  h1:document.querySelector('h1')?.textContent?.slice(0,120),
  textHasMarkup:document.querySelector('main')?.innerText.includes('<img src=x'),
  badLinks:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>/^\\s*(javascript|data|vbscript):/i.test(h)),
  ror:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>/javascript/i.test(h||'')),
  extBad:[...document.querySelectorAll('main a[href^="http"]')].filter(a=>{try{const u=new URL(a.href);return !/(researchvessels|oceandata|macrofirm|oceanbytes)\\.org|127\\.0\\.0\\.1/.test(u.hostname)&&!(a.target==='_blank'&&/noopener/.test(a.rel)&&!/noreferrer/.test(a.rel))}catch{return false}}).length})`);
 out[pg]={...r,errors};
 const ok=!r.pwn&&r.injected===0&&r.badLinks.length===0&&r.extBad===0&&errors.length===0&&!r.ror.some(x=>/javascript/.test(x));
 if(!ok)pass=false;
}
console.log(JSON.stringify(out,null,1));console.log('XSS SUMMARY: '+(pass?'PASS':'FAIL'));
ws.close();chrome.kill();process.exit(pass?0:1);
