# 2026-07-25 Importación verificada de complejos de fútbol desde Google Maps

- **Rol/agente:** Backend de datos y Documentación.
- **Estado:** implementado y validado en modo seco; pendiente de aplicar migración y ejecutar la carga contra Supabase.
- **Objetivo:** convertir el export `google.xlsx` en inserciones idempotentes de `sport_complexes` sin inventar atributos de negocio ni publicar complejos no verificados.
- **Nodos de conocimiento:** backend-data, auth-and-roles, owner-application-approval y public-catalog-contract.
- **Archivos modificados:** migración `20260725110000_unowned_complex_catalog.sql`, SQL autónomo `supabase/imports/20260725_google_football_complexes.sql`, `scripts/import_google_football_complexes.py`, tipos, árbol, grafo y este registro.

## Decisión y contrato

El script lee directamente el `.xlsx` sin dependencias externas, extrae nombre, categoría, teléfono cuando existe y coordenadas reales del enlace de Google Maps. Descarta únicamente categorías que son inequívocamente ajenas a un complejo y deduplica por nombre y coordenadas. Cuando falta una dirección, almacena un localizador que declara expresamente las coordenadas reales; no fabrica una calle.

La migración habilita `owner_id` nulo y cambia la FK a `ON DELETE SET NULL`. La carga exige URL de Supabase y service role exclusivamente en variables de entorno. Cada registro se inserta por `name + latitude + longitude` y no modifica coincidencias existentes; queda con `owner_id=null`, `is_active=false` e `is_approved=false`. `assign_complex_owner(p_complex_id, p_owner_profile_id)` permite que sólo un administrador lo asocie después con un perfil owner. No crea `sport_courts`: el origen no prueba capacidad, superficie, techo, iluminación, precio ni horarios.

El SQL autónomo está destinado al editor SQL web de Supabase. Ejecuta en una transacción el cambio mínimo de nulabilidad y el alta idempotente de los registros, sin RPCs, perfiles ni credenciales en el archivo.

## Riesgos y rollback

El service role puede evitar RLS, por eso la confirmación explícita es obligatoria. El rollback es eliminar los complejos borrador identificados por el reporte de resultados, después de comprobar que no tengan información comercial añadida. La migración revierte restaurando `ON DELETE CASCADE` y `NOT NULL` sólo después de asociar o eliminar los complejos sin owner. La RPC impide autoasignación: exige administrador y un perfil target con rol owner.

## Validación

- Comando: `python scripts/import_google_football_complexes.py C:/Users/cecil/Downloads/google.xlsx --dry-run`.
- Resultado: modo seco correcto: 120 registros fuente, 109 borradores elegibles y 11 descartados por categoría inequívocamente ajena o duplicado. El SQL autónomo contiene 109 fuentes de Google Maps. `tsc -b --pretty false` y `git diff --check` correctos; no hubo conexiones ni escrituras remotas.
- Cobertura o limitación: no se probaron la migración, credenciales, RPC, RLS ni una inserción contra staging; sigue pendiente la validación comercial antes de publicar o asociar propietarios.

## Actualización del grafo

- Nodo creado/cambiado: `google-football-import`.
- Enlaces entrantes/salientes: export Google Maps -> importador -> `sport_complexes` sin owner -> asignación administrativa -> aprobación de publicación.
- Sección HTML actualizada: sí.
