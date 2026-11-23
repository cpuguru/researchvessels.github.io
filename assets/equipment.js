/* On-board equipment and operator-maintained specs (prototype).
   - RV_EQ.renderPublic(id, vessel, anchor): "On-board equipment" + provenance on vessel.html, for any vessel id.
   - RV_EQ.initEditor(hostId, pickId): operator editor on operators.html; produces a change submission (JSON download + mailto summary).
   Data: data/equipment.js (window.RV_EQUIP), assets/equipment_vocab.js (window.RV_EQ_VOCAB), assets/i18n/strings.*.js (window.RV_STRINGS).
   Security: external/user strings only ever become text nodes or attributes via RV.h (href/src through RV.safeUrl);
   form values are set through .value; no innerHTML with data. mailto: hrefs are built from a constant address plus encodeURIComponent. */
(function(){
 'use strict';
 const own=(o,k)=>o!=null&&typeof o==='object'&&Object.prototype.hasOwnProperty.call(o,k);
 const str=x=>x==null?'':String(x),arr=x=>Array.isArray(x)?x:[];
 const VOC=window.RV_EQ_VOCAB||{categories:[],quantities:{},profile_fields:[],measure_params:[],statuses:[],roles:[],contact_roles:[],languages:[],l22:{},limits:{}};
 const LIM=Object.assign({name:120,make:80,model:80,specs:300,notes:1000,category_other:60,source:300,homeport:120,contact_url:300,email:254,items:400,contacts:12,quantity_max:999},VOC.limits||{});
 const S=(k,vars)=>{const T=window.RV_STRINGS||{};let s=own(T,k)?String(T[k]):k;if(vars)for(const [a,b] of Object.entries(vars))s=s.split('{'+a+'}').join(str(b));return s};
 const CAT={};arr(VOC.categories).forEach(c=>{if(c&&c.key)CAT[c.key]=c});
 const CAT_KEYS=arr(VOC.categories).map(c=>c.key);
 const QTY=VOC.quantities||{},PF=arr(VOC.profile_fields),MP={};arr(VOC.measure_params).forEach(m=>{if(Array.isArray(m))MP[m[0]]={label:m[1],q:m[2]}});
 const STATUSES=['installed','planned','removed'];
 const DATE=/^\d{4}-\d{2}-\d{2}$/,EMAIL=/^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(\.[A-Za-z0-9-]{1,63})*\.[A-Za-z]{2,24}$/,L22RE=/^TOOL\d{4}$/,LANGRE=/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/,CTRL=/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/;
 const PERSONAL=/^[a-z]+[._-][a-z]+$|^[a-z]\.?[a-z]{2,}$/i,ROLEW=/ops|operation|marine|ship|vessel|science|tech|info|office|schedul|enquir|contact|admin|support|research|fleet|desk|team|group/i;
 const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
 const okDate=d=>typeof d==='string'&&DATE.test(d)?d:'';
 const num=x=>typeof x==='number'&&isFinite(x);
 const h=(...a)=>window.RV.h(...a);
 const data=()=>{const D=window.RV_EQUIP;return D&&typeof D==='object'&&D.vessels&&typeof D.vessels==='object'?D:{vessels:{}}};
 const recordFor=id=>{const D=data();return own(D.vessels,id)&&D.vessels[id]&&typeof D.vessels[id]==='object'?D.vessels[id]:null};
 const catLabel=it=>it&&it.category==='other'&&it.category_other?str(it.category_other).slice(0,LIM.category_other):(CAT[it&&it.category]?CAT[it.category].label:'Other');
 const unitFactor=(q,u)=>{const Q=QTY[q];return Q&&Q.units&&own(Q.units,u)&&num(Q.units[u])?Q.units[u]:null};
 const unitLabel=u=>u==='m2'?'m²':u==='m3'?'m³':u==='ft2'?'ft²':str(u);
 /* SI value -> "12.3 kn" in the display unit (falls back to SI). */
 const fmtQ=(v,q,disp)=>{if(q==='text')return str(v);if(!num(v))return '';const Q=QTY[q]||{};let u=disp&&unitFactor(q,disp)?disp:(Q.si||'');const f=unitFactor(q,u)||1;const x=v/f;const r=Math.abs(x)>=100?Math.round(x):Math.round(x*100)/100;return r.toLocaleString('en')+(u?' '+unitLabel(u):'')};
 const fmtMeasure=m=>{if(!m||!own(MP,m.param)||!num(m.value_si))return '';return MP[m.param].label+' '+fmtQ(m.value_si,MP[m.param].q,m.display_unit)};
 const badge=ver=>ver==='operator-verified'
  ?h('span',{class:'badge text-bg-success fw-normal',title:S('eq.badge.verifiedTitle')},S('eq.badge.verified'))
  :h('span',{class:'badge text-bg-light border fw-normal',title:S('eq.badge.compiledTitle')},S('eq.badge.compiled'));
 const statusBadge=s=>{const k=STATUSES.includes(s)?s:'installed';return h('span',{class:'badge fw-normal '+(k==='installed'?'bg-success-subtle text-success-emphasis':k==='planned'?'bg-info-subtle text-info-emphasis':'text-bg-secondary')},S('eq.status.'+k))};
 const link=(u,t)=>{const s=window.RV.safeUrl(u);return s&&/^https?:/i.test(s)?h('a',{href:s,rel:'noopener'},t):null};
 const mailtoEl=(email,text)=>{if(typeof email!=='string'||!EMAIL.test(email))return null;const a=document.createElement('a');a.setAttribute('href','mailto:'+email);a.textContent=text||email;return a};
 const l22Link=c=>typeof c==='string'&&L22RE.test(c)?h('a',{href:'https://vocab.nerc.ac.uk/collection/L22/current/'+c+'/',rel:'noopener',title:str(own(VOC.l22,c)?VOC.l22[c]:'')},c):null;
 const daysSince=d=>{if(!okDate(d))return Infinity;return (Date.now()-new Date(d+'T00:00:00').getTime())/864e5};
 /* Core fields from vessels.json, presented as compiled values with the registry's source string. */
 const coreProfile=v=>{const out={},n=x=>{const f=parseFloat(String(x==null?'':x).replace(/,/g,''));return isFinite(f)?f:null};
  PF.forEach(f=>{if(!f.core||!v||v[f.core]==null||v[f.core]==='')return;const val=f.quantity==='text'?str(v[f.core]):n(v[f.core]);if(val==null)return;
   out[f.key]={value:val,display_unit:f.display||null,prov:{verification:'compiled',source:str(v.src),by_role:'ResearchVessels.org compiler'}}});return out};
 const mergedProfile=(v,rec)=>{const core=coreProfile(v),p=rec&&rec.profile&&typeof rec.profile==='object'?rec.profile:{},out={};
  PF.forEach(f=>{const x=own(p,f.key)&&p[f.key]&&typeof p[f.key]==='object'?p[f.key]:(own(core,f.key)?core[f.key]:null);if(x)out[f.key]=x});return out};
 const notesNodes=it=>{const N=it&&it.notes&&typeof it.notes==='object'?it.notes:{},orig=LANGRE.test(str(it&&it.notes_original_lang))?it.notes_original_lang:(own(N,'en')?'en':Object.keys(N).find(k=>LANGRE.test(k)));
  if(!orig||!own(N,orig)||!str(N[orig]))return null;const o=h('div',{lang:orig},str(N[orig]).slice(0,LIM.notes));
  if(orig!=='en'){o.append(' ',h('span',{class:'text-body-secondary small'},'(',S('eq.lang.original',{lang:orig}),')'));if(own(N,'en')&&str(N.en))return [o,h('div',{lang:'en',class:'text-body-secondary'},'EN: ',str(N.en).slice(0,LIM.notes))]}
  return o};

 /* ---------------- Public vessel page ---------------- */
 function renderPublic(id,v,anchor){
  if(!window.RV||!v)return;
  const rec=recordFor(id),items=arr(rec&&rec.items).filter(it=>it&&typeof it==='object'&&str(it.name));
  const lv=okDate(rec&&rec.last_operator_verified);
  /* Last verified by operator: under the vessel name. */
  const head=document.getElementById('vx-head');
  if(head){const p=h('p',{class:'small mb-2',id:'eq-verified'});
   if(lv){p.append(badge('operator-verified'),' ',S('eq.verified.on',{date:lv}));if(daysSince(lv)>365)p.append(' ',h('span',{class:'text-warning-emphasis'},S('eq.verified.stale')))}
   else p.append(badge('compiled'),' ',S('eq.verified.never'),' ',h('a',{href:window.RV.operatorsHref(id)+'#eq-editor'},S('eq.public.invite')));
   head.append(p)}
  const sec=h('section',{class:'card mt-4',id:'eq-public','aria-labelledby':'eq-public-h'});
  const body=h('div',{class:'card-body'},h('h2',{class:'h5 card-title',id:'eq-public-h'},S('eq.public.title'),' ',items.length?h('span',{class:'badge bg-primary-subtle text-primary-emphasis align-middle'},String(items.filter(i=>i.status!=='removed').length)):null));
  sec.append(body);
  if(!items.length){body.append(h('p',{class:'small mb-2'},S('eq.public.none'),' ',h('a',{href:window.RV.operatorsHref(id)+'#eq-editor'},S('eq.public.invite'))))}
  else{
   body.append(h('p',{class:'small text-body-secondary'},S('eq.public.intro')));
   const groups={};items.forEach(it=>{const k=CAT_KEYS.includes(it.category)?(it.category==='other'?'other:'+str(it.category_other).slice(0,LIM.category_other):it.category):'other:';(groups[k]=groups[k]||[]).push(it)});
   const order=k=>{const i=CAT_KEYS.indexOf(k.split(':')[0]);return i<0?99:i};
   const tb=h('tbody');
   Object.keys(groups).sort((a,b)=>order(a)-order(b)||a.localeCompare(b)).forEach(k=>{
    const G=groups[k],upd=G.map(i=>okDate(i.updated_at)).filter(Boolean).sort().pop()||'',allV=G.every(i=>i.prov&&i.prov.verification==='operator-verified');
    tb.append(h('tr',{class:'table-light'},h('th',{colspan:'6',scope:'rowgroup',class:'small'},catLabel(G[0]),' ',h('span',{class:'fw-normal text-body-secondary'},'(',String(G.length),')'),upd?[' · ',h('span',{class:'fw-normal'},S('eq.public.lastUpdated',{date:upd}))]:null,' ',badge(allV?'operator-verified':'compiled'))));
    G.forEach(it=>{const mm=[str(it.make),str(it.model)].filter(Boolean).join(' ');const pv=it.prov&&typeof it.prov==='object'?it.prov:{};
     const qty=Number.isInteger(it.quantity)&&it.quantity>1?String(it.quantity)+' × ':'';const ms=fmtMeasure(it.measure);
     tb.append(h('tr',{class:it.status==='removed'?'text-body-secondary':null},
      h('td',{},h('span',{class:'fw-semibold'},str(it.name).slice(0,LIM.name)),mm?h('div',{class:'small'},mm.slice(0,170)):null,it.l22?h('div',{class:'small'},l22Link(it.l22)):null),
      h('td',{class:'small'},qty,str(it.specs).slice(0,LIM.specs),ms?h('div',{},ms):null),
      h('td',{},statusBadge(it.status)),
      h('td',{class:'small'},notesNodes(it)),
      h('td',{class:'small text-nowrap'},okDate(it.updated_at),it.updated_by_role?h('div',{class:'text-body-secondary'},str(it.updated_by_role).slice(0,80)):null),
      h('td',{class:'small'},badge(pv.verification),' ',link(pv.source_url,'source')||(pv.source?h('span',{class:'text-body-secondary'},str(pv.source).slice(0,120)):null))))})});
   body.append(h('div',{class:'table-responsive rv-scroll border rounded bg-white',style:'max-height:60vh'},h('table',{class:'table table-sm align-top mb-0'},
    h('thead',{class:'table-light'},h('tr',{},['eq.col.item','eq.col.qty','eq.col.status','eq.col.notes','eq.col.updated','eq.col.source'].map(k=>h('th',{scope:'col'},S(k))))),tb)));
   body.append(h('p',{class:'small text-body-secondary mt-2 mb-0'},S('eq.public.vocab'),items.some(i=>i.status==='removed')?' '+S('eq.public.removedNote'):''));
  }
  /* Specs + contacts with per-field provenance. */
  const MPF=mergedProfile(v,rec),dl=h('dl',{class:'row small mb-0'});
  PF.forEach(f=>{if(!own(MPF,f.key))return;const x=MPF[f.key],pv=x.prov||{};const val=fmtQ(x.value,f.quantity,x.display_unit||f.display);if(!val)return;
   dl.append(h('dt',{class:'col-5 col-md-3 fw-normal text-body-secondary'},f.label),h('dd',{class:'col-7 col-md-9 mb-1'},val,' ',badge(pv.verification),pv.at&&okDate(pv.at)?h('span',{class:'text-body-secondary'},' ',okDate(pv.at)):null,' ',link(pv.source_url,'source')||(pv.source?h('span',{class:'text-body-secondary'},'· ',str(pv.source).slice(0,160)):null)))});
  const sp=h('div',{class:'mt-4'},h('h3',{class:'h6'},S('eq.public.specsTitle')),dl);
  if(rec&&typeof rec.ices_code==='string'&&/^[0-9A-Z]{4}$/.test(rec.ices_code))dl.append(h('dt',{class:'col-5 col-md-3 fw-normal text-body-secondary'},'ICES ship code (C17)'),h('dd',{class:'col-7 col-md-9 mb-1'},h('a',{href:'https://vocab.nerc.ac.uk/collection/C17/current/'+rec.ices_code+'/',rel:'noopener'},rec.ices_code)));
  const C=arr(rec&&rec.contacts).filter(c=>c&&typeof c==='object');
  if(C.length){const ul=h('ul',{class:'small mb-0'});const RL={};arr(VOC.contact_roles).forEach(r=>RL[r.key]=r.label);
   C.slice(0,LIM.contacts).forEach(c=>{const m=mailtoEl(c.email),u=link(c.url,str(c.url).replace(/^https?:\/\//,'').slice(0,60));if(!m&&!u)return;ul.append(h('li',{},h('span',{class:'text-body-secondary'},str(RL[c.role]||'Contact'),': '),m,m&&u?' · ':null,u,' ',badge(c.prov&&c.prov.verification)))});
   sp.append(h('h3',{class:'h6 mt-3'},S('eq.public.contacts')),ul)}
  arr(rec&&rec.transfers).forEach(t=>{if(!t||typeof t!=='object')return;sp.append(h('div',{class:'alert alert-secondary small mt-3 mb-0',role:'note'},h('strong',{},S('eq.public.transfer'),' (',str(t.date).slice(0,10),'): '),str(t.from_operator).slice(0,300),' → ',str(t.to_operator).slice(0,300),'. ',str(t.note).slice(0,300),' ',link(t.source_url,'source')))});
  body.append(sp);
  if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(sec,anchor);else{const host=document.getElementById('v');if(host)host.append(sec)}
 }

 /* ---------------- Operator editor ---------------- */
 const clone=o=>JSON.parse(JSON.stringify(o==null?null:o));
 const rid=()=>{const a=new Uint8Array(6);(window.crypto&&crypto.getRandomValues?crypto.getRandomValues(a):a.forEach((_,i)=>a[i]=Math.floor(Math.random()*256)));return Array.from(a,b=>b.toString(16).padStart(2,'0')).join('')};
 function vText(val,lim,req){const s=str(val).trim();if(!s)return req?S('eq.err.required'):'';if(s.length>lim)return S('eq.err.tooLong',{n:lim});if(CTRL.test(s))return S('eq.err.required');return ''}
 function vNum(val){const s=str(val).trim();if(!s)return '';const f=Number(s.replace(/,/g,''));return isFinite(f)&&f>=0&&f<1e12?'':S('eq.err.number')}
 function vUrl(val){const s=str(val).trim();if(!s)return '';return /^https?:\/\/[^\s/]+/i.test(s)&&window.RV.safeUrl(s)&&s.length<=LIM.contact_url?'':S('eq.err.url')}
 function vEmail(val,req){const s=str(val).trim();if(!s)return req?S('eq.err.required'):'';return s.length<=LIM.email&&EMAIL.test(s)?'':S('eq.err.email')}
 const personalHint=e=>{const l=str(e).split('@')[0];return PERSONAL.test(l)&&!ROLEW.test(l)};
 let fid=0;
 /* Labelled control with an error slot. kind: input|select|textarea. */
 function field(label,kind,attrs,opts){const id=attrs&&attrs.id?String(attrs.id):'eqf'+(++fid);const ctl=h(kind,Object.assign({class:kind==='select'?'form-select form-select-sm':'form-control form-control-sm',id,'aria-describedby':id+'-err'},attrs||{}));
  if(kind==='select')arr(opts).forEach(([v,t])=>ctl.append(h('option',{value:v},t)));
  const err=h('div',{class:'small text-danger',id:id+'-err'});
  const wrap=h('div',{},h('label',{class:'form-label small fw-semibold mb-1',for:id},label),ctl,err);
  const set=m=>{err.textContent=m||'';ctl.classList.toggle('is-invalid',!!m);return !m};
  return {wrap,ctl,set}}
 function unitOpts(q){const Q=QTY[q];return Q&&Q.units?Object.keys(Q.units).map(u=>[u,unitLabel(u)||'—']):[]}

 function initEditor(hostId,pickId){
  const host=document.getElementById(hostId),pick=document.getElementById(pickId);if(!host||!pick||!window.RV)return;
  const B=window.RV.byId();
  const roleOpts=arr(VOC.roles).map(r=>[r.key,r.label]),langOpts=arr(VOC.languages).filter(l=>Array.isArray(l)&&LANGRE.test(l[0])).map(l=>[l[0],l[1]+' ('+l[0]+')']);
  /* Submitter block (kept across vessel switches). */
  const fRole=field(S('eq.ed.role'),'select',{},roleOpts),fEmail=field(S('eq.ed.email'),'input',{type:'email',maxlength:String(LIM.email),autocomplete:'email',inputmode:'email'}),fLang=field(S('eq.ed.lang'),'select',{},langOpts);
  fEmail.wrap.append(h('div',{class:'form-text'},S('eq.ed.emailHelp')));
  const fReview=field(S('eq.ed.reviewNotes'),'textarea',{rows:'2',maxlength:String(LIM.source)});
  const confirm=h('input',{type:'checkbox',class:'form-check-input',id:'eq-confirm'});
  const specsHost=h('div'),contactsHost=h('div'),itemsHost=h('div'),formHost=h('div'),out=h('div',{id:'eq-out','aria-live':'polite'});
  const btnBuild=h('button',{type:'button',class:'btn btn-primary',id:'eq-build'},S('eq.ed.build'));
  host.replaceChildren(
   h('h2',{class:'h4 mt-5 mb-2',id:'eq-editor-h'},S('eq.ed.title')),
   h('p',{class:'text-body-secondary'},S('eq.ed.intro')),
   h('div',{class:'card'},h('div',{class:'card-body'},
    h('h3',{class:'h6'},S('eq.ed.who')),
    h('div',{class:'row g-3'},h('div',{class:'col-12 col-md-4'},fRole.wrap),h('div',{class:'col-12 col-md-5'},fEmail.wrap),h('div',{class:'col-12 col-md-3'},fLang.wrap)),
    h('h3',{class:'h6 mt-4'},S('eq.ed.specs')),h('p',{class:'small text-body-secondary mb-2'},S('eq.ed.specsHelp')),specsHost,
    h('h3',{class:'h6 mt-4'},S('eq.ed.contacts')),h('p',{class:'small text-body-secondary mb-2'},S('eq.ed.contactsHelp')),contactsHost,
    h('h3',{class:'h6 mt-4'},S('eq.ed.equipment')),itemsHost,formHost,
    h('div',{class:'mt-4'},fReview.wrap),
    h('div',{class:'form-check mt-3'},confirm,h('label',{class:'form-check-label small',for:'eq-confirm'},S('eq.ed.confirmAll'))),
    h('p',{class:'mt-3 d-flex flex-wrap gap-2 mb-2'},btnBuild),
    h('p',{class:'small text-body-secondary mb-2'},S('eq.ed.queue')),out)));
  let st=null;
  function load(){
   const id=pick.value,v=B[id];if(!v)return;const rec=recordFor(id);
   const base={profile:mergedProfile(v,rec),contacts:clone(arr(rec&&rec.contacts)).filter(c=>c&&typeof c==='object'),items:clone(arr(rec&&rec.items)).filter(i=>i&&typeof i==='object'&&typeof i.id==='string')};
   st={id,v,rec,base,items:clone(base.items),removed:new Set(),contacts:clone(base.contacts),spec:{},editing:null};
   renderSpecs();renderContacts();renderItems();formHost.replaceChildren();out.replaceChildren();confirm.checked=false}
  /* Specs: value + unit for each profile field, prefilled in the display unit. */
  function renderSpecs(){
   const row=h('div',{class:'row g-3'});st.spec={};
   PF.forEach(f=>{const cur=own(st.base.profile,f.key)?st.base.profile[f.key]:null;
    if(f.quantity==='text'){const F=field(f.label,'input',{maxlength:String(LIM.homeport)});F.ctl.value=cur?str(cur.value):'';st.spec[f.key]={F};row.append(h('div',{class:'col-12 col-md-6 col-lg-4'},F.wrap,cur?h('div',{class:'small mt-1'},badge(cur.prov&&cur.prov.verification)):null));return}
    const units=unitOpts(f.quantity),disp=(cur&&cur.display_unit&&unitFactor(f.quantity,cur.display_unit))?cur.display_unit:(f.display||(QTY[f.quantity]||{}).si||'');
    const F=field(f.label,'input',{inputmode:'decimal',maxlength:'14'});
    let U=null;if(units.length>1){U=h('select',{class:'form-select form-select-sm',style:'max-width:7rem','aria-label':f.label+' · '+S('eq.ed.unit')});units.forEach(([a,b])=>U.append(h('option',{value:a},b)));U.value=disp}
    if(cur&&num(cur.value)){const fac=unitFactor(f.quantity,disp)||1;const x=cur.value/fac;F.ctl.value=String(Math.round(x*1000)/1000)}
    if(U){const g=h('div',{class:'input-group input-group-sm'});F.ctl.replaceWith(g);g.append(F.ctl,U)}
    st.spec[f.key]={F,U,disp};
    row.append(h('div',{class:'col-6 col-md-4 col-lg-3'},F.wrap,cur?h('div',{class:'small mt-1'},badge(cur.prov&&cur.prov.verification)):null))});
   specsHost.replaceChildren(row,(()=>{const F=field(S('eq.ed.source'),'input',{maxlength:String(LIM.source),placeholder:'https://… or document'});st.specSource=F;return h('div',{class:'mt-2'},F.wrap)})())}
  function renderContacts(){
   const list=h('div',{class:'d-flex flex-column gap-2'});const RL=arr(VOC.contact_roles).map(r=>[r.key,r.label]);
   st.contactRows=[];
   st.contacts.forEach((c,i)=>{const fr=field(S('eq.ed.contactRole'),'select',{},RL),fe=field(S('eq.ed.contactEmail'),'input',{type:'email',maxlength:String(LIM.email)}),fu=field(S('eq.ed.contactUrl'),'input',{type:'url',maxlength:String(LIM.contact_url)});
    fr.ctl.value=str(c.role);fe.ctl.value=str(c.email);fu.ctl.value=str(c.url);
    const rm=h('button',{type:'button',class:'btn btn-sm btn-outline-danger','aria-label':S('eq.ed.remove')+' '+(i+1)},S('eq.ed.remove'));
    rm.addEventListener('click',()=>{sync();st.contacts.splice(i,1);renderContacts()});
    st.contactRows.push({fr,fe,fu});
    list.append(h('div',{class:'row g-2 align-items-end'},h('div',{class:'col-12 col-md-3'},fr.wrap),h('div',{class:'col-12 col-md-4'},fe.wrap),h('div',{class:'col-12 col-md-4'},fu.wrap),h('div',{class:'col-12 col-md-1'},rm)))});
   const add=h('button',{type:'button',class:'btn btn-sm btn-outline-primary mt-2',id:'eq-add-contact'},S('eq.ed.addContact'));
   add.disabled=st.contacts.length>=LIM.contacts;
   add.addEventListener('click',()=>{sync();st.contacts.push({role:'marine_operations',email:'',url:''});renderContacts()});
   contactsHost.replaceChildren(st.contacts.length?list:h('p',{class:'small text-body-secondary mb-0'},S('eq.ed.none')),add)}
  function sync(){(st.contactRows||[]).forEach((r,i)=>{if(st.contacts[i])Object.assign(st.contacts[i],{role:r.fr.ctl.value,email:r.fe.ctl.value.trim(),url:r.fu.ctl.value.trim()})})}
  function renderItems(){
   const tb=h('tbody');const all=st.items;
   const sorted=all.slice().sort((a,b)=>(CAT_KEYS.indexOf(a.category)-CAT_KEYS.indexOf(b.category))||str(a.name).localeCompare(str(b.name)));
   let last=null;
   sorted.forEach(it=>{const k=it.category+':'+str(it.category_other);if(k!==last){last=k;tb.append(h('tr',{class:'table-light'},h('th',{colspan:'4',scope:'rowgroup',class:'small'},catLabel(it))))}
    const gone=st.removed.has(it.id),isNew=/^new-/.test(it.id);
    const ed=h('button',{type:'button',class:'btn btn-sm btn-outline-secondary','data-eq-edit':it.id},S('eq.ed.edit'));ed.disabled=gone;ed.addEventListener('click',()=>openForm(it.id));
    const rm=h('button',{type:'button',class:'btn btn-sm '+(gone?'btn-outline-primary':'btn-outline-danger'),'data-eq-remove':it.id},gone?S('eq.ed.undo'):S('eq.ed.remove'));
    rm.addEventListener('click',()=>{if(isNew){st.items=st.items.filter(x=>x.id!==it.id)}else if(gone)st.removed.delete(it.id);else st.removed.add(it.id);renderItems()});
    tb.append(h('tr',{class:gone?'text-decoration-line-through text-body-secondary':null},h('td',{},str(it.name).slice(0,LIM.name),h('div',{class:'small text-body-secondary'},[str(it.make),str(it.model)].filter(Boolean).join(' ').slice(0,170))),h('td',{},statusBadge(it.status)),h('td',{class:'small'},badge(it.prov&&it.prov.verification)),h('td',{class:'text-nowrap text-end'},ed,' ',rm)))});
   const add=h('button',{type:'button',class:'btn btn-sm btn-outline-primary mt-2',id:'eq-add-item'},S('eq.ed.addItem'));add.disabled=st.items.length>=LIM.items;add.addEventListener('click',()=>openForm(null));
   itemsHost.replaceChildren(all.length?h('div',{class:'table-responsive rv-scroll border rounded bg-white',style:'max-height:45vh'},h('table',{class:'table table-sm align-middle mb-0'},tb)):h('p',{class:'small text-body-secondary mb-0'},S('eq.ed.empty')),add)}
  /* Add / edit one item. */
  function openForm(itemId){
   const it=itemId?st.items.find(x=>x.id===itemId):null;const src=it||{category:'acoustics',status:'installed',notes:{},notes_original_lang:fLang.ctl.value||'en'};
   const fCat=field(S('eq.ed.category'),'select',{id:'eq-i-cat'},arr(VOC.categories).map(c=>[c.key,c.label])),fOther=field(S('eq.ed.categoryOther'),'input',{id:'eq-i-catother',maxlength:String(LIM.category_other)});
   const fName=field(S('eq.ed.name'),'input',{id:'eq-i-name',maxlength:String(LIM.name)}),fMake=field(S('eq.ed.make'),'input',{id:'eq-i-make',maxlength:String(LIM.make)}),fModel=field(S('eq.ed.model'),'input',{id:'eq-i-model',maxlength:String(LIM.model)});
   const dlId='eq-l22-list';const fL22=field(S('eq.ed.l22'),'input',{id:'eq-i-l22',maxlength:'8',list:dlId,placeholder:'TOOL1234'});
   const dl=h('datalist',{id:dlId});Object.entries(VOC.l22||{}).forEach(([c,l])=>{if(L22RE.test(c))dl.append(h('option',{value:c,label:str(l)},str(l)))});
   const fL05=field(S('eq.ed.l05'),'select',{id:'eq-i-l05'},[]);
   const fQty=field(S('eq.ed.quantity'),'input',{id:'eq-i-qty',inputmode:'numeric',maxlength:'3'}),fStatus=field(S('eq.ed.status'),'select',{id:'eq-i-status'},STATUSES.map(s=>[s,S('eq.status.'+s)]));
   const fSpecs=field(S('eq.ed.specsText'),'input',{id:'eq-i-specs',maxlength:String(LIM.specs)});
   const fMp=field(S('eq.ed.measure'),'select',{id:'eq-i-mparam'},[['','—']].concat(Object.entries(MP).map(([k,m])=>[k,m.label]))),fMv=field(S('eq.ed.measureValue'),'input',{id:'eq-i-mval',inputmode:'decimal',maxlength:'14'}),fMu=field(S('eq.ed.unit'),'select',{id:'eq-i-munit'},[]);
   const fNl=field(S('eq.ed.lang'),'select',{id:'eq-i-nlang'},langOpts),fNotes=field(S('eq.ed.notes'),'textarea',{id:'eq-i-notes',rows:'2',maxlength:String(LIM.notes)}),fNen=field(S('eq.ed.notesEn'),'textarea',{id:'eq-i-notesen',rows:'2',maxlength:String(LIM.notes),lang:'en'});
   const fSrc=field(S('eq.ed.source'),'input',{id:'eq-i-src',maxlength:String(LIM.source)});
   const l05fill=()=>{const c=CAT[fCat.ctl.value];fL05.ctl.replaceChildren(h('option',{value:''},'—'),...arr(c&&c.l05).map(x=>h('option',{value:x.code},x.code+' · '+x.label)));(fOther.wrap.parentNode||fOther.wrap).hidden=fCat.ctl.value!=='other'};
   const mufill=()=>{const p=MP[fMp.ctl.value];fMu.ctl.replaceChildren(...(p?unitOpts(p.q).map(([a,b])=>h('option',{value:a},b)):[h('option',{value:''},'—')]))};
   const nfill=()=>{(fNen.wrap.parentNode||fNen.wrap).hidden=fNl.ctl.value==='en'};
   fCat.ctl.value=CAT_KEYS.includes(src.category)?src.category:'other';l05fill();fL05.ctl.value=str(src.l05);fOther.ctl.value=str(src.category_other);
   fName.ctl.value=str(src.name);fMake.ctl.value=str(src.make);fModel.ctl.value=str(src.model);fL22.ctl.value=str(src.l22);
   fQty.ctl.value=Number.isInteger(src.quantity)?String(src.quantity):'';fStatus.ctl.value=STATUSES.includes(src.status)?src.status:'installed';fSpecs.ctl.value=str(src.specs);
   const m=src.measure&&own(MP,src.measure.param)?src.measure:null;fMp.ctl.value=m?m.param:'';mufill();
   if(m&&num(m.value_si)){const u=m.display_unit&&unitFactor(MP[m.param].q,m.display_unit)?m.display_unit:(QTY[MP[m.param].q]||{}).si;fMu.ctl.value=u;fMv.ctl.value=String(Math.round(m.value_si/(unitFactor(MP[m.param].q,u)||1)*1000)/1000)}
   const N=src.notes&&typeof src.notes==='object'?src.notes:{},ol=LANGRE.test(str(src.notes_original_lang))?src.notes_original_lang:(fLang.ctl.value||'en');
   if(![...fNl.ctl.options].some(o=>o.value===ol))fNl.ctl.append(h('option',{value:ol},ol));fNl.ctl.value=ol;fNotes.ctl.value=str(N[ol]);fNen.ctl.value=ol!=='en'?str(N.en):'';nfill();
   fCat.ctl.addEventListener('input',l05fill);fMp.ctl.addEventListener('input',mufill);fNl.ctl.addEventListener('input',nfill);
   const save=h('button',{type:'button',class:'btn btn-sm btn-primary',id:'eq-i-save'},S('eq.ed.save')),cancel=h('button',{type:'button',class:'btn btn-sm btn-outline-secondary'},S('eq.ed.cancel'));
   cancel.addEventListener('click',()=>formHost.replaceChildren());
   save.addEventListener('click',()=>{
    let ok=true;const chk=(F,msg)=>{ok=F.set(msg)&&ok};
    chk(fName,vText(fName.ctl.value,LIM.name,true));chk(fMake,vText(fMake.ctl.value,LIM.make));chk(fModel,vText(fModel.ctl.value,LIM.model));chk(fSpecs,vText(fSpecs.ctl.value,LIM.specs));
    chk(fOther,fCat.ctl.value==='other'?vText(fOther.ctl.value,LIM.category_other,true):vText(fOther.ctl.value,LIM.category_other));
    chk(fL22,fL22.ctl.value.trim()&&!L22RE.test(fL22.ctl.value.trim())?S('eq.err.l22'):'');
    const q=fQty.ctl.value.trim();chk(fQty,q&&!(/^\d{1,3}$/.test(q)&&+q>=1&&+q<=LIM.quantity_max)?S('eq.err.quantity',{n:LIM.quantity_max}):'');
    chk(fMv,fMp.ctl.value?(vNum(fMv.ctl.value)||(fMv.ctl.value.trim()?'':S('eq.err.required'))):'');
    chk(fNotes,vText(fNotes.ctl.value,LIM.notes));chk(fNen,vText(fNen.ctl.value,LIM.notes));chk(fNl,LANGRE.test(fNl.ctl.value)?'':S('eq.err.lang'));chk(fSrc,vText(fSrc.ctl.value,LIM.source));
    if(!CAT_KEYS.includes(fCat.ctl.value))ok=false;if(!STATUSES.includes(fStatus.ctl.value))ok=false;
    if(!ok){const bad=formHost.querySelector('.is-invalid');if(bad&&bad.focus)bad.focus();return}
    const nl=fNl.ctl.value,notes={};if(fNotes.ctl.value.trim())notes[nl]=fNotes.ctl.value.trim();if(nl!=='en'&&fNen.ctl.value.trim())notes.en=fNen.ctl.value.trim();
    const mp=fMp.ctl.value,mq=mp?MP[mp].q:null,mu=mp?fMu.ctl.value:null;
    const srcText=fSrc.ctl.value.trim();
    const nu={id:it?it.id:'new-'+rid(),category:fCat.ctl.value,category_other:fCat.ctl.value==='other'?fOther.ctl.value.trim():'',name:fName.ctl.value.trim(),make:fMake.ctl.value.trim(),model:fModel.ctl.value.trim(),
     l22:fL22.ctl.value.trim()||null,l05:fL05.ctl.value||null,quantity:q?+q:null,specs:fSpecs.ctl.value.trim(),
     measure:mp?{param:mp,value_si:Math.round(Number(fMv.ctl.value.replace(/,/g,''))*(unitFactor(mq,mu)||1)*1e6)/1e6,unit_si:(QTY[mq]||{}).si||'',display_unit:mu||null}:null,
     status:fStatus.ctl.value,notes,notes_original_lang:Object.keys(notes).length?nl:null,updated_at:today(),updated_by_role:(arr(VOC.roles).find(r=>r.key===fRole.ctl.value)||{}).label||'',
     prov:{verification:'operator-verified',source:srcText&&!/^https?:/i.test(srcText)?srcText:'Operator submission',source_url:/^https?:\/\//i.test(srcText)&&window.RV.safeUrl(srcText)?srcText:null,by_role:(arr(VOC.roles).find(r=>r.key===fRole.ctl.value)||{}).label||'',at:today()}};
    if(it){const i=st.items.findIndex(x=>x.id===it.id);st.items[i]=nu}else st.items.push(nu);
    formHost.replaceChildren();renderItems()});
   const g=(w,c)=>h('div',{class:c||'col-12 col-md-6 col-lg-4'},w);
   formHost.replaceChildren(h('div',{class:'card border-primary mt-3',id:'eq-item-form'},h('div',{class:'card-body'},h('h4',{class:'h6'},it?S('eq.ed.edit')+': '+str(it.name).slice(0,80):S('eq.ed.addItem')),
    h('div',{class:'row g-2'},g(fCat.wrap),g(fOther.wrap),g(fL05.wrap),g(fName.wrap),g(fMake.wrap),g(fModel.wrap),g([fL22.wrap,dl]),g(fQty.wrap,'col-6 col-md-3 col-lg-2'),g(fStatus.wrap,'col-6 col-md-3 col-lg-2'),g(fSpecs.wrap,'col-12 col-lg-8'),
     g(fMp.wrap),g(fMv.wrap,'col-6 col-md-3 col-lg-2'),g(fMu.wrap,'col-6 col-md-3 col-lg-2'),g(fNl.wrap),g(fNotes.wrap,'col-12 col-lg-8'),g(fNen.wrap,'col-12'),g(fSrc.wrap,'col-12')),
    h('p',{class:'d-flex gap-2 mt-3 mb-0'},save,cancel))));
   l05fill();fL05.ctl.value=str(src.l05);nfill();
   fName.ctl.focus&&fName.ctl.focus()}
  /* Build the change submission. */
  const CORE_MAP={name:'name',imo:'imo',mmsi:'mmsi',cs:'cs',owner:'owner',operator:'operator',flag:'country',status:'status',built:'built',url:'url',rebuilt_year:'rebuilt_year',rebuilt_note:'rebuilt_note',rebuilt_source:'rebuilt_source'};
  const stripItem=it=>{const o={};['id','category','category_other','name','make','model','l22','l05','quantity','specs','measure','status','notes','notes_original_lang','updated_at','updated_by_role','prov'].forEach(k=>{if(it[k]!==undefined)o[k]=it[k]});return o};
  const sameItem=(a,b)=>{const k=['category','category_other','name','make','model','l22','l05','quantity','specs','measure','status','notes','notes_original_lang'];const n=x=>x==null||x===''?null:x;return k.every(f=>JSON.stringify(n(a[f]))===JSON.stringify(n(b[f])))};
  function build(){
   sync();let ok=true;const chk=(F,m)=>{ok=F.set(m)&&ok};
   chk(fEmail,vEmail(fEmail.ctl.value,true));chk(fReview,vText(fReview.ctl.value,LIM.source));chk(st.specSource,vText(st.specSource.ctl.value,LIM.source));
   const prof=[];const srcT=st.specSource.ctl.value.trim();
   PF.forEach(f=>{const s=st.spec[f.key];if(!s)return;const cur=own(st.base.profile,f.key)?st.base.profile[f.key]:null;const raw=s.F.ctl.value.trim();
    if(f.quantity==='text'){const m=vText(raw,LIM.homeport);chk(s.F,m);if(m)return;const old=cur?str(cur.value):'';if(raw!==old)prof.push({field:f.key,old:cur?{value:cur.value}:null,new:raw?{value:raw}:null});return}
    const m=vNum(raw);chk(s.F,m);if(m)return;const u=s.U?s.U.value:(QTY[f.quantity]||{}).si||'';const fac=unitFactor(f.quantity,u)||1;
    const nv=raw?Math.round(Number(raw.replace(/,/g,''))*fac*1e6)/1e6:null,ov=cur&&num(cur.value)?cur.value:null;
    const changed=(nv==null)!==(ov==null)||(nv!=null&&Math.abs(nv-ov)>Math.max(1e-6,Math.abs(ov)*1e-4))||(nv!=null&&s.U&&u!==(cur&&cur.display_unit||s.disp));
    if(changed)prof.push({field:f.key,old:cur?{value:cur.value,display_unit:cur.display_unit||null}:null,new:nv==null?null:{value:nv,display_unit:s.U?u:null}})});
   (st.contactRows||[]).forEach(r=>{chk(r.fe,vEmail(r.fe.ctl.value,false));chk(r.fu,vUrl(r.fu.ctl.value));if(!r.fe.ctl.value.trim()&&!r.fu.ctl.value.trim())chk(r.fe,S('eq.err.required'));if(!r.fe.ctl.value.trim()||r.fe.ctl.value&&!personalHint(r.fe.ctl.value))return;r.fe.set(S('eq.warn.personal'));r.fe.ctl.classList.remove('is-invalid')});
   if(!ok){out.replaceChildren(h('div',{class:'alert alert-danger small mb-0'},S('eq.ed.fix')));const bad=host.querySelector('.is-invalid');if(bad&&bad.focus)bad.focus();return null}
   const cleanC=st.contacts.map(c=>({role:c.role,email:c.email||null,url:c.url||null}));const baseC=st.base.contacts.map(c=>({role:c.role,email:c.email||null,url:c.url||null}));
   const contactsChanged=JSON.stringify(cleanC)!==JSON.stringify(baseC);
   const byBase=new Map(st.base.items.map(i=>[i.id,i]));
   const added=st.items.filter(i=>!byBase.has(i.id)).map(stripItem);
   const changed=st.items.filter(i=>byBase.has(i.id)&&!st.removed.has(i.id)&&!sameItem(i,byBase.get(i.id))).map(i=>({id:i.id,before:stripItem(byBase.get(i.id)),after:stripItem(i)}));
   const removed=[...st.removed].filter(id=>byBase.has(id)).map(id=>({id,name:str(byBase.get(id).name)}));
   const core=[];if(document.getElementById('name')){Object.entries(CORE_MAP).forEach(([f,k])=>{const el=document.getElementById(f);if(!el)return;const nv=str(el.value).trim(),ov=st.v[k]==null?'':String(st.v[k]);if(nv!==ov&&!(f==='status'&&!ov&&nv==='active'))core.push({field:k,old:ov||null,new:nv.slice(0,300)||null})})}
   const email=fEmail.ctl.value.trim();
   const sub={schema:'rv-equipment-change/1',submission_id:'sub-'+today().replace(/-/g,'')+'-'+rid(),created_at:new Date().toISOString(),status:'pending_review',
    vessel_id:st.id,vessel_name:str(st.v.name),base_data_updated:str(data().updated)||null,
    submitter:{role:fRole.ctl.value,email,email_domain:email.split('@')[1]||'',notes_language:fLang.ctl.value,private:true},
    review_notes:fReview.ctl.value.trim()||null,spec_source:srcT||null,verify_all:!!confirm.checked,
    core_changes:core,profile_changes:prof,contacts:contactsChanged?{old:baseC,new:cleanC}:null,items:{added,changed,removed}};
   const n=core.length+prof.length+(contactsChanged?1:0)+added.length+changed.length+removed.length;
   return {sub,n}}
  function summaryLines(sub){const L=[];sub.core_changes.forEach(c=>L.push(S('eq.diff.core')+': '+c.field+': '+str(c.old||'—')+' → '+str(c.new||'—')));
   sub.profile_changes.forEach(c=>{const f=PF.find(x=>x.key===c.field)||{label:c.field,quantity:'text'};const fv=x=>x?fmtQ(x.value,f.quantity,x.display_unit):'—';L.push(S('eq.diff.spec')+': '+f.label+': '+fv(c.old)+' → '+fv(c.new))});
   if(sub.contacts)L.push(S('eq.diff.contact')+': '+sub.contacts.old.length+' → '+sub.contacts.new.length);
   sub.items.added.forEach(i=>L.push(S('eq.diff.added')+': '+catLabel(i)+': '+i.name));
   sub.items.changed.forEach(c=>L.push(S('eq.diff.changed')+': '+c.after.name));
   sub.items.removed.forEach(r=>L.push(S('eq.diff.removed')+': '+r.name));
   if(sub.verify_all)L.push(S('eq.diff.verify'));return L}
  btnBuild.addEventListener('click',()=>{
   const r=build();if(!r)return;const {sub,n}=r;
   if(!n&&!sub.verify_all){out.replaceChildren(h('p',{class:'text-body-secondary mb-0'},S('eq.ed.noChanges')));return}
   const lines=summaryLines(sub);const json=JSON.stringify(sub,null,2);
   const ul=h('ul',{class:'small'},lines.map(l=>h('li',{},l)));
   const fname=('rv-change-'+sub.vessel_id+'-'+sub.submission_id).replace(/[^A-Za-z0-9-]/g,'')+'.json';
   const dlBtn=h('a',{class:'btn btn-outline-primary btn-sm',id:'eq-download',download:fname,role:'button'},S('eq.ed.download'));
   try{if(window.URL&&URL.createObjectURL){const u=URL.createObjectURL(new Blob([json],{type:'application/json'}));dlBtn.setAttribute('href',u)}}catch(err){}
   const subj='Vessel update for review: '+str(sub.vessel_name).slice(0,60)+' ('+sub.vessel_id+')';
   let bodyT=['Submission '+sub.submission_id,'Vessel: '+sub.vessel_name+' ('+sub.vessel_id+')','Role: '+sub.submitter.role,'',...lines.slice(0,25),lines.length>25?'… and '+(lines.length-25)+' more':'','','The full submission JSON is attached ('+fname+').'].join('\n');
   if(bodyT.length>1800)bodyT=bodyT.slice(0,1790)+'\n…';
   const mail=document.createElement('a');mail.className='btn btn-outline-secondary btn-sm';mail.id='eq-mailto';
   mail.setAttribute('href','mailto:ships@oceandata.org?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(bodyT));mail.textContent=S('eq.ed.mail');
   const pre=h('pre',{class:'rv-code small',style:'max-height:40vh;overflow:auto'});pre.textContent=json;
   out.replaceChildren(h('h3',{class:'h6 mt-2'},'Change submission (not sent): ',String(n),' change',n===1?'':'s'),ul,h('p',{class:'d-flex flex-wrap gap-2 mb-1'},dlBtn,mail),h('p',{class:'small text-body-secondary'},S('eq.ed.mailHelp')),pre);
   window.__rvLastSubmission=sub});
  pick.addEventListener('input',load);pick.addEventListener('change',load);load();
 }
 window.RV_EQ={renderPublic,initEditor,recordFor,mergedProfile,fmtQ,S};
})();
