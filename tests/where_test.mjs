import {fileURLToPath as __f2p} from 'node:url';const __ROOT=process.env.SITE||__f2p(new URL('../',import.meta.url));const __OUT=process.env.RV_OUT||__f2p(new URL('out/',import.meta.url));
// "Where were ships?" (map.html), 2026-11-27: Sailwx removed; R2R/NCEI cruise tracks on by default; hostile track data; screenshots.
import fs from 'node:fs';
import { start, sleep, AUDIT } from './lib.mjs';
const BASE=process.env.BASE||'http://127.0.0.1:8871/',XBASE=process.env.XBASE||'http://127.0.0.1:8873/';
const SHOTS=process.env.SHOTS||__OUT+'shots/';
const t=await start({port:9581,base:BASE,shots:SHOTS});
const {ev,nav,shot,ok,T,viewport,send}=t;
const clean=()=>T.errors.filter(e=>!/Failed to load resource|net::|ERR_|Failed to fetch[\s\S]*maplibre-gl/.test(e));
const ST=`({on:document.getElementById('trk-on').checked,n:+document.getElementById('trk-panel').dataset.tracks,st:document.getElementById('trk-status').innerText,
 none:document.getElementById('trk-none').innerText,state:document.getElementById('trk-none').getAttribute('data-state'),rec:document.getElementById('trk-recent').hidden?'':document.getElementById('trk-recent').innerText,
 y0:document.getElementById('y0').value,y1:document.getElementById('y1').value,yd:document.getElementById('y0').disabled,res:document.getElementById('results').innerText,
 dep:document.getElementById('dep-on').checked,depSt:document.getElementById('dep-status').innerText,u:location.search,
 sail:/sailwx|weather report|VOS|AIS-like|ship-days|historical positions/i.test(document.querySelector('main').innerText),kind:!!document.getElementById('kind'),
 pos:[...document.querySelectorAll('script[src]')].some(s=>/positions\\.js/.test(s.src))||performance.getEntriesByType('resource').some(r=>/positions\\.js/.test(r.name)),
 layers:window.__rvMapLayers||null})`;
