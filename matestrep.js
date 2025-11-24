(function(){
  // Utils
  function $(sel, ctx){ return (ctx||document).querySelector(sel); }
  function $all(sel, ctx){ return Array.from((ctx||document).querySelectorAll(sel)); }
  function num(v){ const n = parseFloat(String(v).replace(/,/g,'')); return isFinite(n) ? n : 0; }
  function fmt(n, d=2){ return Number(n).toFixed(d); }
  function showToast(msg){
    const el = $('#toast'); if (!el) return; el.textContent = msg||'Listo';
    el.style.display='block'; clearTimeout(showToast._t);
    showToast._t = setTimeout(()=>{ el.style.display='none'; }, 2000);
  }

  // Mount basic sections
  function mount(){
    const head = $('#mtr-head');
    if (head) head.innerHTML = `
      <h2>Encabezado</h2>
      <div class="meta">
        <div>
          <div class="label">Proveedor</div>
          <div class="value"><input id="prov" class="input" type="text" placeholder="Jiangsu ..." style="width:260px"></div>
        </div>
        <div>
          <div class="label">Material / Grado</div>
          <div class="value"><input id="grade" class="input" type="text" value="30CrMoA" style="width:160px"></div>
        </div>
        <div>
          <div class="label">Norma</div>
          <div class="value"><input id="standard" class="input" type="text" placeholder="ASTM A370 / ..." style="width:220px"></div>
        </div>
        <div>
          <div class="label">Heat No.</div>
          <div class="value"><input id="heatno" class="input" type="text" style="width:160px"></div>
        </div>
        <div>
          <div class="label">P.O. No.</div>
          <div class="value"><input id="pono" class="input" type="text" style="width:160px"></div>
        </div>
        <div>
          <div class="label">Equipo/Activo</div>
          <div class="value"><input id="equip" class="input" type="text" placeholder="EQ-0001" style="width:180px"></div>
        </div>
        <div>
          <div class="label">Fecha</div>
          <div class="value"><input id="date" class="input" type="date" style="width:160px"></div>
        </div>
      </div>
      <div class="meta" id="mtr-meta">
        <div>
          <div class="label">Usuario</div>
          <div class="value" id="mtrMetaUser">—</div>
        </div>
        <div>
          <div class="label">Fecha/Hora registro</div>
          <div class="value" id="mtrMetaDate">—</div>
        </div>
        <div>
          <div class="label">Ubicación</div>
          <div class="value" id="mtrMetaGeo">—</div>
        </div>
      </div>
      <div class="grid2">
        <div>
          <label>Adjuntar certificado (imagen o PDF)</label>
          <input id="certFile" type="file" accept="image/*,.pdf">
          <div style="margin-top:8px"><img id="certPreview" class="preview" alt="preview" style="max-height:220px; display:none"></div>
        </div>
        <div>
          <label>Notas</label>
          <textarea id="notes" placeholder="Observaciones…"></textarea>
        </div>
      </div>
    `;

    const chem = $('#mtr-chem');
    if (chem) chem.innerHTML = `
      <h2>Composición Química (%)</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Elemento</th><th>Límite</th><th>Valor</th></tr></thead>
          <tbody id="chemBody">
            ${['C','Si','Mn','P','S','Cr','Mo','Ni','Cu'].map(el=>`
              <tr>
                <td>${el}</td>
                <td><input class="input" data-field="${el}-lim" placeholder="ej. 0.26-0.34"></td>
                <td><input class="input chem" data-field="${el}" type="number" step="0.0001"></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;

    const ht = $('#mtr-ht');
    if (ht) ht.innerHTML = `
      <h2>Tratamiento Térmico</h2>
      <div class="row">
        <div class="col" style="grid-column: span 4">
          <label>Normalizado (°C)</label>
          <input id="ht_norm" class="input" type="number" step="1" value="860">
        </div>
        <div class="col" style="grid-column: span 4">
          <label>Temple (°C)</label>
          <input id="ht_quench" class="input" type="number" step="1" value="860">
        </div>
        <div class="col" style="grid-column: span 4">
          <label>Medio de temple</label>
          <input id="ht_media" class="input" type="text" placeholder="Aceite / Aire">
        </div>
      </div>
      <div class="row">
        <div class="col" style="grid-column: span 6">
          <label>Primer Revenido (°C)</label>
          <input id="ht_temper1" class="input" type="number" step="1" value="650">
        </div>
        <div class="col" style="grid-column: span 6">
          <label>Segundo Revenido (°C)</label>
          <input id="ht_temper2" class="input" type="number" step="1" value="550">
        </div>
      </div>
    `;

    const mech = $('#mtr-mech');
    if (mech) mech.innerHTML = `
      <h2>Propiedades Mecánicas</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Propiedad</th><th>Unidad</th><th>Requerido</th><th>Medido</th></tr></thead>
          <tbody>
            <tr><td>Límite de Fluencia (YS)</td><td>MPa</td><td><input class="input" id="ys_req" placeholder=">"></td><td><input class="input" id="ys" type="number" step="1"></td></tr>
            <tr><td>Resistencia a la Tracción (UTS)</td><td>MPa</td><td><input class="input" id="uts_req"></td><td><input class="input" id="uts" type="number" step="1"></td></tr>
            <tr><td>Elongación (EL)</td><td>%</td><td><input class="input" id="el_req"></td><td><input class="input" id="el" type="number" step="0.1"></td></tr>
            <tr><td>Reducción de Área (RA)</td><td>%</td><td><input class="input" id="ra_req"></td><td><input class="input" id="ra" type="number" step="0.1"></td></tr>
          </tbody>
        </table>
      </div>
    `;

    const ch = $('#mtr-charpy');
    if (ch) ch.innerHTML = `
      <h2>Impacto Charpy V (KV)</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Condición</th><th>KV1 (J)</th><th>KV2 (J)</th><th>KV3 (J)</th><th>Promedio (J)</th></tr></thead>
          <tbody>
            ${['Ambiente','0°C','-20°C','-40°C'].map((t,i)=>`
              <tr data-row="${i}">
                <td>${t}</td>
                <td><input class="input kv" data-k="1" type="number" step="1"></td>
                <td><input class="input kv" data-k="2" type="number" step="1"></td>
                <td><input class="input kv" data-k="3" type="number" step="1"></td>
                <td class="num"><span class="avg">0</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;

    const hd = $('#mtr-hardness');
    if (hd) hd.innerHTML = `
      <h2>Dureza</h2>
      <div class="row">
        <div class="col" style="grid-column: span 6">
          <label>HBW Requerido</label>
          <input id="hbw_req" class="input" placeholder="170-255">
        </div>
        <div class="col" style="grid-column: span 6">
          <label>HBW Medido</label>
          <input id="hbw" class="input" type="number" step="1">
        </div>
      </div>
    `;

    const notes = $('#mtr-notes');
    if (notes && !$('#notes')){
      // notes ya está en head; solo aseguramos su existencia
    }
  }

  function calcCharpy(){
    $all('#mtr-charpy tbody tr').forEach(tr=>{
      const v = [1,2,3].map(k=> num($(`input.kv[data-k="${k}"]`, tr)?.value));
      const avg = v.reduce((a,b)=>a+b,0) / (v.filter(x=>x||x===0).length || 1);
      const cell = $('.avg', tr); if (cell) cell.textContent = fmt(avg,0);
    });
  }

  function bind(){
    // Preview de imagen
    const file = $('#certFile');
    const img = $('#certPreview');
    if (file){
      file.addEventListener('change', ()=>{
        const f = file.files && file.files[0];
        if (!f){ if (img) img.style.display='none'; return; }
        if (f.type.startsWith('image/')){
          const r = new FileReader();
          r.onload = ()=>{ if (img){ img.src = r.result; img.style.display='block'; } };
          r.readAsDataURL(f);
        } else { if (img) img.style.display='none'; }
      });
    }

    // Charpy promedio
    $all('#mtr-charpy input.kv').forEach(i=> i.addEventListener('input', calcCharpy));

    // Botones
    $('#mtr-print')?.addEventListener('click', ()=> window.print());
    $('#mtr-clear')?.addEventListener('click', ()=>{ buildState({}); showToast('Limpio'); });
    $('#mtr-save')?.addEventListener('click', save);
    $('#mtr-load')?.addEventListener('click', loadDraft);

    // Cargar inventario para Equipos/Activos y autocompletar
    try{
      const CSV_SRC = 'docs/INVENTARIO GENERAL PCT 2025 UNIFICADO.csv';
      if (window.Papa){
        window.Papa.parse(CSV_SRC, {
          download: true,
          header: false,
          complete: (res)=>{
            try{
              const rows = Array.isArray(res.data) ? res.data : [];
              // Detectar clave de equipo/activo buscando en varias columnas
              function pickKey(r){
                const cands = [r[2], r[3], r[1], r[4]]; // orden de probables según inventario
                for (const c of cands){
                  const v = String(c||'').trim();
                  if (!v) continue;
                  if (/TOMAR\s*SERIAL/i.test(v)) continue;
                  if (/^SERIAL$/i.test(v)) continue;
                  if (/^PCT\-[A-Z0-9-]+$/i.test(v)) return v; // aceptar sólo PCT-...
                }
                return '';
              }
              function pickDesc(r){
                // Prioriza descripción larga si existe
                const d = String(r[5]||r[4]||'').trim();
                return d;
              }
              const items = rows
                .filter(r=> Array.isArray(r) && r.length>5)
                .map(r=> ({ key: pickKey(r), desc: pickDesc(r) }))
                .filter(it=> it.key);
              const unique = new Map();
              for (const it of items){ if (!unique.has(it.key)) unique.set(it.key, it.desc); }
              try{ window._equipIndex = unique; }catch{}
              const list = $('#equipList');
              if (list){
                list.innerHTML = '';
                for (const [k,v] of unique){ const opt = document.createElement('option'); opt.value = k; opt.label = v; list.appendChild(opt); }
              }
              const input = $('#equip'); const descEl = $('#equipDesc');
              function syncDesc(){ const k = String(input.value||'').trim(); const d = unique.get(k) || ''; if (descEl) descEl.textContent = d; }
              if (input){ input.addEventListener('input', syncDesc); input.addEventListener('change', syncDesc); }
              // Si ya hay un valor cargado, sincronizar
              setTimeout(()=>{
                syncDesc();
                // Si no es válido, autoasignar el primero disponible
                const k = String(input?.value||'').trim();
                if (!k || !unique.has(k)){
                  const keys = Array.from(unique.keys());
                  if (keys.length){ const rand = keys[Math.floor(Math.random()*keys.length)]; input.value = rand; syncDesc(); }
                }
              }, 0);
            }catch{}
          }
        });
      }
    }catch{}
  }

  function gather(){
    // Encabezado
    const data = {
      head: {
        prov: $('#prov')?.value||'', grade: $('#grade')?.value||'', standard: $('#standard')?.value||'',
        heatno: $('#heatno')?.value||'', pono: $('#pono')?.value||'', equip: $('#equip')?.value||'', date: $('#date')?.value||''
      },
      chem: {},
      ht: {
        normalize: num($('#ht_norm')?.value), quench: num($('#ht_quench')?.value), media: $('#ht_media')?.value||'',
        temper1: num($('#ht_temper1')?.value), temper2: num($('#ht_temper2')?.value)
      },
      mech: {
        ys_req: $('#ys_req')?.value||'', uts_req: $('#uts_req')?.value||'', el_req: $('#el_req')?.value||'', ra_req: $('#ra_req')?.value||'',
        ys: num($('#ys')?.value), uts: num($('#uts')?.value), el: num($('#el')?.value), ra: num($('#ra')?.value)
      },
      charpy: $all('#mtr-charpy tbody tr').map(tr=>{
        const vs = [1,2,3].map(k=> num($(`input.kv[data-k="${k}"]`, tr)?.value));
        return { v1:vs[0], v2:vs[1], v3:vs[2], avg: num($('.avg', tr)?.textContent) };
      }),
      hardness: { hbw_req: $('#hbw_req')?.value||'', hbw: num($('#hbw')?.value) },
      notes: $('#notes')?.value||'',
      createdAt: Date.now(),
    };
    $all('#chemBody tr').forEach(tr=>{
      const f = tr.querySelector('input.chem')?.dataset.field||''; if (!f) return;
      data.chem[f.replace(/-.*/, '')] = num(tr.querySelector('input.chem')?.value);
      data.chem[f.replace(/-.*/, '')+"_lim"] = tr.querySelector('input[data-field$="-lim"]')?.value||'';
    });
    // Adjuntar imagen embebida si existe
    const img = $('#certPreview');
    if (img && img.src && img.style.display!=='none') data.certificate = img.src;
    // Metadata adicional
    try{ data.meta = { user: (window.currentUser?.email||null), role: (window.currentRole||null), tzOffset: new Date().getTimezoneOffset(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone, capturedAt: new Date().toISOString(), geo: window._mtr_geo || null }; }catch{}
    return data;
  }

  function buildState(data){
    // Reset valores
    $('#prov') && ($('#prov').value = data.head?.prov || '');
    $('#grade') && ($('#grade').value = data.head?.grade || '');
    $('#standard') && ($('#standard').value = data.head?.standard || '');
    $('#heatno') && ($('#heatno').value = data.head?.heatno || '');
    $('#pono') && ($('#pono').value = data.head?.pono || '');
    $('#date') && ($('#date').value = data.head?.date || '');

    $all('#chemBody tr').forEach(tr=>{
      const el = tr.querySelector('input.chem')?.dataset.field?.replace(/-.*/, '');
      if (!el) return; const lim = el+'_lim';
      tr.querySelector('input.chem').value = data.chem?.[el] ?? '';
      const limEl = tr.querySelector('input[data-field$="-lim"]'); if (limEl) limEl.value = data.chem?.[lim] || '';
    });

    $('#ht_norm') && ($('#ht_norm').value = data.ht?.normalize ?? '');
    $('#ht_quench') && ($('#ht_quench').value = data.ht?.quench ?? '');
    $('#ht_media') && ($('#ht_media').value = data.ht?.media || '');
    $('#ht_temper1') && ($('#ht_temper1').value = data.ht?.temper1 ?? '');
    $('#ht_temper2') && ($('#ht_temper2').value = data.ht?.temper2 ?? '');

    $('#ys_req') && ($('#ys_req').value = data.mech?.ys_req || '');
    $('#uts_req') && ($('#uts_req').value = data.mech?.uts_req || '');
    $('#el_req') && ($('#el_req').value = data.mech?.el_req || '');
    $('#ra_req') && ($('#ra_req').value = data.mech?.ra_req || '');
    $('#ys') && ($('#ys').value = data.mech?.ys ?? '');
    $('#uts') && ($('#uts').value = data.mech?.uts ?? '');
    $('#el') && ($('#el').value = data.mech?.el ?? '');
    $('#ra') && ($('#ra').value = data.mech?.ra ?? '');

    const rows = $all('#mtr-charpy tbody tr');
    (data.charpy||[]).forEach((r, i)=>{
      const tr = rows[i]; if (!tr) return;
      const ks = [r.v1, r.v2, r.v3];
      ks.forEach((v, idx)=>{ const inp = $(`input.kv[data-k="${idx+1}"]`, tr); if (inp) inp.value = v ?? ''; });
      const avg = $('.avg', tr); if (avg) avg.textContent = r?.avg ? fmt(r.avg,0) : '0';
    });

    $('#hbw_req') && ($('#hbw_req').value = data.hardness?.hbw_req || '');
    $('#hbw') && ($('#hbw').value = data.hardness?.hbw ?? '');
    $('#notes') && ($('#notes').value = data.notes || '');

    const img = $('#certPreview');
    if (img){
      if (data.certificate){ img.src = data.certificate; img.style.display='block'; }
      else { img.removeAttribute('src'); img.style.display='none'; }
    }
    // Metadata visual
    try{
      $('#mtrMetaUser') && ($('#mtrMetaUser').textContent = data.meta?.user || data.createdBy || '—');
      const when = data.meta?.capturedAt || data.createdAt || data.createdAtTS || null;
      $('#mtrMetaDate') && ($('#mtrMetaDate').textContent = when ? (new Date(when)).toLocaleString() : '—');
      const g = data.meta?.geo || data.geo;
      const gtxt = g && g.lat!=null ? `${Number(g.lat).toFixed(6)}, ${Number(g.lng).toFixed(6)}` : '—';
      $('#mtrMetaGeo') && ($('#mtrMetaGeo').textContent = gtxt);
    }catch{}
    calcCharpy();
  }

  function save(){
    // Solo admin/supervisor pueden guardar
    const role = (window.currentRole||'');
    if (!/^(admin|supervisor)$/i.test(role)) { showToast('No autorizado'); return; }
    const data = gather();
    // Intentar Firestore si está disponible
    const user = (window.auth && window.auth.currentUser) || null;
    const db = (window.firebase && window.firebase.firestore && window.db) || window.db;
    if (user && db && db.collection){
      try{
        db.collection('material_tests').add({
          ...data,
          createdBy: user.email || null,
          createdAtTS: new Date()
        }).then(()=>{
          localStorage.setItem('mtr_draft', JSON.stringify(data));
          showToast('Guardado en la nube');
        }).catch(()=>{
          localStorage.setItem('mtr_draft', JSON.stringify(data));
          showToast('Guardado local (offline)');
        });
        return;
      }catch(e){ /* fallback local */ }
    }
    localStorage.setItem('mtr_draft', JSON.stringify(data));
    showToast('Guardado local');
  }

  function loadDraft(){
    const raw = localStorage.getItem('mtr_draft');
    if (!raw){ showToast('Sin borrador'); return; }
    try{ buildState(JSON.parse(raw)); showToast('Cargado'); }catch{ showToast('Error al cargar'); }
  }

  async function loadById(id){
    if (!id){ return false; }
    // 1) Cargar borrador local
    if (id === 'local-draft'){ loadDraft(); return true; }
    // 2) Cargar de semilla local
    if (id && /^seed-/.test(id)){
      try{
        let seed = JSON.parse(localStorage.getItem('mtr_seed_list')||'[]');
        let rec = (seed||[]).find(r=> String(r.id) === String(id));
        const needsRegen = !seed || seed.length===0 || !seed[0]?.chem || !seed[0]?.charpy || !seed[0]?.mech;
        if (!rec || needsRegen){
          // Regenerar semillas completas
          const rnd = (min,max,d=3)=> Number((min + Math.random()*(max-min)).toFixed(d));
          const ranges = { C:[0.26,0.34], Si:[0.17,0.37], Mn:[0.40,0.70], P:[0,0.030], S:[0,0.030], Cr:[0.80,1.10], Mo:[0.15,0.25], Ni:[0,0.30], Cu:[0,0.30] };
          const limitsStr = { C:'0.26–0.34', Si:'0.17–0.37', Mn:'0.40–0.70', P:'≤0.030', S:'≤0.030', Cr:'0.80–1.10', Mo:'0.15–0.25', Ni:'≤0.30', Cu:'≤0.30' };
          const base = new Date();
          const makeSeed = (count)=>{
            const arr=[]; for(let i=0;i<count;i++){ const d=new Date(base.getTime()-i*86400000); const idx=String(i+1).padStart(3,'0'); const chem={}; Object.keys(ranges).forEach(k=>{ chem[k]=rnd(ranges[k][0],ranges[k][1]); chem[k+"_lim"]=limitsStr[k]; }); const charpy=['Ambiente','0°C','-20°C','-40°C'].map(()=>{ const v1=Math.round(rnd(60,78,0)), v2=Math.round(rnd(60,78,0)), v3=Math.round(rnd(60,78,0)); const avg=Math.round((v1+v2+v3)/3); return {v1,v2,v3,avg};}); arr.push({ id:'seed-'+idx, createdAtTS:d, head:{ grade: i%2===0?'30CrMoA':'AISI 4130', heatno:`H${d.getFullYear()}-${idx}`, prov: i%3===0?'Jiangsu Hongda':(i%3===1?'Baosteel':'TISCO'), standard:'ASTM A370/ASTM A29', pono:'PO-'+idx, date:d.toISOString().slice(0,10)}, chem, ht:{ normalize:860, quench:860, media:(i%2?'Aire':'Aceite'), temper1:650, temper2:550 }, mech:{ ys_req:'≥ 686', uts_req:'≥ 930', el_req:'≥ 12', ra_req:'≥ 45', ys: Math.round(rnd(700,780,0)), uts: Math.round(rnd(930,1020,0)), el: Number(rnd(16,22,1)), ra: Math.round(rnd(50,68,0)) }, charpy: charpy, hardness:{ hbw_req:'170-255', hbw: Math.round(rnd(200,245,0)) }, notes:'Reporte simulado para demostración.', createdBy: i%2===0?'inspector01@pct.com':'inspector02@pct.com' }); } return arr; };
          seed = makeSeed(30);
          try{ localStorage.setItem('mtr_seed_list', JSON.stringify(seed)); }catch{}
          rec = seed.find(r=> String(r.id) === String(id));
        }
        if (rec){ buildState(rec); showToast('Reporte demo cargado'); return true; }
      }catch{}
    }
    // 3) Intentar Firestore
    const db = (window.firebase && window.firebase.firestore && window.db) || window.db;
    if (db && db.collection){
      try{
        const doc = await db.collection('material_tests').doc(id).get();
        if (doc && doc.exists){
          const data = doc.data();
          try{ if (data.createdAtTS && data.createdAtTS.toDate) data.createdAt = data.createdAtTS.toDate().toISOString(); }catch{}
          buildState(data||{});
          showToast('Reporte cargado');
          return true;
        }
      }catch(e){ /* ignore */ }
    }
    return false;
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', ()=>{
    mount();
    bind();
    // Intentar capturar geolocalización
    try{
      if (navigator.geolocation){
        navigator.geolocation.getCurrentPosition((pos)=>{
          window._mtr_geo = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy };
          // Mostrar si ya hay contenedor
          const el = $('#mtrMetaGeo'); if (el) el.textContent = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
        });
      }
    }catch{}
    // Cargar por id si viene en la URL, si no, cargar borrador
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id){ try{ document.documentElement.setAttribute('data-readonly','1'); }catch{} }
    if (id){
      loadById(id).then((ok)=>{
        if (!ok){ try{ const raw = localStorage.getItem('mtr_draft'); if (raw) buildState(JSON.parse(raw)); }catch{} }
      });
    } else {
      try{ const raw = localStorage.getItem('mtr_draft'); if (raw) buildState(JSON.parse(raw)); }catch{}
    }
  });
})();
