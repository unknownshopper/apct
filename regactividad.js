// Esperar a que Firebase esté inicializado
let firebaseReady = false;
const COLLECTION_NAME = 'activityRecords';

// Verificar si Firebase está disponible
function waitForFirebase() {
  return new Promise((resolve) => {
    const check = () => {
      if (window.db && window.auth) {
        firebaseReady = true;
        resolve(true);
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });

// Ocultar botones peligrosos si no es admin
window.addEventListener('load', () => {
  if (!(window.isAdmin && window.isAdmin())) {
    const btn = document.getElementById('clearAllBtn');
    if (btn) btn.style.display = 'none';
  }
});
}

// Actualizar UI de autenticación
function updateAuthUI() {
  try {
    const userEmailEl = document.getElementById('user-email');
    const loginLinkEl = document.getElementById('login-link');
    const logoutBtnEl = document.getElementById('logout-btn');
    
    if (window.auth && window.auth.currentUser) {
      const email = window.auth.currentUser.email || '';
      if (userEmailEl) userEmailEl.textContent = email;
      if (loginLinkEl) loginLinkEl.style.display = 'none';
      if (logoutBtnEl) logoutBtnEl.style.display = '';
    } else {
      if (userEmailEl) userEmailEl.textContent = '';
      if (loginLinkEl) loginLinkEl.style.display = 'inline-block';
      if (logoutBtnEl) logoutBtnEl.style.display = 'none';
    }
  } catch(e) {
    console.warn('[regactividad] Error actualizando UI auth:', e);
  }
}

let headers = [];
let headerIndices = {};
const norm = (s)=> String(s||'').trim().toUpperCase().replace(/\s+/g,' ');
function normalizeHeader(h){ return String(h||'').normalize('NFD').replace(/[\u0000-\u001F]/g,'').replace(/\s+/g,' ').trim(); }
function getHeaderIndex(variants){ const hdrs = headers.map(h=>normalizeHeader(h).toUpperCase()); for (const v of variants){ const idx = hdrs.indexOf(normalizeHeader(v).toUpperCase()); if (idx>=0) return idx; } return -1; }

function normalizeLegacyClientsInRows(list){
  try{
    const idx = headerIndices.CLIENTE ?? getHeaderIndex(['CLIENTE']);
    if (idx == null || idx < 0) return;
    list.forEach(r => {
      if (!r) return;
      const raw = String(r[idx]||'').trim().toLowerCase();
      if (!raw) return;
      if (raw === 'jajaja') r[idx] = 'Cliente 1';
      else if (raw === 'qqq') r[idx] = 'Cliente 2';
      else if (raw === 'www') r[idx] = 'Cliente 3';
    });
  }catch(e){ console.warn('[regactividad] normalizeLegacyClientsInRows', e); }
}

async function loadHeaders(){ try{ const resp = await fetch('docs/REGISTRO DE ACTIVIDAD PCT 2025.csv'); const text = await resp.text(); const lines = text.split('\n'); for (let i=0;i<Math.min(20,lines.length);i++){ const cells = lines[i].split(','); if (cells.some(c=>/propiedad|serial|equipo|cliente/i.test(c))){ headers = cells.map(c=>c.trim()); headerIndices = { PROPIEDAD:getHeaderIndex(['PROPIEDAD']), SERIAL:getHeaderIndex(['SERIAL','#']), EQUIPO:getHeaderIndex(['EQUIPO / ACTIVO','EQUIPO/ACTIVO','EQUIPO ACTIVO','EQUIPO']), DESCRIPCION:getHeaderIndex(['DESCRIPCION','DESCRIPCIÓN']), CLIENTE:getHeaderIndex(['CLIENTE']), AREA:getHeaderIndex(['AREA DEL CLIENTE','ÁREA DEL CLIENTE']), UBICACION:getHeaderIndex(['UBICACION','UBICACIÓN']), FACTURA:getHeaderIndex(['FACTURA']), EMBARQUE:getHeaderIndex(['FECHA EMBARQUE','FECHA DE EMBARQUE']), INICIO:getHeaderIndex(['INICIO DEL SERVICIO']), TERMINACION:getHeaderIndex(['TERMINACION DEL SERVICIO','TERMINACIÓN DEL SERVICIO']), DEVOLUCION:getHeaderIndex(['FECHA DE DEVOLUCION','FECHA DE DEVOLUCIÓN']), DIAS:getHeaderIndex(['DIAS EN SERVICIO','DÍAS EN SERVICIO']), PRECIO:getHeaderIndex(['PRECIO']), INGRESO:getHeaderIndex(['INGRESO ACUMULADO','INGRESO ACUMULDDO']), RENTA:getHeaderIndex(['RENTA ACUMULADA']) }; break; } } }catch(e){ console.error('[regactividad] headers:',e);} }

// Cargar registros desde Firestore (con fallback a localStorage)
async function loadHistory() {
  try {
    let rows = [];
    
    // Intentar cargar desde Firestore si está disponible
    if (firebaseReady && window.db) {
      try {
        const snapshot = await window.db.collection(COLLECTION_NAME)
          .orderBy('timestamp', 'desc')
          .get();
        
        rows = snapshot.docs.map(doc => {
          const data = doc.data() || {};
          const baseRow = Array.isArray(data.row) ? data.row.slice() : [];
          baseRow._firestoreId = doc.id;
          baseRow._timestamp = data.timestamp || null;
          return baseRow;
        });

        // Normalizar nombres de cliente heredados
        normalizeLegacyClientsInRows(rows);
        
        console.log(`[regactividad] Cargados ${rows.length} registros desde Firestore`);
        
        // Actualizar localStorage como caché (preservando _firestoreId en cada fila)
        try {
          const rowsData = rows.map(r => {
            if (!Array.isArray(r)) return r;
            const arr = Array.from(r);
            if (r._firestoreId) arr._firestoreId = r._firestoreId;
            if (r._timestamp) arr._timestamp = r._timestamp;
            return arr;
          });
          localStorage.setItem('actividad:newRows', JSON.stringify(rowsData));
        } catch (e) {
          console.warn('[regactividad] No se pudo actualizar caché local:', e);
        }
      } catch (e) {
        console.error('[regactividad] Error al cargar desde Firestore:', e);
        // Fallback a localStorage
        const stored = localStorage.getItem('actividad:newRows');
        rows = stored ? JSON.parse(stored) : [];
        if (Array.isArray(rows) && rows.length){ normalizeLegacyClientsInRows(rows); }
        console.log('[regactividad] Usando datos de localStorage (fallback)');
      }
    } else {
      // Sin Firebase, usar localStorage
      const stored = localStorage.getItem('actividad:newRows');
      rows = stored ? JSON.parse(stored) : [];
      if (Array.isArray(rows) && rows.length){ normalizeLegacyClientsInRows(rows); }
      console.log('[regactividad] Firebase no disponible, usando localStorage');
    }
    
    if (rows.length === 0) {
      document.getElementById('historyTableBody').innerHTML = '<tr><td colspan="12" style="text-align:center; padding:40px;">No hay registros guardados</td></tr>';
      document.getElementById('totalRegistros').textContent = '0';
      document.getElementById('totalInternos').textContent = '0';
      document.getElementById('totalExternos').textContent = '0';
      return;
    }
    
    let totalInternos = 0, totalExternos = 0;
    rows.forEach(r => {
      const tipo = r[headerIndices.PROPIEDAD] || '';
      if (tipo === 'PCT') totalInternos++;
      else if (tipo) totalExternos++;
    });
    
    document.getElementById('totalRegistros').textContent = rows.length;
    document.getElementById('totalInternos').textContent = totalInternos;
    document.getElementById('totalExternos').textContent = totalExternos;
    // Ingresos/Rentas movidos a actividadmin (admin)
    
    // --- Métricas de actividades: activas, vencidas (SLA 30 días) y días promedio en servicio ---
    try {
      const idxIni = headerIndices.INICIO;
      const idxTerm = headerIndices.TERMINACION;
      const idxDev = headerIndices.DEVOLUCION;
      const idxDias = headerIndices.DIAS;
      const now = new Date(); now.setHours(0,0,0,0);
      const dayMs = 24*3600*1000;
      const SLAms = 30*dayMs;
      let activas = 0, vencidas = 0, sumDias = 0;
      const parseDMYLocal = (s)=>{
        const m = String(s||'').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (!m) return null; let d=+m[1], M=+m[2]-1, y=+m[3]; if (y<100) y+=2000; const dt=new Date(y,M,d); dt.setHours(0,0,0,0); return isNaN(dt.getTime())?null:dt;
      };
      rows.forEach(r=>{
        const iniStr = idxIni>=0 ? r[idxIni] : '';
        const termStr = idxTerm>=0 ? r[idxTerm] : '';
        const devStr = idxDev>=0 ? r[idxDev] : '';
        const di = parseDMYLocal(iniStr);
        const termOk = !!parseDMYLocal(termStr);
        const devOk = !!parseDMYLocal(devStr);
        const abierta = !!di && !termOk && !devOk;
        if (!di) return;
        if (abierta){
          activas++;
          let dias = 0;
          if (idxDias>=0){ const n = parseFloat(String(r[idxDias]||'').replace(/,/g,'')); dias = isNaN(n)? 0 : n; }
          if (!dias){ dias = Math.max(0, Math.floor((now - di)/dayMs)); }
          sumDias += dias;
          if ((now.getTime() - di.getTime()) > SLAms) vencidas++;
        }
      });
      const avgDias = activas>0 ? Math.round(sumDias/activas) : 0;
      const elA = document.getElementById('totalActivas'); if (elA) elA.textContent = activas.toLocaleString('es-MX');
      const elV = document.getElementById('totalVencidas'); if (elV) elV.textContent = vencidas.toLocaleString('es-MX');
      const elD = document.getElementById('avgDiasServicio'); if (elD) elD.textContent = avgDias.toLocaleString('es-MX');
    } catch(e){ console.warn('[regactividad] métricas act/venc/días', e); }
    
    try {
      const sel = document.getElementById('areaFilter');
      if (sel && headerIndices.AREA != null && headerIndices.AREA >= 0) {
        const counts = new Map();
        rows.forEach(r => {
          const a = String(r[headerIndices.AREA] || '').trim();
          if (!a) return;
          counts.set(a, (counts.get(a) || 0) + 1);
        });
        sel.innerHTML = '';
        const optAll = document.createElement('option');
        optAll.value = '';
        optAll.textContent = 'Todas las áreas';
        sel.appendChild(optAll);
        Array.from(counts.keys()).sort((a, b) => a.localeCompare(b || '', 'es', { sensitivity: 'base' })).forEach(a => {
          const o = document.createElement('option');
          o.value = a;
          o.textContent = `${a} (${counts.get(a) || 0})`;
          sel.appendChild(o);
        });
      }
    } catch(e) {
      console.warn('[regactividad] areaFilter populate', e);
    }

    renderTable(rows);
  } catch (e) {
    console.error('[regactividad] load:', e);
    document.getElementById('historyTableBody').innerHTML = '<tr><td colspan="12" style="text-align:center; padding:40px; color:red;">Error al cargar registros</td></tr>';
  }
}

function renderTable(rows){ 
  const tbody=document.getElementById('historyTableBody'); 
  tbody.innerHTML=''; 

  // Agrupar por cliente
  const groups = new Map();
  rows.forEach((row,idx)=>{
    const cliIdx = headerIndices.CLIENTE;
    const cli = cliIdx!=null && cliIdx>=0 ? String(row[cliIdx]||'').trim() : '';
    if (!groups.has(cli)) groups.set(cli, []);
    groups.get(cli).push({ row, idx });
  });

  const collapsed = (renderTable._collapsedClients = renderTable._collapsedClients || new Set());
  const clients = Array.from(groups.keys()).sort((a,b)=>a.localeCompare(b||'', 'es', {sensitivity:'base'}));

  // Primera vez: si no hay estado previo, colapsar todos los clientes por defecto (solo una vez)
  if (!renderTable._collapsedInitialized && collapsed.size === 0){
    clients.forEach(c => collapsed.add(c));
    renderTable._collapsedInitialized = true;
  }

  clients.forEach(cli=>{
    const rowsForClient = groups.get(cli) || [];
    const trCli = document.createElement('tr');
    const tdCli = document.createElement('td');
    tdCli.colSpan = 12; // coincide con columnas visibles de la tabla
    tdCli.style.background = '#f3f4f6';
    tdCli.style.fontWeight = '700';
    tdCli.style.padding = '6px 10px';
    tdCli.style.cursor = 'pointer';

    const isCollapsed = collapsed.has(cli);
    const caret = document.createElement('span');
    caret.textContent = isCollapsed ? '►' : '▼';
    caret.style.marginRight = '8px';
    const title = document.createElement('span');
    title.textContent = cli || '— Sin cliente —';
    tdCli.appendChild(caret);
    tdCli.appendChild(title);

    tdCli.addEventListener('click', ()=>{
      if (collapsed.has(cli)) collapsed.delete(cli); else collapsed.add(cli);
      renderTable(rows);
    });

    trCli.appendChild(tdCli);
    tbody.appendChild(trCli);

    if (isCollapsed) return;

    rowsForClient.forEach(({row, idx})=>{
      const tr=document.createElement('tr'); 
      const tdF=document.createElement('td'); 
      tdF.textContent=new Date().toLocaleDateString('es-MX'); 
      tr.appendChild(tdF); 
      const tdT=document.createElement('td'); 
      const prop=row[headerIndices.PROPIEDAD]||''; 
      const tipo=prop==='PCT'?'PROPIO':'TERCEROS'; 
      tdT.innerHTML=`<span class="badge ${prop==='PCT'?'badge-interno':'badge-externo'}">${tipo}</span>`; 
      tr.appendChild(tdT); 
      const makeTd=(val)=>{const td=document.createElement('td'); td.textContent=val||'-'; return td;}; 
      tr.appendChild(makeTd(row[headerIndices.SERIAL])); 
      tr.appendChild(makeTd(row[headerIndices.EQUIPO])); 
      tr.appendChild(makeTd(row[headerIndices.CLIENTE])); 
      tr.appendChild(makeTd(row[headerIndices.AREA])); 
      tr.appendChild(makeTd(row[headerIndices.INICIO])); 
      tr.appendChild(makeTd(row[headerIndices.TERMINACION])); 
      const tdDias=makeTd(row[headerIndices.DIAS]||'0'); 
      tdDias.style.textAlign='center'; 
      tr.appendChild(tdDias); 
      const tdPrec=document.createElement('td'); 
      const prec=parseFloat(row[headerIndices.PRECIO]||0); 
      tdPrec.textContent='$'+prec.toLocaleString('es-MX',{minimumFractionDigits:2}); 
      tdPrec.style.textAlign='right'; 
      tr.appendChild(tdPrec); 
      const tdEst=document.createElement('td'); 
      const sTerm=row[headerIndices.TERMINACION]; 
      let est='Desconocido'; 
      if (sTerm){ 
        const [d,m,y]=sTerm.split('/'); 
        const f=new Date(2000+parseInt(y),parseInt(m)-1,parseInt(d)); 
        est=f>new Date()?'Activo':'Finalizado'; 
      } 
      tdEst.innerHTML=`<span class="badge ${est==='Activo'?'badge-activo':'badge-finalizado'}">${est}</span>`; 
      tr.appendChild(tdEst); 
      const tdAcc=document.createElement('td'); 
      tdAcc.style.whiteSpace='nowrap'; 
      const bPdf=document.createElement('button'); 
      bPdf.className='pdf-row-btn'; 
      bPdf.innerHTML='📄'; 
      bPdf.title='Generar PDF'; 
      bPdf.style.marginRight='8px'; 
      bPdf.onclick=()=>generatePDF(row); 
      const bEd=document.createElement('button'); 
      bEd.className='edit-row-btn'; 
      bEd.innerHTML='✏️'; 
      bEd.title='Editar'; 
      bEd.style.marginRight='8px'; 
      bEd.onclick=()=>editRecord(idx,row); 
      const bDel=document.createElement('button'); 
      bDel.className='delete-row-btn'; 
      bDel.innerHTML='🗑️'; 
      bDel.title='Eliminar'; 
      bDel.onclick=()=>deleteRecord(idx,row); 
      if (!(window.isAdmin && window.isAdmin())) {
        bEd.style.display = 'none';
        bDel.style.display = 'none';
      }
      tdAcc.append(bPdf,bEd,bDel); 
      tr.appendChild(tdAcc); 
      tbody.appendChild(tr); 
    });
  });
} 

async function cancelRelatedTestOrders(row){
  try{
    await waitForFirebase();
    if (!firebaseReady || !window.db) return;
    const actividadId = row && row._firestoreId;
    if (!actividadId) return;

    const snap = await window.db.collection('testOrders')
      .where('actividadRef','==',actividadId)
      .where('status','==','pending')
      .limit(500)
      .get();
    if (snap.empty) return;

    const batch = window.db.batch();
    snap.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });
    });
    await batch.commit();
    console.log(`[regactividad] Órdenes de prueba canceladas para actividad ${actividadId}:`, snap.size);
  }catch(e){ console.warn('[regactividad] No se pudieron cancelar testOrders relacionadas', e); }
}

