# 2026-07-23 Contrato de autorizacion administrativa

- **Rol/agente:** Orquestacion, Seguridad, Backend de datos, Frontend y QA.
- **Estado:** validado localmente; pendiente de staging para la migracion.
- **Objetivo:** alinear el acceso de superadmin y las acciones de aprobacion/rechazo con la unica fuente de autoridad: `profiles.role` validado por PostgreSQL.
- **Nodos de conocimiento:** frontend, auth-and-roles, backend-data, deployment y quality.
- **Archivos modificados:** `src/hooks/useSuperAdmin.tsx`, `src/pages/SuperAdminLogin.tsx`, `src/pages/OwnerComplexDetails.tsx`, `supabase/migrations/20260723110000_admin_operations.sql`, `docs/knowledge-tree.html`, `docs/knowledge-graph.html`.

## Decision y contrato

El login administrativo autentica primero y consulta `get_current_user_role()`. Solo el valor `admin` persistido para el usuario actual permite acceder al panel; el navegador no modifica roles ni confia en `app_metadata`.

Las RPC `approve_complex(p_complex_id, p_trial_days)` y `reject_complex(p_complex_id, p_reason)` exigen `is_current_user_admin()`, validan entradas y actualizan los campos administrativos del complejo. Los consumidores son los controles de aprobacion del panel. Un propietario o cliente recibe `42501` al invocarlas.

Se retiro del panel propietario la accion de reserva manual que intentaba insertar cliente, precio y estado desde el navegador. El propietario conserva la gestion de estado de reservas existentes; una reserva asistida requiere un RPC separado que autentique o identifique al cliente sin falsificar su identidad.

## Riesgos y rollback

La migracion amplia los estados validos de suscripcion a `trial`, `active`, `suspended` y `expired`, necesarios por la interfaz ya existente. Debe probarse en staging contra el esquema remoto antes de produccion. Rollback: revocar los grants de las RPC y aplicar una migracion compensatoria que restablezca los estados solo despues de normalizar los datos que usen los estados nuevos.

## Validacion

- `npm run typecheck`: exitoso.
- `npm run lint`: exitoso con 18 advertencias heredadas, sin errores.
- `npm run build`: exitoso.
- Limitacion: no hay credenciales ni entorno Supabase staging disponibles para ejecutar la matriz permitida/denegada de RLS/RPC. Es obligatoria antes de desplegar.

## Actualizacion del grafo

- Nodo cambiado: `auth-and-roles` y `backend-data`.
- Enlaces: admin -> profiles.role -> get_current_user_role/approve_complex/reject_complex -> sport_complexes.
- Seccion HTML actualizada: nota de autorizacion administrativa.
