<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

# Browser support policy

Target: latest Chrome, Firefox, and Safari, two versions back. For features below that floor: feature-detect and conditionally load a polyfill if one exists; otherwise design a graceful fallback (e.g. customizable `<select>` degrades to the native picker); if neither is practical, the feature is not viable yet. Exceptions are allowed but must be recorded (in an ADR or the component's CSS header). As of 2026-08, `sibling-index()`/`sibling-count()` is _not_ yet an exception (no stable Safari support; requires an `@supports` fallback).

# Repository layout

- `packages/core`: `@zazz-ui/core`, the Zazz Design Framework (published to npm; releases follow the `zazz-version-bump` skill). Components are co-located under `src/primitives/<name>/` (css + ts + example html); base layers and shared runtime under `src/base/`; entries `src/index.css` / `src/index.ts`. Scripts are TypeScript compiled in-place to readable `.js` + `.d.ts` (gitignored, published). Authoring rules: `packages/core/CONVENTIONS.styles.md` and `packages/core/CONVENTIONS.scripts.md`.
- `packages/cli`: `zazz-ui`, the CLI that vendors the kit into a project (`init`, `add`, `update`, `diff`); ADR-0006 and ADR-0009.
- `packages/eslint-plugin`: `@zazz-ui/eslint-plugin` (private), the `<ui-debug>` audit as html lint rules. Both share `packages/core/src/primitives/debug/audit-core.ts`; identities and hooks come from the generated `packages/core/editor/zazz.lint-data.json`. Wired up in the root `eslint.config.ts` (HTML only; Oxlint owns JS/TS) and run with `vp run lint:html`.
- `packages/language-server`: `@zazz-ui/language-server` (private), an LSP server for Zazz in HTML. `src/html/` is the html-eslint adapter the ESLint plugin also uses; `src/service/` holds one pure module per feature (diagnostics, completion, hover, inlay hints, folding, imports, head-block auto-imports), reading `packages/core/editor/zazz.language-data.json` (identity owners, CSSDoc headers, hook defaults, resolved tokens).
- `packages/vscode`: `zazz-vscode` (private), the VS Code extension: a thin client over the server, plus a generated TextMate injection grammar, fragment snippets, Emmet abbreviations, color swatches, and page templates. `vp run zazz-vscode#package` builds a `.vsix`; the repo's `.vscode/settings.json` assumes it is installed (Zazz squiggles and `source.fixAll.zazz` on save come from it). The `zazz.languages` setting extends the features to templating languages (`astro`, `razor`, `erb`, `phoenix-heex`, …); the server masks their expressions before parsing (`packages/language-server/src/html/holes.ts`).
- `apps/experiments`: a private Vite app (package name `playground`) for authoring UI patterns against the kit by hand (`vp run playground`). It imports `@zazz-ui/core` sources from the workspace, so core edits hot-reload; `<ui-debug>` runs in dev.
- `apps/docs`: the documentation site (Astro 7 + Markdoc + Pagefind, built with Zazz itself). Content is `.mdoc` under `src/content/{docs,api,blog}`; the API reference tables are generated at build from the kit's data (`src/lib/api/*`), and `src/pages/zazz/[...path].ts` serves the kit's `src/` and `dist/` at `/zazz/*` for previews and the playground. `vp run docs#dev` / `docs#build` / `docs#test` / `docs#links` / `docs#check` (`astro check`, which runs on the TypeScript 6 pinned in this app only; the rest of the repo uses 7). Astro 7's `dev` and `preview` are daemons (`astro dev stop|status|logs`).

When building or styling UI anywhere in this repo, use the Zazz design system: markup rules in `packages/core/AUTHORING.md` (identities, presets, slots, utilities), design guidance in the `zazz` skill (`.claude/skills/zazz/`). Cursor and Copilot read the same rules through `.cursor/rules/zazz-markup.mdc` and `.github/instructions/zazz-markup.instructions.md`.

## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/` in this repo. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
