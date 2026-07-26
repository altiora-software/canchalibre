# 2026-07-25 Filtros de descubrimiento para complejos importados

- **Rol/agente:** Backend de datos y Frontend.
- **Estado:** implementado localmente; pendiente de aplicar la migración/etiquetado y desplegar el cliente.
- **Objetivo:** permitir que los filtros de Fútbol y Básquet incluyan complejos importados sin inventar `sport_courts`.
- **Nodos de conocimiento:** backend-data, frontend y public-catalog-contract.
- **Archivos modificados:** migración `20260725120000_catalog_sports_for_imported_complexes.sql`, SQL de etiquetado e importación, tipos de Supabase, `useComplexes`, `Index` y este registro.

## Decisión y contrato

`catalog_sports sport_type[]` expresa el deporte con el que un complejo debe participar en descubrimiento. No es una cancha reservable ni autoriza inferir precio, capacidad, superficie, techo, iluminación u horarios. La portada combina este atributo con `sport_courts.sport`; los filtros de techo e iluminación conservan su dependencia de canchas verificadas.

El catálogo solicita lotes de 50 complejos, aplica el filtro de deporte en Supabase mediante `catalog_sports` y carga el lote siguiente desde un panel de lista con scroll propio. El mapa recibe sólo el lote visible, evitando renderizar cientos de miles de marcadores. El alias de interfaz `padel` se traduce al valor histórico `padle` del enum.

El SQL de etiquetado marca los imports existentes de fútbol y básquet por su descripción de procedencia. Los SQL de importación futuros ya escriben el valor correspondiente.

## Riesgos y rollback

Los listados publicados pueden mostrar una sede que todavía no tiene cancha reservable. El flujo de reserva sigue sin ofrecer opciones hasta contar con `sport_courts` y disponibilidad. El rollback es vaciar `catalog_sports` sólo para las filas importadas identificadas por descripción; la columna es aditiva.

## Validación

- `tsc -b --pretty false`: correcto.
- Lint focalizado: correcto, sin errores ni advertencias en los archivos modificados.
- `vite build`: bloqueado por el entorno de OneDrive/esbuild, que no puede leer el directorio padre y por ello no resuelve `vite.config.ts`.
- Pendiente: aplicar migración y etiquetado, desplegar frontend y comprobar como visitante los filtros `futbol`, `basquet`, todos, techo e iluminación.

## Actualización del grafo

- Nodo cambiado: `public-catalog-contract`.
- Enlaces entrantes/salientes: importador -> `catalog_sports` -> `useComplexes` -> filtros de portada.
- Sección HTML actualizada: sí.
