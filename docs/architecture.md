# Architecture

The atlas is a static Vite application. It has no backend, database, runtime AI, or external runtime data dependency.

```mermaid
flowchart LR
  A[Official accepted-papers page] -->|reviewed one-time import| B[Local source snapshot]
  B --> C[Papers, topics, trails]
  C --> D[Data validation]
  C --> E[Deterministic 2D map]
  C --> F[Search, list, detail, trails]
  E --> G[Shared URL state]
  F --> G
  F --> H[Local reading queue]
```

## Responsibilities

- `data/` contains the dated source record, interpreted paper records, topic definitions, trails, and reconciliation evidence.
- `scripts/import-accepted-papers.mjs` converts a manually retrieved official HTML page into the reviewed local JSON snapshot; it never runs in the public application.
- `scripts/validate-data.mjs` enforces unique IDs and normalized titles, valid references, source metadata, and stable ordering.
- `src/data.js` loads and searches local data and derives explicitly tag-based related papers.
- `src/map.js` owns stable schematic positions and accessible SVG interaction.
- `src/state.js` owns shareable hash state and the browser-local reading queue.
- `src/app.js` synchronizes controls, map, detail view, list, trails, queue, and URL.
- `.github/workflows/ci.yml` validates pull requests; `.github/workflows/deploy-pages.yml` deploys only from `main` after human merge.

## Invariants

The map does not encode measured semantic distance. Connections appear only for the selected paper and mean only that editorial concept tags overlap. Topic regions, tags, trails, and relationships remain title-and-metadata interpretations.
