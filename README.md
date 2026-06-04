# Network Geometry & Transitivity Inspector

A single-file, fully-offline browser tool that performs a **pre-flight check for
network meta-analysis (NMA)**. Given a set of direct treatment comparisons, it
decides whether an NMA is even feasible and describes the network's geometry. It
**estimates nothing** — the graph is exact and deterministic.

This is deliberately *not* another NMA estimator (the portfolio already has
several). It answers the question that comes *before* estimation: is the evidence
network one connected piece of at least three treatments, and what does its
geometry look like?

## What it does

From one comparison per line, the engine:

- parses nodes (unique treatments) and weighted edges (parallel edges aggregate,
  summing study counts);
- reports degree per node, total studies, and edge count;
- computes connectivity (number of connected components, via union–find);
- decides `nmaFeasible = (components === 1 && nodes >= 3)`;
- finds the most-connected node (max degree) and network density `edges / C(n,2)`;
- counts and lists multi-arm trials (each contributes all pairwise edges among
  its arms and is flagged);
- returns a qualitative **transitivity checklist** the analyst must confirm
  (items default to unconfirmed — the tool never asserts transitivity holds).

## Input formats

```
A, B            a 2-arm comparison on edge A–B, weight 1
A, B, 3         3 studies on the A–B edge
T1: A, B, C     a multi-arm trial -> all pairwise edges among arms (flagged)
# ...           comment line, ignored
```

Treatment names are trimmed and matched **verbatim** (case-sensitive). A trailing
integer is read as a study count only on a plain two-treatment line *without* a
trial label; on a colon-labelled line a trailing integer is a third arm.

## Provenance

| Aspect | Choice | Rationale |
| --- | --- | --- |
| Feasibility rule | `components === 1 && nodes >= 3` | A 2-node connected network is a pairwise meta-analysis, not an NMA. |
| Connectivity | union–find with path compression + union by rank | Deterministic component count. |
| Density | `edges / C(n,2)`; `null` for `n < 2` | Observed direct comparisons over the maximum possible. |
| Parallel edges | aggregate, summing study counts | The same unordered pair on several lines is one direct comparison with more evidence. |
| Multi-arm trials | all pairwise edges among arms; flagged | Correct contribution to network *geometry*; those edges share a comparator and are statistically correlated (covariance `τ²/2` in an NMA model). The tool flags them; it does not model the correlation. |
| Degree | number of distinct incident edges (neighbours) | After parallel-edge aggregation, degree counts unique comparators. |
| Transitivity | qualitative checklist, defaults unconfirmed | Transitivity is a substantive judgement; a graph cannot decide it. |

No statistics are computed, so there is no metafor/`meta`/`mada` comparison to
make — the engine is a pure graph algorithm and its tests are hand-derived from
the graph definition of each fixture.

## Layout

| File | Purpose |
| --- | --- |
| `engine.js` | Pure graph logic (parse → build → connectivity → inspect). No DOM. Runs in Node and the browser. |
| `tests.js` | Node test harness. `node tests.js` → `38 passed, 0 failed`. |
| `index.html` | Single-file offline UI; loads `chartkit.js` then `engine.js` then an inline script. |
| `chartkit.js` | Offline SVG chart kit (copied verbatim from the e156 flagship kit). `renderNetwork` draws the evidence network. |
| `E156-PROTOCOL.md` | E156 micro-paper protocol (CURRENT BODY + submission flag). |
| `LICENSE` | MIT. |

## Tests

```
$ node tests.js
38 passed, 0 failed
```

Coverage includes: connected triangle (1 component, feasible, 3 nodes / 3 edges,
density 1); disconnected `A-B / C-D` (2 components, not feasible); the 2-node
"connected but not an NMA" case; multi-arm `T1: A,B,C` (3 edges, `multiArm=1`);
parallel-edge aggregation summing study counts; degree and density correctness;
a star network whose hub is the most-connected node; the qualitative checklist
defaulting to unconfirmed; parse-error handling; and whitespace / case behaviour.

## Reuse vs net-new

**Reused.** `chartkit.js` is copied verbatim from
`C:/Projects/e156/flagship/kit/chartkit.js`; the `renderNetwork(svg, nodes,
edges, opts)` function (nodes `{id,label,n,isRef}`, edges `{a,b,n}`) is used as
its data contract specifies. The single-file page structure, CSS design tokens,
and the IIFE dual-export module pattern follow `html1-effectsize`. The MIT
`LICENSE` is copied from `html1-effectsize`.

**Net-new.** All graph logic in `engine.js` (line parser supporting the three
input formats, parallel-edge aggregation, union–find connectivity, density and
degree, multi-arm detection, the feasibility rule, and the transitivity
checklist) and all of `tests.js` and `index.html` are written for this tool.
Unlike the portfolio's NMA estimators, this tool runs entirely before estimation
and computes no statistics.

## Offline / GitHub Pages

Fully offline — no external CDN or network. `index.html` sits at the repo root;
`.nojekyll` is present so Pages serves the files as-is.
