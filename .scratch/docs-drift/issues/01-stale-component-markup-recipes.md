# 01 — Component doc markup recipes disagree with canonical examples

Status: open

The example `.html` files are the source of truth; these pages describe markup that
drifted from them. Fix each page (or, where the example is wrong, fix the example and
say so in the ticket comments).

- `components/menubar.mdx:6` — recipe says `inline-flex items-center gap-px bg-card rounded-md shadow-sm p-xs`;
  `primitives/menubar/menubar.html:1` uses `flex w-full items-center gap-px bg-card border-b p-xs`
  (both examples agree with each other, not the doc)
- `components/toolbar.mdx:6` — recipe says `flex flex-row items-center gap-xs bg-card rounded-md shadow-sm p-xs`;
  `primitives/toolbar/toolbar.html:2` uses `flex flex-row flex-wrap items-center gap-xs rounded-lg p-xs border`.
  Separators also carry `mx-xs` and `aria-orientation="vertical"` (`toolbar.html:10,27`)
- `components/tabs.mdx:6` — says wrap in `<ui-tabs class="ui-tabs">`; the class is an
  _alternative_ root form, not a companion (`tabs.css:58` matches `:where(ui-tabs, .ui-tabs)`;
  `tabs.html:2` uses `<ui-tabs class="w-full">`)
- `components/lightbox.mdx:17-18` — documented dialog omits required `data-size="screen"`
  and `closedby="any"` (`lightbox.html:335-340`); the `data-slot="lightbox-gallery"` wrapper
  (`lightbox.html:2`, styled at `lightbox.css:70`) is missing from the markup table
- `components/mobile-menu.mdx:23,33` — missing `border-none` on the dialog
  (`mobile-menu.html:49`) and `w-full justify-between` on the summary button
  (`mobile-menu.html:96`); without the latter the chevron doesn't push to the row end
- `components/accordion.mdx:12` — says `<details class="border-b">`; examples use
  `border-b py-sm` (`accordion.html:2,25,47`)
- `components/card.mdx:6` — implies two nested wrappers; `card.html:2` carries everything
  on one element (`grid gap-sm bg-card text-card-foreground rounded-md shadow-sm overflow-clip`)
- `components/input-group.mdx` — the embedded "Password group" example uses
  `ui-password-group` slots (`input-group-password-group.html:4,16,19`) that the page never
  explains; the `[data-slot~="input-group-text"]` slot (`input-group.css:190`, with
  `:user-invalid` tinting at `:212`) is undocumented
