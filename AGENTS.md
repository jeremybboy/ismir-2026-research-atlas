# Agent instructions

## Purpose

Build a static, accessible, title-based atlas for the official ISMIR 2026 accepted-paper list.

## Boundaries

- `data/` is the reviewed public metadata snapshot and editorial classification layer.
- `src/` owns browser behavior; keep modules small and framework-free.
- `docs/` owns architecture, methodology, audit evidence, and editable diagrams.
- Never add abstracts or full paper text without verified source and reuse terms.
- Never describe inferred topics, tags, positions, or links as official classifications, measured semantic distance, citations, collaboration, or influence.
- The application must have no backend, database, runtime AI, or runtime conference-site dependency.

## Workflow

- After the bootstrap commit, never edit or push directly to `main`.
- Use `feat/initial-research-atlas` for the initial application.
- Inspect status and diffs before staging; stage explicit paths only.
- Run `npm test`, `npm run build`, and browser/accessibility checks before handoff.
- Never merge a pull request or enable auto-merge; Jeremy reviews and merges in GitHub.

## Documentation

Read `docs/methodology.md`, `docs/taxonomy-audit.md`, and `docs/architecture.md` before changing data classification, relationships, layout meaning, or public claims.
