# Zazz patterns and best practices

Page-level structure and house rules. The primitives (`references/components.md`) cover most
UI; this file holds what applies everywhere: the semantic HTML the kit expects, the page
shell, and a few compositions no primitive owns. Syntax rules live in `AUTHORING.md`.

## Sentence case, always

Write all UI text in sentence case: headings, buttons, links, labels, nav items, placeholders.
Capitalize the first word and proper nouns only.

- "Add to cart", not "Add To Cart"
- "The art of typography", not "The Art Of Typography"

Deviate only when the user asks. An eyebrow's caps come from the `text-eyebrow` role's
`text-transform`, so author it in sentence case too.

## Semantic HTML in Zazz

Zazz styles native elements and reads native attributes, so the right element is also the
styled one. Pick each element for what it means, not how it renders. A `<div>` or `<span>`
is for when nothing with meaning fits. The payoff is an accessibility tree with real
structure. Screen readers jump between landmarks and headings, a native `<button>` is
focusable and answers Enter and Space on its own, and the kit's selectors (`:user-invalid`,
`[aria-current]`, `details[open]`) have something to match.

Never add a `role` that the element already has (`<button role="button">`), and never rebuild
a native control from a `<div>` plus `role` and key handlers. When you catch yourself doing it,
the native element exists; find it.

### The document

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Orders · Acme</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <!-- the Zazz head block: zazz/head.html, or the installation page's copy -->
  </head>
</html>
```

- `lang` on `<html>` sets hyphenation, quotes, and screen reader voices; mark exceptions with
  `lang` on the element.
- Charset first, then a `<title>` unique to the page, then the viewport.
- The kit's script is an ES module, so it defers on its own. Keep the import map above it and
  the Interest Invokers polyfill as the head block ships them.

### Landmarks

Each landmark appears once per page unless noted, and `<main>` exactly once.

| Element     | Meaning                                                                 | In Zazz                                                                 |
| ----------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `<header>`  | Site banner when it's a child of `<body>`; otherwise a section's header | Holds the logo and `<nav>`; `data-transition-layer="global-header"`     |
| `<nav>`     | A group of links; several per page, each labeled                        | `data-ui="navigation-menu"` for the global one, plain `<nav>` elsewhere |
| `<main>`    | The page's own content                                                  | A column of `<section data-ui="layout">` bands                          |
| `<section>` | A thematic group with its own heading                                   | `data-ui="layout"` plus `--py` for vertical rhythm                      |
| `<article>` | Self-contained and reusable elsewhere: a post, a product, a card        | `<article data-ui="card">` when the card is one                         |
| `<aside>`   | Tangential content: a sidebar, a related-links box                      | A band child placed with `--band`, or a column in a grid                |
| `<footer>`  | Site footer as a child of `<body>`; otherwise a section's footer        | `data-transition-layer="global-footer"`; put contact in `<address>`     |

A `<header>` or `<footer>` nested inside `<main>`, `<article>`, or `<section>` is not a
landmark, which is what you want for a card header or a dialog footer. `<section>` becomes a
`region` landmark only when it has an accessible name, so give a page's major sections a
heading and leave decorative wrappers as `<div>`.

### Headings

Headings are the page outline. One `<h1>` names the page, `<h2>` names each section, `<h3>`
subdivides a section, with no skipped levels. Screen reader users move between them like a
table of contents, so a level that's off by one is a navigation bug, not a style choice.

Level is structure; size is a role. Native `h1` to `h6` take their level's size, and a
smaller `text-h*` role overrides it: `<h2 data-ui="text-h5">` is still a level-two heading,
just smaller. A larger role does not win (the heading rules come later in the cascade), so
size a heading up with `--font-size: var(--font-size-h2)`. Never pick the tag for its size,
and never pair a tag with its own role (`<h2 data-ui="text-h2">` is a no-op). Don't use a
heading as bold text; use `--font-weight: strong`.

### Navigation

- Wrap the links of every `<nav>` in a list (`<menu>` or `<ul>`) so screen readers announce
  how many there are. The reset removes markers, so no CSS is needed.
- Label each `<nav>` when a page has more than one: `aria-labelledby` pointing at visible text
  when there is any, otherwise `aria-label="Footer"` or `aria-label="Breadcrumb"`. Don't put
  the word "navigation" in the label; the role already says it.
- Mark the current page's link with `aria-current="page"` and style it through the `current`
  state: `--bg: transparent; --bg--current: var(--color-muted)`. Under swap navigation (the
  kit's same-document page swaps; see `references/apis.md`), the kit moves the attribute in a
  persisted header, so the style follows.
- Put a skip link first in `<body>`, visible only on focus, targeting `<main id="main">`:

```html
<a
  href="#main"
  data-ui="button"
  data-button-variant="outline"
  style="
    --position: absolute;
    --top: 2;
    --left: 2;
    --z: 30;
    --translate: 0 -200%;
    --translate--focus-visible: 0 0;
  "
  >Skip to content</a
