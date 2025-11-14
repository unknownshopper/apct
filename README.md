# PCT – Plataforma de Control e Inspección

## Descripción general
Sistema web estático (GitHub Pages) con backend serverless en Firebase para gestionar inventario, inspecciones, tareas y actividad operativa. Soporta autenticación, control de roles y registro de inspecciones con ubicación, cliente y trazabilidad.

## Arquitectura
- Front-end: HTML/CSS/JS vanilla, tipografía Inter, diseño responsivo.
- Datos locales: carga de CSV con PapaParse o parser propio (según página) + cache busting por timestamp.
- Backend: Firebase (Compat SDK).
  - Auth (Email/Password) + Custom Claims para roles.
  - Firestore (colección `inspections` y vistas en tiempo real).
- Hosting: GitHub Pages (dominio unknownshopper.github.io).

## Páginas y funcionalidades
- index.html: dashboard base.
- inspeccion.html: formulario principal de inspección.
  - Prefill desde CSV; campos clave: `Equipo/Activo`, `Diámetro`, `Conexión`, `Longitud` (unidad dinámica), `Serial`.
  - Cliente (Interno/Externo), Lugar editable (por defecto “Base de Operaciones PCT”), fecha del día visible.
  - Validaciones estrictas (core + “Malo” requiere especificación; “Otro” con texto).
  - Observaciones listadas antes de guardar; confirmación previa.
  - Geolocalización obligatoria; payload con `fecha`, `fechaTs`, `created_at`, `created_at_text`, `cliente`, `lugar`, `usuario`, `meta.location` y `parametros`.
  - Toast de éxito y reseteo del formulario.
- pruebas.html: inventario dinámico desde CSV + historial de inspecciones (onSnapshot) y fecha de última inspección por equipo.
- ingral.html: vista de inventario general desde `docs/INVENTARIO GENERAL PCT 2025 NOV.csv` con búsqueda/ordenamiento.
- actividad.html: registro de actividad desde `docs/REGISTRO DE ACTIVIDAD PCT 2025.csv` con búsqueda/ordenamiento.
  - Columna de selección “EQUIPOS INTERNOS/EXTERNOS”.
  - `EQUIPO / ACTIVO` con autocompletado:
    - Internos: catálogo desde inventario CSV.
    - Externos: claves por proveedor.
  - Botón “Nuevo registro”: inserta fila editable superior (toolbar “Guardar/Cancelar”).
  - Editor de fechas con 3 selects (día/mes/año) y diagonales fijas.
  - Regla administrativa mensual 25/27:
    - Fin Parcial: día 25.
    - Continuación: día 27 (2 días de gracia), visible en la siguiente fila.
    - Repite hasta “Terminación del servicio”.
    - “Fecha de devolución” = Terminación + 1 día.
  - “Días en servicio” dinámico:
    - Valor negativo en cuenta regresiva si hoy < inicio.
    - Desde el inicio: días transcurridos hasta hoy o terminación (inclusive).
  - Cabecera sticky sin solapamiento; estilos persistentes tras refresh.
  - Primera fila en blanco (espaciado visual) fija.
- tareas.html: resumen programable de inspecciones con daño; soporta refresco y agregación de fuentes.
- reportes.html: placeholder de reportes.
- login.html: autenticación con Firebase Auth.

Navbar unificado en todas las páginas: Dashboard, Pruebas, Tareas, Inspección, Inventario, Actividad, Reportes.

## Gestión de roles y navegación
- Roles por Custom Claims: `admin`, `director`, `inspector`.
- Visibilidad/Acceso:
  - Admin: CRUD total; navegación completa.
  - Director: solo lectura; navegación completa.
  - Inspector: crear inspecciones; redirección automática a `inspeccion.html` si intenta otras páginas; en `inspeccion.html` solo ve “Inspección” en el navbar (estilo preservado).

## Fuentes de datos
- CSV:
  - `docs/INVENTARIO GENERAL PCT 2025 NOV.csv`
  - `docs/INVENTARIO GENERAL PCT 2025 NOV2.csv` (campo `conexion1` para “Conexión”).
  - `docs/REGISTRO DE ACTIVIDAD PCT 2025.csv`
