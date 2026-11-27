import {fileURLToPath as __f2p} from 'node:url';const __ROOT=process.env.SITE||__f2p(new URL('../',import.meta.url));const __OUT=process.env.RV_OUT||__f2p(new URL('out/',import.meta.url));
import fs from 'node:fs';
import { start, sleep, AUDIT } from './lib.mjs';
const BASE=process.env.BASE||'http://127.0.0.1:8823/';
const SHOTS=process.env.SHOTS||__OUT+'shots/';
const t=await start({port:9441,base:BASE,shots:SHOTS});
const {ev,nav,shot,ok,T,send}=t;
const pages=[
 'platform.html?id=evil-plat','platform.html?id=whoi-alvin','vessel.html?id=MV-EVIL','vessel.html?id=MV-0112','uncrewed.html','uncrewed.html?x=%3Cimg%20src=x%20onerror=window.__pwn=5%3E',
 'resources.html','resources.html#grp-uncrewed-ocean-mapping','resources.html#%3Cimg%20src=x%20onerror=window.__pwn=6%3E','vehicle_condition_form.html?platform=evil-plat',
 'vehicle_condition_form.html?platform=whoi-alvin','platforms.html?autonomy=uncrewed','platforms.html','vessels.html?autonomy=uncrewed','institution.html?id=evil-inst','operators.html'];
const CHK=`({pwn:window.__pwn||null,inj:document.querySelectorAll('main img[src="x"], main iframe, main script, main [onerror], main [onload]').length,
 bad:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>/^\\s*(javascript|data|vbscript):/i.test(h||'')),
 literal:document.querySelector('main').innerText.includes('<img src=x'),h1:document.querySelector('h1')?.textContent?.slice(0,60)})`;
for(const pg of pages){
 await nav(pg,2800);const r=await ev(CHK);const a=await ev(AUDIT);
 const uncaught=T.errors.filter(e=>!/Failed to load resource/.test(e));
 ok('XSS '+pg,!r.pwn&&r.inj===0&&r.bad.length===0&&a.bad.length===0&&uncaught.length===0&&T.dialogs.length===0,{r,a:a.bad.slice(0,3),e:uncaught.slice(0,3),d:T.dialogs});
}
// evidence the hostile text is actually displayed (as text) on the pages that should show it
await nav('platform.html?id=evil-plat',2500);
ok('evil-plat page shows the hostile support/access text literally',await ev(`(()=>{const x=document.querySelector('main').innerText;return x.includes('<img src=x')&&/Access/.test(x)&&/Support vessels/.test(x)})()`));
await nav('vessel.html?id=MV-EVIL',3000);
ok('MV-EVIL vessel page shows Launch and recovery and Vehicles supported with hostile text as text',await ev(`(()=>{const x=document.querySelector('main').innerText;return !!document.querySelector('[data-section="launch-recovery"]')&&!!document.querySelector('[data-section="vehicles-supported"]')&&x.includes('<img src=x')})()`));
await nav('vehicle_condition_form.html?platform=evil-plat',2500);
const v=await ev(`({name:document.getElementById('f-vname').value,sens:[...document.querySelectorAll('#vcf-sensors input[data-k=kind]')].map(i=>i.value),prev:document.getElementById('vcf-preview').innerText})`);
ok('VCF prefilled from hostile platform keeps the markup as plain values',/<img src=x/.test(v.name)&&v.sens.length>0&&!T.dialogs.length&&!(await ev('window.__pwn')),v);
await ev(`document.getElementById('vcf-json').click()`);
// hostile map snapshot (feed blocked) and hostile live feed
const WORLD='&bbox=-180,-90,180,90';
const hook=async(mode)=>{await send('Fetch.disable');await send('Fetch.enable',{patterns:[{urlPattern:'https://gliders.ioos.us/*'}]});t.T.handlers.length=0;
 t.T.handlers.push(async m=>{if(m.method!=='Fetch.requestPaused')return;const {requestId,request}=m.params,u=request.url;
  const hdr=[{name:'Access-Control-Allow-Origin',value:'*'},{name:'Content-Type',value:'application/json'}];
  const full=(b)=>send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:hdr,body:Buffer.from(b).toString('base64')});
  if(mode==='block')return send('Fetch.failRequest',{requestId,errorReason:'ConnectionRefused'});
  const E='<img src=x onerror="window.__pwn=9">';
  if(/allDatasets/.test(u))return full(JSON.stringify({table:{rows:[['ok-1',E,E,E,E],['x/../y','a','b','','']]}}));
  return full(JSON.stringify({table:{rows:[[E,15,25]]}}));});};
for(const mode of ['block','live']){
 await hook(mode);await t.viewport(1280,900,false);await nav('map.html?layer=uncrewed'+WORLD,7000);
 const m=await ev(`({st:document.getElementById('dep-status').innerText,g:document.getElementById('dep-panel').dataset.gliders,a:document.getElementById('dep-panel').dataset.argo,pwn:window.__pwn||null,inj:document.querySelectorAll('#dep-panel img,#dep-panel script,#results img,#results script').length,res:document.getElementById('dep-results')?.innerText||''})`);
 ok('hostile '+mode+' map data: only valid positions drawn, no markup executed ('+m.g+' gliders, '+m.a+' Argo)',!m.pwn&&m.inj===0&&+m.g>=1&&+m.a>=1,m);
 // click a grid of points over the map to open a popup on a hostile feature
 let popup=null;
 await ev(`document.getElementById('map').scrollIntoView({block:'start'})`);await sleep(500);
 const rc=await ev(`(()=>{const r=document.getElementById('map').getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height}})()`);
 for(let y=Math.round(rc.y)+10;y<rc.y+rc.h-10&&!popup;y+=9){for(let x=Math.round(rc.x)+10;x<rc.x+rc.w-10;x+=9){await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});
  const p=await ev(`(()=>{const e=document.querySelector('.maplibregl-popup-content');if(!e)return null;const t=e.innerText;if(/^(Glider|Argo float) /.test(t))return t;document.querySelector('.maplibregl-popup-close-button')?.click();return null})()`);if(p){popup=p;break}}}
 const pe=await ev(`({img:document.querySelectorAll('.maplibregl-popup img, .maplibregl-popup script, .maplibregl-popup [onerror]').length,pwn:window.__pwn||null,links:[...document.querySelectorAll('.maplibregl-popup a')].map(a=>a.getAttribute('href')+' '+a.target+' '+a.rel)})`);
 ok('hostile '+mode+' map popup (if a feature was hit) shows text only',!pe.pwn&&pe.img===0&&T.dialogs.length===0&&pe.links.every(l=>/^https:\/\/(gliders\.ioos\.us|fleetmonitoring\.euro-argo\.eu)\/[^ ]* _blank noopener$/.test(l)),{popup:popup&&popup.slice(0,200),pe});
 ok('popup was reached by the click grid ('+mode+')',!!popup,popup);
 await shot('xss_map_'+mode+'.png',false);
 const uncaught=T.errors.filter(e=>!/Failed to load resource|net::|ERR_/.test(e));
 ok('hostile '+mode+' map: no uncaught errors',uncaught.length===0,uncaught.slice(0,3));
}
await send('Fetch.disable');
const code=t.done('PHASE2-XSS');
fs.writeFileSync(process.env.OUT||__OUT+'phase2_xss_out.json',JSON.stringify(t.R,null,1));
t.close();process.exit(code?1:0);
