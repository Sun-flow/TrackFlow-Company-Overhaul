# `docs` folder

This folder holds **cross-cutting documentation** for the monorepo: architecture guides, technical decisions, conventions, processes, and any material shared across applications, pipelines, agents, and workflows.

- **Main purpose**: provide a single place for “global” project documentation (not tied to one app or agent only).
- **Recommendation**: organize docs by topic (architecture, deployment, data, security, observability, etc.) and keep links from each component’s README to these guides.

## Layout

| Path | What it holds |
| ---- | ------------- |
| [`milestones/`](./milestones/README.md) | One folder per milestone: its briefs, kept as received, and its plan (`plan.md`). |
| [`decisions.md`](./decisions.md) | Decisions with lasting consequences, and why. |
| [`FUTURE_WORK.md`](./FUTURE_WORK.md) | Ideas parked for later milestones. |

> _Spanish version: [README.es.md](./README.es.md)._
