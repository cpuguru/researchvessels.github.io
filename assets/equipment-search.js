/* Fleet-wide equipment filter. Data: data/equipment.js (window.RV_EQUIP) and
   assets/equipment_vocab.js (window.RV_EQ_VOCAB). All results are built with RV.h
   (text nodes only; hrefs through RV.safeUrl). Contacts and email addresses are
   never read or rendered. */
(function(){
  'use strict';
  const h=(...a)=>RV.h(...a);
  const own=(o,k)=>o!=null&&Object.prototype.hasOwnProperty.call(o,k);
  const str=v=>v==null?'':String(v);
  const SKIP=new Set(['__proto__','constructor','prototype']);
  const VOC=window.RV_EQ_VOCAB||{categories:[]};
  const CATS=Array.isArray(VOC.categories)?VOC.categories.filter(c=>c&&c.key):[];
  const CAT={};CATS.forEach(c=>{CAT[c.key]=c});

  const vesselsRoot=()=>{
    const D=window.RV_EQUIP;
    return D&&typeof D==='object'&&D.vessels&&typeof D.vessels==='object'?D.vessels:{};
  };
  const eachVessel=cb=>{
    const vs=vesselsRoot();
    Object.keys(vs).forEach(id=>{
      if(!own(vs,id)||SKIP.has(id))return;
      const rec=vs[id];
      if(!rec||typeof rec!=='object'||Array.isArray(rec))return;
      cb(String(id),rec);
    });
  };
  const itemsOf=rec=>Array.isArray(rec.items)?rec.items.filter(it=>it&&typeof it==='object'&&!Array.isArray(it)):[];
  const catLabel=it=>{
    if(!it)return '';
    if(it.category==='other'&&it.category_other)return str(it.category_other);
    return CAT[it.category]?str(CAT[it.category].label):str(it.category||'');
  };
  const noteText=it=>{
    const N=it&&it.notes;
    if(!N||typeof N!=='object'||Array.isArray(N))return '';
    return Object.keys(N).filter(k=>own(N,k)&&k!=='__proto__'&&k!=='constructor').map(k=>str(N[k])).join(' ');
  };
  /* Searchable text only: name, make, model, specs, category, L22, notes. Never contacts. */
  const hay=it=>[it.name,it.make,it.model,it.specs,it.category,it.category_other,it.l22,catLabel(it),noteText(it)].map(str).join(' ').toLowerCase();

  const registry=()=>{try{return RV.byId()}catch(e){return {}}};

  const uniqueMakes=()=>{
    const s=new Set();
    eachVessel((_,rec)=>itemsOf(rec).forEach(it=>{const m=str(it.make).trim();if(m)s.add(m)}));
    return [...s].sort((a,b)=>a.localeCompare(b));
  };
  const uniqueModels=()=>{
    const s=new Set();
    eachVessel((_,rec)=>itemsOf(rec).forEach(it=>{const m=str(it.model).trim();if(m)s.add(m)}));
    return [...s].sort((a,b)=>a.localeCompare(b));
  };

  const filters=()=>({
    q:str(document.getElementById('eq-q').value).trim().toLowerCase(),
    cat:str(document.getElementById('eq-cat').value),
    make:str(document.getElementById('eq-make').value),
    model:str(document.getElementById('eq-model').value).trim().toLowerCase(),
    removed:!!document.getElementById('eq-removed').checked
  });

  const matchItem=(it,f)=>{
    if(!f.removed&&str(it.status)==='removed')return false;
    if(f.cat&&str(it.category)!==f.cat)return false;
    if(f.make&&str(it.make)!==f.make)return false;
    if(f.model&&!str(it.model).toLowerCase().includes(f.model))return false;
    if(f.q&&!hay(it).includes(f.q))return false;
    return true;
  };

  const search=()=>{
    const f=filters();
    const by=registry();
    const rows=[];
    let ships=0,items=0;
    eachVessel((id,rec)=>{
      ships++;
      const hits=itemsOf(rec).filter(it=>matchItem(it,f));
      items+=itemsOf(rec).length;
      if(!hits.length)return;
      const v=own(by,id)?by[id]:null;
      rows.push({id,name:v&&v.name?str(v.name):id,operator:v&&v.operator?str(v.operator):'',country:v&&v.country?str(v.country):'',hits});
    });
    rows.sort((a,b)=>a.name.localeCompare(b.name));
    return {rows,ships,items,f};
  };

  const itemLine=it=>{
    const bits=[str(it.name)||'Untitled item'];
    const mm=[str(it.make),str(it.model)].filter(Boolean).join(' ');
    if(mm)bits.push(mm);
    const meta=[];
    const lab=catLabel(it);if(lab)meta.push(lab);
    if(it.status&&it.status!=='installed')meta.push(str(it.status));
    if(it.l22)meta.push(str(it.l22));
    return h('li',{class:'mb-1'},
      h('span',{},bits.join(' — ')),
      meta.length?h('div',{class:'small text-body-secondary'},meta.join(' · ')):null,
      it.specs?h('div',{class:'small text-body-secondary'},str(it.specs)):null);
  };

  const render=()=>{
    const {rows,ships,items,f}=search();
    const nItems=rows.reduce((a,r)=>a+r.hits.length,0);
    const count=document.getElementById('eq-count');
    const out=document.getElementById('eq-results');
    const active=f.q||f.cat||f.make||f.model||f.removed;
    if(count)count.textContent=rows.length
      ?(nItems+' matching item'+(nItems===1?'':'s')+' on '+rows.length+' ship'+(rows.length===1?'':'s')+' (of '+ships+' with equipment records, '+items+' items in total).')
      :(ships?('No matches. The current list has '+items+' items on '+ships+' ships.'):'No equipment records are loaded.');
    if(!out)return;
    out.replaceChildren();
    if(!rows.length){
      out.append(h('p',{class:'text-body-secondary'},active?'Try a shorter query, or clear the filters.':'No ships in the equipment list match yet.'));
      return;
    }
    const ul=h('ul',{class:'list-group'});
    rows.forEach(r=>{
      const href=RV.vesselHref(r.id);
      const title=href?h('a',{href:href,class:'fw-semibold'},r.name):h('span',{class:'fw-semibold'},r.name);
      ul.append(h('li',{class:'list-group-item','data-vessel-id':r.id},
        h('div',{},title,r.country||r.operator?h('span',{class:'small text-body-secondary'},' · '+[r.country,r.operator].filter(Boolean).join(' · ')):null),
        h('ul',{class:'list-unstyled small mb-0 mt-2'},r.hits.map(itemLine))));
    });
    out.append(ul);
  };

  const fillControls=()=>{
    const cat=document.getElementById('eq-cat');
    CATS.forEach(c=>{
      const o=document.createElement('option');o.value=c.key;o.textContent=str(c.label||c.key);cat.append(o);
    });
    const make=document.getElementById('eq-make');
    uniqueMakes().forEach(m=>{const o=document.createElement('option');o.value=m;o.textContent=m;make.append(o)});
    const list=document.getElementById('eq-model-list');
    uniqueModels().forEach(m=>{const o=document.createElement('option');o.value=m;list.append(o)});
    const q0=RV.qs('q'),c0=RV.qs('category'),m0=RV.qs('make'),mo=RV.qs('model');
    if(q0)document.getElementById('eq-q').value=q0;
    if(c0&&CATS.some(c=>c.key===c0))document.getElementById('eq-cat').value=c0;
    if(m0)document.getElementById('eq-make').value=m0;
    if(mo)document.getElementById('eq-model').value=mo;
  };

  const syncUrl=()=>{
    const f=filters();
    const p=new URLSearchParams();
    if(f.q)p.set('q',f.q);
    if(f.cat)p.set('category',f.cat);
    if(f.make)p.set('make',f.make);
    if(f.model)p.set('model',document.getElementById('eq-model').value.trim());
    const s=p.toString();
    const next=location.pathname.split('/').pop()+(s?'?'+s:'');
    try{history.replaceState(null,'',next)}catch(err){}
  };

  document.addEventListener('DOMContentLoaded',()=>{
    if(!window.RV||!document.getElementById('eq-search'))return;
    fillControls();
    ['eq-q','eq-cat','eq-make','eq-model','eq-removed'].forEach(id=>{
      const el=document.getElementById(id);
      if(!el)return;
      el.addEventListener('input',()=>{syncUrl();render()});
      el.addEventListener('change',()=>{syncUrl();render()});
    });
    render();
  });
  window.RV_EQ_SEARCH={search,hay};
})();
