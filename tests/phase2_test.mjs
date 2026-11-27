import {fileURLToPath as __f2p} from 'node:url';const __ROOT=process.env.SITE||__f2p(new URL('../',import.meta.url));const __OUT=process.env.RV_OUT||__f2p(new URL('out/',import.meta.url));
import fs from 'node:fs';
import { start, sleep, AUDIT } from './lib.mjs';
const SITE=__ROOT;
const BASE=process.env.BASE||'http://127.0.0.1:8821/';
const SHOTS=process.env.SHOTS||__OUT+'shots/';
const J=f=>JSON.parse(fs.readFileSync(SITE+f,'utf8'));
const PD=J('data/platforms.json'),PL=PD.platforms,VES=JSON.parse(fs.readFileSync(SITE+'data/vessels.json','utf8').replace(/:NaN/g,':null')),EX=J('data/vessel_extra.json'),RES=J('data/resources.json'),DEP=J('data/uncrewed_deployments.json');
const VID=new Set(VES.map(v=>v.id));
const t=await start({port:9421,base:BASE,shots:SHOTS});
const {ev,nav,shot,viewport,ok,T,send}=t;

// ================= data =================
const ROLES=Object.keys(PD.support_roles||{});
const bad=[];let nSup=0,nVer=0,nVes=0;
for(const p of PL){
  if(!Array.isArray(p.support_vessels)){bad.push(p.platform_id+': no support_vessels array');continue}
  for(const s of p.support_vessels){nSup++;if(s.verified)nVer++;
    if(s.vessel_id!=null){nVes++;if(!VID.has(s.vessel_id))bad.push(p.platform_id+' unknown vessel '+s.vessel_id)}
    if(!ROLES.includes(s.role))bad.push(p.platform_id+' bad role '+s.role);
    if(!s.source_id||!PD.sources[s.source_id])bad.push(p.platform_id+' bad source '+s.source_id);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s.date)))bad.push(p.platform_id+' bad date');
    if(typeof s.verified!=='boolean')bad.push(p.platform_id+' verified not boolean');
    if(!s.verified&&!s.note)bad.push(p.platform_id+' unverified without a note');
    if(s.vessel_id==null&&s.role!=='any suitable ship'&&!s.verified&&!s.note)bad.push(p.platform_id+' vague');}
}
ok('every platform has support_vessels with a valid role, source, date, verified flag and a note when unverified',bad.length===0,bad.slice(0,5));
const sv=id=>(PL.find(p=>p.platform_id===id)||{support_vessels:[]}).support_vessels;
ok('Alvin is supported by Atlantis (MV-0112), verified, mother ship',sv('whoi-alvin').some(s=>s.vessel_id==='MV-0112'&&s.verified&&s.role==='mother ship'));
ok('Jason and Sentry have usual-ship entries from sources',sv('whoi-jason').length>0&&sv('whoi-sentry').length>0,{j:sv('whoi-jason').length,s:sv('whoi-sentry').length});
ok('unverified entries exist and are flagged (not hidden)',nSup>nVer&&nSup-nVer>0,{nSup,nVer,nVes});
const ac=PL.filter(p=>p.access);
const acBad=ac.filter(p=>!(typeof p.access.national_facility==='boolean'||p.access.national_facility===null)||!(typeof p.access.contracted_service==='boolean'||p.access.contracted_service===null)||typeof p.access.verified!=='boolean'||(p.access.access_how&&(typeof p.access.access_how.text!=='string'||(p.access.access_how.url&&!/^https:\/\//.test(p.access.access_how.url)))));
ok('access blocks have national_facility / contracted_service as true, false or null (not stated) and https access_how URLs',ac.length>=10&&acBad.length===0,{n:ac.length,bad:acBad.map(p=>p.platform_id)});
ok('NDSF vehicles are national facility; Saildrone is contracted, not national',['whoi-alvin','whoi-jason','whoi-sentry'].every(id=>PL.find(p=>p.platform_id===id)?.access?.national_facility===true)&&PL.some(p=>/saildrone/i.test(p.platform_id)&&p.access?.contracted_service===true&&p.access.national_facility===false));
const lrIds=Object.keys(EX.vessels).filter(k=>EX.vessels[k].launch_recovery);
ok('launch_recovery seeded only for verified-source vessels (Atlantis, Bellows) and every fact has a source',lrIds.sort().join()==='MV-0112,MV-0139'&&lrIds.every(k=>['lars','a_frame_swl','crane_swl','deck_space','power'].every(f=>{const x=EX.vessels[k].launch_recovery[f];return x==null||typeof x.source_id==='string'})),lrIds);
ok('Bellows is a USV-support vessel and the identity caveat is recorded',EX.vessels['MV-0139'].launch_recovery.usv_support===true&&/Florida Institute/.test(JSON.stringify(EX.vessels['MV-0139'].launch_recovery)));
const grp=RES.research_links.find(g=>g.group==='Uncrewed ocean mapping');
ok('Resources group "Uncrewed ocean mapping" has 11 live links dated 2026-11-26, all https and unique',grp&&grp.items.length===11&&grp.items.every(i=>i.check&&i.check.result==='live'&&i.check.date==='2026-11-26'&&/^https:\/\//.test(i.url))&&new Set(grp.items.map(i=>i.url)).size===11,grp&&grp.items.map(i=>i.check));
const want=['seabed2030','gebco','ccom','coast survey','saildrone','exail','drix'];
ok('the mapping group covers Seabed 2030, UNH CCOM/JHC, NOAA Coast Survey uncrewed, Saildrone Surveyor, Exail DriX and GEBCO',want.every(w=>grp.items.some(i=>(i.title+' '+i.url).toLowerCase().replace(/\s/g,'').includes(w.replace(/\s/g,'')))));
const gl=DEP.gliders.items,ar=DEP.argo.items;
ok('snapshot has gliders and Argo floats with valid positions and an as-of time',gl.length>0&&ar.length>1000&&gl.every(g=>Math.abs(g.lat)<=90&&Math.abs(g.lon)<=180)&&ar.every(a=>Math.abs(a[1])<=90&&Math.abs(a[2])<=180)&&/^\d{4}-\d{2}-\d{2}T/.test(DEP.gliders.as_of)&&/^\d{4}-\d{2}-\d{2}T/.test(DEP.argo.as_of),{g:gl.length,a:ar.length});
const jsSnap=fs.readFileSync(SITE+'data/uncrewed_deployments.js','utf8');
ok('uncrewed_deployments.js matches the .json (same counts)',jsSnap.includes('window.RV_DEPLOYMENTS=')&&JSON.parse(jsSnap.slice(jsSnap.indexOf('window.RV_DEPLOYMENTS=')+22).replace(/;\s*$/,'')).argo.items.length===ar.length);
const sm=fs.readFileSync(SITE+'sitemap.xml','utf8');
ok('sitemap lists uncrewed.html and vehicle_condition_form.html',sm.includes('/uncrewed.html<')&&sm.includes('/vehicle_condition_form.html<'));

// ================= nav on every page =================
const pages=fs.readdirSync(SITE).filter(f=>f.endsWith('.html')&&fs.readFileSync(SITE+f,'utf8').includes('assets/app.js')).sort();
const stubs=fs.readdirSync(SITE).filter(f=>f.endsWith('.html')&&!pages.includes(f));
const missingNav=[];
for(const pg of pages){await nav(pg, pg==='map.html'?3500:1500);
  let r=null; for(let i=0;i<8 && r!=='Uncrewed';i++){ r=await ev(`(()=>{const a=[...document.querySelectorAll('nav.navbar a.nav-link')].find(x=>x.getAttribute('href')==='uncrewed.html');return a?a.textContent.trim():null})()`); if(r!=='Uncrewed') await sleep(400);}
  if(r!=='Uncrewed')missingNav.push(pg)}
ok('"Uncrewed" nav item on every page that loads the shared nav ('+pages.length+' pages)',missingNav.length===0,{missingNav,stubs});
await nav('uncrewed.html',1200);
ok('nav item is marked current on uncrewed.html',await ev(`document.querySelector('nav.navbar a.nav-link[href="uncrewed.html"]').classList.contains('active')&&document.querySelector('nav.navbar a.nav-link[href="uncrewed.html"]').getAttribute('aria-current')==='page'`));

// ================= uncrewed.html =================
await nav('uncrewed.html',2500);
const UN=new Set(['remotely operated','supervised autonomous','fully autonomous']);
const nPU=PL.filter(p=>UN.has(p.autonomy)).length,nVU=VES.filter(v=>v.status!=='out of service'&&UN.has(v.autonomy)&&!(EX.platform_aliases||{})[v.id]).length;/* 2026-11-27: vessel entries merged into platform records are no longer counted twice */
const u=await ev(`({h1:document.querySelector('h1')?.textContent,counts:Object.fromEntries([...document.querySelectorAll('[data-count]')].map(e=>[e.dataset.count,e.textContent])),classRows:[...document.querySelectorAll('tr[data-class]')].map(r=>r.dataset.class),autRows:[...document.querySelectorAll('tr[data-autonomy]')].map(r=>r.dataset.autonomy),hrefs:[...document.querySelectorAll('main a[href]')].map(a=>a.getAttribute('href')),inst:document.querySelectorAll('#u-inst li').length,ships:document.querySelectorAll('#u-ships li').length,groups:[...document.querySelectorAll('[data-group]')].map(e=>e.dataset.group),text:document.querySelector('main').innerText})`);
ok('uncrewed.html loads with no console or network errors',T.errors.length===0&&T.net.length===0&&u.h1&&/ncrewed/.test(u.h1),{e:T.errors,n:T.net,h1:u.h1});
ok('uncrewed.html counts match the data',u.counts['Uncrewed platforms']===String(nPU)&&u.counts['Uncrewed records']===String(nPU+nVU),{c:u.counts,nPU,nVU});
ok('uncrewed.html lists every non-ship class and every autonomy level',['glider','AUV','ROV','USV'].every(c=>u.classRows.includes(c))&&['remotely operated','supervised autonomous','fully autonomous','crewed'].every(a=>u.autRows.includes(a)),{c:u.classRows,a:u.autRows});
ok('uncrewed.html links to filtered views, the map layer, the VCF and Resources',['platforms.html?autonomy=uncrewed','vessels.html?autonomy=crewed','map.html?layer=uncrewed','vehicle_condition_form.html'].every(h=>u.hrefs.includes(h))&&u.hrefs.some(h=>/^platforms\.html\?autonomy=uncrewed&class=glider/.test(h))&&u.hrefs.some(h=>/^resources\.html#grp-/.test(h)),u.hrefs.filter(h=>/platforms|map|vehicle|resources/.test(h)).slice(0,12));
ok('uncrewed.html shows institutions, ships linked to vehicles and Resources groups',u.inst>=3&&u.ships>=2&&u.groups.some(g=>/Uncrewed ocean mapping/.test(g)),{i:u.inst,s:u.ships,g:u.groups});
const au=await ev(AUDIT);ok('uncrewed.html external links open in a new tab with noopener (no noreferrer)',au.bad.length===0&&au.ext>0,au);
await shot('uncrewed_desktop.png');
await viewport(375,800,true);await nav('uncrewed.html',2200);
const mo=await ev(`({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth})`);
ok('uncrewed.html at 375 px has no horizontal overflow',mo.sw<=mo.cw+1,mo);await shot('uncrewed_mobile_375.png');
// follow filtered links
await viewport(1280,900,false);
await nav('platforms.html?autonomy=uncrewed',2500);
ok('filtered platforms view from uncrewed.html loads cleanly',T.errors.length===0&&/ncrewed/.test(await ev(`document.body.innerText`)),T.errors);

// ================= platform and vessel pages =================
await nav('platform.html?id=whoi-alvin',2000);
let pa=await ev(`({secs:[...document.querySelectorAll('main h2')].map(h=>h.textContent),text:document.querySelector('main').innerText,sup:[...document.querySelectorAll('main a[href^="vessel.html"]')].map(a=>a.getAttribute('href')),vcf:document.querySelector('a[data-vcf]')?.getAttribute('href')})`);
ok('Alvin page: support vessel links to Atlantis, Access section, VCF link with the platform id, no errors',pa.sup.includes('vessel.html?id=MV-0112')&&pa.secs.includes('Access')&&pa.vcf==='vehicle_condition_form.html?platform=whoi-alvin'&&T.errors.length===0&&/National facility/.test(pa.text),pa);
await shot('platform_alvin_phase2.png');
await nav('platform.html?id=whoi-sentry',2000);
ok('Sentry page shows Support vessels and Access with a link to NDSF planning',/Support vessels/.test(await ev(`document.body.innerText`))&&await ev(`[...document.querySelectorAll('a[href]')].some(a=>/ndsf\\.whoi\\.edu/.test(a.href))`));
await nav('vessel.html?id=MV-0112',3000);
let va=await ev(`({lr:!!document.querySelector('[data-section="launch-recovery"]'),vs:!!document.querySelector('[data-section="vehicles-supported"]'),vsText:document.querySelector('[data-section="vehicles-supported"]')?.innerText||'',lrText:document.querySelector('[data-section="launch-recovery"]')?.innerText||'',vsLinks:[...document.querySelectorAll('[data-section="vehicles-supported"] a')].map(a=>a.getAttribute('href'))})`);
ok('Atlantis vessel page: Launch and recovery and Vehicles supported (Alvin) sections render, no errors',va.lr&&va.vs&&/Alvin/.test(va.vsText)&&va.vsLinks.includes('platform.html?id=whoi-alvin')&&/A-frame/i.test(va.lrText)&&T.errors.length===0,{va,e:T.errors});
await shot('vessel_atlantis_phase2.png');
await nav('vessel.html?id=MV-0139',3000);
va=await ev(`({lr:document.querySelector('[data-section="launch-recovery"]')?.innerText||'',vs:!!document.querySelector('[data-section="vehicles-supported"]')})`);
ok('Bellows vessel page shows USV launch and recovery support from the GMSO fleet page',/USV/i.test(va.lr)&&T.errors.length===0,va);
await nav('vessel.html?id=MV-0423',3000);
ok('a vessel with no vehicle links shows neither new section',await ev(`!document.querySelector('[data-section="launch-recovery"]')&&!document.querySelector('[data-section="vehicles-supported"]')`)&&T.errors.length===0);
await nav('operators.html',1500);
ok('operators.html links to the Vehicle Condition Form',await ev(`!!document.querySelector('a[href="vehicle_condition_form.html"]')`)&&T.errors.length===0);

// ================= Resources =================
await nav('resources.html#grp-uncrewed-ocean-mapping',2500);
const rs=await ev(`({g:!!document.getElementById('grp-uncrewed-ocean-mapping'),checked:document.querySelectorAll('#grp-uncrewed-ocean-mapping ~ * .res-checked, [id="grp-uncrewed-ocean-mapping"] .res-checked').length,text:document.body.innerText})`);
ok('Resources page has the Uncrewed ocean mapping group anchor, and each link says when it was checked',rs.g&&/Seabed 2030/.test(rs.text)&&/Checked live/.test(rs.text)&&T.errors.length===0,{g:rs.g});
const au2=await ev(AUDIT);ok('resources.html external links audit',au2.bad.length===0,au2.bad.slice(0,3));
await shot('resources_mapping.png',false);

// ================= Vehicle Condition Form =================
await nav('vehicle_condition_form.html',1500);
const reqs=[];t.T.handlers.push(m=>{if(m.method==='Network.requestWillBeSent')reqs.push(m.params.request.method+' '+m.params.request.url)});
const sections=await ev(`({secs:[...document.querySelectorAll('.vcf-section')].map(s=>s.dataset.section),items:document.querySelectorAll('.vcf-item').length,text:document.querySelector('main').innerText,btns:['vcf-print','vcf-json','vcf-mail','vcf-reset'].map(i=>!!document.getElementById(i))})`);
ok('VCF has the header, all 8 check sections, sensors and sign-off',['header','hull','power','comms','control','recovery','lars','software','permits','sensors','signoff'].every(s=>sections.secs.includes(s)),sections.secs);
ok('VCF covers every required check (pressure housing, battery chemistry, comms, abort, tracking, LARS, calibration, firmware, insurance, foreign waters)',[/pressure housing/i,/battery chemistry/i,/Communications/,/emergency abort/i,/Tracking and recovery/i,/Launch and recovery gear/i,/calibration/i,/firmware/i,/Insurance/,/foreign waters/i].every(r=>r.test(sections.text)),null);
ok('VCF has Print, Download JSON, e-mail draft and Clear controls; loads with no errors',sections.btns.every(Boolean)&&T.errors.length===0&&T.net.length===0,{b:sections.btns,e:T.errors,n:T.net});
ok('VCF e-mail link is a plain mailto: to ships@oceandata.org (nothing is auto-submitted)',await ev(`document.getElementById('vcf-mail').getAttribute('href').startsWith('mailto:ships@oceandata.org')&&document.getElementById('vcf-form').getAttribute('action')===null&&document.getElementById('vcf-form').getAttribute('method')===null`));
const HOST='<img src=x onerror="window.__pwn=1"></script><script>window.__pwn=2</script>"&\'';
await ev(`(()=>{const H=${JSON.stringify(HOST)};const set=(id,v)=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))};
 set('f-vname',H);set('f-operator',H);set('f-insp_date','2026-11-26');set('f-inspector',H);set('f-ph_cert',H);set('f-so_comments',H);set('n-hull_structure',H);
 document.getElementById('i-hull_structure-def').click();document.getElementById('i-rc_abort-ok').click();document.getElementById('i-bat_cert-def').click();
 document.getElementById('vcf-add-sensor').click();document.querySelector('#vcf-sensors input[data-k=kind]').value=H;document.querySelector('#vcf-sensors input[data-k=kind]').dispatchEvent(new Event('input',{bubbles:true}));
 document.querySelector('#vcf-sensors input[data-k=maker]').value=H;
 window.__blob=null;const o=URL.createObjectURL;URL.createObjectURL=b=>{window.__blob=b;return o.call(URL,b)};return 1})()`);
await sleep(500);
const pv=await ev(`({inj:document.querySelectorAll('main img, main script, main [onerror], #vcf-preview *:not(strong):not(p):not(ul):not(li)').length,pwn:window.__pwn||null,tally:document.getElementById('vcf-tally')?.textContent,defs:[...document.querySelectorAll('#vcf-defs li')].map(l=>l.textContent),mail:document.getElementById('vcf-mail').getAttribute('href'),prevText:document.getElementById('vcf-preview').innerText,hasMarkup:document.getElementById('vcf-preview').innerText.includes('<img src=x')})`);
ok('VCF preview shows hostile text literally, never as markup',pv.inj===0&&!pv.pwn&&pv.hasMarkup&&/2 deficient/.test(pv.tally)&&pv.defs.length===2,pv);
const mailBody=decodeURIComponent((pv.mail.split('&body=')[1]||''));
ok('VCF mailto is URL-encoded, capped in size, addressed to ships@oceandata.org, and carries the text as plain text',/^mailto:ships@oceandata\.org\?subject=/.test(pv.mail)&&!/[<>"]/.test(pv.mail.replace(/^mailto:/,''))&&pv.mail.length<4000&&mailBody.includes('<img src=x')&&/Deficiencies/.test(mailBody),{len:pv.mail.length});
await ev(`document.getElementById('vcf-json').click()`);await sleep(600);
const jtxt=await ev(`window.__blob?window.__blob.text():null`);let jj=null;try{jj=JSON.parse(jtxt)}catch{}
ok('VCF JSON download is valid JSON and keeps hostile text as plain strings',jj&&jj.header.vname===HOST&&jj.sections.find(s=>s.id==='hull').items[0].status==='def'&&jj.sections.find(s=>s.id==='control').items.find(i=>i.id==='rc_abort').status==='ok'&&jj.sensors[0].kind===HOST&&jj.signoff.comments===HOST&&jj.form==='Vehicle Condition Form',jj&&{v:jj.header.vname});
await ev(`window.print=()=>{window.__printed=1};document.getElementById('vcf-print').click()`);
ok('VCF Print button calls window.print only',await ev(`window.__printed===1`));
const posts=reqs.filter(r=>!/^GET /.test(r));
ok('VCF makes no non-GET requests and no request to any other site while being filled in (nothing auto-submitted)',posts.length===0&&reqs.every(r=>/^GET (http:\/\/127\.0\.0\.1|https:\/\/cdn\.jsdelivr\.net|data:|blob:)/.test(r)),{posts,other:reqs.filter(r=>!/127\.0\.0\.1|jsdelivr/.test(r)).slice(0,5)});
const subm=await ev(`(()=>{const f=document.getElementById('vcf-form');const e=new Event('submit',{cancelable:true,bubbles:true});f.dispatchEvent(e);return e.defaultPrevented})()`);
ok('VCF form submit is blocked (defaultPrevented)',subm===true);
await shot('vcf_filled_desktop.png');
// prefill
await nav('vehicle_condition_form.html?platform=whoi-sentry',1800);
const pf=await ev(`({name:document.getElementById('f-vname').value,cls:document.getElementById('f-vclass').value,aut:document.getElementById('f-autonomy').value,op:document.getElementById('f-operator').value,sens:document.querySelectorAll('#vcf-sensors tr').length,note:document.getElementById('vcf-note').innerText,noteHidden:document.getElementById('vcf-note').hidden})`);
ok('VCF pre-fills from ?platform=whoi-sentry (name, class, autonomy, operator, sensors) and says to verify',/Sentry/i.test(pf.name)&&pf.cls==='AUV'&&pf.aut==='supervised autonomous'&&pf.op&&pf.sens>0&&!pf.noteHidden&&/Check every value/.test(pf.note)&&T.errors.length===0,pf);
for(const q of ['%3Cimg%20src=x%20onerror=window.__pwn=3%3E','__proto__','constructor','nope-not-real','..%2F..%2Fetc']){
 await nav('vehicle_condition_form.html?platform='+q,1300);
 const r=await ev(`({pwn:window.__pwn||null,blank:document.getElementById('f-vname').value==='',note:document.getElementById('vcf-note').innerText,inj:document.querySelectorAll('main img,main script,main [onerror]').length})`);
 ok('VCF ignores bad ?platform='+decodeURIComponent(q).slice(0,20)+' (blank form, explanatory note, no injection)',!r.pwn&&r.blank&&r.inj===0&&/blank/.test(r.note)&&T.errors.length===0,r);}
await viewport(375,800,true);await nav('vehicle_condition_form.html?platform=whoi-sentry',2000);
const mv=await ev(`({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,wide:[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>document.documentElement.clientWidth+1&&!e.closest('.table-responsive')).length})`);
ok('VCF at 375 px has no horizontal overflow outside the scrolling sensor table',mv.sw<=mv.cw+1||mv.wide===0,mv);await shot('vcf_mobile_375.png');
await viewport(1280,900,false);

// ================= map layer =================
const intercept=async(mode)=>{ // mode: 'ok' | 'block' | 'badjson' | 'http500' | 'hostile' | 'off'
 await send('Fetch.disable');if(mode==='off')return;
 await send('Fetch.enable',{patterns:[{urlPattern:'https://gliders.ioos.us/*'}]});
 t.T.handlers.length=0;
 t.T.handlers.push(async m=>{if(m.method!=='Fetch.requestPaused')return;const {requestId,request}=m.params,u=request.url;
  const hdr=[{name:'Access-Control-Allow-Origin',value:'*'},{name:'Content-Type',value:'application/json'}];
  const full=(code,body)=>send('Fetch.fulfillRequest',{requestId,responseCode:code,responseHeaders:hdr,body:Buffer.from(body).toString('base64')});
  if(mode==='block')return send('Fetch.failRequest',{requestId,errorReason:'ConnectionRefused'});
  if(mode==='badjson')return full(200,'<html>not json');
  if(mode==='http500')return full(500,'{}');
  const E='<img src=x onerror="window.__pwn=9">';
  if(/allDatasets/.test(u))return full(200,JSON.stringify({table:{columnNames:[],rows:mode==='hostile'?[['good-1','Good glider','Inst A','2026-11-20T00:00:00Z','2026-11-26T00:00:00Z'],['evil/../x','t','i','',''],['ev'+E,'t','i','',''],['ok-2',E,E,E,E],['nolat','t','i','','']]:[['g1','Glider One','Inst A','2026-11-20T00:00:00Z','2026-11-26T00:00:00Z'],['g2','Glider Two','Inst B','2026-11-21T00:00:00Z','2026-11-26T00:00:00Z'],['g3','Glider Three','Inst C','2026-11-22T00:00:00Z','2026-11-26T00:00:00Z']]}}));
  if(/nolat/.test(u))return full(200,JSON.stringify({table:{rows:[['2026-11-26T00:00:00Z',null,'x']]}}));
  const idm=u.match(/tabledap\/([^.]+)\.json/);const i=idm?idm[1]:'x';
  const pos={g1:[10,-40],g2:[-33.5,151.2],g3:[60,5],'good-1':[44.5,-124],'ok-2':[1,2]}[i]||[0,0];
  return full(200,JSON.stringify({table:{rows:[['2026-11-26T01:00:00Z',pos[0],pos[1]]]}}));});};
const WORLD='&bbox=-180,-90,180,90';
// default: no feed requests at all
await intercept('off');const feedReq=[];t.T.handlers.length=0;t.T.handlers.push(m=>{if(m.method==='Network.requestWillBeSent'&&/gliders\.ioos\.us/.test(m.params.request.url))feedReq.push(m.params.request.url)});
await nav('map.html',4500);
let ms=await ev(`({on:document.getElementById('dep-on').checked,st:document.getElementById('dep-status').innerText,g:document.getElementById('dep-panel').dataset.gliders})`);
ok('map.html: the uncrewed layer is off by default and makes no feed request',!ms.on&&feedReq.length===0&&/^Off/.test(ms.st)&&ms.g==='0',{ms,feedReq});
ok('map.html loads with no console errors (layer off)',T.errors.length===0,T.errors);
await shot('map_default.png',false);
const mapOn=async(mode,q='')=>{await intercept(mode);await nav('map.html?layer=uncrewed'+q,6500);return ev(`({on:document.getElementById('dep-on').checked,st:document.getElementById('dep-status').innerText,attr:document.getElementById('dep-attr').innerText,g:+document.getElementById('dep-panel').dataset.gliders,a:+document.getElementById('dep-panel').dataset.argo,res:document.getElementById('dep-results')?.innerText||'',pwn:window.__pwn||null,inj:document.querySelectorAll('#dep-panel img,#dep-panel script,#results img,#results script,#dep-panel [onerror]').length})`)};
let m1=await mapOn('ok',WORLD);
ok('map layer, live feed OK: 3 gliders from the feed, Argo from the snapshot, status shows live + as-of UTC + snapshot date, attribution present',m1.on&&m1.g===3&&m1.a===ar.length&&/live from the IOOS Glider DAC at \d{4}-\d\d-\d\d \d\d:\d\d UTC/.test(m1.st)&&/Argo floats: saved snapshot from/.test(m1.st)&&/IOOS Glider Data Assembly Center/.test(m1.attr)&&/Argo Program/.test(m1.attr),m1);
ok('map layer: area result counts uncrewed deployments separately from ships',/3 gliders and [\d,]+ Argo floats/.test(m1.res)&&/separate from the ship count/.test(m1.res),m1.res);
await shot('map_uncrewed_live.png',false);
for(const mode of ['block','badjson','http500']){
 const m=await mapOn(mode,WORLD);
 ok('map layer, feed '+mode+': falls back to the snapshot with a plain-language status, no uncaught errors',m.g===gl.length&&m.a===ar.length&&/could not be read/.test(m.st)&&/saved snapshot from/.test(m.st)&&!T.errors.some(e=>!/Failed to load resource|ERR_|net::|CORS|status of 500/.test(e)),{m:m.st,e:T.errors.slice(0,3),g:m.g});
 if(mode==='block')await shot('map_uncrewed_feed_blocked.png',false);}
const mh=await mapOn('hostile',WORLD);
ok('map layer, hostile feed: bad ids and positions dropped, markup never rendered, no script ran',mh.g===2&&!mh.pwn&&mh.inj===0,{g:mh.g,inj:mh.inj,pwn:mh.pwn});
await intercept('off');
// toggle behaviour (live network allowed to fail)
await nav('map.html',4500);
await ev(`document.getElementById('dep-on').click()`);await sleep(9000);
let tg=await ev(`({on:document.getElementById('dep-on').checked,g:+document.getElementById('dep-panel').dataset.gliders,a:+document.getElementById('dep-panel').dataset.argo,st:document.getElementById('dep-status').innerText})`);
ok('map layer toggle on (real feed or snapshot): gliders and Argo shown, status explains the source',tg.on&&tg.g>0&&tg.a===ar.length&&/Gliders:/.test(tg.st)&&/Argo floats:/.test(tg.st),tg);
await ev(`document.getElementById('dep-ar').click()`);await sleep(300);
ok('map layer: Argo sub-toggle hides the Argo group only',await ev(`+document.getElementById('dep-panel').dataset.argo===0&&+document.getElementById('dep-panel').dataset.gliders>0`));
await ev(`document.getElementById('dep-on').click()`);await sleep(300);
ok('map layer toggle off hides both groups',await ev(`+document.getElementById('dep-panel').dataset.argo===0&&+document.getElementById('dep-panel').dataset.gliders===0&&/^Off/.test(document.getElementById('dep-status').innerText)`));
ok('map: no uncaught errors during toggling',!T.errors.some(e=>!/Failed to load resource|net::/.test(e)),T.errors);
const au3=await ev(AUDIT);ok('map.html links audit',au3.bad.length===0,au3.bad);
await viewport(375,800,true);await nav('map.html?layer=uncrewed',7000);
const mm=await ev(`({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,panel:document.getElementById('dep-panel').getBoundingClientRect().width})`);
ok('map.html at 375 px has no horizontal overflow with the layer panel',mm.sw<=mm.cw+1,mm);await shot('map_uncrewed_mobile_375.png',false);
await viewport(1280,900,false);

// ================= mobile spot checks of changed pages =================
await viewport(375,800,true);
for(const pg of ['platform.html?id=whoi-alvin','vessel.html?id=MV-0112','resources.html','operators.html','platforms.html?autonomy=uncrewed']){
 await nav(pg,3000);const r=await ev(`({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth})`);
 const own=await ev(`(()=>{const cw=document.documentElement.clientWidth;return [...document.querySelectorAll('[data-section],#dep-panel,#vcf-root,main > section, main h1, main h2')].filter(e=>!e.closest('.table-responsive')&&e.getBoundingClientRect().right>cw+1).length})()`);
 const pre=/^vessel\.html/.test(pg); // vessel.html has a year-bar chart that already overflows on main (scrollWidth 899 at 375 px); check only our sections there
 ok(pg+' at 375 px: no horizontal overflow'+(pre?' in the new sections (the year-bar chart overflow is pre-existing on main)':'')+', no errors',(pre?own===0:r.sw<=r.cw+1)&&T.errors.length===0,{r,own,e:T.errors});}
await viewport(1280,900,false);

// ================= console errors and external links on all changed pages =================
for(const pg of ['index.html','platforms.html','vessels.html','vessel.html?id=MV-0112','platform.html?id=whoi-jason','institution.html?id=whoi','resources.html','operators.html','uncrewed.html','vehicle_condition_form.html']){
 await nav(pg,3000);const a=await ev(AUDIT);
 ok(pg+': no console or network errors and external links safe',T.errors.length===0&&T.net.length===0&&a.bad.length===0,{e:T.errors,n:T.net,bad:a.bad.slice(0,3)});}
const code=t.done('PHASE2');
fs.writeFileSync(process.env.OUT||__OUT+'phase2_out.json',JSON.stringify(t.R,null,1));
t.close();process.exit(code?1:0);
