# PCT – Plataforma de Control e Inspección

## Objetivo actual (Diciembre 2025)

- **Módulo de Actividad**
  - `actividad.html` (operativa):
    - Alta de actividades con autocompletado de Equipo/Activo desde inventario.
    - Soporte a múltiples equipos por registro (lista de chips), con autofill de Serial / Estado / Propiedad / Descripción desde `invpnd.csv`.
    - Generación automática de **Orden de Servicio (OS)** y **Orden de Compra (OC)** cuando vienen vacías al guardar.
    - Tabla agrupada por cliente con dropdowns independientes (se pueden abrir muchos clientes a la vez).
    - **Precio** y **Factura** se mantienen en los datos, pero ya no se muestran en la vista operativa.
  - `regactividad.html` (historial):
    - Fuente de verdad principal en Firestore (`activityRecords`), con fallback a `localStorage`.
    - Vista de historial con KPIs (activos, vencidos, días promedio), PDF detallado y tabulador cronológico completo.
    - Modal de edición que recalcula días, fin parcial, continuaciones, ingresos/rentas y sincroniza con Firestore.
  - `actividadmin.html` (administración ingresos/rentas):
    - Vista admin sólo para roles autorizados, usada para fijar **Precio** y **Terminación del servicio**.
    - **PRECIO** y **TERMINACION DEL SERVICIO** editables por fila, con máscara `dd/mm/aa`, cálculo dinámico de días y montos.
    - Lógica financiera: si `PROPIEDAD = PCT` → usa `INGRESO ACUMULADO`; si no, usa `RENTA ACUMULADA`.
    - KPIs de ingresos, rentas y ticket promedio calculados sobre las filas visibles.
    - Formato de moneda consistente (`$` + separador de miles, alineado a la derecha) para precio, ingresos y rentas.
    - Estructura visual y toolbar alineadas al estilo general de `actividad.html`.

- **Persistencia y sincronización**
  - Uso de `localStorage('actividad:newRows')` como caché local de actividad, sincronizada desde `regactividad`.
  - Plan inmediato: mover la edición de **Precio** y **Terminación del servicio** en `actividadmin` a Firestore, de modo que:
    - Los cambios hechos por usuarios con permiso admin/director se guarden directamente en `activityRecords`.
    - `regactividad` y `actividad` lean siempre valores consistentes desde Firestore, sin sobrescribir ediciones locales.

- **Próximo paso (tabulador en actividadmin)**
  - Agregar un tabulador **visual** (dropdown por fila) en `actividadmin` que, usando Inicio, Terminación y Precio:
    - Muestre cortes de **Fin Parcial**, **Continuación del servicio** y **Terminación** por tramos.
    - Calcule días y monto por tramo, sólo para consulta (sin modificar todavía las columnas de CSV / Firestore).

> Nota: este bloque resume el estado actual del trabajo en el módulo de actividad para futuras sesiones de desarrollo. Cuando se retome el proyecto, revisar esta sección antes de continuar con cambios en `actividad.js`, `regactividad.js` y `actividadmin.js`.

## Descripción general
Sistema web para gestionar inventario, inspecciones y actividad operativa de equipos industriales. Soporta autenticación, control de roles, registro de inspecciones con geolocalización y gestión financiera de servicios.

## Arquitectura
- **Frontend**: HTML/CSS/JS vanilla, diseño responsivo
- **Datos**: CSV local + localStorage (fallback) + Firebase Firestore
- **Backend**: Firebase (Compat SDK)
  - Auth (Email/Password) + Custom Claims para roles
  - Firestore para inspecciones y documentos
- **Hosting**: GitHub Pages

## Páginas y funcionalidades
- **index.html**: Dashboard principal
- **inspeccion.html**: Formulario de inspección con validaciones, geolocalización y guardado en Firestore
- **pruebas.html**: Inventario dinámico + historial de inspecciones en tiempo real
- **ingral.html**: Vista de inventario general con búsqueda y ordenamiento
- **actividad.html**: Registro de actividad operativa
  - Nuevo registro con selector EQUIPOS INTERNOS/EXTERNOS
  - Autocompletado de equipos desde inventario CSV o catálogo por proveedor
  - **Cálculo automático de fechas**:
    - Fin Parcial: Inicio + 25 días, luego cada 30 días
    - Continuación: Día siguiente de cada fin parcial
    - Devolución: Terminación + 1 día
  - Días en servicio dinámico (cuenta regresiva si no ha iniciado)
  - Múltiples fechas visibles en celdas con `pre-wrap`
