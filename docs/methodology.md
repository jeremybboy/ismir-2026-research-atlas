# Methodology

## Source and snapshot

The source of truth is the [official ISMIR 2026 accepted-papers page](https://ismir2026.ismir.net/accepted-papers), retrieved October 6, 2026. The reviewed local snapshot contains 140 source-ordered records with title and raw author text; `papers.json` separates a final parenthesized affiliation only when the source syntax supports it. No abstract or full paper text is copied, and the public application performs no runtime scraping.

The ten titles visible in the supplied validated prototype were reconciled against the official page: all ten match, with no missing or changed title. No separate machine-readable supplied paper list was available. Source spelling is preserved, including disclosed apparent affiliation typos, rather than silently corrected.

## Editorial interpretation

Every paper receives one primary region solely to produce a legible layout. Keyword evidence from titles determines the reproducible first assignment, with narrow reviewed overrides for obvious hybrid failures; multiple secondary concept tags preserve overlap. These are not official ISMIR subject areas and are not necessarily the categories selected by the authors.

Related-paper links require at least one shared editorial concept tag, and the interface states the shared tags. They do not represent citations, collaboration, influence, or verified methodological similarity. Title similarity alone is not used as evidence.

## Layout and trails

Papers are sorted by stable readable ID within each primary region and placed on a fixed grid around fixed region centers. Positions are schematic and remain stable across sessions and builds; they do not represent quantitative semantic distance.

Guided trails are reviewed, ordered editorial routes. Their premise and status as curated exploration paths are visible in the interface. Trails do not claim that their papers form a citation chain or author-defined research program.

## Updating the snapshot

1. Retrieve the official page manually and retain it outside the repository as review input.
2. Run `npm run import:data -- /path/to/accepted-papers.html`.
3. Review additions, removals, changed titles, parsed authors, and affiliations.
4. Re-run the taxonomy audit for affected hybrid or boundary cases.
5. Run `npm test`, the production build, browser tests, accessibility checks, and visual review.
6. Propose the update through a pull request; never silently overwrite discrepancies.
