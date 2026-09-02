# 03 — Utility families that exist in CSS but have no docs

Status: open

Decide per family: document it, or mark it internal on purpose.

- **Scroll-fade** (`_utilities.css` SCROLL-FADE sections): ~35 classes (`scroll-fade`,
  `scroll-fade-x/y`, per-edge `-t/-b/-l/-r/-s/-e`, size scale, `scroll-fade-none`) plus the
  public `--scroll-fade-size` / `--scroll-fade-mask` tokens. Zero doc mentions.
- **Group hover** (`.group` + ~75 `group-hover:{text,bg,border,opacity,scale}-*` classes).
  Zero doc mentions; `foundation/utilities/index.mdx` says state prefixes are `hover:` only.
- **Will-change**: `will-change-transform`, `will-change-opacity`.
- Smaller gaps on existing pages:
  - flexbox.mdx: `flex-wrap`/`flex-wrap-reverse`/`flex-nowrap`, `grow-0/1`, `shrink-0/1`
  - interactivity.mdx: `pointer-events-auto`, `pointer-text/wait/help/progress`, `outline-none`
  - grid.mdx: `col-span-full`, `place-content-start/center/end`; also the auto-fill
    grid behavior where base `col-span-N` collapses to one column inside `grid-flow-row`
    (responsive spans use `--_col-span-responsive`) is undocumented
  - responsive-design.mdx (utilities version): `@bp:text-start/end` and `@bp:col-span-full`
    missing from the variant lists
  - effects.mdx: scale-25/98/99/101/102 were added to the table in the first pass; verify
    the `hover:` list on hover.mdx stays in sync if the scale set changes again
- **Sizing asymmetry worth a note in sizing.mdx**: `max-w-md` (`--step-36`) ≠ `max-h-md`
  (`--step-56`), `max-w-lg` (`--step-80`) ≠ `max-h-lg` (`--step-72`) — the doc table gives
  no values for the max/min xs–xl steps, so nothing is wrong, but the w/h pairs not being
  symmetric is surprising and may itself be unintended drift in `_utilities.css`.