- regactividad.html: Historial de registros guardados
  - Vista detallada con botón "Ver" → PDF con logo
  - Tabulador de servicio (6 columnas): Embarque, Inicio, Continuación, Fin Parcial, Terminación, Entrega
  - **Resumen Financiero**:
    - Cobrado a la fecha (días transcurridos × precio)
    - Por cobrar (días restantes × precio)
    - Total acumulado destacado
  - Modal de edición con recálculo automático
  - Exportación CSV y PDF con estructura completa
- tareas.html: Resumen de inspecciones con daño
- **reportes.html**: Placeholder de reportes
- **login.html**: Autenticación Firebase

## Gestión de roles y navegación
- Roles por Custom Claims: `admin`, `director`, `inspector`.
- Visibilidad/Acceso:
  - Admin: CRUD total; navegación completa.
  - Director: solo lectura; navegación completa.
  - Inspector: crear inspecciones; redirección automática a `inspeccion.html` si intenta otras páginas; en `inspeccion.html` solo ve “Inspección” en el navbar (estilo preservado).

## Fuentes de datos
- **CSV**: `docs/INVENTARIO GENERAL PCT 2025 NOV.csv`, `docs/REGISTRO DE ACTIVIDAD PCT 2025.csv`
- **localStorage**: Fallback para registros nuevos (clave `actividad:newRows`)
- **Firestore**: Colección `inspections` para inspecciones
- Cache-busting automático con timestamp en URLs

## Seguridad
- Autenticación: Firebase Auth (dominios autorizados: unknownshopper.github.io, localhost, 127.0.0.1).
- Autorización: Custom Claims y reglas de Firestore (sugeridas):
  - Admin: read/write en todas las colecciones.
  - Director: read-only.
  - Inspector: create-only en `inspections` (y lectura mínima de soporte cuando aplique).
- Privacidad: evitar almacenar datos personales sensibles; usar mínimos metadatos de usuario (`usuario` texto) y geolocalización con consentimiento.

## Despliegue
- **GitHub Pages**: Carpeta raíz del repositorio
- **Configuración Firebase**:
  - Copiar `firebase-config.sample.js` a `firebase-config.js` con credenciales
  - Agregar dominios autorizados en Firebase Auth > Settings
  - No commitear llaves privadas en el frontend
- **Cache busting**: Versionar archivos CSS/JS con `?v=N` al actualizar

## Operación
- Asignación de roles (una vez por usuario) vía Admin SDK:
  - Script: `admin-roles/set-roles.js` (Node.js)
  - Requiere variable `GOOGLE_APPLICATION_CREDENTIALS` apuntando a la llave JSON del servicio.
  - Ejecutar: `node admin-roles/set-roles.js`.
- Verificación de rol en cliente:
  - `firebase.auth().currentUser.getIdTokenResult().then(r => r.claims.role)`.
  - Tras cambio de claims, pedir re-login o forzar refresh del token.

## Características destacadas

### Gestión de Actividad
- **Cálculo automático de fechas**: Fin Parcial (inicio + 25 días, luego cada 30), Continuación (día siguiente)
- **Recálculo financiero**: Al editar, actualiza automáticamente días, ingreso/renta acumulados
- **Tabulador cronológico**: 6 columnas (Embarque → Inicio → Continuación → Fin Parcial → Terminación → Entrega)
- **Vista detallada con PDF**: Logo corporativo, información completa, resumen financiero con cobrado/por cobrar

### Registro de Actividad (`actividad.html`)
- Carga desde CSV + nuevos registros en localStorage
- Múltiples fechas por celda visibles con saltos de línea
- Editor inline con autocompletado de equipos
- Validación y cálculo en tiempo real

### Historial (`regactividad.html`)
- Tabla con estadísticas (total, internos, externos, ingresos, rentas)
- Botones por registro: Ver, Editar, Eliminar, PDF
- Exportación CSV completa
- Modal de edición con recálculo opcional

## Cambios recientes (Diciembre 2025)

### Flujo Actividad → Pruebas PND
- Se documentó visualmente en `flujo2.html` el flujo completo:
  - `actividad.html` crea actividades (sin edición ni eliminación) y genera órdenes de prueba por equipo solo cuando `EDO = ON`.
  - Cada actividad se guarda en Firestore (`activityRecords`) con `_firestoreId` y copia en `localStorage` (`actividad:newRows`).
  - `regactividad.html` consume `activityRecords` y permite editar/eliminar usando `_firestoreId`.
  - Al eliminar una actividad en `regactividad`, las órdenes pendientes relacionadas en `testOrders` se marcan como `cancelled`.
  - `listapruebas.html` construye "Próximas pruebas" combinando historial (`pruebas`) y órdenes pendientes de `testOrders`.