async function deleteRecord(index, row) {
  if (!(window.isAdmin && window.isAdmin())) {
    alert('Solo un administrador puede eliminar registros.');
    return;
  }
  if (!confirm('¿Estás seguro de eliminar este registro permanentemente?')) return;
  try {
    // Intentar eliminar de Firestore
    if (firebaseReady && window.db && row._firestoreId) {
      await window.db.collection(COLLECTION_NAME).doc(row._firestoreId).delete();
      console.log('[regactividad] Registro eliminado de Firestore:', row._firestoreId);
    }

    // Marcar como canceladas las órdenes de prueba ligadas a esta actividad
    await cancelRelatedTestOrders(row);
    
    // Eliminar de localStorage
    const key = 'actividad:newRows';
    const stored = localStorage.getItem(key);
    const rows = stored ? JSON.parse(stored) : [];
    rows.splice(index, 1);
    localStorage.setItem(key, JSON.stringify(rows));
    
    await loadHistory();
    console.log('[regactividad] Registro eliminado');
  } catch (e) {
    console.error('[regactividad] del:', e);
    alert('Error al eliminar: ' + e.message);
  }
}

function esc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function generatePDF(row){ 
  const html = buildViewHtml(row);
  const pw=window.open('','_blank'); 
  pw.document.open('text/html'); 
  pw.document.write(html); 
  pw.document.close(); 
  pw.focus(); 
  try{pw.print();}catch(e){} 
  setTimeout(()=>{try{pw.close();}catch(e){}},600); 
}

