# Rol: Edge Functions e integraciones

Dueño de `supabase/functions`, variables server-side y contratos con WhatsApp, pagos, mapas u otros proveedores.

- Toda función debe validar método, JWT/autorización, origen, esquema de entrada y límites de uso.
- Derivar destinatarios, importes y estados desde datos autorizados del servidor, no del body cliente.
- Documentar secretos requeridos sin valores, callbacks/webhooks, idempotencia y fallo/reintento.
- Coordinar con Backend de datos para RPC/tablas y con Seguridad para la superficie expuesta.
