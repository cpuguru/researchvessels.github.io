import {fileURLToPath as __f2p} from 'node:url';const __ROOT=process.env.SITE||__f2p(new URL('../',import.meta.url));const __OUT=process.env.RV_OUT||__f2p(new URL('out/',import.meta.url));
// Review fixes 2026-11-27: one block of checks per item (1-9), plus screenshots at 1280 and 375 px.
import fs from 'node:fs';
import path from 'node:path';
import { start, sleep, AUDIT } from './lib.mjs';
const BASE=process.env.BASE||'http://127.0.0.1:8851/';
const SHOTS=process.env.SHOTS||__OUT+'shots/';
const SITE=__ROOT;
const t=await start({port:9481,base:BASE,shots:SHOTS});
const {ev,nav,shot,ok,T,viewport}=t;
const clean=()=>T.errors.filter(e=>!/Failed to load resource|net::|ERR_|tile|maplibre/i.test(e));
const MERGED={'MV-0054':'whoi-alvin','MV-0462':'whoi-jason','MV-1092':'whoi-sentry','MV-0280':'whoi-dsl120a','MV-0974':'jamstec-shinkai6500','MV-1099':'jamstec-urashima8000'};
const SIX=['Active','Listed','Probable','Dormant','Unconfirmed','Retired'];
await viewport(1280,900,false);

/* ---------- item 1: status vocabulary ---------- */
await nav('vessels.html',3000);
let s=await ev(`(()=>{const V=RV.vessels();const c={};V.forEach(v=>c[v.status]=(c[v.status]||0)+1);
 return {c,opts:[...document.getElementById('status').options].map(o=>o.value+'|'+o.textContent),sel:document.getElementById('status').value,
 legend:document.getElementById('st-legend').innerText,badges:document.querySelectorAll('#rows [data-status]').length,rows:document.querySelectorAll('#rows tr:not(:has(td[colspan]))').length,
 unv:[...document.querySelectorAll('#rows [data-status="Unconfirmed"]')].slice(0,3).map(b=>({cls:b.className,txt:b.textContent})),
 legacyActive:RV.normStatus('active'),legacyUnknown:RV.normStatus('Unknown'),oos:RV.normStatus('out of service'),
 sharp:V.find(v=>v.id==='MV-0423').status,odd:V.filter(v=>!${JSON.stringify(SIX)}.includes(v.status)).map(v=>v.id+':'+v.status).slice(0,5)}})()`);
ok('1 every vessel has one of the six statuses (counts '+JSON.stringify(s.c)+')',s.odd.length===0&&s.c.Unconfirmed>0&&s.c.Listed>0&&s.c.Active>=1,s);
ok('1 legacy "active"/"Unknown" become Unconfirmed, out of service becomes Retired',s.legacyActive==='Unconfirmed'&&s.legacyUnknown==='Unconfirmed'&&s.oos==='Retired',s);
ok('1 vessels.html status filter offers current + six statuses + all, default "current"',s.sel==='current'&&SIX.every(x=>s.opts.some(o=>o.startsWith(x+'|')))&&s.opts.some(o=>/^(all)?\|All/.test(o)),s.opts);
ok('1 vessels.html legend explains all six statuses',SIX.every(x=>s.legend.includes(x)),s.legend);
ok('1 every vessel row has a status badge; Unconfirmed badges are styled and read as unverified',s.badges===s.rows&&s.rows>0&&s.unv.length>0&&s.unv.every(b=>/rv-unverified/.test(b.cls)&&/unverified/i.test(b.txt)),s);
ok('1 Hugh R. Sharp (recent R2R cruise) is Active',s.sharp==='Active',s.sharp);
await nav('vessels.html?status=active',2500);
ok('1 old ?status=active links map to "current"',await ev(`document.getElementById('status').value`)==='current');
await nav('platforms.html?status=Unknown',3000);
s=await ev(`({sel:document.getElementById('status').value,opts:[...document.getElementById('status').options].map(o=>o.value),unknown:[...document.querySelectorAll('#rows [data-status]')].filter(b=>/unknown/i.test(b.textContent)).length,rows:document.querySelectorAll('#rows tr').length,pst:[...new Set(RV_PLATFORMS.platforms.map(p=>p.status))]})`);
ok('1 platforms: ?status=Unknown maps to Unconfirmed; no "Unknown" badges or data left',s.sel==='Unconfirmed'&&s.unknown===0&&s.rows>0&&!s.pst.includes('Unknown')&&s.pst.every(x=>SIX.includes(x)),s);
ok('1 platforms status filter uses the same vocabulary',SIX.filter(x=>x!=='Retired').every(x=>s.opts.includes(x)),s.opts);