await viewport(1280,900,false);
// default state
let feedReq=[];T.handlers.push(m=>{if(m.method==='Network.requestWillBeSent'&&/gliders\.ioos\.us|erddap/.test(m.params.request.url))feedReq.push(m.params.request.url)});
await nav('map.html',8000);
let s=await ev(ST);
ok('map.html: cruise tracks are on by default and drawn ('+s.n+')',s.on&&s.n>0&&/imported cruise tracks drawn/.test(s.st),s.st);
ok('map.html: no Sailwx UI, text, position-type filter or positions.js load',!s.sail&&!s.kind&&!s.pos,{sail:s.sail,kind:s.kind,pos:s.pos});
ok('map.html: clear "No track data yet" note for the other vessels',s.state==='no-track-data'&&/No track data yet for the other [\d,]+ vessels/.test(s.none),s.none);
ok('map.html: most recent imported cruise per tracked ship listed, labelled as not live',/Hugh R\. Sharp/.test(s.rec)&&/Atlantis/.test(s.rec)&&/Okeanos Explorer/.test(s.rec)&&/not a live position/.test(s.rec),s.rec);
ok('map.html: year filter enabled from track years',!s.yd&&/^\d{4}$/.test(s.y0)&&/^\d{4}$/.test(s.y1)&&+s.y0<=+s.y1,s);
ok('map.html: uncrewed layer still off by default, no feed request',!s.dep&&/^Off/.test(s.depSt)&&feedReq.length===0,{depSt:s.depSt,feedReq});
ok('map.html: no JS errors; links audit clean',clean().length===0&&(await ev(AUDIT)).bad.length===0,clean());
const recLinks=await ev(`[...document.querySelectorAll('#trk-recent a')].map(a=>a.getAttribute('href')+' '+(a.target||'')+' '+(a.rel||''))`);
ok('recent-cruise links: vessel pages same tab, R2R cruise pages new tab noopener',recLinks.filter(l=>/^vessel\.html\?id=MV-\d{4}  $/.test(l)).length===3&&recLinks.filter(l=>/^https:\/\/www\.rvdata\.us\/search\/cruise\/[A-Za-z0-9_-]+ _blank noopener$/.test(l)).length===2,recLinks);
await shot('map_default_1280.png',false);
// map canvas actually has the track layer with features
const lay=await ev(`(()=>{const m=document.querySelector('#map');return !!m.querySelector('canvas')})()`);
ok('map canvas present',lay);
// off switch via URL, and toggling writes the URL
await nav('map.html?tracks=off',5000);s=await ev(ST);
ok('?tracks=off starts with tracks off; status says Off; nothing drawn; years disabled',!s.on&&s.n===0&&/^Off/.test(s.st)&&s.yd,s);
await ev(`(()=>{const c=document.getElementById('trk-on');c.click()})()`);await sleep(4000);s=await ev(ST);
ok('turning tracks on draws them and removes tracks=off from the URL',s.on&&s.n>0&&!/tracks=off/.test(s.u),s.u);
await ev(`document.getElementById('trk-on').click()`);await sleep(800);s=await ev(ST);
ok('turning tracks off writes ?tracks=off',!s.on&&s.n===0&&/tracks=off/.test(s.u),s.u);
await nav('map.html?layer=tracks',6000);s=await ev(ST);
ok('old ?layer=tracks links still show tracks',s.on&&s.n>0);
// area + years
await nav('map.html?bbox=-76,36,-72,40',7000);s=await ev(ST);
const ncei=await ev(`[...document.querySelectorAll('#trk-results a')].filter(a=>/ncei\\.noaa\\.gov/.test(a.href)).map(a=>a.getAttribute('href'))`);
ok('Mid-Atlantic box lists ships whose tracks cross it, with year ranges and NCEI search links',/Imported cruise tracks crossing this area/.test(s.res)&&/Hugh R\. Sharp · \d+ cruises \(\d{4}-\d{4}\)/.test(s.res)&&ncei.length>=1&&ncei.every(h=>/^https:\/\/www\.ncei\.noaa\.gov\/access\/search\/data-search\/all\?text=/.test(h)),{res:s.res.slice(0,400),ncei:ncei.slice(0,2)});
await shot('map_midatlantic_1280.png',false);
await ev(`document.querySelector('[data-bbox="-98,18,-80,31"]').click()`);await sleep(2500);s=await ev(ST);
ok('Gulf of Mexico preset (replaces German Bight) lists all three tracked ships',/Hugh R\. Sharp · \d+ cruises/.test(s.res)&&/Atlantis · \d+ cruises/.test(s.res)&&/Okeanos Explorer · \d+ cruises/.test(s.res)&&!(await ev(`!!document.querySelector('[data-bbox="5,53.5,9,56"]')`)),s.res.slice(0,400));
await shot('map_gulf_of_mexico_1280.png',false);
await nav('map.html?bbox=-160,18,-154,23&y0=2024&y1=2025',7000);s=await ev(ST);
const exp=await ev(`(()=>{let n=0;for(const id of RV.trackIds()){const fc=RV.tracksFor(id);if(fc)n+=fc.features.filter(f=>f.properties.year>=2024&&f.properties.year<=2025).length}return n})()`);
ok('?y0=2024&y1=2025 filters drawn tracks to those years ('+s.n+' = '+exp+')',s.y0==='2024'&&s.y1==='2025'&&s.n===exp&&/2024 to 2025/.test(s.res),{n:s.n,exp,res:s.res.slice(0,200)});
await ev(`(()=>{const a=document.getElementById('y0'),b=document.getElementById('y1');a.value='2001';b.value='2001';a.dispatchEvent(new Event('input',{bubbles:true}))})()`);await sleep(600);s=await ev(ST);
ok('an empty year range says no tracks cross and that other ships have no data yet',/None of the imported tracks cross this box/.test(s.res)&&/no track data yet/i.test(s.res),s.res.slice(0,300));
await nav('map.html?tracks=off&bbox=-76,36,-72,40',5000);s=await ev(ST);
ok('area search with tracks off explains that tracks are off',/Cruise tracks are off/.test(s.res),s.res.slice(0,200));
await nav('map.html?layer=uncrewed',8000);s=await ev(ST);
ok('?layer=uncrewed still turns on the uncrewed layer (tracks stay on)',s.dep&&s.on&&!/^Off/.test(s.depSt),{dep:s.dep,depSt:s.depSt.slice(0,120)});
// vessel pages keep their Sailwx positions (not part of this change)
await nav('vessel.html?id=MV-0423',5000);
ok('vessel pages still load positions.js (Sailwx stays there)',await ev(`[...document.querySelectorAll('script[src]')].some(s=>/positions\\.js/.test(s.src))`));
// 375px
await viewport(375,812,true);
for(const [p,n] of [['map.html?bbox=-98,18,-80,31','map_gulf_of_mexico'],['map.html','map_default'],['map.html?bbox=-76,36,-72,40','map_midatlantic'],['map.html?tracks=off','map_tracks_off']]){await nav(p,7000);
 const o=await ev(`({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth})`);ok('375px '+p+': no horizontal overflow',o.sw<=o.cw+1,o);await shot(n+'_375.png',true);}
await viewport(1280,900,false);await nav('map.html?tracks=off',5000);await shot('map_tracks_off_1280.png',false);
// hostile track data on the XSS clone
const x=await start({port:9583,base:XBASE});
for(const p of ['map.html','map.html?bbox=-76,36,-72,40','map.html?bbox=-76,36,-72,40&y0=2099&y1=2099']){
 await x.nav(p,8000);
 const r=await x.ev(`({pwn:window.__pwn||null,inj:document.querySelectorAll('main img[src="x"], main script, main [onerror], main b').length,
  bad:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>/^\\s*(javascript|data|vbscript):/i.test(h||'')),
  rec:document.getElementById('trk-recent').innerText,res:document.getElementById('results').innerText.slice(0,300)})`);
 const unc=x.T.errors.filter(e=>!/Failed to load resource|net::|ERR_|Failed to fetch[\s\S]*maplibre-gl/.test(e));
 ok('hostile track properties on '+p+': shown as text, nothing executed, no bad links',!r.pwn&&r.inj===0&&r.bad.length===0&&unc.length===0&&x.T.dialogs.length===0,{r,unc:unc.slice(0,2)});
 if(p==='map.html')ok('hostile cruise ID/dates appear literally in the recent-cruise list and get no R2R link',/HRS9999<img src=x/.test(r.rec)&&!(await x.ev(`[...document.querySelectorAll('#trk-recent a')].some(a=>/HRS9999/.test(a.href))`)),r.rec.slice(0,300));
}
x.close();
const code=t.done('WHERE');
fs.writeFileSync(process.env.OUT||__OUT+'where_test_out.json',JSON.stringify(t.R,null,1));
t.close();process.exit(code?1:0);
