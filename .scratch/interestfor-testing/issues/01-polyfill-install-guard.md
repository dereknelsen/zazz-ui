# 01 — Guard that the pinned polyfill actually installs `interestfor`

Status: open

The 0.4.0 release (ADR-0011) found that `invokers@2.2.2/dist/esm/production/compatible.js` had been
pinned as the Interest Invokers polyfill since 0.1.0 and contains **zero** occurrences of
`interestfor` — it polyfills `command`/`commandfor` only. Tooltips were silently Chromium-only for
three releases. Nothing in the 203-test suite noticed, and nothing would notice if the file were
swapped back.

This ticket is the cheap half of the fix: a test that fails if the pinned polyfill does not install
an `interestfor` implementation. It needs no browser.

## Why this is testable in happy-dom

Probed against the current test environment (`environment: "happy-dom"`, 2026-09-03):

| Capability                                                                           | happy-dom                          |
| ------------------------------------------------------------------------------------ | ---------------------------------- |
| `Object.getOwnPropertyDescriptor(HTMLButtonElement.prototype, "interestForElement")` | absent                             |
| `"popover" in HTMLElement.prototype`                                                 | true (attribute reflects)          |
| `element.showPopover()`                                                              | **undefined — throws `TypeError`** |
| `element.matches(":popover-open")`                                                   | never true                         |
| `ToggleEvent`                                                                        | undefined                          |
| `PointerEvent`                                                                       | available                          |

Because `interestForElement` is absent, the polyfill's self-gate (`apply()` checks for a native
property descriptor and returns early when it finds one) does **not** trip, so the polyfill installs
its mixin. That install is observable without any popover support — which is the seam this ticket
tests, and the only part of `interestfor` happy-dom can reach.

## Candidate seam — needs confirming before any test is written

**Seam: the pinned polyfill module's effect on the DOM prototypes after import.**

Observable behavior: after importing the file named in `POLYFILLS`, `interestForElement` is a
defined accessor on `HTMLButtonElement.prototype` / `HTMLElement.prototype`, and reading it on an
element carrying `interestfor="someId"` resolves to that element.

This is a public boundary (a documented DOM property the polyfill's own README specifies), not an
internal of the `invokers` package. It would have failed loudly on `compatible.js` and passes on
`interest.js`.

Explicitly **not** in this ticket's seam: whether hovering opens anything. That is ticket 02.

## Blocker: the polyfill is not installed locally

`invokers` is loaded from the CDN by a script tag and is deliberately **not** a `package.json`
dependency (ADR-0011: nothing in the kit's module graph imports it, so it needs no import-map
entry). A test cannot import it today, and must not fetch over the network.

Options, in preference order:

1. **Add `invokers` as a `devDependency` pinned to the `POLYFILLS` version.** This also closes the
   gap that caused the bug: `head.test.ts` already asserts every `ESM_DEPENDENCIES` version matches
   the installed package ("or the two environments silently diverge"), but `POLYFILLS` has **no**
   equivalent guard precisely because it is not installed. Installing it extends that existing
   invariant to polyfills and makes the version pin machine-checked. Cost: one devDependency, and
   remembering to bump it with the pin — which is what the test would then enforce.
2. Commit a checked-in copy of the pinned file as a fixture. Cheaper to install, but the fixture can
   drift from the pin, which is the same class of failure over again.
3. Assert on file contents fetched at build time. Rejected: needs network in tests.

Option 1 is the recommendation. Note it does not change what ships — `devDependencies` are not in
the tarball and no import-map entry is added.

## Done when

- `POLYFILLS` versions are pinned to installed packages by the same invariant that covers
  `ESM_DEPENDENCIES` in `head.test.ts`.
- A test imports the exact pinned polyfill file and asserts `interestForElement` is installed and
  resolves an `interestfor` reference.
- Flipping the pin to `dist/esm/production/compatible.js` makes that test fail. **Verify this by
  actually flipping it**, not by reasoning — the whole point is that the failure mode was invisible.

## Comments

Filed 2026-09-04 while cutting 0.4.0. Ticket 02 covers the behavior half, which does need a real
browser. This one is worth doing first and on its own: it is small, needs no new infrastructure, and
catches the exact regression that shipped.
