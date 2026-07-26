# 2026-07-25 Publicación de catálogo importado sin propietario

- **Rol/agente:** Backend de datos.
- **Estado:** SQL preparado; pendiente de ejecución autorizada en Supabase.
- **Objetivo:** hacer visibles en el catálogo público los complejos importados de Google Maps antes de asociarlos a perfiles owner.
- **Nodos de conocimiento:** backend-data, public-catalog-contract y owner-application-approval.
- **Archivos modificados:** `supabase/imports/20260725_publish_unowned_google_complexes.sql` y este registro.

## Decisión y contrato

El SQL actualiza exclusivamente filas sin propietario cuya descripción identifica el importador de Google Maps. Las marca `is_active=true` e `is_approved=true`, que son las condiciones de la policy pública existente. Como el editor SQL no aporta un JWT, configura `request.jwt.claim.role=service_role` sólo dentro de su transacción para satisfacer el trigger de seguridad. No modifica RLS, dueño, canchas, precios ni datos comerciales.

## Riesgos y rollback

Los datos pasan a ser visibles públicamente aunque aún no cuenten con un owner asociado. El rollback es ejecutar el mismo filtro con ambos flags en `false`. La asociación futura conserva la autoridad de `assign_complex_owner`.

## Validación

- Revisión estática: transacción, filtro por `owner_id IS NULL`, origen explícito e idempotencia.
- Resultado: correcto; no se realizaron conexiones ni escrituras remotas.
- Limitación: falta comprobar el resultado con sesión anónima en staging.

## Actualización del grafo

- Nodo cambiado: `public-catalog-contract`.
- Enlaces entrantes/salientes: importador Google Maps -> complejos sin owner -> catálogo público.
- Sección HTML actualizada: no aplica; no cambia la policy ni el contrato.
