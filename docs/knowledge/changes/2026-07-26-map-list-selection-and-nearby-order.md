# 2026-07-26 Selección cruzada y cercanía en el mapa

- **Rol/agente:** Frontend.
- **Estado:** implementado y validado localmente.
- **Objetivo:** sincronizar la selección de mapa y listado, y ordenar los complejos por proximidad cuando la persona comparte su ubicación.
- **Nodos de conocimiento:** frontend, integrations y public-catalog-contract.
- **Archivos modificados:** `src/pages/Index.tsx`, `src/components/MapSection.tsx`, `src/components/SportComplexCard.tsx`, este registro y `docs/knowledge-tree.html`.

## Decisión y contrato

La ubicación se solicita mediante la API `navigator.geolocation` sólo después de una acción explícita. Permanece en memoria del navegador, no se incluye en la URL, no se persiste y no se transmite a Supabase u otro proveedor. La distancia se calcula localmente con la fórmula de Haversine usando las coordenadas públicas ya cargadas.

`MapSection` comunica el complejo seleccionado a `Index`; la tarjeta correspondiente recibe foco visual y se desplaza dentro del listado. La tarjeta mantiene la acción de selección separada de la navegación al detalle, que sigue disponible desde el panel del mapa.

## Riesgos y rollback

La cercanía abarca el lote público cargado en cliente, cuyo límite actual es 50 complejos; una clasificación global para catálogos muy grandes requerirá una consulta geoespacial server-side nueva. Si se deniega geolocalización, el catálogo conserva su orden y filtros actuales. El rollback es revertir los tres componentes; no hay migración, secreto ni dato persistido.

## Validación

- `npx tsc -b --pretty false`: correcto.
- Pendiente: lint, build y prueba manual con permiso de geolocalización en navegador.

## Actualización del grafo

- Nodo cambiado: `frontend`.
- Enlaces entrantes/salientes: coordenadas públicas → cálculo local de distancia → listado y mapa sincronizados.
- Sección HTML actualizada: `radar-turnos-ui` en el árbol.