### Módulo de Actividad (actividad / regactividad)
- `actividad.html`:
  - Se retiró la columna de acciones (editar/eliminar); esta vista queda solo para **alta y consulta rápida**.
  - Se reforzó el autocompletado del campo **Equipo/Activo** usando `inventoryOptions` y el `datalist` `dl-inventory-equipos`.
- `regactividad.html`:
  - Permanece como **fuente de verdad operativa**: solo aquí se pueden eliminar actividades (según rol).
  - Al eliminar un registro se invoca `cancelRelatedTestOrders`, que localiza en Firestore las órdenes en `testOrders` con `actividadRef` y `status = 'pending'` y las marca como `cancelled`.

### Próximas pruebas PND (`listapruebas.html`)
- Se consolidó la lógica de "Próximas pruebas":
  - Lee pruebas históricas desde la colección `pruebas` (usando fechas de próxima prueba).
  - Agrega también las órdenes generadas desde actividad en la colección `testOrders` con `status = 'pending'`.
- Se agregó un botón para **borrar todas las órdenes pendientes** en `testOrders` (limpia el backlog cuando se quiere reiniciar la agenda).
- El listado distingue entre:
  - Pruebas ya realizadas (tabla principal `pruebas-table`).
  - Próximas pruebas (tabla superior `upcoming-table`, alimentada desde historial + `testOrders`).

## Cambios recientes (Noviembre 2025)

### Módulo de Actividad - Mejoras financieras y PDF
- ✅ Cálculo automático de Fin Parcial: inicio + 25 días, luego cada 30 días
- ✅ Cálculo automático de Continuación: día siguiente de cada fin parcial
- ✅ Visualización de múltiples fechas en celdas (white-space: pre-wrap)
- ✅ Modal de edición con recálculo automático de campos financieros
- ✅ PDF con logo corporativo (`img/logopctch.png`)
- ✅ Tabulador de servicio en formato tabla de 6 columnas
- ✅ Resumen financiero con:
  - Cobrado a la fecha (días transcurridos × precio)
  - Por cobrar (días restantes × precio)
  - Total acumulado destacado
- ✅ Página 1: Información general + Resumen financiero
- ✅ Página 2: Tabulador completo de servicio
- ✅ Exportación CSV desde historial

### Módulo: Material Test Report (MTR)
- Nuevas páginas y scripts:
  - `matestrep.html`: UI para captura y visualización de reportes de material.
  - `matestrep.js`: construcción dinámica del formulario, cálculos de promedios (Charpy), guardado/carga, metadatos (usuario, fecha/hora, geolocalización), modo solo-lectura por `?id=` y autocompletado de Equipo/Activo desde inventario CSV.
  - `listmatestrep.html`: listado de reportes con botón Abrir.
  - `listmatestrep.js`: carga desde Firestore (colección `material_tests`) o semillas locales (demo); generación de 30 semillas con datos completos y asociación a claves reales `PCT-...` del inventario.
  - Recursos agregados: `docs/matestrep.jpeg`, `img/materialtestreport.jpeg`.

- Integraciones de datos:
  - Inventario: `docs/INVENTARIO GENERAL PCT 2025 UNIFICADO.csv` para poblar el selector de Equipo/Activo (solo claves `PCT-...`).
  - Semillas: caché local `mtr_seed_list` (versión 3) y `mtr_equip_keys` para lista de equipos.

- Permisos y seguridad:
  - Guardar MTR: restringido a roles `admin` y `supervisor` (bloqueo en cliente).
  - Modo lectura: al abrir con `?id=...` se deshabilitan inputs y solo se muestra como documento imprimible.

- Estilos y PDF:
  - `styles.css` (scoped `[data-page="matestrep"]`):
    - Layout centrado (960px), secciones tipo “card”, tablas con encabezado sticky en pantalla.
    - Modo impresión A4 con márgenes 12mm, tablas sin dividirse entre páginas (control de `page-break-inside`), evitar stickies al imprimir.
    - Logo controlado mediante `.page-logo` (12mm) solo en primera página de impresión.

- Navegación:
  - En `matestrep.html` se añadió dropdown “Reportes” con enlaces a MTR y listado MTR.

