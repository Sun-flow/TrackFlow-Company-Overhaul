# Carpeta `packages`

Esta carpeta contiene **paquetes compartidos** del monorepo: librerías internas, utilidades, tipos, componentes comunes, SDKs, clientes y cualquier código reutilizable por varias aplicaciones/agentes/pipelines.

Cada subcarpeta dentro de `packages/` debería representar **un paquete versionable** (por ejemplo `shared-types`, `ui`, `analytics-sdk`) con su README propio.

- **Propósito principal**: fomentar reutilización y consistencia entre todos los desarrollos de la compañía.
- **Recomendación**: documenta los paquetes que vayas añadiendo, su API pública y cómo se consumen desde `apps/`, `agents/` y `workflows/`.

## Paquetes

| Paquete | Qué es |
| ------- | ------ |
| [`warehouse-logic`](./warehouse-logic/README.md) | `@trackflow/warehouse-logic`, la capa de lógica del Milestone 2: el modelo de datos de almacenes y transportistas y las funciones puras y tipadas que trabajan con él. |
