# 2026-07-23 Solicitud y habilitación de propietarios

- **Roles:** Orquestación, Frontend, Backend de datos, Seguridad, Edge Functions y QA.
- **Estado:** implementado localmente; pendiente de aplicar y comprobar en staging.
- **Objetivo:** impedir que una persona se cree o se asigne una cuenta de propietario antes de que Cancha Libre verifique comercialmente la solicitud y habilite el acceso.

## Flujo y autoridad

1. El visitante completa `/owners/apply`; no inicia sesión ni crea un complejo.
2. `submit-owner-application` valida el payload y usa `service_role` para invocar `submit_owner_application`.
3. Un administrador ve la bandeja interna, revisa, pide correcciones, rechaza o usa `invite-approved-owner`.
4. Sólo esta función verifica el JWT administrativo, aprueba la solicitud, invita al email declarado y ejecuta la activación server-side.
5. `activate_owner_application` comprueba que el perfil creado corresponde al email aprobado y recién entonces otorga `profiles.role = owner`.
6. El owner puede cargar un complejo en borrador; catálogo, mapa, canchas y reservas sólo leen complejos con `is_approved=true` e `is_active=true`.

La aprobación del responsable y la aprobación de publicación del complejo son decisiones separadas. No existe CTA, preview ni inserción pública que vuelva visible un complejo no validado.

## Contratos

- Tabla privada: `owner_applications`; RLS permite lectura sólo a administradores.
- RPC de intake: `submit_owner_application(...)`, ejecutable exclusivamente por `service_role`.
- RPCs administrativas: `review_owner_application`, `request_owner_application_changes`, `reject_owner_application`, `approve_owner_application`.
- RPCs server-only: `mark_owner_application_invited`, `activate_owner_application`.
- Se revocó `promote_to_owner` a `authenticated`; el endpoint histórico `owner-onboarding` responde retirado (410).

## Operación y secretos

Configurar sólo en secretos de Edge Functions: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (o `SUPABASE_PUBLISHABLE_KEY`), `SITE_URL` y `ALLOWED_ORIGINS`. Nunca se exponen al navegador ni se incluyen en `VITE_*`.

`submit-owner-application` se despliega sin JWT porque es formulario público; el endpoint no concede permisos y el RPC no es invocable por clientes. Las políticas de CORS, tamaño, honeypot y validación reducen abuso, pero corresponde sumar rate limiting/WAF antes de una campaña pública.

## Validación y limitaciones

- `git diff --check`: correcto.
- Pendiente staging: migración, RLS como visitante/customer/admin, invitación a cuenta nueva y existente, denegación de auto-promoción, y comprobación de que un complejo borrador no aparece en catálogo/mapa ni admite reservas.
- No se desplegaron funciones ni se ejecutó una migración contra Supabase desde este entorno.
