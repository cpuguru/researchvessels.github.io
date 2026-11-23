/* External links open in a new tab (shared safety net, loaded on every page right after assets/app.js).
   Internal = the host serving the page, or a host that equals one of RV.INTERNAL_DOMAINS (assets/app.js, the single
   source of truth: researchvessels.org, oceandata.org, macrofirm.org, oceanbytes.org) or ends with "." + one of them.
   Exact-or-dot-suffix match only, so evil-oceandata.org and oceandata.org.evil.com are external.
   External http(s) links get target="_blank" and rel tokens noopener + noreferrer (existing tokens such as "license"
   or "nofollow" are kept), plus visually hidden "(opens in new tab)" text for screen readers (or a suffix on an
   existing aria-label). Internal links get none of that; target="_blank" on an internal link is removed, and any
   marks this script added earlier are undone if a link's href turns internal. Relative, #anchor, mailto:, tel:,
   javascript:, blob: and data: links are left alone. Opt-outs: data-rv-same-tab (never new tab) and
   data-rv-new-tab (keep an explicit target on an internal link). Runs on DOMContentLoaded and watches later DOM
   changes with a MutationObserver. Never parses HTML; only sets attributes and text. */
(function(){
  'use strict';
  var FALLBACK_DOMAINS=['researchvessels.org','oceandata.org','macrofirm.org','oceanbytes.org'];
  var SR_CLASS='rv-newtab-sr',SR_TEXT=' (opens in new tab)',MARK='data-rv-ext';
  function domains(){var R=window.RV;return R&&Array.isArray(R.INTERNAL_DOMAINS)&&R.INTERNAL_DOMAINS.length?R.INTERNAL_DOMAINS:FALLBACK_DOMAINS}
  function norm(h){return String(h||'').toLowerCase().replace(/\.$/,'')}
  function isInternalHost(host){
    var h=norm(host);if(!h)return false;
    if(h===norm(location.hostname))return true;
    var D=domains();
    for(var i=0;i<D.length;i++){var d=norm(D[i]);if(d&&(h===d||h.slice(-(d.length+1))==='.'+d))return true}
    return false;
  }
  /* returns 'ext', 'int' (http/https on an owned host), or '' (not http/https: relative resolves to the page host = 'int') */
  function kind(href){
    if(href==null)return '';
    var s=String(href).trim();if(!s)return '';
    var u;try{u=new URL(s,location.href)}catch(err){return ''}
    if(u.protocol!=='http:'&&u.protocol!=='https:')return '';
    return isInternalHost(u.hostname)?'int':'ext';
  }
  function isExternal(href){return kind(href)==='ext'}
  function relTokens(a){return String(a.getAttribute('rel')||'').split(/\s+/).filter(Boolean)}
  function addHint(a){
    var lbl=a.getAttribute('aria-label');
    if(lbl!=null){if(!/new tab/i.test(lbl)){a.setAttribute('aria-label',lbl+SR_TEXT);a.setAttribute('data-rv-ext-label','')}return}
    if(a.querySelector('.'+SR_CLASS))return;
    var sp=document.createElement('span');sp.className='visually-hidden '+SR_CLASS;sp.textContent=SR_TEXT;a.appendChild(sp);
  }
  function unmark(a){
    /* undo only what this script added (recorded in data-rv-ext as "t" for target plus rel tokens) */
    var rec=String(a.getAttribute(MARK)||'').split(/\s+/).filter(Boolean);a.removeAttribute(MARK);
    if(rec.indexOf('t')!==-1&&a.getAttribute('target')==='_blank')a.removeAttribute('target');
    var keep=relTokens(a).filter(function(t){return rec.indexOf(t)===-1});
    if(keep.length)a.setAttribute('rel',keep.join(' '));else a.removeAttribute('rel');
    var sp=a.querySelectorAll('.'+SR_CLASS);for(var i=0;i<sp.length;i++)sp[i].remove();
    if(a.hasAttribute('data-rv-ext-label')){var l=a.getAttribute('aria-label')||'';if(l.slice(-SR_TEXT.length)===SR_TEXT)a.setAttribute('aria-label',l.slice(0,-SR_TEXT.length));a.removeAttribute('data-rv-ext-label')}
  }
  function mark(a){
    if(!a||a.nodeType!==1||a.tagName!=='A')return;
    var k=kind(a.getAttribute('href'));
    if(k==='ext'&&!a.hasAttribute('data-rv-same-tab')){
      if(a.hasAttribute(MARK))return;
      var rec=[];
      if(!a.getAttribute('target')){a.setAttribute('target','_blank');rec.push('t')}
      var t=relTokens(a);['noopener','noreferrer'].forEach(function(x){if(t.indexOf(x)===-1){t.push(x);rec.push(x)}});
      a.setAttribute('rel',t.join(' '));
      if(a.getAttribute('target')==='_blank')addHint(a);
      a.setAttribute(MARK,rec.join(' '));
      return;
    }
    if(a.hasAttribute(MARK))unmark(a);
    /* owned domains open in the same tab: drop a hard-coded target="_blank" unless explicitly opted in */
    if(k==='int'&&a.getAttribute('target')==='_blank'&&!a.hasAttribute('data-rv-new-tab'))a.removeAttribute('target');
  }
  function scan(root){
    if(!root||root.nodeType!==1)return;
    if(root.tagName==='A')mark(root);
    var list=root.querySelectorAll('a[href]');for(var i=0;i<list.length;i++)mark(list[i]);
  }
  window.RVExternalLinks={isExternal:isExternal,isInternalHost:isInternalHost,mark:mark,scan:scan};
  if(typeof MutationObserver==='function'){
    new MutationObserver(function(muts){
      for(var i=0;i<muts.length;i++){
        var m=muts[i];
        if(m.type==='attributes')mark(m.target);
        else for(var j=0;j<m.addedNodes.length;j++)scan(m.addedNodes[j]);
      }
    }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['href']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){scan(document.body)});
  else scan(document.body);
})();
