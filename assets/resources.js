/* Resources page and home-page events box. Data: data/events.js (window.RV_EVENTS) and data/resources.js
   (window.RV_RESOURCES), generated and validated by tools/build_resources.py. Everything is built with RV.h:
   strings become text nodes and every href goes through RV.safeUrl, so data values are never parsed as HTML. */
(function(){
  const h=(...a)=>RV.h(...a);
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const ISO=/^(\d{4})-(\d{2})-(\d{2})$/;
  const pad=n=>String(n).padStart(2,'0');
  /* Today's date in the visitor's own time zone, as YYYY-MM-DD, so an event stays listed through its last local day. */
  const todayIso=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
  const parts=s=>{const m=ISO.exec(String(s==null?'':s));return m?{y:+m[1],m:+m[2],d:+m[3]}:null};
  const fmtRange=(a,b)=>{
    const s=parts(a),e=parts(b)||s;if(!s)return '';
    const md=p=>p.d+' '+(MON[p.m-1]||'');
    if(s.y===e.y&&s.m===e.m&&s.d===e.d)return md(s)+' '+s.y;
    if(s.y===e.y&&s.m===e.m)return s.d+'–'+e.d+' '+(MON[s.m-1]||'')+' '+s.y;
    if(s.y===e.y)return md(s)+' – '+md(e)+' '+s.y;
    return md(s)+' '+s.y+' – '+md(e)+' '+e.y;
  };
  const own=(o,k)=>o!=null&&Object.prototype.hasOwnProperty.call(o,k);
  const str=v=>v==null?'':String(v);
  /* Only entries the editor approved are shown (approved_by set); proposals stay in the data until approved. */
  const approved=e=>own(e,'approved_by')&&typeof e.approved_by==='string'&&e.approved_by.trim()!=='';
  /* Expected ship milestones without exact dates: shown with their wording (e.g. "early 2027"), sorted and
     hidden using window_start/window_end, which never appear on the page as dates. */
  const milestones=(today)=>{
    const E=window.RV_EVENTS,t=today||todayIso();
    const L=(E&&Array.isArray(E.milestones))?E.milestones.filter(m=>m&&approved(m)&&parts(m.window_start)&&parts(m.window_end)&&str(m.window_end)>=t):[];
    return L.sort((x,y)=>str(x.window_start).localeCompare(str(y.window_start))||str(x.title).localeCompare(str(y.title)));
  };
  /* Upcoming and current events, soonest first. Events whose end date has passed are hidden automatically. */
  const upcoming=(today)=>{
    const E=window.RV_EVENTS,t=today||todayIso();
    const L=(E&&Array.isArray(E.events))?E.events.filter(e=>e&&approved(e)&&parts(e.start)&&str(parts(e.end)?e.end:e.start)>=t):[];
    return L.sort((x,y)=>str(x.start).localeCompare(str(y.start))||str(x.title).localeCompare(str(y.title)));
  };
  const typeBadge=t=>h('span',{class:'badge rounded-pill text-bg-light border ms-1 align-middle'},str(t));
  const eventItem=(e,today,compact)=>{
    const now=str(e.start)<=today;
    const title=e.url&&RV.safeUrl(e.url)?h('a',{href:e.url,rel:'noopener'},str(e.title)):h('span',null,str(e.title));
    const li=h('li',{class:'list-group-item px-0'+(compact?' py-2':' py-3'),'data-event-id':str(e.id)},
      h('div',{class:'small text-body-secondary'},fmtRange(e.start,e.end),now?h('span',{class:'badge text-bg-success ms-2'},'happening now'):null),
      h('div',{class:'fw-semibold'},title,compact?null:typeBadge(e.type)),
      h('div',{class:'small'},str(e.location),e.organizer?' · '+str(e.organizer):''));
    if(!compact){
      const src=e.source&&RV.safeUrl(e.source)?h('a',{href:e.source,rel:'noopener'},'source'):null;
      li.append(h('div',{class:'small text-body-secondary'},'Dates checked on the organizer\u2019s page ',str(e.verified),src?' (':'',src,src?')':''));
      if(e.link_note)li.append(h('div',{class:'small text-body-secondary fst-italic'},str(e.link_note)));
    }
    return li;
  };
  const renderEvents=(el,opts)=>{
    if(!el)return;opts=opts||{};
    const t=opts.today||todayIso();let L=upcoming(t);
    if(opts.limit)L=L.slice(0,opts.limit);
    el.replaceChildren();
    if(!L.length){el.append(h('p',{class:'text-body-secondary mb-0'},'No upcoming events are listed right now.'));return 0}
    el.append(h('ul',{class:'list-group list-group-flush'},L.map(e=>eventItem(e,t,!!opts.compact))));
    return L.length;
  };
  const renderMilestones=(el,opts)=>{
    if(!el)return 0;opts=opts||{};const L=milestones(opts.today);el.replaceChildren();
    if(!L.length){el.append(h('p',{class:'text-body-secondary mb-0'},'No expected ship milestones are listed right now.'));return 0}
    el.append(h('ul',{class:'list-group list-group-flush'},L.map(m=>{
      const title=m.url&&RV.safeUrl(m.url)?h('a',{href:m.url,rel:'noopener'},str(m.title)):h('span',null,str(m.title));
      const src=m.source&&RV.safeUrl(m.source)?h('a',{href:m.source,rel:'noopener'},'source'):null;
      return h('li',{class:'list-group-item px-0 py-3','data-milestone-id':str(m.id)},
        h('div',{class:'small text-body-secondary'},h('span',{class:'badge text-bg-info me-2'},'expected'),'Expected ',str(m.expected)),
        h('div',{class:'fw-semibold'},title),
        h('div',{class:'small'},str(m.location),m.organizer?' · '+str(m.organizer):''),
        m.link_note?h('div',{class:'small text-body-secondary'},str(m.link_note)):null,
        h('div',{class:'small text-body-secondary'},'Checked on the official page ',str(m.verified),src?' (':'',src,src?')':''));
    })));
    return L.length;
  };
  const archiveBadge=()=>h('span',{class:'badge text-bg-secondary ms-1 align-middle'},'archived');
  const renderDownloads=(el,list)=>{
    if(!el)return 0;el.replaceChildren();
    const L=(Array.isArray(list)?list:[]).filter(d=>d&&typeof d.file==='string'&&/^archive\/[A-Za-z0-9_.-]+$/.test(d.file));
    if(!L.length)return 0;
    el.append(h('ul',{class:'list-group list-group-flush'},L.map(d=>h('li',{class:'list-group-item px-0 rv-res-item'},
      h('a',{href:d.file,class:'fw-semibold',download:''},str(d.title)),archiveBadge(),
      h('span',{class:'small text-body-secondary ms-2'},str(d.format),Number.isFinite(+d.bytes)&&+d.bytes>0?' · '+Math.round(+d.bytes/1024)+' KB':''),
      d.desc?h('div',{class:'small text-body-secondary'},str(d.desc)):null,
      d.note?h('div',{class:'small text-body-secondary fst-italic'},str(d.note)):null))));
    return L.length;
  };
  const linkItem=i=>h('li',{class:'list-group-item px-0 rv-res-item'},
    h('a',{href:i.url,rel:'noopener',class:'fw-semibold'},str(i.title)),
    i.region?h('span',{class:'small text-body-secondary ms-2'},str(i.region)):null,
    i.desc?h('div',{class:'small text-body-secondary'},str(i.desc)):null);
  const renderLinks=(el,groups,opts)=>{
    if(!el)return 0;el.replaceChildren();let n=0;const arch=!!(opts&&opts.archived);
    for(const g of (Array.isArray(groups)?groups:[])){
      const items=(g&&Array.isArray(g.items)?g.items:[]).filter(i=>i&&RV.safeUrl(i.url));
      if(!items.length)continue;n+=items.length;
      el.append(h('div',{class:'col-12 col-lg-6 rv-res-group'},h('section',{class:'card h-100'},h('div',{class:'card-body'},
        h('h3',{class:'h5 card-title'},str(g.group),h('span',{class:'badge text-bg-secondary ms-2 align-middle rv-res-count'},String(items.length)),arch?archiveBadge():null),
        h('ul',{class:'list-group list-group-flush'},items.map(linkItem))))));
    }
    return n;
  };
  const renderCalendars=el=>{
    const E=window.RV_EVENTS;if(!el||!E||!Array.isArray(E.calendars))return;
    el.replaceChildren(...E.calendars.filter(c=>c&&RV.safeUrl(c.url)).map(c=>h('li',null,h('a',{href:c.url,rel:'noopener'},str(c.title)),c.organizer?' ('+str(c.organizer)+')':'')));
  };
  /* Text filter over both link sections. Matches against text content only. */
  const wireFilter=(input,root)=>{
    if(!input||!root)return;
    input.addEventListener('input',()=>{
      const q=input.value.trim().toLowerCase();
      root.querySelectorAll('.rv-res-group').forEach(g=>{
        let shown=0;g.querySelectorAll('.rv-res-item').forEach(li=>{const ok=!q||li.textContent.toLowerCase().includes(q);li.hidden=!ok;if(ok)shown++});
        g.hidden=shown===0;const c=g.querySelector('.rv-res-count');if(c)c.textContent=String(shown);
      });
    });
  };
  const renderWatch=(el)=>{
    if(!el)return 0;
    const E=window.RV_EVENTS,L=(E&&Array.isArray(E.watch))?E.watch.filter(w=>w&&typeof w==='object'&&str(w.title)&&approved(w)):[];
    el.replaceChildren();
    if(!L.length){el.append(h('p',{class:'text-body-secondary mb-0'},'No expected meetings are listed right now.'));return 0}
    el.append(h('ul',{class:'list-group list-group-flush'},L.map(w=>{
      const href=w.url&&RV.safeUrl(w.url);
      const title=href?h('a',{href:href,rel:'noopener'},str(w.title)):h('span',null,str(w.title));
      const src=w.source&&RV.safeUrl(w.source)?h('a',{href:w.source,rel:'noopener'},'source'):null;
      return h('li',{class:'list-group-item px-0 py-3','data-watch-title':str(w.title).slice(0,120)},
        h('div',{class:'small text-body-secondary'},h('span',{class:'badge text-bg-info me-2'},'expected')),
        h('div',{class:'fw-semibold'},title),
        w.note?h('div',{class:'small'},str(w.note)):null,
        w.verified?h('div',{class:'small text-body-secondary'},'Checked on the official page ',str(w.verified),src?' (':'',src,src?')':''):(src?h('div',{class:'small text-body-secondary'},src):null));
    })));
    return L.length;
  };
  window.RV_RES={upcoming,milestones,fmtRange,renderEvents,renderMilestones,renderWatch,renderLinks,renderDownloads,renderCalendars,wireFilter,todayIso};

})();
