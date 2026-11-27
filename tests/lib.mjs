import { spawn } from 'node:child_process';
import fs from 'node:fs';
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function start({port,base,shots,ud}){
 const chrome=spawn('google-chrome',['--headless=new','--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl','--remote-debugging-port='+port,'--user-data-dir=/tmp/cdp-p2-'+port+'-'+Date.now(),'about:blank'],{stdio:'ignore'});
 for(let i=0;i<50;i++){try{await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();break}catch{await sleep(200)}}
 const page=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t=>t.type==='page');
 const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
 let id=0;const pend=new Map();const T={errors:[],net:[],dialogs:[],handlers:[]};
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);return}
  for(const h of T.handlers)h(m);
  if(m.method==='Runtime.exceptionThrown')T.errors.push(m.params.exceptionDetails.exception?.description?.split('\n')[0]||m.params.exceptionDetails.text);
  else if(m.method==='Runtime.consoleAPICalled'&&(m.params.type==='error'||m.params.type==='warning'))T.errors.push('console.'+m.params.type+': '+m.params.args.map(a=>a.value??a.description).join(' '));
  else if(m.method==='Log.entryAdded'&&m.params.entry.level==='error'&&!/frame-ancestors/.test(m.params.entry.text))T.errors.push('log: '+m.params.entry.text+' '+(m.params.entry.url||''));
  else if(m.method==='Network.responseReceived'){const r=m.params.response;if(r.status>=400)T.net.push(r.status+' '+r.url)}
  else if(m.method==='Network.loadingFailed'&&!m.params.canceled)T.net.push('FAILED '+m.params.errorText+' '+(m.params.type||''));
  else if(m.method==='Page.javascriptDialogOpening'){T.dialogs.push(m.params.message);send('Page.handleJavaScriptDialog',{accept:true})}};
 const send=(method,params={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params}))});
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Log.enable');
 const ev=async e=>{const r=(await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true})).result;if(r.exceptionDetails)return {__err:r.exceptionDetails.exception?.description||r.exceptionDetails.text};return r.result.value};
 const nav=async(p,wait=1500)=>{T.errors=[];T.net=[];T.dialogs=[];await send('Page.navigate',{url:base+p});await sleep(wait)};
 const shot=async(name,full=true)=>{if(!shots)return;fs.mkdirSync(shots,{recursive:true});const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:full});fs.writeFileSync(shots+name,Buffer.from(r.result.data,'base64'))};
 const viewport=async(w,h,mobile)=>send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:!!mobile});
 const R={checks:[]};const ok=(name,pass,info)=>{R.checks.push({name,pass:!!pass,info:info??null})};
 const done=(label)=>{const fails=R.checks.filter(c=>!c.pass);console.log(JSON.stringify(R.checks.filter(c=>!c.pass),null,1));console.log(label+' SUMMARY: '+(R.checks.length-fails.length)+'/'+R.checks.length+' passed'+(fails.length?'; FAILED: '+fails.map(f=>f.name).join(' | '):''));return fails.length};
 const close=()=>{try{ws.close()}catch{}chrome.kill()};
 return {send,ev,nav,shot,viewport,ok,R,T,done,close,sleep};
}
export const AUDIT=`(()=>{const DOM=['researchvessels.org','oceandata.org','macrofirm.org','oceanbytes.org'];const isInt=h=>h===location.hostname||DOM.some(d=>h===d||h.endsWith('.'+d));const o={ext:0,extOk:0,int:0,intBad:0,bad:[]};
for(const a of document.querySelectorAll('a[href]')){let u;try{u=new URL(a.getAttribute('href'),location.href)}catch{continue}if(u.protocol!=='http:'&&u.protocol!=='https:')continue;const rel=(a.getAttribute('rel')||'').split(/\\s+/);
 if(!isInt(u.hostname)){o.ext++;if(a.target==='_blank'&&rel.includes('noopener')&&!rel.includes('noreferrer'))o.extOk++;else o.bad.push('EXT '+a.href)}
 else{o.int++;if(a.target){o.intBad++;o.bad.push('INT '+a.href)}}}
return o})()`;
