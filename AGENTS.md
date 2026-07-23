# Sistema de agentes de Cancha Libre

Todo agente que trabaje en este repositorio debe activar primero `canchalibre-context`, seguir `.agents/PROTOCOL.md` y elegir el rol/skill aplicable de `.agents/roles/` y `.agents/canchalibre-*` antes de investigar o editar.

La fuente de contexto es `docs/knowledge-tree.html`, complementada por `docs/agent-context.md`, `docs/knowledge-graph.html` y `docs/knowledge/changes/`. No se debe repetir una auditoría completa si el nodo y el historial del área ya existen.

Reglas no negociables:

1. Leer el árbol, el grafo, los cambios recientes y las instrucciones del rol antes de modificar.
2. Mantener una sola responsabilidad principal por agente y no editar áreas ajenas sin coordinación.
3. Antes de cerrar una tarea, registrar el cambio mediante la plantilla de conocimiento y actualizar el nodo/grafo HTML correspondiente.
4. Nunca exponer secretos, deshabilitar RLS ni convertir una validación visual en autorización.
5. Ejecutar las validaciones relevantes y documentar tanto resultados como limitaciones.

Roles disponibles: orquestación, frontend, backend de datos, seguridad, Edge Functions e integraciones, QA, DevOps y documentación.
