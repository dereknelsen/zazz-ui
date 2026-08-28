# Assemble the distribution spec

Type: task
Status: resolved
Blocked by: 03, 04, 05, 06, 07, 08

## Question

Write `.scratch/distribution-dx/spec.md`: the handoff document consolidating every resolution on this map into one implementable spec.

- Consolidate the answers from every closed ticket: CLI contract (`init`, `add`, `update`), npm-tarball registry mechanics, CDN story, versioning/release policy, docs restructure.
- Include implementation handoff notes: the CLI's monorepo home and toolchain (likely `packages/cli` built with tsdown via `vp` — sharpen the fog item here), name facts from [Reserve the npm names](03-reserve-npm-names.md).
- Confirm the ADR set is complete (0005, 0006, plus any earned by tickets 04–08) and cross-linked from the spec.
- Final review pass with Derek; the map closes when the spec stands and no tickets remain.

## Answer

Resolved 2026-08-28. [spec.md](../spec.md) is written, consolidating tickets 01–08 into: distribution shape, kit-side publish prerequisites (complete manifest + `manifestVersion`, `dist/sri.json`, `buildHead` CDN mode, changelog), the CDN story, the full CLI contract (`init`/`add`/`update`/`diff` + `zazz.json` + pacote mechanics), versioning/release policy, docs restructure, and the implementation handoff (CLI home `packages/cli`, tsdown via `vp`, node >= 20, `pacote` + `@npmcli/config`; suggested 6-step execution order with the kit publish at step 3).

ADR set confirmed complete: [0005](../../../docs/adr/0005-single-package-per-file-cdn.md) and [0006](../../../docs/adr/0006-cli-vendors-from-npm-tarball.md) from charting, plus two minted by this assembly (grilled with Derek): [0009 provenance-recorded 3-way update](../../../docs/adr/0009-provenance-recorded-three-way-update.md) and [0010 kit-first, independent versioning](../../../docs/adr/0010-kit-first-independent-versioning.md). All are cross-linked from the spec.

Final review with Derek: pending — the map closes when he signs off on spec.md.
