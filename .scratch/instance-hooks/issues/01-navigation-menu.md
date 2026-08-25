# navigation-menu: popover exact-width double declaration

Status: resolved
Type: grilling

## Signal

`navigation-menu-icon-grid.html` sets the popover's width twice:

```html
style=" --ui-popover-inline-size: min(var(--breakpoint-sm), 100% - var(--gap-md)); inline-size:
var(--ui-popover-inline-size); "
```

The hook alone only caps (`navigation-menu.css` consumes it as
`max-inline-size: var(--ui-popover-inline-size)` on the default popover), so the example
restates `inline-size` raw to get an exact width. Flagged during ADR-0008 grilling as a
candidate gap.

## Answer

**No change — working as designed.** Verdict against the four-part test:

- **(a) Out of reach — FAILS.** The declaration lands on the popover element itself, and
  the example already sets it via inline style successfully. Rung 3 covers it.
- The alternative "fix" — consuming the hook as exact `inline-size` on the default
  popover — is not a hook addition but a behavioral change: every default
  navigation-menu popover would stop shrink-wrapping to content and pin to the token
  width. The exact-width consumption already exists where it's wanted, as the
  `data-size="container|root|screen"` variants (`navigation-menu.css:272-294`), each
  setting `inline-size: var(--ui-popover-inline-size)` with its own anchor. The
  icon-grid example anchors to the trigger, which no variant covers.
- The double declaration is sanctioned **rung 2 + rung 3 composition**: set the shared
  knob so the cap agrees, reference the same var for the exact width. DRY and minimal.
