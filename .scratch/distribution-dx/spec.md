# Zazz distribution spec

Assembled: 2026-08-28 · Status: complete (pending Derek's final review)
Sources: every resolved ticket under [issues/](issues/) and ADRs [0005](../../docs/adr/0005-single-package-per-file-cdn.md), [0006](../../docs/adr/0006-cli-vendors-from-npm-tarball.md), [0009](../../docs/adr/0009-provenance-recorded-three-way-update.md), [0010](../../docs/adr/0010-kit-first-independent-versioning.md). Where this document and a ticket disagree, the ticket's Answer wins; this is the consolidation, not a new decision layer.

## 1. Shape of distribution

One published package, `@zazz-ui/core`, serves both surfaces (ADR-0005):

- **CDN**: jsDelivr URLs into the tarball — bundle grain (`dist/zazz.css` + `dist/zazz.js`) or per-file grain (`src/...`).
- **CLI**: unscoped `zazz-ui` (placeholder `0.0.0` live since 2026-08-28; scope `@zazz-ui` controlled via the `zazz-ui` org — ownership facts in [ticket 03](issues/03-reserve-npm-names.md)). It vendors files out of the npm tarball — npm is the registry; there is no registry server (ADR-0006). Users own their copies; updates are provenance-recorded 3-way merges (ADR-0009).

Vocabulary: "primitive", never "component"; the copy model is "vendor" (CONTEXT.md).

## 2. Kit-side requirements (prerequisites to first publish)

From tickets [05](issues/05-add-update-contract.md), [06](issues/06-cdn-dropin-spec.md), [07](issues/07-versioning-release-policy.md):

1. **Complete manifest** — `src/manifest.ts` grows to one entry per primitive:
   `PRIMITIVES: Record<name, { css, js, base, primitives, bare, examples }>` (tarball-relative paths, load order; `primitives` = inter-primitive deps like autocomplete → input; `bare` = import-map needs like embla). Plus the canonical css cascade order and an exported `manifestVersion` integer (starts at 1; bumping it is a breaking change). A kit test asserts every `src/primitives/*` dir has an entry and every listed file exists. `WEB_COMPONENT_SCRIPT_FILES` derives from it or retires.
2. **`dist/sri.json`** — `{ "<path>": "sha384-…" }` for every published css/js file (dist + src), generated at build before `vp pack`.
3. **`buildHead` CDN mode** — `buildHead({ cdn: { version, primitives? } })` emitting pinned+SRI jsDelivr heads (bundle or granular from the manifest graph); `@zazz-ui/core/head` becomes documented public API under semver.
4. **`CHANGELOG.md`** in the tarball (add to `files`), entries scoped per primitive/base (conventional-commit scopes), breaking items flagged with migration notes.

## 3. CDN story (ticket 06)

- Bundle leads: two pinned URLs with `integrity` + `crossorigin="anonymous"`. Granular (css and js both first-class) uses explicit tags, never `@import` chains; js needs the import map + the manifest's dependency chain — always generated (configurator/`buildHead`), one worked example in docs.
- **Always exact versions in URLs** — SRI is per-byte; `@latest` is never taught. Upgrading = regenerate the head block for the new version.
- Relative imports between kit files resolve natively on jsDelivr; only bare specifiers need the map.

## 4. CLI contract

### `init [@version]` (ticket 04)

- Vendors **base only**: all 7 base css layers; core runtime `utils`, `signals`, `zazz-element`, `dialog-lifecycle` (primitive-tied base scripts ride in with `add`); rewritten `<dir>/index.css` (base imports, `layer(legacy)` slot, empty primitives section, `_utilities`+`_layout` last) and `<dir>/index.js`; renders `<dir>/head.html` via the tarball's own `buildHead` (CLI-owned — regenerated on update, no conflict prompt).
- Language: `.js` + `.d.ts` default; `--ts`/`--typescript` vendors `.ts` source; recorded as `zazz.json.language`, honored by all later commands.
- `--legacy <path>` wires `@import "<path>" layer(legacy);` (flag only — settles the legacy-ergonomics fog item). `--dir <path>` (default `zazz/` at project root; tarball-relative layout preserved beneath so relative imports never need rewriting).
- No happy-path prompts. Flags: `--dir`, `--ts`, `--legacy`, `--no-fonts`, `--no-theme-script`, `-y/--yes`, `--silent`, `-c/--cwd`, `--dry-run`, `--force`, `--registry`, `--offline`, `--prefer-offline`. Version default `latest`, resolved freshly (never trusting a dlx-cached CLI). Re-run = repair mode; pre-existing files without `zazz.json` = per-file conflict prompt.

### `zazz.json` (tickets 04/05, ADR-0009)

```jsonc
{
  "$schema": "…", // URL settled by docs implementation
  "kit": { "version": "0.1.0", "integrity": "sha512-…" },
  "dir": "zazz",
  "language": "js",
  "legacy": null,
  "base": { "files": { "<path>": "<sha256 of pristine tarball bytes>" } },
  "primitives": { "<name>": { "version": "0.1.0", "files": { "<path>": "sha256-…" } } },
}
```

Hashes are always of pristine published bytes at vendor time — never on-disk state — so edits stay detectable. Rewritten once per successful operation (transactional).

### `add <primitive>...` (ticket 05)

Resolves at the **project's recorded kit version** (never latest; moving forward is `update`'s job) → manifest dependency closure (primitives + base scripts, vendored deps skipped) → copies css + js/d.ts (or ts) — **no examples** unless `--examples` → inserts `@import` at canonical cascade position in `index.css`, appends module imports to `index.js` in dependency order, regenerates `head.html` if import-map needs changed → records provenance. Unexpected existing file: prompt / `--force`. `--dry-run` prints closure + plan.

