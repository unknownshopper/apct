# Scripts de Población de Datos

Scripts para popular la base de datos con registros de prueba.

---

## 📋 Scripts Disponibles

### 1. `populate-actividad.js` - Registros de Actividad
Crea 30 registros de actividad con equipos reales del inventario.

### 2. `populate-inspecciones.js` - Inspecciones
Crea 30 inspecciones con equipos reales del inventario.

---

## 🚀 Cómo Usar

### Opción A: Desde la Consola del Navegador (Recomendado)

1. **Abre el sitio en producción:**
   - `https://unknownshopper.github.io/apct/`

2. **Inicia sesión** con tu cuenta admin

3. **Abre la consola** (F12)

4. **Ejecuta el script deseado:**

   ```javascript
   // Para registros de actividad:
   fetch('populate-actividad.js').then(r=>r.text()).then(eval);
   
   // Para inspecciones:
   fetch('populate-inspecciones.js').then(r=>r.text()).then(eval);
   ```

---

## 📊 populate-actividad.js

### Características:
- ✅ 30 registros con equipos reales (serial + descripción)
- ✅ 70% Activos / 30% Finalizados
- ✅ Fechas realistas (últimos 6 meses)
- ✅ Clientes ficticios (PEMEX, CFE, etc.)
- ✅ Precios: $500-$5,000 diarios
- ✅ Todos los campos completos

### Estructura de Datos:
```javascript
{
  row: [
    #, EQUIPO, PRODUCTO, DESCRIPCION, PROPIEDAD,
    CLIENTE, AREA, UBICACION, COT, O.S., 
    FECHA_EMBARQUE, MANIFIESTO, PRECIO, INICIO,
    CONTINUACION, FIN_PARCIAL, TERMINACION, DEVOLUCION,
    ORDEN_COMPRA, FACTURA, DIAS, INGRESO, RENTA
  ],
  timestamp: Timestamp,
  createdBy: "email",
  source: "populate-script"
}
```

### Ejemplo de Salida:
```
✅ [1/30] 🟢 ACTIVO PCT-BP-05 → PEMEX
✅ [2/30] ⚪ FINALIZADO PCT-CA-03 → CFE
...
📊 Total de registros: 30
🟢 Activos: 21
⚪ Finalizados: 9
```

---

## 🔍 populate-inspecciones.js

### Características:
- ✅ 30 inspecciones con equipos reales
- ✅ 80% Operativos / 20% No operativos
- ✅ Tipos: Primaria, Secundaria, Terciaria
- ✅ Fechas: Últimos 60 días
- ✅ Observaciones automáticas para equipos no operativos
- ✅ Lugares variados (Base PCT, en campo, cliente, etc.)

### Estructura de Datos:
```javascript
{
  equipoActivo: "PCT-BP-05",
  tipo: "Primaria",
  cliente: "",
  lugar: "Base de Operaciones PCT",
  fecha: "15/10/24",
  fechaTs: 1697328000000,
  created_at: 1697328000000,
  usuario: "Juan Pérez",
  parametros: {
    diametro: "18.75",
    conexion: "BX-164",
    longitud: "14.90",
    longitudUnidad: "ft",
    serialVisible: true,
    serial: "2020087"
  },
  observaciones: [
    "8. Recubrimiento: Malo — Desgastado",
    "11. Elastómero: Malo — Dañado"
  ],
  evaluacion: "No operativo",
  source: "populate-script"
}
```

### Tipos de Observaciones:
- **Serial:** No Visible, Ilegible, Parcialmente visible
- **Flejes:** Ilegible, Dañado, Faltante
- **Recubrimiento:** Desgastado, Oxidado, Corroído
- **Rosca:** Desgastada, Con golpes, Corroída
- **Área de Sellado:** Desgastada, Con ralladuras, Golpeada
- **Elastómero:** Dañado, Envejecido, Deformado, Roto

### Ejemplo de Salida:
```
✅ [1/30] ✅ Operativo PCT-BP-05 - Primaria (0 obs)
✅ [2/30] ❌ No operativo PCT-CA-03 - Secundaria (2 obs)
...
📊 Total de inspecciones: 30
✅ Operativos: 24
❌ No operativos: 6
```

---

## 🧹 Limpiar Datos de Prueba

### Limpiar Registros de Actividad:
```javascript
const snapshot = await db.collection('activityRecords')
  .where('source', '==', 'populate-script')
  .get();
const batch = db.batch();
snapshot.docs.forEach(doc => batch.delete(doc.ref));
await batch.commit();
console.log('✅ Registros de actividad eliminados');
location.reload();
```

### Limpiar Inspecciones:
```javascript
const snapshot = await db.collection('inspections')
  .where('source', '==', 'populate-script')
  .get();
const batch = db.batch();
snapshot.docs.forEach(doc => batch.delete(doc.ref));
await batch.commit();
console.log('✅ Inspecciones eliminadas');
location.reload();
```

### Limpiar Todo:
```javascript
// Actividad
let snapshot = await db.collection('activityRecords').where('source', '==', 'populate-script').get();
let batch = db.batch();
snapshot.docs.forEach(doc => batch.delete(doc.ref));
await batch.commit();

// Inspecciones
snapshot = await db.collection('inspections').where('source', '==', 'populate-script').get();
batch = db.batch();
snapshot.docs.forEach(doc => batch.delete(doc.ref));
await batch.commit();

console.log('✅ Todos los datos de prueba eliminados');
location.reload();
```

---

## ⚠️ Notas Importantes

1. **Autenticación requerida:** Debes estar logueado con Firebase
2. **No ejecutar múltiples veces:** Creará duplicados
3. **Datos realistas:** Usa equipos reales del inventario
4. **Identificable:** Todos tienen `source: "populate-script"`
5. **Fácil de limpiar:** Usa el campo `source` para eliminarlos

---

## 📚 Verificación

### Ver Registros de Actividad:
- Ir a: `regactividad.html`
- Buscar por fecha reciente
- Verificar campos completos

### Ver Inspecciones:
- Ir a: `reginspecciones.html`
- Verificar tarjetas de KPI
- Buscar equipos específicos
- Ver observaciones en no operativos

---

## 🎯 Casos de Uso

### Desarrollo:
- Probar funcionalidad de listados
- Verificar filtros y búsquedas
- Testear exportaciones

### Demos:
- Mostrar sistema con datos
- Ejemplificar reportes
- Capacitación de usuarios

### Testing:
- Probar rendimiento
- Verificar sincronización
- Validar permisos

---

**Fecha de creación:** 2025-11-21  
**Versión:** 1.0  
**Sistema:** PCT
