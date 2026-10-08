# Reset groups (Zazz 0.5.3)

One section per group of the Zazz reset. **Detect** names what to grep in the legacy CSS (`css`)
and the server templates (`tpl`). **Close** gives the lines that go inside the baseline's
`@scope` block. A group is a gap only when detection shows the pages render the element and
the legacy CSS leaves the property unset.

## Box sizing

- **Reset:** `box-sizing: border-box` on every element and pseudo-element.
- **Symptom:** anything with padding or borders and a fixed width or height shrinks by them.
  Text inputs are the first to show it: Bootstrap 2's `height: 20px; padding: 4px 6px` drops to
  a cramped 20px box. Content inside padded fixed-width boxes gets narrower and can wrap differently.
- **Detect:** `css` for `box-sizing`. CSS from before 2014 (Bootstrap 2, Blueprint,
  960gs) that sets it only on a few classes assumes `content-box` everywhere else.
- **Close:** `:where(*, ::before, ::after) { box-sizing: revert; }`

## Spacing

- **Reset:** `margin: 0; padding: 0` on every element.
- **Symptom:** elements the legacy CSS never spaced lose the browser's margins and padding:
  paragraphs run together, `blockquote`, `dd`, `figure`, and `fieldset` lose their indent.
- **Detect:** for each of `p, h1, h2, h3, h4, h5, h6, ul, ol, dl, dd, blockquote, figure, fieldset, legend, pre`,
  `tpl` shows it in use and `css` has no margin or padding rule for the bare element.
- **Close:** list only the elements that showed the gap:
  `:where(p, blockquote, dd, figure) { margin: revert; padding: revert; }`

## Borders

- **Reset:** `border: 0 solid` on every element.
- **Symptom:** two opposite ones. Elements that drew a browser border (`fieldset`, `iframe`,
  unstyled `input`, `textarea`, `select`) lose it. Legacy rules that set `border-width` or
  `border-color` without a style used to draw nothing and now draw a solid line.
- **Detect:** `tpl` for `fieldset`, `iframe`; `css` for `border-width` or `border-color` in rules
  with no `border-style` or `border` shorthand.
- **Close:** `:where(fieldset, iframe) { border: revert; }` for the first. For the second, one
  `border-style: none` rule per offending legacy selector, or fix the legacy rule.

## Table attributes

- **Reset:** the universal `padding: 0` and `border: 0 solid`, and `border-collapse: collapse`
  on `table`.
- **Symptom:** `cellpadding`, `border="1"`, and `cellspacing` stop working. Old report tables
  collapse into unpadded, borderless grids. HTML attributes are author styles, so `revert`
  can't bring them back.
- **Detect:** `tpl` for `cellpadding=`, `cellspacing=`, `border=` on `table`; collect each
  distinct value.
- **Close:** one rule per distinct value found:
  ```css
  :where(table[cellpadding="4"] > * > tr > :is(td, th)) {
    padding: 4px;
  }
  :where(table[border="1"]) {
    border: 1px outset gray;
  }
  :where(table[border="1"] > * > tr > :is(td, th)) {
    border: 1px inset gray;
  }
  :where(table[cellspacing]) {
    border-collapse: revert;
  }
  ```

## Lists

- **Reset:** `list-style: none` on `ul`, `ol`, `menu`.
- **Symptom:** bulleted and numbered lists in content lose their markers. Bootstrap 2 resets
  list margins and padding but never `list-style`.
- **Detect:** `css` for `list-style` on bare `ul`/`ol`; `tpl` for lists outside nav markup.
- **Close:** `:where(ul, ol) { list-style: revert; }`

## Media

- **Reset:** `display: block; vertical-align: middle` on `img, svg, video, canvas, audio,
iframe, embed, object`; `max-inline-size: 100%; block-size: auto` on `img, video`; `figure` is
  a flex column and a direct `figure > img` fills its width.
- **Symptom:** inline icons and images break onto their own lines; `text-align: center` stops
  centering images. `block-size: auto` overrides the `height` attribute, so an image whose
  `width`/`height` differ from its natural ratio is redrawn at that ratio: a
  `width="100" height="20"` spacer GIF renders 100px tall. Images in a `figure` stretch to its
  width.
- **Detect:** `tpl` for `<img` inside text, links, and table cells; `<img` with both `width=` and
  `height=` (spacer GIFs especially; collect each distinct `height` value); `<figure>`.
- **Close:**
  ```css
  :where(img, svg, video, canvas, audio, iframe, embed, object) {
    display: revert;
    vertical-align: revert;
  }
  :where(img[height="20"]) {
    block-size: 20px;
  } /* one per distinct value */
  :where(figure) {
    display: revert;
  }
  :where(figure > img) {
    inline-size: revert;
  }
  ```