>
```

- Breadcrumbs: copy the `breadcrumbs` fragment, add `aria-label="Breadcrumb"` to its `<nav>`,
  and replace its last `aria-disabled` item with `<span aria-current="page">`: the current page
  is text, not a link. Breadcrumbs show the site hierarchy, never the visitor's history.
- Render the link list once, not a desktop and a mobile copy. The page shell below hides the
  desktop `<nav>` on small screens and the mobile control on large ones. The mobile menu's
  dialog is the one permitted duplicate, and it is inert until opened. The `mobile-menu`
  fragment stacks its links as buttons; wrap them in a `<menu>` when the count matters.

### Links and buttons

A link goes somewhere (`<a href>`); a button does something (`<button type="button">`). Both
take `data-ui="button"`, so the choice is about meaning and keyboard behavior, not looks: a link
answers Enter and opens in a new tab on middle-click, a button answers Enter and Space. Never
nest one inside the other, and never nest either inside a `<label>`.

Link text names the destination ("View all orders", not "Click here"). An icon-only button
gets `aria-label`, and its `<svg>` gets `aria-hidden="true"`, as the fragments show. Buttons in
a `<form>` need an explicit `type`: `submit` for the one that submits, `button` for the rest,
or every button submits.

### Lists

`<ul>` when order doesn't matter, `<ol>` when it does, `<dl>` for term-and-value pairs (specs,
metadata, FAQs), `<menu>` for a toolbar or nav list of actions. A grid of cards is a `<ul>`
with `--display: grid` on it, not a `<table>` and not a run of `<div>`s.

The reset sets `list-style: none` on every list. Inside `data-ui="prose"` the markers come
back on `ul` and `ol`; outside it, a content list that should still announce as a list (so the reader hears
"list, 4 items") gets `role="list"`, because Safari drops list semantics along with the markers.

### Forms

Copy the `fields` fragment. The parts carry the meaning the kit and the browser read:

```html
<div data-ui="field">
  <label data-field-slot="label" for="email">Email</label>
  <input
    data-ui="input"
    id="email"
    name="email"
    type="email"
    autocomplete="email"
    required
    aria-describedby="email-hint"
  />
  <div data-field-slot="description">
    <span data-field-slot="hint" id="email-hint">We only use it to sign you in.</span>
    <span data-field-slot="error" role="alert">Enter a valid email address.</span>
  </div>
