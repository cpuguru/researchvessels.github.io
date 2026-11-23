/* Legacy URL redirects for GitHub Pages (no server-side redirects there).
   Used by the old-page stub files (meta refresh + canonical + this script) and by 404.html.
   - data-target: where this stub goes (root-relative path on this site).
   - data-shipid: read ?shipID=N (any letter case, extra parameters ignored) and go to that vessel's new page
     using window.RV_LEGACY_SHIPIDS (data/legacy_shipids.js); unknown or missing IDs go to data-target.
   - data-mode="404": only redirect known legacy paths (old .asp/.txt URLs, any URL with a mapped shipID);
     otherwise stay on the 404 page.
   Only same-site root-relative targets are ever used; nothing from the URL is written into the page. */
(function(){
  'use strict';
  var s=document.currentScript;
  var own=function(o,k){return o!=null&&Object.prototype.hasOwnProperty.call(o,k)};
  function param(name){
    var parts=location.search.replace(/^\?/,'').split('&');
    for(var i=0;i<parts.length;i++){
      var kv=parts[i].split('=');var k;
      try{k=decodeURIComponent(kv[0].replace(/\+/g,' '))}catch(err){continue}
      if(k.toLowerCase()===name){try{return decodeURIComponent((kv[1]||'').replace(/\+/g,' '))}catch(err){return null}}
    }
    return null;
  }
  function vesselFor(){
    var raw=param('shipid');if(raw==null)return null;
    var t=String(raw).trim();if(!/^[0-9]{1,6}$/.test(t))return null;
    var id=String(parseInt(t,10)),M=window.RV_LEGACY_SHIPIDS;
    if(!M||!own(M,id))return null;
    var mv=String(M[id]);if(!/^MV-[0-9]{4,6}$/.test(mv))return null;
    return '/vessel.html?id='+encodeURIComponent(mv);
  }
  function safeTarget(t){return typeof t==='string'&&/^\/(?!\/)[A-Za-z0-9_\-.\/#?=&]*$/.test(t)?t:'/'}
  var mode=s&&s.getAttribute('data-mode');
  if(mode==='404'){
    var LEGACY={'/ship_info_display.asp':'/vessels.html','/ship_details.asp':'/vessels.html','/search.asp':'/vessels.html',
      '/default.asp':'/','/index.asp':'/','/nodc_by_name.txt':'/vessels.html','/images/navchart.gif':'/archive/navchart_small.gif'};
    var path=location.pathname.toLowerCase();
    var v=vesselFor();
    if(v){location.replace(v);return}
    if(own(LEGACY,path)){location.replace(LEGACY[path]);return}
    return;
  }
  var target=safeTarget(s&&s.getAttribute('data-target')||'/vessels.html');
  if(s&&s.hasAttribute('data-shipid')){var v2=vesselFor();if(v2)target=v2}
  location.replace(target);
})();
