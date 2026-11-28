import {fileURLToPath as __f2p} from 'node:url';const __ROOT=process.env.SITE||__f2p(new URL('../../',import.meta.url));const __OUT=process.env.RV_OUT||__f2p(new URL('../out/',import.meta.url));
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const BASE=process.env.BASE||'http://127.0.0.1:8805/';
const SHOTS=process.env.SHOTS||__OUT+'shots/phase1/';
const data=JSON.parse(fs.readFileSync(process.env.DATA||__ROOT+'data/platforms.json','utf8'));
const IDS=data.platforms.map(p=>p.platform_id);
const IDATA=JSON.parse(fs.readFileSync(__ROOT+'data/institutions.json','utf8'));const INST=IDATA.institutions;
const port=9381;
const chrome=spawn('google-chrome',['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port='+port,'--user-data-dir=/tmp/cdp-phase1-'+Date.now(),'about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(let i=0;i<50;i++){try{await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();break}catch{await sleep(200)}}
const page=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t=>t.type==='page');
const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let id=0;const pend=new Map();let errors=[],net=[];
ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);return}
 if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description?.split('\n')[0]||m.params.exceptionDetails.text);
 else if(m.method==='Runtime.consoleAPICalled'&&(m.params.type==='error'||m.params.type==='warning'))errors.push('console.'+m.params.type+': '+m.params.args.map(a=>a.value??a.description).join(' '));
 else if(m.method==='Log.entryAdded'&&m.params.entry.level==='error'&&!/frame-ancestors/.test(m.params.entry.text))errors.push('log: '+m.params.entry.text+' '+(m.params.entry.url||''));
 else if(m.method==='Network.responseReceived'){const r=m.params.response;if(r.status>=400)net.push(r.status+' '+r.url)}
 else if(m.method==='Network.loadingFailed'&&!m.params.canceled)net.push('FAILED '+m.params.errorText+' '+(m.params.type||''));};
const send=(method,params={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params}))});
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Log.enable');
const ev=async e=>{const r=(await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true})).result;if(r.exceptionDetails)return {__err:r.exceptionDetails.exception?.description||r.exceptionDetails.text};return r.result.value};
const nav=async(p,wait=1500)=>{errors=[];net=[];await send('Page.navigate',{url:BASE+p});await sleep(wait)};
const shot=async(name,full=true)=>{const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:full});fs.writeFileSync(SHOTS+name,Buffer.from(r.result.data,'base64'))};
const AUDIT=`(()=>{const DOM=['researchvessels.org','oceandata.org','macrofirm.org','oceanbytes.org'];const isInt=h=>h===location.hostname||DOM.some(d=>h===d||h.endsWith('.'+d));const o={ext:0,extOk:0,int:0,intBad:0,bad:[]};
for(const a of document.querySelectorAll('a[href]')){let u;try{u=new URL(a.getAttribute('href'),location.href)}catch{continue}if(u.protocol!=='http:'&&u.protocol!=='https:')continue;const rel=(a.getAttribute('rel')||'').split(/\\s+/);
 if(!isInt(u.hostname)){o.ext++;if(a.target==='_blank'&&rel.includes('noopener')&&!rel.includes('noreferrer'))o.extOk++;else o.bad.push('EXT '+a.href)}
 else{o.int++;if(a.target){o.intBad++;o.bad.push('INT '+a.href)}}}
return o})()`;
const R={checks:[],pages:{}};
const ok=(name,pass,info)=>{R.checks.push({name,pass:!!pass,info:info??null});};
const LEVELS=['crewed','minimally crewed','remotely operated','supervised autonomous','fully autonomous','unknown'];
const KINDS=new Set((data.sensor_kinds)||[]);
const missingA=data.platforms.filter(p=>!LEVELS.includes(p.autonomy)||!p.autonomy_basis);
ok('every platform has an allowlisted autonomy and a basis',missingA.length===0,{n:missingA.length,sample:missingA.slice(0,3).map(p=>p.platform_id)});
const badKind=data.platforms.flatMap(p=>(p.sensors||[]).filter(s=>s.kind&&KINDS.size&&!KINDS.has(s.kind)).map(s=>p.platform_id+':'+s.kind+':'+s.name));
ok('every sensor kind is in the fixed vocabulary',badKind.length===0,badKind.slice(0,8));
const VESSELS=JSON.parse(fs.readFileSync(__ROOT+'data/vessels.json','utf8').replace(/\bNaN\b/g,'null'));
const missingV=VESSELS.filter(v=>!LEVELS.includes(v.autonomy)||!v.autonomy_basis);
ok('every vessel has an allowlisted autonomy and a basis',missingV.length===0,{n:missingV.length,sample:missingV.slice(0,3)});
ok('schema_version is 0.5-draft (registry field updates 2026-11-27)',data.schema_version==='0.5-draft',data.schema_version);

await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});

