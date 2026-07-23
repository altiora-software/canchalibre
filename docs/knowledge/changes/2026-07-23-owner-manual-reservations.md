# 2026-07-23 Reservas manuales y notificaciones de propietario

- **Rol/agente:** Backend de datos, BFF, Frontend, Seguridad y QA.
- **Estado:** implementado y validado localmente; pendiente de staging.
- **Objetivo:** permitir al propietario registrar reservas presenciales/telefonicas y recibir notificaciones internas de reservas web y manuales, sin mezclar su identidad con la del cliente.
- **Nodos de conocimiento:** reservations-and-payments, auth-and-roles, frontend, backend-data e integrations.
- **Archivos modificados:** `supabase/migrations/20260723123000_owner_manual_reservations_and_notifications.sql`, `src/components/reservationsSection/CreateReservation.tsx`, `src/components/reservationsSection/OwnerNotifications.tsx`, `src/pages/OwnerComplexDetails.tsx`, `src/pages/Dashboard.tsx`, `docs/knowledge-tree.html`, `docs/knowledge-graph.html`.

## Decision y contrato

`create_owner_reservation` solo permite al propietario de la cancha registrar una reserva `owner_manual`. Recibe datos de invitado limitados, calcula precio y seña en servidor, serializa por cancha/fecha y rechaza solapes. Las reservas web se mantienen como `web`, creadas solo por `create_reservation` con el cliente autenticado.

El trigger de reservas crea una notificacion interna para el perfil propietario. `get_owner_notifications` y `mark_owner_notification_read` restringen lectura y marcado al propietario destinatario.

## Riesgos y rollback

Los datos de invitado son PII: se limitan a nombre, telefono y notas; no se registran en logs. Antes de produccion se debe validar RLS y RPC en staging con propietario propio, propietario ajeno y cliente. Rollback mediante migracion compensatoria que elimine trigger/RPC/policies antes de borrar columnas o tabla.

## Validacion

- `npm run typecheck`: exitoso.
- `npm run build`: exitoso.
- Limitacion: sin staging disponible no se ejecutaron pruebas de RPC/RLS ni concurrencia contra Postgres.

## Actualizacion del grafo

- Nodo cambiado: `reservations-and-payments`.
- Enlaces: owner -> create_owner_reservation -> reservations -> owner_notifications -> owner dashboard.
- Seccion HTML actualizada: nota de reservas de propietario.
