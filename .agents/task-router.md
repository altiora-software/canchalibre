# Router de tareas: contexto mínimo

Leer primero `../docs/agent-context.md`, el árbol y el grafo. Después usar sólo la fila aplicable.

| Pedido | Skill | Rol | Nodos / fuentes a cargar | Validación mínima |
| --- | --- | --- | --- | --- |
| Página, componente, ruta, hook o estado | `canchalibre-context` + `canchalibre-frontend` | Frontend | frontend, ruta, contrato BFF enlazado | typecheck, lint, build, flujo UI |
| RPC, tabla, RLS, migración, rol o reserva | `canchalibre-context` + `canchalibre-backend` | Backend de datos | backend-data + nodo crítico aplicable + migraciones relacionadas | staging, actor permitido/denegado |
| Contrato React/RPC/Edge, errores API | `canchalibre-context` + `canchalibre-bff` | BFF | frontend ↔ BFF ↔ backend/integrations | tipos, éxito, rechazo, error |
| Edge Function, WhatsApp, pago, webhook o Maps | `canchalibre-context` + `canchalibre-bff` + `canchalibre-backend` | Integraciones | integrations + contrato + secretos requeridos | JWT, CORS, input y fallo proveedor |
| Vulnerabilidad, permisos, secreto o PII | `canchalibre-context` + `canchalibre-backend` | Seguridad | auth-and-roles + nodo afectado | intento de abuso denegado |
| Test, bug de regresión, CI o release | `canchalibre-context` + `canchalibre-quality` | QA/DevOps | quality + deployment + flujo afectado | gates y evidencia |
| Actualizar contexto/documentación | `canchalibre-context` + `canchalibre-knowledge` | Documentación | nodo y registros afectados | enlaces y coherencia |

Si una tarea toca más de una fila, el orquestador divide por contrato y coordina la actualización atómica.
