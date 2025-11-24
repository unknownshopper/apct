(function(){
  const SEED_VERSION = 2;
  function $(s, c){ return (c||document).querySelector(s); }
  function $all(s, c){ return Array.from((c||document).querySelectorAll(s)); }
  function fmtDate(ts){ try{ const d = ts instanceof Date ? ts : new Date(ts); return d.toISOString().slice(0,10);}catch{return ''} }

  function makeSeed(count){
    const rnd = (min, max, d=3)=> Number((min + Math.random()*(max-min)).toFixed(d));
    const ranges30CrMoA = {
      C:[0.26,0.34], Si:[0.17,0.37], Mn:[0.40,0.70], P:[0,0.030], S:[0,0.030], Cr:[0.80,1.10], Mo:[0.15,0.25], Ni:[0,0.30], Cu:[0,0.30]
    };
    const limitsStr = {
      C:'0.26–0.34', Si:'0.17–0.37', Mn:'0.40–0.70', P:'≤0.030', S:'≤0.030', Cr:'0.80–1.10', Mo:'0.15–0.25', Ni:'≤0.30', Cu:'≤0.30'
    };
    const arr = [];
    const base = new Date();
    for (let i=0;i<count;i++){
      const d = new Date(base.getTime() - i*86400000);
      const idx = String(i+1).padStart(3,'0');
      const grade = i%2===0 ? '30CrMoA' : 'AISI 4130';
      const chem = {};
      Object.keys(ranges30CrMoA).forEach(k=>{ chem[k] = rnd(ranges30CrMoA[k][0], ranges30CrMoA[k][1]); chem[k+"_lim"] = limitsStr[k]; });
      const charpyRows = ['Ambiente','0°C','-20°C','-40°C'].map(()=>{
        const v1 = rnd(60,78,0), v2 = rnd(60,78,0), v3 = rnd(60,78,0);
        const avg = Math.round((v1+v2+v3)/3);
        return { v1, v2, v3, avg };
      });
      arr.push({
        id: 'seed-'+idx,
        createdAtTS: d,
        head: {
          grade,
          heatno: `H${d.getFullYear()}-${idx}`,
          prov: i%3===0 ? 'Jiangsu Hongda' : (i%3===1 ? 'Baosteel' : 'TISCO'),
          standard: 'ASTM A370/ASTM A29',
          pono: 'PO-'+idx,
          date: d.toISOString().slice(0,10)
        },
        chem,
        ht: { normalize: 860, quench: 860, media: (i%2?'Aire':'Aceite'), temper1: 650, temper2: 550 },
        mech: { ys_req: '≥ 686', uts_req: '≥ 930', el_req: '≥ 12', ra_req: '≥ 45', ys: rnd(700,780,0), uts: rnd(930,1020,0), el: rnd(16,22,1), ra: rnd(50,68,0) },
        charpy: charpyRows,
        hardness: { hbw_req: '170-255', hbw: rnd(200,245,0) },
        notes: 'Reporte simulado para demostración.',
        createdBy: i%2===0 ? 'inspector01@pct.com' : 'inspector02@pct.com',
      });
    }
    return arr;
  }

  async function fetchData(){
    const user = (window.auth && window.auth.currentUser) || null;
    const db = (window.firebase && window.firebase.firestore && window.db) || window.db;
    if (user && db && db.collection){
      try{
        const snap = await db.collection('material_tests').orderBy('createdAtTS','desc').limit(500).get();
        return snap.docs.map(d=>({ id:d.id, ...d.data() }));
      }catch(e){ /* fallback abajo */ }
    }
    // Fallback local: borrador y/o semilla
    const draft = localStorage.getItem('mtr_draft');
    const arr = [];
    if (draft){ try{ const o = JSON.parse(draft); arr.push({ id:'local-draft', ...o, createdBy: (window.currentUser?.email||'local'), createdAtTS: o.createdAt ? new Date(o.createdAt) : new Date() }); }catch{} }
    // Leer semilla persistida o crearla si no existe
    let seed = [];
    try{ seed = JSON.parse(localStorage.getItem('mtr_seed_list')||'[]'); }catch{ seed = []; }
    const curVer = Number(localStorage.getItem('mtr_seed_version')||'0');
    const needsRegen = curVer !== SEED_VERSION || !seed || seed.length===0 || !seed[0]?.chem || !seed[0]?.charpy || !seed[0]?.mech;
    if (needsRegen){
      seed = makeSeed(30);
      try{ localStorage.setItem('mtr_seed_list', JSON.stringify(seed)); localStorage.setItem('mtr_seed_version', String(SEED_VERSION)); }catch{}
    }
    return seed.concat(arr);
  }

  function render(rows){
    const tbody = $('#mtrList tbody'); if (!tbody) return;
    tbody.innerHTML = '';
    if (!rows || rows.length===0){
      const tr = document.createElement('tr');
      const td = document.createElement('td'); td.colSpan = 6; td.textContent = 'Sin registros';
      tr.appendChild(td); tbody.appendChild(tr); return;
    }
    for (const r of rows){
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fmtDate(r.createdAtTS||r.createdAt)}</td>
        <td>${r?.head?.grade||''}</td>
        <td>${r?.head?.heatno||''}</td>
        <td>${r?.head?.prov||''}</td>
        <td>${r?.createdBy||''}</td>
        <td><a href="matestrep.html?id=${encodeURIComponent(r.id||'')}" class="btn">Abrir</a></td>
      `;
      tbody.appendChild(tr);
    }
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    render(await fetchData());
  });
})();
