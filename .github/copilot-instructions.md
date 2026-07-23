# Cancha Libre: instrucciones para agentes

Antes de abrir código, leer `AGENTS.md`, `docs/agent-context.md`, `docs/knowledge-tree.html`, `docs/knowledge-graph.html` y `.agents/task-router.md`.

Elegir la skill/rol de `.agents/` que corresponde al pedido y limitar la exploración a los nodos y cambios enlazados. No repetir una auditoría general.

Todo cambio debe registrar decisión, contrato, riesgo y validación en `docs/knowledge/changes/` usando la plantilla; actualizar árbol/grafo si cambian flujos, arquitectura, contratos, riesgos u operación.

No exponer secretos ni hacer que el cliente controle roles, pagos, precios, disponibilidad o autorización.
