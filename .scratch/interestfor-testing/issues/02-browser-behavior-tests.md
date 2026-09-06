# 02 — Browser tests for `interestfor` behavior (tooltip, menu hover-open)

Status: open

Blocked by: none (independent of 01, but 01 is cheaper and should land first)

Ticket 01 proves the polyfill _installs_. This ticket proves the feature _works_: hovering a tooltip
trigger opens its hint popover, in the engines that need the polyfill. That is currently unverified
by anything except manual checking.

## Why happy-dom cannot cover this

`environment: "happy-dom"` has no popover implementation: `showPopover()` is `undefined` and throws
`TypeError`, `:popover-open` never matches, and there is no `ToggleEvent` (probe results in ticket
01). Since the observable behavior of `interestfor` _is_ "the hint popover opens", there is nothing
to assert against in happy-dom.

Stubbing `showPopover` and asserting it was called would be a test of our own stub — the
implementation-coupled / side-channel anti-pattern. It would also assert the wrong thing: the
polyfill's job is not "calls showPopover", it is "the tooltip becomes visible on hover after the
interest delay". Don't take that shortcut.

## The non-obvious requirement: the browser matrix must include non-Chromium

**A Chromium-only browser test proves nothing here.** Chromium 142+ ships `interestfor` natively, and
the polyfill self-gates off when it detects native support. A Chromium run therefore exercises the
native path and would have passed just as happily with the broken `compatible.js` pin.

The test is only meaningful in **Firefox and WebKit**, where the polyfill actually installs. Whatever
runner is chosen must run those two, and that should be treated as the acceptance criterion rather
than an optimization. Running Chromium as well is worth it for a different reason: it is the only way
to check that the native and polyfilled paths agree.

## Open question: runner

No browser test infrastructure exists in this repo today — nothing in any `package.json`,
`vite.config.ts`, or CI config. So this is a genuine infra decision, not a config tweak:

- **Vitest browser mode** (`vp test` is Vitest 4 under the hood, so this is the closest to the
  existing setup) — but it drives browsers via Playwright or WebdriverIO anyway, so Playwright
  arrives as a dependency either way. Upside: same test authoring style, same runner, one config.
- **Playwright directly** — better fit if the tests want real page navigation against the kit's
  `examples/*.html` or the docs preview iframe, which already serve raw component markup at
  `/zazz/*`. Heavier: a second test runner and its own CI job.
- Worth checking whether `vp` has first-party browser-test support before assuming either; the Vite+
  docs are local at `node_modules/vite-plus/docs`.

Recommendation: check `vp` support first, then default to Vitest browser mode with a Playwright
provider unless the tests genuinely need multi-page navigation.

## Candidate seams — need confirming before any test is written

Test through markup and user-ish events, never through the polyfill's internals. Proposed, in
priority order:

1. **Tooltip opens on hover.** Given `primitives/tooltip/tooltip.html`, hovering the `[interestfor]`
   trigger makes `[data-slot~="tooltip-content"]` match `:popover-open`; moving away closes it.
   This is the regression that shipped — it is the one test that must exist.
2. **Tooltip opens on keyboard focus**, and closes on blur. `interestfor` wires focus as well as
   hover, and keyboard access is the accessibility half of the feature.
3. **ARIA wiring.** The trigger gains `aria-describedby`/`aria-details` pointing at the content.
   `tooltip.css`'s header says not to hand-write `role="tooltip"` or manual ARIA because
   `interestfor` supplies it — so if the polyfill does not, that instruction is wrong and the
   component is inaccessible in Firefox and Safari.
4. **Menu hover-open.** A `ui-menu` trigger carrying both `popovertarget` and `interestfor` opens on
   hover (`menu-interest.html`, `menubar.html`, `navigation-menu-interest.html`).

Deliberately out of scope until the above pass: interest delays (`interest-delay`), long-press on
touch, and the hover-glide behavior between adjacent menubar triggers. These are timing-dependent
and flaky-prone; add them only once the basic path is green and only if they are worth the flake
budget.

## Done when

- Tooltip hover-open is verified in Firefox and WebKit, failing if the polyfill is removed from the
  head. Verify that failure by actually removing it.
- The chosen runner is wired into `vp check`/CI, or explicitly documented as a manual pre-release
  step if CI cost is judged not worth it (a recorded decision either way — the current state is that
  nothing checks this at all).

## Comments

Filed 2026-09-04 while cutting 0.4.0. Context: 0.4.0 swapped the polyfill to
`invokers@2.2.2/dist/esm/production/interest.js`, which should make tooltips work in Firefox and
Safari for the first time. That claim rests on reading the polyfill source and has **not** been
verified in a real Firefox or Safari — doing so manually is the immediate pre-publish check; this
ticket is about making it stop being manual.
