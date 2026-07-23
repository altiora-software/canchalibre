# 2026-07-23 Seed de cuentas para pruebas de flujos

- **Roles:** Backend de datos, Seguridad y QA.
- **Estado:** implementado; no ejecutado contra ningún proyecto remoto.
- **Nodos:** auth-and-roles, backend-data, reservations-and-payments y quality.

## Propósito y contrato

`npm run seed:test-users` crea o actualiza tres cuentas confirmadas para pruebas: administrador, propietario y cliente. También garantiza un complejo aprobado/activo, una cancha activa y disponibilidad semanal para que el cliente pueda recorrer catálogo, slots y reserva, mientras el owner prueba su panel.

El script requiere `TEST_USER_SEED_CONFIRM=CREATE_TEST_USERS`, `TEST_USER_PASSWORD` de al menos 12 caracteres y `TEST_SUPABASE_SERVICE_ROLE_KEY` en el entorno local. No contiene claves, contraseñas ni se ejecuta desde Vercel/navegador. Es idempotente: reutiliza los emails de prueba y no crea reservas.

## Riesgos y uso

La clave service role puede escribir Auth y datos, por eso debe usarse únicamente en un entorno de pruebas controlado. En una base productiva crea cuentas demostrativas visibles sólo como los datos que el seed marca aprobados; no se debe ejecutar allí sin autorización explícita. El script no modifica cuentas cuyo email no coincida con los tres emails de prueba.

## Validación

- Validación estática pendiente con credenciales locales: la ejecución remota no se autorizó.
- Debe validarse luego con login admin/owner/customer, catálogo del complejo demo y una reserva dentro de disponibilidad.