## Page shell

- **Reset:**
  - `html`: `font-size: 16px`, `line-height: 1.5`, `scroll-behavior: smooth`, kit background.
  - `body`: `display: flex; flex-direction: column`, `min-block-size: 100svh`,
    `position: relative`, `overflow-x: clip`, `text-wrap: pretty`, kit font, color, and
    background.
  - `main`: `isolation: isolate`, `position: relative`, `flex: 1 0 auto`, `overflow: clip`.
  - `header, footer, section, article`: `position: relative`.
- **Symptom:** floats that are direct children of `body` stop floating, and margins between
  body's children stop collapsing. Absolutely positioned elements anchor to the nearest
  `section` or `main` instead of an outer ancestor. `main` clips dropdowns and tooltips that
  overflow it. In-page anchor jumps scroll smoothly.
- **Detect:** `css` for `body`'s `display`, `position`, `overflow`; `tpl` for floats directly
  inside `<body>`, absolutely positioned elements inside sectioning elements, dropdowns inside
  `<main>`.
- **Close:**
  ```css
  :where(html) {
    scroll-behavior: revert;
  }
  :where(body) {
    display: revert;
    min-block-size: revert;
    position: revert;
    overflow-x: revert;
  }
  :where(main, header, footer, section, article) {
    position: revert;
  }
  :where(main) {
    overflow: revert;
    isolation: revert;
  }
  ```

## Text elements

- **Reset:** `a` inherits color and decoration; `h1` to `h6` take the kit's heading font, size, and
  `text-wrap: balance`; `b` and `strong` take the kit's strong weight; `code` is a nowrap,
  ellipsis-truncated chip; `hr` is a 1px rule in the border color; `small`, `sub`, `sup`,
  `abbr[title]` are normalized.
- **Symptom:** unstyled links read as body text; long inline `code` is cut off; headings the
  legacy CSS sizes still change font and wrapping.
- **Detect:** `css` for bare `a`, `h1` to `h6` (`font-family`, `letter-spacing`), `code`, `hr` rules.
- **Close:** per element, `revert` each property the legacy CSS leaves unset, for example
  `:where(code) { white-space: revert; overflow: revert; text-overflow: revert; }`.

## Form controls

- **Reset:** `button, input, select, textarea` inherit font and color, lose padding, radius, and
  background; `input` and `textarea` lose their border and height; `textarea` resizes only
  vertically; `select` gets `appearance: none` with no arrow drawn; `button` text aligns with its
  parent; bare `progress` and `meter` lose their appearance, border, and background (the kit
  redraws only `data-ui="progress"` and `data-ui="meter"`).
- **Symptom:** form controls the legacy CSS doesn't style look like plain text, bare
  `<select>`s lose their dropdown arrow, and bare progress bars and meters go blank. Bootstrap 2 styles inputs and selects but never
  `appearance`.
- **Detect:** `css` for `appearance` on `select`; `tpl` for controls outside the classes the
  legacy CSS styles, and for `<progress`, `<meter`.
- **Close:** `:where(select, progress, meter) { appearance: revert; }` (add `border: revert;
background: revert;` for `progress` and `meter`), and for unstyled controls
  `:where(input, textarea, button) { border: revert; padding: revert; background-color: revert; }`.

## Kit-drawn native controls

- **Reset:** the kit draws these bare elements itself: `input[type="checkbox"]`,
  `input[role="switch"]` and its wrapping `label`, `input[type="range"]`, `details`/`summary`,
  `dialog`, `[popover]`, `kbd`, and `option::checkmark`. The focus ring on `:focus-visible` is
  the kit's outline too.
- **Symptom:** legacy checkboxes, sliders, disclosures, and dialogs take the Zazz look. Often an
  improvement; it clashes where legacy CSS or a jQuery plugin positions custom skins over them.
- **Detect:** `tpl` for each element; `css` for skins (`appearance`, `::before` on checkbox
  labels, iCheck or Uniform classes).
- **Close:** this is an **adopt** decision for the user, the focus ring included. To opt out:
  `:where(input[type="checkbox"], input[type="range"]) { appearance: revert; }` plus `revert`
  for the properties the skin relies on.

## `[hidden]`

- **Reset:** `[hidden]:not([hidden="until-found"]) { display: none !important }`. Browsers
  already hide `[hidden]`; the reset adds `!important`. It stays: kit components rely on it, and
  an `!important` in the reset layer outranks every later layer.
- **Symptom:** an element with the `hidden` attribute that a script shows (`.show()`,
  `.toggle()`, `.fadeIn()`, `style.display`) stays hidden.
- **Detect:** `tpl` for `hidden` attributes; scripts that show those elements.
- **Close:** none in the baseline. Report each case; the fix is removing the attribute.
