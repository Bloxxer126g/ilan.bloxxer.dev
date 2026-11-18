/* ---- cursor ---- */
(function(){
  var o=document.getElementById('cursor-outer');
  if(!o)return;
  var GREEN='a.cta,.btn-plan:not(:disabled)';
  document.addEventListener('mousemove',function(e){o.style.left=e.clientX+'px';o.style.top=e.clientY+'px';});
  document.addEventListener('mouseover',function(e){
    document.body.classList.toggle('cg',!!e.target.closest(GREEN));
    document.body.classList.toggle('ct',!!e.target.closest('input'));
  });
  document.addEventListener('mouseleave',function(){document.body.classList.remove('cg');});
  document.addEventListener('mousedown',function(e){
    document.body.classList.add('cd');
    if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
    var r=document.createElement('span');r.className='ripple';
    r.style.left=e.clientX+'px';r.style.top=e.clientY+'px';
    if(e.target.closest(GREEN))r.style.borderColor='#04130b';
    document.body.appendChild(r);setTimeout(function(){r.remove();},800);
  });
  document.addEventListener('mouseup',function(){document.body.classList.remove('cd');});
})();

/* ---- supabase (plain REST, no library needed) ---- */
const SB = (function(){
  const c = window.RAFFLE_CONFIG || {};
  const configured = c.SUPABASE_URL && c.SUPABASE_KEY && !/YOUR-/.test(c.SUPABASE_URL + c.SUPABASE_KEY);
  const base = (c.SUPABASE_URL||'').replace(/\/$/,'') + '/rest/v1/tickets';
  const headers = {apikey:c.SUPABASE_KEY, Authorization:'Bearer '+c.SUPABASE_KEY, 'Content-Type':'application/json'};
  return {
    configured,
    async add(ticket, name){
      const r = await fetch(base,{method:'POST',headers:{...headers,Prefer:'return=minimal'},body:JSON.stringify({ticket,name})});
      if(r.ok) return {ok:true};
      let body={}; try{body=await r.json();}catch(e){}
      if(r.status===409||body.code==='23505') return {ok:false,duplicate:true};
      return {ok:false,message:body.message||('Something went wrong ('+r.status+')')};
    },
    async find(ticket){
      const r = await fetch(base+'?ticket=eq.'+encodeURIComponent(ticket)+'&select=ticket,name,created_at',{headers});
      if(!r.ok){let b={};try{b=await r.json();}catch(e){}throw new Error(b.message||('Something went wrong ('+r.status+')'));}
      const rows = await r.json();
      return rows[0]||null;
    },
    async recent(n){
      const r = await fetch(base+'?select=ticket,name&order=created_at.desc&limit='+n,{headers});
      if(!r.ok) return [];
      return r.json();
    }
  };
})();
function show(el,cls,text){el.className='msg visible '+cls;el.textContent=text;}
function hide(el){el.className=el.className.replace(' visible','');}
