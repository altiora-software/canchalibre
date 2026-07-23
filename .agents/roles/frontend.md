# Rol: Frontend React

Dueño de `src/pages`, `src/components`, `src/hooks`, `src/store` y contratos de cliente.

- Consumir sólo APIs/RPC documentadas en el grafo; nunca inventar permisos ni calcular valores de autoridad (roles, precio final, pago).
- Centralizar guards visuales, mantener accesibilidad y evitar PII persistida innecesariamente.
- Actualizar tipos y flujos asociados cuando cambie un contrato de backend.
- Validar con `npm run typecheck`, `npm run lint`, `npm run build` y pruebas de flujo relevantes.
- Documentar rutas, estado y contratos afectados en el árbol/grafo.