function editRecord(index, row){
  if (!(window.isAdmin && window.isAdmin())) {
    alert('Solo un administrador puede editar registros.');
    return;
  }
  try{
    const overlay = document.createElement('div');
    overlay.style.position='fixed'; overlay.style.inset='0'; overlay.style.background='rgba(0,0,0,.35)'; overlay.style.zIndex='9999';
    const modal = document.createElement('div');
    modal.style.maxWidth='720px'; modal.style.margin='60px auto'; modal.style.background='#fff'; modal.style.borderRadius='12px'; modal.style.boxShadow='0 10px 30px rgba(0,0,0,.2)'; modal.style.overflow='hidden';
    modal.innerHTML = '<div style="padding:16px 20px; border-bottom:1px solid #e5e7eb; font-weight:700; color:#111">Editar registro</div>'+
      '<div style="padding:16px 20px; display:grid; grid-template-columns:1fr 1fr; gap:12px 16px">'
      + '<label style="display:flex; flex-direction:column; gap:6px">Equipo/Activo<input type="text" id="ed_equipo" /></label>'
      + '<label style="display:flex; flex-direction:column; gap:6px">Cliente<input type="text" id="ed_cliente" /></label>'
      + '<label style="display:flex; flex-direction:column; gap:6px">Área del cliente<input type="text" id="ed_area" /></label>'
      + '<label style="display:flex; flex-direction:column; gap:6px">Ubicación<input type="text" id="ed_ubic" /></label>'
      + '<label style="display:flex; flex-direction:column; gap:6px">Embarque<input type="text" id="ed_emb" placeholder="dd/mm/aa" /></label>'
      + '<label style="display:flex; flex-direction:column; gap:6px">Inicio del servicio<input type="text" id="ed_ini" placeholder="dd/mm/aa" /></label>'
      + '<label style="display:flex; flex-direction:column; gap:6px">Terminación del servicio<input type="text" id="ed_term" placeholder="dd/mm/aa" /></label>'
      + '<label style="display:flex; flex-direction:column; gap:6px">Devolución/Entrega<input type="text" id="ed_dev" placeholder="dd/mm/aa" /></label>'
      + '<label style="display:flex; flex-direction:column; gap:6px">Precio<input type="number" step="0.01" id="ed_precio" /></label>'
      + '<div style="grid-column:1 / -1; display:flex; align-items:center; gap:8px"><input type="checkbox" id="ed_recalc" checked /><label for="ed_recalc">Recalcular Fin Parcial (25) y Continuación (día siguiente) automáticamente</label></div>'
      + '</div>'
      + '<div style="padding:12px 16px; border-top:1px solid #e5e7eb; display:flex; justify-content:flex-end; gap:10px">'
      + '<button id="ed_cancel" class="btn-secondary">Cancelar</button>'
      + '<button id="ed_save" class="btn-primary">Guardar</button>'
      + '</div>';
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const gi = (id)=> modal.querySelector('#'+id);
    gi('ed_equipo').value = String(row[headerIndices.EQUIPO]||'');
    gi('ed_cliente').value = String(row[headerIndices.CLIENTE]||'');
    gi('ed_area').value = String(row[headerIndices.AREA]||'');
    gi('ed_ubic').value = String(row[headerIndices.UBICACION]||'');
    if (headerIndices.EMBARQUE>=0) gi('ed_emb').value = String(row[headerIndices.EMBARQUE]||'');
    gi('ed_ini').value = String(row[headerIndices.INICIO]||'');
    gi('ed_term').value = String(row[headerIndices.TERMINACION]||'');
    if (headerIndices.DEVOLUCION>=0) gi('ed_dev').value = String(row[headerIndices.DEVOLUCION]||'');
    gi('ed_precio').value = String(row[headerIndices.PRECIO]||'');

    gi('ed_cancel').onclick = () => overlay.remove();
    gi('ed_save').onclick = async () => {
      try {
        const stored = JSON.parse(localStorage.getItem('actividad:newRows') || '[]');
        const rows = Array.isArray(stored) ? stored : [];
        const r = rows[index];
        if (!r) { alert('No se encontró el registro'); return; }
        
        r[headerIndices.EQUIPO] = gi('ed_equipo').value;
        r[headerIndices.CLIENTE] = gi('ed_cliente').value;
        r[headerIndices.AREA] = gi('ed_area').value;
        r[headerIndices.UBICACION] = gi('ed_ubic').value;
        if (headerIndices.EMBARQUE >= 0) r[headerIndices.EMBARQUE] = gi('ed_emb').value;
        r[headerIndices.INICIO] = gi('ed_ini').value;
        r[headerIndices.TERMINACION] = gi('ed_term').value;
        if (headerIndices.DEVOLUCION >= 0) r[headerIndices.DEVOLUCION] = gi('ed_dev').value;
        r[headerIndices.PRECIO] = gi('ed_precio').value;

        if (gi('ed_recalc').checked) {
          const sIni = r[headerIndices.INICIO];
          const sTerm = r[headerIndices.TERMINACION];
          const di = parseDMY(sIni), dt = parseDMY(sTerm);
          if (di && dt && dt > di) {
            const fins = []; const conts = [];
            let cursor = new Date(di);
            cursor.setDate(cursor.getDate() + 25);
            cursor.setHours(0, 0, 0, 0);
            while (cursor < dt) {
              fins.push(formatDMY(cursor));
              const cNext = new Date(cursor);
              cNext.setDate(cNext.getDate() + 1);
              conts.push(formatDMY(cNext));
              cursor.setDate(cursor.getDate() + 30);
            }
            const idxFines = getIdx(['FIN PARCIAL DEL SERVICIO', 'FIN PARCIAL', 'FINES PARCIALES', 'FIN PARCIAL SERVICIO', 'FIN PARCIAL DE SERVICIO']);
            const idxCont = getIdx(['CONTINUACION DEL SERVICIO', 'CONTINUACIÓN DEL SERVICIO', 'CONTINUACION', 'CONTINUACIÓN', 'CONTINUACION DE SERVICIO', 'CONTINUACIÓN DE SERVICIO']);
            if (idxFines >= 0) r[idxFines] = fins.join('\n');
            if (idxCont >= 0) r[idxCont] = conts.join('\n');
            const diasTotales = Math.ceil((dt - di) / (1000 * 60 * 60 * 24)) + 1;
            if (headerIndices.DIAS >= 0) r[headerIndices.DIAS] = String(diasTotales);
            const precioNum = parseFloat(gi('ed_precio').value) || 0;
            const monto = diasTotales * precioNum;
            if (headerIndices.INGRESO >= 0) r[headerIndices.INGRESO] = String(monto);
            if (headerIndices.RENTA >= 0) r[headerIndices.RENTA] = String(monto);
            if (headerIndices.DEVOLUCION >= 0) {
              const devDate = new Date(dt); devDate.setDate(dt.getDate() + 1);
              r[headerIndices.DEVOLUCION] = formatDMY(devDate);
            }
          }
        }

        // Actualizar en Firestore si está disponible
        if (firebaseReady && window.db && row._firestoreId) {
          const rowData = { ...r };
          delete rowData._firestoreId;
          delete rowData._timestamp;
          delete rowData.id;
          
          await window.db.collection(COLLECTION_NAME).doc(row._firestoreId).update({
            row: rowData,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: new Date().toISOString()
          });
          console.log('[regactividad] Registro actualizado en Firestore');
        }

        localStorage.setItem('actividad:newRows', JSON.stringify(rows));
        overlay.remove();
        await loadHistory();
      } catch (e) { console.error('[regactividad] edit save:', e); alert('Error al guardar: ' + e.message); }
    };
  }catch(e){ console.error('[regactividad] edit:', e); alert('No se pudo abrir el editor'); }
}

