# 2026-07-23 Alineación del contrato de catálogo público

- **Roles:** Frontend, Backend de datos y Seguridad.
- **Estado:** implementado localmente; pendiente de despliegue Vercel.
- **Nodos:** frontend, backend-data, auth-and-roles y radar-turnos-contract.

## Cambio

El cliente dejó de depender de la vista inexistente `sport_complexes_public`. Ahora consulta `sport_complexes` con una lista explícita de columnas públicas y la relación de canchas. RLS continúa siendo la autoridad para devolver solamente complejos activos y aprobados.

No se solicitan teléfono, WhatsApp ni email en el catálogo; por ello no se exponen al navegador aunque existan en la tabla base.

## Validación

- Pendiente: typecheck/build y despliegue de Vercel.
- El error `PGRST205` desaparece al consumir la tabla existente después del despliegue.
