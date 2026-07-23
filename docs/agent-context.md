# Cancha Libre — Contexto de arranque para agentes

Fuente de verdad navegable: `knowledge-tree.html`. Mapa de dependencias: `knowledge-graph.html`. Este archivo es su resumen compacto para evitar recorrer el repositorio archivo por archivo.

## Arranque obligatorio

1. Leer el nodo aplicable de `knowledge-tree.html` y `knowledge-graph.html`.
2. Consultar `.agents/task-router.md`; cargar sólo los archivos y cambios enlazados para ese tipo de tarea.
3. Leer la skill/rol asignado y declarar alcance, contrato, riesgo y validación.
4. Al terminar, añadir un registro en `knowledge/changes/` y actualizar árbol/grafo si cambió conocimiento estable.

## Producto y capas

- Marketplace de complejos y canchas deportivas: visitante, cliente, propietario y administrador.
- SPA React/Vite/TypeScript bajo `src/`; rutas en `src/App.tsx`.
- Backend: Supabase Auth, Postgres, RLS, RPC, Storage y Edge Functions en `supabase/`.
- Entrega: Vercel; CI en `.github/workflows/quality.yml`.

## Nodos críticos

| Nodo | Autoridad | Contrato/regla |
| --- | --- | --- |
| auth-and-roles | Auth + `profiles` + RLS | El browser no modifica `role`; owner usa `promote_to_owner`. |
| reservations-and-payments | `create_reservation` RPC | Precio, seña, disponibilidad, relación cancha/complejo y solape se validan en servidor. |
| integrations | Edge Functions | JWT, origen permitido, payload limitado, secretos sólo server-side. |
| frontend | React/BFF | UI consume contratos; no impone permisos ni estados finales. |
| backend-data | Migraciones/RLS/RPC | Toda modificación de esquema es una migración nueva y se prueba en staging. |
| deployment | Vercel/CI/runbook | Staging, secretos, migración y smoke test antes de producción. |

## Contratos actuales importantes

- `create_reservation(p_court_id, p_reservation_date, p_start_time, p_end_time, p_payment_method, p_notes)` retorna una reserva y es la única creación permitida.
- `promote_to_owner(p_user, p_full_name, p_phone)` promueve un perfil sin permitir escalación a admin.
- `owner-onboarding` usa JWT y crea complejos con `profiles.id` como `owner_id`.
- `send-whatsapp-notification` recibe sólo `reservationId`; deriva datos y destinatario desde una reserva autorizada.

## No hacer

- No poner tokens/service-role en frontend, Git, documentación o logs.
- No deshabilitar RLS ni agregar policies amplias para resolver errores.
- No insertar reservas/pagos ni actualizar roles directamente desde cliente.
- No aplicar una migración nueva directamente en producción.

## Validación base

`npm ci` → `npm run typecheck` → `npm run lint` → `npm run build`.

Para release, seguir `production-runbook.html`, probar actor permitido/denegado y documentar resultados.
