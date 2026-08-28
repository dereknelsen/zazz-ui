# Define the init contract

Type: grilling
Status: resolved
Blocked by: 01, 02

## Question

What exactly does `zazz-ui init` scaffold in a consumer project?

Decide:

- The vendored file list from `packages/core/src/base`: which css layers (`_layers`, `_variables`, `_reset`, `_typography`, `_utilities`, `_layout`, `_view-transitions`) and which runtime scripts (`utils`, `signals`, `zazz-element`, `dialog-lifecycle`, `reveal`, `navigation`, `embla`).
- Vendored script language: compiled readable `.js` (+`.d.ts`?) from the tarball, or `.ts` source — remembering the zero-build identity and the legacy-migration audience.
- Whether `init` emits the canonical head block (via `buildHead` from `src/head.ts`): meta, fonts, stylesheet link, polyfills, the pinned+SRI import map for third-party deps (embla, signal-polyfill), theme script. Vendored JS primitives import bare specifiers, so _something_ must supply the import map.
- Target paths in the consumer project (e.g. `zazz/` or `src/zazz/`? configurable?) and an `index.css`-equivalent with the `layer(legacy)` slot.
- The config file (name: `zazz.json`?) recording provenance for future diffs: kit version, vendored file list, content hashes, target paths.
- Interactive prompts vs flags; behavior when re-run in an already-initialized project.

Informed by [Research the shadcn CLI's anatomy](01-shadcn-cli-anatomy.md) and [Research npm-tarball-as-registry mechanics](02-npm-tarball-registry-mechanics.md). Also settle here (or spawn a ticket for) the fog item: legacy-migration ergonomics of the `layer(legacy)` slot.

## Answer

Resolved 2026-08-28 with Derek (grilling). The four preference calls were his; the rest follows from tickets 01/02 and the kit's actual shape.

### Scope: base only

`init` vendors the **base platform only**; primitives arrive via `zazz-ui add`. Concretely, from the resolved `@zazz-ui/core` tarball:

- **All seven base css layers**: `base/_layers.css`, `_variables.css`, `_reset.css`, `_typography.css`, `_view-transitions.css`, `_utilities.css`, `_layout.css`. (They are one cascade contract; partial vendoring isn't offered.)
- **Core runtime scripts** — the cross-cutting modules with no primitive owner: `base/utils`, `base/signals`, `base/zazz-element`, `base/dialog-lifecycle`. Primitive-tied base scripts (`embla`, `command-score`, `hotkeys`, `typeahead`, `reveal`, `navigation`) are **not** vendored by `init`; they ride in as manifest dependencies when `add` pulls a primitive that needs them.
- **Entry files, rewritten for the vendored subset**:
  - `<dir>/index.css` — base imports in cascade order, the commented `layer(legacy)` slot, an empty "Zazz primitives" section that `add` appends `@import` lines into, then `_utilities.css` + `_layout.css` last (mirroring the kit's `src/index.css`).
  - `<dir>/index.js` — module entry importing the vendored core scripts; `add` appends primitive imports in dependency order.
- **Requirement this creates** (feeds [ticket 05](05-add-update-contract.md)): the published kit needs a complete machine-readable manifest — every primitive declaring its files **and its dependencies on other primitives and base scripts** (autocomplete → input, lightbox → carousel, combobox → typeahead/hotkeys/command-score, …), css-only primitives included. `init` itself only needs the base-file list from it.

### Language: `.js` + `.d.ts` by default; `--ts` for source

- Default vendors the compiled, readable `.js` plus its `.d.ts` (no `.d.ts.map`, no `.test.ts`) — zero-build in the browser, IntelliSense in the editor, and `update` diffs compare exact published bytes.
- `--ts` / `--typescript` vendors the `.ts` source instead (for projects with their own build). The choice is recorded in the config as `"language": "js" | "ts"` and **every later `add`/`update` honors it** — no mixed-language projects.

### Head: snippet file

`init` renders `buildHead({ base: "./<dir>" })` (from `src/head.ts`, executed out of the resolved tarball so the import-map pins/SRI always match the vendored version) to **`<dir>/head.html`**, and prints "paste this into your `<head>`". No HTML injection. This is what supplies the import map for the bare specifiers (`signal-polyfill`, `embla-carousel*`) the vendored scripts import — without it, module resolution fails. `HeadOptions` surface as flags: `--no-fonts`, `--no-theme-script`; `scripts: false` isn't offered (a scriptless project simply never adds a JS-carrying primitive; the import map is harmless). `update` regenerates `head.html` (it is CLI-owned, not user-owned — overwritten without a conflict prompt, called out in the docs).

### Legacy slot: flag only

`--legacy <path>` writes `@import "<path>" layer(legacy);` into the slot in the vendored `index.css`; recorded in config as `"legacy": "<path>"`. No interactive prompt — the commented slot plus docs teach the pattern for everyone else. **This settles the map's fog item** (legacy-migration ergonomics): flag + documented slot, nothing more.

### Target paths

Default **`zazz/` at the project root**; override with `--dir <path>` (recorded in config). No path prompts — detect-don't-ask per ticket 01. Files keep the tarball's relative layout beneath it (`<dir>/base/…`, `<dir>/primitives/<name>/…`), so relative imports between vendored files survive verbatim and never need rewriting.

### Config file: `zazz.json`

Written to the project root. Schema (shadcn's `components.json` lesson, minus the React/Tailwind axes):

```jsonc
{
  "$schema": "https://zazz.sh/schema.json", // final URL decided by ticket 08
  "kit": { "version": "0.1.0", "integrity": "sha512-…" }, // resolved @zazz-ui/core at init time (pacote manifest)
  "dir": "zazz",
  "language": "js",
  "legacy": null,
  "base": { "files": { "base/_variables.css": "sha256-…", "…": "…" } },
  "primitives": {}, // add fills: { "button": { "version": "0.1.0", "files": { … } } }
}
```

Per-file content hashes are recorded **at vendor time**; with the kit version they give `update` its 3-way-merge inputs (base = recorded version's tarball bytes, ours = local file, theirs = target version) and make "user edited this file" detectable without network. Exact hash algorithm and the `update` semantics belong to [ticket 05](05-add-update-contract.md).

### Prompts, flags, re-run

- **No prompts in the happy path.** Everything has a default or flag: `--dir`, `--ts`, `--legacy`, `--no-fonts`, `--no-theme-script`, plus the ticket-01 conventions `-y/--yes`, `--silent`, `-c/--cwd`, `--dry-run`, `--force`, and the ticket-02 network flags `--registry`, `--offline`, `--prefer-offline`. Kit version selection: `init [@version]` defaults to `latest`, resolved freshly via pacote (never trusting a dlx-cached CLI's idea of latest).
- **Re-run in an initialized project** (a `zazz.json` exists): no-op repair mode — report missing/modified base files against recorded hashes, restore missing ones, and touch nothing modified unless `--force`. It never re-prompts identity decisions (`dir`, `language`); changing those is manual (edit `zazz.json` + move files) in v1.
- Existing files at target paths without a `zazz.json` (partial/manual prior install): conflict prompt per file, `--force` to overwrite, per ticket 01.
