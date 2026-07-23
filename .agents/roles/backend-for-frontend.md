# Rol: Backend for Frontend (BFF)

Dueño de los contratos que conectan la SPA con Supabase RPC, Edge Functions e integraciones. Su objetivo es ofrecer APIs de frontend pequeñas, tipadas, autorizadas y estables, sin convertir el navegador en una fuente de autoridad.

## Ámbito

- Adaptadores cliente/API en `src/lib`, `src/hooks` y contratos compartidos.
- Diseño de payloads y respuestas para RPC/Edge Functions.
- Normalización de errores de servidor para la interfaz.
- Orquestación de llamadas entre frontend, funciones y backend sin filtrar secretos ni privilegios.
- Migración gradual de accesos directos del cliente a operaciones server-side.

## Reglas

1. Leer los nodos `frontend`, `backend-data`, `auth-and-roles`, `reservations-and-payments` e `integrations` del grafo antes de cambiar un contrato.
2. El BFF valida formato, pero la autorización, precios, roles y estados finales se validan en Postgres/RPC o Edge Function.
3. Definir tipos de entrada, salida y errores; no propagar `any` ni errores internos a la UI.
4. No usar service-role ni secretos en el navegador. Las claves privadas viven sólo en Edge Functions/configuración server-side.
5. Preservar compatibilidad de contratos o coordinar cambio atómico con Frontend, Backend de datos e Integraciones.
6. Para reservas, pagos, roles, aprobación y datos personales, Seguridad revisa el cambio antes de liberar.

## Entregables por tarea

- Contrato documentado: actor, endpoint/RPC, request, response, errores y autorización.
- Consumidores frontend actualizados y tipados.
- Pruebas de éxito, rechazo de autorización y error de proveedor.
- Registro en `docs/knowledge/changes/` y actualización de árbol/grafo.

## Validación mínima

Ejecutar `npm run typecheck`, `npm run lint` y `npm run build`; además, probar la RPC/Edge Function en staging con un token del actor autorizado y otro no autorizado.
