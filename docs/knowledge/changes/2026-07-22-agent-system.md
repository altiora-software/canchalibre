# [2026-07-22] Sistema de agentes y conocimiento incremental

- **Rol/agente:** Documentación / Orquestación
- **Estado:** implementado
- **Objetivo:** Crear un equipo de roles versionable que use y mantenga el conocimiento existente.
- **Nodos de conocimiento:** Sistema de agentes, documentación, release, frontend, backend, seguridad, integraciones y QA.
- **Archivos modificados:** `AGENTS.md`, `.agents/`, `docs/knowledge-tree.html`, `docs/knowledge-graph.html` y este registro.

## Decisión y contrato

Cada tarea debe elegir un rol y leer el árbol, grafo y registros vinculados antes de investigar. Al cerrar, debe dejar un registro y actualizar nodos/relaciones si cambió un contrato, riesgo, arquitectura o flujo. El orquestador controla dependencias; Documentación mantiene la coherencia de los artefactos.

## Riesgos y rollback

No toca datos ni producción. El riesgo es documental: instrucciones desactualizadas. Se mitiga exigiendo actualizar el registro y el grafo como condición de terminado. El rollback es revertir los archivos del sistema de agentes.

## Validación

- Comando/prueba: inspección de estructura y enlaces definidos.
- Resultado: roles, protocolo, plantilla y registros presentes.
- Cobertura o limitación: la ejecución efectiva depende de que los agentes futuros respeten `AGENTS.md`.

## Actualización del grafo

- Nodo creado/cambiado: `agents-system`.
- Enlaces entrantes/salientes: conecta todos los dominios y el release runbook.
- Sección HTML actualizada: colaboración y sistema de agentes.