// ---- list page ----
await nav('platforms.html',3500);
let L=await ev(`({h1:document.querySelector('h1')?.textContent,count:document.getElementById('count')?.textContent,rows:document.querySelectorAll('#rows tr').length,nav:[...document.querySelectorAll('#mainNav .nav-link')].map(a=>a.textContent+'|'+a.getAttribute('href')+'|'+(a.classList.contains('active')?'A':'')),draft:document.body.innerText.includes('Draft \\u2013 unverified; corrections welcome at ships@oceandata.org'),title:document.title})`);
ok('platforms.html loads, no console/network errors',errors.length===0&&net.length===0,{errors,net});
ok('list shows all '+IDS.length+' records',L.rows===IDS.length&&L.count===`${IDS.length} of ${IDS.length} platforms`,L);
ok('nav has Platforms (active on list)',L.nav.some(x=>x.startsWith('Platforms|platforms.html|A')),L.nav);
ok('draft notice present',L.draft);
R.pages['platforms.html']={audit:await ev(AUDIT)};
ok('list external-link audit clean',R.pages['platforms.html'].audit.bad.length===0,R.pages['platforms.html'].audit);
await shot('platforms_desktop.png');
// filters
const setf=async(q,c,s)=>{await ev(`(()=>{const f=(id,v)=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))};f('q',${JSON.stringify(q)});f('cls',${JSON.stringify(c)});f('status',${JSON.stringify(s)})})()`);await sleep(150);return ev(`({count:document.getElementById('count').textContent,names:[...document.querySelectorAll('#rows tr td:first-child a')].map(a=>new URL(a.href).searchParams.get('id')),empty:!document.getElementById('empty').hidden,url:location.search})`)};
const exp=(f)=>data.platforms.filter(f).map(p=>p.platform_id).sort();
for(const c of [...new Set(data.platforms.map(p=>p.platform_class))]){const r=await setf('',c,'');const e=exp(p=>p.platform_class===c);ok('filter class='+c,JSON.stringify(r.names.slice().sort())===JSON.stringify(e)&&e.length>0,{got:r.names.length,exp:e.length,url:r.url})}
for(const s of [...new Set(data.platforms.map(p=>p.status))]){const r=await setf('','',s);const e=exp(p=>p.status===s);ok('filter status='+s,JSON.stringify(r.names.slice().sort())===JSON.stringify(e)&&e.length>0,{got:r.names.length,exp:e.length})}
let r=await setf('','glider','Active');ok('combined glider+Active',JSON.stringify(r.names.slice().sort())===JSON.stringify(exp(p=>p.platform_class==='glider'&&p.status==='Active')),r.names);
r=await setf('blue hen','','');ok('search alias "blue hen" -> ud_134',r.names.length===1&&r.names[0]==='ud_134',r.names);
r=await setf('otis','','');ok('search "otis" -> glider + ROV',JSON.stringify(r.names.sort())===JSON.stringify(['ud-otis-rov','ud_275']),r.names);
r=await setf('4801927','','');ok('search WMO 4801927 -> ud_476',r.names.length===1&&r.names[0]==='ud_476',r.names);
r=await setf('zzzz-none','','');ok('no-match shows empty message',r.names.length===0&&r.empty,r);
r=await setf('<img src=x onerror=alert(1)>','','');ok('script-ish search is inert',r.names.length===0&&(await ev(`document.querySelectorAll('img[src="x"]').length`))===0);
await ev(`document.getElementById('reset').click()`);await sleep(150);
ok('reset restores all',(await ev(`document.querySelectorAll('#rows tr').length`))===IDS.length);
// URL-param prefilter + hostile params
await nav('platforms.html?class=glider&status=Active',2500);
ok('URL prefilter class/status',(await ev(`document.querySelectorAll('#rows tr').length`))===exp(p=>p.platform_class==='glider'&&p.status==='Active').length);
await nav('platforms.html?class=%3Cscript%3E&status=x&q=%3Cb%3Ex',2500);
ok('hostile URL params ignored/inert',errors.length===0&&(await ev(`document.querySelectorAll('#rows b, #rows script').length`))===0&&(await ev(`document.getElementById('cls').value`))==='');