/* ---------- item 2: merged duplicates ---------- */
for(const [mv,pid] of Object.entries(MERGED)){
 await nav('vessel.html?id='+mv,2500);
 const r=await ev(`({u:location.pathname+location.search,h1:document.querySelector('h1')?.textContent,body:document.querySelector('main').innerText.slice(0,3000)})`);
 ok('2 '+mv+' redirects to platform '+pid+' and says it was merged',r.u==='/platform.html?id='+pid+'&from='+mv&&r.body.includes(mv)&&/merged|formerly/i.test(r.body)&&clean().length===0,{r:{...r,body:r.body.slice(0,300)},e:clean()});
}
await nav('ship_details.html?shipID=739',3500);
ok('2 legacy URL ship_details.html?shipID=739 (old Alvin page) ends on platform whoi-alvin',await ev('location.pathname+location.search')==='/platform.html?id=whoi-alvin&from=MV-0054');
s=await ev(`(()=>{const V=RV.vessels();return {left:V.filter(v=>${JSON.stringify(Object.keys(MERGED))}.includes(v.id)).map(v=>v.id),n:V.length,al:${JSON.stringify(Object.keys(MERGED))}.map(k=>RV.platformAlias(k)),
 leg:RV_PLATFORMS.platforms.filter(p=>p.vessel_id).map(p=>p.platform_id+':'+p.vessel_id+':'+(p.legacy_ids||[]).join('/')),
 inst:(RV_INSTITUTIONS.institutions||[]).filter(i=>(i.vessel_ids||[]).some(x=>${JSON.stringify(Object.keys(MERGED))}.includes(x))).map(i=>i.institution_id)}})()`);
ok('2 merged MV IDs leave the vessel list ('+s.n+' vessels) and resolve via RV.platformAlias',s.left.length===0&&s.n===1172&&s.al.join()===Object.values(MERGED).join(),s);
ok('2 canonical platform records carry vessel_id and legacy_ids',s.leg.length===6&&s.leg.every(x=>/:MV-\d{4}:MV-\d{4}/.test(x)),s.leg);
ok('2 no institution still lists a merged vessel ID',s.inst.length===0,s.inst);
await nav('platform.html?id=whoi-alvin',2500);
ok('2 Alvin platform page shows the merged vessel entry row and former ID',await ev(`(()=>{const x=document.querySelector('main').innerText;return /Merged vessel entry/.test(x)&&x.includes('MV-0054')})()`));
const sm=fs.readFileSync(SITE+'sitemap.xml','utf8');
ok('2 sitemap no longer lists merged vessel URLs',Object.keys(MERGED).every(k=>!sm.includes('id='+k)));

/* ---------- item 3: equipment + sticky menu ---------- */
await nav('vessel.html?id=MV-0112',4500);
s=await ev(`(()=>{const sec=document.getElementById('eq-public');const tabs=sec?sec.querySelectorAll('table'):[];
 return {tables:tabs.length,heads:[...sec.querySelectorAll('thead th')].map(t=>t.textContent.trim()),r2rRows:sec.querySelectorAll('[data-src="r2r"]').length,
 credit:(()=>{const c=sec.querySelector('[data-r2r-credit]');return c?{t:c.innerText,links:[...c.querySelectorAll('a')].map(a=>a.href)}:null})(),
 oldR2R:document.querySelectorAll('#r2r-eq table, [data-r2r-equipment] table').length,
 r2rLinks:[...sec.querySelectorAll('a')].filter(a=>/R2R record/.test(a.textContent)).map(a=>a.href).slice(0,3),
 menu:[...document.querySelectorAll('#rv-pagemenu a')].map(a=>[a.textContent,a.getAttribute('href')]),menuHidden:document.getElementById('rv-pagemenu').hidden,
 sticky:getComputedStyle(document.getElementById('rv-pagemenu')).position,
 targetsOk:[...document.querySelectorAll('#rv-pagemenu a')].every(a=>!!document.querySelector(a.getAttribute('href')))}})()`);
