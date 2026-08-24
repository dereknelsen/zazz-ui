# Assemble the distribution spec

Type: task
Status: open
Blocked by: 03, 04, 05, 06, 07, 08

## Question

Write `.scratch/distribution-dx/spec.md`: the handoff document consolidating every resolution on this map into one implementable spec.

- Consolidate the answers from every closed ticket: CLI contract (`init`, `add`, `update`), npm-tarball registry mechanics, CDN story, versioning/release policy, docs restructure.
- Include implementation handoff notes: the CLI's monorepo home and toolchain (likely `packages/cli` built with tsdown via `vp` — sharpen the fog item here), name facts from [Reserve the npm names](03-reserve-npm-names.md).
- Confirm the ADR set is complete (0005, 0006, plus any earned by tickets 04–08) and cross-linked from the spec.
- Final review pass with Derek; the map closes when the spec stands and no tickets remain.
