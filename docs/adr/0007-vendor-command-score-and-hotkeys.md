# Vendor the command scorer and hotkey helper instead of adding dependencies

The typeahead family (autocomplete, combobox, command) ranks items with a vendored port of cmdk's `command-score.ts` (`base/command-score.ts`) and binds keyboard shortcuts with a hand-written ~150-line helper (`base/hotkeys.ts`). Neither is an npm dependency.

## Context

The command palette needs fuzzy ranking and `"mod+k"`-style shortcuts. The candidates were:

- **Scoring**: cmdk's `command-score.ts` (MIT, by @pacocoursey, adapted from Superhuman's `command-score`, itself building on Joshaven Potter's `string_score`): the standard ranking for command menus, a single pure function with no dependencies. It is not published as a standalone package.
- **Hotkeys**: `@tanstack/hotkeys` v0.8.x: genuinely framework-agnostic and type-safe, but 0.x alpha with unstable APIs. The kit needs three capabilities: parse a spec, match a `KeyboardEvent` (with `mod` resolving to Command/Ctrl by platform), and suppress bare-key shortcuts in editable contexts.

Every runtime dependency is a maintenance contract: ADR-0005's CDN policy requires an import-map entry with an exact pinned version, a sha384 SRI hash, and a `head.test.ts` version pin, along with bump discipline for every upstream release. The kit carries five ESM dependencies today, all stable (signal-polyfill and four Embla packages).

## Decision

Vendor both as `src/base/` modules with the standard pure-function shape (exported for unit tests only):

- `base/command-score.ts`: a faithful port preserving cmdk's constants and recursion verbatim so ranking matches cmdk's behavior; MIT attribution to @pacocoursey and the upstream lineage in the file header. Do not alter the algorithm: fidelity is essential.
- `base/hotkeys.ts`: `parseHotkey` / `matchesHotkey` / `isEditableTarget` / `bindHotkey`. Like `signals.ts`, this file is a deliberate seam: if TanStack Hotkeys reaches 1.0 and the kit grows complex needs (sequences, scopes, conflict detection), swap this file's internals without touching consumers.

## Consequences

- No import-map or SRI additions; the modules ship in the package like any other script and compile in place.
- The scorer must not drift from upstream: if cmdk's scoring changes materially, re-port rather than patch.
- Per-component keyboard handling (menu arrows, OTP slots) stays hand-written where it is; `hotkeys.ts` is only for spec-addressed shortcuts (`data-command-hotkey`, `data-hotkey`).
