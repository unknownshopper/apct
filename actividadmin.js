(function(){
  const SRC_BASE = 'docs/REGISTRO DE ACTIVIDAD PCT 2025.csv';
  const SRC = SRC_BASE + '?t=' + Date.now();

  const thead = document.getElementById('theadMin');
  const tbody = document.getElementById('tbodyMin');
  const q = document.getElementById('qmin');
  const count = document.getElementById('countmin');
  const kIngr = document.getElementById('kpi-ingresos');
  const kRent = document.getElementById('kpi-rentas');
  const kTicket = document.getElementById('kpi-ticket');

  let headers = [];
  let rows = [];
  let view = [];
  let visible = null;

  const norm = (s)=> String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const fmt = (n)=> n.toLocaleString('es-MX', { minimumFractionDigits:0, maximumFractionDigits:2 });
  const num = (s)=>{ const n = parseFloat(String(s||'').toString().replace(/,/g,'')); return isNaN(n) ? 0 : n; };

  function isLikelyHeaderRow(row){
    const r = (row||[]).map(norm).map(s=>s.toLowerCase());
    const hope = ['equipo / activo','equipo/activo','equipo activo','descripcion','descripción','cliente'];
    let hits = 0; hope.forEach(h=>{ if (r.includes(h)) hits++; });
    return hits >= 2;
  }

  function headerIndex(variants){ const H = headers.map(h=>norm(h).toUpperCase()); for(const v of variants){ const i = H.indexOf(norm(v).toUpperCase()); if (i>=0) return i; } return -1; }

  function buildVisible(){
    const wanted = ['CLIENTE','EQUIPO / ACTIVO','EQUIPO/ACTIVO','EQUIPO ACTIVO','INICIO DEL SERVICIO','TERMINACION DEL SERVICIO','TERMINACIÓN DEL SERVICIO','DIAS EN SERVICIO','DÍAS EN SERVICIO','PRECIO','INGRESO ACUMULADO','INGRESO ACUMULDDO','RENTA ACUMULADA','O. S.','ORDEN DE SERVICIO','FACTURA'];
    const H = headers.map(h=>norm(h).toUpperCase());
    const order=[]; const labels=[]; const seen = new Set();
    const pick = (name)=>{ const i = H.indexOf(norm(name).toUpperCase()); if (i>=0 && !seen.has(i)){ order.push(i); labels.push(headers[i]); seen.add(i);} };
    wanted.forEach(pick);
    // Normalizar etiquetas comunes
    for(let i=0;i<labels.length;i++){
      const u = norm(labels[i]).toUpperCase();
      if (u==='INGRESO ACUMULDDO') labels[i] = 'INGRESO ACUMULADO';
      if (u==='O. S.' || u==='O.S.') labels[i] = 'ORDEN DE SERVICIO';
      if (u==='EQUIPO/ACTIVO' || u==='EQUIPO ACTIVO') labels[i] = 'EQUIPO / ACTIVO';
      if (u==='DIAS EN SERVICIO' || u==='DÍAS EN SERVICIO') labels[i] = 'DIAS EN SERVICIO';
      if (u==='TERMINACION DEL SERVICIO' || u==='TERMINACIÓN DEL SERVICIO') labels[i] = 'TERMINACION DEL SERVICIO';
    }
    visible = { order, labels };
  }

  function ensureComputedAmounts(row){
    const iProp = headerIndex(['PROPIEDAD']);
    const iDias = headerIndex(['DIAS EN SERVICIO','DÍAS EN SERVICIO']);
    const iPrecio = headerIndex(['PRECIO']);
    const iIng = headerIndex(['INGRESO ACUMULADO','INGRESO ACUMULDDO']);
    const iRen = headerIndex(['RENTA ACUMULADA']);
    const d = iDias>=0 ? num(row[iDias]) : 0;
    const p = iPrecio>=0 ? num(row[iPrecio]) : 0;
    if ((iIng<0 && iRen<0) || (num(row[iIng])===0 && num(row[iRen])===0)){
      const monto = d*p;
      const prop = iProp>=0 ? String(row[iProp]||'').trim().toUpperCase() : '';
      if (prop==='PCT' && iIng>=0) row[iIng] = String(monto);
      if (prop!=='PCT' && iRen>=0) row[iRen] = String(monto);
    }
  }

  function renderHead(){
    const tr = document.createElement('tr');
    visible.labels.forEach(l=>{ const th = document.createElement('th'); th.textContent = l; tr.appendChild(th); });
    thead.innerHTML=''; thead.appendChild(tr);
  }

  function renderBody(data){
    const frag = document.createDocumentFragment();
    for(let i=0;i<data.length;i++){
      const r = data[i]; ensureComputedAmounts(r);
      const tr = document.createElement('tr');
      visible.order.forEach((idx, j)=>{
        const td = document.createElement('td');
        td.textContent = String(r[idx] ?? '');
        tr.appendChild(td);
      });
      frag.appendChild(tr);
    }
    tbody.innerHTML=''; tbody.appendChild(frag);
    count.textContent = `${data.length} registros`;
    updateKpis();
  }

  function updateKpis(){
    const iIng = headerIndex(['INGRESO ACUMULADO','INGRESO ACUMULDDO']);
    const iRen = headerIndex(['RENTA ACUMULADA']);
    let sIng = 0, sRen = 0, nTickets = 0, sTickets = 0;
    view.forEach(r=>{
      ensureComputedAmounts(r);
      const ing = iIng>=0 ? num(r[iIng]) : 0;
      const ren = iRen>=0 ? num(r[iRen]) : 0;
      sIng += ing; sRen += ren;
      const tot = ing + ren; if (tot>0){ sTickets += tot; nTickets++; }
    });
    kIngr.textContent = '$' + fmt(sIng);
    kRent.textContent = '$' + fmt(sRen);
    kTicket.textContent = nTickets ? '$' + fmt(sTickets / nTickets) : '0';
  }

  function applyFilter(){
    const term = (q.value||'').toLowerCase();
    if (!term){ view = rows; } else {
      view = rows.filter(r => r.some(c => String(c||'').toLowerCase().includes(term)));
    }
    renderBody(view);
  }

  async function load(){
    try{
      const resp = await fetch(SRC); const txt = await resp.text();
      const parsed = Papa.parse(txt, { skipEmptyLines:true });
      const data = parsed.data || [];
      // Detect header row
      let headerRow = 0; for (let i=0;i<Math.min(20,data.length);i++){ if (isLikelyHeaderRow(data[i])){ headerRow = i; break; } }
      headers = data[headerRow] || [];
      rows = data.slice(headerRow+1);
      // Mezclar nuevos locales
      try{ const extra = JSON.parse(localStorage.getItem('actividad:newRows')||'[]'); if (Array.isArray(extra)&&extra.length){ rows = [...extra, ...rows]; } }catch{}
      buildVisible();
      view = rows; renderHead(); renderBody(view);
    }catch(e){ console.error('[actividadmin] Error al cargar datos', e); }
  }

  q.addEventListener('input', applyFilter);
  if (document.readyState === 'complete') { setTimeout(load,0); } else { window.addEventListener('load', load); }
})();