// Arranque: esperar Firebase y cargar datos
(async function init() {
  await loadHeaders();
  
  // Esperar a que Firebase esté listo
  try {
    await waitForFirebase();
    console.log('[regactividad] Firebase inicializado correctamente');
    
    // Actualizar UI de autenticación
    updateAuthUI();
    
    // Escuchar cambios en autenticación
    if (window.auth && window.auth.onAuthStateChanged) {
      window.auth.onAuthStateChanged((user) => {
        console.log('[regactividad] Estado de auth cambió:', user ? user.email : 'sin sesión');
        updateAuthUI();
      });
    }
  } catch (e) {
    console.warn('[regactividad] Firebase no disponible, usando localStorage únicamente');
  }
  
  await loadHistory();
})();

(function(){
  const searchInput = document.getElementById('searchInput');
  const areaFilter = document.getElementById('areaFilter');

  function applyRowFilters(){
    const term = (searchInput && searchInput.value ? searchInput.value : '').toLowerCase();
    const area = (areaFilter && areaFilter.value ? areaFilter.value : '').toLowerCase();
    document.querySelectorAll('#historyTableBody tr').forEach(r=>{
      const text = r.textContent.toLowerCase();
      const okTerm = !term || text.includes(term);
      const okArea = !area || text.includes(area);
      r.style.display = (okTerm && okArea) ? '' : 'none';
    });
  }

  if (searchInput){
    searchInput.addEventListener('input', applyRowFilters);
  }
  if (areaFilter){
    areaFilter.addEventListener('change', applyRowFilters);
  }
})();

