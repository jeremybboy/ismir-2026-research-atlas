# ISMIR 2026 Research Atlas

An interactive, title-based atlas of accepted papers at ISMIR 2026.

> Project status: governance scaffold. The application and reviewed data snapshot will be proposed in a draft pull request and will not be deployed until that pull request is reviewed and merged.

![Planned atlas journey: official accepted-paper metadata is reviewed locally, interpreted through five title-derived regions and concept tags, and presented through a stable map, paper details, trails, and a reading queue.](docs/assets/repository-overview.svg)

The atlas is designed as a concise, two-dimensional route from official public metadata to an exploratory map. The diagram describes the agreed product plan; implementation evidence will arrive in the initial application pull request.

## Methodological boundary

This independent exploratory visualization is derived from publicly listed ISMIR 2026 paper titles and author metadata. Topic assignments, concept tags, relationships, and guided trails are editorial interpretations and are not official ISMIR classifications.

The authoritative source is the [official ISMIR 2026 accepted-papers page](https://ismir2026.ismir.net/accepted-papers). The application will use a reviewed local snapshot and will not scrape the conference site at runtime.

## Governance

After this bootstrap commit, every change must use a feature branch and pull request. Agents must not push directly to `main`, enable auto-merge, or merge pull requests. See [CONTRIBUTING.md](CONTRIBUTING.md), [AGENTS.md](AGENTS.md), and [SECURITY.md](SECURITY.md).

## License and data rights

Original code is licensed under the [MIT License](LICENSE). Conference metadata, paper titles, author names, affiliations, and paper content remain the property of their respective sources and rights holders; this repository does not claim ownership of them.