// ---- detail pages ----
for(const pid of IDS){
  await nav('platform.html?id='+pid,1800);
  const d=await ev(`({dn:(()=>{const q=RV_PLATFORMS.platforms.find(x=>x.platform_id===${JSON.stringify(pid)});return q?RVP.displayName(q):null})(),h1:document.querySelector('h1')?.textContent,title:document.title,draft:document.body.innerText.includes('Draft \\u2013 unverified; corrections welcome at ships@oceandata.org'),secs:[...document.querySelectorAll('main h2')].map(h=>h.textContent),nav:[...document.querySelectorAll('nav .nav-link.active')].map(a=>a.textContent),src:document.querySelectorAll('#src-h ~ ol li, section[aria-labelledby=src-h] li').length,imgs:document.querySelectorAll('main img').length,scripts:document.querySelectorAll('main script').length,instLinks:document.querySelectorAll('main a[href^="institution.html?id="]').length})`);
  const a=await ev(AUDIT);
  const p=data.platforms.find(x=>x.platform_id===pid);
  const pass=errors.length===0&&net.length===0&&d.draft&&(d.h1===(p.display_name||p.name)||d.h1===d.dn)&&d.secs.includes('Specifications')&&d.secs.includes('Sources')&&d.secs.includes('Provenance')&&d.src>0&&a.bad.length===0&&d.imgs===0&&d.scripts===0&&d.nav[0]==='Platforms'&&d.secs.includes('Identity')&&(p.affiliations||[]).length>0&&d.instLinks>0;
  ok('detail '+pid,pass,{errors,net,h1:d.h1,secs:d.secs.length,src:d.src,bad:a.bad,ext:a.ext});
  if(['ud_134','whoi-alvin','rutgers-ru29','navy-orca-xluuv','marum-quest5000','argo-array'].includes(pid)){await shot('platform_'+pid+'_desktop.png');}
}
// per-detail: spec basis labels and deployment counts
await nav('platform.html?id=ud_134',1800);
let u=await ev(`({deps:document.querySelectorAll('section[aria-labelledby=dp-h] tbody tr').length,text:document.body.innerText,alias:[...document.querySelectorAll('.badge')].map(b=>b.textContent)})`);
ok('ud_134 shows Blue Hen alias, class badge, deployments table',u.alias.includes('Blue Hen')&&u.deps===data.platforms.find(p=>p.platform_id==='ud_134').deployments.length&&u.text.includes('Unit metadata (data service)')&&u.text.includes('Not the same vehicle as'),{deps:u.deps});
await nav('platform.html?id=ud_476',1800);
u=await ev(`({text:document.body.innerText})`);
ok('ud_476 shows basis labels incl. class-level + serials',u.text.includes('Operator-published, class-level (not this unit)')&&u.text.includes('9537')&&u.text.includes('R/V Joanne Daiber'));
await nav('platform.html?id=ud-remus-600',1800);
u=await ev(`({text:document.body.innerText})`);
ok('REMUS 600: length left blank with the conflict explained (6.096 m only appears in that explanation)',/Left blank on purpose/.test(u.text)&&(await ev(`(()=>{const r=[...document.querySelectorAll('section[aria-labelledby=sp-h] tbody tr')].find(t=>t.cells[0].textContent==='Length');return !!r&&r.cells[1].textContent==='not published'})()`)));
// bad ids
const bad=['nope','','%3Cscript%3Ealert(1)%3C%2Fscript%3E','..%2F..%2Fx','__proto__','constructor','toString','ud_134%00','a'.repeat(200),'ud_134%22%3E%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E','%E2%98%83'];
for(const b of bad){
  await nav('platform.html?id='+b,1500);
  const d=await ev(`({h1:document.querySelector('h1')?.textContent,hasBack:!!document.querySelector('main a[href="platforms.html"]'),inj:document.querySelectorAll('main img, main script, main [onerror]').length,body:document.querySelector('main').innerText.slice(0,200)})`);
  ok('bad id graceful: '+(b.slice(0,30)||'(empty)'),errors.length===0&&d.hasBack&&d.inj===0&&/not found|not a valid|No platform selected/i.test(d.h1),{h1:d.h1,errors});
}
await nav('platform.html',1500);
let d0=await ev(`document.querySelector('h1')?.textContent`);ok('no id param graceful',/No platform selected/.test(d0)&&errors.length===0,d0);
// vessel link path: inject a fake vessel_id into the in-page data to prove the link resolves
await nav('platform.html?id=ud_476',1800);
await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__t=1`});
const linkTest=await ev(`(()=>{const p=RV_PLATFORMS.platforms.find(x=>x.platform_id==='ud_476');p.deployments[1].launch_vessel.vessel_id='MV-0423';return 1})()`);
// launch-vessel links to the new directory records
await nav('platform.html?id=ud_476',2000);
let lv=await ev(`([...document.querySelectorAll('main a[href^="vessel.html"]')].map(a=>({href:a.getAttribute('href'),text:a.textContent,target:a.target||''})))`);
ok('ud_476 deployment links to R/V Joanne Daiber (MV-1177)',lv.some(a=>a.href==='vessel.html?id=MV-1177'&&/Joanne Daiber/.test(a.text)&&!a.target),lv);
await nav('platform.html?id=ud_orris',2000);
lv=await ev(`([...document.querySelectorAll('main a[href^="vessel.html"]')].map(a=>({href:a.getAttribute('href'),text:a.textContent,target:a.target||''})))`);
ok('ud_orris deployment links to Tips Up (MV-1178)',lv.some(a=>a.href==='vessel.html?id=MV-1178'&&/Tips Up/.test(a.text)&&!a.target),lv);
await nav('platform.html?id=ud_275',1800);
ok('ud_275 status is Dormant, basis cites 2013-09-30',await ev(`({st:[...document.querySelectorAll('.badge')].map(b=>b.textContent),t:document.body.innerText})`).then(d=>d.st.includes('Dormant')&&/2013-09-30/.test(d.t)));
await nav('platforms.html?status=Dormant',2000);
ok('Dormant filter lists ud_134 and ud_275',(await ev(`[...document.querySelectorAll('#rows tr[data-id]')].map(t=>t.dataset.id).sort()`)).join()==='ud_134,ud_275');

// new vessel directory records
for(const [vid,name,draftRe] of [
  ['MV-1177','Joanne Daiber',/Draft record, compiled from public sources only/],
  ['MV-1178','Tips Up',/Draft record, compiled from public sources only/],
  ['MV-1179','Dogfish',/Draft record, compiled from public sources only/]]){
  await nav('vessel.html?id='+vid,5000);
  const d=await ev(`({h1:document.querySelector('h1')?.textContent,t:document.body.innerText,errOk:true})`);
  ok('vessel page '+vid+' is '+name+' with draft notice',d.h1===name&&draftRe.test(d.t)&&errors.length===0,{h1:d.h1,errors:errors.slice(0,2)});
}
await nav('vessel.html?id=MV-0423',7000);
ok('existing Hugh R. Sharp record unchanged',(await ev(`document.querySelector('h1')?.textContent`))==='Hugh R. Sharp'&&errors.length===0);

// home page Browse platforms button; sitemap lists platforms
await nav('index.html',6000);
const home=await ev(`({btns:[...document.querySelectorAll('a[href="platforms.html"]')].map(a=>a.textContent.trim()),draft:document.body.innerText.includes('Prototype')})`);
ok('home page has a Browse platforms button',home.btns.includes('Browse platforms'),home);
const sm=await (await fetch(BASE+'sitemap.xml')).text();
ok('sitemap includes platforms.html, every platform id, institution.html and every institution id, plus the three UD vessels',
  sm.includes('/platforms.html')&&IDS.every(id=>sm.includes('platform.html?id='+id+'<'))&&sm.includes('/institutions.html<')&&INST.every(i=>sm.includes('institution.html?id='+i.institution_id+'<'))&&['MV-1177','MV-1178','MV-1179'].every(id=>sm.includes('vessel.html?id='+id)));

// ---- nav on other pages ----
for(const pg of ['index.html','vessels.html','about.html','map.html','fleet.html','operators.html','resources.html','equipment-search.html','vessel.html?id=MV-0423']){
  await nav(pg,pg.startsWith('index')||pg.startsWith('map')||pg.startsWith('vessel.html')?6000:2500);
  const n=await ev(`[...document.querySelectorAll('#mainNav .nav-link')].map(a=>a.textContent+'|'+a.getAttribute('href'))`);
  ok('nav on '+pg,n.includes('Platforms|platforms.html')&&n.includes('Uncrewed|uncrewed.html')&&n.includes('Institutions|institutions.html')&&n.length===11,{n:n.length,errors:errors.slice(0,2)});
}
// click through nav
await nav('about.html',2500);
await ev(`[...document.querySelectorAll('#mainNav .nav-link')].find(a=>a.textContent==='Platforms').click()`);await sleep(2500);
ok('nav click goes to platforms.html',(await ev('location.pathname')).endsWith('/platforms.html')&&(await ev(`document.querySelectorAll('#rows tr').length`))===IDS.length);
// list -> detail click
await ev(`document.querySelector('#rows a').click()`);await sleep(1800);
ok('list row click opens a detail page',(await ev('location.pathname')).endsWith('/platform.html')&&/id=/.test(await ev('location.search')));

// ---- navbar widths ----
for(const w of [992,1024,1200,1400]){
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:800,deviceScaleFactor:1,mobile:false});
  await nav('platforms.html',2000);
  const m=await ev(`(()=>{const ul=document.querySelector('#mainNav .navbar-nav');const wide=[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,3).map(e=>e.tagName+'.'+String(e.className).slice(0,30));const items=[...ul.children];const tops=new Set(items.map(li=>Math.round(li.getBoundingClientRect().top)));return {wide,sw:document.documentElement.scrollWidth,rows:tops.size,overflowX:document.documentElement.scrollWidth>innerWidth,navH:document.querySelector('nav.navbar').getBoundingClientRect().height}})()`);
  ok('desktop navbar at '+w+'px: one-line bar, no h-scroll',m.rows===1&&!m.overflowX&&m.navH<=80,m);
}
// ---- mobile ----
await send('Emulation.setDeviceMetricsOverride',{width:375,height:800,deviceScaleFactor:2,mobile:true});
for(const pg of ['platforms.html','platform.html?id=ud_134','platform.html?id=ud-gavia','platform.html?id=ud_476']){
  await nav(pg,2200);
  const m=await ev(`({sw:document.documentElement.scrollWidth,iw:innerWidth,toggler:!!document.querySelector('.navbar-toggler')&&getComputedStyle(document.querySelector('.navbar-toggler')).display!=='none',bodyOverflow:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1&&!e.closest('.table-responsive')&&!e.closest('.rv-scroll')}).slice(0,5).map(e=>e.tagName+'.'+e.className)})`);
  ok('mobile 375px '+pg+': no page-level horizontal overflow',m.sw<=m.iw&&m.toggler&&m.bodyOverflow.length===0,m);
  if(pg==='platforms.html')await shot('platforms_mobile.png');
  if(pg==='platform.html?id=ud_134')await shot('platform_ud_134_mobile.png');
}
await nav('platforms.html',2000);
await ev(`document.querySelector('.navbar-toggler').click()`);await sleep(700);
ok('mobile nav toggler opens menu with Platforms link visible',await ev(`(()=>{const a=[...document.querySelectorAll('#mainNav .nav-link')].find(a=>a.textContent==='Platforms');const r=a.getBoundingClientRect();return r.height>0&&r.width>0})()`));
await shot('platforms_mobile_menu_open.png',false);
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
await nav('index.html',5000); await shot('index_browse_platforms.png',false);
await nav('platform.html?id=ud_476',2000); await shot('platform_ud_476_daiber_link.png');
await nav('platform.html?id=ud_275',1800); await shot('platform_ud_275_dormant.png');

// ================= institutions =================
const byI=Object.fromEntries(INST.map(i=>[i.institution_id,i]));
const desc=id=>{const o=new Set([id]);let ch=true;while(ch){ch=false;for(const i of INST)if(i.parent_id&&o.has(i.parent_id)&&!o.has(i.institution_id)){o.add(i.institution_id);ch=true}}return o};
const chainIds=id=>{const c=[];let i=byI[id];while(i){c.push(i.institution_id);i=i.parent_id?byI[i.parent_id]:null}return c};
const pInsts=p=>new Set((p.affiliations||[]).flatMap(a=>chainIds(a.institution_id)));
const expInst=id=>data.platforms.filter(p=>pInsts(p).has(id)).map(p=>p.platform_id).sort();
const root=id=>{const c=chainIds(id);return c[c.length-1]};
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
await nav('platforms.html',3000);
const opts=await ev(`[...document.getElementById('inst').options].map(o=>o.value).filter(Boolean)`);
ok('institution dropdown lists every institution that has platforms (incl. nested groups)',JSON.stringify(opts.slice().sort())===JSON.stringify(INST.filter(i=>expInst(i.institution_id).length).map(i=>i.institution_id).sort()),{n:opts.length});
const setsel=async(id,v)=>{await ev(`(()=>{const e=document.getElementById(${JSON.stringify(id)});e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('input',{bubbles:true}))})()`);await sleep(150)};
const cur=()=>ev(`({ids:[...document.querySelectorAll('#rows tr[data-id]')].map(t=>t.dataset.id),groups:[...document.querySelectorAll('#rows tr.inst-group')].map(t=>t.dataset.inst),count:document.getElementById('count').textContent,url:location.search})`);
let badI=[];for(const o of opts){await setsel('inst',o);const c=await cur();const e=expInst(o);if(JSON.stringify(c.ids.slice().sort())!==JSON.stringify(e)||c.url!=='?inst='+o)badI.push(o+': got '+c.ids.length+' exp '+e.length)}
ok('inst filter matches expected set for all '+opts.length+' institutions, and writes ?inst= to the URL',badI.length===0,badI);
await setsel('inst','ud');let c1=await cur();ok('UD (top level) includes RDL and lab platforms = 21',c1.ids.length===21,c1.count);
await setsel('inst','whoi-ndsf');c1=await cur();ok('WHOI NDSF group shows Alvin, Jason, Sentry',['whoi-alvin','whoi-jason','whoi-sentry'].every(x=>c1.ids.includes(x)),c1.ids);
await setsel('inst','usn');c1=await cur();ok('U.S. Navy shows Navy-owned Alvin (no duplicate) + Navy entries',c1.ids.includes('whoi-alvin')&&c1.ids.filter(x=>x==='whoi-alvin').length===1&&c1.ids.includes('navy-orca-xluuv')&&!IDS.some(x=>/alvin/.test(x)&&x!=='whoi-alvin'),c1.ids);
await setsel('inst','');
// country filter
const countries=await ev(`[...document.getElementById('country').options].map(o=>o.value).filter(Boolean)`);
let badC=[];for(const co of countries){await setsel('country',co);const c=await cur();const e=data.platforms.filter(p=>(p.countries||[]).includes(co)).map(p=>p.platform_id).sort();if(JSON.stringify(c.ids.slice().sort())!==JSON.stringify(e))badC.push(co)}
ok('country filter correct for '+countries.join(','),badC.length===0&&countries.length>=7,badC);
await setsel('country','GB');await setsel('cls','glider');c1=await cur();
ok('combined country=GB + class=glider',JSON.stringify(c1.ids.slice().sort())===JSON.stringify(data.platforms.filter(p=>(p.countries||[]).includes('GB')&&p.platform_class==='glider').map(p=>p.platform_id).sort())&&/country=GB/.test(c1.url)&&/class=glider/.test(c1.url),c1);
await ev(`document.getElementById('reset').click()`);await sleep(150);
// grouping
await ev(`(()=>{const g=document.getElementById('group');g.checked=true;g.dispatchEvent(new Event('change',{bubbles:true}))})()`);await sleep(200);
c1=await cur();
const expRoots=new Set(data.platforms.flatMap(p=>(p.affiliations||[]).map(a=>root(a.institution_id))));
const expRows=data.platforms.reduce((n,p)=>n+new Set((p.affiliations||[]).map(a=>root(a.institution_id))).size,0);
ok('group toggle: one header per top-level institution, platforms listed under each root they belong to',JSON.stringify(c1.groups.slice().sort())===JSON.stringify([...expRoots].sort())&&c1.ids.length===expRows&&/group=1/.test(c1.url),{groups:c1.groups.length,rows:c1.ids.length,expRows});
const alvinUnder=await ev(`(()=>{let g=null,o=[];for(const t of document.querySelectorAll('#rows tr')){if(t.classList.contains('inst-group'))g=t.dataset.inst;else if(t.dataset.id==='whoi-alvin')o.push(g)}return o})()`);
ok('Alvin appears under both WHOI and U.S. Navy groups',alvinUnder.sort().join()==='usn,whoi',alvinUnder);
await shot('platforms_grouped_desktop.png');
await setsel('inst','rucool');c1=await cur();ok('grouped + inst=rucool keeps one Rutgers group',c1.groups.join()==='rutgers'&&c1.ids.length===8,c1);
await shot('platforms_grouped_rucool.png');
// URL params
await nav('platforms.html?inst=whoi&group=1',2500);c1=await cur();
ok('URL ?inst=whoi&group=1 prefilters and groups',c1.ids.length>=expInst('whoi').length&&c1.groups.includes('whoi')&&errors.length===0,c1);
await shot('platforms_inst_whoi_grouped.png');
await nav('platforms.html?inst=ud-rdl',2500);c1=await cur();ok('URL ?inst=ud-rdl -> 21 UD RDL records',c1.ids.length===21);
await shot('platforms_inst_ud_rdl.png');
await nav('platforms.html?country=JP',2500);c1=await cur();ok('URL ?country=JP -> JAMSTEC records',c1.ids.length===5&&c1.ids.every(x=>x.startsWith('jamstec')),c1.ids);
for(const hv of ['%3Cscript%3Ealert(1)%3C/script%3E','__proto__','constructor','whoi%22%3E%3Cimg%20src=x%20onerror=alert(1)%3E','WHOI','../x','toString','nope']){
  await nav('platforms.html?inst='+hv+'&country='+hv+'&group=%3Cb%3E',2200);
  const r=await ev(`({inst:document.getElementById('inst').value,co:document.getElementById('country').value,g:document.getElementById('group').checked,rows:document.querySelectorAll('#rows tr[data-id]').length,inj:document.querySelectorAll('main img, main script:not(:last-child), main [onerror]').length})`);
  ok('hostile ?inst/?country ignored: '+decodeURIComponent(hv).slice(0,30),r.inst===''&&r.co===''&&!r.g&&r.rows===IDS.length&&r.inj===0&&errors.length===0,{r,errors});
}
// search on institution names
await nav('platforms.html',2500);
r=await setf('robotic discovery','','');ok('search "robotic discovery" finds the 21 RDL records',r.names.length===21,r.names.length);
r=await setf('NDSF','','');ok('search "NDSF" finds NDSF vehicles',r.names.includes('whoi-alvin'),r.names);
await ev(`document.getElementById('reset').click()`);await sleep(150);
// institution pages
await nav('institution.html',2500);/* 2026-11-27 review fixes: */
let ix=await ev(`({path:location.pathname,h1:document.querySelector('h1')?.textContent,li:[...document.querySelectorAll('tr[data-inst]')].map(l=>l.dataset.inst),nav:[...document.querySelectorAll('nav .nav-link.active')].map(a=>a.textContent),draft:document.body.innerText.includes('Draft \\u2013 unverified')})`);
ok('institution.html without an ID goes to the institutions index, which lists every institution, nav active on Institutions',ix.path==='/institutions.html'&&ix.li.length===INST.length&&ix.nav[0]==='Institutions'&&ix.draft&&errors.length===0&&net.length===0,{n:ix.li.length,path:ix.path,nav:ix.nav,errors,net});
ok('institution index link audit clean',(await ev(AUDIT)).bad.length===0);
await shot('institution_index.png');
for(const i of INST){
  await nav('institution.html?id='+i.institution_id,1500);
  const d=await ev(`({h1:document.querySelector('h1')?.textContent,rows:[...document.querySelectorAll('#itable tbody tr')].map(t=>t.dataset.id),vs:document.querySelectorAll('section[aria-labelledby=vs-h] li a').length,draft:document.body.innerText.includes('Draft \\u2013 unverified'),ror:[...document.querySelectorAll('main a[href^="https://ror.org/"]')].map(a=>a.getAttribute('href')),imgs:document.querySelectorAll('main img').length})`);
  const a=await ev(AUDIT);const e=data.platforms.filter(p=>(p.affiliations||[]).some(x=>desc(i.institution_id).has(x.institution_id))).map(p=>p.platform_id).sort();
  const ev2=[...new Set([...desc(i.institution_id)].flatMap(x=>byI[x].vessel_ids||[]))].length;
  ok('institution page '+i.institution_id,errors.length===0&&net.length===0&&d.h1===i.name&&d.draft&&JSON.stringify(d.rows.slice().sort())===JSON.stringify(e)&&d.vs===ev2&&a.bad.length===0&&d.imgs===0&&(i.ror_id?d.ror[0]===i.ror_id:d.ror.length===0),{errors,net,h1:d.h1,rows:d.rows.length,exp:e.length,vs:d.vs,ev2,bad:a.bad});
  if(['ud-rdl','whoi','rucool','noaa','usn','ifremer','jamstec','argo-ast','euro-argo','oceanops','scripps'].includes(i.institution_id))await shot('institution_'+i.institution_id+'.png');
}
for(const b of ['nope','%3Cscript%3Ealert(1)%3C%2Fscript%3E','__proto__','constructor','hasOwnProperty','a'.repeat(100),'whoi%22%3E%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E']){
  await nav('institution.html?id='+b,1300);
  const d=await ev(`({h1:document.querySelector('h1')?.textContent,inj:document.querySelectorAll('main img, main [onerror]').length,back:!!document.querySelector('main a[href="institutions.html"]')})`);
  ok('bad institution id graceful: '+decodeURIComponent(b).slice(0,30),errors.length===0&&d.inj===0&&d.back&&/not found|not a valid/i.test(d.h1),d);
}
// platform page institution links and new sections
await nav('platform.html?id=whoi-alvin',2000);
let al=await ev(`({inst:[...document.querySelectorAll('main a[href^="institution.html?id="]')].map(a=>a.getAttribute('href')+'|'+(a.target||'')),vessel:[...document.querySelectorAll('main a[href^="vessel.html?id="]')].map(a=>a.getAttribute('href')),secs:[...document.querySelectorAll('main h2')].map(h=>h.textContent),t:document.body.innerText})`);
ok('Alvin page: owner U.S. Navy + operator WHOI/NDSF linked, merged vessel entry MV-0054 noted, Access section, photo credit, draft names both',al.inst.includes('institution.html?id=usn|')&&al.inst.includes('institution.html?id=whoi|')&&al.inst.includes('institution.html?id=whoi-ndsf|')&&/Merged vessel entry[\s\S]*MV-0054/.test(al.t)&&al.secs.includes('Access')&&/Credit: Luis Lamar/.test(al.t)&&/checked by Woods Hole Oceanographic Institution/.test(al.t),al.inst);
await nav('platform.html?id=navy-orca-xluuv',1800);
ok('Orca XLUUV shows limited-information flag',/Limited public information/.test(await ev('document.body.innerText')));
await nav('platform.html?id=marum-quest5000',1800);
ok('QUEST 5000 shows lineage section',(await ev(`[...document.querySelectorAll('main h2')].map(h=>h.textContent)`)).includes('Lineage'));
await nav('platform.html?id=ud_134',1800);
ok('UD draft notice now says University of Delaware via affiliation',/checked by University of Delaware/.test(await ev('document.body.innerText')));
// mobile institution pages
await send('Emulation.setDeviceMetricsOverride',{width:375,height:800,deviceScaleFactor:2,mobile:true});
for(const pg of ['platforms.html?group=1','institution.html','institution.html?id=whoi','platform.html?id=whoi-alvin']){
  await nav(pg,2200);
  const m=await ev(`({sw:document.documentElement.scrollWidth,iw:innerWidth,bodyOverflow:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1&&!e.closest('.table-responsive')}).slice(0,5).map(e=>e.tagName+'.'+e.className)})`);
  ok('mobile 375px '+pg+': no horizontal overflow',m.sw<=m.iw&&m.bodyOverflow.length===0,m);
  await shot('mobile_'+pg.replace(/[^a-z0-9]+/gi,'_')+'.png');
}
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});


// ---- Argo additions ----
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
await nav('platforms.html?class='+encodeURIComponent('profiling float'),2500);
let ag=await ev(`({count:document.getElementById('count')?.textContent,ids:[...document.querySelectorAll('#rows tr[data-id]')].map(t=>t.dataset.id),opt:[...document.getElementById('cls').options].map(o=>o.value)})`);
ok('profiling float class is in the filter and lists argo-array only',ag.ids.join()==='argo-array'&&ag.opt.includes('profiling float')&&ag.count.includes('1 of 92'),ag);
await nav('platforms.html?q=Argo',2500);
ag=await ev(`({ids:[...document.querySelectorAll('#rows tr[data-id]')].map(t=>t.dataset.id),count:document.getElementById('count')?.textContent})`);
ok('search "Argo" finds argo-array',ag.ids.includes('argo-array'),ag);
await nav('platform.html?id=argo-array',2500);
ag=await ev(`({h1:document.querySelector('h1')?.textContent,secs:[...document.querySelectorAll('main h2')].map(h=>h.textContent),t:document.body.innerText,inst:[...document.querySelectorAll('main a[href^="institution.html?id="]')].map(a=>a.getAttribute('href')),qty:[...document.querySelectorAll('dd')].map(d=>d.textContent).some(t=>t.includes('4454')),photo:[...document.querySelectorAll('section[aria-labelledby=ph-h] a')].map(a=>a.getAttribute('href')),extBad:[...document.querySelectorAll('main a[href^="http"]')].filter(a=>{try{const u=new URL(a.href);return !/(researchvessels|oceandata|macrofirm|oceanbytes)\\.org|127\\.0\\.0\\.1/.test(u.hostname)&&!(a.target==='_blank'&&/noopener/.test(a.rel)&&!/noreferrer/.test(a.rel))}catch{return false}}).length})`);
ok('Argo platform page: fleet size 4454, affiliations, photo link-only, external links safe',ag.h1==='Argo profiling float array (international)'&&ag.qty&&ag.inst.includes('institution.html?id=argo-ast')&&ag.inst.includes('institution.html?id=scripps')&&ag.inst.includes('institution.html?id=oceanops')&&ag.inst.includes('institution.html?id=ifremer')&&ag.inst.includes('institution.html?id=euro-argo')&&ag.inst.includes('institution.html?id=noaa-aoml')&&ag.secs.includes('Access')&&ag.photo.includes('https://argo.ucsd.edu/how-do-floats-work/float-types/')&&ag.extBad===0&&/4,454|4454/.test(ag.t)&&/Active/.test(ag.t),{h1:ag.h1,inst:ag.inst,photo:ag.photo,extBad:ag.extBad,secs:ag.secs});
await shot('platform_argo-array_desktop.png');
await nav('resources.html',3500);
ag=await ev(`({hasGroup:document.body.innerText.includes('Profiling floats: Argo'),
  official:[...document.querySelectorAll('a[href="https://argo.ucsd.edu/"]')].map(a=>({href:a.getAttribute('href'),t:a.target,rel:a.rel})),
  gdac:[...document.querySelectorAll('a[href="https://data-argo.ifremer.fr/"]')].map(a=>({href:a.getAttribute('href'),t:a.target,rel:a.rel})),
  third:[...document.querySelectorAll('a[href="https://argovis.colorado.edu/"]')].map(a=>({text:a.textContent,t:a.target,rel:a.rel})),
  argoNetNews:[...document.querySelectorAll('a[href]')].some(a=>/^https?:\\/\\/(www\\.)?argo\\.net\\/?$/.test(a.getAttribute('href')||''))})`);
ok('resources.html has Profiling floats: Argo group, official and GDAC links, Argovis labelled, argo.net news site not linked',ag.hasGroup&&ag.official.length&&ag.official.every(a=>a.t==='_blank'&&/noopener/.test(a.rel)&&!/noreferrer/.test(a.rel))&&ag.gdac.length&&ag.third.some(a=>/third-party/i.test(a.text))&&!ag.argoNetNews,ag);
await shot('resources_argo_group.png');
await send('Emulation.setDeviceMetricsOverride',{width:375,height:800,deviceScaleFactor:2,mobile:true});
for(const pg of ['platform.html?id=argo-array','institution.html?id=argo-ast','resources.html']){
  await nav(pg,2200);
  const m=await ev(`({sw:document.documentElement.scrollWidth,iw:innerWidth,bodyOverflow:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1&&!e.closest('.table-responsive')}).slice(0,5).map(e=>e.tagName+'.'+e.className)})`);
  ok('mobile 375px '+pg+': no horizontal overflow',m.sw<=m.iw&&m.bodyOverflow.length===0,m);
  await shot('mobile_'+pg.replace(/[^a-z0-9]+/gi,'_')+'.png');
}
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});



// ---- Phase 1: autonomy, combined search, sensors ----
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
const setToggle=async(v)=>{await ev(`(()=>{const e=document.getElementById('autonomy-'+${JSON.stringify(v)});e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}))})()`);await sleep(200)};
const setCls=async(sel,v)=>{await ev(`(()=>{const e=document.getElementById(${JSON.stringify(sel)});e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('input',{bubbles:true}))})()`);await sleep(200)};

await nav('platform.html?id=whoi-alvin',2000);
let ph1=await ev(`({t:document.body.innerText,secs:[...document.querySelectorAll('main h2')].map(h=>h.textContent),kinds:[...document.querySelectorAll('section[aria-labelledby=se-h] tbody td:first-child')].map(td=>td.textContent.trim())})`);
ok('Alvin detail shows crewed autonomy and basis',/crewed/i.test(ph1.t)&&/Human-occupied/.test(ph1.t), {secs:ph1.secs});
ok('Alvin detail has Key specifications',ph1.secs.includes('Key specifications'),ph1.secs);
ok('Alvin sensors table has a Kind column with vocab values',ph1.kinds.length>0&&ph1.kinds.every(k=>k&&k!=='undefined'),ph1.kinds);

await nav('platform.html?id=whoi-sentry',1800);
ok('Sentry detail shows supervised autonomous',/supervised autonomous/.test(await ev('document.body.innerText')));
await nav('platform.html?id=whoi-jason',1800);
ok('Jason detail shows remotely operated',/remotely operated/.test(await ev('document.body.innerText')));
await nav('platform.html?id=argo-array',1800);
ok('Argo detail shows fully autonomous',/fully autonomous/.test(await ev('document.body.innerText')));
await nav('vessel.html?id=MV-0054',2500);
ok('Alvin vessel page shows crewed autonomy, no console errors',errors.length===0&&net.length===0&&/crewed/.test(await ev('document.body.innerText')),{errors,net});
await shot('vessel_alvin_autonomy.png');
await nav('vessel.html?id=MV-1092',2000);
ok('Sentry vessel page shows supervised autonomous and AUV class',/supervised autonomous/.test(await ev('document.body.innerText'))&&/\bAUV\b/.test(await ev('document.body.innerText')));
await shot('vessel_sentry_autonomy.png');

await nav('vessels.html',3500);
let vd=await ev(`({h1:document.querySelector('h1')?.textContent,count:document.getElementById('count')?.textContent,rows:document.querySelectorAll('#rows tr[data-id]').length,tog:!!document.getElementById('autonomy-all'),vclass:[...document.getElementById('vclass').options].map(o=>o.value),plat:document.getElementById('plat-block')?.hidden})`);
ok('vessels.html loads, no console/network errors',errors.length===0&&net.length===0,{errors,net});
ok('vessels.html has Crewed/Uncrewed toggle and vehicle-class list',vd.tog&&vd.vclass.includes('AUV')&&vd.vclass.includes('ship')&&vd.vclass.includes('profiling float')&&vd.vclass.includes('HFR'),vd);
ok('vessels.html default hides the platforms block (no combined filter yet)',vd.plat===true,vd);
await shot('vessels_default_desktop.png');

await setToggle('uncrewed');
vd=await ev(`({count:document.getElementById('count')?.textContent,v:document.querySelectorAll('#rows tr[data-id]').length,p:document.querySelectorAll('#plat-rows tr[data-id]').length,url:location.search,aut:document.getElementById('autonomy-uncrewed')?.checked})`);
const expPU=data.platforms.filter(p=>['remotely operated','supervised autonomous','fully autonomous'].includes(p.autonomy)).length;
const ALIAS=JSON.parse(fs.readFileSync(__ROOT+'data/vessel_extra.json','utf8')).platform_aliases||{};/* 2026-11-27 review fixes: */
const expVU=VESSELS.filter(v=>!ALIAS[v.id]&&v.status!=='out of service'&&['remotely operated','supervised autonomous','fully autonomous'].includes(v.autonomy)).length;
ok('vessels.html Uncrewed lists uncrewed vessels and platforms, writes ?autonomy=uncrewed',vd.aut&&vd.v===expVU&&vd.p===expPU&&/autonomy=uncrewed/.test(vd.url),{vd,expVU,expPU});
await shot('vessels_uncrewed_desktop.png');

await setToggle('crewed');
vd=await ev(`({v:document.querySelectorAll('#rows tr[data-id]').length,p:document.querySelectorAll('#plat-rows tr[data-id]').length,url:location.search})`);
ok('vessels.html Crewed includes HOV platforms and excludes uncrewed platforms',vd.p===data.platforms.filter(p=>p.autonomy==='crewed'||p.autonomy==='minimally crewed').length&&vd.v>0&&/autonomy=crewed/.test(vd.url),vd);

await setToggle('all');
await setCls('vclass','AUV');
vd=await ev(`({v:[...document.querySelectorAll('#rows tr[data-id]')].map(t=>t.dataset.id),p:[...document.querySelectorAll('#plat-rows tr[data-id]')].map(t=>t.dataset.id),url:location.search})`);
ok('vessels.html class=AUV lists AUV platforms incl. Sentry and Urashima, whose old vessel entries are merged',vd.p.includes('whoi-sentry')&&vd.p.includes('jamstec-urashima8000')&&!vd.v.includes('MV-1092')&&!vd.v.includes('MV-1099')&&/class=AUV/.test(vd.url),vd);
await shot('vessels_class_AUV.png');

await setCls('vclass','profiling float');
vd=await ev(`({v:document.querySelectorAll('#rows tr[data-id]').length,p:[...document.querySelectorAll('#plat-rows tr[data-id]')].map(t=>t.dataset.id)})`);
ok('vessels.html class=profiling float lists argo-array and no vessels',vd.p.join()==='argo-array'&&vd.v===0,vd);

await nav('vessels.html?autonomy=uncrewed&class=AUV',2500);
vd=await ev(`({aut:document.getElementById('autonomy-uncrewed')?.checked,cls:document.getElementById('vclass').value,p:[...document.querySelectorAll('#plat-rows tr[data-id]')].map(t=>t.dataset.id),v:[...document.querySelectorAll('#rows tr[data-id]')].map(t=>t.dataset.id)})`);
ok('vessels.html URL prefilter autonomy=uncrewed&class=AUV',vd.aut&&vd.cls==='AUV'&&vd.p.includes('whoi-sentry')&&!vd.v.includes('MV-1092'),vd);

await nav('vessels.html?autonomy=%3Cscript%3Ealert(1)%3C/script%3E&class=%3Cimg%20src=x%20onerror=alert(1)%3E&q=%3Cb%3Ex',2500);
vd=await ev(`({aut:document.getElementById('autonomy-all')?.checked,cls:document.getElementById('vclass').value,inj:document.querySelectorAll('main img, main script:not([src]), main [onerror], main b').length,q:document.getElementById('q').value})`);
ok('vessels.html hostile autonomy/class URL params ignored',errors.length===0&&vd.aut&&vd.cls===''&&vd.inj===0,{vd,errors});

await nav('vessels.html?autonomy=nope&class=Destroyer&type=%3Cscript%3E',2200);
vd=await ev(`({aut:document.getElementById('autonomy-all')?.checked,cls:document.getElementById('vclass').value,type:document.getElementById('type').value,inj:document.querySelectorAll('main img, main [onerror]').length})`);
ok('vessels.html unknown autonomy/class/type values ignored',vd.aut&&vd.cls===''&&vd.type===''&&vd.inj===0&&errors.length===0,vd);

// platforms.html toggle + class=ship + hostile autonomy
await nav('platforms.html',2500);
await setToggle('crewed');
let pd=await ev(`({ids:[...document.querySelectorAll('#rows tr[data-id]')].map(t=>t.dataset.id),ves:[...document.querySelectorAll('#ves-rows tr[data-id]')].map(t=>t.dataset.id),url:location.search,aut:document.getElementById('autonomy-crewed')?.checked})`);
const expPC=data.platforms.filter(p=>p.autonomy==='crewed'||p.autonomy==='minimally crewed').map(p=>p.platform_id).sort();
ok('platforms.html Crewed lists only crewed platforms and matching vessels',JSON.stringify(pd.ids.slice().sort())===JSON.stringify(expPC)&&!pd.ves.includes('MV-0054')&&pd.ves.length>0&&/autonomy=crewed/.test(pd.url),pd);
await shot('platforms_crewed_desktop.png');

await setToggle('uncrewed');
pd=await ev(`({ids:[...document.querySelectorAll('#rows tr[data-id]')].map(t=>t.dataset.id),n:document.querySelectorAll('#rows tr[data-id]').length,url:location.search})`);
ok('platforms.html Uncrewed excludes HOVs and writes the URL param',!pd.ids.includes('whoi-alvin')&&pd.ids.includes('whoi-sentry')&&pd.ids.includes('argo-array')&&pd.n===expPU&&/autonomy=uncrewed/.test(pd.url),pd);
await ev(`document.getElementById('reset').click()`);await sleep(200);
pd=await ev(`({ids:document.querySelectorAll('#rows tr[data-id]').length,aut:document.getElementById('autonomy-all')?.checked,url:location.search,vesHidden:document.getElementById('ves-block')?.hidden})`);
ok('platforms.html reset restores all platforms and All toggle',pd.ids===IDS.length&&pd.aut&&!/autonomy=/.test(pd.url)&&pd.vesHidden,pd);

await nav('platforms.html?class=ship&autonomy=crewed',2500);
pd=await ev(`({cls:document.getElementById('cls').value,aut:document.getElementById('autonomy-crewed')?.checked,plat:document.querySelectorAll('#rows tr[data-id]').length,ves:document.querySelectorAll('#ves-rows tr[data-id]').length,empty:!document.getElementById('empty').hidden})`);
ok('platforms.html ?class=ship&autonomy=crewed shows vessels, no platforms',pd.cls==='ship'&&pd.aut&&pd.plat===0&&pd.ves>0&&pd.empty,pd);
await shot('platforms_class_ship.png');

await nav('platforms.html?autonomy=%3Cscript%3E&class=nope&q=%3Cimg%20src=x%20onerror=alert(1)%3E',2500);
pd=await ev(`({aut:document.getElementById('autonomy-all')?.checked,cls:document.getElementById('cls').value,inj:document.querySelectorAll('main img, main script:not([src]), main [onerror]').length,rows:document.querySelectorAll('#rows tr[data-id]').length})`);
ok('platforms.html hostile autonomy/class URL params ignored',errors.length===0&&pd.aut&&pd.cls===''&&pd.inj===0,{pd,errors});

// existing filters still work with the new toggle present
await nav('platforms.html?class=glider&status=Active',2500);
pd=await ev(`({n:document.querySelectorAll('#rows tr[data-id]').length,aut:document.getElementById('autonomy-all')?.checked})`);
ok('existing class=glider&status=Active still works with All selected',pd.n===data.platforms.filter(p=>p.platform_class==='glider'&&p.status==='Active').length&&pd.aut,pd);

// mobile 375px for new UI
await send('Emulation.setDeviceMetricsOverride',{width:375,height:800,deviceScaleFactor:2,mobile:true});
for(const pg of ['vessels.html','vessels.html?autonomy=uncrewed','platforms.html?autonomy=uncrewed','platform.html?id=whoi-alvin','vessel.html?id=MV-0054']){
  await nav(pg,2200);
  const m=await ev(`({sw:document.documentElement.scrollWidth,iw:innerWidth,bodyOverflow:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1&&!e.closest('.table-responsive')&&!e.closest('.rv-scroll')}).slice(0,5).map(e=>e.tagName+'.'+e.className)})`);
  ok('mobile 375px '+pg+': no horizontal overflow',m.sw<=m.iw&&m.bodyOverflow.length===0,m);
  await shot('mobile_phase1_'+pg.replace(/[^a-z0-9]+/gi,'_')+'.png');
}
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});

console.log(JSON.stringify(R,null,1));
const fails=R.checks.filter(c=>!c.pass);console.log('\nSUMMARY: '+(R.checks.length-fails.length)+'/'+R.checks.length+' passed'+(fails.length?'; FAILED: '+fails.map(f=>f.name).join(' | '):''));
ws.close();chrome.kill();process.exit(0);
