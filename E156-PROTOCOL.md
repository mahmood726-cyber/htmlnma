# E156 Protocol — Network Geometry & Transitivity Inspector

- **Project:** Network Geometry & Transitivity Inspector
- **Repo (docs):** htmlnma
- **Dashboard:** `index.html` (single-file, offline)
- **Built:** 2026-06-04

## CURRENT BODY

Can a deterministic graph check decide, before any estimation, whether direct
treatment comparisons can support a network meta-analysis? The input is
one line per study: two-arm comparisons with optional counts, and multi-arm
trials expanded to pairwise edges among arms. The tool parses these into a
weighted graph and computes connectivity by union–find, aggregating parallel
edges into one comparison whose evidence is the summed count. A network is judged
feasible when it forms one connected component of at least three treatments, with
degree, edge count, density, the most-connected node, and multi-arm trials also
reported. Robustness rests on determinism: identical inputs yield identical
geometry, the engine is unit-tested against hand-derived fixtures, and no
statistics can drift. Because connectivity is necessary but not sufficient, the
geometry is paired with a qualitative transitivity checklist the analyst confirms. The boundary is explicit: this is a pre-flight inspector, not an
estimator, so a verdict licenses an NMA but never replaces one.

SUBMITTED: [ ]
