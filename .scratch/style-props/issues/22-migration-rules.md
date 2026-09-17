# 22 — migrations/0.5.0.json + files entry + migrations.test.ts

Type: task
Status: claimed
Blocked by: 03, 05, 08
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/migrations/0.5.0.json`
- `packages/core/package.json`
- `packages/core/src/migrations.test.ts`

## Task

Create `packages/core/migrations/0.5.0.json`: `{ "from": "0.4", "to": "0.5.0", "rules": [ … ] }`, rule = `{ kind, from, to?, note? }`, kind ∈ `token | class-prefix | class | attr-value | manual`. Rules: tokens `--is-breakpoint-{xs,sm,md,lg,xl}` → `--bp-{sm,md,lg,xl,2xl}`; `--breakpoint-{xs..xl}` → `--breakpoint-{sm..2xl}`; `--gap-{xs..xl}` → `--space-{xs..xl}`; class-prefix `@xs:`→`@sm:` … `@xl:`→`@2xl:` and `@max-xs:`…`@max-xl:` likewise; attr-value `data-container` `xs..xl` → `sm..2xl`; manual: `className={` (JSX expression), `[` arbitrary values. Add `"migrations"` to `files` in package.json. `src/migrations.test.ts`: JSON validates (kinds, no self-maps, class-prefix mapping is a bijection over disjoint from/to sets so it is safe as a simultaneous map), and — drift guard — every non-manual rule appears as a `| \`from\` | \`to\` |` table row inside the `## 0.5.0` block of `CHANGELOG.md` and vice-versa (skip that half with a clear message until ticket 26 lands; the merger enables it).

## Answer

## Comments
