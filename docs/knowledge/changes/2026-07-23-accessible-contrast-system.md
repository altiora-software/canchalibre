# 2026-07-23 Sistema de contraste accesible

- **Rol/agente:** Frontend y QA.
- **Estado:** implementado y validado localmente.
- **Objetivo:** garantizar legibilidad consistente entre fondos, texto, controles y estados semánticos en las rutas públicas, de cuenta, propietario y administración.
- **Nodos de conocimiento:** frontend y quality.
- **Archivos modificados:** `src/index.css`, `src/App.css`, páginas y componentes de descubrimiento, reserva, cuenta, propietario, reservas y administración.

## Decisión y contrato

Los tokens de superficie son opacos y los colores principales, secundarios, destructivos y muted usan pares de primer plano con contraste suficiente. Se eliminó el contenedor y espaciado global del template Vite. En modo oscuro, los estados semánticos fijos de Tailwind se convierten en superficies oscuras con texto claro para no dejar texto del sistema sobre fondos pastel.

## Riesgos y rollback

Es un cambio exclusivamente de presentación y no altera RPC, RLS, precios, pagos ni permisos. Rollback: revertir los tokens y estilos de esta entrada; no requiere migración.

## Validación

- `npm run typecheck`: exitoso.
- `npm run lint`: exitoso con 16 advertencias heredadas, sin errores.
- Limitación: no fue posible realizar una inspección visual automatizada en un navegador conectado; se revisaron sistemáticamente tokens, fondos y clases de texto.

## Actualización del grafo

- Nodo cambiado: `frontend`.
- Enlaces: tokens globales -> controles/UI de todas las rutas.
- Sección HTML actualizada: sistema de contraste.
