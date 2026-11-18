# `packages` folder

This folder contains **shared packages** for the monorepo: internal libraries, utilities, types, shared components, SDKs, clients, and any code reused by multiple applications, agents, or pipelines.

Each subfolder under `packages/` should represent **one versionable package** (for example `shared-types`, `ui`, `analytics-sdk`) with its own README.

- **Main purpose**: encourage reuse and consistency across all company deliverables.
- **Recommendation**: document packages as you add them—their public API and how they are consumed from `apps/`, `agents/`, and `workflows/`.

## Packages

| Package | What it is |
| ------- | ---------- |
| [`warehouse-logic`](./warehouse-logic/README.md) | `@trackflow/warehouse-logic`, Milestone 2's logic layer: the warehouse and carrier data model and the typed, pure functions that work on it. |

> _Spanish version: [README.es.md](./README.es.md)._