document.querySelector('.menu-toggle')?.addEventListener('click', function(){ const nav=document.getElementById('primary-nav'); nav.classList.toggle('open'); this.setAttribute('aria-expanded', nav.classList.contains('open')); });

// Botón de logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      if (window.auth && window.auth.signOut) {
        await window.auth.signOut();
      }
      window.location.href = 'login.html';
    } catch (e) {
      console.error('[regactividad] Error al cerrar sesión:', e);
      window.location.href = 'login.html';
    }
  });
}

document.getElementById('exportBtn')?.addEventListener('click', function(){ try{ const key='actividad:newRows'; const stored=localStorage.getItem(key); const rows=stored?JSON.parse(stored):[]; if(rows.length===0){ alert('No hay registros para exportar'); return; } const headersCsv='Tipo,Serial,Equipo/Activo,Descripción,Cliente,Área,Ubicación,Factura,Inicio,Terminación,Días,Precio\n'; let csv=headersCsv; rows.forEach(row=>{ const prop=row[headerIndices.PROPIEDAD]||''; const tipo=prop==='PCT'?'PROPIO':'TERCEROS'; const fields=[ tipo, row[headerIndices.SERIAL]||'', row[headerIndices.EQUIPO]||'', row[headerIndices.DESCRIPCION]||'', row[headerIndices.CLIENTE]||'', row[headerIndices.AREA]||'', row[headerIndices.UBICACION]||'', row[headerIndices.FACTURA]||'', row[headerIndices.INICIO]||'', row[headerIndices.TERMINACION]||'', row[headerIndices.DIAS]||'', row[headerIndices.PRECIO]||'' ]; csv += fields.map(v=>`"${String(v).replace(/\"/g,'\"\"')}"`).join(',')+'\n'; }); const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='registros_actividad.csv'; a.click(); }catch(e){ console.error('[regactividad] export csv', e); alert('Error al exportar CSV'); }});

