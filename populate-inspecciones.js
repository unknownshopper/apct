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
    const response = await fetch(INVENTORY_URL);
    const csvText = await response.text();
    const lines = csvText.split('\n');
    
    // 2. Parsear equipos
    const equiposValidos = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cells = line.split(',');
      const estado = (cells[1] || '').trim();
      const equipo = (cells[3] || '').trim();
      const descripcion = (cells[5] || '').trim();
      
      if (estado === 'ON' && equipo && descripcion) {
        const diametro = (cells[8] || '').trim();
        const conexion = (cells[10] || '').trim();
        const serial = (cells[2] || '').trim();
        
        equiposValidos.push({
          equipo,
          descripcion,
          diametro,
          conexion,
          serial
        });
      }
    }
    
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
    
    for (let i = 0; i < equiposSeleccionados.length; i++) {
      const eq = equiposSeleccionados[i];
      
      // Fecha aleatoria en los últimos 60 días
      const diasAtras = Math.floor(Math.random() * 60);
      const fechaInspeccion = new Date(hoy);
      fechaInspeccion.setDate(hoy.getDate() - diasAtras);
      
      // Tipo, lugar y usuario aleatorios
      const tipo = tipos[Math.floor(Math.random() * tipos.length)];
      const lugar = lugares[Math.floor(Math.random() * lugares.length)];
      const usuario = usuarios[Math.floor(Math.random() * usuarios.length)];
      
      // Determinar si será operativo (80%) o no operativo (20%)
      const esOperativo = Math.random() < 0.8;
      
      // Generar observaciones solo si no es operativo
      const observaciones = [];
      if (!esOperativo) {
        // Generar entre 1 y 3 observaciones
        const numObs = 1 + Math.floor(Math.random() * 3);
        const obsUsadas = new Set();
        
        const tiposObs = [
          { num: 5, label: 'Serial', opciones: observacionesTipicas.serial },
          { num: 6, label: 'Fleje #1', opciones: observacionesTipicas.fleje1 },
          { num: 7, label: 'Fleje #2', opciones: observacionesTipicas.fleje2 },
          { num: 8, label: 'Recubrimiento', opciones: observacionesTipicas.recubrimiento },
          { num: 9, label: 'Rosca / Hembra', opciones: observacionesTipicas.rosca },
          { num: 10, label: 'Área de Sellado', opciones: observacionesTipicas.area_sellado },
          { num: 11, label: 'Elastómero', opciones: observacionesTipicas.elastomero }
        ];
        
        for (let j = 0; j < numObs; j++) {
          const tipoIdx = Math.floor(Math.random() * tiposObs.length);
          if (!obsUsadas.has(tipoIdx)) {
            const obs = tiposObs[tipoIdx];
            const detalle = obs.opciones[Math.floor(Math.random() * obs.opciones.length)];
            observaciones.push(`${obs.num}. ${obs.label}: Malo — ${detalle}`);
            obsUsadas.add(tipoIdx);
          }
        }
      }
      
      // Extraer longitud de la descripción
      let longitud = '';
      let longitudUnidad = 'in';
      if (eq.descripcion) {
        const matchLong = eq.descripcion.match(/\bLONG[:\s]*([0-9.]+)/i);
        if (matchLong) {
          longitud = matchLong[1];
        }
        // Determinar unidad
        if (/\b(CODO|90|45)\b/i.test(eq.descripcion)) {
          longitudUnidad = 'N/A';
          longitud = '';
        } else if (/\b(XO|TUBO|PUP)\b/i.test(eq.descripcion)) {
          longitudUnidad = 'ft';
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
        cliente: '',
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
