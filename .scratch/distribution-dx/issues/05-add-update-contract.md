# Define the add/update contract

Type: grilling
Status: resolved
Blocked by: 01, 04

## Question

How do `zazz-ui add <primitive>` and `zazz-ui update` behave?

Decide:

- Dependency resolution between primitives: `src/manifest.ts` covers only the 5 JS-carrying primitives (lightbox → carousel, etc.); css-only primitives have no machine-readable metadata. Does every primitive need a manifest entry (files + depends-on) in the published kit, and what shape does it take?
- What `add` copies (css, js when the primitive carries behavior, example html?) and how it appends the `@import` to the consumer's css entry.
- Update strategy: 3-way diff (base version from the recorded provenance, local file, new version) vs prompt-overwrite vs patch files — how local edits survive an update.
- How `update` uses the config file's recorded kit version + hashes; whether `update` is per-primitive, whole-kit, or both; how base-layer updates differ from primitive updates.
- Conflict UX: what the user sees when their edited file diverges.

Informed by [Research the shadcn CLI's anatomy](01-shadcn-cli-anatomy.md) and blocked on the config-file design from [Define the init contract](04-init-contract.md). On resolution, revisit the fog item **shadcn-registry-compat endpoint**: graduate it or move it to Out of scope.

## Answer

Resolved 2026-08-28 with Derek (grilling). His calls: no examples by default, merge-then-prompt conflict UX, whole-kit `update` default, shadcn-registry-compat moved out of scope.

### The manifest: every primitive gets an entry

`src/manifest.ts` grows from the current 5-entry script map into the kit's complete distribution manifest — one entry per primitive (css-only included), compiled in-place like everything else so the CLI imports the `.js` straight out of the extracted tarball. Shape (spec-level; field names are the implementer's):

```ts
interface PrimitiveEntry {
  css: string[]; // tarball-relative css files (usually one)
  js: string[]; // primitive script files in load order (e.g. select carries multiselect.js)
  base: string[]; // base/* scripts required, in load order (combobox → command-score, hotkeys, typeahead)
  primitives: string[]; // other primitives required (autocomplete → input; lightbox → carousel)
  bare: string[]; // bare npm specifiers its js imports (carousel → embla-carousel*), i.e. import-map needs
  examples: string[]; // example .html fragments (for --examples and the docs/configurator)
}
export const PRIMITIVES: Record<string, PrimitiveEntry>;
```

The same graph serves `add` (dependency closure), `update` (file inventory), the head-configurator's granular CDN mode (ticket 06), and `init` (which reads only the base-file list). Canonical css cascade order is manifest data too (the order of `src/index.css` — either an explicit index or derived from a template shipped in the tarball), because `add` must **insert** `@import` lines at the right cascade position, not blindly append. The existing `WEB_COMPONENT_SCRIPT_FILES` map either derives from `PRIMITIVES` or retires; the docs preview should consume the new manifest. A kit-side test asserts every `src/primitives/*` directory has a manifest entry and every listed file exists — the manifest can't drift.

### `add <primitive>...`

1. Resolves the target kit version: **the project's recorded `zazz.json` kit version by default** — never `latest` — so a project stays internally consistent; moving forward is `update`'s job. (`add <name>@<version>` is not offered; one kit version rules, see update granularity.)
2. Computes the dependency closure from the manifest: requested primitives + transitive `primitives` + `base` scripts. Already-vendored entries are skipped.
3. Copies: css always; js + d.ts (or `.ts` when `zazz.json.language == "ts"`); **no example html** — `--examples` copies the `examples` list beside the primitive on request.
4. Wires: inserts `@import` lines into `<dir>/index.css` at canonical cascade position; appends module imports to `<dir>/index.js` in dependency order. If any newly-vendored file has `bare` imports not yet in the head, regenerates `<dir>/head.html` (CLI-owned per ticket 04; today the import map is version-static so this is usually a no-op).
5. Records in `zazz.json.primitives[name]`: `{ version, files: { path: sha256 } }` — hashes of the **pristine tarball bytes** at vendor time (never the user's on-disk state), so "user edited this" stays detectable forever.
6. Conflict on an existing file it didn't expect: prompt (overwrite/skip), `--force` to overwrite, per the ticket-01 conventions. `--dry-run` prints the closure + file plan.

### `update` — whole-kit default, true 3-way merge

- **Granularity**: bare `update [@version]` (default `latest`, freshly resolved) moves _everything vendored_ — base files, all primitives, `head.html`, `zazz.json` — in one transaction. `update <name>...` narrows to named primitives **plus the base files their new versions require**; narrowing can leave per-primitive version skew (the `zazz.json` schema records per-primitive versions precisely for this), which the CLI tolerates and `status` reports, but docs teach whole-kit as the norm.
- **Per-file algorithm** (base = pristine bytes of the _recorded_ version — from the npm-cached tarball, ours = local file, theirs = target version's bytes):
  - local hash == recorded hash (pristine) → take theirs silently.
  - upstream unchanged (base == theirs) → keep ours, just re-record.
  - edited + upstream changed → `git merge-file`-semantics 3-way merge: clean hunks auto-merge; a **real conflict prompts per file**: `[k]eep mine / [t]ake theirs / [m]arkers in-file / [s]kip`. Flags `--keep` / `--theirs` / `--markers` preselect for CI; non-interactive with no strategy flag → skip the file, report, exit non-zero.
- **Transaction**: the plan is computed and merged against a staging copy first; files land only when the whole update succeeds, then `zazz.json` is rewritten once (new kit version, new pristine hashes — for a `[k]eep` the _new_ pristine hash is still recorded, keeping the file "edited" relative to its version). `head.html` is regenerated unconditionally. `--dry-run` prints the full plan with per-file dispositions.
- **`diff`**: `zazz-ui diff [name] [@version]` shows both views shadcn can't: local-vs-target _and_ upstream-vs-upstream ("what changed in button between the recorded 0.2.0 and 0.4.0") — both from exact published tarball bytes, so style-noise false positives are impossible. Uses the npm cache; works offline for cached versions.
- **Base-layer updates** are not special: base files are inventory like any other, they just belong to the "kit" rather than a primitive (`zazz.json.base`). The one distinction: bare `update` always includes them; named narrowing includes only the base files in the named primitives' closures.

### Fog item: shadcn-registry-compat endpoint → Out of scope

Moved to the map's Out of scope. The manifest deliberately carries the same facts a shadcn registry item needs ({files, npm deps, inter-item deps}), so emitting registry JSON at docs-build time stays a cheap future add-on — but no endpoint work in this effort.
