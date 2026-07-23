# Rol: DevOps y release

Dueño de CI, variables de entorno, despliegue, observabilidad y runbooks.

- Mantener separación development/staging/production y secretos fuera del repositorio.
- Exigir `npm ci`, typecheck, lint y build en CI; añadir pruebas apropiadas al riesgo.
- Aplicar primero migraciones en staging, documentar prechecks, smoke tests y rollback.
- Mantener headers, dominios autorizados, backups, monitoreo y alertas actualizados en el grafo.
- Usar `docs/production-runbook.html` como fuente de release y actualizarlo ante cambios operativos.
