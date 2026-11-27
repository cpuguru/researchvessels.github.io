/* Home-page 3D globe: latest available cruise tracks (data/globe_tracks.js -> window.RV_GLOBE).
   Needs MapLibre GL JS 5.x (globe projection), loaded only on index.html. No build step, no API keys.
   Security: RV_GLOBE is treated as untrusted. It is rebuilt into a fresh FeatureCollection with validated
   numbers, ids, dates, and #rrggbb colours; popups and the legend are built with RV.h (text nodes only,
   href through safeUrl). Map events are resolved back to the sanitized record by numeric feature id, so
   nothing from the rendered feature's properties reaches the DOM. */
(function(){
  'use strict';
  const HEX=/^#[0-9a-fA-F]{6}$/, DATE=/^\d{4}-\d{2}-\d{2}$/, VID=/^(?:MV-\d{4}|R2R:[A-Za-z0-9 ().`'_-]{1,40})$/;
  const own=(o,k)=>o!=null&&Object.prototype.hasOwnProperty.call(o,k);
  const str=(x,n)=>x==null?'':String(x).slice(0,n||200);
  const num=x=>typeof x==='number'&&isFinite(x);
  const okPt=p=>Array.isArray(p)&&num(p[0])&&num(p[1])&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90;
  const line=l=>Array.isArray(l)?l.filter(okPt).map(p=>[p[0],p[1]]):[];
  const httpsOnly=u=>{const s=window.RV?RV.safeUrl(u):'';return /^https:\/\//i.test(s)?s:''};
  const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmtDate=d=>DATE.test(d)?`${+d.slice(8,10)} ${MONTHS[+d.slice(5,7)-1]||''} ${d.slice(0,4)}`:'';

  /* Untrusted RV_GLOBE -> {label, start, end, sources, vessels:{vid:{name,color,link}}, recs:[...], fc} */
  function sanitize(raw){
    if(!raw||typeof raw!=='object')return null;
    const vessels=Object.create(null);
    const rv=raw.vessels&&typeof raw.vessels==='object'?raw.vessels:{};
    for(const k of Object.keys(rv)){
      if(!VID.test(k)||!rv[k]||typeof rv[k]!=='object')continue;
      const v=rv[k],c=str(v.color,7);
      const reg=/^MV-\d{4}$/.test(k)&&window.RV&&RV.byId&&RV.byId(k);
      vessels[k]={id:k,name:str(v.name,120)||k,color:HEX.test(c)?c.toLowerCase():'#ffd400',link:reg?RV.vesselHref(k):''};
    }
    const recs=[],feats=[];
    const F=Array.isArray(raw.features)?raw.features.slice(0,3000):[];
    for(const f of F){
      const g=f&&f.geometry,p=(f&&f.properties)||{};
      if(!g||typeof p!=='object')continue;
      const vid=str(p.v,60);if(!own(vessels,vid))continue;
      const parts=(g.type==='LineString'?[line(g.coordinates)]:g.type==='MultiLineString'&&Array.isArray(g.coordinates)?g.coordinates.map(line):[]).filter(l=>l.length>=2);
      if(!parts.length)continue;
      const cid=str(p.cruise_id,40);if(!cid)continue;
      const s=str(p.start,10),e=str(p.end,10);
      const rec={idx:recs.length,v:vid,cruise_id:cid,start:DATE.test(s)?s:'',end:DATE.test(e)?e:'',route:str(p.route,200),src:str(p.src,60),url:httpsOnly(str(p.url,400))};
      recs.push(rec);
      feats.push({type:'Feature',id:rec.idx,geometry:{type:'MultiLineString',coordinates:parts},properties:{v:vid,c:vessels[vid].color}});
    }
    const r=raw.range||{},rs=str(r.start,10),re=str(r.end,10);
    const dates=recs.flatMap(x=>[x.start,x.end]).filter(Boolean).sort();
    const sources=(Array.isArray(raw.sources)?raw.sources:[]).slice(0,6).filter(s=>s&&typeof s==='object').map(s=>({name:str(s.name,120),license:str(s.license,80),url:httpsOnly(str(s.url,300))}));
    return {label:str(raw.label,80)||'Latest available cruise tracks',
      start:DATE.test(rs)?rs:(dates[0]||''),end:DATE.test(re)?re:(dates[dates.length-1]||''),
      generated:DATE.test(str(raw.generated,10))?str(raw.generated,10):'',note:str(raw.note,400),sources,vessels,recs,
      fc:{type:'FeatureCollection',features:feats}};
  }

  /* Popup body for one sanitized record (DOM nodes only). */
  function popupContent(G,rec){
    const h=RV.h,v=G.vessels[rec.v];
    const dates=rec.start?(fmtDate(rec.start)+(rec.end&&rec.end!==rec.start?' to '+fmtDate(rec.end):'')):'Dates not published';
    return h('div',{class:'rv-globe-pop'},
      h('strong',{},v.link?h('a',{href:v.link},v.name):v.name),h('br'),
      h('span',{},'Cruise ',h('span',{class:'font-monospace'},rec.cruise_id)),h('br'),
      h('span',{},dates),
      rec.route?[h('br'),h('span',{class:'text-body-secondary'},rec.route)]:null,
      h('div',{class:'small mt-1'},
        v.link?h('a',{href:v.link},'Vessel page'):null,
        v.link&&rec.url?' · ':null,
        rec.url?h('a',{href:rec.url,target:'_blank',rel:'noopener'},rec.src==='R2R'?'R2R cruise page':'NOAA cruise page'):null));
  }

  function caption(G){
    const ships=new Set(G.recs.map(r=>r.v)).size;
    const range=G.start&&G.end?`${fmtDate(G.start)} to ${fmtDate(G.end)}`:'dates vary';
    return `${G.label}: ${G.recs.length} cruises by ${ships} ships, ${range}. Not a live feed.`;
  }

  function webglOK(){
    try{if(!window.WebGLRenderingContext)return false;const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'))}catch(e){return false}
  }

  /* Zoom at which the whole globe fits the box with a margin (globe diameter is about 163 px x 2^zoom). */
  function fitZoom(el){
    const w=el.clientWidth||600,hgt=el.clientHeight||480,d=0.8*Math.min(w,hgt);
    return Math.max(0,Math.log2(d/163));
  }

  /* Local z0-4 cache of GEBCO_LATEST shaded relief. The live WMS (wms.gebco.net) sometimes
     serves a 30-day-cached ServiceException (failed to write a temp JPEG) as Content-Type
     image/jpeg, which leaves a blank rectangle on the globe — notably the z2 tile covering
     lon 0-90E, lat 0-66N (Tunisia to Sri Lanka). Overzoom these tiles up to the globe max.
     Hosted pages load the local JPEGs. A file:// open cannot fetch those (Chrome CORS),
     so it falls back to WMS with an encoded BBOX and &RV= token that misses the poisoned cache. */
  const GEBCO_TILES='gebcolocal://{z}/{x}/{y}.jpg';
  const GEBCO_ATTR='Bathymetry: <a href="https://www.gebco.net/" target="_blank" rel="noopener">GEBCO_2026 Grid, GEBCO Compilation Group (2026)</a>';
  const GEBCO_PATH=/^gebcolocal:\/\/(\d+)\/(\d+)\/(\d+)\.jpg(?:[?#].*)?$/;
  const GEBCO_ORIGIN=20037508.342789244;
  const isJpeg=buf=>{const u=new Uint8Array(buf||[]);return u.length>1000&&u[0]===0xff&&u[1]===0xd8};
  const bboxEnc=(z,x,y)=>{const n=1<<z,s=2*GEBCO_ORIGIN/n,minx=-GEBCO_ORIGIN+x*s,maxx=-GEBCO_ORIGIN+(x+1)*s,maxy=GEBCO_ORIGIN-y*s,miny=GEBCO_ORIGIN-(y+1)*s;
    const f=v=>Math.abs(v)<1e-8?'0':String(v);return [minx,miny,maxx,maxy].map(f).join('%2C')};
  function registerGebcoProtocol(){
    if(!window.maplibregl||!maplibregl.addProtocol||registerGebcoProtocol.done)return;
    maplibregl.addProtocol('gebcolocal',(params,abort)=>{
      const m=GEBCO_PATH.exec(params&&params.url||'');
      if(!m)return Promise.reject(new Error('Bad GEBCO tile URL'));
      const z=+m[1],x=+m[2],y=+m[3],sig=abort&&abort.signal;
      const load=url=>fetch(url,{signal:sig}).then(r=>{if(!r.ok)throw new Error('tile '+r.status);return r.arrayBuffer()});
      const local='assets/gebco/'+z+'/'+x+'/'+y+'.jpg';
      const wms='https://wms.gebco.net/mapserv?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=GEBCO_LATEST&STYLES=&CRS=EPSG:3857&BBOX='+bboxEnc(z,x,y)+'&WIDTH=256&HEIGHT=256&FORMAT=image/jpeg&RV=20261119';
      const hosted=location.protocol==='http:'||location.protocol==='https:';
      return (hosted?load(local):Promise.reject()).catch(()=>load(wms)).then(data=>{if(!isJpeg(data))throw new Error('GEBCO tile was not a JPEG');return {data}});
    });
    registerGebcoProtocol.done=true;
  }
  function addBathymetry(map){
    if(!map.addSource||!map.getLayer||map.getSource&&map.getSource('gebco'))return;
    registerGebcoProtocol();
    map.addSource('gebco',{type:'raster',tiles:[GEBCO_TILES],tileSize:256,minzoom:0,maxzoom:4,attribution:GEBCO_ATTR});
    /* Insert above 'park': OSM protected-area polygons (huge across the Sahara/Arabia) are opaque and hid the relief. */
    const before=map.getLayer('water')?'water':undefined;
    map.addLayer({id:'gebco',type:'raster',source:'gebco',paint:{'raster-saturation':-0.35,'raster-contrast':-0.2,'raster-brightness-min':0.22,'raster-fade-duration':0}},before);
    if(map.getLayer('water')&&map.setPaintProperty){map.setPaintProperty('water','fill-color','#ffffff');map.setPaintProperty('water','fill-opacity',0.18)}
  }

  function showFallback(root,msg){
    const fb=root.querySelector('#globe-fallback');if(!fb)return;
    fb.hidden=false;const m=fb.querySelector('[data-globe-msg]');if(m&&msg)m.textContent=msg;
    const mapEl=root.querySelector('#globe');if(mapEl)mapEl.setAttribute('aria-hidden','true');
    const btn=root.querySelector('#globe-pause');if(btn)btn.hidden=true;
  }

  const sortName=n=>n.replace(/^(?:NOAA Ship|R\/V|RV|EV|SSV|USCGC|NOAAS)\s+/i,'');
  function renderLegend(root,G,onHover){
    const box=root.querySelector('#globe-legend');if(!box)return;
    const h=RV.h,ids=Object.keys(G.vessels).filter(id=>G.recs.some(r=>r.v===id)).sort((a,b)=>sortName(G.vessels[a].name).localeCompare(sortName(G.vessels[b].name)));
    box.textContent='';
    box.append(h('details',{},h('summary',{},`Ships shown (${ids.length})`),
      h('ul',{class:'list-unstyled rv-globe-legend mb-0'},ids.map(id=>{const v=G.vessels[id];
        const sw=h('span',{class:'rv-swatch','aria-hidden':'true'});sw.style.background=v.color;
        const li=h('li',{'data-vid':id},sw,v.link?h('a',{href:v.link},v.name):h('span',{},v.name));
        li.addEventListener('mouseenter',()=>onHover(id));li.addEventListener('mouseleave',()=>onHover(null));
        li.addEventListener('focusin',()=>onHover(id));li.addEventListener('focusout',()=>onHover(null));
        return li}))));
  }

  function mount(root,opts){
    opts=opts||{};
    const G=sanitize(window.RV_GLOBE);
    const cap=root.querySelector('#globe-caption');
    if(cap)cap.textContent=G?caption(G):'Cruise track data is not available.';
    const srcEl=root.querySelector('#globe-sources');
    if(srcEl&&G){srcEl.textContent='';srcEl.append('Track data: ',...G.sources.flatMap((s,i)=>[i?'; ':'',s.url?RV.h('a',{href:s.url,target:'_blank',rel:'noopener',class:'link-light'},s.name):s.name,s.license?` (${s.license})`:'']),'. Basemap: OpenFreeMap, © OpenStreetMap contributors. Ocean depths: imagery reproduced from the GEBCO_2026 Grid, GEBCO Compilation Group (2026); not for navigation.')}
    if(!G||!G.recs.length){showFallback(root,'Cruise track data is not available right now.');return null}
    if(!window.maplibregl||!maplibregl.Map){showFallback(root,'The globe library could not load (offline or blocked). The full track map is on each ship page.');return null}
    if(!opts.skipWebGLCheck&&!webglOK()){showFallback(root,'Your browser has WebGL turned off or unsupported, so the interactive globe cannot be shown.');return null}
    const el=root.querySelector('#globe');
    const LAT=38,LON=-95;
    const reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
    let map;
    try{
      map=new maplibregl.Map({container:el,style:'https://tiles.openfreemap.org/styles/positron',center:[LON,LAT],zoom:fitZoom(el),
        minZoom:0,maxZoom:8,attributionControl:{compact:true},cooperativeGestures:true,dragRotate:false,pitchWithRotate:false});
    }catch(e){showFallback(root,'The interactive globe could not start in this browser.');return null}
    let loaded=false;
    const failT=setTimeout(()=>{if(!loaded)showFallback(root,'The globe map style did not load. The full track map is on each ship page.')},20000);
    /* Globe is set once the style is in; re-centre afterwards because the flat-map constraints can nudge the initial centre. */
    if(map.on)map.on('style.load',()=>{try{if(map.setProjection)map.setProjection({type:'globe'});if(map.jumpTo)map.jumpTo({center:[LON,LAT],zoom:fitZoom(el)})}catch(e){}});
    /* Ocean depth shading: local GEBCO_2026 shaded-relief tiles (z0-4) under the light OpenFreeMap "positron"
       vector style. The water fill is made a thin white wash so the bathymetry shows through but stays light;
       labels and boundaries stay on top. Lightened/desaturated so the coloured tracks stand out. */
    map.on('error',()=>{if(!loaded&&!opts.skipWebGLCheck){/* tile/style errors: keep trying until the timeout */}});

    /* Auto-rotate: slow drift west-to-east, stops for good on the first interaction. */
    const btn=root.querySelector('#globe-pause');
    let rotating=!reduce,userStopped=false,visible=true,last=0,raf=0;
    const DEG_PER_S=3;
    const setBtn=()=>{if(!btn)return;btn.setAttribute('aria-pressed',rotating?'false':'true');btn.textContent=rotating?'Pause rotation':'Rotate globe'};
    const frame=t=>{raf=0;if(!rotating||!visible||document.hidden)return;
      if(last&&map.getCenter&&map.jumpTo){const dt=Math.min(100,t-last)/1000,c=map.getCenter();map.jumpTo({center:[((c.lng+DEG_PER_S*dt+540)%360)-180,c.lat]})}
      last=t;raf=requestAnimationFrame(frame)};
    const start=()=>{if(!raf&&rotating&&visible&&!document.hidden){last=0;raf=requestAnimationFrame(frame)}};
    const stop=user=>{if(user){userStopped=true;rotating=false;setBtn()}if(raf){cancelAnimationFrame(raf);raf=0}};
    setBtn();
    if(btn)btn.addEventListener('click',()=>{rotating=!rotating;userStopped=!rotating;setBtn();rotating?start():stop(false)});
    ['mousedown','touchstart','wheel','dragstart'].forEach(ev=>map.on(ev,()=>stop(true)));
    el.addEventListener('keydown',()=>stop(true));
    document.addEventListener('visibilitychange',()=>{document.hidden?stop(false):start()});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{visible=es.some(e=>e.isIntersecting);visible?start():stop(false)}).observe(el)}

    const recFrom=e=>{const f=e&&e.features&&e.features[0];const i=f&&f.id;return Number.isInteger(i)&&i>=0&&i<G.recs.length?G.recs[i]:null};
    const hover=new maplibregl.Popup({closeButton:false,closeOnClick:false,maxWidth:'260px',className:'rv-globe-hover'});
    /* Tracks go on as soon as the style is in ('style.load'), not at 'load', which waits for every basemap and
       GEBCO tile and can take many seconds; whichever fires first wins. */
    const setup=()=>{
      if(loaded)return;loaded=true;clearTimeout(failT);
      try{if(map.setSky)map.setSky({'sky-color':'#06182b','horizon-color':'#2a5b8c','atmosphere-blend':['interpolate',['linear'],['zoom'],0,1,5,1,7,0]})}catch(e){}
      map.addSource('globe-tracks',{type:'geojson',data:G.fc});
      map.addLayer({id:'globe-tracks-casing',type:'line',source:'globe-tracks',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ffffff','line-opacity':0.9,'line-width':['interpolate',['linear'],['zoom'],0,3.6,5,5.5]}});
      map.addLayer({id:'globe-tracks',type:'line',source:'globe-tracks',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['get','c'],'line-width':['interpolate',['linear'],['zoom'],0,2,5,3.2]}});
      map.addLayer({id:'globe-tracks-hl',type:'line',source:'globe-tracks',filter:['==',['get','v'],''],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#111111','line-width':4}});
      map.addLayer({id:'globe-tracks-hit',type:'line',source:'globe-tracks',paint:{'line-color':'#000','line-opacity':0,'line-width':14}});
      start();
    };
    map.on('style.load',()=>{try{addBathymetry(map)}catch(e){}setup()});
    map.on('load',setup);
    map.on('mousemove','globe-tracks-hit',e=>{const r=recFrom(e);if(!r)return;map.getCanvas().style.cursor='pointer';
      if(map.setFilter)map.setFilter('globe-tracks-hl',['==',['get','v'],r.v]);
      hover.setLngLat(e.lngLat).setDOMContent(popupContent(G,r)).addTo(map)});
    map.on('mouseleave','globe-tracks-hit',()=>{map.getCanvas().style.cursor='';if(map.setFilter)map.setFilter('globe-tracks-hl',['==',['get','v'],'']);if(hover.remove)hover.remove()});
    map.on('click','globe-tracks-hit',e=>{const r=recFrom(e);if(!r)return;stop(true);if(hover.remove)hover.remove();
      new maplibregl.Popup({maxWidth:'280px'}).setLngLat(e.lngLat).setDOMContent(popupContent(G,r)).addTo(map)});
    renderLegend(root,G,vid=>{if(map.setFilter&&(vid==null||own(G.vessels,vid)))map.setFilter('globe-tracks-hl',['==',['get','v'],vid||''])});
    return {map,G,stop,start};
  }

  window.RV_GLOBE_UI={sanitize,popupContent,caption,mount,fitZoom};
  document.addEventListener('DOMContentLoaded',()=>{const root=document.getElementById('globe-hero');if(root)window.__rvGlobe=mount(root)});
})();
