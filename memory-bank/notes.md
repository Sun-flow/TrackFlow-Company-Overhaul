# Notes

> **Last updated**: 2026-10-22
> Things learned the hard way. Add to this as soon as you learn something the next session would otherwise rediscover. Keep each note to a line or two, keep only what is highly relevant, and remove notes that stop being true.

## Working with mae

- mae makes the design calls. When a choice changes what users see, offer two or three options with a recommendation instead of picking silently, then log the outcome in `docs/decisions.md`.
- Confirm a plan with mae before building anything. Answering a question or settling a decision is not a go-ahead to start building.
- mae works in more than one environment (Claude Code in the cloud, and GitHub Copilot in a Codespace). Nothing outside the repo carries over between them, so anything worth keeping goes in this folder or `docs/`.