</div>
```

- Every control has a `<label>`, explicit (`for`/`id`) or wrapping. Checkboxes and radios use
  the wrapping form with the label text after the control; everything else puts the label first.
- Every control has a `name`, search boxes and demos included. Radios in one group share a
  `name`; each checkbox and radio has a meaningful `value`.
- Group radios and related checkboxes in `<fieldset data-ui="field-group">` (or
  `data-ui="radio-group"`) with a `<legend>`. Hide a legend visually with `data-ui="sr-only"`,
  never by dropping it.
- Use the most specific `type` (`email`, `tel`, `url`, `number`, `date`) and the matching
  `autocomplete` token. The mobile keyboard and the browser's autofill both read them.
- Validate with constraint attributes first (`required`, `min`, `max`, `pattern`, `minlength`).
  The kit surfaces errors through `:user-invalid`, after blur or submit, so don't show them
  while typing, and don't keep the submit button disabled until the form is valid: a disabled
  submit hides the messages people need. Validate again on the server.
- Point `aria-describedby` at the hint so it's read with the field. A cancel button takes
  `formnovalidate`; a form inside a dialog closes it with `method="dialog"`.

### Tables

A `<table data-ui="table">` is for data that is compared, sorted, or totaled. Give it a
`<caption>` (the table's accessible name; style its position with CSS, not `align`), `<thead>`
with `<th>` cells, `<tbody>`, and `<tfoot>` for totals. Add `scope="row"` on a row's header
cell. Never use a table for layout or for a card grid; never use a `<div>` grid for data people
will read across rows.

### Images and icons

- Decorative imagery goes in CSS: a gradient wash via `--bg-linear` and `--bg-stops`, or a
  photo through a BEM class in your stylesheet. Content images go in `<img>`.
- Every `<img>` has `alt`. Describe what the image tells the reader in this context, without
  "image of". Empty `alt=""` for an image that adds nothing, so it's skipped rather than read as
  a filename.
- Set `width` and `height` so the browser reserves the box before the file arrives; the reset's
  `max-inline-size: 100%` keeps it responsive. Add `loading="lazy"` below the fold.
- Caption with `<figure>` and `<figcaption>`; the reset makes `figure > img` fill the figure.
- Inline icons are `<svg aria-hidden="true">` next to text. An icon that carries meaning on its
  own gets `role="img"` and an `aria-label`.

### Dialogs and disclosures

- A dialog is a native `<dialog data-ui="dialog">`, opened with `command="show-modal"` and
  `commandfor` (no JavaScript), closed with `command="close"`, `method="dialog"`, or Escape.
  Name it with `aria-labelledby` pointing at its heading (the `alert-dialog` fragment shows
  it; add it to a plain dialog too). `closedby="any"` allows backdrop
  dismiss. A confirmation that needs an answer is `data-ui="dialog alert-dialog"` with
  `role="alertdialog"` and `closedby="none"`; copy the `alert-dialog` fragment.
- Never open a dialog without a user action; modal dialogs interrupt, so use them for things
  that need a decision. A hint or a menu is a `[popover]`, not a dialog.
- An accordion is `<ui-accordion>` over native `<details>` and `<summary>`, with `<summary>`
  first. `open` sets the initial state; a shared `name` on several `<details>` makes them
  exclusive with no script. Keep links and inputs out of `<summary>`.

### Inline text

- `<p>` for paragraphs; never `<br>` to fake one. `<br>` is for addresses and poetry.
- `<strong>` for importance, `<em>` for stress; `<b>` and `<i>` carry no meaning.
- `<blockquote>` for a quote, with the source in a `<p>` after it, and `<cite>` for a work's
  title (never a person). `<q>` for an inline quote; it draws its own marks.
- `<time datetime="2026-10-30">` on dates, `<address>` for contact details (in the footer),
  `<abbr title>` the first time an abbreviation appears, `<kbd>` for keys (the kit styles it).
- Rich text from a CMS goes in `data-ui="prose"`, which styles all of the above.

## Page structure

The standard page: a skip link, a `<header>` with logo, desktop nav, and mobile nav, a
`<main>` of `<section>`s, and a `<footer>`. `data-ui="layout"` makes an element the band grid
for its children (default band `xl`); `<section>`s own the vertical rhythm with `--py`. The
desktop nav is `--display: none; --display--sm: flex`; the mobile control is `--display: flex;
--display--sm: none` and opens a dialog (copy the `mobile-menu` fragment). Change the default
band with `data-layout-size="md"` on the layout, or place one child with
`--band: layout-bleed | layout-full | layout-2xl … layout-sm`.

```html
<body style="--bg: var(--color-background)">
  <!-- skip link, from "Navigation" above -->
  <header data-transition-layer="global-header" style="--border-b: 1">
    <div data-ui="layout">
      <div style="--display: flex; --items: center; --justify: space-between">
        <a href="/" aria-label="Acme home"><!-- site logo --></a>
        <nav
          aria-label="Main"
          style="--display: none; --display--sm: flex; --items: center; --py: 8"
        >
          <menu style="--display: flex; --items: center; --gap: 4">
            <li>
              <a data-ui="button" data-button-variant="ghost" href="/" aria-current="page">Home</a>
            </li>
            <!-- navigation links and menus -->
          </menu>
        </nav>
        <nav aria-label="Menu" style="--display: flex; --display--sm: none">
          <!-- mobile navigation: copy https://zazz.sh/api/primitives/mobile-menu/index.md -->
        </nav>
      </div>
    </div>
  </header>
  <main id="main">
    <section data-ui="layout" style="--py: 24">
      <h2>…</h2>
      <!-- each child lands in the xl band -->
    </section>
  </main>
  <footer data-transition-layer="global-footer" style="--pt: 24; --border-t: 1">
    <div data-ui="layout"><!-- footer content: <nav aria-label="Footer">, <address> --></div>
    <div data-ui="layout" style="--py: 8">
      <div style="--display: flex; --items: center; --justify: space-between">
        <!-- colophon -->
      </div>
    </div>
  </footer>
