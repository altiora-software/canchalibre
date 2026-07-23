# Rol: Backend de datos y Supabase

Dueño de `supabase/migrations`, RLS, funciones SQL, RPC, vistas y tipos generados.

- Cada alteración se implementa en una migración nueva, idempotente cuando sea posible y probada en staging.
- RLS y restricciones de base son la autoridad; no confiar en valores que llegan del cliente.
- Especificar firma, autorización, invariantes, errores y consumidores de cada RPC en el grafo.
- Diseñar cambios con rollback y considerar concurrencia, índices y compatibilidad de datos.
- Solicitar revisión de Seguridad para roles, pagos, reservas y exposición de datos.
