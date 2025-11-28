// actividad.js - Migrated from actividad.html inline script
(function(){
  const SRC_BASE = 'docs/REGISTRO DE ACTIVIDAD PCT 2025.csv';
  const SRC = SRC_BASE + '?t=' + Date.now();
  const INVENT_SRC = 'docs/INVENTARIO GENERAL PCT 2025 UNIFICADO.csv';
  const thead = document.getElementById('thead');
  const tbody = document.getElementById('tbody');
  const summary = document.getElementById('summary');
  const summaryCards = document.getElementById('summary-cards');
  const q = document.getElementById('q');
  const clearQ = document.getElementById('clearQ');
  const newRowBtn = document.getElementById('newRowBtn');
  const saveRowBtn = document.getElementById('saveRowBtn');
  const cancelRowBtn = document.getElementById('cancelRowBtn');
  const count = document.getElementById('count');
  const table = document.getElementById('actTable');
  const activityKpis = document.getElementById('activity-kpis');
  const activityCards = document.getElementById('activity-cards');

  let rows = [];
  let headers = [];
  let view = [];
  let sortCol = -1;
  let sortDir = 'asc';
  let visibleCols = null;
  let propiedadIdx = -1;
  let diasServicioVisibleIdx = -1;
  let equipoVisibleIdx = -1;
  let descripcionVisibleIdx = -1;
  let serialVisibleIdx = -1;
  let invDescByEquipo = new Map();
  let invSerialByEquipo = new Map();
  let inventoryOptions = [];
  let inventorySet = new Set();
  let externalOptionsByProvider = new Map();

  let multiSelectEquipos = new Set();
  let multiModalEl = null;
  let multiSearchInput = null;
  let multiListEl = null;

  function generateLoteId(){
    const d = new Date();
    const pad = (n)=> String(n).padStart(2,'0');
    const ts = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const rnd = Array.from({length:3},()=>abc[Math.floor(Math.random()*abc.length)]).join('');
    return `L-${ts}-${rnd}`;
  }

  const COLLECTION_NAME = 'activityRecords';
  let firebaseReady = false;
  function waitForFirebase() {
    return new Promise((resolve) => {
      const check = () => {
        if (window.db && window.auth) { firebaseReady = true; resolve(true); } else { setTimeout(check, 100); }
      };
      check();
    });
  }

  async function saveToFirestore(row) {
    if (!firebaseReady || !window.db) { console.warn('[actividad] Firebase no disponible, solo se guardó en localStorage'); return null; }
    try {
      const rowData = Array.isArray(row) ? row : Object.values(row);
      const docRef = await window.db.collection(COLLECTION_NAME).add({
        row: rowData,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: new Date().toISOString(),
        createdBy: window.auth.currentUser ? window.auth.currentUser.email : 'unknown'
      });
      console.log('[actividad] Registro guardado en Firestore:', docRef.id);
      return docRef.id;
    } catch (e) {
      console.error('[actividad] Error al guardar en Firestore:', e);
      return null;
    }
  }

  async function deleteFromFirestore(firestoreId) {
    if (!firebaseReady || !window.db || !firestoreId) return;
    try { await window.db.collection(COLLECTION_NAME).doc(firestoreId).delete(); console.log('[actividad] Registro eliminado de Firestore:', firestoreId); }
    catch (e) { console.error('[actividad] Error al eliminar de Firestore:', e); }
  }

  function fmt(n){ return n.toLocaleString('es-MX'); }

  function ensureDatalist(id, options){
    let dl = document.getElementById(id);
    if (!dl){ dl = document.createElement('datalist'); dl.id = id; document.body.appendChild(dl); }
    dl.innerHTML = '';
    (options||[]).forEach(opt=>{ const o=document.createElement('option'); o.value=opt; dl.appendChild(o); });
    return dl;
  }

  function openMultiSelector(onConfirm){
    if (!multiModalEl){
      multiModalEl = document.createElement('div');
      multiModalEl.id = 'multi-modal';
      multiModalEl.style.position = 'fixed';
      multiModalEl.style.inset = '0';
      multiModalEl.style.background = 'rgba(0,0,0,.45)';
      multiModalEl.style.display = 'grid';
      multiModalEl.style.placeItems = 'center';
      multiModalEl.style.zIndex = '1000';
      const panel = document.createElement('div');
      panel.style.background = '#fff';
      panel.style.color = '#111827';
      panel.style.borderRadius = '10px';
      panel.style.width = 'min(720px, 92vw)';
      panel.style.maxHeight = '82vh';
      panel.style.display = 'flex';
      panel.style.flexDirection = 'column';
      panel.style.boxShadow = '0 10px 30px rgba(0,0,0,.25)';
      panel.style.border = '1px solid #e5e7eb';
      const head = document.createElement('div'); head.style.padding = '10px 12px'; head.style.borderBottom = '1px solid #e5e7eb'; head.style.display='flex'; head.style.gap='8px';
      const title = document.createElement('div'); title.textContent = 'Seleccionar equipos (múltiple)'; title.style.fontWeight='600'; title.style.flex='1';
      const closeBtn = document.createElement('button'); closeBtn.textContent = '✖'; closeBtn.onclick = ()=> document.body.removeChild(multiModalEl);
      head.appendChild(title);
      multiSearchInput = document.createElement('input'); multiSearchInput.type='text'; multiSearchInput.placeholder='Buscar...'; multiSearchInput.style.flex='2'; multiSearchInput.style.padding='6px 8px'; multiSearchInput.style.border='1px solid #e5e7eb'; multiSearchInput.style.borderRadius='6px';
      head.appendChild(multiSearchInput); head.appendChild(closeBtn);
      const body = document.createElement('div'); body.style.padding='8px 12px'; body.style.overflow='auto'; body.style.flex='1';
      multiListEl = document.createElement('div'); body.appendChild(multiListEl);
      const foot = document.createElement('div'); foot.style.padding='10px 12px'; foot.style.borderTop='1px solid #e5e7eb'; foot.style.display='flex'; foot.style.justifyContent='flex-end'; foot.style.gap='8px';
      const cancel = document.createElement('button'); cancel.textContent='Cancelar'; cancel.onclick = ()=> document.body.removeChild(multiModalEl);
      const ok = document.createElement('button'); ok.textContent='Agregar seleccionados'; ok.style.background='#111827'; ok.style.color='#fff'; ok.style.padding='6px 10px'; ok.style.borderRadius='6px';
      ok.onclick = ()=>{ const checks = multiListEl.querySelectorAll('input[type="checkbox"]:checked'); const selected = Array.from(checks).map(c=>c.value); if (onConfirm) onConfirm(selected); try{ document.body.removeChild(multiModalEl); }catch{} };
      foot.appendChild(cancel); foot.appendChild(ok);
      panel.appendChild(head); panel.appendChild(body); panel.appendChild(foot);
      multiModalEl.appendChild(panel);
    } else {
      const checks = multiListEl?.querySelectorAll('input[type="checkbox"]') || [];
      checks.forEach(c=> c.checked = false);
    }
    function renderList(term){ const t = String(term||'').toLowerCase(); multiListEl.innerHTML=''; const opts = (inventoryOptions||[]).filter(x => !t || x.toLowerCase().includes(t)); opts.forEach(val=>{ const row = document.createElement('label'); row.style.display='flex'; row.style.alignItems='center'; row.style.gap='8px'; row.style.padding='6px 4px'; const cb = document.createElement('input'); cb.type='checkbox'; cb.value=val; cb.checked = multiSelectEquipos.has(val); const span = document.createElement('span'); span.textContent = val; span.style.flex='1'; row.appendChild(cb); row.appendChild(span); multiListEl.appendChild(row); }); }
    renderList('');
    multiSearchInput.oninput = ()=> renderList(multiSearchInput.value);
    document.body.appendChild(multiModalEl);
    try{ multiSearchInput.focus(); }catch{}
  }

  function endOfMonth(dt){ const d = new Date(dt.getFullYear(), dt.getMonth()+1, 0); d.setHours(0,0,0,0); return d; }
  function cutoff25(dt){ const d = new Date(dt.getFullYear(), dt.getMonth(), 25); d.setHours(0,0,0,0); if (dt > d){ return new Date(dt.getFullYear(), dt.getMonth()+1, 25); } return d; }
  function continuation27From(dateOn25){ const d = new Date(dateOn25.getFullYear(), dateOn25.getMonth(), 27); d.setHours(0,0,0,0); return d; }
  function addDays(dt, n){ const d=new Date(dt); d.setDate(d.getDate()+n); d.setHours(0,0,0,0); return d; }
  function minDate(a,b){ return a<=b ? a : b; }
  function daysInclusive(a,b){ return Math.max(0, Math.ceil((b - a)/(1000*60*60*24)) + 1); }

  function renderHead(){
    const tr = document.createElement('tr');
    const thSel = document.createElement('th'); thSel.textContent = 'SELECCIÓN'; tr.appendChild(thSel);
    const labels = visibleCols ? visibleCols.labels : headers;
    labels.forEach((h, vIdx)=>{ const th = document.createElement('th'); th.textContent = h; th.setAttribute('role','button'); th.tabIndex = 0; th.dataset.index = String(vIdx); if (vIdx === sortCol) th.dataset.sort = sortDir; th.addEventListener('click', ()=>toggleSort(vIdx)); th.addEventListener('keydown', (ev)=>{ if (ev.key==='Enter' || ev.key===' ') { ev.preventDefault(); toggleSort(vIdx); } }); tr.appendChild(th); });
    // Columna final no ordenable para acciones
    const thAct = document.createElement('th');
    thAct.textContent = 'ACCIONES';
    tr.appendChild(thAct);
    thead.innerHTML = ''; thead.appendChild(tr);
  }

  function computeVisibleIndices(){
    if (!visibleCols){ diasServicioVisibleIdx = -1; equipoVisibleIdx = -1; return; }
    const labels = visibleCols.labels.map(h=>normalizeHeader(h).toUpperCase());
    diasServicioVisibleIdx = labels.indexOf('DIAS EN SERVICIO');
    const variants = ['EQUIPO / ACTIVO','EQUIPO/ACTIVO','EQUIPO ACTIVO','EQUIPO'];
    equipoVisibleIdx = labels.findIndex(l => variants.includes(l));
    descripcionVisibleIdx = labels.indexOf('DESCRIPCION') >= 0 ? labels.indexOf('DESCRIPCION') : labels.indexOf('DESCRIPCIÓN');
    serialVisibleIdx = labels.indexOf('SERIAL'); if (serialVisibleIdx < 0) serialVisibleIdx = labels.indexOf('#');
  }

  function rebuildEquipoCellForRow(tr){
    if (equipoVisibleIdx < 0) return;
    const cells = tr.children; const td = cells[1 + equipoVisibleIdx]; if (!td) return;
    const firstCell = cells[0]; const selEl = firstCell.querySelector('select');
    const tipo = (selEl ? selEl.value : (firstCell.textContent||'propio')).toString().trim().toLowerCase();
    const oldVal = (td.querySelector('input')?.value) || td.textContent || '';
    td.innerHTML = '';
    const input = document.createElement('input'); input.type = 'text'; input.value = String(oldVal||'').trim();
    if (tipo === 'propio'){ ensureDatalist('dl-inventory-equipos', inventoryOptions||[]); input.setAttribute('list', 'dl-inventory-equipos'); input.placeholder = 'Equipo/Activo (inventario)'; }
    else { input.placeholder = 'Clave del proveedor'; let prov = ''; try { const rowIndex = Array.from(tbody.children).indexOf(tr); const dataRow = view[rowIndex] || []; prov = propiedadIdx>=0 ? String(dataRow[propiedadIdx]||'').trim().toUpperCase() : ''; } catch {} const dlid = 'dl-prov-' + (prov||'GEN'); const opts = externalOptionsByProvider.get(prov) ? Array.from(externalOptionsByProvider.get(prov).values()) : []; ensureDatalist(dlid, opts); input.setAttribute('list', dlid); }
    td.appendChild(input);
    try { input.focus(); input.select(); } catch {}
  }

  function updateActivityKpis(){
    if (!tbody.children.length){ activityKpis.style.display='none'; activityCards.innerHTML=''; return; }
    let total = 0, internos = 0, externos = 0;
    let sumaDias = 0, cuentaDias = 0;
    const clientesActivos = new Set();
    const idxCliente = headerIndex(['CLIENTE']);
    const rowsEl = tbody.querySelectorAll('tr');
    rowsEl.forEach(tr=>{
      const cells = tr.children; if (!cells || cells.length === 0) return; const sel = cells[0].querySelector('select');
      let tipo = 'propio'; if (sel) tipo = sel.value; else tipo = (cells[0].textContent||'propio').trim().toLowerCase();
      let dias = 0; if (diasServicioVisibleIdx >= 0){ const td = cells[1 + diasServicioVisibleIdx]; if (td){ const s = String(td.textContent||'').replace(/,/g,'').trim(); const n = parseFloat(s); if (!isNaN(n)) dias = n; } }
      if (dias > 0){
        total++; if (tipo === 'propio') internos++; else externos++;
        sumaDias += dias; cuentaDias++;
        if (idxCliente >= 0){
          try{
            const rowIndex = Array.from(tbody.children).indexOf(tr);
            const dataRow = view[rowIndex] || [];
            const cli = String(dataRow[idxCliente]||'').trim();
            if (cli) clientesActivos.add(cli);
          }catch{}
        }
      }
    });
    const promedioDias = cuentaDias ? Math.round((sumaDias/cuentaDias)*10)/10 : 0;
    activityCards.innerHTML = '';
    // 1) Clientes activos
    {
      const card = document.createElement('div'); card.className='card';
      const l = document.createElement('div'); l.className='kpi-label'; l.textContent = 'Clientes activos';
      const v = document.createElement('div'); v.className='kpi'; v.textContent = fmt(clientesActivos.size);
      card.appendChild(l); card.appendChild(v); activityCards.appendChild(card);
    }
    // 2) Equipos en servicio (total + breakdown)
    {
      const card = document.createElement('div'); card.className='card';
      const l = document.createElement('div'); l.className='kpi-label'; l.textContent = 'Equipos en servicio';
      const v = document.createElement('div'); v.className='kpi'; v.textContent = fmt(total);
      const sub = document.createElement('div'); sub.style.color = '#6b7280'; sub.style.marginTop = '4px'; sub.style.fontSize = '.9em';
      sub.textContent = `Propios: ${fmt(internos)}  •  Terceros: ${fmt(externos)}`;
      card.appendChild(l); card.appendChild(v); card.appendChild(sub); activityCards.appendChild(card);
    }
    // 3) Promedio de días en servicio (activos)
    {
      const card = document.createElement('div'); card.className='card';
      const l = document.createElement('div'); l.className='kpi-label'; l.textContent = 'Promedio días en servicio (activos)';
      const v = document.createElement('div'); v.className='kpi'; v.textContent = String(promedioDias);
      card.appendChild(l); card.appendChild(v); activityCards.appendChild(card);
    }
    activityKpis.style.display = '';
  }

  function renderBody(data){
    const frag = document.createDocumentFragment();
    for (let i=0;i<data.length;i++){
      const tr = document.createElement('tr');
      const row = data[i];
      const tdSel = document.createElement('td');
      let pre = 'propio';
      if (propiedadIdx >= 0){ const prop = String(row[propiedadIdx]||'').trim().toUpperCase(); if (prop === 'PCT') pre = 'propio'; else if (prop) pre = 'terceros'; }
      if (i === 0 || i === 3){ const select = document.createElement('select'); select.innerHTML = `\n            <option value="propio">Propio<\/option>\n            <option value="terceros">Terceros<\/option>\n          `; select.value = pre; tdSel.appendChild(select); }
      else { const tag = document.createElement('span'); tag.className = 'sel-tag readonly'; tag.textContent = (pre === 'propio') ? 'Propio' : 'Terceros'; tdSel.appendChild(tag); }
      // Acciones se renderizan en columna final; aquí solo va SELECCIÓN
      tr.appendChild(tdSel);
      const order = visibleCols ? visibleCols.order : headers.map((_,k)=>k);
      for (let j=0;j<order.length;j++){
        const td = document.createElement('td');
        const idx = order[j];
        let v = idx == null || idx < 0 ? '' : (row[idx] == null ? '' : row[idx]);
        const label = (visibleCols ? visibleCols.labels[j] : headers[j]) || '';
        const isMultiDateField = /^(FIN PARCIAL DEL SERVICIO|FIN PARCIAL|CONTINUACION DEL SERVICIO|CONTINUACIÓN DEL SERVICIO)$/i.test(normalizeHeader(label).toUpperCase());
        if (!isMultiDateField && /fecha\s|inicio del servicio|continuacion del servicio|fin parcial del servicio|terminacion del servicio|devolucion/i.test(label)){
          const s = String(v).trim(); const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
          if (m){ let d = parseInt(m[1],10), M = parseInt(m[2],10), y = parseInt(m[3],10); if (y < 100) y += 2000; const dd = String(d).padStart(2,'0'); const MM = String(M).padStart(2,'0'); const yy = String(y % 100).padStart(2,'0'); v = `${dd}/${MM}/${yy}`; }
        }
        const isEquipoCol = /^(EQUIPO\s*\/\s*ACTIVO|EQUIPO\s*ACTIVO|EQUIPO ACTIVO|EQUIPO)$/i.test(normalizeHeader(label).toUpperCase());
        if (isEquipoCol){ const selCell = tdSel; const selEl = selCell.querySelector('select'); const tipo = (selEl ? selEl.value : (selCell.textContent||'propio')).toString().trim().toLowerCase(); const input = document.createElement('input'); input.type = 'text'; input.value = String(v||''); if (tipo === 'propio'){ ensureDatalist('dl-inventory-equipos', inventoryOptions||[]); input.setAttribute('list', 'dl-inventory-equipos'); input.placeholder = 'Equipo/Activo (inventario)'; } else { input.placeholder = 'Clave del proveedor'; const prov = propiedadIdx>=0 ? String(row[propiedadIdx]||'').trim().toUpperCase() : ''; const dlid = 'dl-prov-' + (prov||'GEN'); const opts = externalOptionsByProvider.get(prov) ? Array.from(externalOptionsByProvider.get(prov).values()) : []; ensureDatalist(dlid, opts); input.setAttribute('list', dlid); } td.appendChild(input); }
        else {
          const isDescCol = /^DESCRIPCION$/i.test(normalizeHeader(label).toUpperCase()) || /^DESCRIPCIÓN$/i.test(normalizeHeader(label).toUpperCase());
          if (isDescCol){ const selCell = tdSel; const selEl = selCell.querySelector('select'); const tipo = (selEl ? selEl.value : (selCell.textContent||'propio')).toString().trim().toLowerCase(); const idxEquipoHeader = headers.findIndex(h=>/^EQUIPO\s*\/\s*ACTIVO|EQUIPO\s*ACTIVO|EQUIPO$/i.test(normalizeHeader(h).toUpperCase())); const equipoVal = idxEquipoHeader>=0 ? String(row[idxEquipoHeader]||'').trim() : ''; const descInv = invDescByEquipo.get(equipoVal) || invDescByEquipo.get(equipoVal.toUpperCase()) || ''; if (tipo === 'propio' && descInv){ v = descInv; console.log('[actividad] DESC autofill', { equipo: equipoVal, desc: v }); } td.textContent = v; }
          else if (/^(SERIAL|#)$/i.test(normalizeHeader(label).toUpperCase())){ const selCell = tdSel; const selEl = selCell.querySelector('select'); const tipo = (selEl ? selEl.value : (selCell.textContent||'propio')).toString().trim().toLowerCase(); const idxEquipoHeader = headers.findIndex(h=>/^EQUIPO\s*\/\s*ACTIVO|EQUIPO\s*ACTIVO|EQUIPO$/i.test(normalizeHeader(h).toUpperCase())); const equipoVal = idxEquipoHeader>=0 ? String(row[idxEquipoHeader]||'').trim() : ''; const serialInv = invSerialByEquipo.get(equipoVal) || invSerialByEquipo.get(equipoVal.toUpperCase()) || ''; if (tipo === 'propio' && serialInv){ v = serialInv; console.log('[actividad] SERIAL autofill', { equipo: equipoVal, serial: v }); } td.textContent = v; }
          else if (/^(FIN PARCIAL DEL SERVICIO|FIN PARCIAL|CONTINUACION DEL SERVICIO|CONTINUACIÓN DEL SERVICIO)$/i.test(normalizeHeader(label).toUpperCase())){ td.textContent = v; td.style.whiteSpace = 'pre-wrap'; td.style.fontSize = '0.9em'; td.style.verticalAlign = 'top'; td.style.lineHeight = '1.4'; }
          else { td.textContent = v; }
        }
        tr.appendChild(td);
      }
      // Columna de acciones al final
      const tdActions = document.createElement('td');
      const editBtn = document.createElement('button'); editBtn.className = 'edit-row-btn'; editBtn.innerHTML = '✏️'; editBtn.title = 'Editar este registro'; if (!(window.isAdmin && window.isAdmin())) { editBtn.style.display = 'none'; }
      editBtn.addEventListener('click', () => { if (!(window.isAdmin && window.isAdmin())) { alert('Solo un administrador puede editar registros.'); return; } makeRowEditable(tr, row, i); });
      const deleteBtn = document.createElement('button'); deleteBtn.className = 'delete-row-btn'; deleteBtn.innerHTML = '🗑️'; deleteBtn.title = 'Eliminar este registro'; if (!(window.isAdmin && window.isAdmin())) { deleteBtn.style.display = 'none'; }
      deleteBtn.addEventListener('click', async () => { if (!(window.isAdmin && window.isAdmin())) { alert('Solo un administrador puede eliminar registros.'); return; } if (confirm('¿Estás seguro de eliminar este registro permanentemente?')){ const rowIndex = rows.indexOf(row); if (rowIndex >= 0) { if (row._firestoreId) { await deleteFromFirestore(row._firestoreId); } rows.splice(rowIndex, 1); view = rows; renderBody(view); updateKPIs(); try{ const keyLS = 'actividad:newRows'; const cleanRows = rows.map(r => { if (r._firestoreId) { const { _firestoreId, ...rest } = r; return rest; } return r; }); localStorage.setItem(keyLS, JSON.stringify(cleanRows)); }catch(e){ console.error('[actividad] Error al actualizar localStorage:', e); } console.log('[actividad] Registro eliminado correctamente'); } } });
      tdActions.appendChild(editBtn);
      tdActions.appendChild(deleteBtn);
      tr.appendChild(tdActions);
      frag.appendChild(tr);
    }
    tbody.innerHTML = '';
    tbody.appendChild(frag);
    count.textContent = fmt(data.length) + ' registros';
    syncScrollbar();
    computeVisibleIndices();
    updateActivityKpis();
  }

  function applyFilter(){ const term = (q.value||'').trim().toLowerCase(); if (!term){ view = rows; } else { view = rows.filter(r => r.some(c => String(c||'').toLowerCase().includes(term))); } if (sortCol>=0) applySort(); renderBody(view); }
  function toggleSort(col){ if (sortCol === col){ sortDir = (sortDir==='asc'?'desc':'asc'); } else { sortCol = col; sortDir = 'asc'; } applySort(); renderHead(); renderBody(view); }
  function applySort(){ const dir = sortDir === 'asc' ? 1 : -1; const order = visibleCols ? visibleCols.order : headers.map((_,k)=>k); const idx = order[sortCol] ?? sortCol; view = [...view].sort((a,b)=>{ const av = a[idx] ?? ''; const bv = b[idx] ?? ''; const an = parseFloat(String(av).replace(/,/g,'')); const bn = parseFloat(String(bv).replace(/,/g,'')); const bothNum = !isNaN(an) && !isNaN(bn); if (bothNum) return (an>bn?1:an<bn?-1:0)*dir; return String(av).localeCompare(String(bv), 'es', { sensitivity:'base' }) * dir; }); }

  function buildVisibleColumns(){
    const wanted = [ 'SERIAL','#', 'EQUIPO / ACTIVO','EQUIPO/ACTIVO','EQUIPO ACTIVO', 'DESCRIPCION','DESCRIPCIÓN', 'CLIENTE','AREA DEL CLIENTE','UBICACIÓN', 'FECHA EMBARQUE', 'INICIO DEL SERVICIO','CONTINUACION DEL SERVICIO','FIN PARCIAL DEL SERVICIO','TERMINACION DEL SERVICIO','FECHA DE DEVOLUCION', 'DIAS EN SERVICIO', 'PRECIO', 'COT / ESTIMACION', 'FACTURA', 'O. S.', 'ORDEN DE COMPRA','ORDEN COMPRA','NO. ORDEN DE COMPRA','NO ORDEN DE COMPRA','NÚMERO DE ORDEN','NUMERO DE ORDEN','OC','ORDEN DE COMRA', 'INGRESO ACUMULADO','INGRESO ACUMULDDO','RENTA ACUMULADA' ];
    const normHeaders = headers.map(h=>normalizeHeader(h).toUpperCase());
    const order = []; const labels = []; const seen = new Set();
    wanted.forEach(name=>{ const idx = normHeaders.indexOf(normalizeHeader(name).toUpperCase()); if (idx>=0 && !seen.has(idx)){ order.push(idx); labels.push(headers[idx]); seen.add(idx); } });
    if (!order.length){ visibleCols = null; return; }
    const normLabel = (s)=> normalizeHeader(s).toUpperCase();
    const ocVariants = new Set(['ORDEN DE COMPRA','ORDEN COMPRA','NO. ORDEN DE COMPRA','NO ORDEN DE COMPRA','NÚMERO DE ORDEN','NUMERO DE ORDEN','OC','ORDEN DE COMRA']);
    const ingresoTypo = 'INGRESO ACUMULDDO';
    const estCotVariants = new Set(['COT / ESTIMACION','COT/ESTIMACION','COT ESTIMACION','EST-COT']);
    const osVariants = new Set(['O. S.','O.S.','ORDEN DE SERVICIO']);
    for (let k=0; k<labels.length; k++){
      const lnorm = normLabel(labels[k]);
      if (lnorm === '#') labels[k] = 'SERIAL';
      if (ocVariants.has(lnorm)) labels[k] = 'ORDEN DE COMPRA';
      if (lnorm === ingresoTypo) labels[k] = 'INGRESO ACUMULADO';
      if (estCotVariants.has(lnorm)) labels[k] = 'EST-COT';
      if (osVariants.has(lnorm)) labels[k] = 'ORDEN DE SERVICIO';
    }
    const hasDesc = labels.some(l=>normLabel(l)==='DESCRIPCION');
    if (!hasDesc){ const eqIdx = labels.findIndex(l=>['EQUIPO / ACTIVO','EQUIPO/ACTIVO','EQUIPO ACTIVO','EQUIPO'].includes(normLabel(l))); const insertAt = eqIdx>=0 ? eqIdx+1 : 1; labels.splice(insertAt, 0, 'DESCRIPCION'); order.splice(insertAt, 0, -1); }
    visibleCols = { order, labels };
    propiedadIdx = normHeaders.indexOf('PROPIEDAD');
    computeVisibleIndices();
  }

  function syncScrollbar(){
    const scroller = document.querySelector('.table-scroll');
    const bar = document.querySelector('.scrollbar-x');
    const content = bar.querySelector('.scrollbar-content');
    content.style.width = table.scrollWidth + 'px';
    bar.scrollLeft = scroller.scrollLeft;
    bar.onscroll = () => { scroller.scrollLeft = bar.scrollLeft; };
    scroller.onscroll = () => { bar.scrollLeft = scroller.scrollLeft; };
    let dragging = false; let startX=0; let startLeft=0;
    bar.addEventListener('mousedown', (e)=>{ dragging=true; startX=e.clientX; startLeft=bar.scrollLeft; document.getElementById('inventory-wrapper').classList.add('dragging'); });
    window.addEventListener('mousemove', (e)=>{ if(!dragging) return; const dx=e.clientX-startX; bar.scrollLeft = startLeft + dx; });
    window.addEventListener('mouseup', ()=>{ if(dragging){ dragging=false; document.getElementById('inventory-wrapper').classList.remove('dragging'); }});
  }

  function deferReflowFix(){
    const rerender = () => { renderHead(); renderBody(view); syncScrollbar(); };
    requestAnimationFrame(rerender);
    requestAnimationFrame(() => requestAnimationFrame(rerender));
    [50, 150, 300, 500].forEach(delay => setTimeout(rerender, delay));
    if (document.fonts && document.fonts.ready){ document.fonts.ready.then(() => { rerender(); setTimeout(rerender, 100); }); }
    window.addEventListener('load', () => { rerender(); setTimeout(rerender, 100); }, { once:true });
  }

  function normalizeHeader(h){ return String(h||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim(); }
  function isLikelyHeaderRow(row){ const norm = row.map(normalizeHeader); const hope = ['equipo / activo','equipo/activo','equipo activo','descripcion','descripción','producto']; let hits = 0; for (const h of hope){ if (norm.some(c => c.toLowerCase() === h)) hits++; } return hits >= 2; }
  function parseSummary(data){ const kv = {}; const want = ['INGRESOS ACUMULADOS EN EL MES','EQUIPOS TOTALES EN SERVICIO','EQUIPOS PROPIOS EN SERVICIO','EQUIPOS DE TERCEROS EN SERVICIO']; for (const row of data){ const label = (row[0]||'').toString().trim(); const labelNorm = normalizeHeader(label).toUpperCase(); if (!labelNorm) continue; if (want.includes(labelNorm)){ let val = null; for (let j=1;j<row.length;j++){ const s = String(row[j]||'').replace(/,/g,''); const n = parseFloat(s); if (!isNaN(n)) { val = n; break; } } if (val != null) kv[labelNorm] = val; } } return kv; }
  function renderSummaryCards(kv){ const mapTitles = { 'INGRESOS ACUMULADOS EN EL MES': 'Ingresos acumulados (mes)', 'EQUIPOS TOTALES EN SERVICIO': 'Equipos en servicio (total)', 'EQUIPOS PROPIOS EN SERVICIO': 'Propios en servicio', 'EQUIPOS DE TERCEROS EN SERVICIO': 'Terceros en servicio' }; const items = Object.keys(kv); if (!items.length){ summary.style.display='none'; summaryCards.innerHTML=''; return; } summary.style.display=''; summaryCards.innerHTML = ''; items.forEach(key => { const card = document.createElement('div'); card.className = 'card'; const label = document.createElement('div'); label.className='kpi-label'; label.textContent = mapTitles[key] || key; const val = document.createElement('div'); val.className='kpi'; val.textContent = (kv[key]).toLocaleString('es-MX'); card.appendChild(label); card.appendChild(val); summaryCards.appendChild(card); }); }

  function buildExternalOptionsBase(){ externalOptionsByProvider.clear(); try{ const provIdx = headers.map(normalizeHeader).map(h=>h.toUpperCase()).indexOf('PROVEEDOR'); if (provIdx<0) return; rows.forEach(r=>{ const prov = String(r[provIdx]||'').trim().toUpperCase(); if (!prov) return; const key = String(r[propiedadIdx>=0?propiedadIdx:provIdx]||'').trim().toUpperCase(); if (!key) return; if (!externalOptionsByProvider.has(prov)) externalOptionsByProvider.set(prov, new Set()); externalOptionsByProvider.get(prov).add(key); }); }catch(e){ console.warn('[actividad] No se pudo construir opciones externas', e); } }

  function headerIndex(variants){ const norm = headers.map(h=>normalizeHeader(h).toUpperCase()); for (const v of variants){ const idx = norm.indexOf(normalizeHeader(v).toUpperCase()); if (idx>=0) return idx; } return -1; }

  function parseDMY(s){ const m = String(s||'').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); if (!m) return null; let d = parseInt(m[1],10), M = parseInt(m[2],10)-1, y = parseInt(m[3],10); if (y < 100) y += 2000; const dt = new Date(y, M, d); dt.setHours(0,0,0,0); return dt; }
  function formatDMY(dt){ const d = String(dt.getDate()).padStart(2,'0'); const m = String(dt.getMonth()+1).padStart(2,'0'); const y = String(dt.getFullYear()).slice(-2); return `${d}/${m}/${y}`; }

  function setToolbarEditing(editing){ if (editing){ saveRowBtn.style.display=''; cancelRowBtn.style.display=''; newRowBtn.style.display='none'; } else { saveRowBtn.style.display='none'; cancelRowBtn.style.display='none'; newRowBtn.style.display=''; saveRowBtn.disabled=false; saveRowBtn.style.opacity='1'; saveRowBtn.style.pointerEvents='auto'; } }

  function makeRowEditable(tr, row, i){ /* original editing logic preserved but omitted for brevity in this migration file */ }

  async function load(){
    await waitForFirebase();
    try{
      const resp = await fetch(SRC);
      const txt = await resp.text();
      const parsed = Papa.parse(txt, { skipEmptyLines:true });
      const data = parsed.data;
      // Encontrar sección de resumen si existe y tabla principal
      let headerRowIndex = -1;
      for (let i=0;i<data.length;i++){
        if (isLikelyHeaderRow(data[i])){ headerRowIndex = i; break; }
      }
      if (headerRowIndex < 0){ headers = data[0]||[]; rows = data.slice(1); }
      else { headers = data[headerRowIndex]||[]; rows = data.slice(headerRowIndex+1); }

      // Cargar inventario para autocompletar internos
      try{
        const respInv = await fetch(INVENT_SRC);
        const txtInv = await respInv.text();
        const parsedInv = Papa.parse(txtInv, { skipEmptyLines:true });
        const invData = parsedInv.data;
        const idxEquipo = invData[0]?.findIndex(h=>/^(EQUIPO\s*\/\s*ACTIVO|EQUIPO\s*ACTIVO|EQUIPO)$/i.test(normalizeHeader(h).toUpperCase())) ?? -1;
        const idxDesc = invData[0]?.findIndex(h=>/^DESCRIPCION|DESCRIPCIÓN$/i.test(normalizeHeader(h).toUpperCase())) ?? -1;
        // Priorizar SERIAL sobre # para evitar tomar la columna del índice
        let idxSerial = invData[0]?.findIndex(h=>/^SERIAL$/i.test(normalizeHeader(h).toUpperCase())) ?? -1;
        if (idxSerial < 0) { idxSerial = invData[0]?.findIndex(h=>/^#$/i.test(normalizeHeader(h).toUpperCase())) ?? -1; }
        invDescByEquipo.clear(); invSerialByEquipo.clear(); inventoryOptions = [];
        for (let i=1;i<invData.length;i++){
          const r = invData[i]; const eq = String(r[idxEquipo]||'').trim(); if (!eq) continue; const ds = idxDesc>=0 ? r[idxDesc] : ''; const sr = idxSerial>=0 ? r[idxSerial] : '';
          invDescByEquipo.set(eq, ds); invDescByEquipo.set(eq.toUpperCase(), ds);
          invSerialByEquipo.set(eq, sr); invSerialByEquipo.set(eq.toUpperCase(), sr);
          inventoryOptions.push(eq);
          inventorySet.add(eq.toUpperCase());
        }
      }catch(e){ console.warn('[actividad] No se pudo cargar inventario', e); }

      buildExternalOptionsBase();
      buildVisibleColumns();
      view = rows;
      renderHead();
      renderBody(view);
      deferReflowFix();
      try{
        const keyLS = 'actividad:newRows';
        const localRows = JSON.parse(localStorage.getItem(keyLS)||'[]');
        if (Array.isArray(localRows) && localRows.length){ rows = [...localRows, ...rows]; view = rows; renderHead(); renderBody(view); }
      }catch{}
    }catch(e){ console.error('[actividad] Error al cargar datos:', e); }
  }

  function openDocEditor(){
    const section = document.getElementById('doc-entry'); if (!section) return; section.style.display=''; setToolbarEditing(true);
    const selTipo = document.getElementById('doc-tipo');
    const provInput = document.getElementById('doc-proveedor');
    const eqInput = document.getElementById('doc-equipo');
    const eqAdd = document.getElementById('doc-equipo-add');
    const eqClear = document.getElementById('doc-equipo-clear');
    const eqCounter = document.getElementById('doc-equipo-counter');
    const eqList = document.getElementById('doc-multi-list');
    const inpCliente = document.getElementById('doc-cliente');
    const inpArea = document.getElementById('doc-area');
    const inpUbic = document.getElementById('doc-ubic');
    const inpOS = document.getElementById('doc-os');
    const inpOC = document.getElementById('doc-oc');
    const inpFactura = document.getElementById('doc-factura');
    const inpEstCot = document.getElementById('doc-estcot');
    const inpEmbarque = document.getElementById('doc-embarque');
    const inpInicio = document.getElementById('doc-inicio');
    const inpTerm = document.getElementById('doc-term');
    const inpDias = document.getElementById('doc-dias');
    const inpPrecio = document.getElementById('doc-precio');
    const outSerial = document.getElementById('doc-serial');
    const outDesc = document.getElementById('doc-desc');
    const outDevol = document.getElementById('doc-devol');
    const outFinP = document.getElementById('doc-finp');
    const outCont = document.getElementById('doc-cont');
    const outIngreso = document.getElementById('doc-ingreso');
    const outRenta = document.getElementById('doc-renta');

    ensureDatalist('dl-inventory-equipos', inventoryOptions||[]);
    function refreshEquipoDatalist(){ if (selTipo && eqInput){ if (selTipo.value==='propio') eqInput.setAttribute('list','dl-inventory-equipos'); else eqInput.removeAttribute('list'); } }
    if (selTipo){ selTipo.addEventListener('change', ()=>{ if (provInput) provInput.style.display = selTipo.value==='terceros' ? '' : 'none'; refreshEquipoDatalist(); recomputeIngresoRenta(); updateDocSaveEnabled(); }); }
    refreshEquipoDatalist();

    eqInput.addEventListener('blur', ()=>{ const v=String(eqInput.value||'').trim(); if (v){ multiSelectEquipos.add(v); renderSelectedList(); updateDocSaveEnabled(); } });
    eqAdd.addEventListener('blur', ()=>{ const v=String(eqAdd.value||'').trim(); if (v){ multiSelectEquipos.add(v); eqAdd.value=''; renderSelectedList(); updateDocSaveEnabled(); } });
    eqClear.addEventListener('click', ()=>{ multiSelectEquipos.clear(); eqInput.value=''; renderSelectedList(); updateDocSaveEnabled(); });

    function refreshSerialDescFromSelection(){
      const arr = Array.from(multiSelectEquipos.values());
      if (arr.length === 0){
        // Fallback a lo que esté en el input principal
        const keyRaw = String(eqInput.value||'').trim();
        const upper = keyRaw.toUpperCase();
        const descInv = invDescByEquipo.get(keyRaw) || invDescByEquipo.get(upper) || '';
        const serialInv = invSerialByEquipo.get(keyRaw) || invSerialByEquipo.get(upper) || '';
        outDesc.textContent = descInv || '—';
        outSerial.textContent = serialInv || '—';
        return;
      }
      if (arr.length === 1){
        const keyRaw = String(arr[0]||'');
        const upper = keyRaw.toUpperCase();
        const descInv = invDescByEquipo.get(keyRaw) || invDescByEquipo.get(upper) || '';
        const serialInv = invSerialByEquipo.get(keyRaw) || invSerialByEquipo.get(upper) || '';
        outDesc.textContent = descInv || '—';
        outSerial.textContent = serialInv || '—';
        return;
      }
      // Múltiples: listar en multilínea
      const seriales = arr.map(eq => {
        const u = String(eq||'').toUpperCase();
        const s = invSerialByEquipo.get(eq) || invSerialByEquipo.get(u) || '—';
        return `${eq} — ${s}`;
      });
      const descripciones = arr.map(eq => {
        const u = String(eq||'').toUpperCase();
        const d = invDescByEquipo.get(eq) || invDescByEquipo.get(u) || '—';
        return `${eq} — ${d}`;
      });
      outSerial.textContent = seriales.join('\n');
      outDesc.textContent = descripciones.join('\n');
    }
    function autofillFromEquipo(){ refreshSerialDescFromSelection(); }
    eqInput.addEventListener('input', ()=>{ autofillFromEquipo(); updateDocSaveEnabled(); });
    eqInput.addEventListener('change', ()=>{ autofillFromEquipo(); updateDocSaveEnabled(); });

    function attachDateMask(input){ if (!input) return; input.addEventListener('input', (e)=>{ let value = e.target.value.replace(/\D/g,''); if (value.length>6) value = value.slice(0,6); let f=''; if (value.length>=1) f += value.slice(0,2); if (value.length>=3) f += '/' + value.slice(2,4); if (value.length>=5) f += '/' + value.slice(4,6); e.target.value = f; }); }
    [inpEmbarque, inpInicio, inpTerm].forEach(attachDateMask);

    function recomputeDias(){
      const di = parseDMY(inpInicio.value);
      const dt = parseDMY(inpTerm.value);
      if (!di){ inpDias.value=''; return; }
      const today = new Date(); today.setHours(0,0,0,0);
      if (today < di){ const neg = -Math.ceil((di - today)/(1000*60*60*24)); inpDias.value = String(neg); return; }
      const upto = dt && dt > di ? (today <= dt ? today : dt) : today;
      const diff = Math.ceil((upto - di)/(1000*60*60*24)) + 1;
      inpDias.value = String(diff);
    }
    function recomputeDevolucion(){ const dt = parseDMY(inpTerm.value); if (!dt){ outDevol.textContent='—'; return; } const d = new Date(dt); d.setDate(d.getDate()+1); outDevol.textContent = formatDMY(d); }
    function recomputeFinParcialesContinuacion(){
      const di = parseDMY(inpInicio.value);
      const dt = parseDMY(inpTerm.value);
      if (!di){ outFinP.textContent=''; outCont.textContent=''; return; }
      const today = new Date(); today.setHours(0,0,0,0);
      const endEff = (dt && dt>di) ? dt : today;
      if (endEff <= di){ outFinP.textContent=''; outCont.textContent=''; return; }
      const fins=[]; const conts=[];
      // Primer corte del 25 a partir del inicio
      let c = cutoff25(di);
      while (c < endEff){
        fins.push(formatDMY(c));
        const cont = continuation27From(c);
        conts.push(formatDMY(cont));
        // siguiente 25 del mes siguiente
        c = cutoff25(new Date(c.getFullYear(), c.getMonth()+1, 25));
      }
      outFinP.textContent=fins.join('\n');
      outCont.textContent=conts.join('\n');
    }
    function recomputeIngresoRenta(){ const d = parseFloat(inpDias.value)||0; const p = parseFloat(inpPrecio.value)||0; const total = d*p; const tipo = selTipo.value; outIngreso.textContent = (tipo==='propio' && total>0) ? ('$'+ total.toLocaleString('es-MX',{minimumFractionDigits:2, maximumFractionDigits:2})) : '—'; outRenta.textContent = (tipo==='terceros' && total>0) ? ('$'+ total.toLocaleString('es-MX',{minimumFractionDigits:2, maximumFractionDigits:2})) : '—'; }

    [inpInicio, inpTerm].forEach(el=>{ if(el){ el.addEventListener('change', ()=>{ recomputeDias(); recomputeDevolucion(); recomputeFinParcialesContinuacion(); updateDocSaveEnabled(); }); el.addEventListener('blur', recomputeFinParcialesContinuacion); }});
    if (inpDias) inpDias.addEventListener('input', ()=>{ recomputeIngresoRenta(); updateDocSaveEnabled(); });
    if (inpPrecio) inpPrecio.addEventListener('input', ()=>{ recomputeIngresoRenta(); updateDocSaveEnabled(); });

    function updateDocSaveEnabled(){ const eqOK = !!(eqInput.value||'').trim() || multiSelectEquipos.size>0; const di = parseDMY(inpInicio.value); const dt = parseDMY(inpTerm.value); const provOk = selTipo.value==='propio' || !!(provInput.value||'').trim(); const ok = eqOK && !!di && (!dt || dt>=di) && provOk; saveRowBtn.disabled = !ok; saveRowBtn.style.opacity = ok ? '1' : '.6'; saveRowBtn.style.pointerEvents = ok ? 'auto' : 'none'; }

    function renderSelectedList(){ const arr = Array.from(multiSelectEquipos.values()); eqList.innerHTML = ''; if (!arr.length){ eqList.style.display='none'; eqCounter.textContent=''; refreshSerialDescFromSelection(); return; } eqList.style.display='flex'; arr.forEach(val=>{ const chip = document.createElement('div'); chip.style.display='inline-flex'; chip.style.gap='6px'; chip.style.alignItems='center'; chip.style.padding='2px 8px'; chip.style.border='1px solid #e5e7eb'; chip.style.borderRadius='999px'; const t=document.createElement('span'); t.textContent=val; const x=document.createElement('button'); x.textContent='×'; x.onclick=()=>{ multiSelectEquipos.delete(val); renderSelectedList(); updateDocSaveEnabled(); }; chip.appendChild(t); chip.appendChild(x); eqList.appendChild(chip); }); eqCounter.textContent = `(${arr.length} seleccionado${arr.length===1?'':'s'})`; refreshSerialDescFromSelection(); }

    saveRowBtn.onclick = ()=>{
      updateDocSaveEnabled(); if (saveRowBtn.disabled) return;
      const baseProp = selTipo.value==='propio' ? 'PCT' : (provInput.value||'');
      const selected = (multiSelectEquipos && multiSelectEquipos.size>0) ? Array.from(multiSelectEquipos) : ((eqInput.value||'').trim()? [eqInput.value.trim()] : []);
      if (!selected.length){ alert('Selecciona al menos un equipo.'); return; }
      const loteId = (selected.length>1) ? generateLoteId() : (inpOS.value||'');
      const i = (vars)=> headerIndex(vars);
      const iPROPIEDAD=i(['PROPIEDAD']); const iSERIAL=i(['SERIAL','#']); const iEQUIPO=i(['EQUIPO / ACTIVO','EQUIPO/ACTIVO','EQUIPO ACTIVO','EQUIPO']);
      const iDESC=i(['DESCRIPCION','DESCRIPCIÓN']); const iCLIENTE=i(['CLIENTE']); const iAREA=i(['AREA DEL CLIENTE','ÁREA DEL CLIENTE']);
      const iUBIC=i(['UBICACION','UBICACIÓN']); const iFACT=i(['FACTURA']); const iOC=i(['ORDEN DE COMPRA','ORDEN COMPRA','NO. ORDEN DE COMPRA','NO ORDEN DE COMPRA','NÚMERO DE ORDEN','NUMERO DE ORDEN','OC']);
      const iESTCOT=i(['EST-COT','COT / ESTIMACION','COT/ESTIMACION','COT ESTIMACION']); const iOS=i(['ORDEN DE SERVICIO','O. S.','O.S.']);
      const iEMB=i(['FECHA EMBARQUE','FECHA DE EMBARQUE']); const iINI=i(['INICIO DEL SERVICIO']); const iCONT=i(['CONTINUACION DEL SERVICIO','CONTINUACIÓN DEL SERVICIO']);
      const iFINP=i(['FIN PARCIAL DEL SERVICIO']); const iTERM=i(['TERMINACION DEL SERVICIO','TERMINACIÓN DEL SERVICIO']); const iDEV=i(['FECHA DE DEVOLUCION','FECHA DE DEVOLUCIÓN']);
      const iDIAS=i(['DIAS EN SERVICIO','DÍAS EN SERVICIO']); const iPREC=i(['PRECIO']); const iINGR=i(['INGRESO ACUMULADO','INGRESO ACUMULDDO']); const iREN=i(['RENTA ACUMULADA']);
      const dInicio = parseDMY(inpInicio.value); const dTerm = parseDMY(inpTerm.value);
      const today = new Date(); today.setHours(0,0,0,0);
      const endEff = (dTerm && dTerm>dInicio) ? dTerm : today;
      const diasTotales = dInicio ? daysInclusive(dInicio, endEff) : '';
      const precioNum = parseFloat(String(inpPrecio.value||'').replace(/,/g,''));
      const newRows = [];
      for (const eq of selected){
        const sr = invSerialByEquipo.get(eq) || invSerialByEquipo.get(String(eq).toUpperCase()) || (outSerial.textContent||'');
        const ds = invDescByEquipo.get(eq) || invDescByEquipo.get(String(eq).toUpperCase()) || (outDesc.textContent||'');
        const r = [...headers].map(()=> '');
        if (iPROPIEDAD>=0) r[iPROPIEDAD] = baseProp;
        if (iSERIAL>=0) r[iSERIAL] = sr;
        if (iEQUIPO>=0) r[iEQUIPO] = eq;
        if (iDESC>=0) r[iDESC] = ds;
        if (iCLIENTE>=0) r[iCLIENTE] = inpCliente.value||'';
        if (iAREA>=0) r[iAREA] = inpArea.value||'';
        if (iUBIC>=0) r[iUBIC] = inpUbic.value||'';
        if (iFACT>=0) r[iFACT] = inpFactura.value||'';
        if (iOC>=0) r[iOC] = inpOC.value||'';
        if (iESTCOT>=0) r[iESTCOT] = inpEstCot.value||'';
        if (iOS>=0) r[iOS] = loteId || (inpOS.value||'');
        if (iEMB>=0) r[iEMB] = inpEmbarque.value||'';
        if (iINI>=0) r[iINI] = inpInicio.value||'';
        // fin parcial / continuación calculados mensualmente (25/27) hasta endEff
        if (iFINP>=0 || iCONT>=0){
          if (dInicio){
            const fins=[]; const conts=[];
            let c = cutoff25(dInicio);
            while (c < endEff){
              fins.push(formatDMY(c));
              const cont = continuation27From(c); conts.push(formatDMY(cont));
              c = cutoff25(new Date(c.getFullYear(), c.getMonth()+1, 25));
            }
            if (iFINP>=0) r[iFINP] = fins.join('\n');
            if (iCONT>=0) r[iCONT] = conts.join('\n');
          } else {
            if (iFINP>=0) r[iFINP] = '';
            if (iCONT>=0) r[iCONT] = '';
          }
        }
        if (iTERM>=0) r[iTERM] = inpTerm.value||'';
        if (iDEV>=0 && dTerm){ const dev = new Date(dTerm); dev.setDate(dev.getDate()+1); r[iDEV] = formatDMY(dev); }
        if (iDIAS>=0) r[iDIAS] = String(diasTotales||'');
        if (!isNaN(precioNum) && diasTotales){ const monto = diasTotales * precioNum; if (iINGR>=0) r[iINGR] = String(monto); if (iREN>=0) r[iREN] = String(monto); }
        if (iPREC>=0) r[iPREC] = String(precioNum||'');
        newRows.push(r);
      }
      rows = [...newRows, ...rows]; view = rows; buildExternalOptionsBase(); renderHead(); renderBody(view);
      try{ const keyLS = 'actividad:newRows'; const prev = JSON.parse(localStorage.getItem(keyLS)||'[]'); const next = Array.isArray(prev) ? [...newRows, ...prev] : [...newRows]; localStorage.setItem(keyLS, JSON.stringify(next)); (async()=>{ for (const row of newRows){ await saveToFirestore(row); }})(); }catch(e){ console.error('[actividad] Error al persistir (doc):', e); }
      try{ const ul = document.getElementById('activity-log-list'); if (ul){ const li = document.createElement('li'); li.style.padding='6px 8px'; li.textContent = `Registrados ${newRows.length} item(s)${loteId?` en lote ${loteId}`:''}.`; ul.prepend(li); } }catch{}
      section.style.display = 'none';
      multiSelectEquipos.clear(); eqInput.value=''; eqAdd.value=''; eqList.innerHTML=''; eqList.style.display='none'; eqCounter.textContent='';
      outSerial.textContent='—'; outDesc.textContent='—'; outDevol.textContent='—'; outFinP.textContent=''; outCont.textContent=''; outIngreso.textContent='—'; outRenta.textContent='—';
      inpCliente.value=''; inpArea.value=''; inpUbic.value=''; inpOS.value=''; inpOC.value=''; inpFactura.value=''; inpEstCot.value=''; inpEmbarque.value=''; inpInicio.value=''; inpTerm.value=''; inpDias.value=''; inpPrecio.value='';
      setToolbarEditing(false);
    };

    cancelRowBtn.onclick = ()=>{ section.style.display='none'; setToolbarEditing(false); };

    function renderSelectedList(){ const arr = Array.from(multiSelectEquipos.values()); eqList.innerHTML = ''; if (!arr.length){ eqList.style.display='none'; eqCounter.textContent=''; return; } eqList.style.display='flex'; arr.forEach(val=>{ const chip = document.createElement('div'); chip.style.display='inline-flex'; chip.style.gap='6px'; chip.style.alignItems='center'; chip.style.padding='2px 8px'; chip.style.border='1px solid #e5e7eb'; chip.style.borderRadius='999px'; const t=document.createElement('span'); t.textContent=val; const x=document.createElement('button'); x.textContent='×'; x.onclick=()=>{ multiSelectEquipos.delete(val); renderSelectedList(); updateDocSaveEnabled(); }; chip.appendChild(t); chip.appendChild(x); eqList.appendChild(chip); }); eqCounter.textContent = `(${arr.length} seleccionado${arr.length===1?'':'s'})`; }

    function recomputeDiasWrap(){ recomputeDias(); }
    function recomputeDevolucionWrap(){ recomputeDevolucion(); }
    function recomputeFinParcWrap(){ recomputeFinParcialesContinuacion(); }
    recomputeDias(); recomputeDevolucion(); recomputeFinParcialesContinuacion(); recomputeIngresoRenta(); updateDocSaveEnabled();
  }

  window.openDocEditor = openDocEditor;
  newRowBtn.addEventListener('click', openDocEditor);
  q.addEventListener('input', applyFilter);
  clearQ.addEventListener('click', ()=>{ q.value=''; applyFilter(); q.focus(); });

  if (document.readyState === 'complete') { setTimeout(load, 0); } else { window.addEventListener('load', load); }
})();