document.getElementById('clearAllBtn')?.addEventListener('click', async function() {
  if (!(window.isAdmin && window.isAdmin())) { alert('Solo un administrador puede borrar todos los registros.'); return; }
  if (!confirm('⚠️ ADVERTENCIA: Esto eliminará TODOS los registros permanentemente de la nube y de todas las computadoras.\n\n¿Estás completamente seguro?')) return;
  if (!confirm('Esta acción NO se puede deshacer. ¿Continuar?')) return;
  
  try {
    // Eliminar de Firestore
    if (firebaseReady && window.db) {
      const snapshot = await window.db.collection(COLLECTION_NAME).get();
      const batch = window.db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log('[regactividad] Registros eliminados de Firestore');
    }
    
    // Eliminar de localStorage
    localStorage.removeItem('actividad:newRows');
    localStorage.removeItem('actividad:firestoreIds');
    
    await loadHistory();
    alert('✅ Todos los registros han sido eliminados');
  } catch (e) {
    console.error('[regactividad] clear:', e);
    alert('Error al borrar: ' + e.message);
  }
});

document.getElementById('refreshBtn')?.addEventListener('click', async () => {
  await loadHeaders();
  await loadHistory();
});

// --- VER DETALLE ---
function getIdx(nameVariants){ try { return getHeaderIndex(nameVariants); } catch(_) { return -1; } }

function splitList(s, onlyNewlines=false){
  if(!s) return [];
  const pattern = onlyNewlines ? /\r?\n/ : /\r?\n|;|,|\||\t/;
  return String(s)
    .split(pattern)
    .map(x=>x.trim())
    .filter(Boolean);
}

// Fechas utilitarias para tabulador
function parseDMY(s){
  const m = String(s||'').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let d = parseInt(m[1],10), M = parseInt(m[2],10)-1, y = parseInt(m[3],10);
  if (y < 100) y += 2000;
  const dt = new Date(y, M, d); dt.setHours(0,0,0,0);
  return isNaN(dt.getTime()) ? null : dt;
}
function formatDMY(dt){
  const d = String(dt.getDate()).padStart(2,'0');
  const m = String(dt.getMonth()+1).padStart(2,'0');
  const y2 = String(dt.getFullYear()%100).padStart(2,'0');
  return `${d}/${m}/${y2}`;
}
function cutoff25(dt){
  const d = new Date(dt.getFullYear(), dt.getMonth(), 25);
  d.setHours(0,0,0,0);
  return (dt > d) ? new Date(dt.getFullYear(), dt.getMonth()+1, 25) : d;
}
function continuation27From(dateOn25){
  const d = new Date(dateOn25.getFullYear(), dateOn25.getMonth(), 27);
  d.setHours(0,0,0,0);
  return d;
}

function computeTimeline(row){
  const embarqueStr = headerIndices.EMBARQUE>=0 ? String(row[headerIndices.EMBARQUE]||'') : '';
  const inicioStr = String(row[headerIndices.INICIO]||'');
  const termStr = String(row[headerIndices.TERMINACION]||'');
  const entregaStr = headerIndices.DEVOLUCION>=0 ? String(row[headerIndices.DEVOLUCION]||'') : '';
  const di = parseDMY(inicioStr);
  const dt = parseDMY(termStr);
  const steps = [];
  if (embarqueStr) steps.push({ tipo:'Embarque', fecha: embarqueStr });
  if (!di || !dt) {
    if (inicioStr) steps.push({ tipo:'Inicio del servicio', fecha: inicioStr });
    if (termStr) steps.push({ tipo:'Terminación del servicio', fecha: termStr });
    if (entregaStr) steps.push({ tipo:'Entrega', fecha: entregaStr });
    return steps;
  }
  steps.push({ tipo:'Inicio del servicio', fecha: formatDMY(di) });
  // Primera fecha fin parcial = inicio + 25 días
  let cursor = new Date(di);
  cursor.setDate(cursor.getDate() + 25);
  cursor.setHours(0,0,0,0);
  while (cursor < dt){
    steps.push({ tipo:'Fin parcial', fecha: formatDMY(cursor) });
    // Continuación = día siguiente
    const cont = new Date(cursor);
    cont.setDate(cont.getDate() + 1);
    steps.push({ tipo:'Continuación de servicio', fecha: formatDMY(cont) });
    // Siguiente fin parcial = actual + 30 días
    cursor.setDate(cursor.getDate() + 30);
  }
  steps.push({ tipo:'Terminación del servicio', fecha: formatDMY(dt) });
  if (entregaStr) steps.push({ tipo:'Entrega', fecha: entregaStr });
  return steps;
}

