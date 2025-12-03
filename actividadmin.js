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
  const collapsedClients = new Set();
  let collapsedInitialized = false;

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

  function parseDMY(s){
    const m = String(s||'').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (!m) return null;
    let d = parseInt(m[1],10), M = parseInt(m[2],10)-1, y = parseInt(m[3],10);
    if (y < 100) y += 2000;
    const dt = new Date(y, M, d); dt.setHours(0,0,0,0);
    return isNaN(dt.getTime()) ? null : dt;
  }

  function normalizeLegacyClients(list){
    try{
      const idx = headerIndex(['CLIENTE']);
      if (idx < 0) return;
      list.forEach(r => {
        if (!r) return;
        const raw = String(r[idx]||'').trim().toLowerCase();
        if (!raw) return;
        if (raw === 'jajaja') r[idx] = 'Cliente 1';
        else if (raw === 'qqq') r[idx] = 'Cliente 2';
        else if (raw === 'www') r[idx] = 'Cliente 3';
      });
    }catch(e){ console.warn('[actividadmin] normalizeLegacyClients', e); }
  }

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
    const iIni = headerIndex(['INICIO DEL SERVICIO']);
    const iTerm = headerIndex(['TERMINACION DEL SERVICIO','TERMINACIÓN DEL SERVICIO']);

    const today = new Date(); today.setHours(0,0,0,0);
    let d = 0;
    if (iIni>=0){
      const di = parseDMY(row[iIni]);
      const dt = parseDMY(row[iTerm]);
      if (di){
        // Si la terminación es pasada, usamos terminación; si es futura o vacía, contamos hasta hoy
        let end = today;
        if (dt && dt >= di && dt <= today) end = dt;
        if (end >= di){
          d = Math.max(0, Math.ceil((end - di)/(1000*60*60*24)) + 1);
        }
      }
    }

    const p = iPrecio>=0 ? num(row[iPrecio]) : 0;

    // Actualizar días en servicio en memoria para mostrar el valor dinámico
    if (iDias>=0 && d>0) row[iDias] = String(d);

    // Recalcular siempre el importe en vista, sin tocar el CSV original
    const monto = d*p;
    const prop = iProp>=0 ? String(row[iProp]||'').trim().toUpperCase() : '';
    if (prop==='PCT' && iIng>=0) row[iIng] = String(monto);
    if (prop!=='PCT' && iRen>=0) row[iRen] = String(monto);
  }

  function saveRowsToLocal(){
    try {
      const lsKey = 'actividad:newRows';
      const normalizeRow = (r)=>{
        if (Array.isArray(r)) return r;
        if (!r || typeof r !== 'object') return [];
        const out = [];
        for (let i=0;i<headers.length;i++){
          out[i] = r[i] ?? '';
        }
        return out;
      };
      const clean = Array.isArray(rows) ? rows.map(normalizeRow) : [];
      localStorage.setItem(lsKey, JSON.stringify(clean));
    } catch(e) {
      console.warn('[actividadmin] No se pudo guardar en localStorage', e);
    }
  }

  function attachDateMask(input){
    if (!input) return;
    input.addEventListener('input', (e)=>{
      let value = String(e.target.value||'').replace(/\D/g,'');
      if (value.length>6) value = value.slice(0,6);
      let f='';
      if (value.length>=1) f += value.slice(0,2);
      if (value.length>=3) f += '/' + value.slice(2,4);
      if (value.length>=5) f += '/' + value.slice(4,6);
      e.target.value = f;
    });
  }

  function renderHead(){
    const tr = document.createElement('tr');
    visible.labels.forEach(l=>{ const th = document.createElement('th'); th.textContent = l; tr.appendChild(th); });
    thead.innerHTML=''; thead.appendChild(tr);
  }

  function renderBody(data){
    const frag = document.createDocumentFragment();
    const iCliente = headerIndex(['CLIENTE']);
    const iArea = headerIndex(['AREA DEL CLIENTE','ÁREA DEL CLIENTE']);
    const iPrecio = headerIndex(['PRECIO']);
    const iTerm = headerIndex(['TERMINACION DEL SERVICIO','TERMINACIÓN DEL SERVICIO']);
    const iIng = headerIndex(['INGRESO ACUMULADO','INGRESO ACUMULDDO']);
    const iRen = headerIndex(['RENTA ACUMULADA']);

    // Construir estructura Cliente -> Área -> filas
    const groups = new Map();
    data.forEach(r => {
      const cli = iCliente>=0 ? String(r[iCliente]||'').trim() : '';
      const area = iArea>=0 ? String(r[iArea]||'').trim() : '';
      if (!groups.has(cli)) groups.set(cli, new Map());
      const byArea = groups.get(cli);
      if (!byArea.has(area)) byArea.set(area, []);
      byArea.get(area).push(r);
    });

    const sortedClients = Array.from(groups.keys()).sort((a,b)=>a.localeCompare(b||'', 'es', {sensitivity:'base'}));

    // Si es la primera vez y no hay estado de colapso, colapsar todos por defecto (una sola vez)
    if (!collapsedInitialized && collapsedClients.size === 0){
      sortedClients.forEach(c => collapsedClients.add(c));
      collapsedInitialized = true;
    }

    sortedClients.forEach(cli => {
      const byArea = groups.get(cli);
      const clientRow = document.createElement('tr');
      const tdCli = document.createElement('td');
      tdCli.colSpan = visible.order.length;
      tdCli.style.background = '#f3f4f6';
      tdCli.style.fontWeight = '700';
      tdCli.style.padding = '6px 10px';
      tdCli.style.cursor = 'pointer';

      const isCollapsed = collapsedClients.has(cli);
      const caret = document.createElement('span');
      caret.textContent = isCollapsed ? '►' : '▼';
      caret.style.marginRight = '8px';
      const title = document.createElement('span');
      title.textContent = cli || '— Sin cliente —';
      tdCli.appendChild(caret);
      tdCli.appendChild(title);

      tdCli.addEventListener('click', ()=>{
        if (collapsedClients.has(cli)) collapsedClients.delete(cli); else collapsedClients.add(cli);
        renderBody(view);
      });

      clientRow.appendChild(tdCli);
      frag.appendChild(clientRow);

      if (isCollapsed) return;

      const sortedAreas = Array.from(byArea.keys()).sort((a,b)=>a.localeCompare(b||'', 'es', {sensitivity:'base'}));
      sortedAreas.forEach(area => {
        const areaRow = document.createElement('tr');
        const tdArea = document.createElement('td');
        tdArea.colSpan = visible.order.length;
        tdArea.textContent = area || '— Sin área —';
        tdArea.style.background = '#f9fafb';
        tdArea.style.fontWeight = '600';
        tdArea.style.padding = '4px 10px';
        areaRow.appendChild(tdArea);
        frag.appendChild(areaRow);

        const rowsForArea = byArea.get(area) || [];
        rowsForArea.forEach(r => {
          ensureComputedAmounts(r);
          const tr = document.createElement('tr');
          visible.order.forEach((idx, j)=>{
            const td = document.createElement('td');
            const label = visible.labels[j] || '';
            const upperLabel = norm(label).toUpperCase();
            const isPrecioCol = idx === iPrecio || upperLabel==='PRECIO';
            const isTermCol = idx === iTerm || upperLabel==='TERMINACION DEL SERVICIO';
            if (isTermCol){
              const inp = document.createElement('input');
              inp.type = 'text';
              inp.placeholder = 'dd/mm/aa';
              inp.style.width = '100%';
              inp.style.boxSizing = 'border-box';
              inp.value = String(r[idx] ?? '');
              attachDateMask(inp);
              const commitTerm = ()=>{
                r[idx] = inp.value.trim();
                ensureComputedAmounts(r);
                saveRowsToLocal();
                renderBody(view);
              };
              inp.addEventListener('change', commitTerm);
              inp.addEventListener('blur', commitTerm);
              td.appendChild(inp);
            } else if (isPrecioCol){
              const inp = document.createElement('input');
              inp.type = 'number';
              inp.step = '0.01';
              inp.style.width = '100%';
              inp.style.boxSizing = 'border-box';
              inp.style.textAlign = 'right';
              inp.value = String(r[idx] ?? '');
              const commitPrecio = ()=>{
                const v = parseFloat(String(inp.value||'').replace(/,/g,''));
                r[idx] = isNaN(v) ? '' : String(v);
                ensureComputedAmounts(r);
                saveRowsToLocal();
                renderBody(view);
              };
              inp.addEventListener('change', commitPrecio);
              inp.addEventListener('blur', commitPrecio);
              inp.addEventListener('keydown', (e)=>{
                if (e.key === 'Enter'){ e.preventDefault(); commitPrecio(); }
              });
              td.appendChild(inp);
            } else if (idx === iIng || idx === iRen) {
              const valNum = num(r[idx]);
              td.textContent = valNum ? ('$' + fmt(valNum)) : '$0';
              td.style.textAlign = 'right';
            } else {
              td.textContent = String(r[idx] ?? '');
            }
            tr.appendChild(td);
          });
          frag.appendChild(tr);
        });
      });
    });
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
      const lsKey = 'actividad:newRows';
      let extra = [];
      try{
        extra = JSON.parse(localStorage.getItem(lsKey) || '[]');
      }catch{
        extra = [];
      }

      if (Array.isArray(extra) && extra.length){
        // Cuando hay caché en localStorage, usarla como fuente principal.
        // Las cabeceras se toman del CSV para conservar el mapeo de columnas.
        const resp = await fetch(SRC); const txt = await resp.text();
        const parsed = Papa.parse(txt, { skipEmptyLines:true });
        const data = parsed.data || [];
        let headerRow = 0; for (let i=0;i<Math.min(20,data.length);i++){ if (isLikelyHeaderRow(data[i])){ headerRow = i; break; } }
        headers = data[headerRow] || [];
        rows = extra;
        normalizeLegacyClients(rows);
      } else {
        // Sin caché local, usar únicamente el CSV como respaldo.
        const resp = await fetch(SRC); const txt = await resp.text();
        const parsed = Papa.parse(txt, { skipEmptyLines:true });
        const data = parsed.data || [];
        let headerRow = 0; for (let i=0;i<Math.min(20,data.length);i++){ if (isLikelyHeaderRow(data[i])){ headerRow = i; break; } }
        headers = data[headerRow] || [];
        rows = data.slice(headerRow+1);
        normalizeLegacyClients(rows);
      }
      buildVisible();
      view = rows; renderHead(); renderBody(view);
    }catch(e){ console.error('[actividadmin] Error al cargar datos', e); }
  }

  q.addEventListener('input', applyFilter);
  if (document.readyState === 'complete') { setTimeout(load,0); } else { window.addEventListener('load', load); }
})();
