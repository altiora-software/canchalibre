# 2026-08-06 Descubrimiento mapa-primero y listado paginado

- **Rol/agente:** Frontend, con auditoría UX/UI independiente.
- **Estado:** implementado y validado localmente.
- **Objetivo:** corregir el solapamiento del formulario de búsqueda, priorizar el mapa, reemplazar la carga por scroll por paginación explícita y mejorar la accesibilidad del descubrimiento.
- **Nodos de conocimiento:** frontend, integrations, public-catalog-contract y radar-turnos-ui.
- **Archivos modificados:** `src/pages/Index.tsx`, `src/components/MapSection.tsx`, `src/components/SportComplexCard.tsx`, `src/components/discovery/ResultsToolbar.tsx`, `src/index.css`, este registro y `docs/knowledge-tree.html`.

## Decisión y contrato

El formulario dejó de usar posicionamiento absoluto y ahora participa del flujo normal de la hero, por lo que no puede cubrir el carril de deportes ni los filtros en pantallas pequeñas. La sección de resultados presenta primero un mapa dominante y luego un panel paginado de 10 tarjetas; se eliminó la carga automática al llegar al final del scroll.

Las selecciones de tarjeta y marcador siguen usando únicamente coordenadas públicas ya cargadas. La ubicación del usuario permanece en memoria del navegador y ahora el estado de orden por cercanía se muestra explícitamente, sin competir con otros selectores de orden. No se modificaron RPC, RLS ni datos persistidos.

## Riesgos y rollback

El total exacto sigue limitado a los lotes ya cargados por el catálogo, por lo que la paginación muestra `+` si puede traer otro lote. La cercanía se comunica como orden del lote cargado. El rollback es revertir estos componentes; no hay migraciones ni secretos.

## Validación

- `npm run typecheck`: correcto.
- `npm run lint`: correcto, con 13 advertencias preexistentes fuera de esta área.
- `npm run build`: correcto; persisten avisos preexistentes sobre tamaño de bundle y datos de navegadores.
- Auditoría UX/UI: realizada; se aplicaron jerarquía mapa-primero, foco visible, selección textual además del color, `aria-pressed`, mensajes en vivo y control de movimiento reducido. Limitación: la automatización visual del navegador local no estuvo disponible, por lo que falta revisión manual en móvil, zoom 200% y lector de pantalla.

## Actualización del grafo

- Nodo cambiado: `frontend`.
- Enlaces entrantes/salientes: criterios de descubrimiento → mapa → selección sincronizada → página de resultados.
- Sección HTML actualizada: `radar-turnos-ui` en el árbol.
