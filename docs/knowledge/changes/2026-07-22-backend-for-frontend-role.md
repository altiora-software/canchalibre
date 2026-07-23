# [2026-07-22] Rol Backend for Frontend

- **Rol/agente:** Documentación / Orquestación
- **Estado:** implementado
- **Objetivo:** Incorporar un responsable explícito de contratos entre la interfaz y servicios server-side.
- **Nodos de conocimiento:** frontend, backend-for-frontend, backend-data, integrations, auth-and-roles, reservations-and-payments.
- **Archivos modificados:** `.agents/roles/backend-for-frontend.md`, `.agents/README.md`, `docs/knowledge-tree.html`, `docs/knowledge-graph.html` y este registro.

## Decisión y contrato

El BFF no sustituye al backend de datos ni a las Edge Functions. Es el dueño del contrato de consumo: payloads, tipos, errores, adaptadores y compatibilidad entre UI, RPC y funciones. La autoridad sigue en RLS, RPC y Edge Functions.

## Riesgos y rollback

No modifica producción. Riesgo mitigado: que la UI acceda directamente a operaciones sensibles sin contrato claro. El rollback es revertir estos artefactos documentales.

## Validación

- Comando/prueba: verificación de presencia del rol y de sus enlaces en árbol/grafo.
- Resultado: rol agregado e integrado en los dos mapas de conocimiento.
- Cobertura o limitación: no crea una capa HTTP nueva por sí sola; cada tarea futura decide el adaptador concreto.

## Actualización del grafo

- Nodo creado/cambiado: `backend-for-frontend`.
- Enlaces entrantes/salientes: frontend → BFF → backend-data e integrations.
- Sección HTML actualizada: colaboración y sistema de agentes.