</body>
```

Only `html` is a page-level query container, so tiers on `body`, `main`, and sections read the
page width. When the page runs view transitions, the `data-transition-layer` names give the
header and footer their own layers and `<main>` animates on its own. View transitions come from
swap navigation or from `@view-transition { navigation: auto; }` in the site's own CSS; the kit
never declares it. See `references/apis.md`.

## Heading group with calls to action

Group an optional eyebrow, a heading, a subheading, and the action buttons in one `<hgroup>`.
Center on mobile, start-align from `md`. The eyebrow is a `<p>`, not a heading, so it stays out
of the outline.

```html
<hgroup style="--display: flex-col; --gap: 4; --text-align: center; --text-align--md: start">
  <p data-ui="text-eyebrow">Featured</p>
  <h1 style="--font-size: var(--font-size-display); --leading: var(--leading-display)">
    The art of typography
  </h1>
  <p data-ui="text-xl" style="--text: var(--color-muted-foreground)">
    How vexingly quick daft zebras jump.
  </p>
  <div style="--display: flex; --gap: 2; --mt: 4; --justify: center; --justify--md: start">
    <a data-ui="button" data-button-variant="primary" href="/products">Products</a>
    <a data-ui="button" data-button-variant="ghost" href="/contact">Contact us</a>
  </div>
</hgroup>
```

Lead action `primary`; secondary `ghost` or `outline`.

## Reading column

Long-form copy goes in `data-ui="prose"` with a reading measure:
`style="--max-w: var(--article-lg); --mx: auto"` (`--article-2xs … 2xl`, 30 to 90ch).

## Control sizes

The regular size is the answer nearly every time. `data-button-size="sm"` and `"icon-sm"` (and
the toggle equivalents) are for dense chrome where the control is secondary to the content
around it: an addon inside an input group, a per-row action in a table, a crowded toolbar.
Header and footer actions, navigation links, dialog footers, form submits, and card actions
stay regular; an icon-only one of those is `data-button-size="icon"`. Mixing sizes in one row
reads as a mistake, so when one control in a group must be small, make the group small.

## Everything else

- Structure and spacing: `references/tokens.md` (layout bands, the space scale, breakpoint tiers).
- Components: `references/components.md`, then the fragment at
  `https://zazz.sh/api/primitives/<name>/index.md`.
- Brand voice, color roles, type scale, archetypes: `DESIGN.md`.
