/* Platform registry prototype (non-ship platforms). Plain JS, no build step.
   Data comes from data/platforms.js (window.RV_PLATFORMS), a copy of data/platforms.json that also works from file://.
   XSS safety: every value from the data is rendered through RV.h() (DOM builder: strings become text nodes, href/src pass
   through RV.safeUrl) or textContent. innerHTML is never used with data. The ?id= value is validated before use. */
(function(){
  const own=(o,k)=>o!=null&&Object.prototype.hasOwnProperty.call(o,k);
  const D=()=>window.RV_PLATFORMS||{platforms:[],sources:{},spec_basis_labels:{},excluded:[]};
  const CLASSES=[['glider','Glider'],['AUV','AUV'],['ROV','ROV'],['USV','USV'],['UAV','UAV'],['UGV','UGV']];
  const CLASS_NAME={glider:'Underwater glider',AUV:'Autonomous underwater vehicle',ROV:'Remotely operated vehicle',USV:'Uncrewed surface vehicle',UAV:'Uncrewed aerial vehicle',UGV:'Uncrewed ground vehicle'};
  const STATUSES=['Active','Probable','Dormant','Unknown'];
  const STATUS_HELP={Active:'Used or published within about 12 months of the last check',Probable:'Seen in use 2021-2025, nothing newer found',Dormant:'Data trail stopped; no use found for several years',Unknown:'Only old evidence, or no evidence of use'};
  const STATUS_CLASS={Active:'text-bg-success',Probable:'text-bg-primary',Dormant:'text-bg-warning',Unknown:'text-bg-secondary'};
  const OWNERSHIP={owned:'Owned',donated:'Donated',unclear:'Unclear',unknown:'Not stated',partner_hosted:'Partner-hosted',loaned:'Loaned',demo:'Demo'};
  const ID_RE=/^[A-Za-z0-9_-]{1,64}$/;
  const h=(...a)=>RV.h(...a);
  const byId=()=>{const m=Object.create(null);D().platforms.forEach(p=>{m[p.platform_id]=p});return m};
  const validId=s=>typeof s==='string'&&ID_RE.test(s);
  const find=id=>{if(!validId(id))return null;const m=byId();return m[id]||null};
  const detailHref=id=>'platform.html?id='+encodeURIComponent(String(id));
  const classBadge=c=>h('span',{class:'badge text-bg-light border text-dark',title:own(CLASS_NAME,c)?CLASS_NAME[c]:''},c==null?'':String(c));
  const statusBadge=s=>h('span',{class:'badge '+(own(STATUS_CLASS,s)?STATUS_CLASS[s]:'text-bg-secondary'),title:own(STATUS_HELP,s)?STATUS_HELP[s]:''},s==null?'Unknown':String(s));
  const fmtNum=n=>typeof n==='number'?n.toLocaleString(undefined,{maximumFractionDigits:4}):String(n);
  function fmtValue(v,unit){
    if(v==null||v==='')return null;
    const u=unit?' '+unit:'';
    if(Array.isArray(v))return v.map(fmtNum).join('\u2013')+u;
    return fmtNum(v)+u;
  }
  const basisLabel=b=>{const L=D().spec_basis_labels||{};return own(L,b)?L[b]:(b==null?'Basis not stated':String(b))};
  function depthOf(p){const s=(p.specs||[]).find(x=>x.label==='Depth rating'&&x.value!=null);return s?fmtValue(s.value,s.unit):null}
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
  window.RVP={own,data:D,CLASSES,CLASS_NAME,STATUSES,STATUS_HELP,OWNERSHIP,validId,find,detailHref,classBadge,statusBadge,fmtValue,basisLabel,depthOf,lastDate,mailLink,draftNotice,DRAFT_TEXT};
})();
