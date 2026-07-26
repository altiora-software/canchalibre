# 2026-07-25 Importación de complejos de básquet desde Google Maps

- **Rol/agente:** Backend de datos.
- **Estado:** SQL preparado; pendiente de ejecución en el editor SQL de Supabase.
- **Objetivo:** incorporar los complejos del export `basquet.xlsx` como borradores sin propietario.
- **Nodos de conocimiento:** backend-data, auth-and-roles y public-catalog-contract.
- **Archivos modificados:** `supabase/imports/20260725_google_basketball_complexes.sql` y este registro.

## Decisión y contrato

El SQL inserta 73 registros deduplicados por nombre y coordenadas, con `owner_id=null`, `is_active=false` e `is_approved=false`. Conserva nombre, dirección disponible o localizador por coordenadas, teléfono cuando existe y categoría de origen. No crea canchas ni publica registros.

## Riesgos y rollback

La ejecución se encapsula en transacción y no duplica coincidencias de nombre/coordenadas. Los registros quedan inaccesibles al catálogo público hasta su aprobación. El rollback consiste en eliminar únicamente los borradores identificados por nombre, coordenadas y la descripción de importación antes de agregar datos comerciales.

## Validación

- Comprobación estática: 73 filas fuente en el SQL, transacción completa e inserción idempotente.
- Resultado: correcto; no se realizaron conexiones ni escrituras remotas.
- Limitación: no se ejecutó el SQL contra staging ni producción.

## Actualización del grafo

- Nodo cambiado: `google-football-import` como patrón de importación de catálogos sin propietario.
- Enlaces entrantes/salientes: export Google Maps -> SQL de importación -> `sport_complexes` sin owner.
- Sección HTML actualizada: no aplica; no cambió el contrato estable.
