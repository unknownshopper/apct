# APCT – Flujo de trabajo (2025)

## Módulos y responsabilidades
- Actividad (creación)
  - Entrada: cliente (primero), equipos (1..N), fechas, precio, OS/OC.
  - Dependencias: inventario.csv, INVENTARIO GENERAL PCT 2025 UNIFICADO.csv.
  - Reglas: solo EDO=ON (EDO lo cambia un admin en inventario.html).
  - Salida: activityRecords + testOrders (1..N por equipo con EDO=ON).
  - UI: agrupación por cliente con encabezados colapsables (colapsado por defecto). Filtro rápido por cliente y búsqueda.
- Pruebas (PND)
  - Inbox: consulta `testOrders` status=pending/in_progress/done.
  - Filtros: OS, OC, Cliente, Equipo, Estado.
  - Operación: Iniciar orden (prellenado equipo/serie) → Guardar en `pruebas` → Orden pasa a done.
- Inspección
  - Depende de estado de pruebas y EDO=ON. Registra en `reginspecciones` (pendiente de integrar completo).
- Tareas
  - Derivadas de actividad/inspección (definición posterior).
- Dashboard/Reportes
  - KPIs actividad, órdenes, pruebas, inspecciones.

## Datos / Colecciones
- activityRecords: registros de actividad.
- testOrders: { os, oc, cliente, equipo, serial, pruebasRequeridas[], actividadRef, loteId, edo, status, createdAt, createdBy, updatedAt }
- pruebas: formularios PND capturados desde inbox o manual.
- reginspecciones: resultados de inspección.

## Reglas clave
- EDO=ON: habilita generación y consumo de órdenes por equipo.
- OS/OC: requerido en Actividad, ancla para inbox y trazabilidad.
- Lote: `loteId` por creación múltiple.
- Inventario: mapeo de serie y pruebas por equipo desde CSVs (fallbacks robustos).

## Privacidad y roles
- Actividad: oculta campos sensibles (devolución, fin/continuación, ingreso/renta acumulados). Solo se muestra precio, est-cot, factura, OS, OC, acciones.
- regactividad: sin tarjetas ni columnas de ingresos/rentas.
- actividadmin: vista administrativa con KPIs de ingresos/rentas y tabla; requiere autenticación; se puede restringir a admin.

## UX recientes
- Agrupación/colapso de actividades por cliente (clic en encabezado ►/▼). Estado inicial colapsado.
- Dropdown “Todos los clientes” con conteo de equipos por cliente.
- Inbox de Pruebas con botones Iniciar/Guardar → actualiza estado de orden.

## Próximos pendientes
- Restringir EDO ON/OFF a admin en inventario.html.
- Validaciones de precondición en Inspección.
- Consolidar KPIs globales en Dashboard.