# [2026-07-22] Contexto universal y skills de agentes

- **Rol/agente:** Documentación / Orquestación
- **Estado:** implementado
- **Objetivo:** Hacer que Codex, Claude u otro agente arranque desde conocimiento compacto y enrutado, en vez de recorrer el repositorio completo.
- **Nodos de conocimiento:** agents-system, knowledge-tree, frontend, backend-data, backend-for-frontend, integrations, quality y deployment.
- **Archivos modificados:** `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.agents/canchalibre-*`, `.agents/manifest.json`, `.agents/task-router.md`, `docs/agent-context.md`, árbol/grafo y este registro.

## Decisión y contrato

`docs/agent-context.md` es el resumen de arranque machine-friendly. El árbol HTML sigue siendo navegación y fuente de verdad; el grafo determina dependencias; el router selecciona la combinación mínima de skill, rol, nodos y validación. Todos los roles requieren primero `canchalibre-context` y luego una skill de dominio. `AGENTS.md`, `CLAUDE.md`, Copilot y `manifest.json` publican la misma secuencia para plataformas distintas.

## Riesgos y rollback

No se alteran datos ni producción. El riesgo es que el contexto se vuelva obsoleto; el protocolo convierte su actualización, junto con un registro fechado, en una condición obligatoria de cierre. Revertir estos archivos elimina el sistema de skills si fuera necesario.

## Validación

- Comando/prueba: validación local de frontmatter, nombre, descripción, metadata y referencias de las seis skills.
- Resultado: las seis skills cumplen la estructura requerida.
- Cobertura o limitación: el validador oficial `quick_validate.py` no pudo ejecutarse porque el runtime Python integrado no incluye `PyYAML`; los agentes externos deben recibir `AGENTS.md` y la carpeta `.agents/` al ser subidos/ejecutados.

## Actualización del grafo

- Nodo creado/cambiado: `agents-system` incorpora `agent-context` y las seis skills.
- Enlaces entrantes/salientes: task → context → router → skill/rol → nodos afectados → registro de cambio.
- Sección HTML actualizada: colaboración y sistema de agentes.
