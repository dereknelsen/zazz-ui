# Zazz patterns & best practices

Page-level structure and house-style conventions. The primitives and components
(`references/components.md`) already cover most UI — this file holds the conventions that
apply everywhere plus the handful of compositions the components don't. Syntax rules are in
`packages/core/AUTHORING.md`.

## Sentence case, always

Write **all** UI text in sentence case — headings, subheadings, body copy, buttons, links,
labels, nav items, form placeholders, everything. Capitalize only the first word and proper
nouns:

- "Add to cart" — not "Add To Cart"
- "The art of typography" — not "The Art Of Typography"
- "Contact us" — not "Contact Us"

Only deviate when the user explicitly asks for a different case. (The all-caps look of an
eyebrow comes from the `text-eyebrow` role's `text-transform`, so you still _author_ it in
sentence case.)

## Page structure

The standard page: a `<header>` with logo + desktop nav + mobile nav, a `<main>` of
`<section>`s, and a `<footer>`. `data-ui="layout"` makes an element the band grid for its
children (default band `xl`); `<section>`s own the vertical rhythm with `--py`. The desktop nav
is `--display: none; --display--sm: flex`; the mobile control is
`--display: flex; --display--sm: none` and opens a dialog (see the mobile-menu fragment). Change
the default band with `data-layout-size="md"` on the layout, or place one child with
`--band: layout-bleed | layout-full | layout-2xl … layout-sm`.

```html
<body style="--bg: var(--color-background)">
  <header data-transition-layer="global-header" style="--border-b: 1">
    <div data-ui="layout">
      <div style="--display: flex; --items: center; --justify: space-between">
        <a href="/"><!-- site logo --></a>
        <nav style="--display: none; --display--sm: flex; --items: center; --py: 8">
          <menu style="--display: flex; --items: center; --gap: 4">
            <li><a data-ui="button" data-button-variant="ghost" href="/">Home</a></li>
            <!-- navigation links and menus -->
          </menu>
        </nav>
        <nav style="--display: flex; --display--sm: none">
          <!-- mobile navigation: copy primitives/mobile-menu/mobile-menu.html -->
        </nav>
      </div>
    </div>
  </header>
  <main>
    <section data-ui="layout" style="--py: 24">
      <!-- page content: each child lands in the xl band -->
    </section>
  </main>
  <footer data-transition-layer="global-footer" style="--pt: 24; --border-t: 1">
    <div data-ui="layout"><!-- footer content --></div>
    <div data-ui="layout" style="--py: 8">
      <div style="--display: flex; --items: center; --justify: space-between">
        <!-- footer colophon content -->
      </div>
    </div>
  </footer>
</body>
```

`body` is a query container like `main` and `section`, so its own breakpoint tiers read `html`.
The `data-transition-layer` names persist the header and footer across view transitions (`<main>`
animates automatically; see `references/apis.md`).

## Heading group with CTAs

Group an optional eyebrow, a heading, a subheading, and the call-to-action buttons in one
`<hgroup>`. Center on mobile, start-align from `md`.

```html
<hgroup
  style="
    --display: flex-col;
    --gap: 4;
    --text-align: center;
    --text-align--md: start;
  "
>
  <span data-ui="text-eyebrow">Featured</span>
  <h1 data-ui="text-display">The art of typography</h1>
  <p data-ui="text-xl" style="--text: var(--color-muted-foreground)">
    How vexingly quick daft zebras jump.
  </p>
  <div
    style="
      --display: flex;
      --gap: 2;
      --mt: 4;
      --justify: center;
      --justify--md: start;
    "
  >
    <a data-ui="button" data-button-variant="primary" href="/products">Products</a>
    <a data-ui="button" data-button-variant="ghost" href="/contact">Contact us</a>
  </div>
</hgroup>
```

- Eyebrow → `text-eyebrow`; heading → `text-display` / `text-h*`; subheading → `text-xl` with
  `--text: var(--color-muted-foreground)`.
- Lead action `data-button-variant="primary"`, secondary `ghost` or `outline`.

## Reading column

Long-form copy goes in `data-ui="prose"` with a reading measure:
`style="--max-w: var(--article-lg); --mx: auto"` (`--article-2xs … 2xl`, 30–90ch).

## Everything else

- Structure & spacing → `references/tokens.md` (layout bands, `--space-*`, breakpoint tiers).
- Components (cards, carousels, dialogs, forms, navigation, …) → `references/components.md`.
- Brand voice, color roles, type scale, archetypes → `DESIGN.md`.
- Component anatomy in 0.5 markup → `packages/core/src/primitives/<name>/*.html`.

## Control sizes

The regular size is the answer about 95% of the time. `data-button-size="sm"` and `"icon-sm"` (and the toggle equivalents) are for dense chrome where the control is secondary to the content around it: an addon inside an input group, a per-row action in a table, a crowded toolbar. Header and footer actions, navigation links, dialog footers, form submits, and card actions stay regular; an icon-only one of those is `data-button-size="icon"`, not `icon-sm`. Mixing sizes in one row reads as a mistake, so when one control in a group must be small, make the group small.
