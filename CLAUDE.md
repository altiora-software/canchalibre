# Cancha Libre: instrucciones de contexto

Antes de investigar, responder o editar:

1. Leer `AGENTS.md`.
2. Leer `docs/agent-context.md`, `docs/knowledge-tree.html` y `docs/knowledge-graph.html`.
3. Consultar `.agents/task-router.md` y activar/seguir la skill y el rol que correspondan.
4. Cargar únicamente los nodos, archivos fuente y registros enlazados por el router.

No recorrer el repositorio completo si el contexto del nodo ya existe. Al terminar, crear un registro en `docs/knowledge/changes/` con `.agents/templates/knowledge-update.md` y actualizar árbol/grafo cuando cambie conocimiento estable.

Las reglas de seguridad de `AGENTS.md` son obligatorias: no secretos, no desactivar RLS, no roles/pagos/precios autoritativos desde cliente.