function buildViewHtml(row){
  const prop = row[headerIndices.PROPIEDAD] || '';
  const tipo = prop === 'PCT' ? 'EQUIPO PROPIO' : 'EQUIPO DE TERCEROS';
  const fecha = new Date().toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric' });
  const idxFines = getIdx(['FIN PARCIAL DEL SERVICIO','FIN PARCIAL','FINES PARCIALES','FIN PARCIAL SERVICIO','FIN PARCIAL DE SERVICIO']);
  const idxCont = getIdx(['CONTINUACION DEL SERVICIO','CONTINUACIÓN DEL SERVICIO','CONTINUACION','CONTINUACIÓN','CONTINUACION DE SERVICIO','CONTINUACIÓN DE SERVICIO']);
  const idxObs = getIdx(['OBSERVACIONES','OBSERVACION','OBS']);
  const get = (i)=> i>=0 ? esc(row[i]||'N/A') : 'N/A';
  const ingreso = parseFloat(row[headerIndices.INGRESO]||0)||0;
  const renta   = parseFloat(row[headerIndices.RENTA]||0)||0;
  const monto   = prop==='PCT'? ingreso : renta;

  // Construir la secuencia cronológica
  const embarque = headerIndices.EMBARQUE>=0 ? String(row[headerIndices.EMBARQUE]||'') : '';
  const inicio = String(row[headerIndices.INICIO]||'');
  const terminacion = String(row[headerIndices.TERMINACION]||'');
  const entrega = headerIndices.DEVOLUCION>=0 ? String(row[headerIndices.DEVOLUCION]||'') : '';
  
  // Obtener fines parciales y continuaciones
  const finesRaw = row[idxFines]||'';
  const contsRaw = row[idxCont]||'';
  
  const fines = splitList(finesRaw, true); // Solo dividir por saltos de línea
  const conts = splitList(contsRaw, true); // Solo dividir por saltos de línea
  
  // Construir tabla con 6 columnas
  const tableRows = [];
  let rowIdx = 0;
  
  // Fila 1: Embarque, Inicio, vacío, Fin Parcial 1, vacío, vacío
  tableRows.push([
    embarque || '',
    inicio || '',
    '',
    fines.length > 0 ? fines[0] : '',
    '',
    ''
  ]);
  
  // Filas siguientes: vacío, vacío, Continuación N, Fin Parcial N+1, vacío, vacío
  for (let i = 0; i < conts.length; i++) {
    tableRows.push([
      '',
      '',
      conts[i] || '',
      (i + 1) < fines.length ? fines[i + 1] : '',
      '',
      ''
    ]);
  }
  
  // Penúltima fila puede tener Terminación en columna 5
  // Verificar si ya terminamos los fines parciales
  if (terminacion) {
    // Si la última fila tiene algo en columna 4, crear nueva fila para terminación
    const lastRow = tableRows[tableRows.length - 1];
    if (lastRow[3]) {
      tableRows.push(['', '', '', '', terminacion, '']);
    } else {
      lastRow[4] = terminacion;
    }
  }
  
  // Última fila: Entrega en columna 6
  if (entrega) {
    const lastRow = tableRows[tableRows.length - 1];
    if (lastRow[4] || lastRow[3] || lastRow[2]) {
      tableRows.push(['', '', '', '', '', entrega]);
    } else {
      lastRow[5] = entrega;
    }
  }

  const styles = `
    @media print { 
      @page { margin: 15mm; } 
      body { margin: 0; } 
      .page-break { page-break-before: always; } 
    }
    body { font-family: Arial, sans-serif; margin: 24px; color: #111; line-height: 1.5; }
    .header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 3px solid #d97706; }
    .header img { height: 60px; width: auto; }
    .header-text { flex: 1; }
    .header-text h1 { color: #d97706; margin: 0 0 4px; font-size: 24px; }
    .header-text .muted { font-size: 14px; color: #6b7280; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; margin-top: 8px; }
    .badge-interno { background: #dbeafe; color: #1e40af; }
    .badge-externo { background: #fce7f3; color: #9f1239; }
    h2 { font-size: 16px; color: #d97706; margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #f59e0b; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
    .item { border-bottom: 1px solid #e5e7eb; padding: 6px 0; }
    .lab { font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; }
    .val { font-weight: 600; }
    .mono { font-family: ui-monospace, monospace; }
    table.timeline { width: 100%; border-collapse: collapse; margin-top: 8px; }
    table.timeline th, table.timeline td { border: 1px solid #e5e7eb; padding: 8px 6px; text-align: center; vertical-align: middle; }
    table.timeline th { font-size: 11px; color: #6b7280; text-transform: uppercase; background: #f9fafb; font-weight: 700; }
    table.timeline td { min-height: 32px; }
  `;
  
  return [
    '<!DOCTYPE html>',
    '<html lang="es">',
    '<head>',
      '<meta charset="UTF-8">',
      '<title>Detalle de Registro - ' + esc(row[headerIndices.EQUIPO]||'Sin Equipo') + '</title>',
      '<style>' + styles + '</style>',
    '</head>',
    '<body>',
    '<div class="header">',
      '<img src="img/logopctch.png" alt="PCT Construcción Logo">',
      '<div class="header-text">',
        '<h1>PCT CONSTRUCCIÓN</h1>',
        '<div class="muted">', esc(tipo),' • ', esc(fecha), '</div>',
      '</div>',
    '</div>',
    '<h2>Información General</h2>',
    '<div class="grid">',
      '<div class="item"><div class="lab">Serial</div><div class="val">', get(headerIndices.SERIAL), '</div></div>',
      '<div class="item"><div class="lab">Equipo / Activo</div><div class="val">', get(headerIndices.EQUIPO), '</div></div>',
      '<div class="item"><div class="lab">Descripción</div><div class="val">', get(headerIndices.DESCRIPCION), '</div></div>',
      '<div class="item"><div class="lab">Cliente</div><div class="val">', get(headerIndices.CLIENTE), '</div></div>',
      '<div class="item"><div class="lab">Área del Cliente</div><div class="val">', get(headerIndices.AREA), '</div></div>',
      '<div class="item"><div class="lab">Ubicación</div><div class="val">', get(headerIndices.UBICACION), '</div></div>',
      '<div class="item"><div class="lab">Factura</div><div class="val">', get(headerIndices.FACTURA), '</div></div>',
    '</div>',
    '<h2>Resumen Financiero</h2>',
    (() => {
      const precioNum = parseFloat(row[headerIndices.PRECIO]||0);
      const diasTotales = parseInt(row[headerIndices.DIAS]||0);
      const di = parseDMY(inicio);
      const dt = parseDMY(terminacion);
      const hoy = new Date(); hoy.setHours(0,0,0,0);
      
      let cobrado = 0;
      let porCobrar = 0;
      
      if (di && dt) {
        if (hoy < di) {
          // No ha iniciado
          cobrado = 0;
          porCobrar = monto;
        } else if (hoy >= dt) {
          // Ya terminó
          cobrado = monto;
          porCobrar = 0;
        } else {
          // En curso
          const diasTranscurridos = Math.ceil((hoy - di) / (1000*60*60*24)) + 1;
          cobrado = diasTranscurridos * precioNum;
          porCobrar = monto - cobrado;
        }
      } else {
        cobrado = monto;
        porCobrar = 0;
      }
      
      return '<div class="grid">' +
        '<div class="item"><div class="lab">Días en Servicio</div><div class="val mono">' + esc(row[headerIndices.DIAS]||'0') + ' días</div></div>' +
        '<div class="item"><div class="lab">Precio Diario</div><div class="val mono">$' + precioNum.toLocaleString('es-MX',{minimumFractionDigits:2}) + '</div></div>' +
        '<div class="item"><div class="lab">Cobrado a la Fecha</div><div class="val mono" style="color:#059669;">$' + cobrado.toLocaleString('es-MX',{minimumFractionDigits:2}) + '</div></div>' +
        '<div class="item"><div class="lab">Por Cobrar</div><div class="val mono" style="color:#dc2626;">$' + porCobrar.toLocaleString('es-MX',{minimumFractionDigits:2}) + '</div></div>' +
        '<div class="item" style="grid-column:1/-1;border-top:2px solid #d97706;padding-top:12px;margin-top:8px"><div class="lab">Ingreso/Renta Total</div><div class="val mono" style="color:#d97706;font-size:20px;font-weight:700">$' + monto.toLocaleString('es-MX',{minimumFractionDigits:2}) + '</div></div>' +
        '</div>';
    })(),
    '<div class="page-break"></div>',
    '<div class="header">',
      '<img src="img/logopctch.png" alt="PCT Construcción Logo">',
      '<div class="header-text">',
        '<h1>PCT CONSTRUCCIÓN</h1>',
        '<div class="muted">Tabulador de Servicio • ', esc(fecha), '</div>',
      '</div>',
    '</div>',
    '<h2>Tabulador de Servicio</h2>',
    '<table class="timeline">',
      '<thead><tr>',
        '<th>EMBARQUE</th>',
        '<th>INICIO DEL SERVICIO</th>',
        '<th>CONTINUACION DEL SERVICIO</th>',
        '<th>FIN PARCIAL DEL SERVICIO</th>',
        '<th>TERMINACION DEL SERVICIO</th>',
        '<th>ENTREGA</th>',
      '</tr></thead>',
      '<tbody>',
        tableRows.map(r => '<tr>' + r.map(c => '<td>'+(c||'&nbsp;')+'</td>').join('') + '</tr>').join(''),
      '</tbody>',
    '</table>',
    (get(idxObs)!=='N/A' ? '<h2>Observaciones</h2><div class="sec"><div class="val">'+get(idxObs)+'</div></div>' : ''),
    '</body></html>'
  ].join('');
}

