# Polyfill only Interest Invokers; drop the Popover and Invoker Commands polyfills

The head contract ships exactly one feature polyfill: `invokers@2.2.2/dist/esm/production/interest.js`, for Interest Invokers (`interestfor`). The Popover API and Invoker Commands (`command`/`commandfor`) are no longer polyfilled.

## Context

Since 0.1.0 the head loaded two polyfills: `@oddbird/popover-polyfill` and `invokers`' `compatible` build. Neither was recorded in an ADR, and both had drifted out of step with the platform — and with what the kit actually needs.

Measured against the repo's browser-support floor (latest Chrome, Firefox, and Safari, two versions back — as of 2026-09 roughly Chrome 153, Firefox 156, Safari 26.2, iOS Safari 26.4):

| API                    | Chrome | Firefox | Safari | iOS Safari     | Below the floor?             |
| ---------------------- | ------ | ------- | ------ | -------------- | ---------------------------- |
| Popover API            | 114    | 125     | 17.0   | 18.3           | no — Baseline since Jan 2025 |
| Invoker Commands       | 135    | 144     | 26.2   | 26.2           | no — Baseline since Jan 2026 |
| Interest Invokers      | 142    | ✗       | ✗      | ✗              | **yes — Chromium only**      |
| CSS anchor positioning | 151    | 147     | 27     | 26.0 (partial) | no — Baseline since Jan 2026 |

Two findings drove the change:

1. **Both polyfills covered APIs that no longer need covering.** The popover polyfill self-gates (`"popover" in HTMLElement.prototype && "showPopover" in HTMLElement.prototype`) and so no-ops on every browser in the support window — 11 KB and a request to accomplish nothing. Its real cost was the `.\:popover-open` class hack it forced into 18 selectors and guards across 12 source files, since `:popover-open` cannot be polyfilled as a pseudo-selector.

2. **The one API that _is_ below the floor was never polyfilled at all.** The pinned `invokers` `compatible` build (217 KB) contains 63 occurrences of `commandfor` and **zero** of `interestfor`. `interestfor` is the tooltip's only trigger and the hover/focus-open path for menu, menubar, and navigation-menu — so tooltips were silently Chromium-only, while 217 KB shipped to polyfill `command`/`commandfor`, which every supported engine implements natively. The `interest` entrypoint in the same already-pinned package (15 KB) is what was wanted.

Anchor positioning reached Baseline (newly available) in January 2026, so it is no longer below the floor either — `anchor-size()` lands at Chrome 125 / Firefox 147 / Safari 26.0, and `anchor-name` at Chrome 151 / Firefox 147 / Safari 27. Its `@supports` gates are therefore vestigial rather than protective; the `anchor-size()` ones are removed in 0.4.1, and the `anchor-name` ones stay only until Safari 27 is two versions back (full `anchor-name` support arrives there, and until then Safari 26.x still needs the UA-centered fallback rather than an unpositioned top-left box).

No anchor-positioning polyfill is adopted. `@oddbird/css-anchor-positioning` cannot carry this kit's usage: it does not implement `anchor-size()` at all (15 uses here), does not support dynamically added or removed anchors (the toaster builds toasts in JS), documents differences for "popover targets on the top layer" (every Zazz popover is top-layer), and wraps the positioned target — "moving the target into the wrapper disconnects and reconnects it", which collides with the custom elements' `connectedCallback` lifecycle.

## Decision

- `POLYFILLS` in `src/head.ts` holds one entry: the `invokers` `interest` build, loaded as a module tag ahead of `index.js`. Module scripts defer and execute in document order, so no `defer` attribute is needed.
- Remove `@oddbird/popover-polyfill` from the head, and strip `.\:popover-open` from every selector and `matches()` guard. `command.css` keeps `:where(:popover-open, [open])` — that branch is about the dialog form of the panel, not the polyfill.
- `head.test.ts` asserts the polyfill set is exactly the `interest` entrypoint and that the rendered head contains neither `popover-polyfill` nor `compatible.js`. The `not.toContain("compatible")` assertion is the point: `compatible` is the plausible-looking wrong file, and picking it is the bug this ADR fixes.
- Raise the recorded browser floor accordingly: the Popover API and Invoker Commands are now assumed native. This is a breaking change under the 0.x policy on two counts (polyfill-set change and browser-floor raise), so it ships as 0.4.0.
- Remove the four `@supports (inline-size: anchor-size(width))` gates (autocomplete, combobox, select picker, multiselect panel), since `anchor-size()` is Baseline at Safari 26.0 and inside the floor. Landed as a follow-up in 0.4.1, and _not_ a breaking change: without `anchor-size()` support the declaration is dropped at parse time and the `max-content` fallback stands, which is what the gate already produced. Keep the `anchor-name` gates until Safari 27 is two versions back — dropping those _would_ change rendering on Safari 26.x.

## Consequences

- The kit finally _has_ an `interestfor` implementation for Firefox and Safari, where before it shipped none. Verified in a real non-Chromium engine on 2026-09-04 via `.scratch/interestfor-testing/diagnose.html`: the polyfill loaded, installed `interestForElement`, resolved the reference, and hover opened the popover anchored to its trigger (dx 66px, dy −4px). Two caveats that page also surfaced: `popover="hint"` degrades to `manual` there (opens fine, but no light dismiss, and two tooltips can sit open at once — Safari lacks `hint` through 27), and the check used a bare page, so a failure on a full Zazz page would point at the kit's own CSS rather than the polyfill.
- Page weight drops ~213 KB across the two polyfill requests (228 KB → 15 KB), and the head goes from two polyfill tags to one.
- Browsers older than the floor lose popover behavior entirely rather than degrading: a closed `[popover]` keeps the UA's `display: none` and never opens. That is the accepted trade for the floor, not a regression against it.
- When `interestfor` reaches Firefox and Safari, this polyfill goes too and the kit ships none — worth re-checking at each release rather than carrying it indefinitely. It self-gates in the meantime: the module's top-level `applyInterestInvokers()` call checks for a native `interestForElement` property descriptor and returns without installing when it finds one, so Chromium keeps its own implementation and pays only the 15 KB request.
- `invokers` stays out of `package.json` dependencies: nothing in the kit's module graph imports it, so it needs no import-map entry — only the pinned script tag and its `sha384` hash.
