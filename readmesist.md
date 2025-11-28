# APCT – Flujo de trabajo (2025)

## Módulos y responsabilidades
- Actividad (creación)
  - Entrada: equipos (1..N), cliente, fechas, precio, OS/OC.
  - Dependencias: inventario.csv, unificado.csv.
  - Reglas: solo EDO=ON (EDO lo cambia un admin en inventario.html).
  - Salida: activityRecords + testOrders (1..N por equipo).
- Pruebas (PND)
  - Inbox: testOrders status=pending (filtros OS/OC/Cliente/Equipo).
  - Operación: iniciar orden -> prellenar -> guardar en `pruebas` -> cerrar orden.
- Inspección
  - Depende de estado de pruebas y EDO=ON. Registra en reginspecciones.
- Tareas
  - Derivadas de actividad/inspección (definir).
- Dashboard/Reportes
  - KPIs actividad, órdenes, pruebas, inspecciones.

## Datos / Colecciones
- activityRecords: registros de actividad (actual).
- testOrders: { os, oc, cliente, equipo, serial, pruebasRequeridas[], actividadRef, loteId, edo, status, createdAt, createdBy, updatedAt }
- pruebas: payload form PND.
- reginspecciones: resultados de inspección (pendiente).

## Reglas clave
- EDO=ON: se generan y consumen órdenes.
- OS/OC: ancla de agrupación para inbox y trazabilidad.
- Lote: `loteId` por creación múltiple para idempotencia.

## Pendientes próximos
- Control “solo admin” en inventario.html para EDO.
- Validaciones de precondición en Inspección.
- Consolidados en Dashboard.