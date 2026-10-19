---
applyTo: "**/*.html"
---

Write HTML for the Zazz kit with the current syntax (0.5 and later). The full rules are in [packages/core/AUTHORING.md](../../packages/core/AUTHORING.md); follow them. Copy a primitive's anatomy from `packages/core/src/primitives/<name>/<name>.html`.

The short version:

- Identity is `data-ui="button"` (space-separated tokens, e.g. `data-ui="card group"`). `class` is yours: a BEM class for styling the kit can't express, never a made-up `data-*` attribute or a non-utility custom property in `style` (`style` holds only utilities and `--ui-*` hooks; custom `data-*` is for script hooks).
- Variants are `data-<identity>-<key>`: `data-button-variant="primary"`. Parts are `data-<identity>-slot="header"`.
- Values are style utilities in `style`: `style="--px: 6; --gap: 6"`. Names are Tailwind's (`--justify`, `--items`; `border-radius` is `--radius`), values are CSS (`--justify: space-between`). Exactly one space after the colon. Numbers on spacing, sizing, and radius utilities are scale steps (`--radius: 2.5` is `--radius-md`).
- Breakpoint tiers `--grid-cols--md: 3` on flow, grid, spacing, margin, sizing, typography, and color utilities, plus `--radius`, `--elevation`, and the rings; state tiers `--bg--hover: …` on color, effects, and `--radius`.
- Shadows: `--elevation: 4` (a height) or `--shadow: var(--shadow-md)` (a token or any box-shadow). There are no size words (`--shadow: md` does nothing). A tier needs its base: `--text: currentColor; --text--hover: …`.
- Use tokens (`var(--space-*)`, `var(--color-<role>)`, `var(--radius-*)`, `var(--font-size-*)`); every `var(--…)` must exist in `packages/core/src/base/_variables.css`.
- Every `<input>`, `<select>`, and `<textarea>` gets a `name` (or, when it must not submit, an `id`); Chrome reports a field with neither.
- Retheme primitives with inheriting hooks (`--ui-button-bg--hover`) rather than utilities, which flatten states.
- Reference: the docs site at https://zazz.sh (API tables generated from the kit at `/api/`, Markdown twins at `…/index.md`, `https://zazz.sh/llms.txt` for an index).
