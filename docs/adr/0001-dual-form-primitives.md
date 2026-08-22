# Dual-form primitives: `ui-*` tags aliased to `ui-*` classes

Zazz primitives get two equivalent spellings — a tag form (`<ui-tooltip>`) and a class form (`<div class="ui-tooltip">`) — kept identical through **CSS selector aliasing** (`:where(ui-tooltip, .ui-tooltip)`), not through JavaScript. An unregistered custom tag is valid, styleable HTML, so `customElements.define()` remains reserved for primitives that carry behavior; the no-JS baseline and zero-FOUC property of the kit are preserved by construction.

## Decisions

1. **Prefix**: tags, classes, and **component-tier tokens** adopt a `ui-` prefix (`<ui-tooltip>`, `.ui-button`, `--ui-button-background--hover` — still derivable from the class name under the `--{component}-{property}--{state}` grammar). Semantic roles (`--background`, `--ring`), metrics (`--step-*`, `--radius-*`), and brand scales stay unprefixed as the deliberate Tailwind/shadcn-compatible theming surface. This supersedes the earlier "no component prefix on classes" rule in `CONVENTIONS.styles.md`.
2. **The most semantic tag wins** (raw HTML only): `ui-*` tags exist only where the root would otherwise be a meaningless `<div>`/`<span>`. Primitives rooted on semantic native elements (`<button>`, `<input>`, `<details>`, `<dialog>`, `<select>`, …) are class-form only — we never wrap or replace real semantics with a generic tag. Framework wrappers (JSX, Razor, …) may present any component API they like as long as their output honors this rule.
3. **Migrate the existing five** HTML web components: `slide-carousel` → `ui-carousel`, `media-lightbox` → `ui-lightbox`, `input-password` → `ui-password`, `tab-group` → `ui-tabs`, `toast-region` → `ui-toaster`; their bare attribute props (e.g. `label-show`) move to `data-*`.

## Considered options

- Registering an element per primitive that stamps the canonical class: rejected — makes a CSS-only kit JS-required, breaks the no-JS baseline, and flips every docs preview to loading the full module.
- Shadow DOM components: rejected long ago in `CONVENTIONS.scripts.md` — the theming model depends on global cascade layers and light-DOM markup.
- Keeping unprefixed classes (`.button`): rejected — generic names collide in consumer pages, and the package is early-alpha enough to rename cheaply.

## Consequences

- One-time breaking rename across ~35 primitives, example fragments, tokens, and the docs site.
- Every component selector must list both forms; this needs a convention (and ideally a lint) in `CONVENTIONS.styles.md`.
- Docs present two canonical spellings depending on the primitive (tag form where it exists, class form otherwise).