- Carga con cache-busting (`?t=TIMESTAMP`).
- Parsing robusto de encabezados (normalización de nombres y fallback).

## Seguridad
- Autenticación: Firebase Auth (dominios autorizados: unknownshopper.github.io, localhost, 127.0.0.1).
- Autorización: Custom Claims y reglas de Firestore (sugeridas):
  - Admin: read/write en todas las colecciones.
  - Director: read-only.
  - Inspector: create-only en `inspections` (y lectura mínima de soporte cuando aplique).
- Privacidad: evitar almacenar datos personales sensibles; usar mínimos metadatos de usuario (`usuario` texto) y geolocalización con consentimiento.

## Despliegue
- GitHub Pages: carpeta raíz del repo `apct/`.
- Requisitos de Auth:
  - Agregar dominio a Firebase Auth > Settings > Authorized domains.
  - Proveedores OAuth (opcional): validar URIs de redirección.
- Configuración Firebase:
  - Copiar `firebase-config.sample.js` a `firebase-config.js` y rellenar credenciales web.
  - No commitear llaves de servicio (Admin SDK) en el frontend.

## Guía de hosting en IONOS (Apache)

- Service Worker (PWA):
  - El SW (`/service-worker.js`) puede cachear CSS/JS; tras cambios, hacer hard refresh (Ctrl+F5) o subir con query params de versión (`styles.css?v=YYYYMMDDHH`).
  - En IONOS, asegurarse que el SW se sirva con `Service-Worker-Allowed: /` cuando aplique (opcional).
- Cache-Control y compresión:
  - Usar `.htaccess` incluido para:
    - `Cache-Control: no-cache` en CSV (`docs/*.csv`) para evitar stale data.
    - `Cache-Control: max-age=31536000, immutable` para assets versionados `*.css?v=...` y `*.js?v=...`.
    - Habilitar compresión `mod_deflate`/`mod_brotli` si está disponible.
- Tipo MIME correcto:
  - Asegurar `text/csv; charset=utf-8` para archivos CSV.
  - `text/javascript` para `.js` y `text/css` para `.css`.
- Rutas y base path:
  - El sitio asume raíz `/apct/`. En subcarpetas, verificar `<base href="/apct/">` si se usa.
  - Asegurar que rutas relativas a `docs/` sean accesibles públicamente.
- CORS (si el CSV está en otro dominio):
  - Habilitar `Access-Control-Allow-Origin: *` o el dominio específico.
- Firebase Auth en dominio personalizado:
  - Agregar el dominio de IONOS a `Authorized domains` en Firebase Auth.
  - Verificar que el `redirect_uri` sea HTTPS y coincida con el host de IONOS.
- Seguridad de contenido (CSP):
  - Si IONOS aplica CSP, incluir `connect-src` a `https://*.firebaseio.com https://*.googleapis.com` y `script-src` para Firebase CDN y GitHub Pages si aplica.

## Operación en IONOS

- Actualización de estilos/JS:
  - Incrementar el query param de versión al desplegar (`?v=act-YYYYMMDDHH`) para invalidar caché.
- CSV actualizados:
  - Subir los CSV a `docs/` y verificar que el navegador no los sirva desde caché (usar Ctrl+F5 o cambiar el timestamp en la URL).
- Problemas comunes:
  - Encabezado se superpone al contenido: revisar `styles.css` y confirmar que no haya otro CSS inyectado por IONOS.
  - “Guardar” no responde: revisar consola y limpiar SW/caché; confirmar que los campos obligatorios tengan `name/id`.

## Operación
- Asignación de roles (una vez por usuario) vía Admin SDK:
  - Script: `admin-roles/set-roles.js` (Node.js)
  - Requiere variable `GOOGLE_APPLICATION_CREDENTIALS` apuntando a la llave JSON del servicio.
  - Ejecutar: `node admin-roles/set-roles.js`.