ok('3 Atlantis: one equipment table with a Source column',s.tables===1&&s.heads.some(h=>/Source/.test(h))&&s.oldR2R===0,s);
ok('3 R2R-sourced rows are credited, linked to rvdata.us',s.r2rRows>0&&s.credit&&/R2R/.test(s.credit.t)&&s.credit.links.some(h=>/rvdata\.us/.test(h))&&s.r2rLinks.every(h=>/^https:\/\/www\.rvdata\.us\//.test(h)),s);
ok('3 sticky in-page menu: Specs, Equipment, Vehicles, Cruises, Map, Update, all targets exist',!s.menuHidden&&s.sticky==='sticky'&&s.menu.map(m=>m[0]).join()==='Specs,Equipment,Vehicles,Cruises,Map,Update'&&s.targetsOk,s.menu);
await ev(`document.querySelector('#rv-pagemenu a[href="#update"]').click()`);await sleep(1600);
ok('3 menu link scrolls Update into view below the sticky bars',await ev(`(()=>{const r=document.getElementById('update').getBoundingClientRect();return r.top>=50&&r.top<400})()`));
await nav('vessel.html?id=MV-0001',3500);
s=await ev(`({menu:[...document.querySelectorAll('#rv-pagemenu a')].map(a=>a.textContent),vx:!!document.querySelector('#vx-uncrewed:not([hidden])')&&document.getElementById('vx-uncrewed').children.length>0,items:document.getElementById('eq-public')?.getAttribute('data-items')})`);
ok('3 menu hides entries for absent sections (MV-0001: no Vehicles, no Equipment entry when the list is empty)',!s.menu.includes('Vehicles')&&(s.items!=='0'||!s.menu.includes('Equipment'))&&s.menu.includes('Specs')&&s.menu.includes('Update'),s);

/* ---------- item 4: map / tracks / schedule ---------- */
s=await ev(`(()=>{const n=document.getElementById('no-track');return {vis:!!n&&!n.hidden&&n.offsetParent!==null,state:n?.getAttribute('data-state'),txt:n?.innerText}})()`);
ok('4 vessel without track data shows "No track data yet"',s.vis&&s.state==='no-track-data'&&/No track data yet/.test(s.txt),s);
await nav('vessel.html?id=MV-0423',6000);
s=await ev(`({nt:(()=>{const n=document.getElementById('no-track');return !n||n.hidden})(),src:(()=>{try{return Object.keys(window.__rvMap?.style?._sourceCaches||{})}catch{return null}})(),
 sched:[...document.querySelectorAll('a[data-schedule]')].map(a=>a.href+' '+a.target+' '+a.rel),st:document.querySelector('main').innerText.match(/Status[^\\n]*\\n?[^\\n]*/)?.[0]})`);
ok('4 Hugh R. Sharp (track file present) does not show the no-track state',s.nt,s);
ok('4 UNOLS ship schedule links to the UNOLS vessel-schedules page (STRS retired)',s.sched.length===1&&/^https:\/\/www\.unols\.org\/vessel-schedules _blank noopener$/.test(s.sched[0]),s.sched);
s=await ev(`(()=>{const S=window.RV_VSTATUS?.vessels||{};const urls=[];for(const k in S){const x=S[k];if(x.schedule)urls.push(x.schedule.url);if(x.status_url)urls.push(x.status_url)}
 return {n:urls.length,bad:urls.filter(u=>!/^https:\\/\\/[a-z0-9.-]+(\\/|$)/i.test(u)).slice(0,5),strs:urls.filter(u=>/strs\\.unols/.test(u)).length,ti:Object.keys(RV_TRACK_INDEX.tracks||{}),
 tiOk:Object.values(RV_TRACK_INDEX.tracks||{}).every(v=>/^data\\/[a-z0-9_-]+\\.js$/i.test(v.file||'')||Array.isArray(v.expeditions))}})()`);
ok('4 schedule/status URLs are all https, none point at retired STRS',s.n>100&&s.bad.length===0&&s.strs===0,s);
ok('4 track index lists only ships with real track data, with valid data/*.js paths',s.ti.length>=2&&s.tiOk,s);
await nav('map.html?layer=tracks',7000);
s=await ev(`({on:document.getElementById('trk-on').checked,st:document.getElementById('trk-status').innerText,none:document.getElementById('trk-none').innerText,state:document.getElementById('trk-none').getAttribute('data-state')})`);
ok('4 map.html?layer=tracks turns the track layer on and states which vessels have no track data',s.on&&s.state==='no-track-data'&&/No track data yet/.test(s.none)&&clean().length===0,{s,e:clean()});
await shot('map_tracks_1280.png',false);

/* ---------- item 5: home counts ---------- */
await nav('index.html',3000);
s=await ev(`(()=>{const V=RV.vessels();const ships=V.filter(v=>v.vehicle_class==='ship'||(!v.vehicle_class&&v.type==='Vessel')).length;const P=(RV_PLATFORMS.platforms||[]).length;
 const num=id=>+(document.getElementById(id)?.innerText.match(/[\\d,]+/)?.[0]||'').replace(/,/g,'');
 return {ships,plat:P+(V.length-ships),sv:num('stat-vessels'),sp:num('stat-platforms'),tv:document.getElementById('stat-vessels')?.innerText,tp:document.getElementById('stat-platforms')?.innerText}})()`);
ok('5 home shows research vessels ('+s.sv+') and platforms ('+s.sp+') separately, computed from data',s.sv===s.ships&&s.sp===s.plat&&s.sv>1000&&s.sp>90&&/vessel/i.test(s.tv)&&/platform/i.test(s.tp),s);

/* ---------- item 6: platform display names ---------- */
await nav('platforms.html',3000);
s=await ev(`(()=>{const rows=[...document.querySelectorAll('#rows tr')];const names=rows.map(r=>r.querySelector('td')?.querySelector('a')?.textContent||'');
 const sorted=[...names].sort((a,b)=>a.localeCompare(b,'en',{sensitivity:'base',numeric:true}));
 const ud=rows.find(r=>/ud_476/.test(r.innerText));
 return {sort:document.getElementById('sort').value,first:names.slice(0,5),isSorted:JSON.stringify(names)===JSON.stringify(sorted),firstUD:/^ud_/i.test(names[0]),
  ud:ud?{name:ud.querySelector('td a')?.textContent,raw:ud.querySelector('.rv-raw-id')?.textContent,rawSize:getComputedStyle(ud.querySelector('.rv-raw-id')).fontSize,nameSize:getComputedStyle(ud.querySelector('td a')).fontSize}:null,
  rawNames:names.filter(n=>/^[a-z]+_\\d+$/i.test(n)).length,dn:[RV_PLATFORMS.platforms.find(p=>p.platform_id==='ud_476')].map(p=>RVP.displayName(p))[0]}})()`);
ok('6 ud_476 displays as "Slocum G2 #476 (UD)" with the raw ID smaller underneath',s.ud&&s.ud.name==='Slocum G2 #476 (UD)'&&/ud_476/.test(s.ud.raw)&&parseFloat(s.ud.rawSize)<parseFloat(s.ud.nameSize),s.ud);
ok('6 platforms default sort is alphabetical by display name, not UD-first, and no raw IDs as names',s.sort==='name'&&s.isSorted&&!s.firstUD&&s.rawNames===0,s);
await nav('platforms.html?sort=status',3000);
s=await ev(`(()=>{const L=['Active','Listed','Probable','Dormant','Unconfirmed','Retired'];const st=[...document.querySelectorAll('#rows tr [data-status]')].map(b=>L.indexOf(b.getAttribute('data-status')));return {sel:document.getElementById('sort').value,mono:st.every((x,i)=>i===0||st[i-1]<=x),n:st.length}})()`);
ok('6 sort=status orders by status level',s.sel==='status'&&s.mono&&s.n>0,s);
await shot('platforms_1280.png',false);

/* ---------- item 7: institutions ---------- */
for(const q of ['WHOI','whoi','Whoi']){await nav('institution.html?id='+q,2500);
 const r=await ev(`({u:location.search,h1:document.querySelector('h1')?.textContent})`);
 ok('7 institution.html?id='+q+' finds WHOI (case-insensitive) and canonicalises the URL',r.u==='?id=whoi'&&/Woods Hole/.test(r.h1),r);}
await nav('platform.html?id=UD_476',2500);
ok('7 platform IDs are matched case-insensitively too',await ev(`location.search==='?id=ud_476'&&/Slocum/.test(document.querySelector('h1').textContent)`));
await nav('institution.html',2500);
ok('7 institution.html without an ID goes to the institutions index',await ev(`location.pathname`)==='/institutions.html');
await nav('institutions.html',3000);
s=await ev(`(()=>{const rows=[...document.querySelectorAll('#irows tr')];const n=(RV_INSTITUTIONS.institutions||[]).length;
 const w=rows.find(r=>r.getAttribute('data-inst')==='whoi');
 return {rows:rows.length,n,count:document.getElementById('icount').innerText,whoi:w?{v:+w.querySelector('[data-col=vessels]').textContent,p:+w.querySelector('[data-col=platforms]').textContent}:null,
  expV:RV.vessels().filter(v=>(RV_INSTITUTIONS.institutions.find(i=>i.institution_id==='whoi').vessel_ids||[]).includes(v.id)).length,
  nav:[...document.querySelectorAll('nav a')].filter(a=>a.getAttribute('href')==='institutions.html').map(a=>({t:a.textContent,cur:a.getAttribute('aria-current')})),aria:document.querySelector('#instable th[aria-sort]')?.innerText}})()`);
ok('7 institutions index lists every institution ('+s.rows+')',s.rows===s.n&&s.n>0&&s.count.startsWith(s.n+' of '+s.n),s);
ok('7 WHOI row shows vessel and platform counts',s.whoi&&s.whoi.v===s.expV&&s.whoi.p>=4,s);
ok('7 Institutions is in the nav and marked current here',s.nav.length>=1&&s.nav.some(x=>x.cur==='page'),s.nav);
await ev(`document.querySelector('#instable [data-sort="vessels"]').click()`);await sleep(400);
s=await ev(`(()=>{const v=[...document.querySelectorAll('#irows [data-col=vessels]')].map(x=>+x.textContent);return {desc:v.every((x,i)=>i===0||v[i-1]>=x),aria:document.querySelector('#instable th[aria-sort]')?.innerText+':'+document.querySelector('#instable th[aria-sort]')?.getAttribute('aria-sort'),u:location.search}})()`);
ok('7 sorting by vessels: descending, aria-sort and URL updated',s.desc&&/Vessels:descending/.test(s.aria)&&/sort=vessels/.test(s.u),s);
await ev(`(()=>{const c=document.getElementById('ic');c.value='JP';c.dispatchEvent(new Event('input',{bubbles:true}))})()`);await sleep(400);
s=await ev(`({rows:[...document.querySelectorAll('#irows tr')].map(r=>r.getAttribute('data-inst')),jp:(RV_INSTITUTIONS.institutions||[]).filter(i=>i.country==='JP').length,u:location.search})`);
ok('7 country filter (Japan) narrows the list and is kept in the URL',s.rows.length===s.jp&&s.jp>0&&/country=JP/.test(s.u),s);
await ev(`(()=>{const c=document.getElementById('ic');c.value='';c.dispatchEvent(new Event('input',{bubbles:true}));const q=document.getElementById('iq');q.value='woods hole';q.dispatchEvent(new Event('input',{bubbles:true}))})()`);await sleep(400);
s=await ev(`({rows:[...document.querySelectorAll('#irows tr')].map(r=>r.getAttribute('data-inst')),u:location.search})`);
ok('7 search box filters by name (woods hole -> WHOI)',s.rows.includes('whoi')&&s.rows.length<10&&/q=woods/.test(s.u),s);
ok('7 sitemap lists institutions.html',/<loc>https:\/\/researchvessels\.org\/institutions\.html<\/loc>/.test(sm));
await nav('institutions.html',2500);await shot('institutions_1280.png',false);

/* ---------- item 8: governance ---------- */
await nav('about.html#governance',2500);
s=await ev(`(()=>{const g=document.getElementById('governance');const x=g.innerText;return {x,st:[...document.querySelectorAll('#gov-statuses li, #gov-statuses dt')].map(e=>e.innerText.split(/[\\n:—]/)[0].trim()),
 mail:[...g.querySelectorAll('a[href^="mailto:"]')].map(a=>a.getAttribute('href')),link:!!document.querySelector('a[href="#governance"]')}})()`);
ok('8 governance: maintained by Doug White / CPU Guru LLC, independent',/Doug White/.test(s.x)&&/CPU Guru LLC/.test(s.x)&&/independent/i.test(s.x),s.x.slice(0,400));
ok('8 governance: corrections via forms and ships@oceandata.org',s.mail.some(m=>/^mailto:ships@oceandata\.org/.test(m))&&/form/i.test(s.x),s.mail);
ok('8 governance: verification process and all six status meanings',SIX.every(x=>s.st.some(y=>y.startsWith(x))),s.st);
ok('8 governance: advisory partners are pending, no names',/advis/i.test(s.x)&&/pending/i.test(s.x)&&!/GMSO|NOAA advisory|UNOLS advisory/.test(s.x.match(/Advisory[\\s\\S]{0,600}/i)?.[0]||''),s.x.match(/Advisory[\\s\\S]{0,400}/i)?.[0]);
ok('8 About links to the governance section',s.link);
await shot('about_governance_1280.png',false);

/* ---------- item 9: noreferrer gone ---------- */
const PAGES=['index.html','vessels.html','vessel.html?id=MV-0112','vessel.html?id=MV-0423','platforms.html','platform.html?id=whoi-alvin','institutions.html','institution.html?id=whoi','about.html','map.html?layer=tracks','resources.html','fleet.html','uncrewed.html'];
for(const p of PAGES){await nav(p,p.startsWith('map')?6000:3000);const a=await ev(AUDIT);const nr=await ev(`document.querySelectorAll('[rel~="noreferrer"]').length`);
 ok('9 '+p+': external links new tab + noopener, no noreferrer; internal same tab; no JS errors',a.bad.length===0&&nr===0&&clean().length===0,{bad:a.bad.slice(0,4),nr,e:clean().slice(0,3)});}
const hits=[];const walk=d=>{for(const f of fs.readdirSync(d)){if(f==='.git'||f==='tests'||f==='node_modules')continue;const q=path.join(d,f);const st=fs.statSync(q);if(st.isDirectory())walk(q);else if(/\.(html|js|json|xml|css)$/.test(f)){const txt=fs.readFileSync(q,'utf8');
 for(const m of txt.matchAll(/noreferrer/g)){const ctx=txt.slice(Math.max(0,m.index-60),m.index+20);if(!/except noreferrer, which is dropped|x!=='noreferrer'|x&&x!=='noreferrer'/.test(txt.slice(Math.max(0,m.index-60),m.index+60)))hits.push(q.replace(SITE,'')+': '+ctx.replace(/\s+/g,' '))}}}};
walk(SITE);
ok('9 no noreferrer left in site files (only the comment and the strip code)',hits.length===0,hits.slice(0,6));

/* ---------- screenshots + 375px overflow ---------- */
const SHOT_PAGES=[['index.html','home'],['vessel.html?id=MV-0112','vessel_atlantis'],['vessel.html?id=MV-0001','vessel_notrack'],['platforms.html','platforms'],['platform.html?id=ud_476','platform_ud476'],['platform.html?id=whoi-alvin&from=MV-0054','platform_alvin_merged'],['institutions.html','institutions'],['institution.html?id=whoi','institution_whoi'],['about.html#governance','about_governance'],['map.html?layer=tracks','map_tracks'],['vessels.html','vessels']];
for(const [w,h,m,tag] of [[1280,900,false,'1280'],[375,812,true,'375']]){await viewport(w,h,m);
 for(const [p,n] of SHOT_PAGES){await nav(p,p.startsWith('map')?6500:3500);
  if(tag==='375'){const o=await ev(`({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,wide:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>document.documentElement.clientWidth+1&&getComputedStyle(e).position!=='fixed'&&!e.closest('.table-responsive,.rv-pagemenu,.overflow-auto,.maplibregl-map,pre')}).slice(0,3).map(e=>e.tagName+'.'+e.className)})`);
   ok('375px: '+p+' has no horizontal page overflow',o.sw<=o.cw+1,o);}
  await shot(n+'_'+tag+'.png',!p.startsWith('map'));}}
await viewport(1280,900,false);
const code=t.done('REVIEW');
fs.writeFileSync(process.env.OUT||__OUT+'review_test_out.json',JSON.stringify(t.R,null,1));
t.close();process.exit(code?1:0);
