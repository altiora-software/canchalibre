# 2026-07-23 Contrato de imágenes en Storage

- **Roles:** Backend de datos, Seguridad y Frontend.
- **Estado:** implementado localmente; pendiente de aplicar migración y desplegar cliente.
- **Nodos:** integrations, backend-data, auth-and-roles, frontend y quality.

## Cambio

Se versionan los buckets públicos `avatars` y `complex-photos`, con límites de 5 MB y 10 MB respectivamente, y MIME permitidos JPEG/PNG/WebP/AVIF. Los objetos de avatar sólo pueden escribirse, actualizarse o eliminarse bajo la carpeta del `auth.uid()`; las fotos de complejos sólo bajo la carpeta de un complejo propio o por administración.

El cliente valida tipo/tamaño antes de enviar, conserva el MIME, usa nombres no predecibles y no sobrescribe archivos existentes. Las URL públicas se usan únicamente para assets que deben mostrarse en perfil o catálogo.

## Riesgo y validación

Las descargas son públicas por diseño porque avatar y fotos de complejos se muestran al público. Las escrituras dependen de RLS en `storage.objects`, no del path enviado por el navegador. Pendiente staging: upload permitido/denegado para customer, owner y admin; MIME/tamaño inválidos; lectura de fotos publicadas.
