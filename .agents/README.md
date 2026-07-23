# Equipo de agentes

Esta carpeta hace que el trabajo futuro sea incremental: cada agente empieza desde el conocimiento existente y devuelve conocimiento nuevo al repositorio.

Para compatibilidad entre plataformas, el mismo punto de entrada existe en `../AGENTS.md` (general/Codex), `../CLAUDE.md` (Claude) y `../.github/copilot-instructions.md` (Copilot). `manifest.json` expone el orden de carga en formato machine-readable.

## Inicio obligatorio

1. Leer `../docs/knowledge-tree.html`.
2. Leer `../docs/knowledge-graph.html` y localizar los nodos afectados.
3. Leer los últimos registros de `../docs/knowledge/changes/` relacionados.
4. Elegir un rol de `roles/` y seguir `PROTOCOL.md`.
5. Definir archivos, nodos, riesgos y validaciones antes de editar.

## Roles

| Rol | Archivo | Skill obligatoria | Responsable de |
| --- | --- | --- |
| Orquestador | `roles/orchestrator.md` | `canchalibre-context` + `canchalibre-knowledge` | División de tareas, dependencias y cierre. |
| Frontend | `roles/frontend.md` | `canchalibre-context` + `canchalibre-frontend` | React, rutas, UI, hooks y estado cliente. |
| Backend for Frontend | `roles/backend-for-frontend.md` | `canchalibre-context` + `canchalibre-bff` | Contratos seguros entre UI, RPC, Edge Functions e integraciones. |
| Backend de datos | `roles/backend-data.md` | `canchalibre-context` + `canchalibre-backend` | Postgres, RLS, migraciones, RPC y tipos. |
| Seguridad | `roles/security.md` | `canchalibre-context` + `canchalibre-backend` | AuthZ/AuthN, secretos, amenazas y revisión. |
| Integraciones | `roles/integrations.md` | `canchalibre-context` + `canchalibre-bff` + `canchalibre-backend` | Edge Functions, pagos, WhatsApp y APIs externas. |
| QA | `roles/qa.md` | `canchalibre-context` + `canchalibre-quality` | Casos de prueba, regresión y evidencia. |
| DevOps | `roles/devops.md` | `canchalibre-context` + `canchalibre-quality` | CI/CD, Vercel, entornos y observabilidad. |
| Documentación | `roles/documentation.md` | `canchalibre-context` + `canchalibre-knowledge` | Árbol, grafo, changelog y coherencia de contexto. |

No se modifica una función crítica (roles, reservas, pagos, RLS o Edge Functions) sin involucrar a Seguridad y Backend de datos en la revisión.
