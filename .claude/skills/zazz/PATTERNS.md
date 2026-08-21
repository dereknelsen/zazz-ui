# Zazz patterns & best practices

Page-level structure and house-style conventions. The primitives and components
(`references/components.md`) already cover most UI — this file holds the conventions that
apply everywhere plus the handful of compositions the components don't.

## Sentence case, always

Write **all** UI text in sentence case — headings, subheadings, body copy, buttons, links,
labels, nav items, form placeholders, everything. Capitalize only the first word and proper
nouns:

- "Add to cart" — not "Add To Cart"
- "The art of typography" — not "The Art Of Typography"
- "Contact us" — not "Contact Us"

Only deviate when the user explicitly asks for a different case. (The all-caps look of an
eyebrow comes from `.text-eyebrow`'s CSS `text-transform`, so you still _author_ it in
sentence case — let the class do the uppercasing.)

## Page structure

The standard page: a `<header>` with logo + desktop nav + mobile nav, a `<main>` of
`<section>`s, and a `<footer>`. `.container` places its direct children into a centered band
(default `md`); `<section>`s own the vertical rhythm with `.py-*`. Desktop nav is
`hidden @sm:flex`; the mobile nav is `flex @sm:hidden` and opens a dialog (see the Dialog
component / mobile-menu). The container is a subgrid band system, not a fixed-width wrapper —
set the band per child with `data-container="xs|sm|md|lg|xl|full|bleed"`, or change the default
for all children with `data-container="…"` on the `.container`. See
`references/tokens.md` §7 for the full band model.

```html
<body>
  <header>
    <div class="container flex items-center justify-between">
      <a href="/">
        <!-- site logo -->
      </a>
      <nav class="hidden @sm:flex items-center py-md">
        <menu class="flex items-center gap-sm">
          <li>
            <a class="button" data-variant="ghost" href="/">Home</a>
          </li>
          <!-- navigation links and dropdowns -->
        </menu>
      </nav>
      <nav class="flex @sm:hidden">
        <!-- mobile navigation — use the dialog pattern -->
      </nav>
    </div>
  </header>
  <main>
    <section class="py-xl">
      <div class="container">
        <!-- page content -->
      </div>
    </section>
    <!-- other sections -->
  </main>
  <footer class="pt-xl border-t">
    <div class="container">
      <!-- footer content -->
    </div>
    <div class="container flex items-center justify-between py-md">
      <!-- footer colophon content -->
    </div>
  </footer>
</body>
```

Add `data-transition-layer="global-header"` to the `<header>` and `data-transition-layer="global-footer"`
to the `<footer>` to persist them across view transitions (`<main>` animates automatically; see
`references/apis.md`).

## Heading group with CTAs

Group an optional eyebrow, a heading, a subheading, and the call-to-action buttons in one
`<hgroup>`. Center on mobile, left-align from `md`.

```html
<hgroup class="flex flex-col gap-sm text-center @md:text-left">
  <!-- eyebrow (optional) -->
  <span class="text-eyebrow">Featured</span>

  <!-- heading -->
  <h1 class="text-display">The art of typography</h1>

  <!-- subheading -->
  <p class="text-xl text-muted-foreground">How vexingly quick daft zebras jump.</p>

  <!-- CTA buttons -->
  <div class="flex mt-sm justify-center @md:justify-start">
    <a class="button" data-variant="primary" href="/products">Products</a>
    <a class="button" data-variant="ghost" href="/contact">Contact us</a>
  </div>
</hgroup>
```

- Eyebrow → `.text-eyebrow`; heading → `.text-display` / `.text-h*`; subheading → `.text-xl
.text-muted-foreground`.
- Lead action `data-variant="primary"`, secondary `data-variant="ghost"`.

## Everything else

For the rest, reach for the primitives and components directly — they carry their own
composition guidance:

- Structure & spacing → `references/tokens.md` (`.container` band system + `data-container`,
  `.container[data-variant="article"]`, `--gap-*`, the responsive `@sm:`/`@md:`/`@lg:`
  utilities and `@max-*` container variants).
- Components (cards, carousels, dialogs, forms, navigation, …) → `references/components.md`.
- Brand voice, color roles, type scale, archetypes → `DESIGN.md`.
