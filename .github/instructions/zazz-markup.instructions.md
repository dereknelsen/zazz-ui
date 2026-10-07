---
applyTo: "**/*.html"
---

Write HTML for the Zazz kit with the 0.5 syntax. The full rules are in [packages/core/AUTHORING.md](../../packages/core/AUTHORING.md); follow them. Copy a primitive's anatomy from `packages/core/src/primitives/<name>/<name>.html`.

The short version:

- Identity is `data-ui="button"` (space-separated tokens, e.g. `data-ui="card group"`). Never `class`.
- Variants are `data-<identity>-<key>`: `data-button-variant="primary"`. Parts are `data-<identity>-slot="header"`.
- Values are style utilities in `style`: `style="--px: 6; --gap: 6"`. Exactly one space after the colon. Numbers on spacing and sizing utilities are scale steps.
- Breakpoint tiers `--grid-cols--md: 3` on flow, grid, spacing, margin, sizing, typography, and color utilities; state tiers `--bg--hover: …` on color and effects. A tier needs its base: `--text: currentColor; --text--hover: …`.
- Use tokens (`var(--space-*)`, `var(--color-<role>)`, `var(--radius-*)`, `var(--font-size-*)`); every `var(--…)` must exist in `packages/core/src/base/_variables.css`.
- Retheme primitives with inheriting hooks (`--ui-button-bg--hover`) rather than utilities, which flatten states.
- Reference: the docs site at https://zazz.sh (API tables generated from the kit at `/api/`, Markdown twins at `…/index.md`, `https://zazz.sh/llms.txt` for an index).
