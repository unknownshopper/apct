/**
 * Script para popular el historial de actividad con 30 registros ficticios
 * usando equipos reales del inventario que tengan serial y descripción
 * 
 * Ejecutar desde la consola en regactividad.html o actividad.html
 */

(async function populateActivityRecords() {
  console.log('🚀 Iniciando población de registros de actividad...');
  
  // Verificar Firebase
  if (!window.db || !window.firebase) {
    console.error('❌ Firebase no disponible');
    return;
  }
  
  const COLLECTION_NAME = 'activityRecords';
  const INVENTORY_URL = 'docs/INVENTARIO GENERAL PCT 2025 UNIFICADO.csv';
  
  // Clientes ficticios
  const clientes = [
    'PEMEX', 'CFE', 'GRUPO CARSO', 'CEMEX', 'BIMBO',
    'GRUPO MODELO', 'FEMSA', 'GRUPO ALFA', 'MEXICHEM', 'GMEXICO',
    'GRUMA', 'GRUPO BAL', 'ARCA CONTINENTAL', 'ELEKTRA', 'CHEDRAUI',
    'GRUPO BAFAR', 'SIGMA ALIMENTOS', 'ALPEK', 'NEMAK', 'VITRO'
  ];
  
  const areas = [
    'Producción', 'Mantenimiento', 'Operaciones', 'Calidad', 'Seguridad',
    'Planta Norte', 'Planta Sur', 'Refinería', 'Almacén', 'Distribución'
  ];
  
  const ubicaciones = [
    'Monterrey, NL', 'Ciudad de México', 'Guadalajara, JAL', 'Puebla, PUE',
    'Veracruz, VER', 'Tampico, TAMPS', 'Reynosa, TAMPS', 'Torreón, COAH',
    'Querétaro, QRO', 'San Luis Potosí, SLP', 'Saltillo, COAH', 'Chihuahua, CHIH'
  ];
  
  try {
    // 1. Cargar inventario
    console.log('📥 Cargando inventario...');
    const response = await fetch(INVENTORY_URL);
    const csvText = await response.text();
    const lines = csvText.split('\n');
    
    // 2. Parsear y filtrar equipos con serial y descripción
    const equiposValidos = [];
    for (let i = 1; i < lines.length; i++) { // Saltar header
      const line = lines[i].trim();
      if (!line) continue;
      
      const cells = line.split(',');
      const serial = (cells[2] || '').trim();
      const equipo = (cells[3] || '').trim();
      const descripcion = (cells[5] || '').trim();
      const propiedad = (cells[7] || '').trim();
      
      // Solo equipos PCT con serial y descripción
      if (propiedad === 'PCT' && serial && serial !== '' && descripcion && equipo) {
        equiposValidos.push({
          serial,
          equipo,
          descripcion
        });
      }
    }
    
    console.log(`✅ Encontrados ${equiposValidos.length} equipos válidos con serial y descripción`);
    
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
    
    console.log(`📊 Seleccionados ${equiposSeleccionados.length} equipos para registros`);
    
    // 4. Generar registros
    const hoy = new Date();
    const registrosCreados = [];
    
    for (let i = 0; i < equiposSeleccionados.length; i++) {
      const equipo = equiposSeleccionados[i];
      
      // Determinar si será activo (70%) o finalizado (30%)
      const esActivo = Math.random() < 0.7;
      
      // Fechas aleatorias
      let fechaInicio, fechaTerminacion, fechaDevolucion, duracion;
      
      if (esActivo) {
        // ACTIVO: Inició en los últimos 2 meses, aún no termina
        const diasAtras = Math.floor(Math.random() * 60);
        fechaInicio = new Date(hoy);
        fechaInicio.setDate(hoy.getDate() - diasAtras);
        
        // Terminará en el futuro (entre 10 y 60 días)
        const diasFuturos = 10 + Math.floor(Math.random() * 50);
        fechaTerminacion = new Date(hoy);
        fechaTerminacion.setDate(hoy.getDate() + diasFuturos);
        
        // Duración total
        duracion = Math.ceil((fechaTerminacion - fechaInicio) / (1000 * 60 * 60 * 24)) + 1;
        
        fechaDevolucion = new Date(fechaTerminacion);
        fechaDevolucion.setDate(fechaTerminacion.getDate() + 1);
      } else {
        // FINALIZADO: En los últimos 6 meses
        const diasAtras = Math.floor(Math.random() * 180);
        fechaInicio = new Date(hoy);
        fechaInicio.setDate(hoy.getDate() - diasAtras);
        
        // Duración entre 15 y 90 días
        duracion = 15 + Math.floor(Math.random() * 75);
        fechaTerminacion = new Date(fechaInicio);
        fechaTerminacion.setDate(fechaInicio.getDate() + duracion);
        
        fechaDevolucion = new Date(fechaTerminacion);
        fechaDevolucion.setDate(fechaTerminacion.getDate() + 1);
      }
      
      const fechaEmbarque = new Date(fechaInicio);
      fechaEmbarque.setDate(fechaInicio.getDate() - 2);
      
      // Precio diario entre $500 y $5000
      const precioDiario = 500 + Math.floor(Math.random() * 4500);
      const ingreso = duracion * precioDiario;
      
      // Cliente y ubicación aleatorios
      const cliente = clientes[Math.floor(Math.random() * clientes.length)];
      const area = areas[Math.floor(Math.random() * areas.length)];
      const ubicacion = ubicaciones[Math.floor(Math.random() * ubicaciones.length)];
      
      // Factura aleatoria
      const factura = `F-2025-${String(1000 + i).padStart(4, '0')}`;
      
      // Formato de fechas dd/mm/aa
      const formatFecha = (d) => {
        const dia = String(d.getDate()).padStart(2, '0');
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const anio = String(d.getFullYear()).slice(-2);
        return `${dia}/${mes}/${anio}`;
      };
      
      // Calcular fines parciales y continuaciones
      const finesParciales = [];
      const continuaciones = [];
      let cursor = new Date(fechaInicio);
      cursor.setDate(cursor.getDate() + 25);
      
      while (cursor < fechaTerminacion) {
        finesParciales.push(formatFecha(cursor));
        const cont = new Date(cursor);
        cont.setDate(cont.getDate() + 1);
        continuaciones.push(formatFecha(cont));
        cursor.setDate(cursor.getDate() + 30);
      }
      
      // OC y OS aleatorios
      const ordenCompra = `OC-2025-${String(2000 + i).padStart(4, '0')}`;
      const ordenServicio = `OS-${String(5000 + i).padStart(4, '0')}`;
      const cotizacion = `COT-2025-${String(100 + i).padStart(3, '0')}`;
      const manifiesto = `MAN-${String(8000 + i).padStart(5, '0')}`;
      
      // Crear array de datos según estructura del CSV
      // #,EQUIPO/ACTIVO,PRODUCTO,DESCRIPCION,PROPIEDAD,CLIENTE,AREA,UBICACION,
      // COT/ESTIMACION,O.S.,FECHA EMBARQUE,NUM MANIFIESTO,PRECIO,
      // INICIO,CONTINUACION,FIN PARCIAL,TERMINACION,DEVOLUCION,
      // ORDEN COMPRA,FACTURA,DIAS,INGRESO,RENTA
      const registro = [
        String(i + 1),                  // # (numero consecutivo)
        equipo.equipo,                  // EQUIPO / ACTIVO
        equipo.equipo,                  // PRODUCTO (mismo que equipo)
        equipo.descripcion,             // DESCRIPCION
        'PCT',                          // PROPIEDAD
        cliente,                        // CLIENTE
        area,                           // AREA DEL CLIENTE
        ubicacion,                      // UBICACION
        cotizacion,                     // COT / ESTIMACION
        ordenServicio,                  // O. S.
        formatFecha(fechaEmbarque),     // FECHA EMBARQUE
        manifiesto,                     // NUMERO DE MANIFIESTO
        String(precioDiario),           // PRECIO
        formatFecha(fechaInicio),       // INICIO DEL SERVICIO
        continuaciones.join('\n'),      // CONTINUACION DEL SERVICIO
        finesParciales.join('\n'),      // FIN PARCIAL DEL SERVICIO
        formatFecha(fechaTerminacion),  // TERMINACION DEL SERVICIO
        formatFecha(fechaDevolucion),   // FECHA DE DEVOLUCION
        ordenCompra,                    // ORDEN DE COMPRA
        factura,                        // FACTURA
        String(duracion),               // DIAS EN SERVICIO
        String(ingreso),                // INGRESO ACUMULADO
        String(ingreso)                 // RENTA ACUMULADA
      ];
      
      // Guardar en Firestore
      try {
        const docRef = await window.db.collection(COLLECTION_NAME).add({
          row: registro,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          createdAt: new Date().toISOString(),
          createdBy: window.auth.currentUser ? window.auth.currentUser.email : 'populate-script',
          source: 'populate-script'
        });
        
        const estado = esActivo ? '🟢 ACTIVO' : '⚪ FINALIZADO';
        registrosCreados.push({
          id: docRef.id,
          equipo: equipo.equipo,
          cliente,
          estado: esActivo ? 'Activo' : 'Finalizado'
        });
        
        console.log(`✅ [${i + 1}/${equiposSeleccionados.length}] ${estado} ${equipo.equipo} → ${cliente}`);
        
      } catch (e) {
        console.error(`❌ Error creando registro ${i + 1}:`, e);
      }
    }
    
    // Calcular estadísticas
    const activos = registrosCreados.filter(r => r.estado === 'Activo').length;
    const finalizados = registrosCreados.filter(r => r.estado === 'Finalizado').length;
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Población completada!`);
    console.log(`   📊 Total de registros: ${registrosCreados.length}`);
    console.log(`   🟢 Activos: ${activos}`);
    console.log(`   ⚪ Finalizados: ${finalizados}`);
    console.log(`   🔄 Recarga la página para ver los registros`);
    console.log('='.repeat(60));
    
    // Mostrar resumen
    console.log('\n📋 Registros creados:');
    registrosCreados.forEach((r, i) => {
      const emoji = r.estado === 'Activo' ? '🟢' : '⚪';
      console.log(`   ${i + 1}. ${emoji} ${r.equipo} → ${r.cliente}`);
    });
    
    const recargar = confirm(
      `✅ Se crearon ${registrosCreados.length} registros exitosamente.\n\n` +
      `¿Deseas recargar la página para verlos?`
    );
    
    if (recargar) {
      location.reload();
    }
    
  } catch (e) {
    console.error('❌ Error durante la población:', e);
  }
})();
