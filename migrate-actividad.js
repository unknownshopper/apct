/**
 * Script de migración única para mover registros de actividad 
 * de localStorage a Firebase Firestore
 * 
 * Ejecutar este script una sola vez desde la consola del navegador
 * en la página regactividad.html o actividad.html
 */

(async function migrateActivityRecords() {
  console.log('🚀 Iniciando migración de registros de actividad...');
  
  // Verificar que Firebase esté disponible
  if (!window.db || !window.firebase) {
    console.error('❌ Firebase no está disponible. Asegúrate de estar en una página con Firebase cargado.');
    return;
  }
  
  const COLLECTION_NAME = 'activityRecords';
  const LOCAL_KEY = 'actividad:newRows';
  
  try {
    // Obtener registros de localStorage
    const stored = localStorage.getItem(LOCAL_KEY);
    if (!stored) {
      console.log('ℹ️ No hay registros en localStorage para migrar.');
      return;
    }
    
    const rows = JSON.parse(stored);
    if (!Array.isArray(rows) || rows.length === 0) {
      console.log('ℹ️ No hay registros válidos para migrar.');
      return;
    }
    
    console.log(`📊 Encontrados ${rows.length} registros para migrar...`);
    
    // Verificar si ya existen registros en Firestore
    const snapshot = await window.db.collection(COLLECTION_NAME).get();
    if (!snapshot.empty) {
      const continuar = confirm(
        `Ya existen ${snapshot.size} registros en Firestore.\n\n` +
        `¿Deseas continuar y agregar ${rows.length} registros más?\n` +
        `(Los duplicados pueden ocurrir si ya migraste anteriormente)`
      );
      if (!continuar) {
        console.log('❌ Migración cancelada por el usuario.');
        return;
      }
    }
    
    // Migrar cada registro
    let migrated = 0;
    let errors = 0;
    
    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const rowData = Array.isArray(row) ? row : Object.values(row);
        
        await window.db.collection(COLLECTION_NAME).add({
          row: rowData,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          createdAt: new Date().toISOString(),
          createdBy: window.auth.currentUser ? window.auth.currentUser.email : 'migration',
          migratedFrom: 'localStorage'
        });
        
        migrated++;
        console.log(`✅ Migrado ${migrated}/${rows.length}...`);
      } catch (e) {
        errors++;
        console.error(`❌ Error al migrar registro ${i + 1}:`, e);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Migración completada!`);
    console.log(`   - Registros migrados: ${migrated}`);
    console.log(`   - Errores: ${errors}`);
    console.log('='.repeat(50));
    
    if (migrated > 0) {
      const backup = confirm(
        `✅ Se migraron ${migrated} registros exitosamente.\n\n` +
        `¿Deseas hacer un respaldo de localStorage antes de limpiarlo?\n` +
        `(Se descargará un archivo JSON con los datos)`
      );
      
      if (backup) {
        // Crear backup como archivo JSON
        const backupData = {
          timestamp: new Date().toISOString(),
          recordCount: rows.length,
          records: rows
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `actividad-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        console.log('💾 Backup descargado.');
      }
      
      const limpiar = confirm(
        `¿Deseas limpiar localStorage ahora?\n\n` +
        `Los datos ya están en Firestore y se sincronizarán automáticamente.`
      );
      
      if (limpiar) {
        localStorage.removeItem(LOCAL_KEY);
        localStorage.removeItem('actividad:firestoreIds');
        console.log('🧹 localStorage limpiado.');
        console.log('🔄 Recarga la página para ver los datos desde Firestore.');
      }
    }
    
  } catch (e) {
    console.error('❌ Error durante la migración:', e);
  }
})();
