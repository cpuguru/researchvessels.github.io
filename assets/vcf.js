/* Vehicle Condition Form (draft). Runs entirely in the browser.
   Nothing typed here is stored, fetched or sent anywhere. The three outputs are all user actions:
   print / save as PDF, download a JSON file, or open a pre-addressed e-mail draft in the user's own mail program.
   Every value is placed in the page with textContent / .value / setAttribute, never as HTML. */
(function(){
'use strict';
const h=RV.h,$=id=>document.getElementById(id);
const CONTACT='ships@oceandata.org',VERSION='0.1-draft';
const STATUS=[['ok','OK'],['def','Deficient'],['na','N/A']];
const BATT=['Lithium-ion','Lithium iron phosphate (LiFePO4)','Lithium polymer','Lithium primary (non-rechargeable)','Alkaline primary','Lead-acid','Nickel-metal hydride','Other / none (fuel or diesel only)'];
const COMMS=['Iridium','Other satellite (Inmarsat, Globalstar, Starlink etc.)','Cellular','Radio / RF (VHF, UHF, spread-spectrum)','Wi-Fi','Acoustic modem','Tether / umbilical'];
/* Items are yes/deficient/N-A checks; fields are free text or dates. Section order follows the roadmap brief. */
const SECTIONS=[
 {id:'hull',title:'Hull and pressure housing',items:[
  ['hull_structure','Hull, fairings and frame free of cracks, delamination, deformation or corrosion'],
  ['housings','Pressure housings, end caps and penetrators inspected; O-rings and seals replaced to schedule'],
  ['leak','Leak detectors present, tested and reporting'],
  ['buoyancy','Buoyancy material, ballast and trim checked and recorded'],
  ['anodes','Anodes / corrosion protection checked']],
  fields:[['ph_service','Pressure housings last serviced','date'],['ph_cert','Pressure test or certification (body, reference, date)','text'],['ph_depth','Rated depth for this configuration (m)','text']]},
 {id:'power',title:'Battery chemistry and certification',items:[
  ['bat_condition','Battery pack and connectors free of swelling, damage, corrosion or heat marks'],
  ['bat_bms','Battery management / protection (over-current, over-temperature, cut-off) tested'],
  ['bat_cert','Battery pack certification current (for example UN 38.3 transport test summary)'],
  ['bat_dg','Shipping and storage follow dangerous-goods and fire-safety rules for this chemistry']],
  fields:[['bat_chem','Battery chemistry','select',BATT],['bat_cert_ref','Certification reference and date','text'],['bat_cycles','Cycle count or age of the pack','text']]},
 {id:'comms',title:'Communications',items:[
  ['comm_primary','Primary communications link tested end to end'],
  ['comm_backup','Backup link tested (a different path from the primary)'],
  ['comm_ids','Account, SIM, IMEI or radio licence details recorded and current'],
  ['comm_antenna','Antennas and cables inspected']],
  fields:[['comm_types','Links fitted','select',COMMS],['comm_tested','Last end-to-end test','date']]},
 {id:'control',title:'Remote control links and emergency abort',items:[
  ['rc_link','Remote control or supervision link tested at the planned operating range'],
  ['rc_abort','Emergency abort / stop command tested and confirmed'],
  ['rc_failsafe','Fail-safe behaviour (loss of link, low battery, leak, depth or geofence limit) tested or checked in the configuration'],
  ['rc_drop','Drop weight, emergency release or surfacing mechanism tested'],
  ['rc_operator','Operators are trained for this vehicle and a named person is on watch']],
  fields:[['rc_tested','Last abort test','date'],['rc_notes_fs','Failsafe settings in use (summary)','text']]},
 {id:'recovery',title:'Tracking and recovery aids',items:[
  ['rec_beacon','Location beacon fitted and working (satellite, Argos, AIS, VHF or acoustic pinger)'],
  ['rec_visual','Strobe, flag, radar reflector or high-visibility markings fitted'],
  ['rec_label','Return-and-reward label with a contact is on the vehicle'],
  ['rec_plan','Recovery plan written, including who to call if the vehicle is lost']],
  fields:[['rec_ids','Beacon IDs or call signs','text']]},
 {id:'lars',title:'Launch and recovery gear',items:[
  ['lars_points','Lifting points, bridle and shackles inspected; load rating marked'],
  ['lars_cradle','Cradle, frame or launch gear matches this vehicle'],
  ['lars_lines','Recovery lines, tag lines and hooks inspected'],
  ['lars_ship','Host ship\u2019s deck space, crane or A-frame working load and power checked against the vehicle (see the ship\u2019s page)'],
  ['lars_weather','Sea-state and weather limits for launch and recovery agreed']],
  fields:[['lars_swl','Vehicle mass in air (kg) and lifting-gear working load (kg)','text'],['lars_proof','Last proof test of lifting gear','date'],['lars_ship_id','Host ship, if any (name or ID)','text']]},
 {id:'software',title:'Software and firmware',items:[
  ['sw_versions','Vehicle software, firmware and mission-planning versions recorded'],
  ['sw_backup','Configuration and mission files backed up before sailing'],
  ['sw_clock','Clocks and time sync checked'],
  ['sw_test','A test mission or dock-side check passed on this configuration']],
  fields:[['sw_ver','Vehicle software / firmware version','text'],['sw_plan','Mission-planning software version','text'],['sw_date','Version recorded on','date']]},
 {id:'permits',title:'Insurance and permits',items:[
  ['ins_cover','Insurance covers this vehicle, this operation and this area'],
  ['perm_flag','Registration, flag or operating authority in place where the vehicle is treated as a vessel or aircraft'],
  ['perm_colreg','Navigation lights, signals and collision-avoidance arrangements meet the rules for the area (surface vehicles)'],
  ['perm_foreign','Consent obtained for any foreign waters (coastal-state marine scientific research consent or notification), or the vehicle will stay out of them'],
  ['perm_env','Environmental, protected-area and marine-mammal permits in place where needed'],
  ['perm_radio','Radio, satellite and acoustic licences in place; notices to mariners or airspace notices issued where required']],
  fields:[['ins_policy','Insurer, policy number and expiry','text'],['perm_foreign_list','Countries or zones where consent is held or needed','text'],['perm_refs','Permit references','text']]}
];
const HEADER=[
 ['vname','Vehicle name or ID',true],['vclass','Vehicle class',true,'select'],['autonomy','Autonomy level','select'],
 ['operator','Operating institution'],['owner','Owner'],['base','Home base'],
 ['maker','Manufacturer'],['model','Model'],['serial','Serial number'],['year','Year built or commissioned'],
 ['contact','Responsible contact (role mailbox preferred)'],['insp_date','Inspection date','date'],['prev_date','Previous inspection date','date'],
 ['inspector','Inspected by (name or role)'],['location','Inspection location']];
const SENSOR_COLS=[['kind','Kind'],['maker','Maker'],['model','Model'],['serial','Serial no.'],['cal','Last calibration','date'],['due','Next due','date']];
const MAXSENS=30,MAXLEN=2000;
const clean=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,' ').slice(0,n||MAXLEN);
const slug=s=>clean(s,60).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'vehicle';

function field(id,label,type,opts){
 const fid='f-'+id;let ctl;
 if(type==='select'){ctl=h('select',{class:'form-select form-select-sm',id:fid,name:id});ctl.append(h('option',{value:''},'\u2014 choose \u2014'));(opts||[]).forEach(o=>{const v=Array.isArray(o)?o[0]:o,t=Array.isArray(o)?o[1]:o;ctl.append(h('option',{value:v},t))})}
 else ctl=h('input',{class:'form-control form-control-sm',id:fid,name:id,type:type==='date'?'date':'text',maxlength:type==='date'?'10':'300',autocomplete:'off'});
 return h('div',{class:'col-12 col-md-6 col-lg-4'},h('label',{class:'form-label small mb-1',for:fid},label),ctl);
}
function itemRow(sec,it){
 const [id,label]=it,name='i-'+id;
 const grp=h('div',{class:'btn-group btn-group-sm flex-shrink-0',role:'group','aria-label':'Status: '+label});
 STATUS.forEach(([v,t])=>{const rid=name+'-'+v;grp.append(h('input',{type:'radio',class:'btn-check',name,id:rid,value:v,autocomplete:'off'}),h('label',{class:'btn btn-outline-secondary vcf-st-'+v,for:rid},t))});
 return h('li',{class:'list-group-item vcf-item','data-item':id},h('div',{class:'d-flex flex-wrap gap-2 align-items-start justify-content-between'},h('div',{class:'flex-grow-1',style:'min-width:15rem'},h('span',{id:name+'-l'},label)),grp),
  h('input',{type:'text',class:'form-control form-control-sm mt-1',name:'n-'+id,id:'n-'+id,placeholder:'Note (optional)','aria-label':'Note for: '+label,maxlength:'300',autocomplete:'off'}));
}
function sectionEl(s,i){
 const hid='vs-'+s.id;
 const card=h('section',{class:'card mb-3 vcf-section','data-section':s.id,'aria-labelledby':hid},h('div',{class:'card-body'},h('h2',{class:'h5 card-title',id:hid},(i+2)+'. '+s.title)));
 const body=card.firstChild;
 const ul=h('ul',{class:'list-group list-group-flush mb-2'});s.items.forEach(it=>ul.append(itemRow(s,it)));body.append(ul);
 const row=h('div',{class:'row g-2'});s.fields.forEach(f=>row.append(field(f[0],f[1],f[2],f[3])));body.append(row);
 return card;
}
function sensorRow(vals){
 vals=vals||{};
 const tr=h('tr',{class:'vcf-sensor'});
 SENSOR_COLS.forEach(([k,l,t])=>{
  const inp=h('input',{class:'form-control form-control-sm',type:t==='date'?'date':'text','data-k':k,'aria-label':l,maxlength:t==='date'?'10':'120',autocomplete:'off'});
  if(vals[k]!=null)inp.value=clean(vals[k],120);
  tr.append(h('td',null,inp));
 });
 const rm=h('button',{type:'button',class:'btn btn-sm btn-outline-danger vcf-noprint','aria-label':'Remove this sensor row'},'\u00d7');
 rm.addEventListener('click',()=>{tr.remove();changed()});
 tr.append(h('td',null,rm));return tr;
}
function sensorsEl(){
 const tb=h('tbody',{id:'vcf-sensors'});
 const add=h('button',{type:'button',class:'btn btn-sm btn-outline-primary vcf-noprint',id:'vcf-add-sensor'},'Add a sensor');
 add.addEventListener('click',()=>{if(tb.children.length<MAXSENS){const r=sensorRow();tb.append(r);r.querySelector('input').focus();changed()}});
 const tbl=h('table',{class:'table table-sm align-middle mb-2'},h('thead',null,h('tr',null,SENSOR_COLS.map(([,l])=>h('th',{scope:'col',class:'small fw-normal'},l)),h('th',{scope:'col'},h('span',{class:'visually-hidden'},'Remove')))),tb);
 const sensNotes=h('div',{class:'row g-2'},field('sens_notes','Calibration notes, or sensors not listed above','text'));
 return h('section',{class:'card mb-3 vcf-section','data-section':'sensors','aria-labelledby':'vs-sensors'},h('div',{class:'card-body'},h('h2',{class:'h5 card-title',id:'vs-sensors'},(SECTIONS.length+2)+'. Sensor calibration dates'),h('p',{class:'small text-body-secondary'},'One row per sensor. Calibration dates are the date on the calibration certificate.'),h('div',{class:'table-responsive'},tbl),add,sensNotes));
}
/* ---- collect / outputs ---- */
function val(id){const e=$('f-'+id);return e?clean(e.value,300):''}
function collect(){
 const hd={};HEADER.forEach(([id])=>{hd[id]=val(id)});
 const sections=SECTIONS.map(s=>({id:s.id,title:s.title,
  items:s.items.map(([id,label])=>{const r=document.querySelector('input[name="i-'+id+'"]:checked');const n=$('n-'+id);return {id,label,status:r?r.value:'not_checked',note:n?clean(n.value,300):''}}),
  fields:s.fields.map(([id,label])=>({id,label,value:val(id)}))}));
 const sensors=[...document.querySelectorAll('#vcf-sensors .vcf-sensor')].map(tr=>{const o={};tr.querySelectorAll('input').forEach(i=>{o[i.getAttribute('data-k')]=clean(i.value,120)});return o});
 return {form:'Vehicle Condition Form',version:VERSION,note:'Draft form from ResearchVessels.org. Not an official inspection record.',
  created:new Date().toISOString(),platform_id:$('vcf-form').getAttribute('data-platform')||null,header:hd,sections,sensors,sensor_notes:val('sens_notes'),
  signoff:{name:val('so_name'),date:val('so_date'),comments:clean($('f-so_comments').value,MAXLEN)}};
}
function tally(d){let ok=0,def=0,na=0,nc=0;const defs=[];d.sections.forEach(s=>s.items.forEach(i=>{if(i.status==='ok')ok++;else if(i.status==='def'){def++;defs.push(s.title+': '+i.label+(i.note?' ('+i.note+')':''))}else if(i.status==='na')na++;else nc++}));return {ok,def,na,nc,defs}}
function summaryText(d){
 const t=tally(d),H=d.header,L=[];
 L.push('Vehicle Condition Form (draft '+VERSION+')');
 L.push('Vehicle: '+(H.vname||'(not given)')+(H.vclass?' ['+H.vclass+']':''));
 if(H.operator)L.push('Operator: '+H.operator);
 if(H.insp_date)L.push('Inspected: '+H.insp_date+(H.inspector?' by '+H.inspector:''));
 L.push('Checks: '+t.ok+' OK, '+t.def+' deficient, '+t.na+' N/A, '+t.nc+' not checked');
 if(t.defs.length){L.push('Deficiencies:');t.defs.forEach(x=>L.push('- '+x))}
 L.push('','(The full form is a JSON file; attach it if you download it.)');
 return L.join('\n');
}
function mailtoHref(d){
 const body=summaryText(d).slice(0,1500);
 return 'mailto:'+CONTACT+'?subject='+encodeURIComponent('Vehicle Condition Form: '+(d.header.vname||'vehicle')).slice(0,300)+'&body='+encodeURIComponent(body);
}
function preview(d){
 const t=tally(d),box=$('vcf-preview');
 const rows=[];
 rows.push(h('p',{class:'mb-2'},h('strong',null,d.header.vname||'(vehicle not named)'),d.header.vclass?' \u00b7 '+d.header.vclass:'',d.header.operator?' \u00b7 '+d.header.operator:''));
 rows.push(h('p',{class:'mb-2',id:'vcf-tally'},t.ok+' OK \u00b7 '+t.def+' deficient \u00b7 '+t.na+' N/A \u00b7 '+t.nc+' not yet checked'));
 if(t.defs.length){const ul=h('ul',{class:'small mb-2',id:'vcf-defs'});t.defs.forEach(x=>ul.append(h('li',null,x)));rows.push(ul)}
 box.replaceChildren(...rows);
 $('vcf-mail').setAttribute('href',mailtoHref(d));
}
let timer=0;function changed(){clearTimeout(timer);timer=setTimeout(()=>preview(collect()),150)}
function download(){
 const d=collect(),blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='vehicle-condition-'+slug(d.header.vname)+'-'+(d.header.insp_date||new Date().toISOString().slice(0,10))+'.json';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
/* ---- prefill from the registry (?platform=<id>) ---- */
function setv(id,v){const e=$('f-'+id);if(!e||v==null||v==='')return;v=clean(v,300);if(e.tagName==='SELECT'){const o=[...e.options].find(x=>x.value===v);if(o)e.value=v}else e.value=v}
function prefill(note){
 const raw=RV.qs('platform');
 if(raw==null||raw==='')return;
 const P=window.RVP;
 if(!P||!P.validId(raw)){note('The platform ID in the link is not valid, so the form is blank.');return}
 const p=P.find(raw);
 if(!p){note('No platform with that ID is in the registry, so the form is blank.');return}
 $('vcf-form').setAttribute('data-platform',p.platform_id);
 setv('vname',p.display_name||p.name);
 const cls=(P.CLASSES.find(c=>c[0]===p.platform_class)||[])[0];setv('vclass',cls);
 setv('autonomy',p.autonomy);
 setv('operator',p.operator_org);setv('owner',p.owner_org);setv('base',p.home_site);
 setv('maker',p.manufacturer);setv('model',p.model);setv('serial',p.serial_number);setv('year',p.commissioned);
 const d=P.depthOf&&P.depthOf(p);if(d)setv('ph_depth',d);
 const tb=$('vcf-sensors');(Array.isArray(p.sensors)?p.sensors:[]).slice(0,MAXSENS).forEach(s=>{if(s&&typeof s==='object')tb.append(sensorRow({kind:s.kind,maker:s.maker,model:s.model||s.name,serial:s.serial_number,cal:/^\d{4}-\d{2}-\d{2}$/.test(String(s.calibration_date))?s.calibration_date:''}))});
 const link=h('a',{href:P.detailHref(p.platform_id)},clean(p.display_name||p.name,120));
 note(['Pre-filled from the registry entry for ',link,'. Check every value against the vehicle; the registry can be out of date.']);
}
function build(){
 const root=$('vcf-root');
 const note=h('div',{class:'alert alert-info small vcf-noprint',id:'vcf-note',role:'status',hidden:''});
 const setNote=m=>{note.replaceChildren(...(Array.isArray(m)?m:[m]));note.hidden=false};
 const form=h('form',{id:'vcf-form',novalidate:'',autocomplete:'off'});
 form.addEventListener('submit',e=>e.preventDefault());
 const head=h('section',{class:'card mb-3 vcf-section','data-section':'header','aria-labelledby':'vs-header'},h('div',{class:'card-body'},h('h2',{class:'h5 card-title',id:'vs-header'},'1. Vehicle and inspection'),h('div',{class:'row g-2',id:'vcf-header-row'})));
 const hr=head.querySelector('#vcf-header-row');
 HEADER.forEach(([id,label,a,b])=>{const type=b||(a==='date'?'date':(a==='select'?'select':'text'));let opts;if(id==='vclass')opts=window.RVP.CLASSES.concat([['other','Other']]);if(id==='autonomy')opts=window.RV.AUTONOMY_LEVELS.map(x=>[x,x]);hr.append(field(id,label,type,opts))});
 form.append(head);
 SECTIONS.forEach((s,i)=>form.append(sectionEl(s,i)));
 form.append(sensorsEl());
 const so=h('section',{class:'card mb-3 vcf-section','data-section':'signoff','aria-labelledby':'vs-so'},h('div',{class:'card-body'},h('h2',{class:'h5 card-title',id:'vs-so'},(SECTIONS.length+3)+'. Sign-off'),
  h('div',{class:'row g-2'},field('so_name','Name and role of the person completing this form','text'),field('so_date','Date','date'),
   h('div',{class:'col-12'},h('label',{class:'form-label small mb-1',for:'f-so_comments'},'Comments and open items'),h('textarea',{class:'form-control form-control-sm',id:'f-so_comments',name:'so_comments',rows:'3',maxlength:String(MAXLEN)})))));
 form.append(so);
 const prev=h('section',{class:'card mb-3 vcf-noprint','aria-labelledby':'vs-out'},h('div',{class:'card-body'},h('h2',{class:'h5 card-title',id:'vs-out'},'Summary and outputs'),h('div',{id:'vcf-preview',class:'mb-3',role:'status'}),
  h('p',{class:'small text-body-secondary'},'Nothing on this page is saved or sent automatically. These buttons only work on your own computer.'),
  h('div',{class:'d-flex flex-wrap gap-2'},
   h('button',{type:'button',class:'btn btn-primary',id:'vcf-print'},'Print or save as PDF'),
   h('button',{type:'button',class:'btn btn-outline-primary',id:'vcf-json'},'Download as JSON'),
   h('a',{class:'btn btn-outline-secondary',id:'vcf-mail',href:'mailto:'+CONTACT,'data-mail':'1'},'Open an e-mail draft to '+CONTACT),
   h('button',{type:'button',class:'btn btn-outline-danger',id:'vcf-reset'},'Clear the form')),
  h('p',{class:'small text-body-secondary mt-2 mb-0'},'The e-mail draft opens in your own mail program with a short summary. Attach the JSON file yourself if you want to send the full form. Sending is up to you.')));
 form.append(prev);
 root.replaceChildren(note,form);
 $('vcf-print').addEventListener('click',()=>window.print());
 $('vcf-json').addEventListener('click',download);
 $('vcf-reset').addEventListener('click',()=>{if(confirm('Clear everything on this form?')){form.reset();$('vcf-sensors').replaceChildren();form.removeAttribute('data-platform');preview(collect())}});
 form.addEventListener('input',changed);form.addEventListener('change',changed);
 prefill(setNote);preview(collect());
}
window.RV_VCF={SECTIONS,HEADER,collect,summaryText,mailtoHref,build};
document.addEventListener('DOMContentLoaded',build);
})();
