# 23 — Migrate engine (pure) + unit tests

Type: task
Status: claimed
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

## Comments
