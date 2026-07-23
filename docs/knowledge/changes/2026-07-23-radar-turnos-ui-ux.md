# 2026-07-23 Radar de turnos y reserva guiada

- **Rol/agente:** Frontend, Backend de datos, BFF, QA y Documentación.
- **Estado:** implementado y validado localmente; pendiente de staging para la migración de slots.
- **Objetivo:** convertir el catálogo en una búsqueda orientada a deporte, zona y momento, y reemplazar la reserva visualmente engañosa por un flujo guiado que consume disponibilidad calculada en servidor.
- **Nodos de conocimiento:** frontend, reservations-and-payments, backend-for-frontend, backend-data, integrations y quality.
- **Archivos modificados:** `src/pages/Index.tsx`, `src/components/{Header,MapSection,SportComplexCard,BookingModal}.tsx`, `src/components/discovery/*`, `src/hooks/{useComplexes,useReservations}.tsx`, `src/pages/Dashboard.tsx`, `src/components/reservationsSection/ReservationsCalendar.tsx`, `src/components/admin/{AdminComplexApproval,AdminNotifications}.tsx`, `supabase/migrations/20260723160000_bookable_slots.sql`, `docs/knowledge-tree.html` y `docs/knowledge-graph.html`.

## Decisión y contrato

La portada concentra la intención de búsqueda en un único estado sincronizado con URL y sólo representa campos públicos reales. Se eliminaron ratings, favoritos, precios fallback, estados de apertura y CTAs de mapa sin respaldo.

El buscador público expone etiquetas visibles y una secuencia explícita: deporte, zona, día y hora aproximada. Incluye accesos rápidos Hoy/Mañana/En 2 días y explica que el turno se selecciona y confirma dentro del complejo, para no confundir una preferencia de fecha con una reserva confirmada.

La portada incorpora el asset propio `public/hero-canchalibre-night.png`, un layout de lista + mapa adaptado a mobile y bloques públicos de explicación, captación y footer. Google Maps consume exclusivamente coordenadas públicas reales y se activa con `VITE_GOOGLE_MAPS_API_KEY`; sin clave, coordenadas o proveedor disponible muestra un fallback útil y no datos inventados.

`get_bookable_slots(p_court_id, p_reservation_date)` devuelve exclusivamente bloques de una hora reservables dentro de `court_availability`; no expone reservas ni PII. Requiere sesión, valida el rango de 90 días y filtra canchas/complejos activos y aprobados. `create_reservation` sigue siendo la autoridad transaccional para confirmar, recalcular precio/seña y rechazar solapes. La función de WhatsApp recibe sólo `reservationId`.

El panel owner se reorganizó en Hoy, Agenda y Complejos; la agenda quedó de sólo lectura para no mutar fechas u horarios desde el navegador. Administración exige motivo de rechazo y no simula envíos que no cuenten con contrato server-side.

## Riesgos y rollback

La migración debe aplicarse y probarse en staging antes de habilitar slots visibles en producción. Rollback: revocar `EXECUTE` y eliminar `get_bookable_slots`; el flujo de creación queda protegido por `create_reservation`. El cliente nunca debe tratar la lista de slots como reserva confirmada.

## Validación

- `npm run typecheck`: exitoso.
- `npm run lint`: exitoso con 16 advertencias heredadas, sin errores.
- `npm run build`: exitoso.
- Limitación: no se ejecutaron pruebas de RLS, concurrencia o migración contra Supabase staging; son obligatorias antes de desplegar la migración.

## Actualización del grafo

- Nodo cambiado: `frontend` y `reservations-and-payments`.
- Enlaces: discovery UI -> `get_bookable_slots` -> `create_reservation` -> notificación/agenda owner.
- Sección HTML actualizada: Radar de turnos y contrato de slots.
