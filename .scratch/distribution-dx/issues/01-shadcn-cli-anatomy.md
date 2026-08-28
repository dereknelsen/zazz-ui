# Research the shadcn CLI's anatomy

Type: research
Status: resolved

## Question

How does the north-star CLI (https://ui.shadcn.com/docs/cli) actually behave, and which patterns transfer to a no-build vanilla css+js kit?

Cover:

- `init` flow: what it prompts for, what it writes (`components.json` schema — fields, why each exists), how it detects the project's shape.
- `add` flow: item resolution, dependency handling between registry items, where files land, how conflicts with existing files are handled.
- Update/`diff` story: what shadcn actually offers for updating vendored components, and where its users report pain.
- Registry-item schema: what one item declares (files, types, dependencies, css vars).
- Error and offline behavior worth imitating or avoiding.
- Explicitly separate: which behaviors are React/Tailwind-specific (to reject) vs transferable to Zazz's vendor-from-npm-tarball model.

Findings feed [Define the init contract](04-init-contract.md) and [Define the add/update contract](05-add-update-contract.md).

## Answer

Researched 2026-08-24 against the live shadcn docs (CLI v3 era: presets, base libraries, namespaced registries) and the project's GitHub issue tracker. Sources are cited inline; everything below is stated so tickets 04/05 can act on it without re-fetching.

### 1. `init` flow

Source: https://ui.shadcn.com/docs/cli, https://ui.shadcn.com/docs/components-json

`init` bootstraps configuration and baseline dependencies for an existing project, or scaffolds a new one (`-n/--name` creates a project; `-t/--template` picks the framework scaffold: next, vite, start, react-router, laravel, astro). What it does:

- **Detects the project's shape** rather than asking: framework (Next.js vs Vite etc., which decides where the global CSS lives and whether RSC applies), TypeScript vs JS, Tailwind version, import-alias configuration (from `tsconfig`/`jsconfig` `paths` or `package.json#imports`), and monorepo layout (`--monorepo` scaffolds a workspace setup; in monorepos you point commands at the workspace holding `components.json` via `-c/--cwd`). Detection failures surface as prompts, not errors.
- **Prompts** (all skippable — `-y/--yes` defaults to true, `-d/--defaults` takes next-template + nova-preset): base component library (`-b/--base`: base, radix, aria), preset (`-p/--preset`), CSS-variables theming vs utility classes (`--css-variables`/`--no-css-variables`), RTL, pointer cursors.
- **Writes**: `components.json` at the project root, installs npm dependencies, adds the `cn()`/utils helper, and injects CSS variables (theme tokens) into the project's global stylesheet. `-f/--force` overwrites an existing configuration.

Notable: recent versions are prompt-light by design — everything has a detected or flagged answer, so `init` runs non-interactively in CI/agent contexts. The `-c/--cwd` flag on _every_ command (not just init) is the monorepo answer.

### 2. `components.json` schema

Source: https://ui.shadcn.com/docs/components-json

Fields and why each exists:

- `$schema` — `https://ui.shadcn.com/schema.json`, for IDE validation/autocomplete.
- `style` — visual design system variant (`"new-york"`; `"default"` deprecated). Immutable after init because already-vendored files were generated in that style.
- `tailwind.config` — path to the Tailwind config (blank for Tailwind v4); `tailwind.css` — path to the CSS file that imports Tailwind, i.e. where the CLI injects theme CSS; `tailwind.baseColor` — palette the theme tokens are generated from (immutable post-init); `tailwind.cssVariables` — semantic-token theming vs inline utilities (immutable; switching means reinstalling every component); `tailwind.prefix` — utility-class namespace to avoid collisions.
- `rsc` — whether to emit `"use client"` directives; `tsx` — emit `.tsx` vs transpile-to-`.jsx`.
- `aliases` (`components`, `ui`, `utils`, `lib`, `hooks`) — the _import specifiers_ the user's code uses; the CLI maps them through tsconfig paths to real directories, decides where each file type lands, and **rewrites imports inside vendored files** to match. This is the machinery that lets registry source reference `@/lib/utils` and land correctly in any project layout.
- `registries` — namespace → URL template (`"@v0": "https://v0.dev/chat/b/{name}"`) or an object with `url` + `headers` (auth tokens via env-var interpolation) for private registries.
- The whole file is optional if the user copy-pastes instead of using the CLI.

Design lesson: `components.json` exists because shadcn must bridge _arbitrary_ project layouts and build stacks. Most of its fields answer "where do things go and how do imports resolve" — questions that need answering once, at init, so `add` never asks again.

### 3. `add` flow

Source: https://ui.shadcn.com/docs/cli, https://ui.shadcn.com/docs/registry/registry-item-json

- **Item resolution**: `add` accepts bare names (resolved against the default shadcn registry), namespaced names (`@acme/auth`, resolved via `components.json#registries`), direct URLs to a registry-item JSON, and local file paths. `search`/`list` and `view` let users discover and preview items pre-install; `--dry-run` previews the change set without writing.
- **Dependency handling**: for each item the CLI (documented order) resolves `registryDependencies` recursively (other registry items, by name/namespace/URL/path — deduplicated across the graph), installs npm `dependencies`/`devDependencies`, copies files, merges `cssVars` into the theme, appends `css` rules to the stylesheet, adds `envVars` (never overwriting existing ones), and prints the item's `docs` message.
- **Where files land**: each file's registry `type` maps to a configured alias directory (ui → `aliases.ui`, hook → `aliases.hooks`, lib → `aliases.lib`, …); `registry:page` and `registry:file` require an explicit `target` path, which supports placeholders (`@components/`, `@ui/`, `@lib/`, `@hooks/` resolve to the user's configured dirs; `~` is project root). `-p/--path` overrides the destination.
- **Conflicts**: an existing file is _not_ silently clobbered — the CLI prompts unless `-o/--overwrite` is passed. `add --diff [path]` displays differences between what's on disk and what the registry would write, and `--view` shows incoming file contents. There is no merge: the options are keep, overwrite, or eyeball the diff and merge by hand.

