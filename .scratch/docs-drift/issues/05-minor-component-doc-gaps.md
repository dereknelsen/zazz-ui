# 05 — Minor component/scripts doc completeness

Status: open

- `components/navigation-menu.mdx:48` lists `data-align` values as `center, end` only;
  `start` is real (`popover.css:140`) and used by every canonical example
  (`navigation-menu.html:100`, `navigation-menu-interest.html:31,79`,
  `navigation-menu-simple.html:35`)
- `components/tooltip.mdx:26-30` API table omits `[data-slot="tooltip-arrow"]`
  (`tooltip.css:200`; present in every example)
- `scripts/signals.mdx:89` says `<ui-password>` and `<ui-toaster>` use the module; actual
  importers of `base/signals.ts`: toaster, otp, checkbox, password-group, multiselect, and
  `base/typeahead.ts`
- `foundation/utilities/grid.mdx:66-72` coordination-variable table omits `--_col-span`,
  `--_col-span-responsive`, `--_grid-track-flow`, `--_grid-track-min`