function viewRecordByIndex(index){
  try{
    const stored = localStorage.getItem('actividad:newRows');
    const rows = stored ? JSON.parse(stored) : [];
    const row = rows[index];
    if(!row){ alert('No se encontró el registro'); return; }
    const html = buildViewHtml(row);
    const w = window.open('', '_blank');
    w.document.open('text/html');
    w.document.write(html);
    w.document.close();
    w.focus();
  }catch(e){ console.error('[regactividad] view:', e); alert('Error al abrir el detalle'); }
}

function addViewButtons(){
  try{
    const tbody = document.getElementById('historyTableBody');
    const trs = tbody ? tbody.querySelectorAll('tr') : [];
    trs.forEach((tr, i)=>{
      const last = tr.lastElementChild;
      if(!last) return;
      if(last.querySelector('.view-row-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'btn-secondary view-row-btn';
      btn.textContent = 'Ver';
      btn.style.marginRight = '8px';
      btn.addEventListener('click', ()=> viewRecordByIndex(i));
      last.insertBefore(btn, last.firstChild);
    });
  }catch(e){ console.warn('[regactividad] addViewButtons:', e); }
}

// Añadir botones tras la primera carga y tras refrescar
document.addEventListener('DOMContentLoaded', ()=> setTimeout(addViewButtons, 0));
document.getElementById('refreshBtn')?.addEventListener('click', ()=> setTimeout(addViewButtons, 50));
