/* Platform registry prototype (non-ship platforms). Plain JS, no build step.
   Data comes from data/platforms.js (window.RV_PLATFORMS), a copy of data/platforms.json that also works from file://.
   Institutions come from data/institutions.js (window.RV_INSTITUTIONS).
   XSS safety: every value from the data is rendered through RV.h() (DOM builder: strings become text nodes, href/src pass
   through RV.safeUrl) or textContent. innerHTML is never used with data. The ?id= value is validated before use. */
(function(){
  const ID_RE=/^[A-Za-z0-9_-]{1,64}$/;
  const validId=s=>typeof s==='string'&&ID_RE.test(s);
  const own=(o,k)=>o!=null&&Object.prototype.hasOwnProperty.call(o,k);
  const D=()=>window.RV_PLATFORMS||{platforms:[],sources:{},spec_basis_labels:{},excluded:[]};
  const CLASSES=[['glider','Glider'],['AUV','AUV'],['ROV','ROV'],['HROV','Hybrid ROV/AUV'],['HOV','HOV (crewed)'],['towed','Towed'],['USV','USV'],['UAV','UAV'],['UGV','UGV'],['HFR','HF radar'],['profiling float','Profiling float']];
  const CLASS_NAME={glider:'Underwater glider',AUV:'Autonomous underwater vehicle',ROV:'Remotely operated vehicle',HROV:'Hybrid remotely operated / autonomous vehicle',HOV:'Human-occupied vehicle (crewed submersible)',towed:'Towed vehicle or sled',USV:'Uncrewed surface vehicle',UAV:'Uncrewed aerial vehicle',UGV:'Uncrewed ground vehicle',HFR:'HF radar (shore-based network)', 'profiling float':'Profiling float (Argo-style)'};
  /* Status vocabulary is shared with ships (assets/app.js: RV.STATUS_LEVELS). */
  const STATUSES=RV.STATUS_LEVELS.slice();
  const STATUS_HELP=RV.STATUS_HELP;
  const OWNERSHIP={owned:'Owned',donated:'Donated',unclear:'Unclear',unknown:'Not stated',partner_hosted:'Partner-hosted',loaned:'Loaned',demo:'Demo',contracted:'Contracted service'};
  const ROLES={owner:'Owner',operator:'Operator',developer:'Developer / builder',host:'Host facility',funder:'Funder'};
  const COMPLETENESS={detailed:'Detailed public specs',partial:'Partial public specs',limited:'Limited public information'};
  const COUNTRY={US:'United States',FR:'France',GB:'United Kingdom',DE:'Germany',NO:'Norway',AU:'Australia',JP:'Japan'};
  const countryName=c=>own(COUNTRY,c)?COUNTRY[c]:String(c||'');
  /* institutions (data/institutions.js -> window.RV_INSTITUTIONS). parent_id nests groups inside institutions. */
  const ID=()=>window.RV_INSTITUTIONS||{institutions:[]};
  let _im=null,_il=null;const instMap=()=>{if(!_im){_im=Object.create(null);_il=Object.create(null);ID().institutions.forEach(i=>{_im[i.institution_id]=i;const k=String(i.institution_id).toLowerCase();if(!(k in _il))_il[k]=i})}return _im};
  /* Exact id first, then case-insensitive (institution.html?id=WHOI finds whoi). */
  const findInst=id=>{if(!validId(id))return null;const m=instMap();return m[id]||_il[String(id).toLowerCase()]||null};
  const instChildren=id=>ID().institutions.filter(i=>i.parent_id===id);
  const instDesc=id=>{const out=[],seen=new Set(),st=[id];while(st.length){const x=st.pop();if(seen.has(x))continue;seen.add(x);out.push(x);instChildren(x).forEach(c=>st.push(c.institution_id))}return out};
  const instRoot=id=>{let i=findInst(id),n=0;while(i&&i.parent_id&&n++<10){const p=findInst(i.parent_id);if(!p)break;i=p}return i};
  const instChain=id=>{const c=[];let i=findInst(id),n=0;while(i&&n++<10){c.unshift(i);i=i.parent_id?findInst(i.parent_id):null}return c};
  const instHref=id=>'institution.html?id='+encodeURIComponent(String(id));
  const instLabel=i=>i?(i.short_name||i.name):'';
  const affs=p=>(p.affiliations||[]).filter(a=>a&&findInst(a.institution_id));
  const platInsts=p=>{const s=new Set();affs(p).forEach(a=>instChain(a.institution_id).forEach(i=>s.add(i.institution_id)));return s};
  const operatorsOf=p=>{const a=affs(p);const op=a.filter(x=>x.role==='operator');return op.length?op:a.filter(x=>x.role==='owner'||x.role==='host')};
    const h=(...a)=>RV.h(...a);
  const byId=()=>{const m=Object.create(null);D().platforms.forEach(p=>{m[p.platform_id]=p});return m};
  const find=id=>{if(!validId(id))return null;const m=byId();return m[id]||null};
  const detailHref=id=>'platform.html?id='+encodeURIComponent(String(id));
  const classBadge=c=>h('span',{class:'badge text-bg-light border text-dark',title:own(CLASS_NAME,c)?CLASS_NAME[c]:''},c==null?'':String(c));
  const statusBadge=s=>RV.statusBadge(s);
  /* Human-readable display name (item 6). A recorded display_name wins unless it is just the raw id; a trailing
     "(raw_id)" is dropped because the raw id is shown separately. Otherwise: model + "#serial" + "(owner short name)",
     e.g. "Slocum G2 #476 (UD)". Plain strings only; rendered as text. */
  const ownerShort=p=>{const a=affs(p),o=a.find(x=>x.role==='owner')||a.find(x=>x.role==='operator')||a[0];const r=o?instRoot(o.institution_id):null;return r?String(r.short_name||r.name||''):''};
  const displayName=p=>{if(!p)return '';const id=String(p.platform_id==null?'':p.platform_id);
    let d=String(p.display_name||p.name||'').trim();
    const tail='('+id.toLowerCase()+')';if(id&&d.toLowerCase().endsWith(tail))d=d.slice(0,d.length-tail.length).trim();
    const raw=!d||d.toLowerCase()===id.toLowerCase();
    const ser=p.serial_number!=null&&/^[A-Za-z0-9-]{1,20}$/.test(String(p.serial_number))?'#'+String(p.serial_number).replace(/^0+(?=\d)/,''):'';
    const sh=ownerShort(p);
    if(raw){const base=[p.model?String(p.model):(p.platform_class?String(p.platform_class):''),ser].filter(Boolean).join(' ')||id;return base+(sh?' ('+sh+')':'')}
    const stripped=d!==String(p.display_name||p.name||'').trim();
    if(stripped&&p.model){return d+' \u00b7 '+[String(p.model),ser].filter(Boolean).join(' ')+(sh?' ('+sh+')':'')}
    return d};
  const SORTS={name:'Name (A\u2013Z)',status:'Status',class:'Class'};
  const byName=(a,b)=>displayName(a).localeCompare(displayName(b),'en',{numeric:true,sensitivity:'base'});
  const sortPlatforms=(list,key)=>{const L=list.slice();if(key==='status')L.sort((a,b)=>STATUSES.indexOf(RV.normStatus(a.status))-STATUSES.indexOf(RV.normStatus(b.status))||byName(a,b));
    else if(key==='class')L.sort((a,b)=>String(a.platform_class||'').localeCompare(String(b.platform_class||''))||byName(a,b));else L.sort(byName);return L};
  const fmtNum=n=>typeof n==='number'?n.toLocaleString(undefined,{maximumFractionDigits:4}):String(n);
  function fmtValue(v,unit){
    if(v==null||v==='')return null;
    const u=unit?' '+unit:'';
    if(Array.isArray(v))return v.map(fmtNum).join('\u2013')+u;
    return fmtNum(v)+u;
  }
  const basisLabel=b=>{const L=D().spec_basis_labels||{};return own(L,b)?L[b]:(b==null?'Basis not stated':String(b))};
  function depthOf(p){const d=p.depth_rating_m;if(d&&d.value!=null)return fmtValue(d.value,'m');const s=(p.specs||[]).find(x=>(x.canon==='depth_rating'||x.label==='Depth rating')&&x.value!=null);return s?fmtValue(s.value,s.unit):null}
  function enduranceOf(p){const e=p.endurance;if(!e)return null;if(e.value!=null)return fmtValue(e.value,e.unit);return e.text||null}
  function surveySpeedOf(p){const s=p.survey_speed_kn;if(!s)return null;if(s.value!=null)return fmtValue(s.value,'kn');return s.text||null}
  const AUTONOMY=RV.AUTONOMY_LEVELS,autonomyBadge=a=>RV.autonomyBadge(a);
  function lastDate(p){const ds=(p.deployments||[]).map(d=>d.end||d.start).filter(Boolean).sort();return ds.length?ds[ds.length-1]:null}
  const DRAFT_TEXT='Draft \u2013 unverified; corrections welcome at ';
  function mailLink(subject,text){
    const a=document.createElement('a');
    a.setAttribute('href','mailto:ships@oceandata.org'+(subject?'?subject='+encodeURIComponent(String(subject).slice(0,120)):''));
    a.textContent=text||'ships@oceandata.org';return a;
  }
  function draftNotice(extra,subject){
    const d=h('div',{class:'alert alert-warning mb-3',role:'note'});
    d.append(h('strong',null,DRAFT_TEXT),mailLink(subject),'. ',extra||'');
    return d;
  }
  /* Phase 2: support vessels (two-way linking). Entries are objects {vessel_id,name,role,source_id,date,evidence,verified,note};
     a legacy plain string is tolerated and shown as unverified free text. */
  const SUPPORT_ROLES=()=>D().support_roles||{};
  const roleLabel=r=>{const L=SUPPORT_ROLES();return own(L,r)?L[r]:String(r==null?'':r)};
  const supportList=p=>(Array.isArray(p&&p.support_vessels)?p.support_vessels:[]).map(e=>typeof e==='string'?{vessel_id:null,name:e,role:'any suitable ship',verified:false,note:'Free text from an older record.'}:e).filter(e=>e&&typeof e==='object');
  const vehiclesFor=vid=>{const out=[];if(vid==null)return out;D().platforms.forEach(p=>supportList(p).forEach(e=>{if(e.vessel_id!=null&&String(e.vessel_id)===String(vid))out.push({p:p,e:e})}));return out};
  const accessOf=p=>{const a=p&&p.access;return a&&typeof a==='object'?a:null};
  const triState=v=>v===true?'Yes':v===false?'No':'Not stated';
  const VCF_HREF=id=>'vehicle_condition_form.html'+(id?'?platform='+encodeURIComponent(String(id)):'');
  window.RVP={displayName,ownerShort,sortPlatforms,SORTS,roleLabel,supportList,vehiclesFor,accessOf,triState,VCF_HREF,own,data:D,CLASSES,CLASS_NAME,STATUSES,STATUS_HELP,OWNERSHIP,ROLES,COMPLETENESS,COUNTRY,countryName,validId,find,detailHref,classBadge,statusBadge,fmtValue,basisLabel,depthOf,enduranceOf,surveySpeedOf,autonomyBadge,lastDate,mailLink,draftNotice,DRAFT_TEXT,
    instData:ID,instMap,findInst,instChildren,instDesc,instRoot,instChain,instHref,instLabel,affs,platInsts,operatorsOf};
})();
