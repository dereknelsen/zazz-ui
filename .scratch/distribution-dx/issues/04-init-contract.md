# Define the init contract

Type: grilling
Status: open
Blocked by: 01, 02

## Question

What exactly does `zazz-ui init` scaffold in a consumer project?

Decide:

- The vendored file list from `packages/ui/src/base`: which css layers (`_layers`, `_variables`, `_reset`, `_typography`, `_utilities`, `_layout`, `_view-transitions`) and which runtime scripts (`utils`, `signals`, `zazz-element`, `dialog-lifecycle`, `reveal`, `navigation`, `embla`).
- Vendored script language: compiled readable `.js` (+`.d.ts`?) from the tarball, or `.ts` source — remembering the zero-build identity and the legacy-migration audience.
- Whether `init` emits the canonical head block (via `buildHead` from `src/head.ts`): meta, fonts, stylesheet link, polyfills, the pinned+SRI import map for third-party deps (embla, signal-polyfill), theme script. Vendored JS primitives import bare specifiers, so _something_ must supply the import map.
- Target paths in the consumer project (e.g. `zazz/` or `src/zazz/`? configurable?) and an `index.css`-equivalent with the `layer(legacy)` slot.
- The config file (name: `zazz.json`?) recording provenance for future diffs: kit version, vendored file list, content hashes, target paths.
- Interactive prompts vs flags; behavior when re-run in an already-initialized project.

Informed by [Research the shadcn CLI's anatomy](01-shadcn-cli-anatomy.md) and [Research npm-tarball-as-registry mechanics](02-npm-tarball-registry-mechanics.md). Also settle here (or spawn a ticket for) the fog item: legacy-migration ergonomics of the `layer(legacy)` slot.
