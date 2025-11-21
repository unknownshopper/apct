/**
 * Script para popular registro de inspecciones con 30 inspecciones ficticias
 * usando equipos reales del inventario
 * 
 * Ejecutar desde la consola en reginspecciones.html o inspeccion.html
 */

(async function populateInspections() {
  console.log('🚀 Iniciando población de inspecciones...');

  // Verificar Firebase
  if (!window.db || !window.firebase) {
    console.error('❌ Firebase no disponible');
    return;
  }

  // Asegurar Papa.parse disponible
  async function ensurePapa() {
    if (window.Papa && typeof window.Papa.parse === 'function') return true;
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js';
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }

  const okPapa = await ensurePapa();
  if (!okPapa) {
    console.error('❌ No se pudo cargar Papa.parse');
    return;
  }

  const COLLECTION_NAME = 'inspections';
  const INVENTORY_URL = 'docs/INVENTARIO GENERAL PCT 2025 UNIFICADO.csv';
  
  // Tipos de inspección
  const tipos = ['Primaria', 'Secundaria', 'Terciaria'];
  
  // Lugares
  const lugares = [
    'Base de Operaciones PCT',
    'Taller Principal',
    'Almacén Monterrey',
    'Bodega Norte',
    'Patio de Equipos',
    'Cliente - Planta PEMEX',
    'Cliente - CFE Monterrey',
    'Cliente - Refinería',
    'En Campo - Reynosa',
    'En Campo - Tampico'
  ];
  
  // Clientes ficticios
  const clientes = [
    'PEMEX', 'CFE', 'GRUPO CARSO', 'CEMEX', 'BIMBO', 'GRUPO MODELO', 'FEMSA',
    'GRUPO ALFA', 'MEXICHEM', 'GMEXICO', 'GRUMA', 'ARCA CONTINENTAL', 'ELEKTRA'
  ];
  
  // Usuarios inspectores
  const usuarios = [
    'Juan Pérez',
    'María González',
    'Carlos López',
    'Ana Martínez',
    'Roberto Sánchez'
  ];
  
  // Observaciones típicas para equipos con problemas
  const observacionesTipicas = {
    serial: ['No Visible', 'Ilegible', 'Parcialmente visible'],
    fleje1: ['Ilegible', 'Dañado', 'Faltante'],
    fleje2: ['Ilegible', 'Dañado', 'Faltante'],
    recubrimiento: ['Desgastado', 'Oxidado', 'Corroído', 'Con ralladuras'],
    rosca: ['Desgastada', 'Con golpes', 'Corroída'],
    area_sellado: ['Desgastada', 'Con ralladuras', 'Golpeada'],
    elastomero: ['Dañado', 'Envejecido', 'Deformado', 'Roto']
  };
  
  try {
    // 1. Cargar inventario
    console.log('📥 Cargando inventario...');
    const equiposValidos = [];
    await new Promise((resolve, reject) => {
      window.Papa.parse(INVENTORY_URL, {
        download: true,
        skipEmptyLines: 'greedy',
        complete: (res) => {
          try {
            const rows = res?.data || [];
            if (!rows.length) throw new Error('Inventario vacío');

            // Mapear encabezados
            const hdr = rows[0].map((h) => String(h || ''));
            const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
            const pickIdx = (names) => {
              for (let k = 0; k < hdr.length; k++) {
                const h = norm(hdr[k]);
                for (const n of names) {
                  if (h === norm(n)) return k;
                }
              }
              return -1;
            };

            const idxEstado = pickIdx(['EDO', 'ESTADO']);
            const idxEquipo = pickIdx(['EQUIPO / ACTIVO', 'EQUIPO/ACTIVO', 'EQUIPO ACTIVO', 'EQUIPO']);
            const idxSerial = pickIdx(['SERIAL', 'NO DE SERIE', 'N DE SERIE', 'NUM DE SERIE']);
            const idxDesc = pickIdx(['DESCRIPCION', 'DESCRIPCIÓN']);
            const idxDiam = pickIdx(['DIAMETRO 1', 'DIAMETRO', 'DIÁMETRO 1', 'DIÁMETRO']);
            const idxConn = pickIdx(['CONEXION 1', 'CONEXIÓN 1', 'CONEXION', 'CONEXIÓN']);

            for (let r = 1; r < rows.length; r++) {
              const row = rows[r];
              const estado = idxEstado >= 0 ? String(row[idxEstado] || '').trim().toUpperCase() : 'ON';
              const equipo = idxEquipo >= 0 ? String(row[idxEquipo] || '').trim() : '';
              const descripcion = idxDesc >= 0 ? String(row[idxDesc] || '').trim() : '';
              const serial = idxSerial >= 0 ? String(row[idxSerial] || '').trim() : '';
              const diametro = idxDiam >= 0 ? String(row[idxDiam] || '').trim() : '';
              const conexion = idxConn >= 0 ? String(row[idxConn] || '').trim() : '';

              // Requisito: solo equipos con serial y descripción
              if (estado === 'ON' && equipo && descripcion && serial) {
                equiposValidos.push({ equipo, descripcion, diametro, conexion, serial });
              }
            }
            resolve();
          } catch (e) {
            reject(e);
          }
        },
        error: (e) => reject(e),
      });
    });
    
    console.log(`✅ Encontrados ${equiposValidos.length} equipos válidos`);
    
    if (equiposValidos.length < 30) {
      console.error(`❌ No hay suficientes equipos (mínimo 30, encontrados: ${equiposValidos.length})`);
      return;
    }
    
    // 3. Seleccionar 30 equipos aleatorios
    const equiposSeleccionados = [];
    const usados = new Set();
    while (equiposSeleccionados.length < 30 && equiposSeleccionados.length < equiposValidos.length) {
      const idx = Math.floor(Math.random() * equiposValidos.length);
      if (!usados.has(idx)) {
        equiposSeleccionados.push(equiposValidos[idx]);
        usados.add(idx);
      }
    }
    
    console.log(`📊 Seleccionados ${equiposSeleccionados.length} equipos para inspeccionar`);
    
    // 4. Generar inspecciones
    const hoy = new Date();
    const inspeccionesCreadas = [];
    
    // Asegurar al menos 8 no operativos de 30
    let restanteNoOp = 8;
    for (let i = 0; i < equiposSeleccionados.length; i++) {
      const eq = equiposSeleccionados[i];
      
      // Fecha aleatoria en los últimos 60 días
      const diasAtras = Math.floor(Math.random() * 60);
      const fechaInspeccion = new Date(hoy);
      fechaInspeccion.setDate(hoy.getDate() - diasAtras);
      
      // Tipo, cliente, lugar y usuario aleatorios
      const tipo = tipos[Math.floor(Math.random() * tipos.length)];
      const cliente = clientes[Math.floor(Math.random() * clientes.length)];
      const lugar = lugares[Math.floor(Math.random() * lugares.length)];
      const usuario = usuarios[Math.floor(Math.random() * usuarios.length)];
      
      // Determinar si será operativo (70%) o no operativo (30%) con mínimo garantizado
      let esOperativo = Math.random() < 0.7;
      const faltan = equiposSeleccionados.length - i;
      if (restanteNoOp > 0 && restanteNoOp >= faltan) {
        esOperativo = false; // forzar no operativo para cumplir mínimo
      }
      
      // Generar observaciones solo si no es operativo
      const observaciones = [];
      if (!esOperativo) {
        // Generar entre 2 y 4 observaciones para que se reflejen claramente
        const numObs = 2 + Math.floor(Math.random() * 3);
        const obsUsadas = new Set();

        const tiposObs = [
          { num: 5, label: 'Serial', opciones: observacionesTipicas.serial },
          { num: 6, label: 'Fleje #1', opciones: observacionesTipicas.fleje1 },
          { num: 7, label: 'Fleje #2', opciones: observacionesTipicas.fleje2 },
          { num: 8, label: 'Recubrimiento', opciones: observacionesTipicas.recubrimiento },
          { num: 9, label: 'Rosca / Hembra', opciones: observacionesTipicas.rosca },
          { num: 10, label: 'Área de Sellado', opciones: observacionesTipicas.area_sellado },
          { num: 11, label: 'Elastómero', opciones: observacionesTipicas.elastomero },
        ];

        while (observaciones.length < numObs && obsUsadas.size < tiposObs.length) {
          const tipoIdx = Math.floor(Math.random() * tiposObs.length);
          if (obsUsadas.has(tipoIdx)) continue;
          const obs = tiposObs[tipoIdx];
          const detalle = obs.opciones[Math.floor(Math.random() * obs.opciones.length)];
          observaciones.push(`${obs.num}. ${obs.label}: Malo — ${detalle}`);
          obsUsadas.add(tipoIdx);
        }
        restanteNoOp--;
      }
      
      // Extraer longitud de la descripción
      let longitud = '';
      let longitudUnidad = 'in';
      if (eq.descripcion) {
        const matchLong = eq.descripcion.match(/\b(?:LONG|L)[:\s]*([0-9.,]+)/i);
        if (matchLong) longitud = matchLong[1].replace(',', '.');
        // Determinar unidad por familia
        if (/\b(CODO|90|45)\b/i.test(eq.descripcion)) {
          longitudUnidad = 'N/A';
          longitud = '';
        } else if (/\b(XO|TUBO|PUP)\b/i.test(eq.descripcion)) {
          longitudUnidad = 'ft';
        } else {
          longitudUnidad = 'in';
        }
      }
      // Si no se pudo inferir longitud y no es N/A, poner por defecto según familia
      if (!longitud && longitudUnidad !== 'N/A') {
        if (/\b(XO|TUBO|PUP)\b/i.test(eq.descripcion||'')) {
          longitud = String(5 + Math.floor(Math.random() * 26)); // 5-30 ft
        } else {
          longitud = String(2 + Math.floor(Math.random() * 23)); // 2-24 in
        }
      }
      
      // Formato de fecha
      const pad = n => String(n).padStart(2, '0');
      const formatFecha = (d) => {
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
      };
      
      // Crear payload de inspección
      const payload = {
        equipoActivo: eq.equipo,
        tipo: tipo,
        cliente: cliente,
        lugar: lugar,
        fecha: formatFecha(fechaInspeccion),
        fechaTs: fechaInspeccion.getTime(),
        created_at: fechaInspeccion.getTime(),
        created_at_text: `${fechaInspeccion.getFullYear()}-${pad(fechaInspeccion.getMonth()+1)}-${pad(fechaInspeccion.getDate())} ${pad(fechaInspeccion.getHours())}:${pad(fechaInspeccion.getMinutes())}:${pad(fechaInspeccion.getSeconds())}`,
        usuario: usuario,
        meta: {
          location: null
        },
        parametros: {
          diametro: eq.diametro || '',
          conexion: eq.conexion || '',
          longitud: longitud,
          longitudUnidad: longitudUnidad,
          serialVisible: !!eq.serial,
          serial: eq.serial || ''
        },
        observaciones: observaciones,
        evaluacion: esOperativo ? 'Operativo' : 'No operativo',
        source: 'populate-script'
      };
      
      // Guardar en Firestore
      try {
        const docRef = await window.db.collection(COLLECTION_NAME).add(payload);
        
        const estado = esOperativo ? '✅ Operativo' : '❌ No operativo';
        inspeccionesCreadas.push({
          id: docRef.id,
          equipo: eq.equipo,
          evaluacion: esOperativo ? 'Operativo' : 'No operativo',
          observaciones: observaciones.length
        });
        
        console.log(`✅ [${i + 1}/${equiposSeleccionados.length}] ${estado} ${eq.equipo} - ${tipo} (${observaciones.length} obs)`);
        
      } catch (e) {
        console.error(`❌ Error creando inspección ${i + 1}:`, e);
      }
    }
    
    // Calcular estadísticas
    const operativos = inspeccionesCreadas.filter(r => r.evaluacion === 'Operativo').length;
    const noOperativos = inspeccionesCreadas.filter(r => r.evaluacion === 'No operativo').length;
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Población completada!`);
    console.log(`   📊 Total de inspecciones: ${inspeccionesCreadas.length}`);
    console.log(`   ✅ Operativos: ${operativos}`);
    console.log(`   ❌ No operativos: ${noOperativos}`);
    console.log(`   🔄 Recarga la página para ver las inspecciones`);
    console.log('='.repeat(60));
    
    // Mostrar resumen
    console.log('\n📋 Inspecciones creadas:');
    inspeccionesCreadas.forEach((r, i) => {
      const emoji = r.evaluacion === 'Operativo' ? '✅' : '❌';
      const obs = r.observaciones > 0 ? ` (${r.observaciones} observaciones)` : '';
      console.log(`   ${i + 1}. ${emoji} ${r.equipo}${obs}`);
    });
    
    const recargar = confirm(
      `✅ Se crearon ${inspeccionesCreadas.length} inspecciones exitosamente.\n\n` +
      `Operativos: ${operativos}\nNo operativos: ${noOperativos}\n\n` +
      `¿Deseas recargar la página para verlas?`
    );
    
    if (recargar) {
      location.reload();
    }
    
  } catch (e) {
    console.error('❌ Error durante la población:', e);
  }
})();
