# 2026-08-06 Experiencia pública deportivo premium

- **Rol/agente:** Frontend, con revisión UX/UI y subflujo especializado de ficha/reserva.
- **Estado:** implementado y validado localmente.
- **Objetivo:** renovar inicio, descubrimiento, cards, ficha pública y reserva para que el mapa guíe la decisión y reservar sea la conversión principal.
- **Nodos de conocimiento:** frontend, public-catalog-contract, radar-turnos-contract, integrations y reservations-and-payments.
- **Archivos modificados:** `src/pages/Index.tsx`, `src/pages/ComplexDetails.tsx`, `src/components/MapSection.tsx`, `src/components/SportComplexCard.tsx`, `src/components/BookingModal.tsx`, componentes de discovery, `src/hooks/useComplexes.tsx`, `src/lib/complex-presentation.ts`, estilos y conocimiento asociado.

## Decisión y contrato

Las cards usan un adaptador de presentación para derivar deportes, precio inicial y tres atributos comprobables desde las canchas públicas; no inventan disponibilidad ni importe final. Una card abre el detalle, mientras la acción secundaria sólo centra su ubicación en el mapa.

`usePublicComplex(id)` consulta un complejo activo/aprobado por identificador, con una lista explícita de campos públicos y canchas. Esto hace que la ficha funcione fuera de la primera página del catálogo. No solicita teléfono, WhatsApp, email ni otros datos de contacto; la reserva continúa siendo la acción de conversión y usa los RPC/funciones existentes.

La ubicación del visitante sigue siendo local al navegador. La paginación de 10 resultados elimina la carga por scroll y expone cuando pueden existir más lotes.

## Riesgos y rollback

La cercanía continúa limitada a los complejos ya cargados; una búsqueda global requiere una consulta geoespacial server-side futura. El fallback sin fotos es una composición de marca declarada, no una fotografía engañosa. El rollback es revertir los componentes y hook; no hay migración, secretos ni cambios de RLS.

## Validación

- `npm run typecheck`: correcto.
- `npm run lint`: correcto con 13 advertencias preexistentes ajenas al flujo público.
- `npm run build`: correcto; persisten avisos preexistentes de bundle grande y base de browsers desactualizada.
- Limitación: falta verificación manual en dispositivos físicos, zoom 200%, lector de pantalla y simulaciones de daltonismo antes de un release de accesibilidad formal.

## Actualización del grafo

- Nodo cambiado: `frontend` y `public-catalog-contract`.
- Enlaces entrantes/salientes: catálogo público → adaptador de presentación → mapa/cards → detalle por ID → reserva guiada.
- Sección HTML actualizada: `radar-turnos-ui` y nodos de frontend/catálogo.