- Notas de uso:
  - Abrir `listmatestrep.html` para ver 30 reportes demo; botón Abrir pasa `?id=` a `matestrep.html`.
  - En `matestrep.html` sin `?id=`: formulario editable con autocompletado de Equipo/Activo desde CSV y captura de geolocalización.
  - Guardado: intenta Firestore (`material_tests`); si falla, guarda borrador en `localStorage` (`mtr_draft`).

### Módulos nuevos: UTT y EMI (Noviembre 2025)

- Archivos creados:
  - `utt.html` y `listutt.html`
  - `emi.html` y `listemi.html`
- UTT (Ultrasonic Thickness Test):
  - Meta: Equipo/Activo (datalist desde `docs/INVENTARIO GENERAL PCT 2025 UNIFICADO.csv`), Método/Norma, Usuario, Espesor nominal, Tolerancia mínima, Fecha.
  - Tabla de lecturas con cálculo de Mínimo/Promedio y badge de Conformidad global (OK si `min >= tolerancia`).
  - Acciones: Agregar/Limpiar filas, Imprimir/PDF, Guardar (placeholder) → colección Firestore `utt_tests`.
- EMI (Electro Magnetic Inspection):
  - Meta: Equipo/Activo (datalist desde CSV), Método/Norma, Usuario, Velocidad, Ganancia, Umbral/Alarma, Fecha.
  - Tabla de indicaciones con Posición, Longitud, Severidad (Baja/Media/Alta), Observaciones. Conformidad global “No conforme” si existe alguna severidad Alta.
  - Acciones: Agregar/Limpiar filas, Imprimir/PDF, Guardar (placeholder) → colección Firestore `emi_tests`.
- Listas (`listutt.html`, `listemi.html`):
  - Estructura base de tabla para futura lectura desde Firestore.

### Navegación unificada y UX (global)

- Dropdown “Pruebas” actualizado en todos los HTML con: MTR, Lista MTR, UTT, Lista UTT, EMI, Lista EMI, Pruebas, Stock, Lista general.
- UX del navbar mejorada:
  - Dropdowns colapsados por defecto en carga y apertura exclusiva (solo uno abierto).
  - Accesibilidad: `aria-expanded` sincronizado en `summary`, cierre por clic afuera y tecla Escape.
  - Móvil: menú tipo drawer con botón “☰”, cierre automático al seleccionar un enlace.
- Indicador de red:
  - Dot y etiqueta “Firebase online/offline” bajo el badge de login (no intrusivo, en tiempo real).
- Estilos y PDF:
  - UTT/EMI con estilos coherentes a MTR (cards, tablas, badges `.ok/.bad`, impresión A4 con logos controlados y tablas sin cortes).
  - Refinamiento del encabezado/print para MTR (logo tamaño consistente en la primera página).

## ¿Por qué este sistema es mejor que Excel?

- **Colaboración en tiempo real**: múltiples usuarios trabajando sin conflictos de versiones ni archivos duplicados.
- **Roles y permisos**: visibilidad y acciones controladas (admin/director/inspector); en Excel es difícil y frágil.
- **Trazabilidad y auditoría**: metadatos de usuario/fecha, posibles logs/auditoría; Excel carece de bitácora robusta.
- **Estandarización**: formularios con validaciones, listas controladas y reglas de conformidad; evita formulas rotas y formatos dispares.
- **Integración de datos**: vínculo directo con inventario CSV y (próximo) Firestore; en Excel hay copias pegadas propensas a error.
- **Impresión/PDF profesional**: reportes´ con encabezado, logo y tablas que no se cortan entre páginas; en Excel suele requerir ajustes manuales.
- **Búsqueda y performance**: tablas con ordenamiento/filtrado y, con Firestore, consultas eficientes; Excel ralentiza en volúmenes altos.
- **Seguridad y respaldo**: Auth de Firebase, reglas de acceso y respaldo gestionado; Excel depende de carpetas compartidas vulnerables.
- **Despliegue y versionado**: cambios versionados en Git y publicados; en Excel proliferan copias locales.
- **Escalabilidad y mantenibilidad**: modular (MTR/UTT/EMI), nuevas pruebas y listados se suman sin rearmar archivos.
- **Operación offline con reconexión**: la app sigue operando (lectura/interfaz) y reconecta; Excel no sincroniza automáticamente.
- **Experiencia de usuario**: navbar consistente, móvil primero, componentes reutilizables; Excel no es una UI pensada para campo.

