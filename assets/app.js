/* Shared helpers for the researchvessels.org prototype. No build step; data comes from data/*.js globals. */
(function(){
  const NAV=[['index.html','Home'],['vessels.html','Vessels'],['map.html','Where were ships?'],['fleet.html','Fleet dashboards'],['operators.html','For operators'],['equipment-search.html','Equipment'],['resources.html','Resources'],['about.html','About']];
  const here=location.pathname.split('/').pop()||'index.html';
  const logo='<img src="assets/logo-rv.svg" width="32" height="32" alt="ResearchVessels.org">';
  /* Bootstrap 5.3 dark navbar. Built only from the constant NAV list above (no data or URL values), so it is XSS-safe.
     The collapse toggler works through Bootstrap's delegated data-bs-* API, so inserting it at DOMContentLoaded is fine. */
  const header=`<a class="visually-hidden-focusable position-absolute top-0 start-0 m-2 px-3 py-2 bg-white rounded z-3" href="#content">Skip to content</a>
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark sticky-top" aria-label="Main navigation"><div class="container">
  <a class="navbar-brand fw-semibold d-flex align-items-center gap-2" href="index.html">${logo}<span>ResearchVessels.org</span></a>
  <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation"><span class="navbar-toggler-icon"></span></button>
  <div class="collapse navbar-collapse" id="mainNav"><ul class="navbar-nav ms-auto">${NAV.map(([h,t])=>`<li class="nav-item"><a class="nav-link${h===here?' active" aria-current="page':''}" href="${h}">${t}</a></li>`).join('')}</ul></div>
  </div></nav>
  <div class="alert alert-warning rounded-0 border-0 border-bottom small text-center py-1 mb-0" role="note">Prototype. The vessel registry, legacy cruise schedules, and Sailwx positions shown here are real historical data; forms, accounts, and API endpoints are mockups.</div>`;
  const footer=`<footer class="bg-dark text-white-50 py-4 mt-auto"><div class="container">
  <div class="row gy-2 align-items-center">
   <div class="col-12"><p class="small mb-2" id="rv-beta-note">Beta — feedback welcome: <a class="link-light" href="mailto:ships@oceandata.org">ships@oceandata.org</a>. (Static footer line; remove this paragraph from assets/app.js when you no longer want the notice.)</p></div>
   <div class="col-12 col-md-6 rv-ft-anchor-k4"><strong class="text-white">Contact:</strong> <a class="link-light" href="mailto:ships@oceandata.org">ships@oceandata.org</a></div>
   <div class="col-12 col-md-6 text-md-end small">&copy; 2026 Doug White / ResearchVessels.org &middot; Photo: R/V Hugh R. Sharp</div>
   <div class="col-12 small">An independently curated public ledger of research platforms, cruises, and where to find their data. Data compiled by Doug White / researchvessels.org. <a class="link-light" href="about.html#license">Data license: CC BY 4.0</a> (upstream sources have their own licenses). Originally hosted by OCEANIC at the University of Delaware.</div>
  </div></div></footer>`;
  document.addEventListener('DOMContentLoaded',()=>{
    document.body.insertAdjacentHTML('afterbegin',header);
    document.body.insertAdjacentHTML('beforeend',footer);
  });
  const esc=s=>s==null?'':String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  /* Allow only http(s) URLs, or same-document relative paths. Rejects javascript:, data:, vbscript:, and protocol-relative URLs. */
  const safeUrl=u=>{
    if(u==null)return '';
    const s=String(u).trim().replace(/[\0\r\n\t]/g,'');
    if(!s||s.startsWith('//')||s.startsWith('\\'))return '';
    try{
      const p=new URL(s,'https://researchvessels.org/');
      if(p.protocol!=='http:'&&p.protocol!=='https:')return '';
      return s;
    }catch(err){return ''}
  };
  /* External links open in a new tab. INTERNAL_DOMAINS is the single source of truth (assets/external-links.js reads
     RV.INTERNAL_DOMAINS): a host is internal when it equals one of these domains or ends with "." + domain (any
     subdomain), or equals the host serving the page. No substring matching: evil-oceandata.org and
     oceandata.org.evil.com stay external. Every other http/https link gets target="_blank" and rel noopener noreferrer
     (existing rel tokens are kept). Internal links get no target and no added rel. extAttrs() returns a constant string. */
  const INTERNAL_DOMAINS=Object.freeze(['researchvessels.org','oceandata.org','macrofirm.org','oceanbytes.org']);
  const isInternalHost=host=>{
    const h=String(host||'').toLowerCase().replace(/\.$/,'');
    if(!h)return false;
    if(h===String(location.hostname||'').toLowerCase().replace(/\.$/,''))return true;
    return INTERNAL_DOMAINS.some(d=>h===d||h.endsWith('.'+d));
  };
  const isExternalHref=u=>{
    if(u==null)return false;
    try{
      const p=new URL(String(u).trim(),location.href);
      if(p.protocol!=='http:'&&p.protocol!=='https:')return false;
      return !isInternalHost(p.hostname);
    }catch(err){return false}
  };
  const mergeRel=r=>{const t=String(r||'').split(/\s+/).filter(Boolean);for(const x of ['noopener','noreferrer'])if(!t.includes(x))t.push(x);return t.join(' ')};
  const markExternal=a=>{
    if(!a||a.tagName!=='A')return a;
    if(isExternalHref(a.getAttribute('href'))){if(!a.getAttribute('target'))a.setAttribute('target','_blank');a.setAttribute('rel',mergeRel(a.getAttribute('rel')))}
    else if(a.getAttribute('target')==='_blank'&&!a.hasAttribute('data-rv-new-tab'))a.removeAttribute('target');/* owned domains open in the same tab */
    return a;
  };
  const extAttrs=u=>isExternalHref(u)?' target="_blank" rel="noopener noreferrer"':'';
  const vesselHref=id=>'vessel.html?id='+encodeURIComponent(id==null?'':String(id));
  const operatorsHref=id=>'operators.html?id='+encodeURIComponent(id==null?'':String(id));
  const nceiHref=(text,start,end,bbox)=>{
    // Omit the link when there is no search text: NCEI's /all?text= (empty) is a 404.
    const qtext=(text==null?'':String(text)).trim();
    if(!qtext)return '';
    let href='https://www.ncei.noaa.gov/access/search/data-search/all?text='+encodeURIComponent(qtext);
    if(bbox!=null&&bbox!=='')href+='&bbox='+String(bbox);
    const stamp=(d,suffix)=>{const s=String(d);return s.includes('T')?s:s+suffix};
    // Encode only when a value has characters that would break a query or HTML attribute.
    // Ordinary ISO dates stay unencoded, matching the previous NCEI links.
    const q=(s)=>/[^A-Za-z0-9T:+._-]/.test(s)?encodeURIComponent(s):s;
    if(start)href+='&startDate='+q(stamp(start,'T00:00:00'));
    if(end)href+='&endDate='+q(stamp(end,'T23:59:59'));
    return href;
  };
  const positionPopupHtml=(v,props)=>{
    const id=props&&props.id,name=(v&&v.name!=null)?v.name:id,d=props&&props.d,k=props&&props.k;
    return `<strong><a href="${esc(vesselHref(id))}">${esc(name)}</a></strong><br>${esc(d)}<br>${k==='v'?'VOS weather report (0.1°)':'AIS-like position'}`;
  };
  /* Curated overlays (data/rebuilds.js, data/vessel_links.js) are merged onto the registry records here, so every page,
     the directory, and the JSON snippet see the same fields. The overlay files are hand-curated and survive regeneration
     of vessels.json. Only own properties are read (no prototype keys). */
  const own=(o,k)=>o!=null&&Object.prototype.hasOwnProperty.call(o,k);
  let merged=null;
  const vessels=()=>{
    if(merged&&merged.src===window.RV_VESSELS)return merged.list;
    const RB=(window.RV_REBUILDS&&window.RV_REBUILDS.rebuilds)||{},LK=(window.RV_LINKS&&window.RV_LINKS.links)||{};
    const list=(window.RV_VESSELS||[]).map(v=>{
      const o={...v};
      if(own(RB,v.id)){const r=RB[v.id];const y=Number(r.rebuilt_year);
        if(/^\d{4}$/.test(String(r.rebuilt_year))&&!(v.built&&/^\d{4}/.test(String(v.built))&&y<Number(String(v.built).slice(0,4)))){
          o.rebuilt_year=y;o.rebuilt_note=r.rebuilt_note==null?'':String(r.rebuilt_note);o.rebuilt_source=r.rebuilt_source==null?'':String(r.rebuilt_source);o.rebuilt_source_url=r.rebuilt_source_url==null?'':String(r.rebuilt_source_url)}}
      if(own(LK,v.id)){const l=LK[v.id];if(l&&l.institution_url){o.institution_url=String(l.institution_url);o.institution_url_source=l.source==null?'':String(l.source);o.institution_url_checked=l.checked==null?'':String(l.checked)}}
      return o});
    merged={src:window.RV_VESSELS,list};return list;
  };
  /* "2015 (midlife refit)" when recorded; '' when not. Never inferred. */
  const rebuiltText=v=>v&&v.rebuilt_year?String(v.rebuilt_year)+(v.rebuilt_note?' ('+v.rebuilt_note+')':''):'';
  /* ---------- Ports: World Port Index is the master list (data/ports.js) ----------
     Resolution order for a vessel's homeport or one of its R2R port calls:
       1. a curated vessel or port berth in data/berths.js, if one already exists.
          Berth coordinates are never moved to a WPI point (berths change over time;
          the existing Sharp, Atlantis, and other entries stay as they are).
          When the crosswalk has a WPI match, the popup uses the WPI name, country,
          WPI number, and UN/LOCODE; the marker stays on the berth.
       2. the accepted WPI crosswalk (R2R wpi_code, or a name match if that code was
          stale or too far; vessel homeports via source=vessel_homeport).
       3. the existing R2R / project coordinate, labelled "project supplement".
          Unmatched ports such as Lewes, Delaware stay here. Never invent a WPI number.
       4. nothing. */
  const num=x=>typeof x==='number'&&isFinite(x);
  const berthList=()=>((window.RV_BERTHS&&Array.isArray(window.RV_BERTHS.berths))?window.RV_BERTHS.berths:[]).filter(b=>b&&num(b.lat)&&num(b.lon)&&Math.abs(b.lat)<=90&&Math.abs(b.lon)<=180&&Array.isArray(b.applies_to));
  const emptyId=()=>({wpi_number:null,unlocode:'',country:'',wpi_name:'',supplement:true,berth:false});
  const berthOut=(b,kind)=>({name:String(b.name==null?'':b.name),lat:b.lat,lon:b.lon,approx:false,kind,verified:b.verified===true,source:String(b.source==null?'':b.source),note:String(b.note==null?'':b.note),...emptyId(),berth:true});
  /* Compact WPI index from data/ports.js (window.RV_WPI). wpi_number is not always
     unique (one known collision); disambiguate by name when the caller has one. */
  const wpiIndex=()=>{
    const W=window.RV_WPI;if(!W||!Array.isArray(W.ports))return null;
    if(W._idx&&W._idx.src===W)return W._idx;
    const fields=Array.isArray(W.fields)&&W.fields.length?W.fields:['wpi_number','name','unlocode','country','lat','lon'];
    const by={};
    for(const r of W.ports){
      if(!Array.isArray(r))continue;
      const p=Object.fromEntries(fields.map((f,i)=>[f,r[i]]));
      if(!num(p.lat)||!num(p.lon)||Math.abs(p.lat)>90||Math.abs(p.lon)>180)continue;
      const k=String(p.wpi_number);if(!k||k==='null'||k==='undefined')continue;
      (by[k]=by[k]||[]).push(p);
    }
    W._idx={src:W,by,r2r:(W.r2r&&typeof W.r2r==='object')?W.r2r:{},home:(W.home&&typeof W.home==='object')?W.home:{}};
    return W._idx;
  };
  const wpiByNumber=(n,name)=>{
    const idx=wpiIndex();if(!idx||n==null||n==='')return null;
    const list=idx.by[String(n)];if(!list||!list.length)return null;
    if(name){const want=String(name).toLowerCase();const hit=list.find(p=>String(p.name||'').toLowerCase()===want);if(hit)return hit}
    return list[0];
  };
  const wpiForR2r=pid=>{const idx=wpiIndex();if(!idx||pid==null||pid==='')return null;const n=Object.prototype.hasOwnProperty.call(idx.r2r,String(pid))?idx.r2r[String(pid)]:null;return n==null||n===''?null:wpiByNumber(n)};
  const wpiForHome=vid=>{const idx=wpiIndex();if(!idx||vid==null||vid==='')return null;const n=Object.prototype.hasOwnProperty.call(idx.home,String(vid))?idx.home[String(vid)]:null;return n==null||n===''?null:wpiByNumber(n)};
  const attachWpi=(out,port)=>{
    if(!port){Object.assign(out,emptyId());return out}
    out.wpi_number=port.wpi_number;
    out.unlocode=port.unlocode==null?'':String(port.unlocode);
    out.country=port.country==null?'':String(port.country);
    out.wpi_name=port.name==null?'':String(port.name);
    out.supplement=false;
    return out;
  };
  const wpiCoords=port=>({name:String(port.name||''),lat:port.lat,lon:port.lon,approx:false,kind:'World Port Index',verified:true,source:'World Port Index (Pub. 150)',note:'',berth:false});
  const shortHomeName=v=>{
    if(!v||!v.homeport)return '';
    return String(v.homeport).split(',').map(s=>s.trim()).filter(Boolean).slice(0,2).join(', ');
  };
  const resolvePort=(vid,pid,ports)=>{
    const key='r2r:'+String(pid),B=berthList(),isV=a=>a.some(x=>/^MV-/.test(String(x)));
    const wpi=wpiForR2r(pid);
    const r2r=ports&&own(ports,pid)?ports[pid]:null;
    const r2rName=r2r?String(r2r[0]||''):'';
    let b=B.find(b=>b.applies_to.includes(vid)&&b.applies_to.includes(key));
    if(!b)b=B.find(b=>!isV(b.applies_to)&&b.applies_to.includes(key));
    if(b){
      const out=berthOut(b,b.applies_to.includes(vid)?'vessel berth':'port berth');
      if(wpi){attachWpi(out,wpi);out.name=out.wpi_name||r2rName||out.name}
      else {out.name=r2rName||out.name;out.supplement=true}
      return out;
    }
    if(wpi&&num(wpi.lat)&&num(wpi.lon))return attachWpi(wpiCoords(wpi),wpi);
    if(r2r&&num(r2r[1])&&num(r2r[2]))return {name:r2rName,lat:r2r[1],lon:r2r[2],approx:true,kind:'project supplement',verified:false,source:'R2R port vocabulary',note:'',...emptyId()};
    return null;
  };
  /* Homeport: existing vessel berth first (marker stays put), else the accepted
     WPI homeport match, else an R2R port whose name matches the homeport text. */
  const resolveHome=(v,ports)=>{
    if(!v)return null;
    const B=berthList();
    const wpi=wpiForHome(v.id);
    const b=B.find(b=>b.home===true&&b.applies_to.includes(v.id));
    if(b){
      const out=berthOut(b,'vessel berth');
      if(wpi){attachWpi(out,wpi);out.name=out.wpi_name||shortHomeName(v)||out.name}
      else {out.name=shortHomeName(v)||out.name;out.supplement=true}
      return out;
    }
    if(wpi&&num(wpi.lat)&&num(wpi.lon))return attachWpi(wpiCoords(wpi),wpi);
    /* Curated project supplement for homeports not in the WPI (e.g. Iqaluit); never given a WPI number. */
    const xs=extraFor(v.id),hs=xs&&xs.home_supplement;
    if(hs&&num(hs.lat)&&num(hs.lon)&&Math.abs(hs.lat)<=90&&Math.abs(hs.lon)<=180)return {name:String(hs.name==null?'':hs.name),lat:hs.lat,lon:hs.lon,approx:true,kind:'project supplement',verified:false,source:String(hs.source_url==null?'':hs.source_url),note:String(hs.note==null?'':hs.note),...emptyId(),country:String(hs.country==null?'':hs.country)};
    if(!v.homeport||!ports)return null;
    const hp=String(v.homeport).split(',').slice(0,2).map(s=>s.trim().toLowerCase()).join(', ');
    const pid=Object.keys(ports).find(k=>String(ports[k][0]).toLowerCase()===hp);
    return pid?resolvePort(v.id,pid,ports):null;
  };
  /* Plain user-facing codes for a resolved port or a raw WPI record. Empty when
     there is no accepted WPI number (never invent one). */
  const wpiCaption=p=>{
    if(!p||p.wpi_number==null||p.wpi_number==='')return '';
    const parts=['WPI '+p.wpi_number];
    if(p.unlocode)parts.push(String(p.unlocode));
    return parts.join(' · ');
  };
  /* Curated extended details (data/vessel_extra.js): aliases for merged ids, name history, relations, photos.
     Own properties only; ids are plain strings. */
  const extraRoot=()=>{const X=window.RV_EXTRA;return X&&typeof X==='object'?X:null};
  const extraFor=id=>{const X=extraRoot();if(!X||!X.vessels||typeof X.vessels!=='object'||!own(X.vessels,String(id)))return null;const r=X.vessels[String(id)];return r&&typeof r==='object'?r:null};
  /* Merged ids (e.g. MV-0192 into MV-0191) resolve to the canonical id; one hop only. */
  const resolveAlias=id=>{const X=extraRoot(),k=id==null?'':String(id);if(!X||!X.aliases||typeof X.aliases!=='object'||!own(X.aliases,k))return k;const t=X.aliases[k];return typeof t==='string'&&/^[A-Za-z0-9_-]{1,40}$/.test(t)?t:k};
  const byIdRaw=()=>{const m={};(window.RV_VESSELS||[]).forEach(v=>m[v.id]=v);return m};
  const byId=()=>{const m={};vessels().forEach(v=>m[v.id]=v);return m};
  const cruisesFor=id=>{const C=window.RV_CRUISES;if(!C)return[];return(C.cruises[id]||[]).map(r=>Object.fromEntries(C.fields.map((f,i)=>[f,r[i]])))};
  /* Badges replace the old pills: ok = success (green), off = secondary (grey), warn = warning (amber). */
  const statusPill=v=>v.status==='out of service'?'<span class="badge text-bg-secondary">Out of service</span>':(v.status?'<span class="badge text-bg-success">Active</span>':'<span class="badge text-bg-secondary">Status unknown</span>');
  const qs=k=>new URLSearchParams(location.search).get(k);
  const fmt=n=>n==null?'':Number(n).toLocaleString();
  const TIER2=['imo','mmsi','cs','owner','operator','homeport','len','built','gt','berths','url'];/* rebuilt_year is optional context, not a completeness field */
  const completeness=v=>Math.round(100*TIER2.filter(k=>v[k]!=null&&v[k]!=='').length/TIER2.length);
  /* DOM builder for external data (R2R). Never parses HTML: strings become text nodes, attributes go through
     setAttribute, href/src always pass through safeUrl (dropped if unsafe), and on* attributes are refused. */
  const h=(tag,attrs,...kids)=>{
    const el=document.createElement(tag);
    for(const [k,v] of Object.entries(attrs||{})){
      if(v==null||v===false||/^on/i.test(k))continue;
      if(k==='href'||k==='src'){const u=safeUrl(v);if(u)el.setAttribute(k,u);continue}
      if(k==='text'){el.textContent=String(v);continue}
      el.setAttribute(k,v===true?'':String(v));
    }
    for(const c of kids.flat(Infinity)){if(c==null||c===false||c==='')continue;el.append(c instanceof Node?c:document.createTextNode(String(c)))}
    if(el.tagName==='A')markExternal(el);/* external links open in a new tab */
    return el;
  };
  /* R2R (Rolling Deck to Repository) data from data/r2r.js, keyed by our vessel id. Returns null when absent. */
  const r2rFor=id=>{
    const R=window.RV_R2R;if(!R||!R.vessels||!Object.prototype.hasOwnProperty.call(R.vessels,id))return null;
    const v=R.vessels[id],obj=(f,r)=>Object.fromEntries(f.map((k,i)=>[k,r[i]]));
    return {...v,eq:(v.eq||[]).map(r=>obj(v.eqf,r)),cr:(v.cr||[]).map(r=>obj(v.crf,r))};
  };
  /* R2R cruise tracks (data/tracks_<id>.js sets window.RV_TRACKS[id]). Untrusted: rebuilt into a fresh
     FeatureCollection. Only LineString/MultiLineString geometry with finite, in-range numeric lon/lat is kept;
     properties are coerced to plain strings (year to a 4-digit integer or null). Returns null when absent. */
  const tracksFor=id=>{
    const T=window.RV_TRACKS;if(!T||typeof T!=='object'||!Object.prototype.hasOwnProperty.call(T,id))return null;
    const src=T[id];if(!src||!Array.isArray(src.features))return null;
    const num=x=>typeof x==='number'&&isFinite(x);
    const okPt=p=>Array.isArray(p)&&num(p[0])&&num(p[1])&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90;
    const line=l=>Array.isArray(l)?l.filter(okPt).map(p=>[p[0],p[1]]):[];
    const str=x=>x==null?'':String(x).slice(0,300);
    const feats=[],seen=new Set();
    for(const f of src.features){
      const g=f&&f.geometry,pr=(f&&f.properties)||{};if(!g)continue;
      const parts=(g.type==='LineString'?[line(g.coordinates)]:g.type==='MultiLineString'&&Array.isArray(g.coordinates)?g.coordinates.map(line):[]).filter(l=>l.length>=2);
      const cid=str(pr.cruise_id);if(!parts.length||!cid||seen.has(cid))continue;seen.add(cid);
      const yr=Number.isInteger(pr.year)&&pr.year>1900&&pr.year<2200?pr.year:(/^\d{4}$/.test(str(pr.year))?+str(pr.year):null);
      feats.push({type:'Feature',id:feats.length,geometry:{type:'MultiLineString',coordinates:parts},
        properties:{cruise_id:cid,year:yr,dates:str(pr.dates),type:str(pr.type),chief_scientist:str(pr.chief_scientist),route:str(pr.route),url:safeUrl(str(pr.url))}});
    }
    return {type:'FeatureCollection',features:feats};
  };
  /* Expedition list for ships whose tracks come from a non-R2R source (data/expeditions_<id>.js sets
     window.RV_EXPEDITIONS[id] = {fields, rows}). Untrusted: every cell coerced to a short plain string;
     links only through safeUrl; year must be 4 digits. Returns null when absent. */
  const expeditionsFor=id=>{
    const E=window.RV_EXPEDITIONS;if(!E||typeof E!=='object'||!Object.prototype.hasOwnProperty.call(E,id))return null;
    const src=E[id];if(!src||!Array.isArray(src.rows)||!Array.isArray(src.fields))return null;
    const f=src.fields.map(x=>String(x)),str=x=>x==null?'':String(x).slice(0,300),seen=new Set(),rows=[];
    for(const r of src.rows){
      if(!Array.isArray(r))continue;const o={};f.forEach((k,i)=>{o[k]=r[i]});
      const rid=str(o.id);if(!rid||seen.has(rid))continue;seen.add(rid);
      rows.push({id:rid,year:/^\d{4}$/.test(str(o.year))?str(o.year):'',start:str(o.start),end:str(o.end),approx:o.approx===1||o.approx===true,
        title:str(o.title),route:str(o.route),type:str(o.type),url:safeUrl(str(o.url)),track:str(o.track),r2r:str(o.r2r)});
    }
    return {source:str(src.source),generated:str(src.generated),rows};
  };
  /* Only bare DOIs of the form 10.<digits>/<suffix> are linked; anything else gets no link. */
  const doiHref=d=>{const s=d==null?'':String(d).trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i,'');return /^10\.\d{4,9}\/\S+$/.test(s)?'https://doi.org/'+s.split('/').map(encodeURIComponent).join('/').replace(/^10%2E/,'10.'):''};
  const r2rCruiseHref=cid=>{const R=window.RV_R2R,base=R&&safeUrl(R.cruisePage);return base&&cid?safeUrl(base+encodeURIComponent(String(cid))):''};
  window.RV={INTERNAL_DOMAINS,isInternalHost,isExternalHref,extAttrs,markExternal,extraFor,resolveAlias,rebuiltText,resolvePort,resolveHome,berthList,byIdRaw,esc,safeUrl,vesselHref,operatorsHref,nceiHref,positionPopupHtml,vessels,byId,cruisesFor,statusPill,qs,fmt,completeness,h,r2rFor,tracksFor,expeditionsFor,doiHref,r2rCruiseHref,wpiForR2r,wpiForHome,wpiByNumber,wpiCaption};
})();