### 4. Update/`diff` story — the weak spot

Sources: https://github.com/shadcn-ui/ui/discussions/790, https://github.com/shadcn-ui/ui/discussions/7170, https://github.com/shadcn-ui/ui/issues/2121, https://github.com/shadcn-ui/ui/issues/2619, https://github.com/shadcn-ui/ui/issues/1202, https://github.com/shadcn-ui/ui/issues/5427

shadcn's official position is "the code is yours; you are responsible for updating it." The tooling for that responsibility is thin, and it is the single loudest complaint category:

- The standalone `diff` command shipped as _experimental_ and stayed that way for years; today the docs only list `add --diff`. Reported failures: false positives from pure code-style differences — quotes, semicolons (#1202); "No updates found" even when upstream changed (#5427).
- **The two-sided-diff problem** (#2121): the CLI can only compare _local file vs latest upstream_. It cannot show _originally-installed upstream vs latest upstream_, because it never records which version a file was vendored from. So every diff mixes the user's intentional customizations with upstream changes, and the user must mentally subtract their own edits. Proposed fix in the issue — record the base version and do a 3-way merge — was never implemented; the issue went stale.
- **No version identity for registry items** (#7170): the registry serves only "latest". There is no way to ask for `button@1.2`, no per-item changelog integration in the CLI, and no way to answer "what changed upstream since I vendored this."
- Community workarounds are telling: keep a pristine, unmodified copy of every component next to the customized one and 3-way merge by hand; or never edit component internals (only wrap/override), which defeats the point of vendoring (#790, #7170, #2619). #2619 argues the blunt `diff`+overwrite loop is "antithetical to the point" — an unversioned update mechanism that reverts customizations is just a worse component library.
- Vercel's own academy course teaches `git diff` + manual review as the real update workflow (https://vercel.com/academy/shadcn-ui/updating-and-maintaining-components).

**Zazz should design around this from day one, and the vendor-from-npm-tarball decision (ADR-0006) makes it cheap**: npm gives every vendored file a real version identity for free. The `add`/`update` contract (ticket 05) should (a) record, per vendored primitive, the exact `@zazz-ui/core` version it came from (lockfile-style, in the init-written config); (b) implement update as a **3-way merge**: base = the file from the recorded version's tarball, theirs = the file from the target version's tarball, ours = the user's file — with clean auto-merge when the user never touched the file and conflict markers (or a keep/overwrite/skip prompt) when they did; (c) let `diff` show _upstream-vs-upstream_ ("what changed in button between 1.2.0 and 1.4.0") as well as _local-vs-upstream_, because npm retains every published tarball. This is precisely the capability shadcn structurally cannot offer without versioned registry items.

### 5. Registry & registry-item schema

Sources: https://ui.shadcn.com/docs/registry, https://ui.shadcn.com/docs/registry/registry-json, https://ui.shadcn.com/docs/registry/registry-item-json

- A registry is a static-JSON contract: a `registry.json` index (`$schema`, `name`, `homepage`, `items[]`, optional `include` for composing registries; item names must be unique across the resolved registry) plus one JSON endpoint per item. `shadcn build` compiles `registry.json` + sources into flat per-item JSON (default `./public/r`) — hostable anywhere static files can live, including GitHub. The docs stress the registry system "works with any project type and any framework, and is not limited to React."
- A registry item declares: `name`, `type` (`registry:base`, `registry:block`, `registry:component`, `registry:ui`, `registry:hook`, `registry:lib`, `registry:font`, `registry:page`, `registry:file`, `registry:style`, `registry:theme`, `registry:item` — type drives install location), `title`/`description`/`author`/`categories`/`meta`, `files[]` (`path`, `type`, `target`), `dependencies`/`devDependencies` (npm, `pkg` or `pkg@version`), `registryDependencies` (bare name / `@namespace/name` / `owner/repo/item#v1.0.0` / URL / relative path), `cssVars` (`theme`/`light`/`dark` buckets, merged into the project theme), `css` (rules by layer, appended to the stylesheet), `envVars`, `docs` (post-install message), and a deprecated `tailwind` block.
- For Zazz the _schema shape_ is the useful part, not the transport: per-item metadata of {files, npm deps, inter-item deps, css-variable contributions, post-install notes} is exactly what `packages/core`'s `src/manifest.ts` should grow into so the CLI can resolve "button needs base layers + tokens + utils" from inside the tarball. The "Not yet specified: shadcn-registry-compat endpoint" idea in map.md would mean emitting this exact JSON via `shadcn build`-style tooling — the schema is public and framework-agnostic, so compatibility is feasible later without changing Zazz's own model.

### 6. Error and offline behavior

- **Worth imitating**: conflict prompts instead of silent overwrite, with `--overwrite`/`--yes` escape hatches and `--dry-run`; `-c/--cwd` on every command; `--silent` for scripted use; per-item `docs` messages surfaced at install time; `view`/`search` for pre-install inspection; init that _detects_ rather than interrogates, so the whole CLI is non-interactive-safe.
- **Worth avoiding**: shadcn's CLI is network-dependent for every operation — items are fetched from registry HTTP endpoints at `add` time, with no offline story and no local cache the docs acknowledge; a registry outage or URL change breaks `add` entirely (the docs' answer to private-registry auth failures is env-var headers, nothing about resilience). Zazz gets a better story for free: the npm tarball flows through the npm cache, so `zazz-ui add` works offline once the version has been fetched, and pinning `@zazz-ui/core@<version>` makes every operation reproducible. The map's "CLI politeness" note should claim this explicitly: offline = whatever npm's cache allows, with a clear error ("cannot reach npm and @zazz-ui/core@x.y.z is not cached") rather than a hang.

### 7. Transfer map: adopt vs reject

**Transfers to Zazz (adopt, adapted to the tarball model):**

- One config file written by `init`, consumed by every later command: schema-validated, records target directories and the vendored-from version(s). Zazz's analog needs far fewer fields (no rsc/tsx/style/tailwind) — roughly: css entry path, primitives target dir, scripts target dir, pinned `@zazz-ui/core` version, per-primitive vendored-version records.
- Detect-don't-ask `init`; `-y`/`--silent`/`--cwd`/`--dry-run`/`--overwrite` flag conventions; conflict prompt on existing files.
- `add <name>` with recursive inter-primitive dependency resolution from a manifest (Zazz's manifest lives _inside_ the tarball instead of behind HTTP).
- Type-tagged files that map to configured target directories (Zazz: css vs script vs example-html; base layers vs primitive files).
- `cssVars`-style theme merging concept — Zazz's analog is ensuring `src/base/` token layers are present and imported once, not re-vendored per primitive.
- Post-install `docs` notes; `view`/`search`/`list` discovery commands; `info` printing resolved config.

**React/Tailwind-specific (reject):**

- `rsc`/`"use client"` handling, `tsx` vs `jsx` transpilation, hooks as a file category.
- Everything under `tailwind.*` (config path, baseColor, prefix, cssVariables-vs-utility mode) and `style` variants — Zazz has one design system with token-based theming; no equivalent axis exists.
- Import-alias rewriting through tsconfig `paths` — Zazz ships plain CSS `@import`/ESM relative imports; the CLI needs only to keep _relative_ paths correct between vendored files, a much smaller problem. (Do verify/rewrite relative imports when the user picks nonstandard target dirs.)
- Registry HTTP endpoints, namespaced third-party registries, registry auth headers, `build` — ADR-0006 explicitly replaces the transport with the npm tarball; no registry server.
- `migrate` codemods (icons/base-color/radix/rtl), presets/`apply`/`preset` codes, `eject`, framework scaffolding templates — all tied to shadcn's React/Tailwind ecosystem breadth; out of scope for a spec-stage CLI (a future `migrate` for Zazz breaking changes is conceivable but is an update-contract concern, not v1).

**Complaint-driven design-arounds (the headline finding):** shadcn's vendoring model is loved, but its update story is its most-reported failure — unversioned registry items, a diff that can't separate "my edits" from "upstream changes", style-noise false positives, and manual 3-way merging as the community's best practice. Zazz's npm-tarball registry gives version identity, historical tarballs, and offline caching for free; ticket 05 should make the recorded-base-version 3-way merge the centerpiece of the update contract, and generate diffs from _exact published bytes_ (no reformatting between publish and vendor, which `packages/core`'s compile-in-place `.js` already satisfies) so style-noise false positives can't happen.