> Resultado: menos errores, más control y trazabilidad, tiempos de entrega más rápidos, y una presentación profesional frente a cliente/auditor.

## Certificaciones y cumplimiento (objetivo)

- **ISO 9001:2015 (Sistema de Gestión de la Calidad)**
  - Alineación: control de documentos (PDF imprimible), trazabilidad por Equipo/Activo, metadatos de usuario/fecha, roles y permisos.
  - Próximos pasos: control de versiones formal, flujos de aprobación, registro de auditoría (quién cambió qué/cuándo).

- **ISO/IEC 17025:2017 / NMX-EC-17025-IMNC (Laboratorios de ensayo y calibración)**
  - Alineación: registro de métodos de ensayo (mecánicos, dureza, Charpy), resultados con límites y conformidad, vínculo a inventario y estado de calibración del equipo, metadatos y geolocalización.
  - Próximos pasos: gestión de incertidumbre de medición, evidencia de trazabilidad metrológica, firmas electrónicas del responsable/técnico, control de versiones de métodos y especificaciones.

- **ISO/IEC 27001 (Seguridad de la Información)**
  - Alineación: control de acceso por roles, autenticación Firebase, copia en Firestore (respaldo gestionado), separación de entornos.
  - Próximos pasos: política de retención y respaldo, cifrado de datos en tránsito/repouso (configuración), bitácora de accesos, hardening de hosting y secretos.

- **Estándares técnicos (alineación de métodos, no certificación del software)**
  - ASTM/ASME relevantes para MTR: ASTM E8/E8M (tensión), ASTM E23 (Charpy), ASTM E10/E18 (dureza), ASTM A370 / ASME SA‑370 (propiedades mecánicas).
  - Próximos pasos: parametrizar criterios por norma/material, reporte explícito del método/versionado y anexos de calculadora/curvas.

## Integración futura (opcional): Evidencias con Dropbox

- **Alcance**: almacenamiento de evidencias (fotos/PDF/testimonios) de pruebas, inspecciones y actividad, con trazabilidad y cadena de custodia.
- **Arquitectura recomendada**: Cliente → Cloud Function (Firebase) → Dropbox.
  - Evita exponer secretos en el cliente y centraliza permisos/rutas.
- **Estructura sugerida en Dropbox**: `/APPCT/{año}/{mes}/{tipo}/{id_registro}/evidencia_{n}.{ext}` y `metadata.json` (opcional).
- **Metadatos (Firestore)** por evidencia:
  - `registroId`, `tipo` (utt|emi|inspeccion|actividad), `dropbox_file_id`, `dropbox_path`, `dropbox_content_hash`
  - `sha256_cliente` (hash local previo al envío), `mime`, `size`, `user_uid`, `email`, `role`, `geo`, `serverTimestamp`
  - Opcional: `app_version`, `device_info`, `aprobaciones[]`, `firmas[]`.
- **Metadatos en Dropbox**: usar File Properties Templates (`registroId`, `tipo`, `uid`, `timestamp_iso`).
- **Flujo Cloud Function `uploadEvidence`** (Node.js):
  1. Valida sesión/claims (Auth).
  2. Calcula carpeta destino por `tipo`/`registroId` y sube (Upload Session si >150MB).
  3. Adjunta propiedades de plantilla y devuelve `{ file_id, path_display, content_hash, preview_link }`.
  4. Persiste documento de evidencia en Firestore con metadatos y `sha256_cliente`.
- **Seguridad**:
  - Scopes mínimos en Dropbox (App Folder o rutas acotadas); tokens/refresh sólo en backend.
  - No usar enlaces públicos; si se comparten, links con expiración.
- **Razones para Dropbox**: previsualización de imágenes/PDF, versiones, auditoría/retención empresarial.
- **Alternativa**: Google Cloud Storage con URLs firmadas (más nativo/óptimo en costos a gran escala).
- **Pasos siguientes**:
  - Crear app en Dropbox (OAuth2, PKCE si se usara cliente, pero recomendado backend), configurar plantilla de propiedades.
  - Implementar Cloud Function `uploadEvidence` y roles/claims necesarios.
  - Añadir botón "Adjuntar evidencia" en APPCT (UTT/EMI/Inspección/Actividad) y cola offline con reintentos.

## Desarrollo local
- Servir el directorio: `python3 -m http.server 8080`
- Abrir: `http://localhost:8080/`
- Verificar configuración Firebase y roles

## Licencia
Creado por The Unknown Shopper para uso exclusivo de PCT | 2025. Todos los derechos reservados.
