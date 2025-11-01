(function () {
  if (window.GUIDE_LOADED) return;
  window.GUIDE_LOADED = true;

  /*──────────  STYLES  ──────────*/
  const css = `
    .gc{position:fixed;width:60px;height:60px;border:4px solid #3B82F6;
        border-radius:50%;background:rgba(59,130,246,.2);
        box-shadow:0 0 40px rgba(59,130,246,.9);z-index:999999;
        display:none;align-items:center;justify-content:center;font-size:28px;
        pointer-events:none;transition:left .35s ease,top .35s ease;}
    .gp{position:fixed;bottom:30px;right:30px;width:380px;background:#0f172a;
        border:2px solid #3B82F6;border-radius:10px;padding:18px;z-index:999998;
        color:#f3f4f6;font:13px/1.4 Arial;}
    .gp input,.gp select{width:100%;padding:8px;margin:6px 0 10px;
        border:1px solid #334155;background:#1e293b;color:#f3f4f6;
        border-radius:6px;font-size:12px;}
    .gp button{width:100%;padding:10px;background:#3B82F6;color:#fff;
        border:none;border-radius:6px;cursor:pointer;font-weight:700;}
    .gs{padding:10px;background:rgba(59,130,246,.12);border-left:3px solid #3B82F6;
        margin-top:10px;border-radius:4px;}
    [data-guide-highlight]{outline:4px solid #3B82F6;outline-offset:3px;
        animation:fadeOutline 8s forwards;}
    @keyframes fadeOutline{0%{outline-width:4px}90%{outline-width:4px}
        100%{outline-width:0}}
  `;
  document.head.appendChild(Object.assign(document.createElement('style'), {textContent: css}));

  /*──────────  DOM ELEMENTS  ──────────*/
  const API = 'https://frappe-guide-backend.onrender.com';
  let tutorial = [], keywords = [], index = 0, target = null;

  /* panel */
  const panel = document.createElement('div');
  panel.className = 'gp';
  panel.innerHTML = `
     <h3 style="margin:0 0 12px;color:#3B82F6">🤖  Frappe Guide</h3>
     <div id="ask">
        <p style="margin:0 0 4px">What's your job?</p>
        <input id="job" placeholder="e.g. Procurement Manager">
        <select id="ind">
          <option>Manufacturing</option><option>Retail</option><option>Services</option>
        </select>
        <button id="go">Analyze</button>
     </div>
     <div id="run" style="display:none">
        <div id="info" class="gs"></div>
     </div>
  `;
  document.body.appendChild(panel);

  /* cursor */
  const cursor = document.body.appendChild(Object.assign(
    document.createElement('div'), {className:'gc',innerHTML:'●'}));

  /*──────────  HELPERS  ──────────*/
  const $ = sel => document.querySelector(sel);
  const sleep = ms => new Promise(r=>setTimeout(r,ms));

  /** find DOM element whose label/placeholder/text includes keyword */
  function findElement(keyword){
      const lower = kw => kw?.toLowerCase() || '';
      const match = el => {
         const txt = lower(el.textContent);
         const ph  = lower(el.getAttribute('placeholder'));
         const dl  = lower(el.getAttribute('data-label'));
         return [txt,ph,dl].some(x=>x.includes(keyword));
      };
      const elements = document.querySelectorAll('button, a, [role="button"], input, select');
      return Array.from(elements).find(e=>match(e) && e.offsetParent);
  }

  function moveCursorTo(el){
      const r = el.getBoundingClientRect();
      cursor.style.left = (r.left + r.width/2 - 30) + 'px';
      cursor.style.top  = (r.top  + r.height/2 - 30) + 'px';
      cursor.style.display = 'flex';
  }

  async function showStep(){
      if(index >= tutorial.length){
          $('#info').innerHTML = '<strong>✅  Complete!</strong>';
          cursor.style.display = 'none';
          return;
      }
      const msg = `<strong>Step ${index+1}/${tutorial.length}</strong><br>${tutorial[index]}`;
      $('#info').innerHTML = msg;

      /* highlight target element */
      target?.removeAttribute('data-guide-highlight');
      const kw = keywords[index].toLowerCase();
      target = findElement(kw);

      if(!target){
          $('#info').innerHTML += `<br><em style="color:#f87171">I can’t find “${kw}” on this screen – try navigating manually.</em>`;
          cursor.style.display='none';
          return;
      }
      target.setAttribute('data-guide-highlight','');
      target.scrollIntoView({behavior:'smooth',block:'center'});
      await sleep(300);
      moveCursorTo(target);
  }

  /*──────────  MAIN FLOW  ──────────*/
  $('#go').onclick = async () => {
      const job  = $('#job').value.trim();
      if(!job) return alert('Enter job title');

      $('#ask').style.display='none';
      $('#run').style.display='block';
      $('#info').innerHTML = '⏳  Thinking…';

      const r = await fetch(API+'/analyze-job',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({job,industry:$('#ind').value})
      }).then(r=>r.json());

      tutorial = r.tutorial;
      keywords = r.keywords;
      index=0;
      await showStep();
  };

  /*──────────  CLICK‑TO‑ADVANCE  ──────────*/
  document.addEventListener('click', async ev => {
      /* ignore clicks inside our panel */
      if(panel.contains(ev.target)) return;

      /* give the DOM time to change */
      await sleep(500);

      /* if the user clicked the expected element, advance */
      if(target && (ev.target===target || ev.target.closest('[data-guide-highlight]'))){
          index++;
          await showStep();
      }else{
          /* user clicked elsewhere – keep current step, re‑scan & guide again */
          await showStep();
      }
  }, true);

  console.log('✅ Frappe Guide Ready');
})();
