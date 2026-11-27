import {fileURLToPath as __f2p} from 'node:url';const __ROOT=process.env.SITE||__f2p(new URL('../',import.meta.url));const __OUT=process.env.RV_OUT||__f2p(new URL('out/',import.meta.url));
// XSS checks for the review-fix fields (vessel_status overlay, track index, platform aliases, display names, institutions index).
import fs from 'node:fs';
import { start, sleep, AUDIT } from './lib.mjs';
const BASE=process.env.BASE||'http://127.0.0.1:8853/';
const t=await start({port:9483,base:BASE,shots:process.env.SHOTS||__OUT+'shots/'});
const {ev,nav,ok,T,shot,viewport}=t;
await viewport(1280,900,false);
const pages=['vessel.html?id=MV-0112','vessel.html?id=MV-0423','vessel.html?id=MV-EVIL','vessel.html?id=MV-0001','vessel.html?id=MV-0002','vessel.html?id=MV-0003',
 'vessel.html?id=MV-0005','vessel.html?id=MV-0006','vessel.html?id=MV-0007','vessels.html','vessels.html?status=%3Cimg%20src=x%20onerror=window.__pwn=40%3E',
 'platforms.html','platforms.html?sort=status','platforms.html?sort=%3Cimg%20src=x%20onerror=window.__pwn=41%3E','platform.html?id=evil-plat','platform.html?id=ud_999','platform.html?id=EVIL-PLAT',
 'platform.html?id=whoi-alvin&from=%3Cimg%20src=x%20onerror=window.__pwn=42%3E','institutions.html','institutions.html?q=%3Cimg%20src=x%20onerror=window.__pwn=43%3E&sort=%22%3E&country=%3Cb%3E',
 'institution.html?id=EVIL-INST','index.html','map.html?layer=tracks','about.html#governance'];
const CHK=`({pwn:window.__pwn||null,href:location.href,inj:document.querySelectorAll('main img[src="x"], main iframe, main script, main [onerror], main [onload]').length,
 bad:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>/^\\s*(javascript|data|vbscript):/i.test(h||'')||/^\\s*\\/\\//.test(h||'')),
 scripts:[...document.querySelectorAll('script[src]')].map(s=>s.getAttribute('src')).filter(s=>!/^(assets|data)\\/[A-Za-z0-9_.\\/-]+\\.js(\\?[^"<>]*)?$|^https:\\/\\/(cdn\\.jsdelivr\\.net|unpkg\\.com)\\//.test(s)||/\\.\\./.test(s)),
 res:performance.getEntriesByType('resource').map(r=>r.name).filter(n=>/evil/.test(n)),
 h1:document.querySelector('h1')?.textContent?.slice(0,80)})`;
for(const pg of pages){
 await nav(pg,pg.startsWith('map')?6500:3500);const r=await ev(CHK);const a=await ev(AUDIT);
 const uncaught=T.errors.filter(e=>!/Failed to load resource|net::|ERR_|Failed to fetch[\s\S]*maplibre-gl/.test(e));
 const onSite=(r.href||'').startsWith(BASE);
 ok('REVIEW-XSS '+pg,!r.pwn&&r.inj===0&&r.bad.length===0&&r.scripts.length===0&&r.res.length===0&&a.bad.length===0&&uncaught.length===0&&T.dialogs.length===0&&onSite,{r,a:a.bad.slice(0,3),e:uncaught.slice(0,3),d:T.dialogs});
}
await nav('vessel.html?id=MV-0112',4000);
let s=await ev(`({x:document.querySelector('main').innerText,sch:[...document.querySelectorAll('a[data-schedule]')].length,badge:document.querySelector('[data-status]')?.getAttribute('data-status')})`);
ok('hostile status basis/source shown as literal text; javascript: schedule link dropped',s.x.includes('<img src=x')&&s.sch===0,{sch:s.sch,snip:s.x.slice(s.x.indexOf('Basis'),s.x.indexOf('Basis')+120)});
await nav('vessel.html?id=MV-0423',4000);
s=await ev(`({badge:[...document.querySelectorAll('[data-status]')].map(b=>b.getAttribute('data-status')),sch:[...document.querySelectorAll('a[data-schedule]')].map(a=>a.getAttribute('href'))})`);
ok('unknown status value falls back to Unconfirmed; https schedule URL kept but inert',s.badge.every(b=>['Active','Listed','Probable','Dormant','Unconfirmed','Retired'].includes(b))&&s.sch.every(h=>/^https:\/\/evil\.example\//.test(h)),s);
for(const id of ['MV-0005','MV-0006','MV-0007']){await nav('vessel.html?id='+id,3000);
 const u=await ev('location.pathname+location.search');
 ok('hostile platform alias '+id+' does not navigate off-site or to an invalid ID',/^\/(vessel\.html\?id=MV-000[567]|platform\.html\?id=[A-Za-z0-9_.-]*(&from=MV-000[567])?)$/.test(u),u);}
await nav('platforms.html',3000);
s=await ev(`(()=>{const r=[...document.querySelectorAll('#rows tr')].find(r=>/ud_999/.test(r.innerText));return r?{name:r.querySelector('td a')?.textContent,raw:r.querySelector('.rv-raw-id')?.textContent}:null})()`);
ok('display name built from hostile model/serial/owner is plain text',s&&/<img src=x/.test(s.name)&&/ud_999/.test(s.raw)&&!(await ev('window.__pwn')),s);
await nav('institutions.html',3000);
ok('institutions index shows hostile institution name as text',await ev(`(()=>{const r=document.querySelector('#irows tr[data-inst="evil-inst"]');return !!r&&r.innerText.includes('<img src=x')&&!r.querySelector('img')})()`));
const code=t.done('REVIEW-XSS');
fs.writeFileSync(process.env.OUT||__OUT+'review_xss_out.json',JSON.stringify(t.R,null,1));
t.close();process.exit(code?1:0);
