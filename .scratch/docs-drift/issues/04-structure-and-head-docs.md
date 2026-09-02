# 04 — Structure/meta docs drift (file-anatomy, reset, llms, head)

Status: open

## file-anatomy.mdx

- `:10` says source splits into `base/` and `ui/` — the directory is `primitives/`
- `:46-47` example claims `--ui-button-block-size: var(--step-8)` and
  `--ui-button-radius: var(--radius-md)` — actual defaults are `var(--ui-field-block-size)`
  and `var(--ui-field-radius)` (`button.css:42-43`), contradicting the page's own `:79`
- `:66` says `@requires` is required ("set to `none` for layers.css") — `_layers.css` has no
  `@requires` tag; `:62-71` tag table omits `@sublayers` (`_layers.css:5`)
- `:64` header format — base files use `file.css — Description` (em-dash), not
  `file.css: Component (.ui-selector)`

## reset.mdx

- `:72` cites `_checkbox.css`, `_slider.css`, `_switch.css`, `_select.css` — actual paths
  are `primitives/<name>/<name>.css`. Mirrors the stale header comment in `_reset.css:17-20`
  (fix that comment too).

## llms.mdx

- `:12-19` skill file table omits `design-styles/` (exists in `.claude/skills/zazz/`)

## head.mdx + head.ts

- `head.mdx:102-109` script load order lists the inline theme script 4th; it is emitted last
  (`head.ts:329`) but executes before the deferred `index.js`
- `head.mdx:46-53` font block omits the `<link rel="preload" as="font" … geist … .woff2>`
  that `head.ts:171` emits
- **head.ts functional gap** (source, not docs): the theme script only toggles `.dark` —
  a stored `"light"` choice does not pin `.light`, so it cannot override a dark system
  preference (`head.ts:223-226`). dark-mode.mdx's example (fixed in the first pass) pins
  both classes; head.ts should match. Also consider updating the
  `<meta name="color-scheme">` content for pre-CSS native UI.
