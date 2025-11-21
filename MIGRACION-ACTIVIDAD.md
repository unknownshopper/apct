# Migración de Registros de Actividad a Firebase Firestore

## ✅ Cambios Implementados

### Sistema Anterior (localStorage)
- ❌ Almacenamiento solo en el navegador local
- ❌ Sin sincronización entre computadoras
- ❌ Datos aislados por dispositivo

### Sistema Nuevo (Firestore)
- ✅ Almacenamiento en la nube
- ✅ Sincronización automática entre todas las computadoras
- ✅ Acceso desde cualquier dispositivo con la misma cuenta
- ✅ Respaldo automático en Firebase

## 📋 Archivos Modificados

1. **regactividad.html** - Agregado Firebase SDK
2. **regactividad.js** - Sistema completo de sincronización Firestore
3. **actividad.html** - Sincronización al crear/editar/eliminar registros
4. **migrate-actividad.js** - Script de migración de datos existentes

## 🔄 Proceso de Migración

### Opción 1: Migración Automática (Recomendada)

1. **Abrir la consola del navegador:**
   - Chrome/Edge: `F12` o `Ctrl+Shift+J`
   - Firefox: `F12` o `Ctrl+Shift+K`

2. **Cargar el script de migración:**
   ```javascript
   // Copiar y pegar en la consola:
   fetch('migrate-actividad.js').then(r=>r.text()).then(eval);
   ```

3. **Seguir las instrucciones en pantalla:**
   - El script detectará automáticamente los registros
   - Preguntará si deseas continuar
   - Ofrecerá hacer un backup antes de limpiar

### Opción 2: Migración Manual

Si ya tienes registros en localStorage y quieres migrarlos:

1. **Exportar desde regactividad.html:**
   - Ir a la página "Historial de Registros"
   - Clic en "📥 Exportar CSV"
   - Guardar el archivo como respaldo

2. **Los nuevos registros se guardarán automáticamente en Firestore**

## 🧪 Verificación

### Comprobar que funciona correctamente:

1. **Crear un registro en computadora A:**
   - Ir a `actividad.html`
   - Crear un nuevo registro
   - Verificar en consola: `[actividad] Registro guardado en Firestore: [ID]`

2. **Ver el registro en computadora B:**
   - Abrir `regactividad.html` en otra computadora
   - Iniciar sesión con la misma cuenta admin
   - Los registros deben aparecer automáticamente

3. **Verificar en Firebase Console:**
   - Ir a https://console.firebase.google.com
   - Seleccionar proyecto "apcttab"
   - Firestore Database → Colección `activityRecords`
   - Ver todos los registros sincronizados

## 🔍 Estructura de Datos en Firestore

Cada documento en la colección `activityRecords` contiene:

```javascript
{
  row: [...],              // Array con los datos del registro
  timestamp: Timestamp,     // Fecha de creación/actualización
  createdAt: "ISO Date",   // Fecha en formato ISO
  createdBy: "email",      // Usuario que creó el registro
  updatedAt: "ISO Date"    // Fecha de última modificación (si aplica)
}
```

## 📊 Funcionalidades Sincronizadas

### ✅ Operaciones que se guardan en Firestore:

- **Crear** nuevo registro (actividad.html)
- **Editar** registro existente (actividad.html, regactividad.html)
- **Eliminar** registro (actividad.html, regactividad.html)
- **Visualizar** registros (regactividad.html)

### 🔄 Sincronización Automática:

- Al cargar `regactividad.html` → Lee desde Firestore
- Al crear registro → Guarda en Firestore + localStorage (caché)
- Al editar → Actualiza Firestore + localStorage
- Al eliminar → Elimina de Firestore + localStorage

## 🛡️ Fallback a localStorage

El sistema mantiene compatibilidad con localStorage:

- Si Firebase no está disponible → Usa localStorage
- Si hay error de red → Usa datos en caché de localStorage
- Sincronización automática cuando Firebase vuelve a estar disponible

## 🚨 Notas Importantes

1. **Importante:** La sincronización requiere que estés autenticado con Firebase
2. **Permisos:** Solo usuarios con acceso a Firebase pueden ver/modificar registros
3. **Backup:** El localStorage se mantiene como caché local
4. **Primera carga:** Puede tardar unos segundos si hay muchos registros

## 💡 Solución de Problemas

### No veo los registros en otra computadora

1. Verificar que estás usando la **misma cuenta** de admin
2. Refrescar la página (`Ctrl+F5` o `Cmd+Shift+R`)
3. Revisar consola del navegador para errores
4. Verificar conexión a Internet

### Mensajes en consola

- ✅ `[regactividad] Firebase inicializado correctamente` → Todo bien
- ✅ `[regactividad] Cargados X registros desde Firestore` → Sincronización OK
- ⚠️ `Firebase no disponible` → Verifica conexión y configuración
- ❌ Errores de permisos → Verifica reglas de Firestore

### Limpiar localStorage manualmente

Si necesitas limpiar los datos locales:

```javascript
localStorage.removeItem('actividad:newRows');
localStorage.removeItem('actividad:firestoreIds');
location.reload();
```

## ✅ Checklist Post-Migración

- [ ] Migrar datos existentes con `migrate-actividad.js`
- [ ] Crear un registro de prueba en computadora A
- [ ] Verificar que aparece en computadora B
- [ ] Editar un registro y verificar sincronización
- [ ] Eliminar un registro de prueba
- [ ] Exportar CSV como respaldo final
- [ ] Limpiar localStorage si todo funciona correctamente

---

**Fecha de migración:** 2025-11-21  
**Versión:** 1.0  
**Responsable:** Sistema PCT
