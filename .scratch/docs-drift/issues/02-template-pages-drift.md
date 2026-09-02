# 02 — Template doc pages describe patterns their example files don't use

Status: open

- `templates/responsive.mdx:12` cites `grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-4`;
  `examples/responsive.html:154` actually uses
  `grid grid-cols-1 @xs:grid-cols-2 @sm:grid-cols-3 @md:grid-cols-4 @lg:grid-cols-6 gap-sm`
- `templates/responsive.mdx:14` cites a `hidden @md:flex` nav swap; the file's patterns are
  `flex @sm:hidden` / `hidden @sm:flex` (`responsive.html:233,240`) and
  `hidden @md:block` / `block @md:hidden` (`responsive.html:227`)
- `templates/products.mdx:12` says the lightbox contains a `<ui-carousel>`;
  `examples/products.html:148` uses the class form `<div class="ui-carousel" …>`
- `templates/components.mdx:14` claims "subgrid rows" in the cards section; `components.html`
  contains no subgrid (`:704-736` is plain nested grids)
- `templates/components.mdx:3,6` omit the Toggle Group (`components.html:285`) and
  Breadcrumbs (`components.html:427`) sections; `templates/index.mdx:23` does list
  breadcrumbs, so the two pages disagree
- `templates/forms.mdx:14` says `<ui-password>` is "configured with `data-*` attributes";
  the instance at `examples/forms.html:314` sets none (defaults apply)
