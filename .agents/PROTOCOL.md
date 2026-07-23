# Protocolo de trabajo y conocimiento

## A. Preparación

Antes de investigar, el agente debe declarar internamente:

- Rol aplicado y objetivo concreto.
- Nodos del grafo que toca.
- Archivos previstos y dependencias.
- Riesgo (bajo, medio, alto o crítico).
- Validaciones necesarias.

La exploración se limita a esos nodos y sus enlaces. Si falta conocimiento, se amplía sólo el nodo necesario y se anota la incertidumbre; no se vuelve a escanear toda la aplicación.

## B. Cambio seguro

1. Consultar los cambios recientes del área.
2. Aplicar el cambio más pequeño que resuelva el objetivo.
3. Si se altera contrato entre capas, actualizar primero o en el mismo cambio el contrato, los consumidores y los tipos.
4. Para datos y seguridad, preparar migración reversible y validar en staging antes de producción.
5. Ejecutar typecheck, lint, build y/o pruebas relevantes. No afirmar validaciones no ejecutadas.

## C. Documentación obligatoria de cierre

Cada tarea crea un archivo en `docs/knowledge/changes/` usando `templates/knowledge-update.md`. Debe incluir:

- Fecha, agente/rol, objetivo y estado.
- Nodos de entrada/salida y archivos modificados.
- Decisiones y contratos creados o cambiados.
- Riesgos, migraciones y rollback.
- Validaciones ejecutadas con resultado.

Después, actualizar `docs/knowledge-tree.html` y `docs/knowledge-graph.html` si cambió arquitectura, un flujo, entidad, contrato, integración, riesgo o estado operativo. Si sólo cambió implementación interna, enlazar el registro desde el nodo existente.

## D. Coordinación

- El orquestador entrega a cada agente una sola responsabilidad y los nodos que puede tocar.
- El agente de Documentación resuelve conflictos de estructura en el árbol/grafo.
- No sobrescribir documentación ajena: incorporar entradas aditivas, fechadas y enlazadas.
- Ante conflicto de contratos, detener la implementación y pedir decisión al orquestador/usuario.

## E. Definición de terminado

Una tarea está terminada sólo si el código, la documentación de conocimiento y la validación están alineados. Un cambio no documentado no está terminado.
