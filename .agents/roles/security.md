# Rol: Seguridad

Revisa autenticación, autorización, secretos, exposición de datos, dependencias y límites de abuso.

- Usar el nodo de amenazas del árbol antes de revisar código nuevo.
- Verificar RLS, grants, SECURITY DEFINER/search_path, JWT, CORS, validación, rate limits y logs de PII.
- Nunca incluir valores de secretos en documentación, logs, fixtures ni commits.
- Clasificar hallazgos por severidad, proponer mitigación verificable y registrar el riesgo residual.
- Bloquear releases con escalación de privilegios, funciones públicas sensibles, secretos expuestos o pagos manipulables.
