# 2026-07-23 Auditoria de migraciones para base vacia

- **Rol/agente:** Backend de datos, Seguridad y QA.
- **Estado:** corregido estaticamente; reset local bloqueado por Docker no disponible.
- **Objetivo:** garantizar que las migraciones versionadas puedan crear un esquema coherente desde cero.
- **Nodos de conocimiento:** backend-data, auth-and-roles, reservations-and-payments, quality y deployment.
- **Archivos modificados:** migraciones historicas `20250824223803`, `20250826134027`, `20250827120604`, `20250827121157`; reconciliacion `20260723150000_fresh_database_reconciliation.sql`; documentacion de conocimiento.

## Decision y contrato

Se corrigio la migracion que eliminaba `handle_new_user` mientras un trigger dependia de ella; ahora la reemplaza en sitio. Se agrego el punto y coma faltante en la funcion de roles. Las dos migraciones de fixtures se retiraron porque convertian un identificador no UUID y bloqueaban toda instalacion limpia.

La reconciliacion agrega los campos de perfil consumidos por la aplicacion, el valor `padle` del enum y el RPC `get_reservations_by_owner`, que la UI ya invocaba sin definicion versionada. Tambien actualiza el grant de campos editables de perfil.

## Riesgos y rollback

Editar migraciones historicas permite bootstrap reproducible, pero no altera instancias que ya las marcaron aplicadas. Antes de promover, crear una base staging vacia y ejecutar reset completo. La migracion de reconciliacion es aditiva salvo el grant de UPDATE, que se restringe a columnas de perfil permitidas.

## Validacion

- Revision estatica de dependencias, triggers, constraints, tablas, enum y RPCs: corregida.
- `supabase db reset --local`: no ejecutable; Docker Desktop no esta disponible (pipe `docker_engine` inexistente).
- Limitacion: falta evidencia de reset y matriz RLS en staging.

## Actualizacion del grafo

- Nodo cambiado: `backend-data`.
- Enlaces: baseline -> auth trigger -> profiles; frontend owner dashboard -> get_reservations_by_owner -> reservations.
- Seccion HTML actualizada: estado de bootstrap reproducible.