- Verificación de rol en cliente:
  - `firebase.auth().currentUser.getIdTokenResult().then(r => r.claims.role)`.
  - Tras cambio de claims, pedir re-login o forzar refresh del token.

## Buenas prácticas de datos
- Normalizar encabezados y tipos numéricos (punto decimal vs coma).
- Longitud dinámica:
  - N/A: Codos/90/45.
  - ft: XO, tubos, PUP.
  - in: resto.
- Validaciones previas a persistir; resumen de observaciones obligatorio.

## Roadmap sugerido
- Integrar Firestore Rules definitivas con pruebas de seguridad automatizadas.
- Sustituir inline CSS específicos por un CSS modular común.
- Unificar parser CSV (mover a util compartido) y añadir tests.
- Exportación avanzada (CSV/Excel) con columnas seleccionables.
- Filtros y vistas guardadas por usuario en inventario/actividad.
- Cache e incremental loading para CSV grandes.
- Auditoría completa de accesos y acciones (log de eventos en Firestore).
- PWA básica (offline para lectura de inventario).
- Integración de mapas para visualizar ubicaciones de inspección.

## Propuestas detalladas (para siguiente iteración)

### Seguridad (incremental)
- Reforzar guardias en frontend: deshabilitar acciones no permitidas según rol y mostrar rol en el header para transparencia.
- Mantener claims como fuente de verdad (fallback local solo temporal hasta tener claims).
- Política de datos: minimizar PII, geolocalización con consentimiento y mensajes claros.
- Reglas Firestore (cuando se activen):
  - `inspections`: inspector => create; director => read; admin => read/write.
  - Validar estructura mínima y tipos (fechaTs/created_at numéricos, `parametros` objeto, `meta.location` opcional con lat/lon numéricos).

### Parsers CSV unificados
- Crear `csv-util.js` con:
  - `fetchCSV(url)` con cache-busting `?t=<Date.now()>`.
  - `parseCSV(text)` o PapaParse, retornando `{ headers, rows }`.
  - `normalizeHeaders(headers)` con minúsculas, trim, equivalencias (p. ej. conexion/conexión/conexion1).
  - `toNumber(v)` (coma o punto decimal) y `toDate(v)` para formatos comunes.
  - `pick(headers, aliases)` y `mapRows(headers, rows, schema)` para obtener columnas robustamente.
- Migrar `ingral.html` y `actividad.html` a este util para coherencia y menos bugs.

### Auditoría y Exportación
- Auditoría (a futuro): colección `events` con `type`, `actor`, `role`, `ts`, `meta` (equipoActivo, docId, cliente, lugar, etc.).
- Vista simple de auditoría con filtros por rango/actor/tipo (en `reportes.html`).
- Exportación:
  - Botón “Exportar CSV” para vista filtrada y selección de columnas en inventario y actividad.
  - Registrar un `event` al exportar (conteo y filtros) cuando exista `events`.
  - Evitar PII por defecto; toggle explícito si se requiere.

### Plan de implementación
- Fase 1: `csv-util.js` y migración de `ingral.html` y `actividad.html`.
- Fase 2: Exportación con selección de columnas en ambas vistas.
- Fase 3: Auditoría frontend y, luego, persistencia en Firestore.
- Fase 4: Reglas de Firestore definitivas y pruebas con cuentas por rol.

## Certificaciones/estándares objetivo
- ISO 9001 (gestión de calidad de procesos).
- ISO/IEC 27001 (gestión de seguridad de la información).
- SOC 2 Type II (seguridad/privacidad: controles y monitoreo continuo).
- IEC 62443 (seguridad en sistemas industriales, si aplica).
- Cumplimiento GDPR/LPDP (si se manejan datos personales en la UE/MX).

## Desarrollo local
- Servir el directorio `apct/` como raíz:
  - `python3 -m http.server 8080` y abrir `http://localhost:8080/`.
- Revisar consola: dominios autorizados y configuración Firebase.
- Hacer login y verificar que los roles controlen navegación y permisos.

## Licencia
Creado por: Unknown Shoppers para uso exclusivo de PCT | 2025. Todos los derechos reservados.
