# 23 — Migrate engine (pure) + unit tests

Type: task
Status: resolved
Blocked by: —
Size: M

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/cli/src/migrate.ts`
- `packages/cli/src/migrate.test.ts`

## Task

Pure, fs-free engine in `packages/cli/src/migrate.ts` (read `CONVENTIONS.scripts.md` and the CLI's existing seams `merge.ts`/`plan.ts` for style). API: `loadRules(json): Rules` (validate shape: kinds token|class-prefix|class|attr-value|manual), `compile(rules)`, `applyToText(text, compiled, { kind: "css"|"html"|"md"|"js" }) → { text, counts: Record<ruleId, number>, unmappable: { line, snippet, note }[] }`.
Transforms: token — one alternation regex, longest-first, boundary `(?<![\w-])NAME(?![\w-])`, single replace with map lookup (simultaneous by construction; `--gap-md` must not hit `--gap-md-foo`), applies in every file kind. class-prefix/class — only inside `class="…"`, `class='…'`, `className="…"` literals: tokenise on whitespace, rewrite by exact prefix/name, rejoin; in `.css` kind also rewrite escaped selectors `\@xs\:` via the same map. attr-value — `data-container="xs"` etc. manual — report only. Unmappable: `className={…}`, template literals containing a from-prefix, `[…]` arbitrary values.
Tests (vitest, packages/cli): the chain shift is simultaneous (`@xs:a @sm:b @xl:c` → `@sm:a @md:b @2xl:c`, nothing double-shifted); token boundaries; class rewrites don't touch prose/comments outside attributes; escaped css selectors; attr-value; unmappable detection with line numbers; token rules are idempotent (`apply∘apply` = apply). Inline the fixture JSON in the test (mirrors the shape of ticket 22).

## Answer

Landed `packages/cli/src/migrate.ts` (pure, fs-free, imports only `errors.ts`) and `packages/cli/src/migrate.test.ts` (18 tests). No command wiring; ticket 24 owns that.

### Public API

- `loadRules(json: unknown, source = "migration rules"): Rules` — accepts the JSON text or the parsed object; validates `{ from, to, rules[] }` and every rule (`kind` ∈ token | class-prefix | class | attr-value | manual; `from` required, no whitespace; `to` required and ≠ `from` on non-manual rules, forbidden on manual; tokens start with `--`; attr-value `from`/`to` are `attr=value` with the same attribute; duplicate `kind:from` rejected). Throws `ZazzError` with `<source> is not a valid migration file: <detail>`.
- `compile(rules: Rules): Compiled` — builds the alternation regexes (longest name first) and lookup maps. Adds the two built-in manual rules (`className={`, `[`) unless the file already declares those needles (the file's `note` then wins).
- `applyToText(text, compiled, { kind: "css" | "html" | "md" | "js" }) → { text, counts, unmappable }` — `counts` is keyed by `ruleId(rule)` = `` `${kind}:${from}` `` and holds only rules that fired; `unmappable` is `{ line (1-based), snippet, note }[]` sorted by line. No rewrite adds or removes a newline, so input line numbers hold for the output.
- `ruleId(rule)`, plus the types `Rule`, `Rules`, `RuleKind`, `FileKind`, `Compiled`, `ApplyResult`, `Unmappable`.

### Transforms

- **token** — one regex `(?<![\w-])(a|b|…)(?![\w-])`, single `replace` with map lookup: simultaneous, so `--breakpoint-xs→sm` and `--breakpoint-sm→md` never chain, and `--gap-md` leaves `--gap-md-foo` / `--x-gap-md` alone. Applies in every kind.
- **class-prefix / class** — only inside `class="…"`, `class='…'`, `className="…"`, `className='…'` literals (lookbehind excludes `:class`, `x-bind:class`, `data-class`, `el.className`). The value is split on whitespace (separators preserved, multi-line values fine); exact-name rules first, then longest matching prefix at the token start only. In `css` the same map also rewrites escaped selectors after a `.` (`.\@xs\:grid` → `.\@sm\:grid`); `[class*=":container"]` and string values are untouched.
- **attr-value** — `from: "data-container=xs", to: "data-container=sm"` rewrites `data-container="xs"` / `'xs'` wherever it appears (markup and CSS attribute selectors), one regex per run so the chain shift is simultaneous. `data-container-x` is not matched.
- **manual** — report only. A needle ending in `{` (e.g. `className={`) is searched in the raw text of every kind; any other needle (e.g. `[`) is searched inside class tokens, so `array[0]` in prose is never flagged. Hits are counted under the rule id.
- **Built-in probe** (`js` only, no rule): template literals whose text, with any embedded `class="…"` attributes removed, still contains a class prefix or exact class name are reported as ``template literal contains `@xs:`; rewrite by hand``. A line already reported for `className={` is not reported twice.

### Deliberate limitations

- Chain shifts (`@xs:→@sm:`, `--breakpoint-xs→sm`, `data-container` values) are simultaneous within a run but **not idempotent across runs**: a second pass shifts again. The `--gap-*→--space-*` and `--is-breakpoint-*→--bp-*` families are idempotent (tested). This is why ticket 24 must stamp `migrated` in zazz.json and refuse `from >= to`.
- Rewrites are textual: a `class="…"` literal inside an HTML comment or a JS string is rewritten too. Acceptable because the old name is wrong there as well.
- Not handled (by design, matching the ticket): `classList.add("@xs:…")`, `el.dataset.container = "xs"`, `setAttribute(...)`, Vue/Svelte binding expressions, `class:list`, JSX `style={{}}`. Escaped-selector rewriting is `css`-kind only (not inline `<style>` in html/md).
- Only `\@xs\:`-style escapes are recognised (the kit's hand-authored form), not hex escapes like `\40 xs\3a`.
- Snippets are trimmed, whitespace-collapsed, and capped at 80 characters.

### Notes for tickets 22 / 24

- attr-value rules are encoded as `attr=value` pairs in `from`/`to` (keeps ticket 22's `{ kind, from, to?, note? }` shape and reads naturally in the changelog table).
- The engine takes the rules text or parsed object; the command should pass the tarball path as `source` for error messages.
- Test fixture in `migrate.test.ts` mirrors the 0.5.0 rule set (tokens, prefixes incl. `@max-*`, `data-container`, the two manual rules) and can be diffed against `migrations/0.5.0.json` once it lands.

## Comments