### `update [@version] [name...]` and `diff` (ticket 05, ADR-0009)

- Bare `update` = whole vendored tree (base, primitives, `head.html`, `zazz.json`) in one staged transaction, default target `latest` freshly resolved. Named narrowing allowed (skew recorded per primitive, tolerated, discouraged; base files in the named closures ride along).
- Per file: pristine → take theirs; upstream unchanged → keep ours; both changed → 3-way merge, conflicts prompt `[k]eep/[t]heirs/[m]arkers/[s]kip` (`--keep`/`--theirs`/`--markers`; non-interactive without a strategy → skip + exit non-zero). A kept file still re-records the new pristine hash.
- `diff [name] [@version]`: local-vs-target **and** upstream-vs-upstream from exact tarball bytes (no style-noise false positives); prints the changelog slice for touched primitives. Offline-capable from the npm cache.

### Fetch mechanics (ticket 02)

`pacote` (`manifest()` + `extract()` with explicit `integrity`) is the single fetch mechanism; `.npmrc` loaded via `@npmcli/config` and passed flat; cache dir `~/.cache/zazz-ui` (cacache layout); `preferOffline` for exact versions, `preferOnline` for tags/ranges; 429/retry/proxy/mirror semantics inherited from npm's own stack.

## 5. Versioning & release (ticket 07, ADR-0010)

- **Kit first**: publish gate = spec assembled ✓ + §2 artifacts building + changelog; mechanical flip = drop `"private": true`, restore `prepublishOnly` to `vp run build`, version 0.1.0, manual `pnpm publish` by Derek. CLI and docs do not gate the kit; CLI replaces its placeholder when built and e2e-tested against the published kit.
- **Independent versions**; CLI declares its supported kit range via `manifestVersion` (graceful "upgrade the CLI" failure). **0.x semver**: 0.MINOR = breaking (css var/data-attr/slot/head/manifest/schema/browser-floor changes), patch = additive. Immutable versions; deprecate, never unpublish.
- Mechanics: `bumpp`, per-package tags `core-v*`/`cli-v*`. Checklist: `vp check` + tests green → `vp run build` → changelog → bump/tag → publish → `npm view` + jsDelivr spot-check → GitHub Release.

## 6. Docs (ticket 08)

One Installation page, site-wide persistent tabs **CLI (default) | CDN | Manual** (Manual mirrors the CLI layout so it upgrades cleanly). Every primitive page gets a manifest-generated install block honoring the tab (add snippet with closure note / pinned+SRI per-file CDN set / manual file list + existing markup). Head-configurator page rendered by `buildHead` CDN mode + `dist/sri.json`. `llms.txt` + per-page raw markdown, leading with the distribution facts (command shapes, CDN URL patterns, manifest location). Lands close behind 0.1.0, not gating it. Suggested order: llms.txt + install blocks → tabs → configurator.

## 7. Implementation handoff

**CLI home & toolchain** (grilled 2026-08-28): `packages/cli` in this workspace; tsdown via `vp` to a single ESM bin; **node >= 20** engines (broader than the repo's own floor — dlx runs in arbitrary environments); dependencies `pacote`, `@npmcli/config`, plus an args/prompts lib of the implementer's choice. E2e tests vendor from a locally `vp pack`ed tarball; the published-kit e2e happens after 0.1.0.

**Suggested execution order** (each its own effort/PR):

1. Kit: manifest expansion + drift test + `manifestVersion` (unblocks everything).
2. Kit: `sri.json` generation + `buildHead` CDN mode + changelog file.
3. **Publish `@zazz-ui/core@0.1.0`** → CDN live.
4. Docs: llms.txt + install blocks + Installation tabs (needs the published version for URLs).
5. CLI: `init` → `add` → `update`/`diff`, e2e against 0.1.0; publish `zazz-ui@0.1.x` over the placeholder.
6. Docs: head configurator.

**Facts an implementer needs**: npm ownership per [ticket 03](issues/03-reserve-npm-names.md) — publishes are manual and interactively confirmed, no automation tokens; registry commands fail inside the repo root (`devEngines` pins pnpm) — run them elsewhere. The tarball `files` allowlist (`dist`, `src`, `examples`, no tests) is the CLI's entire supply chain.

**Politeness posture**: no telemetry, no phone-home update checks (dlx usage fetches a fresh CLI; kit-version freshness is guaranteed by fresh registry resolution per ticket 02); offline = npm cache semantics with a clear "cannot reach npm and @zazz-ui/core@x.y.z is not cached" error.

**Out of scope** (map): framework wrappers; shadcn-registry-compat endpoint (manifest keeps the door open); CI publish automation until cadence demands it.
