# 2026-07-26 Mapa de catálogo con OpenStreetMap

- **Rol/agente:** Frontend e Integraciones.
- **Estado:** implementado y validado localmente.
- **Objetivo:** sustituir Google Maps por un mapa sin claves que ubique los complejos públicos mediante sus coordenadas almacenadas.
- **Nodos de conocimiento:** frontend, integrations y public-catalog-contract.
- **Archivos modificados:** `src/components/MapSection.tsx`, `src/pages/RegisterComplex.tsx`, `src/index.css`, `package.json`, `package-lock.json`, `.env.example`, `docs/knowledge-tree.html` y `docs/knowledge-graph.html`.

## Decisión y contrato

La portada usa React Leaflet sobre teselas de OpenStreetMap. Consume exclusivamente `id`, `name`, `address`, `neighborhood`, `latitude` y `longitude` que ya entrega el contrato público del catálogo; no añade RPC, Edge Function, secreto ni escritura remota. Sólo renderiza coordenadas finitas dentro de los rangos geográficos válidos y mantiene el límite de 50 marcadores del lote visible.

Se eliminan la clave `VITE_GOOGLE_MAPS_API_KEY`, los paquetes de Google Maps y el autocompletado de Google del alta. Para evitar un proveedor de geocodificación, el alta solicita dirección, latitud y longitud de forma explícita; el complejo aparece en el mapa cuando sea público y aprobado conforme a RLS.

## Riesgos y rollback

Las teselas públicas de OpenStreetMap dependen de disponibilidad de terceros y deben conservar la atribución mostrada. Si el tráfico crece, se debe contratar o autoalojar un proveedor de teselas compatible sin cambiar el contrato de coordenadas. El rollback es restaurar la implementación y dependencias de Google desde Git; no hay migración ni cambio de datos.

## Validación

- `npx tsc -b --pretty false`: correcto.
- `npm run lint`: correcto, con 13 advertencias preexistentes fuera de los archivos modificados.
- `npm run build`: correcto; persisten avisos preexistentes de tamaño de bundle y antigüedad de datos de navegadores.
- Cobertura o limitación: no se realizó prueba visual contra un proyecto Supabase desplegado; el build confirma la integración cliente y el mapa necesita complejos públicos con coordenadas válidas para comprobar marcadores reales.

## Actualización del grafo

- Nodo cambiado: `integrations` y `frontend`.
- Enlaces entrantes/salientes: `public-catalog-contract` → React Leaflet/OpenStreetMap → catálogo público.
- Sección HTML actualizada: nodos `integrations` y `frontend`; sección `radar-turnos-ui` del árbol.
